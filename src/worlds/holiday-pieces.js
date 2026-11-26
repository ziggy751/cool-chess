import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const heights={p:.59,n:.96,b:.96,r:.87,q:1.04,k:1.14}
const geometryCache=new Map()
const combinedCache=new Map()
const metals={
  brass:new T.MeshPhysicalMaterial({color:0xeabd6b,metalness:.8,roughness:.29}),
  white:new T.MeshPhysicalMaterial({color:0xffe8ca,roughness:.56}),
  ice:new T.MeshPhysicalMaterial({color:0xd4f1ff,metalness:.19,roughness:.19}),
  skin:new T.MeshStandardMaterial({color:0xde9e84,roughness:.63}),
  coal:new T.MeshPhysicalMaterial({color:0x241f26,clearcoat:.45,roughness:.48}),
  red:new T.MeshPhysicalMaterial({color:0x9b233d,metalness:.36,clearcoat:.5}),
  green:new T.MeshPhysicalMaterial({color:0x267358,metalness:.31,clearcoat:.5}),
  trunk:new T.MeshStandardMaterial({color:0x754939,roughness:.9}),
  light:new T.MeshStandardMaterial({color:0xffdb8b,emissive:0xeab75b,emissiveIntensity:1.36,roughness:.51}),
}
const snowCoords=new Float32Array(Array.from({length:33},(_,i)=>i%3===1?.21+(i%5)*.036:Math.sin(i*2.49)*.09))
const snowGeo=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(snowCoords,3))
const snowMat=new T.PointsMaterial({color:0xd7f1ff,size:.022,transparent:true,opacity:.83,depthWrite:false})
const twinkles=metals.light.clone()
const sparkle=new T.Color(0xffdb8b)
const jawGeometry=new T.BoxGeometry(.156,.052,.081)
const combinedMaterial=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.41,clearcoat:.29,metalness:.25})
let snowTime
function accents(id,type,side){
  const key=[id,type,side].join(':')
  if(geometryCache.has(key))return geometryCache.get(key)
  const layers=new Map()
  const add=(style,geo,x,y,z,rotation=0)=>{
    if(!layers.has(style))layers.set(style,[])
    const part=geo.index?geo.toNonIndexed():geo
    if(part!==geo)geo.dispose()
    part.rotateZ(rotation)
    layers.get(style).push(part.translate(x,y,z))
  }
  const ball=(style,x,y,z,r,sx=1,sy=1,sz=1)=>add(style,new T.SphereGeometry(r,10,8).scale(sx,sy,sz),x,y,z)
  const box=(style,x,y,z,w,h,d,rotation=0)=>add(style,new T.BoxGeometry(w,h,d),x,y,z,rotation)
  const cone=(style,x,y,z,top,bottom,h,rotation=0)=>add(style,new T.CylinderGeometry(top,bottom,h,10),x,y,z,rotation)
  const trim=(style,r,y,d=.012)=>add(style,new T.TorusGeometry(r,d,6,36).rotateX(Math.PI/2),0,y,0)
  const cord=(style,points,r=.012)=>add(style,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point))),14,r,5,false),0,0,0)
  const team=side==='w'?'red':'green'
  const scale=type==='p'?.8:1
  const trimY=heights[type]
  if(id==='santa-shapes'){
    trim('brass',.335*scale,.09)
    if(['k','q','b'].includes(type)){
      const head=type==='k'?1.13:type==='q'?1.04:.967
      const radius=type==='k'?.133:.116
      ball('skin',0,head,.162,radius)
      ball('skin',0,head-.017,.279,.039)
      for(const x of [-.052,.052])ball('coal',x,head+.025,.267,.014,1.1,1,1)
      trim('white',radius,head+.10,.026)
      cone(team,0,head+.166,.128,.016,radius,.174,-.24)
      ball('white',.027,head+.268,.128,.038)
      if(type==='k'){
        for(let i=0;i<5;i++)ball('white',(i-2)*.043,head-.091,.235,.060,.89,1.34,1)
        ball('white',0,head-.153,.198,.090,.85,1.25,.55)
      }
      if(type==='q'){
        for(const x of [-.088,.087])cord('white',[[x,head+.044,.178],[x*1.27,head-.055,.212],[x*.95,head-.21,.212]],.032)
      }
      if(type==='b'){
        for(const x of [-.135,.135])cone('skin',x,head+.058,.056,0,.043,.116,x>0?-.68:.68)
        ball('brass',.054,head+.298,.05,.027)
      }
      trim('white',.155,.345,.018)
      box('coal',0,.54,.148,.177,.049,.022)
      box('brass',0,.54,.168,.079,.067,.028)
      box('coal',0,.54,.185,.040,.030,.012)
    }else if(type==='n'){
      for(const side of [-1,1]){
        const z=side*.12
        cord('brass',[[.02,1.13,z],[-.018,1.31,z],[-.118,1.43,z*1.6],[-.13,1.54,z*2]],.019)
        cord('brass',[[-.05,1.35,z*1.39],[.030,1.44,z*1.57],[.08,1.49,z*2]],.014)
        cord('brass',[[-.101,1.4,z*1.56],[-.187,1.46,z*1.8],[-.199,1.53,z*2.25]],.012)
      }
      ball(team,.297,.851,.01,.067)
      trim('green',.181,.53,.031)
      ball('brass',.009,.543,.192,.037)
    }else if(type==='r'){
      trim('white',.239,.915,.035)
      trim('brass',.218,.464)
      for(const x of [-.088,.089]){
        box('trunk',x,.622,.187,.086,.185,.030)
        box('light',x,.628,.205,.055,.122,.018)
        box('trunk',x,.626,.216,.012,.132,.007)
      }
    }else{
      box(team,0,.252,0,.43,.30,.42)
      box('brass',0,.27,0,.055,.317,.432)
      box('brass',0,.262,0,.45,.327,.052)
      cord('brass',[[0,.407,.02],[-.115,.5,.026],[-.16,.453,.031],[0,.409,.02],[.15,.48,.02],[.089,.53,.02],[0,.407,.02]],.020)
    }
  }else if(id==='gingerbread-set' || id==='candy-striped'){
    trim('white',.325*scale,.082,.018)
    trim('white',.24*scale,.17,.012)
    for(let i=0;i<15;i++){
      const a=i*2*Math.PI/15
      ball(i%3===0?team:'white',Math.cos(a)*.32*scale,.112+.019*Math.sin(a*3),Math.sin(a)*.32*scale,.017)
    }
    for(let i=0;i<4;i++){
      const y=.28+i*.071
      ball(i%2===0?team:'white',0,y,.2*scale,.031)
    }
  }else if(id==='snowglobe-set' || id==='frozen-noel'){
    trim('ice',.322*scale,.105,.024)
    const base=.213
    if(id==='snowglobe-set'){
      box('trunk',.031,base+.086,.024,.163,.154,.151)
      box('ice',.031,base+.171,.025,.205,.045,.19)
      box('light',.055,base+.083,.104,.032,.039,.014)
      for(let i=0;i<4;i++)cone(i%2?'green':'ice',-.1,base+.04+i*.057,.036,0,.07-i*.014,.10)
      for(let i=0;i<11;i++){
        const a=i*2.4
        ball('white',Math.cos(a)*.131,base+.023+(i%5)*.043,Math.sin(a)*.132,.009)
      }
    }else{
      for(let i=0;i<7;i++){
        const a=i*2.39
        add('ice',new T.OctahedronGeometry(.047).scale(.49,2.6,.49),Math.cos(a)*.22,base+.041,Math.sin(a)*.22,a)
      }
    }
  }else if(id==='twinkle-set'){
    for(let i=0;i<17;i++){
      const a=i*2.43,d=.27*scale-(i%3)*.012
      ball(['light','green','red'][i%3],Math.cos(a)*d,.105+(i%8)*.012,Math.sin(a)*d,.028)
    }
    trim('coal',.307*scale,.116,.022)
  }else{
    trim('brass',.321*scale,.083,.024)
    trim('brass',.258*scale,.157,.012)
    for(let i=0;i<14;i++){
      const a=i*Math.PI/7
      add(i%2?team:'brass',new T.OctahedronGeometry(.029),Math.cos(a)*.302*scale,.116,Math.sin(a)*.302*scale,a)
    }
    if(id==='nutcracker-set'){
      box('coal',0,trimY-.128,.151,.17,.16,.059)
      for(let x=-.063;x<.068;x+=.042)box('white',x,trimY-.099,.189,.031,.034,.015)
      trim('brass',.198*scale,trimY-.24,.012)
      for(let i=0;i<4;i++)ball('brass',0,.496+i*.087,.175*scale,.027)
    }
  }
  const result=Array.from(layers,([style,parts])=>{
    const geometry=mergeGeometries(parts)
    for(const part of parts)part.dispose()
    return {style,geometry}
  })
  geometryCache.set(key,result)
  return result
}

function combinedAccents(id,type,side,layers){
  const key=[id,type,side].join(':')
  if(combinedCache.has(key))return combinedCache.get(key)
  const source=layers.filter(({style})=>style!=='light').map(({style,geometry})=>{
    const copy=geometry.clone()
    const count=copy.getAttribute('position').count
    const {r,g,b}=metals[style].color
    const colors=new Float32Array(count*3)
    for(let i=0;i<count;i++)colors.set([r,g,b],i*3)
    return copy.setAttribute('color',new T.BufferAttribute(colors,3))
  })
  const geometry=source.length?mergeGeometries(source):null
  source.forEach(part=>part.dispose())
  combinedCache.set(key,geometry)
  return geometry
}

export function holidayParts(id,type,side,quality){
  const rotor=new T.Group()
  const layers=accents(id,type,side)
  if(quality==='low'){
    const geometry=combinedAccents(id,type,side,layers)
    if(geometry)rotor.add(new T.Mesh(geometry,combinedMaterial))
  }
  for(const {style,geometry} of layers){
    if(quality==='low' && style!=='light')continue
    rotor.add(new T.Mesh(geometry,
    id==='twinkle-set' && style==='light'?twinkles:metals[style]))
  }
  if(id==='snowglobe-set' || id==='frozen-noel'){
    const flurries=new T.Points(snowGeo,snowMat)
    rotor.add(flurries)
    rotor.userData.snow=flurries
  }else if(id==='twinkle-set')rotor.userData.twinkle=true
  else if(id==='nutcracker-set'){
    const jaw=new T.Mesh(jawGeometry,metals.brass)
    jaw.position.set(0,heights[type]-.19,.165)
    rotor.add(jaw)
    rotor.userData.jaw=jaw
  }
  return rotor
}

export function holidayStep(rotor,time,moving,style='slow'){
  if(!rotor)return
  if(rotor.userData.snow){
    if(snowTime!==time){
      const coords=snowGeo.attributes.position
      for(let i=0;i<coords.count;i++)coords.setY(i,.21+((i*.056-time*.55)%1+1)%1*.268)
      coords.needsUpdate=true
      snowTime=time
    }
    rotor.rotation.z=moving?.05*Math.sin(time*24):0
  }
  if(rotor.userData.twinkle)twinkles.color.copy(sparkle).multiplyScalar(style==='steady'?1:.74+.24*Math.sin(time*(style==='chase'?5:1.4)))
  if(rotor.userData.jaw)rotor.userData.jaw.rotation.x=-.19*Math.max(0,Math.sin(time*(moving?13:2.3)))
}

export function holidayBoardTrim(){
  const group=new T.Group()
  const landscape=new T.Group()
  const bulbs=new T.InstancedMesh(new T.SphereGeometry(.045,8,6),new T.MeshBasicMaterial({color:0xfff1d4}),76)
  const inlay=new T.MeshPhysicalMaterial({color:0xa57847,metalness:.73,roughness:.34})
  const gem=new T.MeshPhysicalMaterial({color:0x763839,clearcoat:.53,roughness:.34})
  const marker=new T.Object3D()
  const colors=[0xffce84,0x88ddb7,0xef7c83,0xbfe0e7]
  for(let side=0;side<4;side++){
    const border=new T.Mesh(new T.BoxGeometry(8.45,.017,.045),inlay)
    border.position.set(side%2?0:Math.sign(side-1)*4.36,.021,side%2?Math.sign(side-2)*4.36:0)
    border.rotation.y=side%2?0:Math.PI/2
    group.add(border)
    for(let i=0;i<19;i++){
      const t=(i-9)*.46
      marker.position.set(side%2?t:border.position.x,.105,side%2?border.position.z:t)
      marker.updateMatrix()
      bulbs.setMatrixAt(side*19+i,marker.matrix)
      bulbs.setColorAt(side*19+i,new T.Color(colors[(i+side)%colors.length]))
    }
  }
  for(const x of [-4.37,4.37])for(const z of [-4.37,4.37]){
    const tile=new T.Mesh(new T.OctahedronGeometry(.084),gem)
    tile.position.set(x,.065,z)
    tile.scale.y=.42
    group.add(tile)
  }
  group.add(bulbs)
  const snow=new T.MeshPhysicalMaterial({color:0xd7e9ed,roughness:.82})
  for(let i=0;i<16;i++){
    const x=(i%4-1.5)*1.83,z=(Math.floor(i/4)-1.5)*1.87
    const hill=new T.Mesh(new T.SphereGeometry(.61+i%3*.15,12,8),snow)
    hill.position.set(x,-.183,z)
    hill.scale.set(1.2,.111,.92)
    landscape.add(hill)
    const tree=new T.Mesh(new T.ConeGeometry(.18,.18,8),metals.green)
    tree.position.set(x+.12,-.066,z+.07)
    landscape.add(tree)
    if(i%3===0){
      const house=new T.Mesh(new T.BoxGeometry(.28,.127,.18),metals.trunk)
      const window=new T.Mesh(new T.BoxGeometry(.09,.045,.016),metals.light)
      house.position.set(x+.25,-.082,z-.36)
      window.position.copy(house.position).add(new T.Vector3(0,0,.096))
      landscape.add(house,window)
    }
  }
  landscape.visible=false
  group.add(landscape)
  return {group,bulbs,landscape}
}
