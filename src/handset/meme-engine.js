import {cast,stages,props,editStyles,cameras,expressions,movements,voices,sounds,beds,stories,colors} from './meme-library.js'

export const width=288
export const height=512
export const clipDuration=17
export const storyCount=stories.length
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n))
const frequency=note=>440*2**((note-69)/12)
const pick=(items,n)=>items[n%items.length]
const hash=value=>{
  let result=2166136261
  for(const symbol of value)result=Math.imul(result^symbol.charCodeAt(0),16777619)
  return (result>>>0).toString(16).padStart(8,'0')
}
const clocks=[0,2.05,5.25,8.9,12.45,16,clipDuration]
export function makeShort(seed){
  const story=pick(stories,seed)
  const version=Math.floor(seed/stories.length)
  const a=cast[pick(story.lead,version)],b=cast[pick(story.support,version*3+Math.floor(version/2))]
  const style=pick(editStyles,seed*11+version),stage=stages[story.stage]
  const reel=String(101+seed%890).padStart(3,'0')
  const lines=['A Side Reel fiction',...story.lines,'END OF RECORDING']
  const timeline=lines.map((line,index)=>({
    from:clocks[index],to:clocks[index+1],line,speaker:index%2?a:b,
    camera:pick(cameras,seed*3+index*7+[0,0,4,3,6,1][index]),
    direction:index%2?1:-1,
    expressions:[(seed+index*7)%expressions.length,(seed*2+index*13+4)%expressions.length],
    movement:pick(movements,seed*13+index*11),
    sound:pick(sounds,seed*7+index*11),
    speaks:index>0 && index<5,
  }))
  return {seed,id:hash(seed+'|'+story.title+'|'+a.name+'|'+b.name+'|'+style.effect),story:story.id,name:a.name,title:story.title,a,b,stage,style,reel,
    prop:story.prop,setDressing:pick(props,seed*7+story.id*11),timeline,punchline:story.lines[3],pair:[a.id,b.id].sort((x,y)=>x-y).join('-'),bed:pick(beds,seed*13)}
}
export function nextBatch(history,seed,count=3){
  const recent=history.slice(-9)
  const used=new Set(history.map(clip=>clip.story))
  const lastPair=new Set(recent.map(clip=>clip.pair))
  const lastEdit=new Set(recent.slice(-3).map(clip=>clip.style))
  const lastWords=recent.map(clip=>new Set(clip.punchline.toLowerCase().match(/[a-z]{4,}/g)))
  const clipHistory=(clip)=>({id:clip.id,story:clip.story,pair:clip.pair,punchline:clip.punchline,style:clip.style.effect,seed:clip.seed})
  const similar=clip=>{
    const words=new Set(clip.punchline.toLowerCase().match(/[a-z]{4,}/g))
    return lastWords.some(previous=>[...words].filter(word=>previous.has(word)).length/Math.max(words.size,previous.size)>.48)
  }
  const result=[]
  for(let offset=0;offset<stories.length*3 && result.length<count;offset++){
    const clip=makeShort(seed+offset*13)
    if(used.has(clip.story) || lastPair.has(clip.pair) || lastEdit.has(clip.style.effect) || similar(clip))continue
    result.push(clip)
    used.add(clip.story);lastPair.add(clip.pair);lastEdit.add(clip.style.effect)
  }
  history.push(...result.map(clipHistory))
  return result
}
function color(ctx,fill){ctx.fillStyle=fill}
function box(ctx,x,y,w,h,fill,r=0){
  color(ctx,fill)
  if(!r){ctx.fillRect(x,y,w,h);return}
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()
}
function oval(ctx,x,y,rx,ry,fill){
  color(ctx,fill);ctx.beginPath();ctx.ellipse(x,y,Math.abs(rx),Math.abs(ry),0,0,Math.PI*2);ctx.fill()
}
function poly(ctx,fill,...xy){
  color(ctx,fill);ctx.beginPath();ctx.moveTo(xy[0],xy[1])
  for(let i=2;i<xy.length;i+=2)ctx.lineTo(xy[i],xy[i+1])
  ctx.closePath();ctx.fill()
}
function line(ctx,x,y,a,b,stroke,weight=1){
  ctx.strokeStyle=stroke;ctx.lineWidth=weight;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.stroke()
}
function label(ctx,words,x,y,size,fill='#f5eedb',align='left',mono=false){
  ctx.font='700 '+size+'px '+(mono?'monospace':'system-ui');ctx.textAlign=align;color(ctx,fill);ctx.fillText(words,x,y)
}
function wrapped(ctx,words,x,y,weight,fill,maxWidth){
  ctx.font='800 '+weight+'px system-ui'
  const rows=['']
  for(const word of words.split(' ')){
    const index=rows.length-1
    const phrase=(rows[index]+' '+word).trim()
    if(rows[index] && ctx.measureText(phrase).width>maxWidth)rows.push(word)
    else rows[index]=phrase
  }
  rows.forEach((row,i)=>label(ctx,row,x,y+i*(weight+3),weight,fill,'center'))
}
function drawStage(ctx,stage,t){
  const {base,light,kind,id}=stage
  const sky=ctx.createLinearGradient(0,34,0,400)
  sky.addColorStop(0,base);sky.addColorStop(.8,'#0b101e');sky.addColorStop(1,'#13151b')
  box(ctx,-100,-100,width+200,height+200,sky)
  const horizon=254+id%4*9
  if(['space','sky','desert','water'].includes(kind)){
    ctx.globalAlpha=.52
    for(let i=0;i<27;i++){
      const x=(i*69.17+id*3+t*(kind==='water'?2:.25))%width,y=32+i*77.1%174
      oval(ctx,x,y,i%7===0?2:1,i%7===0?2:1,light)
    }
    ctx.globalAlpha=1
    oval(ctx,212-id%3*54,125,70,75,light+'4e');oval(ctx,215-id%3*54,122,58,63,light+'48')
    if(kind==='space')line(ctx,128,138,258,91,light+'bc',3)
    for(let i=0;i<6;i++){
      const x=i*68-39
      poly(ctx,i%2?base:'#182438',x,horizon+13,x+32,horizon-48-id%7*5,x+86,horizon+12)
    }
    if(kind==='water')for(let i=0;i<12;i++)
      oval(ctx,((i*59+t*3)%294),122+Math.sin(t+i)*54,i%4+2,i%4+2,light+'30')
  }else{
    for(let i=-1;i<6;i++){
      const x=i*63+id%4*7,y=64+(i+2)*17%31
      if(['shop','lab','studio','court'].includes(kind)){
        box(ctx,x,y,54,horizon-y,light+'31',4);box(ctx,x+3,y+3,48,horizon-y-7,base,3)
        for(let j=0;j<4;j++){
          box(ctx,x+6,y+12+j*26,42,14,i%2?'#18232d':'#111e28',2)
          box(ctx,x+10+j*2,y+15+j*26,4,5,light+(i===Math.floor(t%5)?'d0':'64'),1)
          box(ctx,x+22,y+18+j*26,18-j*2,2,light+'55')
        }
      }else if(kind==='winter'){
        poly(ctx,light+'95',x,horizon,x+22,99+(i+1)*11%27,x+44,horizon)
        oval(ctx,x+22,horizon,22,6,'#afbdcf')
      }else{
        box(ctx,x,y,49,horizon-y,'#131f2d',3)
        for(let j=0;j<5;j++)for(let k=0;k<4;k++)
          box(ctx,x+6+k*10,y+6+j*20,5,3,(j+k+i+id)%3?light+'23':light+'98',1)
      }
    }
  }
  poly(ctx,'#121825',-120,390,-60,horizon,366,horizon,430,390)
  for(let x=-6;x<9;x++)line(ctx,width/2+x*18,horizon,width/2+x*65,390,light+'3b')
  for(let i=0;i<7;i++)line(ctx,-60,horizon+i*i*3.7,366,horizon+i*i*3.7,light+'2a')
  box(ctx,-18,horizon-6,324,3,light+'ba')
  box(ctx,8,64,102,18,'#0d1421da',2);label(ctx,stage.name.toUpperCase().slice(0,21),13,76,7,light,'left',true)
}
function drawProp(ctx,prop,accent,t){
  const {kind,variant}=prop
  ctx.save();ctx.scale(1+variant%4*.045,1+(variant%3)*.05)
  oval(ctx,0,15,23,6,'#0c111db0')
  if(['appliance','screen','container'].includes(kind)){
    const h=kind==='screen'?33:18+variant%5*3
    poly(ctx,accent+'d5',-21,-h,18,-h,24,-h+6,-17,-h+6)
    box(ctx,-21,-h+3,42,h+9,'#1e2936',3);box(ctx,-17,-h+6,27,h,accent+'6a',3)
    if(kind==='screen')for(let i=0;i<5;i++)box(ctx,-14+i*4,2-Math.sin(t*4+i)**2*12,2,8,accent)
    else box(ctx,-13,-h+10,19,h-9,'#101926',3)
    oval(ctx,15,-h+12,2.1,2.1,accent)
    box(ctx,-17,4,33,2,accent+'80')
  }else if(kind==='paper'){
    poly(ctx,'#f3dfb8',-19,-24,16,-21,22,12,-14,9)
    for(let i=0;i<5;i++)line(ctx,-11,-17+i*5,13-i%3*4,-16+i*5,'#725f6b',1.7)
  }else if(kind==='wheel'){
    oval(ctx,-17,8,9,9,'#141a28');oval(ctx,19,8,9,9,'#141a28')
    oval(ctx,-17,8,5,5,accent);oval(ctx,19,8,5,5,accent)
    poly(ctx,accent,-22,-15,22,-9,14,1,-14,0)
    line(ctx,17,-6,25,-19,accent,3)
  }else if(kind==='weather' || kind==='food'){
    if(kind==='food' && variant<3){
      if(variant===0)poly(ctx,'#e7b071',-22,8,0,-24,24,8)
      if(variant===1)box(ctx,-16,-11,31,25,'#df6170',3)
      if(variant===2)poly(ctx,'#ffcf73',-23,-17,-5,-3,22,-17,14,9,-15,8)
      for(let i=0;i<6;i++)box(ctx,-13+i*5,-13+(i%3)*4,3,11,accent)
    }else{
      oval(ctx,-1,-8,22,20,accent);oval(ctx,-5,-14,12,7,'#fff3ba82');oval(ctx,9,2,9,6,'#1b224d42')
    }
  }else{
    box(ctx,-20,10,40,5,'#303b4b',3);box(ctx,-4,-13,8,24,accent,3)
    oval(ctx,0,-18,10+variant%3*4,9+variant%4,accent)
    if(kind==='signal'){
      ctx.globalAlpha=.48+.25*Math.sin(t*5);oval(ctx,0,-18,4,4,'#fff9df');ctx.globalAlpha=1
    }else line(ctx,-4,-21,5,-23,'#fff9df',2)
  }
  ctx.restore()
}
function drawCharacter(ctx,character,expression,movement,t,talking,side){
  const tone=colors[character.color]
  const {shape,id}=character
  const pulse=talking?Math.abs(Math.sin(t*17+id)):0
  const bob=Math.sin(t*movement.speed*3)
  ctx.save()
  ctx.translate(bob*movement.travel*.65,-Math.abs(bob)*movement.lift)
  ctx.rotate(bob*movement.twist)
  ctx.scale(1+bob*movement.stretch,1-bob*movement.stretch)
  oval(ctx,0,52,38,9,'#080e18a3')
  const small=['ibis','duck','bird','hare','mouse'].includes(shape)
  const plain=['pawn','rook','knight','bell','scroll'].includes(shape)
  const machine=['appliance','crate','robot','cart'].includes(shape)
  const sideColor=tone+'a8'
  for(const foot of [-1,1]){
    oval(ctx,foot*17,44,small?11:13,6,'#0b1623');oval(ctx,foot*17,42,small?10:12,4,sideColor)
    if(!['cart','blob','scroll'].includes(shape)){
      line(ctx,foot*18,9,foot*(28+bob*3),25+side*bob*3,sideColor,machine?8:6)
      oval(ctx,foot*(29+bob*3),25+side*bob*3,5,5,tone)
    }
  }
  if(shape==='ibis' || shape==='duck' || shape==='bird'){
    oval(ctx,0,13,30,26,sideColor);oval(ctx,-1,15,14,18,'#ece6d8')
    oval(ctx,0,-12,24,24,shape==='bird'?'#2d3847':tone)
    if(shape==='ibis')poly(ctx,'#252739',8,-14,46,-6,39,4,14,2)
    else oval(ctx,17,-7,14,5,'#e8aa4f')
  }else if(machine){
    const w=shape==='appliance'?43:57,h=shape==='crate'?53:shape==='cart'?35:65
    poly(ctx,sideColor,-w/2,-29,w/2,-29,w/2+9,-22,-w/2+7,-22)
    box(ctx,-w/2,-25,w,h,tone,shape==='robot'?11:4)
    box(ctx,-w/2+4,-20,w-8,27,shape==='crate'?'#383449':'#132332',4)
    box(ctx,-w/2+8,14,w-15,4,sideColor,1)
    if(shape==='robot'){line(ctx,0,-25,-5,-41,sideColor,3);oval(ctx,-5,-42,4,4,tone)}
    if(shape==='cart'){oval(ctx,-19,39,8,8,'#151d2b');oval(ctx,19,39,8,8,'#151d2b')}
  }else if(plain){
    box(ctx,-27,34,54,11,sideColor,3);oval(ctx,0,17,23,23,sideColor)
    if(shape==='rook'){box(ctx,-24,-29,48,29,tone,3);for(let i=-1;i<=1;i++)box(ctx,i*16-4,-36,8,13,tone)}
    else if(shape==='knight')poly(ctx,tone,-24,2,-14,-15,-11,-39,2,-29,13,-25,32,-8,24,8,9,6,12,29,-15,29)
    else if(shape==='scroll'){box(ctx,-25,-28,50,51,tone,4);oval(ctx,-25,-28,6,7,sideColor)}
    else{oval(ctx,0,-7,shape==='bell'?27:22,shape==='bell'?29:23,tone);if(shape==='bell')box(ctx,-31,8,62,8,tone,4)}
  }else{
    if(shape==='hare'){
      oval(ctx,-11,-36,7,25,tone);oval(ctx,10,-40,7,24,tone);oval(ctx,-10,-41,3,15,'#edafaa')
    }
    if(shape==='mouse'){oval(ctx,-17,-25,12,12,sideColor);oval(ctx,17,-25,12,12,sideColor)}
    oval(ctx,0,7,29,35,sideColor);oval(ctx,0,-8,29,25,tone)
    if(shape==='elf'){poly(ctx,'#be576d',-30,-16,9,-55,30,-17);oval(ctx,9,-53,5,5,'#fff0db')}
    if(shape==='helmet'){oval(ctx,0,-9,24,19,'#203443');oval(ctx,-9,-15,9,3,'#7297a5')}
    if(shape==='potato')for(let i=0;i<7;i++)oval(ctx,-21+i*7,14+i*13%15,1.6,1.6,'#75435380')
  }
  const visor=machine && shape!=='crate' || shape==='helmet'
  const eye=visor?'#afffe4':'#162434'
  const y=shape==='elf'?-4:-10
  for(const dir of [-1,1]){
    const x=dir*9+expression.look*side
    oval(ctx,x,y,3.4,Math.max(.7,expression.eyes*3.2),eye)
    if(!visor)oval(ctx,x-.7,y-1,.9,.9,'#fffddc')
    line(ctx,x-4,y-7-expression.brow*dir*3,x+3,y-7+expression.brow*dir*3,visor?'#b5dacc':'#4e3b48',1.7)
  }
  ctx.strokeStyle=eye;ctx.lineWidth=1.7
  if(talking)oval(ctx,0,y+11,5.6,.65+pulse*4.7,eye)
  else{
    ctx.beginPath();ctx.moveTo(-5,y+10);ctx.quadraticCurveTo(0,y+10+expression.mouth*7,6,y+10);ctx.stroke()
  }
  if(id%3===0)box(ctx,-17,30,6,4,'#fbf0c0',1)
  if(id%5===1){box(ctx,7,21,11,4,'#304050',1);box(ctx,9,22,4,1,tone)}
  if(id%5===2){line(ctx,-16,19,16,19,'#f3ead3',2.5);box(ctx,-4,20,8,11,'#825a79',2)}
  if(id%5===3){line(ctx,-19,6,-25,20,'#f4edcf',2);oval(ctx,-26,21,3,3,tone)}
  if(id%5===4)box(ctx,-14,24,28,3,'#243147a0',1)
  ctx.restore()
}
function editing(ctx,effect,time,amount,light){
  if(!amount)return
  ctx.save()
  const drift=time*42
  if(['vhs','scanline','security','mono','pixel','compression','paper','grain','night'].includes(effect)){
    const step=['pixel','compression'].includes(effect)?8:4
    for(let y=0;y<height;y+=step)box(ctx,0,y,width,1,'#0406154a')
    for(let i=0;i<14;i++){
      const y=(i*31.65+drift)%height,x=(i*71.7+time*2)%width
      box(ctx,x,y,i%3===0?24:7,step/2,i%2?light+'43':'#00000036')
    }
  }
  if(['fried','thermal','mono','green','paper','night'].includes(effect)){
    ctx.globalCompositeOperation='soft-light'
    box(ctx,0,0,width,height,{fried:'#fb9148',thermal:'#f79c37',mono:'#a3adbc',green:'#86f588',paper:'#eac68b',night:'#9beaaf'}[effect])
    ctx.globalCompositeOperation='source-over'
  }
  if(['letterbox','film','vignette','file','sports','freeze'].includes(effect)){
    box(ctx,0,0,width,28,'#0a0b11');box(ctx,0,473,width,39,'#0a0b11')
  }
  if(['split','outline','studio','bars','bulletin','ticker'].includes(effect)){
    box(ctx,8,41,2,height-108,light+'90');box(ctx,width-10,41,2,height-108,light+'90')
    if(effect==='split')line(ctx,width*.5,35,width*.5,362,light+'90',3)
    if(effect==='bars')for(let i=0;i<7;i++)box(ctx,13+i*15,51,13,5,Object.values(colors)[i])
  }
  ctx.restore()
}
export function render(ctx,clip,elapsed,reduced){
  const t=clamp(elapsed,0,clipDuration)
  const part=clip.timeline.find(cue=>t>=cue.from && t<cue.to) || clip.timeline.at(-1)
  const local=t-part.from
  const effect=clip.style.effect
  const motionTime=reduced?.12:effect==='freeze' && local>.65?.65:effect==='film'?local*.63:local
  const {light}=clip.stage
  const cam=part.camera
  const push=reduced?0:cam.push*clamp(motionTime/1.3)
  const shake=!reduced && ['snap','fried','sports','compression'].includes(effect) && local<.38
    ?Math.sin(local*53)*5*(1-local/.38):0
  ctx.save()
  ctx.translate(width/2+cam.x*80+shake,218+cam.y*62)
  ctx.scale(cam.zoom+push,cam.zoom+push)
  if(!reduced)ctx.rotate(cam.roll)
  ctx.translate(-width/2,-218)
  drawStage(ctx,clip.stage,motionTime)
  ctx.save();ctx.translate(237,201);ctx.scale(.58,.58);drawProp(ctx,clip.setDressing,light,motionTime);ctx.restore()
  for(const [i,character] of [clip.a,clip.b].entries()){
    const talk=part.speaks && part.speaker===character && local>.16 && local<part.to-part.from-.22
    ctx.save()
    ctx.translate(i===0?86:203,i===0?228:233)
    ctx.scale(i===0?1.32:1.19,i===0?1.32:1.19)
    drawCharacter(ctx,character,expressions[part.expressions[i]],part.movement,motionTime,talk && !reduced,part.direction)
    ctx.restore()
  }
  poly(ctx,'#262f42',37,287,246,287,289,332,0,332)
  box(ctx,0,331,width,11,'#1e2737')
  line(ctx,5,330,285,330,light+'aa',1)
  ctx.save();ctx.translate(144,316);ctx.scale(1.18,1.18);drawProp(ctx,clip.prop,light,motionTime);ctx.restore()
  ctx.restore()
  const footer=ctx.createLinearGradient(0,335,0,height)
  footer.addColorStop(0,'#0b101400');footer.addColorStop(.18,'#0c101bde');footer.addColorStop(1,'#080c14')
  box(ctx,0,335,width,height-335,footer)
  editing(ctx,effect,t,!reduced,light)
  box(ctx,15,13,258,23,'#111525eb',2)
  label(ctx,'●  FICTION / '+clip.reel,22,28,10,light,'left',true)
  label(ctx,Math.floor(t).toString().padStart(2,'0')+' SEC',265,28,9,'#e4dfdb','right',true)
  if(!part.speaks){
    box(ctx,0,352,width,103,'#101421ed');box(ctx,21,360,30,2,light)
    label(ctx,clip.style.name.toUpperCase(),width/2,381,10,light,'center',true)
    wrapped(ctx,t<3?clip.title:part.line,width/2,409,t<3?23:17,'#f6eedf',248)
  }else{
    label(ctx,part.speaker.name.toUpperCase(),width/2,384,10,light,'center',true)
    wrapped(ctx,part.line,width/2,410,18,'#fff7e8',246)
  }
  box(ctx,16,493,256,2,'#8c94aa4d')
  box(ctx,16,493,256*t/clipDuration,2,light)
  return part
}
export function makeAudio(){
  const Context=window.AudioContext || window.webkitAudioContext
  if(!Context)return null
  const context=new Context()
  const master=context.createGain()
  const compressor=context.createDynamicsCompressor()
  master.gain.value=.48;master.connect(compressor).connect(context.destination)
  const active=new Set()
  function synth(f,end,kind,level,length,when){
    const wave=context.createOscillator(),gain=context.createGain()
    wave.type=kind;wave.frequency.setValueAtTime(f,when)
    wave.frequency.exponentialRampToValueAtTime(Math.max(22,end),when+length)
    gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),when+.012)
    gain.gain.exponentialRampToValueAtTime(.0001,when+length)
    wave.connect(gain).connect(master)
    wave.onended=()=>{active.delete(wave);wave.disconnect();gain.disconnect()}
    active.add(wave);wave.start(when);wave.stop(when+length+.008)
  }
  return {
    volume(level){master.gain.value=level*.52},
    resume(){context.resume().catch(()=>{})},
    cue(sound,bed,section){
      const start=context.currentTime+.012
      synth(sound.frequency,sound.end,sound.type,.34,sound.time,start)
      if(sound.noise)synth(sound.frequency*1.89,sound.end*1.64,'triangle',sound.noise,sound.time*.73,start+.024)
      if(section===3)return
      for(const [i,note] of bed.notes.entries())
        synth(frequency(note),frequency(note),bed.wave,.075,bed.pace*.86,start+.15+bed.pace*i)
    },
    stop(){for(const wave of active){try{wave.stop()}catch{}}active.clear()},
    close(){context.close().catch(()=>{})},
  }
}
export const librarySize={characters:Object.keys(cast).length,environments:stages.length,props:props.length,sounds:sounds.length,
  cameras:cameras.length,editing:editStyles.length,voices:voices.length,stories:stories.length,expressions:expressions.length,movements:movements.length,loops:beds.length}
export const voiceFor=character=>voices[character.voice]
