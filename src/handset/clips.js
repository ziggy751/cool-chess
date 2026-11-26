import {icon} from '../icons.js'

const shows=[
  {id:'cabin',category:'Christmas',title:'Winter window',caption:'Snowfall, candlelight and a quiet cabin after dark.'},
  {id:'aurora',category:'Nature',title:'Polar sky',caption:'An animated study of drifting aurora over a pine ridge.'},
  {id:'brass',category:'Design',title:'Turned light',caption:'Warm reflections move across a stack of hand-shaped brass rings.'},
  {id:'smothered',category:'Chess',title:'Smothered mate',caption:'A queen sacrifice leads to a forced knight mate.'},
].map(item=>({...item,source:'/side-reel/'+item.id+'.mp4',poster:'/side-reel/'+item.id+'.webp',creator:'Chess Evolution Studio'}))

const el=(tag,className,text)=>Object.assign(document.createElement(tag),{className,textContent:text})
const iconButton=(id,label,symbol)=>`<button id="${id}" type="button" aria-label="${label}" title="${label}">${icon(symbol)}</button>`
const storageKey='evolution-phone-bookmarks'

export function mount(host,services){
  const {settings,save}=services
  host.innerHTML=`
      <div class="phone-viewport" tabindex="0" aria-label="Video player">
        <video playsinline preload="none" aria-label="Short video"></video>
        <button class="phone-main-play" type="button" aria-label="Play video">${icon('play')}</button>
        <div class="phone-video-copy"><strong></strong><small></small><p></p></div>
        <p class="phone-media-error" role="status" hidden></p>
      </div>
      <div class="phone-progress"><progress max="1" value="0" aria-label="Video progress"></progress><span>0:00</span></div>
      <div class="phone-video-controls">
        ${iconButton('phone-prev','Previous video','chevron-left')}
        ${iconButton('phone-play','Play or pause video','play')}
        ${iconButton('phone-next','Next video','chevron-right')}
        ${iconButton('phone-save','Bookmark video','bookmark')}
        ${iconButton('phone-mute','Mute phone','volume-2')}
        ${iconButton('phone-full','Fullscreen video','maximize')}
      </div>
      <label class="phone-filter">Videos<select id="phone-category" aria-label="Video category"></select></label>
      <label class="phone-filter">Local video <input id="phone-file" type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"></label>`
  const get=id=>host.querySelector('#phone-'+id)
  const screen=host.querySelector('.phone-viewport')
  const video=host.querySelector('video')
  const button=host.querySelector('.phone-main-play')
  const message=host.querySelector('.phone-media-error')
  const progress=host.querySelector('progress')
  const info=host.querySelector('.phone-video-copy')
  let bookmarks
  try{bookmarks=new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))}catch{bookmarks=new Set()}
  let index=0,active,competitive=services.blocked(),startY=null,lastSwipe=0
  const clips=[]
  function theme(){
    video.volume=settings.phoneVolume
    video.muted=settings.phoneMuted
    get('mute').setAttribute('aria-pressed',String(video.muted))
    get('mute').setAttribute('aria-label',video.muted?'Unmute phone':'Mute phone')
  }
  function roomClips(){return competitive?shows.filter(show=>show.category!=='Chess'):[...shows,...clips]}
  function list(){
    const chosen=get('category').value
    return roomClips().filter(clip=>chosen==='all' || chosen==='saved' && bookmarks.has(clip.id) || chosen===clip.category)
  }
  function showError(value){
    message.hidden=!value
    message.textContent=value || ''
  }
  function options(){
    const filter=get('category'),current=filter.value
    filter.replaceChildren()
    for(const [id,label] of [['all','All videos'],['saved','Bookmarks'],...[...new Set(roomClips().map(clip=>clip.category))].map(value=>[value,value])]){
      filter.append(new Option(label,id))
    }
    if([...filter.options].some(option=>option.value===current))filter.value=current
  }
  function count(seconds){
    const safe=Number.isFinite(seconds)?Math.floor(seconds):0
    return Math.floor(safe/60)+':'+String(safe%60).padStart(2,'0')
  }
  function paintPlayback(){
    const paused=video.paused || video.ended
    button.hidden=!paused || !active
    button.setAttribute('aria-label',video.ended?'Replay video':'Play video')
    get('play').innerHTML=icon(paused?'play':'pause')
    progress.value=Number.isFinite(video.duration)?video.currentTime/video.duration:0
    host.querySelector('.phone-progress span').textContent=count(video.currentTime)
    screen.classList.toggle('playing',!paused)
  }
  function pick(){
    const possible=list()
    index=Math.max(0,Math.min(index,possible.length-1))
    const next=possible[index]
    showError(null)
    if(next!==active){
      video.pause()
      active=next
      if(active){
        video.src=active.source
        video.poster=active.poster || ''
      }else if(video.hasAttribute('src')){
        video.removeAttribute('src')
        video.removeAttribute('poster')
        video.load()
      }
    }
    info.querySelector('strong').textContent=active?.title || 'No videos in this view'
    info.querySelector('small').textContent=active?.creator || ''
    info.querySelector('p').textContent=active?.caption || ''
    get('prev').disabled=index===0
    get('next').disabled=index+1>=possible.length
    get('save').disabled=!active
    get('save').setAttribute('aria-pressed',String(Boolean(active && bookmarks.has(active.id))))
    get('play').disabled=get('full').disabled=!active
    paintPlayback()
  }
  function skip(delta){
    const next=index+delta
    if(next<0 || next>=list().length)return
    index=next
    pick()
  }
  async function togglePlay(){
    if(!active)return
    if(!video.paused && !video.ended){video.pause();return}
    if(video.ended)video.currentTime=0
    try{await video.play();showError(null)}
    catch{showError('This video could not play. Try another file in MP4 or WebM.')}
  }
  get('prev').onclick=()=>skip(-1)
  get('next').onclick=()=>skip(1)
  get('play').onclick=button.onclick=togglePlay
  get('mute').onclick=()=>{settings.phoneMuted=!settings.phoneMuted;save();theme()}
  get('full').onclick=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen()
      else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen()
      else await video.requestFullscreen()
    }catch{showError('Fullscreen video is unavailable in this browser.')}
  }
  get('save').onclick=()=>{
    if(!active)return
    if(bookmarks.has(active.id))bookmarks.delete(active.id)
    else bookmarks.add(active.id)
    try{localStorage.setItem(storageKey,JSON.stringify([...bookmarks].filter(key=>shows.some(clip=>clip.id===key))))}catch{}
    pick()
  }
  get('category').onchange=()=>{index=0;pick()}
  get('file').onchange=()=>{
    if(competitive)return
    const file=get('file').files?.[0]
    if(!file)return
    if(file.type && !file.type.startsWith('video/')){showError('Choose a video file.');return}
    if(clips.length>=8){
      const old=clips.shift()
      if(active===old)video.pause()
      bookmarks.delete(old.id)
      URL.revokeObjectURL(old.source)
    }
    const id='local-'+crypto.randomUUID()
    clips.push({id,title:file.name,category:'My files',creator:'Local video',caption:'',source:URL.createObjectURL(file)})
    options()
    get('category').value='My files'
    index=clips.length-1
    pick()
    get('file').value=''
  }
  screen.addEventListener('wheel',event=>{
    if(Math.abs(event.deltaY)<12)return
    event.preventDefault()
    if(performance.now()-lastSwipe<360)return
    lastSwipe=performance.now()
    skip(Math.sign(event.deltaY))
  },{passive:false})
  screen.addEventListener('touchstart',event=>{startY=event.changedTouches[0].clientY},{passive:true})
  screen.addEventListener('touchend',event=>{
    const distance=startY===null?0:startY-event.changedTouches[0].clientY
    if(Math.abs(distance)>35)skip(Math.sign(distance))
    startY=null
  },{passive:true})
  screen.addEventListener('keydown',event=>{
    const delta={ArrowUp:-1,ArrowDown:1}[event.key]
    if(!delta)return
    event.preventDefault()
    skip(delta)
  })
  for(const event of ['play','pause','timeupdate','loadedmetadata','ended'])video.addEventListener(event,paintPlayback)
  video.addEventListener('error',()=>{if(active)showError('This video could not load.')})
  options()
  theme()
  get('file').disabled=competitive
  if(services.state.category && [...get('category').options].some(option=>option.value===services.state.category)){
    get('category').value=services.state.category
    index=services.state.index || 0
  }
  pick()
  return {
    pause:()=>video.pause(),
    destroy(){
      services.state.category=get('category').value
      services.state.index=index
      video.pause()
      video.removeAttribute('src')
      video.load()
      for(const clip of clips)URL.revokeObjectURL(clip.source)
    },
    update(blocked){
      if(competitive===blocked)return
      competitive=blocked
      get('file').disabled=blocked
      options()
      pick()
    },
  }
}
