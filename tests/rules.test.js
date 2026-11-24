import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Match } from '../src/rules.js'

test('checks legality, turn and authoritative clocks', () => {
  const game = new Match({minutes:1,now:1000})
  assert.throws(() => game.move('e5','b',1500))
  assert.throws(() => game.move('e5','w',1500))
  game.move('e4','w',2000)
  game.move('e5','b',2400)
  assert.deepEqual(game.remaining(2500),{w:58900,b:59600})
})

test('detects checkmate and freezes the clock', () => {
  const game = new Match({minutes:1,now:0})
  for (const [i,move] of ['f3','e5','g4','Qh4#'].entries()) game.move(move,undefined,100*(i+1))
  assert.deepEqual(game.result,{winner:'b',reason:'Checkmate'})
  assert.deepEqual(game.remaining(100000),{w:59800,b:59800})
  assert.throws(() => game.move('e4',undefined,100000))
})

test('castling and en passant are applied to the actual position', () => {
  const castle = new Match({fen:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',minutes:0})
  castle.move('O-O')
  assert.equal(castle.chess.get('f1').type,'r')
  assert.equal(castle.chess.get('g1').type,'k')
  const ep = new Match({minutes:0})
  for (const move of ['e4','a6','e5','d5','exd6']) ep.move(move)
  assert.equal(ep.chess.get('d5'),undefined)
  assert.equal(ep.chess.get('d6').type,'p')
})

test('supports underpromotion and king-safety rules', () => {
  const game = new Match({fen:'7k/P7/8/8/8/8/8/7K w - - 0 1',minutes:0})
  game.move({from:'a7',to:'a8',promotion:'n'})
  assert.equal(game.chess.get('a8').type,'n')
  assert.equal(game.result.reason,'Insufficient material')
  const pinned = new Match({fen:'4r2k/8/8/8/8/8/4R3/4K3 w - - 0 1',minutes:0})
  assert.throws(() => pinned.move({from:'e2',to:'a2'}))
})

test('distinguishes claimable repetition and automatic repetition', () => {
  const cycle = ['Nf3','Nf6','Ng1','Ng8']
  const game = new Match({minutes:0})
  for (const move of [...cycle,...cycle]) game.move(move)
  assert.equal(game.claimable(),'Threefold repetition')
  assert.equal(game.result,null)
  for (const move of [...cycle,...cycle]) game.move(move)
  assert.equal(game.result.reason,'Fivefold repetition')
  const claim = new Match({minutes:0})
  for (const move of [...cycle,...cycle.slice(0,-1)]) claim.move(move)
  claim.claim('b','Ng8')
  assert.equal(claim.result.reason,'Threefold repetition')
  assert.equal(claim.chess.history().length,7)
})

test('distinguishes 50-move claims and automatic 75-move draws', () => {
  const game = new Match({fen:'7k/8/8/8/8/8/R7/7K w - - 99 50',minutes:0})
  game.move('Ra3')
  assert.equal(game.claimable(),'50-move rule')
  game.claim('b')
  assert.equal(game.result.reason,'50-move rule')
  const automatic = new Match({fen:'7k/8/8/8/8/8/R7/7K w - - 149 75',minutes:0})
  automatic.move('Ra3')
  assert.equal(automatic.result.reason,'75-move rule')
})

test('detects stalemate and basic timeout exceptions', () => {
  assert.equal(new Match({fen:'7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'}).result.reason,'Stalemate')
  const game = new Match({fen:'7k/8/8/8/8/8/R7/7K w - - 0 1',minutes:1,now:0})
  game.tick(60000)
  assert.equal(game.result.winner,null)
})
