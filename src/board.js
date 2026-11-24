import * as THREE from 'three'
import { environments } from './environments.js'
import { profileFor } from './collections.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const files = 'abcdefgh'
export const squareAt = (column, row) => files[column] + (8 - row)
export const pieces = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' }
export const glyph = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const position = square => new THREE.Vector3(files.indexOf(square[0]) - 3.5, .10, 4.5 - Number(square[1]))
const profile = {
  p: [[.24,.18],[.21,.20],[.15,.26],[.12,.38],[.14,.47],[.20,.49],[.20,.54],[.12,.55]],
  n: [[.26,.18],[.20,.24],[.16,.29],[.17,.43],[.25,.44],[.25,.51],[.18,.55]],
  b: [[.23,.18],[.19,.24],[.13,.31],[.10,.54],[.15,.68],[.21,.71],[.21,.77],[.12,.79],[.18,.83],[.20,.90],[.16,.98],[.08,1.07],[0,1.13]],
  r: [[.26,.18],[.22,.24],[.20,.29],[.17,.39],[.17,.69],[.23,.74],[.25,.80],[.25,.96],[.17,.96],[.17,.82],[0,.82]],
  q: [[.25,.18],[.20,.24],[.14,.32],[.10,.51],[.13,.72],[.18,.82],[.23,.86],[.23,.93],[.15,.95],[.21,1.03],[.26,1.15],[.20,1.16],[.16,1.08],[0,1.08]],
  k: [[.25,.18],[.21,.25],[.15,.32],[.12,.52],[.14,.74],[.20,.84],[.23,.87],[.23,.94],[.16,.96],[.23,1.02],[.21,1.12],[.13,1.20],[.07,1.20]],
}
const ring = [[0,0],[.31,0],[.35,.025],[.36,.055],[.355,.09],[.34,.12],[.30,.135],[.29,.16],[.27,.175]]
const geometryCache = new Map()
const felt = new THREE.MeshStandardMaterial({color:0x243830,roughness:1})
const feltGeometry = new THREE.CylinderGeometry(.27,.285,.014,48)

function turnedProfile(points, scale = 1) {
  const path = new THREE.Path()
  path.moveTo(points[0][0]*scale,points[0][1])
  for (let index = 1; index < points.length - 1; index++) {
    const [x,y] = points[index]
    const [nextX,nextY] = points[index+1]
    path.quadraticCurveTo(x*scale,y,(x+nextX)*scale/2,(y+nextY)/2)
  }
  const last = points.at(-1)
  path.lineTo(last[0]*scale,last[1])
  return path.getPoints(4)
}

function boardFrame(size, depth, bevel) {
  const half = size/2 - bevel
  const shape = new THREE.Shape()
  shape.moveTo(-half,-half)
  shape.lineTo(half,-half)
  shape.lineTo(half,half)
  shape.lineTo(-half,half)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,
    bevelThickness:bevel,bevelSize:bevel,bevelSegments:4,steps:1})
  geo.rotateX(-Math.PI/2)
  geo.translate(0,-(depth-2*bevel)/2,0)
  return geo
}

function pieceGeometry(type,collection = 'staunton') {
  const key = collection + ':' + type
  if (geometryCache.has(key)) return geometryCache.get(key)
  const shape = profileFor(collection,profile[type],ring)
  const height = type === 'p' ? .82 : type === 'q' ? 1.08 : 1
  let body = new THREE.LatheGeometry(turnedProfile(shape.points,height),shape.sides)
  if (type === 'b') {
    const cutter = new Brush(new THREE.BoxGeometry(.37,.075,.47))
    cutter.position.set(.163,.986,0)
    cutter.rotation.z = -.58
    cutter.updateMatrixWorld()
    const solid = new Brush(body)
    solid.updateMatrixWorld()
    body = new Evaluator().evaluate(solid,cutter,SUBTRACTION).geometry
  }
  const list = [[body]]
  const ball = (radius, y, x = 0, z = 0) => list.push([new THREE.SphereGeometry(radius, 20, 14), x, y, z])
  const box = (width, height, depth, x, y, z, angle = 0) => list.push([new THREE.BoxGeometry(width,height,depth),x,y,z,angle])
  if (type === 'p') ball(.145,.65)
  if (type === 'b') ball(.048,1.12)
  if (type === 'r') for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3
    box(.134,.115,.092,.207 * Math.sin(a),1.00,.207 * Math.cos(a),a)
  }
  if (type === 'q') {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4
      ball(.045,1.17,.25 * Math.sin(a),.25 * Math.cos(a))
    }
    ball(.078,1.21)
  }
  if (type === 'k') {
    box(.088,.26,.075,0,1.29,0)
    box(.235,.077,.075,0,1.31,0)
    ball(.045,1.43)
  }
  if (type === 'n') {
    const outline = new THREE.Shape()
    outline.moveTo(-.19, .49)
    outline.bezierCurveTo(-.28,.70,-.24,1.00,-.03,1.12)
    outline.lineTo(.01,1.25)
    outline.quadraticCurveTo(.08,1.25,.11,1.13)
    outline.bezierCurveTo(.15,1.09,.20,1.00,.29,.93)
    outline.quadraticCurveTo(.39,.85,.29,.78)
    outline.quadraticCurveTo(.24,.74,.10,.83)
    outline.bezierCurveTo(.02,.76,.20,.57,.17,.49)
    outline.closePath()
    const head = new THREE.ExtrudeGeometry(outline, { depth: .15, bevelThickness: .055, bevelSize: .047, bevelSegments: 5, curveSegments: 16 })
    list.push([head,0,0,-.075])
    for (const side of [-1,1]) {
      const cheek = new THREE.SphereGeometry(.096,24,16).scale(.89,1.31,.40)
      list.push([cheek,.078,.923,side*.115])
      const eye = new THREE.SphereGeometry(.037,20,16).scale(1,.7,.55)
      list.push([eye,.125,1.008,side*.134,0,.63])
      const pupil = new THREE.SphereGeometry(.016,18,12).scale(1,.92,.52)
      list.push([pupil,.132,1.007,side*.151,0,.32])
      const nostril = new THREE.SphereGeometry(.023,20,12).scale(1,.68,.52)
      list.push([nostril,.287,.874,side*.128,0,.50])
      const mouth = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(.314,.819,side*.116),new THREE.Vector3(.251,.812,side*.135),
        new THREE.Vector3(.188,.823,side*.133),
      ]),10,.008,6,false)
      list.push([mouth,0,0,0,0,.44])
    }
    for (let i = 0; i < 10; i++) {
      const t = i / 9
      const hair = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.145+t*.12,.60+t*.52,.135),
        new THREE.Vector3(-.222+t*.15,.637+t*.48,.140),
        new THREE.Vector3(-.253+t*.155,.618+t*.49,.071),
        new THREE.Vector3(-.253+t*.155,.618+t*.49,-.071),
        new THREE.Vector3(-.222+t*.15,.637+t*.48,-.140),
        new THREE.Vector3(-.145+t*.12,.60+t*.52,-.135),
      ]),20,.014,8,false)
      list.push([hair,0,0,0,0,.74])
    }
  }
  const parts = list.map(([geo,x=0,y=0,z=0,angle=0,shade=1]) => {
    const copy = geo.index ? geo.toNonIndexed() : geo
    const values = new Float32Array(copy.attributes.position.count*3).fill(shade)
    copy.setAttribute('color',new THREE.BufferAttribute(values,3))
    return copy.rotateY(angle).translate(x,y,z)
  })
  const geometry = mergeGeometries(parts)
  geometryCache.set(key,geometry)
  return geometry
}

function surfaceTexture(kind, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const pixels = ctx.createImageData(size,size)
  let random = 19
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    random = (random * 16807) % 2147483647
    const bend = Math.sin(x*.008)*1.7 + Math.sin(x*.021+y*.004)*.6
    let grain = Math.sin(y*.145+bend)*13 + Math.sin(y*.53+bend*2)*8 + Math.sin(y*1.9+x*.037)*5 + random%9
    if (kind === 'marble') {
      const warp = x*.032+y*.024+Math.sin(y*.015)*1.9 + Math.sin((x-y)*.042)*.24
      grain = 16 - Math.pow(Math.abs(Math.cos(warp)),14)*65 + random%11
    } else if (kind === 'carbon') {
      const xBand = Math.floor(x/12)
      const yBand = Math.floor(y/12)
      grain = -35 + ((xBand+yBand)%2 ? x%12 : y%12)*2 + (random%5)
    } else if (kind === 'stone') {
      grain = -24 + Math.sin(x*.013)*Math.sin(y*.021)*18 + random%40
    }
    const i = (y * size + x) * 4
    pixels.data.set([225 + grain, 221 + grain, 215 + grain, 255], i)
  }
  ctx.putImageData(pixels,0,0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const palettes = {
  walnut:['#d6ab79','#54291b','#422719','wood'],
  marble:['#e1dfd9','#666978','#25262c','marble'],
  jade:['#d8dbc0','#54736b','#233731','stone'],
  championship:['#dbc799','#685369','#322637','wood'],
  neon:['#408587','#192a3f','#182938','carbon'],
  castle:['#c8b593','#6a6457','#433b34','stone'],
  orbit:['#b0bfda','#465a75','#293449','carbon'],
  obsidian:['#d6ac5c','#353039','#3f2c1d','marble'],
  penthouse:['#e1cbaa','#8b634a','#42362c','marble'],
  egypt:['#dbba79','#866747','#433629','stone'],
  cabin:['#d4e4eb','#7093ab','#35495c','wood'],
  hologram:['#71abd8','#243a5e','#132334','carbon'],
  cathedral:['#cec0d6','#68516a','#362a3d','stone'],
  tropical:['#e0cc92','#9c623f','#61402b','wood'],
  rain:['#bcb8ae','#5f5b67','#353443','wood'],
  underwater:['#8fccc8','#2c6172','#154151','marble'],
  studio:['#ededed','#a8a8ae','#64636a','marble'],
  chrome:['#ccd5db','#566471','#343c43','carbon'],
  sky:['#eed9c3','#8d7ba6','#4c405f','marble'],
  roman:['#e8d9ad','#965850','#572f2a','marble'],
}
export const themeList = Object.fromEntries(Object.entries(environments).map(([id,[label]])=>[id,label]))
const finishes = {
  ivory: [0xd4b992,.02,.34], ebony: [0x2b1e1c,.20,.25], gold: [0xdcad50,.85,.22],
  chrome: [0xbcc9d2,.97,.17], ceramic: [0xdbe0f5,.09,.20], jade: [0x386b61,.25,.27],
  walnut: [0x704224,.02,.35,'wood'], marble: [0xbac0ce,.03,.23,'marble'],
  obsidian: [0x201d26,.28,.15], glass: [0xd6f8ff,0,.08,null,.88],
  crystal: [0x91cae8,0,.12,null,.63], stone: [0xb9a68b,.02,.91,'stone'],
  carbon: [0x33343d,.42,.36,'carbon'], holographic:[0x4bd7d3,.10,.24,null,.49],
  'dark chrome':[0x454a55,.95,.20], 'rose gold':[0xd4a18d,.80,.23],
}
export const finishList = Object.keys(finishes)

export class Board {
  constructor(host, onSquare) {
    this.host = host
    this.onSquare = onSquare
    this.stones = new Map()
    this.departing = []
    this.collection = 'staunton'
    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    this.scene.environment = pmrem.fromScene(room,.05).texture
    this.scene.environmentIntensity = .58
    room.dispose()
    pmrem.dispose()
    host.append(this.renderer.domElement)
    this.camera = new THREE.PerspectiveCamera(40,1,.1,100)
    this.controls = new OrbitControls(this.camera,this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.enableRotate = false
    this.controls.minDistance = 5.2
    this.controls.maxDistance = 26
    this.controls.maxPolarAngle = 1.48
    this.controls.target.set(0,.12,0)
    this.reset()
    const key = this.key = new THREE.DirectionalLight(0xffeddb,2.15)
    key.position.set(-4,7,-3)
    key.castShadow = true
    key.shadow.mapSize.set(1024,1024)
    Object.assign(key.shadow.camera,{ left:-7,right:7,top:7,bottom:-7,near:.3,far:24 })
    key.shadow.bias = -.0002
    key.shadow.normalBias = .008
    key.shadow.radius = 3
    this.scene.add(key,new THREE.HemisphereLight(0xffebdd,0x433744,.86))
    const base = (size,y,color,depth,bevel = .012) => {
      const mesh = new THREE.Mesh(boardFrame(size,depth,bevel),new THREE.MeshPhysicalMaterial({color,roughness:.38,clearcoat:.4}))
      mesh.position.y = y
      mesh.receiveShadow = true
      this.scene.add(mesh)
      return mesh
    }
    this.frame = base(8.88,-.148,0x3b241a,.46,.055)
    base(8.93,-.279,0x4e3221,.065,.018)
    this.rim = base(8.61,.047,0x715036,.080,.019)
    this.trim = base(8.12,.061,0x9a6a47,.054)
    this.woodMaps = new Map()
    this.textureVariants = new WeakMap()
    this.textures = Object.fromEntries(['wood','marble','stone','carbon'].map(type=>[type,surfaceTexture(type,type==='wood'?1024:512)]))
    this.squareMaterials = Array.from({length:8},(_,index) => new THREE.MeshPhysicalMaterial({
      roughness:.52 + (index%4)*.022, clearcoat:.26, clearcoatRoughness:.36,
    }))
    this.engraving = new THREE.Group()
    for (let index=0;index<8;index++) {
      this.coordinate(files[index],index-3.5,4.22,0)
      this.coordinate(files[index],index-3.5,-4.22,Math.PI)
      this.coordinate(String(8-index),-4.22,index-3.5,0)
      this.coordinate(String(8-index),4.22,index-3.5,Math.PI)
    }
    this.scene.add(this.engraving)
    const tileGeometry = boardFrame(.998,.065,.004)
    this.squares = []
    this.markers = new Map()
    for (let row=0;row<8;row++) for (let col=0;col<8;col++) {
      const square = squareAt(col,row)
      const tile = new THREE.Mesh(tileGeometry,this.squareMaterials[((row+col)%2)*4+((row*3+col*7)%4)])
      tile.position.copy(position(square))
      tile.position.y = .064
      tile.userData.square = square
      tile.receiveShadow = true
      this.scene.add(tile)
      this.squares.push(tile)
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(.97,.97),new THREE.MeshBasicMaterial({
        transparent:true,opacity:.48,depthWrite:false,
      }))
      mark.rotation.x = -Math.PI/2
      mark.position.copy(position(square)).setY(.101)
      mark.visible = false
      this.scene.add(mark)
      this.markers.set(square,mark)
    }
    this.materials = ['w','b'].map(() => new THREE.MeshPhysicalMaterial({clearcoat:.4,clearcoatRoughness:.2,vertexColors:true}))
    this.setTheme('walnut','ivory','ebony')
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(45,45),new THREE.ShadowMaterial({ opacity:.48 }))
    plane.rotation.x = -Math.PI/2
    plane.position.y = -.37
    plane.receiveShadow = true
    this.scene.add(plane)
    this.ray = new THREE.Raycaster()
    this.renderer.domElement.addEventListener('pointerdown', event => {
      this.renderer.domElement.setPointerCapture(event.pointerId)
      this.down = { x:event.clientX,y:event.clientY,square:this.hit(event) }
    })
    this.renderer.domElement.addEventListener('pointerup', event => {
      if (!this.down || event.button !== 0) return
      const target = this.hit(event)
      if (this.controls.enableRotate && Math.hypot(event.clientX-this.down.x,event.clientY-this.down.y)>5) return
      if (target && this.down.square !== target && this.dragStart?.(this.down.square)) this.onSquare(this.down.square)
      if (target) this.onSquare(target)
      this.down = null
    })
    this.resize = new ResizeObserver(() => {
      const {clientWidth:w,clientHeight:h} = host
      if (w && h) {
        this.dirty = true
        this.camera.aspect = w/h
        this.camera.fov = (this.camera.aspect < 1.10 ? 46 : 40)+(this.fovOffset || 0)
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(w,h)
      }
    })
    this.resize.observe(host)
    this.setQuality('high')
    this.renderer.setAnimationLoop(time => {
      if (this.frameLimit && time-(this.lastFrame || 0)<1000/this.frameLimit-2) return
      if (!host.clientWidth || !host.clientHeight) return
      if (this.showcase && !this.reduced) this.controls.autoRotate = true
      else this.controls.autoRotate = false
      const cameraMoved = this.controls.update()
      for (let i=this.departing.length-1;i>=0;i--) {
        const capture = this.departing[i]
        const t = this.reduced ? 1 : Math.min(1,(performance.now()-capture.started)/340)
        capture.mesh.position.lerpVectors(capture.from,capture.to,1-(1-t)**3)
        capture.mesh.position.y += Math.sin(t*Math.PI)*.65
        capture.mesh.scale.setScalar(1-.66*t)
        if (t===1) {
          this.scene.remove(capture.mesh)
          this.departing.splice(i,1)
        }
        this.dirty = true
      }
      let moving = false
      for (const entry of this.stones.values()) {
        if (this.reduced) entry.mesh.position.copy(entry.target)
        else if (entry.mesh.position.distanceToSquared(entry.target) > .00001) {
          entry.mesh.position.lerp(entry.target,.22)
          moving = true
        } else entry.mesh.position.copy(entry.target)
        if (entry.type === 'n' && entry.hop && !this.reduced) {
          const phase = (performance.now()-entry.hop)/260
          if (phase < 1) {
            entry.mesh.position.y = entry.target.y + Math.sin(phase*Math.PI)*.32
            moving = true
          }
          else entry.hop = null
        }
      }
      if (this.dirty || cameraMoved || moving || this.wasMoving) {
        this.lastFrame = time
        this.renderer.render(this.scene,this.camera)
        this.dirty = false
      }
      this.wasMoving = moving
    })
  }

  coordinate(text,x,z,yaw) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#4a3323'
    ctx.font = 'bold 42px Georgia'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text,33,34)
    ctx.fillStyle = '#e3c694'
    ctx.fillText(text,32,32)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshBasicMaterial({
      map:texture,transparent:true,depthWrite:false,
    }))
    tile.rotation.set(-Math.PI/2,0,yaw)
    tile.position.set(x,.089,z)
    this.engraving.add(tile)
  }

  setViewOptions(fovOffset,frameLimit) {
    this.fovOffset = fovOffset
    this.frameLimit = frameLimit
    this.camera.fov = (this.camera.aspect<1.10?46:40)+fovOffset
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  setQuality(quality) {
    this.dirty = true
    this.quality = quality
    const size = quality==='photo'?4096:quality==='ultra'?2048:0
    if (size && !this.woodMaps.has(size)) {
      this.woodMaps.set(size,null)
      new THREE.TextureLoader().load('/textures/walnut-'+size+'.webp', texture => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        this.woodMaps.set(size,texture)
        if (this.quality===quality && this.currentTheme) this.setTheme(...this.currentTheme)
      }, undefined, () => this.woodMaps.delete(size))
    }
    const settings = {low:[1,0],medium:[1.25,768],high:[1.5,1024],ultra:[2,1536],photo:[2.5,2048]}
    const [ratio,shadow] = settings[quality] || settings.high
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,ratio))
    this.renderer.shadowMap.enabled = shadow > 0
    if (shadow && this.key.shadow.mapSize.x !== shadow) {
      this.key.shadow.map?.dispose()
      this.key.shadow.map = null
      this.key.shadow.mapSize.set(shadow,shadow)
      this.key.shadow.needsUpdate = true
    }
  }

  variedTexture(texture,index) {
    if (!this.textureVariants.has(texture)) this.textureVariants.set(texture,[])
    const variants = this.textureVariants.get(texture)
    if (!variants[index]) {
      const map = texture.clone()
      map.wrapS = map.wrapT = THREE.RepeatWrapping
      map.repeat.set(.83,.85)
      map.offset.set(index*.213,index*.347)
      map.rotation = index%2 ? Math.PI : 0
      map.needsUpdate = true
      variants[index] = map
    }
    return variants[index]
  }

  setTheme(key, white, black, environment = key, collection = 'staunton') {
    this.collection = collection
    this.currentTheme = [key,white,black,environment,collection]
    this.dirty = true
    const [light,dark,frame,type] = palettes[key] || palettes.walnut
    this.host.parentNode.style.setProperty('--light-square',light)
    this.host.parentNode.style.setProperty('--dark-square',dark)
    this.host.parentNode.style.setProperty('--stage',frame)
    const size = this.quality==='photo'?4096:this.quality==='ultra'?2048:0
    const textureFor = id => id==='wood' && this.woodMaps.get(size) || this.textures[id]
    this.squareMaterials.forEach((material,index) => {
      const map = this.variedTexture(textureFor(type),index)
      material.color.set(index<4?light:dark).multiplyScalar(.98+(index%4)*.025)
      material.map = map
      material.bumpMap = map
      material.bumpScale = type==='stone' ? .022 : .009
      material.clearcoat = type==='marble' ? .82 : .38
      material.roughness = type==='marble' ? .29 : .51
      material.needsUpdate = true
    })
    this.frame.material.map = textureFor(type)
    this.frame.material.bumpMap = textureFor(type)
    this.frame.material.bumpScale = .008
    this.frame.material.needsUpdate = true
    this.frame.material.color.set(frame)
    this.rim.material.color.set(frame).multiplyScalar(1.65)
    this.key.color.setHex((environments[environment] || environments.walnut)[2])
    ;[white,black].forEach((finish,i) => {
      const [color,metalness,roughness,map,transmission=0] = finishes[finish] || finishes[i ? 'ebony' : 'ivory']
      const material = this.materials[i]
      Object.assign(material,{ metalness,roughness,transmission,thickness:.38,ior:1.46,
        clearcoat:finish==='stone'?.15:.65,map:textureFor(map) || null,
        bumpMap:textureFor(map) || null,bumpScale:.008 })
      material.color.set(color)
      material.emissive.setHex(finish==='holographic' ? 0x157a7e : 0)
      material.emissiveIntensity = finish==='holographic' ? .35 : 0
      material.needsUpdate = true
    })
  }

  reset(mode = 'angled', flipped = false) {
    this.dirty = true
    const y = {low:5.1,overhead:14,close:3.6}[mode] || 10.9
    const distance = {low:14.4,overhead:.01,close:6.2}[mode] || 11.6
    this.camera.position.set(mode === 'close' ? 3.7 : 0,y,distance*(flipped?-1:1))
    this.controls.target.set(0,.12,mode === 'close' ? (flipped?-2.1:2.1) : 0)
    this.controls.enableRotate = ['orbit','close','showcase'].includes(mode)
    this.showcase = mode === 'showcase'
    this.controls.update()
  }

  hit(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    this.ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),this.camera)
    const figures = this.ray.intersectObjects([...this.stones.values()].map(p => p.mesh),true)
    const piece = figures[0]?.object.parent.userData.square
    const tile = this.ray.intersectObjects(this.squares)[0]?.object.userData.square
    return piece || tile
  }

  animateCapture(entry) {
    if (this.reduced) return this.scene.remove(entry.mesh)
    const from = entry.mesh.position.clone()
    const to = new THREE.Vector3(from.x<0?-5.2:5.2,-.3,from.z)
    this.departing.push({from,to,mesh:entry.mesh,started:performance.now()})
  }

  inspect(host) {
    const scene = new THREE.Scene()
    scene.environment = this.scene.environment
    scene.environmentIntensity = .9
    const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true})
    renderer.setPixelRatio(Math.min(devicePixelRatio,2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    host.append(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(35,1,.1,20)
    camera.position.set(2.3,1.6,3.2)
    const controls = new OrbitControls(camera,renderer.domElement)
    controls.target.set(0,.66,0)
    controls.minDistance = 1.5
    controls.maxDistance = 7
    controls.enablePan = false
    controls.enableDamping = true
    const light = new THREE.DirectionalLight(0xffead5,2.1)
    light.position.set(3,5,3)
    scene.add(light,new THREE.HemisphereLight(0xfff1dc,0x403840,1.15))
    const model = new THREE.Mesh(pieceGeometry('n',this.collection),this.materials[0])
    const pad = new THREE.Mesh(feltGeometry,felt)
    scene.add(model,pad)
    let dirty = true
    const observer = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return
      renderer.setSize(host.clientWidth,host.clientHeight)
      camera.aspect = host.clientWidth/host.clientHeight
      camera.updateProjectionMatrix()
      dirty = true
    })
    observer.observe(host)
    renderer.setAnimationLoop(() => {
      if (controls.update() || dirty) {
        renderer.render(scene,camera)
        dirty = false
      }
    })
    return {
      select: (piece,color) => {
        dirty = true
        model.geometry = pieceGeometry(piece,this.collection)
        model.material = this.materials[color==='w'?0:1]
        pad.scale.set(piece==='p'?.82:1,1,piece==='p'?.82:1)
      },
      close: () => {
        observer.disconnect()
        controls.dispose()
        renderer.setAnimationLoop(null)
        renderer.dispose()
        renderer.forceContextLoss()
      },
    }
  }

  render(chess,selected,legal,last,animate,visible) {
    this.dirty = true
    if (animate && last && this.stones.has(last.from)) {
      const old = this.stones.get(last.from)
      const castle = /[kq]/.test(last.flags) && old.type==='k'
      const destination = last.landing || last.to
      if (castle) {
        const short = last.flags==='k'
        const rookFrom = last.rookFrom || (short?'h':'a')+last.to[1]
        const rookTo = last.rookTo || (short?'f':'d')+last.to[1]
        const rook = this.stones.get(rookFrom)
        this.stones.delete(last.from)
        this.stones.delete(rookFrom)
        if (rook) this.stones.set(rookTo,rook)
      } else {
        const capturedSquare = last.flags.includes('e') ? last.to[0]+last.from[1] : last.to
        const captured = this.stones.get(capturedSquare)
        if (captured) {
          this.animateCapture(captured)
          this.stones.delete(capturedSquare)
        }
        this.stones.delete(last.from)
      }
      this.stones.set(destination,old)
      if (old.type === 'n') old.hop = performance.now()
    }
    const active = new Set()
    for (const piece of chess.board().flat().filter(Boolean)) {
      const {square,type,color} = piece
      active.add(square)
      let entry = this.stones.get(square)
      if (!entry || entry.type !== type || entry.color !== color || entry.collection !== this.collection) {
        if (entry) this.scene.remove(entry.mesh)
        const mesh = new THREE.Group()
        const model = new THREE.Mesh(pieceGeometry(type,this.collection),this.materials[color === 'w' ? 0 : 1])
        model.castShadow = model.receiveShadow = true
        const pad = new THREE.Mesh(feltGeometry,felt)
        pad.position.y = .003
        if (type === 'p') pad.scale.set(.82,1,.82)
        mesh.add(model,pad)
        if (type === 'n') mesh.rotation.y = color === 'w' ? -.38 : Math.PI-.38
        mesh.position.copy(position(square))
        this.scene.add(mesh)
        entry = {mesh,type,color,collection:this.collection,target:position(square)}
        this.stones.set(square,entry)
      }
      entry.mesh.userData.square = square
      entry.target.copy(position(square)).setY(square===selected ? .29 : .10)
    }
    for (const [square,entry] of this.stones) if (!active.has(square)) {
      this.scene.remove(entry.mesh)
      this.stones.delete(square)
    }
    for (const [square,mark] of this.markers) {
      const piece = chess.get(square)
      const inCheck = piece?.type === 'k' && piece.color === chess.turn() && chess.isCheck()
      const color = inCheck ? 0xc85150 : square === selected ? 0x94d9ae : legal.includes(square) ? 0x5bbf98
        : last && [last.from,last.landing || last.to].includes(square) ? 0xe6ad4f : visible && !visible.has(square) ? 0x10121b : null
      mark.visible = color !== null
      mark.material.opacity = visible && !visible.has(square) ? .82 : .48
      if (color !== null) mark.material.color.setHex(color)
      mark.scale.setScalar(legal.includes(square) && !piece ? .24 : 1)
    }
  }
}
