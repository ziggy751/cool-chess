import { Color, Vector3 } from 'three'
import { indicatorColors, lastMoveColors } from './gameplay.js'

const svgNS='http://www.w3.org/2000/svg'
const make=(name,attributes={})=>{
  const element=document.createElementNS(svgNS,name)
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value)
  return element
}
const center=square=>[square.charCodeAt(0)-100.5,4.5-Number(square[1])]
const ring=Array.from({length:28},(_,index)=>{
  const angle=index*2*Math.PI/28
  return [Math.cos(angle),Math.sin(angle)]
})
const tile=[[-1,-1],[1,-1],[1,1],[-1,1]]

export class BoardOverlay {
  constructor(host,camera){
    this.host=host
    this.camera=camera
    this.svg=make('svg',{'class':'board-overlay','aria-hidden':'true'})
    this.svg.append(this.static=make('g'),this.dynamic=make('g'))
    host.append(this.svg)
    this.marks=new Map()
    this.projected=new Vector3()
    this.arrow=make('polygon',{'class':'move-arrow',hidden:''})
    this.static.append(this.arrow)
    this.width=0
    this.height=0
  }

  set({marks,arrow},settings){
    this.settings=settings
    this.svg.classList.toggle('high-contrast',Boolean(settings.highContrast))
    this.svg.classList.toggle('no-motion',Boolean(settings.reduced))
    this.svg.style.setProperty('--legal-color',indicatorColors[settings.highlight] || indicatorColors.green)
    this.svg.style.setProperty('--mark-opacity',settings.indicatorOpacity ?? .94)
    this.svg.style.setProperty('--last-color',lastMoveColors[settings.lastMoveColor] || lastMoveColors.gold)
    this.svg.classList.toggle('subdued',settings.overlayIndicators===false)
    const remaining=new Set(this.marks.keys())
    for(const [square,kind] of marks){
      const key=square+':'+kind
      remaining.delete(key)
      if(!this.marks.has(key)){
        const element=make('polygon',{'class':'board-mark mark-'+kind,'data-marker':kind,'data-marker-square':square})
        this.static.append(element)
        this.marks.set(key,{element,center:center(square),kind})
      }
      const index=(square.charCodeAt(0)-97+8-Number(square[1]))%2
      this.marks.get(key).element.classList.toggle('bright-square',Boolean(this.bright?.[index]))
    }
    for(const key of remaining){
      const {element}=this.marks.get(key)
      this.marks.delete(key)
      if(settings.reduced || !element.animate)element.remove()
      else element.animate([{opacity:1},{opacity:0}],{duration:120,fill:'forwards'}).finished.then(()=>element.remove())
    }
    this.route=arrow?.map(center)
    this.arrow.toggleAttribute('hidden',!this.route)
  }

  setPalette(palette){
    this.bright=palette.map(value=>{
      const {r,g,b}=new Color(value)
      return r*.2126+g*.7152+b*.0722>.26
    })
  }

  moved(from,to,start,duration,capture){
    if(!from || !to || from===to || this.settings?.reduced || this.settings?.showLastMove===false)return
    this.flight={from:center(from),to:center(to),start,duration}
    this.trail ||= make('polyline',{'class':'move-trail'})
    this.pulse ||= make('polygon',{'class':'move-pulse'})
    this.pulse.classList.toggle('capture-pulse',Boolean(capture))
    this.dynamic.append(this.trail,this.pulse)
  }

  clearMotion(){
    this.flight=null
    this.trail?.remove()
    this.pulse?.remove()
  }

  project(x,z){
    const p=this.projected.set(x,.116,z).project(this.camera)
    if(Math.abs(p.z)>1 || !Number.isFinite(p.x) || Math.abs(p.x)>18 || Math.abs(p.y)>18)return null
    return [(p.x+1)*this.width/2,(1-p.y)*this.height/2]
  }

  points(element,points){
    element.toggleAttribute('hidden',points.some(point=>!point))
    if(!element.hasAttribute('hidden'))element.setAttribute('points',points.map(point=>point.map(value=>value.toFixed(1)).join(',')).join(' '))
  }

  update(time,enabled){
    this.svg.toggleAttribute('hidden',!enabled)
    if(!enabled)return
    this.width=this.host.clientWidth
    this.height=this.host.clientHeight
    const size=this.settings?.indicatorSize ?? 1
    for(const {element,center:[x,z],kind} of this.marks.values()){
      const circular=['move','capture','check'].includes(kind)
      const radius=kind==='move'?.127*size:kind==='capture'?Math.min(.47,.425*size):kind==='check'?.426:.46
      this.points(element,(circular?ring:tile).map(([dx,dz])=>this.project(x+dx*radius,z+dz*radius)))
    }
    if(this.route){
      const [a,b]=this.route.map(([x,z])=>this.project(x,z))
      if(a && b){
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
        const ux=dx/Math.max(1,length),uy=dy/Math.max(1,length),tip=Math.min(12,length*.34)
        const at=(along,side)=>[a[0]+ux*along-uy*side,a[1]+uy*along+ux*side]
        const base=length-tip
        this.points(this.arrow,[at(0,2),at(base,2),at(base,5),b,at(base,-5),at(base,-2),at(0,-2)])
      }else this.arrow.setAttribute('hidden','')
    }
    const flight=this.flight
    if(!flight)return
    const progress=Math.max(0,(time-flight.start)/Math.max(1,flight.duration))
    if(progress>1.85){this.clearMotion();return}
    const point=t=>this.project(flight.from[0]+(flight.to[0]-flight.from[0])*t,flight.from[1]+(flight.to[1]-flight.from[1])*t)
    const position=Math.min(1,progress)
    const eased=position*position*(3-2*position)
    this.points(this.trail,[point(Math.max(0,eased-.58)),point(eased)])
    this.trail.style.opacity=String(Math.max(0,.48*(1-progress/1.45)))
    const spread=.18+Math.max(0,progress-1)*.27
    this.points(this.pulse,ring.map(([x,z])=>this.project(flight.to[0]+x*spread,flight.to[1]+z*spread)))
    this.pulse.style.opacity=String(progress<.88?0:Math.max(0,.85*(1-Math.max(0,progress-1)/.85)))
  }
}
