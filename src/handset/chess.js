import {Chess} from 'chess.js'
import {lessons} from '../training.js'
import {node,optionRows,read,store} from './shared.js'

const exercises=[
  ['Back-rank mate', 'Mate in one', 770, ['Re8#'],'The rook cuts off the eighth rank. The pawns block every escape.'],
  ['Avoid stalemate','Endgame',940,['Qg7#'],'The queen checks from g7 and the king defends it.'],
  ['Knight fork','Fork',980,['Nf7+'],'The knight checks the king and attacks the queen on d8.'],
  ['Pin a piece','Pin',910,['Re1'],'The rook pins the knight to the king along the e-file.'],
  ['Opening development','Opening',800,['Nf3'],'The knight develops toward the centre and attacks e5.'],
  ['En passant','Endgame',1050,['exd6'],'Capture on d6 immediately after Black’s two-square pawn advance.'],
  ['Smothered mate','Mate in two',1450,['Qg8+','Rxg8','Nf7#'],'The queen forces Rxg8. The rook traps its own king and Nf7 finishes the mate.',
    'r6k/5Qpp/7N/8/8/8/8/6K1 w - - 0 1'],
  ['The king steps aside','Skewer',1150,['Re1+','Kd6','Rxe8'],'The rook checks through the e-file. Once the king moves, the queen is exposed.',
    '4q3/4k3/8/8/8/8/8/R5K1 w - - 0 1'],
]
const figurines={p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚'}
export const puzzles=exercises.flatMap(([title,group,rating,line,explanation,position],index)=>{
  const lesson=lessons.find(item=>item.name===title)
  const fen=position || lesson?.fen
  if(!fen)return []
  try{
    const chess=new Chess(fen)
    line.forEach(move=>chess.move(move))
    return [{id:'puzzle-'+index,title,group,rating,line,explanation,fen}]
  }catch{return []}
})

export function mount(host,{settings,blocked}){
  if(blocked())return {destroy(){}}
  const filter=node('select')
  filter.setAttribute('aria-label','Puzzle difficulty')
  filter.innerHTML=optionRows({all:'All difficulties',starter:'Starter · Under 1000',challenge:'Challenge · 1000+'},read('chess-filter','all'))
  const chooser=node('select')
  chooser.setAttribute('aria-label','Choose chess puzzle')
  const grid=node('div','handset-chess-grid')
  grid.setAttribute('role','group')
  grid.setAttribute('aria-label','Puzzle board')
  const theme=node('select')
  theme.setAttribute('aria-label','Puzzle board theme')
  theme.innerHTML=optionRows({walnut:'Walnut',frost:'Frost',night:'Midnight emerald'},read('chess-theme','walnut'))
  const score=node('p','handset-note')
  const goal=node('p','puzzle-goal')
  const status=node('p','arcade-status')
  status.setAttribute('aria-live','polite')
  const restart=node('button','handset-secondary','Restart puzzle')
  const next=node('button','handset-secondary','Next puzzle'),pause=node('button','handset-secondary','Pause')
  const controls=node('div','handset-row')
  controls.append(restart,next,pause)
  let puzzle,chess,step=0,selected,done=false,paused=false
  let solved=new Set(read('chess-solved',[]))
  const list=()=>puzzles.filter(puzzle=>filter.value==='all' || (filter.value==='starter')===(puzzle.rating<1000))
  function start(){
    puzzle=list().find(item=>item.id===chooser.value) || list()[0]
    if(!puzzle)return
    chooser.value=puzzle.id
    store('chess-selected',puzzle.id)
    chess=new Chess(puzzle.fen)
    step=0;selected=null;done=false;paused=false
    status.textContent='White to move'
    goal.textContent=puzzle.group+' · Difficulty '+puzzle.rating
    draw()
  }
  function refresh(){
    const preferred=chooser.value || read('chess-selected','')
    chooser.innerHTML=optionRows(Object.fromEntries(list().map(item=>[item.id,item.title])),preferred)
    start()
  }
  function choose(square){
    if(done || paused || blocked())return
    if(chess.get(square)?.color==='w'){
      selected=selected===square?null:square;draw();return
    }
    const possibilities=selected?chess.moves({square:selected,verbose:true}).filter(move=>move.to===square):[]
    const move=possibilities.find(move=>move.san===puzzle.line[step]) || possibilities[0]
    if(!move)return
    selected=null
    if(move.san!==puzzle.line[step]){status.textContent='That move is legal. Try a stronger move.';draw();return}
    chess.move(move)
    step++
    if(step===puzzle.line.length){
      done=true
      solved.add(puzzle.id);store('chess-solved',[...solved])
      status.textContent='Solved · '+puzzle.explanation
    }else{
      const reply=chess.move(puzzle.line[step++])
      status.textContent='Black played '+reply.san+' · White to move'
    }
    store('chess-progress',{id:puzzle.id,step,done})
    draw()
  }
  function draw(){
    const focus=grid.contains(document.activeElement)?document.activeElement.dataset.puzzleSquare:null
    grid.dataset.theme=theme.value
    grid.replaceChildren()
    score.textContent='Solved '+solved.size+' / '+puzzles.length
    pause.textContent=paused?'Resume':'Pause'
    const targets=selected && !paused && !done?new Set(chess.moves({square:selected,verbose:true}).map(move=>move.to)):null
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const square='abcdefgh'[x]+(8-y)
      const piece=chess.get(square)
      const cell=node('button','handset-chess-tile',piece?figurines[piece.type]:'')
      cell.type='button'
      cell.dataset.puzzleSquare=square
      cell.dataset.side=piece?.color || ''
      cell.dataset.shade=(x+y)%2
      cell.dataset.legal=String(Boolean(targets?.has(square)))
      cell.setAttribute('aria-label',square+(piece?' '+(piece.color==='w'?'white':'black')+' '+{p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[piece.type]:''))
      cell.setAttribute('aria-pressed',String(selected===square))
      cell.onclick=()=>choose(square)
      grid.append(cell)
    }
    if(focus)grid.querySelector('[data-puzzle-square="'+focus+'"]')?.focus()
  }
  filter.onchange=()=>{store('chess-filter',filter.value);refresh()}
  chooser.onchange=start
  theme.onchange=()=>{store('chess-theme',theme.value);draw()}
  restart.onclick=()=>{store('chess-progress',null);start()}
  next.onclick=()=>{const positions=list();chooser.value=positions[(positions.findIndex(item=>item.id===puzzle.id)+1)%positions.length].id;start()}
  function toggle(state){
    paused=state
    if(!done)status.textContent=state?'Paused':'White to move'
    draw()
  }
  pause.onclick=()=>toggle(!paused)
  host.append(filter,chooser,goal,score,grid,status,controls,theme)
  refresh()
  const progress=read('chess-progress',null)
  if(progress?.id===puzzle.id && Number.isInteger(progress.step) && progress.step>0 && progress.step<=puzzle.line.length){
    for(const move of puzzle.line.slice(0,progress.step))chess.move(move)
    step=progress.step
    done=Boolean(progress.done)
    status.textContent=done?'Solved · '+puzzle.explanation:'White to move'
    draw()
  }
  return {pause:()=>toggle(true),destroy(){}}
}
