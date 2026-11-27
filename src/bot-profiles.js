const styles = [
  {name:'Moth', title:'Unpredictable beginner', description:'Experiments with pawn pushes and unusual routes.', pawn:1, noise:1.1},
  {name:'Bastion', title:'Defensive player', description:'Protects the king and gives more weight to threats.', defence:1.2, castle:1, attack:-.35},
  {name:'Kestrel', title:'Tactical specialist', description:'Looks for forcing sequences and loose pieces.', tactics:1.18, attack:.5, trade:.2},
  {name:'Meridian', title:'Positional player', description:'Develops early and contests the centre.', position:1.2, develop:1, centre:1},
  {name:'Ember', title:'Gambit specialist', description:'Values initiative and early activity enough to accept material risk.', openings:1.2, pawn:.8, attack:.8, defence:.88},
  {name:'Endline', title:'Endgame specialist', description:'Favours exchanges, king activity and passed pawns.', endgame:1.2, trade:1, castle:.3},
  {name:'Vanguard', title:'Aggressive attacker', description:'Looks for checks and active captures near the king.', attack:1.2, tactics:1.08, press:1},
  {name:'Cadence', title:'Balanced player', description:'Balances material, development and king safety.'},
]
const categoryNames=['First moves','Beginner','Club','Advanced','Expert','Elite']
const categoryFloors=[0,400,800,1400,2000,2600]
export const botCategories=categoryNames.map((name,index)=>({
  name,min:categoryFloors[index],max:(categoryFloors[index+1] ?? 3001)-1,
}))

const bands=[
  [0,'Complete beginner. Often misses captures and threats.'],
  [100,'Often misses free material and leaves pieces undefended.'],
  [200,'Spots some captures and misses most combinations.'],
  [400,'Understands basic exchanges and still makes frequent mistakes.'],
  [600,'Develops pieces and usually notices direct captures.'],
  [800,'Recognizes simple threats and tactics.'],
  [1000,'Combines basic tactics with positional play.'],
  [1200,'Considers more tactical replies and common opening ideas.'],
  [1400,'Solid intermediate play with deeper calculation.'],
  [1600,'Strong tactics and more consistent positional choices.'],
  [1800,'Advanced play with fewer loose moves.'],
  [2000,'Very strong calculation and coordination.'],
  [2200,'Expert target with a larger search budget.'],
  [2400,'Master target with deep, consistent search.'],
  [2600,'Elite target with precise tactical play.'],
  [2800,'Near-maximum strength for short searches.'],
]

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
export const botRatings=Array.from({length:100},(_,index)=>Math.round(index*300/99)*10)
export const botRating=value=>value==='max'?'max':clamp(Math.round(Number(value)||0),0,3000)

export function botProfile(value, styleIndex) {
  const rating=botRating(value)
  const maximum=rating==='max'
  const elo=maximum?3000:rating
  const style=maximum?styles[7]:styles[styleIndex ?? Math.floor(elo/30)%styles.length] || styles[7]
  const beginner=elo<1050
  const strength=elo/3000
  const ramp=clamp(elo/1050,0,1)
  const higher=clamp((elo-1050)/1950,0,1)
  const skill=(base,factor=1)=>clamp(Math.round(base*factor),0,100)
  const abilities={
    attack:skill(4+96*strength,style.attack>0?style.attack:1),
    defence:skill(5+95*strength,style.defence),
    tactics:skill(3+97*strength,style.tactics),
    openings:skill(5+95*strength,style.openings),
    endgame:skill(3+97*strength,style.endgame),
    position:skill(4+96*strength,style.position),
    coordination:skill(4+96*strength,style.position),
    threats:skill(3+97*strength,style.defence),
    time:skill(12+88*strength),
  }
  return {
    rating,maximum,beginner,style,abilities,
    name:maximum?'The Architect':style.name,avatar:maximum?'TA':style.name.slice(0,2).toUpperCase(),
    label:maximum?'Maximum':elo+' Elo',
    category:botCategories.find(group=>elo<=group.max).name,
    description:maximum?'Unrestricted Stockfish 19 Lite at the selected thinking time.':bands.findLast(([floor])=>elo>=floor)[1],
    awareness:clamp((.025+.975*ramp**1.3)*(style.defence ?? 1),0,1),
    checkmates:Math.min(1,.02+1.08*ramp**1.65),
    captureWeight:.04+.96*ramp**.68,
    noise:(700*(1-ramp)**2.35+26)*(style.noise ?? 1),
    lapse:.4*(1-ramp)**1.45,
    candidates:Math.round(3+27*ramp**.74),
    replyDepth:elo>=870?2:elo>=450?1:0,
    lines:maximum?1:Math.max(1,Math.round(5-4*higher)),
    nodes:maximum?undefined:Math.round(2500*82**higher),
    depth:maximum?undefined:Math.round(6+18*higher),
    searchTime:maximum?3000:Math.round(170+1280*higher**2),
    tolerance:maximum?0:Math.round(280*(1-higher)**2+12),
  }
}

export const opponentStyle=(profile,move)=> {
  const {style}=profile
  return (style.press ?? 0)*(move.check?29:0)+(style.attack ?? 0)*(move.check?17:0)
    +(style.trade ?? 0)*(move.capture?22:0)+(style.centre ?? 0)*move.centre*1.1
    +(style.develop ?? 0)*move.development*.8+(style.castle ?? 0)*(move.castle?27:0)
    +(style.pawn ?? 0)*(move.pawn?12:0)+(style.endgame ? move.endgame : 0)
}
