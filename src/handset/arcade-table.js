import {node,read,store} from './shared.js'

const stone=['Pear','Lemon','Orange','Apple','Peach','Plum','Fig','Pineapple']
const icons=['●','⬟','✿','✸','◆','✦','▲','❖']
const inks=['#b1e088','#e8d17a','#ffb366','#eb9494','#f6b9a8','#c9a8e9','#95d5d4','#eedca0']
const suits=['♠','♥','♣','♦']
const ranks=['','A','2','3','4','5','6','7','8','9','10','J','Q','K']
function shuffle(items){
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1))
    ;[items[i],items[j]]=[items[j],items[i]]
  }
  return items
}
export function orchardDrop(input,column,value){
  const board=input.map(row=>row.slice())
  let height=board[column].length
  if(height>=6)return null
  board[column].push(value)
  let score=3
  for(;;){
    const same=board[column][height]
    const adjacent=[[column,height-1],[column-1,height],[column+1,height]]
      .find(([x,y])=>board[x]?.[y]===same && same<stone.length-1)
    if(!adjacent)break
    const [x,y]=adjacent
    board[x].splice(y,1)
    if(x===column)height--
    board[column][height]++
    score+=8*(same+1)
  }
  return {board,score}
}
function merge(root,game){
  let layout,next,cellGroup
  function roll(){return Math.random()<.74?0:Math.random()<.80?1:2}
  let data=read('orchard',null) || {board:Array.from({length:5},()=>[]),next:roll(),score:0}
  function draw(){
    layout.replaceChildren()
    for(let y=5;y>=0;y--)for(let x=0;x<5;x++){
      const value=data.board[x][y]
      const square=node('span','orchard-cell',value===undefined?'':icons[value])
      if(value!==undefined){square.style.setProperty('--fruit',inks[value]);square.title=stone[value]}
      layout.append(square)
    }
    next.textContent='Next '+stone[data.next];next.style.setProperty('--fruit',inks[data.next])
    game.set(data.score)
    game.status(data.board.every(column=>column.length>=6)?'Orchard full · Restart to play again':'Drop matching fruit beside or above one another')
    store('orchard',data)
  }
  function place(x){
    if(game.paused)return
    const result=orchardDrop(data.board,x,data.next)
    if(!result){game.status('That column is full');return}
    data={board:result.board,next:roll(),score:data.score+result.score};draw()
  }
  layout=node('div','orchard-board')
  next=node('p','orchard-next')
  cellGroup=node('div','orchard-drop')
  for(let index=0;index<5;index++){
    const cell=node('button','handset-secondary','↓')
    cell.setAttribute('aria-label','Drop in column '+(index+1));cell.onclick=()=>place(index);cellGroup.append(cell)
  }
  root.append(next,layout,cellGroup)
  draw()
  return {reset(){data={board:Array.from({length:5},()=>[]),next:roll(),score:0};draw()},resume:draw}
}
function memory(root,game){
  let data=read('memory-game',null) || {deck:shuffle([0,1,2,3,4,5,6,7,0,1,2,3,4,5,6,7]),matches:[],turns:0}
  let first,second,timer
  const board=node('div','memory-board')
  function draw(){
    board.replaceChildren()
    for(const [index,face] of data.deck.entries()){
      const revealed=data.matches.includes(index) || index===first || index===second
      const card=node('button','memory-card',revealed?icons[face]:'◦')
      card.style.setProperty('--face',inks[face])
      card.dataset.revealed=String(revealed);card.disabled=data.matches.includes(index)
      card.setAttribute('aria-label','Card '+(index+1)+(revealed?' · '+stone[face]:''))
      card.onclick=()=>choose(index);board.append(card)
    }
    game.status(data.matches.length===16?'Complete in '+data.turns+' tries':data.matches.length/2+' / 8 matched · '+data.turns+' tries')
    store('memory-game',data)
  }
  function choose(index){
    if(game.paused || second!==undefined || first===index || data.matches.includes(index))return
    if(first===undefined){first=index;draw();return}
    second=index;data.turns++
    if(data.deck[first]===data.deck[second]){
      data.matches.push(first,second)
      first=second=undefined
      game.set(data.matches.length*10)
    }else{
      timer=setTimeout(()=>{first=second=undefined;draw()},620)
    }
    draw()
  }
  root.append(board)
  game.set(data.matches.length*10);draw()
  function stop(){clearTimeout(timer);first=second=undefined}
  return {reset(){
    stop();data={deck:shuffle([0,1,2,3,4,5,6,7,0,1,2,3,4,5,6,7]),matches:[],turns:0}
    game.set(0);draw()
  },pause(){stop();draw()},resume:draw,destroy:stop}
}
const cardSuit=card=>Math.floor(card/13)
const cardRank=card=>card%13+1
const cardShade=card=>cardSuit(card)%2
const canStack=(above,below)=>above===undefined?cardRank(below)===13:cardRank(above)===cardRank(below)+1 && cardShade(above)!==cardShade(below)
function deal(){
  const deck=shuffle(Array.from({length:52},(_,i)=>i))
  const tableau=Array.from({length:7},(_,index)=>deck.splice(0,index+1))
  return {stock:deck,waste:[],tableau,visible:[0,1,2,3,4,5,6],foundations:[[],[],[],[]]}
}
function solitaire(root,game){
  let data=read('phone-klondike',null) || deal(),selected
  const table=node('div','solitaire-table')
  function card(value,hidden=false){
    const text=value===undefined?'—':hidden?'◆':ranks[cardRank(value)]+suits[cardSuit(value)]
    const result=node('button','solitaire-card',text)
    if(value===undefined)result.dataset.empty='true'
    else if(hidden)result.dataset.back='true'
    else result.dataset.red=String(Boolean(cardShade(value)))
    return result
  }
  function redraw(){
    table.replaceChildren()
    const header=node('div','solitaire-area')
    const stock=card(data.stock.length?0:undefined,Boolean(data.stock.length));stock.setAttribute('aria-label','Draw card')
    stock.onclick=()=>{
      if(game.paused)return
      selected=null
      if(!data.stock.length){data.stock=data.waste.reverse();data.waste=[]}
      else data.waste.push(data.stock.pop())
      redraw()
    }
    const waste=card(data.waste.at(-1));waste.setAttribute('aria-label','Waste '+waste.textContent)
    waste.setAttribute('aria-pressed',String(selected?.kind==='waste'))
    waste.onclick=()=>{if(!game.paused && data.waste.length){selected={kind:'waste',offset:data.waste.length-1};redraw()}}
    header.append(stock,waste)
    for(const [index,pile] of data.foundations.entries()){
      const slot=card(pile.at(-1));slot.setAttribute('aria-label','Foundation '+suits[index])
      slot.onclick=()=>{
        if(game.paused)return
        const values=selection()
        if(values.length!==1 || cardSuit(values[0])!==index || cardRank(values[0])!==pile.length+1){
          game.status('Build each suit from Ace to King');return
        }
        pile.push(values[0]);removeSelected();redraw()
      }
      header.append(slot)
    }
    const piles=node('div','solitaire-area solitaire-piles')
    for(const [lane,stack] of data.tableau.entries()){
      const column=node('div','solitaire-stack')
      if(!stack.length){
        const slot=card()
        slot.setAttribute('aria-label','Empty column '+(lane+1));slot.onclick=()=>moveTo(lane,0);column.append(slot)
      }
      for(const [offset,value] of stack.entries()){
        const tile=card(value,offset<data.visible[lane])
        tile.setAttribute('aria-label','Column '+(lane+1)+' '+tile.textContent)
        tile.disabled=offset<data.visible[lane]
        tile.setAttribute('aria-pressed',String(selected?.lane===lane && offset>=selected.offset))
        tile.onclick=()=>moveTo(lane,offset);column.append(tile)
      }
      piles.append(column)
    }
    table.append(header,piles)
    const progress=data.foundations.reduce((total,pile)=>total+pile.length,0)
    game.set(progress)
    game.status(progress===52?'All four foundations complete':progress+' / 52 cards in foundations')
    store('phone-klondike',data)
  }
  function selection(){
    if(!selected)return []
    return selected.kind==='waste'?data.waste.slice(-1):data.tableau[selected.lane].slice(selected.offset)
  }
  function removeSelected(){
    if(selected.kind==='waste')data.waste.pop()
    else {
      const {lane,offset}=selected
      data.tableau[lane].splice(offset)
      data.visible[lane]=Math.min(data.visible[lane],Math.max(0,data.tableau[lane].length-1))
    }
    selected=null
  }
  function moveTo(lane,offset){
    if(game.paused)return
    const target=data.tableau[lane],values=selection()
    if(values.length && selected.lane!==lane && canStack(target.at(-1),values[0])){
      removeSelected();target.push(...values);redraw();return
    }
    if(target.length){
      selected={kind:'tableau',lane,offset};redraw()
    }
  }
  root.append(table,node('p','handset-note','Select a face-up card, then its destination. Build columns in alternate colours. Only kings start empty columns.'))
  redraw()
  return {reset(){data=deal();selected=null;redraw()},resume:redraw}
}
function reaction(root,game){
  const pad=node('button','reaction-pad','Begin test')
  let phase='ready',timer,started
  const best=read('reaction-best',null)
  game.best.textContent=best?best+' ms':'—'
  function reset(message='Test your reaction time'){
    clearTimeout(timer);phase='ready'
    pad.textContent='Begin test';pad.dataset.phase=phase
    game.status(message)
  }
  pad.onclick=()=>{
    if(game.paused)return
    if(phase==='waiting'){reset('Too soon · Try again');return}
    if(phase==='go'){
      const milliseconds=Math.max(1,Math.round(performance.now()-started))
      game.score.textContent=milliseconds+' ms'
      const previous=read('reaction-best',null)
      if(!previous || milliseconds<previous){store('reaction-best',milliseconds);game.best.textContent=milliseconds+' ms'}
      reset('Result · '+milliseconds+' ms');return
    }
    phase='waiting';pad.dataset.phase=phase;pad.textContent='Wait for the signal';game.status('Hold')
    timer=setTimeout(()=>{
      phase='go';started=performance.now();pad.dataset.phase=phase;pad.textContent='TAP NOW';game.status('Go')
    },950+Math.random()*2350)
  }
  root.append(pad);reset()
  return {reset,pause(){reset('Paused')},destroy(){clearTimeout(timer)}}
}
const models={merge,memory,solitaire,reaction}
export function mount(host,{id}){
  const hud=node('div','extra-hud'),score=node('strong','','0'),best=node('strong','',String(read('best-'+id,0)))
  hud.append(node('span','',id==='reaction'?'Last':'Score'),score,node('span','','Best'),best)
  const status=node('p','arcade-status');status.setAttribute('role','status')
  const board=node('div','table-app')
  const pause=node('button','handset-secondary','Pause'),restart=node('button','handset-secondary','Restart')
  const row=node('div','handset-row');row.append(pause,restart)
  let high=read('best-'+id,0)
  const game={paused:false,score,best,status(message){status.textContent=message},set(value){
    score.textContent=String(value)
    if(value>high){high=value;best.textContent=String(value);store('best-'+id,value)}
  }}
  const app=models[id](board,game)
  function toggle(value){
    game.paused=value;board.inert=value;pause.textContent=value?'Resume':'Pause'
    if(value){app.pause?.();game.status('Paused')}
    else {app.resume?.();game.status('Ready')}
  }
  pause.onclick=()=>toggle(!game.paused)
  restart.onclick=()=>{toggle(false);app.reset()}
  host.append(hud,board,status,row)
  return {pause:()=>toggle(true),destroy(){app.destroy?.()}}
}
