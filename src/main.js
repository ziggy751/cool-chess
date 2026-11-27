import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/instrument-serif/latin-400.css'
import './style.css'
import './overhaul.css'
import './gameplay.css'
import './review.css'
import './ranked-ai.css'
import './phone.css'
import './handset/studio.css'
import { Chess } from 'chess.js'
import { makeChess, variants, fogVisibility } from './variants.js'
import { Match, START, TIMES, opposite, validClock } from './rules.js'
import { Board, glyph, pieces, squareAt, themeList, palettes } from './board.js'
import { AnalysisSession, openingBook, bookPosition, openingFor, presets, standardStart, whiteScore } from './analysis.js'
import { Review, badge as gradeBadge, updateMeter } from './review.js'
import { opponentAt, bosses } from './opponents.js'
import { Engine } from './engine.js'
import { Online } from './online.js'
import { collectionList } from './collections.js'
import { locations, locationFor, tables, lightingStyles } from './worlds/catalog.js'
import { showroom, cameras, movements, applyCollection } from './garage.js'
import { loadLadder, rankOf, rateAI, ratedOpponent, resetLadder } from './ranked-ai.js'
import { botCategories, botProfile, botRating, botRatings } from './bot-profiles.js'
import { rankEmblem } from './rank-emblem.js'
import { lessons } from './training.js'
import { playSound, roomSound, updateRoomListener } from './sound.js'
import { icon } from './icons.js'
import { annotations, visibilityDefaults, visibilityPresets, indicatorColors, lastMoveColors, moveSpeeds } from './gameplay.js'

const $ = id => document.getElementById(id)
const el = (tag, className = '', value = '') => Object.assign(document.createElement(tag), {className,textContent:value})
const read = (key,fallback) => {
  try { return JSON.parse(localStorage.getItem('evolution-' + key)) ?? fallback }
  catch { return fallback }
}
const persist = (key,value) => localStorage.setItem('evolution-' + key,JSON.stringify(value))
const defaults = {theme:'walnut',environment:'cabin',collection:'staunton',white:'ivory',black:'ebony',camera:'angled',quality:matchMedia('(pointer: coarse)').matches?'medium':'high',
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, coords:true, autoQueen:false, volume:35, fov:0, frames:0, avatar:'G', motion:'glide',effect:'gold',overrides:{},cosmetics:true,reflections:true,shadows:true,particles:true,ambient:0,textureQuality:'auto',coach:true,premoves:true,rotate:false,confirm:false,highlight:'green',modelQuality:'high',table:'auto',lighting:'natural',worldDetail:'auto',worldMotion:true,motionSpeed:'normal',motionIntensity:1,captureIntensity:1}
Object.assign(defaults,visibilityDefaults)
Object.assign(defaults,{coaching:'review',analysisMeter:true,analysisSounds:false})
Object.assign(defaults,{homeTheme:'standard',holidayMusic:false,holidayCelebrations:true,holidayLights:'slow',
  phoneSide:'right',phoneSize:'regular',phoneCase:'standard',phoneVolume:.45,phoneMuted:true,
  phoneAutopause:true,phoneShortcut:true})
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
      <div class="hero-copy">
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
      <button data-nav="Multiplayer">${icon('users')}<span>Multiplayer</span>${icon('arrow-up-right')}</button>
      <button data-nav="Puzzles">${icon('puzzle')}<span>Puzzles</span>${icon('arrow-up-right')}</button>
    </div>
    <div class="season-controls">
      <button type="button" class="secondary" id="season-theme" aria-pressed="false">Christmas menu</button>
      <button type="button" class="secondary" id="season-audio" aria-pressed="false" hidden>Festive music</button>
    </div>
  </section>
  <section id="studio-screen" aria-label="Collection showroom" hidden></section>
  <section class="main review-screen" id="review-screen" aria-label="Game review" hidden>
    <div class="page-heading"><div><h1>Game review</h1><p id="review-opening"></p></div>
      <button type="button" class="secondary" id="review-close">Exit review</button></div>
    <div class="review-layout"><section class="review-board">
      <div class="review-position"><strong id="review-position"></strong><progress id="review-progress" value="0"></progress><span id="analysis-progress" aria-live="polite"></span></div>
      <div id="review-stage"></div><div class="review-controls">
        ${button('chevron-left','Previous review move','review-prev','secondary')}
        ${button('chevron-right','Next review move','review-next','secondary')}
        <button class="secondary" id="review-play">Auto replay</button>
        <button class="secondary" id="review-flip">Flip review board</button>
        <button class="secondary" id="review-save">Save analysis</button>
        <button class="secondary" id="review-export">Export PGN</button>
      </div></section><aside id="review-details" aria-label="Analysis details"></aside>
    </div>
  </section>
  <section class="main" id="match-screen" aria-label="Match" hidden>
    <div class="page-heading">
      <div><div class="breadcrumb">Play <span>/</span> <strong id="breadcrumb">Classic Chess</strong></div>
      <h1 id="game-title">Classic Chess</h1><p id="game-subtitle">Local multiplayer</p></div>
      <div class="match-heading-actions">${button('panel-right-close','Toggle match panel','panel-toggle','icon-button')}${action('plus','New game','new-game','primary')}</div>
    </div>
    <div class="game-layout">
      <section class="game" aria-label="Chess game">
        <div id="opponent" class="player"></div>
        <div class="turn-banner" id="turn-banner" aria-live="polite"><i></i><strong></strong><span></span></div>
        <div id="match-stage"><div class="stage" id="stage" data-theme="walnut">
          <div class="stage-caption"><span></span><strong id="scene-name">Mountain Cabin</strong></div>
          <div id="fullscreen-turn" class="fullscreen-turn"></div>

          <div id="webgl" aria-label="Interactive 3D chessboard"></div>
          <div id="analysis-meter" class="analysis-meter" hidden><strong></strong></div>
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
        <div id="pocket" class="pocket" hidden></div><div class="under-board"><span id="match-meta"></span><span id="room-meta"></span>
          ${button('smartphone','Open Side Reel phone','phone-toggle','icon-button phone-toggle')}</div>
        <div class="premove-banner" id="premove-banner" hidden><span></span><button type="button" id="cancel-premove">Cancel premove</button></div>
      </section>
      <aside class="match-panel" aria-label="Match panel">
        <div class="match-header"><span class="match-icon">${icon('swords')}</span><div><h2>Match details</h2><p id="match-type">Local game</p></div></div>
        <div class="status" id="status" aria-live="polite"></div>
        <button class="secondary full" id="retry-ranked-engine" hidden>Retry opponent</button>
        <p class="last-play" id="last-play" hidden></p>
        <div id="live-coach" class="live-coach" hidden></div>
        <button class="secondary live-return" id="return-live" hidden>Return to live game</button>
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
      <aside id="match-phone" aria-label="Side Reel phone" hidden></aside>
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
let level = 12, selectedBot = 1200, matchBot = null, botTime = null, runLevel = 1, bossTheme = null, thinkTime = 450, engine, puzzle, puzzleSolved = false
let waiting = false, onlineState, onlineColor, linked = false, ping = 0, roomCode, motionKey = '', lastPly = 0
let stateAt = performance.now(), firstMove = true, noticeTimer, lastResult
let history = read('history',[])
let reviewReturn='home', analysisCoach, coachRequest, coachResult
let phone, phoneLoading, seasonalMusic
const liveGrades=new Map()
let screen='home', studioReturn='home', hasMatch=false
const previewPosition=new Chess()
let experience = read('xp',0)
let ladder=loadLadder(read('ai-ladder',null))
const localId=()=>crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16).padStart(8,'0')).join('')
const rankedTab=localId()
let rankedId=null, rankedStale=false, rankedSettling=false, enginePausedAt=null
let lesson, trainingSolved=false, premove=null, pendingSquare=null, lastCheck=''
let submittedMove=null, awaitingSnapshot=false, previousTurn=null, sessionReplaced=false
let aiFavourites=new Set(read('ai-favourites',[]).map(id=>id===30?'max':botRating(id*100)))
aiFavourites=new Set(read('ai-bot-favourites',aiFavourites))
let savePoint=read('casual-save',null)
const rankBlocked=()=> rankedSettling || (mode==='ai-ranked' || (mode==='online' && onlineState?.division && onlineColor)) && !state.result && hasMatch
async function updateLadder(update){
  const transaction=()=>{
    const stored=loadLadder(read('ai-ladder',null))
    const next=update(stored)
    if(next)persist('ai-ladder',next)
    ladder=next || stored
    return next
  }
  return navigator.locks?navigator.locks.request('chess-evolution-ai-ladder',transaction):transaction()
}
const ownsRanked=stored=>stored.active?.id===rankedId && stored.active.owner===rankedTab
function saveRanked() {
  if (mode!=='ai-ranked' || rankedStale || state.result) return
  const game=local.save(), pausedAt=enginePausedAt
  void updateLadder(stored=>ownsRanked(stored)?{...stored,active:{...stored.active,game,pausedAt}}:null)
    .catch(()=>toast('Ranked progress could not be saved in this browser'))
}
window.addEventListener('storage',event=>{
  if(event.key!=='evolution-ai-ladder')return
  ladder=loadLadder(read('ai-ladder',null))
  if(mode==='ai-ranked' && !state.result && !ownsRanked(ladder)){
    rankedStale=true
    stopEngine()
    render()
  }
})

function botInGame(){
  return matchBot || opponentAt(level)
}

function botStrength(bot){
  return bot.label ?? (typeof bot.rating==='number'?bot.rating+' Elo':'Maximum')
}

const stage = $('stage')
let board
try {
  board = new Board($('webgl'), selectSquare)
  board.dragStart = square => (canPlay() || canPremove()) &&
    viewChess().get(square)?.color === (canPlay()?turn():playerSide())
} catch (error) {
  console.warn('3D board unavailable',error)
  flat = true
}

const online = new Online(message => {
  if (message.type === 'connection') {
    linked=message.open
    sessionReplaced=Boolean(message.replaced)
    if(!linked)submittedMove=null
    if(mode==='online'){
      awaitingSnapshot=true
      render()
    }else drawStatus()
    return
  }
  if (message.type === 'pong') { ping = Math.round(performance.now()-message.stamp); drawStatus(); return }
  if (message.type === 'error') {
    if(message.action==='move'){submittedMove=null;render()}
    if(message.action==='join' && message.message==='Room not found'){
      online.room=null
      if(mode==='online' && awaitingSnapshot){onlineState=null;startLocal()}
      message.message='This room is unavailable. Ask the host for a new invite.'
    }
    if($('online-note'))$('online-note').textContent=message.message
    toast(message.message)
    waiting=false
    return
  }
  if (message.type === 'queued') {
    waiting = true
    if ($('online-note')) $('online-note').textContent = 'Looking for an opponent…'
    return
  }
  if (message.type === 'ladder') { renderLadder(message); return }
  if (message.type === 'joined') {
    const sameSeat=mode==='online' && roomCode===message.code && onlineColor===message.color
    stopCoaching(true)
    stopEngine()
    mode = 'online'
    matchBot=null
    rankedStale=false
    enginePausedAt=null
    hasMatch=true
    awaitingSnapshot=true
    sessionReplaced=false
    submittedMove=null
    roomCode = message.code
    const url = new URL(location.href)
    url.searchParams.set('room',roomCode)
    window.history.replaceState(null,'',url)
    onlineColor = message.color
    waiting = false
    if(!sameSeat){
      pendingSquare=null
      premove=null
      flipped=onlineColor==='b'
      replay=null
      selected=null
      lastResult=null
      onlineState=null
      motionKey=''
      lastPly=0
      previousTurn=null
      state=emptyRoom()
      showScreen('match')
    }
    $('dialog').close()
  }
  if(message.type==='expired'){
    onlineState=null
    startLocal()
    toast('This room expired. Create a new room to play again.')
    return
  }
  if (message.type === 'state') {
    if(mode!=='online' || message.code!==roomCode || message.seq<(onlineState?.seq ?? -1))return
    const prior=onlineState
    if (prior?.matchId && prior.matchId!==message.matchId) {
      replay = null
      selected = null
      lastResult = null
      premove=null
      pendingSquare=null
      previousTurn=null
    }
    const newMove=prior?.matchId && prior.matchId===message.matchId && message.match?.moves.length===prior.match?.moves.length+1
    if(newMove && screen==='match'){
      const last=message.match.moves.at(-1)
      sound(last.captured?105:167,last.color)
    }
    if(submittedMove!==null && (message.seq!==submittedMove || message.match?.result))submittedMove=null
    if(message.match?.result){premove=null;pendingSquare=null;selected=null}
    const divisionChanged=prior?.division!==message.division
    onlineState = message
    state=message.match || emptyRoom(message.minutes,message.increment)
    if(screen==='review' && !analysisAllowed())showScreen('match')
    if(awaitingSnapshot){motionKey=state.fen;lastPly=state.moves.length}
    awaitingSnapshot=false
    stateAt = performance.now()
    if (divisionChanged) applySettings()
    render()
    runPremove()
  }
})

function emptyRoom(minutes=defaultMinutes,increment=0) {
  return {initial:START,fen:START,variant:'standard',moves:[],minutes,increment,clocks:{w:minutes*60000,b:minutes*60000}}
}

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

function startLocal(kind = 'local',minutes = defaultMinutes,fen,variant='standard',increment=0,bot=null,restored=null) {
  if (rankBlocked()) { toast('Finish or resign your ranked match first');return false }
  const next = restored || new Match({minutes,fen,variant,increment})
  online.leave()
  stopEngine()
  stopCoaching(true)
  local = next
  mode = kind
  matchBot=bot
  rankedStale=false
  if(kind!=='ai-ranked')enginePausedAt=null
  hasMatch=true
  firstMove = kind!=='ai-ranked' && !restored
  trainingSolved=false
  premove=null
  submittedMove=null
  awaitingSnapshot=false
  sessionReplaced=false
  previousTurn=null
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
  if (versusAI()) requestMove()
  return true
}

function refreshLocal() {
  state = local.snapshot(firstMove ? local.started : enginePausedAt ?? Date.now())
  saveRanked()
  render()
}

function viewChess() {
  if (replay === null) return makeChess(state.fen,state.variant)
  return makeChess(replay === 0 ? state.initial : state.moves[replay-1].after,state.variant)
}
function turn() { return state.fen.split(' ')[1] }
function versusAI() { return ['ai','ai-ranked','survival','boss'].includes(mode) }
function playerSide() { return mode==='online'?onlineColor:versusAI()?'w':null }
function fogged() { return state.variant==='fog' && !state.result }
function moveFor(current, move) {
  return current.move({from:move.from,to:move.to,promotion:move.promotion,drop:move.drop})
}
function canPlay() {
  return screen==='match' && replay === null && !state.result && !rankedStale && !puzzleSolved && !trainingSolved &&
    (mode === 'online' ? linked && !awaitingSnapshot && submittedMove===null && onlineState?.match && turn() === onlineColor
      : !versusAI() || turn() === 'w')
}

function canPremove() {
  const side=playerSide()
  return Boolean(screen==='match' && side && settings.premoves && state.variant==='standard' &&
    !state.result && !rankedStale && replay===null && turn()!==side &&
    (mode!=='online' || linked && !awaitingSnapshot && onlineState?.match))
}

function clearSelection(){
  selected=null
  pendingSquare=null
  premove=null
  drop=null
  renderBoard()
}

function runPremove() {
  if(!canPlay())return
  if(!premove){
    if(pendingSquare){
      selected=viewChess().get(pendingSquare)?.color===turn()?pendingSquare:null
      pendingSquare=null
      renderBoard()
    }
    return
  }
  const {from,to}=premove
  premove=null
  selected=null
  const option=makeChess(state.fen,state.variant).moves({square:from,verbose:true}).find(
    move=>move.to===to && (!move.promotion || move.promotion==='q'))
  if(option) playMove(option,true)
  else {renderBoard();toast('Premove cancelled. That move is no longer legal.')}
}

function playMove(move,confirmed=false) {
  if(!canPlay())return
  if (!confirmed && settings.confirm && !rankBlocked()) {
    show('Confirm move','<p id="move-confirmation"></p>'+action('check','Play move','confirm-move','primary full'))
    $('move-confirmation').textContent=(move.from || '')+' → '+move.to
    $('confirm-move').onclick=()=>{$('dialog').close();playMove(move,true)}
    return
  }
  if (mode === 'online') {
    if(online.send({type:'move',seq:onlineState.seq,move:{from:move.from,to:move.to,promotion:move.promotion}})){
      submittedMove=onlineState.seq
      renderBoard()
      renderTurn()
    }
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
  sound(result.captured ? 105 : 167,result.color)
  stopCoaching()
  coachResult=null
  if(coachingAllowed())coachRequest={move:result,game:local}
  refreshLocal()
  if (versusAI()) requestMove()
}

function selectSquare(square) {
  if(screen==='review'){review.select(square);return}
  if (!square || screen!=='match' || state.result) return
  if (!canPlay()) {
    if(!canPremove())return
    const piece=viewChess().get(square)
    if (piece?.color===playerSide()){
      pendingSquare=pendingSquare===square?null:square
      premove=null
    }else if(pendingSquare){
      premove={from:pendingSquare,to:square}
      pendingSquare=null
    }
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
    if (selected) playSound('ui',settings.volume*.32)
  }
  renderBoard()
}

function stopEngine() { engine?.close(); engine = null }
async function requestMove() {
  if (!versusAI() || turn() !== 'b' || state.result || rankedStale || enginePausedAt!==null) return
  const search = engine ||= new Engine()
  const fen = state.fen
  let watchdog
  try {
    const request=matchBot?search.profileMove(fen,matchBot,mode==='ai-ranked'?undefined:botTime ?? undefined):
      search.move(fen,level,thinkTime,opponentAt(level).style)
    const move=mode==='ai-ranked'?await Promise.race([request,new Promise((_,reject)=>{
      watchdog=setTimeout(()=>reject(new Error('The opponent stopped responding')),10000)
    })]):await request
    if (engine !== search || !versusAI() || state.fen !== fen || state.result) return
    if(!move)throw new Error('The opponent did not return a legal move')
    if (firstMove) { local.began=local.started=Date.now(); firstMove=false }
    const played=local.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]},'b')
    sound(played.captured?105:167,played.color)
    refreshLocal()
    runPremove()
  } catch (error) {
    if(engine!==search)return
    stopEngine()
    if(local.result){refreshLocal();return}
    if(mode==='ai-ranked'){
      enginePausedAt=Date.now()
      refreshLocal()
    }else toast(error.message)
  }finally{clearTimeout(watchdog)}
}

function sound(frequency,color) {
  const material=settings[color==='w'?'white':'black'] || ''
  const kind=/glass|crystal|frost|phantom|sapphire|emerald/.test(material)?'glass':
    /gold|chrome|brass|titanium|carbon/.test(material)?'metal':/marble|stone|obsidian|ceramic/.test(material)?'stone':'wood'
  if(frequency!==105 || settings.captureSound)playSound(kind,settings.volume,frequency===105)
  roomSound(locationFor(settings.environment).id,settings.ambient)
}

function resetCamera() {
  board?.reset(screen==='home'?(settings.homeTheme==='christmas'?'holiday':'hero'):screen==='studio'?'orbit':screen==='review'?'angled':settings.camera,
    screen==='review'?Boolean(review.flipped):flipped)
}

function showScreen(next) {
  closePhotography()
  if (screen==='studio') studio.close()
  if(screen==='review' && next!=='review')review.close()
  if(screen==='match' && next!=='match')stopCoaching()
  if(next!=='match')phone?.close()
  screen=next
  for (const value of ['home','studio','match','review']) $(value+'-screen').hidden=value!==next
  $(next+'-stage').append(stage)
  document.documentElement.dataset.screen=next
  $('home-play').querySelector('span').textContent=hasMatch?'Resume match':'Play chess'
  document.querySelectorAll('.main-nav button').forEach(button=>{
    button.classList.toggle('active',next==='studio'?button.dataset.nav==='Collection':
      next==='review'?button.dataset.nav==='Analysis':next==='match' && button.dataset.nav==='Play')
  })
  board?.showBoard()
  if (board) board.preview=!['match','review'].includes(next)
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
  const seasonal=screen==='home' && settings.homeTheme==='christmas'
  if(screen==='home' && board && board.mode!==(seasonal?'holiday':'hero'))resetCamera()
  const theme=seasonal?'festive-walnut':(screen==='match' && mode==='boss' && bossTheme?.theme) || settings.theme
  const [light,dark,frame]=palettes[theme] || palettes.walnut
  stage.dataset.theme=theme
  stage.style.setProperty('--light-square',light)
  stage.style.setProperty('--dark-square',dark)
  stage.style.setProperty('--stage',frame)
  stage.classList.toggle('high-contrast',Boolean(settings.highContrast))
  stage.classList.toggle('subdued-indicators',!settings.overlayIndicators)
  stage.style.setProperty('--legal-color',indicatorColors[settings.highlight] || indicatorColors.green)
  stage.style.setProperty('--last-color',lastMoveColors[settings.lastMoveColor] || lastMoveColors.gold)
  stage.style.setProperty('--mark-opacity',settings.indicatorOpacity)
  stage.style.setProperty('--dot-size',settings.indicatorSize*25+'%')
  stage.classList.toggle('no-selection-outline',!settings.selectedOutline)
  const useFlat = !board || (['match','review'].includes(screen) && flat)
  stage.classList.toggle('is-flat',useFlat)
  stage.classList.toggle('no-coords',!settings.coords)
  const environment = seasonal?'christmas-cabin':(screen==='match' && mode==='boss' && bossTheme?.environment) || settings.environment
  $('home-screen').dataset.menu=seasonal?'christmas':'standard'
  $('season-theme').setAttribute('aria-pressed',String(seasonal))
  $('season-audio').hidden=!seasonal
  $('season-audio').setAttribute('aria-pressed',String(Boolean(settings.holidayMusic)))
  syncSeasonalMusic()
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
    board.geometryQuality=settings.quality==='low'?'low':settings.modelQuality
    board.shadows=settings.shadows
    board.reflections=settings.reflections
    board.textureQuality=settings.textureQuality
    board.particles=settings.particles
    board.holidayLights=settings.holidayLights
    board.captureEffect=settings.effect
    board.moveStyle=settings.motion
    board.motionSpeed=cosmetic?settings.motionSpeed:'instant'
    board.motionIntensity=Number(settings.motionIntensity)
    board.captureIntensity=Number(settings.captureIntensity)
    board.environmentMotion=cosmetic && settings.worldMotion
    board.roomListener=updateRoomListener
    board.lightingStyle=settings.lighting
    board.reduced = settings.reduced
    board.engraving.visible = settings.coords && screen!=='home'
    board.setViewOptions(+settings.fov,+settings.frames)
    board.setQuality(settings.quality)
    const detail=settings.worldDetail==='auto'?(settings.quality==='low'?'low':'high'):settings.worldDetail
    if(!useFlat)board.setWorld(world.id,settings.table,detail,settings.lighting)
    board.setTheme(theme,seasonal?'santa-shapes':settings.white,seasonal?'santa-shapes dark':settings.black,environment,
      seasonal?'santa-shapes':settings.collection,seasonal?{}:settings.overrides)
  }
  if(!['review','match'].includes(screen))$('analysis-meter').hidden=true
  renderBoard()
}

function renderBoard() {
  if(screen==='review'){if(review.game)review.position();return}
  if (screen!=='match' && board) {
    board.render(previewPosition,null,[],null,false)
    return
  }
  if (screen!=='match' && !board) {
    drawFlat(previewPosition,{marks:[]},null)
    return
  }
  const chess = viewChess()
  const moves = replay === null ? state.moves : state.moves.slice(0,replay)
  const visibility = fogged() ? fogVisibility(chess) : null
  const last = visibility ? null : moves.at(-1)
  const targets=new Map()
  if((selected || drop) && canPlay()){
    const legal=chess.moves({square:selected,drop,verbose:true})
    for(const move of legal){
      if(move.captured==='k')continue
      targets.set(move.to,move.captured?'capture':'move')
      if(move.landing)targets.set(move.landing,'move')
    }
  }
  const masked = visibility ? {
    board:()=>chess.board().map(row=>row.map(piece=>piece && visibility.has(piece.square) ? piece : null)),
    get:square=>visibility.has(square) ? chess.get(square) : null,
    turn:()=>chess.turn(),isCheck:()=>chess.isCheck(),fen:()=>chess.fen(),
  } : chess
  const key = chess.fen()
  const selection=selected || pendingSquare
  const guidance=annotations({chess:masked,selection,queued:premove,targets,last,settings})
  const feedback=coachingAllowed() && replay===null && coachResult
  const coachedPiece=feedback && chess.get(feedback.move.to)
  if(coachedPiece && feedback && coachedPiece.color===feedback.move.color){
    guidance.grade=feedback.grade
    guidance.gradeSquare=feedback.move.to
  }
  if(!flat)board?.render(masked,selection,[],last,replay===null && key!==motionKey && moves.length===lastPly+1,visibility,guidance,settings)
  $('premove-banner').hidden=!premove
  $('premove-banner').querySelector('span').textContent=premove?'Premove · '+premove.from+' → '+premove.to:''
  motionKey = key
  lastPly = moves.length
  renderPockets(chess)
  if (!flat) return
  drawFlat(masked,guidance,visibility)
}

function drawFlat(masked,guidance,visibility,orientation=flipped) {
  const grid = $('grid')
  const focused = grid.contains(document.activeElement) ? document.activeElement.dataset.square : null
  grid.replaceChildren()
  for (let row=0; row<8; row++) for (let col=0; col<8; col++) {
    const square = squareAt(orientation ? 7-col : col,orientation ? 7-row : row)
    const piece = masked.get(square)
    const tile = el('button','square ' + ((row+col)%2 ? 'dark-square' : 'light-square'))
    tile.dataset.square = square
    tile.setAttribute('aria-label',square + (piece ? ' ' + (piece.color === 'w' ? 'white ' : 'black ') + pieces[piece.type] : ''))
    tile.classList.toggle('fogged',Boolean(visibility && !visibility.has(square)))
    const kinds=guidance.marks.filter(([target])=>target===square).map(([,kind])=>kind)
    tile.dataset.marks=kinds.join(' ')
    tile.setAttribute('aria-pressed',String(kinds.includes('selected')))
    const details=kinds.map(kind=>({move:'Legal move',capture:'Legal capture',check:'In check',origin:'Last move origin',
      destination:'Last move destination',captured:'Capture destination',queued:'Queued premove',selected:'Selected'}[kind])).filter(Boolean)
    if(details.length)tile.setAttribute('aria-description',details.join('. '))
    tile.tabIndex = square === (focused || (orientation ? 'h1' : 'a8')) ? 0 : -1
    if (piece) tile.append(el('span','piece-icon '+piece.color,glyph[piece.type]))
    for(const kind of kinds)tile.append(el('span','flat-indicator mark-'+kind))
    if(guidance.grade && guidance.gradeSquare===square)tile.append(gradeBadge(guidance.grade))
    if (settings.coords && col === 0) tile.append(el('span','coord rank',square[1]))
    if (settings.coords && row === 7) tile.append(el('span','coord file',square[0]))
    tile.onclick = () => selectSquare(square)
    tile.onkeydown = event => {
      if (event.key==='Escape') {
        clearSelection()
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
  if(guidance.arrow){
    const coords=square=>[square.charCodeAt(0)-96.5,8.5-Number(square[1])].map(n=>orientation?8-n:n)
    const [[x1,y1],[x2,y2]]=guidance.arrow.map(coords)
    const angle=Math.atan2(y2-y1,x2-x1)
    const tail=Math.hypot(x2-x1,y2-y1)-.30
    if(tail>0){
      const arrow=el('span','flat-arrow'+(guidance.recommended?' engine-arrow':''))
      Object.assign(arrow.style,{left:x1*12.5+'%',top:y1*12.5+'%',width:tail*12.5+'%',transform:'rotate('+angle+'rad)'})
      grid.append(arrow)
    }
  }
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
  const bot=versusAI()?botInGame():null
  for (const move of fogged() ? [] : state.moves) if (move.captured) captures[move.color].push(move.captured)
  const weights = {p:1,n:3,b:3,r:5,q:9}
  for (const [id,color] of [['opponent',flipped ? 'w' : 'b'],['player',flipped ? 'b' : 'w']]) {
    const side = color === 'w' ? 'White' : 'Black'
    const person=mode==='online'?onlineState?.profiles?.[color]:null
    const own=color===playerSide()
    const isBot=bot && color==='b'
    const name=own?'You':isBot?bot.name:person?.name || side
    const rating=isBot?botStrength(bot):mode==='ai-ranked' && color==='w'?ladder.rating+' AI Elo':
      person?.rating!==undefined?person.rating+' Elo':''
    const onlineLabel=mode!=='online'?'':onlineState?.online.includes(color)?'Connected':
      onlineState?.match?'Disconnected':'Waiting to join'
    const active=!state.result && !trainingSolved && !puzzleSolved && (mode!=='online' || Boolean(onlineState?.match)) && turn()===color
    const value = list => list.reduce((sum,type)=>sum+weights[type],0)
    const advantage = value(captures[color])-value(captures[opposite(color)])
    const panel=$(id)
    panel.dataset.color=color
    panel.classList.toggle('active-player',active)
    panel.innerHTML=`<div class="avatar ${color}"></div><div class="player-info"><strong></strong><span></span></div>
      <span class="player-turn" ${active?'':'hidden'}>To move</span><div class="captures" aria-label="Captured pieces"></div>
      <div class="clock" id="clock-${color}">${icon('clock')}<span></span></div>`
    panel.querySelector('.avatar').textContent=isBot?bot.avatar:own?settings.avatar:color==='w'?'♘':'♞'
    panel.querySelector('.player-info strong').textContent=name
    panel.querySelector('.player-info>span').textContent=[side,rating,onlineLabel].filter(Boolean).join(' · ')
    const captureList=panel.querySelector('.captures')
    const counts=new Map()
    for(const piece of captures[color])counts.set(piece,(counts.get(piece) || 0)+1)
    for(const [piece,count] of counts){
      const cell=el('span','',glyph[piece]+(count>1?'×'+count:''))
      cell.title=count+' '+pieces[piece]+(count>1?'s':'')+' captured'
      captureList.append(cell)
    }
    if(advantage>0)captureList.append(el('b','material-advantage','+'+advantage))
  }
  clocks()
}

function clocks() {
  const remaining = mode === 'online' ? {...state.clocks} : local.remaining(firstMove ? local.started : enginePausedAt ?? Date.now())
  const active = !state.result && !trainingSolved && !puzzleSolved && (mode !== 'online' || onlineState?.match)
  if (active && mode === 'online') remaining[turn()] = Math.max(0,remaining[turn()] - (performance.now()-stateAt) - ping/2)
  for (const color of ['w','b']) {
    const clock = $('clock-'+color)
    if (!clock) continue
    clock.classList.toggle('running',Boolean(active && turn() === color))
    clock.classList.toggle('low-time',Boolean(!state.result && state.minutes && remaining[color] < 20000))
    clock.querySelector('span').textContent = clockText(remaining[color])
  }
}

const names = {survival:'Survival',boss:'Boss battle',local:'Local game',ai:'Casual AI','ai-ranked':'Ranked AI',training:'Training',online:'Online match',puzzle:'Tactical puzzle',sandbox:'Sandbox'}
function drawStatus() {
  const connection = $('connection')
  connection.classList.toggle('offline',mode === 'online' && !linked)
  connection.querySelector('span').textContent = mode === 'online' ?
    (sessionReplaced?'Opened in another tab':linked && !awaitingSnapshot ? 'Connected' + (ping ? ' · '+ping+' ms' : '') : 'Reconnecting') : 'Local session'
}

function renderTurn(){
  const side=playerSide()
  const color=turn()
  const colorName=color==='w'?'White':'Black'
  const status=$('turn-banner')
  const detail=status.querySelector('span')
  let label=colorName+' to move', note='', kind='waiting'
  if(state.result){
    const reason=state.result.reason
    label=reason==='Checkmate'?'Checkmate':reason==='Stalemate'?'Stalemate · Draw':state.result.winner?'Match ended':'Draw'
    note=state.result.winner?(state.result.winner==='w'?'White':'Black')+' wins · '+reason:reason==='Stalemate'?'':reason
    kind='over'
  }else if(trainingSolved || puzzleSolved){label=puzzleSolved?'Puzzle solved':'Exercise complete';kind='over'}
  else if(rankedStale){label='Match opened in another tab';note='Reload this page to resume here';kind='waiting'}
  else if(enginePausedAt!==null){label='Opponent unavailable';note='Both clocks are paused';kind='waiting'}
  else if(replay!==null){label='Reviewing position';note='Move '+replay+' of '+state.moves.length}
  else if(mode==='online' && sessionReplaced){label='Opened in another tab';note='Continue in that tab'}
  else if(mode==='online' && (!linked || awaitingSnapshot)){label='Reconnecting';note='Restoring match state'}
  else if(mode==='online' && !onlineState?.match){label='Waiting for opponent';note='Share your invite link'}
  else if(submittedMove!==null && mode==='online'){label='Sending move';note='Waiting for confirmation'}
  else if(versusAI() && color==='b'){
    const opponent=botInGame()
    label='AI thinking';note=opponent.name+' · '+botStrength(opponent);kind='thinking'
  }else if(side){
    const opponentAway=mode==='online' && !onlineState?.online.includes(opposite(side))
    label=side===color?'Your turn':"Opponent’s turn"
    note=opponentAway?'Opponent disconnected':side===color?'You play '+(side==='w'?'White':'Black'):'Waiting for opponent'
    kind=side===color?'active':'waiting'
  }else kind='active'
  const check=!state.result && (mode!=='online' || onlineState?.match) && viewChess().isCheck()
  if(check && (!awaitingSnapshot || replay!==null))note=side===color?'Your king is in check':side?'Opponent in check':colorName+' king in check'
  const headline=status.querySelector('strong')
  if(headline.textContent!==label)headline.textContent=label
  if(detail.textContent!==note)detail.textContent=note
  status.dataset.kind=kind
  $('fullscreen-turn').textContent=[label,note].filter(Boolean).join(' · ')
  status.classList.toggle('in-check',Boolean(check))
  stage.dataset.activeSide=kind==='over' || replay!==null || (mode==='online' && !onlineState?.match)?'':(color===(flipped?'b':'w')?'near':'far')
  $('return-live').hidden=replay===null
  const activeNow=kind==='active' && side===color
  phone?.update({label,ownTurn:activeNow || kind==='active' && mode==='local',key:state.fen,
    blocked:mode==='ai-ranked' && !state.result || mode==='online' && !state.result})
  if(activeNow && previousTurn && previousTurn!==color && screen==='match'){
    if(settings.turnSound)playSound('ui',settings.volume*.7)
    if(settings.turnNotices && !premove && !stage.contains(document.activeElement) && $('toast').hidden)
      toast(check?'Your turn · Your king is in check':'Your turn')
  }
  if(screen==='match' && replay===null && !state.result && (mode!=='online' || onlineState?.match))previousTurn=color
}
function render() {
  drawStatus()
  renderBoard()
  players()
  const title = mode==='training'?lesson.name:mode === 'puzzle' ? puzzle.name : mode === 'sandbox' ? 'Sandbox' : variants[state.variant] || 'Classic Chess'
  $('game-title').textContent = title
  $('breadcrumb').textContent = title
  $('game-subtitle').textContent = {local:'Local multiplayer',ai:'Casual AI · '+botInGame().name,'ai-ranked':'Ranked AI · '+rankOf(ladder.rating).name,training:lesson?.prompt,
    survival:'Survival · Round '+runLevel+' · Level '+level,
    boss:bossTheme?.label+' · Level '+level,
    online:onlineColor ? 'Online multiplayer · Playing '+(onlineColor === 'w' ? 'White' : 'Black') : 'Spectating online',
    puzzle:'Find checkmate in one move.',sandbox:'Practice from a custom position.'}[mode]
  $('match-type').textContent = onlineState?.division && mode === 'online' ? 'Ranked '+onlineState.division : names[mode]
  const status = trainingSolved?'Exercise complete':state.result ? (puzzleSolved ? 'Puzzle solved' : state.result.winner ?
    (state.result.winner === 'w' ? 'White' : 'Black') + ' wins' : 'Draw') :
    mode === 'online' && !onlineState?.match ? 'Waiting for opponent' :
      rankedStale?'Match opened in another tab':enginePausedAt!==null?'Opponent unavailable · Clock paused':
      versusAI() && turn() === 'b' ? botInGame().name+' is thinking' : (turn() === 'w' ? 'White' : 'Black') + ' to move'
  $('status').innerHTML = '<i></i><strong></strong><span></span>'
  $('status').querySelector('strong').textContent = status
  const check=!state.result && makeChess(state.fen,state.variant).isCheck()
  const notice=state.drawOffer ? 'Draw offered' : mode==='online' && onlineState?.match && onlineColor && !onlineState.online.includes(opposite(onlineColor)) ? 'Opponent disconnected' : ''
  $('status').querySelector('span').textContent = state.result?.reason || (check ? 'CHECK' : notice)
  renderTurn()
  const move=state.moves.at(-1)
  const update=$('last-play')
  update.hidden=!settings.turnNotices || !move || fogged()
  if(!update.hidden) {
    const color=move.color==='w'?'White':'Black'
    const castle=/^O-O/.test(move.san)
    update.textContent=castle?color+' castled.':color+(move.captured?
      ' captured '+pieces[move.captured].toLowerCase()+' with '+pieces[move.piece].toLowerCase()+' on ':
      ' moved '+pieces[move.piece].toLowerCase()+' to ')+(move.landing || move.to)+(move.promotion?' and promoted to '+pieces[move.promotion].toLowerCase():'')+'.'
  }
  if (check && lastCheck!==state.fen) {
    playSound('glass',settings.volume*.68,true)
    lastCheck=state.fen
  }
  $('new-game').disabled=Boolean(rankBlocked())
  $('retry-ranked-engine').hidden=enginePausedAt===null || rankedStale || Boolean(state.result)
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
  $('resign').disabled = rankedStale || ['puzzle','training'].includes(mode) || mode === 'online' && (!onlineState?.match || !onlineColor)
  $('resign').querySelector('span').textContent = state.result ? (mode==='survival' && state.result.winner==='w' && level<30 ? 'Next round' : 'Rematch') : 'Resign'
  $('resign').title = onlineState?.rematch?.length ? 'Rematch requested' : ''
  renderPanel()
  if(screen==='match'){
    showCoaching()
    runCoaching()
  }
  if (state.result && !lastResult && !['puzzle','training'].includes(mode)) {
    lastResult = state.result
    if(screen==='match' && settings.holidayCelebrations && state.result.reason==='Checkmate' &&
      (settings.theme.startsWith('festive-') || settings.environment.startsWith('christmas-')))
      board?.celebrate(state.moves.at(-1)?.to)
    if (mode==='ai-ranked') { void settleRanked();return }
    const matchId=mode==='online' ? onlineState?.matchId || roomCode+':'+onlineState?.seq : null
    recordGame(matchId,mode==='online'?onlineState?.rating?.[onlineColor]:null)
  }
}

function recordGame(matchId,change){
  if (matchId && history.some(game=>game.matchId===matchId)) return
  if (mode==='survival' && state.result.winner==='w') persist('survival-best',Math.max(runLevel,read('survival-best',0)))
  if (mode==='boss' && state.result.winner==='w') persist('bosses-won',[...new Set([...read('bosses-won',[]),level])])
  if (state.moves.length>=4) awardXP(versusAI() && state.result.winner==='w' ? 45 : 20)
  history = [{mode,level,botRating:matchBot?.rating,matchId,result:state.result,date:Date.now(),pgn:exportPgn()},...history].slice(0,100)
  persist('history',history)
  if (screen==='match' && (mode!=='online' || onlineColor)) showResult(change)
}

async function settleRanked(){
  if(rankedStale || rankedSettling)return
  rankedSettling=true
  $('new-game').disabled=true
  $('resign').disabled=true
  const id=rankedId
  const {result,duration,minutes,moves}=state
  let rated
  try{
    rated=await updateLadder(stored=>ownsRanked(stored)?rateAI(stored,id,result,Date.now(),{duration,minutes,moves:moves.length}):null)
  }catch(error){
    toast('Ranked result could not be saved. Free up browser storage and retry.')
    $('resign').querySelector('span').textContent='Retry saving result'
    $('resign').disabled=false
    return
  }finally{rankedSettling=false}
  if(mode!=='ai-ranked' || rankedId!==id)return
  render()
  if(rated)recordGame(id,rated.history[0])
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
  const scroll=content.scrollTop
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
      if(settings.coaching!=='off')content.append(hint)
      content.append(undo)
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
    const feedback=coachingAllowed() && liveGrades.get(move.after)
    if(feedback)item.append(gradeBadge(feedback.grade))
    if(move.captured)item.dataset.tactical='capture'
    if(/[+#]/.test(move.san))item.dataset.tactical=move.san.includes('#')?'mate':'check'
    if(ply===index+1)item.setAttribute('aria-current','step')
    if(move.captured)item.title='Captured '+pieces[move.captured].toLowerCase()
    item.onclick = () => seek(index+1)
    row.append(item)
    if (move.color === 'b') number++
  }
  content.append(table)
  if (replay === null) content.scrollTop = content.scrollHeight
  else content.scrollTop=scroll
}

function seek(ply) {
  if (fogged()) return
  drop = null
  replay = ply >= state.moves.length ? null : Math.max(ply,0)
  selected = null
  pendingSquare=null
  premove=null
  motionKey=viewChess().fen()
  renderBoard()
  renderPanel()
  renderTurn()
  showCoaching()
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
    ${ai ? `<div class="bot-picker">
      <div class="two-fields"><label>Difficulty category<select id="bot-category">${options([['all','All opponents'],...botCategories.map(group=>[group.name,group.name]),['favourites','Favourites'],['max','Maximum strength']],'all')}</select></label>
        <label>Difficulty<select id="level" aria-label="Difficulty"></select></label></div>
      <div class="two-fields bot-rating-inputs"><label>Elo slider<input type="range" id="bot-slider" min="0" max="3000" step="1"></label>
        <label>Opponent Elo<input type="number" id="bot-rating" min="0" max="3000" inputmode="numeric"></label></div>
      <div class="bot-tools"><button type="button" class="secondary" id="recommended-ai">Recommended difficulty</button><button type="button" class="secondary" id="favorite-ai">Favourite opponent</button></div>
      <div id="opponent-detail"></div>
      <label>Thinking time<select id="think-time">${options([['auto','By opponent'],[0,'Instant'],[150,'Fast · 150 ms'],[450,'Normal · 450 ms'],[1200,'Deep · 1.2 s'],[3000,'Extended · 3 s']],botTime ?? 'auto')}</select></label></div>` : '<label>Rules<select id="variant">'+options(Object.entries(variants),state.variant)+'</select></label><label id="start-position-field">Starting position<select id="start-position"><option value="normal">Standard opening</option><option value="custom">Custom FEN / PGN</option></select></label><label id="custom-fen" hidden>FEN or PGN<textarea id="fen" rows="4" spellcheck="false"></textarea></label>'}
    <p class="form-error" id="form-error" role="alert"></p><button class="primary full">Start game</button></form>`)
  bindClock()
  if (ai) bindBotPicker()
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
      if (ai) {
        if(!$('level').value)throw new Error('Choose an opponent')
        selectedBot=botRating($('level').value)
        botTime=$('think-time').value==='auto'?null:+$('think-time').value
      }
      const {minutes,increment}=clockOptions()
      startLocal(custom ? 'sandbox' : kind,minutes,fen,variant,increment,ai?botProfile(selectedBot):null)
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

function botCard(bot,meta=''){
  const descriptions={attack:'Attack',defence:'Defence',tactics:'Tactics',openings:'Openings',endgame:'Endgame',
    position:'Positioning',coordination:'Coordination',threats:'Threats',time:'Time management'}
  return `<div class="bot-card"><div class="bot-card-head"><span class="bot-avatar" aria-hidden="true">${bot.avatar}</span>
    <div><strong>${bot.name}</strong><small>${bot.style.title}</small></div><b>${bot.label}</b></div>
    <p>${bot.description} ${bot.maximum?'':bot.style.description}</p>
    ${meta?`<small class="bot-record">${meta}</small>`:''}
    <details><summary>Estimated skills</summary><div class="bot-skills">${Object.entries(descriptions).map(([key,label])=>
      `<div><span>${label}</span><meter min="0" max="100" value="${bot.abilities[key]}" aria-label="${label}"></meter><b>${bot.abilities[key]}/100</b></div>`).join('')}</div></details>
    </div>`
}

function bindBotPicker(){
  const category=$('bot-category'), picker=$('level'), slider=$('bot-slider'), input=$('bot-rating'), favorite=$('favorite-ai')
  const list=()=>category.value==='favourites'?[...aiFavourites].sort((a,b)=>(a==='max'?3001:a)-(b==='max'?3001:b)):
    category.value==='max'?['max']:category.value==='all'?[...new Set([...botRatings,selectedBot].filter(id=>id!=='max'))].sort((a,b)=>a-b).concat('max'):
      botRatings.filter(id=>botProfile(id).category===category.value)
  const draw=()=>{
    const ids=list()
    if(!ids.includes(selectedBot) && ids.length)selectedBot=ids[0]
    picker.innerHTML=ids.length?options(ids.map(id=>{
      const bot=botProfile(id)
      return [id,bot.label+' · '+bot.name]
    }),selectedBot):'<option value="">No favourites yet</option>'
    const maximum=selectedBot==='max'
    slider.value=maximum?3000:selectedBot
    input.value=maximum?'':selectedBot
    slider.disabled=input.disabled=category.value==='max'
    favorite.disabled=!ids.length
    favorite.setAttribute('aria-pressed',String(aiFavourites.has(selectedBot)))
    favorite.textContent=aiFavourites.has(selectedBot)?'Remove favourite':'Favourite opponent'
    if(!ids.length){
      $('opponent-detail').textContent='Save opponents to find them here.'
      return
    }
    const records=history.filter(game=>game.mode==='ai' &&
      (game.botRating ?? (game.level===30?'max':game.level*100))===selectedBot)
    const record=records.length?records.filter(game=>game.result.winner==='w').length+' W · '+
      records.filter(game=>game.result.winner==='b').length+' L · '+records.filter(game=>!game.result.winner).length+' D':''
    $('opponent-detail').innerHTML=botCard(botProfile(selectedBot),record)
  }
  const select=value=>{
    selectedBot=botRating(value)
    category.value='all'
    draw()
  }
  slider.oninput=()=>select(slider.value)
  input.onchange=()=>select(input.value)
  picker.onchange=()=>{selectedBot=botRating(picker.value);draw()}
  category.onchange=draw
  $('recommended-ai').onclick=()=>select(ladder.rating)
  favorite.onclick=()=>{
    if(aiFavourites.has(selectedBot))aiFavourites.delete(selectedBot)
    else aiFavourites.add(selectedBot)
    persist('ai-bot-favourites',[...aiFavourites])
    draw()
  }
  draw()
}

function openRankedAI(){
  if(rankBlocked()){toast('Finish or resign the ranked match first');return}
  ladder=loadLadder(read('ai-ladder',null))
  if(ladder.active){void resumeRanked();return}
  const rank=rankOf(ladder.rating)
  const displayedElo=ladder.rating
  const next=rank.next===undefined?null:rankOf(rank.next)
  const rating=ratedOpponent(ladder.rating)
  const winRate=ladder.played?Math.round(ladder.wins*100/ladder.played):0
  const stats=[['Peak Elo',ladder.best],['Matches',ladder.played],['Wins',ladder.wins],
    ['Losses',ladder.losses],['Draws',ladder.draws],['Win rate',winRate+'%']]
  show('Ranked AI',`<div class="ranked-dashboard">
    <section class="rank-summary" aria-label="Your Ranked AI standing">
      ${rankEmblem(rank)}
      <div class="rank-identity"><p>${rank.name}</p><strong id="current-ai-elo">${ladder.rating} <span>Elo</span></strong></div>
      <div class="rank-progress">
        ${next?`<div><span>Next · ${next.name}</span><span>${next.floor-ladder.rating} Elo to go</span></div>
          <progress class="rank-meter" aria-label="Progress to ${next.name}" max="${next.floor-rank.floor}" value="${ladder.rating-rank.floor}"></progress>`
        :'<span>Highest rank achieved</span>'}
      </div>
    </section>
    <div class="rank-numbers">${stats.map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
    <div class="ranked-columns">
      <section class="ranked-next" aria-label="Recommended opponent"><h3>Recommended opponent</h3>
        ${botCard(botProfile(rating))}
        <label>Time control<select id="ranked-ai-time">${options([1,2,3,5,10,15,30].map(minutes=>[minutes,minutes+' min per side']),ladder.minutes)}</select></label>
        ${action('swords','Play Ranked AI','find-ai','primary full')}
      </section>
      <section class="rank-timeline" aria-label="Rating history"><h3>Rating history</h3>
        <canvas id="rating-graph" class="rating-graph" width="660" height="190" role="img" aria-label="Ranked AI rating history"></canvas>
        <ol id="rank-log" class="rank-log"></ol>
      </section>
    </div>
    <div class="rank-footer"><small>Saved in this browser · Separate from Ranked Online</small>
      ${ladder.resetAvailable?'<button type="button" class="secondary" id="reset-ai-rating">Reset legacy progress</button>':''}</div>
    </div>`)
  const rows=ladder.history.slice(0,36).reverse()
  const trend=rows.length?[rows[0].before,...rows.map(row=>row.rating)]:[ladder.rating]
  ratingChart($('rating-graph'),trend)
  for(const row of ladder.history.slice(0,6)){
    const opponent=row.opponent ?? row.level*100
    const item=el('li','rank-history-row')
    item.append(el('span','',row.result.winner==='w'?'Victory':row.result.winner==='b'?'Defeat':'Draw'),
      el('small','',opponent+' Elo opponent'),el('strong',row.delta>0?'rating-up':row.delta<0?'rating-down':'',signed(row.delta)))
    $('rank-log').append(item)
  }
  if(!ladder.history.length)$('rank-log').append(el('li','rank-empty','Your first result will appear here.'))
  $('find-ai').onclick=async()=>{
    $('find-ai').disabled=true
    const minutes=+$('ranked-ai-time').value
    const match=new Match({minutes})
    const id=localId()
    try{
      const next=await updateLadder(stored=>{
        if(stored.active || stored.rating!==displayedElo)return null
        return {...stored,minutes,active:{id,rating,game:match.save(),owner:rankedTab}}
      })
      if(!next){openRankedAI();return}
      rankedId=id
      enginePausedAt=null
      startLocal('ai-ranked',minutes,undefined,'standard',0,botProfile(rating),match)
    }catch{
      if($('find-ai'))$('find-ai').disabled=false
      toast('Ranked progress requires storage in this browser')
    }
  }
  if($('reset-ai-rating'))$('reset-ai-rating').onclick=()=>{
    show('Reset legacy Ranked AI progress?',`<p>This one-time reset clears your previous Ranked AI rating and match stats and starts you at 0 Elo.</p>
      <div class="result-buttons"><button class="secondary" id="cancel-ai-reset">Cancel</button><button class="primary" id="confirm-ai-reset">Reset Ranked AI</button></div>`)
    $('cancel-ai-reset').onclick=openRankedAI
    $('confirm-ai-reset').onclick=async()=>{
      await updateLadder(resetLadder)
      openRankedAI()
    }
  }
}

async function resumeRanked(){
  let restored
  const next=await updateLadder(stored=>{
    if(!stored.active)return null
    try{
      restored=Match.restore(stored.active.game)
      if(restored.initial!==START || restored.variant!=='standard' || !restored.minutes)throw new Error('Invalid ranked match')
    }
    catch{return {...stored,active:null}}
    return {...stored,active:{...stored.active,owner:rankedTab}}
  })
  if(!next?.active){if(next)toast('The saved match could not be restored. Your Elo stayed the same.');return}
  rankedId=next.active.id
  enginePausedAt=next.active.pausedAt ?? null
  const legacy=Number.isInteger(next.active.level) && next.active.level>=1 && next.active.level<=30
  if(legacy){level=next.active.level;thinkTime=385}
  startLocal('ai-ranked',restored.minutes,undefined,'standard',restored.increment,legacy?null:botProfile(next.active.rating),restored)
}

function ratingChart(canvas,history) {
  const ctx=canvas.getContext('2d'),{width,height}=canvas
  const low=Math.max(0,Math.min(...history)-20),high=Math.max(...history)+20
  const left=74,right=18,top=18,bottom=22
  const yAt=value=>top+(height-top-bottom)*(1-(value-low)/(high-low))
  ctx.font='20px "DM Sans", sans-serif'
  ctx.strokeStyle='#434047'
  ctx.fillStyle='#c4afa1'
  for (const value of [low,Math.round((high+low)/2),high]){
    const y=yAt(value)
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke()
    ctx.fillText(String(value),5,y+5)
  }
  ctx.strokeStyle='#dfbb85';ctx.lineWidth=4
  ctx.beginPath()
  history.forEach((value,index)=>{
    const x=left+(width-left-right)*index/Math.max(1,history.length-1)
    const y=yAt(value)
    if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y)
    if(history.length===1)ctx.lineTo(width-right,y)
  })
  ctx.stroke()
  ctx.fillStyle='#edc991'
  ctx.beginPath();ctx.arc(width-right,yAt(history.at(-1)),5,0,Math.PI*2);ctx.fill()
}

const signed = value => (value>0?'+':'')+value

function showResult(change) {
  const final=state.result
  const perspective=mode==='online'?onlineColor:versusAI()?'w':null
  const outcome=!final.winner?'Draw':perspective?final.winner===perspective?'Victory':'Defeat':final.winner==='w'?'White wins':'Black wins'
  const duration=Math.floor((state.duration || 0)/1000)
  const opponent=versusAI()?botInGame().name+' · '+botStrength(botInGame()):mode==='online'?'Online opponent':'Local multiplayer'
  const current=mode==='ai-ranked' && change?rankOf(change.rating):null
  const promoted=current && current.index>rankOf(change.before).index
  show(outcome,`<div class="result-body ${promoted?'rank-promotion':''}">
    <div class="result-mark">${icon(final.winner?'crown':'handshake')}</div>
    <p class="result-reason" id="result-reason"></p><p class="result-opponent" id="result-opponent"></p>
    ${change?`<div class="result-elo"><span>${change.before}</span><span>→</span><strong>${change.rating}</strong><b>${signed(change.delta)} Elo</b></div>`:''}
    ${current?`<div class="result-rank">${rankEmblem(current)}<p class="${promoted?'result-promotion':''}">${promoted?'Promoted to ':current.index<rankOf(change.before).index?'Moved to ':''}${current.name}</p></div>`:''}
    <div class="result-details"><span>${state.moves.length} half-moves</span><span>${Math.floor(duration/60)}m ${duration%60}s</span></div>
    <div class="result-buttons">
      <button class="primary" id="result-repeat">${mode==='ai-ranked'?'Next ranked match':'Rematch'}</button>
      ${state.moves.length?`<button class="secondary" id="result-review">Review game</button>`:''}
      <button class="secondary" id="result-home">Return to menu</button>
      <button class="secondary" id="result-pgn">Download PGN</button>
    </div></div>`)
  $('result-reason').textContent=final.reason==='Checkmate'?'Checkmate · '+(final.winner==='w'?'White':'Black')+' wins':final.reason==='Stalemate'?'Stalemate · Draw':final.reason
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
  savePoint={game,mode,level,thinkTime,rating:matchBot?.rating,botTime}
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
    stopCoaching(true)
    local=restored
    local.started=Date.now()
    mode=saved.mode
    level=saved.level
    thinkTime=saved.thinkTime
    matchBot=saved.rating!==undefined?botProfile(saved.rating):null
    botTime=saved.botTime ?? null
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
  stopCoaching(true)
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
  show('Ranked',`<div class="list ranked-lobby"><label>Time control<select id="ranked-time">
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
  const checkbox=(id,label)=>`<label class="toggle"><input type="checkbox" data-setting="${id}" ${settings[id]?'checked':''}> ${label}</label>`
  const choice=(id,label,items)=>`<label>${label}<select data-setting="${id}">${options(Object.entries(items),settings[id])}</select></label>`
  show('Settings', `
    <details class="visibility-settings" open><summary>Gameplay visibility</summary><div class="list">
    <div class="visibility-presets" aria-label="Visibility presets">${Object.keys(visibilityPresets).map(key=>
      `<button type="button" class="secondary" data-visibility-preset="${key}">${key[0].toUpperCase()+key.slice(1)}</button>`).join('')}</div>
    <div class="two-fields">
    ${choice('highlight','Legal move colour',{green:'Green',blue:'Blue',gold:'Gold',violet:'Violet'})}
    ${choice('lastMoveColor','Last move colour',Object.fromEntries(Object.keys(lastMoveColors).map(id=>[id,id[0].toUpperCase()+id.slice(1)])))}
    <label>Indicator size<input type="range" min=".65" max="1.5" step=".01" data-setting="indicatorSize" value="${settings.indicatorSize}"></label>
    <label>Indicator opacity<input type="range" min=".35" max="1" step=".01" data-setting="indicatorOpacity" value="${settings.indicatorOpacity}"></label>
    ${choice('motionSpeed','Move animation speed',moveSpeeds)}
    ${choice('coaching','AI coaching',{review:'Post-game review only',instant:'Instant feedback',detailed:'Detailed coaching',off:'Disabled'})}
    </div>
    <div class="settings-toggles">${[
      ['showLegal','Legal move indicators'],['overlayIndicators','Emphasize indicators over effects'],
      ['selectedOutline','Selected-piece outline'],['showLastMove','Last-move highlighting'],['lastMoveArrow','Last-move arrow'],
      ['showCaptures','Capture indicators'],['showCheck','Check highlighting'],['highContrast','High contrast'],
      ['turnNotices','Turn and move notifications'],['turnSound','Your turn sound'],['captureSound','Capture sound'],
      ['coords','Board coordinates'],['reduced','Reduced motion'],['premoves','Premoves'],['coach','Move explanations'],
      ['analysisMeter','Evaluation bar'],['analysisSounds','Analysis sounds'],
    ].map(([id,label])=>checkbox(id,label)).join('')}</div></div></details>
    <details class="visibility-settings"><summary>Camera, graphics and audio</summary><div class="list"><div class="two-fields"><label>Camera<select data-setting="camera">${options(Object.entries(cameras),settings.camera)}</select></label>
    <label>Graphics<select data-setting="quality">${options([['low','Performance'],['medium','Balanced'],['high','High'],['ultra','Ultra'],['photo','Cinematic'],['custom','Custom']],settings.quality)}</select></label></div>
    <label>Model quality<select data-setting="modelQuality">${options([['high','High'],['low','Performance']],settings.modelQuality)}</select></label>
    <label>Environment detail<select data-setting="worldDetail">${options([['auto','Match graphics preset'],['low','Performance'],['high','Detailed']],settings.worldDetail)}</select></label>
    <label class="toggle"><input type="checkbox" data-setting="worldMotion" ${settings.worldMotion?'checked':''}> Environment animation</label>
    <label>Walnut textures<select data-setting="textureQuality">${options([['auto','Match preset'],['low','Standard'],['2k','2K'],['4k','4K']],settings.textureQuality)}</select></label>
    <div class="settings-toggles">${[['autoQueen','Auto queen'],['cosmetics','Animated materials'],['reflections','Reflections'],['shadows','Shadows'],['particles','Particles'],['rotate','Auto-rotate local board'],['confirm','Confirm casual moves']].map(([id,label])=>checkbox(id,label)).join('')}</div>
    <div class="two-fields"><label>Field of view<input data-setting="fov" type="range" min="-6" max="18" value="${settings.fov}"></label>
    <label>Frame rate limit<select data-setting="frames">${options([[0,'Display refresh'],[30,'30 FPS'],[60,'60 FPS'],[120,'120 FPS']],settings.frames)}</select></label></div>
    <label>Move sound volume<input data-setting="volume" type="range" min="0" max="100" value="${settings.volume}"></label>
    <label>Room ambience<input data-setting="ambient" type="range" min="0" max="100" value="${settings.ambient}"></label></div></details>
    <details class="visibility-settings"><summary>Christmas</summary><div class="list">
    ${choice('homeTheme','Main menu theme',{standard:'Original',christmas:'Christmas'})}
    ${choice('holidayLights','Christmas light pattern',{slow:'Warm twinkle',chase:'Quick twinkle',steady:'Steady'})}
    ${checkbox('holidayMusic','Festive menu music')}${checkbox('holidayCelebrations','Festive checkmate effects')}
    </div></details>`)
  bindSettings()
  for(const button of $('dialog-content').querySelectorAll('[data-visibility-preset]')){
    button.onclick=()=>{
      Object.assign(settings,visibilityPresets[button.dataset.visibilityPreset])
      persist('settings',settings)
      applySettings()
      if(screen==='match')render()
      for(const field of $('dialog-content').querySelectorAll('[data-setting]')){
        if(field.type==='checkbox')field.checked=Boolean(settings[field.dataset.setting])
        else field.value=settings[field.dataset.setting]
      }
    }
  }
}

function bindSettings() {
  $('dialog-content').querySelectorAll('[data-setting]').forEach(field=>{
    field.onchange=()=>{
      const id=field.dataset.setting
      settings[id]=field.type==='checkbox'?field.checked:field.type==='range'?Number(field.value):field.value
      persist('settings',settings)
      if (id==='camera') { flat=!board || settings.camera==='flat';resetCamera() }
      if(id==='premoves' && !settings.premoves){premove=null;pendingSquare=null}
      if(id==='coaching'){
        stopCoaching(true)
        if(screen==='review' && settings.coaching==='off')showScreen(reviewReturn)
      }
      applySettings()
      if(screen==='match')render()
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

function analysisAllowed(){
  return settings.coaching!=='off' && !rankBlocked() && !(mode==='online' && !state.result)
}

function coachingAllowed(){
  return ['instant','detailed'].includes(settings.coaching) && ['local','sandbox','ai'].includes(mode) &&
    state.variant==='standard' && !state.result
}

function stopCoaching(clear=false){
  analysisCoach?.close()
  analysisCoach=null
  coachRequest=null
  if(clear){coachResult=null;liveGrades.clear()}
}

async function runCoaching(){
  if(!coachingAllowed() || !coachRequest || analysisCoach || (versusAI() && turn()==='b'))return
  const {move,game}=coachRequest
  coachRequest=null
  const session=analysisCoach=new AnalysisSession(settings.coaching==='detailed'?presets.standard:presets.quick)
  try{
    const book=await openingBook().catch(()=>null)
    if(analysisCoach!==session || !coachingAllowed())return
    const index=state.moves.findIndex(item=>item.after===move.after)
    const theory=state.initial===standardStart && index>=0 && bookPosition(state.moves.slice(0,index+1),book).node
    const row=await session.evaluate(move,Boolean(theory))
    if(analysisCoach!==session || !row || game!==local || screen!=='match' || !coachingAllowed())return
    const fen=state.fen
    const score=fen===move.after?row.after:whiteScore(fen,(await session.search(fen))?.score)
    if(analysisCoach!==session || !coachingAllowed() || state.fen!==fen)return
    coachResult={...row,current:{fen,score}}
    liveGrades.set(move.after,row)
    if(settings.analysisSounds)playSound(row.grade==='Brilliant' || row.grade==='Great'?'glass':'ui',settings.volume*.68)
    showCoaching()
    renderBoard()
    renderPanel()
  }catch(error){
    if(analysisCoach===session)toast(error.message)
  }finally{
    session.close()
    if(analysisCoach===session)analysisCoach=null
  }
}

function showCoaching(){
  const area=$('live-coach')
  const row=coachingAllowed() && replay===null && coachResult
  area.hidden=!row
  area.replaceChildren()
  updateMeter($('analysis-meter'),row && row.current.fen===state.fen?row.current.score:null,flipped,settings.analysisMeter)
  if(!row)return
  const title=el('strong','',''+row.move.san+' · '+row.grade)
  area.append(gradeBadge(row.grade),title)
  if(settings.coaching==='detailed'){
    area.append(el('p','',row.explanation))
    if(row.best){
      const alternate=el('button','secondary','Explore '+row.best)
      alternate.onclick=()=>{
        const sessionGame={initial:row.move.before,moves:[],pgn:new Chess(row.move.before).pgn(),variant:'standard'}
        openAnalysis(sessionGame,{rows:[],startScore:row.before,positionCandidates:row.candidates,preset:'standard'})
      }
      area.append(alternate)
    }
  }
}

function snapshotFrom(text,isFen=false){
  const chess=isFen?new Chess(text):new Chess()
  if(!isFen)chess.loadPgn(text)
  const moves=chess.history({verbose:true})
  return {variant:'standard',initial:moves[0]?.before || chess.fen(),moves,pgn:chess.pgn()}
}

const review=new Review($('review-screen'),{
  exportGame:download,
  saveReview:record=>{
    const recent=read('reviews',[]).filter(item=>item.game.initial!==record.game.initial ||
      item.game.pgn!==record.game.pgn || JSON.stringify(item.options)!==JSON.stringify(record.options))
    try{
      const newest=[record,...recent].slice(0,8)
      while(newest.length>1 && JSON.stringify(newest).length>1_300_000)newest.pop()
      persist('reviews',newest)
      toast('Analysis saved in this browser')
    }catch{toast('Browser storage is full')}
  },
  showPosition:({chess,flipped:orientation,score,marks,arrow,grade,square,selected})=>{
    if(screen!=='review' || !analysisAllowed())return
    const guidance={marks,arrow,recommended:true,grade,gradeSquare:square}
    if(board && !flat){
      if(board.reviewFlipped!==orientation){
        board.reviewFlipped=orientation
        resetCamera()
      }
      board.render(chess,selected || arrow?.[0],[],null,false,null,guidance,settings)
    }else drawFlat(chess,guidance,null,orientation)
    updateMeter($('analysis-meter'),score,orientation,settings.analysisMeter)
  },
})

$('review-close').onclick=()=>{showScreen(reviewReturn);render()}

function openAnalysisLibrary() {
  if(settings.coaching==='off'){toast('Enable AI analysis in Settings to review a game');return}
  if(!analysisAllowed()){toast('Analysis is available after the match finishes');return}
  show('Analysis',`<form id="review-import" class="list"><label>FEN or PGN<textarea id="review-input" rows="4" placeholder="Paste a FEN position or PGN game"></textarea></label>
    <div class="two-fields"><button class="secondary" type="submit" value="fen">Analyse FEN</button><button class="primary" type="submit" value="pgn">Analyse PGN</button></div><p id="review-import-error" role="alert"></p></form>
    <h3>Saved analysis</h3><div id="review-saved" class="list"></div>
    <h3>Recent games</h3><div id="review-games" class="list"></div>`)
  $('review-import').onsubmit=event=>{
    event.preventDefault()
    const input=$('review-input').value.trim()
    if(!input){$('review-import-error').textContent='Paste a position or game first.';return}
    try {
      const snapshot=snapshotFrom(input,event.submitter?.value==='fen')
      if(event.submitter?.value!=='fen' && !snapshot.moves.length && !/^\s*\[FEN /m.test(input))throw Error('No valid moves or starting position found.')
      openAnalysis(snapshot)
    }catch(error){$('review-import-error').textContent=error.message}
  }
  const saved=$('review-saved')
  for(const record of read('reviews',[])){
    const label=new Date(record.date).toLocaleDateString()+' · '+record.game.moves.length+' plies'
    const item=el('button','secondary',label)
    item.onclick=()=>openAnalysis(record.game,record)
    saved.append(item)
  }
  if(!saved.childElementCount)saved.append(el('p','','Saved reviews appear here.'))
  const list=$('review-games')
  for(const game of history.slice(0,20)){
    try{
      const snapshot=snapshotFrom(game.pgn)
      if(!snapshot.moves.length)continue
      const item=el('button','secondary',new Date(game.date).toLocaleDateString()+' · '+game.result.reason)
      item.onclick=()=>openAnalysis(snapshot)
      list.append(item)
    }catch{}
  }
  if(!list.childElementCount)list.append(el('p','','Finished games appear here.'))
}

function openAnalysis(snapshot=state,record) {
  if(settings.coaching==='off'){toast('Enable AI analysis in Settings to review a game');return}
  if(!analysisAllowed() || !['standard','fog'].includes(snapshot.variant))return
  const game={variant:snapshot.variant,initial:snapshot.initial,moves:snapshot.moves.slice(),pgn:snapshot.pgn || exportPgn()}
  if(screen!=='review')reviewReturn=screen==='match'?'match':'home'
  $('dialog').close()
  showScreen('review')
  review.open(game,record)
}

function stats() {
  show('Statistics','<div id="stats" class="list"></div>')
  const container = $('stats')
  const profileLevel = 1+Math.floor(experience/120)
  container.append(el('p','','Level '+profileLevel+' · '+experience+' XP'))
  container.append(el('p','','Ranked AI · '+rankOf(ladder.rating).name+' · '+ladder.rating+' Elo'))
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
  if (waiting && mode !== 'online') { online.leave(); waiting = false }
})
$('mobile-menu').onclick = () => $('rail').classList.toggle('opened')
$('new-game').onclick = () => setup()
$('home-link').onclick=()=>showScreen('home')
$('season-theme').onclick=()=>{
  settings.homeTheme=settings.homeTheme==='christmas'?'standard':'christmas'
  persist('settings',settings)
  applySettings()
}
$('season-audio').onclick=()=>{
  settings.holidayMusic=!settings.holidayMusic
  persist('settings',settings)
  applySettings()
}
function syncSeasonalMusic(){
  if(screen!=='home' || settings.homeTheme!=='christmas' || !settings.holidayMusic || document.hidden){
    seasonalMusic?.pause()
    return
  }
  if(!seasonalMusic){
    seasonalMusic=new Audio('/side-reel/noel.mp3')
    seasonalMusic.loop=true
    seasonalMusic.volume=.23
  }
  if(seasonalMusic.paused)seasonalMusic.play().catch(()=>{})
}
document.addEventListener('visibilitychange',syncSeasonalMusic)
$('home-screen').addEventListener('pointerdown',()=>{if(!settings.holidayMusic)return;syncSeasonalMusic()})
async function togglePhone(){
  if(screen!=='match')return
  try{
    if(!phone){
      phoneLoading ||= import('./phone.js').then(({createPhone})=>{
        phone=createPhone($('match-phone'),settings,()=>persist('settings',settings))
      })
      await phoneLoading
    }
    if(screen!=='match')return
    renderTurn()
    phone.toggle()
  }catch{
    phoneLoading=null
    toast('Side Reel could not open')
  }
}
$('phone-toggle').setAttribute('aria-pressed','false')
$('phone-toggle').onclick=togglePhone
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
$('flip').onclick = () => {
  if(screen==='review'){review.flipped=!review.flipped;review.position();return}
  flipped=!flipped
  resetCamera()
  render()
}
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
$('return-live').onclick=$('last').onclick
$('cancel-premove').onclick=clearSelection
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
  if(rankedStale || rankedSettling)return
  if (state.result) {
    if (mode==='ai-ranked') {
      if(ownsRanked(ladder))void settleRanked()
      else openRankedAI()
      return
    }
    if (mode === 'online') { online.send({type:'rematch'}); toast('Rematch requested'); return }
    if (mode==='survival') {
      runLevel = state.result.winner==='w' && level<30 ? runLevel+1 : 1
      level = Math.min(30,runLevel*2-1)
    }
    startLocal(mode,state.minutes,state.variant==='chess960'?undefined:state.initial,state.variant,state.increment,matchBot)
    return
  }
  show('Resign game','<p>Resigning awards the game to the other player.</p>'+action('flag','Confirm resignation','confirm-resign','primary full'))
  $('confirm-resign').onclick = () => {
    $('dialog').close()
    if(rankedStale)return
    if (mode === 'online') return online.send({type:'resign'})
    stopEngine()
    local.finish(versusAI() ? 'b' : opposite(turn()),'Resignation',enginePausedAt ?? Date.now())
    refreshLocal()
  }
}
$('retry-ranked-engine').onclick=()=>{
  if(enginePausedAt===null || rankedStale || state.result)return
  const pause=Date.now()-enginePausedAt
  local.started+=pause
  local.began+=pause
  enginePausedAt=null
  refreshLocal()
  void requestMove()
}
document.addEventListener('keydown',event => {
  if ($('dialog').open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return
  if(screen==='match' && settings.phoneShortcut && event.key.toLowerCase()==='p' && !event.ctrlKey && !event.metaKey){
    event.preventDefault()
    togglePhone()
    return
  }
  if($('grid').contains(event.target) || event.target.closest?.('#match-phone'))return
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
  if(screen==='review'){
    if(event.key==='Escape')$('review-close').click()
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();review.step(event.key==='ArrowLeft'?-1:1)}
    return
  }
  if(screen!=='match') return
  if(event.key==='Escape'){clearSelection();return}
  const target = {v:'view-mode',f:'flip',r:'reset-camera',ArrowLeft:'prev',ArrowRight:'next'}[event.key]
  if (target) { event.preventDefault(); $(target).click() }
})
setInterval(() => {
  if (mode !== 'online' && !firstMove && !state.result && !rankedStale && enginePausedAt===null) {
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
showScreen(matchLink?'match':'home')
render()
if (ladder.active?.game && !new URL(location.href).searchParams.has('room')) void resumeRanked()
const invite = new URL(location.href).searchParams.get('room')?.toUpperCase()
if (/^[A-F0-9]{6}$/.test(invite || '')) online.join(invite)
