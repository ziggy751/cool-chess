import {icon} from '../icons.js'
import {node,optionRows,read,store} from './shared.js'

const tracks=[
  ['Winter bells','Christmas','/side-reel/noel.mp3','#916077'],
  ['Quiet keyboard','Lo-fi','/side-reel/music/study.mp3','#a37760'],
  ['Dusk chords','Instrumental','/side-reel/music/pads.mp3','#647da2'],
  ['Neon pulse','Electronic','/side-reel/music/neon.mp3','#7251a9'],
  ['Rain on glass','Nature','/side-reel/music/rain.mp3','#467990'],
  ['Quiet hearth','Fireplace','/side-reel/music/hearth.mp3','#a85953'],
  ['Shoreline','Ocean','/side-reel/music/shore.mp3','#498279'],
].map(([title,category,source,color],id)=>({title,category,source,color,id}))

export function mount(host,{settings,state}){
  const audio=state.audio ||= new Audio()
  audio.preload='none'
  audio.volume=read('music-volume',settings.phoneVolume)
  const library=node('select')
  library.setAttribute('aria-label','Music playlist')
  library.innerHTML=optionRows({all:'All tracks',favourite:'Favourites',playlist:'My playlist',
    ...Object.fromEntries(tracks.map(track=>[track.category,track.category]))},state.filter || 'all')
  const plate=node('div','music-art')
  plate.innerHTML=icon('music')
  const name=node('strong','music-title')
  const style=node('p','handset-note')
  const status=node('p','handset-note')
  status.setAttribute('role','status')
  const elapsed=node('progress');elapsed.max=1;elapsed.value=0
  elapsed.setAttribute('aria-label','Track progress')
  const controls=node('div','handset-row')
  const prev=node('button','handset-secondary','Previous'),play=node('button','handset-primary','Play track')
  const next=node('button','handset-secondary','Next')
  controls.append(prev,play,next)
  const edit=node('div','handset-row')
  const favourite=node('button','handset-secondary','Favourite'),add=node('button','handset-secondary','Add to playlist')
  edit.append(favourite,add)
  const volume=node('label','handset-setting')
  const level=node('input');level.type='range';level.min=0;level.max=1;level.step=.05;level.value=audio.volume
  level.oninput=()=>{audio.volume=Number(level.value);store('music-volume',audio.volume)}
  volume.append(node('span','','Music volume'),level)
  const choices=node('div','music-tracks')
  const favourites=new Set(read('music-favourites',[])),playlist=new Set(read('music-playlist',[]))
  let current=tracks[state.track ?? read('music-track',0)] || tracks[0]
  const visible=()=>tracks.filter(track=>library.value==='all' || library.value==='playlist' && playlist.has(track.id) ||
    library.value==='favourite' && favourites.has(track.id) || track.category===library.value)
  function setTrack(track){
    if(track!==current || !audio.getAttribute('src')){
      audio.pause()
      audio.src=track.source
    }
    current=track
    store('music-track',current.id)
    state.track=current.id
    status.textContent=''
    draw()
  }
  function playState(){
    play.textContent=audio.paused?'Play track':'Pause track'
    plate.classList.toggle('is-playing',!audio.paused)
    elapsed.value=Number.isFinite(audio.duration)?audio.currentTime/audio.duration:0
  }
  async function toggle(){
    if(!audio.paused){audio.pause();return}
    if(!audio.src)setTrack(current)
    try{await audio.play();status.textContent=''}
    catch{status.textContent='This track could not play in this browser.'}
  }
  function draw(){
    const list=visible(),index=list.findIndex(track=>track.id===current.id)
    plate.style.setProperty('--record',current.color)
    name.textContent=current.title
    style.textContent=current.category+' · Side Reel Studio'
    prev.disabled=index<=0;next.disabled=index<0 || index>=list.length-1
    favourite.setAttribute('aria-pressed',String(favourites.has(current.id)))
    add.textContent=playlist.has(current.id)?'Remove from playlist':'Add to playlist'
    choices.replaceChildren()
    for(const track of list){
      const item=node('button','handset-video-item')
      item.type='button'
      item.setAttribute('aria-pressed',String(track===current))
      item.append(node('strong','',track.title),node('small','',track.category))
      item.onclick=()=>setTrack(track)
      choices.append(item)
    }
    if(!list.length)choices.append(node('p','handset-note','This playlist is empty.'))
    playState()
  }
  function step(delta){
    const list=visible(),index=list.findIndex(track=>track.id===current.id)
    if(list[index+delta])setTrack(list[index+delta])
  }
  function editList(list,item,key){
    if(list.has(item))list.delete(item)
    else list.add(item)
    store(key,[...list]);draw()
  }
  play.onclick=toggle
  prev.onclick=()=>step(-1)
  next.onclick=()=>step(1)
  favourite.onclick=()=>editList(favourites,current.id,'music-favourites')
  add.onclick=()=>editList(playlist,current.id,'music-playlist')
  library.onchange=()=>{state.filter=library.value;draw()}
  const events=['play','pause','timeupdate','durationchange','ended']
  events.forEach(event=>audio.addEventListener(event,playState))
  host.append(library,plate,name,style,elapsed,controls,edit,volume,choices,status)
  setTrack(current)
  return {pause:()=>audio.pause(),destroy(){events.forEach(event=>audio.removeEventListener(event,playState))}}
}
