import { Chess } from 'chess.js'
import { chooseFishMove, fishOptions, fishLimits } from './bot-moves.js'

export class Engine {
  constructor() {
    this.pending = null
  }

  start() {
    if(this.ready)return
    this.worker = new Worker('/engine/stockfish-19-lite-single.js')
    this.ready = new Promise((resolve, reject) => {
      this.finishReady=resolve
      this.worker.onerror = () => {
        const error = new Error('Stockfish could not start')
        reject(error)
        this.pending?.reject(error)
        this.pending=null
      }
      this.worker.onmessage = ({ data }) => {
        for (const line of String(data).split('\n')) {
          if (line === 'uciok') this.worker.postMessage('isready')
          if (line === 'readyok') resolve()
          if (line.startsWith('info ') && this.pending) {
            const score = line.match(/\bscore (cp|mate) (-?\d+)/)
            if (score && !/lowerbound|upperbound/.test(line)) {
              const rank = Number(line.match(/\bmultipv (\d+)/)?.[1] || 1)
              const data = {type:score[1],value:+score[2]}
              const pv = line.match(/\bpv (.+)$/)?.[1].trim().split(/\s+/)
              const depth = Number(line.match(/\bdepth (\d+)/)?.[1] || 0)
              if (rank===1) this.pending.score = data
              if (pv?.length) this.pending.lines.set(rank,{rank,move:pv[0],score:data,pv,depth})
            }
          }
          if (line.startsWith('bestmove ') && this.pending) {
            const request = this.pending
            this.pending = null
            request.resolve({move:line.split(' ')[1],score:request.score,
              lines:[...request.lines.values()].sort((a,b)=>a.rank-b.rank)})
          }
        }
      }
    })
    this.worker.postMessage('uci')
  }

  async weakMove(data,time) {
    const minimum=performance.now()+Math.min(time,2000)
    const worker=this.beginner ||= new Worker(new URL('./beginner-worker.js',import.meta.url),{type:'module'})
    const move=await new Promise((resolve,reject)=>{
      this.weakResolve=resolve
      worker.onmessage=({data})=>{
        this.weakResolve=null
        if(data.error)reject(new Error(data.error))
        else resolve(data.move)
      }
      worker.onerror=event=>reject(new Error(event.message || 'Beginner engine failed'))
      worker.postMessage(data)
    })
    if(performance.now()<minimum)await new Promise(resolve=>setTimeout(resolve,minimum-performance.now()))
    return this.closed?null:move
  }

  async profileMove(fen,profile,time) {
    if(profile.beginner)return this.weakMove({fen,profile},time ?? Math.max(65,230-profile.abilities.time*4))
    const budget=time ?? profile.searchTime
    const result=await this.search(fen,30,budget,profile.lines,{profile})
    return chooseFishMove(fen,result,profile)
  }

  async move(fen, level, time, style) {
    if (level<=10) return this.weakMove({fen,level,style},time)
    const expressive = level>9 && level<28 && style!==undefined && ![7,9].includes(style)
    const result = await this.search(fen,level,Math.max(28,time),expressive?3:1)
    if (!expressive || result?.score?.type!=='cp') return result?.move
    let choice = result.move, best = -Infinity
    for (const line of result.lines) {
      if (line.score.type!=='cp' || result.score.value-line.score.value>70) continue
      const chess = new Chess(fen)
      const move = chess.move({from:line.move.slice(0,2),to:line.move.slice(2,4),promotion:line.move[4]})
      const takes = move.captured ? 28 : 0
      const checks = chess.isCheck() ? 35 : 0
      const center = /^[c-f][3-6]$/.test(move.to) ? 24 : 0
      const castling = /[kq]/.test(move.flags) ? 55 : 0
      const styleBonus = [center-checks,castling-takes,checks+takes,center,center+takes,takes,checks*2,takes,checks+takes][style] || 0
      const value = line.score.value+styleBonus
      if (value>best) { choice = line.move; best = value }
    }
    return choice
  }

  async search(fen,level,time,lines = 1,{depth,rootMove,profile}={}) {
    if(this.closed)return null
    this.start()
    await this.ready
    if (this.closed) return null
    if (this.pending) throw new Error('Stockfish is already searching')
    const skill = Math.round((level - 1) * 20 / 29)
    const options=profile?fishOptions(profile):[
      'setoption name Skill Level value '+skill,
      'setoption name UCI_LimitStrength value '+(level>=10 && level<28),
      'setoption name UCI_Elo value '+Math.max(1320,Math.min(2900,level*100)),
      'setoption name MultiPV value '+lines,
    ]
    for(const option of options)this.worker.postMessage(option)
    this.worker.postMessage('position fen ' + fen)
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, lines:new Map() }
      const limits=profile?fishLimits(profile,time):'movetime '+time+(depth?' depth '+depth:'')
      this.worker.postMessage('go '+limits+(rootMove?' searchmoves '+rootMove:''))
    })
  }

  close() {
    this.closed = true
    this.finishReady?.()
    this.pending?.resolve(null)
    this.pending=null
    this.weakResolve?.(null)
    this.beginner?.terminate()
    this.worker?.terminate()
  }
}
