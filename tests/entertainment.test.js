import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {compose,demo,describe,genres} from '../src/handset/song-composer.js'
import {curatedBatch,collection} from '../src/handset/youtube.js'
import {spotifyPlaylist} from '../src/handset/spotify.js'
import {createAudioFocus} from '../src/handset/audio-focus.js'
import {makeShort,nextBatch,seedForStory,storyCount} from '../src/handset/meme-engine.js'

test('the worker composer renders deterministic stereo music with sections and synchronized lyric cues',()=>{
  const {info,wave}=compose(demo)
  const buffer=Buffer.from(wave)
  assert.equal(buffer.toString('ascii',0,4),'RIFF')
  assert.equal(buffer.readUInt16LE(22),2)
  assert.ok(wave.byteLength>800_000)
  assert.equal(info.lyrics.length,6)
  assert.ok(info.lyrics.at(-1).at<info.duration)
  const digest=b=>createHash('sha256').update(Buffer.from(b)).digest('hex')
  assert.equal(digest(compose(demo).wave),digest(wave))
  assert.notEqual(digest(compose({...demo,seed:1}).wave),digest(wave))
  const tempi=new Set(Object.keys(genres).map(genre=>describe({...demo,genre}).bpm))
  assert.equal(tempi.size,10)
})

test('new story formats have distinct shots and timings and produce category-filtered batches',()=>{
  assert.equal(storyCount,201)
  const current=Array.from({length:storyCount},(_,i)=>makeShort(seedForStory(i)))
  assert.equal(new Set(current.map(clip=>clip.title)).size,storyCount)
  const specific=current.filter(clip=>clip.format!=='classic')
  assert.equal(new Set(specific.map(clip=>clip.format)).size,11)
  assert.equal(new Set(specific.map(clip=>clip.timeline.map(cue=>cue.shot).join())).size,11)
  const history=[]
  const batch=nextBatch(history,411,3,'key')
  assert.equal(batch.length,3)
  assert.ok(batch.every(clip=>clip.format==='key' && clip.universe==='The Key Bureau'))
  assert.notEqual(makeShort(101).id,makeShort(seedForStory(101)).id)
})

test('YouTube batches are finite and do not repeat previous links',()=>{
  const shorts=collection.filter(video=>video.vertical)
  const seen=new Set()
  const first=curatedBatch(shorts,seen,3,()=>.28)
  first.forEach(item=>seen.add(item.id))
  for(let i=0;i<shorts.length;i++){
    const rest=curatedBatch(shorts,seen,3,()=>.4)
    assert.ok(rest.every(clip=>!seen.has(clip.id)))
    rest.forEach(item=>seen.add(item.id))
    if(!rest.length)break
  }
  assert.equal(seen.size,shorts.length)
  assert.deepEqual(curatedBatch(shorts,seen,3),[])
})

test('Spotify shortcuts accept only canonical playlist links and audio focus restores only paused music',()=>{
  const target='https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk'
  assert.equal(spotifyPlaylist(target+'?si=example'),target)
  assert.equal(spotifyPlaylist(target.replace('open.spotify.com','open.spotify.com.example.org')),null)
  assert.equal(spotifyPlaylist(target.replace('playlist','track')),null)
  let calls=[]
  const player={audio:{paused:false,pause(){this.paused=true;calls.push('pause')}},play(){calls.push('play')}}
  const audio=createAudioFocus({phoneDuckMusic:true},player)
  audio.startVideo();audio.startVideo();audio.endVideo()
  assert.deepEqual(calls,['pause','play'])
  calls=[]
  audio.startVideo();audio.endVideo()
  assert.deepEqual(calls,[])
})
