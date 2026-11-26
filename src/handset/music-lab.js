import {node,read,store,optionRows} from './shared.js'
import {describe,genres,concepts,demo} from './song-composer.js'

const colours=['#ce784e','#a680ec','#63dbb5','#d7a84d','#d8699f','#6d9edf']
const timestamp=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0')
function cover(ctx,track){
  const hue=colours[track.concept%colours.length],w=240,h=170
  ctx.fillStyle='#181925';ctx.fillRect(0,0,w,h)
  ctx.strokeStyle=hue;ctx.lineWidth=1
  for(let i=0;i<9;i++){
    ctx.beginPath()
    ctx.ellipse(120,83,26+i*9,18+i*6,(i+track.concept)*.19,0,Math.PI*2)
    ctx.stroke()
  }
  ctx.fillStyle=hue;ctx.fillRect(7,7,28,5);ctx.fillRect(w-37,h-12,30,5)
  ctx.fillStyle='#161925';ctx.fillRect(25,59,190,49)
  ctx.fillStyle='#f1e7d8';ctx.textAlign='center'
  ctx.font='800 18px system-ui'
  ctx.fillText(track.voice,120,80,165)
  ctx.fillStyle=hue;ctx.font='700 9px monospace'
  ctx.fillText(track.bpm+' BPM  /  '+track.style.toUpperCase(),120,98,165)
}
export function mount(host,{settings,state,audioFocus}){
  const library=read('lab-library',[demo]),favs=new Set(read('lab-favourites',[])),recent=read('lab-recent',[])
  let active=library.find(item=>describe(item).id===state.active) || library[0] || demo
  let info=describe(active),worker,url,revision=0,context,analyser,frame,disposed=false
  const audio=new Audio();audio.preload='none';audio.volume=settings.phoneLabVolume ?? .59
  const header=node('div','lab-header');header.append(node('span','','SIDE REEL'),node('h2','','Music Lab'))
  const artwork=node('canvas','lab-art');artwork.width=240;artwork.height=170;artwork.setAttribute('aria-label','Generated record cover')
  const art=artwork.getContext('2d')
  const name=node('strong','screening-title')
  const artist=node('p','handset-note')
  const lyric=node('p','lab-lyrics')
  const elapsed=node('span','handset-note')
  const seek=node('input');seek.type='range';seek.min=0;seek.step=.1;seek.disabled=true;seek.setAttribute('aria-label','Seek generated song')
  const play=node('button','handset-primary','Play song'),favourite=node('button','handset-secondary','Favourite song')
  const save=node('button','handset-secondary','Save song'),remove=node('button','handset-secondary','Remove saved song')
  const visualization=node('canvas','lab-wave');visualization.width=240;visualization.height=23;visualization.hidden=true
  const visualize=node('button','handset-secondary','Visualizer')
  const player=node('div','handset-row');player.append(play,save,remove,favourite,visualize)
  const filters=node('div','handset-row')
  const genre=node('select');genre.setAttribute('aria-label','Song genre')
  genre.innerHTML=optionRows(Object.fromEntries(Object.entries(genres).map(([id,[label]])=>[id,label])),active.genre)
  const concept=node('select');concept.setAttribute('aria-label','Song concept')
  concept.innerHTML=optionRows(Object.fromEntries(concepts.map((item,i)=>[i,item.title])),String(active.concept))
  const generate=node('button','handset-primary','Generate Song'),random=node('button','handset-secondary','Random concept')
  const status=node('p','handset-note');status.setAttribute('role','status')
  const progress=node('progress');progress.max=1;progress.value=0;progress.hidden=true;progress.setAttribute('aria-label','Song generation progress')
  filters.append(generate,random)
  const filter=node('select');filter.setAttribute('aria-label','Song library')
  filter.innerHTML=optionRows({saved:'Saved songs',favourites:'Favourites',recent:'Recently played'},'saved')
  const list=node('div','lab-library')
  const cached=state.cached ||= new Map()
  function mark(){
    const time=audio.currentTime
    seek.value=time
    elapsed.textContent=timestamp(time)+' / '+timestamp(info.duration)
    const line=info.lyrics.findLast(cue=>cue.at<=time)
    lyric.textContent=line?.text || '♪  '+info.summary
  }
  function paint(){
    state.active=info.id
    name.textContent=info.title;artist.textContent=info.voice+' · '+info.style+' · Synthesized vocals'
    cover(art,info);seek.max=info.duration
    const existing=library.some(item=>describe(item).id===info.id)
    save.disabled=existing;remove.hidden=!existing || info.id===describe(demo).id
    favourite.setAttribute('aria-pressed',String(favs.has(info.id)))
    mark();drawLibrary()
  }
  function drawLibrary(){
    list.replaceChildren()
    const items=filter.value==='recent'?recent:filter.value==='favourites'?library.filter(item=>favs.has(describe(item).id)):library
    for(const entry of items){
      const data=describe(entry)
      const row=node('button','handset-video-item');row.append(node('strong','',data.title),node('small','',data.style))
      row.setAttribute('aria-pressed',String(data.id===info.id))
      row.onclick=()=>select(entry);list.append(row)
    }
    if(!list.childElementCount)list.append(node('p','handset-note','No songs in this view.'))
  }
  function unload(){
    worker?.terminate();worker=null
    audio.pause();audio.removeAttribute('src');audio.load()
    if(url){URL.revokeObjectURL(url);url=null}
    play.textContent='Play song'
    seek.disabled=true;progress.hidden=true;generate.disabled=false;play.disabled=false
  }
  function select(descriptor){
    revision++
    unload()
    active=descriptor;info=describe(active);paint()
    status.textContent=''
  }
  function attach(wave){
    url=URL.createObjectURL(new Blob([wave],{type:'audio/wav'}))
    audio.src=url;audio.load()
    status.textContent='Ready to play'
    play.disabled=false
  }
  function build(){
    if(worker || url)return
    const token=revision
    if(cached.has(info.id)){attach(cached.get(info.id));return}
    progress.hidden=false;progress.value=0;generate.disabled=true
    status.textContent='Arranging and mixing…';play.disabled=true
    worker=new Worker(new URL('./song-worker.js',import.meta.url),{type:'module'})
    const fail=()=>{
      worker?.terminate();worker=null;progress.hidden=true;generate.disabled=false;play.disabled=false
      status.textContent='Song generation failed. Try again.'
    }
    worker.onerror=fail
    worker.onmessage=({data})=>{
      if(token!==revision || disposed)return
      if(data.error){fail();return}
      if(data.progress!==undefined){progress.value=data.progress;return}
      worker.terminate();worker=null
      progress.hidden=true;generate.disabled=false
      while(cached.size>=3)cached.delete(cached.keys().next().value)
      cached.set(info.id,data.wave);attach(data.wave)
    }
    worker.postMessage(active)
  }
  generate.onclick=()=>{
    select({seed:crypto.getRandomValues(new Uint32Array(1))[0]%1_000_000,genre:genre.value,concept:Number(concept.value)})
    build()
  }
  random.onclick=()=>{concept.selectedIndex=(concept.selectedIndex+1+Math.floor(Math.random()*(concepts.length-1)))%concepts.length}
  play.onclick=async()=>{
    if(!url){build();return}
    if(!audio.paused){audio.pause();return}
    audioFocus.startLab()
    try{await audio.play()}catch{status.textContent='Could not play this generated song.'}
  }
  function remember(){
    if(library.some(item=>describe(item).id===info.id))return
    library.push(active)
    if(library.length>40)library.splice(1,1)
    store('lab-library',library)
  }
  save.onclick=()=>{remember();status.textContent='Song saved';paint()}
  remove.onclick=()=>{
    const index=library.findIndex(item=>describe(item).id===info.id)
    if(index>0)library.splice(index,1)
    favs.delete(info.id)
    store('lab-library',library);store('lab-favourites',[...favs]);paint()
  }
  favourite.onclick=()=>{
    if(favs.has(info.id))favs.delete(info.id)
    else {remember();favs.add(info.id)}
    store('lab-favourites',[...favs]);paint()
  }
  seek.oninput=()=>{
    if(!Number.isFinite(audio.duration))return
    audio.currentTime=Number(seek.value);mark()
  }
  filter.onchange=drawLibrary
  audio.addEventListener('loadedmetadata',()=>{seek.disabled=false})
  audio.addEventListener('timeupdate',mark)
  audio.addEventListener('play',()=>{
    play.textContent='Pause song'
    const index=recent.findIndex(item=>describe(item).id===info.id)
    if(index>=0)recent.splice(index,1)
    recent.unshift(active);recent.splice(16)
    store('lab-recent',recent);drawLibrary();drawSpectrum()
  })
  audio.addEventListener('pause',()=>{play.textContent='Play song';cancelAnimationFrame(frame)})
  function drawSpectrum(){
    cancelAnimationFrame(frame)
    if(!analyser || visualization.hidden || audio.paused)return
    const values=new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(values)
    const ctx=visualization.getContext('2d')
    ctx.clearRect(0,0,240,23);ctx.fillStyle=colours[info.concept%colours.length]
    for(let i=0;i<24;i++){
      const height=Math.max(2,values[i]/255*22)
      ctx.fillRect(i*10,23-height,7,height)
    }
    frame=requestAnimationFrame(drawSpectrum)
  }
  visualize.onclick=()=>{
    visualization.hidden=!visualization.hidden
    if(!visualization.hidden && !context){
      context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=128
      context.createMediaElementSource(audio).connect(analyser).connect(context.destination)
    }
    if(context)context.resume().catch(()=>{})
    visualize.setAttribute('aria-pressed',String(!visualization.hidden))
    drawSpectrum()
  }
  host.append(header,artwork,name,artist,seek,elapsed,lyric,visualization,player,genre,concept,filters,progress,status,filter,list)
  paint()
  return {pause(){audio.pause()},destroy(){disposed=true;unload();cancelAnimationFrame(frame);context?.close().catch(()=>{})}}
}
