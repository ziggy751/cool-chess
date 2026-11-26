import * as T from 'three'
import { FLOOR } from './craft.js'
import { chair, rug } from './architecture.js'
import { fall } from './motion.js'
import { peaks } from './outdoors.js'

const treeMesh=new T.LatheGeometry(Array.from({length:37},(_,i)=>{
  const h=i/36
  return new T.Vector2((1-h)*(.72+.28*Math.cos(h*10*Math.PI))+.015,h*7.8)
}),30)

export function present(c,x,y,z,size=1,color=0x833339,parent){
  const gift=new T.Group()
  gift.position.set(x,y,z)
  gift.scale.setScalar(size)
  ;(parent || c.architecture).add(gift)
  const wrap=c.lit(color,{roughness:.42})
  const ribbon=c.trim(0xd5a34f)
  c.softBox(1.39,.94,1.15,.076,0,.47,0,wrap,gift)
  c.softBox(1.45,.145,1.21,.043,0,.913,0,wrap,gift)
  c.softBox(.145,.981,1.222,.028,0,.497,0,ribbon,gift)
  c.softBox(1.47,.988,.138,.025,0,.495,0,ribbon,gift)
  for(const side of [-1,1]){
    const bow=c.ring(.195,.034,side*.152,1.056,0,ribbon,0,gift)
    bow.rotation.z=side*.54
    bow.scale.set(1.12,.69,.77)
  }
  c.ball(.084,0,1.055,0,ribbon,12,gift)
  return gift
}

export function evergreen(c,x,y,z,size=1){
  const group=new T.Group()
  group.position.set(x,y,z)
  group.scale.setScalar(size)
  c.architecture.add(group)
  c.cylinder(.29,.43,1.01,0,.51,0,c.wood(0x583423),9,group)
  const green=c.lit(0x204c36,{roughness:.86})
  const snow=c.lit(0xe1e9e6,{roughness:.85})
  const gold=c.trim(0xf3bc62),red=c.lit(0x9d1d2e,{metalness:.46,roughness:.24}),ivory=c.trim(0xc9e5d5)
  const leds=[c.emit(0xfbda9c),c.emit(0xff8e83),c.emit(0xc1ebd0)]
  const core=c.mesh(treeMesh.clone(),green,0,1.02,0,group)
  core.scale.set(2.8,1,2.8)
  const shape=new T.IcosahedronGeometry(1,0)
  const leaves=new T.InstancedMesh(shape,green,c.detail==='low'?225:440)
  const powder=new T.InstancedMesh(shape,snow,leaves.count)
  const ornaments=[gold,red,ivory].map(material=>new T.InstancedMesh(new T.SphereGeometry(1,10,8),material,28))
  const points=leds.map(material=>new T.InstancedMesh(new T.SphereGeometry(1,8,6),material,24))
  group.add(leaves,powder,...ornaments,...points)
  for(let i=0;i<leaves.count;i++){
    const h=c.rng(), a=i*2.39996, spread=(1-h)*(2.35+Math.cos(h*29)*.40)
    const y=1.06+h*7.68, x=Math.cos(a)*spread,z=Math.sin(a)*spread
    c.pose.position.set(x,y,z)
    c.pose.rotation.set(.12,a*.9,.14)
    c.pose.scale.set(.39,.20,.26)
    c.pose.updateMatrix();leaves.setMatrixAt(i,c.pose.matrix)
    c.pose.position.y+=.15
    c.pose.scale.set(.26,.048,.18)
    c.pose.updateMatrix();powder.setMatrixAt(i,c.pose.matrix)
  }
  for(const [objects,radius,lift] of [[ornaments,.146,.12],[points,.074,.047]]){
    for(const [j,mesh] of objects.entries()) for(let i=0;i<mesh.count;i++){
      const h=.075+(i+(j*.26))/mesh.count*.845,a=i*2.69+j*2.11
      const spread=(1-h)*(2.48+Math.cos(h*29)*.42)+lift
      c.pose.position.set(Math.cos(a)*spread,1.07+h*7.68,Math.sin(a)*spread)
      c.pose.scale.setScalar(radius)
      c.pose.rotation.set(0,0,0)
      c.pose.updateMatrix();mesh.setMatrixAt(i,c.pose.matrix)
    }
  }
  const star=new T.Shape()
  for(let i=0;i<10;i++){
    const angle=Math.PI/2+i*Math.PI/5,r=i%2?.19:.45
    const [x,y]=[Math.cos(angle)*r,Math.sin(angle)*r]
    if(i)star.lineTo(x,y)
    else star.moveTo(x,y)
  }
  const tip=c.mesh(new T.ExtrudeGeometry(star,{depth:.07,bevelSegments:2,bevelSize:.03,bevelThickness:.025}),gold,0,8.76,0,group)
  const warm=new T.Color(0xfbda9c)
  c.actions.push(time=>{
    for(const [index,material] of leds.entries())material.color.copy(warm).lerp(new T.Color([0xffd49a,0xf06263,0x93debb][index]),.42+.34*Math.sin(time*1.4+index*2.2))
    tip.rotation.y=time*.19
  })
  c.block(x,z,5.05*size,5.05*size)
  return group
}

function garland(c,left,right,y,z){
  const stem=c.lit(0x274637)
  const glow=[c.emit(0xffc577),c.emit(0xec7771),c.emit(0x82dab3)]
  const points=[]
  for(let i=0;i<=36;i++){
    const u=i/36
    const x=left+(right-left)*u
    const drop=.53*Math.sin(u*Math.PI*4)**2
    points.push(new T.Vector3(x,y-drop,z))
    c.ball(.16,x,y-drop,z,stem,8)
    if(i%2===0)c.ball(.075,x,y-drop-.14,z+.13,glow[i%3],9)
  }
  c.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),47,.075,5,false),stem)
  c.actions.push(time=>glow[0].color.set(0xffc577).multiplyScalar(.78+.21*Math.cos(time*1.6)))
}

function candle(c,x,y,z){
  const gold=c.trim(0xac7642)
  const wax=c.lit(0xeadebd,{roughness:.47})
  const flame=c.emit(0xffba62)
  c.cylinder(.25,.28,.075,x,y+.045,z,gold,18)
  c.cylinder(.102,.116,.44,x,y+.27,z,wax,16)
  const wick=c.ball(.082,x,y+.55,z,flame,13)
  wick.scale.y=2.2
  c.actions.push(time=>{wick.scale.y=1.49+.67*Math.abs(Math.sin(time*7.5+x));wick.position.x=x+Math.sin(time*6.1)*.029})
}

function stocking(c,x,y,z){
  const wool=c.lit(0x9e343a,{roughness:.83})
  const cuff=c.lit(0xe3d6ba,{roughness:.93})
  c.softBox(.43,.69,.16,.074,x,y-.29,z,wool)
  c.softBox(.67,.29,.20,.088,x+.115,y-.60,z+.02,wool)
  c.softBox(.48,.17,.19,.039,x,y+.052,z,cuff)
}

export function decorateChristmas(c,kind){
  const workshop=kind==='christmas-workshop'
  const cabin=kind==='christmas-cabin'
  if(kind==='christmas-village'){village(c);return}
  const [x,z,scale]=cabin?[10.4,-12.2,1.37]:workshop?[13.6,-11.6,1.11]:[13,-12.3,1.17]
  evergreen(c,x,FLOOR,z,scale)
  for(let i=0;i<11;i++){
    const angle=i*2.399
    const gift=present(c,x+Math.cos(angle)*(1.55+i*.11),FLOOR,z+Math.sin(angle)*(1.65+i*.095),
      .56+.28*Math.sin(i*4)**2,[0xa43645,0x305744,0xc68f48][i%3])
    gift.rotation.y=angle
  }
  garland(c,-17,17,cabin?11.25:10.8,-18.38)
  c.glow(0xffb66f,245,28,x,3,z+2.4)
  if(cabin){
    for(let i=0;i<5;i++)stocking(c,-16.8+i*1.12,1.15,-15.68)
    for(const x of [-17.8,-11.6])candle(c,x,1.88,-16.56)
    const wreath=c.ring(1.19,.22,-14.6,5.08,-16.12,c.lit(0x294e35))
    const berries=c.trim(0xa72930)
    for(let i=0;i<27;i++){
      const a=i*Math.PI*2/27
      c.ball(.114,-14.6+1.2*Math.cos(a),5.08+1.2*Math.sin(a),-15.84,berries,10)
    }
    wreath.scale.x=1.03
    rug(c,{width:14,depth:4.9,z:11.5,color:0x733b3a,border:0xbd925a})
  }else if(workshop){
    const conveyor=c.trim(0x343b3a),rail=c.trim(0xc29159)
    for(const side of [-1,1]){
      c.softBox(26,.28,.16,.06,0,FLOOR+1.13,-13+side*.85,rail)
      for(let i=0;i<7;i++)c.softBox(.34,1.07,.31,.05,(i-3)*3.6,FLOOR+.51,-13+side*.76,rail)
    }
    c.softBox(26, .21,1.39,.06,0,FLOOR+1.09,-13,conveyor)
    for(let i=0;i<21;i++){
      const roller=c.cylinder(.23,.23,1.55,(i-10)*1.22,FLOOR+.87,-13,rail,12)
      roller.rotation.x=Math.PI/2
      c.actions.push(time=>{roller.rotation.z=time*1.93})
    }
    const gifts=Array.from({length:7},(_,i)=>present(c,i*3.7-12.4,FLOOR+1.23,-13,.74+i%3*.13,[0xb33646,0x41674d,0xc69054][i%3]))
    c.actions.push(time=>gifts.forEach((gift,i)=>{gift.position.x=((i*3.7+time*1.38)%26)-13}))
    c.block(0,-13,26,2)
    fall(c,{center:[0,FLOOR-1,-24],span:[42,19,11],count:190,color:0xe0efff,speed:1.34,width:.14})
  }else{
    const cloud=c.lit(0x54677d,{roughness:1})
    for(let n=0;n<6;n++){
      const x=-38+n*15
      const body=c.ball(4.5,x,8.9+n%2,-41-n*.9,cloud,14)
      body.scale.set(2,.25,.51)
      c.actions.push(time=>{body.position.x=x+4*Math.sin(time*.073+n)})
    }
    for(const x of [-9,-7.8,6,7.2])candle(c,x,FLOOR,-16)
  }
}

function cottage(c,x,z,width,depth,wallColor){
  const plaster=c.lit(wallColor,{roughness:.84}), wood=c.wood(0x6e4e3c,[3,2])
  const roof=c.lit(0x38465b),snow=c.lit(0xd4e2eb,{roughness:.92}), glass=c.emit(0xffb55f)
  c.box(width,5.4,depth,x,FLOOR+2.7,z,plaster)
  for(const side of [-1,1]){
    const over=width*.54
    const slope=1.05
    const cap=c.softBox(over,.31,depth+1.03,.08,x+side*(width*.238),FLOOR+6.66,z,roof)
    cap.rotation.z=-side*slope*.56
    const ice=c.softBox(over+.19,.37,depth+1.12,.14,x+side*(width*.238),FLOOR+6.92,z,snow)
    ice.rotation.z=cap.rotation.z
  }
  const facade=z+depth/2+.095
  for(const side of [-1,1])for(const [w,y] of [[1.17,2],[.78,4.24]]){
    const px=x+side*width*.268
    c.softBox(w+.27,1.35,.16,.06,px,FLOOR+y,facade,wood)
    c.box(w,.98,.19,px,FLOOR+y,facade+.05,glass)
    c.box(.099,.98,.25,px,FLOOR+y,facade+.09,wood)
    c.box(w,.075,.25,px,FLOOR+y,facade+.09,wood)
    c.box(w+.41,.14,.38,px,FLOOR+y-.65,facade+.06,snow)
  }
  c.box(1.35,2.68,.13,x,FLOOR+1.34,facade,wood)
  c.box(width+.1,.19,.13,x,FLOOR+3.25,facade,wood)
  c.box(.19,5.32,.22,x-width*.475,FLOOR+2.7,facade,wood)
  c.box(.19,5.32,.22,x+width*.475,FLOOR+2.7,facade,wood)
  c.cylinder(.27,.30,2.26,x-width*.19,FLOOR+7.15,z+.28,wood,8)
  c.block(x,z,width,depth)
}

function village(c){
  const powder=c.lit(0xc7d5df,{roughness:.94})
  const stone=c.lit(0x586476,{roughness:.83})
  const path=c.lit(0x879098,{roughness:.9})
  const upholstery=c.lit(0x794047,{roughness:.88}),seat=c.wood(0x755d4b)
  c.box(44,1.03,45,0,FLOOR-.55,-1.2,powder)
  c.box(18,.11,24,0,FLOOR+.014,.36,path)
  for(let z=-10;z<11;z++)for(let x=-10;x<11;x++){
    c.box(.74+c.rng()*.082,.082,1.02,x*.81,z%4===0?FLOOR+.047:FLOOR+.031,z*1.045,c.rng()>.57?stone:path)
  }
  for(let n=-3;n<=3;n++)cottage(c,n*7.7,-18.1+(n%2)*2,6.88,5.7,[0x91806f,0x876a62,0x5e776c][(n+3)%3])
  for(const side of [-1,1])for(let n=0;n<2;n++){
    const x=side*(14.4+n*.91),z=-8.6+n*10.4
    const wood=c.wood(0x846045),awning=c.lit(n%2?0x573631:0x387159)
    c.softBox(5.29,.32,2.32,.07,x,FLOOR+1.16,z,wood)
    c.softBox(5.46,.33,2.62,.14,x,FLOOR+4.56,z,awning)
    for(const off of [-2.42,2.42])for(const divisor of [-1,1])
      c.box(.22,4.41,.23,x+off,FLOOR+2.21,z+divisor,wood)
    for(let i=0;i<3;i++)present(c,x+(i-1)*1.22,FLOOR+1.36,z,.38+i*.05,[0x903537,0x7a6f3a,0x3d6a56][i])
    const cloth=c.lit(side===1?0x8b3241:0x2e6a50,{side:T.DoubleSide})
    const banner=c.mesh(new T.PlaneGeometry(2.4,.83,12,4),cloth,x,FLOOR+4.1,z+1.31)
    const points=banner.geometry.attributes.position
    c.actions.push(time=>{
      for(let i=0;i<points.count;i++)points.setZ(i,Math.sin(points.getX(i)*2.2+time*2+z)*.14)
      points.needsUpdate=true
    })
    c.glow(0xffae58,128,15,x,FLOOR+4.5,z+1.9)
    c.block(x,z,5.5,2.8)
  }
  for(const [x,z,size] of [[-9,-11,1.22],[9,-10,1.07],[15,9,.72],[-14,8,.72]])evergreen(c,x,FLOOR,z,size)
  chair(c,0,7.55,Math.PI,upholstery,seat)
  chair(c,0,-7.55,0,upholstery,seat)
  garland(c,-17,17,6.7,-15.03)
  const lamp=c.trim(0x44382d),glass=c.emit(0xffc472)
  for(const [x,z] of [[-12,-5],[12,-5],[-11,7],[11,7]]){
    c.cylinder(.12,.23,3.34,x,FLOOR+1.68,z,lamp,12)
    c.softBox(.59,.57,.57,.046,x,FLOOR+3.37,z,glass)
    c.cylinder(.11,.43,.44,x,FLOOR+3.87,z,lamp,8)
    candle(c,x+1.0,FLOOR,z-1.07)
  }
  peaks(c,{z:-78,height:31,snow:true})
  fall(c,{center:[0,FLOOR-3,-7],span:[47,26,43],count:540,color:0xf1f8ff,speed:1.62,width:.13})
}
