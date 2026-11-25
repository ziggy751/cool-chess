import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { FLOOR, HALFW, HALFD, CEILING } from './craft.js'

export function shell(c,mats,{closed=true,back=true,right=true,roof=true}={}) {
  const w=HALFW*2,d=HALFD*2,h=CEILING-FLOOR,y=FLOOR+h/2
  c.box(w,1,d,0,FLOOR-.5,0,mats.floor)
  if(closed){
    c.box(.42,h,d,-HALFW,y,0,mats.wall)
    if(right)c.box(.42,h,d,HALFW,y,0,mats.wall)
    if(back)c.box(w,h,.42,0,y,HALFD,mats.wall)
    if(roof)c.box(w,.55,d,0,CEILING+.23,0,mats.ceiling || mats.wall)
  }
}
export function glassWall(c,{frame,panel,glass,columns=5,bottom=FLOOR+1.85,top=13.0,z=-HALFD,thickness=.49}) {
  const w=HALFW*2,step=w/columns
  c.box(w,bottom-FLOOR,.65,0,(FLOOR+bottom)/2,z,panel)
  c.box(w,CEILING-top,.65,0,(CEILING+top)/2,z,panel)
  for(let i=0;i<=columns;i++){
    const x=-HALFW+step*i
    c.box(thickness,top-bottom,.67,x,(top+bottom)/2,z,frame)
    if(glass && i<columns){
      const pane=c.mesh(new T.PlaneGeometry(step-thickness,top-bottom),glass,x+step/2,(top+bottom)/2,z)
      pane.renderOrder=4
    }
  }
  for(const y of [bottom,top])c.box(w,.32,1.05,0,y,z+.04,frame)
}

export function rug(c,{width=14,depth=11,x=0,z=0,color=0x604133,border=0xb7935b}) {
  const body=c.lit(color,{roughness:.97})
  const hem=c.lit(border,{roughness:.89})
  c.box(width,.045,depth,x,FLOOR+.028,z,body)
  for(const absX of [-width/2+.25,width/2-.25])c.box(.085,.046,depth-.5,x+absX,FLOOR+.044,z,hem)
  for(const absZ of [-depth/2+.25,depth/2-.25])c.box(width-.5,.046,.085,x,FLOOR+.044,z+absZ,hem)
  const pattern=c.lit(new T.Color(color).lerp(new T.Color(border),.36),{roughness:.96})
  for(let i=0;i<12;i++){
    const shift=(i-5.5)*(width-.84)/12
    for(const edge of [-1,1]){
      c.box(.22,.031,.22,x+shift,FLOOR+.056,z+edge*(depth/2-.63),pattern,Math.PI/4)
    }
  }
}

export function ceilingStrips(c,body,emitter,mode='rails') {
  if(mode==='square'){
    for(const z of [-13,13]){
      c.box(31,.27,.73,0,CEILING-.34,z,body)
      c.box(30,.12,.38,0,CEILING-.52,z,emitter)
    }
    for(const x of [-15.5,15.5]){
      c.box(.73,.27,26,x,CEILING-.34,0,body)
      c.box(.38,.12,25,x,CEILING-.52,0,emitter)
    }
    return
  }
  for(const x of [-12.5,12.5]){
    c.box(.62,.18,29,x,CEILING-.28,-1.2,body)
    c.box(.26,.11,26,x,CEILING-.43,-1.2,emitter)
  }
}

export function sofa(c,x,z,orientation,mat,frame) {
  const group=new T.Group()
  group.position.set(x,FLOOR,z)
  group.rotation.y=orientation
  c.architecture.add(group)
  c.softBox(7.1,.55,3.2,.14,0,.58,0,frame,group)
  c.softBox(7.4,2.66,.63,.21,0,1.86,-1.36,mat,group)
  for(let i=-1;i<=1;i++){
    c.softBox(2.2,.62,2.42,.26,i*2.25,1.12,.13,mat,group)
    const cushion=c.softBox(2.2,1.62,.54,.22,i*2.25,2.07,-.94,mat,group)
    cushion.rotation.x=-.15
  }
  for(const side of [-1,1]) {
    c.softBox(.6,1.65,3.18,.22,side*3.4,1.42,0,mat,group)
    for(const leg of [-1,1])c.cylinder(.075,.11,.54,side*3.12,.26,leg*1.23,frame,12,group)
  }
  c.block(x,z,orientation===0?7.5:3.3,orientation===0?3.3:7.5)
}

export function chair(c,x,z,orientation,mat,frame) {
  const group=new T.Group()
  group.position.set(x,FLOOR,z)
  group.rotation.y=orientation
  c.architecture.add(group)
  c.softBox(2.86,.56,2.8,.23,0,1.34,0,mat,group)
  c.softBox(2.9,2.15,.49,.24,0,2.46,-1.18,mat,group).rotation.x=-.12
  for(const side of [-1,1]){
    c.softBox(.25,.24,2.63,.08,side*1.44,2.0,-.12,frame,group)
    for(const end of [-1,1]) c.cylinder(.1,.13,1.42,side*1.18,.72,end*.96,frame,9,group)
  }
  c.block(x,z,3,3)
}

export function columns(c,{count=6,x0=-18,x1=18,z=-17,height=13,rad=.67,body,base}) {
  for(let i=0;i<count;i++) {
    const x=x0+(x1-x0)*i/(count-1)
    c.cylinder(rad*.81,rad,height,x,FLOOR+height*.5,z,body,20)
    for(const y of [FLOOR+.18,FLOOR+height-.21]){
      c.box(rad*2.6,.37,rad*2.6,x,y,z,base)
    }
    for(const y of [FLOOR+.56,FLOOR+height-.62])c.ring(rad,.087,x,y,z,base,Math.PI/2)
  }
}

export function arch(c,x,y,z,radius,depth,mat) {
  const curve=new T.Shape()
  curve.absarc(0,0,radius+.46,0,Math.PI,false)
  const inner=new T.Path()
  inner.absarc(0,0,radius,Math.PI,0,true)
  curve.curves.push(...inner.curves)
  const geo=new T.ExtrudeGeometry(curve,{depth,bevelEnabled:true,bevelThickness:.055,bevelSize:.045,bevelSegments:1,curveSegments:16})
  c.mesh(geo,mat,x,y,z-depth/2)
}

export function plant(c,x,z,size,style='tree',parent=c.architecture) {
  const group=new T.Group()
  group.position.set(x,FLOOR,z)
  group.scale.setScalar(size)
  parent.add(group)
  const bark=c.lit(style==='bamboo'?0x53642f:0x594036)
  const leaves=c.lit(style==='palm'?0x487349:style==='blossom'?0xa3596b:0x416b49,{roughness:.77})
  if(style==='palm'){
    c.mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
      new T.Vector3(0,0,0),new T.Vector3(.27,1.5,.08),new T.Vector3(.37,3.35,.25),
    ]),12,.102,8,false),bark,0,0,0,group)
    for(let i=0;i<9;i++){
      const a=i*2.4,length=1.15+c.rng()*.8
      const geo=new T.BufferGeometry()
      const values=[]
      for(let k=0;k<7;k++){
        const s=k/6,spread=Math.sin(s*Math.PI)*.27
        const f=(angle,advance)=>[Math.cos(angle)*advance,.45*Math.sin(s*Math.PI)-s*s*.67,Math.sin(angle)*advance]
        const [px,py,pz]=f(a,s*length)
        values.push(px+Math.sin(a)*spread,py,pz-Math.cos(a)*spread,px-Math.sin(a)*spread,py,pz+Math.cos(a)*spread)
      }
      const index=[]
      for(let k=0;k<6;k++)index.push(k*2,k*2+1,k*2+2,k*2+1,k*2+3,k*2+2)
      geo.setAttribute('position',new T.Float32BufferAttribute(values,3))
      geo.setIndex(index);geo.computeVertexNormals()
      leaves.side=T.DoubleSide
      c.mesh(geo,leaves,.37,3.35,.25,group)
    }
  }else if(style==='bamboo'){
    const joints=c.lit(0x829c60)
    for(let i=0;i<6;i++){
      const off=(i-2.5)*.31,h=2.2+c.rng()*1.75
      c.cylinder(.031,.063,h,off,h/2,0,bark,6,group)
      for(let y=.43;y<h-.21;y+=.46)c.cylinder(.067,.067,.026,off,y,0,joints,6,group)
    }
    c.mesh(treeMeshes(c,'tree').canopy,leaves,0,0,0,group).scale.set(.91,.97,.55)
  }else{
    const tree=treeMeshes(c,style)
    c.mesh(tree.branches,bark,0,0,0,group)
    c.mesh(tree.canopy,leaves,0,0,0,group)
    leaves.side=T.DoubleSide
  }
  c.actions.push(time=>{group.rotation.z=Math.sin(time*.8+x)*.024;group.rotation.x=Math.sin(time*.63+z)*.019})
  return group
}

function treeMeshes(c,style) {
  c.treeModels ||= new Map()
  if(c.treeModels.has(style))return c.treeModels.get(style)
  const wood=[new T.CylinderGeometry(.062,.16,2.68,7).rotateZ(.086).translate(-.11,1.34,0)]
  const canopy=[], vertices=[]
  const origin=new T.Vector3(-.18,1.79,0),up=new T.Vector3(0,1,0)
  for(let branch=0;branch<9;branch++){
    const angle=branch*2.399
    const spread=.43+c.rng()*.58
    const tip=new T.Vector3(Math.cos(angle)*spread,2.3+branch*.14,Math.sin(angle)*spread)
    const direction=tip.clone().sub(origin)
    const segment=new T.CylinderGeometry(.024,.059,direction.length(),6)
    segment.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,direction.normalize()))
    const mid=origin.clone().lerp(tip,.5)
    wood.push(segment.translate(mid.x,mid.y,mid.z))
    const cluster=new T.IcosahedronGeometry(.61,1)
    const points=cluster.attributes.position
    for(let i=0;i<points.count;i++){
      const x=points.getX(i),y=points.getY(i),z=points.getZ(i)
      const wiggle=1+Math.sin(x*22+y*16+z*29+branch)*.12
      points.setXYZ(i,x*wiggle,y*.69*wiggle,z*wiggle)
    }
    cluster.computeVertexNormals()
    canopy.push(cluster.translate(tip.x,tip.y,tip.z))
    for(let leaf=0;leaf<32;leaf++){
      const t=leaf*2.399, radius=.46+c.rng()*.24
      const x=tip.x+Math.cos(t)*radius,z=tip.z+Math.sin(t)*radius
      const y=tip.y+(c.rng()-.5)*.73
      const width=.043+c.rng()*.051, length=.095+c.rng()*.071
      vertices.push(x-width,y,z,x,y+length,z-.07,x+width,y,z,x,y-length*.57,z+.07,
        x-width,y,z,x+width,y,z)
    }
  }
  const leaves=new T.BufferGeometry()
  leaves.setAttribute('position',new T.Float32BufferAttribute(vertices,3))
  leaves.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2))
  leaves.computeVertexNormals()
  canopy.push(leaves)
  const tree={branches:mergeGeometries(wood),canopy:mergeGeometries(canopy)}
  for(const geometry of wood.concat(canopy))geometry.dispose()
  c.treeModels.set(style,tree)
  return tree
}
