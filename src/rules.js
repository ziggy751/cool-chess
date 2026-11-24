import { Chess } from 'chess.js'
import { Chess as Chessops } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeChess } from './variants.js'

export const START = new Chess().fen()
export const TIMES = [0, 1, 2, 3, 5, 10, 15, 30]
export const validClock = (minutes,increment=0) => Number.isInteger(minutes) && minutes>=0 && minutes<=180
  && Number.isInteger(increment) && increment>=0 && increment<=60 && (minutes>0 || increment===0)
export const opposite = color => color === 'w' ? 'b' : 'w'
const positionKey = fen => fen.split(' ').slice(0, 4).join(' ')

export class Match {
  constructor({ fen, variant = 'standard', minutes = 10, increment = 0, now = Date.now() } = {}) {
    if (!validClock(minutes,increment)) throw new Error('Unsupported time control')
    this.variant = variant
    this.chess = makeChess(fen,variant)
    if (this.chess instanceof Chess) {
      for (const [color,rank] of [['w','1'],['b','8']]) {
        const king=this.chess.get('e'+rank)
        const right=this.chess.get('h'+rank)
        const left=this.chess.get('a'+rank)
        if (king?.type!=='k' || king.color!==color) this.chess.setCastlingRights(color,{k:false,q:false})
        else {
          if (right?.type!=='r' || right.color!==color) this.chess.setCastlingRights(color,{k:false})
          if (left?.type!=='r' || left.color!==color) this.chess.setCastlingRights(color,{q:false})
        }
      }
    }
    this.initial = this.chess.fen()
    this.minutes = minutes
    this.increment = increment
    this.began = now
    this.finishedAt = null
    this.clocks = { w: minutes * 60000, b: minutes * 60000 }
    this.started = now
    this.result = null
    this.drawOffer = null
    this.occurrences = new Map([[this.key(), 1]])
    this.checkResult(now)
  }

  static restore(record) {
    const match=new Match({fen:record.initial,variant:record.variant,minutes:record.minutes,increment:record.increment,now:0})
    for(const move of record.moves) match.move(move,undefined,0)
    for(const key of ['started','began','finishedAt','clocks','drawOffer','result']) {
      if (record[key]!==undefined) match[key]=record[key]
    }
    if(record.began===undefined)match.began=record.started
    return match
  }

  save() {
    return {initial:this.initial,variant:this.variant,minutes:this.minutes,increment:this.increment,
      started:this.started,began:this.began,finishedAt:this.finishedAt,clocks:this.clocks,drawOffer:this.drawOffer,result:this.result,
      moves:this.chess.history({verbose:true}).map(({from,to,promotion,drop})=>({from,to,promotion,drop}))}
  }

  key() { return this.chess.positionKey?.() ?? positionKey(this.chess.fen()) }
  halfmoves() { return this.chess.halfmoves?.() ?? Number(this.chess.fen().split(' ')[4]) }

  remaining(now = Date.now()) {
    const clocks = { ...this.clocks }
    if (this.minutes && !this.result) {
      const turn = this.chess.turn()
      clocks[turn] = Math.max(0, clocks[turn] - Math.max(0, now - this.started))
    }
    return clocks
  }

  finish(winner, reason, now = Date.now()) {
    if (this.result) return
    this.clocks = this.remaining(now)
    this.result = { winner, reason }
    this.finishedAt = now
    this.drawOffer = null
  }

  tick(now = Date.now()) {
    const turn = this.chess.turn()
    if (!this.result && this.minutes && this.remaining(now)[turn] === 0) {
      const opponent = opposite(turn)
      const victor=opponent==='w'?'white':'black'
      const variant=this.chess.pos
      const ordinary=variant || parseFen(this.chess.fen()).chain(setup=>Chessops.fromSetup(setup)).unwrap(
        value=>value,()=>null)
      const canMate=ordinary ? !ordinary.hasInsufficientMaterial(victor) :
        this.chess.board().flat().some(piece=>piece?.color===opponent && piece.type!=='k')
      this.finish(canMate ? opponent : null, canMate ? 'Time forfeit' : 'Timeout with insufficient mating material', now)
    }
  }

  move(move, color = this.chess.turn(), now = Date.now()) {
    this.tick(now)
    if (this.result || color !== this.chess.turn()) throw new Error('It is not your turn')
    const clocks = this.remaining(now)
    const played = this.legalMove(move)
    if (this.minutes) clocks[color]+=this.increment*1000
    this.clocks = clocks
    this.started = now
    this.drawOffer = null
    const key = this.key()
    this.occurrences.set(key, (this.occurrences.get(key) || 0) + 1)
    this.checkResult(now)
    return played
  }

  legalMove(move) {
    const played=this.chess.move(move)
    if(played.captured==='k') {
      this.chess.undo()
      throw new Error('A king cannot be captured')
    }
    return played
  }

  repetition() {
    return this.occurrences.get(this.key()) || 0
  }

  claimable() {
    if (this.result) return null
    if (this.repetition() >= 3) return 'Threefold repetition'
    if (this.variant !== 'crazyhouse' && this.halfmoves() >= 100) return '50-move rule'
    return null
  }

  claim(color, move, now = Date.now()) {
    this.tick(now)
    if (this.result || color !== this.chess.turn()) throw new Error('A draw cannot be claimed now')
    const current = this.claimable()
    if (current) return this.finish(null, current, now)
    if (!move) throw new Error('No draw can be claimed')
    this.legalMove(move)
    const key = this.key()
    const halfmoves = this.halfmoves()
    this.chess.undo()
    const reason = (this.occurrences.get(key) || 0) >= 2
      ? 'Threefold repetition' : this.variant !== 'crazyhouse' && halfmoves >= 100 ? '50-move rule' : null
    if (!reason) throw new Error('That move does not qualify for a draw')
    this.finish(null, reason, now)
  }

  checkResult(now) {
    const variant = this.chess.variantOutcome?.()
    if (variant?.winner) this.finish(variant.winner === 'white' ? 'w' : 'b',this.variant==='3check'?'Third check':'King reached the center',now)
    else if (this.chess.isCheckmate()) this.finish(opposite(this.chess.turn()), 'Checkmate', now)
    else if (this.chess.isStalemate()) this.finish(null, 'Stalemate', now)
    else if (this.chess.isInsufficientMaterial()) this.finish(null, 'Insufficient material', now)
    else if (this.repetition() >= 5) this.finish(null, 'Fivefold repetition', now)
    else if (this.variant !== 'crazyhouse' && this.halfmoves() >= 150) this.finish(null, '75-move rule', now)
  }

  snapshot(now = Date.now()) {
    this.tick(now)
    return { variant:this.variant, fen: this.chess.fen(), initial: this.initial, moves: this.chess.history({ verbose: true }),
      clocks: this.remaining(now), minutes: this.minutes, increment:this.increment, duration:Math.max(0,(this.finishedAt ?? now)-this.began), result: this.result,
      drawOffer: this.drawOffer, claimable: this.claimable() }
  }
}
