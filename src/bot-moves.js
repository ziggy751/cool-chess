import { Chess, castlingSide, normalizeMove } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { kingCastlesTo, makeUci, opposite, parseUci, squareFile, squareRank } from 'chessops/util'
import { opponentStyle } from './bot-profiles.js'

const points={pawn:100,knight:320,bishop:335,rook:500,queen:940,king:0}
const promotions=['queen','rook','bishop','knight']
const position=fen=>Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
const standardUci=(pos,move)=>{
  const castle=castlingSide(pos,move)
  return makeUci(castle?{...move,to:kingCastlesTo(pos.turn,castle)}:move)
}
const inCentre=square=>squareFile(square)>=2 && squareFile(square)<=5 && squareRank(square)>=2 && squareRank(square)<=5
const kingDistance=(first,second)=>Math.max(Math.abs(squareRank(first)-squareRank(second)),Math.abs(squareFile(first)-squareFile(second)))
const toward=(square,color)=>color==='white'?squareRank(square):7-squareRank(square)

function describe(pos, after, move, piece, capture) {
  const enemyKing=pos.board.kingOf(after.turn)
  const distance=kingDistance(move.from,enemyKing)-kingDistance(move.to,enemyKing)
  return {check:after.isCheck(),capture:Boolean(capture),castle:Boolean(castlingSide(pos,move)),
    centre:inCentre(move.to)?16:0,development:['knight','bishop'].includes(piece.role) && squareRank(move.from)===(pos.turn==='white'?0:7)?22:0,
    pawn:piece.role==='pawn',endgame:pos.board.occupied.size()<=12?distance*9:0}
}

function immediateThreat(pos, counterplay) {
  const ctx=pos.ctx()
  let loss=ctx.checkers.nonEmpty() && !pos.hasDests(ctx)?18000:0
  for(const [from,targets] of pos.allDests(ctx)){
    const piece=pos.board.get(from)
    if(!piece)continue
    for(const to of targets.intersect(pos.board[opposite(pos.turn)])){
      const victim=pos.board.get(to).role
      const occupied=pos.board.occupied.without(from)
      const protectedSquare=pos.kingAttackers(to,opposite(pos.turn),occupied).nonEmpty()
      loss=Math.max(loss,points[victim]-(protectedSquare?points[piece.role]*counterplay:0))
    }
  }
  return loss
}

export function weakBotMove(fen,profile,random=Math.random) {
  const pos=position(fen)
  const enemy=opposite(pos.turn)
  const candidates=[]
  for(const [from,targets] of pos.allDests()){
    const piece=pos.board.get(from)
    if(!piece)continue
    for(const to of targets){
      const promoted=piece.role==='pawn' && [0,7].includes(squareRank(to))?promotions:[undefined]
      for(const promotion of promoted)candidates.push({move:{from,to,promotion},piece,order:random()})
    }
  }
  if(!candidates.length)return null
  if(candidates.length>profile.candidates)candidates.sort((a,b)=>a.order-b.order)
  const lapse=random()<profile.lapse
  let best=null
  for(const {move,piece} of candidates.slice(0,profile.candidates)){
    const {from,to,promotion}=move
    const after=pos.clone()
    const target=pos.board.get(to)
    const capture=target?.color===enemy?target.role:piece.role==='pawn' && pos.epSquare===to?'pawn':null
    after.play(move)
    const features=describe(pos,after,move,piece,capture)
    const advance=piece.role==='pawn'?Math.abs(squareRank(to)-squareRank(from)):0
    const opens=profile.abilities.openings/36
    const endgame=profile.abilities.endgame/36
    const positionScore=profile.abilities.position/36
    const moveValue=points[promotion ?? piece.role]
    let score=(points[capture] ?? 0)*profile.captureWeight+(promotion?moveValue-100:0)*profile.captureWeight
    score+=(features.centre*positionScore+features.development*opens+features.endgame*endgame)
    score+=(features.castle?45*opens:0)+(features.check?15+profile.abilities.attack*.35:0)+advance*(lapse?10:4)
    if(!lapse && pos.board.occupied.size()<=14 && advance){
      const blocked=[...after.board.pawn.intersect(after.board[enemy])].some(square=>
        Math.abs(squareFile(square)-squareFile(to))<=1 && toward(square,pos.turn)>toward(to,pos.turn))
      if(!blocked)score+=toward(to,pos.turn)**2*endgame*2
    }
    if(features.check && random()<profile.checkmates && after.isCheckmate())score+=20000
    if(!lapse && random()<profile.awareness){
      if(after.kingAttackers(to,enemy,after.board.occupied).nonEmpty() && !features.castle){
        const guarded=after.kingAttackers(to,pos.turn,after.board.occupied).nonEmpty()
        score-=moveValue*(guarded?.19:.7)
      }
      if(profile.replyDepth)score-=immediateThreat(after,profile.replyDepth===2?.85:.56)*(.52+profile.awareness*.46)
    }
    score+=opponentStyle(profile,features)
    score+=(random()*2-1)*profile.noise
    if(!best || score>best.score)best={move,score}
  }
  return standardUci(pos,best.move)
}

export function chooseFishMove(fen,result,profile,random=Math.random) {
  if(!result?.move || profile.maximum || profile.lines===1 || result.score?.type!=='cp')return result?.move
  const pos=position(fen)
  let best={move:result.move,score:-Infinity}
  for(const line of result.lines){
    if(line.score.type!=='cp' || result.score.value-line.score.value>profile.tolerance)continue
    const uci=parseUci(line.move)
    if(!uci || !pos.isLegal(uci))continue
    const move=normalizeMove(pos,uci)
    const piece=pos.board.get(move.from)
    const after=pos.clone()
    after.play(move)
    const captured=pos.board.get(move.to)
    const features=describe(pos,after,move,piece,captured?.color===after.turn)
    const score=line.score.value+opponentStyle(profile,features)+(random()*2-1)*profile.tolerance*.65
    if(score>best.score)best={move:line.move,score}
  }
  return best.move
}

export const fishOptions=profile=>[
  'setoption name Skill Level value 20',
  'setoption name UCI_LimitStrength value false',
  'setoption name MultiPV value '+profile.lines,
]
export const fishLimits=(profile,milliseconds)=>'movetime '+Math.round(Math.max(28,milliseconds))+
  (profile.nodes?' nodes '+profile.nodes:'')+(profile.depth?' depth '+profile.depth:'')
