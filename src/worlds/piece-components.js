import * as T from 'three'

const geometries={
  collar:new T.TorusGeometry(.19,.023,8,30).rotateX(Math.PI/2),
  helix:new T.TorusGeometry(.145,.010,7,32).rotateX(Math.PI/2),
  prism:new T.OctahedronGeometry(.074),
  panel:new T.BoxGeometry(.083,.075,.028,1,2,1),
  tooth:new T.BoxGeometry(.061,.046,.045),
  sphere:new T.SphereGeometry(.032,10,8),
}
const accents={
  dark:new T.MeshPhysicalMaterial({metalness:.74,roughness:.23,color:0x292d37}),
  brass:new T.MeshPhysicalMaterial({metalness:.86,roughness:.27,color:0xc7964c}),
  glass:new T.MeshPhysicalMaterial({metalness:.21,roughness:.13,color:0xa9e2e8,clearcoat:.71}),
}
export function pieceComponents(recipe,type) {
  const rotor=new T.Group()
  const visibleHeight={p:.54,n:.73,b:.72,r:.70,q:.79,k:.80}[type]
  rotor.position.y=recipe.parts==='dial'?.235:visibleHeight
  if(type==='p')rotor.scale.setScalar(.79)
  const parts=recipe.parts
  const metallic=['gear','dial','plates','halo','scales','relic'].includes(parts)
  const material=metallic?accents.brass:parts==='vortex'?accents.dark:accents.glass
  const add=(name,x,y,z,ry=0)=>{
    const mesh=new T.Mesh(geometries[name],material)
    mesh.position.set(x,y,z)
    mesh.rotation.y=ry
    rotor.add(mesh)
    return mesh
  }
  if(parts==='gear'||parts==='dial'){
    add('collar',0,0,0)
    add('helix',0,.049,0)
    for(let index=0;index<(parts==='dial'?12:10);index++){
      const a=index*(parts==='dial'?Math.PI/6:Math.PI/5)
      const tooth=add('tooth',Math.sin(a)*.205,0,Math.cos(a)*.205,a)
      tooth.scale.set(parts==='dial'?.46:1,1,1)
    }
  }else if(parts==='plates'){
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3
      add('panel',Math.sin(angle)*.155,0,Math.cos(angle)*.155,angle)
    }
  }else if(parts==='scales'){
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4
      const inset=add('prism',Math.sin(angle)*.173,-.058,Math.cos(angle)*.173,angle)
      inset.scale.set(.55,.42,.61)
    }
  }else{
    const rings=parts==='relic'?1:2
    for(let layer=0;layer<rings;layer++){
      const mesh=add('helix',0,layer*.095-.035,0)
      mesh.rotation.z=(layer?1:-1)*.36
      mesh.scale.multiplyScalar(parts==='vortex'?.96:1.18)
    }
    for(let i=0;i<(parts==='relic'?3:4);i++){
      const a=i*Math.PI*2/(parts==='relic'?3:4)
      const decoration=add(parts==='flux'?'sphere':'prism',Math.sin(a)*.192,.015+i%2*.08,Math.cos(a)*.192,a)
      decoration.scale.setScalar(parts==='prism'?.88:.63)
    }
  }
  return {rotor,height:rotor.position.y,parts}
}

export function stepComponents(component,clock,flight=false) {
  if(!component)return
  const {rotor,height,parts}=component
  rotor.rotation.y=clock*(flight?2.3:parts==='dial'?.35:parts==='gear'?.89:.49)
  if(parts==='relic'||parts==='ripple')rotor.position.y=height+Math.sin(clock*.95)*.028
  if(parts==='plates')rotor.scale.y=1+Math.sin(clock*1.2)*.17
  if(parts==='vortex')rotor.rotation.z=Math.sin(clock*.62)*.21
}
