import * as THREE from 'three'
import { immersiveEditions } from './worlds/chess-editions.js'
import { pieceComponents, stepComponents } from './worlds/piece-components.js'
import { locationFor } from './worlds/catalog.js'
import { classicBoardNames } from './classic-board-names.js'
import { animateSurface } from './surfaces.js'
import { profileFor, premiumCollections } from './collections.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js'
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
const gearOutline=new THREE.Shape()
for(let i=0;i<72;i++){
  const a=i*Math.PI/36
  const radius=i%4===1 || i%4===2?.245:.211
  if(i)gearOutline.lineTo(Math.cos(a)*radius,Math.sin(a)*radius)
  else gearOutline.moveTo(radius,0)
}
gearOutline.closePath()
const gearHub=new THREE.Path()
gearHub.absarc(0,0,.171,0,2*Math.PI,true)
gearOutline.holes.push(gearHub)
const gearGeometry=new THREE.ExtrudeGeometry(gearOutline,{depth:.025,bevelEnabled:true,bevelSize:.006,bevelThickness:.003,bevelSegments:2}).rotateX(-Math.PI/2)
const engravingBand=new THREE.CylinderGeometry(.345,.345,.04,48,1,true)
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

function pieceGeometry(type,collection='staunton',base='classic',quality='high') {
  const key = collection+':'+type+':'+base+':'+quality
  if (geometryCache.has(key)) return geometryCache.get(key)
  const shape = profileFor(collection,profile[type],ring,base)
  const height = type === 'p' ? .82 : type === 'q' ? 1.08 : 1
  let body = new THREE.LatheGeometry(turnedProfile(shape.points,height),quality==='low'?Math.min(28,shape.sides):shape.sides)
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
  const detail = premiumCollections[collection]?.detail
  const collar = (radius,y,tube=.012,shade=.73) => {
    const geometry = new THREE.TorusGeometry(radius,tube,8,48).rotateX(Math.PI/2)
    list.push([geometry,0,y,0,0,shade])
  }
  collar(type==='p'?.258:.313,.099,.009)
  if (detail==='machined' || detail==='ribs' || detail==='gear') {
    for (const y of [.037,.065,.127]) collar((type==='p'?.264:.322)-(y>.10?.023:0),y,.009)
  }
  if (['heritage','filigree','fluted','rings'].includes(detail)) {
    collar(type==='p'?.23:.285,.145,.012)
    for (let iris=0;iris<16;iris++) {
      const a=iris*Math.PI/8
      const radius=type==='p'?.263:.321
      const inset=new THREE.SphereGeometry(.011,8,6).scale(.75,1.4,.75)
      list.push([inset,Math.sin(a)*radius,.071,Math.cos(a)*radius,0,.64])
    }
  }
  if (detail==='obelisk' || detail==='helmet') {
    const radius=type==='p'?.237:.286
    for (let i=0;i<8;i++) {
      const angle=i*Math.PI/4
      list.push([new THREE.BoxGeometry(.038,.044,.034),Math.cos(angle)*radius,.127,Math.sin(angle)*radius,-angle, .59])
    }
  }
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
    const cross = new THREE.Shape()
    const arms=[[-.039,1.168],[.039,1.168],[.039,1.284],[.104,1.284],[.115,1.326],[.039,1.326],[.039,1.40],[-.039,1.40],[-.039,1.326],[-.115,1.326],[-.104,1.284],[-.039,1.284]]
    arms.forEach(([x,y],i)=>i?cross.lineTo(x,y):cross.moveTo(x,y))
    cross.closePath()
    const crown=new THREE.ExtrudeGeometry(cross,{depth:.055,bevelSize:.011,bevelThickness:.009,bevelSegments:3})
    list.push([crown,0,0,-.0275])
    collar(.173,1.052,.014)
    ball(.045,1.43)
  }
  if (type === 'n') {
    const outline = new THREE.Shape()
    outline.moveTo(-.19, .49)
    outline.bezierCurveTo(-.28,.70,-.24,1.00,-.03,1.12)
    outline.quadraticCurveTo(-.047,1.201,-.005,1.254)
    outline.quadraticCurveTo(.032,1.286,.06,1.167)
    outline.quadraticCurveTo(.11,1.226,.118,1.13)
    outline.bezierCurveTo(.15,1.09,.20,1.00,.29,.93)
    outline.quadraticCurveTo(.39,.85,.29,.78)
    outline.quadraticCurveTo(.24,.74,.10,.83)
    outline.bezierCurveTo(.02,.76,.20,.57,.17,.49)
    outline.closePath()
    const extrusion = new THREE.ExtrudeGeometry(outline,{depth:.13,bevelThickness:.049,bevelSize:.041,bevelSegments:5,curveSegments:16})
    const head = new TessellateModifier(quality==='low'?.082:.046,4).modify(extrusion)
    extrusion.dispose()
    const vertices=head.attributes.position
    for(let index=0;index<vertices.count;index++){
      const x=vertices.getX(index),y=vertices.getY(index),z=vertices.getZ(index)-.065
      const cheek=Math.exp(-((x-.012)**2/.018+(y-.907)**2/.032))
      const neck=Math.exp(-((x+.075)**2/.025+(y-.666)**2/.033))
      const taper=1-THREE.MathUtils.smoothstep(y,1.10,1.28)*.35
      vertices.setZ(index,z*(taper+.41*cheek+.34*neck))
    }
    head.deleteAttribute('normal')
    const smooth=mergeVertices(head)
    head.dispose()
    smooth.computeVertexNormals()
    list.push([smooth])
    for (const side of [-1,1]) {
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

export const palettes = {
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
  liquid:['#aab7c4','#3e4857','#222833','carbon','liquid'],
  lava:['#a77c53','#382523','#241b1b','stone','molten'],
  glacier:['#acd5df','#42647e','#263d52','marble','frost'],
  galaxy:['#877aa7','#272439','#20172b','stone','nebula'],
  machine:['#a9905c','#454750','#262631','carbon','mechanical'],
  water:['#83b8bd','#315b65','#183746','marble','water'],
  energy:['#79b9bc','#203f50','#17303d','carbon','storm'],
  bullion:['#d6ae62','#4e3f32','#342820','marble','celestial'],
  'gold-vein':['#d0b98d','#3b3437','#29252b','marble','marble'],
  projection:['#75a7c2','#293f63','#1c304b','carbon','hologram'],
  'aurora-glass':['#9accb3','#35485d','#2b3a52','marble','ribbons'],
  emerald:['#9ab99a','#285744','#24463a','stone','spectrum'],
  'woven-carbon':['#9893a1','#373746','#28292e','carbon','grid'],
  solar:['#d9ad6f','#673b37','#372924','stone','sunspots'],
  ink:['#aea6b5','#403743','#292733','marble','ink'],
  sapphire:['#8aa9df','#344b7b','#243854','marble','water'],
}
export const themeList = {...classicBoardNames,
  liquid:'Liquid metal',lava:'Volcanic basalt',glacier:'Frozen crystal',galaxy:'Cosmic galaxy',
  machine:'Mechanical grid',water:'Water glass',energy:'Neon energy',bullion:'Animated gold',
  'gold-vein':'Gold-veined marble',projection:'Holographic grid',
  'aurora-glass':'Aurora glass',emerald:'Emerald crystal','woven-carbon':'Woven carbon',
  solar:'Solar flare',ink:'Ink shadow',sapphire:'Sapphire tide'}

export const finishes = {
  ivory: [0xd4b992,.02,.34], ebony: [0x2b1e1c,.20,.25], gold: [0xdcad50,.85,.22],
  chrome: [0xbcc9d2,.97,.17], ceramic: [0xdbe0f5,.09,.20], jade: [0x386b61,.25,.27],
  walnut: [0x704224,.02,.35,'wood'], marble: [0xbac0ce,.03,.23,'marble'],
  obsidian: [0x201d26,.28,.15], glass: [0xd6f8ff,0,.08,null,.88],
  crystal: [0x91cae8,0,.12,null,.63], stone: [0xb9a68b,.02,.91,'stone'],
  carbon: [0x33343d,.42,.36,'carbon'], holographic:[0x4bd7d3,.10,.24,null,.49,'hologram'],
  'dark chrome':[0x454a55,.95,.20], 'rose gold':[0xd4a18d,.80,.23],
  'liquid chrome':[0xa4b4c7,1,.1,null,0,'liquid'],
  titanium:[0x39434f,.91,.24,'carbon'],
  lacquer:[0x462523,.19,.19,'wood'],
  brass:[0xb38a4a,.88,.21,null,0,'mechanical'],
  molten:[0x714633,.45,.36,'stone',0,'molten'],
  frost:[0xa9dbe7,.05,.17,null,.64,'frost'],
  nebula:[0x8c7dc1,.28,.17,null,.26,'nebula'],
  storm:[0x8791c4,.55,.27,null,0,'storm'],
  emerald:[0x68ab92,.14,.12,null,.66],
  sapphire:[0x547bbf,.19,.13,null,.46],
  phantom:[0x82a0ac,.06,.21,null,.75,'phantom'],
  celestial:[0xdec391,.72,.18,null,0,'celestial'],
  'living marble':[0xb7b4ae,.11,.24,'marble',0,'marble'],
  'midnight hologram':[0x29465d,.35,.18,null,.4,'hologram'],

}
for(const [id,edition] of Object.entries(immersiveEditions)){
  const {color,metal,rough,glass,pattern}=edition
  const map=id==='living-wood'?'wood':id==='dragonstone'?'stone':null
  finishes[id]=[color,metal,rough,map,glass,pattern]
  finishes[id+' dark']=[new THREE.Color(color).multiplyScalar(.26).getHex(),metal,rough,map,glass*.64,pattern]
}
export const finishList = Object.keys(finishes)

export class Board {
  constructor(host, onSquare) {
    this.host = host
    this.onSquare = onSquare
    this.stones = new Map()
    this.time = {value:0}
    this.keys = new Set()
    this.pointers=new Set()
    this.keyboard = event => {
      if (!['roam','photo'].includes(this.mode) || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || document.querySelector('dialog[open]')) return
      if (/^Key[WASD]$/.test(event.code)) {
        event.preventDefault()
        if (event.type==='keydown') this.keys.add(event.code)
        else this.keys.delete(event.code)
      }
    }
    window.addEventListener('keydown',this.keyboard)
    window.addEventListener('keyup',this.keyboard)
    window.addEventListener('blur',()=>this.keys.clear())
    this.departing = []
    this.effects = []
    this.collection = 'staunton'
    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    this.roomLighting=pmrem.fromScene(room,.05).texture
    this.scene.environment=this.roomLighting
    this.scene.environmentIntensity = .58
    room.dispose()
    pmrem.dispose()
    host.append(this.renderer.domElement)
    this.camera = new THREE.PerspectiveCamera(40,1,.1,155)
    this.controls = new OrbitControls(this.camera,this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = true
    this.controls.enableRotate = true
    this.controls.mouseButtons = { LEFT:null,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE }
    this.controls.touches = { ONE:null,TWO:THREE.TOUCH.DOLLY_ROTATE }
    this.controls.dampingFactor = .085
    this.controls.autoRotateSpeed = .48
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
    this.fill=new THREE.HemisphereLight(0xffebdd,0x443b48,1.12)
    this.scene.add(key,this.fill)
    this.table = new THREE.Group()
    this.scene.add(this.table)
    const base = (size,y,color,depth,bevel = .012) => {
      const mesh = new THREE.Mesh(boardFrame(size,depth,bevel),new THREE.MeshPhysicalMaterial({color,roughness:.38,clearcoat:.4}))
      mesh.position.y = y
      mesh.receiveShadow = true
      this.table.add(mesh)
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
    this.table.add(this.engraving)
    const tileGeometry = boardFrame(.998,.065,.004)
    this.boardPlane=new THREE.Plane(THREE.Object3D.DEFAULT_UP,-.098)
    const instances=this.squareMaterials.map(material=>{
      const mesh=new THREE.InstancedMesh(tileGeometry,material,8)
      mesh.receiveShadow=true
      this.table.add(mesh)
      return mesh
    })
    const counts=Array(8).fill(0)
    this.markers = new Map()
    this.squareMarker = new THREE.PlaneGeometry(.97,.97)
    this.captureMarker = new THREE.RingGeometry(.405,.48,40)
    this.moveMarker = new THREE.CircleGeometry(.115,24)
    for (let row=0;row<8;row++) for (let col=0;col<8;col++) {
      const square = squareAt(col,row)
      const index=((row+col)%2)*4+((Math.floor(row/2)+Math.floor(col/2))%4)
      const p=position(square)
      instances[index].setMatrixAt(counts[index]++,new THREE.Matrix4().makeTranslation(p.x,.064,p.z))
      const mark = new THREE.Mesh(this.squareMarker,new THREE.MeshBasicMaterial({
        transparent:true,opacity:.48,depthWrite:false,
      }))
      mark.rotation.x = -Math.PI/2
      mark.position.copy(position(square)).setY(.101)
      mark.visible = false
      this.table.add(mark)
      this.markers.set(square,mark)
    }
    instances.forEach((instance,index)=>{
      instance.count=counts[index]
      instance.instanceMatrix.needsUpdate=true
    })
    this.materials = ['w','b'].map(() => new THREE.MeshPhysicalMaterial({clearcoat:.4,clearcoatRoughness:.2,vertexColors:true}))
    this.detailMaterials = new Map()
    this.accentMaterials = new Map()
    this.solitaire = new THREE.Group()
    this.solitaire.visible = false
    this.scene.add(this.solitaire)
    this.pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.95,1.29,3.49,64),
      new THREE.MeshPhysicalMaterial({color:0x272927,metalness:.62,roughness:.34}))
    this.pedestal.position.y=-1.77
    this.pedestal.receiveShadow=true
    this.solitaire.add(this.pedestal)
    this.accentGeometry = new THREE.TorusGeometry(.245,.017,8,48).rotateX(Math.PI/2)
    this.engravings = new Map()
    this.setTheme('walnut','ivory','ebony')
    this.ray = new THREE.Raycaster()
    const surface=this.renderer.domElement
    surface.addEventListener('contextmenu',event=>event.preventDefault())
    surface.addEventListener('wheel',event=>{
      if(!this.lookMode())return
      event.preventDefault()
      this.camera.fov=THREE.MathUtils.clamp(this.camera.fov+event.deltaY*.036,24,70)
      this.camera.updateProjectionMatrix()
      this.dirty=true
    },{passive:false})
    surface.addEventListener('pointerdown',event=>{
      if(!this.lookMode())return
      if(event.button===2 || (this.mode==='roam' && event.button===0) || (event.pointerType==='touch' && !event.isPrimary)){
        this.down=null
        this.dragEntry=null
        this.lookDrag={id:event.pointerId,x:event.clientX,y:event.clientY}
        surface.setPointerCapture(event.pointerId)
      }
    })
    surface.addEventListener('pointermove',event=>{
      if(this.lookDrag?.id!==event.pointerId)return
      this.yaw-=(event.clientX-this.lookDrag.x)*.0043
      this.pitch=THREE.MathUtils.clamp(this.pitch-(event.clientY-this.lookDrag.y)*.0038,-1.33,1.28)
      this.lookDrag.x=event.clientX
      this.lookDrag.y=event.clientY
      this.updateLook()
    })
    for(const type of ['pointerup','pointercancel','lostpointercapture']){
      surface.addEventListener(type,event=>{if(this.lookDrag?.id===event.pointerId)this.lookDrag=null})
    }
    this.renderer.domElement.addEventListener('pointerdown', event => {
      if (event.pointerType==='touch') {
        this.pointers.add(event.pointerId)
        if(this.pointers.size>1){this.down=null;this.dragEntry=null;return}
      }
      if (event.button!==0 || this.preview || ['roam','photo'].includes(this.mode) || this.lookDrag) return
      this.renderer.domElement.setPointerCapture(event.pointerId)
      this.down = { x:event.clientX,y:event.clientY,square:this.hit(event) }
    })
    this.renderer.domElement.addEventListener('pointermove',event=>{
      const started=this.down
      if(!started || Math.hypot(event.clientX-started.x,event.clientY-started.y)<5 || !this.dragStart?.(started.square))return
      const entry=this.stones.get(started.square)
      if(!entry)return
      const point=this.rayFor(event).intersectPlane(this.boardPlane,new THREE.Vector3())
      if(!point)return
      this.dragEntry=entry
      entry.mesh.position.set(THREE.MathUtils.clamp(point.x,-4,4),.29,THREE.MathUtils.clamp(point.z,-4,4))
      this.dirty=true
    })
    this.renderer.domElement.addEventListener('pointerup', event => {
      this.pointers.delete(event.pointerId)
      if (!this.down || event.button !== 0) return
      const target = this.hit(event,Boolean(this.dragEntry))
      this.dragEntry=null
      const from=this.down
      this.down=null
      if (target && from.square !== target && this.currentSelected!==from.square && this.dragStart?.(from.square)) this.onSquare(from.square)
      if (target) this.onSquare(target)
    })
    this.renderer.domElement.addEventListener('pointercancel',event=>{this.pointers.delete(event.pointerId);this.down=null;this.dragEntry=null})
    this.renderer.domElement.addEventListener('dblclick',event=>{
      if (this.lookMode() || this.solitaire.visible) return
      const entry=this.stones.get(this.hit(event))
      if (!entry || this.preview) return
      this.focus = {target:entry.target.clone().add(new THREE.Vector3(0,.58,0)),
        camera:entry.target.clone().add(new THREE.Vector3(2.0,2.5,3.7))}
      this.dirty = true
    })
    this.renderer.domElement.addEventListener('pointerdown',()=>{ this.focus=null })
    this.resize = new ResizeObserver(() => {
      const {clientWidth:w,clientHeight:h} = host
      if (w && h) {
        this.dirty = true
        this.camera.aspect = w/h
        this.camera.fov = (this.camera.aspect < 1.10 ? 46 : 40)+(this.fovOffset || 0)
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(w,h)
        this.photoComposer?.setSize(w,h)
      }
    })
    this.resize.observe(host)
    this.setQuality('low')
    this.renderer.setAnimationLoop(time => {
      const frameLimit=this.frameLimit || (this.preview?36:this.quality==='low'?45:0)
      if (frameLimit && time-(this.lastFrame || 0)<1000/frameLimit-2) return
      if (!host.clientWidth || !host.clientHeight) return
      if (this.showcase && !this.reduced && !this.backdropPaused) this.controls.autoRotate = true
      else this.controls.autoRotate = false
      const elapsed = Math.min(.05,(time-(this.previousTime || time))/1000)
      this.previousTime=time
      if (!this.backdropPaused) this.time.value = this.reduced || !this.cosmetics ? 0 : time*.001
      if (this.mode==='roam' || this.mode==='photo') this.moveCamera(elapsed)
      if (this.focus) {
        this.controls.target.lerp(this.focus.target,.115)
        this.camera.position.lerp(this.focus.camera,.115)
        if (this.camera.position.distanceToSquared(this.focus.camera)<.002) this.focus=null
      }
      const cameraMoved = this.controls.enabled && this.controls.update(elapsed)
      const worldAnimated=this.world?.tick(elapsed,this.environmentMotion!==false && !this.reduced && !this.backdropPaused && !this.freezeWorld)
      if(this.world?.room && this.reflections!==false && this.quality!=='low' && (!this.preview || this.quality!=='medium')){
        const excluded=[this.table,this.solitaire,...[...this.stones.values()].map(value=>value.mesh),
          ...this.departing.map(value=>value.mesh),...this.effects.map(value=>value.burst)]
        if(this.world.capture(time,excluded,this.environmentMotion!==false?this.quality:'high')){
          this.scene.environment=this.world.target.texture
          this.scene.environmentIntensity=.78
          this.dirty=true
        }
      }
      this.constrainCamera()
      if(this.lookMode())this.roomListener?.(this.camera.position,this.yaw,time)
      if (this.solitaire.visible && !this.reduced) {
        this.soloMesh.rotation.y += elapsed*.32
        if(this.cosmetics)stepComponents(this.soloMesh.userData.components,this.time.value)
        if (this.soloMesh.userData.gear && this.cosmetics) this.soloMesh.userData.gear.rotation.y+=elapsed*1.1
        this.dirty=true
      }
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
        if (this.dragEntry===entry) continue
        if(this.cosmetics && !this.reduced)stepComponents(entry.mesh.userData.components,this.time.value,Boolean(entry.flight))
        if (entry.mesh.userData.gear && this.cosmetics && !this.reduced) entry.mesh.userData.gear.rotation.y+=elapsed*.74
        const flight = entry.flight
        if (flight && !this.reduced) {
          const t=Math.min(1,(time-flight.start)/flight.duration)
          const eased=t*t*(3-2*t)
          entry.mesh.position.lerpVectors(flight.from,entry.target,flight.style==='teleport' ? Number(t>.44) : eased)
          entry.mesh.position.y+=Math.sin(Math.PI*t)*flight.height
          const pulse=Math.sin(Math.PI*t)
          const factor=1-flight.shrink*pulse
          entry.mesh.scale.set(factor,flight.style==='liquid'?1+pulse*.43:factor,factor)
          if(flight.style==='mechanical')entry.mesh.rotation.y=flight.angle+Math.sin(t*9)*.062*pulse
          if(flight.style==='water')entry.mesh.rotation.y=flight.angle+pulse*.24
          if (t===1) {entry.flight=null;entry.mesh.scale.setScalar(1)}
          else moving=true
        } else {
          entry.mesh.scale.setScalar(1)
          if (this.reduced || this.motionSpeed==='instant') entry.mesh.position.copy(entry.target)
          else if (entry.mesh.position.distanceToSquared(entry.target)>.00001) {
            entry.mesh.position.lerp(entry.target,.27)
            moving=true
          } else entry.mesh.position.copy(entry.target)
        }
      }
      if (this.effects.length) this.updateEffects(time)
      if (this.dirty || cameraMoved || worldAnimated || moving || this.wasMoving || (this.animated && this.cosmetics && !this.reduced && !this.backdropPaused)) {
        this.lastFrame = time
        this.renderFrame()
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

  useLighting(quality) {
    this.wantsHDR=quality!=='low' && this.reflections!==false
    if(this.world?.room){
      this.scene.environment=this.wantsHDR && this.world.target && !this.world.pendingProbe?this.world.target.texture:this.roomLighting
      this.scene.environmentIntensity=this.wantsHDR?.78:.38
      return
    }
    this.scene.environment=this.wantsHDR && this.hdrLighting || this.roomLighting
    this.scene.environmentIntensity=this.scene.environment===this.roomLighting?.58:.49
    if(!this.wantsHDR || this.hdrLighting || this.loadingHDR) return
    this.loadingHDR=true
    new HDRLoader().load('/lighting/studio-small.hdr',texture=>{
      const generator=new THREE.PMREMGenerator(this.renderer)
      this.hdrLighting=generator.fromEquirectangular(texture).texture
      generator.dispose()
      texture.dispose()
      this.loadingHDR=false
      if(this.wantsHDR && !this.world?.room) {
        this.scene.environment=this.hdrLighting
        this.scene.environmentIntensity=.49
        this.dirty=true
      }
    },undefined,()=>{this.loadingHDR=false})
  }

  setQuality(quality) {
    this.useLighting(quality)
    this.dirty = true
    this.quality = quality
    const size = this.textureSize(quality)
    if (size && !this.woodMaps.has(size)) {
      this.woodMaps.set(size,null)
      new THREE.TextureLoader().load('/textures/walnut-'+size+'.webp', texture => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        this.woodMaps.set(size,texture)
        if (this.quality===quality && this.currentTheme) this.setTheme(...this.currentTheme)
      }, undefined, () => this.woodMaps.delete(size))
    }
    const settings = {low:[1,0],medium:[1.25,768],high:[1.5,1024],ultra:[2,1536],photo:[2.5,2048],custom:[1.5,1024]}
    const [ratio,defaultShadow] = settings[quality] || settings.high
    const shadow = this.shadows===false ? 0 : defaultShadow
    const pixelRatio=Math.min(devicePixelRatio,this.preview?Math.min(1.25,ratio):ratio)
    if(this.renderer.getPixelRatio()!==pixelRatio)this.renderer.setPixelRatio(pixelRatio)
    const photoRatio=quality==='low'?Math.min(pixelRatio,.65):pixelRatio
    if(this.photoComposer && this.photoPixelRatio!==photoRatio){
      this.photoPixelRatio=photoRatio
      this.photoComposer.setPixelRatio(photoRatio)
    }
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

  textureSize(quality) {
    if (this.textureQuality==='2k') return 2048
    if (this.textureQuality==='4k') return 4096
    if (this.textureQuality==='low') return 0
    return quality==='photo'?4096:quality==='ultra'?2048:0
  }

  setTheme(key, white, black, environment = key, collection = 'staunton', overrides = {}) {
    this.overrides=overrides
    this.animated=false
    this.collection = collection
    this.currentTheme = [key,white,black,environment,collection,overrides]
    this.finishes=[white,black]
    this.dirty = true
    const [light,dark,frame,type,pattern] = palettes[key] || palettes.walnut
    this.host.parentNode.style.setProperty('--light-square',light)
    this.host.parentNode.style.setProperty('--dark-square',dark)
    this.host.parentNode.style.setProperty('--stage',frame)
    this.textureFor = id => id==='wood' && this.woodMaps.get(this.textureSize(this.quality)) || this.textures[id]
    const textureFor = this.textureFor
    this.animated=Boolean(pattern) || collection==='mechanical'
    this.squareMaterials.forEach((material,index) => {
      const map = this.variedTexture(textureFor(type),index)
      material.color.set(index<4?light:dark).multiplyScalar(.98+(index%4)*.025)
      material.map = map
      material.bumpMap = map
      material.bumpScale = type==='stone' ? .022 : .009
      material.envMapIntensity = this.reflections ? 1.1 : .35
      material.metalness = ['liquid','mechanical','celestial'].includes(pattern)?.43:.03
      animateSurface(material,pattern,this.time)
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
    this.lightWorld(environment,this.lightingStyle)
    ;[white,black].forEach((finish,i)=>this.styleMaterial(this.materials[i],finish,i))
    for (const [key,material] of this.detailMaterials) {
      const [side,type]=key.split(':')
      const spec=this.spec(type,side)
      this.styleMaterial(material,spec.material,side==='w'?0:1,spec)
    }
    for (const [key,material] of this.accentMaterials) {
      const [side,type]=key.split(':')
      const spec=this.spec(type,side)
      this.styleMaterial(material,spec.secondary || 'brass',side==='w'?0:1)
    }
  }

  spec(type,color) {
    const detail=this.overrides?.[color]?.[type] || {}
    return {collection:this.collection,material:this.finishes?.[color==='w'?0:1],...detail}
  }

  styleMaterial(material,finish,index,spec={}) {
    const [color,metalness,roughness,map,transmission=0,pattern] = finishes[finish] || finishes[index?'ebony':'ivory']
    Object.assign(material,{metalness:spec.metalness ?? metalness,roughness:spec.roughness ?? roughness,
      envMapIntensity:(spec.reflection ?? 1)*(this.reflections===false?.26:1),
      transmission,thickness:.34,ior:1.46,anisotropy:metalness>.6?.26:0,
      clearcoat:finish==='stone'?.15:.66,map:this.textureFor(map) || null,
      bumpMap:this.textureFor(map) || null,bumpScale:.014})
    material.color.set(spec.tint || color)
    const emissive=spec.emissive || (finish==='holographic' ? 0x157a7e : 0)
    material.emissive.set(emissive)
    material.emissiveIntensity=emissive?.26:0
    animateSurface(material,pattern,this.time)
    material.needsUpdate = true
    this.animated ||= Boolean(pattern)
  }

  materialFor(type,color,spec) {
    const override=this.overrides?.[color]?.[type]
    if (!override) return this.materials[color==='w'?0:1]
    const key=color+':'+type
    if (!this.detailMaterials.has(key)) {
      const material=new THREE.MeshPhysicalMaterial({clearcoatRoughness:.2,vertexColors:true})
      this.styleMaterial(material,spec.material,color==='w'?0:1,spec)
      this.detailMaterials.set(key,material)
    }
    return this.detailMaterials.get(key)
  }

  createPiece(type,color,spec) {
    const group=new THREE.Group()
    const model=new THREE.Mesh(pieceGeometry(type,spec.collection,spec.base,this.geometryQuality),this.materialFor(type,color,spec))
    model.castShadow = model.receiveShadow = true
    const pad=new THREE.Mesh(feltGeometry,felt)
    pad.position.y=.003
    if (type==='p') pad.scale.set(.82,1,.82)
    group.add(model,pad)
    if(immersiveEditions[spec.collection]){
      const component=pieceComponents(immersiveEditions[spec.collection],type)
      group.add(component.rotor)
      group.userData.components=component
      this.animated=true
    }
    if (spec.secondary || spec.collection==='mechanical') {
      const key=color+':'+type
      if (!this.accentMaterials.has(key)) {
        const material=new THREE.MeshPhysicalMaterial()
        this.styleMaterial(material,spec.secondary || 'brass',color==='w'?0:1)
        this.accentMaterials.set(key,material)
      }
      const accent=new THREE.Mesh(this.accentGeometry,this.accentMaterials.get(key))
      accent.position.y=.194
      accent.scale.setScalar(type==='p'?.82:1)
      group.add(accent)
      if (spec.collection==='mechanical') {
        const gear=new THREE.Mesh(gearGeometry,this.accentMaterials.get(key))
        gear.position.y=.31
        gear.scale.setScalar(type==='p'?.78:1)
        group.add(gear)
        group.userData.gear=gear
        this.animated=true
      }
    }
    if (spec.engraving && spec.engraving!=='none') {
      const key=spec.engraving
      if (!this.engravings.has(key)) {
        const canvas=document.createElement('canvas')
        canvas.width=256; canvas.height=32
        const ctx=canvas.getContext('2d')
        ctx.font='bold 18px Georgia'
        ctx.textBaseline='middle'
        ctx.fillStyle='#d6b877'
        ctx.fillText(key==='diamond'?'◆    ◆    ◆    ◆    ◆    ◆    ◆    ◆':'♛    ♛    ♛    ♛    ♛    ♛    ♛',3,16)
        const tex=new THREE.CanvasTexture(canvas)
        tex.colorSpace=THREE.SRGBColorSpace
        this.engravings.set(key,new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.02,depthWrite:false}))
      }
      const engraving=new THREE.Mesh(engravingBand,this.engravings.get(key))
      engraving.position.y=.071
      if(type==='p') engraving.scale.set(.82,1,.82)
      group.add(engraving)
    }
    return group
  }

  async setWorld(environment,table,detail,lighting) {
    const profile=locationFor(environment)
    this.worldOptions={environment:profile.id,table,detail,lighting}
    const signature=profile.id+':'+detail
    this.worldRequest ||= import('./worlds/runtime.js').then(({WorldStage})=>{
      this.world=new WorldStage(this.scene,this.renderer,active=>{
        const options=this.worldOptions
        if(options.environment!==active)return
        this.lightWorld(active,options.lighting)
        this.world.table(options.table,options.detail)
        if(this.world.furniture)this.world.furniture.root.visible=!this.solitaire.visible
        this.useLighting(this.quality)
        this.host.dataset.world=active
        this.host.dataset.worldState='ready'
        this.dirty=true
      })
      return this.world
    })
    if(this.world?.signature!==signature)this.host.dataset.worldState='loading'
    const world=await this.worldRequest
    if(this.worldOptions.environment!==profile.id || this.worldOptions.detail!==detail)return
    if(world.signature===signature && world.room && world.profile.id===profile.id && world.detail===detail){
      world.table(table,detail)
      if(world.furniture)world.furniture.root.visible=!this.solitaire.visible
      this.lightWorld(profile.id,lighting)
      this.dirty=true
      return
    }
    try { await world.load(profile.id,detail) }
    catch(error){
      if(this.worldOptions.environment===profile.id)this.host.dataset.worldState='error'
      console.error('Could not load 3D location',error)
    }
  }

  lightWorld(environment,setting='natural') {
    this.lightingStyle=setting
    const profile=locationFor(environment)
    const tint={warm:0xffc697,cool:0x9acbff,studio:0xf4eee7}[setting] || profile.light
    this.key.color.setHex(tint)
    this.key.position.set(environment==='neon'?-9:-6,12,-12)
    this.key.intensity=setting==='studio'?3.08:environment==='cabin'?2.63:environment==='neon'?2.51:2.68
    this.fill.color.setHex(profile.light)
    this.fill.intensity=environment==='neon'||environment==='orbit'?1.12:1.44
  }

  inspectPiece(type='n',color='w') {
    if (this.soloMesh) this.solitaire.remove(this.soloMesh)
    this.soloMesh=this.createPiece(type,color,this.spec(type,color))
    this.soloMesh.rotation.y=.42
    this.solitaire.add(this.soloMesh)
    this.solitaire.visible=true
    this.table.visible=false
    if(this.world?.furniture)this.world.furniture.root.visible=false
    for (const entry of this.stones.values()) entry.mesh.visible=false
    if (this.mode!=='specimen') this.reset('specimen')
    this.dirty=true
  }

  showBoard() {
    this.solitaire.visible=false
    this.table.visible=true
    if(this.world?.furniture)this.world.furniture.root.visible=true
    for (const entry of this.stones.values()) entry.mesh.visible=true
    this.dirty=true
  }

  lookMode() { return this.mode==='roam' || this.mode==='seated' || this.mode==='photo' }

  updateLook() {
    this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ')
    this.dirty=true
  }

  moveCamera(dt) {
    const forward=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw))
    const sideways=new THREE.Vector3().crossVectors(forward,THREE.Object3D.DEFAULT_UP).normalize()
    const vertical=Number(this.keys.has('KeyW'))-Number(this.keys.has('KeyS'))
    const horizontal=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'))
    const desired=forward.multiplyScalar(vertical).addScaledVector(sideways,horizontal).normalize().multiplyScalar(this.mode==='photo'?6.2:4.9)
    this.walkSpeed ||= new THREE.Vector3()
    this.walkSpeed.lerp(desired,1-Math.exp(-dt*11))
    if (this.walkSpeed.lengthSq()<.001) return
    const p=this.camera.position
    const x=p.x+this.walkSpeed.x*dt, z=p.z+this.walkSpeed.z*dt
    if (!this.world || this.world.canWalk(x,p.z))p.x=x
    if (!this.world || this.world.canWalk(p.x,z))p.z=z
    this.dirty=true
  }

  constrainCamera() {
    if (this.mode==='specimen' || !this.world)return
    const p=this.camera.position
    const before=p.clone()
    this.world.bound(p,this.mode==='roam')
    if(this.controls.enabled && !p.equals(before)) {
      this.controls.target.add(p.clone().sub(before))
      this.camera.lookAt(this.controls.target)
    }
  }

  reset(mode = 'angled', flipped = false) {
    this.mode=mode
    this.host.dataset.camera=mode
    this.lookDrag=null
    this.walkSpeed?.setScalar(0)
    this.down=null
    this.dragEntry=null
    this.focus=null
    this.keys.clear()
    this.dirty = true
    const poses={
      low:[3.3,6.4,14.4,0,.12,0],board:[4.1,2.9,13,0,.12,0],overhead:[0,14,.01,0,.12,0],
      close:[3.7,3.6,6.2,0,.12,2.1],roam:[7,1.61,9,0,1.05,0],photo:[6.6,3.6,9.2,0,.6,0],
      seated:[0,1.8,6.95,0,.28,-2.3],showcase:[3.15,9.1,14,0,.12,0],
      hero:[5.3,6.8,11.6,0,.12,0],specimen:[1.15,1.15,2.55,0,.68,0],
    }
    const [x,y,z,tx,ty,tz]=poses[mode] || [0,10.9,11.6,0,.12,0]
    this.camera.position.set(x,y,z*(flipped?-1:1))
    this.controls.target.set(tx,ty,tz*(flipped?-1:1))
    this.controls.minDistance = mode==='specimen' ? 1.35 : 4.3
    this.controls.maxDistance = mode==='specimen' ? 6 : 29
    this.controls.maxPolarAngle = mode==='specimen' ? 1.72 : mode==='roam' ? 1.80 : 1.52
    this.controls.enabled=!this.lookMode()
    this.controls.enablePan=mode!=='specimen'
    this.controls.mouseButtons.LEFT=mode==='specimen'?THREE.MOUSE.ROTATE:null
    this.controls.touches.ONE=mode==='specimen'?THREE.TOUCH.ROTATE:null
    this.showcase = ['showcase','hero'].includes(mode)
    this.controls.autoRotate=false
    this.camera.lookAt(this.controls.target)
    if(this.lookMode()){
      const euler=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ')
      this.pitch=euler.x
      this.yaw=euler.y
    }else this.controls.update()
  }

  async photograph() {
    if(this.mode==='photo' && this.photoAperture)await this.photoPipeline
    this.renderFrame()
    return new Promise(resolve=>this.renderer.domElement.toBlob(resolve,'image/png'))
  }

  renderFrame() {
    if (this.mode==='photo' && this.photoAperture && this.photoComposer) {
      this.photoBokeh.uniforms.aperture.value=this.photoAperture*.0013
      this.photoBokeh.uniforms.focus.value=this.photoFocus
      this.photoComposer.render()
    } else this.renderer.render(this.scene,this.camera)
  }

  async depthOfField(aperture,focus) {
    this.photoAperture=aperture
    this.photoFocus=focus
    this.dirty=true
    if (!aperture || this.photoComposer) return
    this.photoPipeline ||= Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/BokehPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]).then(([{EffectComposer},{RenderPass},{BokehPass},{OutputPass}])=>{
      this.photoComposer=new EffectComposer(this.renderer)
      const ratio=this.renderer.getPixelRatio()
      this.photoPixelRatio=this.quality==='low'?Math.min(ratio,.65):ratio
      this.photoComposer.setPixelRatio(this.photoPixelRatio)
      this.photoBokeh=new BokehPass(this.scene,this.camera,{maxblur:.012})
      this.photoComposer.addPass(new RenderPass(this.scene,this.camera))
      this.photoComposer.addPass(this.photoBokeh)
      this.photoComposer.addPass(new OutputPass())
    }).catch(error=>{
      this.photoPipeline=null
      throw error
    })
    await this.photoPipeline
    this.dirty=true
  }

  rayFor(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    this.ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),this.camera)
    return this.ray.ray
  }

  hit(event,dragging=false) {
    this.rayFor(event)
    if(!dragging){
      const figures=this.ray.intersectObjects([...this.stones.values()].map(piece=>piece.mesh),true)
      for(let object=figures[0]?.object;object && object!==this.scene;object=object.parent){
        if(object.userData.square)return object.userData.square
      }
    }
    const point=this.ray.ray.intersectPlane(this.boardPlane,new THREE.Vector3())
    if (point && Math.abs(point.x)<4 && Math.abs(point.z)<4) return squareAt(Math.floor(point.x+4),Math.floor(point.z+4))
  }

  animateCapture(entry) {
    if (this.reduced || this.motionSpeed==='instant') return this.scene.remove(entry.mesh)
    const from = entry.mesh.position.clone()
    const to = new THREE.Vector3(from.x<0?-5.2:5.2,-.3,from.z)
    this.departing.push({from,to,mesh:entry.mesh,started:performance.now()})
    const style=this.captureEffect==='auto' ? immersiveEditions[this.spec(entry.type,entry.color).collection]?.effect || 'gold' : this.captureEffect
    if (this.captureIntensity!==0 && style && style!=='none' && this.cosmetics && this.particles!==false) {
      const color={gold:0xe1b86b,crystal:0xa7d9e5,signal:0x70a0f4,ember:0xc86741,cosmic:0xbdabff,water:0x81dadd,clockwork:0xc69a59,shadow:0x52577b}[style]
      const geometry=new THREE.BufferGeometry()
      const points=new Float32Array(3*Math.max(3,Math.round(18*(this.captureIntensity ?? 1))))
      geometry.setAttribute('position',new THREE.BufferAttribute(points,3))
      const material=new THREE.PointsMaterial({color,size:.085,transparent:true,depthWrite:false,opacity:.7})
      const burst=new THREE.Points(geometry,material)
      burst.position.copy(from)
      burst.position.y+=.18
      this.scene.add(burst)
      this.effects.push({burst,points,start:performance.now(),style})
    }
  }

  updateEffects(time) {
    this.dirty=true
    for(let i=this.effects.length-1;i>=0;i--) {
      const {burst,points,start,style}=this.effects[i]
      const t=Math.min(1,(time-start)/420)
      for(let j=0;j<points.length/3;j++) {
        const angle=j*2.39996
        const range=.15+t*((style==='water'?1.12:.68)+(j%4)*.13)
        points[j*3]=Math.cos(angle)*range
        points[j*3+1]=Math.sin(t*2.3)*(style==='water'?.075:.21+(j%5)*.074)
        points[j*3+2]=Math.sin(angle)*range
      }
      burst.geometry.attributes.position.needsUpdate=true
      burst.material.opacity=(1-t)*.68
      if(t===1 || this.reduced) {
        this.scene.remove(burst);burst.geometry.dispose();burst.material.dispose()
        this.effects.splice(i,1)
      }
    }
  }

  clearVisualMotion() {
    for(const entry of this.stones.values())entry.flight=null
    for(const {mesh} of this.departing)this.scene.remove(mesh)
    this.departing.length=0
    for(const {burst} of this.effects){
      this.scene.remove(burst)
      burst.geometry.dispose()
      burst.material.dispose()
    }
    this.effects.length=0
  }

  fly(entry) {
    if (!entry) return
    const spec=this.spec(entry.type,entry.color)
    const style=spec.motion || (this.moveStyle==='auto'?immersiveEditions[spec.collection]?.motion:this.moveStyle) || 'glide'
    const properties={glide:[245,.13,0],lift:[285,.39,0],cinematic:[345,.31,.04],
      teleport:[175,.06,.89],liquid:[275,.2,.26],hologram:[230,.14,.72],dissolve:[255,.13,.59],mechanical:[205,.12,.05],cosmic:[310,.28,.14],water:[240,.06,.10],shadow:[255,.09,.54],royal:[338,.31,.08]}
    const [duration,height,shrink]=properties[style] || properties.glide
    const speed={instant:0,fast:.61,normal:1,cinematic:1.46}[this.motionSpeed] ?? 1
    if(!speed || this.reduced){entry.flight=null;return}
    const intensity=this.motionIntensity ?? 1
    entry.flight={style,from:entry.mesh.position.clone(),start:performance.now(),duration:duration*speed,
      height:(height+(entry.type==='n'?.12:0))*intensity,shrink:shrink*intensity,angle:entry.mesh.rotation.y}
  }

  render(chess,selected,legal,last,animate,visible) {
    const fen=chess.fen?.()
    const reconciled=fen && this.displayedFen && this.displayedFen!==fen && !animate
    if (reconciled) this.clearVisualMotion()
    if(fen)this.displayedFen=fen
    this.currentSelected=selected
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
        if (rook) { this.stones.set(rookTo,rook); this.fly(rook) }
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
      this.fly(old)
    }
    const active = new Set()
    for (const piece of chess.board().flat().filter(Boolean)) {
      const {square,type,color} = piece
      active.add(square)
      let entry = this.stones.get(square)
      const spec=this.spec(type,color)
      const visual=JSON.stringify(spec)+this.geometryQuality
      if (!entry || entry.type !== type || entry.color !== color || entry.visual !== visual) {
        const oldPosition=entry?.mesh.position.clone()
        const promotionFlight=animate && last?.promotion===type && square===last.to ? entry?.flight : null
        if (entry) this.scene.remove(entry.mesh)
        const mesh=this.createPiece(type,color,spec)
        if (type === 'n') mesh.rotation.y = color === 'w' ? -.38 : Math.PI-.38
        mesh.position.copy(oldPosition || position(square))
        mesh.visible=!this.solitaire.visible
        this.scene.add(mesh)
        entry = {mesh,type,color,visual,target:position(square),flight:promotionFlight}
        this.stones.set(square,entry)
      }
      entry.mesh.userData.square = square
      entry.target.copy(position(square)).setY(square===selected ? .29 : .10)
      if(reconciled)entry.mesh.position.copy(entry.target)
    }
    for (const [square,entry] of this.stones) if (!active.has(square)) {
      this.scene.remove(entry.mesh)
      this.stones.delete(square)
    }
    for (const [square,mark] of this.markers) {
      const piece = chess.get(square)
      const inCheck = piece?.type === 'k' && piece.color === chess.turn() && chess.isCheck()
      const hint={blue:0x77baf1,gold:0xe4bf70,green:0x85c8a2}[this.highlight] || 0x85c8a2
      const color = inCheck ? 0xc85150 : square === selected ? hint : legal.includes(square) ? hint
        : last && [last.from,last.landing || last.to].includes(square) ? 0xe6ad4f : visible && !visible.has(square) ? 0x10121b : null
      mark.visible = color !== null
      mark.material.opacity = visible && !visible.has(square) ? .82 : .48
      if (color !== null) mark.material.color.setHex(color)
      mark.geometry=legal.includes(square)?(piece?this.captureMarker:this.moveMarker):this.squareMarker
    }
  }
}
