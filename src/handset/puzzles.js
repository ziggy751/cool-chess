import {gesture,node,optionRows,read,store} from './shared.js'

const themes={copper:'Copper',mint:'Mint glass',noel:'Holiday',neon:'Neon'}
const shapes=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[0,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1],[2,1]],
  [[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[1,0],[2,0],[3,0]]]
const randomTray=()=>Array.from({length:3},()=>Math.floor(Math.random()*shapes.length))
const expected={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'}

export function slide2048(board,direction){
  const output=Array(16).fill(0)
  let score=0
  for(let line=0;line<4;line++){
    const order=Array.from({length:4},(_,n)=>direction==='left'?line*4+n:direction==='right'?line*4+3-n:
      direction==='up'?n*4+line:(3-n)*4+line)
    const values=order.map(index=>board[index]).filter(Boolean)
    const merged=[]
    for(let n=0;n<values.length;n++){
      const value=values[n]
      if(value===values[n+1]){merged.push(value*2);score+=value*2;n++}
      else merged.push(value)
    }
    order.forEach((index,n)=>{output[index]=merged[n] || 0})
  }
  return {board:output,score,changed:board.some((value,i)=>value!==output[i])}
}

function addNumber(board){
  const blank=board.flatMap((value,index)=>value?[]:[index])
  if(blank.length)board[blank[Math.floor(Math.random()*blank.length)]]=Math.random()<.9?2:4
}

export function blockPlacement(board,shape,x,y){
  if(shape.some(([dx,dy])=>x+dx<0 || y+dy<0 || x+dx>=8 || y+dy>=8 || board[(y+dy)*8+x+dx]))return null
  const next=board.slice()
  for(const [dx,dy] of shape)next[(y+dy)*8+x+dx]=1
  const clear=new Set()
  let lines=0
  for(let n=0;n<8;n++){
    const row=Array.from({length:8},(_,i)=>n*8+i)
    const column=Array.from({length:8},(_,i)=>i*8+n)
    for(const lane of [row,column])if(lane.every(index=>next[index])){
      lines++
      for(const index of lane)clear.add(index)
    }
  }
  for(const position of clear)next[position]=0
  return {board:next,clear,points:shape.length+lines*12}
}

export function mount(host,{id,settings}){
  const numbers=id==='numbers'
  const size=numbers?4:8
  let game,selected=null,paused=false,done=false,drag=null,statusTimer=0
  let record=read('best-'+id,0),theme=read('theme-'+id,'copper')
  const board=node('div','handset-puzzle-grid')
  board.dataset.size=size
  board.tabIndex=0
  board.setAttribute('aria-label',numbers?'2048 grid':'Block placement grid')
  const score=node('strong','','0'),best=node('strong','',String(record))
  const hud=node('div','arcade-score')
  hud.append(node('span','','Score'),score,node('span','','Best'),best)
  const status=node('p','arcade-status')
  const controls=node('div','handset-row')
  const pause=node('button','handset-secondary','Pause')
  const restart=node('button','handset-secondary','Restart')
  controls.append(pause,restart)
  const tray=node('div','block-tray')
  const row=node('label','handset-setting')
  const picker=node('select')
  picker.innerHTML=optionRows(themes,theme)
  picker.onchange=()=>{theme=picker.value;store('theme-'+id,theme);draw()}
  row.append(node('span','','Theme'),picker)
  const cells=Array.from({length:size*size},(_,index)=>{
    const cell=node(numbers?'span':'button','handset-puzzle-tile')
    if(!numbers){
      cell.type='button'
      cell.setAttribute('aria-label','Row '+(Math.floor(index/8)+1)+', column '+(index%8+1))
      cell.onclick=()=>place(index%8,Math.floor(index/8))
    }
    board.append(cell)
    return cell
  })
  host.append(hud,board)
  if(!numbers)host.append(tray)
  host.append(status,controls,row,node('p','handset-note',numbers?'Swipe, use the arrow keys, or tap the direction buttons to merge matching tiles.':
    'Select or drag a shape. Fill a whole row or column to clear it. The grid and tray are saved.'))
  function save(){store('puzzle-'+id,game)}
  function updateScore(add){
    game.score+=add
    if(game.score>record){record=game.score;store('best-'+id,record)}
    score.textContent=String(game.score);best.textContent=String(record)
  }
  function checkEnd(){
    if(numbers)return !Object.keys(expected).some(dir=>slide2048(game.board,dir).changed)
    return !game.tray.some(id=>id!==null && cells.some((_,index)=>
      blockPlacement(game.board,shapes[id],index%8,Math.floor(index/8))))
  }
  function draw(changed=new Set()){
    host.dataset.puzzleTheme=theme
    board.classList.toggle('is-paused',paused)
    for(const [index,cell] of cells.entries()){
      const value=game.board[index]
      cell.dataset.value=value || ''
      if(numbers)cell.textContent=value || ''
      cell.classList.toggle('tile-active',Boolean(value))
      if(changed.has(index) && !settings.phoneReduced && !settings.reduced)cell.animate([{opacity:.35,scale:.8},{opacity:1,scale:1}],{duration:170})
    }
    score.textContent=String(game.score)
    if(numbers)return
    tray.replaceChildren()
    for(const [slot,id] of game.tray.entries()){
      const item=node('button','block-shape')
      item.type='button'
      item.disabled=id===null
      item.setAttribute('aria-label','Shape '+(slot+1))
      item.setAttribute('aria-pressed',String(selected===slot))
      if(id!==null){
        for(const [x,y] of shapes[id]){
          const spot=node('span')
          spot.style.transform='translate('+x*11+'px,'+y*11+'px)'
          item.append(spot)
        }
        item.onclick=()=>{if(!paused && !done){selected=slot;draw()}}
        item.onpointerdown=event=>{
          if(paused || done)return
          selected=slot
          drag=[event.clientX,event.clientY]
          item.setPointerCapture(event.pointerId)
        }
        item.onpointerup=event=>{
          if(!drag)return
          const moved=Math.hypot(event.clientX-drag[0],event.clientY-drag[1])>9
          drag=null
          if(moved){
            const bounds=board.getBoundingClientRect()
            place(Math.floor((event.clientX-bounds.left)/bounds.width*8),Math.floor((event.clientY-bounds.top)/bounds.height*8))
          }
        }
        item.onpointercancel=()=>{drag=null}
      }
      tray.append(item)
    }
  }
  function announce(message){
    clearTimeout(statusTimer)
    status.textContent=message
    if(!done && !paused)statusTimer=setTimeout(()=>{status.textContent='Playing'},1050)
  }
  function finishMove(){
    done=checkEnd()
    announce(done?'No moves left':numbers && game.board.includes(2048)?'2048 reached · Keep going':'Playing')
    save()
  }
  function place(x,y){
    if(paused || done || selected===null || game.tray[selected]===null)return
    const shape=shapes[game.tray[selected]]
    const next=blockPlacement(game.board,shape,x,y)
    if(!next){announce('That shape does not fit');return}
    game.board=next.board
    updateScore(next.points)
    game.tray[selected]=null
    if(game.tray.every(key=>key===null))game.tray=randomTray()
    selected=null
    finishMove()
    draw(next.clear)
  }
  function shift(direction){
    if(paused || done)return
    const next=slide2048(game.board,direction)
    if(!next.changed)return
    addNumber(next.board)
    const changed=new Set(next.board.flatMap((value,index)=>value && value!==game.board[index]?[index]:[]))
    game.board=next.board
    updateScore(next.score)
    finishMove()
    draw(changed)
  }
  function setPaused(value){
    paused=value;pause.textContent=value?'Resume':'Pause';announce(value?'Paused':done?'No moves left':'Playing')
    draw()
  }
  function reset(){
    game={board:Array(size*size).fill(0),score:0,tray:numbers?[]:randomTray()}
    if(numbers){addNumber(game.board);addNumber(game.board)}
    done=false;selected=null;setPaused(false);save()
  }
  pause.onclick=()=>setPaused(!paused)
  restart.onclick=reset
  if(numbers){
    gesture(board,shift)
    board.addEventListener('keydown',event=>{
      const key=Object.keys(expected).find(key=>expected[key]===event.key)
      if(key){event.preventDefault();event.stopPropagation();shift(key)}
    })
    const arrows=node('div','arcade-pad')
    for(const [key,label] of Object.entries({left:'←',up:'↑',down:'↓',right:'→'})){
      const arrow=node('button','handset-secondary',label)
      arrow.setAttribute('aria-label','Slide '+key)
      arrow.onclick=()=>shift(key)
      arrows.append(arrow)
    }
    controls.before(arrows)
  }
  game=read('puzzle-'+id,null)
  if(!game || game.board.length!==size*size)reset()
  else{done=checkEnd();announce(done?'No moves left':'Continue your game');draw()}
  return {pause:()=>setPaused(true),destroy(){clearTimeout(statusTimer);save()}}
}
