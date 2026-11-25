const timbres={
  wood:{type:'triangle',pitch:168,end:68,tail:.14},
  stone:{type:'triangle',pitch:428,end:115,tail:.11},
  metal:{type:'sine',pitch:1010,end:740,tail:.19},
  glass:{type:'sine',pitch:1570,end:1290,tail:.23},
  ui:{type:'sine',pitch:290,end:205,tail:.063},
}
let context, ambience
const profiles={
  cabin:{cutoff:370,crackle:.11,x:-14.6,z:-16.8},
  neon:{cutoff:760,rhythm:.34,x:5,z:-22},
  rain:{cutoff:1050,rhythm:.63,x:4,z:-22},
  manor:{cutoff:620,crackle:.17,x:-14.6,z:-16.8},
  orbit:{cutoff:130,pitch:54,x:13.9,z:-12.8},
  underwater:{cutoff:110,rhythm:.25,x:0,z:-22},
  tropical:{cutoff:670,rhythm:.56,x:0,z:-22},
  yacht:{cutoff:585,rhythm:.64,x:0,z:-22},
  pool:{cutoff:860,rhythm:.74,x:4,z:-17},
  workshop:{cutoff:380,pitch:72,crackle:.07,x:-12,z:-13},
  volcano:{cutoff:190,crackle:.20,x:0,z:-21},
  forest:{cutoff:550,rhythm:.35,x:-9,z:-17},
  jade:{cutoff:940,rhythm:.74,x:10,z:-15},
  antarctic:{cutoff:420,rhythm:.25,x:0,z:-22},
  aurora:{cutoff:310,rhythm:.22,x:0,z:-22},
}
export function playSound(kind,volume,impact=false) {
  if(!volume)return
  try {
    context ||= new AudioContext()
    if(context.state==='suspended') context.resume().catch(()=>{})
    const {type,pitch,end,tail}=timbres[kind] || timbres.wood
    const time=context.currentTime
    const gain=context.createGain()
    gain.gain.setValueAtTime(.001,time)
    gain.gain.exponentialRampToValueAtTime(Math.max(.002,volume*(impact?.0019:.0012)),time+.006)
    gain.gain.exponentialRampToValueAtTime(.001,time+tail)
    gain.connect(context.destination)
    for(const factor of [1,kind==='wood'?1.57:2.31]){
      const osc=context.createOscillator()
      osc.type=type
      osc.frequency.setValueAtTime(pitch*factor*(impact?.72:1),time)
      osc.frequency.exponentialRampToValueAtTime(end*factor,time+tail)
      const part=context.createGain()
      part.gain.value=factor===1?1:.14
      osc.connect(part).connect(gain)
      osc.start(time)
      osc.stop(time+tail+.012)
    }
  } catch {}
}
export function roomSound(environment,volume) {
  if (!context || context.state!=='running' || !volume) {
    stopRoomSound()
    return
  }
  if(ambience?.environment!==environment) {
    stopRoomSound()
    const profile=profiles[environment] || {cutoff:225,rhythm:.27,x:0,z:-20}
    const buffer=context.createBuffer(1,context.sampleRate*9,context.sampleRate)
    const channel=buffer.getChannelData(0)
    let sample=0,pop=0
    for(let i=0;i<channel.length;i++){
      sample=.74*sample+.26*(Math.random()*2-1)
      if(profile.crackle && Math.random()<.00041)pop=profile.crackle*(.3+Math.random()*.7)
      pop*=.991
      const phase=i/channel.length*2*Math.PI
      const swell=profile.rhythm ? .64+profile.rhythm*.42*Math.sin(phase*2+.4*Math.sin(phase)) : .8
      const hum=profile.pitch ? Math.sin(phase*profile.pitch*9)*.116 : 0
      channel[i]=sample*swell+hum+pop*(Math.random()*2-1)
    }
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain()
    const pan=context.createStereoPanner()
    gain.gain.value=0
    filter.type='lowpass'
    filter.frequency.value=profile.cutoff
    source.buffer=buffer
    source.loop=true
    source.connect(filter).connect(pan).connect(gain).connect(context.destination)
    source.start()
    ambience={source,gain,environment,pan,profile,volume,last:-Infinity}
  }
  ambience.volume=volume
  ambience.gain.gain.setTargetAtTime(volume*.0018,context.currentTime,.25)
}

function stopRoomSound() {
  if(!ambience)return
  const track=ambience
  ambience=null
  const time=context.currentTime
  track.gain.gain.setTargetAtTime(0,time,.06)
  track.source.stop(time+.3)
  track.source.onended=()=>{track.source.disconnect();track.pan.disconnect();track.gain.disconnect()}
}

export function updateRoomListener(position,yaw,time) {
  if(!ambience || time-ambience.last<100)return
  ambience.last=time
  const x=ambience.profile.x-position.x,z=ambience.profile.z-position.z
  const distance=Math.max(1,Math.hypot(x,z))
  const pan=Math.max(-.85,Math.min(.85,(x*Math.cos(yaw)-z*Math.sin(yaw))/distance))
  ambience.pan.pan.setTargetAtTime(pan,context.currentTime,.13)
  ambience.gain.gain.setTargetAtTime(ambience.volume*.0026/(1+distance*.035),context.currentTime,.19)
}
