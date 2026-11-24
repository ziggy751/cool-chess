import { Chess } from 'chess.js'
import { makeChess } from './variants.js'

export const START = new Chess().fen()
export const TIMES = [0, 1, 2, 3, 5, 10, 15, 30]
export const opposite = color => color === 'w' ? 'b' : 'w'
const positionKey = fen => fen.split(' ').slice(0, 4).join(' ')

export class Match {
  constructor({ fen, variant = 'standard', minutes = 10, now = Date.now() } = {}) {
    if (!TIMES.includes(minutes)) throw new Error('Unsupported time control')
    this.variant = variant
    this.chess = makeChess(fen,variant)
    this.initial = this.chess.fen()
    this.minutes = minutes
    this.clocks = { w: minutes * 60000, b: minutes * 60000 }
    this.started = now
    this.result = null
    this.drawOffer = null
    this.occurrences = new Map([[this.key(), 1]])
    this.checkResult()
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
    this.drawOffer = null
  }

  tick(now = Date.now()) {
    const turn = this.chess.turn()
    if (!this.result && this.minutes && this.remaining(now)[turn] === 0) {
      const opponent = opposite(turn)
      const material = this.chess.board().flat().filter(Boolean)
      const matingPieces = material.filter(piece => piece.color === opponent && piece.type !== 'k')
      const bareLoser = material.filter(piece => piece.color === turn).length === 1
      const canMate = this.variant !== 'standard' && this.variant !== 'fog' ? !this.chess.pos.hasInsufficientMaterial(opponent==='w'?'white':'black') : matingPieces.length > 0 && !(bareLoser && matingPieces.length === 1 && /[bn]/.test(matingPieces[0].type))
      this.finish(canMate ? opponent : null, canMate ? 'Time forfeit' : 'Timeout with insufficient mating material', now)
    }
  }

  move(move, color = this.chess.turn(), now = Date.now()) {
    this.tick(now)
    if (this.result || color !== this.chess.turn()) throw new Error('It is not your turn')
    const clocks = this.remaining(now)
    const played = this.chess.move(move)
    this.clocks = clocks
    this.started = now
    this.drawOffer = null
    const key = this.key()
    this.occurrences.set(key, (this.occurrences.get(key) || 0) + 1)
    this.checkResult(now)
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
    this.chess.move(move)
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
      clocks: this.remaining(now), minutes: this.minutes, result: this.result,
      drawOffer: this.drawOffer, claimable: this.claimable() }
  }
}
