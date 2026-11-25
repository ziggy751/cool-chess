import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/instrument-serif/latin-400.css'
import './style.css'
import './overhaul.css'
import { Chess } from 'chess.js'
import { makeChess, variants, fogVisibility } from './variants.js'
import { Match, START, TIMES, opposite, validClock } from './rules.js'
import { Board, glyph, pieces, squareAt, themeList } from './board.js'
import { analyzeGame, accuracy, openingFor } from './analysis.js'
import { opponentAt, bosses } from './opponents.js'
import { Engine } from './engine.js'
import { Online } from './online.js'
import { collectionList } from './collections.js'
import { locations, locationFor, tables, lightingStyles } from './worlds/catalog.js'
import { showroom, cameras, movements, applyCollection } from './garage.js'
import { freshLadder, rankOf, rateAI, ratedOpponent } from './ranked-ai.js'
import { lessons } from './training.js'
import { playSound, roomSound, updateRoomListener } from './sound.js'
import { icon } from './icons.js'

const $ = id => document.getElementById(id)
const el = (tag, className = '', value = '') => Object.assign(document.createElement(tag), {className,textContent:value})
const read = (key,fallback) => {
  try { return JSON.parse(localStorage.getItem('evolution-' + key)) ?? fallback }
  catch { return fallback }
}
const persist = (key,value) => localStorage.setItem('evolution-' + key,JSON.stringify(value))
const defaults = {theme:'walnut',environment:'cabin',collection:'staunton',white:'ivory',black:'ebony',camera:'angled',quality:matchMedia('(pointer: coarse)').matches?'medium':'high',
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, coords:true, autoQueen:false, volume:35, fov:0, frames:0, avatar:'G', motion:'glide',effect:'gold',overrides:{},cosmetics:true,reflections:true,shadows:true,particles:true,ambient:0,textureQuality:'auto',coach:true,premoves:true,rotate:false,confirm:false,highlight:'green',modelQuality:'high',table:'auto',lighting:'natural',worldDetail:'auto',worldMotion:true,motionSpeed:'normal',motionIntensity:1,captureIntensity:1}
const settings = {...defaults,...read('settings',{})}
settings.environment=locationFor(settings.environment).id
const button = (name, label, id, style = '') => '<button type="button" class="' + style + '" id="' + id + '" aria-label="' + label + '" title="' + label + '">' + icon(name) + '</button>'
const action = (name,label,id,style = '') => '<button type="button" class="' + style + '" id="' + id + '">' + icon(name) + '<span>' + label + '</span></button>'

const nav = [['Play','play'],['Multiplayer','users'],['Collection','layers'],['Challenges','flag'],
  ['Analysis','chart-no-axes-column-increasing'],['Settings','settings']]
$('app').innerHTML = `
<header class="topbar">
  <button type="button" class="brand" id="home-link" aria-label="Chess Evolution home"><span class="brand-icon">♞</span><span>Chess Evolution <i>3D</i></span></button>
  <nav class="main-nav" id="rail" aria-label="Main navigation">${nav.map(([label,glyph])=>`<button data-nav="${label}" aria-label="${label}">${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>
  <div class="top-actions">
    ${button('menu','Toggle navigation','mobile-menu','icon-button')}
    <button class="server-state" id="connection" aria-label="Multiplayer connection"><i></i><span>Local session</span></button>
    <button class="top-profile" id="profile" aria-label="Player profile"><span class="profile-avatar">G</span></button>
  </div>
</header>
<main class="shell">
  <section id="home-screen" aria-label="Home">
    <div class="home-hero">
      <div id="home-stage"></div>
      <div class="hero-copy"><div class="hero-eyebrow"><span></span> 3D CHESS SIMULATOR</div>
        <h1>Chess<br>Evolution<span>.</span></h1>
        <div class="home-actions">
          ${action('play','Play chess','home-play','primary')}
          ${action('layers','Collection','home-collection','secondary')}
        </div>
      </div>
    </div>
    <div class="home-footer">
      <div class="current-setup">${icon('box')}<div><small>CURRENT SETUP</small><strong id="home-setup"></strong></div></div>
      <button data-nav="AI opponents">${icon('bot')}<span>Play vs AI</span>${icon('arrow-up-right')}</button>
      <button data-nav="Ranked">${icon('crown')}<span>Ranked</span>${icon('arrow-up-right')}</button>
      <button data-nav="Puzzles">${icon('puzzle')}<span>Puzzles</span>${icon('arrow-up-right')}</button>
    </div>
  </section>
  <section id="studio-screen" aria-label="Collection showroom" hidden></section>
  <section class="main" id="match-screen" aria-label="Match" hidden>
    <div class="page-heading">
      <div><div class="breadcrumb">Play <span>/</span> <strong id="breadcrumb">Classic Chess</strong></div>
      <h1 id="game-title">Classic Chess</h1><p id="game-subtitle">Local multiplayer</p></div>
      <div class="match-heading-actions">${button('panel-right-close','Toggle match panel','panel-toggle','icon-button')}${action('plus','New game','new-game','primary')}</div>
    </div>
    <div class="game-layout">
      <section class="game" aria-label="Chess game">
        <div id="opponent" class="player"></div>
        <div id="match-stage"><div class="stage" id="stage" data-theme="walnut">
          <div class="stage-caption"><span></span><strong id="scene-name">Mountain Cabin</strong></div>

          <div id="webgl" aria-label="Interactive 3D chessboard"></div>
          <div class="world-loading" aria-live="polite">Loading location…</div>
          <div id="walk-controls" class="walk-controls" role="group" aria-label="Walk controls">
            ${[['W','up','forward'],['A','left','left'],['S','down','back'],['D','right','right']].map(([key,direction,label])=>
              `<button type="button" data-walk="Key${key}" aria-label="Walk ${label}">${icon('chevron-'+direction)}</button>`).join('')}
          </div>
          <div class="photo-bar" id="photo-bar" hidden aria-label="Photography controls">
            <label>Field of view<input type="range" id="photo-fov" min="27" max="61" value="40"></label>
            <label>Exposure<input type="range" id="photo-exposure" min=".5" max="1.7" step=".05" value="1.05"></label>
            <label>Background blur<input type="range" id="photo-aperture" min="0" max="1" step=".05" value="0"></label>
            <label>Focus distance<input type="range" id="photo-focus" min="1" max="30" step=".25" value="11"></label>
            <label>Lighting<select id="photo-lighting"><option value="natural">Location</option><option value="warm">Warm</option><option value="cool">Cool</option><option value="studio">Studio</option></select></label>
            <label class="photo-check"><input type="checkbox" id="photo-freeze"> Pause scene</label>
            ${action('camera','Capture','photo-save','primary')}
            ${button('x','Exit photography','photo-close','icon-button')}
          </div>
          <div id="flat" class="flat" hidden><div id="grid" role="group" aria-label="Chessboard"></div></div>
          <div class="view-controls" aria-label="Board controls">
            ${button('box','Switch between 2D and 3D','view-mode','view-button')}
            ${button('flip-vertical-2','Flip board','flip','view-button')}
            ${button('rotate-ccw','Reset camera','reset-camera','view-button')}
            ${button('camera','Photography mode','photo','view-button')}
            ${button('sliders-horizontal','Camera and customization','quick','view-button')}
            ${button('maximize','Fullscreen board','fullscreen','view-button')}
          </div>
        </div></div>
        <div id="player" class="player"></div>
        <div id="pocket" class="pocket" hidden></div><div class="under-board"><span id="match-meta"></span><span id="room-meta"></span></div>
      </section>
      <aside class="match-panel" aria-label="Match panel">
        <div class="match-header"><span class="match-icon">${icon('swords')}</span><div><h2>Match details</h2><p id="match-type">Local game</p></div></div>
        <div class="status" id="status" aria-live="polite"></div>
        <div class="panel-tabs"><button data-tab="moves" class="current">Moves</button><button data-tab="game">Game info</button></div>
        <div id="panel-content" class="panel-content"></div>
        <div class="replay" aria-label="Replay controls">
          ${button('chevrons-left','First position','first')}${button('chevron-left','Previous move','prev')}
          ${button('chevron-right','Next move','next')}${button('chevrons-right','Live position','last')}
        </div>
        <div class="match-actions">
          ${action('handshake','Offer draw','draw')}${action('flag','Resign','resign')}
        </div>
      </aside>
    </div>
    <footer><small>CHESS EVOLUTION 3D</small><button data-nav="Controls">${icon('keyboard')} Keyboard shortcuts</button></footer>
  </section>
</main>
<dialog id="dialog"><div id="dialog-content"></div></dialog>
<div id="toast" role="status" hidden></div>
`

const defaultMinutes = 10
let local = new Match({minutes:defaultMinutes})
let state = local.snapshot()
let mode = 'local', selected = null, drop = null, flipped = false, flat = false, replay = null, tab = 'moves'
let level = 12, runLevel = 1, bossTheme = null, thinkTime = 450, engine, puzzle, puzzleSolved = false
let waiting = false, onlineState, onlineColor, linked = false, ping = 0, roomCode, motionKey = '', lastPly = 0
let stateAt = performance.now(), firstMove = true, noticeTimer, lastResult
let history = read('history',[])
let cancelAnalysis
let screen='home', studioReturn='home', hasMatch=false
const previewPosition=new Chess()
let experience = read('xp',0)
let ladder={...freshLadder(),...read('ai-ladder',{})}
let lesson, trainingSolved=false, premove=null, pendingSquare=null, lastCheck=''
let aiFavourites=new Set(read('ai-favourites',[]))
let savePoint=read('casual-save',null)
const rankBlocked=()=> (mode==='ai-ranked' || (mode==='online' && onlineState?.division && onlineColor)) && !state.result && hasMatch
const persistLadder=()=>persist('ai-ladder',ladder)
function saveRanked() {
  if (mode!=='ai-ranked' || !ladder.active || state.result) return
  ladder.active={...ladder.active,game:local.save()}
  persistLadder()
}

const stage = $('stage')
let board
try {
  board = new Board($('webgl'), selectSquare)
  board.dragStart = square => canPlay() && viewChess().get(square)?.color === viewChess().turn()
} catch (error) {
  console.warn('3D board unavailable',error)
  flat = true
}

const online = new Online(message => {
  if (message.type === 'connection') { linked = message.open; drawStatus(); return }
  if (message.type === 'pong') { ping = Math.round(performance.now()-message.stamp); drawStatus(); return }
  if (message.type === 'error') { toast(message.message); waiting = false; return }
  if (message.type === 'queued') {
    waiting = true
    if ($('online-note')) $('online-note').textContent = 'Looking for an opponent…'
    return
  }
  if (message.type === 'ladder') { renderLadder(message); return }
  if (message.type === 'joined') {
    stopEngine()
    mode = 'online'
    hasMatch=true
    showScreen('match')
    roomCode = message.code
    const url = new URL(location.href)
    url.searchParams.set('room',roomCode)
    window.history.replaceState(null,'',url)
    onlineColor = message.color
    pendingSquare=null
    premove=null
    flipped = onlineColor === 'b'
    resetCamera()
    replay = null
    selected = null
    waiting = false
    lastResult = null
    onlineState = null
    motionKey = ''
    $('dialog').close()
  }
  if (message.type === 'expired') { toast('This room expired'); startLocal(); return }
  if (message.type === 'state') {
    if (onlineState?.match && (onlineState.match.moves.length !== message.match?.moves.length)
        && (message.match?.moves.length ?? 0) === 0) {
      replay = null
      selected = null
      lastResult = null
    }
    const divisionChanged=onlineState?.division!==message.division
    onlineState = message
    if (divisionChanged) applySettings()
    state = message.match || {initial:START, fen:START, moves:[], minutes:message.minutes,
      clocks:{w:message.minutes*60000,b:message.minutes*60000}}
    stateAt = performance.now()
    render()
    runPremove()
  }
})

function awardXP(amount) {
  experience += amount
  persist('xp',experience)
}

function toast(message) {
  clearTimeout(noticeTimer)
  $('toast').textContent = message
  $('toast').hidden = false
  noticeTimer = setTimeout(() => { $('toast').hidden = true },3400)
}

function startLocal(kind = 'local',minutes = defaultMinutes,fen,variant='standard',increment=0) {
  if (rankBlocked()) { toast('Finish or resign your ranked match first');return false }
  const next = new Match({minutes,fen,variant,increment})
  online.leave()
  stopEngine()
  local = next
  mode = kind
  hasMatch=true
  firstMove = kind!=='ai-ranked'
  trainingSolved=false
  premove=null
  pendingSquare=null
  lastCheck=''
  puzzleSolved = false
  drop = null
  lastResult = null
  selected = null
  replay = null
  flipped = false
  roomCode = null
  const url = new URL(location.href)
  if (url.searchParams.has('room')) {
    url.searchParams.delete('room')
    window.history.replaceState(null,'',url)
  }
  motionKey = ''
  state = local.snapshot(local.started)
  resetCamera()
  $('dialog').close()
  if (kind !== 'boss') bossTheme = null
  showScreen('match')
  refreshLocal()
  saveRanked()
  if (versusAI()) requestMove()
  return true
}

function refreshLocal() {
  state = local.snapshot(firstMove ? local.started : Date.now())
  saveRanked()
  render()
}

function viewChess() {
  if (replay === null) return makeChess(state.fen,state.variant)
  return makeChess(replay === 0 ? state.initial : state.moves[replay-1].after,state.variant)
}
function turn() { return state.fen.split(' ')[1] }
function versusAI() { return ['ai','ai-ranked','survival','boss'].includes(mode) }
function fogged() { return state.variant==='fog' && !state.result }
function moveFor(current, move) {
  return current.move({from:move.from,to:move.to,promotion:move.promotion,drop:move.drop})
}
function canPlay() {
  return screen==='match' && replay === null && !state.result && !puzzleSolved && !trainingSolved &&
    (mode === 'online' ? linked && onlineState?.match && turn() === onlineColor
      : !versusAI() || turn() === 'w')
}

function runPremove() {
  if (!premove || !canPlay()) return
  const {from,to}=premove
  premove=null
  selected=null
  const option=makeChess(state.fen,state.variant).moves({square:from,verbose:true}).find(
    move=>move.to===to && (!move.promotion || move.promotion==='q'))
  if(option) playMove(option)
  else renderBoard()
}

function playMove(move,confirmed=false) {
  if (!confirmed && settings.confirm && !rankBlocked()) {
    show('Confirm move','<p id="move-confirmation"></p>'+action('check','Play move','confirm-move','primary full'))
    $('move-confirmation').textContent=(move.from || '')+' → '+move.to
    $('confirm-move').onclick=()=>{$('dialog').close();playMove(move,true)}
    return
  }
  if (mode === 'online') {
    online.send({type:'move',seq:onlineState.seq,move})
    return
  }
  if (mode==='training') {
    const trial=new Chess(state.fen)
    if(trial.move(move).san!==lesson.solution){toast(lesson.prompt);return}
    trainingSolved=true
    toast('Exercise complete')
  }
  if (mode === 'puzzle') {
    const trial = new Chess(state.fen)
    trial.move(move)
    if (!trial.isCheckmate()) { toast('Look for checkmate in one move'); return }
    puzzleSolved = true
    const solved = new Set(read('solved',[]))
    if (!solved.has(puzzle.name)) awardXP(35)
    solved.add(puzzle.name)
    persist('solved',[...solved])
  }
  if (firstMove) { local.began=local.started=Date.now(); firstMove=false }
  let result
  try { result=local.move(move) }
  catch(error){toast(local.result?.reason || error.message);refreshLocal();return}
  hasMatch=true
  if (fogged() || (settings.rotate && mode==='local')) {
    flipped = local.chess.turn() === 'b'
    resetCamera()
  }
  sound(result.captured ? 105 : 167)
  refreshLocal()
  if (versusAI()) requestMove()
}

function selectSquare(square) {
  if (!square || screen!=='match' || state.result) return
  const side=mode==='online'?onlineColor:versusAI()?'w':null
  if (!canPlay()) {
    if (!side || !settings.premoves || replay!==null || state.variant!=='standard' || turn()===side) return
    const piece=viewChess().get(square)
    if (piece?.color===side) pendingSquare=square
    else if(pendingSquare){premove={from:pendingSquare,to:square};pendingSquare=null;toast('Premove queued · Esc to cancel')}
    renderBoard()
    return
  }
  const chess = viewChess()
  if (drop) {
    const move = chess.moves({drop,verbose:true}).find(candidate=>candidate.to===square)
    drop = null
    if (move) playMove(move)
    else renderBoard()
    return
  }
  const moves = selected ? chess.moves({square:selected,verbose:true}).filter(candidate=>candidate.captured!=='k' && (candidate.to===square || candidate.landing===square)) : []
  const castle = moves.find(move=>move.landing===square && move.to===square)
  if (castle) { selected = null; playMove(castle); return }
  const castleToRook = moves.find(move=>move.landing && move.to===square)
  if (castleToRook) { selected = null; playMove(castleToRook); return }
  const regular = moves.filter(move=>!move.landing)
  const choices = regular.length ? regular : moves
  if (choices.length) {
    const from = selected
    selected = null
    if (choices.length > 1 && !settings.autoQueen) {
      show('Pawn promotion','<div class="promotion" id="promotion"></div>')
      for (const move of choices) {
        const choice=el('button','',pieces[move.promotion])
        const preview=new Image()
        preview.alt=''
        preview.src='/piece-previews/'+move.promotion+'.webp'
        choice.prepend(preview)
        choice.onclick = () => { $('dialog').close(); playMove({from,to:square,promotion:move.promotion}) }
        $('promotion').append(choice)
      }
    } else playMove({...choices[0],promotion:choices[0].promotion ? 'q' : undefined})
  } else {
    if(selected && selected!==square && settings.coach && !rankBlocked() && chess.get(square)?.color!==chess.turn()){
      const piece=chess.get(selected)
      toast(chess.isCheck()?'That move does not resolve check.':piece?.type==='p'?'Pawns advance into empty squares and capture diagonally.':piece?.type==='k'?'The king must move to an unattacked square.':'That route is blocked or would leave your king in check.')
    }
    selected = chess.get(square)?.color === chess.turn() && selected !== square ? square : null
    if (selected) playSound('ui',settings.volume*.44)
  }
  renderBoard()
}

function stopEngine() { engine?.close(); engine = null }
async function requestMove() {
  if (!versusAI() || turn() !== 'b' || state.result) return
  const search = engine ||= new Engine()
  const fen = state.fen
  try {
    const move = await search.move(fen,level,thinkTime,opponentAt(level).style)
    if (!move || engine !== search || !versusAI() || state.fen !== fen) return
    if (firstMove) { local.began=local.started=Date.now(); firstMove=false }
    local.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]},'b')
    sound(154)
    refreshLocal()
    runPremove()
  } catch (error) {
    if (engine === search && !local.result) toast(error.message)
  }
}

function sound(frequency) {
  const material=settings[turn()==='b'?'white':'black'] || ''
  const kind=/glass|crystal|frost|phantom|sapphire|emerald/.test(material)?'glass':
    /gold|chrome|brass|titanium|carbon/.test(material)?'metal':/marble|stone|obsidian|ceramic/.test(material)?'stone':'wood'
  playSound(kind,settings.volume,frequency===105)
  roomSound(locationFor(settings.environment).id,settings.ambient)
}

function resetCamera() {
  board?.reset(screen==='home'?'hero':screen==='studio'?'orbit':settings.camera,flipped)
}

function showScreen(next) {
  closePhotography()
  if (screen==='studio') studio.close()
  screen=next
  for (const value of ['home','studio','match']) $(value+'-screen').hidden=value!==next
  $(next+'-stage').append(stage)
  document.documentElement.dataset.screen=next
  $('home-play').querySelector('span').textContent=hasMatch?'Resume match':'Play chess'
  document.querySelectorAll('.main-nav button').forEach(button=>{
    button.classList.toggle('active',next==='studio' ? button.dataset.nav==='Collection' : next==='match' && button.dataset.nav==='Play')
  })
  board?.showBoard()
  if (board) board.preview=next!=='match'
  resetCamera()
  applySettings()
  if (next==='studio') studio.open()
}

function openStudio() {
  if (screen==='studio') return
  studioReturn=screen
  showScreen('studio')
}
function applySettings() {
  stage.dataset.theme = settings.theme
  stage.dataset.highlight = settings.highlight
  const useFlat = !board || (screen==='match' && flat)
  stage.classList.toggle('is-flat',useFlat)
  stage.classList.toggle('no-coords',!settings.coords)
  const environment = (screen==='match' && mode==='boss' && bossTheme?.environment) || settings.environment
  const world=locationFor(environment)
  roomSound(world.id,settings.ambient)
  const {name}=world
  $('scene-name').textContent = name
  $('webgl').hidden = useFlat
  $('flat').hidden = !useFlat
  $('home-setup').textContent=(collectionList[settings.collection] || 'Staunton')+' · '+name
  $('profile').querySelector('.profile-avatar').textContent = settings.avatar
  $('view-mode').innerHTML = icon(flat ? 'grid-2x2' : 'box')
  document.documentElement.classList.toggle('reduce-motion',settings.reduced)
  const cosmetic = settings.cosmetics && !(screen==='match' && mode==='online' && onlineState?.division)
  if (board) {
    board.cosmetics=cosmetic
    board.geometryQuality=settings.modelQuality
    board.shadows=settings.shadows
    board.reflections=settings.reflections
    board.textureQuality=settings.textureQuality
    board.particles=settings.particles
    board.captureEffect=settings.effect
    board.moveStyle=settings.motion
    board.motionSpeed=cosmetic?settings.motionSpeed:'instant'
    board.motionIntensity=Number(settings.motionIntensity)
    board.captureIntensity=Number(settings.captureIntensity)
    board.environmentMotion=cosmetic && settings.worldMotion
    board.roomListener=updateRoomListener
    board.lightingStyle=settings.lighting
    board.highlight=settings.highlight
    board.reduced = settings.reduced
    board.engraving.visible = settings.coords && screen!=='home'
    board.setViewOptions(+settings.fov,+settings.frames)
    board.setQuality(settings.quality)
    const detail=settings.worldDetail==='auto'?(settings.quality==='low'?'low':'high'):settings.worldDetail
    if(!useFlat)board.setWorld(world.id,settings.table,detail,settings.lighting)
    board.setTheme((screen==='match' && mode==='boss' && bossTheme?.theme) || settings.theme,settings.white,settings.black,environment,settings.collection,settings.overrides)
  }
  renderBoard()
}

function renderBoard() {
  if (screen!=='match' && board) {
    board.render(previewPosition,null,[],null,false)
    return
  }
  if (screen!=='match' && !board) {
    drawFlat(previewPosition,previewPosition,[],null,null)
    return
  }
  const chess = viewChess()
  const moves = replay === null ? state.moves : state.moves.slice(0,replay)
  const visibility = fogged() ? fogVisibility(chess) : null
  const last = visibility ? null : moves.at(-1)
  const legal = (selected || drop) && canPlay() ? chess.moves({square:selected,drop,verbose:true}).filter(move=>move.captured!=='k').flatMap(move=>move.landing ? [move.to,move.landing] : [move.to]) : []
  const masked = visibility ? {
    board:()=>chess.board().map(row=>row.map(piece=>piece && visibility.has(piece.square) ? piece : null)),
    get:square=>visibility.has(square) ? chess.get(square) : null,
    turn:()=>chess.turn(),isCheck:()=>chess.isCheck(),fen:()=>chess.fen(),
  } : chess
  const key = chess.fen()
  board?.render(masked,selected || pendingSquare || premove?.from,legal,last,key !== motionKey && moves.length === lastPly+1,visibility)
  motionKey = key
  lastPly = moves.length
  renderPockets(chess)
  if (!flat) return
  drawFlat(chess,masked,legal,last,visibility)
}

function drawFlat(chess,masked,legal,last,visibility) {
  const grid = $('grid')
  const focused = grid.contains(document.activeElement) ? document.activeElement.dataset.square : null
  grid.replaceChildren()
  for (let row=0; row<8; row++) for (let col=0; col<8; col++) {
    const square = squareAt(flipped ? 7-col : col,flipped ? 7-row : row)
    const piece = masked.get(square)
    const tile = el('button','square ' + ((row+col)%2 ? 'dark-square' : 'light-square'))
    tile.dataset.square = square
    tile.setAttribute('aria-label',square + (piece ? ' ' + (piece.color === 'w' ? 'white ' : 'black ') + pieces[piece.type] : ''))
    tile.classList.toggle('fogged',Boolean(visibility && !visibility.has(square)))
    tile.classList.toggle('selected',square === (selected || pendingSquare || premove?.from))
    tile.classList.toggle('premove',square===premove?.to)
    tile.classList.toggle('last-move',Boolean(last && [last.from,last.landing || last.to].includes(square)))
    tile.classList.toggle('legal',legal.includes(square))
    tile.classList.toggle('occupied',Boolean(piece))
    tile.classList.toggle('check',piece?.type === 'k' && piece.color === chess.turn() && chess.isCheck())
    tile.tabIndex = square === (focused || (flipped ? 'h1' : 'a8')) ? 0 : -1
    if (piece) tile.append(el('span','piece-icon '+piece.color,glyph[piece.type]))
    if (settings.coords && col === 0) tile.append(el('span','coord rank',square[1]))
    if (settings.coords && row === 7) tile.append(el('span','coord file',square[0]))
    tile.onclick = () => selectSquare(square)
    tile.onkeydown = event => {
      if (event.key==='Escape') {
        premove=null;pendingSquare=null;selected=null;drop=null
        renderBoard()
        return
      }
      const delta = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[event.key]
      if (delta === undefined) return
      const target = (row*8+col+delta+64)%64
      event.preventDefault()
      tile.tabIndex = -1
      grid.children[target].tabIndex = 0
      grid.children[target].focus()
    }
    grid.append(tile)
  }
  if (focused) grid.querySelector('[data-square="'+focused+'"]')?.focus()
}
function renderPockets(chess) {
  const region = $('pocket')
  const pocket = chess.pockets?.()
  region.hidden = !pocket
  if (!pocket) return
  region.replaceChildren(el('span','','Reserve'))
  const available = Object.entries(pocket).filter(([,count])=>count>0)
  if (!available.length) region.append(el('span','','No captured pieces'))
  for (const [type,count] of available) {
    const pick = el('button',drop===type?'active':'',glyph[type]+' × '+count)
    pick.title = 'Drop '+pieces[type]
    pick.disabled = !canPlay()
    pick.onclick = () => {
      selected = null
      drop = drop===type ? null : type
      renderBoard()
    }
    region.append(pick)
  }
}

function clockText(ms) {
  if (!state.minutes) return '—'
  const seconds = Math.ceil(ms / 1000)
  return Math.floor(seconds/60).toString().padStart(2,'0') + ':' + (seconds%60).toString().padStart(2,'0')
}

function players() {
  const captures = {w:[],b:[]}
  const bot=versusAI()?opponentAt(level):null
  for (const move of fogged() ? [] : state.moves) if (move.captured) captures[move.color].push(move.captured)
  const weights = {p:1,n:3,b:3,r:5,q:9}
  for (const [id,color] of [['opponent',flipped ? 'w' : 'b'],['player',flipped ? 'b' : 'w']]) {
    const side = color === 'w' ? 'White' : 'Black'
    const name = versusAI() && color === 'b' ? opponentAt(level).name : mode === 'online' && color === onlineColor ? 'You' : side
    const sub = bot && color === 'b' ? bot.rating+' Elo target' : mode==='ai-ranked' && color==='w' ? ladder.rating+' AI Elo' : mode === 'online' && !onlineState?.online.includes(color) ? 'Away' : side + ' pieces'
    const value = list => list.reduce((sum,type)=>sum+weights[type],0)
    const advantage = value(captures[color])-value(captures[opposite(color)])
    $(id).innerHTML = `<div class="avatar ${color}">${color==='b' && bot ? bot.avatar : color==='w'?'♘':'♞'}</div><div class="player-info"><strong>${name}</strong><span>${sub}</span></div>
      <span class="captures" aria-label="Captured pieces">${captures[color].map(p=>glyph[p]).join('')}${advantage>0 ? ' +'+advantage : ''}</span>
      <div class="clock" id="clock-${color}">${icon('clock')}<span></span></div>`
  }
  clocks()
}

function clocks() {
  const remaining = mode === 'online' ? {...state.clocks} : local.remaining(firstMove ? local.started : Date.now())
  const active = !state.result && (mode !== 'online' || onlineState?.match)
  if (active && mode === 'online') remaining[turn()] = Math.max(0,remaining[turn()] - (performance.now()-stateAt) - ping/2)
  for (const color of ['w','b']) {
    const clock = $('clock-'+color)
    if (!clock) continue
    clock.classList.toggle('running',Boolean(active && turn() === color))
    clock.classList.toggle('low-time',Boolean(state.minutes && remaining[color] < 20000))
    clock.querySelector('span').textContent = clockText(remaining[color])
  }
}

const names = {survival:'Survival',boss:'Boss battle',local:'Local game',ai:'Casual AI','ai-ranked':'Ranked AI',training:'Training',online:'Online match',puzzle:'Tactical puzzle',sandbox:'Sandbox'}
function drawStatus() {
  const connection = $('connection')
  connection.classList.toggle('offline',mode === 'online' && !linked)
  connection.querySelector('span').textContent = mode === 'online' ?
    (linked ? 'Connected' + (ping ? ' · '+ping+' ms' : '') : 'Reconnecting') : 'Local session'
}
function render() {
  drawStatus()
  renderBoard()
  players()
  const title = mode==='training'?lesson.name:mode === 'puzzle' ? puzzle.name : mode === 'sandbox' ? 'Sandbox' : variants[state.variant] || 'Classic Chess'
  $('game-title').textContent = title
  $('breadcrumb').textContent = title
  $('game-subtitle').textContent = {local:'Local multiplayer',ai:'Casual AI · '+opponentAt(level).name,'ai-ranked':'Ranked AI · '+rankOf(ladder.rating).name,training:lesson?.prompt,
    survival:'Survival · Round '+runLevel+' · Level '+level,
    boss:bossTheme?.label+' · Level '+level,
    online:onlineColor ? 'Online multiplayer · Playing '+(onlineColor === 'w' ? 'White' : 'Black') : 'Spectating online',
    puzzle:'Find checkmate in one move.',sandbox:'Practice from a custom position.'}[mode]
  $('match-type').textContent = onlineState?.division && mode === 'online' ? 'Ranked '+onlineState.division : names[mode]
  const status = trainingSolved?'Exercise complete':state.result ? (puzzleSolved ? 'Puzzle solved' : state.result.winner ?
    (state.result.winner === 'w' ? 'White' : 'Black') + ' wins' : 'Draw') :
    mode === 'online' && !onlineState?.match ? 'Waiting for opponent' :
      versusAI() && turn() === 'b' ? opponentAt(level).name+' is thinking' : (turn() === 'w' ? 'White' : 'Black') + ' to move'
  $('status').innerHTML = '<i></i><strong></strong><span></span>'
  $('status').querySelector('strong').textContent = status
  const check=!state.result && makeChess(state.fen,state.variant).isCheck()
  const notice=state.drawOffer ? 'Draw offered' : mode==='online' && onlineState?.match && onlineColor && !onlineState.online.includes(opposite(onlineColor)) ? 'Opponent disconnected' : ''
  $('status').querySelector('span').textContent = state.result?.reason || (check ? 'CHECK' : notice)
  if (check && lastCheck!==state.fen) {
    playSound('glass',settings.volume*.68,true)
    lastCheck=state.fen
  }
  $('new-game').disabled=Boolean(rankBlocked())
  const checks = viewChess().remainingChecks?.()
  const rule = checks ? (3-checks.white)+' White checks · '+(3-checks.black)+' Black checks' :
    mode==='puzzle'?'Mate in one':variants[state.variant] || 'Standard rules'
  $('match-meta').textContent = (state.minutes ? state.minutes+' min'+(state.increment?' + '+state.increment+'s':'') : 'Untimed') + ' · ' + (mode==='ai' || mode==='local' ? openingFor(state.moves) || rule : rule)
  $('room-meta').replaceChildren()
  if (roomCode) {
    const share = el('button','','Copy invite · '+roomCode)
    share.onclick = () => copyInvite()
    $('room-meta').append(share)
  }
  $('draw').disabled = Boolean(state.result || !['local','online'].includes(mode) || (mode === 'online' && (!onlineState?.match || !onlineColor)))
  $('draw').querySelector('span').textContent = mode === 'online' && state.drawOffer === opposite(onlineColor) ? 'Accept draw' : 'Offer draw'
  $('resign').disabled = ['puzzle','training'].includes(mode) || mode === 'online' && (!onlineState?.match || !onlineColor)
  $('resign').querySelector('span').textContent = state.result ? (mode==='survival' && state.result.winner==='w' && level<30 ? 'Next round' : 'Rematch') : 'Resign'
  $('resign').title = onlineState?.rematch?.length ? 'Rematch requested' : ''
  renderPanel()
  if (state.result && !lastResult && !['puzzle','training'].includes(mode)) {
    lastResult = state.result
    const matchId=mode==='online' ? onlineState?.matchId || roomCode+':'+onlineState?.seq : ladder.active?.id
    let change=mode==='online'?onlineState?.rating?.[onlineColor]:null
    if (mode==='ai-ranked') {
      const rated=rateAI(ladder,matchId,state.result)
      if(rated){ladder=rated;change=ladder.history[0];persistLadder()}
    }
    if (matchId && history.some(game=>game.matchId===matchId)) return
    if (mode==='survival' && state.result.winner==='w') persist('survival-best',Math.max(runLevel,read('survival-best',0)))
    if (mode==='boss' && state.result.winner==='w') persist('bosses-won',[...new Set([...read('bosses-won',[]),level])])
    if (state.moves.length>=4) awardXP(versusAI() && state.result.winner==='w' ? 45 : 20)
    history = [{mode,level,matchId,result:state.result,date:Date.now(),pgn:exportPgn()},...history].slice(0,100)
    persist('history',history)
    if (screen==='match' && (mode!=='online' || onlineColor)) showResult(change)
  }
}

function exportPgn() {
  if (state.variant && !['standard','fog'].includes(state.variant)) {
    const result = state.result ? state.result.winner==='w'?'1-0':state.result.winner==='b'?'0-1':'1/2-1/2' : '*'
    const headers = '[Variant "'+variants[state.variant]+'"]\n[SetUp "1"]\n[FEN "'+state.initial+'"]\n[Result "'+result+'"]'
    return headers+'\n\n'+state.moves.map((move,index)=>(index%2===0?String(index/2+1)+'. ':'')+move.san).join(' ')+' '+result
  }
  const chess = new Chess(state.initial)
  for (const move of state.moves) moveFor(chess,move)
  if (state.result) chess.setHeader('Result',state.result.winner === 'w' ? '1-0' : state.result.winner === 'b' ? '0-1' : '1/2-1/2')
  return chess.pgn()
}

function renderPanel() {
  const content = $('panel-content')
  content.replaceChildren()
  document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('current',item.dataset.tab === tab))
  const ply = replay ?? state.moves.length
  for (const id of ['first','prev']) $(id).disabled = ply === 0
  for (const id of ['next','last']) $(id).disabled = replay === null
  if (fogged()) {
    for (const id of ['first','prev','next','last']) $(id).disabled = true
    content.append(el('p','empty-moves','Move history is available after the game.'))
    return
  }
  if (tab === 'game') {
    const rows = [['Mode',names[mode]],['Time control',state.minutes ? state.minutes+' minutes' : 'Untimed'],['Moves',String(state.moves.length)]]
    if (roomCode) rows.push(['Room',roomCode])
    for (const [key,value] of rows) {
      const row = el('div','info-row')
      row.append(el('span','',key),el('strong','',value))
      content.append(row)
    }
    const save = el('button','secondary full','Download PGN')
    save.onclick = () => download(exportPgn())
    content.append(save)
    if (state.result && state.moves.length && mode !== 'puzzle' && ['standard','fog'].includes(state.variant)) {
      const analyze = el('button','secondary full','Analyze game')
      analyze.onclick = () => openAnalysis()
      content.append(analyze)
    }
    if (!state.result && ['ai','local','sandbox'].includes(mode)) {
      const savePointButton=el('button','secondary full','Save and return to menu')
      savePointButton.onclick=saveCasual
      content.append(savePointButton)
    }
    if (mode==='ai' && !state.result) {
      const hint=el('button','secondary full','Hint')
      hint.disabled=!canPlay()
      hint.onclick=async()=>{
        const lookup=new Engine()
        const fen=state.fen
        try {
          const best=await lookup.move(fen,30,120)
          if(best && state.fen===fen && mode==='ai') toast('Consider '+best.slice(0,2)+' → '+best.slice(2,4))
        } catch(error){toast(error.message)}
        finally{lookup.close()}
      }
      const undo=el('button','secondary full','Undo last turn')
      undo.disabled=!state.moves.length
      undo.onclick=undoCasual
      content.append(hint,undo)
    }
    if (state.claimable && canPlay()) {
      const claim = el('button','secondary full','Claim draw')
      claim.onclick = () => {
        if (mode === 'online') online.send({type:'claim'})
        else { local.claim(turn()); refreshLocal() }
      }
      content.append(claim)
    }
    return
  }
  if (!state.moves.length) {
    const blank = el('div','empty-moves')
    const figurine = el('span','empty-icon','♙')
    blank.append(figurine,el('strong','','No moves yet'),el('p','','Moves will appear here as you play.'))
    content.append(blank)
    return
  }
  const initial = state.initial.split(' ')
  const table = el('div','moves-table')
  table.innerHTML = '<div class="move-head"><span>#</span><span>White</span><span>Black</span></div>'
  let number = +initial[5], row
  for (const [index,move] of state.moves.entries()) {
    if (!row || move.color === 'w') {
      row = el('div','move-row')
      row.append(el('span','',String(number)))
      table.append(row)
      if (move.color === 'b') row.append(el('span','','—'))
    }
    const item = el('button',ply === index+1 ? 'chosen' : '',move.san)
    item.onclick = () => seek(index+1)
    row.append(item)
    if (move.color === 'b') number++
  }
  content.append(table)
  if (replay === null) content.scrollTop = content.scrollHeight
}

function seek(ply) {
  if (fogged()) return
  drop = null
  replay = ply >= state.moves.length ? null : Math.max(ply,0)
  selected = null
  renderBoard()
  renderPanel()
}

function download(text) {
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain'}))
  const link = document.createElement('a')
  link.href = url
  link.download = 'chess-evolution.pgn'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url),1000)
}

async function copyInvite() {
  const url = new URL(location.pathname,location.origin)
  url.searchParams.set('room',roomCode)
  try { await navigator.clipboard.writeText(url.href); toast('Invite link copied') }
  catch {
    show('Share invitation','<label>Invite link<input id="invite-link" readonly></label>')
    $('invite-link').value = url.href
    $('invite-link').select()
  }
}

const options = (values,selected) => values.map(([value,label]) => `<option value="${value}" ${String(value) === String(selected) ? 'selected' : ''}>${label}</option>`).join('')
const timeControl = (value=10) => '<label>Time control<select id="time-control">'+options([...TIMES.map(time=>[time,time ? time+' minutes' : 'Untimed']),['custom','Custom']],TIMES.includes(value)?value:'custom')+
  '</select></label><div class="two-fields" id="custom-clock" hidden><label>Minutes<input type="number" id="custom-minutes" min="1" max="180" value="'+(value || 10)+'"></label><label>Increment (seconds)<input type="number" id="custom-increment" min="0" max="60" value="0"></label></div>'
function bindClock() {
  const field=$('time-control')
  const update=()=>$('custom-clock').hidden=field.value!=='custom'
  field.onchange=update
  update()
}
function clockOptions() {
  const custom=$('time-control').value==='custom'
  const minutes=+(custom?$('custom-minutes').value:$('time-control').value)
  const increment=custom?+$('custom-increment').value:0
  if(!validClock(minutes,increment) || (custom && !minutes)) throw new Error('Enter 1–180 minutes and a 0–60 second increment')
  return {minutes,increment}
}
function show(title,body) {
  const dialog = $('dialog')
  cancelAnalysis?.()
  cancelAnalysis = null
  $('dialog-content').innerHTML = '<div class="dialog-head"><h2></h2>'+button('x','Close','close-dialog')+'</div>'+body
  $('dialog-content').querySelector('h2').textContent = title
  $('close-dialog').onclick = () => dialog.close()
  if (!dialog.open) dialog.showModal()
  if(board)board.backdropPaused=true
}

function setup(kind='local') {
  if (rankBlocked()) { toast('Finish or resign the ranked match first');return }
  const ai = kind === 'ai'
  show(ai ? 'AI opponents' : 'New game', `
    ${!ai ? `<div class="mode-picker">
      ${action('users','Local multiplayer','choose-local','secondary')}
      ${action('bot','Casual AI','choose-ai','secondary')}
      ${action('crown','Ranked AI','choose-ranked-ai','secondary')}
      ${action('wifi','Casual online','choose-online','secondary')}
      ${action('flag','Ranked online','choose-ranked','secondary')}
      ${action('plus','Private match','choose-private','secondary')}
    </div>${savePoint?action('download','Resume saved game','resume-saved','secondary full'):''}` : ''}
    <form id="start-form">
    ${timeControl(state.minutes || defaultMinutes)}
    ${ai ? '<label>Difficulty<select id="level">'+options(Array.from({length:30},(_,i)=>[i+1,(i===29?'Maximum':(i+1)*100+' Elo')+' · '+opponentAt(i+1).name]),level)+'</select></label><div id="opponent-detail" class="bot-detail"></div><button type="button" class="secondary" id="favorite-ai">Favourite opponent</button><label>Thinking time<select id="think-time">'+options([[0,'Instant'],[150,'Fast · 150 ms'],[450,'Normal · 450 ms'],[1200,'Deep · 1.2 s'],[3000,'Extended · 3 s']],thinkTime)+'</select></label>' : '<label>Rules<select id="variant">'+options(Object.entries(variants),state.variant)+'</select></label><label id="start-position-field">Starting position<select id="start-position"><option value="normal">Standard opening</option><option value="custom">Custom FEN / PGN</option></select></label><label id="custom-fen" hidden>FEN or PGN<textarea id="fen" rows="4" spellcheck="false"></textarea></label>'}
    <p class="form-error" id="form-error" role="alert"></p><button class="primary full">Start game</button></form>`)
  bindClock()
  if (ai) {
    const choose = () => {
      const opponent = opponentAt(+$('level').value)
      const records=history.filter(game=>game.mode==='ai' && game.level===+$('level').value)
      $('opponent-detail').replaceChildren(el('span','bot-avatar',opponent.avatar),el('p','',opponent.title+' · '+opponent.description+' '+records.filter(game=>game.result.winner==='w').length+' W / '+records.filter(game=>game.result.winner==='b').length+' L'))
      $('favorite-ai').setAttribute('aria-pressed',String(aiFavourites.has(+$('level').value)))
      $('favorite-ai').textContent=aiFavourites.has(+$('level').value)?'Remove favourite':'Favourite opponent'
    }
    $('favorite-ai').onclick=()=>{
      const id=+$('level').value
      if(aiFavourites.has(id))aiFavourites.delete(id)
      else aiFavourites.add(id)
      persist('ai-favourites',[...aiFavourites])
      choose()
    }
    $('level').onchange = choose
    choose()
  }
  if (!ai) {
    $('choose-local').onclick = () => setup()
    $('choose-ai').onclick = () => setup('ai')
    $('choose-online').onclick = openOnline
    $('choose-private').onclick = openOnline
    $('choose-ranked').onclick = openRanked
    $('choose-ranked-ai').onclick = openRankedAI
    if($('resume-saved'))$('resume-saved').onclick=resumeCasual
    $('variant').onchange = () => {
      const standard = $('variant').value==='standard'
      $('start-position-field').hidden = !standard
      $('custom-fen').hidden = !standard || $('start-position').value!=='custom'
    }
    $('variant').onchange()
    $('start-position').onchange = () => { $('custom-fen').hidden = $('start-position').value !== 'custom' }
  }
  $('start-form').onsubmit = event => {
    event.preventDefault()
    try {
      const variant = ai ? 'standard' : $('variant').value
      const custom = !ai && variant==='standard' && $('start-position').value === 'custom'
      let fen
      if (custom) {
        const input = $('fen').value.trim()
        if (!input) throw new Error('Enter a FEN position or PGN game')
        try { fen = new Chess(input).fen() }
        catch {
          const imported = new Chess()
          imported.loadPgn(input)
          fen = imported.fen()
        }
      }
      if (ai) { level = +$('level').value; thinkTime = +$('think-time').value }
      const {minutes,increment}=clockOptions()
      startLocal(custom ? 'sandbox' : kind,minutes,fen,variant,increment)
    } catch (error) { $('form-error').textContent = error.message }
  }
}

function openTraining() {
  if(rankBlocked()){toast('Finish or resign the ranked match first');return}
  show('Learn chess','<div id="lessons" class="lesson-grid"></div>')
  for(const exercise of lessons){
    const pick=el('button','secondary',exercise.name)
    pick.onclick=()=>{lesson=exercise;startLocal('training',0,exercise.fen)}
    $('lessons').append(pick)
  }
}

function openRankedAI() {
  if(rankBlocked()){toast('Finish or resign the ranked match first');return}
  const rank=rankOf(ladder.rating)
  show('Ranked AI',`<div class="rank-overview">
    <div class="rank-crest" data-rank="${rank.index}" aria-hidden="true">
      ${icon(['flag','swords','layers','crown','box','sparkles','star','crown','flag','sparkles','crown'][rank.index])}
    </div>
    <div><strong>${rank.name}</strong><span>${ladder.rating} Elo</span></div>
  </div>
  ${rank.next?`<progress class="rank-meter" max="${rank.next-rank.floor}" value="${ladder.rating-rank.floor}"></progress><p>${rank.next-ladder.rating} Elo to ${rankOf(rank.next).name}</p>`:''}
  <div class="rank-numbers"><div><span>Best Elo</span><strong>${ladder.best}</strong></div><div><span>Streak / longest</span><strong>${ladder.streak} / ${ladder.longest}</strong></div><div><span>Win / loss / draw</span><strong>${ladder.wins} / ${ladder.losses} / ${ladder.draws}</strong></div></div>
  <canvas id="rating-graph" class="rating-graph" width="780" height="160" aria-label="Ranked AI rating history"></canvas>
  <div class="list" id="rank-log"></div>
  ${!ladder.played?`<label class="toggle"><input type="checkbox" id="placement" ${ladder.placements?'checked':''}> Faster Elo changes for first five matches</label>`:''}
  <button class="primary full" id="find-ai">Find match · 10 minutes</button>`)
  const trend=[400,...ladder.history.slice(0,36).reverse().map(row=>row.rating)]
  if(ladder.history.length>36)trend.shift()
  ratingChart($('rating-graph'),trend)
  for(const row of ladder.history.slice(0,5)){
    const name=opponentAt(row.level).name
    const item=el('div','info-row')
    item.append(el('span','',name+' · '+(row.result.winner==='w'?'Victory':row.result.winner==='b'?'Defeat':'Draw')),
      el('strong','',signed(row.delta)+' Elo'))
    $('rank-log').append(item)
  }
  $('find-ai').onclick=()=>{
    if($('placement'))ladder.placements=$('placement').checked
    level=ratedOpponent(ladder.rating)
    thinkTime=385
    ladder.active={id:crypto.randomUUID(),level}
    startLocal('ai-ranked',10)
  }
}

function ratingChart(canvas,history) {
  const ctx=canvas.getContext('2d'),{width,height}=canvas
  const low=Math.min(...history)-22,high=Math.max(...history)+22
  ctx.strokeStyle='#434047'
  for (const y of [height*.25,height*.5,height*.75]){
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()
  }
  ctx.strokeStyle='#dfbb85';ctx.lineWidth=4
  ctx.beginPath()
  history.forEach((value,index)=>{
    const x=8+(width-16)*index/Math.max(1,history.length-1)
    const y=12+(height-24)*(1-(value-low)/(high-low))
    if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y)
    if(history.length===1)ctx.lineTo(width-8,y)
  })
  ctx.stroke()
}

const signed = value => (value>0?'+':'')+value

function showResult(change) {
  const final=state.result
  const perspective=mode==='online'?onlineColor:versusAI()?'w':null
  const outcome=!final.winner?'Draw':perspective?final.winner===perspective?'Victory':'Defeat':final.winner==='w'?'White wins':'Black wins'
  const duration=Math.floor((state.duration || 0)/1000)
  const opponent=versusAI()?opponentAt(level).name:mode==='online'?'Online opponent':'Local multiplayer'
  const current=mode==='ai-ranked' && change?rankOf(change.rating):null
  const promoted=current && current.index>rankOf(change.before).index
  show(outcome,`<div class="result-body ${promoted?'rank-promotion':''}">
    <div class="result-mark">${icon(final.winner?'crown':'handshake')}</div>
    <p class="result-reason" id="result-reason"></p><p class="result-opponent" id="result-opponent"></p>
    ${change?`<div class="result-elo"><span>${change.before}</span><span>→</span><strong>${change.rating}</strong><b>${signed(change.delta)} Elo</b></div>`:''}
    ${promoted?`<p class="result-promotion">Promoted to ${current.name}</p>`:''}
    <div class="result-details"><span>${Math.ceil(state.moves.length/2)} moves</span><span>${Math.floor(duration/60)}m ${duration%60}s</span></div>
    <div class="result-buttons">
      <button class="primary" id="result-repeat">${mode==='ai-ranked'?'Next ranked match':'Rematch'}</button>
      ${state.moves.length?`<button class="secondary" id="result-review">Review game</button>`:''}
      <button class="secondary" id="result-home">Return to menu</button>
      <button class="secondary" id="result-pgn">Download PGN</button>
    </div></div>`)
  $('result-reason').textContent=final.reason
  $('result-opponent').textContent=opponent
  playSound('ui',settings.volume*.78,true)
  $('result-repeat').onclick=()=>{$('dialog').close();$('resign').click()}
  $('result-home').onclick=()=>{$('dialog').close();showScreen('home')}
  $('result-pgn').onclick=()=>download(exportPgn())
  if($('result-review'))$('result-review').onclick=()=>{
    if(['standard','fog'].includes(state.variant))openAnalysis()
    else {$('dialog').close();seek(1)}
  }
}

function saveCasual() {
  const game=local.save()
  game.clocks=local.remaining(firstMove?local.started:Date.now())
  savePoint={game,mode,level,thinkTime}
  persist('casual-save',savePoint)
  stopEngine()
  hasMatch=false
  local=new Match()
  state=local.snapshot()
  firstMove=true
  mode='local'
  showScreen('home')
  toast('Game saved')
}

function resumeCasual() {
  if(!savePoint || rankBlocked())return
  try{
    const saved=savePoint
    const restored=Match.restore(saved.game)
    online.leave()
    stopEngine()
    local=restored
    local.started=Date.now()
    mode=saved.mode
    level=saved.level
    thinkTime=saved.thinkTime
    firstMove=false
    hasMatch=true
    selected=null
    flipped=false
    replay=null
    lastResult=null
    motionKey=''
    $('dialog').close()
    refreshLocal()
    showScreen('match')
    if(versusAI())requestMove()
    savePoint=null
    persist('casual-save',null)
  }catch{toast('The saved game could not be restored')}
}

function undoCasual() {
  if(mode!=='ai' || state.result || !state.moves.length)return
  stopEngine()
  const saved=local.save()
  const rewind=state.moves.at(-1)?.color==='b'?2:1
  local=Match.restore({...saved,moves:saved.moves.slice(0,-rewind),clocks:local.remaining(),started:Date.now()})
  replay=null
  selected=null
  premove=null
  motionKey=''
  refreshLocal()
}

function openRanked() {
  if(rankBlocked()){toast('Finish or resign the ranked match first');return}
  show('Ranked',`<div class="list"><label>Time control<select id="ranked-time">
    ${options([1,2,3,5,10,15].map(time=>[time,time+' min · '+divisionFor(time)]),5)}
    </select></label>
    ${action('swords','Find ranked match','ranked-queue','primary')}
    <p id="online-note" aria-live="polite"></p><div id="ladder" class="list" aria-live="polite"></div></div>`)
  const update = () => online.withProfile({type:'ladder',division:divisionFor(+$('ranked-time').value)})
  $('ranked-time').onchange = update
  $('ranked-queue').onclick = () => {
    waiting = true
    $('online-note').textContent = 'Connecting…'
    online.withProfile({type:'queue',minutes:+$('ranked-time').value,ranked:true})
  }
  update()
}

function divisionFor(minutes) { return minutes<3?'bullet':minutes<10?'blitz':'rapid' }

function renderLadder({player,leaderboard,division,season}) {
  const ladder = $('ladder')
  if (!ladder || division !== divisionFor(+$('ranked-time').value)) return
  ladder.replaceChildren(el('h3','','Season '+season+' · '+division))
  if (player) {
    ladder.append(el('p','',player.rank+' · '+player.rating+' Elo · '+player.wins+' wins / '+player.losses+' losses / '+player.draws+' draws'))
    const recent = player.history.at(-1)
    if (recent) ladder.append(el('p','','Best '+player.peak+' · Win streak '+player.streak+' · Latest '+(recent.delta>0?'+':'')+recent.delta))
  }
  if (!leaderboard.length) ladder.append(el('p','','No rated games in this season yet.'))
  leaderboard.forEach((entry,index) => {
    const row = el('div','info-row')
    row.append(el('span','',String(index+1)+'. '+entry.name),el('strong','',entry.rating+' · '+entry.rank))
    ladder.append(row)
  })
}

function openOnline() {
  if(rankBlocked()){toast('Finish or resign the ranked match first');return}
  show('Multiplayer', `<div class="online-controls">
    <h3>Create a private match</h3><div class="two-fields">${timeControl()}<label>Play as<select id="seat"><option value="random">Random</option><option value="w">White</option><option value="b">Black</option></select></label></div>
    <div class="two-fields">${action('plus','Create room','create','primary')}${action('users','Find opponent','queue','secondary')}</div>
    <form id="join-form"><h3>Join a room</h3><label>Room code<input autocomplete="off" id="code" placeholder="6-character code" pattern="[a-fA-F0-9]{6}" maxlength="6" required></label>
    <div class="two-fields"><button class="secondary">Join match</button>${action('wifi','Spectate','spectate','secondary')}</div></form>
    <p id="online-note" aria-live="polite"></p></div>`)
  bindClock()
  const actionWithClock=type=>{
    try{online.send({type,...clockOptions(),color:$('seat').value},true)}
    catch(error){$('online-note').textContent=error.message}
  }
  $('create').onclick = () => actionWithClock('create')
  $('queue').onclick = () => {
    waiting = true
    $('online-note').textContent = 'Connecting…'
    actionWithClock('queue')
  }
  function join(spectate) {
    if ($('join-form').reportValidity()) online.join($('code').value.trim().toUpperCase(),spectate)
  }
  $('join-form').onsubmit = event => { event.preventDefault(); join(false) }
  $('spectate').onclick = () => join(true)
}

const puzzles = [
  {name:'Back rank', fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1'},
  {name:'Royal escort', fen:'7k/8/6K1/8/8/8/8/Q7 w - - 0 1'},
  {name:'Corner trap', fen:'k7/8/1K6/8/8/8/8/7R w - - 0 1'},
].filter(item => {
  const chess = new Chess(item.fen)
  return chess.moves().some(move => {
    chess.move(move)
    const mate = chess.isCheckmate()
    chess.undo()
    return mate
  })
})
function openPuzzles() {
  show('Puzzles','<div id="puzzle-list" class="list"></div>')
  const solved = read('solved',[])
  const daily = Math.floor(Date.now()/86400000)%puzzles.length
  for (const [index,item] of puzzles.entries()) {
    const pick = el('button','secondary',item.name + (solved.includes(item.name) ? ' · Solved' : '') + (index === daily ? ' · Daily' : ''))
    pick.onclick = () => { puzzle = item; startLocal('puzzle',0,item.fen) }
    $('puzzle-list').append(pick)
  }
}

function challenges() {
  show('Challenges',`<div class="list">
    ${action('gamepad-2','Learn chess','training','secondary')}
    ${action('puzzle','Daily puzzle','daily','secondary')}
    ${action('swords','Start survival','survival','primary')}
    <p>Best survival round: ${read('survival-best',0)}</p>
    <h3>Boss battles</h3><div class="list" id="boss-list"></div></div>`)
  $('training').onclick=openTraining
  $('daily').onclick = () => {
    puzzle = puzzles[Math.floor(Date.now()/86400000)%puzzles.length]
    startLocal('puzzle',0,puzzle.fen)
  }
  $('survival').onclick = () => {
    runLevel = 1
    level = 1
    startLocal('survival',10)
  }
  for (const boss of bosses) {
    const completed = read('bosses-won',[]).includes(boss.level)
    const select = el('button','secondary',boss.label+' · '+opponentAt(boss.level).name+(completed?' · Defeated':''))
    select.onclick = () => { level = boss.level; bossTheme = boss; startLocal('boss',10) }
    $('boss-list').append(select)
  }
}

function settingsDialog() {
  show('Settings', `
    <div class="list"><div class="two-fields"><label>Camera<select data-setting="camera">${options(Object.entries(cameras),settings.camera)}</select></label>
    <label>Graphics<select data-setting="quality">${options([['low','Performance'],['medium','Balanced'],['high','High'],['ultra','Ultra'],['photo','Cinematic'],['custom','Custom']],settings.quality)}</select></label></div>
    <label>Model quality<select data-setting="modelQuality">${options([['high','High'],['low','Performance']],settings.modelQuality)}</select></label>
    <label>Environment detail<select data-setting="worldDetail">${options([['auto','Match graphics preset'],['low','Performance'],['high','Detailed']],settings.worldDetail)}</select></label>
    <label class="toggle"><input type="checkbox" data-setting="worldMotion" ${settings.worldMotion?'checked':''}> Environment animation</label>
    <label>Walnut textures<select data-setting="textureQuality">${options([['auto','Match preset'],['low','Standard'],['2k','2K'],['4k','4K']],settings.textureQuality)}</select></label>
    <div class="settings-toggles">${[['coords','Board coordinates'],['autoQueen','Auto queen'],['reduced','Reduced motion'],['cosmetics','Animated materials'],['reflections','Reflections'],['shadows','Shadows'],['particles','Particles'],['coach','Move explanations'],['premoves','Premoves'],['rotate','Auto-rotate local board'],['confirm','Confirm casual moves']].map(([id,label])=>`<label class="toggle"><input type="checkbox" data-setting="${id}" ${settings[id]?'checked':''}> ${label}</label>`).join('')}</div>
    <div class="two-fields"><label>Field of view<input data-setting="fov" type="range" min="-6" max="18" value="${settings.fov}"></label>
    <label>Frame rate limit<select data-setting="frames">${options([[0,'Display refresh'],[30,'30 FPS'],[60,'60 FPS'],[120,'120 FPS']],settings.frames)}</select></label></div>
    <label>Move highlights<select data-setting="highlight">${options([['green','Sage'],['blue','Blue'],['gold','Gold']],settings.highlight)}</select></label>
    <label>Move sound volume<input data-setting="volume" type="range" min="0" max="100" value="${settings.volume}"></label>
    <label>Room ambience<input data-setting="ambient" type="range" min="0" max="100" value="${settings.ambient}"></label></div>`)
  bindSettings()
}

function bindSettings() {
  $('dialog-content').querySelectorAll('[data-setting]').forEach(field=>{
    field.onchange=()=>{
      const id=field.dataset.setting
      settings[id]=field.type==='checkbox'?field.checked:field.type==='range'?Number(field.value):field.value
      persist('settings',settings)
      if (id==='camera') { flat=!board || settings.camera==='flat';resetCamera() }
      applySettings()
      if (id==='ambient') {
        playSound('ui',Math.max(1,settings.volume)*.4)
        setTimeout(()=>roomSound(locationFor(settings.environment).id,settings.ambient),150)
      }
    }
  })
}

function quickSettings() {
  if(rankBlocked()){settingsDialog();return}
  show('Board controls',`<div class="list">
    <label>Camera<select data-setting="camera">${options(Object.entries(cameras),settings.camera)}</select></label>
    <label>Chessboard<select data-setting="theme">${options(Object.entries(themeList),settings.theme)}</select></label>
    <label>Piece set<select id="quick-set">${options(Object.entries(collectionList),settings.collection)}</select></label>
    <label>Table<select data-setting="table">${options(Object.entries(tables),settings.table)}</select></label>
    <label>Environment<select data-setting="environment">${options(Object.entries(locations).map(([id,{name}])=>[id,name]),settings.environment)}</select></label>
    <label>Animation<select data-setting="motion">${options(Object.entries(movements),settings.motion)}</select></label>
    <button class="secondary" id="quick-collection">Open showroom</button></div>`)
  bindSettings()
  $('quick-set').onchange=()=>{applyCollection(settings,$('quick-set').value);persist('settings',settings);applySettings()}
  $('quick-collection').onclick=()=>{$('dialog').close();openStudio()}
}

function openPhotography() {
  if (!board || $('webgl').hidden){toast('Switch to 3D to enter photography');return}
  stage.classList.add('photo-mode')
  $('photo-bar').hidden=false
  $('photo-fov').value=board.camera.fov
  $('photo-exposure').value=board.renderer.toneMappingExposure
  $('photo-aperture').value=0
  $('photo-focus').value=11
  $('photo-lighting').value=settings.lighting
  $('photo-freeze').checked=false
  board.freezeWorld=false
  board.photoAperture=0
  board.reset('photo',flipped)
  $('photo-bar').scrollIntoView({block:'nearest'})
}
function closePhotography() {
  if(!stage.classList.contains('photo-mode'))return
  stage.classList.remove('photo-mode')
  $('photo-bar').hidden=true
  board.freezeWorld=false
  board.photoAperture=0
  board.renderer.toneMappingExposure=1.05
  resetCamera()
  applySettings()
}
$('photo-close').onclick=closePhotography
$('photo-save').onclick=photograph
$('photo-freeze').onchange=()=>{board.freezeWorld=$('photo-freeze').checked}
$('photo-fov').oninput=()=>{
  board.camera.fov=Number($('photo-fov').value)
  board.camera.updateProjectionMatrix()
  board.dirty=true
}
$('photo-exposure').oninput=()=>{
  board.renderer.toneMappingExposure=Number($('photo-exposure').value)
  board.dirty=true
}
$('photo-lighting').onchange=()=>{
  board.lightWorld(board.worldOptions.environment,$('photo-lighting').value)
  board.dirty=true
}
for(const field of ['photo-aperture','photo-focus']){
  $(field).oninput=()=>{
    board.depthOfField(Number($('photo-aperture').value),Number($('photo-focus').value))
      .catch(()=>toast('Depth of field is unavailable on this device'))
  }
}

async function photograph() {
  if (!board || $('webgl').hidden) { toast('Switch to 3D to take a photograph');return }
  try {
    const blob=await board.photograph()
    if (!blob) throw new Error()
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a')
    link.href=url
    link.download='chess-evolution.png'
    link.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  } catch { toast('Could not save the photograph') }
}

function openAnalysisLibrary() {
  if(rankBlocked()){toast('Analysis is available after the ranked match');return}
  if (state.result && state.moves.length && ['standard','fog'].includes(state.variant)) return openAnalysis()
  show('Analysis','<div id="review-games" class="list"></div>')
  const list=$('review-games')
  for (const game of history.slice(0,20)) {
    try {
      const chess=new Chess()
      chess.loadPgn(game.pgn)
      const moves=chess.history({verbose:true})
      if (!moves.length) continue
      const review=el('button','secondary',new Date(game.date).toLocaleDateString()+' · '+game.result.reason)
      review.onclick=()=>openAnalysis({variant:'standard',result:game.result,initial:moves[0].before,moves})
      list.append(review)
    } catch {}
  }
  if (!list.childElementCount) list.append(el('p','','Finish a match to review it here.'))
}

function openAnalysis(snapshot=state) {
  if(rankBlocked())return
  if (!snapshot.result || !snapshot.moves.length || !['standard','fog'].includes(snapshot.variant)) return
  show('Game analysis',`<p id="opening"></p><div class="analysis-graph"><canvas id="evaluation" width="620" height="154" aria-label="White evaluation graph"></canvas></div>
    <p id="analysis-progress" aria-live="polite">Starting Stockfish…</p><p id="analysis-key-moves"></p><div id="analysis-rows" class="list"></div>`)
  $('opening').textContent = openingFor(snapshot.moves) || 'Position review'
  cancelAnalysis = analyzeGame(snapshot, rows => {
    const graph = $('evaluation')
    const ctx = graph.getContext('2d')
    ctx.clearRect(0,0,graph.width,graph.height)
    const middle = graph.height/2
    ctx.strokeStyle = '#584d50'
    ctx.beginPath()
    ctx.moveTo(0,middle)
    ctx.lineTo(graph.width,middle)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#d7b584'
    ctx.beginPath()
    ctx.moveTo(0,middle)
    rows.forEach((row,index) => ctx.lineTo(((index+1)/snapshot.moves.length)*graph.width,middle-Math.tanh((row.white||0)/400)*(middle-8)))
    ctx.stroke()
    const latest = rows.at(-1)
    const row = el('div','info-row')
    row.append(el('span','',latest.index+'. '+latest.move.san),
      el('strong','',latest.grade+(latest.best && latest.best!==latest.move.san?' · Best '+latest.best:'')))
    if (snapshot===state) {
      row.classList.add('review-row')
      row.setAttribute('role','button')
      row.tabIndex=0
      const review=()=>{$('dialog').close();seek(latest.index)}
      row.onclick=review
      row.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();review()}}
    }
    $('analysis-rows').append(row)
    const critical=rows.reduce((worst,item)=>(item.loss || 0)>(worst?.loss || 0)?item:worst,null)
    const mate=rows.find(item=>item.move.san.includes('#'))
    $('analysis-key-moves').textContent=[
      mate?'Checkmate · '+mate.move.san:null,
      critical?'Largest missed opportunity · '+critical.move.san+(critical.best?' → '+critical.best:''):null,
    ].filter(Boolean).join(' · ')
    $('analysis-progress').textContent = 'Evaluating '+rows.length+' / '+snapshot.moves.length+' · White '+(accuracy(rows,'w')??'—')+'% · Black '+(accuracy(rows,'b')??'—')+'%'
  },error=> {
    if (error) $('analysis-progress').textContent = error.message
    else $('analysis-progress').textContent = $('analysis-progress').textContent.replace('Evaluating','Evaluated')
  })
}

function stats() {
  show('Statistics','<div id="stats" class="list"></div>')
  const container = $('stats')
  const profileLevel = 1+Math.floor(experience/120)
  container.append(el('p','','Level '+profileLevel+' · '+experience+' XP'))
  const rewardRow = el('div','list')
  rewardRow.append(el('h3','','Profile avatars'))
  for (const [mark,label,required] of [['G','Guest',1],['♞','Knight',2],['♛','Crown',4]]) {
    const pick = el('button','secondary',label+(profileLevel<required?' · Unlocks at level '+required:settings.avatar===mark?' · Equipped':''))
    pick.disabled = profileLevel<required
    pick.onclick = () => {
      settings.avatar = mark
      persist('settings',settings)
      applySettings()
      stats()
    }
    rewardRow.append(pick)
  }
  container.append(rewardRow)
  container.append(el('p','',history.length+' completed matches · '+read('solved',[]).length+' puzzles solved'))
  const find=el('input','history-query')
  find.placeholder='Search match history'
  find.type='search'
  find.setAttribute('aria-label','Search match history')
  find.oninput=()=>container.querySelectorAll('[data-history-text]').forEach(row=>{
    row.hidden=!row.dataset.historyText.includes(find.value.trim().toLowerCase())
  })
  container.append(find)
  for (const game of history.slice(0,50)) {
    const row = el('div','info-row')
    row.append(el('span','',names[game.mode] + ' · '+new Date(game.date).toLocaleDateString()))
    row.dataset.historyText=(names[game.mode]+' '+game.result.reason+' '+new Date(game.date).toLocaleDateString()).toLowerCase()
    const result = el('button','secondary',game.result.reason)
    result.title = 'Download match PGN'
    result.onclick = () => download(game.pgn)
    row.append(result)
    container.append(row)
  }
}

const shortcuts = () => show('Controls',`<div class="shortcut-list">
  <p><kbd>Click</kbd> Select a piece and its destination</p>
  <p><kbd>Drag</kbd> Move a piece in 3D</p>
  <p><kbd>V</kbd> Switch between 2D and 3D</p>
  <p><kbd>F</kbd> Flip the board</p>
  <p><kbd>R</kbd> Reset camera · <kbd>C</kbd> Cycle camera</p>
  <p>Right-drag to orbit, middle-drag to pan, scroll to zoom. Use two fingers on touchscreens.</p>
  <p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> Walk in free roam. Double-click a piece to focus.</p>
  <p><kbd>←</kbd> <kbd>→</kbd> Review moves</p>
  <p><kbd>Tab</kbd> Focus the 2D board, then use arrows to navigate and Enter to select</p></div>`)
const destinations = {Play:()=>setup(),Multiplayer:openOnline,Ranked:openRanked,'AI opponents':()=>setup('ai'),Puzzles:openPuzzles,Challenges:challenges,Collection:openStudio,Analysis:openAnalysisLibrary,Statistics:stats,Settings:()=>settingsDialog(),Controls:shortcuts}
document.querySelectorAll('[data-nav]').forEach(item => {
  item.onclick = () => {
    $('rail').classList.remove('opened')
    playSound('ui',settings.volume*.32)
    destinations[item.dataset.nav]()
  }
})
document.querySelectorAll('[data-tab]').forEach(button => {
  button.onclick = () => { tab = button.dataset.tab; renderPanel() }
})
$('dialog').addEventListener('close',() => {
  if(board)board.backdropPaused=$('dialog').open
  cancelAnalysis?.()
  cancelAnalysis = null
  if (waiting && mode !== 'online') { online.leave(); waiting = false }
})
$('mobile-menu').onclick = () => $('rail').classList.toggle('opened')
$('new-game').onclick = () => setup()
$('home-link').onclick=()=>showScreen('home')
$('home-play').onclick=()=>{if(hasMatch)showScreen('match');else setup()}
$('home-collection').onclick=openStudio
$('panel-toggle').onclick=()=>{
  const match=$('match-screen')
  match.classList.toggle('match-compact')
  $('panel-toggle').setAttribute('aria-pressed',String(match.classList.contains('match-compact')))
}
$('photo').onclick=openPhotography
$('quick').onclick=quickSettings
$('profile').onclick = stats
$('connection').onclick = openOnline
$('view-mode').onclick = () => { if (board) { flat = !flat; applySettings() } }
for(const control of $('walk-controls').querySelectorAll('[data-walk]')){
  const key=control.dataset.walk
  control.onpointerdown=event=>{
    if(!board)return
    control.setPointerCapture(event.pointerId)
    board.keys.add(key)
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    control.addEventListener(type,()=>board?.keys.delete(key))
  }
}
$('flip').onclick = () => { flipped = !flipped; resetCamera(); render() }
$('reset-camera').onclick = resetCamera
$('fullscreen').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen()
  else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => toast('Fullscreen is unavailable'))
  else toast('Fullscreen is unavailable')
}
$('first').onclick = () => seek(0)
$('prev').onclick = () => seek((replay ?? state.moves.length)-1)
$('next').onclick = () => seek((replay ?? state.moves.length)+1)
$('last').onclick = () => seek(state.moves.length)
$('draw').onclick = () => {
  if (mode === 'online') return online.send({type:'draw'})
  show('Draw by agreement','<p>Both players must agree to end the game as a draw.</p>'+action('handshake','Agree to draw','confirm-draw','primary full'))
  $('confirm-draw').onclick = () => {
    local.finish(null,'Draw by agreement')
    $('dialog').close()
    refreshLocal()
  }
}
$('resign').onclick = () => {
  if (state.result) {
    if (mode==='ai-ranked') {openRankedAI();return}
    if (mode === 'online') { online.send({type:'rematch'}); toast('Rematch requested'); return }
    if (mode==='survival') {
      runLevel = state.result.winner==='w' && level<30 ? runLevel+1 : 1
      level = Math.min(30,runLevel*2-1)
    }
    startLocal(mode,state.minutes,state.variant==='chess960'?undefined:state.initial,state.variant,state.increment)
    return
  }
  show('Resign game','<p>Resigning awards the game to the other player.</p>'+action('flag','Confirm resignation','confirm-resign','primary full'))
  $('confirm-resign').onclick = () => {
    $('dialog').close()
    if (mode === 'online') return online.send({type:'resign'})
    stopEngine()
    local.finish(versusAI() ? 'b' : opposite(turn()),'Resignation')
    refreshLocal()
  }
}
document.addEventListener('keydown',event => {
  if ($('dialog').open || $('grid').contains(event.target) || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return
  if (event.key.toLowerCase()==='c' && screen==='match' && board) {
    const choices=Object.keys(cameras)
    settings.camera=choices[(choices.indexOf(settings.camera)+1)%choices.length]
    flat=settings.camera==='flat'
    persist('settings',settings)
    resetCamera()
    applySettings()
    toast(cameras[settings.camera])
    return
  }
  if(event.key==='Escape' && stage.classList.contains('photo-mode')){closePhotography();return}
  if(screen!=='match') return
  if(event.key==='Escape'){premove=null;pendingSquare=null;selected=null;drop=null;renderBoard();return}
  const target = {v:'view-mode',f:'flip',r:'reset-camera',ArrowLeft:'prev',ArrowRight:'next'}[event.key]
  if (target) { event.preventDefault(); $(target).click() }
})
setInterval(() => {
  if (mode !== 'online' && !firstMove && !state.result) {
    local.tick()
    if (local.result) { stopEngine(); refreshLocal() }
  }
  clocks()
},200)
setInterval(() => online.ping(),4000)
const studio=showroom($('studio-screen'),{
  settings,defaults,read,persist,toast,onChange:applySettings,
  onInspect:(type,side)=>{
    if(!board)return
    if(type) board.inspectPiece(type,side)
    else { board.showBoard(); if(board.mode==='specimen')resetCamera() }
  },
  onClose:()=>showScreen(studioReturn),
  onPlay:()=>{ if(hasMatch || studioReturn==='match')showScreen('match');else{showScreen('home');setup()} },
  onDemo:kind=>{
    if(!board)return
    const chess=new Chess()
    for(const san of ['e4','d5'])chess.move(san)
    if (kind==='motion') {
      board.render(previewPosition,null,[],null,false)
      const sample=new Chess()
      const move=sample.move('e4')
      board.render(sample,null,[],move,true)
    } else {
      board.render(chess,null,[],null,false)
      const move=chess.move('exd5')
      board.render(chess,null,[],move,true)
    }
  },
  onCamera:pose=>board?.reset(pose,flipped),
  onPhoto:openPhotography,
})
flat=!board || settings.camera==='flat'
const matchLink = new URL(location.href).searchParams.get('view')==='match'
if (ladder.active?.game && !new URL(location.href).searchParams.has('room')) {
  try {
    local=Match.restore(ladder.active.game)
    state=local.snapshot()
    level=ladder.active.level
    mode='ai-ranked'
    hasMatch=true
    firstMove=false
  } catch {ladder.active=null;persistLadder()}
}
showScreen(matchLink || hasMatch?'match':'home')
render()
if(mode==='ai-ranked')requestMove()
const invite = new URL(location.href).searchParams.get('room')?.toUpperCase()
if (/^[A-F0-9]{6}$/.test(invite || '')) online.join(invite)
