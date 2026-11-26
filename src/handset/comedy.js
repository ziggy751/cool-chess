import {gesture,node,optionRows,store,read} from './shared.js'

const scenes=[
  {character:'kangaroo',name:'Milo',title:'Checkout incident',place:'SUPERMARKET',prop:'self-checkout',colors:['#41584b','#bfa885','#edb881'],
    beats:['I selected exactly one banana.','Unexpected item in the bagging area.','That’s my tail. It pays separately.','Would you like a receipt for your tail?']},
  {character:'cat',name:'Fennel',title:'The grandmaster',place:'CHESS CLUB',prop:'trophy',colors:['#293f56','#a98973','#e5b482'],
    beats:['I came to defend my title.','You moved the pieces with your paw.','I was developing the knight.','It’s under the sofa. It has developed very well.']},
  {character:'penguin',name:'Nib',title:'Forklift training',place:'WAREHOUSE',prop:'forklift',colors:['#435c77','#9fb4c5','#f7c982'],
    beats:['I’ve passed the written forklift test.','You signed it with a fish.','That’s my emergency contact.','Please move the pallet. The fish can supervise.']},
  {character:'dog',name:'Fern',title:'Weather desk',place:'NEWS STUDIO',prop:'weather map',colors:['#3c546b','#97b8bc','#f3c679'],
    beats:['The forecast is sixty percent tennis balls.','That is a picture of the moon.','A tennis ball with excellent altitude.','Now, over to sport. The dog will be staying here.']},
  {character:'robot',name:'Unit 7',title:'Language update',place:'REPAIR STUDIO',prop:'dictionary',colors:['#445570','#acb9d0','#a1e3d1'],
    beats:['I understand Australian slang now.','What does “arvo” mean?','A small submarine that travels after lunch.','That explains your appointment at three.']},
  {character:'elf',name:'Pip',title:'Dispatch delay',place:'WINTER WORKSHOP',prop:'present',colors:['#58465e','#b67f84','#f2d1a4'],
    beats:['Every item in the workshop is wrapped.','Including the door?','The door looked lonely.','Our delivery truck is also a present.']},
  {character:'potato',name:'Spud',title:'A serious interview',place:'TV STUDIO',prop:'microphone',colors:['#5b4b67','#c1a28a','#f2bc81'],
    beats:['Tonight, an exclusive interview with a potato.','That would be me. I brought figures.','What figures?','Four chips. They’re your production budget.']},
  {character:'robot',name:'Dot',title:'New racing strategy',place:'ARCADE GARAGE',prop:'steering wheel',colors:['#3f4e70','#83a4c2','#d9b2ec'],
    beats:['I found a shortcut through the race track.','You have to follow the road.','The road is downloading.','It’s probably waiting for you to park.']},
]
const locations=['On the morning show','Late edition','A listener called in','On a quiet Tuesday','The studio rehearsal','After the lunch break']
const endings=['Cut to the studio clock. It has resigned.','The camera operator is trying not to laugh.','The floor manager calls for an unusually long break.',
  'The theme music starts two seconds early.','Somewhere off camera, a clipboard falls over.','The producer asks to keep that take.']
const hash=text=>{
  let value=2166136261
  for(const char of text)value=Math.imul(value^char.charCodeAt(0),16777619)
  return (value>>>0).toString(16).padStart(8,'0')
}
export function makeShort(index){
  const base=scenes[index%scenes.length]
  const context=locations[Math.floor(index/scenes.length)%locations.length]
  const ending=endings[Math.floor(index/(scenes.length*locations.length))%endings.length]
  const beats=[context+'.',...base.beats,ending]
  const id=hash(base.name+'|'+beats.join('|'))
  return {...base,beats,id,seed:index}
}

const width=240,height=312
const ellipse=(ctx,x,y,rx,ry,color)=>{
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()
}
function face(ctx,kind,body,voice,t,alternate){
  const ear=kind==='cat'?33:kind==='kangaroo'?22:kind==='dog'?40:12
  const coat=kind==='robot'?'#b9d6d5':kind==='penguin'?'#283d4c':kind==='elf'?'#e7a993':body
  for(const side of [-1,1]){
    ctx.save();ctx.translate(side*33,-37);ctx.rotate(side*.28)
    if(kind==='cat' || kind==='elf'){
      ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(-16,12);ctx.lineTo(-12,-ear);ctx.lineTo(18,7);ctx.fill()
    }else if(['kangaroo','dog'].includes(kind))ellipse(ctx,0,-11,10,ear,body)
    ctx.restore()
  }
  ellipse(ctx,0,25,37,57,kind==='elf'?'#5d966e':kind==='robot'?'#6d8e93':coat)
  if(kind==='robot'){
    ctx.fillStyle=coat;ctx.beginPath();ctx.roundRect(-38,-47,76,72,16);ctx.fill()
    ctx.strokeStyle='#e7e5bc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-49);ctx.lineTo(6,-69);ctx.stroke()
    ellipse(ctx,6,-71,4,4,'#f2c58a')
  }else ellipse(ctx,0,-16,44,41,coat)
  if(kind==='penguin'){
    ellipse(ctx,-15,-13,24,31,'#e8ebdd')
    ellipse(ctx,15,-13,24,31,'#e8ebdd')
  }
  if(kind==='elf'){
    ctx.fillStyle='#a13e67';ctx.beginPath();ctx.moveTo(-45,-40);ctx.lineTo(-18,-81);ctx.lineTo(44,-41);ctx.fill()
    ellipse(ctx,-19,-78,7,6,'#efe0c9')
  }
  const blink=Math.cos(t*2.3+alternate*3)>.985?.45:4.4
  for(const eye of [-1,1]){
    ellipse(ctx,eye*15,-20,5.1,blink,'#203840')
    ellipse(ctx,eye*15-1,-21,1.1,1.2,'#e6f2dd')
  }
  if(kind==='penguin')ellipse(ctx,0,-2,12,5,'#e4a166')
  else if(['cat','kangaroo','dog'].includes(kind))ellipse(ctx,0,-7,6,3.6,'#825d69')
  if(voice){
    ellipse(ctx,0,7,9,1.4+5*Math.abs(Math.sin(t*18)),kind==='robot'?'#375151':'#623e46')
    ellipse(ctx,0,9,5,2,'#e89194')
  }else{
    ctx.beginPath();ctx.arc(0,3,8,.3,Math.PI-.3);ctx.strokeStyle='#593d4c';ctx.lineWidth=1.4;ctx.stroke()
  }
}

function wrap(ctx,caption,x,y,maxWidth,color){
  ctx.fillStyle=color;ctx.textAlign='center';ctx.font='600 13px system-ui'
  const rows=['']
  for(const word of caption.split(' ')){
    const index=rows.length-1
    const line=(rows[index]+' '+word).trim()
    if(ctx.measureText(line).width>maxWidth)rows.push(word)
    else rows[index]=line
  }
  rows.forEach((row,i)=>ctx.fillText(row,x,y+i*17))
}

function draw(ctx,clip,elapsed,reduced){
  const stage=Math.min(clip.beats.length-1,Math.floor(elapsed/2.7))
  const t=reduced?0:elapsed
  const speaking=stage>0 && stage<5
  const main=stage%2===1 || stage===0 || stage===5
  const [base,mid,accent]=clip.colors
  const grad=ctx.createLinearGradient(0,0,width,height)
  grad.addColorStop(0,base);grad.addColorStop(1,'#171e32')
  ctx.fillStyle=grad;ctx.fillRect(0,0,width,height)
  ctx.globalAlpha=.54
  for(let i=0;i<25;i++){
    const x=(i*43.9+Math.sin(t*.81+i)*5)%width
    const y=23+(i*61.74)%186
    ellipse(ctx,x,y,i%3+1,i%3+1,i%2?accent:mid)
  }
  ctx.globalAlpha=1
  ctx.fillStyle=mid;ctx.beginPath();ctx.roundRect(17,56,206,145,12);ctx.fill()
  ctx.fillStyle=base;ctx.beginPath();ctx.roundRect(23,62,194,133,9);ctx.fill()
  if(clip.place==='WINTER WORKSHOP'){
    const tree=(x,y)=>{
      ctx.fillStyle='#5c8f76'
      for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x,y+i*12);ctx.lineTo(x-12-i*4,y+21+i*10);ctx.lineTo(x+12+i*4,y+21+i*10);ctx.fill()}
    }
    tree(55,97);tree(184,93)
  }else{
    ctx.globalAlpha=.22
    for(let i=0;i<5;i++){
      ctx.fillStyle=accent
      ctx.fillRect(26+i*39,117+Math.sin(i+t*.7)*15,17,65)
      ctx.fillRect(26+i*39,106+Math.sin(i+t*.7)*12,17,3)
    }
    ctx.globalAlpha=1
  }
  ctx.fillStyle='#eddcbf';ctx.font='700 8px system-ui';ctx.textAlign='left';ctx.fillText(clip.place,19,43)
  ctx.save();ctx.translate(main?125:108,157+Math.sin(t*3.4)*4)
  const lens=1+(stage%3)*.06
  ctx.scale(lens,lens)
  ctx.rotate(Math.sin(t*1.61)*.022)
  face(ctx,main?clip.character:'robot',accent,speaking,t,stage)
  ctx.restore()
  ctx.fillStyle='#50646b';ctx.fillRect(0,209,width,21)
  const props={trophy:'★','weather map':'☂',dictionary:'≡',present:'✧',microphone:'●','self-checkout':'▥',
    forklift:'▣','steering wheel':'◉'}
  ctx.fillStyle=accent;ctx.font='22px system-ui';ctx.fillText(props[clip.prop],34,212)
  ctx.fillStyle='#d8b987';ctx.font='700 7px system-ui';ctx.fillText(clip.prop.toUpperCase(),54,208)
  ctx.fillStyle='#111925';ctx.fillRect(0,231,width,81)
  wrap(ctx,clip.beats[stage],width/2,254,210,'#f2e8d9')
}

export function mount(host,{settings,state}){
  const canvas=node('canvas','handset-canvas comedy-canvas')
  canvas.width=width;canvas.height=height
  canvas.setAttribute('aria-label','Original animated comedy short')
  const ctx=canvas.getContext('2d')
  const headline=node('strong','comedy-title')
  const caption=node('p','handset-note')
  const status=node('p','handset-note')
  const controls=node('div','handset-row')
  const toggle=node('button','handset-primary','Play short')
  const next=node('button','handset-secondary','Next short'),prev=node('button','handset-secondary','Previous short')
  const generate=node('button','handset-secondary','Generate 3 shorts')
  const save=node('button','handset-secondary','Bookmark short')
  const filter=node('select')
  filter.setAttribute('aria-label','Comedy library')
  filter.innerHTML=optionRows({batch:'Current batch',saved:'Bookmarks'},'batch')
  const voice=node('button','handset-secondary',read('comedy-voice',false)?'Voice on':'Voice off')
  let talk=read('comedy-voice',false),saved=read('comedy-bookmarks',[]),issued=state.issued || [],index=0
  let batch=state.batch || [],elapsed=0,previous,frame=0,running=false,spoken=-1,seen=new Set(state.seen || [])
  const progress=node('progress');progress.max=16.2;progress.value=0
  progress.setAttribute('aria-label','Short progress')
  const pool=scenes.length*locations.length*endings.length
  const items=()=>filter.value==='saved'?saved:batch
  const current=()=>items()[index]
  function pause(){
    running=false;cancelAnimationFrame(frame)
    window.speechSynthesis?.cancel()
    toggle.textContent=elapsed>0?'Resume short':'Play short'
  }
  function paint(){
    const clip=current()
    headline.textContent=clip?.title || 'No bookmarked shorts'
    caption.textContent=clip?'Episode '+clip.id.toUpperCase()+' · '+clip.name+' · '+(index+1)+' / '+items().length:''
    toggle.disabled=save.disabled=!clip
    prev.disabled=index===0
    next.disabled=index+1>=items().length
    save.setAttribute('aria-pressed',String(Boolean(clip && saved.some(item=>item.id===clip.id))))
    progress.value=elapsed
    if(!clip){ctx.clearRect(0,0,width,height);return}
    draw(ctx,clip,elapsed,settings.phoneReduced || settings.reduced)
  }
  function speak(clip,step){
    if(!talk || !window.speechSynthesis || !window.SpeechSynthesisUtterance)return
    const utterance=new SpeechSynthesisUtterance(clip.beats[step])
    const voices=speechSynthesis.getVoices().filter(item=>item.lang.startsWith('en'))
    const choice=voices.find(item=>item.lang==='en-AU') || voices[step%Math.max(1,voices.length)]
    if(choice)utterance.voice=choice
    utterance.rate=1.13-(clip.seed%3)*.062
    utterance.pitch=step%2?1.07+(clip.seed%4)*.065:.84
    utterance.volume=settings.phoneVolume
    speechSynthesis.cancel();speechSynthesis.speak(utterance)
  }
  function loop(time){
    if(!running)return
    elapsed+=Math.min(.05,(time-(previous ?? time))/1000)
    previous=time
    const clip=current()
    const step=Math.floor(elapsed/2.7)
    if(spoken!==step && step<clip.beats.length){spoken=step;speak(clip,step)}
    progress.value=elapsed
    draw(ctx,clip,elapsed,settings.phoneReduced || settings.reduced)
    if(elapsed>=16.2){pause();toggle.textContent='Replay short';status.textContent='End of short';return}
    frame=requestAnimationFrame(loop)
  }
  function start(){
    const clip=current()
    if(!clip)return
    if(elapsed>=16.2)elapsed=0
    running=true;previous=undefined;spoken=-1
    toggle.textContent='Pause short';status.textContent=''
    frame=requestAnimationFrame(loop)
  }
  function choose(which){
    if(which<0 || which>=items().length)return
    pause();index=which;elapsed=0;spoken=-1;status.textContent='';paint()
  }
  function makeBatch(){
    pause()
    batch=[]
    while(batch.length<3 && issued.length<pool){
      const available=Array.from({length:pool},(_,i)=>i).filter(n=>!issued.includes(n))
      if(!available.length)break
      const seed=available[Math.floor(Math.random()*available.length)]
      issued.push(seed)
      const episode=makeShort(seed)
      if(seen.has(episode.id))continue
      seen.add(episode.id)
      batch.push(episode)
    }
    state.batch=batch;state.issued=issued;state.seen=[...seen]
    elapsed=0;index=0;filter.value='batch'
    status.textContent=batch.length?batch.length+' new shorts ready':'You’ve reached the end of this session’s collection.'
    paint()
  }
  toggle.onclick=()=>running?pause():start()
  generate.onclick=makeBatch
  next.onclick=()=>choose(index+1)
  prev.onclick=()=>choose(index-1)
  voice.onclick=()=>{
    talk=!talk;store('comedy-voice',talk);voice.textContent=talk?'Voice on':'Voice off'
    if(!talk)speechSynthesis?.cancel()
  }
  filter.onchange=()=>{pause();index=0;elapsed=0;paint()}
  save.onclick=()=>{
    const clip=current()
    if(!clip)return
    saved=saved.some(item=>item.id===clip.id)?saved.filter(item=>item.id!==clip.id):[clip,...saved].slice(0,18)
    store('comedy-bookmarks',saved)
    if(index>=items().length)index=Math.max(0,items().length-1)
    pause();elapsed=0;paint()
  }
  canvas.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)>35){event.preventDefault();choose(index+Math.sign(event.deltaY))}},{passive:false})
  gesture(canvas,direction=>choose(index+(['up','left'].includes(direction)?1:-1)))
  controls.append(prev,toggle,next)
  const tools=node('div','handset-row')
  tools.append(generate,save,voice)
  host.append(filter,headline,caption,canvas,progress,controls,tools,status)
  if(!batch.length)makeBatch()
  else paint()
  return {pause,destroy:pause}
}
