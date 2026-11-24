const timbres={
  wood:{type:'triangle',pitch:168,end:68,tail:.14},
  stone:{type:'triangle',pitch:428,end:115,tail:.11},
  metal:{type:'sine',pitch:1010,end:740,tail:.19},
  glass:{type:'sine',pitch:1570,end:1290,tail:.23},
  ui:{type:'sine',pitch:290,end:205,tail:.063},
}
let context, ambience
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
    if(ambience) { ambience.source.stop();ambience=null }
    return
  }
  const frequency={rain:750,neon:470,cabin:190,orbit:110,underwater:170,tropical:430,castle:380}
  if(ambience?.environment!==environment) {
    if(ambience) ambience.source.stop()
    const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate)
    const channel=buffer.getChannelData(0)
    let sample=0
    for(let i=0;i<channel.length;i++){
      sample=.74*sample+.26*(Math.random()*2-1)
      channel[i]=sample
    }
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain()
    gain.gain.value=0
    filter.type='lowpass'
    filter.frequency.value=frequency[environment] || 125
    source.buffer=buffer
    source.loop=true
    source.connect(filter).connect(gain).connect(context.destination)
    source.start()
    ambience={source,gain,environment}
  }
  ambience.gain.gain.setTargetAtTime(volume*.0016,context.currentTime,.25)
}
