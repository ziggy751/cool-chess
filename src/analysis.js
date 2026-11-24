import { Chess } from 'chess.js'
import { Engine } from './engine.js'

const openings = [
  ['e4 e5 Nf3 Nc6 Bb5','Ruy Lopez'],['e4 e5 Nf3 Nc6 Bc4','Italian Game'],
  ['e4 e5 Nf3 Nc6 d4','Scotch Game'],['e4 c5','Sicilian Defense'],
  ['e4 e6','French Defense'],['e4 c6','Caro–Kann Defense'],
  ['e4 d5','Scandinavian Defense'],['d4 d5 c4','Queen’s Gambit'],
  ['d4 Nf6 c4 g6','King’s Indian Defense'],['c4','English Opening'],
  ['e4 e5','Open Game'],['d4 d5','Closed Game'],
]
export function openingFor(moves) {
  const san = moves.map(move=>move.san).join(' ')+' '
  return openings.find(([prefix])=>san.startsWith(prefix+' '))?.[1]
}

const advantage = score => score ? score.type==='mate' ? Math.sign(score.value)*1800 : score.value : null
const whiteAdvantage = (fen,score) => advantage(score)*(fen.split(' ')[1]==='w'?1:-1)
const moveName = (fen,uci) => {
  if (!uci || uci==='(none)') return null
  const chess = new Chess(fen)
  return chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]}).san
}

export function analyzeGame(state, progress, finished) {
  const engine = new Engine()
  let stopped = false
  async function run() {
    let prior = await engine.search(state.initial,30,145)
    const rows = []
    for (const [index,move] of state.moves.entries()) {
      if (stopped) return
      const after = new Chess(move.after)
      const current = after.isCheckmate() ? {score:{type:'mate',value:-1}} :
        after.isStalemate() || after.isInsufficientMaterial() ? {score:{type:'cp',value:0}} :
          await engine.search(move.after,30,145)
      if (stopped) return
      const best = moveName(move.before,prior?.move)
      const beforeEval = advantage(prior?.score)
      const nextEval = advantage(current?.score)
      const loss = beforeEval!==null && nextEval!==null ? Math.max(0,beforeEval+nextEval) : null
      const grade = best===move.san ? 'Best' : loss===null ? '—' :
        loss>=250 ? 'Blunder' : loss>=120 ? 'Mistake' : loss>=55 ? 'Inaccuracy' : 'Good'
      rows.push({index:index+1,move,best,loss,grade,score:current?.score,
        white:current?.score ? whiteAdvantage(move.after,current.score) : null})
      progress(rows)
      prior = current
    }
    if (!stopped) finished()
  }
  run().catch(error => { if (!stopped) finished(error) }).finally(() => engine.close())
  return () => { stopped = true; engine.close() }
}

export function accuracy(rows, side) {
  const losses = rows.filter(row=>row.move.color===side && row.loss!==null)
  if (!losses.length) return null
  return Math.round(losses.reduce((sum,row)=>sum+100*Math.exp(-row.loss/235),0)/losses.length)
}
