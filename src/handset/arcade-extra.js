import {games} from './game-catalog.js'
import {node,read,store} from './shared.js'

const w=252,h=300
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
const dist=(x,y,a,b)=>Math.hypot(x-a,y-b)
const between=(n,min,max)=>n>=min && n<=max
const colors=['#eb6d88','#79dfce','#efba66','#96aaf4']
const palettes={
  pong:['#0a2837','#26717e','#b4ecf4'],breaker:['#321e2e','#78445a','#ffa477'],golf:['#174338','#438d6e','#dccd8c'],
  dodge:['#221b45','#594584','#c6b0ff'],basket:['#442737','#96533f','#f0a467'],skate:['#503032','#9e5c59','#ffbf9a'],
  builder:['#272541','#545b86','#d6bdf4'],color:['#26233f','#61537e','#f1bfd5'],flight:['#12283e','#345878','#94c9eb'],
  bowling:['#352735','#865965','#edc98d'],platform:['#223d43','#4c6c62','#bad498'],
}
const rules={
  pong:['Deflect the ball. First to seven points wins.','←','→','Serve'],
  breaker:['Move your paddle and clear all 24 bricks.','←','→','Launch'],
  golf:['Aim with the arrows or tap a target. Hold Putt to charge.','Aim left','Aim right','Putt'],
  dodge:['Dodge incoming debris. Collect the gold energy cells.','←','→','Start'],
  basket:['Tap an aim point or adjust the angle. Hold Shoot for power.','Aim left','Aim right','Shoot'],
  skate:['Jump the barricades and collect gallery tokens.','←','→','Jump'],
  builder:['Stop each swinging floor over the building.','←','→','Place floor'],
  color:['Match your orb to the approaching gate.','Previous colour','Next colour','Start'],
  flight:['Steer between drones. Fire to clear your path.','←','→','Fire'],
  bowling:['Aim along the lane. Hold Roll to adjust power.','Aim left','Aim right','Roll'],
  platform:['Move across three zones and reach the marked exit.','←','→','Jump'],
}
function fill(ctx,x,y,w,h,color,r=0){
  ctx.fillStyle=color
  if(!r){ctx.fillRect(x,y,w,h);return}
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()
}
function circle(ctx,x,y,r,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()
}
function line(ctx,a,b,x,y,color,weight=1){
  ctx.strokeStyle=color;ctx.lineWidth=weight
  ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(x,y);ctx.stroke()
}
function type(ctx,text,x,y,color='#fff1dc',font='700 12px system-ui',align='left'){
  ctx.fillStyle=color;ctx.font=font;ctx.textAlign=align;ctx.fillText(text,x,y)
}
function heading(ctx,id,rule,phase){
  const [base,mid,ink]=palettes[id]
  const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,base);grad.addColorStop(1,'#101828')
  fill(ctx,0,0,w,h,grad)
  type(ctx,games[id][0].toUpperCase(),12,19,ink,'700 8px monospace')
  type(ctx,rule,w-12,19,ink,'700 8px monospace','right')
  if(['flight','dodge','color'].includes(id)){
    for(let i=0;i<40;i++){
      const y=27+((i*42.73+phase*(10+i%13))%260),x=(i*51.31)%w
      circle(ctx,x,y,i%4===0?1.4:.65,i%5===0?ink:mid)
    }
  }
  return {base,mid,ink}
}
function result(game,message){
  game.message=message
  game.final=true
}
function arena(id){
  const paddle=43
  return {
    setup:()=>({t:0,p:104,a:102,x:126,y:235,vx:66,vy:-135,busy:false,hits:0,opponent:0,lives:3,
      bricks:Array.from({length:24},(_,i)=>({x:13+i%6*38,y:51+Math.floor(i/6)*19,tint:Math.floor(i/6)}))}),
    act(s,side){if(side===0 && !s.busy){s.busy=true;s.x=s.p+22;s.y=237;s.vy=-139;s.vx=62}},
    tick(s,dt,key,g){
      s.p=clamp(s.p+key*220*dt,7,w-paddle-7)
      if(!s.busy){s.x=s.p+22;return}
      if(id==='pong')s.a=clamp(s.a+clamp(s.x-22-s.a,-72*dt,72*dt),6,w-paddle-6)
      const old=s.y
      s.x+=s.vx*dt;s.y+=s.vy*dt
      if(s.x<8 || s.x>w-8){s.x=clamp(s.x,8,w-8);s.vx*=-1}
      if(s.vy>0 && old<251 && s.y>=251 && between(s.x,s.p-4,s.p+paddle+4)){
        s.vy=-Math.min(250,s.vy+13);s.vx=(s.x-s.p-21)*6
      }
      if(id==='breaker'){
        if(s.y<31){s.y=31;s.vy=Math.abs(s.vy)}
        const hit=s.bricks.findIndex(item=>between(s.x,item.x-4,item.x+37) && between(s.y,item.y-5,item.y+15))
        if(hit>=0){s.bricks.splice(hit,1);s.vy*=-1;g.add(10)}
        if(!s.bricks.length)result(g,'All 24 bricks cleared')
      }else if(s.vy<0 && old>43 && s.y<=43 && between(s.x,s.a-3,s.a+paddle+3)){
        s.vy=Math.min(250,Math.abs(s.vy)+8);s.vx=(s.x-s.a-21)*5.7
      }else if(s.y<29){
        g.add(1);s.y=238;s.busy=false
        if(g.score===7)result(g,'Match won')
      }
      if(s.y>269){
        s.y=237;s.busy=false
        if(id==='pong'){
          if(++s.opponent===7)result(g,'CPU wins · '+g.score+'–7')
        }else if(--s.lives===0)result(g,'Out of balls')
      }
    },
    draw(ctx,s,palette,g){
      const {ink,mid}=palette
      ctx.strokeStyle=mid;ctx.strokeRect(5,30,w-10,237)
      if(id==='breaker'){
        for(const brick of s.bricks){
          fill(ctx,brick.x,brick.y,34,13,colors[brick.tint],2)
          fill(ctx,brick.x+2,brick.y+2,30,2,'#ffffff63',1)
        }
        type(ctx,'BALLS '+s.lives,13,288,ink,'700 9px monospace')
      }else{
        ctx.setLineDash([5,6]);line(ctx,8,149,w-8,149,mid);ctx.setLineDash([])
        fill(ctx,s.a,34,paddle,7,'#ee8ca3',3)
        type(ctx,g.score+'  /  '+s.opponent,w/2,138,ink,'900 24px monospace','center')
      }
      fill(ctx,s.p,254,paddle,8,ink,3)
      circle(ctx,s.x,s.y,5,'#fff2c7');circle(ctx,s.x-1,s.y-1,2,'#ffffff')
      if(!s.busy)type(ctx,id==='breaker'?'READY TO LAUNCH':'READY TO SERVE',w/2,228,ink,'700 9px monospace','center')
    },
  }
}
const courses=[{hole:[126,67],sand:[[157,143,44,37]],walls:[[67,111,43,10]]},
  {hole:[195,57],sand:[[143,183,62,34]],walls:[[99,91,79,11],[69,174,9,40]]},
  {hole:[54,58],sand:[[45,144,46,31],[172,174,46,30]],walls:[[77,114,114,11],[96,203,50,10]]}]
function targetGame(id){
  const golf=id==='golf',basket=id==='basket'
  const reset=(round=0)=>({round,t:0,x:126,y:247,vx:0,vy:0,angle:0,spin:0,active:false,charge:0,
    pins:Array.from({length:10},(_,i)=>({x:108+i%4*12,y:76+Math.floor(i/4)*13,up:true})),attempts:0})
  return {
    setup:()=>reset(),
    aim(s,x,y){
      if(s.active)return
      if(basket){s.angle=clamp(Math.asin(clamp((x-s.x)/340,-.75,.75)),-.75,.75);return}
      s.angle=clamp(Math.atan2(x-s.x,Math.max(20,s.y-y)),-.75,.75)
    },
    act(s,side,g,power=.43){
      if(side || s.active)return
      if(basket && s.attempts>=8)return
      s.attempts++
      const launch=golf?130+power*200:basket?227+power*139:173+power*130
      s.vx=Math.sin(s.angle)*launch;s.vy=-Math.cos(s.angle)*launch;s.active=true;s.spin=0
    },
    tick(s,dt,key,g){
      if(!s.active){s.angle=clamp(s.angle+key*.88*dt,-.74,.74);return}
      const lastY=s.y
      s.spin+=dt
      s.x+=s.vx*dt;s.y+=s.vy*dt
      if(s.x<24 || s.x>w-24){s.x=clamp(s.x,24,w-24);s.vx*=-.72}
      if(golf){
        const course=courses[s.round]
        if(course.walls.some(([x,y,a,b])=>between(s.x,x-4,x+a+4) && between(s.y,y-4,y+b+4))){
          s.y=lastY;s.vy*=-.72
        }
        if(s.y<39 || s.y>270){s.y=clamp(s.y,39,270);s.vy*=-.85}
        const drag=course.sand.some(([x,y,a,b])=>((s.x-x)/a)**2+((s.y-y)/b)**2<1)?4.6:1.25
        s.vx*=Math.exp(-drag*dt);s.vy*=Math.exp(-drag*dt)
        if(dist(s.x,s.y,...course.hole)<10 && Math.hypot(s.vx,s.vy)<180){
          g.add(Math.max(5,60-s.attempts*5))
          if(s.round===courses.length-1)result(g,'Three holes complete')
          else Object.assign(s,reset(s.round+1))
        }else if(Math.hypot(s.vx,s.vy)<7)s.active=false
      }else if(basket){
        s.vy+=359*dt
        if(s.vy>0 && lastY<=129 && s.y>129 && between(s.x,136,177)){
          g.add(2);s.y=290
        }
        if(s.y>274 || s.y<31){
          s.x=126;s.y=247;s.active=false
          if(s.attempts===8)result(g,'Eight shots complete')
        }
      }else{
        for(const pin of s.pins)if(pin.up && dist(pin.x,pin.y,s.x,s.y)<13){pin.up=false;g.add(1)}
        if(s.y<48){
          if(s.attempts===2 || s.pins.every(pin=>!pin.up)){
            if(s.round===2)result(g,'Three frames complete')
            else Object.assign(s,reset(s.round+1))
          }else {s.x=126;s.y=247;s.active=false}
        }
      }
    },
    draw(ctx,s,p){
      const {ink,mid}=p
      if(golf){
        const course=courses[s.round]
        fill(ctx,16,34,220,242,'#285b4a',11)
        for(let x=18;x<234;x+=20)fill(ctx,x,39,10,231,'#83ad6933')
        for(const [x,y,a,b] of course.sand){
          ctx.fillStyle='#c4ab7c';ctx.beginPath();ctx.ellipse(x,y,a,b,0,0,Math.PI*2);ctx.fill()
        }
        for(const wall of course.walls)fill(ctx,...wall,'#e9cf9c',3)
        circle(ctx,...course.hole,8,'#0b1924')
        const [x,y]=course.hole
        line(ctx,x,y,x,y-26,ink,2);line(ctx,x,y-25,x+13,y-21,ink,4)
        type(ctx,'HOLE '+(s.round+1)+'  ·  '+s.attempts+' STROKES',12,290,ink,'700 8px monospace')
      }else if(basket){
        for(let y=206;y<275;y+=14)line(ctx,8,y,244,y,mid,2)
        for(let x=15;x<250;x+=19)line(ctx,x,46,x,204,'#ff9e6b18')
        fill(ctx,143,93,55,35,'#ced0d4',4);fill(ctx,155,101,23,18,'#955947',4)
        line(ctx,135,128,179,128,'#f28655',4)
        for(let i=0;i<7;i++)line(ctx,136+i*7,130,145+i*4,149,'#e0cff2',.9)
        type(ctx,'SHOT '+s.attempts+' / 8',12,289,ink,'700 9px monospace')
      }else{
        fill(ctx,27,44,198,230,'#c98f68',6)
        for(let x=32;x<222;x+=13)line(ctx,x,48,x,271,(x%2?'#f0bc89':'#d68e63'))
        for(const pin of s.pins){
          fill(ctx,pin.x-3,pin.y-7,6,pin.up?13:2,pin.up?'#fff3df':'#b05d65',3)
          if(pin.up)line(ctx,pin.x-3,pin.y-3,pin.x+3,pin.y-3,'#d76c72',2)
        }
        type(ctx,'FRAME '+(s.round+1)+'  ·  BALL '+Math.min(2,s.attempts+1),12,289,ink,'700 8px monospace')
      }
      if(!s.active){
        for(let k=1;k<9;k++)circle(ctx,s.x+Math.sin(s.angle)*k*9,s.y-Math.cos(s.angle)*k*9,1.2,ink)
      }
      circle(ctx,s.x+2,s.y+3,golf?5:9,'#151b2a99')
      circle(ctx,s.x,s.y,golf?5:8,golf?'#fff5cb':basket?'#f29a52':'#6c355f')
      if(!golf)line(ctx,s.x-6,s.y+2,s.x+6,s.y-2,'#eeaf94',1.2)
    },
  }
}
function airborne(id){
  const shooter=id==='flight',match=id==='color'
  return {
    setup:()=>({t:0,x:126,index:0,xAim:null,rocks:[],bullets:[],time:0,spawn:.78,pulse:0,shot:0}),
    aim(s,x){if(!match)s.xAim=x},
    act(s,side){
      if(match && side)s.index=(s.index+side+colors.length)%colors.length
      if(shooter && !side && s.shot<=0){s.bullets.push({x:s.x,y:239});s.shot=.23}
    },
    tick(s,dt,key,g){
      if(!match){
        if(key){s.xAim=null;s.x=clamp(s.x+key*180*dt,16,w-16)}
        if(s.xAim!==null)s.x+=clamp(s.xAim-s.x,-200*dt,200*dt)
        s.shot-=dt
      }
      s.spawn-=dt
      if(s.spawn<0){
        const wave=Math.floor(s.t*17)
        s.rocks.push({x:23+((wave*69+97)%207),y:32,type:wave%4,gift:!match && wave%8===0})
        s.spawn=Math.max(.39,(match?1.65:.88)-g.score*.007)
      }
      for(const bullet of s.bullets)bullet.y-=330*dt
      for(const rock of s.rocks){
        rock.y+=(match?92:98+Math.min(g.score*4,76))*dt
        const shot=s.bullets.find(bullet=>!bullet.dead && dist(bullet.x,bullet.y,rock.x,rock.y)<16)
        if(shot && !rock.gift){rock.dead=shot.dead=true;g.add(2);continue}
        if(match && rock.y>=246 && !rock.done){
          rock.done=true
          if(rock.type===s.index){g.add(1);s.pulse=.25}
          else result(g,'Wrong gate · '+g.score+' matched')
        }else if(!match && dist(s.x,251,rock.x,rock.y)<17){
          rock.dead=true
          if(rock.gift){g.add(3);s.pulse=.25}
          else result(g,id==='dodge'?'Dodge run complete':'Flight complete')
        }else if(!match && rock.y>280 && !rock.done){rock.done=true;g.add(1)}
      }
      s.pulse-=dt
      s.bullets=s.bullets.filter(bullet=>!bullet.dead && bullet.y>27)
      s.rocks=s.rocks.filter(rock=>!rock.dead && rock.y<310)
    },
    draw(ctx,s,p){
      if(match){
        for(const rock of s.rocks){
          line(ctx,29,rock.y,w-29,rock.y,colors[rock.type],8)
          circle(ctx,29,rock.y,5,'#fff1e3');circle(ctx,w-29,rock.y,5,'#fff1e3')
        }
        if(s.pulse>0)circle(ctx,126,251,18+s.pulse*16,colors[s.index]+'55')
        circle(ctx,126,251,13,colors[s.index]);circle(ctx,122,247,3,'#fff0e5')
      }else{
        for(const bullet of s.bullets)fill(ctx,bullet.x-1,bullet.y-8,3,12,p.ink,2)
        for(const rock of s.rocks){
          if(rock.gift){
            fill(ctx,rock.x-6,rock.y-6,12,12,'#f3c574',3);circle(ctx,rock.x,rock.y,2,'#ffedba')
          }else{
            circle(ctx,rock.x,rock.y,11,colors[rock.type]);circle(ctx,rock.x+3,rock.y-3,4,'#192640')
            if(shooter)line(ctx,rock.x-13,rock.y+2,rock.x+13,rock.y+2,'#342b53',4)
          }
        }
        type(ctx,'▲',s.x,263,p.ink,'900 30px system-ui','center')
        fill(ctx,s.x-2,264,4,7+Math.sin(s.t*25)*3,'#fca588',2)
      }
    },
  }
}
const levels=[
  [[47,223,52],[113,186,45],[178,151,52],[114,114,43],[32,79,54]],
  [[156,220,45],[98,188,45],[36,156,44],[100,121,41],[174,86,51]],
  [[108,223,42],[177,186,41],[113,149,41],[42,116,49],[108,85,47],[172,52,57]],
]
function platformer(id){
  const skate=id==='skate'
  return {
    setup:()=>({t:0,x:skate?58:119,y:252,vy:0,ground:true,level:0,travel:0,objects:[],spawn:1.35,flags:new Set()}),
    act(s,side){if(!side && s.ground){s.vy=-245;s.ground=false}},
    tick(s,dt,key,g){
      const previous=s.y
      s.vy+=590*dt;s.y+=s.vy*dt
      s.x=clamp(s.x+key*(skate?96:126)*dt,9,w-9)
      if(s.y>=252){
        s.y=252;s.vy=0;s.ground=true
      }
      if(skate){
        s.travel+=dt*91
        s.spawn-=dt
        if(s.spawn<0){s.objects.push({x:w+12,token:Math.floor(s.t*10)%3===0});s.spawn=1.43}
        for(const item of s.objects){
          item.x-=(108+Math.min(50,g.score*3))*dt
          const y=item.token?208:241
          if(Math.abs(s.x-item.x)<15 && dist(s.x,s.y-8,item.x,y)<19 && !item.done){
            item.done=true
            if(item.token)g.add(3)
            else result(g,'Courier run complete')
          }
          if(!item.done && item.x<s.x-18){item.done=true;if(!item.token)g.add(1)}
        }
        s.objects=s.objects.filter(item=>item.x>-20)
        return
      }
      if(s.vy>0 && s.y<252){
        const block=levels[s.level].find(([x,y,length])=>between(s.x,x-3,x+length+3) && previous<=y && s.y>=y)
        if(block){
          s.y=block[1];s.vy=0;s.ground=true
          const key=s.level+'-'+block[0]+'-'+block[1]
          if(!s.flags.has(key)){g.add(1);s.flags.add(key)}
          if(block===levels[s.level].at(-1)){
            if(s.level===levels.length-1)result(g,'All three zones cleared')
            else {s.level++;s.x=126;s.y=252}
          }
        }else s.ground=false
      }
    },
    draw(ctx,s,p){
      const {mid,ink}=p
      for(let i=0;i<10;i++){
        const x=(i*42-(s.travel*.29%42))-20,a=22+(i*17)%49
        fill(ctx,x,235-a,34,a,mid,3)
        for(let j=0;j<3;j++)fill(ctx,x+4+j*10,246-a,4,6,'#fff1b74a')
      }
      fill(ctx,0,256,w,42,'#27323a')
      for(let i=0;i<10;i++)fill(ctx,(i*32-s.travel%32)-15,269,17,2,ink+'74')
      if(skate){
        for(const item of s.objects){
          if(item.token){
            if(!item.done){circle(ctx,item.x,207,8,'#ebb376');type(ctx,'+',item.x,211,'#562b44',undefined,'center')}
          }else{
            fill(ctx,item.x-10,236,20,20,'#eb8a67',2);line(ctx,item.x-9,250,item.x+8,239,'#fae1b8',4)
          }
        }
      }else{
        for(const [x,y,length] of levels[s.level]){
          fill(ctx,x,y,length,9,mid,2);fill(ctx,x,y,length,3,ink,1)
        }
        const [x,y,a]=levels[s.level].at(-1)
        line(ctx,x+a-8,y,x+a-8,y-16,ink,2)
        fill(ctx,x+a-7,y-17,13,7,'#f1bf84',2)
        type(ctx,'ZONE '+(s.level+1)+' / 3',13,290,ink,'700 9px monospace')
      }
      circle(ctx,s.x,s.y-21,8,ink);fill(ctx,s.x-6,s.y-15,12,13,skate?'#ec8ba6':'#f1cb80',3)
      if(skate){line(ctx,s.x-13,s.y-1,s.x+13,s.y-1,ink,3);circle(ctx,s.x-7,s.y+3,2,'#f2ddd6');circle(ctx,s.x+8,s.y+3,2,'#f2ddd6')}
    },
  }
}
const builder={
  setup:()=>({t:0,x:126,stack:[{x:126,w:94}],swing:0,w:89}),
  act(s,side,g){
    if(side)return
    const parent=s.stack.at(-1),overlap=(parent.w+s.w)/2-Math.abs(parent.x-s.x)
    if(overlap<17){result(g,'Floor missed the supports');return}
    const dx=s.x-parent.x
    const aligned=Math.abs(dx)<7
    s.stack.push({x:aligned?parent.x:(parent.x+s.x)/2,w:Math.max(26,Math.min(s.w,overlap))})
    g.add(aligned?3:1);s.w=Math.max(25,s.stack.at(-1).w-2);s.swing+=1.28
    if(s.stack.length>=15)result(g,'Skyline complete')
  },
  tick(s,dt,key){s.swing+=dt*1.9;s.x=126+Math.sin(s.swing)*74+key*6},
  draw(ctx,s,p){
    const depth=s.stack.length
    const y=level=>264-13*level+Math.max(depth-9,0)*13
    for(let i=0;i<8;i++){
      const x=13+i*32,top=171+i*17%50
      fill(ctx,x,top,26,286-top,p.mid+'66',2)
      for(let z=top+7;z<276;z+=14)fill(ctx,x+7,z,4,3,p.ink+'62')
    }
    for(const [i,part] of s.stack.entries()){
      fill(ctx,part.x-part.w/2,y(i),part.w,12,colors[i%colors.length],2)
      fill(ctx,part.x-part.w/2+3,y(i)+3,part.w-6,2,'#ffffff45',1)
    }
    const top=y(depth)
    line(ctx,126,31,s.x,top,p.ink+'a2',2)
    fill(ctx,s.x-s.w/2,top,s.w,12,'#fad8a3',3)
    type(ctx,'FLOOR '+depth+' / 15',13,291,p.ink,'700 9px monospace')
  },
}
const factories={pong:arena,breaker:arena,golf:targetGame,basket:targetGame,bowling:targetGame,
  dodge:airborne,flight:airborne,color:airborne,skate:platformer,platform:platformer,builder:()=>builder}

export function mount(host,{id,state,settings}){
  const model=factories[id](id)
  const [instruction,leftLabel,rightLabel,actionLabel]=rules[id]
  const score=node('strong'),best=node('strong'),status=node('p','arcade-status','Ready')
  status.setAttribute('role','status')
  const hud=node('div','extra-hud');hud.append(node('span','','Score'),score,node('span','','Best'),best)
  const canvas=node('canvas','handset-canvas extra-canvas')
  canvas.width=w;canvas.height=h;canvas.tabIndex=0;canvas.setAttribute('aria-label',games[id][0]+' playfield')
  const ctx=canvas.getContext('2d')
  const instructions=node('p','handset-note',instruction)
  const controls=node('div','extra-controls')
  const left=node('button','handset-secondary',leftLabel),right=node('button','handset-secondary',rightLabel)
  const action=node('button','handset-primary',actionLabel)
  const pause=node('button','handset-secondary','Pause'),restart=node('button','handset-secondary','Restart')
  const footer=node('div','handset-row');footer.append(pause,restart)
  controls.append(left,action,right)
  const game={score:state.score || 0,best:read('best-'+id,0),final:false,message:'',
    add(points){
      game.score+=points
      if(game.score>game.best){game.best=game.score;store('best-'+id,game.best)}
      score.textContent=String(game.score);best.textContent=String(game.best)
    },
  }
  let session=state.session || model.setup(),running=false,frame,previous,motion=0,pressed,actionTime
  const chargeGame=['golf','basket','bowling'].includes(id)
  const noMovement=id==='builder'
  if(noMovement){left.hidden=true;right.hidden=true}
  function draw(){
    const palette=heading(ctx,id,running?'LIVE RUN':game.final?'RESULT':'READY',session.t)
    model.draw(ctx,session,palette,game)
  }
  function stop(message='Paused'){
    running=false;motion=0;cancelAnimationFrame(frame);pause.textContent='Resume';status.textContent=message
  }
  function loop(time){
    if(!running)return
    const dt=Math.min(.04,(time-(previous ?? time))/1000)
    previous=time
    session.t+=dt
    model.tick(session,dt,motion,game)
    draw()
    if(game.final){stop(game.message);action.textContent='Play again';pause.disabled=true;return}
    frame=requestAnimationFrame(loop)
  }
  function start(){
    if(running)return
    running=true;pause.disabled=false;pause.textContent='Pause';status.textContent='Playing';previous=undefined
    frame=requestAnimationFrame(loop)
  }
  function reset(){
    stop('Ready');pause.disabled=true;pause.textContent='Pause'
    game.final=false;game.score=0;session=model.setup();action.textContent=actionLabel
    score.textContent='0';draw()
  }
  function activate(power){
    if(game.final)reset()
    start()
    model.act(session,0,game,power)
    if(id==='flight' && !settings.phoneReduced)canvas.focus({preventScroll:true})
  }
  function shift(direction){
    if(game.final)return
    start();motion=direction
    model.act(session,direction,game)
  }
  function bindDirection(button,side){
    button.onpointerdown=event=>{button.setPointerCapture(event.pointerId);pressed=true;shift(side)}
    button.onpointerup=()=>{motion=0}
    button.onpointercancel=()=>{motion=0;pressed=false}
    button.onclick=()=>{if(pressed){pressed=false;return}shift(side);motion=0}
  }
  bindDirection(left,-1);bindDirection(right,1)
  canvas.onpointerdown=event=>{
    if(game.final)return
    const area=canvas.getBoundingClientRect(),x=(event.clientX-area.left)/area.width*w,y=(event.clientY-area.top)/area.height*h
    canvas.focus({preventScroll:true})
    if(model.aim){model.aim(session,x,y);draw()}
    else if(['builder','skate','platform'].includes(id))activate()
    else {const direction=x<w/2?-1:1;shift(direction);setTimeout(()=>{if(motion===direction)motion=0},140)}
  }
  canvas.onpointermove=event=>{
    if(!event.buttons || !model.aim || chargeGame || game.final)return
    const area=canvas.getBoundingClientRect()
    model.aim(session,clamp((event.clientX-area.left)/area.width*w,11,w-11),0)
  }
  action.onpointerdown=()=>{actionTime=performance.now()}
  action.onclick=()=>{
    const amount=actionTime===undefined?.46:clamp((performance.now()-actionTime)/950,.24,1)
    actionTime=undefined;activate(amount)
  }
  host.onkeydown=event=>{
    if(![canvas,host].includes(event.target))return
    if(event.code==='Space' || ['ArrowLeft','ArrowRight','ArrowUp'].includes(event.key)){
      event.preventDefault();event.stopPropagation()
      if(event.code==='Space' || event.key==='ArrowUp'){if(!event.repeat)activate();return}
      if(!event.repeat || id!=='color')shift(event.key==='ArrowLeft'?-1:1)
    }
  }
  host.onkeyup=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key))motion=0}
  host.onfocusout=()=>{motion=0}
  pause.onclick=()=>running?stop():start();restart.onclick=reset
  score.textContent=String(game.score);best.textContent=String(game.best)
  pause.disabled=!state.session
  if(state.session){status.textContent='Paused';pause.textContent='Resume'}
  host.append(hud,canvas,controls,status,footer,instructions);draw()
  return {pause(){if(running)stop()},destroy(){
    if(running)stop()
    state.session=game.final?null:session
    state.score=game.final?0:game.score
    host.onkeydown=host.onkeyup=host.onfocusout=null
  }}
}
