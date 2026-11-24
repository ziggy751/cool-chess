import { Chess as Standard } from 'chess.js'
import { defaultPosition, setupPosition, castlingSide } from 'chessops/variant'
import { makeFen, parseFen } from 'chessops/fen'
import { makeSanAndPlay, parseSan } from 'chessops/san'
import { makeSquare, parseSquare, roleToChar, charToRole, kingCastlesTo, rookCastlesTo } from 'chessops/util'

export const variants = {
  standard: 'Classic Chess',
  chess960: 'Chess960',
  kingofthehill: 'King of the Hill',
  '3check': 'Three-Check',
  crazyhouse: 'Crazyhouse',
  fog: 'Fog of War',
}
const file = i => 'abcdefgh'[i]
const side = color => color === 'white' ? 'w' : 'b'
const roles = ['queen','rook','bishop','knight']

export function chess960Fen(random = Math.random) {
  const rank = Array(8).fill('')
  const select = positions => positions[Math.floor(random()*positions.length)]
  rank[select([0,2,4,6])] = 'b'
  rank[select([1,3,5,7])] = 'b'
  for (const type of ['q','n','n']) rank[select(rank.map((piece,i)=>piece ? -1 : i).filter(i=>i>=0))] = type
  const empty = rank.map((piece,i)=>piece ? -1 : i).filter(i=>i>=0)
  for (const [index,type] of ['r','k','r'].entries()) rank[empty[index]] = type
  const white = rank.join('').toUpperCase()
  const rights = file(empty[2])+file(empty[0])
  return rank.join('')+'/pppppppp/8/8/8/8/PPPPPPPP/'+white+' w '+rights.toUpperCase()+rights+' - 0 1'
}

export function makeChess(fen,variant='standard') {
  if (variant==='standard' || variant==='fog') return new Standard(fen)
  return new VariantChess(fen,variant)
}

class VariantChess {
  constructor(fen,variant) {
    const rules = variant === 'chess960' ? 'chess' : variant
    const initial = fen || (variant==='chess960' ? chess960Fen() : null)
    this.pos = initial ? setupPosition(rules,parseFen(initial).unwrap()).unwrap() : defaultPosition(rules)
    this.played = []
    this.previous = []
  }
  fen() { return makeFen(this.pos.toSetup()) }
  turn() { return side(this.pos.turn) }
  board() { return Array.from({length:8},(_,row)=>Array.from({length:8},(_,col)=>this.get(file(col)+(8-row)) || null)) }
  get(square) {
    const piece = this.pos.board.get(parseSquare(square))
    return piece ? {square,color:side(piece.color),type:roleToChar(piece.role)} : undefined
  }
  isCheck() { return this.pos.isCheck() }
  isCheckmate() { return this.pos.isCheckmate() }
  isStalemate() { return this.pos.isStalemate() }
  isInsufficientMaterial() { return this.pos.isInsufficientMaterial() }
  variantOutcome() { return this.pos.variantOutcome() }
  remainingChecks() { return this.pos.remainingChecks }
  halfmoves() { return this.pos.halfmoves }
  positionKey() { return makeFen(this.pos.toSetup(),{epd:true}) }
  history({verbose}={}) { return this.played.map(move=>verbose?move:move.san) }

  pockets() {
    const pocket = this.pos.pockets?.[this.pos.turn]
    return pocket ? Object.fromEntries(['pawn',...roles].map(role=>[roleToChar(role),pocket[role]])) : null
  }

  describe(move) {
    const color = this.turn()
    if ('role' in move) return {drop:roleToChar(move.role),to:makeSquare(move.to),color,piece:roleToChar(move.role),flags:'d'}
    const from = makeSquare(move.from)
    const to = makeSquare(move.to)
    const type = this.get(from)?.type
    const castle = castlingSide(this.pos,move)
    if (castle) return {from,to,landing:makeSquare(kingCastlesTo(this.pos.turn,castle)),
      rookFrom:to,rookTo:makeSquare(rookCastlesTo(this.pos.turn,castle)),color,piece:type,flags:castle==='h'?'k':'q'}
    const ep = type==='p' && move.to===this.pos.epSquare && !this.get(to)
    const captured = ep ? 'p' : this.get(to)?.type
    return {from,to,color,piece:type,captured,promotion:move.promotion ? roleToChar(move.promotion) : undefined,
      flags:ep?'e':captured?'c':'n'}
  }

  moves({square,drop,verbose}={}) {
    const ctx = this.pos.ctx()
    const candidates = []
    if (drop) {
      for (const to of this.pos.dropDests(ctx)) {
        const move = {role:charToRole(drop),to}
        if (this.pos.isLegal(move,ctx)) candidates.push(move)
      }
    } else {
      const fromSquares = square ? [parseSquare(square)] : this.pos.board[this.pos.turn]
      for (const from of fromSquares) for (const to of this.pos.dests(from,ctx)) {
        const promote = this.pos.board.getRole(from)==='pawn' && (to<8 || to>=56)
        if (promote) for (const promotion of roles) candidates.push({from,to,promotion})
        else candidates.push({from,to})
      }
    }
    return candidates.map(move=>verbose ? this.describe(move) : makeSanAndPlay(this.pos.clone(),move))
  }

  move(input) {
    const move = typeof input==='string' ? parseSan(this.pos,input) :
      input.drop ? {role:charToRole(input.drop),to:parseSquare(input.to)} :
        {from:parseSquare(input.from),to:parseSquare(input.to),promotion:input.promotion ? charToRole(input.promotion) : undefined}
    if (!move || !this.pos.isLegal(move)) throw new Error('Illegal variant move')
    const detail = this.describe(move)
    const before = this.fen()
    this.previous.push(this.pos.clone())
    const san = makeSanAndPlay(this.pos,move)
    const played = {...detail,before,after:this.fen(),san}
    this.played.push(played)
    return played
  }
  undo() {
    if (!this.previous.length) return null
    this.pos = this.previous.pop()
    return this.played.pop()
  }
}

export function fogVisibility(chess) {
  const visible = new Set()
  for (const piece of chess.board().flat().filter(piece=>piece?.color===chess.turn())) {
    visible.add(piece.square)
    for (const move of chess.moves({square:piece.square,verbose:true})) visible.add(move.to)
  }
  return visible
}
