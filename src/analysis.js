import { Chess } from 'chess.js'
import { Engine } from './engine.js'

export const presets={
  quick:{name:'Quick',depth:12,time:100,lines:2},
  standard:{name:'Standard',depth:16,time:260,lines:3},
  deep:{name:'Deep',depth:20,time:700,lines:3},
  maximum:{name:'Maximum',depth:25,time:1600,lines:5},
}
export const grades={
  Brilliant:['!!','#62d9cb'],Great:['!','#86c2ff'],Best:['★','#b5dc80'],Excellent:['✓','#9aca96'],
  Good:['•','#c1ccaf'],Book:['≡','#dcb58b'],Inaccuracy:['?!','#f1d571'],Mistake:['?','#ffb16e'],
  Blunder:['??','#ffa0a8'],'Missed Opportunity':['×','#ef9dcb'],Forced:['↳','#bac9dd'],
}
export const standardStart=new Chess().fen()
const fallback=[
  ['e4 e5 Nf3 Nc6 Bb5','Ruy Lopez'],['e4 e5 Nf3 Nc6 Bc4','Italian Game'],
  ['e4 c5','Sicilian Defense'],['e4 e6','French Defense'],['e4 c6','Caro–Kann Defense'],
  ['e4 d5','Scandinavian Defense'],['d4 d5 c4','Queen’s Gambit'],['c4','English Opening'],
]
let database,loading
export function openingBook(){
  loading ||= fetch('/openings/theory.tsv').then(response=>{
    if(!response.ok)throw new Error('Opening explorer could not load')
    return response.text()
  }).then(tsv=>{
    const root={next:{}}
    for(const row of tsv.trim().split('\n').slice(1)){
      const [eco,name,pgn]=row.split('\t')
      let node=root
      for(const san of pgn.replace(/\d+\.\s*/g,'').trim().split(/\s+/))node=node.next[san] ??= {next:{}}
      node.opening={eco,name}
    }
    return database=root
  }).catch(error=>{loading=null;throw error})
  return loading
}

export function bookPosition(moves,root=database){
  let node=root
  let opening
  for(const move of moves){
    node=node?.next[typeof move==='string'?move:move.san]
    if(node?.opening)opening=node.opening
    if(!node)break
  }
  return {opening,node}
}

export function openingFor(moves) {
  const san=moves.map(move=>move.san).join(' ')+' '
  return bookPosition(moves).opening?.name || fallback.find(([prefix])=>san.startsWith(prefix+' '))?.[1]
}

export const uciFor=move=>move.from+move.to+(move.promotion || '')
const entry=uci=>({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]})
export const reverse=score=>score?{...score,value:-score.value}:null
export const whiteScore=(fen,score)=>fen.split(' ')[1]==='w'?score:reverse(score)
export const chartValue=score=>score?.type==='mate'?Math.sign(score.value)*900:score?.value
export function chance(score){
  if(!score)return null
  if(score.type==='mate')return score.value>0?100:0
  return 100/(1+Math.exp(-.00368208*score.value))
}
export function notation(score){
  if(!score)return '—'
  if(score.type==='mate')return (score.value>0?'+':'−')+'M'+Math.abs(score.value)
  return (score.value>0?'+':'')+(score.value/100).toFixed(2)
}

export function variation(fen,pv=[]){
  const chess=new Chess(fen)
  const result=[]
  for(const uci of pv){
    try { result.push(chess.move(entry(uci))) }
    catch { break }
  }
  return result
}

const value={p:1,n:3,b:3,r:5,q:9,k:0}
const name={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}
const material=(fen,side)=>new Chess(fen).board().flat().reduce((sum,piece)=>piece?
  sum+value[piece.type]*(piece.color===side?1:-1):sum,0)
const terminal=chess=>chess.isCheckmate()?{type:'mate',value:-1}:
  chess.isStalemate() || chess.isInsufficientMaterial()?{type:'cp',value:0}:null
const canAttack=(chess,target,square,color)=>chess.attackers(target,color).includes(square)

function tactics(move){
  const chess=new Chess(move.after)
  const actor=chess.get(move.to)
  if(!actor)return null
  const targets=chess.board().flat().filter(piece=>piece && piece.color!==actor.color)
  const threats=targets.filter(piece=>canAttack(chess,piece.square,move.to,actor.color) &&
    (piece.type==='k' || value[piece.type]>=Math.max(3,value[actor.type])))
  if(threats.length>=2)return 'The '+name[actor.type]+' forks the '+name[threats[0].type]+' on '+threats[0].square+
    ' and '+name[threats[1].type]+' on '+threats[1].square+'.'
  const [file,rank]=[move.to.charCodeAt(0)-97,Number(move.to[1])-1]
  const directions=actor.type==='b'?[[1,1],[1,-1],[-1,1],[-1,-1]]:
    actor.type==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:actor.type==='q'?[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]:[]
  for(const [dx,dy] of directions){
    const hit=[]
    for(let x=file+dx,y=rank+dy;x>=0 && x<8 && y>=0 && y<8;x+=dx,y+=dy){
      const square=String.fromCharCode(97+x)+(y+1)
      const piece=chess.get(square)
      if(!piece)continue
      if(piece.color===actor.color)break
      hit.push({...piece,square})
      if(hit.length===2)break
    }
    if(hit.length!==2)continue
    const [front,back]=hit
    if(back.type==='k')return 'The '+name[front.type]+' on '+front.square+' is pinned to its king.'
    if(front.type==='k' && value[back.type]>=3)return 'The check skewers the king and the '+name[back.type]+' on '+back.square+'.'
  }
  return null
}

export function gradeMove({forced,book,top,loss,best,played,second,sacrifice,mate,matingSacrifice}){
  if(forced)return 'Forced'
  if(mate)return 'Best'
  if(best?.type==='mate' && best.value>0 && (played?.type!=='mate' || played.value<0))return 'Missed Opportunity'
  if(loss>=27)return 'Blunder'
  if(loss>=14)return chance(best)>=72 && chance(played)>=43?'Missed Opportunity':'Mistake'
  if(loss>=7)return 'Inaccuracy'
  if(book)return 'Book'
  if(top && sacrifice && loss<=2 && chance(best)>=63 &&
    (matingSacrifice || chance(best)<98 || second && chance(second)<92))return 'Brilliant'
  const gap=second?chance(best)-chance(second):0
  if(top && loss<=2 && gap>=16 && chance(best)>39 && chance(best)<98)return 'Great'
  if(top)return 'Best'
  if(loss<=2)return 'Excellent'
  return 'Good'
}

export function explain({move,best,played,bestLine,playedLine,loss,grade,sacrifice}){
  if(grade==='Forced')return 'This was the only legal move.'
  if(move.san.includes('#'))return 'This move delivers checkmate.'
  if(grade==='Book')return 'This position follows a documented opening line.'
  if(best?.type==='mate' && best.value>0 && (played?.type!=='mate' || played.value<0))
    return 'Stockfish found a forced mate beginning with '+bestLine[0]?.san+'. This move gives up that sequence.'
  if(grade==='Brilliant')return 'The engine’s top line gives up '+sacrifice+
    ' points of material after '+playedLine[1]?.san+' and keeps a winning advantage.'
  if(loss>=7){
    const threat=playedLine[1]
    if(threat?.captured==='q' && material(playedLine[Math.min(2,playedLine.length-1)].after,move.color)<material(move.before,move.color)-3){
      const defended=new Chess(threat.before).isAttacked(threat.to,move.color)
      return 'Stockfish recommends '+threat.san+' next, winning your '+(defended?'':'undefended ')+'queen.'
    }
    if(played?.type==='mate' && played.value<0)return 'The opponent has a forced mate. The engine line starts with '+(playedLine[1]?.san || 'the next move')+'.'
    const alternative=bestLine[0] && tactics(bestLine[0])
    return alternative?bestLine[0].san+' is stronger. '+alternative:
      (bestLine[0]?.san || 'The engine’s preferred move')+' preserves more of the position’s advantage'+
      (bestLine[1]?' against '+bestLine[1].san: '')+'.'
  }
  const tactical=tactics(move)
  if(tactical)return tactical
  if(['n','b'].includes(move.piece) && /[18]$/.test(move.from) && /^[c-f][3-6]$/.test(move.to))
    return 'This develops your '+name[move.piece]+' toward the centre while keeping the position close to the engine’s top choice.'
  if(move.flags==='k' || move.flags==='q')return 'Castling puts the king behind its pawns and brings a rook into play.'
  const quality=grade==='Great'?'The other engine candidates give up a substantial advantage.':
    'This stays close to Stockfish’s best evaluation.'
  return playedLine[1]?quality+' Its line continues with '+playedLine[1].san+'.':quality
}

const cache=new Map()
const cacheKey=(fen,options,rootMove)=>JSON.stringify([fen,options.depth,options.time,options.lines,rootMove])
export class AnalysisSession {
  constructor(options=presets.standard){
    this.engine=new Engine()
    this.options=options
  }

  async search(fen,rootMove){
    if(this.closed)return null
    const key=cacheKey(fen,this.options,rootMove)
    if(cache.has(key))return cache.get(key)
    const ending=terminal(new Chess(fen))
    if(ending)return {score:ending,lines:[]}
    const {time,depth,lines}=this.options
    const result=await this.engine.search(fen,30,time,rootMove?1:lines,{depth,rootMove})
    if(!result || this.closed)return null
    if(!result.score)throw new Error('Stockfish returned no evaluation for this position.')
    if(cache.size>=800)cache.delete(cache.keys().next().value)
    cache.set(key,result)
    return result
  }

  async evaluate(move,book=false){
    const root=await this.search(move.before)
    if(!root || this.closed)return null
    const actual=uciFor(move)
    const legal=new Chess(move.before).moves().length
    const ending=terminal(new Chess(move.after))
    const known=root.lines.find(line=>line.move===actual)
    const restricted=known || ending?null:await this.search(move.before,actual)
    if(this.closed)return null
    const line=known || restricted?.lines[0]
    const played=ending?reverse(ending):line?.score || restricted?.score
    const best=root.score
    if(!played || !best)throw new Error('Stockfish could not compare this move.')
    const candidates=root.lines.filter(candidate=>variation(move.before,[candidate.move]).length)
    const bestLine=variation(move.before,candidates[0]?.pv || [root.move])
    const playedLine=variation(move.before,line?.pv || [actual])
    const loss=Math.max(0,chance(best)-chance(played))
    const top=actual===root.move
    const exchange=playedLine[1]
    const actor=playedLine[0]
    const deficit=exchange && actor && exchange.to===actor.to && exchange.captured===actor.piece?
      material(move.before,move.color)-material(playedLine[Math.min(2,playedLine.length-1)].after,move.color):0
    const sacrifice=deficit>=2?deficit:0
    const second=candidates[1]?.score
    const matingSacrifice=sacrifice>=5 && playedLine.length===3 && playedLine[2].san.endsWith('#') &&
      new Chess(playedLine[1].before).moves().length===1
    const grade=gradeMove({forced:legal===1,book:book&&loss<7,top,loss,best,played,second,matingSacrifice,
      sacrifice,mate:new Chess(move.after).isCheckmate()})
    const explanation=explain({move,best,played,bestLine,playedLine,loss,grade,sacrifice})
    return {move,grade,explanation,loss,depth:candidates[0]?.depth || 0,before:whiteScore(move.before,best),
      after:whiteScore(move.before,played),best:bestLine[0]?.san,playedLine:playedLine.map(uciFor),
      candidates:candidates.map(({score,pv,depth})=>({score:whiteScore(move.before,score),pv:variation(move.before,pv).map(uciFor),depth}))}
  }

  close(){this.closed=true;this.engine.close()}
}

export function accuracy(rows,side){
  const moves=rows.filter(row=>row.move.color===side && row.grade!=='Forced')
  if(!moves.length)return null
  return moves.reduce((sum,row)=>sum+100*Math.exp(-row.loss/22),0)/moves.length
}
