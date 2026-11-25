import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { FLOOR } from './craft.js'

export function peaks(c,{z=-48,snow=true,width=164,depth=91,height=27}={}) {
  const terrain=new T.PlaneGeometry(width,depth,c.detail==='low'?58:86,c.detail==='low'?38:64)
  terrain.rotateX(-Math.PI/2)
  const xyz=terrain.attributes.position
  const palette=snow?[0x3d5368,0x778894,0xc0d0d6,0xe4edf1]:[0x714633,0x94634d,0xb58364,0xd6a879]
  const colors=[]
  const sample=(x,z)=>Math.sin(x*.05+Math.sin(z*.075))*Math.cos(z*.079-x*.027)*.52+
    Math.sin(x*.13-z*.083)*Math.cos(z*.17+x*.19)*.24+Math.sin(x*.29+z*.186)*.11+Math.cos(x*.52-z*.45)*.055
  for(let i=0;i<xyz.count;i++) {
    const x=xyz.getX(i),d=xyz.getZ(i)
    const ridge=Math.abs(sample(x,d))**.66
    const bank=Math.max(0,1-Math.abs(d+12)/(depth*.52))
    const y=(ridge*height*1.38+Math.sin(x*.09)*3)*bank
    xyz.setY(i,y)
    const value=Math.min(2.99,Math.max(0,y/(height*.25)+Math.sin(x*.13-d*.61)*.2))
    const color=new T.Color(palette[Math.floor(value)]).lerp(new T.Color(palette[Math.ceil(value)]),value%1)
    const variation=.8+c.rng()*.25
    colors.push(color.r*variation,color.g*variation,color.b*variation)
  }
  terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3))
  terrain.computeVertexNormals()
  c.mesh(terrain,c.lit(0xffffff,{vertexColors:true,roughness:.99}),0,FLOOR-3,z)
}

export function pineValley(c) {
  const low=c.detail==='low'
  const count=low?32:58
  const tiers=low?6:7, arms=low?3:4, twigs=low?2:3
  const needles=[],powder=[]
  for(let tier=0;tier<tiers;tier++){
    const radius=1.95*(1-tier/tiers*.87)
    for(let arm=0;arm<arms;arm++){
      const angle=arm*2*Math.PI/arms+tier*1.44+(c.rng()-.5)*.36
      const length=radius*(.75+c.rng()*.48)
      const height=.76+tier*(3.89/(tiers-1))+c.rng()*.11
      for(let twig=0;twig<twigs;twig++){
        const fraction=.29+twig*.57/(twigs-1)
        const direction=angle+(twig%2?-.32:.31)
        const x=Math.cos(angle)*length*fraction,z=Math.sin(angle)*length*fraction
        const y=height-fraction*.21
        const branch=new T.IcosahedronGeometry(1,0)
        branch.scale(length*(.34-.03*twig),.093+.044*(1-fraction),.21-.025*twig)
        branch.rotateY(-direction)
        branch.translate(x,y,z)
        needles.push(branch)
        if(c.rng()>.35) {
          const snow=new T.IcosahedronGeometry(1,0)
          snow.scale(length*(.25-.023*twig),.078,.15-.022*twig)
          snow.rotateY(-direction)
          snow.translate(x,y+.085,z)
          powder.push(snow)
        }
      }
    }
  }
  const forest=new T.InstancedMesh(mergeGeometries(needles),c.lit(0x263d42,{roughness:1}),count)
  const snow=new T.InstancedMesh(mergeGeometries(powder),c.lit(0xbccfd9,{roughness:.91}),count)
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.015,.13,4.75,6).translate(0,2.375,0),
    c.lit(0x312922,{roughness:1}),count)
  for(const geometry of needles.concat(powder))geometry.dispose()
  const pose=new T.Object3D()
  for(let i=0;i<count;i++){
    const p=.69+c.rng()*1.47,x=(c.rng()-.5)*106,z=-25-c.rng()*43
    pose.position.set(x,FLOOR-1.2+c.rng()*1.6,z)
    pose.rotation.y=i*2.399
    pose.scale.set(p,p*(.91+c.rng()*.25),p)
    pose.updateMatrix()
    forest.setMatrixAt(i,pose.matrix)
    snow.setMatrixAt(i,pose.matrix)
    trunks.setMatrixAt(i,pose.matrix)
  }
  c.architecture.add(forest,snow,trunks)
}

export function cityscape(c,{warm=false}={}) {
  const canvas=document.createElement('canvas')
  canvas.width=128;canvas.height=256
  const ctx=canvas.getContext('2d')
  const colors=warm?['#e8b078','#8db4d7','#ceb1d7']:['#70c5eb','#e8ac89','#8e94d7','#e77abb']
  ctx.fillStyle=warm?'#55566a':'#0c182c'
  ctx.fillRect(0,0,128,256)
  for(let row=0;row<32;row++)for(let col=0;col<12;col++){
    if(c.rng()>.47)continue
    const color=colors[Math.floor(c.rng()*colors.length)]
    ctx.fillStyle=color;ctx.globalAlpha=.42+c.rng()*.58
    ctx.fillRect(col*10+3,row*8+2,4+c.rng()*3,1.8+c.rng()*2)
  }
  const map=new T.CanvasTexture(canvas)
  map.colorSpace=T.SRGBColorSpace
  map.anisotropy=4
  const tower=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({map,color:0xdad9eb}),c.detail==='low'?56:108)
  const roof=c.trim(0x202c3d)
  const aerial=c.emit(0x6a97b2), pink=c.emit(0xff438b), amber=c.emit(0xffa460)
  for(let i=0;i<tower.count;i++){
    const band=Math.floor(i/16),x=(i%16-7.5)*7.1+(c.rng()-.5)*4,z=-31-band*8.9-c.rng()*4
    const h=9+c.rng()*(band<2?29:40)
    const w=2.7+c.rng()*3.7,d=3+c.rng()*5
    c.pose.position.set(x,-16+h/2,z)
    c.pose.scale.set(w,h,d)
    c.pose.rotation.set(0,0,0);c.pose.updateMatrix()
    tower.setMatrixAt(i,c.pose.matrix)
    if(band<2){
      c.box(w+.21,.42,d+.18,x,-16+h,z,roof)
      if(i%4===0){
        c.box(.13,2.48,.13,x,-15+h,z,aerial)
        c.box(.37,.41,.37,x,-13.9+h,z,i%8===0?pink:amber)
      }
      if(i%5===0)c.box(w*.9,.43,.18,x,-16+h*.73,z+d/2,i%10===0?pink:aerial)
    }
  }
  c.architecture.add(tower)
  const vehicles=[]
  const chassis=c.trim(0x2f3c4e),headlight=c.emit(0xc3f6ff),tail=c.emit(0xff245e)
  for(let i=0;i<(c.detail==='low'?7:14);i++){
    const car=new T.Group()
    const body=c.softBox(i%6===0?4.1:1.45,.36,.62,.14,0,0,0,chassis,car)
    const direction=i%2===0?1:-1
    const length=body.geometry.parameters?.width ?? 1.45
    for(const side of [-1,1]){
      c.softBox(.14,.13,.14,.031,direction*(length/2-.03),-.01,side*.21,headlight,car)
      c.softBox(.08,.096,.12,.015,-direction*(length/2-.025),-.01,side*.21,tail,car)
    }
    car.position.set(0,-7+i%4*3.17,-27-i%3*5.8)
    c.architecture.add(car)
    vehicles.push([car,110*c.rng(),direction,3.8+c.rng()*7])
  }
  c.actions.push(time=>{
    for(const [car,offset,dir,speed] of vehicles)car.position.x=dir*((offset+time*speed)%112-56)
  })
}

export function oceanBackdrop(c,mats) {
  for(let i=0;i<12;i++){
    const island=c.mesh(new T.IcosahedronGeometry(1,1),mats.rock,(i-5.5)*12,-3.8-c.rng()*2,-71-c.rng()*15)
    island.scale.set(8+c.rng()*8,3+c.rng()*4,4+c.rng()*4)
  }
  const sun=c.ball(3.8,-15,10,-82,c.emit(0xffd399),30)
  sun.material.fog=false
}
