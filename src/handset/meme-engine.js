import {cast,stages,props,editStyles,cameras,expressions,movements,voices,sounds,beds,stories,legacyStories,colors} from './meme-library.js'
import {formatsV2} from './meme-season.js'

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
const seasonSeed=1_000_000
export const categories=Object.fromEntries(Object.entries(formatsV2).map(([id,value])=>[id,value.label]))
export const seedForStory=index=>seasonSeed+index
export function makeShort(seed){
  const universe=seed>=seasonSeed?stories:legacyStories
  const serial=seed>=seasonSeed?seed-seasonSeed:seed
  const story=pick(universe,serial)
  const version=Math.floor(serial/universe.length)
  const format=story.format?formatsV2[story.format]:null
  const timing=format?.timing || clocks
  const a=cast[pick(story.lead,version)],b=cast[pick(story.support,version*3+Math.floor(version/2))]
  const style=format?{name:format.label,effect:format.effect}:pick(editStyles,seed*11+version),stage=stages[story.stage]
  const reel=String(101+seed%890).padStart(3,'0')
  const lines=[format?.universe || 'A Side Reel fiction',...story.lines,'END OF RECORDING']
  const timeline=lines.map((line,index)=>({
    from:timing[index],to:timing[index+1],line,speaker:index%2?a:b,shot:format?.shots[index] || ['witness','object','witness','rival','object','archive'][index],
    camera:pick(cameras,seed*3+index*7+[0,0,4,3,6,1][index]),
    direction:index%2?1:-1,
    expressions:[(seed+index*7)%expressions.length,(seed*2+index*13+4)%expressions.length],
    movement:pick(movements,seed*13+index*11),
    sound:pick(sounds,seed*7+index*11),
    speaks:index>0 && index<5,
  }))
  return {seed,id:hash(seed+'|'+story.title+'|'+a.name+'|'+b.name+'|'+style.effect),story:story.id,name:a.name,title:story.title,a,b,stage,style,reel,format:story.format || 'classic',universe:format?.universe || 'Side Reel Archives',
    prop:story.prop,setDressing:pick(props,seed*7+story.id*11),timeline,punchline:story.lines[3],pair:[a.id,b.id].sort((x,y)=>x-y).join('-'),bed:pick(beds,seed*13)}
}
export function nextBatch(history,seed,count=3,category='all'){
  const recent=history.slice(-9)
  const used=new Set(history.map(clip=>clip.story))
  const lastPair=new Set(category==='all'?recent.slice(-5).map(clip=>clip.pair):[])
  const lastEdit=new Set(category==='all'?recent.slice(-3).map(clip=>clip.style):[])
  const wordsIn=text=>new Set(text.toLowerCase().match(/[a-z]{4,}/g))
  const recentWords=recent.map(clip=>({punchline:wordsIn(clip.punchline),script:clip.script?wordsIn(clip.script):null}))
  const similarity=(a,b)=>[...a].filter(word=>b.has(word)).length/Math.max(1,a.size,b.size)
  const script=clip=>clip.timeline.filter(cue=>cue.speaks).map(cue=>cue.line).join(' ')
  const clipHistory=clip=>({id:clip.id,story:clip.story,pair:clip.pair,punchline:clip.punchline,script:script(clip),style:clip.style.effect,seed:clip.seed})
  const similar=clip=>{
    const words=wordsIn(clip.punchline),lines=wordsIn(script(clip))
    return recentWords.some(previous=>similarity(words,previous.punchline)>.48 || previous.script && similarity(lines,previous.script)>.65)

  }
  const result=[]
  for(let offset=0;offset<stories.length*3 && result.length<count;offset++){
    const clip=makeShort(seasonSeed+seed+offset*13)
    if(category!=='all' && clip.format!==category)continue
    if(used.has(clip.story) || lastPair.has(clip.pair) || lastEdit.has(clip.style.effect) || similar(clip))continue
    result.push(clip)
    used.add(clip.story)
    if(category==='all' && offset<stories.length){lastPair.add(clip.pair);lastEdit.add(clip.style.effect)}
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
  if(shape==='key'){
    oval(ctx,-3,-13,27,28,'#d6a257');oval(ctx,-3,-13,20,20,tone);oval(ctx,-3,-13,10,10,'#242138')
    box(ctx,-9,3,16,34,tone,2);box(ctx,5,22,10,6,'#f6d98f');box(ctx,5,31,14,6,'#ddae6a',2)
  }else if(shape==='lock'){
    ctx.strokeStyle='#d5d8db';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,-16,18,Math.PI,Math.PI*2);ctx.stroke()
    box(ctx,-28,-14,56,47,tone,8);box(ctx,-23,11,46,5,'#44869d',2)
  }else if(shape==='ibis' || shape==='duck' || shape==='bird'){
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
function setDesign(ctx,format,t,light){
  if(format==='archive'){
    const filter=ctx.createLinearGradient(0,0,width,0)
    filter.addColorStop(0,'#0c182bee');filter.addColorStop(.48,'#34465758');filter.addColorStop(1,'#14182dee')
    box(ctx,0,44,width,264,filter)
    for(const x of [38,248]){
      box(ctx,x-5,56,10,192,'#536075')
      for(let n=0;n<9;n++)line(ctx,x-10,61+n*20,x+6,56+n*20,'#c3a68a8c',2)
    }
    box(ctx,5,101,30,18,'#2d3448');label(ctx,'04',11,113,9,'#ecd2a7','left',true)
  }else if(format==='opera' || format==='montage'){
    box(ctx,0,71,width,182,format==='opera'?'#48243aab':'#19384ca8')
    for(let n=0;n<18;n++){
      const x=n*18-8,y=279+Math.sin(n*3+t*.4)*4
      oval(ctx,x,y,13,8,n%2?'#171b2d':'#2a2537')
      oval(ctx,x,y-9,4,5,light+'69')
    }
    box(ctx,19,284,250,18,'#263347');box(ctx,31,287,226,2,light)
    if(format==='opera'){
      for(let n=0;n<12;n++)line(ctx,n*24,47,n*24-3,163,n%2?'#672f4b':'#915568',6)
    }else box(ctx,96,63,96,24,'#1a283b',3)
    label(ctx,format==='opera'?'GRAND STAGE':'ROUND 04',144,81,10,light,'center',true)
  }else if(format==='desktop'){
    const shade=ctx.createLinearGradient(0,39,0,308)
    shade.addColorStop(0,'#3886bc');shade.addColorStop(.45,'#84b7be');shade.addColorStop(.46,'#536f69');shade.addColorStop(1,'#225966')
    box(ctx,0,35,width,288,shade)
    oval(ctx,230,95,42,39,'#e5dec4ac')
    poly(ctx,'#3e776a',0,192,61,145,137,177,220,151,289,170,289,263,0,263)
    poly(ctx,'#327682',0,211,94,194,289,215,289,300,0,300)
    for(let n=0;n<10;n++)line(ctx,13+n*7,223+n*5,94+n*8,223+n*5,'#a4e9e47f',1)
    box(ctx,0,302,width,18,'#1c6e99');box(ctx,7,305,60,12,'#338063',4)
    label(ctx,'START',17,314,8,'#f8ffee','left',true)
  }else if(format==='boardroom'){
    box(ctx,0,53,width,223,'#473a40cf')
    for(let j=0;j<5;j++){
      box(ctx,j*58+8,65,46,145,'#183142',1)
      for(let n=0;n<13;n++)box(ctx,j*58+10+n*5%37,80+n*7,3,2,light+'70')
      box(ctx,j*58+8,138,46,3,'#7b6561')
    }
    poly(ctx,'#2b2634',46,275,246,275,286,312,2,312)
    line(ctx,8,311,280,311,light+'91',3)
  }else if(format==='hotline' || format==='broadcast'){
    box(ctx,0,52,width,214,'#202335dc')
    for(let i=0;i<19;i++){
      const top=99+(i*29%87),x=7+i*16
      box(ctx,x,top,13,176-top, i%3?'#222d49':'#503348',2)
    }
    box(ctx,19,77,111,16,format==='hotline'?'#673d58':'#324d6d',3)
    label(ctx,format==='hotline'?'ON AIR  /  CH.−1':'EVENING BULLETIN',25,88,8,'#f8e2c8','left',true)
    box(ctx,20,294,248,11,'#52394b',3)
  }
}

function viewDressing(ctx,shot,t,light){
  if(shot==='orbit'){
    const planet=ctx.createRadialGradient(180,133,3,180,133,105)
    planet.addColorStop(0,light);planet.addColorStop(.43,'#906f87');planet.addColorStop(1,'#2b3651')
    oval(ctx,181,145,98,82,planet)
    ctx.strokeStyle='#eac9a7a0';ctx.lineWidth=12;ctx.beginPath();ctx.ellipse(179,149,129,31,-.29,0,Math.PI*2);ctx.stroke()
  }else if(shot==='desktop'){
    box(ctx,13,69,220,166,'#b2e4e188',8);box(ctx,17,76,210,21,'#367a8a',4)
    label(ctx,'AERO WORKSPACE',26,89,8,'#f8ffff','left',true)
    for(let j=0;j<17;j++){
      const x=j*41%268,y=67+((j*39-t*23+500)%170),r=3+j%5
      oval(ctx,x,y,r,r,'#e3f6fe78');oval(ctx,x-1,y-1,Math.max(1,r*.36),Math.max(1,r*.36),'#fffffba6')
    }
  }else if(shot==='arena'){
    for(let i=0;i<3;i++){
      const x=60+i*84,angle=Math.sin(t*.6+i)*50
      poly(ctx,[light+'53','#d8bbe64a','#8dc7ed4a'][i],x,63,x+angle-88,355,x+angle+88,355)
    }
  }else if(shot==='stream'){
    box(ctx,178,66,95,99,'#131b2ce3',3);box(ctx,181,69,88,3,light)
    for(let i=0;i<4;i++){
      box(ctx,185,82+i*17,8,7,[light,'#e3a9c6','#c1d2f1','#b1d7b4'][i],2)
      box(ctx,198,84+i*17,27+(i*17)%42,3,'#a8b8cf76',1)
    }
  }else if(shot==='archive'){
    const border=31
    for(const x of [border,width-border])for(const y of [65,316]){
      line(ctx,x,y,x+(x<100?1:-1)*16,y,'#e7e6c6',1.1)
      line(ctx,x,y,x,y+(y<100?1:-1)*17,'#e7e6c6',1.1)
    }
    label(ctx,'CAM 04   /   ARCHIVE',width-31,313,8,light,'right',true)
  }
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
  setDesign(ctx,clip.format,motionTime,light)
  viewDressing(ctx,part.shot,motionTime,light)
  const isObject=part.shot==='object'
  const wide=['arena','archive','orbit'].includes(part.shot)
  const impact=t>=clip.timeline[4].from && t<clip.timeline[4].from+1.15 && !reduced
  if(impact){
    for(let i=0;i<9;i++){
      const a=i*2.399,r=(28+local*104)*(.5+i%4*.2)
      const cx=width/2+Math.cos(a)*r,cy=226+Math.sin(a)*r
      box(ctx,cx,cy,2+i%3,2,light+'ba',1)
    }
  }
  if(!isObject){
    for(const [i,character] of [clip.a,clip.b].entries()){
      const talk=part.speaks && part.speaker===character && local>.16 && local<part.to-part.from-.22
      if(['witness','rival'].includes(part.shot) && part.speaks && !talk && part.speaker!==character)continue
      if(part.shot==='stream' && i===1)continue
      const swap=i===0?1:-1
      const step=wide && !reduced?Math.sin(motionTime*3+i*1.7)*19:0
      ctx.save()
      ctx.translate((wide?(i===0?74:207):part.shot==='stream'?103:144)+step,wide?246:221)
      const size=wide?1.11:part.shot==='stream'?1.48:1.66
      ctx.scale(size*(part.shot==='rival'?-1:1),size)
      drawCharacter(ctx,character,expressions[part.expressions[i]],part.movement,motionTime,talk && !reduced,swap)
      ctx.restore()
    }
  }
  if(isObject || part.shot==='desktop'){
    const movement=reduced?0:Math.sin(motionTime*4.3)*12
    oval(ctx,144,295,63,11,'#101421')
    ctx.save();ctx.translate(144+movement,236+Math.sin(motionTime*3)*6)
    ctx.rotate(reduced?0:Math.sin(motionTime*3)*.24)
    ctx.scale(isObject?2.25:1.55,isObject?2.25:1.55)
    drawProp(ctx,clip.prop,light,motionTime);ctx.restore()
  }else{
    ctx.save()
    ctx.translate(part.shot==='stream'?207:144,wide?299:313)
    ctx.scale(1.12,1.12);drawProp(ctx,clip.prop,light,motionTime);ctx.restore()
  }
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
    label(ctx,clip.universe.toUpperCase(),width/2,381,10,light,'center',true)
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
    cue(sound,bed,section,format){
      const start=context.currentTime+.012
      const impact=section===4
      if(impact && ['archive','broadcast','stream','cctv'].includes(format))synth(89,31,'sine',.58,.30,start)
      if(format==='montage' || format==='opera'){
        for(const [j,beat] of [0,.11,.27].entries()){
          synth(format==='opera'?frequency(47+9*j):155+j*16,format==='opera'?frequency(46+9*j):44,'triangle',.29,.088,start+beat)
        }
      }else synth(sound.frequency,sound.end,sound.type,.34,sound.time,start)
      if(sound.noise)synth(sound.frequency*1.89,sound.end*1.64,'triangle',sound.noise,sound.time*.73,start+.024)
      if(section===3 && ['archive','cctv','stream'].includes(format))return
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
