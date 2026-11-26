import {icon} from './icons.js'

const shows=[
  {id:'cabin',category:'Christmas',title:'Winter window',caption:'Snowfall, candlelight and a quiet cabin after dark.'},
  {id:'aurora',category:'Nature',title:'Polar sky',caption:'An animated study of drifting aurora over a pine ridge.'},
  {id:'brass',category:'Design',title:'Turned light',caption:'Warm reflections move across a stack of hand-shaped brass rings.'},
  {id:'smothered',category:'Chess',title:'Smothered mate',caption:'A queen sacrifice leads to a forced knight mate.'},
].map(item=>({...item,source:'/side-reel/'+item.id+'.mp4',poster:'/side-reel/'+item.id+'.webp',creator:'Chess Evolution Studio'}))

const el=(tag,className,text)=>Object.assign(document.createElement(tag),{className,textContent:text})
const iconButton=(id,label,symbol)=>`<button id="${id}" type="button" aria-label="${label}" title="${label}">${icon(symbol)}</button>`
const storageKey='evolution-phone-bookmarks'

export function createPhone(host,settings,save){
  host.innerHTML=`
    <div class="phone-housing"><div class="phone-screen">
      <div class="phone-status"><time></time><span aria-hidden="true">▮▮▮ ${icon('battery-full')}</span></div>
      <header class="phone-header">
        <strong>Side Reel</strong><div class="phone-window-actions">
          ${iconButton('phone-minimize','Minimize phone','minus')}${iconButton('phone-close','Close phone','x')}
        </div>
      </header>
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
      <details class="phone-preferences"><summary>Phone settings</summary>
        <label>Screen side<select id="phone-side"><option value="right">Right</option><option value="left">Left</option></select></label>
        <label>Size<select id="phone-size"><option value="compact">Compact</option><option value="regular">Regular</option><option value="large">Large</option></select></label>
        <label>Case<select id="phone-case"><option value="standard">Graphite</option><option value="christmas">Christmas red</option><option value="gold">Champagne gold</option></select></label>
        <label>Phone volume<input id="phone-volume" type="range" min="0" max="1" step=".05"></label>
        <label class="phone-check"><input id="phone-autopause" type="checkbox"> Pause on your turn</label>
        <label class="phone-check"><input id="phone-key" type="checkbox"> P shortcut</label>
        <label>Open local video<input id="phone-file" type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"></label>
      </details>
      <div class="phone-home" aria-hidden="true"></div>
    </div></div><div class="phone-turn" aria-live="polite" hidden></div>`
  const get=id=>host.querySelector('#phone-'+id)
  const screen=host.querySelector('.phone-viewport')
  const video=host.querySelector('video')
  const button=host.querySelector('.phone-main-play')
  const message=host.querySelector('.phone-media-error')
  const progress=host.querySelector('progress')
  const info=host.querySelector('.phone-video-copy')
  let bookmarks
  try{bookmarks=new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))}catch{bookmarks=new Set()}
  let index=0,active,competitive=false,lastTurn=null,timer,startY=null,lastSwipe=0
  const clips=[]
  const clock=host.querySelector('time')
  const layout=host.closest('.game-layout')
  function theme(){
    layout.dataset.phoneSide=settings.phoneSide
    layout.dataset.phoneSize=settings.phoneSize
    host.dataset.case=settings.phoneCase
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
  function clockFace(){clock.textContent=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hour12:false}).format(Date.now())}
  function close(){
    if(host.hidden)return
    video.pause()
    host.hidden=true
    layout.classList.remove('phone-open')
    document.getElementById('phone-toggle')?.setAttribute('aria-pressed','false')
    clearInterval(timer)
  }
  get('close').onclick=close
  get('minimize').onclick=close
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
  for(const [id,key] of [['side','phoneSide'],['size','phoneSize'],['case','phoneCase'],['volume','phoneVolume'],
    ['autopause','phoneAutopause'],['key','phoneShortcut']]){
    const field=get(id)
    if(field.type==='checkbox')field.checked=settings[key]
    else field.value=settings[key]
    field.oninput=()=>{
      settings[key]=field.type==='checkbox'?field.checked:field.type==='range'?+field.value:field.value
      save()
      theme()
    }
  }
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
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause()})
  options()
  theme()
  return {
    toggle(){
      if(!host.hidden){close();return}
      host.hidden=false
      layout.classList.add('phone-open')
      document.getElementById('phone-toggle')?.setAttribute('aria-pressed','true')
      clockFace()
      timer=setInterval(clockFace,30000)
      pick()
    },
    close,
    update({label,ownTurn,key,blocked}){
      if(competitive!==blocked){
        competitive=blocked
        get('file').disabled=blocked
        options()
        if(!host.hidden)pick()
      }
      const turn=host.querySelector('.phone-turn')
      turn.hidden=!ownTurn
      turn.textContent=label
      if(ownTurn && key!==lastTurn && settings.phoneAutopause && !host.hidden)video.pause()
      lastTurn=key
    },
  }
}
