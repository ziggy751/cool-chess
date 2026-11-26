import {gesture,node,optionRows,store,read} from './shared.js'
import {width,height,clipDuration,makeShort,nextBatch,render,makeAudio,voiceFor,storyCount,categories} from './meme-engine.js'

export {makeShort}

export function mount(host,{settings,state,audioFocus}){
  const canvas=node('canvas','handset-canvas comedy-canvas')
  canvas.width=width;canvas.height=height;canvas.setAttribute('aria-label','Original animated comedy short')
  const ctx=canvas.getContext('2d')
  const headline=node('strong','comedy-title'),caption=node('p','handset-note'),status=node('p','handset-note')
  status.setAttribute('role','status')
  const transcript=node('p','meme-caption')
  transcript.setAttribute('aria-live','polite')
  const filter=node('select');filter.setAttribute('aria-label','Comedy library')
  filter.innerHTML=optionRows({batch:'Current batch',saved:'Bookmarks',history:'Watched clips'},'batch')
  const category=node('select');category.setAttribute('aria-label','Brainrot format')
  category.innerHTML=optionRows({all:'All formats',...categories,classic:'Side Reel Archives'},state.category || 'all')
  const button=(label,primary=false)=>node('button',primary?'handset-primary':'handset-secondary',label)
  const prev=button('Previous short'),toggle=button('Play short',true),next=button('Next short')
  const generate=button('Generate 3 shorts'),bookmark=button('Bookmark short')
  const sound=button('Sound'),voice=button('Voice'),effects=button('Reduced effects')
  const progress=node('progress');progress.max=clipDuration;progress.value=0;progress.setAttribute('aria-label','Short progress')
  const history=state.history ||= read('meme-history',[])
  let saved=read('meme-bookmarks',[]),watched=new Set(read('meme-watched',[]))
  let batch=state.batch || [],index=0,elapsed=0,previous,frame,running=false,lastCue,voiceTimer
  let audio,onSound=read('meme-sound',true),onVoice=read('meme-voice',false),quiet=read('meme-quiet',false)
  const items=()=>filter.value==='saved'?saved.map(makeShort):filter.value==='history'?
    history.filter(clip=>watched.has(clip.id)).slice(-35).reverse().map(clip=>makeShort(clip.seed)):batch
  const current=()=>items()[index]
  function pause(){
    running=false;cancelAnimationFrame(frame);clearTimeout(voiceTimer)
    audio?.stop()
    audioFocus?.endVideo()
    if(onVoice)window.speechSynthesis?.cancel()
    toggle.textContent=elapsed>=clipDuration?'Replay short':elapsed>0?'Resume short':'Play short'
  }
  function paint(){
    const clip=current()
    progress.value=elapsed
    toggle.disabled=bookmark.disabled=!clip
    prev.disabled=index===0;next.disabled=index+1>=items().length
    headline.textContent=clip?.title || 'No shorts in this view'
    caption.textContent=clip?clip.style.name+' · '+clip.stage.name+' · '+(index+1)+' / '+items().length:''
    bookmark.setAttribute('aria-pressed',String(Boolean(clip && saved.includes(clip.seed))))
    sound.setAttribute('aria-pressed',String(onSound));voice.setAttribute('aria-pressed',String(onVoice))
    effects.setAttribute('aria-pressed',String(quiet || settings.phoneReduced || settings.reduced))
    if(clip){
      const part=render(ctx,clip,elapsed,quiet || settings.phoneReduced || settings.reduced)
      transcript.textContent=part.speaks?part.speaker.name+': '+part.line:part.line
    }else{ctx.clearRect(0,0,width,height);transcript.textContent=''}
  }
  function speak(cue){
    if(!onVoice || !cue.speaks || !window.speechSynthesis || !window.SpeechSynthesisUtterance)return
    const profile=voiceFor(cue.speaker)
    const utterance=new SpeechSynthesisUtterance(cue.line)
    const seconds=cue.to-cue.from-profile.delay-.28
    const words=cue.line.split(/\s+/).length
    utterance.pitch=profile.pitch
    utterance.rate=Math.max(profile.rate,Math.min(2.1,words*.37/seconds))
    utterance.volume=(settings.phoneVideoVolume ?? settings.phoneVolume)
    const voices=speechSynthesis.getVoices().filter(item=>item.lang.startsWith('en'))
    if(voices.length)utterance.voice=voices[cue.speaker.id%voices.length]
    clearTimeout(voiceTimer);speechSynthesis.cancel()
    voiceTimer=setTimeout(()=>{if(running && onVoice)speechSynthesis.speak(utterance)},profile.delay*1000)
  }
  function loop(time){
    if(!running)return
    elapsed=Math.min(clipDuration,elapsed+Math.min(.06,(time-(previous ?? time))/1000))
    previous=time
    const clip=current()
    const cue=render(ctx,clip,elapsed,quiet || settings.phoneReduced || settings.reduced)
    if(cue!==lastCue){
      lastCue=cue
      transcript.textContent=cue.speaks?cue.speaker.name+': '+cue.line:cue.line
      speak(cue)
      if(onSound)audio?.cue(cue.sound,clip.bed,clip.timeline.indexOf(cue),clip.format)
    }
    progress.value=elapsed
    if(elapsed>=clipDuration){pause();audioFocus?.endVideo();status.textContent='End of short';return}
    frame=requestAnimationFrame(loop)
  }
  function start(){
    const clip=current()
    if(!clip)return
    if(elapsed>=clipDuration)elapsed=0
    audioFocus?.startVideo()
    if(onSound){audio ||= makeAudio();audio?.volume((settings.phoneVideoVolume ?? settings.phoneVolume));audio?.resume()}
    watched.add(clip.id);store('meme-watched',[...watched].slice(-250))
    running=true;previous=undefined;lastCue=null
    toggle.textContent='Pause short';status.textContent=''
    frame=requestAnimationFrame(loop)
  }
  function choose(which){
    if(which<0 || which>=items().length)return
    pause();index=which;elapsed=0;toggle.textContent='Play short';status.textContent='';paint()
  }
  function generateBatch(){
    pause()
    const seed=crypto.getRandomValues(new Uint32Array(1))[0]%1_000_000
    batch=nextBatch(history,seed,3,category.value)
    status.textContent=batch.length?batch.length+' new shorts ready':'You’ve screened this season’s stories. Replay a bookmark or start a new screening.'
    state.batch=batch
    store('meme-history',history)
    filter.value='batch';index=0;elapsed=0;toggle.textContent='Play short';paint()
  }
  const reset=button('New screening')
  reset.onclick=()=>{history.length=0;generateBatch()}
  generate.onclick=generateBatch
  category.onchange=()=>{state.category=category.value;generateBatch()}
  toggle.onclick=()=>running?pause():start()
  prev.onclick=()=>choose(index-1);next.onclick=()=>choose(index+1)
  filter.onchange=()=>{pause();index=0;elapsed=0;toggle.textContent='Play short';paint()}
  bookmark.onclick=()=>{
    const clip=current()
    if(!clip)return
    saved=saved.includes(clip.seed)?saved.filter(seed=>seed!==clip.seed):[clip.seed,...saved].slice(0,storyCount)
    store('meme-bookmarks',saved)
    if(filter.value==='saved'){pause();index=Math.min(index,Math.max(0,saved.length-1));elapsed=0;toggle.textContent='Play short'}
    paint()
  }
  sound.onclick=()=>{onSound=!onSound;store('meme-sound',onSound);if(!onSound)audio?.stop();paint()}
  voice.onclick=()=>{onVoice=!onVoice;store('meme-voice',onVoice);if(!onVoice){clearTimeout(voiceTimer);window.speechSynthesis?.cancel()}paint()}
  effects.onclick=()=>{quiet=!quiet;store('meme-quiet',quiet);paint()}
  canvas.addEventListener('wheel',event=>{
    if(Math.abs(event.deltaY)>35){event.preventDefault();choose(index+Math.sign(event.deltaY))}
  },{passive:false})
  gesture(canvas,direction=>choose(index+(['up','left'].includes(direction)?1:-1)))
  const toolbar=node('div','handset-row'),controls=node('div','handset-row'),options=node('details','meme-options')
  toolbar.append(filter,bookmark);controls.append(prev,toggle,next)
  options.append(node('summary','','Playback and screening'),sound,voice,effects,reset)
  host.append(toolbar,category,headline,caption,canvas,transcript,progress,controls,generate,status,options)
  if(!batch.length && new Set(history.map(clip=>clip.story)).size<storyCount)generateBatch()
  else paint()
  return {pause,destroy(){pause();audio?.close();audioFocus?.endVideo()}}
}
