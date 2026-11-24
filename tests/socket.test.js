import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import WebSocket from 'ws'

const workerUrl = process.env.CHESS_TEST_WS_URL

test('server validates moves, reconnects seats, and persists ranked results', {timeout:15000}, async () => {
  const folder = await mkdtemp(join(tmpdir(),'chess-test-'))
  const path = join(folder,'ratings.json')
  const clients = []
  let server
  async function start() {
    if (workerUrl) return workerUrl
    server = spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:'0',CHESS_RATINGS_PATH:path}})
    const [chunk] = await once(server.stdout,'data')
    return 'ws://127.0.0.1:'+String(chunk).trim().split(' ').at(-1)+'/socket'
  }
  async function connect(url) {
    const socket = new WebSocket(url)
    clients.push(socket)
    const messages = []
    socket.on('message',packet=>messages.push(JSON.parse(packet)))
    await once(socket,'open')
    return {
      socket,
      send(message) { socket.send(JSON.stringify(message)) },
      async next(type) {
        for (let attempt=0;attempt<250;attempt++) {
          const index = messages.findIndex(message=>message.type===type)
          if (index>=0) return messages.splice(index,1)[0]
          await new Promise(resolve=>setTimeout(resolve,10))
        }
        assert.fail('Missing '+type)
      },
    }
  }
  async function stop() {
    for (const socket of clients.splice(0)) socket.terminate()
    if (server && server.exitCode===null && server.signalCode===null) {
      server.kill()
      await once(server,'exit')
    }
  }
  try {
    let url = await start()
    const a = await connect(url)
    const b = await connect(url)
    a.send({type:'identify'})
    b.send({type:'identify'})
    const profile = (await a.next('profile')).token
    await b.next('profile')
    a.send({type:'queue',minutes:3,ranked:true})
    await a.next('queued')
    b.send({type:'queue',minutes:3,ranked:true})
    const first = await a.next('joined')
    const second = await b.next('joined')
    assert.equal(first.code,second.code)
    const [white,black] = first.color==='w' ? [a,b] : [b,a]
    const seat = first.color==='w' ? second : first
    assert.equal((await white.next('state')).seq,0)
    assert.equal((await black.next('state')).division,'blitz')
    black.send({type:'move',seq:0,move:{from:'e7',to:'e5'}})
    assert.match((await black.next('error')).message,/your turn/)
    await black.next('state')
    white.send({type:'move',seq:0,move:{from:'e2',to:'e4'}})
    assert.equal((await white.next('state')).seq,1)
    const moved = await black.next('state')
    assert.equal(moved.match.moves[0].san,'e4')
    assert.ok(moved.match.clocks.w<=180000)
    white.send({type:'move',seq:0,move:{from:'e2',to:'e4'}})
    assert.match((await white.next('error')).message,/out of date/)
    const spectator = await connect(url)
    spectator.send({type:'join',code:first.code,spectate:true})
    assert.equal((await spectator.next('joined')).color,null)
    assert.equal((await spectator.next('state')).seq,1)
    black.socket.terminate()
    const resumed = await connect(url)
    resumed.send({type:'join',code:seat.code,token:seat.token})
    assert.equal((await resumed.next('joined')).color,'b')
    assert.equal((await resumed.next('state')).match.moves[0].san,'e4')
    resumed.send({type:'resign'})
    assert.equal((await resumed.next('state')).match.result.winner,'w')
    await stop()
    url = await start()
    const restored = await connect(url)
    restored.send({type:'identify',token:profile})
    assert.equal((await restored.next('profile')).token,profile)
    restored.send({type:'ladder',division:'blitz'})
    const ladder = await restored.next('ladder')
    assert.ok(ladder.leaderboard.some(entry=>entry.name===ladder.player.name))
    assert.equal(ladder.player.rating, first.color==='w'?1220:1180)
    if (!workerUrl) assert.deepEqual(ladder.leaderboard.map(entry=>entry.rating),[1220,1180])
    assert.equal(ladder.player.games,1)
  } finally {
    await stop()
    await rm(folder,{recursive:true,force:true})
  }
})
