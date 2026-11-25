import * as T from 'three'
import { FLOOR, HALFW, HALFD, CEILING } from './craft.js'
import { ceilingStrips, chair, glassWall, rug, shell, sofa } from './architecture.js'
import { fall, fireplace, worldStars } from './motion.js'
import { cityscape, peaks, pineValley } from './outdoors.js'

export function cabin(c,{storm=false}={}) {
  const floor=c.wood(0xb49b80,[7,7])
  const plank=c.wood(0x947459,[4,1])
  const beam=c.wood(0x583a2a,[3,1])
  const honey=c.wood(0xc3925d,[4,1])
  const stone=c.lit(0x817872,{roughness:.94})
  const mortar=c.lit(0x4f4c48)
  const iron=c.trim(0x262626)
  const linen=c.lit(0xc1ad99,{roughness:.89})
  const cream=c.emit(0xffd6a9)
  shell(c,{floor,wall:plank,ceiling:beam})
  glassWall(c,{frame:beam,panel:plank,glass:c.windowGlass(0xb9dfff,.09),columns:5,bottom:FLOOR+1.5,top:12.9})
  for(const x of [-20.05,20.05]){
    for(let i=0;i<15;i++){
      c.box(.07,.10,39,x,FLOOR+1.28*i,-.1,beam)
      c.box(.10,.17,38.6,x,FLOOR+1.28*i+.22,-.2,honey)
    }
    c.box(.34,1.02,40,x,FLOOR+.53,0,beam)
    c.box(.24,.22,40,x,FLOOR+1.07,0,honey)
  }
  for(const z of [-17,-10.2,-3.4,3.4,10.2,17]){
    c.box(40,.7,.92,0,CEILING-.52,z,honey)
    for(const x of [-19,19]) c.box(.82,CEILING-FLOOR,.91,x,(CEILING+FLOOR)/2,z,beam)
  }
  for(const x of [-12.4,0,12.4])c.box(.5,.54,40,x,CEILING-.84,0,beam)
  for(const x of [-13.8,13.8])for(const z of [-9,10]){
    c.box(.11,2.64,.11,x,CEILING-2,z,iron)
    c.softBox(.93,.83,.93,.08,x,CEILING-3.34,z,cream)
    c.box(1.1,.15,1.1,x,CEILING-2.94,z,iron)
    c.box(1.1,.15,1.1,x,CEILING-3.76,z,iron)
  }
  c.glow(0xffbe7b,310,33,-12,8,7)
  const hearthX=-14.6,hearthZ=-16.8
  c.box(8.15,11.7,.9,hearthX,FLOOR+5.82,hearthZ-1.25,mortar)
  const masonry=Array.from({length:5},(_,i)=>c.lit(new T.Color(stone.color).multiplyScalar(.78+i*.105)))
  for(let level=0;level<15;level++){
    const y=FLOOR+.41+level*.765
    for(let column=0;column<7;column++){
      const x=hearthX+(column-3)*1.12+(level%2?.12:-.12)
      if(level<6 && Math.abs(x-hearthX)<2.12)continue
      c.box(1.05,.69,.92+(c.rng()*.13),x,y,hearthZ-.67,masonry[(column+level*3)%5])
    }
  }
  c.box(8.45,.44,3.5,hearthX,FLOOR+.21,hearthZ+.83,stone)
  c.softBox(8.65,.37,1.95,.1,hearthX,FLOOR+4.73,hearthZ+.06,honey)
  c.box(4.4,4.1,.36,hearthX,FLOOR+2.34,hearthZ-1.02,iron)
  fireplace(c,hearthX,FLOOR+.45,hearthZ+.37)
  c.block(hearthX,hearthZ,8.7,4.6)
  rug(c,{width:19,depth:20,color:0x563b36,border:0xae8051})
  rug(c,{width:8.5,depth:5.3,x:12.4,z:-12,color:0x613e37,border:0xbca286})
  c.prop('carved-chair.glb',[[0,7.55,Math.PI],[0,-7.55,0],[12.9,-12.75,-Math.PI/5]],3.55)
  sofa(c,15.5,2.8,-Math.PI/2,linen,beam)
  c.softBox(2,.29,2,.09,11.9,FLOOR+1.7,1.52,honey)
  c.cylinder(.23,.34,1.62,11.9,FLOOR+.82,1.52,iron,16)
  c.cylinder(.51,.68,.62,11.9,FLOOR+2.71,1.52,cream,24)
  c.cylinder(.063,.073,.91,11.9,FLOOR+2.1,1.52,iron,10)
  const bench=c.wood(0x785137,[3,1])
  c.softBox(7.1,.39,1.75,.09,10.3,FLOOR+1.48,-18.05,bench)
  for(const side of [-1,1])c.box(.79,1.48,1.42,10.3+side*2.61,FLOOR+.74,-18.05,beam)
  peaks(c,{z:-81,height:43,width:176,depth:89,snow:!storm})
  pineValley(c)
  if(c.detail!=='low')c.prop('granite.glb',[[9,-27,.4,-4.1],[-6,-32,1.7,-4.3]],2.45)
  fall(c,{center:[0,FLOOR-2,-33],span:[55,27,25],count:320,color:storm?0xa6d2fa:0xf3faff,
    speed:storm?11:1.18,width:storm?.24:.155,style:storm?'rain':'snow'})
  if(storm){
    const lightning=c.glow(0x91baff,0,54,7,15,-14)
    c.actions.push(time=>{lightning.intensity=Math.max(0,Math.sin(time*.91))**90*(750+420*Math.sin(time*29))})
  }
}

export function penthouse(c,{apartment=false,roof=false}={}) {
  const wall=c.lit(apartment?0x3d4148:0x252c3a,{roughness:.57})
  const tile=c.lit(apartment?0x272933:0x1f2838,{roughness:.29,metalness:.34})
  const seams=c.lit(0x121923)
  const alloy=c.trim(0x475365)
  const charcoal=c.trim(0x1d2738)
  const brass=c.trim(0xb17f5a)
  const teal=c.emit(apartment?0x8aa8d8:0x48bfe9)
  const coral=c.emit(apartment?0xe3af7a:0xd85d9d)
  const ivory=c.emit(0xe2e9f4)
  shell(c,{floor:seams,wall,ceiling:charcoal},{roof:!roof,closed:!roof})
  if(!roof){
    glassWall(c,{frame:alloy,panel:charcoal,glass:c.windowGlass(0x81a9fa,.06),columns:6,bottom:FLOOR+.65,top:13.9})
    ceilingStrips(c,charcoal,ivory,'square')
  }
  for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++)c.box(3.68,.055,3.68,x*3.71,FLOOR+.029,z*3.71,tile)
  for(const x of [-18.8,18.8]){
    for(let i=0;i<10;i++) {
      const z=(i-4.5)*3.93
      c.box(.35,roof?1.02:18.9,.26,x,roof?FLOOR+.55:6.15,z,alloy)
      if (!roof) c.box(.075,12.2,.085,x*.995,6.25,z, i%3===0?teal:charcoal)
    }
    c.box(1.15,.18,39,x,FLOOR+.79,0,brass)
    c.box(.22,.075,38.3,x*.98,FLOOR+.92,0,teal)
  }
  if(!roof){
    for(const y of [-2,11.6])c.box(39,.13,.11,0,y,-19.71,teal)
    c.box(.35,5.5,10,-18.1,1.9,-10.8,charcoal)
    c.box(.16,4.8,8.9,-17.9,2.45,-10.8,wall)
    for(let i=0;i<7;i++)c.box(.08,.17,1.12,-17.76,.88+i*.48,-14+i*.79,i%2?teal:coral)
    c.glow(0x79a6ff,335,40,-11.6,6.8,-9.4)
    c.glow(0xf257a0,187,25,15.7,3.9,-14)
  }
  const leather=c.lit(apartment?0xb0977f:0x242d3b,{roughness:.39})
  sofa(c,15.1,-8.6,-Math.PI/2,leather,alloy)
  sofa(c,-14.5,8.4,Math.PI/2,c.lit(0x41506b),charcoal)
  c.prop('lounge-chair.glb',[[0,7.62,Math.PI],[0,-7.62,0],[-13.6,-13,Math.PI*.20]],3.42)
  c.softBox(4.7,.22,2.9,.08,11.2,FLOOR+1.51,-8.25,charcoal)
  for(const side of [-1,1])c.box(.19,1.48,2.43,11.2+side*1.78,FLOOR+.74,-8.25,alloy)
  const flower=c.cylinder(.43,.29,1.05,11.8,FLOOR+2.02,-8.4,brass,20)
  flower.rotation.z=.08
  cityscape(c,{warm:roof})
  if(!roof)fall(c,{center:[0,FLOOR-1,-26],span:[47,23,12],count:360,color:0x8dc4eb,speed:14,width:.27,style:'rain'})
  if(roof){
    const edge=c.trim(0x626679)
    c.box(39,.25,.34,0,FLOOR+1.4,-19.7,edge)
    c.box(39,.16,.28,0,FLOOR+.42,-19.7,edge)
  }
}

export function station(c) {
  const floor=c.lit(0x384555,{roughness:.44,metalness:.46})
  const edge=c.trim(0x7a8592)
  const graphite=c.lit(0x202832,{roughness:.51,metalness:.25})
  const panel=c.lit(0x808a94,{roughness:.56,metalness:.43})
  const cyan=c.emit(0x7cd9f8)
  const soft=c.emit(0xd2e8ff)
  const amber=c.emit(0xf0b978)
  const red=c.emit(0xd65258)
  shell(c,{floor,wall:graphite,ceiling:panel})
  glassWall(c,{frame:edge,panel:graphite,glass:c.windowGlass(0x80aee3,.063),columns:4,bottom:FLOOR+1.62,top:13.2,thickness:.85})
  for (const z of [-17.5,-12,-6.5,-1,4.5,10,15.5]){
    c.box(36,.19,.95,0,CEILING-.59,z,graphite)
    c.box(34,.085,.34,0,CEILING-.72,z,soft)
    for(const side of [-1,1]){
      c.box(.47,19,1.02,side*19.49,6,z,edge)
      const brace=c.softBox(.65,5.8,1.04,.12,side*17.6,CEILING-2.31,z,panel)
      brace.rotation.z=-side*.83
      const trim=c.softBox(.12,3.7,.25,.045,side*17.3,CEILING-2.78,z+.55,cyan)
      trim.rotation.z=-side*.83
    }
  }
  for(const x of [-19.15,19.15]){
    c.box(1.15,.92,37,x,FLOOR+.29,0,graphite)
    c.box(.48,.083,36.4,x,FLOOR+.8,0,cyan)
  }
  for(const x of [-7.7,7.7])for(let i=0;i<19;i++)c.box(.064,.018,1.23,x,FLOOR+.014,2.03*(i-9),amber)
  for(const side of [-1,1]){
    const x=side*13.9,z=-12.8
    c.softBox(5.8,1.92,2.75,.21,x,FLOOR+1.15,z,edge)
    c.softBox(5.95,.25,2.45,.12,x,FLOOR+2.22,z,graphite)
    c.softBox(5.5,.14,.24,.05,x,FLOOR+1.6,z+1.43,cyan)
    for(let i=0;i<3;i++){
      const screen=c.softBox(1.65,1.13,.16,.051,x+(i-1)*1.77,FLOOR+2.78,z-.34,graphite)
      screen.rotation.x=.54
      const overlay=c.mesh(new T.PlaneGeometry(1.46,.96),displayMaterial(side*i),x+(i-1)*1.77,FLOOR+2.74,z-.215)
      overlay.rotation.x=.54
      c.actions.push(time=>{overlay.material.uniforms.time.value=time})
    }
    for(let i=0;i<15;i++)c.box(.14,.083,.11,x+(i-7)*.29,FLOOR+2.401,z+.58,i%7===0?red:cyan)
    c.block(x,z,6,3)
  }
  const upholstery=c.lit(0x4a6076,{roughness:.79})
  chair(c,0,7.55,Math.PI,upholstery,edge)
  chair(c,0,-7.55,0,upholstery,edge)
  sofa(c,14.7,7.3,-Math.PI/2,upholstery,edge)
  const earthMap=c.texture('earth.webp')
  const earth=c.ball(17,-2.5,9,-51,c.lit(0xffffff,{map:earthMap,emissive:0xd2e4fa,emissiveMap:earthMap,emissiveIntensity:1.7,roughness:1,fog:false}),c.detail==='low'?40:68)
  earth.rotation.z=.23
  const atmosphere=c.mesh(new T.SphereGeometry(17.24,48,32),new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,
    vertexShader:`varying vec3 normalV;varying vec3 eye;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);normalV=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 normalV;varying vec3 eye;
      void main(){float edge=pow(clamp(1.-abs(dot(normalize(normalV),normalize(eye))),0.,1.),2.9);gl_FragColor=vec4(.16,.43,1.,edge*.54);}`,
  }),-2.5,9,-51)
  atmosphere.renderOrder=1
  const satellite=new T.Group()
  c.architecture.add(satellite)
  c.softBox(1.43,.76,.73,.07,0,0,0,edge,satellite)
  for(const side of [-1,1]){
    c.softBox(3.4,.093,1.15,.035,2.31*side,0,0,c.lit(0x293965,{metalness:.58}),satellite)
    c.softBox(3.3,.035,.12,.015,2.31*side,.058,0,cyan,satellite)
  }
  c.actions.push(time=>{
    earth.rotation.y=-.88+time*.022
    satellite.position.set(-12+Math.sin(time*.16)*14,10+Math.sin(time*.24)*3,-34+Math.cos(time*.16)*4)
    satellite.rotation.set(.28,time*.27,-.18)
  })
  worldStars(c)
  c.glow(0x6eb9ff,330,38,0,7,-13)
}

export function displayMaterial(phase=0) {
  return new T.ShaderMaterial({
    uniforms:{time:{value:0},phase:{value:phase}},
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float time,phase;varying vec2 v;
      void main(){
        float line=1.-smoothstep(.013,.026,abs(v.y-.48-sin(v.x*20.+time+phase)*.19-sin(v.x*48.-time*.7)*.072));
        float grid=max(step(.965,fract(v.x*12.)),step(.956,fract(v.y*8.)));
        float scan=pow(smoothstep(.68,1.,fract(v.x-time*.12)),4.);
        gl_FragColor=vec4(vec3(.015,.065,.13)+grid*vec3(.025,.10,.15)+line*vec3(.23,.74,.91)+scan*.13,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}
