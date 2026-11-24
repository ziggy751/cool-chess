import { DurableObject } from 'cloudflare:workers'
import { createHash, randomBytes } from 'node:crypto'
import { Match } from '../src/rules.js'
import { createGames } from './game.js'
import { RatingsCore } from './ratings.js'

const id = (bytes = 24) => randomBytes(bytes).toString('hex')
const hash = token => createHash('sha256').update(token).digest('hex')

function saveRoom(room) {
  const {clients,match,rematch,...fields} = room
  return {...fields,rematch:[...rematch],match:match?.save() || null}
}

function loadRoom(fields) {
  const record=fields.match
  const match=record ? Match.restore({minutes:fields.minutes,increment:fields.increment,...record}) : null
  return {...fields,match,clients:new Set(),rematch:new Set(fields.rematch)}
}

export class ChessLobby extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env)
    this.storage = ctx.storage
    this.sql = ctx.storage.sql
    this.sql.exec('CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data TEXT NOT NULL)')
    this.sql.exec('CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, data TEXT NOT NULL)')
    this.changedPlayers = new Set()
    const players = Object.fromEntries([...this.sql.exec('SELECT id, data FROM players')]
      .map(row=>[row.id,JSON.parse(row.data)]))
    const ratings = new RatingsCore(players,{hash,token:()=>id(32),changed:key=>this.changedPlayers.add(key)})
    this.games = createGames(ratings,id)
    this.ratings = ratings
    for (const row of this.sql.exec('SELECT id, data FROM rooms')) this.games.rooms.set(row.id,loadRoom(JSON.parse(row.data)))
    for (const socket of ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() || {}
      const room = this.games.rooms.get(attachment.room)
      Object.assign(socket,{room:room || null,color:attachment.color,profile:attachment.profile})
      room?.clients.add(socket)
      if (attachment.queue) this.games.queue.set(attachment.queue,socket)
    }
  }

  fetch() {
    const pair = new WebSocketPair()
    this.ctx.acceptWebSocket(pair[1])
    pair[1].serializeAttachment({})
    return new Response(null,{status:101,webSocket:pair[0]})
  }

  async webSocketMessage(socket,message) {
    this.games.receive(socket,message)
    await this.persist()
  }

  async webSocketClose(socket,code,reason) {
    this.games.leave(socket)
    if (code===1005 || code===1006) socket.close()
    else socket.close(code,reason)
    await this.persist()
  }

  async webSocketError(socket) {
    this.games.leave(socket)
    await this.persist()
  }

  async alarm() {
    this.games.tick()
    await this.persist(true)
  }

  async persist(reschedule = false) {
    const {rooms,queue,changed} = this.games
    const stateChanged = changed.size || this.changedPlayers.size
    if (stateChanged) {
      this.storage.transactionSync(() => {
        for (const code of changed) {
          const room = rooms.get(code)
          if (room) this.sql.exec('INSERT OR REPLACE INTO rooms (id,data) VALUES (?,?)',code,JSON.stringify(saveRoom(room)))
          else this.sql.exec('DELETE FROM rooms WHERE id = ?',code)
        }
        for (const key of this.changedPlayers) {
          this.sql.exec('INSERT OR REPLACE INTO players (id,data) VALUES (?,?)',key,JSON.stringify(this.ratings.players[key]))
        }
      })
      changed.clear()
      this.changedPlayers.clear()
    }
    const waiting = new Map([...queue].map(([key,socket])=>[socket,key]))
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = {room:socket.room?.code || null,color:socket.color || null,
        profile:socket.profile || null,queue:waiting.get(socket) || null}
      const previous = socket.deserializeAttachment() || {}
      if (Object.keys(attachment).some(key=>attachment[key] !== previous[key])) socket.serializeAttachment(attachment)
    }
    if (!stateChanged && !reschedule) return
    let next = Infinity
    for (const {match,updated} of rooms.values()) {
      const inactiveFor = !match || match.result ? 30*60000 : 24*3600000
      next = Math.min(next,updated+inactiveFor)
      if (match?.minutes && !match.result) next = Math.min(next,match.started+match.clocks[match.chess.turn()])
    }
    if (Number.isFinite(next)) await this.storage.setAlarm(Math.max(Date.now()+25,next))
    else await this.storage.deleteAlarm()
  }
}

export default {
  fetch(request,env) {
    const url = new URL(request.url)
    if (url.pathname !== '/socket') return env.ASSETS.fetch(request)
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket required',{status:426})
    }
    const origin = request.headers.get('Origin')
    if (origin && origin !== url.origin) return new Response('Forbidden origin',{status:403})
    return env.LOBBY.getByName('chess-lobby').fetch(request)
  },
}
