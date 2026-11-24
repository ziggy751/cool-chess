import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Match } from '../src/rules.js'
import { chess960Fen, fogVisibility } from '../src/variants.js'

test('Chess960 generates valid ranks and supports a stationary king when castling', () => {
  for (let i=0;i<60;i++) {
    const fen = chess960Fen()
    const first = fen.split('/')[0]
    assert.equal(first.indexOf('b')%2 + first.lastIndexOf('b')%2,1)
    assert.ok(first.indexOf('r')<first.indexOf('k') && first.indexOf('k')<first.lastIndexOf('r'))
    assert.doesNotThrow(()=>new Match({fen,variant:'chess960'}))
  }
  const match = new Match({fen:'4k3/8/8/8/8/8/8/R5KR w HA - 0 1',variant:'chess960',minutes:0})
  const move = match.move({from:'g1',to:'h1'})
  assert.equal(move.flags,'k')
  assert.equal(move.landing,'g1')
  assert.equal(match.chess.get('g1').type,'k')
  assert.equal(match.chess.get('f1').type,'r')
  assert.equal(match.chess.get('h1'),undefined)
})

test('King of the Hill ends when a legal king move reaches the center', () => {
  const match = new Match({fen:'7k/8/8/8/8/4K3/8/8 w - - 0 1',variant:'kingofthehill',minutes:0})
  match.move({from:'e3',to:'e4'})
  assert.deepEqual(match.result,{winner:'w',reason:'King reached the center'})
})

test('Three-Check ends on the third check', () => {
  const match = new Match({fen:'7k/8/8/8/8/8/R7/K7 w - - 1+3 0 1',variant:'3check',minutes:0})
  match.move({from:'a2',to:'a8'})
  assert.deepEqual(match.result,{winner:'w',reason:'Third check'})
})

test('Crazyhouse pockets hold captures and restrict pawn drops', () => {
  const match = new Match({variant:'crazyhouse',minutes:0})
  for (const move of ['e4','d5','exd5','Qxd5']) match.move(move)
  assert.equal(match.chess.pockets().p,1)
  assert.throws(()=>match.move({drop:'p',to:'e8'}))
  assert.throws(()=>match.move({drop:'p',to:'e1'}))
  match.move({drop:'p',to:'c3'})
  assert.equal(match.chess.get('c3').type,'p')
  assert.equal(match.chess.pockets().p,1)
})

test('Fog shows only own pieces and legal destinations', () => {
  const match = new Match({variant:'fog',minutes:0})
  const initial = fogVisibility(match.chess)
  assert.ok(initial.has('e4') && initial.has('e2'))
  assert.ok(!initial.has('e8') && !initial.has('e5'))
  match.move('e4')
  assert.ok(fogVisibility(match.chess).has('e8'))
})
