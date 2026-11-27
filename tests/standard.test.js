import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Chess } from 'chess.js'
import { Match } from '../src/rules.js'
import { beginnerMove } from '../src/beginner.js'
import { freshLadder, kFactor, loadLadder, ratedOpponent, rankOf, rateAI, resetLadder } from '../src/ranked-ai.js'
import { botProfile, botRatings } from '../src/bot-profiles.js'
import { weakBotMove } from '../src/bot-moves.js'

test('standard and Kiwipete perft counts match known legal move totals',()=>{
  const chess=new Chess()
  assert.deepEqual([1,2,3,4,5].map(depth=>chess.perft(depth)),[20,400,8902,197281,4865609])
  const tricky=new Chess('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1')
  assert.deepEqual([1,2,3].map(depth=>tricky.perft(depth)),[48,2039,97862])
})

test('blocked paths, pins and kings cannot make the listed illegal moves',()=>{
  const game=new Match()
  for (const [from,to] of [['c1','g5'],['a1','a3'],['d1','h5'],['e2','e1'],['e2','f3'],['e2','e5']]) {
    assert.throws(()=>game.move({from,to}))
  }
  game.move('Nf3')
  assert.equal(game.chess.get('f3').type,'n')
  const near=new Match({fen:'8/8/4k3/8/4K3/8/P7/8 w - - 0 1'})
  assert.throws(()=>near.move('Ke5'))
  const invalid=new Match({fen:'4k3/8/8/8/4R3/8/P7/4K3 w - - 0 1'})
  assert.throws(()=>invalid.move({from:'e4',to:'e8'}))
  assert.equal(invalid.chess.get('e8').type,'k')
})

test('queenside castling works and attacked lanes and moved rooks prevent castling',()=>{
  const allowed=new Match({fen:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'})
  allowed.move('O-O-O')
  assert.equal(allowed.chess.get('c1').type,'k')
  assert.equal(allowed.chess.get('d1').type,'r')
  const attacked=new Match({fen:'4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1'})
  assert.throws(()=>attacked.move('O-O'))
  const moved=new Match({fen:'4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'})
  for (const move of ['Rh2','Ke7','Rh1','Ke8']) moved.move(move)
  assert.throws(()=>moved.move('O-O'))
})

test('en passant cannot be delayed or expose the king, and all promotions work',()=>{
  const pinned=new Match({fen:'k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'})
  assert.throws(()=>pinned.move('exd6'))
  const expired=new Match({fen:'4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'})
  for(const move of ['Kd2','Kd7'])expired.move(move)
  assert.throws(()=>expired.move('exd6'))
  for(const promotion of ['q','r','b','n']){
    const game=new Match({fen:'7k/P7/8/8/8/8/8/7K w - - 0 1'})
    game.move({from:'a7',to:'a8',promotion})
    assert.equal(game.chess.get('a8').type,promotion)
  }
})

test('custom clocks add increment only to the mover and survive serialization',()=>{
  const game=new Match({minutes:6,increment:3,now:0})
  game.move('e4','w',1000)
  const restored=Match.restore(JSON.parse(JSON.stringify(game.save())))
  assert.deepEqual(restored.remaining(2000),{w:362000,b:359000})
  assert.equal(restored.chess.fen(),game.chess.fen())
  assert.equal(restored.increment,3)
  assert.throws(()=>new Match({minutes:0,increment:3}))
})

test('ranked AI uses Elo, respects the zero floor and settles one result per match',()=>{
  const start={...freshLadder(),active:{id:'test',rating:0}}
  assert.equal(start.rating,0)
  const after=rateAI(start,'test',{winner:'w',reason:'Checkmate'},100)
  assert.equal(after.rating,32)
  assert.equal(after.streak,1)
  assert.equal(after.longest,1)
  assert.equal(after.history[0].delta,32)
  assert.equal(rateAI(after,'test',{winner:'w',reason:'Checkmate'}),null)
  assert.equal(rateAI({...after,active:start.active},'test',{winner:'w',reason:'Checkmate'}),null)
  const loss=rateAI(start,'test',{winner:'b',reason:'Resignation'})
  assert.equal(loss.rating,0)
  assert.equal(loss.losses,1)
  const draw=rateAI({...start,active:{id:'test',rating:50}},'test',{winner:null,reason:'Stalemate'})
  assert.equal(draw.rating,5)
  assert.equal(draw.draws,1)

  const rate=(rating,opponent,winner)=>rateAI({...freshLadder(),rating,active:{id:'test',rating:opponent}},'test',
    {winner,reason:'Checkmate'}).history[0].delta
  assert.ok(rate(400,500,'w')>rate(400,300,'w'))
  assert.ok(rate(400,300,'b')<rate(400,500,'b'))
  assert.ok(rate(3000,3000,'w')>0)
  assert.deepEqual([kFactor(2200,19),kFactor(800,20),kFactor(1400,100),kFactor(2000,100),kFactor(2001,20)],[64,40,32,32,24])
})

test('ranked matchmaking stays within the target band and supports rank migration and reset',()=>{
  for(const [elo,low,high] of [[0,0,50],[100,50,150],[300,200,400],[500,400,600],[1000,900,1100],
    [1500,1400,1600],[2000,1900,2100],[2500,2400,2600],[3800,2900,3000]]){
    assert.equal(ratedOpponent(elo,()=>0),low)
    assert.equal(ratedOpponent(elo,()=>.9999),high)
  }
  assert.equal(rankOf(0).name,'Unranked')
  assert.equal(rankOf(1).name,'Iron')
  assert.equal(rankOf(199).name,'Iron')
  assert.equal(rankOf(200).name,'Bronze I')
  assert.equal(rankOf(1699).name,'Diamond III')
  assert.equal(rankOf(1700).name,'Master')
  assert.equal(rankOf(1900).name,'Grandmaster')
  assert.equal(rankOf(3000).name,'Ultimate')
  const old=loadLadder({rating:743,best:982,played:36,active:{id:'existing',level:8,game:{moves:[]}}})
  assert.equal(old.rating,743)
  assert.equal(old.best,982)
  assert.equal(old.active.rating,800)
  assert.equal(resetLadder(old),null)
  const reset=resetLadder({...old,active:null})
  assert.equal(reset.rating,0)
  assert.equal(reset.resetAvailable,false)
  assert.equal(resetLadder(reset),null)
})

test('all 100 rated bot presets are distinct, and weak profiles use legal UCI moves',()=>{
  assert.equal(new Set(botRatings).size,100)
  assert.equal(botRatings[0],0)
  assert.equal(botRatings.at(-1),3000)
  assert.equal(botProfile('max').nodes,undefined)
  assert.equal(botProfile('max').depth,undefined)
  assert.ok(botProfile(3000).nodes>botProfile(2400).nodes)
  assert.notEqual(botProfile(600,1).awareness,botProfile(600,2).awareness)
  const positions=['7k/P7/8/8/8/8/8/7K w - - 0 1','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
    '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1']
  for(const fen of positions){
    const legal=new Chess(fen).moves({verbose:true}).map(move=>move.lan)
    for(const elo of botRatings.filter(rating=>rating<1050)){
      assert.ok(legal.includes(weakBotMove(fen,botProfile(elo))))
    }
  }
  assert.equal(weakBotMove('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1',botProfile(0)),null)
})

test('beginner move selection stays legal through promotion and terminal positions',()=>{
  const fen='7k/P7/8/8/8/8/8/7K w - - 0 1'
  for(let level=1;level<=10;level++){
    const move=beginnerMove(fen,level,2,()=>.51)
    assert.ok(new Chess(fen).moves({verbose:true}).some(candidate=>candidate.lan===move))
  }
  assert.equal(beginnerMove('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1',1,0),null)
})

test('double check leaves only king moves and Scholar’s Mate is terminal',()=>{
  const discovered=new Match({fen:'4k3/8/8/8/8/8/4B3/K3R3 w - - 0 1'})
  discovered.move('Bb5+')
  assert.deepEqual(discovered.chess.attackers('e8','w').sort(),['b5','e1'])
  assert.ok(discovered.chess.moves({verbose:true}).every(move=>move.piece==='k'))
  const scholar=new Match()
  for(const move of ['e4','e5','Bc4','Nc6','Qh5','Nf6','Qxf7#'])scholar.move(move)
  assert.deepEqual(scholar.result,{winner:'w',reason:'Checkmate'})
  assert.throws(()=>scholar.move('Ke7'))
})

test('castling needs a rook and a pawn cannot jump over a blocker',()=>{
  const noRook=new Match({fen:'4k3/8/8/8/8/8/P7/4K3 w K - 0 1'})
  assert.throws(()=>noRook.move('O-O'))
  const blocked=new Match({fen:'4k3/8/8/8/8/4n3/4P3/7K w - - 0 1'})
  assert.throws(()=>blocked.move('e3'))
  assert.throws(()=>blocked.move('e4'))
})
