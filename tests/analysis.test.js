import test from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'
import { accuracy, chance, explain, gradeMove, notation, variation, whiteScore } from '../src/analysis.js'

const cp=value=>({type:'cp',value})
const mate=value=>({type:'mate',value})
const judgment={top:true,loss:0,best:cp(160),played:cp(160),second:cp(130)}

test('classifications require a verified move, advantage and material concession',()=>{
  assert.equal(gradeMove({...judgment,sacrifice:3}),'Brilliant')
  assert.equal(gradeMove({...judgment,top:false,sacrifice:3}),'Excellent')
  assert.equal(gradeMove({...judgment,best:cp(2),played:cp(2),sacrifice:3}),'Best')
  assert.equal(gradeMove({...judgment,second:cp(-40)}),'Great')
  assert.equal(gradeMove({...judgment,book:true}),'Book')
  assert.equal(gradeMove({...judgment,forced:true,book:true}),'Forced')
  assert.equal(gradeMove({...judgment,best:mate(1),played:cp(100),loss:40}),'Missed Opportunity')
  assert.equal(gradeMove({...judgment,best:cp(0),played:mate(-1),loss:50}),'Blunder')
  assert.equal(gradeMove({...judgment,loss:9,played:cp(35)}),'Inaccuracy')
})

test('white perspective and estimated accuracy retain exact mate direction and omit forced moves',()=>{
  assert.equal(notation(whiteScore('place b - - 0 1',mate(4))),'−M4')
  assert.equal(chance(mate(1)),100)
  assert.equal(chance(mate(-1)),0)
  const rows=[{move:{color:'w'},loss:0,grade:'Best'},{move:{color:'w'},loss:22,grade:'Blunder'},
    {move:{color:'w'},loss:0,grade:'Forced'}]
  assert.equal(accuracy(rows,'w'),(100+100*Math.exp(-1))/2)
  assert.equal(accuracy(rows,'b'),null)
})

test('legal variation playback recognizes a fork, pin and skewer from board geometry',()=>{
  for(const [fen,uci,tactic] of [
    ['8/5q1k/8/8/4N3/8/8/6K1 w - - 0 1','e4g5','forks'],
    ['4k3/4n3/8/8/8/8/8/R5K1 w - - 0 1','a1e1','pinned'],
    ['4q3/4k3/8/8/8/8/8/R5K1 w - - 0 1','a1e1','skewers'],
  ]){
    const [move]=variation(fen,[uci,'z9z8'])
    assert.ok(move)
    assert.equal(variation(fen,[uci,'z9z8']).length,1)
    assert.ok(explain({move,grade:'Best',loss:0,playedLine:[move]}).includes(tactic))
    assert.equal(new Chess(move.after).fen(),move.after)
  }
})
