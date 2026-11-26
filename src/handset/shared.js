export function read(key,fallback){
  try{return JSON.parse(localStorage.getItem('evolution-handset-'+key)) ?? fallback}
  catch{return fallback}
}
export function store(key,value){
  try{localStorage.setItem('evolution-handset-'+key,JSON.stringify(value))}
  catch{}
}
export function node(tag,style='',text=''){
  return Object.assign(document.createElement(tag),{className:style,textContent:text})
}
export function optionRows(values,current){
  return Object.entries(values).map(([id,label])=>'<option value="'+id+'"'+(id===current?' selected':'')+'>'+label+'</option>').join('')
}
export function gesture(element,respond){
  let origin
  element.addEventListener('pointerdown',event=>{origin=[event.clientX,event.clientY];element.setPointerCapture(event.pointerId)})
  element.addEventListener('pointerup',event=>{
    if(!origin)return
    const dx=event.clientX-origin[0],dy=event.clientY-origin[1]
    origin=null
    if(Math.hypot(dx,dy)<18)return
    respond(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up')
  })
  element.addEventListener('pointercancel',()=>{origin=null})
}
