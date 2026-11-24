import { Chess } from 'chess.js'

export class Engine {
  constructor() {
    this.worker = new Worker('/engine/stockfish-19-lite-single.js')
    this.pending = null
    this.ready = new Promise((resolve, reject) => {
      this.worker.onerror = () => {
        const error = new Error('Stockfish could not start')
        reject(error)
        this.pending?.reject(error)
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
              const uci = line.match(/\bpv (\S+)/)?.[1]
              if (rank===1) this.pending.score = data
              if (uci) this.pending.lines.set(rank,{move:uci,score:data})
            }
          }
          if (line.startsWith('bestmove ') && this.pending) {
            const request = this.pending
            this.pending = null
            request.resolve({move:line.split(' ')[1],score:request.score,lines:[...request.lines.values()]})
          }
        }
      }
    })
    this.worker.postMessage('uci')
  }

  async move(fen, level, time, style) {
    const expressive = level>9 && level<28 && style!==undefined && ![7,9].includes(style)
    const result = await this.search(fen,level,time,expressive?3:1)
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

  async search(fen,level,time,lines = 1) {
    await this.ready
    if (this.closed) return null
    if (this.pending) throw new Error('Stockfish is already searching')
    const skill = Math.round((level - 1) * 20 / 29)
    this.worker.postMessage('setoption name Skill Level value ' + skill)
    this.worker.postMessage('setoption name UCI_LimitStrength value ' + (level >= 10 && level < 28))
    this.worker.postMessage('setoption name UCI_Elo value ' + Math.round(1320 + Math.min(17, Math.max(0, level - 10)) * 65))
    this.worker.postMessage('setoption name MultiPV value ' + lines)
    this.worker.postMessage('position fen ' + fen)
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, lines:new Map() }
      this.worker.postMessage('go movetime ' + time)
    })
  }

  close() {
    this.closed = true
    this.pending?.resolve(null)
    this.worker.terminate()
  }
}
