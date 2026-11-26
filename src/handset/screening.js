import {node,read,store,optionRows} from './shared.js'
import {mount as animate} from './comedy.js'

export const films=[
  {id:'swans',title:'Late Afternoon Swans',maker:'VulcanSphere / CogVideoX',rights:'CC0 1.0',type:'Wildlife',
    original:'https://commons.wikimedia.org/wiki/File:Late_Afternoon_Swans_(CogVideoX).webm'},
  {id:'macro',title:'Under the Ant Hill',maker:'OpenAI / Sora',rights:'Wikimedia public-domain algorithm designation',type:'Macro',
    original:'https://commons.wikimedia.org/wiki/File:POV_of_an_ant_walking_inside_an_ant_nest_tunnel_(Sora_AI-video).webm'},
  {id:'puppy',title:'Popcorn Quality Control',maker:'Google Research / VideoPoet',rights:'Wikimedia public-domain algorithm designation',type:'Animals',
    original:'https://commons.wikimedia.org/wiki/File:Dog_popcorn_with_audio_6781BD0C.webm'},
]
const base='/side-reel/screening/'
function mountFilms(host,{settings,audioFocus}){
  const favs=new Set(read('film-favourites',[]))
  let history=read('film-history',[])
  let current=films[0]
  const filter=node('select')
  filter.setAttribute('aria-label','Generated film category')
  filter.innerHTML=optionRows({all:'All films',Wildlife:'Wildlife',Macro:'Macro',Animals:'Animals',saved:'Favourites',history:'Watch history'},'all')
  const video=node('video','screening-video')
  video.controls=true;video.playsInline=true;video.preload='none';video.volume=settings.phoneVideoVolume ?? settings.phoneVolume
  video.muted=settings.phoneMuted
  const title=node('strong','screening-title'),credit=node('p','handset-note')
  const link=node('a','handset-link','Source and license');link.target='_blank';link.rel='noopener noreferrer'
  const status=node('p','handset-note');status.setAttribute('role','status')
  const fav=node('button','handset-secondary','Favourite film')
  const entries=node('div','screening-list')
  const play=node('button','handset-primary','Play film')
  function list(){
    const choice=filter.value
    return choice==='history'?history.map(id=>films.find(f=>f.id===id)).filter(Boolean):
      films.filter(film=>choice==='all' || (choice==='saved'?favs.has(film.id):film.type===choice))
  }
  function draw(){
    title.textContent=current.title
    credit.textContent=current.maker+' · '+current.rights
    link.href=current.original
    fav.setAttribute('aria-pressed',String(favs.has(current.id)))
    entries.replaceChildren()
    for(const film of list()){
      const item=node('button','handset-video-item')
      item.append(node('strong','',film.title),node('small','',film.type))
      item.setAttribute('aria-pressed',String(film===current))
      item.onclick=()=>load(film);entries.append(item)
    }
    if(!entries.childElementCount)entries.append(node('p','handset-note','No films in this view.'))
  }
  function load(film){
    video.pause();video.removeAttribute('src');video.load()
    current=film
    audioFocus.endVideo()
    play.hidden=false
    video.poster=base+film.id+'.webp'
    status.textContent='';draw()
  }
  play.onclick=async()=>{
    if(!video.getAttribute('src'))video.src=base+current.id+'.mp4'
    try{await video.play();play.hidden=true}catch{status.textContent='Playback failed. Try again or open the source.';audioFocus.endVideo()}
  }
  video.addEventListener('play',()=>{
    audioFocus.startVideo()
    history=[current.id,...history.filter(id=>id!==current.id)].slice(0,20)
    store('film-history',history)
    if(filter.value==='history')draw()
  })
  video.addEventListener('ended',()=>audioFocus.endVideo())
  video.addEventListener('error',()=>{if(video.getAttribute('src')){status.textContent='This film could not load.';audioFocus.endVideo()}})
  fav.onclick=()=>{
    if(favs.has(current.id))favs.delete(current.id)
    else favs.add(current.id)
    store('film-favourites',[...favs]);draw()
  }
  filter.onchange=draw
  host.append(video,play,title,credit,fav,link,status,filter,entries)
  load(current)
  return {pause(){video.pause()},destroy(){video.pause();video.removeAttribute('src');video.load();audioFocus.endVideo()}}
}
export function mount(host,services){
  const state=services.state
  const tab=node('nav','screening-tabs')
  const cinema=node('button','handset-secondary','Generated video')
  const memes=node('button','handset-secondary','Brainrot')
  const area=node('div','screening-content')
  let app
  function open(view){
    app?.destroy()
    area.replaceChildren()
    state.view=view
    cinema.setAttribute('aria-pressed',String(view==='films'));memes.setAttribute('aria-pressed',String(view==='memes'))
    if(view==='memes')app=animate(area,{...services,state:state.memes ||= {}})
    else app=mountFilms(area,services)
  }
  cinema.onclick=()=>open('films');memes.onclick=()=>open('memes')
  tab.append(cinema,memes);host.append(tab,area)
  open(state.view || 'memes')
  return {pause(){app?.pause()},destroy(){app?.destroy()}}
}
