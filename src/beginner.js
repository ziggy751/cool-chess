import { Chess } from 'chess.js'

const value={p:100,n:315,b:330,r:495,q:925,k:0}
const other=color=>color==='w'?'b':'w'
const randomBetween=(random,min,max)=>min+(max-min)*random()

// Candidate evaluation uses chess.js exclusively. The lowest levels use noisy
// one-ply preferences; stronger beginners recognize an immediate tactical reply.
export function beginnerMove(fen,level,style,random=Math.random) {
  const chess=new Chess(fen)
  const moves=chess.moves({verbose:true})
  if (!moves.length) return null
  const side=chess.turn(),opponent=other(side)
  const awareness=[.09,.15,.24,.36,.52,.69,.81,.91,.96,.99][level-1] ?? 1
  const noise=[660,490,365,265,180,123,82,55,39,25][level-1] ?? 15
  const mistakes=level<7 && random() < (7-level)*.073
  let best=-Infinity,choice
  for (const move of moves) {
    const after=new Chess(move.after)
    const captures=move.captured?value[move.captured]:0
    const promoted=move.promotion?value[move.promotion]-100:0
    const center=/^[c-f][3-6]$/.test(move.to)?17:0
    const develop=/[nb]/.test(move.piece) && (side==='w'?move.from[1]==='1':move.from[1]==='8')?25:0
    const castle=/[kq]/.test(move.flags)?31:0
    const givesCheck=move.san.includes('+')?22:0
    let score=(captures+promoted)*(.63+.37*awareness)+center+develop+castle+givesCheck
    if (move.san.includes('#')) score += random()<awareness ? 15000 : 30
    if (!mistakes && random()<awareness) {
      const danger=after.isAttacked(move.to,opponent)
      if(danger) score-=value[move.piece]*(after.isAttacked(move.to,side)?.34:.83)
      if(level>=5) {
        let largest=0
        for(const reply of after.moves({verbose:true})) {
          if(reply.san.includes('#')) largest=Math.max(largest,level>=8?16000:950)
          if(reply.captured) {
            const next=new Chess(reply.after)
            const loss=value[reply.captured]-(next.isAttacked(reply.to,side)?value[reply.piece]*.81:0)
            largest=Math.max(largest,loss)
          }
        }
        score-=largest*(.60+awareness*.34)
      }
    } else if(mistakes && dangerBait(move)) score+=65
    score+= [randomBetween(random,-35,35),castle*.9-givesCheck*.5,givesCheck*.9+captures*.1,
      center*1.3,develop*1.1+givesCheck*.6,captures*.17,givesCheck*1.6,0,givesCheck*.8,0][style] || 0
    score+=randomBetween(random,-noise,noise)
    if(score>best){best=score;choice=move}
  }
  return choice.from+choice.to+(choice.promotion || '')
}

const dangerBait = move => !!move.captured || /[pq]/.test(move.piece)
