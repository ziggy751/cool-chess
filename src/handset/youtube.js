import {node,optionRows,read,store} from './shared.js'

export const collection=[
  {id:'-eNe1OmbbXc',title:'Sea otter life in the bay',creator:'Monterey Bay Aquarium',category:'Animals',vertical:true},
  {id:'WANV0qH3BIQ',title:'Box Clever',creator:'Simon’s Cat Extra',category:'Creative animation',vertical:true},
  {id:'tFqjzmjPHrk',title:'What do you do? Sea otter rescue and care',creator:'Monterey Bay Aquarium',category:'Animals',vertical:true},
  {id:'Sb83ZXKT2Go',title:'When you go down the chess rabbit hole',creator:'Chess.com',category:'Chess',vertical:true},
  {id:'QKS7BAcKpm8',title:'Name drop for our newest game drop!',creator:'Minecraft',category:'Minecraft',vertical:true},
  {id:'Aedr9nfq19Q',title:'Mountain Bikers – Do this',creator:'Global Mountain Bike Network',category:'MTB',vertical:true},
  {id:'HO_M1ogYxhw',title:'Blink if you want to play chess, Magnus',creator:'Chess.com',category:'Chess',vertical:true},
  {id:'2oyRqoczcFk',title:'Minecraft Live 2021: The Mob Vote',creator:'Minecraft',category:'Minecraft'},
  {id:'yuxWyIe8TIc',title:'Why does the Moon look larger at the horizon?',creator:'NASA',category:'Science & tech'},
  {id:'1dliy1NQJ9w',title:'Magnus, Hikaru and Vishy rank meme chess openings',creator:'Chess.com',category:'Chess'},
  {id:'U5fzuApkbwI',title:'How To Stay Safe On A Mountain Bike Ride',creator:'Global Mountain Bike Network',category:'MTB'},
  {id:'nQzJKiPukmk',title:'Riding Tips for Your eBike Tour',creator:'Bosch eBike Systems',category:'E-bike'},
  {id:'QO3do77Y9cY',title:'24,000 Dominoes! (SATISFYING) with MarDominoes',creator:'Hevesh5',category:'Satisfying'},
  {id:'nn2h3_aH3vo',title:"Santa Claws",creator:"Simon’s Cat",category:'Christmas'},
  {id:'L2_MUD16EIk',title:'The First Time Me Eat Cookie',creator:'Sesame Street',category:'Comedy'},
]
export function curatedBatch(pool,seen,limit=5,random=Math.random){
  const items=pool.filter(item=>!seen.has(item.id))
  for(let i=items.length-1;i>0;i--){
    const index=Math.floor(random()*(i+1))
    ;[items[index],items[i]]=[items[i],items[index]]
  }
  return items.slice(0,limit)
}
const errors={
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
    function fail(){
      clearTimeout(timeout);script.remove();delete window.onYouTubeIframeAPIReady
      reject(new Error('YouTube controls did not connect. Try the frame or open the video on YouTube.'))
    }
    const timeout=setTimeout(fail,9500)
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve(window.YT)}
    script.onerror=fail
    document.head.append(script)
  }).catch(error=>{playerAPI=null;throw error})
  return playerAPI
}
export function youtubeId(input){
  try{
    const url=new URL(input)
    if((url.protocol!=='https:' && url.protocol!=='http:') || url.username || url.password || url.port)return null
    const path=url.pathname.split('/').filter(Boolean)
    const host=url.hostname.toLowerCase()
    const approved=['youtube.com','www.youtube.com','m.youtube.com'].includes(host)
    const value=host==='youtu.be' && path.length===1?path[0]:approved && path[0]==='watch' && path.length===1?
      url.searchParams.get('v'):approved && path.length===2 && ['shorts','embed','live'].includes(path[0])?path[1]:null
    return /^[0-9A-Za-z_-]{11}$/.test(value || '')?value:null
  }catch{return null}
}
const youtubeLink=video=>'https://www.youtube.com/'+(video.vertical?'shorts/'+video.id:'watch?v='+video.id)
const timeLabel=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0')

export function mount(host,{settings,state,audioFocus,save}){
  const saved=read('youtube-saved',{}),links=read('youtube-links',{})
  let history=read('youtube-history',[])
  const sessionSeen=new Set(state.seen || [])
  let feed=state.batch || [],feedNotice=''
  let lastWheel=0,swipeY=null
  let active,player,pending=0,loadTimer,ticker,phase='idle',closed=false
  let volume=Math.round((settings.phoneVideoVolume ?? settings.phoneVolume)*100),muted=read('youtube-mute',settings.phoneMuted)
  const main=node('section','yt-presentation')
  const frame=node('div','yt-frame')
  const poster=node('div','yt-poster')
  const cue=node('span','yt-play-mark','▶');cue.setAttribute('aria-hidden','true')
  const title=node('strong'),creator=node('small')
  const load=node('button','handset-primary','Load YouTube player')
  poster.append(cue,title,creator,load)
  const direct=node('a','handset-link','Open video on YouTube');direct.target='_blank';direct.rel='noopener'
  const retry=node('button','handset-secondary','Reload player');retry.hidden=true;retry.onclick=()=>show()
  const message=node('p','handset-note');message.setAttribute('role','status')
  frame.hidden=true
  const progress=node('progress');progress.max=1;progress.value=0;progress.hidden=true
  progress.setAttribute('aria-label','YouTube playback progress')
  const position=node('span','yt-position')
  const prev=node('button','handset-secondary','Previous video'),next=node('button','handset-secondary','Next video')
  const fav=node('button','handset-secondary','Favourite')
  const pause=node('button','handset-secondary','Pause video');pause.hidden=true
  const mute=node('button','handset-secondary',muted?'Unmute':'Mute')
  const browseGrip=node('button','yt-swipe','‹   Swipe or scroll to browse   ›')
  browseGrip.type='button';browseGrip.setAttribute('aria-label','Browse videos with swipe, scroll or arrow keys')
  const loadMore=node('button','handset-secondary','Load More')
  const randomMode=node('button','handset-secondary','Random Shorts')
  const feedInfo=node('span','yt-position')
  const row=node('div','handset-row yt-actions');row.append(prev,fav,next)
  const feedActions=node('div','handset-row');feedActions.append(randomMode,loadMore,feedInfo)
  const bottom=node('div','handset-row yt-settings');bottom.append(pause,mute,retry,direct)
  const audio=node('label','handset-setting'),level=node('input')
  level.type='range';level.min=0;level.max=100;level.value=volume
  audio.append(node('span','','YouTube volume'),level)
  level.oninput=()=>{volume=Number(level.value);settings.phoneVideoVolume=volume/100;save?.();player?.setVolume?.(volume)}
  mute.onclick=()=>{
    muted=!muted;store('youtube-mute',muted)
    mute.textContent=muted?'Unmute':'Mute';mute.setAttribute('aria-pressed',String(muted))
    if(muted)player?.mute?.()
    else player?.unMute?.()
  }
  mute.setAttribute('aria-pressed',String(muted))
  main.append(frame,poster,browseGrip,progress,position,message,row,feedActions,bottom,audio)
  const search=node('input');search.type='search';search.placeholder='Find a video';search.setAttribute('aria-label','Filter YouTube videos')
  const filter=node('select')
  const categories=Object.fromEntries([...new Set(collection.map(item=>item.category))].map(cat=>[cat,cat]))
  filter.innerHTML=optionRows({all:'Curated videos',random:'Random Shorts',...categories,links:'My links',saved:'Favourites',history:'History'},state.filter || 'all')
  filter.setAttribute('aria-label','YouTube category')
  const external=node('a','handset-link','Search all YouTube');external.target='_blank';external.rel='noopener'
  const results=node('div','yt-results')
  const form=node('form','handset-inline')
  const link=node('input')
  link.type='url';link.placeholder='Paste a Shorts or video URL';link.required=true;link.setAttribute('aria-label','YouTube URL')
  const add=node('button','handset-secondary','Add link');add.type='submit';form.append(link,add)
  const library=node('div','yt-library');library.append(node('h3','','Browse'),search,filter,external,results,form)
  function resetPlayer(){
    pending++
    clearInterval(ticker);clearTimeout(loadTimer)
    audioFocus?.endVideo()
    player?.destroy?.();player=null
    frame.replaceChildren();frame.hidden=true;poster.hidden=false;pause.hidden=true;progress.hidden=true;retry.hidden=true
    position.textContent='';phase='idle';load.disabled=false
  }
  function list(){
    const group=filter.value
    const videos=group==='links'?Object.values(links):group==='saved'?Object.values(saved):group==='history'?history:
      group==='random'?feed:group==='all'?collection:collection.filter(video=>video.category===group)
    const query=search.value.trim().toLowerCase()
    return videos.filter(video=>(video.title+' '+video.creator).toLowerCase().includes(query))
  }
  function draw(){
    const videos=list()
    results.replaceChildren()
    for(const video of videos){
      const row=node('button','handset-video-item')
      row.type='button'
      row.append(node('strong','',video.title),node('small','',video.creator))
      row.onclick=()=>pick(video)
      row.setAttribute('aria-pressed',String(video.id===active?.id))
      results.append(row)
    }
    if(!videos.length)results.append(node('p','handset-note','No videos in this view.'))
    const i=videos.findIndex(video=>video.id===active?.id)
    prev.disabled=i<1;next.disabled=i<0 || i>=videos.length-1
    fav.setAttribute('aria-pressed',String(Boolean(active && saved[active.id])))
    fav.disabled=!active
    loadMore.hidden=filter.value!=='random'
    randomMode.setAttribute('aria-pressed',String(filter.value==='random'))
    feedInfo.textContent=filter.value==='random'?(feedNotice || (i>=0?(i+1)+' / '+videos.length:'')):''

    external.href='https://www.youtube.com/results?search_query='+encodeURIComponent((search.value.trim() || 'animal comedy')+' shorts')
  }
  function pick(video){
    if(!video)return
    resetPlayer()
    active=video
    title.textContent=video.title;creator.textContent=video.creator
    direct.href=youtubeLink(video)
    message.textContent=''
    draw()
  }
  function readPlayback(){
    const total=player?.getDuration?.() || 0,elapsed=player?.getCurrentTime?.() || 0
    if(!total)return
    progress.hidden=false;progress.max=total;progress.value=elapsed
    position.textContent=timeLabel(elapsed)+' / '+timeLabel(total)
  }
  async function show(){
    if(!active || phase==='loading')return
    resetPlayer()
    const token=pending,video=active
    phase='loading';load.disabled=true;audioFocus?.startVideo()
    message.textContent='Connecting to YouTube…'
    const iframe=document.createElement('iframe')
    iframe.id='yt-embed-player'
    iframe.title='YouTube video player'
    iframe.width='200';iframe.height='332'
    iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true
    iframe.referrerPolicy='strict-origin-when-cross-origin'
    iframe.src='https://www.youtube-nocookie.com/embed/'+video.id+'?'+new URLSearchParams({enablejsapi:'1',origin:location.origin,playsinline:'1',autoplay:'0',rel:'0'})
    frame.replaceChildren(iframe);frame.hidden=false;poster.hidden=true
    try{
      const api=await loadPlayer()
      if(closed || token!==pending)return
      player=new api.Player(iframe,{events:{
        onReady(event){
          if(token!==pending || phase==='error')return
          phase='ready'
          event.target.setVolume(volume)
          if(muted)event.target.mute()
          else event.target.unMute?.()
          message.textContent='Use the player’s Play button to start.'
          pause.hidden=false;pause.textContent='Play video'
          readPlayback()
        },
        onStateChange(event){
          if(token!==pending)return
          if(event.data===1){
            phase='playing';audioFocus?.startVideo();message.textContent='';pause.textContent='Pause video'
            history=[video,...history.filter(item=>item.id!==video.id)].slice(0,30)
            store('youtube-history',history)
            clearInterval(ticker);ticker=setInterval(readPlayback,500);readPlayback()
          }else if(event.data===3){
            phase='buffering';message.textContent='Buffering…'
          }else if(event.data===2 || event.data===0){
            clearInterval(ticker);readPlayback();phase='paused';pause.textContent='Resume video';message.textContent=''
          }
        },
        onError(event){
          if(token!==pending)return
          phase='error';audioFocus?.endVideo();pause.hidden=true;retry.hidden=false;message.textContent=errors[event.data] || 'This video cannot play in the embedded player.'
        },
      }})
      loadTimer=setTimeout(()=>{
        if(token===pending && phase==='loading'){phase='plain';retry.hidden=false;message.textContent='The player did not respond. Try the frame or open the video on YouTube.'}
      },11000)
    }catch{
      if(closed || token!==pending)return
      phase='plain';retry.hidden=false
      message.textContent='YouTube could not connect to playback controls. Try the frame or open the video on YouTube.'
    }
  }
  function step(direction){
    const videos=list(),index=videos.findIndex(video=>video.id===active?.id)
    const nextVideo=videos[index+direction]
    if(nextVideo){feedNotice='';pick(nextVideo)}
    else if(filter.value==='random' && direction>0){feedNotice='End of batch';draw()}
  }
  load.onclick=show;prev.onclick=()=>step(-1);next.onclick=()=>step(1)
  pause.onclick=()=>phase==='playing' || phase==='buffering'?player?.pauseVideo?.():player?.playVideo?.()
  function newBatch(){
    const pool=collection.filter(video=>video.vertical)
    const nextFeed=curatedBatch(pool,sessionSeen,3)
    if(!nextFeed.length){
      feedNotice='You reached the end of the curated Shorts.';draw();return
    }
    for(const video of nextFeed)sessionSeen.add(video.id)
    state.seen=[...sessionSeen];feed=state.batch=nextFeed
    feedNotice=''
    filter.value=state.filter='random'
    search.value=''
    pick(feed[0])
  }
  randomMode.onclick=()=>{
    filter.value=state.filter='random';search.value=''
    if(feed.length)pick(feed[0])
    else newBatch()
  }
  loadMore.onclick=newBatch
  filter.onchange=()=>{
    state.filter=filter.value
    if(filter.value==='random' && !feed.length){newBatch();return}
    const video=list()[0]
    if(video)pick(video)
    else draw()
  }
  function wheel(event){
    if(Math.abs(event.deltaY)<30 || Math.abs(event.deltaX)>Math.abs(event.deltaY))return
    if(performance.now()-lastWheel<280){event.preventDefault();return}
    event.preventDefault()
    lastWheel=performance.now();step(Math.sign(event.deltaY))
  }
  for(const surface of [poster,browseGrip]){
    surface.addEventListener('wheel',wheel,{passive:false})
    surface.addEventListener('touchstart',event=>{swipeY=event.changedTouches[0].clientY},{passive:true})
    surface.addEventListener('touchend',event=>{
      const delta=swipeY===null?0:swipeY-event.changedTouches[0].clientY
      swipeY=null
      if(Math.abs(delta)>22){if(event.cancelable)event.preventDefault();step(Math.sign(delta))}
    },{passive:false})
  }
  browseGrip.onclick=()=>step(1)
  browseGrip.onkeydown=event=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
      event.preventDefault();step(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)
    }
  }
  search.oninput=draw
  fav.onclick=()=>{
    if(saved[active.id])delete saved[active.id]
    else saved[active.id]=active
    store('youtube-saved',saved);draw()
  }
  form.onsubmit=event=>{
    event.preventDefault()
    const id=youtubeId(link.value.trim())
    if(!id){message.textContent='Enter a public YouTube Shorts, watch, or youtu.be link.';return}
    const video=collection.find(item=>item.id===id) || {id,title:'YouTube video · '+id,creator:'Creator shown in the player',category:'My links',vertical:link.value.includes('/shorts/')}
    links[id]=video;store('youtube-links',links);link.value=''
    filter.value='links';state.filter=filter.value;search.value='';feedNotice='';pick(video)
    main.scrollIntoView({block:'nearest'})
  }
  host.append(main,library)
  pick(list()[0] || collection[0])
  return {
    pause(){
      if(player && ['ready','paused','playing','buffering'].includes(phase)){player.pauseVideo?.();pause.textContent='Resume video'}
      else if(phase!=='idle'){resetPlayer();message.textContent='Playback stopped for your turn.';load.textContent='Resume YouTube player'}
    },
    destroy(){closed=true;resetPlayer()},
  }
}
