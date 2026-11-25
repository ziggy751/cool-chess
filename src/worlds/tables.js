import * as T from 'three'
import { Craft, FLOOR } from './craft.js'

export function tableFactory(profile,id,detail) {
  const c=new Craft(profile,detail)
  c.root.name='table:'+id
  const maple=c.wood(0xd4a675,[2,2])
  const walnut=c.wood(0x795137,[2,2])
  const brass=c.trim(0xb58a4b)
  const dark=c.trim(0x252930)
  const stone=c.lit(0x888a8b,{roughness:.56,metalness:.08})
  const glass=new T.MeshPhysicalMaterial({color:0x70b7d8,roughness:.17,metalness:.23,clearcoat:.88})
  const teal=c.emit(0x6dcde7)

  switch(id) {
    case 'console':
    case 'orbital': {
      c.softBox(10.6,.44,9.9,.14,0,-.585,0,dark)
      c.softBox(9.95,.085,9.39,.038,0,-.33,0,stone)
      for(const direction of [-1,1]){
        c.box(9.97,.063,.081,0,-.54,direction*4.98,teal)
        c.box(.103,.062,9.6,direction*5.31,-.54,0,teal)
        if(id==='console'){
          const leg=c.softBox(.88,2.67,5.4,.16,direction*3.67,FLOOR+1.34,0,dark)
          leg.rotation.z=direction*.20
          c.softBox(1.96,.23,5.8,.09,direction*3.3,FLOOR+.12,0,stone)
        }
      }
      if(id==='orbital'){
        c.cylinder(2.59,3.12,.25,0,FLOOR+.127,0,dark,36)
        c.cylinder(1.46,2.34,2.5,0,-2.12,0,dark,36)
        c.cylinder(2.04,2.04,.12,0,-1.05,0,stone,36)
        c.ring(1.78,.058,0,-1.06,0,teal,Math.PI/2)
      }
      break
    }
    case 'glass': {
      c.softBox(10.72,.33,10.16,.13,0,-.54,0,glass)
      c.softBox(10.27,.09,9.75,.08,0,-.4,0,dark)
      for(const x of [-3.34,3.34]){
        const upright=c.softBox(.61,2.88,6.75,.22,x,FLOOR+1.45,0,glass)
        upright.rotation.z=x>0?-.18:.18
        c.softBox(1.2,.15,7,.075,x,FLOOR+.085,0,dark)
      }
      break
    }
    case 'stone':
    case 'concrete': {
      c.softBox(10.49,.41,9.93,.12,0,-.582,0,stone)
      c.softBox(10.04,.12,9.47,.07,0,-.85,0,dark)
      for(const [x,z] of [[-3.65,-2.68],[3.65,-2.68],[-3.65,2.68],[3.65,2.68]]){
        c.softBox(id==='stone'?1.42:1.88,.22,1.57,.07,x,FLOOR+.106,z,stone)
        if(id==='stone'){
          c.cylinder(.53,.68,2.55,x,-2.13,z,stone,18)
          for(let i=0;i<10;i++){
            const a=Math.PI*.2*i
            c.cylinder(.034,.043,2.41,x+Math.cos(a)*.586,-2.13,z+Math.sin(a)*.586,dark,7)
          }
        }else c.softBox(1.61,2.46,1.46,.094,x,-2.15,z,stone)
      }
      break
    }
    case 'clockwork': {
      c.softBox(10.7,.5,10.2,.12,0,-.625,0,walnut)
      c.softBox(10.47,.12,9.95,.063,0,-.379,0,brass)
      for(const x of [-3.72,3.72]){
        for(const z of [-3.72,3.72])c.cylinder(.46,.62,2.68,x,-2.13,z,brass,14)
        c.box(.24,.27,7.7,x,-2.85,0,dark)
        for(const z of [-4.75,4.75]){
          c.ring(.62,.07,x,-1.62,z,brass)
          c.cylinder(.49,.49,.15,x,-1.62,z,dark,20).rotation.x=Math.PI/2
        }
      }
      break
    }
    default: {
      const wood=id==='teak'?maple:walnut
      c.softBox(10.69,.32,10.09,.105,0,-.54,0,wood)
      c.softBox(10.19,.18,9.69,.065,0,-.79,0,id==='low'?maple:dark)
      for(const side of [-1,1]){
        c.box(9.77,.12,.08,0,-.497,side*5.048,maple)
        c.box(.085,.12,9.5,side*5.34,-.497,0,maple)
        c.box(.34,.5,8,side*4.18,-1.025,0,wood)
        c.box(8.1,.5,.32,0,-1.025,side*4.09,wood)
      }
      for(const [x,z] of [[-3.94,-3.75],[3.94,-3.75],[-3.94,3.75],[3.94,3.75]]) {
        const leg=c.softBox(id==='low'?.93:.62,2.55,.62,.068,x,-2.24,z,wood)
        leg.rotation.z=Math.sign(x)*.052
        c.box(.66,.16,.67,x,FLOOR+.079,z,dark)
      }
      if(id==='low')for(const x of [-4.62,4.62])c.box(.64,.37,8.09,x,FLOOR+.22,0,maple)
      if(id==='teak')for(let i=0;i<14;i++)c.box(.067,.052,9.8,(i-6.5)*.70,-.38,.04,brass)
    }
  }
  const used=new Set(c.boxes.keys())
  c.architecture.traverse(o=>{if(o.material)used.add(o.material)})
  for(const material of [maple,walnut,brass,dark,stone,glass,teal])if(!used.has(material))material.dispose()
  c.commit()
  return c
}
