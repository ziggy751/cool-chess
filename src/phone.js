import {icon} from './icons.js'
import {handsetDefaults,wallpapers,frames} from './handset/appearance.js'
import {node,read,store,optionRows} from './handset/shared.js'
import {games,newCanvasGames,newPuzzleGames} from './handset/game-catalog.js'

const apps={
  youtube:['YouTube Shorts','youtube','coral',()=>import('./handset/youtube.js')],
  comedy:['AI Shorts','sparkles','violet',()=>import('./handset/comedy.js')],
  arcade:['Arcade','gamepad-2','blue',()=>import('./handset/arcade-hub.js')],
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
for(const key of newCanvasGames)apps[key]=[games[key][0],games[key][3],'aqua',()=>import('./handset/arcade-extra.js')]
for(const key of newPuzzleGames)apps[key]=[games[key][0],games[key][3],'amber',()=>import('./handset/arcade-table.js')]
const newGames=new Set([...newCanvasGames,...newPuzzleGames])
const iconButton=(id,label,symbol)=>'<button id="'+id+'" type="button" aria-label="'+label+'" title="'+label+'">'+icon(symbol)+'</button>'
const settingsFields=[
  ['phoneFrame','Frame finish',frames],['phoneCase','Case',{standard:'None',christmas:'Christmas red',gold:'Champagne'}],
  ['phoneWallpaper','Wallpaper',wallpapers],['phoneMode','Display mode',{dark:'Dark',light:'Light'}],
  ['phoneIcons','App icons',{colour:'Colour',mono:'Monochrome'}],['phoneBrightness','Brightness',[.48,1,.02]],
  ['phoneSize','Size',{compact:'Compact',regular:'Regular',large:'Large'}],['phoneSide','Screen side',{right:'Right',left:'Left'}],
  ['phoneMotion','Animation speed',{quick:'Quick',normal:'Normal',relaxed:'Relaxed'}],
  ['phoneVolume','Media volume',[0,1,.05]],['phoneMuted','Mute native video',true],['phoneLock','Lock when reopened',true],
  ['phoneAutopause','Pause video on your turn',true],['phoneGamePause','Pause games on your turn',true],['phoneArcadeSound','Arcade sound effects',true],
  ['phoneMusicContinue','Music plays across apps',true],['phoneMusicMinimized','Music while phone is closed',true],['phoneNotices','Turn chime',true],
  ['phoneReduced','Reduce motion',true],['phoneShortcut','P shortcut',true],
]
const clock=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hour12:false})
const date=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'})
const limited=new Set(['chess','youtube'])
const gameApps=new Set(Object.keys(games))

export function createPhone(host,settings,save){
  for(const [key,value] of Object.entries(handsetDefaults))settings[key]??=value
  const layout=host.closest('.game-layout')
  const launcher=document.getElementById('phone-toggle')
  host.innerHTML=`
    <div class="phone-housing"><div class="phone-screen">
      <div class="phone-status"><time></time><span class="handset-sensor" aria-hidden="true"><i></i></span>
        <span title="Browser network status">${icon('wifi')} ${icon('battery-full')}</span></div>
      <header class="phone-header"><strong>Side Reel</strong><div class="phone-window-actions">
        ${iconButton('phone-notifications','Notifications','bell')}
        ${iconButton('phone-lock','Lock phone','lock-keyhole')}
        ${iconButton('phone-minimize','Minimize phone','minus')}
        ${iconButton('phone-close','Close phone','x')}
      </div></header>
      <div class="handset-content" tabindex="-1"></div>
      <div class="handset-mini" hidden></div>
      <nav class="handset-nav" aria-label="Phone navigation">
        ${iconButton('phone-home','Phone Home','house')}<button type="button" class="handset-home-swipe" aria-label="Home gesture"></button>${iconButton('phone-recents','Recent apps','layers')}
      </nav></div></div><div class="phone-turn" aria-live="polite" hidden></div>`
  const body=host.querySelector('.handset-content')
  const homeButton=host.querySelector('#phone-home')
  const recentButton=host.querySelector('#phone-recents')
  const heading=host.querySelector('.phone-header strong')
  const time=host.querySelector('time')
  const mini=host.querySelector('.handset-mini')
  const noticeButton=host.querySelector('#phone-notifications')
  let notificationLog=[]
  const notice=host.querySelector('.phone-turn')
  let app=null,active='home',blocked=false,locked=settings.phoneLock,turnKey,turnWasActive=false,serial=0,timer,arranging=false
  let closeAnimation
  let minimizedApp
  let recent=read('recents',[]).filter(id=>apps[id])
  const appStates=new Map()
  const savedOrder=read('order',[])
  const order=[...new Set([...savedOrder.filter(id=>apps[id]),...Object.keys(apps)])]
  const shortcuts=new Set(read('arcade-shortcuts',[]).filter(id=>gameApps.has(id)))
  const folders=read('app-folders',[]).filter(item=>item && typeof item.name==='string' && Array.isArray(item.apps))
  const dock=read('app-dock',['arcade','music','settings']).filter(id=>apps[id]).slice(0,4)
  let folderIndex=-1
  const musicState={imports:[]}
  let miniAudio
  const defaultDock=['arcade','music','settings']
  const showIcon=id=>{
    const tile=node('span','handset-icon')
    tile.dataset.ink=apps[id][2];tile.dataset.glyph=id
    tile.innerHTML=icon(apps[id][1])
    return tile
  }
  function refreshMini(){
    const {audio,track}=musicState
    if(audio && miniAudio!==audio){
      miniAudio=audio
      for(const event of ['play','pause','ended'])audio.addEventListener(event,refreshMini)
    }
    mini.hidden=!audio || !track || active==='music' || active==='lock' || !settings.phoneMusicContinue || audio.paused
    if(mini.hidden)return
    mini.replaceChildren()
    const cover=node('img');cover.alt=''
    if(track.art)cover.src=track.art
    else cover.hidden=true
    const details=node('button','mini-track',track.title);details.onclick=()=>open('music')
    const pause=node('button','mini-pause')
    pause.innerHTML=icon('pause');pause.setAttribute('aria-label','Pause music');pause.onclick=()=>audio.pause()
    mini.append(cover,details,pause)
  }
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
    const folder=folders[folderIndex]
    const top=node('div','handset-home-title')
    const name=node('h2','',folder?.name || 'Home')
    const arrange=node('button','handset-text',arranging?'Done':'Arrange')
    arrange.type='button'
    arrange.onclick=()=>{arranging=!arranging;drawHome()}
    if(folder){
      const back=node('button','handset-text','‹ Home')
      back.onclick=()=>{folderIndex=-1;drawHome()}
      top.append(back)
    }
    top.append(name,arrange)
    body.append(top)
    const grid=node('div','handset-grid')
    const assigned=new Set(folders.flatMap(entry=>entry.apps))
    const shown=folder?folder.apps.filter(id=>apps[id]):
      order.filter(id=>(!newGames.has(id) || shortcuts.has(id)) && !assigned.has(id))
    for(const id of shown){
      const label=apps[id][0]
      const cell=node('div','handset-cell'),button=node('button','handset-app')
      button.type='button';button.dataset.app=id
      button.disabled=blocked && limited.has(id)
      button.title=button.disabled?'Available after the match':label
      button.append(showIcon(id),node('span','',label))
      button.onclick=()=>open(id)
      cell.append(button)
      if(arranging){
        const move=node('button','handset-order','‹')
        move.type='button'
        move.disabled=shown.indexOf(id)===0
        move.setAttribute('aria-label','Move '+label+' earlier')
        move.onclick=()=>{
          const items=folder?folder.apps:order
          const i=items.indexOf(id)
          const earlier=folder?i-1:order.indexOf(shown[shown.indexOf(id)-1])
          if(earlier<0)return
          ;[items[earlier],items[i]]=[items[i],items[earlier]]
          store('order',order);store('app-folders',folders);drawHome()
        }
        cell.append(move)
      }
      grid.append(cell)
    }
    if(!folder)for(const [index,entry] of folders.entries()){
      const tile=node('button','handset-app handset-folder')
      const badge=node('span','handset-icon')
      badge.innerHTML=icon('folder')
      tile.append(badge,node('span','',entry.name));tile.onclick=()=>{folderIndex=index;drawHome()}
      grid.append(tile)
    }
    body.append(grid)
    if(arranging)renderHomeControls(folder,shown)
    const dockNode=node('div','handset-dock')
    for(const id of dock.length?dock:defaultDock){
      const button=node('button','handset-dock-app')
      button.type='button';button.setAttribute('aria-label','Open '+apps[id][0])
      button.disabled=blocked && limited.has(id)
      button.append(showIcon(id));button.onclick=()=>open(id)
      dockNode.append(button)
    }
    body.append(dockNode)
  }
  function renderHomeControls(folder,shown){
    const panel=node('div','home-edit')
    if(folder){
      const remove=node('button','handset-secondary','Remove folder')
      remove.onclick=()=>{folders.splice(folderIndex,1);folderIndex=-1;store('app-folders',folders);drawHome()}
      panel.append(remove)
    }else{
      const folderForm=node('form','home-folder-form')
      const title=node('input')
      title.required=true;title.maxLength=18;title.placeholder='Folder name';title.setAttribute('aria-label','Folder name')
      const select=node('select')
      select.setAttribute('aria-label','Apps for folder');select.multiple=true;select.size=3
      select.innerHTML=optionRows(Object.fromEntries(shown.map(id=>[id,apps[id][0]])),'')
      const add=node('button','handset-secondary','Create folder');add.type='submit'
      folderForm.append(title,select,add)
      folderForm.onsubmit=event=>{
        event.preventDefault()
        const label=title.value.trim()
        const apps=Array.from(select.selectedOptions,option=>option.value)
        if(!label || !apps.length)return
        folders.push({name:label,apps});store('app-folders',folders);drawHome()
      }
      panel.append(folderForm)
      const field=node('select');field.setAttribute('aria-label','Dock slot')
      field.innerHTML=optionRows({0:'First dock slot',1:'Second dock slot',2:'Third dock slot'},'0')
      const choice=node('select');choice.setAttribute('aria-label','Dock app')
      choice.innerHTML=optionRows(Object.fromEntries(order.filter(id=>!newGames.has(id) || shortcuts.has(id)).map(id=>[id,apps[id][0]])),dock[0])
      field.onchange=()=>{choice.value=dock[field.value] || defaultDock[field.value]}
      choice.onchange=()=>{
        const existing=dock.indexOf(choice.value),slot=Number(field.value)
        if(existing>=0)dock[existing]=dock[slot]
        dock[slot]=choice.value
        store('app-dock',dock);drawHome()
      }
      panel.append(field,choice)
    }
    body.append(panel)
  }
  function drawNotifications(){
    body.replaceChildren(node('h2','handset-page-title','Notifications'))
    if(!notificationLog.length)body.append(node('p','handset-note','No new match notifications.'))
    for(const entry of notificationLog){
      const item=node('div','handset-notice')
      item.append(node('strong','',entry.label),node('small','',clock.format(entry.time)))
      body.append(item)
    }
    if(notificationLog.length){
      const clear=node('button','handset-secondary','Clear')
      clear.onclick=()=>{notificationLog=[];noticeButton.dataset.unread='false';drawNotifications()}
      body.append(clear)
    }
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
    if((prev==='music' && !settings.phoneMusicContinue) || id==='lock')musicState.audio?.pause()
    active=id
    folderIndex=-1
    refreshMini()
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
    if(id==='notifications'){noticeButton.dataset.unread='false';drawNotifications();return}
    recent=[id,...recent.filter(entry=>entry!==id)].slice(0,6)
    store('recents',recent)
    if(gameApps.has(id))store('arcade-recent',[id,...read('arcade-recent',[]).filter(item=>item!==id)].slice(0,14))
    if(id==='settings'){drawSettings();return}
    body.append(node('p','handset-note','Opening '+apps[id][0]+'…'))
    try{
      const module=await apps[id][3]()
      if(token!==serial || host.hidden)return
      body.replaceChildren()
      const state=id==='music'?musicState:appStates.get(id) || {}
      appStates.set(id,state)
      app=module.mount(body,{id,settings,save,blocked:()=>blocked,state,open,shortcuts})
      refreshMini()
      body.focus({preventScroll:true})
    }catch{
      if(token!==serial)return
      body.replaceChildren(node('p','handset-note','This app could not open. Return Home and try again.'))
    }
  }
  function pause(){
    if(active!=='music' || !settings.phoneMusicMinimized)app?.pause?.()
    if(!settings.phoneMusicMinimized)musicState.audio?.pause()
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
  noticeButton.onclick=()=>{if(!locked)open(active==='notifications'?'home':'notifications')}
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
        if(blocked && musicState.track?.imported)musicState.audio?.pause()
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
        notificationLog=[{label:notice.textContent,time:Date.now()},...notificationLog].slice(0,8)
        noticeButton.dataset.unread=String(active!=='notifications')
        if(active==='notifications')drawNotifications()
        if(settings.phoneGamePause && gameApps.has(active))app?.pause?.()
        if(settings.phoneAutopause && ['youtube','comedy','clips'].includes(active))app?.pause?.()
        chime()
      }
      turnWasActive=update.ownTurn
      turnKey=update.key
    },
  }
}
