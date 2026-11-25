import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export const FLOOR=-3.52
export const HALFW=20.4
export const HALFD=20.4
export const CEILING=15.9
const textureLoader=new T.TextureLoader()
const gltf=new GLTFLoader()
const assets='/world-assets/'
export function rng(seed=82) {
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
}

export class Craft {
  constructor(profile,detail) {
    this.root=new T.Group()
    this.root.name='world:'+profile.id
    this.architecture=new T.Group()
    this.root.add(this.architecture)
    this.detail=detail
    this.pending=[]
    this.actions=[]
    this.boxes=new Map()
    this.colliders=[]
    this.textures=new Map()
    this.extraMaterials=new Set()
    this.rng=rng([...profile.id].reduce((sum,letter)=>sum+letter.charCodeAt(0),815))
    this.pose=new T.Object3D()
    this.disposed=false
  }

  lit(color,props={}) {
    return new T.MeshStandardMaterial({color,roughness:.66,...props})
  }
  emit(color) { return new T.MeshBasicMaterial({color}) }
  trim(color) { return this.lit(color,{metalness:.64,roughness:.35}) }

  texture(file,repeat=[1,1],color=true) {
    const key=[file,...repeat,color].join(':')
    if(this.textures.has(key))return this.textures.get(key)
    let map
    this.pending.push(new Promise(resolve=>{
      map=textureLoader.load(assets+file,ready=>{
        if(this.disposed)ready.dispose()
        resolve()
      },undefined,resolve)
    }))
    map.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace
    map.wrapS=map.wrapT=T.RepeatWrapping
    map.repeat.set(...repeat)
    map.anisotropy=this.detail==='low'?1:4
    this.textures.set(key,map)
    return map
  }

  wood(color,repeat=[1,1]) {
    const mat=this.lit(color,{map:this.texture('wood.webp',repeat),roughness:.47})
    if(this.detail!=='low') {
      mat.normalMap=this.texture('wood-normal.webp',repeat,false)
      mat.normalScale.set(.44,.44)
    }
    return mat
  }

  windowGlass(color=0x9fc9df,opacity=.115) {
    return new T.MeshPhysicalMaterial({color,metalness:.14,roughness:.12,transparent:true,opacity,
      side:T.DoubleSide,depthWrite:false})
  }

  box(w,h,d,x,y,z,material,rotation=0) {
    if(!this.boxes.has(material))this.boxes.set(material,[])
    this.boxes.get(material).push([w,h,d,x,y,z,rotation])
  }

  commit() {
    const geometry=new T.BoxGeometry(1,1,1)
    for(const [material,entries] of this.boxes) {
      const instances=new T.InstancedMesh(geometry,material,entries.length)
      instances.receiveShadow=true
      for(const [index,[w,h,d,x,y,z,rotation]] of entries.entries()) {
        this.pose.position.set(x,y,z)
        this.pose.rotation.set(0,rotation,0)
        this.pose.scale.set(w,h,d)
        this.pose.updateMatrix()
        instances.setMatrixAt(index,this.pose.matrix)
      }
      instances.instanceMatrix.needsUpdate=true
      this.architecture.add(instances)
    }
    if(!this.boxes.size)geometry.dispose()
    this.boxes.clear()
  }

  mesh(geometry,material,x=0,y=0,z=0,parent=this.architecture) {
    const mesh=new T.Mesh(geometry,material)
    mesh.position.set(x,y,z)
    mesh.receiveShadow=true
    parent.add(mesh)
    return mesh
  }

  softBox(w,h,d,r,x,y,z,material,parent) {
    return this.mesh(new RoundedBoxGeometry(w,h,d,this.detail==='low'?1:3,r),material,x,y,z,parent)
  }

  cylinder(top,bottom,h,x,y,z,material,radial=24,parent) {
    return this.mesh(new T.CylinderGeometry(top,bottom,h,radial),material,x,y,z,parent)
  }

  ball(radius,x,y,z,material,detail=24,parent) {
    return this.mesh(new T.SphereGeometry(radius,detail,Math.max(8,detail>>1)),material,x,y,z,parent)
  }

  ring(radius,thickness,x,y,z,material,rotationX=0,parent) {
    const ring=this.mesh(new T.TorusGeometry(radius,thickness,8,64),material,x,y,z,parent)
    ring.rotation.x=rotationX
    return ring
  }

  glow(color,intensity,distance,x,y,z) {
    const light=new T.PointLight(color,intensity,distance,2)
    light.position.set(x,y,z)
    this.root.add(light)
    return light
  }

  block(x,z,width,depth) {
    this.colliders.push([x-width/2,x+width/2,z-depth/2,z+depth/2])
  }

  step(time,dt) {
    for(const action of this.actions)action(time,dt)
  }

  prop(file,placements,height) {
    const promise=gltf.loadAsync(assets+file).then(({scene})=>{
      if(this.disposed){disposeTree(scene);return}
      scene.updateMatrixWorld(true)
      const box=new T.Box3().setFromObject(scene)
      const center=box.getCenter(new T.Vector3())
      const size=box.getSize(new T.Vector3())
      const scale=height/size.y
      scene.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale)
      scene.scale.setScalar(scale)
      const prototype=new T.Group()
      prototype.add(scene)
      for(const [x,z,angle,y=FLOOR] of placements) {
        const copy=prototype.clone(true)
        copy.position.set(x,y,z)
        copy.rotation.y=angle
        this.architecture.add(copy)
        this.block(x,z,size.x*scale,size.z*scale)
      }
    }).catch(error=>console.warn('World model unavailable',file,error.message))
    this.pending.push(promise)
  }

  dispose() {
    this.disposed=true
    this.root.removeFromParent()
    disposeTree(this.root,this.textures.values(),this.extraMaterials)
  }
}

export function disposeTree(root,extraTextures=[],extraMaterials=[]) {
  const geometries=new Set(),materials=new Set(extraMaterials),textures=new Set(extraTextures)
  root.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry)
    if(object.material)for(const material of [].concat(object.material))materials.add(material)
    if(object.isInstancedMesh)object.dispose()
  })
  for(const material of materials) {
    for(const value of Object.values(material))if(value?.isTexture)textures.add(value)
    material.dispose()
  }
  for(const texture of textures) {
    texture.dispose()
    if (texture.source?.data instanceof ImageBitmap) texture.source.data.close()
  }
  for(const geometry of geometries)geometry.dispose()
}
