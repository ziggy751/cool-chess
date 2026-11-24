import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { Chess } from 'chess.js'
import { beginnerMove } from '../src/beginner.js'

const games = Number(process.argv[2] || 8)
if (!Number.isInteger(games) || games<2 || games>100) throw new Error('Choose 2–100 games per matchup')
const fish=spawn(process.execPath,['node_modules/stockfish/bin/stockfish-19-lite-single.js'])
const lines=createInterface({input:fish.stdout})
function waitFor(prefix) {
  return new Promise((resolve,reject)=>{
    const close = () => reject(new Error('Stockfish exited'))
    fish.once('exit',close)
    const callback=line=>{
      if (line.startsWith(prefix)) {
        lines.off('line',callback)
        fish.off('exit',close)
        resolve(line)
      }
    }
    lines.on('line',callback)
  })
}
const write = command => fish.stdin.write(command+'\n')
const weightedRandom = seed => () => {
  seed = (1664525*seed+1013904223)>>>0
  return seed/4294967296
}
const values={p:1,n:3,b:3,r:5,q:9,k:0}
const openings=[[],['e4','e5','Nf3','Nc6'],['d4','d5','c4','e6'],['c4','e5','Nc3','Nf6']]
const playUci=(chess,move)=>chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]})

async function choose(chess,level,random) {
  if (level<=10) return beginnerMove(chess.fen(),level,(level-1)%10,random)
  write('setoption name Skill Level value '+Math.round((level-1)*20/29))
  write('setoption name UCI_LimitStrength value true')
  write('setoption name UCI_Elo value '+Math.max(1320,level*100))
  write('position fen '+chess.fen())
  const response=waitFor('bestmove ')
  write('go nodes 1500')
  return (await response).split(' ')[1]
}
try {
  const ready=waitFor('uciok')
  write('uci')
  await ready
  const alive=waitFor('readyok')
  write('isready')
  await alive
  for(const [weak,strong] of [[1,5],[5,10],[10,15]]) {
    const sample={matchup:[weak*100,strong*100],games,finished:{stronger:0,weaker:0,draw:0},
      capped:{strongerAhead:0,weakerAhead:0,level:0},legalPlies:0,elapsedMs:0}
    const start=Date.now()
    for(let game=0;game<games;game++){
      const chess=new Chess()
      write('ucinewgame')
      for(const move of openings[Math.floor(game/2)%openings.length])chess.move(move)
      const stronger=game%2?'b':'w'
      const random=weightedRandom(21621+game*1331+strong*37)
      for(let ply=0;ply<72 && !chess.isGameOver();ply++){
        const level=chess.turn()===stronger?strong:weak
        const move=await choose(chess,level,random)
        playUci(chess,move)
        sample.legalPlies++
      }
      if(chess.isCheckmate()) sample.finished[chess.turn()===stronger?'weaker':'stronger']++
      else if(chess.isGameOver()) sample.finished.draw++
      else {
        const balance=chess.board().flat().reduce((sum,piece)=>piece?sum+(piece.color===stronger?1:-1)*values[piece.type]:sum,0)
        sample.capped[balance>0?'strongerAhead':balance<0?'weakerAhead':'level']++
      }
    }
    sample.elapsedMs=Date.now()-start
    console.log(JSON.stringify(sample))
  }
} finally {fish.kill()}
