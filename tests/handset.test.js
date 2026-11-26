import test from 'node:test'
import assert from 'node:assert/strict'
import {slide2048,blockPlacement} from '../src/handset/puzzles.js'
import {youtubeId} from '../src/handset/youtube.js'
import {makeShort} from '../src/handset/comedy.js'
import {puzzles} from '../src/handset/chess.js'

test('2048 merges each tile once and handles sliding from each side',()=>{
  const start=[2,2,2,2,0,2,4,4,0,0,8,0,0,0,8,0]
  const left=slide2048(start,'left')
  assert.deepEqual(left.board,[4,4,0,0,2,8,0,0,8,0,0,0,8,0,0,0])
  assert.equal(left.score,16)
  assert.deepEqual(slide2048(start,'right').board.slice(0,4),[0,0,4,4])
  assert.deepEqual(slide2048(start,'up').board.slice(0,4),[2,4,2,2])
  assert.equal(slide2048(Array(16).fill(0),'down').changed,false)
})

test('block puzzle rejects overlap and clears a complete row and column together',()=>{
  const filled=Array(64).fill(0)
  for(let index=1;index<8;index++)filled[index]=filled[8*index]=1
  const removed=blockPlacement(filled,[[0,0]],0,0)
  assert.equal(removed.clear.size,15)
  assert.equal(removed.points,25)
  assert.deepEqual(removed.board,Array(64).fill(0))
  assert.equal(blockPlacement(filled,[[0,0]],0,1),null)
  assert.equal(blockPlacement(filled,[[0,0],[1,0]],7,7),null)
})

test('video links accept supported YouTube hosts and comedy episodes have unique stable content hashes',()=>{
  assert.equal(youtubeId('https://www.youtube.com/shorts/-eNe1OmbbXc?si=ignore'),'-eNe1OmbbXc')
  assert.equal(youtubeId('https://youtu.be/yuxWyIe8TIc'),'yuxWyIe8TIc')
  assert.equal(youtubeId('https://youtube.com/watch?v=yuxWyIe8TIc'),'yuxWyIe8TIc')
  assert.equal(youtubeId('https://youtube.com.example.org/watch?v=yuxWyIe8TIc'),null)
  assert.equal(youtubeId('javascript:alert(1)'),null)
  assert.equal(youtubeId('https://www.youtube.com:8080/watch?v=yuxWyIe8TIc'),null)
  const items=Array.from({length:288},(_,index)=>makeShort(index))
  assert.equal(new Set(items.map(item=>item.id)).size,items.length)
  assert.deepEqual(makeShort(137),items[137])
  assert.equal(puzzles.length,8)
})
