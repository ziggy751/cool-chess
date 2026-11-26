import test from 'node:test'
import assert from 'node:assert/strict'
import {makeShort,nextBatch,librarySize,clipDuration} from '../src/handset/meme-engine.js'
import {orchardDrop} from '../src/handset/arcade-table.js'
import {arcadeCatalog} from '../src/handset/game-catalog.js'
import {collection} from '../src/handset/youtube.js'

test('meme screenings reject duplicate scripts and give every timeline a timed payoff',()=>{
  const history=[]
  for(let i=0;i<125;i++){
    const start=history.length
    const batch=nextBatch(history,i*1729+3)
    assert.ok(batch.length<=3)
    assert.equal(history.length,start+batch.length)
    for(const clip of batch){
      assert.equal(clip.timeline.length,6)
      assert.equal(clip.timeline[0].from,0)
      assert.equal(clip.timeline.at(-1).to,clipDuration)
      assert.equal(clip.timeline[4].line,clip.punchline)
      assert.equal(clip.timeline.filter(cue=>cue.speaks).length,4)
      assert.ok(clip.prop.name)
      for(let i=1;i<clip.timeline.length;i++)assert.equal(clip.timeline[i-1].to,clip.timeline[i].from)
      assert.deepEqual(makeShort(clip.seed),clip)
    }
  }
  assert.equal(new Set(history.map(item=>item.story)).size,librarySize.stories)
  assert.equal(new Set(history.map(item=>item.punchline)).size,librarySize.stories)
  assert.ok(new Set(history.map(item=>item.style)).size>20)
  assert.equal(nextBatch(history,123).length,0)
  assert.deepEqual(librarySize,{characters:55,environments:30,props:100,sounds:50,cameras:30,editing:25,voices:20,stories:201,expressions:30,movements:50,loops:25})
})

test('orchard pieces fall and chain merges without modifying the input',()=>{
  const initial=[[1],[0],[],[],[]]
  assert.deepEqual(orchardDrop(initial,1,0),{board:[[],[2],[],[],[]],score:27})
  assert.deepEqual(initial,[[1],[0],[],[],[]])
  assert.equal(orchardDrop([[0,1,2,3,4,5],[],[],[],[]],0,1),null)
})

test('the arcade catalog and real YouTube catalog use distinct game and provider identifiers',()=>{
  assert.equal(arcadeCatalog.length,23)
  assert.equal(new Set(arcadeCatalog.map(game=>game.id)).size,arcadeCatalog.length)
  assert.equal(new Set(collection.map(video=>video.id)).size,collection.length)
  assert.ok(collection.every(video=>/^[A-Za-z0-9_-]{11}$/.test(video.id) && video.creator))
})
