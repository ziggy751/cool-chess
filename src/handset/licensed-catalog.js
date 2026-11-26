const tracks=[
  ['edm','EDM Detection Mode','Electronic edit','USUAN1500026','#925f88'],
  ['club','Club Diver','House','USUAN1200020','#3d5a71'],
  ['rhinoceros','Rhinoceros','Synthwave','USUAN1500040','#744557'],
  ['bitshift','Bit Shift','Chiptune','USUAN1600045','#826e3c'],
  ['zen','That Zen Moment','Ambient','USUAN2400001','#39685d'],
]
export const licensed=tracks.map(([id,title,genre,isrc,color])=>({
  id:'licensed-'+id,title,genre,color,artist:'Kevin MacLeod',source:'/side-reel/licensed/'+id+'.mp3',
  art:'/side-reel/licensed/'+id+'.webp',
  credit:'Licensed under CC BY 4.0. Audio re-encoded. Playback of the complete recording.',
  details:'https://incompetech.com/music/royalty-free/index.html?isrc='+isrc,
  license:'https://creativecommons.org/licenses/by/4.0/',
}))
