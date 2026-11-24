import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { randomBytes } from 'node:crypto'
import { WebSocketServer } from 'ws'
import { Ratings } from './rating.js'
import { createGames } from './game.js'

const root = resolve('dist')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.wasm': 'application/wasm', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain' }
const games = createGames(new Ratings(), (bytes = 24) => randomBytes(bytes).toString('hex'))
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

sockets.on('connection', socket => {
  socket.alive = true
  socket.on('pong', () => { socket.alive = true })
  socket.on('error', () => {})
  socket.on('close', () => games.leave(socket))
  socket.on('message', buffer => {
    games.receive(socket,buffer.toString())
    games.changed.clear()
  })
})

setInterval(() => {
  games.tick()
  games.changed.clear()
},250).unref()

setInterval(() => {
  for (const socket of sockets.clients) {
    if (!socket.alive) socket.terminate()
    else { socket.alive = false; socket.ping() }
  }
}, 15000).unref()

server.listen(Number(process.env.PORT || 8787), '0.0.0.0', () => console.log('Chess server listening', server.address().port))
