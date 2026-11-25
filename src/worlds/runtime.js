import * as T from 'three'
import { Craft, CEILING, FLOOR, HALFD, HALFW } from './craft.js'
import { locationFor } from './catalog.js'
import { cabin, penthouse, station } from './priority.js'
import { tableFactory } from './tables.js'

export class WorldStage {
  constructor(scene,renderer,changed) {
    this.scene=scene
    this.renderer=renderer
    this.changed=changed
    this.time=0
    this.lastProbe=-Infinity
  }

  async load(id,detail) {
    const profile=locationFor(id)
    const signature=profile.id+':'+detail
    if(this.signature===signature)return
    this.signature=signature
    const old=this.room
    const craft=new Craft(profile,detail)
    const builders={cabin,city:penthouse,orbit:station}
    try {
      const builder=builders[profile.builder]
      if(builder)builder(craft,{apartment:profile.id==='rain'})
      else{
        const {buildVariant}=await import('./variants.js')
        if(this.signature!==signature){craft.dispose();return}
        buildVariant(craft,profile)
      }
      craft.commit()
    }catch(error){
      craft.dispose()
      if(this.signature===signature)this.signature=null
      throw error
    }
    if(this.signature!==signature){craft.dispose();return}
    this.room=craft
    this.profile=profile
    this.time=0
    this.detail=detail
    this.scene.background=new T.Color(profile.sky)
    this.scene.fog=['orbit','cosmic'].includes(profile.builder) ? null : new T.Fog(profile.sky,38,139)
    this.scene.add(craft.root)
    old?.dispose()
    this.pendingProbe=true
    this.changed(profile.id)
    await Promise.allSettled(craft.pending)
    if (this.room===craft) {
      this.pendingProbe=true
      this.changed(profile.id)
    }
  }

  table(id,detail) {
    if(!this.profile)return
    const design=id && id!=='auto'?id:this.profile.table
    const key=design+':'+detail
    if(this.tableKey===key)return
    this.tableKey=key
    this.furniture?.dispose()
    this.furniture=tableFactory(this.profile,design,detail)
    this.scene.add(this.furniture.root)
    this.pendingProbe=true
  }

  tick(delta,animate) {
    if(animate && this.room?.actions.length){
      this.time+=delta
      this.room.step(this.time,delta)
      return true
    }
    if(this.room && !this.initialized?.has(this.room)){
      this.initialized ||= new WeakSet()
      this.initialized.add(this.room)
      this.room.step(this.time,0)
      return true
    }
    return false
  }

  capture(time,hide,quality) {
    const refresh=(quality==='ultra'||quality==='photo') && time-this.lastProbe>10000
    if(!this.room || (!this.pendingProbe && !refresh))return false
    if(!this.target){
      this.target=new T.WebGLCubeRenderTarget(96,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter})
      this.probe=new T.CubeCamera(.28,155,this.target)
      this.probe.position.set(0,1.68,0)
    }
    this.lastProbe=time
    this.pendingProbe=false
    const previousEnvironment=this.scene.environment
    const visibility=hide.map(object=>object.visible)
    hide.forEach(object=>{object.visible=false})
    this.scene.environment=null
    try{
      this.probe.update(this.renderer,this.scene)
    }finally{
      hide.forEach((object,index)=>{object.visible=visibility[index]})
      this.scene.environment=previousEnvironment
    }
    return true
  }

  bound(point,walk=false) {
    point.x=T.MathUtils.clamp(point.x,-HALFW+.65,HALFW-.65)
    point.z=T.MathUtils.clamp(point.z,-HALFD+.65,HALFD-.65)
    point.y=T.MathUtils.clamp(point.y,FLOOR+.42,CEILING-.43)
    if(walk)point.y=FLOOR+5.13
    return point
  }

  canWalk(x,z) {
    if(Math.abs(x)>HALFW-.74 || Math.abs(z)>HALFD-.74) return false
    if(Math.abs(x)<5.53 && Math.abs(z)<5.23)return false
    return !this.room?.colliders.some(([left,right,back,front])=>x>left-.52 && x<right+.52 && z>back-.52 && z<front+.52)
  }
}
