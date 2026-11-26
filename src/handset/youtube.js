import {node,optionRows,read,store} from './shared.js'

const collection=[
  {id:'-eNe1OmbbXc',title:'Sea otter life in the bay',creator:'Monterey Bay Aquarium',category:'Animals'},
  {id:'yuxWyIe8TIc',title:'Why does the Moon look larger at the horizon?',creator:'NASA',category:'Space'},
]
const errorMessages={
  2:'This link is not a supported YouTube video.',
  5:'YouTube could not start the video in this browser.',
  100:'This video is unavailable or private.',
  101:'The uploader has disabled embedded playback.',
  150:'The uploader has disabled embedded playback.',
  153:'YouTube could not verify the embed origin.',
}
let playerAPI
function loadPlayer(){
  if(window.YT?.Player)return Promise.resolve(window.YT)
  playerAPI ||= new Promise((resolve,reject)=>{
    const script=document.createElement('script')
    script.src='https://www.youtube.com/iframe_api'
    let timeout
    const fail=()=>{
      clearTimeout(timeout)
      script.remove()
      window.onYouTubeIframeAPIReady=undefined
      reject(new Error('YouTube could not connect. You can still open the video on YouTube.'))
    }
    timeout=setTimeout(fail,12000)
    window.onYouTubeIframeAPIReady=()=>{
      clearTimeout(timeout)
      resolve(window.YT)
    }
    script.onerror=fail
    document.head.append(script)
  }).catch(error=>{playerAPI=null;throw error})
  return playerAPI
}

export function youtubeId(input){
  try{
    const url=new URL(input)
    if(url.protocol!=='https:' && url.protocol!=='http:')return null
    if(url.username || url.password || url.port)return null
    const path=url.pathname.split('/').filter(Boolean)
    const host=url.hostname.toLowerCase()
    const approved=['youtube.com','www.youtube.com','m.youtube.com'].includes(host)
    const value=host==='youtu.be' && path.length===1?path[0]:approved && path[0]==='watch' && path.length===1?
      url.searchParams.get('v'):approved && path.length===2 && ['shorts','embed','live'].includes(path[0])?path[1]:null
    return /^[0-9A-Za-z_-]{11}$/.test(value || '')?value:null
  }catch{return null}
}

export function mount(host,{settings,state}){
  const saved=read('youtube-saved',{})
  let history=read('youtube-history',[])
  const links=read('youtube-links',{})
  let active,player,attempt=0,ready=false,closed=false,volume=Math.round(settings.phoneVolume*100),pausedForTurn=false
  const filter=node('select')
  filter.innerHTML=optionRows({all:'Curated videos',Animals:'Animals',Space:'Space',links:'My links',saved:'Favourites',history:'History'},state.filter || 'all')
  filter.setAttribute('aria-label','YouTube category')
  const query=node('input')
  query.type='search';query.placeholder='Filter video titles';query.setAttribute('aria-label','Filter YouTube videos')
  const form=node('form','handset-inline')
  const link=node('input')
  link.type='url';link.placeholder='Paste a Shorts or video URL';link.required=true;link.setAttribute('aria-label','YouTube URL')
  const load=node('button','handset-secondary','Add link');load.type='submit'
  form.append(link,load)
  const message=node('p','handset-note')
  message.setAttribute('role','status')
  const detail=node('div','yt-title')
  const frame=node('div','yt-frame');frame.hidden=true
  const grid=node('div','yt-results')
  const buttons=node('div','handset-row')
  const prev=node('button','handset-secondary','Previous video'),next=node('button','handset-secondary','Next video')
  const fav=node('button','handset-secondary','Favourite'),resume=node('button','handset-secondary','Resume video')
  resume.hidden=true
  buttons.append(prev,next,fav,resume)
  const audio=node('label','handset-setting')
  const level=node('input');level.type='range';level.min=0;level.max=100;level.value=volume
  level.oninput=()=>{volume=Number(level.value);player?.setVolume?.(volume)}
  audio.append(node('span','','YouTube volume'),level)
  const external=node('a','handset-link','Search on YouTube')
  external.target='_blank';external.rel='noopener'
  const direct=node('a','handset-link','Open video on YouTube')
  direct.target='_blank';direct.rel='noopener';direct.hidden=true
  function resetPlayer(){
    ++attempt
    ready=false
    player?.destroy?.()
    player=null
    frame.replaceChildren()
    frame.hidden=true
    resume.hidden=true
  }

  const results=()=>{
    const q=query.value.trim().toLowerCase()
    const options={all:collection,Animals:collection.filter(video=>video.category==='Animals'),Space:collection.filter(video=>video.category==='Space'),
      links:Object.values(links),saved:Object.values(saved),history}
    return (options[filter.value] || collection).filter(video=>[video.title,video.creator].join(' ').toLowerCase().includes(q))
  }
  function draw(){
    const set=results()
    grid.replaceChildren()
    for(const video of set){
      const button=node('button','handset-video-item')
      button.type='button'
      button.append(node('strong','',video.title),node('small','',video.creator))
      button.setAttribute('aria-pressed',String(active?.id===video.id))
      button.onclick=()=>pick(video)
      grid.append(button)
    }
    if(!set.length)grid.append(node('p','handset-note','No videos in this view.'))
    const current=set.findIndex(video=>video.id===active?.id)
    prev.disabled=current<1
    next.disabled=current<0 || current===set.length-1
    fav.disabled=!active
    fav.setAttribute('aria-pressed',String(Boolean(active && saved[active.id])))
    external.href='https://www.youtube.com/results?search_query='+encodeURIComponent((query.value.trim() || 'Monterey Bay Aquarium')+' shorts')
  }
  function pick(video){
    resetPlayer()
    active=video
    detail.replaceChildren(node('strong','',video.title),node('small','',video.creator))
    const open=node('button','handset-primary','Load YouTube player')
    open.type='button'
    open.onclick=()=>show()
    detail.append(open)
    direct.hidden=false
    direct.href='https://www.youtube.com/watch?v='+video.id
    message.textContent='The official player appears when you load it.'
    draw()
  }
  async function show(){
    if(!active)return
    resetPlayer()
    const token=attempt
    pausedForTurn=false
    message.textContent='Connecting to YouTube…'
    const video=active
    try{
      const api=await loadPlayer()
      if(closed || token!==attempt)return
      frame.hidden=false
      const iframe=document.createElement('iframe')
      iframe.width='200'
      iframe.height='300'
      iframe.title='YouTube video player'
      iframe.referrerPolicy='strict-origin-when-cross-origin'
      iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
      iframe.allowFullscreen=true
      const params=new URLSearchParams({enablejsapi:'1',origin:location.origin,playsinline:'1',autoplay:'0',rel:'0'})
      iframe.src='https://www.youtube-nocookie.com/embed/'+video.id+'?'+params
      frame.append(iframe)
      player=new api.Player(iframe,{events:{
        onReady(event){
          if(closed || token!==attempt)return
          ready=true
          event.target.setVolume(volume)
          if(settings.phoneMuted)event.target.mute()
          if(pausedForTurn)event.target.pauseVideo()
          message.textContent='Use YouTube’s play button to start.'
        },
        onStateChange(event){
          if(closed || token!==attempt)return
          if(event.data===1){
            history=[video,...history.filter(item=>item.id!==video.id)].slice(0,30)
            store('youtube-history',history)
            message.textContent=''
          }
        },
        onError(event){if(token===attempt)message.textContent=errorMessages[event.data] || 'This video cannot play in the embedded player.'},
      }})
      setTimeout(()=>{
        if(!closed && token===attempt && !ready && message.textContent==='Connecting to YouTube…')
          message.textContent='The player did not respond. You can try again or open the video on YouTube.'
      },10000)
    }catch(error){if(!closed && token===attempt)message.textContent=error.message}
  }
  function step(direction){
    const set=results(),index=set.findIndex(video=>video.id===active?.id)
    if(set[index+direction])pick(set[index+direction])
  }
  filter.onchange=()=>{state.filter=filter.value;draw()}
  query.oninput=draw
  form.onsubmit=event=>{
    event.preventDefault()
    const id=youtubeId(link.value.trim())
    if(!id){message.textContent='Enter a public YouTube Shorts, watch, or youtu.be link.';return}
    const video=collection.find(item=>item.id===id) || {id,title:'YouTube video · '+id,creator:'Creator shown in player',category:'My links'}
    links[id]=video
    store('youtube-links',links)
    filter.value='links'
    state.filter=filter.value
    query.value=''
    pick(video)
  }
  prev.onclick=()=>step(-1)
  next.onclick=()=>step(1)
  fav.onclick=()=>{
    if(!active)return
    if(saved[active.id])delete saved[active.id]
    else saved[active.id]=active
    store('youtube-saved',saved)
    draw()
  }
  resume.onclick=()=>{player?.playVideo?.();resume.hidden=true}
  grid.onwheel=event=>{
    if(grid.scrollHeight>grid.clientHeight || Math.abs(event.deltaY)<30)return
    event.preventDefault();step(Math.sign(event.deltaY))
  }
  let y
  detail.ontouchstart=event=>{y=event.changedTouches[0].clientY}
  detail.ontouchend=event=>{const difference=y-event.changedTouches[0].clientY;if(Math.abs(difference)>33)step(Math.sign(difference))}
  host.append(filter,query,external,grid,form,detail,frame,message,buttons,audio,direct)
  draw()
  return {
    pause(){
      pausedForTurn=true
      const playing=player?.getPlayerState?.()===1
      player?.pauseVideo?.()
      resume.hidden=!playing
    },
    destroy(){closed=true;resetPlayer()},
  }
}
