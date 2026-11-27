import { botRating } from './bot-profiles.js'

const ranks=[
  [0,'Unranked','iron'],[1,'Iron','iron'],
  [200,'Bronze I','bronze',1],[300,'Bronze II','bronze',2],[400,'Bronze III','bronze',3],
  [500,'Silver I','silver',1],[600,'Silver II','silver',2],[700,'Silver III','silver',3],
  [800,'Gold I','gold',1],[900,'Gold II','gold',2],[1000,'Gold III','gold',3],
  [1100,'Platinum I','platinum',1],[1200,'Platinum II','platinum',2],[1300,'Platinum III','platinum',3],
  [1400,'Diamond I','diamond',1],[1500,'Diamond II','diamond',2],[1600,'Diamond III','diamond',3],
  [1700,'Master','master'],[1900,'Grandmaster','grandmaster'],[2200,'Champion','champion'],
  [2500,'Legend','legend'],[2800,'Immortal','immortal'],[3000,'Ultimate','ultimate'],
]

export function rankOf(rating){
  const index=Math.max(0,ranks.findLastIndex(([floor])=>rating>=floor))
  const [floor,name,metal,division=0]=ranks[index]
  return {index,name,floor,metal,division,next:ranks[index+1]?.[0]}
}

export function ratedOpponent(rating,random=Math.random){
  const centre=botRating(rating)
  const window=centre<=100?50:100
  const first=Math.max(0,Math.ceil((centre-window)/10)*10)
  const last=Math.min(3000,Math.floor((centre+window)/10)*10)
  const count=1+(last-first)/10
  return first+Math.min(count-1,Math.floor(random()*count))*10
}

export const freshLadder=()=>({
  version:2,rating:0,best:0,played:0,wins:0,losses:0,draws:0,streak:0,longest:0,
  history:[],active:null,resetAvailable:false,minutes:10,
})

const count=value=>Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.round(Number(value)||0)))

export function loadLadder(saved){
  if(!saved || typeof saved!=='object')return freshLadder()
  const rating=count(saved.rating)
  const ladder={...freshLadder(),...saved,version:2,rating,best:Math.max(rating,count(saved.best))}
  for(const key of ['played','wins','losses','draws','streak','longest'])ladder[key]=count(saved[key])
  ladder.history=Array.isArray(saved.history)?saved.history.filter(row=>row?.id && row.result):[]
  ladder.resetAvailable=saved.version===2?Boolean(saved.resetAvailable):Boolean(saved.played || saved.rating || saved.active)
  if(![1,2,3,5,10,15,30].includes(ladder.minutes))ladder.minutes=10
  if(saved.active?.id && saved.active.game){
    ladder.active={...saved.active,rating:botRating(saved.active.rating ?? (saved.active.level ?? 1)*100)}
  }else ladder.active=null
  return ladder
}

export function resetLadder(ladder){
  return ladder.resetAvailable && !ladder.active?{...freshLadder(),minutes:ladder.minutes}:null
}

export function kFactor(rating,played){
  if(played<20)return 64
  if(rating>2000)return 24
  return played<100?40:32
}

export function rateAI(ladder,matchId,result,now=Date.now(),details={}){
  if(!matchId || ladder.active?.id!==matchId || !result?.reason || ![null,'w','b'].includes(result.winner)
    || ladder.history.some(row=>row.id===matchId))return null
  const before=ladder.rating
  const opponent=ladder.active.rating
  const expected=1/(1+10**((opponent-before)/400))
  const score=result.winner==='w'?1:result.winner==='b'?0:.5
  const factor=kFactor(before,ladder.played)
  const rating=Math.max(0,Math.round(before+factor*(score-expected)))
  const streak=score===1?ladder.streak+1:0
  const record={id:matchId,before,rating,delta:rating-before,opponent,result,date:now,
    minutes:details.minutes,duration:details.duration,moves:details.moves}
  return {...ladder,rating,best:Math.max(ladder.best,rating),played:ladder.played+1,
    wins:ladder.wins+Number(score===1),draws:ladder.draws+Number(score===.5),losses:ladder.losses+Number(score===0),
    streak,longest:Math.max(ladder.longest,streak),history:[record,...ladder.history],active:null}
}
