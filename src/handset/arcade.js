import {gesture,node,optionRows,read,store} from './shared.js'

const width=240,height=290
const themes={
  grass:['Grasslands','#8bc9c7','#2d6660','#e7c277','#142e38'],
  city:['Cyberpunk city','#2f3359','#3d5278','#df80d0','#1a213a'],
  noel:['Christmas village','#89a7c6','#487563','#f8c4a0','#293443'],
  stars:['Outer space','#162448','#55588c','#c0a1f5','#101a37'],
  tropical:['Tropical island','#9ed8d7','#418072','#f5d285','#2b655f'],
  deep:['Underwater fantasy','#31648a','#1b5671','#aaffd9','#183248'],
  chrome:['Chrome','#899aa8','#4f606d','#e7e9e2','#27343f'],
  desert:['Desert circuit','#d7a783','#91684d','#fae698','#513b38'],
  marble:['Marble atrium','#bbb5c4','#817d98','#eee9df','#3d3d57'],
  glass:['Smoked glass','#73abb8','#4d7480','#a5d9d1','#203649'],
  cedar:['Cedar studio','#b58670','#745847','#e2b283','#3e3440'],
}
const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}
const config={
  wings:{instruction:'Flap through the gates. Earn 8 points for the kingfisher skin.',action:'Flap',themes:['grass','city','noel','stars','tropical','deep']},
  snake:{instruction:'Collect the glowing fruit. Arrow keys, swipe, or use the direction pad.',action:'Start',themes:['city','chrome','noel','grass']},
  runner:{instruction:'Jump over obstacles. Practice checkpoints carry no high score.',action:'Jump',themes:['city','stars','noel','deep']},
  tower:{instruction:'Place each moving block. Only the overlap supports the next one.',action:'Place block',themes:['chrome','glass','marble','cedar','noel']},
  racing:{instruction:'Steer to stay on the circuit. Complete three laps in race or time trial.',action:'Drive',themes:['city','noel','desert','grass']},
}
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value))
const overlap=(ax,ay,aw,ah,bx,by,bw,bh)=>ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by
const turnAngle=(angle,target)=>Math.atan2(Math.sin(target-angle),Math.cos(target-angle))
const startLine=-Math.PI/2
const circuits={
  city:{x:78,y:102,shape:[0,0,0],speed:1.51,scenery:'buildings'},
  noel:{x:74,y:96,shape:[8,3,-5],speed:1.41,scenery:'snow'},
  desert:{x:73,y:95,shape:[11,-6,9],speed:1.34,scenery:'rocks'},
  grass:{x:75,y:98,shape:[-8,6,5],speed:1.43,scenery:'trees'},
}
const carPaint={original:'#ffce7a',special:'#ecb6e2',rally:'#86ded0',sport:'#f4836f'}
function trackPoint(circuit,angle,offset=0){
  const [lobe,skew,curve]=circuit.shape
  const bend=lobe*Math.cos(angle*3+.4)+skew*Math.sin(angle*2)+curve*Math.cos(angle*4)
  return [120+Math.cos(angle)*(circuit.x+bend+offset),145+Math.sin(angle)*(circuit.y+bend+offset)]
}
function shade(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function rounded(ctx,x,y,w,h,r,color){
  ctx.fillStyle=color
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()
}

function backdrop(ctx,palette,time,theme){
  const [,sky,land,accent,floor]=palette
  const grad=ctx.createLinearGradient(0,0,0,height)
  grad.addColorStop(0,sky);grad.addColorStop(1,floor)
  shade(ctx,grad,0,0,width,height)
  ctx.globalAlpha=.50
  if(theme==='city' || theme==='noel'){
    for(let i=0;i<12;i++){
      const x=(i*27-time*10%27)-22,h=44+(i*33%107)
      shade(ctx,land,x,height-h-15,19,h)
      for(let y=height-h;y<height-19;y+=11){
        shade(ctx,accent,x+4,y,3,3);shade(ctx,accent,x+12,y,3,3)
      }
    }
  }else if(theme==='stars' || theme==='deep'){
    ctx.fillStyle=accent
    for(let i=0;i<46;i++){
      const x=(i*59.43+time*(i%4+1))%width,y=(i*31.81)%height
      ctx.beginPath();ctx.arc(x,y,i%6===0?1.8:.7,0,Math.PI*2);ctx.fill()
    }
  }else{
    ctx.fillStyle=land;ctx.beginPath();ctx.moveTo(0,height)
    for(let x=0;x<=width;x+=4)ctx.lineTo(x,height-54-Math.sin((x+time*13)*.03)*29-Math.cos(x*.08)*8)
    ctx.lineTo(width,height);ctx.fill()
  }
  ctx.globalAlpha=1
}

const birdPixels=[
  '     ##      ',
  '    #oo#     ',
  '   #o@oo##   ',
  '  #oo@ooo+## ',
  '###ooooooo+# ',
  '#oowwooooo## ',
  ' #wwwooo##   ',
  '  ###o##     ',
  '    #+##     ',
]
function scenery(ctx,time,theme,palette){
  const [,sky,land,ink,floor]=palette
  const sun=theme==='stars'?'#ac9cdd':theme==='deep'?'#7fdece75':'#ffdda5b0'
  if(!['city','noel'].includes(theme)){
    ctx.fillStyle=sun;ctx.beginPath();ctx.arc(176,65,theme==='stars'?29:25,0,Math.PI*2);ctx.fill()
  }
  for(let j=0;j<3;j++){
    ctx.fillStyle=[land+'66',land+'a9',floor+'a2'][j]
    ctx.beginPath();ctx.moveTo(-8,height)
    for(let x=-8;x<=width+8;x+=4){
      const phase=x+time*(7+j*6)
      const y=height-81+j*25-Math.sin(phase*.02+j*1.1)*(22-j*3)-Math.sin(phase*.052)*8
      ctx.lineTo(x,y)
    }
    ctx.lineTo(width+8,height);ctx.fill()
  }
  if(theme==='noel' || theme==='deep'){
    ctx.fillStyle=ink
    for(let i=0;i<20;i++){
      const x=Math.floor((i*51.31+time*(4+i%6))%width),y=Math.floor((i*39.62+time*(10+i%4))%height)
      shade(ctx,ink+'a8',x,y,1+i%3,1+i%3)
    }
  }
  shade(ctx,ink+'ad',0,height-10,width,2)
  for(let x=-13;x<width;x+=13)shade(ctx,sky+'cc',x-time*25%13,height-7,5,2)
}
let arcadeContext
function arcadeCue(kind,level){
  if(!level)return
  const Audio=window.AudioContext || window.webkitAudioContext
  if(!Audio)return
  try{
    arcadeContext ||= new Audio()
    arcadeContext.resume().catch(()=>{})
    const t=arcadeContext.currentTime,wave=arcadeContext.createOscillator(),gain=arcadeContext.createGain()
    const [from,to,duration]=kind==='point'?[570,895,.13]:kind==='end'?[180,56,.18]:[410,550,.07]
    wave.type='triangle';wave.frequency.setValueAtTime(from,t);wave.frequency.exponentialRampToValueAtTime(to,t+duration)
    gain.gain.setValueAtTime(Math.max(.001,level*.17),t);gain.gain.exponentialRampToValueAtTime(.001,t+duration)
    wave.connect(gain).connect(arcadeContext.destination);wave.start();wave.stop(t+duration)
    wave.onended=()=>{wave.disconnect();gain.disconnect()}
  }catch{}
}
const runnerPatterns={city:[0,1,0,2,0,2,1,1],stars:[2,0,1,2,1,0,0,2],noel:[0,0,1,2,2,1,0,1],deep:[1,0,2,0,1,2,2,0]}

const models={
  wings:{
    reset:()=>({y:133,vy:0,pipes:[],spawn:1,t:0}),
    act(state,key){if(key==='Space')state.vy=-151},
    tick(s,dt,game){
      s.t+=dt;s.vy+=400*dt;s.y+=s.vy*dt
      s.spawn-=dt
      const gap=Math.max(63,99-game.score*1.5)
      if(s.spawn<=0){s.spawn=1.5;s.pipes.push({x:width,c:72+Math.random()*139,gap})}
      for(const p of s.pipes){
        p.x-=(83+Math.min(65,game.score*3.6))*dt
        if(!p.passed && p.x+32<61){p.passed=true;game.add(1)}
        if(p.x<76 && p.x+32>48 && (s.y-8<p.c-p.gap/2 || s.y+8>p.c+p.gap/2))game.end()
      }
      s.pipes=s.pipes.filter(p=>p.x>-36)
      if(s.y<4 || s.y>height-9)game.end()
    },
    draw(s,ctx,palette,skin,options){
      scenery(ctx,s.t,options.theme,palette)
      for(const p of s.pipes){
        const top=Math.ceil(p.c-p.gap/2),bottom=Math.ceil(p.c+p.gap/2)
        for(const [y,h] of [[0,top],[bottom,height-bottom]]){
          shade(ctx,'#172837',p.x+1,y,34,h)
          shade(ctx,palette[2],p.x+3,y,26,h)
          shade(ctx,'#ffffff35',p.x+7,y,3,h)
          for(let n=8;n<h-5;n+=14)shade(ctx,'#141c3437',p.x+3,y+n,28,2)
        }
        shade(ctx,palette[3],p.x-2,top-6,38,5)
        shade(ctx,palette[3],p.x-2,bottom,38,5)
        shade(ctx,'#fffdf460',p.x-2,top-6,38,1)
      }
      ctx.save();ctx.translate(Math.round(62),Math.round(s.y));ctx.rotate(clamp(s.vy*.0009,-.21,.28))
      const colors={'#':'#182437',o:skin==='special'?'#56b5df':palette[3],w:'#f7f1db','@':'#172335','+':'#f39456'}
      for(const [y,row] of birdPixels.entries())for(const [x,pixel] of [...row].entries()){
        if(pixel===' ')continue
        const wing=pixel==='w'?Math.round(Math.sin(s.t*25))*2:0
        shade(ctx,colors[pixel],(x-6)*2.2,(y-4)*2.2+wing,2.3,2.3)
      }
      ctx.restore()
    },
  },
  snake:{
    reset(options){
      const n=Number(options.size),mid=Math.floor(n/2)
      return {n,body:[[mid-1,mid],[mid-2,mid],[mid-3,mid]],dir:[1,0],queued:null,elapsed:0,t:0,
        previous:null,obstacles:options.mode==='modern'?[[3,3],[3,4],[n-4,n-4],[n-4,n-5]]:[],food:[n-3,mid]}
    },
    act(s,key){
      const next=directions[key]
      if(next && !s.queued && (next[0]!==-s.dir[0] || next[1]!==-s.dir[1]))s.queued=next
    },
    tick(s,dt,game){
      s.t+=dt;s.elapsed+=dt
      const step=Math.max(.068,.206-game.score*.009)
      if(s.elapsed<step)return
      s.elapsed-=step
      if(s.queued){s.dir=s.queued;s.queued=null}
      const [x,y]=s.body[0];const next=[x+s.dir[0],y+s.dir[1]]
      const same=point=>point[0]===next[0] && point[1]===next[1]
      const eats=same(s.food)
      if(next.some(pos=>pos<0 || pos>=s.n) || (eats?s.body:s.body.slice(0,-1)).some(same) || s.obstacles.some(same)){game.end();return}
      s.previous=s.body.map(point=>point.slice())
      s.body.unshift(next)
      if(!eats){s.body.pop();return}
      game.add(1)
      const empty=[]
      for(let y=0;y<s.n;y++)for(let x=0;x<s.n;x++)if(!s.body.concat(s.obstacles).some(p=>p[0]===x && p[1]===y))empty.push([x,y])
      if(!empty.length){game.end();return}
      s.food=empty[Math.floor(Math.random()*empty.length)]
    },
    draw(s,ctx,palette,skin){
      const cell=width/s.n,offset=25
      shade(ctx,palette[4],0,offset,width,width)
      const [x,y]=s.food
      for(let j=0;j<s.n;j++)for(let i=0;i<s.n;i++){
        ctx.globalAlpha=(i+j)%2?.16:.08;shade(ctx,palette[2],i*cell+.8,j*cell+offset+.8,cell-1.6,cell-1.6)
      }
      ctx.globalAlpha=1
      for(const [x,y] of s.obstacles)rounded(ctx,x*cell+2,y*cell+offset+2,cell-4,cell-4,2,palette[2])
      ctx.fillStyle='#ff958b'
      ctx.beginPath();ctx.arc((x+.5)*cell,(y+.5)*cell+offset,cell*(.30+Math.sin(s.t*11)*.061),0,Math.PI*2);ctx.fill()
      const parts=s.body.map(([x,y],i)=>{
        const [px,py]=s.previous?.[i] || [x,y]
        const blend=s.previous?Math.min(1,s.elapsed/.16):1
        return [(px+(x-px)*blend)*cell+cell/2,(py+(y-py)*blend)*cell+offset+cell/2]
      })
      ctx.strokeStyle=skin==='special'?'#d894cb':palette[3]
      ctx.lineWidth=cell*.70;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...parts[0])
      for(const center of parts.slice(1))ctx.lineTo(...center)
      ctx.stroke()
      const [cx,cy]=parts[0]
      rounded(ctx,cx-cell*.4,cy-cell*.4,cell*.8,cell*.8,cell*.25,'#e6f8c9')
      for(const factor of [-1,1]){
        const [dx,dy]=s.dir
        shade(ctx,'#243843',cx+dx*cell*.15+dy*factor*cell*.16-1,cy+dy*cell*.15-dx*factor*cell*.16-1,2,2)
      }
      shade(ctx,'#fcdab5',(x+.48)*cell,(y+.31)*cell+offset,2,3)
    },
  },
  runner:{
    reset:()=>({y:209,vy:0,t:0,blocks:[],spawn:1,grounded:true,pattern:0,dust:[]}),
    act(s,key){if(key==='Space' && s.grounded){s.grounded=false;s.vy=-298}},
    tick(s,dt,game){
      s.t+=dt;s.vy+=680*dt;s.y+=s.vy*dt
      if(s.y>=209){
        if(!s.grounded)s.dust=Array.from({length:6},(_,i)=>({x:62,y:220,dx:-22-i*8,dy:-(i+2)*7,age:0}))
        s.y=209;s.vy=0;s.grounded=true
      }
      for(const mote of s.dust){mote.x+=mote.dx*dt;mote.y+=mote.dy*dt;mote.age+=dt}
      s.dust=s.dust.filter(mote=>mote.age<.32)
      s.spawn-=dt
      const speed={relaxed:101,standard:126,expert:167}[game.options.level]+Math.min(38,game.score*1.5)
      if(s.spawn<=0){
        const order=runnerPatterns[game.options.theme]
        const pattern=order[s.pattern++%order.length]
        const step=game.options.level==='expert'?.70:game.options.level==='relaxed'?1.15:.97
        s.spawn=step+pattern*.14
        s.blocks.push({x:width,w:pattern===2?31:17,h:pattern===1?29:22,p:pattern})
      }
      for(const block of s.blocks){
        block.x-=speed*dt
        if(!block.passed && block.x+block.w<51){block.passed=true;game.add(1)}
        if(overlap(55,s.y-14,16,17,block.x+3,225-block.h,block.w-6,block.h)){
          if(game.options.mode==='practice'){s.blocks=[];s.spawn=1.1;s.y=209;s.vy=0;game.status('Practice checkpoint');break}
          game.end()
        }
      }
      s.blocks=s.blocks.filter(block=>block.x>-44)
    },
    draw(s,ctx,palette,skin){
      shade(ctx,palette[4],0,226,width,64);shade(ctx,palette[3],0,225,width,2)
      ctx.globalAlpha=.45
      for(let i=0;i<9;i++)shade(ctx,palette[2],0,232+i*7,width,1)
      ctx.globalAlpha=1
      for(const block of s.blocks){
        ctx.fillStyle=palette[3];ctx.beginPath()
        ctx.moveTo(block.x,226);ctx.lineTo(block.x+block.w*.58,226-block.h);ctx.lineTo(block.x+block.w,226);ctx.fill()
      }
      for(const mote of s.dust){ctx.globalAlpha=1-mote.age/.32;shade(ctx,palette[3],mote.x,mote.y,3,3)}
      ctx.globalAlpha=1
      ctx.save();ctx.translate(62,s.y+5);ctx.rotate(s.grounded?0:s.t*4)
      if(skin==='special'){ctx.rotate(Math.PI/4)}
      rounded(ctx,-10,-10,20,20,3,'#a3f5e3')
      rounded(ctx,-5,-5,10,10,2,palette[4]);ctx.restore()
    },
  },
  tower:{
    reset:()=>({base:[{x:54,w:132}],x:6,dir:1,w:132,combo:0,t:0,offset:0,slice:null}),
    act(s,key,game){
      if(key!=='Space')return
      const previous=s.base.at(-1)
      const x=Math.max(s.x,previous.x),end=Math.min(s.x+s.w,previous.x+previous.w)
      if(end-x<2){game.end();return}
      const precise=Math.abs(s.x-previous.x)<4
      s.combo=precise?s.combo+1:0
      if(!precise){
        const left=s.x<previous.x
        s.slice={x:left?s.x:end,w:left?x-s.x:s.x+s.w-end,y:height-24-s.base.length*15+s.offset,t:s.t}
      }
      s.base.push({x:precise?previous.x:x,w:precise?previous.w:end-x})
      s.w=precise?previous.w:end-x
      s.dir*=-1;s.x=s.dir===1?4:width-s.w-4
      game.add(precise?1+s.combo:1)
    },
    tick(s,dt,game){
      s.t+=dt
      s.offset+=(Math.max(0,s.base.length-10)*15-s.offset)*Math.min(1,dt*6)
      s.x+=s.dir*(67+Math.min(95,s.base.length*5))*dt
      if(s.x<3 || s.x+s.w>width-3){s.x=clamp(s.x,3,width-s.w-3);s.dir*=-1}
    },
    draw(s,ctx,palette,skin){
      const block=(x,y,w,i)=>{
        const color=i%2?palette[2]:palette[3]
        ctx.fillStyle=skin==='special'?'#c4ced4':color
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8,y-7);ctx.lineTo(x+w+8,y-7);ctx.lineTo(x+w,y);ctx.fill()
        const reflection=ctx.createLinearGradient(x,y,x+w,y+11)
        reflection.addColorStop(0,'#ffffff20');reflection.addColorStop(.39,'#ffffff78');reflection.addColorStop(.53,'#212c4649');reflection.addColorStop(1,'#ffffff0b')
        shade(ctx,color,x,y,w,11);shade(ctx,reflection,x,y,w,11)
        if(palette===themes.cedar || palette===themes.marble)for(let n=0;n<5;n++)
          shade(ctx,palette[4]+'55',x+n*5,y+2+n%4,w-n*5,1)
        shade(ctx,'#f4f3ee67',x,y,w,1)
        ctx.globalAlpha=.45
        ctx.fillStyle=palette[4];ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x+w+8,y-7);ctx.lineTo(x+w+8,y+4);ctx.lineTo(x+w,y+11);ctx.fill()
        ctx.globalAlpha=1
      }
      for(const [i,item] of s.base.entries())block(item.x,height-24-i*15+s.offset,item.w,i)
      block(s.x,height-24-s.base.length*15+s.offset,s.w,s.base.length)
      if(s.slice && s.t-s.slice.t<.6)block(s.slice.x,s.slice.y+(s.t-s.slice.t)**2*310,Math.max(0,s.slice.w),s.base.length)
    },
  },
  racing:{
    reset:()=>({theta:startLine,offset:0,steer:0,velocity:0,t:0,lapAt:0,lap:0,best:null,opponents:[.34,.69]}),
    act(s,key){if(key==='ArrowLeft')s.steer=clamp(s.steer-6,-25,25);if(key==='ArrowRight')s.steer=clamp(s.steer+6,-25,25)},
    tick(s,dt,game){
      s.t+=dt
      const circuit=circuits[game.options.theme]
      s.offset+=(s.steer-s.offset)*Math.min(1,dt*12)
      const out=Math.abs(s.offset)>13
      const pace=out ? .59 : circuit.speed-Math.abs(s.offset)*.010
      s.velocity+=(pace-s.velocity)*Math.min(1,dt*3.6)
      s.theta+=s.velocity*dt
      if(game.options.mode!=='trial'){
        for(let i=0;i<s.opponents.length;i++){
          s.opponents[i]+=dt*(1.19+i*.115)
          const other=s.opponents[i]+startLine
          const lane=(i-.5)*14
          if(Math.abs(turnAngle(s.theta,other))<.105 && Math.abs(s.offset-lane)<6)s.velocity*=.87
        }
      }
      if(s.theta-startLine>=(s.lap+1)*Math.PI*2){
        s.lap++
        const time=s.t-s.lapAt
        if(!s.best || time<s.best){
          s.best=time
          const record=read('lap-'+game.options.theme,null)
          if(!record || time<record)store('lap-'+game.options.theme,time)
        }
        s.lapAt=s.t
        game.add(1)
        if(s.lap===3){
          const position=game.options.mode==='trial'?'Time trial':(1+s.opponents.filter(distance=>startLine+distance>s.theta).length)+' of 3'
          game.status(position+' · Best lap '+s.best.toFixed(2)+'s')
          game.end(true)
        }
      }
    },
    draw(s,ctx,palette,skin,options){
      const circuit=circuits[options.theme]
      for(let j=0;j<21;j++){
        const [x,y]=trackPoint(circuit,j*2.399,j%2?-30:25)
        if(circuit.scenery==='buildings'){
          rounded(ctx,x-5,y-9,10,15,2,palette[2]);shade(ctx,palette[3],x-2,y-5,4,2)
        }else{
          ctx.fillStyle=palette[2];ctx.beginPath();ctx.ellipse(x,y,j%3?5:7,5,j*.6,0,Math.PI*2);ctx.fill()
          if(circuit.scenery==='trees' || circuit.scenery==='snow'){
            ctx.fillStyle=circuit.scenery==='snow'?'#c7e0df':palette[3]
            ctx.beginPath();ctx.moveTo(x,y-13);ctx.lineTo(x+6,y+1);ctx.lineTo(x-6,y+1);ctx.fill()
          }
        }
      }
      ctx.beginPath();ctx.moveTo(...trackPoint(circuit,startLine))
      for(let i=1;i<96;i++)ctx.lineTo(...trackPoint(circuit,startLine+i*Math.PI/48))
      ctx.closePath()
      ctx.lineWidth=31;ctx.strokeStyle=palette[2];ctx.stroke()
      ctx.lineWidth=27;ctx.strokeStyle=palette[4];ctx.stroke()
      ctx.strokeStyle='#bdc8bf';ctx.lineWidth=1;ctx.setLineDash([4,7]);ctx.stroke();ctx.setLineDash([])
      for(let j=-3;j<=3;j++){
        const [x,y]=trackPoint(circuit,startLine,j*4)
        shade(ctx,j%2?'#f1ece3':'#373b42',x+(j%2?4:0)-2,y-2,4,4)
      }
      const car=(angle,offset,c)=>{
        const [x,y]=trackPoint(circuit,angle,offset),[nextX,nextY]=trackPoint(circuit,angle+.02,offset)
        ctx.save();ctx.translate(x,y)
        ctx.rotate(Math.atan2(nextY-y,nextX-x)+Math.PI/2)
        rounded(ctx,-6,-8,13,21,3,'#111723a0')
        for(const x of [-6,4])for(const y of [-7,5])rounded(ctx,x,y,3,5,1,'#171826')
        rounded(ctx,-5,-9,10,18,3,c);shade(ctx,'#fdf3db',-3,-8,6,1);shade(ctx,'#273440',-3,-4,6,6)
        shade(ctx,'#a0c4c8',-2,-4,4,1);shade(ctx,'#7e334d',-4,6,8,2);ctx.restore()
      }
      if(options.mode!=='trial')s.opponents.forEach((angle,j)=>car(angle+startLine,(j-.5)*14,j?'#ec9cb9':'#91cbe7'))
      car(s.theta,s.offset,carPaint[skin] || carPaint.original)
      ctx.fillStyle='#f3e8d8';ctx.font='12px system-ui';ctx.fillText('Lap '+Math.min(3,s.lap+1)+' / 3',15,23)
      ctx.fillText((s.t-s.lapAt).toFixed(2)+' s',166,23)
    },
  },
}

export function mount(host,services){
  const {id,settings}=services
  const gameModel=models[id],meta=config[id]
  const options={theme:meta.themes[0],skin:'original',mode:'classic',size:'12',level:'standard',...read('arcade-'+id,{})}
  if(!meta.themes.includes(options.theme))options.theme=meta.themes[0]
  let record=read('best-'+id,0),frame=0,previous,running=false,finished=false,state
  const canvas=node('canvas','handset-canvas')
  canvas.width=width;canvas.height=height;canvas.tabIndex=0
  canvas.setAttribute('aria-label',meta.instruction)
  const ctx=canvas.getContext('2d')
  const status=node('span','arcade-status','Ready')
  const score=node('strong','','0'),best=node('strong','',String(record))
  const heading=node('div','arcade-score')
  heading.append(node('span','','Score'),score,node('span','','Best'),best)
  const lap=id==='racing'?node('span','arcade-lap'):null
  if(lap)heading.append(lap)
  function showLapRecord(){
    if(!lap)return
    const seconds=read('lap-'+options.theme,null)
    lap.textContent=seconds?'Best lap '+seconds.toFixed(2)+'s':'No lap record yet'
  }
  const action=node('button','handset-primary',meta.action),pause=node('button','handset-secondary','Pause'),restart=node('button','handset-secondary','Restart')
  const buttons=node('div','handset-row')
  buttons.append(action,pause,restart)
  const settingsPanel=node('details','arcade-options')
  settingsPanel.append(node('summary','','Game options'))
  const select=(id,label,choices)=>{
    const row=node('label','handset-setting')
    const field=document.createElement('select')
    field.innerHTML=optionRows(choices,options[id])
    field.onchange=()=>{options[id]=field.value;store('arcade-'+services.id,options);reset()}
    row.append(node('span','',label),field);settingsPanel.append(row)
  }
  select('theme',id==='racing'?'Track':'Theme',Object.fromEntries(meta.themes.map(theme=>[theme,themes[theme][0]])))
  const skins=id==='racing'?{original:'Amber coupe',special:'Lilac touring',rally:'Jade rally',sport:'Coral sport'}:
    {original:'Original',special:id==='wings'?(record<8?'Kingfisher · unlock at 8':'Kingfisher'):'Special edition'}
  select('skin',id==='racing'?'Car finish':id==='runner'?'Player shape':'Skin',skins)
  if(id==='snake') {select('mode','Mode',{classic:'Classic',modern:'Modern obstacles'});select('size','Map size',{10:'Small',12:'Standard',16:'Large'})}
  if(id==='runner'){select('mode','Mode',{classic:'Ranked locally',practice:'Practice'});select('level','Difficulty',{relaxed:'Relaxed',standard:'Standard',expert:'Expert'})}
  if(id==='racing')select('mode','Mode',{classic:'Race against two cars',trial:'Time trial'})
  let soundtrack
  if(id==='runner'){
    const audio=node('button','handset-secondary','Runner sound off')
    audio.type='button'
    audio.setAttribute('aria-pressed','false')
    audio.onclick=()=>{
      if(!soundtrack){
        soundtrack=new Audio('/side-reel/records/shuttle.mp3')
        soundtrack.loop=true
        soundtrack.volume=(settings.phoneArcadeVolume ?? settings.phoneVolume)*.54
      }
      soundtrack.enabled=!soundtrack.enabled
      audio.textContent=soundtrack.enabled?'Runner sound on':'Runner sound off'
      audio.setAttribute('aria-pressed',String(soundtrack.enabled))
      if(soundtrack.enabled && running)soundtrack.play().catch(()=>{})
      else soundtrack.pause()
    }
    settingsPanel.append(audio)
  }
  const game={score:0,options,status:text=>{status.textContent=text},
    add(value){
      this.score+=value;score.textContent=String(this.score)
      if(settings.phoneArcadeSound)arcadeCue('point',(settings.phoneArcadeVolume ?? settings.phoneVolume))
      showLapRecord()
      if(options.mode!=='practice' && this.score>record){
        record=this.score;best.textContent=String(record);store('best-'+id,record)
      }
    },end(complete=false){
      finished=true;stop()
      if(!complete)status.textContent='Run complete'
      if(settings.phoneArcadeSound)arcadeCue('end',(settings.phoneArcadeVolume ?? settings.phoneVolume))
      action.textContent='Play again'
    }
  }
  function draw(){
    const palette=themes[options.theme],skin=id==='wings' && record<8?'original':options.skin
    if(id!=='wings')backdrop(ctx,palette,state.t,options.theme)
    else shade(ctx,palette[1],0,0,width,height)
    gameModel.draw(state,ctx,palette,skin,options)
  }
  function stop(){running=false;cancelAnimationFrame(frame);soundtrack?.pause();pause.textContent='Resume'}
  function onPause(){if(running){stop();status.textContent='Paused'}}
  function loop(time){
    if(!running)return
    const dt=Math.min(.039,(time-(previous ?? time))/1000)
    previous=time
    gameModel.tick(state,dt,game)
    draw()
    if(running)frame=requestAnimationFrame(loop)
  }
  function start(){
    if(running)return
    running=true;previous=undefined;pause.textContent='Pause';status.textContent='Playing'
    if(soundtrack?.enabled)soundtrack.play().catch(()=>{})
    frame=requestAnimationFrame(loop)
  }
  function reset(){
    stop();finished=false;game.score=0;score.textContent='0';status.textContent='Ready'
    pause.textContent='Pause';pause.disabled=true
    action.textContent=meta.action;state=gameModel.reset(options);showLapRecord();draw()
  }
  function control(key){
    if(finished)reset()
    if(!running){start();pause.disabled=false}
    if(id==='wings' && key==='Space' && settings.phoneArcadeSound)arcadeCue('action',(settings.phoneArcadeVolume ?? settings.phoneVolume))
    gameModel.act(state,key,game)
  }
  action.onclick=()=>control('Space')
  pause.onclick=()=>running?onPause():finished?reset():start()
  restart.onclick=reset
  canvas.addEventListener('keydown',event=>{
    const key=event.code==='Space'?'Space':event.key
    if(key!=='Space' && !directions[key])return
    event.preventDefault();event.stopPropagation()
    if(!event.repeat || id==='racing')control(key)
  })
  if(['snake','racing'].includes(id)){
    gesture(canvas,direction=>control('Arrow'+direction[0].toUpperCase()+direction.slice(1)))
    const pad=node('div','arcade-pad')
    for(const [key,label] of Object.entries(id==='racing'?{ArrowLeft:'Steer left',ArrowRight:'Steer right'}:
      {ArrowLeft:'Move left',ArrowUp:'Move up',ArrowDown:'Move down',ArrowRight:'Move right'})){
      const item=node('button','handset-secondary',id==='racing'?label:{ArrowLeft:'←',ArrowUp:'↑',ArrowDown:'↓',ArrowRight:'→'}[key])
      item.setAttribute('aria-label',label)
      item.onclick=()=>control(key)
      pad.append(item)
    }
    buttons.after(pad)
    host.append(heading,canvas,status,buttons,pad,settingsPanel)
  }else{
    canvas.addEventListener('pointerdown',event=>{event.preventDefault();canvas.focus({preventScroll:true});control('Space')})
    host.append(heading,canvas,status,buttons,settingsPanel)
  }
  host.append(node('p','handset-note',meta.instruction))
  const saved=services.state.run
  if(saved && JSON.stringify(saved.options)===JSON.stringify(options)){
    state=saved.state
    game.score=saved.score
    finished=saved.finished
    score.textContent=String(game.score)
    status.textContent=finished?'Run complete':'Paused'
    pause.textContent='Resume'
    if(finished)action.textContent='Play again'
    showLapRecord()
    draw()
  }else reset()
  return {pause:onPause,destroy(){
    stop()
    services.state.run=state.t || game.score?{state,score:game.score,finished,options:{...options}}:null
    store('arcade-'+id,options)
  }}
}
