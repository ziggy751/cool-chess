import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { randomBytes } from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import { Ratings, category } from './rating.js'
import { Match, TIMES, opposite } from '../src/rules.js'

const root = resolve('dist')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.wasm': 'application/wasm', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain' }
const send = (socket, message) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}
const id = (bytes = 24) => randomBytes(bytes).toString('hex')
const rooms = new Map()
const queue = new Map()
const ratings = new Ratings()
const server = createServer((req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path))
    if (!file.startsWith(root + sep) || !statSync(file).isFile()) throw new Error()
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff' })
    createReadStream(file).pipe(res)
  } catch {
    res.writeHead(404).end('Not found')
  }
})

const sockets = new WebSocketServer({ noServer: true, maxPayload: 8192 })
server.on('upgrade', (req, net, head) => {
  try {
    if (req.url !== '/socket' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) throw new Error()
    sockets.handleUpgrade(req, net, head, socket => sockets.emit('connection', socket))
  } catch { net.destroy() }
})

function leave(socket) {
  for (const [time, waiting] of queue) if (waiting === socket) queue.delete(time)
  if (!socket.room) return
  const { room } = socket
  room.clients.delete(socket)
  socket.room = null
  broadcast(room)
}

function seat(room, socket, color, token = id()) {
  leave(socket)
  if (color) {
    for (const other of room.clients) if (other.color === color) {
      room.clients.delete(other)
      other.room = null
      other.close(4000, 'Session resumed elsewhere')
    }
    room.seats[color] = token
  }
  room.clients.add(socket)
  Object.assign(socket, { room, color })
  send(socket, { type: 'joined', code: room.code, color, token: color ? token : null })
}

function makeRoom(minutes, preferred) {
  let code
  do { code = id(3).toUpperCase() } while (rooms.has(code))
  const color = ['w', 'b'].includes(preferred) ? preferred : Math.random() < .5 ? 'w' : 'b'
  const room = { code, minutes, clients: new Set(), seats: {}, match: null,
    sequence: 0, started: Date.now(), updated: Date.now(), rematch: new Set() }
  rooms.set(code, room)
  return [room, color]
}

function rate(room) {
  if (room.division && room.match?.result && !room.rated) {
    const {winner,reason} = room.match.result
    ratings.result(room.division,room.players,winner,reason)
    room.rated = true
  }
}

function broadcast(room, only) {
  const state = { type: 'state', code: room.code, seq: room.sequence,
    match: room.match?.snapshot() || null, minutes: room.minutes,
    online: [...room.clients].filter(client => client.color).map(client => client.color),
    rematch: [...room.rematch], division:room.division || null }
  for (const client of only ? [only] : room.clients) send(client, state)
}

function handle(socket, message) {
  const { type } = message
  if (type === 'ping') return send(socket, { type: 'pong', stamp: message.stamp })
  if (type === 'ladder') {
    const division = message.division
    if (!['bullet','blitz','rapid'].includes(division)) throw new Error('Unknown ladder')
    return send(socket,{type:'ladder',...ratings.summary(socket.profile,division)})
  }
  if (type === 'identify') {
    if (socket.profile) return
    const {key,token} = ratings.authenticate(message.token)
    socket.profile = key
    return send(socket,{type:'profile',token})
  }
  if (type === 'leave') return leave(socket)
  if (type === 'create' || type === 'queue') {
    const minutes = message.minutes
    if (!TIMES.includes(minutes)) throw new Error('Choose a valid time control')
    const division = message.ranked && type === 'queue' ? category(minutes) : null
    if (message.ranked && (!division || !socket.profile)) throw new Error('Choose a ranked time control and connect your profile')
    leave(socket)
    if (type === 'queue') {
      const queueKey = (division || 'casual')+':'+minutes
      const waiting = queue.get(queueKey)
      if (!waiting || waiting.readyState !== WebSocket.OPEN) {
        queue.set(queueKey, socket)
        return send(socket, { type: 'queued' })
      }
      if (division && waiting.profile === socket.profile) throw new Error('Already queued on another tab')
      queue.delete(queueKey)
      const [room, color] = makeRoom(minutes, 'random')
      room.division = division
      if (division) room.players = {[color]:waiting.profile,[opposite(color)]:socket.profile}
      seat(room, waiting, color)
      seat(room, socket, opposite(color))
      room.match = new Match({ minutes })
      return broadcast(room)
    }
    const [room, color] = makeRoom(minutes, message.color)
    seat(room, socket, color)
    return broadcast(room)
  }
  if (type === 'join') {
    const room = rooms.get(String(message.code || '').trim().toUpperCase())
    if (!room) throw new Error('Room not found')
    const existing = Object.keys(room.seats).find(color => room.seats[color] === message.token)
    const color = existing || (!message.spectate && ['w', 'b'].find(color => !room.seats[color])) || null
    seat(room, socket, color, existing ? message.token : undefined)
    room.updated = Date.now()
    if (!room.match && room.seats.w && room.seats.b) room.match = new Match({ minutes: room.minutes })
    return broadcast(room)
  }
  const { room, color } = socket
  if (!room?.match || !color) throw new Error('Join as a player first')
  const { match } = room
  match.tick()
  if (type === 'rematch' && match.result) {
    room.rematch.add(color)
    if (room.rematch.size === 2) {
      room.match = new Match({ minutes: room.minutes })
      room.rematch.clear()
      room.rated = false
      room.sequence++
    }
  } else {
    if (match.result) throw new Error('This game has ended')
    if (type === 'move' && message.seq === room.sequence) match.move(message.move, color)
    else if (type === 'resign') match.finish(opposite(color), 'Resignation')
    else if (type === 'draw' && match.drawOffer === opposite(color)) match.finish(null, 'Draw by agreement')
    else if (type === 'draw' && !match.drawOffer) match.drawOffer = color
    else if (type === 'claim') match.claim(color, message.move)
    else throw new Error('Action unavailable or out of date')
    if (type === 'move') room.sequence++
  }
  room.updated = Date.now()
  rate(room)
  broadcast(room)
}

sockets.on('connection', socket => {
  socket.alive = true
  socket.on('pong', () => { socket.alive = true })
  socket.on('error', () => {})
  socket.on('close', () => leave(socket))
  socket.on('message', buffer => {
    try { handle(socket, JSON.parse(buffer)) }
    catch (error) {
      send(socket, { type: 'error', message: error.message })
      if (socket.room) broadcast(socket.room, socket)
    }
  })
})

setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    const before = room.match?.result
    room.match?.tick(now)
    if (!before && room.match?.result) {
      room.updated = now
      rate(room)
      broadcast(room)
    }
    const inactiveFor = !room.match || room.match.result ? 30 * 60000 : 24 * 3600000
    if (now - room.updated > inactiveFor) {
      for (const client of room.clients) {
        client.room = null
        send(client, { type: 'expired' })
      }
      rooms.delete(code)
    }
  }
}, 250).unref()

setInterval(() => {
  for (const socket of sockets.clients) {
    if (!socket.alive) socket.terminate()
    else { socket.alive = false; socket.ping() }
  }
}, 15000).unref()

server.listen(Number(process.env.PORT || 8787), '0.0.0.0', () => console.log('Chess server listening', server.address().port))
