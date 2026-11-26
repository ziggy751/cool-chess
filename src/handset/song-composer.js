export const genres={
  rap:['Brainrot rap',94,[0,3,5,7],[0,3,7,10],[0,1.75,2.5],.62],
  phonk:['Ridiculous phonk',144,[0,7,5,3],[0,3,7,10],[0,1.5,2,3.25],.48],
  country:['Comedy country',104,[0,5,7,0],[0,4,7,9],[0,2],.29],
  hardstyle:['Absurd hardstyle',154,[0,8,3,10],[0,3,7,12],[0,1,2,3],.93],
  electro:['Goofy electronic',126,[0,3,8,5],[0,3,7,10],[0,1,2.5,3],.57],
  theatre:['Weird musical theatre',106,[0,5,2,7],[0,4,7,11],[0,2,3.5],.21],
  battle:['Fictional NPC rap battle',103,[0,1,5,3],[0,3,6,10],[0,1.75,2.75],.67],
  opera:['Object opera',84,[0,5,8,7],[0,3,7,12],[0,2],.13],
  christmas:['Funny Christmas songs',116,[0,5,0,7],[0,4,7,12],[0,2.5,3.5],.28],
  dance:['Nonsensical dance',131,[0,5,2,7],[0,4,7,10],[0,1,2,3],.55],
}
const stories=[
  ['Jupiter Has My Microwave','Orbital Kev','The pantry received a transmission.',
    ['There is no socket on the moon','My lunch is floating round the room','Set it to Pluto, count to nine','My soup will orbit right on time']],
  ['The Ibis Stole My Chips','Snack Inspector','A food-court detective takes their first case.',
    ['The ibis took my chips at noon','It left a ticket and a spoon','I asked for change, it gave a nod','My lunch is in a lost-and-found']],
  ['My Fridge Is Rated 1200','Cold Unit','A fridge enters its first chess tournament.',
    ['The fridge was cold when it arrived','It saved those leftovers on move five','It took my rook, then offered brie','The draw was served at half past three']],
  ['The Knight Walks Sideways','Parcel Knight','A chess piece gets directions from a GPS.',
    ['This horse forgot the letter L','It asked the pawn which way to spell','It took a cab to square E eight','The bishop said please pay that fare']],
  ['My Toaster Is the CEO','Crumb Council','The kitchen appliances hold an emergency board meeting.',
    ['The toaster called a boardroom vote','The kettle took the meeting notes','The jam resigned at half past two','We pay in crumbs when rent is due']],
  ['Trolley at the Finish Line','Aisle Six','A runaway trolley enters a Grand Prix.',
    ['A trolley won the race downtown','It never put its basket down','It wants a trophy full of bread','The front-wheel squeak goes round my head']],
  ['The Moon Forgot the Password','Night Router','Mission control tries to connect the moon to guest Wi-Fi.',
    ['The moon forgot the login code','It rang us from a country road','We put the cheese on airplane mode','Then watched the router overload']],
  ['Christmas in Checkout Four','Pip and the Receipts','An elf has accidentally wrapped the exit.',
    ['We wrapped the shop in silver foil','And hid the register in oil','The snowman brought a shopping list','We wrapped that too, he said we missed']],
  ['Pawn for the Crown','Pawn Council','A pawn shows up to the board dressed for a coronation.',
    ['My pawn has got a paper crown','It wants a palace built downtown','It marched ahead and rang a bell','The queen said you can move as well']],
  ['Penguin LAN Party','Penguin Network','A snowstorm brings down the penguin arcade.',
    ['A penguin built a gaming rig','The case was never quite that big','It plugged a fish into the wall','And beat us in the grand snow brawl']],
  ['Keyboard Ate My Homework','Campus Pixel','A keyboard submits an essay on why it swallowed the space bar.',
    ['My keyboard ate my homework sheet','It hid beneath the teacher seat','I pressed escape and heard it chew','Now every letter sounds like glue']],
  ['Bananas on the News','Channel Zero','Tonight’s breaking story is an unripe banana.',
    ['A yellow guest came on the news','It blamed the desk and broke the cues','The weather said a peel might fall','We put a helmet on the wall']],
  ['A Sofa with a Passport','Gate Agent Zero','An oversized sofa wants a window seat.',
    ['The sofa bought a window seat','It checked a rug beneath its feet','The pilot asked to see its tag','It showed a very large bean bag']],
  ['Soup for the Robot','Twelve Bit Choir','A robot tries soup for the first time.',
    ['A robot ordered soup tonight','It tried to make the broth too bright','The waiter said to dim the beam','The soup got up to join the team']],
  ['A Duck at City Hall','Big Quack','A duck prepares a very short election speech.',
    ['The duck walked into city hall','It took a bath against the wall','Its speech was only one loud quack','The mayor clapped and gave it back']],
  ['Spare Parts for Tuesday','Dayshift Choir','The repair department tries to fix the week.',
    ['We sent our Tuesday for repairs','It came back wearing garden chairs','The week got stuck in Monday noon','Now Friday only plays the tune']],
  ['My Lock Plays London','Latch and Five-Pin','An object duel ends in a dispute over a pawn structure.',
    ['My spare key trained for forty days','It learned the rook has seven ways','The padlock opened with a pawn','We played until the hinges yawned']],
  ['I Sorted All the Socks','Sock League Orchestra','The everyday athletics finals get a radio single.',
    ['The crowd was quiet at the start','I knew the left socks all by heart','Two ankles crossed the finish line','They both were technically mine']],
  ['Yamwell Clicked Decline','Aero Desktop Choir','The office replaces the entire workstation with a glossy potato.',
    ['The yam has joined a video call','It signed in through a bathroom wall','I asked it please to share the screen','It sent a gently glowing bean']],
  ['Spin Cycle Soundcheck','The Basement Philharmonic','A washing machine accidentally headlines the concert.',
    ['The washing drum was tuned to D','It spun a sock and lost the key','The audience made such a sound','The dryer asked for one more round']],
]
export const concepts=stories.map(([title,voice,summary])=>({title,voice,summary}))
export const demo={seed:0,genre:'phonk',concept:0}
const rate=22050
const tau=Math.PI*2
const hz=note=>440*2**((note-69)/12)
function rng(seed){
  let state=(seed+471615)|0
  return ()=>{state=Math.imul(1664525,state)+1013904223|0;return (state>>>0)/4294967296}
}
export function describe(descriptor){
  const {seed,genre,concept}=descriptor
  const [title,voice,summary,lyrics]=stories[concept%stories.length]
  const [style,bpm]=genres[genre]
  const beat=60/bpm
  return {id:genre+'-'+concept+'-'+seed,seed,genre,concept,title,voice,summary,style,bpm,duration:56*beat+1.8,
    lyrics:[{at:8*beat,text:lyrics[0]},{at:12*beat,text:lyrics[1]},{at:24*beat,text:lyrics[2]},
      {at:28*beat,text:lyrics[3]},{at:40*beat,text:lyrics[0]},{at:44*beat,text:lyrics[3]}]}
}
const vowelFormants={a:[790,1300,2600],e:[500,1850,2550],i:[310,2280,3050],o:[500,970,2450],u:[340,800,2050],y:[360,1990,2900]}
const clip=value=>Math.tanh(value)
export function compose(descriptor,progress=()=>{}){
  const info=describe(descriptor)
  const [,,,chord,kickSteps,weight]=genres[descriptor.genre]
  const roots=genres[descriptor.genre][2]
  const random=rng(descriptor.seed),beat=60/info.bpm,key=39+Math.floor(random()*14)
  const left=new Float32Array(Math.floor(info.duration*rate)),right=new Float32Array(left.length)
  const offset=time=>Math.floor(time*rate)
  function instrument(time,length,midi,amount,kind,pan=0,vowel='a'){
    const start=offset(time),end=Math.min(left.length,start+offset(length)),f=hz(midi)
    const positionL=Math.sqrt((1-pan)/2),positionR=Math.sqrt((1+pan)/2)
    let smooth=0
    const formants=vowelFormants[vowel] || vowelFormants.a
    const throat=kind==='vocal'?Array.from({length:Math.min(18,Math.floor(3300/f))},(_,index)=>{
      const h=index+1
      const strength=formants.reduce((sum,formant,i)=>sum+Math.exp(-(((h*f-formant)/(150+i*98))**2))*(1-i*.26),0)
      return (strength+.08)/Math.sqrt(h)
    }):null
    for(let i=start;i<end;i++){
      const t=(i-start)/rate,phase=tau*f*t
      const e=Math.min(1,t/(kind==='pad'?.16:.018),(length-t)/.10)
      const noise=kind==='hat' || kind==='snare'?random()*2-1:0
      let value
      switch(kind){
        case 'kick':
          value=Math.sin(tau*(45*t+48*(1-Math.exp(-t*34))/34))*Math.exp(-t*(9+weight*7))
          value=clip(value*(1+weight*4))
          break
        case 'hat':
          value=(noise-smooth)*Math.exp(-t*46)
          smooth=smooth*.75+noise*.25
          break
        case 'snare':
          value=(noise*.72+Math.sin(tau*161*t)*.29)*Math.exp(-t*21)
          break
        case 'bass':
          value=clip(Math.sin(phase)*1.75+Math.sin(2*phase+.6)*weight)*Math.exp(-t*1.2)
          break
        case 'pad':
          value=(Math.sin(phase)+.34*Math.sin(phase*1.998)+.26*Math.sin(phase*.993))*.60
          break
        case 'vocal': {
          const vibrato=Math.sin(tau*5.8*t)*.048*Math.min(1,t*7)
          value=throat.reduce((sum,amplitude,h)=>sum+amplitude*Math.sin((phase+vibrato)*(h+1)),0)*.5
          break
        }
        default:
          value=Math.sin(phase+Math.sin(phase*(weight>.4?1.5:2))*1.3*Math.exp(-t*6))*Math.exp(-t*(2.4+weight))
      }
      value*=Math.max(0,e)*amount
      left[i]+=value*positionL;right[i]+=value*positionR
    }
  }
  const motif=[0,1,2,1,3,2,1,0].map((step,i)=>chord[(step+(descriptor.seed%3 && i>3?1:0))%chord.length])
  for(let bar=0;bar<14;bar++){
    const at=bar*4*beat,root=key+roots[bar%roots.length]
    const drop=bar>=6 && bar<=8 || bar===10 || bar===11
    const quiet=bar<2 || bar===9 || bar===13
    const intro=bar<2
    for(let i=0;i<3;i++)instrument(at,beat*4.1,root+12+chord[i],quiet?.17:.113,'pad',-.55+i*.55)
    for(const step of (drop?[0,.75,1.5,2.25,3.25]:[0,2])){
      if(!intro)instrument(at+step*beat,beat*(drop?.65:1.9),root+(step===2.25?12:0),drop?.45:.26,'bass')
    }
    for(let i=0;i<(drop?8:4);i++){
      const part=at+i*beat*(drop?.5:1),note=key+24+motif[(i+bar)%motif.length]
      instrument(part,beat*.77,note,drop?.20:.15,'lead',i%2?.31:-.31)
      if(drop)instrument(part+beat*.75,beat*.61,note,.065,'lead',i%2?-.70:.70)
    }
    if(!quiet){
      for(const step of kickSteps)instrument(at+step*beat,.29,40,.58,'kick')
      for(const step of (weight>.63?[2]:[1,3]))instrument(at+step*beat,.19,42,.25,'snare',-.12)
      for(let i=0;i<(drop?12:8);i++)instrument(at+i*4*beat/(drop?12:8),.072,42,i%2?.08:.12,'hat',i%2?.37:-.37)
    }
    if(bar===5 || bar===9){
      for(let i=0;i<6;i++)instrument(at+(2+i/3)*beat,.13,40,.09+i*.025,'snare',i%2?.3:-.3)
    }
    progress((bar+1)/18)
  }
  for(const [index,line] of info.lyrics.entries()){
    const words=line.text.toLowerCase().match(/[a-z]+/g)
    const scale=3.65/Math.max(3.65,words.length*.58)
    let t=line.at
    for(const [i,word] of words.entries()){
      const vowels=word.match(/[aeiouy]+/g) || ['a']
      for(const [part,sample] of vowels.entries()){
        const note=key+12+motif[(i+part+index)%8]+(descriptor.genre==='opera'?12:0)
        const length=beat*scale*(word===words.at(-1)?1.05:.54)/vowels.length
        instrument(t,length,note,.32,'vocal',index%2?.15:-.15,sample[0])
        instrument(t+.041,length,note+12,.055,'vocal',index%2?-.55:.55,sample[0])
        t+=length+.061
      }
    }
  }
  const wave=new ArrayBuffer(44+left.length*4),data=new DataView(wave)
  const string=(at,text)=>[...text].forEach((char,i)=>data.setUint8(at+i,char.charCodeAt(0)))
  string(0,'RIFF');data.setUint32(4,wave.byteLength-8,true);string(8,'WAVE');string(12,'fmt ')
  data.setUint32(16,16,true);data.setUint16(20,1,true);data.setUint16(22,2,true);data.setUint32(24,rate,true)
  data.setUint32(28,rate*4,true);data.setUint16(32,4,true);data.setUint16(34,16,true)
  string(36,'data');data.setUint32(40,left.length*4,true)
  for(let i=0;i<left.length;i++){
    const fade=Math.min(1,i/6000,(left.length-i)/28000)
    for(const [channel,source] of [left,right].entries()){
      const dry=source[i],cross=i>3107?(channel===0?right:left)[i-3107]*.14:0
      data.setInt16(44+i*4+channel*2,clip((dry+cross)*1.6)*fade*30400,true)
    }
  }
  progress(1)
  return {info,wave}
}
