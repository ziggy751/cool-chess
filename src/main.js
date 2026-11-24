import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/instrument-serif/latin-400.css'
import './style.css'
import { Chess } from 'chess.js'
import { makeChess, variants, fogVisibility } from './variants.js'
import { Match, START, TIMES, opposite } from './rules.js'
import { Board, glyph, pieces, squareAt, themeList, finishList } from './board.js'
import { analyzeGame, accuracy, openingFor } from './analysis.js'
import { opponentAt, bosses } from './opponents.js'
import { Engine } from './engine.js'
import { Online } from './online.js'
import { collectionList } from './collections.js'
import { environments } from './environments.js'
import { icon } from './icons.js'

const $ = id => document.getElementById(id)
const el = (tag, className = '', value = '') => Object.assign(document.createElement(tag), {className,textContent:value})
const read = (key,fallback) => {
  try { return JSON.parse(localStorage.getItem('evolution-' + key)) ?? fallback }
  catch { return fallback }
}
const persist = (key,value) => localStorage.setItem('evolution-' + key,JSON.stringify(value))
const defaults = {theme:'walnut',environment:'walnut',collection:'staunton',white:'ivory',black:'ebony',camera:'angled',quality:'high',
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, coords:true, autoQueen:false, volume:35, fov:0, frames:0, avatar:'G'}
const settings = {...defaults,...read('settings',{})}
const button = (name, label, id, style = '') => '<button type="button" class="' + style + '" id="' + id + '" aria-label="' + label + '" title="' + label + '">' + icon(name) + '</button>'
const action = (name,label,id,style = '') => '<button type="button" class="' + style + '" id="' + id + '">' + icon(name) + '<span>' + label + '</span></button>'

const nav = [['Play','gamepad-2'],['Multiplayer','users'],['Ranked','crown'],['AI opponents','bot'],['Puzzles','puzzle'],['Challenges','flag'],
  ['Collection','layers'],['Statistics','chart-no-axes-column-increasing']]
$('app').innerHTML = `
<header class="topbar">
  <a href="./" class="brand"><span class="brand-icon">♞</span><span>Chess Evolution<span class="brand-3d">3D</span></span></a>
  <button class="mobile-menu" id="mobile-menu" aria-label="Toggle navigation">${icon('menu')}</button>
  <div class="top-actions"><button class="server-state" id="connection" aria-label="Multiplayer connection"><i></i><span>Local session</span></button>
  <span class="top-divider"></span><button class="top-profile" id="profile"><span class="profile-avatar">G</span><span>Guest</span>${icon('chevron-down')}</button></div>
</header>
<div class="layout">
  <aside class="rail" id="rail" aria-label="Main navigation">
    <div class="nav-label">PLAY & EXPLORE</div>
    <nav>${nav.map(([label,glyph],index)=>`<button data-nav="${label}" aria-label="${label}" class="${index === 0 ? 'active' : ''}">${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>
    <div class="rail-bottom">
      <button data-nav="Settings" aria-label="Settings">${icon('settings')}<span>Settings</span></button>
      <button data-nav="Controls" aria-label="Controls">${icon('circle-help')}<span>Controls</span></button>
    </div>
  </aside>
  <main class="main">
    <div class="page-heading">
      <div><div class="breadcrumb">Play <span>/</span> <strong id="breadcrumb">Classic Chess</strong></div>
      <h1 id="game-title">Classic Chess</h1><p id="game-subtitle">Local multiplayer</p></div>
      ${action('plus','New game','new-game','primary')}
    </div>
    <div class="game-layout">
      <section class="game" aria-label="Chess game">
        <div id="opponent" class="player"></div>
        <div class="stage" id="stage" data-theme="walnut">
          <div class="stage-caption"><span></span><strong id="scene-name">Walnut club</strong></div>
          <div id="weather" aria-hidden="true"></div>
          <div id="webgl" aria-label="Interactive 3D chessboard"></div>
          <div id="flat" class="flat" hidden><div id="grid" role="group" aria-label="Chessboard"></div></div>
          <div class="view-controls" aria-label="Board controls">
            ${button('box','Switch between 2D and 3D','view-mode','view-button')}
            ${button('flip-vertical-2','Flip board','flip','view-button')}
            ${button('rotate-ccw','Reset camera','reset-camera','view-button')}
            ${button('maximize','Fullscreen board','fullscreen','view-button')}
          </div>
        </div>
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
  </main>
</div>
<dialog id="dialog"><div id="dialog-content"></div></dialog>
<div id="toast" role="status" hidden></div>
`

const defaultMinutes = 10
let local = new Match({minutes:defaultMinutes})
let state = local.snapshot()
let mode = 'local', selected = null, drop = null, flipped = false, flat = false, replay = null, tab = 'moves'
let level = 12, runLevel = 1, bossTheme = null, thinkTime = 450, engine, puzzle, puzzleSolved = false
let waiting = false, onlineState, onlineColor, linked = false, ping = 0, roomCode, motionKey = '', lastPly = 0
let stateAt = performance.now(), firstMove = true, noticeTimer, lastResult, preset = read('presets',[])
let history = read('history',[])
let inspector, cancelAnalysis
let experience = read('xp',0)

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
    applySettings()
    roomCode = message.code
    const url = new URL(location.href)
    url.searchParams.set('room',roomCode)
    window.history.replaceState(null,'',url)
    onlineColor = message.color
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
    onlineState = message
    state = message.match || {initial:START, fen:START, moves:[], minutes:message.minutes,
      clocks:{w:message.minutes*60000,b:message.minutes*60000}}
    stateAt = performance.now()
    render()
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

function startLocal(kind = 'local',minutes = defaultMinutes,fen,variant='standard') {
  const next = new Match({minutes,fen,variant})
  online.leave()
  stopEngine()
  local = next
  mode = kind
  firstMove = true
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
  applySettings()
  refreshLocal()
  if (versusAI()) requestMove()
}

function refreshLocal() {
  state = local.snapshot(firstMove ? local.started : Date.now())
  render()
}

function viewChess() {
  if (replay === null) return makeChess(state.fen,state.variant)
  return makeChess(replay === 0 ? state.initial : state.moves[replay-1].after,state.variant)
}
function turn() { return state.fen.split(' ')[1] }
function versusAI() { return ['ai','survival','boss'].includes(mode) }
function fogged() { return state.variant==='fog' && !state.result }
function moveFor(current, move) {
  return current.move({from:move.from,to:move.to,promotion:move.promotion,drop:move.drop})
}
function canPlay() {
  return replay === null && !state.result && !puzzleSolved &&
    (mode === 'online' ? linked && onlineState?.match && turn() === onlineColor
      : !versusAI() || turn() === 'w')
}

function playMove(move) {
  if (mode === 'online') {
    online.send({type:'move',seq:onlineState.seq,move})
    return
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
  if (firstMove) { local.started = Date.now(); firstMove = false }
  const result = local.move(move)
  if (fogged()) {
    flipped = local.chess.turn() === 'b'
    resetCamera()
  }
  sound(result.captured ? 105 : 167)
  refreshLocal()
  if (versusAI()) requestMove()
}

function selectSquare(square) {
  if (!canPlay() || !square) return
  const chess = viewChess()
  if (drop) {
    const move = chess.moves({drop,verbose:true}).find(candidate=>candidate.to===square)
    drop = null
    if (move) playMove(move)
    else renderBoard()
    return
  }
  const moves = selected ? chess.moves({square:selected,verbose:true}).filter(candidate=>candidate.to===square || candidate.landing===square) : []
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
      show('Choose promotion','<div class="promotion" id="promotion"></div>')
      for (const move of choices) {
        const choice = el('button','',glyph[move.promotion] + ' ' + pieces[move.promotion])
        choice.onclick = () => { $('dialog').close(); playMove({from,to:square,promotion:move.promotion}) }
        $('promotion').append(choice)
      }
    } else playMove({...choices[0],promotion:choices[0].promotion ? 'q' : undefined})
  } else selected = chess.get(square)?.color === chess.turn() && selected !== square ? square : null
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
    if (firstMove) { local.started = Date.now(); firstMove = false }
    local.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]},'b')
    sound(154)
    refreshLocal()
  } catch (error) {
    if (engine === search && !local.result) toast(error.message)
  }
}

let audio
function sound(frequency) {
  if (!settings.volume) return
  try {
    audio ||= new AudioContext()
    if (audio.state === 'suspended') audio.resume()
    const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency,now)
    oscillator.frequency.exponentialRampToValueAtTime(45,now+.07)
    gain.gain.setValueAtTime(settings.volume*.0014,now)
    gain.gain.exponentialRampToValueAtTime(.001,now+.09)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(now)
    oscillator.stop(now+.10)
  } catch {}
}

function resetCamera() { board?.reset(settings.camera,flipped) }
function applySettings() {
  stage.dataset.theme = settings.theme
  stage.classList.toggle('is-flat',flat)
  stage.classList.toggle('no-coords',!settings.coords)
  const environment = (mode==='boss' && bossTheme?.environment) || settings.environment
  const [name,image,,weather] = environments[environment] || environments.walnut
  $('scene-name').textContent = name
  const weatherLayer = $('weather')
  if (weatherLayer.dataset.kind !== (weather || '')) {
    weatherLayer.dataset.kind = weather || ''
    weatherLayer.replaceChildren()
    for (let i=0;weather && i<22;i++) {
      const particle = el('i')
      particle.style.cssText = '--x:'+(i*19%100)+'%;--y:'+(i*7%31)+'%;--delay:-'+(i*.317)+'s;--speed:'+(1+i%6*.42)+'s'
      weatherLayer.append(particle)
    }
  }
  stage.style.setProperty('--backdrop', "url('/" + image + ".webp')")
  $('webgl').hidden = flat
  $('flat').hidden = !flat
  $('profile').querySelector('.profile-avatar').textContent = settings.avatar
  $('view-mode').innerHTML = icon(flat ? 'grid-2x2' : 'box')
  document.documentElement.classList.toggle('reduce-motion',settings.reduced)
  if (board) {
    board.reduced = settings.reduced
    board.engraving.visible = settings.coords
    board.setViewOptions(+settings.fov,+settings.frames)
    board.setQuality(settings.quality)
    board.setTheme((mode==='boss' && bossTheme?.theme) || settings.theme,settings.white,settings.black,environment,settings.collection)
  }
  renderBoard()
}

function renderBoard() {
  const chess = viewChess()
  const moves = replay === null ? state.moves : state.moves.slice(0,replay)
  const visibility = fogged() ? fogVisibility(chess) : null
  const last = visibility ? null : moves.at(-1)
  const legal = (selected || drop) && canPlay() ? chess.moves({square:selected,drop,verbose:true}).flatMap(move=>move.landing ? [move.to,move.landing] : [move.to]) : []
  const masked = visibility ? {
    board:()=>chess.board().map(row=>row.map(piece=>piece && visibility.has(piece.square) ? piece : null)),
    get:square=>visibility.has(square) ? chess.get(square) : null,
    turn:()=>chess.turn(),isCheck:()=>chess.isCheck(),
  } : chess
  const key = chess.fen()
  board?.render(masked,selected,legal,last,key !== motionKey && moves.length === lastPly+1,visibility)
  motionKey = key
  lastPly = moves.length
  renderPockets(chess)
  if (!flat) return
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
    tile.classList.toggle('selected',square === selected)
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
  for (const move of fogged() ? [] : state.moves) if (move.captured) captures[move.color].push(move.captured)
  const weights = {p:1,n:3,b:3,r:5,q:9}
  for (const [id,color] of [['opponent',flipped ? 'w' : 'b'],['player',flipped ? 'b' : 'w']]) {
    const side = color === 'w' ? 'White' : 'Black'
    const name = versusAI() && color === 'b' ? opponentAt(level).name : mode === 'online' && color === onlineColor ? 'You' : side
    const sub = versusAI() && color === 'b' ? 'Level ' + level : mode === 'online' && !onlineState?.online.includes(color) ? 'Away' : side + ' pieces'
    const value = list => list.reduce((sum,type)=>sum+weights[type],0)
    const advantage = value(captures[color])-value(captures[opposite(color)])
    $(id).innerHTML = `<div class="avatar ${color}">${color === 'w' ? '♘' : '♞'}</div><div class="player-info"><strong>${name}</strong><span>${sub}</span></div>
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

const names = {survival:'Survival',boss:'Boss battle',local:'Local game',ai:'Play against AI',online:'Online match',puzzle:'Tactical puzzle',sandbox:'Sandbox'}
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
  const title = mode === 'puzzle' ? puzzle.name : mode === 'sandbox' ? 'Sandbox' : variants[state.variant] || 'Classic Chess'
  $('game-title').textContent = title
  $('breadcrumb').textContent = title
  $('game-subtitle').textContent = {local:'Local multiplayer',ai:'Stockfish · Level '+level,
    survival:'Survival · Round '+runLevel+' · Level '+level,
    boss:bossTheme?.label+' · Level '+level,
    online:onlineColor ? 'Online multiplayer · Playing '+(onlineColor === 'w' ? 'White' : 'Black') : 'Spectating online',
    puzzle:'Find checkmate in one move.',sandbox:'Practice from a custom position.'}[mode]
  $('match-type').textContent = onlineState?.division && mode === 'online' ? 'Ranked '+onlineState.division : names[mode]
  const status = state.result ? (puzzleSolved ? 'Puzzle solved' : state.result.winner ?
    (state.result.winner === 'w' ? 'White' : 'Black') + ' wins' : 'Draw') :
    mode === 'online' && !onlineState?.match ? 'Waiting for opponent' :
      versusAI() && turn() === 'b' ? opponentAt(level).name+' is thinking' : (turn() === 'w' ? 'White' : 'Black') + ' to move'
  $('status').innerHTML = '<i></i><strong></strong><span></span>'
  $('status').querySelector('strong').textContent = status
  $('status').querySelector('span').textContent = state.result?.reason || (viewChess().isCheck() ? 'Check' : '')
  const checks = viewChess().remainingChecks?.()
  const rule = checks ? (3-checks.white)+' White checks · '+(3-checks.black)+' Black checks' :
    mode==='puzzle'?'Mate in one':variants[state.variant] || 'Standard rules'
  $('match-meta').textContent = (state.minutes ? state.minutes + ' min' : 'Untimed') + ' · ' + rule
  $('room-meta').replaceChildren()
  if (roomCode) {
    const share = el('button','','Copy invite · '+roomCode)
    share.onclick = () => copyInvite()
    $('room-meta').append(share)
  }
  $('draw').disabled = Boolean(state.result || !['local','online'].includes(mode) || (mode === 'online' && (!onlineState?.match || !onlineColor)))
  $('draw').querySelector('span').textContent = mode === 'online' && state.drawOffer === opposite(onlineColor) ? 'Accept draw' : 'Offer draw'
  $('resign').disabled = mode === 'puzzle' || mode === 'online' && (!onlineState?.match || !onlineColor)
  $('resign').querySelector('span').textContent = state.result ? (mode==='survival' && state.result.winner==='w' && level<30 ? 'Next round' : 'Rematch') : 'Resign'
  $('resign').title = onlineState?.rematch?.length ? 'Rematch requested' : ''
  renderPanel()
  if (state.result && !lastResult && mode !== 'puzzle') {
    lastResult = state.result
    const matchId = mode==='online' ? roomCode+':'+onlineState?.seq : null
    if (matchId && history.some(game=>game.matchId===matchId)) return
    if (mode==='survival' && state.result.winner==='w') persist('survival-best',Math.max(runLevel,read('survival-best',0)))
    if (mode==='boss' && state.result.winner==='w') persist('bosses-won',[...new Set([...read('bosses-won',[]),level])])
    if (state.moves.length>=4) awardXP(versusAI() && state.result.winner==='w' ? 45 : 20)
    history = [{mode,level,matchId,result:state.result,date:Date.now(),pgn:exportPgn()},...history].slice(0,100)
    persist('history',history)
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
      analyze.onclick = openAnalysis
      content.append(analyze)
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
const timeControl = (value=10) => '<label>Time control<select id="time-control">'+options(TIMES.map(time=>[time,time ? time+' minutes' : 'Untimed']),value)+'</select></label>'
function show(title,body) {
  const dialog = $('dialog')
  inspector?.close()
  inspector = null
  cancelAnalysis?.()
  cancelAnalysis = null
  $('dialog-content').innerHTML = '<div class="dialog-head"><h2></h2>'+button('x','Close','close-dialog')+'</div>'+body
  $('dialog-content').querySelector('h2').textContent = title
  $('close-dialog').onclick = () => dialog.close()
  if (!dialog.open) dialog.showModal()
}

function setup(kind='local') {
  const ai = kind === 'ai'
  show(ai ? 'AI opponents' : 'New game', `
    ${!ai ? '<div class="mode-picker">'+action('users','Local','choose-local','secondary')+action('bot','AI','choose-ai','secondary')+action('wifi','Online','choose-online','secondary')+'</div>' : ''}
    <form id="start-form">
    ${timeControl(state.minutes || defaultMinutes)}
    ${ai ? '<label>Difficulty<select id="level">'+options(Array.from({length:30},(_,i)=>[i+1,'Level '+(i+1)+' · '+opponentAt(i+1).name]),level)+'</select></label><p id="opponent-detail"></p><label>Thinking time<select id="think-time">'+options([[150,'Fast · 150 ms'],[450,'Normal · 450 ms'],[1200,'Deep · 1.2 s'],[3000,'Extended · 3 s']],thinkTime)+'</select></label>' : '<label>Rules<select id="variant">'+options(Object.entries(variants),state.variant)+'</select></label><label id="start-position-field">Starting position<select id="start-position"><option value="normal">Standard opening</option><option value="custom">Custom FEN / PGN</option></select></label><label id="custom-fen" hidden>FEN or PGN<textarea id="fen" rows="4" spellcheck="false"></textarea></label>'}
    <p class="form-error" id="form-error" role="alert"></p><button class="primary full">Start game</button></form>`)
  if (ai) {
    const choose = () => {
      const opponent = opponentAt(+$('level').value)
      const wins = history.filter(game=>game.mode==='ai' && game.level===+$('level').value && game.result.winner==='w').length
      $('opponent-detail').textContent = opponent.title+' · '+opponent.description+' Wins: '+wins
    }
    $('level').onchange = choose
    choose()
  }
  if (!ai) {
    $('choose-local').onclick = () => setup()
    $('choose-ai').onclick = () => setup('ai')
    $('choose-online').onclick = openOnline
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
      startLocal(custom ? 'sandbox' : kind,+$('time-control').value,fen,variant)
    } catch (error) { $('form-error').textContent = error.message }
  }
}

function openRanked() {
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
  show('Multiplayer', `<div class="online-controls">
    <h3>Create a private match</h3><div class="two-fields">${timeControl()}<label>Play as<select id="seat"><option value="random">Random</option><option value="w">White</option><option value="b">Black</option></select></label></div>
    <div class="two-fields">${action('plus','Create room','create','primary')}${action('users','Find opponent','queue','secondary')}</div>
    <form id="join-form"><h3>Join a room</h3><label>Room code<input autocomplete="off" id="code" placeholder="6-character code" pattern="[a-fA-F0-9]{6}" maxlength="6" required></label>
    <div class="two-fields"><button class="secondary">Join match</button>${action('wifi','Spectate','spectate','secondary')}</div></form>
    <p id="online-note" aria-live="polite"></p></div>`)
  $('create').onclick = () => online.send({type:'create',minutes:+$('time-control').value,color:$('seat').value},true)
  $('queue').onclick = () => {
    waiting = true
    $('online-note').textContent = 'Connecting…'
    online.send({type:'queue',minutes:+$('time-control').value},true)
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
    ${action('puzzle','Daily puzzle','daily','secondary')}
    ${action('swords','Start survival','survival','primary')}
    <p>Best survival round: ${read('survival-best',0)}</p>
    <h3>Boss battles</h3><div class="list" id="boss-list"></div></div>`)
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

function settingsDialog(collection=false) {
  show(collection ? 'Collection' : 'Settings',collection ? `
    <div class="list"><label>Environment<select data-setting="environment">${options(Object.entries(environments).map(([key,[label]])=>[key,label]),settings.environment)}</select></label><label>Board style<select data-setting="theme">${options(Object.entries(themeList),settings.theme)}</select></label>
    <label>Piece collection<select data-setting="collection">${options(Object.entries(collectionList),settings.collection)}</select></label><div class="two-fields"><label>White finish<select data-setting="white">${options(finishList.map(f=>[f,f]),settings.white)}</select></label>
    <label>Black finish<select data-setting="black">${options(finishList.map(f=>[f,f]),settings.black)}</select></label></div>
    <div class="two-fields"><label>Preset name<input id="preset-name" maxlength="32" placeholder="Walnut and gold"></label><button id="save-preset" class="secondary">Save preset</button></div>
    <div id="presets" class="list"></div>${board ? action('box','Inspect pieces','inspect','secondary') : ''}</div>` : `
    <div class="list"><div class="two-fields"><label>Camera<select data-setting="camera">${options([['angled','Angled'],['low','Cinematic'],['orbit','Free orbit'],['overhead','Overhead'],['close','Close-up'],['showcase','Showcase']],settings.camera)}</select></label>
    <label>Graphics<select data-setting="quality">${options([['low','Low'],['medium','Medium'],['high','High'],['ultra','Ultra'],['photo','Photorealistic']],settings.quality)}</select></label></div>
    <label class="toggle"><input type="checkbox" data-setting="coords" ${settings.coords?'checked':''}> Board coordinates</label>
    <label class="toggle"><input type="checkbox" data-setting="reduced" ${settings.reduced?'checked':''}> Reduced motion</label>
    <label class="toggle"><input type="checkbox" data-setting="autoQueen" ${settings.autoQueen?'checked':''}> Promote to queen automatically</label>
    <label>Field of view<input data-setting="fov" type="range" min="-6" max="18" value="${settings.fov}"></label>
    <label>Frame rate limit<select data-setting="frames">${options([[0,'Display refresh'],[30,'30 FPS'],[60,'60 FPS'],[120,'120 FPS']],settings.frames)}</select></label>
    <label>Move sound volume<input data-setting="volume" type="range" min="0" max="100" value="${settings.volume}"></label></div>`)
  $('dialog-content').querySelectorAll('[data-setting]').forEach(field => {
    field.onchange = () => {
      settings[field.dataset.setting] = field.type === 'checkbox' ? field.checked : field.type === 'range' ? +field.value : field.value
      persist('settings',settings)
      if (field.dataset.setting === 'camera') { flat = !board; resetCamera() }
      applySettings()
    }
  })
  if (collection) {
    if (board) $('inspect').onclick = inspectPieces
    for (const item of preset) {
      const pick = el('button','secondary',item.name)
      pick.onclick = () => {
        Object.assign(settings,item.styles)
        persist('settings',settings)
        applySettings()
        settingsDialog(true)
      }
      $('presets').append(pick)
    }
    $('save-preset').onclick = () => {
      const name = $('preset-name').value.trim()
      if (!name) return $('preset-name').focus()
      const {theme,white,black,environment,collection} = settings
      preset = [{name,styles:{theme,white,black,environment,collection}},...preset.filter(item=>item.name!==name)].slice(0,12)
      persist('presets',preset)
      settingsDialog(true)
      toast('Preset saved')
    }
  }
}

function openAnalysis() {
  if (!state.result || !state.moves.length || !['standard','fog'].includes(state.variant)) return
  show('Game analysis',`<p id="opening"></p><div class="analysis-graph"><canvas id="evaluation" width="620" height="154" aria-label="White evaluation graph"></canvas></div>
    <p id="analysis-progress" aria-live="polite">Starting Stockfish…</p><div id="analysis-rows" class="list"></div>`)
  $('opening').textContent = openingFor(state.moves) || 'Position review'
  const snapshot = state
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
    $('analysis-rows').append(row)
    $('analysis-progress').textContent = 'Evaluating '+rows.length+' / '+snapshot.moves.length+' · White '+(accuracy(rows,'w')??'—')+'% · Black '+(accuracy(rows,'b')??'—')+'%'
  },error=> {
    if (error) $('analysis-progress').textContent = error.message
    else $('analysis-progress').textContent = $('analysis-progress').textContent.replace('Evaluating','Evaluated')
  })
}

function inspectPieces() {
  show('Piece inspection',`<div id="inspector"></div><div class="two-fields">
    <label>Piece<select id="model-piece">${options(Object.entries(pieces),'n')}</select></label>
    <label>Side<select id="model-side"><option value="w">White</option><option value="b">Black</option></select></label>
    </div>${action('chevron-left','Back to collection','back-collection','secondary')}`)
  try {
    inspector = board.inspect($('inspector'))
    $('model-piece').onchange = $('model-side').onchange = () => inspector.select($('model-piece').value,$('model-side').value)
  } catch {
    $('inspector').textContent = '3D inspection is unavailable on this device.'
  }
  $('back-collection').onclick = () => settingsDialog(true)
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
  for (const game of history.slice(0,15)) {
    const row = el('div','info-row')
    row.append(el('span','',names[game.mode] + ' · '+new Date(game.date).toLocaleDateString()))
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
  <p><kbd>R</kbd> Reset camera</p>
  <p><kbd>←</kbd> <kbd>→</kbd> Review moves</p>
  <p><kbd>Tab</kbd> Focus the 2D board, then use arrows to navigate and Enter to select</p></div>`)
const destinations = {Play:()=>setup(),Multiplayer:openOnline,Ranked:openRanked,'AI opponents':()=>setup('ai'),Puzzles:openPuzzles,Challenges:challenges,Collection:()=>settingsDialog(true),Statistics:stats,Settings:()=>settingsDialog(),Controls:shortcuts}
document.querySelectorAll('[data-nav]').forEach(item => {
  item.onclick = () => {
    $('rail').classList.remove('opened')
    destinations[item.dataset.nav]()
  }
})
document.querySelectorAll('[data-tab]').forEach(button => {
  button.onclick = () => { tab = button.dataset.tab; renderPanel() }
})
$('dialog').addEventListener('close',() => {
  inspector?.close()
  inspector = null
  cancelAnalysis?.()
  cancelAnalysis = null
  if (waiting && mode !== 'online') { online.leave(); waiting = false }
})
$('mobile-menu').onclick = () => $('rail').classList.toggle('opened')
$('new-game').onclick = () => setup()
$('profile').onclick = stats
$('connection').onclick = openOnline
$('view-mode').onclick = () => { if (board) { flat = !flat; applySettings() } }
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
    if (mode === 'online') { online.send({type:'rematch'}); toast('Rematch requested'); return }
    if (mode==='survival') {
      runLevel = state.result.winner==='w' && level<30 ? runLevel+1 : 1
      level = Math.min(30,runLevel*2-1)
    }
    startLocal(mode,state.minutes,state.variant==='chess960'?undefined:state.initial,state.variant)
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
applySettings()
render()
const invite = new URL(location.href).searchParams.get('room')?.toUpperCase()
if (/^[A-F0-9]{6}$/.test(invite || '')) online.join(invite)
