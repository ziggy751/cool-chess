import {icon} from '../icons.js'
import {node,optionRows,read,store} from './shared.js'
import originals from './record-catalog.json'

const holiday={id:'winter',title:'Winter Bells',genre:'Christmas',artist:'Side Reel Studio',source:'/side-reel/noel.mp3',color:'#613d4c'}
export const records=[...originals,holiday]
const timeLabel=seconds=>Number.isFinite(seconds)?Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0'):'0:00'
function button(label,symbol,style='record-control'){
  const result=node('button',style,symbol?'':label)
  result.setAttribute('aria-label',label);result.title=label
  if(symbol)result.innerHTML=icon(symbol)
  return result
}
function makePlayer(settings,state){
  const audio=new Audio()
  audio.preload='none'
  audio.volume=read('music-volume',settings.phoneVolume)
  state.audio=audio
  state.shuffle=read('music-shuffle',false)
  state.repeat=read('music-repeat',false)
  state.favourites=new Set(read('record-favourites',[]))
  state.queue=read('record-playlist',[])
  state.recent=read('record-recent',[])
  state.all=()=>[...records,...state.imports]
  state.filter=read('record-view','all')
  state.visible=()=>{
    const all=state.all().filter(track=>!track.imported || !state.blocked?.())
    switch(state.filter){
      case 'all':return all
      case 'favourite':return all.filter(track=>state.favourites.has(track.id))
      case 'playlist':
      case 'recent':return (state.filter==='playlist'?state.queue:state.recent)
        .map(id=>all.find(track=>track.id===id)).filter(Boolean)
      case 'imports':return all.filter(track=>track.imported)
      default:return all.filter(track=>track.genre===state.filter)
    }
  }
  state.track=state.all().find(item=>item.id===read('record-track',null)) || records[0]
  state.notify=()=>state.update?.()
  state.select=(track)=>{
    if(track===state.track && audio.getAttribute('src'))return
    audio.pause()
    state.track=track
    audio.src=track.source
    if(!track.imported)store('record-track',track.id)
    state.notify()
  }
  state.play=async()=>{
    if(state.track.imported && state.blocked?.()){state.error='Local audio is available after the match.';state.notify();return}
    if(!audio.getAttribute('src'))state.select(state.track)
    try{await audio.play();state.error=''}
    catch{state.error='This audio could not play.';state.notify()}
  }
  state.toggle=()=>audio.paused?state.play():audio.pause()
  state.step=(direction,auto=false)=>{
    const playlist=state.visible()
    if(!playlist.length)return
    if(auto && state.repeat){audio.currentTime=0;state.play();return}
    const index=playlist.indexOf(state.track)
    const others=playlist.filter(track=>track!==state.track)
    const selected=(state.shuffle && others.length)?others[Math.floor(Math.random()*others.length)]
      :playlist[(index+direction+playlist.length)%playlist.length]
    if(auto && !state.shuffle && index===playlist.length-1)return
    const playing=auto || !audio.paused
    state.select(selected)
    if(playing)state.play()
  }
  audio.addEventListener('ended',()=>state.step(1,true))
  audio.addEventListener('play',()=>{
    state.recent=[state.track.id,...state.recent.filter(id=>id!==state.track.id)].slice(0,20)
    store('record-recent',state.recent.filter(id=>!id.startsWith('local-')))
    state.notify()
  })
  for(const event of ['pause','timeupdate','durationchange','waiting','playing','seeked'])audio.addEventListener(event,state.notify)
  return audio
}

export function mount(host,{settings,state,blocked}){
  state.blocked=blocked
  const audio=state.audio || makePlayer(settings,state)
  const genres=Object.fromEntries(records.map(track=>[track.genre,track.genre]))
  const tabs=node('div','record-tabs')
  const libraryTab=button('Library',null),playerTab=button('Now playing',null)
  tabs.append(libraryTab,playerTab)
  const hero=node('div','record-hero')
  const art=node('div','music-art')
  const image=node('img','record-cover');image.alt=''
  art.append(image,node('span','record-default','♫'))
  const name=node('strong','music-title'),meta=node('p','record-credit')
  const status=node('p','handset-note');status.setAttribute('role','status')
  hero.append(art,name,meta,status)
  const seek=node('input','record-seek')
  seek.type='range';seek.min=0;seek.step=.05;seek.value=0;seek.setAttribute('aria-label','Seek track')
  seek.oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(seek.value)}
  const clock=node('div','record-clock')
  const position=node('span'),duration=node('span');clock.append(position,duration)
  const transport=node('div','record-transport')
  const shuffle=button('Shuffle','shuffle'),previous=button('Previous','chevron-left')
  const play=button('Play track','play','record-play'),next=button('Next','chevron-right'),repeat=button('Repeat',null)
  repeat.innerHTML='↻';transport.append(shuffle,previous,play,next,repeat)
  const actions=node('div','handset-row')
  const favourite=button('Favourite',null,'handset-secondary'),add=button('Add to playlist',null,'handset-secondary')
  const visual=button('Visualizer',null,'handset-secondary')
  actions.append(favourite,add,visual)
  const meter=node('div','record-spectrum');meter.hidden=true;meter.setAttribute('aria-hidden','true')
  const bars=Array.from({length:20},(_,i)=>{
    const bar=node('span');bar.style.setProperty('--beat',String(i));meter.append(bar);return bar
  })
  const volume=node('label','handset-setting record-volume'),gain=node('input')
  gain.type='range';gain.min=0;gain.max=1;gain.step=.025;gain.value=audio.volume
  gain.oninput=()=>{audio.volume=Number(gain.value);store('music-volume',audio.volume)}
  volume.append(node('span','','Music volume'),gain)
  const library=node('section','record-library')
  const filter=node('select')
  filter.setAttribute('aria-label','Music playlist')
  filter.innerHTML=optionRows({all:'All records',favourite:'Favourites',playlist:'My playlist',recent:'Recently played',imports:'Local files',...genres},state.filter || 'all')
  const list=node('div','record-tracks')
  const importLabel=node('label','record-import','Import audio')
  const file=node('input');file.type='file';file.accept='audio/*,.mp3,.flac,.ogg,.wav,.m4a';file.multiple=true
  const clear=button('Clear local audio',null,'handset-secondary')
  importLabel.append(file);library.append(filter,list,importLabel,clear)
  const now=node('section','record-now');now.append(hero,meter,seek,clock,transport,actions,volume)
  let view=state.view || 'player',listSignature,currentCover,showMeter=false,frame,context,analyser,frequencyData
  function switchView(which){
    view=which;state.view=view
    now.hidden=view!=='player';library.hidden=view!=='library'
    playerTab.setAttribute('aria-pressed',String(!now.hidden))
    libraryTab.setAttribute('aria-pressed',String(!library.hidden))
    update()
    drawSpectrum()
  }
  function update(){
    file.disabled=blocked();clear.hidden=!state.imports.length
    const track=state.track,playing=!audio.paused
    name.textContent=track.title;meta.textContent=track.artist+' / '+track.genre
    if(track!==currentCover){
      if(track.art)image.src=track.art
      image.hidden=!track.art;art.dataset.cover=String(Boolean(track.art))
      art.style.setProperty('--record',track.color)
      currentCover=track
    }
    play.innerHTML=icon(playing?'pause':'play')
    play.setAttribute('aria-label',playing?'Pause track':'Play track')
    play.title=playing?'Pause track':'Play track'
    shuffle.setAttribute('aria-pressed',String(state.shuffle));repeat.setAttribute('aria-pressed',String(state.repeat))
    favourite.setAttribute('aria-pressed',String(state.favourites.has(track.id)))
    const inQueue=state.queue.includes(track.id)
    add.textContent=inQueue?'Remove from playlist':'Add to playlist'
    add.setAttribute('aria-label',add.textContent)
    seek.max=audio.duration || track.duration || 1;seek.disabled=!Number.isFinite(audio.duration)
    seek.value=audio.currentTime;position.textContent=timeLabel(audio.currentTime)
    duration.textContent=timeLabel(audio.duration || track.duration)
    status.textContent=state.error || ''
    const items=state.visible()
    const signature=filter.value+track.id+items.map(item=>item.id).join(',')
    if(signature!==listSignature){
      listSignature=signature
      list.replaceChildren()
      for(const item of items){
        const row=button(item.title,null,'record-track')
        const thumbnail=node('img');thumbnail.alt='';thumbnail.loading='lazy'
        if(item.art)thumbnail.src=item.art
        else thumbnail.hidden=true
        const title=node('span','record-track-title');title.append(node('strong','',item.title),node('small','',item.genre))
        row.append(thumbnail,title,node('span','record-track-time',timeLabel(item.duration)))
        row.setAttribute('aria-pressed',String(item===track))
        row.onclick=()=>{
          state.select(item);switchView('player');state.play()
        }
        list.append(row)
      }
      if(!items.length)list.append(node('p','handset-note','This library view is empty.'))
    }
  }
  function drawSpectrum(){
    cancelAnimationFrame(frame)
    if(!showMeter || audio.paused || now.hidden)return
    analyser.getByteFrequencyData(frequencyData)
    for(const [index,bar] of bars.entries()){
      const value=frequencyData[Math.min(frequencyData.length-1,Math.round(1.23**index))]
      bar.style.transform='scaleY('+Math.max(.08,value/255)+')'
    }
    frame=requestAnimationFrame(drawSpectrum)
  }
  visual.onclick=()=>{
    if(settings.reduced || settings.phoneReduced){status.textContent='Turn off Reduce motion to use the visualizer.';return}
    const Context=window.AudioContext || window.webkitAudioContext
    if(!Context)return
    if(!state.audioContext){
      context=new Context()
      analyser=context.createAnalyser();analyser.fftSize=256
      context.createMediaElementSource(audio).connect(analyser).connect(context.destination)
      state.audioContext={context,analyser}
    }else ({context,analyser}=state.audioContext)
    context.resume().catch(()=>{})
    frequencyData=new Uint8Array(analyser.frequencyBinCount)
    showMeter=!showMeter;meter.hidden=!showMeter
    visual.setAttribute('aria-pressed',String(showMeter))
    drawSpectrum()
  }
  play.onclick=state.toggle;previous.onclick=()=>state.step(-1);next.onclick=()=>state.step(1)
  shuffle.onclick=()=>{state.shuffle=!state.shuffle;store('music-shuffle',state.shuffle);update()}
  repeat.onclick=()=>{state.repeat=!state.repeat;store('music-repeat',state.repeat);update()}
  const persistIds=(key,values)=>store(key,[...values].filter(id=>!id.startsWith('local-')))
  favourite.onclick=()=>{
    const id=state.track.id
    if(state.favourites.has(id))state.favourites.delete(id)
    else state.favourites.add(id)
    persistIds('record-favourites',state.favourites);update()
  }
  add.onclick=()=>{
    const id=state.track.id
    state.queue=state.queue.includes(id)?state.queue.filter(item=>item!==id):[...state.queue,id]
    persistIds('record-playlist',state.queue);update()
  }
  filter.onchange=()=>{state.filter=filter.value;store('record-view',state.filter);update()}
  file.onchange=()=>{
    if(blocked())return
    for(const item of [...file.files].slice(0,20)){
      if(!item.type.startsWith('audio/') && !/\.(mp3|flac|ogg|wav|m4a)$/i.test(item.name))continue
      state.imports.push({id:'local-'+crypto.randomUUID(),title:item.name.replace(/\.[^.]+$/,''),genre:'Local files',
        artist:'Local audio file',source:URL.createObjectURL(item),color:'#384466',imported:true})
    }
    file.value='';filter.value='imports';state.filter='imports';update()
  }
  clear.onclick=()=>{
    if(state.track.imported)state.select(records[0])
    for(const track of state.imports)URL.revokeObjectURL(track.source)
    state.imports.length=0
    state.filter='all';filter.value='all';store('record-view','all');update()
  }
  libraryTab.onclick=()=>switchView('library');playerTab.onclick=()=>switchView('player')
  audio.addEventListener('play',drawSpectrum)
  host.append(tabs,now,library)
  state.update=update
  switchView(view)
  return {update,pause(){audio.pause()},destroy(){
    state.update=null
    audio.removeEventListener('play',drawSpectrum)
    cancelAnimationFrame(frame)
  }}
}
