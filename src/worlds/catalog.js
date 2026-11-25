const entries = [
  ['cabin','Mountain Cabin','Nature','cabin','timber',0x9bbbd5,0xd5e3ff],
  ['neon','Cyberpunk Penthouse','Futuristic','city','console',0x0b132b,0x82b7ff],
  ['orbit','Space Station','Futuristic','orbit','orbital',0x030610,0xa6c8ff],
  ['castle','Medieval Castle','Historical','royal','stone',0x6d7481,0xffd6ad],
  ['jade','Zen Garden','Nature','garden','low',0xc5ddc3,0xeaffd6],
  ['underwater','Underwater Observatory','Futuristic','aquatic','glass',0x074265,0x89e6ef],
  ['tropical','Beach Villa','Luxury','coast','teak',0xe9aa76,0xffd7ab],
  ['egypt','Egyptian Palace','Historical','desert','stone',0xdfb77f,0xffe2b2],
  ['volcano','Volcano Observatory','Cinematic','lava','console',0x4a2023,0xffa166],
  ['rain','Rainy Tokyo Apartment','Cinematic','city','timber',0x1c2b40,0xadc9f1],
  ['sky','Floating Sky Island','Fantasy','island','stone',0x8bb0d9,0xf4e6fd],
  ['championship','Championship Arena','Cinematic','arena','orbital',0x171d2c,0xe8ecff],
  ['yacht','Luxury Yacht','Luxury','coast','teak',0x7ba9c4,0xe5f1ff],
  ['antarctic','Antarctic Research Station','Futuristic','winter','console',0xb9d3e2,0xcde9ff],
  ['roman','Roman Courtyard','Historical','courtyard','stone',0xbad0de,0xffe9cd],
  ['hologram','Holographic Arena','Futuristic','digital','orbital',0x090e2a,0x85d9ff],
  ['forest','Forest Retreat','Nature','forest','timber',0x65896b,0xdceac1],
  ['resort','Desert Resort','Luxury','desert','teak',0xeac89f,0xffd3a0],
  ['aurora','Northern Lights Observatory','Fantasy','aurora','glass',0x152641,0xa8e6e3],
  ['workshop','Steampunk Workshop','Historical','workshop','clockwork',0x392431,0xffc997],
  ['cosmic','Cosmic Temple','Fantasy','cosmic','stone',0x10132d,0xd1bfff],
  ['manor','Thunderstorm Manor','Cinematic','manor','timber',0x344153,0xffd5ab],
  ['studio','Minimalist Studio','Minimalist','studio','concrete',0xdce5ec,0xf5f1e7],
  ['cavern','Crystal Cavern','Fantasy','cavern','glass',0x111b36,0x92c8ff],
  ['pool','High-Rise Infinity Pool','Luxury','rooftop','glass',0xac8398,0xeec6ae],
]

export const locations = Object.fromEntries(entries.map(([id,name,category,builder,table,sky,light])=>
  [id,{id,name,category,builder,table,sky,light,preview:'/world-previews/'+id+'.webp'}]))

const aliases={walnut:'cabin',marble:'studio',penthouse:'neon',cathedral:'castle',obsidian:'manor',chrome:'hologram'}
export function locationFor(id) { return locations[id] || locations[aliases[id]] || locations.cabin }

export const tables = {
  auto:'Location table',timber:'Walnut joinery',console:'Alloy console',orbital:'Orbital pedestal',
  stone:'Carved stone',low:'Pavilion joinery',glass:'Crystal platform',teak:'Yacht teak',
  clockwork:'Brass workbench',concrete:'Cast concrete',
}

export const lightingStyles={natural:'Location lighting',warm:'Warm key',cool:'Cool key',studio:'Soft studio'}

export const curated = {
  midnight:{name:'Midnight Luxury',environment:'neon',theme:'gold-vein',collection:'chrome'},
  cosmic:{name:'Cosmic Royalty',environment:'orbit',theme:'galaxy',collection:'nebula'},
  frozen:{name:'Frozen Paradise',environment:'cabin',theme:'glacier',collection:'frost'},
  mechanical:{name:'Mechanical Empire',environment:'workshop',theme:'machine',collection:'mechanical'},
  dynasty:{name:'Golden Dynasty',environment:'egypt',theme:'obsidian',collection:'gold'},
  ocean:{name:'Ocean Dream',environment:'underwater',theme:'water',collection:'sapphire'},
  ancient:{name:'Ancient Royalty',environment:'castle',theme:'castle',collection:'stone'},
  aurora:{name:'Aurora Night',environment:'aurora',theme:'glacier',collection:'crystal'},
  future:{name:'Digital Future',environment:'hologram',theme:'projection',collection:'holographic'},
}
