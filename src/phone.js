import {icon} from './icons.js'
import {handsetDefaults,wallpapers,frames} from './handset/appearance.js'
import {node,read,store,optionRows} from './handset/shared.js'

const apps={
  youtube:['YouTube Shorts','youtube','coral',()=>import('./handset/youtube.js')],
  comedy:['AI Shorts','sparkles','violet',()=>import('./handset/comedy.js')],
  wings:['Flappy Wings','feather','aqua',()=>import('./handset/arcade.js')],
  snake:['Snake','route','fern',()=>import('./handset/arcade.js')],
  numbers:['2048','hash','amber',()=>import('./handset/puzzles.js')],
  runner:['Geometry Runner','triangle','orchid',()=>import('./handset/arcade.js')],
  tower:['Stack Tower','layers','blue',()=>import('./handset/arcade.js')],
  racing:['Mini Racing','car-front','coral',()=>import('./handset/arcade.js')],
  blocks:['Block Puzzle','blocks','honey',()=>import('./handset/puzzles.js')],
  chess:['Chess Puzzles','chess-knight','teal',()=>import('./handset/chess.js')],
  music:['Music','music','orchid',()=>import('./handset/music.js')],
  settings:['Settings','settings','slate',null],
  clips:['Side Reel','clapperboard','teal',()=>import('./handset/clips.js')],
}
const iconButton=(id,label,symbol)=>'<button id="'+id+'" type="button" aria-label="'+label+'" title="'+label+'">'+icon(symbol)+'</button>'
const settingsFields=[
  ['phoneFrame','Frame finish',frames],['phoneCase','Case',{standard:'None',christmas:'Christmas red',gold:'Champagne'}],
  ['phoneWallpaper','Wallpaper',wallpapers],['phoneMode','Display mode',{dark:'Dark',light:'Light'}],
  ['phoneIcons','App icons',{colour:'Colour',mono:'Monochrome'}],['phoneBrightness','Brightness',[.48,1,.02]],
  ['phoneSize','Size',{compact:'Compact',regular:'Regular',large:'Large'}],['phoneSide','Screen side',{right:'Right',left:'Left'}],
  ['phoneMotion','Animation speed',{quick:'Quick',normal:'Normal',relaxed:'Relaxed'}],
  ['phoneVolume','Media volume',[0,1,.05]],['phoneMuted','Mute native video',true],['phoneLock','Lock when reopened',true],
  ['phoneAutopause','Pause video on your turn',true],['phoneGamePause','Pause games on your turn',true],
  ['phoneMusicContinue','Music continues on Home',true],['phoneNotices','Turn chime',true],
  ['phoneReduced','Reduce motion',true],['phoneShortcut','P shortcut',true],
]
const clock=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hour12:false})
const date=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'})
const limited=new Set(['chess','youtube'])
const gameApps=new Set(['wings','snake','numbers','runner','tower','racing','blocks','chess'])

export function createPhone(host,settings,save){
  for(const [key,value] of Object.entries(handsetDefaults))settings[key]??=value
  const layout=host.closest('.game-layout')
  const launcher=document.getElementById('phone-toggle')
  host.innerHTML=`
    <div class="phone-housing"><div class="phone-screen">
      <div class="phone-status"><time></time><span class="handset-sensor" aria-hidden="true"><i></i></span>
        <span title="Browser network status">${icon('wifi')} ${icon('battery-full')}</span></div>
      <header class="phone-header"><strong>Side Reel</strong><div class="phone-window-actions">
        ${iconButton('phone-lock','Lock phone','lock-keyhole')}
        ${iconButton('phone-minimize','Minimize phone','minus')}
        ${iconButton('phone-close','Close phone','x')}
      </div></header>
      <div class="handset-content" tabindex="-1"></div>
      <nav class="handset-nav" aria-label="Phone navigation">
        ${iconButton('phone-home','Phone Home','house')}<button type="button" class="handset-home-swipe" aria-label="Home gesture"></button>${iconButton('phone-recents','Recent apps','layers')}
      </nav></div></div><div class="phone-turn" aria-live="polite" hidden></div>`
  const body=host.querySelector('.handset-content')
  const homeButton=host.querySelector('#phone-home')
  const recentButton=host.querySelector('#phone-recents')
  const heading=host.querySelector('.phone-header strong')
  const time=host.querySelector('time')
  const notice=host.querySelector('.phone-turn')
  let app=null,active='home',blocked=false,locked=settings.phoneLock,turnKey,turnWasActive=false,serial=0,timer,arranging=false
  let closeAnimation
  let minimizedApp
  let recent=read('recents',[]).filter(id=>apps[id])
  const appStates=new Map()
  const savedOrder=read('order',[])
  const order=[...new Set([...savedOrder.filter(id=>apps[id]),...Object.keys(apps)])]
  const musicState={}
  const battery=host.querySelector('.phone-status>span:last-child')
  navigator.getBattery?.().then(status=>{
    const show=()=>{battery.title='Device battery '+Math.round(status.level*100)+'%'}
    show()
  }).catch(()=>{})

  function appearance(){
    layout.dataset.phoneSide=settings.phoneSide
    layout.dataset.phoneSize=active==='youtube' && settings.phoneSize==='compact'?'regular':settings.phoneSize
    host.dataset.case=settings.phoneCase
    host.dataset.frame=settings.phoneFrame
    host.dataset.wallpaper=settings.phoneWallpaper
    host.dataset.mode=settings.phoneMode
    host.dataset.icons=settings.phoneIcons
    host.dataset.motion=settings.phoneMotion
    host.classList.toggle('quiet-motion',settings.phoneReduced || settings.reduced)
    host.style.setProperty('--handset-brightness',settings.phoneBrightness)
  }
  function updateClock(){
    time.textContent=clock.format(Date.now())
    const lock=body.querySelector('.handset-lock strong')
    if(lock)lock.textContent=time.textContent
  }
  function destroyApp(){
    app?.destroy?.()
    app=null
  }
  function chime(){
    if(!settings.phoneNotices || !settings.phoneVolume)return
    const audio=new Audio('/side-reel/tap.mp3')
    audio.volume=settings.phoneVolume*.28
    audio.play().catch(()=>{})
  }
  function drawHome(){
    body.replaceChildren()
    const top=node('div','handset-home-title')
    const name=node('h2','','Home')
    const arrange=node('button','handset-text',arranging?'Done':'Arrange')
    arrange.type='button'
    arrange.onclick=()=>{arranging=!arranging;drawHome()}
    top.append(name,arrange)
    body.append(top)
    const grid=node('div','handset-grid')
    for(const [index,id] of order.entries()){
      const [label,symbol,color]=apps[id]
      const cell=node('div','handset-cell')
      const button=node('button','handset-app')
      button.type='button'
      button.dataset.app=id
      button.disabled=blocked && limited.has(id)
      button.title=button.disabled?'Available after the match':label
      const tile=node('span','handset-icon')
      tile.dataset.ink=color
      tile.innerHTML=icon(symbol)
      button.append(tile,node('span','',label))
      button.onclick=()=>open(id)
      cell.append(button)
      if(arranging){
        const move=node('button','handset-order','‹')
        move.type='button'
        move.disabled=!index
        move.setAttribute('aria-label','Move '+label+' earlier')
        move.onclick=()=>{
          ;[order[index-1],order[index]]=[order[index],order[index-1]]
          store('order',order)
          drawHome()
        }
        cell.append(move)
      }
      grid.append(cell)
    }
    body.append(grid)
    const dock=node('div','handset-dock')
    for(const id of ['clips','music','settings']){
      const button=node('button','handset-dock-app')
      button.type='button'
      button.setAttribute('aria-label','Open '+apps[id][0])
      button.innerHTML=icon(apps[id][1])
      button.onclick=()=>open(id)
      dock.append(button)
    }
    body.append(dock)
  }
  function drawLock(){
    body.innerHTML='<div class="handset-lock"><span></span><strong></strong><button type="button">Unlock</button></div>'
    const panel=body.firstChild
    panel.querySelector('span').textContent=date.format(Date.now())
    panel.querySelector('button').onclick=()=>open('home')
    let y
    panel.addEventListener('touchstart',event=>{y=event.changedTouches[0].clientY},{passive:true})
    panel.addEventListener('touchend',event=>{if(y-event.changedTouches[0].clientY>26)open('home')},{passive:true})
    updateClock()
  }
  function drawRecents(){
    body.replaceChildren(node('h2','handset-page-title','Recent apps'))
    if(!recent.length)body.append(node('p','handset-note','Apps you open appear here.'))
    for(const id of recent){
      const [label,symbol,color]=apps[id]
      const button=node('button','handset-recent')
      button.type='button'
      button.disabled=blocked && limited.has(id)
      const tile=node('span','handset-icon')
      tile.dataset.ink=color;tile.innerHTML=icon(symbol)
      button.append(tile,node('strong','',label))
      button.onclick=()=>open(id)
      body.append(button)
    }
  }
  function drawSettings(){
    for(const [key,label,choices] of settingsFields){
      const row=node('label','handset-setting')
      row.append(node('span','',label))
      const field=document.createElement(choices===true || Array.isArray(choices)?'input':'select')
      if(choices===true){field.type='checkbox';field.checked=Boolean(settings[key])}
      else if(Array.isArray(choices)){
        field.type='range'
        ;[field.min,field.max,field.step]=choices
        field.value=settings[key]
      }else field.innerHTML=optionRows(choices,settings[key])
      field.oninput=()=>{
        settings[key]=field.type==='checkbox'?field.checked:field.type==='range'?Number(field.value):field.value
        appearance()
        if(key==='phoneMusicContinue' && !settings[key])musicState.audio?.pause()
        save()
      }
      row.append(field);body.append(row)
    }
  }
  async function open(id){
    if(blocked && limited.has(id))return
    const token=++serial
    const prev=active
    destroyApp()
    if((prev==='music' && !settings.phoneMusicContinue) || !['home','recent','music'].includes(id))musicState.audio?.pause()
    active=id
    locked=id==='lock'
    homeButton.disabled=locked
    recentButton.disabled=locked
    if(id!=='home')arranging=false
    body.scrollTop=0
    body.dataset.view=id
    host.dataset.app=id
    heading.textContent=apps[id]?.[0] || 'Side Reel'
    appearance()
    body.replaceChildren()
    if(id==='home'){drawHome();return}
    if(id==='lock'){drawLock();return}
    if(id==='recent'){drawRecents();return}
    recent=[id,...recent.filter(entry=>entry!==id)].slice(0,6)
    store('recents',recent)
    if(id==='settings'){drawSettings();return}
    body.append(node('p','handset-note','Opening '+apps[id][0]+'…'))
    try{
      const module=await apps[id][3]()
      if(token!==serial || host.hidden)return
      body.replaceChildren()
      const state=id==='music'?musicState:appStates.get(id) || {}
      appStates.set(id,state)
      app=module.mount(body,{id,settings,save,blocked:()=>blocked,state})
      body.focus({preventScroll:true})
    }catch{
      if(token!==serial)return
      body.replaceChildren(node('p','handset-note','This app could not open. Return Home and try again.'))
    }
  }
  function pause(){
    app?.pause?.()
    musicState.audio?.pause()
  }
  function close(minimize=false){
    if(host.hidden || closeAnimation)return
    const previous=active
    minimizedApp=minimize && apps[previous]?previous:null
    pause()
    destroyApp()
    ++serial
    if(previous==='lock')locked=true
    else locked=settings.phoneLock
    launcher?.setAttribute('aria-pressed','false')
    clearInterval(timer)
    if(host.contains(document.activeElement))launcher?.focus({preventScroll:true})
    const finish=()=>{
      host.hidden=true
      layout.classList.remove('phone-open')
      closeAnimation=null
    }
    if(settings.phoneReduced || settings.reduced || !host.animate){finish();return}
    if(closeAnimation)return
    closeAnimation=host.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(25px)'}],{duration:160})
    closeAnimation.onfinish=finish
  }
  host.querySelector('#phone-close').onclick=()=>close()
  host.querySelector('#phone-minimize').onclick=()=>close(true)
  host.querySelector('#phone-lock').onclick=()=>open(locked?'home':'lock')
  homeButton.onclick=()=>open('home')
  recentButton.onclick=()=>open('recent')
  const homeSwipe=host.querySelector('.handset-home-swipe')
  homeSwipe.onclick=()=>{if(!locked)open('home')}
  let gestureY
  homeSwipe.onpointerdown=event=>{gestureY=event.clientY;homeSwipe.setPointerCapture(event.pointerId)}
  homeSwipe.onpointerup=event=>{if(!locked && gestureY-event.clientY>17)open('home')}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()})
  return {
    toggle(){
      if(closeAnimation){
        closeAnimation.cancel()
        closeAnimation=null
        host.hidden=true
      }
      if(!host.hidden){close();return}
      host.hidden=false
      launcher?.setAttribute('aria-pressed','true')
      layout.classList.add('phone-open')
      updateClock()
      timer=setInterval(updateClock,15000)
      const next=locked && settings.phoneLock?'lock':minimizedApp && !(blocked && limited.has(minimizedApp))?minimizedApp:'home'
      minimizedApp=null
      open(next)
    },
    close,
    update(update){
      if(blocked!==update.blocked){
        blocked=update.blocked
        if(blocked && limited.has(active))open('home')
        else if(active==='home' && !host.hidden)drawHome()
        else if(active==='recent' && !host.hidden)drawRecents()
        app?.update?.(blocked)
      }
      notice.hidden=!update.ownTurn
      const label=update.label==='White to move' || update.label==='Black to move'?update.label:'Your turn'
      if(notice.textContent!==label)notice.textContent=label
      const newTurn=update.ownTurn && (!turnWasActive || update.key!==turnKey)
      if(newTurn && !host.hidden){
        if(settings.phoneGamePause && gameApps.has(active))app?.pause?.()
        if(settings.phoneAutopause && ['youtube','comedy','clips'].includes(active))app?.pause?.()
        chime()
      }
      turnWasActive=update.ownTurn
      turnKey=update.key
    },
  }
}
