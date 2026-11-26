import {arcadeCatalog} from './game-catalog.js'
import {node,optionRows,read,store} from './shared.js'
import {icon} from '../icons.js'

export function mount(host,{open,blocked,shortcuts,state}){
  const top=node('div','arcade-masthead'),subtitle=node('p','','Pocket games and personal records')
  top.append(node('span','arcade-monogram','SR'),node('h2','','Arcade'),subtitle)
  const tools=node('div','arcade-search'),query=node('input'),category=node('select')
  query.type='search';query.placeholder='Find a game';query.setAttribute('aria-label','Search arcade games')
  category.setAttribute('aria-label','Arcade category')
  category.innerHTML=optionRows({all:'All games',Action:'Action',Puzzle:'Puzzle',Sports:'Sports',Timing:'Timing',favourites:'Favourites',recent:'Recently played'},state.filter || 'all')
  tools.append(query,category)
  const library=node('div','arcade-library')
  let saved=new Set(read('arcade-favourites',[]))
  function draw(){
    library.replaceChildren()
    const recent=read('arcade-recent',[])
    const filter=category.value
    const term=query.value.trim().toLowerCase()
    let list=arcadeCatalog.filter(game=>game.name.toLowerCase().includes(term) && (filter==='all' ||
      filter==='favourites' && saved.has(game.id) || filter==='recent' && recent.includes(game.id) || filter===game.category))
    if(filter==='recent')list=list.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id))
    for(const game of list){
      const item=node('article','arcade-entry')
      item.style.setProperty('--game-ink',game.tint)
      const play=node('button','arcade-preview')
      play.setAttribute('aria-label','Play '+game.name)
      const thumbnail=node('img');thumbnail.alt='';thumbnail.src=game.preview;thumbnail.loading='lazy'
      thumbnail.onerror=()=>{thumbnail.hidden=true}
      play.append(thumbnail,node('span','arcade-play','▶'))
      play.disabled=game.id==='chess' && blocked()
      play.onclick=()=>open(game.id)
      const detail=node('div','arcade-entry-details'),caption=node('div','arcade-entry-caption')
      const score=read(game.id==='reaction'?'reaction-best':'best-'+game.id,null)
      const description=play.disabled?'Available after the match':score===null?game.category:game.id==='reaction'?'Best '+score+' ms':'Best '+score
      caption.append(node('strong','',game.name),node('small','',description))
      const favourite=node('button','arcade-star')
      favourite.innerHTML=icon('star');favourite.setAttribute('aria-label','Favourite '+game.name)
      favourite.setAttribute('aria-pressed',String(saved.has(game.id)))
      favourite.onclick=()=>{
        if(saved.has(game.id))saved.delete(game.id)
        else saved.add(game.id)
        store('arcade-favourites',[...saved]);draw()
      }
      const shortcut=node('button','arcade-shortcut',shortcuts.has(game.id)?'−':'+')
      shortcut.setAttribute('aria-label',(shortcuts.has(game.id)?'Remove':'Add')+' '+game.name+' home shortcut')
      shortcut.onclick=()=>{
        if(shortcuts.has(game.id))shortcuts.delete(game.id)
        else shortcuts.add(game.id)
        store('arcade-shortcuts',[...shortcuts]);draw()
      }
      detail.append(caption,favourite,shortcut)
      item.append(play,detail);library.append(item)
    }
    if(!list.length)library.append(node('p','handset-note','No games in this view.'))
  }
  query.oninput=draw
  category.onchange=()=>{state.filter=category.value;draw()}
  host.append(top,tools,library)
  draw()
  return {update:draw}
}
