import * as T from 'three'
import { CEILING, FLOOR } from './craft.js'
import { arch, ceilingStrips, chair, columns, glassWall, plant, rug, shell, sofa } from './architecture.js'
import { fall, fireplace, water, worldStars } from './motion.js'
import { cityscape, oceanBackdrop, peaks, pineValley } from './outdoors.js'
import { cabin, displayMaterial, penthouse } from './priority.js'

function cloth(c,w,h,x,y,z,color) {
  const geo=new T.PlaneGeometry(w,h,15,14)
  const mat=c.lit(color,{side:T.DoubleSide,roughness:.91})
  const flag=c.mesh(geo,mat,x,y,z)
  const p=geo.attributes.position
  const original=new Float32Array(p.array)
  c.actions.push(time=>{
    for(let i=0;i<p.count;i++){
      const [x,y]=original.subarray(i*3,i*3+2)
      const loose=.22+(.5-y/h)*.65
      p.setZ(i,Math.sin(time*1.62+x*1.25+y*.16)*loose*.24)
    }
    p.needsUpdate=true
  })
  return flag
}

function lounge(c,{metal=false,soft=0x485d6d}={}) {
  const frame=metal?c.trim(0x6c7682):c.wood(0x78563a)
  const fabric=c.lit(soft,{roughness:.79})
  chair(c,0,7.72,Math.PI,fabric,frame)
  chair(c,0,-7.72,0,fabric,frame)
  return [fabric,frame]
}

function royal(c) {
  const floor=c.lit(0x53504b,{roughness:.88})
  const wall=c.lit(0x666164)
  const rib=c.lit(0x8e8580)
  const brass=c.trim(0xa3814f)
  const gold=c.emit(0xe8ac60)
  shell(c,{floor,wall})
  glassWall(c,{frame:rib,panel:wall,glass:c.windowGlass(0x778ca6,.16),columns:4,bottom:0,top:11.3})
  columns(c,{count:6,body:wall,base:rib,height:11.5,z:-19.4})
  for(const x of [-15.5,-7.72,0,7.72,15.5]){
    arch(c,x,9,-18.9,3.42,.85,rib)
    if(x!==0){
      c.box(3.6,.14,.17,x,12.39,-18.1,brass)
      cloth(c,2.8,5.7,x,9.54,-18,0x61253c)
    }
  }
  for(const x of [-19.8,19.8]) {
    for(let i=0;i<12;i++){
      c.box(.12,.12,39,x,FLOOR+.77+i*1.51,wall)
      for(let j=0;j<18;j++) c.box(.10,1.29,1.92,x,FLOOR+.75+i*1.51,(j-8.5)*2.2+i%2*.56,i%4===0?rib:wall)
    }
  }
  for(const z of [-10.7,3.5]) {
    for(const x of [-18.8,18.8]){
      c.cylinder(.11,.18,1.33,x,3.0,z,brass,12)
      c.cylinder(.35,.19,.15,x,3.65,z,brass,16)
      c.ball(.15,x,3.76,z,gold,14)
      const light=c.glow(0xffa348,150,17,x,4,z)
      c.actions.push(time=>{light.intensity=134+18*Math.sin(time*7+x)})
    }
  }
  rug(c,{width:16,depth:18,color:0x593049,border:0xa08962})
  sofa(c,13.5,-8.4,-Math.PI/2,c.lit(0x653447),c.wood(0x47322c))
  c.prop('carved-chair.glb',[[0,-7.7,0],[0,7.7,Math.PI]],3.5)
  peaks(c,{z:-73,snow:false,height:21,depth:75})
}

function gardens(c,kind) {
  const garden=kind==='garden'
  const marble=kind==='courtyard'
  const floor=garden?c.wood(0x9a7852,[6,6]):c.lit(marble?0xc5b5a4:0x677358,{roughness:.82})
  const frame=garden?c.wood(0x774931):c.lit(marble?0xd3c2ac:0x67564a)
  const edge=garden?c.lit(0x50554d):c.lit(marble?0xa19182:0x48423e)
  shell(c,{floor,wall:frame},{closed:false})
  const soil=c.lit(garden?0x526749:marble?0x71956c:0x42624b)
  c.box(110,.52,110,0,FLOOR-.85,-14,soil)
  for(const x of [-16,16])for(const z of [-16,16]){
    c.box(.62,15.4,.62,x,FLOOR+7.7,z,frame)
    c.box(1.16,.42,1.16,x,FLOOR+.2,z,edge)
  }
  if(!marble){
    for(const x of [-16,16])c.box(.65,.44,35,x,12.4,0,frame)
    for(let i=0;i<10;i++){
      const z=-19+i*4.23
      c.box(36,.42,.58,0,12.6,z,frame)
      c.box(36,.11,.25,0,12.34,z,edge)
    }
  }
  if(garden || marble){
    const pondX=garden?11.3:0, pondZ=-15.15
    const rim=marble?c.lit(0xae9b8a):edge
    if(marble){
      c.cylinder(4.29,4.48,.43,pondX,FLOOR+.16,pondZ,rim,56)
      c.ring(4.15,.18,pondX,FLOOR+.45,pondZ,rim,Math.PI/2)
      c.cylinder(.28,.86,2.1,pondX,FLOOR+1.1,pondZ,rim)
      c.cylinder(1.5,.61,.27,pondX,FLOOR+2.25,pondZ,rim)
      fall(c,{center:[pondX,FLOOR+.4,pondZ],span:[1.4,4,1.4],count:93,color:0xa9e6f7,speed:2.9,width:.11})
      columns(c,{count:7,body:frame,base:rim,z:-19,height:13.8,rad:.66})
    }else{
      c.box(12.7,.19,6.85,pondX,FLOOR+.08,pondZ,rim)
      c.box(12.6,.14,.25,pondX,FLOOR+.25,pondZ-3.37,edge)
      c.box(12.6,.14,.25,pondX,FLOOR+.25,pondZ+3.37,edge)
    }
    const surface=water(c,{width:marble?8.17:12.1,depth:marble?8.17:6.32,x:pondX,y:FLOOR+.36,z:pondZ,tint:0x365e5a,flow:.65})
    if(marble){
      surface.geometry.dispose()
      surface.geometry=new T.CircleGeometry(4.05,70).rotateX(-Math.PI/2)
    } else{
      swim(c,{x:pondX,y:FLOOR+.47,z:pondZ,count:6,radius:2.3,koi:true})
    }
    c.block(pondX,pondZ,marble?8.3:12.6,marble?8.3:6.6)
  }
  for(let i=0;i<(kind==='forest'?35:13);i++){
    const x=(i%8-3.5)*7.2+(c.rng()-.5)*2
    const z=-23-Math.floor(i/8)*5.5-c.rng()*8
    plant(c,x,z,1.3+c.rng()*1.55,garden && i%5===0?'blossom':'tree')
  }
  if(garden){
    for(const x of [-17.6,-14.4,16.8])plant(c,x,-19.3,1.49,'bamboo')
    const gravel=c.lit(0x9d9782,{roughness:.96})
    const pavers=c.lit(0x65675f,{roughness:.88})
    c.box(34,.11,10.2,0,FLOOR-.055,-25.6,gravel)
    for(let i=0;i<10;i++){
      const step=c.mesh(new T.CylinderGeometry(.81,.89,.12,10),pavers,Math.sin(i*.88)*1.56,FLOOR+.035,-17.4-i*1.4)
      step.scale.z=.74
      step.rotation.y=i*.41
    }
    if(c.detail!=='low'){
      c.prop('moss-rocks.glb',[[-11.2,-17.5,1.2],[-13.6,-26.7,-.56]],1.22)
      c.prop('fern.glb',[[-7.8,-16.5,.5],[17.8,-13.6,2],[-15.9,-19.8,1.1]],1.22)
    }
  }
  fall(c,{center:[-5,FLOOR,-17],span:[37,16,13],count:95,color:garden?0xeab1bb:0xa1bf77,speed:.63,width:.17})
  lounge(c,{soft:marble?0xbfa582:0x7d8b66})
}

function swim(c,{x=0,y=1,z=-30,count=20,radius=12,koi=false}={}) {
  const colors=koi?[0xeab16b,0xf1dfb6,0xbc5c41]:[0xf1c479,0x61a8b8,0x7e93c2,0xeca993]
  const bodies=colors.map(color=>c.lit(color,{metalness:.12,roughness:.44}))
  const finMaterials=colors.map(color=>c.lit(color,{side:T.DoubleSide,roughness:.63}))
  const shape=new T.Shape()
  shape.moveTo(0,0)
  shape.quadraticCurveTo(-.50,.67,-.61,.50);shape.quadraticCurveTo(-.47,0,-.63,-.52);shape.quadraticCurveTo(-.34,-.45,0,0)
  const geo=new T.ShapeGeometry(shape,8)
  const eye=c.emit(0x182638)
  const fish=[]
  for(let i=0;i<count;i++){
    const group=new T.Group(), variant=i%colors.length
    c.architecture.add(group)
    const body=c.ball(.56,0,0,0,bodies[variant],16,group)
    body.scale.set(1.51,koi?.31:.49,.37)
    c.ball(.049,.56,.08,.15,eye,8,group)
    c.ball(.049,.56,.08,-.15,eye,8,group)
    const tail=c.mesh(geo,finMaterials[variant],-.72,0,0,group)
    const dorsal=c.mesh(geo,finMaterials[variant],-.22,.17,0,group)
    dorsal.scale.set(.61,.49,1)
    dorsal.rotation.z=Math.PI*.54
    fish.push({group,tail,offset:c.rng()*Math.PI*2,depth:c.rng(),speed:.20+c.rng()*.28})
  }
  c.actions.push(time=>{
    for(const {group,tail,offset,depth,speed} of fish){
      const a=offset+time*speed
      group.position.set(x+Math.cos(a)*(radius+depth*2),y+(koi?0:(depth-.5)*7+Math.sin(a*1.71)*.46),z+Math.sin(a)*(radius*.41+depth*1.3))
      group.rotation.y=-Math.atan2(Math.cos(a)*.52,-Math.sin(a))
      tail.rotation.y=Math.sin(time*9.1+offset)*.67
    }
  })
}

function aquarium(c) {
  const concrete=c.lit(0x366675,{metalness:.29,roughness:.5})
  const rib=c.trim(0x527a85)
  const teal=c.emit(0x74e0e7)
  shell(c,{floor:concrete,wall:c.lit(0x163747),ceiling:concrete})
  glassWall(c,{frame:rib,panel:concrete,glass:c.windowGlass(0x5fd6ef,.14),columns:6,bottom:FLOOR+.55,top:13.9})
  ceilingStrips(c,rib,teal,'square')
  for(const z of [-15,-7,1,9,17]) {
    for(const x of [-19,19])c.box(.6,17.1,.54,x,5.45,z,rib)
    arch(c,0,7.5,z,8.4,.53,rib)
  }
  const floor=c.lit(0x306774)
  c.box(138,.27,65,0,-7.8,-50,floor)
  for(let i=0;i<18;i++){
    const x=(c.rng()-.5)*69,z=-27-c.rng()*35
    const coral=c.mesh(new T.IcosahedronGeometry(1.41,1),c.lit(i%3===0?0xa07198:0x507d8e),x,-7,z)
    coral.scale.set(1.5,1.2+c.rng()*1.7,1.43)
    plant(c,x,z,.7+c.rng()*.69,'palm')
  }
  swim(c,{x:3,y:4,z:-35,count:c.detail==='low'?11:20,radius:16})
  fall(c,{center:[0,FLOOR,-31],span:[52,21,19],count:140,color:0x89ddeb,speed:-.83,width:.107})
  const fill=c.glow(0x50cbea,390,49,-7,12,-17)
  c.actions.push(time=>{fill.intensity=390+42*Math.sin(time*.87)})
  const [pad,frame]=lounge(c,{metal:true,soft:0x466779})
  sofa(c,14.8,-9.4,-Math.PI/2,pad,frame)
}

function coast(c,yacht) {
  const teak=c.wood(0xbb8a51,[5,6])
  const plaster=c.lit(yacht?0xe1dfd4:0xdacab0)
  const trim=c.trim(yacht?0x676e78:0x906d51)
  shell(c,{floor:teak,wall:plaster},{closed:false})
  for(const x of [-19.5,19.5]){
    const rail=c.softBox(.21,.21,40,.08,x,FLOOR+1.47,0,trim)
    rail.receiveShadow=true
    for(let i=0;i<12;i++)c.box(.14,1.4,.14,x,FLOOR+.73,(i-5.5)*3.5,trim)
  }
  for(let i=-8;i<=8;i++)c.box(.12,1.35,.15,i*2.31,FLOOR+.71,-19.4,trim)
  c.box(39.5,.16,.31,0,FLOOR+1.42,-19.4,trim)
  for(const x of [-15.35,15.35])for(const z of [-14,12]){
    c.box(yacht?.28:.71,15.7,.59,x,FLOOR+7.84,z,yacht?trim:plaster)
    if(!yacht)cloth(c,3.05,10.5,x+(x>0?-.17:.17),FLOOR+10,z,c.lit(0xe9ded0).color)
  }
  if(yacht){
    const canopy=c.softBox(32,.45,22,.20,0,10,1,plaster)
    canopy.rotation.z=.035
    for(let i=0;i<18;i++)c.box(.09,.04,39,-17.5+i*2.07,FLOOR+.021,0,trim)
  }else{
    c.box(33,.35,25,0,11.8,-1,teak)
    for(const x of [-17,-12,12,17])plant(c,x,-17.1,2.47,'palm')
  }
  water(c,{width:142,depth:113,y:FLOOR-.8,z:-56,tint:0x3c6f85,flow:1.15})
  oceanBackdrop(c,{rock:c.lit(0x7f8694)})
  const [pad,frame]=lounge(c,{soft:yacht?0xc6c4b8:0xc6a77e})
  sofa(c,13.3,-9,-Math.PI/2,pad,frame)
}

function sandstone(c,resort) {
  const floor=c.lit(resort?0xc2aa87:0xb69b6f)
  const stone=c.lit(resort?0xd7b694:0xc2a173)
  const trim=c.lit(0x8e6c52)
  const brass=c.trim(0xc39352)
  shell(c,{floor,wall:stone},{closed:false})
  columns(c,{count:7,body:stone,base:trim,z:-17,height:14.2,rad:resort?.64:1.08})
  for(const x of [-16,-8,0,8,16]){
    c.box(7.68,.52,1.61,x,10.94,-17,stone)
    c.box(7.68,.27,.2,x,11.08,-16.13,brass)
  }
  if(resort){
    for(const x of [-17.8,17.8])for(const z of [-13,15])c.box(.7,14,.7,x,FLOOR+7,z,trim)
    const canopy=c.softBox(37,.23,26,.11,0,10.43,1.6,c.lit(0xd4baa3))
    c.actions.push(time=>{canopy.rotation.x=Math.sin(time*.62)*.005})
    for(const side of [-1,1])cloth(c,7.4,10.2,side*12.9,5.8,-14,0xc69070)
    const [sand,frame]=lounge(c,{soft:0xa77060})
    sofa(c,-13.4,-8.7,Math.PI/2,sand,frame)
    plant(c,15.9,-16.3,2,'palm')
  }else{
    for(const x of [-12.1,12.1]) {
      for(let step=0;step<4;step++)c.box(4.8-step*.75,.29,3.65-step*.64,x,FLOOR+.145+step*.28,-11.9,stone)
      const statue=c.mesh(new T.IcosahedronGeometry(1.12,1),trim,x,FLOOR+3.04,-11.9)
      statue.scale.set(.63,1.72,.61)
      c.cylinder(.23,.34,1.35,x,FLOOR+4.61,-11.9,brass,8)
    }
    for(const side of [-1,1])cloth(c,3.6,6.3,side*9,7.6,-16.6,0xa05248)
    lounge(c,{soft:0xbd935f})
  }
  peaks(c,{z:-73,height:17,snow:false,depth:92})
  fall(c,{center:[0,FLOOR,-20],span:[46,19,19],count:85,color:0xe8b582,speed:.26,width:.15})
}

function winter(c,aurora) {
  const floor=c.lit(aurora?0x4b5153:0x9198a0)
  const wall=c.lit(aurora?0x293c4b:0x43576a)
  const trim=c.trim(0x768c9b)
  const strip=c.emit(0xdce8f3)
  shell(c,{floor,wall,ceiling:aurora?wall:floor},{roof:!aurora})
  glassWall(c,{frame:trim,panel:wall,glass:c.windowGlass(0xafcbf7,.10),columns:6,bottom:FLOOR+1.14,top:13.4})
  for(const z of [-16,-10,-4,2,8,14]){
    c.box(39,.34,.37,0,13.52,z,trim)
    if(aurora){
      c.mesh(new T.PlaneGeometry(39,5.95),c.windowGlass(0xa4c7eb,.10),0,13.73,z+2.97).rotation.x=-Math.PI/2
    }else{
      c.box(36,.13,.17,0,13.22,z,strip)
      c.box(.7,16.57,.86,-18.5,4.93,z,trim)
      c.box(.7,16.57,.86,18.5,4.93,z,trim)
    }
  }
  peaks(c,{z:-72,height:36})
  fall(c,{center:[0,FLOOR-1,-26],span:[55,24,13],count:280,color:0xcfebfc,speed:2.18,width:.17})
  const [pad,frame]=lounge(c,{metal:true,soft:aurora?0x605276:0xb4b3a2})
  sofa(c,15.5,-7.7,-Math.PI/2,pad,frame)
  for(let i=0;i<5;i++)c.softBox(2.1,1.25,2.31,.10,-15.4+(i%2)*2.4,FLOOR+.64,i*2.7-15.4,trim)
  if(aurora){
    worldStars(c,0xb1c2ff)
    const geometry=new T.PlaneGeometry(136,35,78,22)
    const mat=new T.ShaderMaterial({
      transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0}},
      vertexShader:`uniform float time;varying vec2 v;void main(){
        v=uv;vec3 p=position;p.z+=sin(p.x*.083+time*.37)*8.+cos(p.x*.09+time*.4)*2.3;
        p.y+=sin(p.x*.052-time*.25)*5.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
      fragmentShader:`uniform float time;varying vec2 v;void main(){
        float band=exp(-abs(v.y-.29-sin(v.x*13.+time*.67)*.10)*7.);float rays=.56+.44*sin(v.x*156.+sin(v.x*19.)*3.+time*.6);
        gl_FragColor=vec4(mix(vec3(.10,.41,.28),vec3(.44,.25,.67),v.y),band*rays*.72*sin(3.14159*v.x));
      }`,
    })
    c.mesh(geometry,mat,0,26,-59)
    c.actions.push(time=>{mat.uniforms.time.value=time})
  }
}

function arena(c,digital) {
  const dark=c.lit(digital?0x253453:0x4e4850)
  const black=c.lit(digital?0x161b32:0x23262a)
  const gold=c.trim(digital?0x4c859c:0xa5875d)
  const light=c.emit(digital?0x63d4ff:0xe6bd84)
  shell(c,{floor:black,wall:dark,ceiling:black})
  c.softBox(38,.23,37,.11,0,FLOOR+.12,0,dark)
  for(let row=0;row<5;row++)for(const direction of [-1,1]){
    const h=(row+1)*.88
    for(let i=0;i<22;i++){
      if(i%7===0)continue
      const z=(i-10.5)*1.73
      c.box(.46,.63,1.26,direction*(12.74+row*1.43),FLOOR+h+.34,z,dark)
      c.box(.72,.11,1.26,direction*(12.42+row*1.43),FLOOR+h+.16,z,gold)
    }
    c.box(1.43,h,39,direction*(12.53+row*1.43),FLOOR+.5*h,0,black)
    c.box(.08,.13,38,direction*(11.8+row*1.43),FLOOR+h,0,light)
  }
  c.box(38,16.2,.72,0,FLOOR+8.1,-19.9,black)
  c.softBox(18,6.8,.49,.12,0,8.9,-19.4,gold)
  const display=c.mesh(new T.PlaneGeometry(17.3,6.1),displayMaterial(digital?1.4:0),0,8.9,-19.13)
  c.actions.push(time=>{display.material.uniforms.time.value=time})
  for(const x of [-16,16]){
    c.box(.25,15,.25,x,4,-19.5,light)
    c.glow(digital?0x66b4ec:0xffc490,230,37,x,12,-11)
  }
  ceilingStrips(c,black,light,'square')
  lounge(c,{metal:true,soft:digital?0x435070:0x68534e})
}

function mechanical(c,lava) {
  const dark=c.lit(0x3d3435,{metalness:.25})
  const copper=c.trim(0xa27650)
  const charcoal=c.trim(0x2a2629)
  const ember=c.emit(0xe8a66d)
  if(lava){
    shell(c,{floor:dark,wall:charcoal,ceiling:dark},{roof:false,closed:false})
    water(c,{width:143,depth:99,z:-62,y:FLOOR-3.55,tint:0xdd4717,flow:1.6,lava:true})
    peaks(c,{z:-106,height:55,snow:false,width:180,depth:60})
    for(let i=0;i<=16;i++){
      c.box(.28,2.3,.25,(i-8)*2.4,FLOOR+1.13,-19.15,copper)
      if(i%4===1)c.box(1.7,.19,.38,(i-8)*2.4,FLOOR+2.29,-19.15,ember)
    }
    c.box(40,.23,.38,0,FLOOR+2.19,-19.15,charcoal)
    fall(c,{center:[0,FLOOR-2,-30],span:[58,29,16],count:168,color:0xff984d,speed:-.67,width:.17})
    c.glow(0xe3642a,440,46,0,4,-14)
  }else{
    shell(c,{floor:c.wood(0x7a5848,[5,5]),wall:dark,ceiling:charcoal})
    c.box(39,19,.45,0,5.98,-20.3,charcoal)
    for(const z of [-16,-9,-2,5,12,19])for(const side of [-1,1]){
      c.box(.63,19,.58,side*19.24,5.99,z,copper)
      c.cylinder(.20,.20,7.05,side*18.81,8.44,z+.11,copper,12).rotation.x=Math.PI/2
    }
    for(let i=0;i<5;i++){
      const x=(i-2)*6.7,y=4.8+(i%2)*3.5,r=2.9-i%2*.58
      const gear=c.ring(r,.24,x,y,-18.74,copper)
      const teeth=new T.InstancedMesh(new T.BoxGeometry(.6,.8,.45),copper,Math.round(r*8))
      for(let tooth=0;tooth<teeth.count;tooth++){
        const a=tooth*Math.PI*2/teeth.count
        c.pose.position.set(Math.cos(a)*(r+.25),Math.sin(a)*(r+.25),0)
        c.pose.scale.setScalar(1);c.pose.rotation.set(0,0,a-Math.PI/2);c.pose.updateMatrix()
        teeth.setMatrixAt(tooth,c.pose.matrix)
      }
      gear.add(teeth)
      const spokes=new T.InstancedMesh(new T.BoxGeometry(.2,r*1.71,.13),charcoal,5)
      for(let j=0;j<5;j++){
        c.pose.position.set(0,0,0);c.pose.rotation.set(0,0,j*Math.PI/5);c.pose.updateMatrix()
        spokes.setMatrixAt(j,c.pose.matrix)
      }
      gear.add(spokes)
      c.actions.push(time=>{gear.rotation.z=time*(i%2?.31:-.25)})
      c.cylinder(.35,.51,.37,x,y,-18.73,copper,18).rotation.x=Math.PI/2
    }
    for(const x of [-15.8,15.8]){
      c.box(6.2,.32,3.1,x,FLOOR+2.54,-11.5,copper)
      c.box(5.6,2.45,2.76,x,FLOOR+1.24,-11.5,dark)
      c.block(x,-11.5,6.2,3.1)
      fall(c,{center:[x,FLOOR+2,-13],span:[2.4,8,2.4],count:50,color:0xdcc9bf,speed:-.93,width:.48})
    }
    c.glow(0xffb56d,349,38,0,8,-13)
    ceilingStrips(c,dark,ember)
  }
  lounge(c,{metal:true,soft:0x6c625c})
}

function studio(c) {
  const floor=c.lit(0xabaeb0,{roughness:.43})
  const pearl=c.lit(0xe0ded6)
  const trim=c.trim(0x82786d)
  shell(c,{floor,wall:pearl})
  glassWall(c,{frame:trim,panel:pearl,glass:c.windowGlass(0xcbe4ff,.07),columns:4,bottom:FLOOR+.20,top:14.08})
  ceilingStrips(c,pearl,c.emit(0xe8edf3),'square')
  for(const x of [-19.75,19.75])for(let index=0;index<13;index++){
    const z=-18.4+3.07*index
    c.box(.25,18.3,.13,x,5.9,z,trim)
    if(index%3===1)c.box(.28,9.3,1.83,x,3.21,z,pearl)
  }
  const [linen,steel]=lounge(c,{metal:true,soft:0xd5cbc3})
  sofa(c,14.7,-9,-Math.PI/2,linen,steel)
  plant(c,-14.16,-15.1,1.65)
  plant(c,13.48,-16.2,1.46)
  peaks(c,{z:-87,snow:false,height:13,depth:90})
  const sun=c.glow(0xffe1bd,335,52,-12,11,-13)
  c.actions.push(time=>{sun.intensity=345+49*Math.sin(time*.16)})
}

function fantasy(c,kind) {
  const cavern=kind==='cavern',cosmic=kind==='cosmic'
  const rock=c.lit(cavern?0x374b63:cosmic?0x3f345b:0x879d75,{roughness:.88})
  const stone=c.lit(cavern?0x566784:cosmic?0xa18dbc:0xb8b3a3,{roughness:.54,metalness:.14})
  const edge=c.trim(cavern?0x8697ba:0xb59e8b)
  if(cavern){
    c.cylinder(17.9,16.5,1.47,0,FLOOR-.73,0,rock,23)
    for(let i=0;i<34;i++){
      const theta=i*2.399, p=18.4+c.rng()*13,h=6+c.rng()*13
      const boulder=c.mesh(new T.IcosahedronGeometry(1,1),rock,Math.cos(theta)*p,FLOOR+h*.38,Math.sin(theta)*p)
      boulder.scale.set(2.8+c.rng()*4.4,h*.62,2.2+c.rng()*4.6)
    }
    const quartz=new T.MeshPhysicalMaterial({color:0x8eafe0,metalness:.19,roughness:.22,clearcoat:.83,emissive:0x4258ae,emissiveIntensity:.43})
    for(let i=0;i<36;i++){
      const theta=i*2.399,r=14+c.rng()*9,h=1.6+c.rng()*4.7
      const x=Math.cos(theta)*r,z=Math.sin(theta)*r
      const gem=c.cylinder(.53,1.45,h,x,FLOOR+h*.39,z,quartz,6)
      gem.rotation.z=(c.rng()-.51)*.48
      const tip=c.cylinder(0,.54,1.05,x,FLOOR+h*.89,z,quartz,6)
      tip.rotation.y=Math.PI/6
    }
    water(c,{width:111,depth:99,y:FLOOR-.52,z:-25,tint:0x202f70,flow:.74})
    fall(c,{center:[0,FLOOR,-10],span:[41,22,44],count:128,color:0x94aae9,speed:-.18,width:.21})
    const glow=c.glow(0x838be7,330,49,-12,9,-13)
    c.actions.push(time=>{glow.intensity=325+63*Math.sin(time*.91)})
  }else{
    c.softBox(40.3,1.2,40,.28,0,FLOOR-.62,0,stone)
    c.cylinder(20.9,15.8,3.3,0,FLOOR-2.9,0,rock,28)
    columns(c,{count:6,body:stone,base:edge,z:-17,height:12,rad:.7})
    for(const x of [-12.8,0,12.8])arch(c,x,7.7,-17,4.57,.75,stone)
    for(const x of [-15.7,15.7])for(const z of [-11.5,12])c.cylinder(.54,.76,13.9,x,FLOOR+6.8,z,stone,14)
    if(cosmic){
      worldStars(c)
      const sphere=c.ball(10,-9,5,-52,c.lit(0x68719c,{roughness:.8,emissive:0x363659,emissiveIntensity:.84}),44)
      const ring=c.ring(14,.31,-9,5,-52,c.emit(0xb29fb8),1.12)
      const motes=[]
      for(let i=0;i<10;i++){
        const light=c.mesh(new T.OctahedronGeometry(1.1,.0),c.trim(0x9993c1),0,0,0)
        motes.push(light)
      }
      c.actions.push(time=>{
        sphere.rotation.y=time*.06
        ring.rotation.z=time*.024
        motes.forEach((mote,i)=>{
          const a=i*Math.PI/5+time*.084
          mote.position.set(Math.cos(a)*16.3,8.2+Math.sin(time*.91+i)*1.22,Math.sin(a)*16.3)
          mote.rotation.set(time*.32,i+time*.18,time*.27)
        })
      })
    }else{
      for(const x of [-16.4,16.4])plant(c,x,-15.4,2.4,'blossom')
      const cloudMaterial=c.lit(0xe0e8ed,{roughness:1})
      const clouds=[]
      for(let i=0;i<18;i++){
        const cloud=new T.Group()
        cloud.position.set((i%7-3)*13,-9-Math.floor(i/7)*3,-22-Math.floor(i/7)*15)
        c.architecture.add(cloud)
        for(let n=0;n<4;n++){
          const tuft=c.ball(2.4+(n%3)*.75,(n-1.5)*2.72,.7*Math.sin(n),2*Math.cos(n),cloudMaterial,14,cloud)
          tuft.scale.set(1.63,.55,1.25)
        }
        clouds.push([cloud,cloud.position.x])
      }
      c.actions.push(time=>{for(const [cloud,x] of clouds)cloud.position.x=x+Math.sin(time*.068+x)*5})
      water(c,{width:12,depth:5,x:-12,y:FLOOR+.03,z:-15,tint:0x507f9b,flow:.91})
      fall(c,{center:[-12,FLOOR-10,-17],span:[10,11,1.2],count:190,color:0xc2ebf5,speed:7,width:.19,style:'rain'})
    }
  }
  lounge(c,{metal:cosmic,soft:cavern?0x516482:0xae9e91})
}

export function buildVariant(c,profile) {
  const id=profile.builder
  switch(id) {
    case 'royal':return royal(c)
    case 'garden':case 'courtyard':case 'forest':return gardens(c,id)
    case 'aquatic':return aquarium(c)
    case 'coast':return coast(c,profile.id==='yacht')
    case 'desert':return sandstone(c,profile.id==='resort')
    case 'winter':case 'aurora':return winter(c,id==='aurora')
    case 'arena':case 'digital':return arena(c,id==='digital')
    case 'workshop':case 'lava':return mechanical(c,id==='lava')
    case 'manor':return cabin(c,{storm:true})
    case 'studio':return studio(c)
    case 'island':case 'cosmic':case 'cavern':return fantasy(c,id)
    case 'rooftop':
      penthouse(c,{roof:true})
      water(c,{width:11.8,depth:15.2,x:12.3,y:FLOOR+.18,z:-8.7,tint:0x5094aa,flow:.81})
      c.block(12.3,-8.7,12,15.5)
      return
  }
}
