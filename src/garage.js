import { locations, locationFor, tables, lightingStyles, curated } from './worlds/catalog.js'
import { premiumCollections, collectionList, baseStyles } from './collections.js'
import { finishList, pieces, palettes, themeList } from './board.js'
import { icon } from './icons.js'

export const movements={auto:'Match the piece edition',glide:'Classic glide',lift:'Smooth lift',cinematic:'Cinematic',teleport:'Teleport',
  liquid:'Liquid transformation',hologram:'Holographic reconstruction',dissolve:'Crystal dissolve',mechanical:'Mechanical movement',cosmic:'Cosmic trail',water:'Water glide',shadow:'Shadow transfer',royal:'Royal procession'}
export const effects={none:'None',gold:'Gold dust',crystal:'Crystal shards',signal:'Signal pulse',ember:'Embers',auto:'Match the piece edition',cosmic:'Starlight',water:'Water droplets',clockwork:'Clockwork fragments',shadow:'Shadow motes'}
export const cameras={flat:'Classic 2D',angled:'Standard 3D',low:'Cinematic',board:'Board-level',
  close:'Close-up',orbit:'Free orbit',roam:'Free roam',showcase:'Automatic showcase',seated:'Seated',overhead:'Overhead',photo:'Photography'}
const variants=[['sets','Piece sets'],['environment','Environments'],['table','Tables'],['theme','Chessboards'],
  ['white','White pieces'],['black','Black pieces'],['motion','Animations'],['effect','Effects'],['lighting','Lighting'],
  ['view','Camera'],['curated','Curated setups'],['presets','Saved presets']]
const motionSpeeds={instant:'Instant',fast:'Fast',normal:'Normal',cinematic:'Cinematic'}

export const catalog = Object.fromEntries(Object.entries(premiumCollections).map(([key,collection])=>[key,collection]))
export const styleKeys = ['theme','environment','collection','white','black','overrides','motion','effect','table','lighting','motionSpeed','motionIntensity','captureIntensity']
export const applyCollection = (settings,id) => {
  const edition=catalog[id]
  Object.assign(settings,{collection:id,white:edition?.white || 'ivory',black:edition?.black || 'ebony',overrides:{}})
}
export const getStyle = settings => Object.fromEntries(styleKeys.map(key=>[key,structuredClone(settings[key])]))

const entries = {
  sets:Object.entries(catalog).map(([id,item])=>({id,label:item.label,category:item.category,image:'/catalog/'+id+'.webp'})),
  theme:Object.entries(themeList).map(([id,label])=>({id,label,category:palettes[id][4]?'animated':'classic',image:'/board-previews/'+id+'.webp'})),
  environment:Object.values(locations).map(({id,name,category,preview})=>({id,label:name,category,image:preview,animated:true})),
  table:Object.entries(tables).map(([id,label])=>({id,label,image:id==='auto'?locations.cabin.preview:'/table-previews/'+id+'.webp'})),
  lighting:Object.entries(lightingStyles).map(([id,label])=>({id,label})),
  view:Object.entries(cameras).filter(([id])=>id!=='flat').map(([id,label])=>({id,label})),
  curated:Object.entries(curated).map(([id,setup])=>({id,label:setup.name,image:locations[setup.environment].preview,setup})),
  motion:Object.entries(movements).map(([id,label])=>({id,label})),
  effect:Object.entries(effects).map(([id,label])=>({id,label})),
}
const optionList = (items,value) => Object.entries(items).map(([id,label])=>`<option value="${id}" ${id===value?'selected':''}>${label}</option>`).join('')
const mk = (tag,style,label='') => Object.assign(document.createElement(tag),{className:style,textContent:label})
const ic = (symbol,label,id) => `<button type="button" class="icon-button" id="${id}" aria-label="${label}" title="${label}">${icon(symbol)}</button>`
const allFinishes=Object.fromEntries(finishList.map(finish=>[finish,finish.replace(/^./,c=>c.toUpperCase())]))
const upper = id => id[0].toUpperCase()+id.slice(1)

export function showroom(host,{settings,defaults,read,persist,onChange,onInspect,onPlay,onClose,onDemo,onPhoto,onCamera,toast}) {
  let tab='sets', category='all', selection='n', target='piece', cameraBoard=true, showing=false
  let previousStyle,view='orbit',activeCurated
  let favorite=new Set(read('favorites',[]))
  let recent=read('recent-items',[])
  let presets=read('presets',[])
  const $=id=>host.querySelector('#'+id)
  host.innerHTML=`
    <div class="studio-heading"><div><h1>Collection</h1><p>Live showroom</p></div>
      <div class="studio-actions">${ic('rotate-ccw','Reset to default','studio-reset')}
        ${ic('shuffle','Randomize setup','studio-random')}
        <button class="secondary" id="studio-close">Back</button>
        <button class="primary" id="studio-play">Apply and play ${icon('arrow-up-right')}</button>
      </div></div>
    <nav class="studio-tabs" aria-label="Collection tabs">${variants.map(([id,label])=>`<button type="button" data-studio-tab="${id}">${label}</button>`).join('')}</nav>
    <div class="studio-grid">
      <div class="studio-display"><div id="studio-stage"></div><div class="studio-display-bar">
        <span id="studio-caption"></span><span class="studio-gesture">Right-drag to look · Scroll to zoom</span>
        <button type="button" class="icon-button" id="studio-explore" title="Explore location">${icon('move')}</button>
        <button type="button" class="icon-button" id="studio-compare" title="Compare last setup" disabled>${icon('layers')}</button>
        ${ic('camera','Photography mode','studio-photo')}
      </div></div>
      <aside class="studio-catalog"><div id="studio-content"></div></aside>
    </div>`
  $('studio-reset').onclick=()=>{
    Object.assign(settings,getStyle(defaults))
    update()
    draw()
    toast('Default setup restored')
  }
  $('studio-random').onclick=()=>{
    const pick=array=>array[Math.floor(Math.random()*array.length)]
    applyCollection(settings,pick(Object.keys(catalog)))
    settings.theme=pick(Object.keys(themeList))
    settings.environment=pick(Object.keys(locations))
    update()
    draw()
  }
  $('studio-close').onclick=onClose
  $('studio-play').onclick=onPlay
  $('studio-photo').onclick=onPhoto
  $('studio-explore').setAttribute('aria-label','Explore location')
  $('studio-explore').onclick=()=>{
    cameraBoard=true
    view=view==='roam'?'orbit':'roam'
    onInspect(null)
    onCamera(view)
    $('studio-explore').setAttribute('aria-pressed',String(view==='roam'))
  }
  $('studio-compare').setAttribute('aria-label','Compare last setup')
  $('studio-compare').onclick=()=>{
    if(!previousStyle)return
    const current=getStyle(settings)
    Object.assign(settings,previousStyle)
    previousStyle=current
    update()
    draw()
  }
  host.querySelectorAll('[data-studio-tab]').forEach(button=>{button.onclick=()=>{
    tab=button.dataset.studioTab
    category='all'
    target='piece'
    cameraBoard=!['white','black'].includes(tab)
    if(tab!=='view' && view==='photo')view='orbit'
    draw()
    inspect()
  }})
  function inspect() {
    if (!showing) return
    const side=tab==='white'?'w':'b'
    const preview=!cameraBoard && ['white','black'].includes(tab)
    $('studio-caption').textContent=preview ? (side==='w'?'White ':'Black ')+pieces[selection] :
      locationFor(settings.environment).name+' · '+themeList[settings.theme]
    onInspect(preview ? selection : null,side)
    if(!preview && (tab==='view' || view==='roam'))onCamera(view)
    $('studio-compare').disabled=!previousStyle
  }
  function update() {
    settings.environment=locationFor(settings.environment).id
    persist('settings',settings)
    onChange()
    inspect()
  }
  function apply(item) {
    const id=item.id
    if(tab==='view'){
      view=id
      onCamera(view)
      return
    }
    previousStyle=getStyle(settings)
    if (tab==='sets') {
      applyCollection(settings,id)
      if(catalog[id].motion)Object.assign(settings,{motion:'auto',effect:'auto'})
    }
    else if(tab==='curated'){
      const {environment,theme,collection}=item.setup
      applyCollection(settings,collection)
      Object.assign(settings,{environment,theme,table:'auto',lighting:'natural',motion:'auto',effect:'auto'})
      activeCurated=id
    }else settings[tab]=id
    const key=tab+':'+id
    recent=[key,...recent.filter(value=>value!==key)].slice(0,40)
    persist('recent-items',recent)
    update()
    if (tab==='motion' || tab==='effect') onDemo(tab)
  }
  function draw() {
    host.querySelectorAll('[data-studio-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.studioTab===tab)))
    if (tab==='presets') return drawPresets()
    if (tab==='white' || tab==='black') return editor()
    const panel=$('studio-content')
    const items=entries[tab]
    const selected=()=>{
      if(tab==='sets')return settings.collection
      if(tab==='view')return view
      if(tab==='curated')return activeCurated
      return settings[tab]
    }
    const categories=[...new Set(items.flatMap(item=>item.category?[item.category]:[]))]
    panel.innerHTML=`<div class="catalog-controls">
      <label class="catalog-search">${icon('search')}<input id="catalog-query" type="search" aria-label="Search collection" placeholder="Search"></label>
      <select id="catalog-filter" aria-label="Filter collection">${optionList({all:'All items',favorites:'Favourites',recent:'Recently used',...(tab==='environment'?{animated:'Animated'}:{}),...Object.fromEntries(categories.map(id=>[id,upper(id)]))},category)}</select></div>
      <div class="catalog-track"><span id="catalog-count"></span><div>${ic('chevron-left','Previous item','item-back')}${ic('chevron-right','Next item','item-forward')}</div></div>
      ${tab==='motion'||tab==='effect'?`<div class="motion-panel">
        ${tab==='motion'?`<select id="motion-speed" aria-label="Animation speed">${optionList(motionSpeeds,settings.motionSpeed)}</select>`:''}
        <label>${tab==='motion'?'Move intensity':'Capture intensity'}<input id="effect-strength" type="range" min="0" max="1.2" step=".05" value="${tab==='motion'?settings.motionIntensity:settings.captureIntensity}"></label>
        <button type="button" class="secondary" id="motion-demo">Demo</button></div>`:''}
      <div id="catalog-items" class="catalog-items"></div>`
    if($('motion-speed'))$('motion-speed').onchange=()=>{settings.motionSpeed=$('motion-speed').value;update();onDemo(tab)}
    if($('effect-strength'))$('effect-strength').onchange=()=>{
      settings[tab==='motion'?'motionIntensity':'captureIntensity']=Number($('effect-strength').value)
      update();onDemo(tab)
    }
    if($('motion-demo'))$('motion-demo').onclick=()=>onDemo(tab)
    const filter=()=>items.filter(item=>{
      const key=tab+':'+item.id
      const search=$('catalog-query').value.trim().toLowerCase()
      return item.label.toLowerCase().includes(search) && (category==='all'
        || category==='favorites' && favorite.has(key) || category==='recent' && recent.includes(key) || category==='animated' && item.animated || item.category===category)
    })
    function cards() {
      const list=filter()
      $('catalog-count').textContent=list.length+' '+(list.length===1?'item':'items')
      const area=$('catalog-items')
      area.replaceChildren()
      if (!list.length) area.append(mk('p','catalog-empty','No matching items'))
      for (const item of list) {
        const key=tab+':'+item.id
        const card=mk('div','catalog-card')
        const pick=mk('button','catalog-pick')
        pick.type='button'
        pick.setAttribute('aria-pressed',String(item.id===selected()))
        const preview=mk('span','catalog-preview')
        if (item.image) {
          const img=mk('img','')
          img.src=item.image
          img.alt=''
          img.loading='lazy'
          preview.append(img)
        } else {
          preview.classList.add('catalog-symbol')
          preview.innerHTML=icon(tab==='motion'?'move':tab==='view'?'camera':'sparkles')
        }
        pick.append(preview,mk('span','catalog-name',item.label))
        pick.onclick=()=>{
          apply(item)
          area.querySelectorAll('.catalog-pick').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===pick)))
        }
        const star=mk('button','catalog-star')
        star.type='button'
        star.innerHTML=icon('star')
        star.setAttribute('aria-label','Favourite '+item.label)
        star.setAttribute('aria-pressed',String(favorite.has(key)))
        star.onclick=()=>{
          if(favorite.has(key)) favorite.delete(key)
          else favorite.add(key)
          persist('favorites',[...favorite])
          if (category==='favorites') cards()
          else star.setAttribute('aria-pressed',String(favorite.has(key)))
        }
        card.append(pick,star)
        area.append(card)
      }
    }
    $('catalog-query').oninput=cards
    $('catalog-filter').onchange=()=>{category=$('catalog-filter').value;cards()}
    ;[-1,1].forEach(delta=>{$(delta<0?'item-back':'item-forward').onclick=()=>{
      const list=filter()
      if(!list.length)return
      const current=list.findIndex(item=>item.id===selected())
      const next=current<0?(delta<0?list.length-1:0):(current+delta+list.length)%list.length
      apply(list[next])
      cards()
      $('catalog-items').querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest'})
    }})
    cards()
  }

  function editor() {
    const side=tab==='white'?'w':'b'
    const spec=settings.overrides?.[side]?.[selection] || {}
    const material=spec.material || settings[tab]
    const panel=$('studio-content')
    const open=panel.querySelector('details')?.open
    panel.innerHTML=`<div class="piece-tabs">${Object.entries(pieces).map(([id,label])=>
      `<button type="button" title="${label}" aria-label="${label}" aria-pressed="${id===selection}" data-piece="${id}">${{p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'}[id]}</button>`).join('')}</div>
      <div class="piece-edit">
      <div class="two-fields"><label>Model<select data-edit="collection">${optionList(collectionList,spec.collection || settings.collection)}</select></label>
      <label>Base<select data-edit="base">${optionList(baseStyles,spec.base || 'classic')}</select></label></div>
      <label>Primary material<select data-edit="material">${optionList(allFinishes,material)}</select></label>
      <label>Apply changes to<select id="piece-target">${optionList({piece:'This piece',team:'This team',both:'Both teams'},target)}</select></label>
      <details ${open?'open':''}><summary>Advanced material</summary><div class="piece-advanced">
        <label>Secondary material<select data-edit="secondary">${optionList({'':'None',...allFinishes},spec.secondary || '')}</select></label>
        <div class="two-fields"><label>Colour<input aria-label="Piece colour" type="color" data-edit="tint" value="${spec.tint || (side==='w'?'#dfc7a1':'#28262b')}"></label>
        <label>Emissive colour<input type="color" data-edit="emissive" value="${spec.emissive || '#000000'}"></label></div>
        <label>Metallic finish<input type="range" min="0" max="1" step=".01" data-edit="metalness" value="${spec.metalness ?? .35}"></label>
        <label>Roughness<input type="range" min=".03" max="1" step=".01" data-edit="roughness" value="${spec.roughness ?? .28}"></label>
        <label>Reflectivity<input type="range" min="0" max="2" step=".01" data-edit="reflection" value="${spec.reflection ?? 1}"></label>
        <label>Engraving<select data-edit="engraving">${optionList({none:'None',diamond:'Diamond band',crown:'Crown band'},spec.engraving || 'none')}</select></label>
        <label>Animation style<select data-edit="motion">${optionList({'':'Use setup animation',...movements},spec.motion || '')}</select></label>
      </div></details>
      <div class="piece-buttons">
        <button class="secondary" id="toggle-specimen">${cameraBoard?'Inspect piece':'Show board'}</button>
        <button class="secondary" id="piece-reset">Reset piece</button>
      </div></div>`
    panel.querySelectorAll('[data-piece]').forEach(button=>{button.onclick=()=>{
      selection=button.dataset.piece
      cameraBoard=false
      editor()
      inspect()
    }})
    $('piece-target').onchange=()=>{target=$('piece-target').value}
    panel.querySelectorAll('[data-edit]').forEach(field=>{field.oninput=()=>{
      const sides=target==='both'?['w','b']:[side]
      const types=target==='piece'?[selection]:Object.keys(pieces)
      for (const color of sides) for (const type of types) {
        settings.overrides[color] ||= {}
        const value=field.type==='range'?Number(field.value):field.value
        const options=settings.overrides[color][type] ||= {}
        if (value==='') delete options[field.dataset.edit]
        else options[field.dataset.edit]=value
      }
      update()
    }})
    $('toggle-specimen').onclick=()=>{cameraBoard=!cameraBoard;editor();inspect()}
    $('piece-reset').onclick=()=>{
      delete settings.overrides[side]?.[selection]
      update()
      editor()
    }
  }
  function drawPresets() {
    const panel=$('studio-content')
    panel.innerHTML=`<form id="preset-form" class="preset-form"><label>Preset name<input id="preset-name" required maxlength="32" placeholder="Name this setup"></label><button class="primary">Save preset</button></form><div id="saved-items"></div>`
    const area=$('saved-items')
    if(!presets.length) area.append(mk('p','catalog-empty','No saved presets yet'))
    for(const item of presets) {
      const row=mk('div','preset-row')
      const activate=mk('button','secondary',item.name)
      activate.onclick=()=>{ Object.assign(settings,getStyle(defaults),structuredClone(item.styles));update();toast('Preset applied') }
      const remove=mk('button','icon-button')
      remove.setAttribute('aria-label','Delete '+item.name)
      remove.innerHTML=icon('x')
      remove.onclick=()=>{presets=presets.filter(preset=>preset!==item);persist('presets',presets);drawPresets()}
      row.append(activate,remove)
      area.append(row)
    }
    $('preset-form').onsubmit=event=>{
      event.preventDefault()
      const name=$('preset-name').value.trim()
      if(!name)return
      presets=[{name,styles:getStyle(settings)},...presets.filter(item=>item.name!==name)].slice(0,12)
      persist('presets',presets)
      drawPresets()
      toast('Preset saved')
    }
  }
  return {
    open(){showing=true;view='orbit';draw();inspect()},
    close(){showing=false},
  }
}
