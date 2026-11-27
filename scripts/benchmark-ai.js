import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { performance } from 'node:perf_hooks'
import { Chess } from 'chess.js'
import { Match } from '../src/rules.js'
import { botProfile } from '../src/bot-profiles.js'
import { chooseFishMove, fishOptions, fishLimits, weakBotMove } from '../src/bot-moves.js'

const games = Number(process.argv[2] || 8)
const band=process.argv[3] || 'all'
if (!Number.isInteger(games) || games<2 || games>80 || games%2) throw new Error('Choose an even game count from 2 to 80')
const anchors=[0,100,200,400,600,800,1000,1200,1500,1800,2000,2400,2800,3000]
const openings=[[],['e4','e5','Nf3','Nc6','Bb5','a6'],['d4','d5','c4','e6','Nc3','Nf6'],
  ['c4','e5','Nc3','Nf6','g3','d5'],['e4','c5','Nf3','d6','d4','cxd4'],['d4','Nf6','c4','g6','Nc3','Bg7']]
const weightedRandom = seed => () => {
  seed=(1664525*seed+1013904223)>>>0
  return seed/4294967296
}
const coords=move=>({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]})
const scoreValue=score=>score?.type==='mate'?Math.sign(score.value || -1)*(10000-Math.abs(score.value)*15):score?.value

class Fish {
  constructor(){
    this.process=spawn(process.execPath,['node_modules/stockfish/bin/stockfish-19-lite-single.js'],{stdio:['pipe','pipe','inherit']})
    createInterface({input:this.process.stdout}).on('line',line=>this.listen?.(line))
    this.process.on('exit',()=>this.reject?.(new Error('Stockfish exited mid-search')))
  }
  send(command){this.process.stdin.write(command+'\n')}
  wait(prefix,command,onInfo=()=>{}){
    return new Promise((resolve,reject)=>{
      this.reject=reject
      this.listen=line=>{
        if(!line.startsWith(prefix))return onInfo(line)
        this.listen=null
        this.reject=null
        resolve(line)
      }
      this.send(command)
    })
  }
  async start(){await this.wait('uciok','uci');await this.wait('readyok','isready')}
  async search(fen,options,limits){
    for(const option of options)this.send(option)
    this.send('position fen '+fen)
    const lines=new Map()
    const answer=await this.wait('bestmove ','go '+limits,line=>{
      if(!line.startsWith('info ') || /lowerbound|upperbound/.test(line))return
      const score=line.match(/\bscore (cp|mate) (-?\d+)/)
      const pv=line.match(/\bpv (\S+)/)
      if(!score || !pv)return
      const rank=Number(line.match(/\bmultipv (\d+)/)?.[1] || 1)
      lines.set(rank,{move:pv[1],score:{type:score[1],value:+score[2]}})
    })
    return {move:answer.split(' ')[1],score:lines.get(1)?.score,lines:[...lines.values()]}
  }
  close(){this.send('quit')}
}

async function choose(fish,fen,profile,random){
  if(profile.beginner)return weakBotMove(fen,profile,random)
  const result=await fish.search(fen,fishOptions(profile),fishLimits(profile,profile.searchTime))
  return chooseFishMove(fen,result,profile,random)
}

const adjudicator=botProfile('max')
async function tournament(fish,weak,strong){
  const tally={weak,strong,games,finished:{stronger:0,weaker:0,draw:0},capped:{stronger:0,weaker:0,draw:0},plies:0,searchMs:0}
  for(let round=0;round<games;round++){
    fish.send('ucinewgame')
    const match=new Match({minutes:0,now:0})
    for(const move of openings[Math.floor(round/2)%openings.length]) match.move(move,undefined,0)
    const stronger=round%2?'b':'w'
    const profiles={[stronger]:botProfile(strong),[stronger==='w'?'b':'w']:botProfile(weak)}
    const random=weightedRandom(21621+round*1331+strong*37)
    for(let ply=0;ply<80 && !match.result;ply++){
      const started=performance.now()
      const move=await choose(fish,match.chess.fen(),profiles[match.chess.turn()],random)
      tally.searchMs+=performance.now()-started
      match.move(coords(move),undefined,0)
      tally.plies++
    }
    if(match.result) tally.finished[match.result.winner===stronger?'stronger':match.result.winner?'weaker':'draw']++
    else{
      const result=await fish.search(match.chess.fen(),fishOptions(adjudicator),'nodes 18000')
      const score=scoreValue(result.score)*(match.chess.turn()===stronger?1:-1)
      tally.capped[score>150?'stronger':score< -150?'weaker':'draw']++
    }
  }
  tally.meanMoveMs=Math.round(tally.searchMs/tally.plies)
  delete tally.searchMs
  console.log(JSON.stringify({kind:'matchup',...tally}))
}

const probes=[
  ['tactical easy','4k3/8/8/8/4q3/8/4R3/4K3 w - - 0 1'],
  ['tactical easy','4k3/8/8/2r5/3P4/8/8/4K3 w - - 0 1'],
  ['mate in one','7k/8/5KQ1/8/8/8/8/8 w - - 0 1'],
  ['mate in one','6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'],
  ['tactical hard','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'],
  ['tactical hard','r1bq1rk1/ppp2ppp/2nbpn2/3p4/3P4/2N1PN2/PPQ2PPP/R1B1KB1R w KQ - 2 8'],
  ['tactical hard','2r2rk1/1bqnbpp1/p2ppn1p/1p6/4PPP1/1NNBBQ2/PPP4P/2KR3R w - - 0 16'],
  ['opening',new Chess().fen()],
  ['opening','rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'],
  ['opening','rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'],
  ['endgame','8/8/5k2/8/4K3/4P3/8/8 w - - 0 1'],
  ['endgame','8/4k3/8/1P6/8/3K4/8/8 w - - 0 1'],
  ['endgame','8/5pk1/6p1/8/5P2/6KP/8/8 w - - 0 1'],
]
async function probesFor(fish,rating){
  const profile=botProfile(rating)
  const data={sample:0,blunders:0,loss:0,tactics:0,tacticalCount:0,missedMates:0,openingLoss:0,openings:0,endgameLoss:0,endgames:0,milliseconds:0}
  const repeats=profile.beginner?4:2
  for(const [index,[group,fen]] of probes.entries()){
    fish.send('ucinewgame')
    const best=await fish.search(fen,fishOptions(adjudicator),'nodes 22000')
    for(let seed=0;seed<repeats;seed++){
      const started=performance.now()
      const move=await choose(fish,fen,profile,weightedRandom(index*3719+seed*9109+rating*13))
      data.milliseconds+=performance.now()-started
      const replay=new Chess(fen)
      replay.move(coords(move))
      const chosen=move===best.move?best:await fish.search(fen,fishOptions(adjudicator),'nodes 22000 searchmoves '+move)
      const loss=Math.min(1000,Math.max(0,(scoreValue(best.score) ?? 0)-(scoreValue(chosen.score) ?? 0)))
      data.sample++
      data.loss+=loss
      data.blunders+=Number(loss>=200)
      if(group.startsWith('tactical') || group==='mate in one'){
        data.tacticalCount++
        data.tactics+=Number(group==='mate in one'?replay.isCheckmate():loss<=45)
      }
      if(group==='mate in one')data.missedMates+=Number(!replay.isCheckmate())
      if(group==='opening'){data.openingLoss+=loss;data.openings++}
      if(group==='endgame'){data.endgameLoss+=loss;data.endgames++}
    }
  }
  console.log(JSON.stringify({kind:'probes',rating,...data}))
}

const jobs=anchors.slice(1).flatMap((rating,index)=>include(anchors[index])?[fish=>tournament(fish,anchors[index],rating)]:[])
function include(rating){return band==='all' || (band==='low'?rating<1050:rating>=1050)}
for(const [weak,strong] of [[0,400],[200,800],[600,1200],[1000,1800],[1500,2400],[2000,3000]]){
  if(include(weak))jobs.push(fish=>tournament(fish,weak,strong))
}
jobs.reverse()
for(const rating of anchors)if(include(rating))jobs.push(fish=>probesFor(fish,rating))
await Promise.all(Array.from({length:3},async()=>{
  const fish=new Fish()
  try{
    await fish.start()
    while(jobs.length)await jobs.shift()(fish)
  }finally{fish.close()}
}))
