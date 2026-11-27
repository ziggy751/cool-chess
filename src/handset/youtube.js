import {icon} from '../icons.js'
import {gesture,node} from './shared.js'
import {youtubePlayer} from './youtube-player.js'
import catalog from './shorts.json'

const clips=[...new Map(catalog.filter(clip=>/^[\w-]{11}$/.test(clip.id)).map(clip=>[clip.id,clip])).values()]

function shuffle(items){
  const result=[...items]
  for(let last=result.length-1;last>0;last--){
    const pick=Math.floor(Math.random()*(last+1))
    const swap=result[last]
    result[last]=result[pick]
    result[pick]=swap
  }
  return result
}

function control(symbol,label){
  const button=node('button','shorts-control')
  button.type='button'
  button.innerHTML=icon(symbol)
  button.setAttribute('aria-label',label)
  button.title=label
  return button
}

export function mount(host,{settings,state,audioFocus}){
  const feed=state.feed ??= shuffle(clips)
  let index=state.index ?? 0
  let generation=0, player, connected=false, ready=false, visible=false
  let timer, progressTimer, destroyed=false, allowPlay=true, hasAudio=false
  const failed=new Set()
  const panel=node('section','shorts-feed')
  panel.setAttribute('aria-label','YouTube Shorts feed')
  const caption=node('div','shorts-caption')
  const title=node('strong')
  const creator=node('small')
  caption.append(title,creator)
  const body=node('div','shorts-stage')
  const frame=node('div','shorts-frame')
  const rail=node('div','shorts-rail')
  rail.setAttribute('aria-hidden','true')
  rail.title='Swipe here to change Shorts'
  rail.innerHTML=icon('grip-vertical')
  body.append(frame,rail)
  const status=node('p','shorts-status')
  status.setAttribute('role','status')
  const retry=node('button','handset-primary shorts-retry','Retry')
  retry.type='button'
  retry.hidden=true
  const progress=node('progress','shorts-progress')
  progress.setAttribute('aria-label','Video progress')
  const controls=node('div','shorts-controls')
  const previous=control('chevron-up','Previous Short')
  const next=control('chevron-down','Next Short')
  const sound=control('volume-x','Unmute Short')
  const link=node('a','shorts-source','Open on YouTube')
  link.target='_blank'
  link.rel='noopener noreferrer'
  controls.append(previous,next,sound,link)
  panel.append(caption,body,progress,controls,status,retry)
  host.append(panel)

  function note(text,action='',loading=false){
    status.textContent=text
    status.classList.toggle('shorts-loading',loading)
    status.hidden=!text
    retry.hidden=!action
    retry.textContent=action
  }

  function setSound(muted){
    sound.innerHTML=icon(muted?'volume-x':'volume-2')
    const label=muted?'Unmute Short':'Mute Short'
    sound.setAttribute('aria-label',label)
    sound.title=label
  }

  function releaseAudio(){
    if(hasAudio){
      audioFocus.endVideo()
      hasAudio=false
    }
  }

  function stop(remember){
    clearTimeout(timer)
    clearInterval(progressTimer)
    if(remember && ready)state.time=player?.getCurrentTime() || 0
    player?.pauseVideo?.()
    releaseAudio()
  }

  function destroyPlayer(remember){
    ++generation
    stop(remember)
    player?.destroy?.()
    frame.replaceChildren()
    player=null
    ready=false
    connected=false
    sound.disabled=true
    setSound(true)
  }

  function canAutoplay(){
    return ready && visible && allowPlay && !document.hidden
  }

  function play(){
    if(canAutoplay())player.playVideo()
  }

  function failedVideo(){
    failed.add(index)
    if(failed.size<feed.length){
      navigate(1)
      return
    }
    destroyPlayer(false)
    note('No Shorts could be played.','Retry feed')
  }

  async function load(){
    destroyPlayer(false)
    const clip=feed[index]
    if(!clip){note('No Shorts are configured.');return}
    title.textContent=clip.title
    creator.textContent=clip.channel
    link.href='https://www.youtube.com/shorts/'+clip.id
    progress.max=1
    progress.value=0
    if(!navigator.onLine){note('You’re offline. Reconnect to load Shorts.','Retry');return}
    const token=generation
    const current=()=>!destroyed && token===generation
    note('Loading Short…','',true)
    try{
      const yt=await youtubePlayer()
      if(!current())return
      const target=node('div')
      frame.append(target)
      timer=setTimeout(()=>{
        if(!current())return
        destroyPlayer(false)
        note('YouTube did not respond.','Retry')
      },14000)
      player=new yt.Player(target,{
        width:'100%',height:'100%',videoId:clip.id,
        playerVars:{autoplay:0,playsinline:1,controls:1,origin:location.origin,rel:0},
        events:{
          onReady:({target})=>{
            if(!current())return
            clearTimeout(timer)
            connected=ready=true
            target.mute()
            target.getIframe().title=clip.title+' · YouTube'
            sound.disabled=false
            note(visible?'':'Scroll to the player to watch.')
            if(state.time>0)target.cueVideoById({videoId:clip.id,startSeconds:state.time})
            play()
          },
          onStateChange:({data,target})=>{
            if(!current() || !ready)return
            if(data===yt.PlayerState.PLAYING){
              if(!visible || document.hidden){target.pauseVideo();return}
              note('')
              if(!target.isMuted() && !hasAudio){audioFocus.startVideo();hasAudio=true}
              clearInterval(progressTimer)
              releaseAudio()
              progressTimer=setInterval(()=>{
                progress.max=target.getDuration() || 1
                progress.value=target.getCurrentTime() || 0
              },350)
            }else{
              clearInterval(progressTimer)
              if(data===yt.PlayerState.ENDED)navigate(1)
            }
          },
          onAutoplayBlocked:()=>{if(current())note('Tap to start this Short.','Play')},
          onError:()=>{if(current())failedVideo()},
        },
      })
    }catch{
      if(!current())return
      destroyPlayer(false)
      note('YouTube did not connect.','Retry')
    }
  }

  function navigate(direction){
    if(!feed.length)return
    let candidate=index
    for(let attempt=0;attempt<feed.length;attempt++){
      candidate=(candidate+direction+feed.length)%feed.length
      if(!failed.has(candidate))break
    }
    index=state.index=candidate
    state.time=0
    allowPlay=true
    void load()
  }

  retry.onclick=()=>{
    allowPlay=true
    if(connected && ready && visible){player.playVideo();return}
    failed.clear()
    void load()
  }
  previous.onclick=()=>navigate(-1)
  next.onclick=()=>navigate(1)
  sound.onclick=()=>{
    if(!ready)return
    if(player.isMuted()){
      player.setVolume(Math.round((settings.phoneVideoVolume ?? settings.phoneVolume ?? .45)*100))
      player.unMute()
      setSound(false)
      allowPlay=true
      play()
    }else{
      player.mute()
      setSound(true)
      releaseAudio()
    }
  }

  let lastWheel=-Infinity
  const wheel=event=>{
    if(event.ctrlKey || !event.deltaY || (event.deltaMode===0 && Math.abs(event.deltaY)<5))return
    event.preventDefault()
    const now=performance.now()
    if(now-lastWheel<320)return
    lastWheel=now
    navigate(event.deltaY<0?1:-1)
  }
  const keys=event=>{
    if(!['ArrowUp','ArrowDown'].includes(event.key))return
    event.stopPropagation()
    event.preventDefault()
    navigate(event.key==='ArrowDown'?1:-1)
  }
  panel.addEventListener('wheel',wheel,{passive:false})
  host.addEventListener('keydown',keys)
  for(const surface of [rail,caption,status])gesture(surface,direction=>{
    if(direction==='up' || direction==='down')navigate(direction==='up'?1:-1)
  })
  const observer=new IntersectionObserver(([entry])=>{
    const active=entry.isIntersecting && entry.intersectionRatio>.5
    if(active===visible)return
    visible=active
    if(!ready)return
    if(active)play()
    else stop(false)
  },{threshold:[0,.51,1]})
  observer.observe(frame)

  const offline=()=>{
    destroyPlayer(true)
    note('You’re offline. Reconnect to load Shorts.','Retry')
  }
  window.addEventListener('offline',offline)
  void load()
  return {
    pause(){
      allowPlay=false
      if(ready){stop(true);note('Playback paused.','Resume')}
    },
    destroy(){
      destroyed=true
      destroyPlayer(true)
      observer.disconnect()
      host.removeEventListener('keydown',keys)
      window.removeEventListener('offline',offline)
    },
  }
}
