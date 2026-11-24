const names=['Iron','Bronze','Silver','Gold','Platinum','Diamond','Master','Grandmaster','Champion','Legend','Immortal']
const thresholds=[100,300,600,900,1200,1500,1800,2100,2400,2700,2900]
export const rankOf = rating => {
  const index=Math.max(0,thresholds.findLastIndex(value=>rating>=value))
  return {index,name:names[index],floor:thresholds[index],next:thresholds[index+1]}
}
export const ratedOpponent = (rating,random=Math.random) => {
  const estimate=Math.min(30,Math.max(1,Math.round(rating/100)))
  const options=[estimate,estimate-1,estimate+1].filter(level=>level>=1 && level<=30)
  return options[Math.floor(random()*options.length)]
}
export const freshLadder = () => ({rating:400,best:400,played:0,wins:0,losses:0,draws:0,streak:0,longest:0,
  placements:true,history:[],active:null})

export function rateAI(ladder,matchId,result,now=Date.now()) {
  if (ladder.active?.id!==matchId || !result) return null
  const before=ladder.rating
  const opponent=ladder.active.level*100
  const expected=1/(1+10**((opponent-before)/400))
  const score=result.winner==='w'?1:result.winner==='b'?0:.5
  const factor=ladder.placements && ladder.played<5?40:32
  const rating=Math.min(3000,Math.max(100,before+Math.round(factor*(score-expected))))
  const streak=score===1?ladder.streak+1:0
  const record={id:matchId,before,rating,delta:rating-before,level:ladder.active.level,result,date:now}
  return {...ladder,rating,best:Math.max(ladder.best,rating),played:ladder.played+1,
    wins:ladder.wins+Number(score===1),draws:ladder.draws+Number(score===.5),losses:ladder.losses+Number(score===0),
    streak,longest:Math.max(ladder.longest,streak),history:[record,...ladder.history].slice(0,100),active:null}
}
