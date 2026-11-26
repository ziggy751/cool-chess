export const games={
  wings:['Flappy Wings','Action','#e4be72','feather'],
  snake:['Snake','Action','#a4deb8','route'],
  numbers:['2048','Puzzle','#eac677','hash'],
  runner:['Geometry Runner','Action','#e695b1','triangle'],
  tower:['Stack Tower','Timing','#a5c9e4','layers'],
  racing:['Mini Racing','Sports','#ee957d','car-front'],
  blocks:['Block Puzzle','Puzzle','#e1b273','blocks'],
  chess:['Chess Puzzles','Puzzle','#93d9d0','chess-knight'],
  pong:['Neon Pong','Sports','#b4ecf4','gamepad-2'],
  breaker:['Brick Breaker','Action','#f0a16e','blocks'],
  golf:['Mini Golf','Sports','#ace296','flag'],
  dodge:['Space Dodger','Action','#c5b4fa','sparkles'],
  merge:['Merge Orchard','Puzzle','#ffd98e','puzzle'],
  memory:['Memory Match','Puzzle','#f6a6c2','grid-2x2'],
  solitaire:['Solitaire','Puzzle','#a1e0b9','layers'],
  basket:['Mini Basketball','Sports','#ed9467','target'],
  reaction:['Reaction Time','Timing','#a4dce8','timer'],
  skate:['Kickflip Courier','Action','#f6ba98','route'],
  builder:['Tower Builder','Timing','#d5c5f2','layers'],
  color:['Spectrum Gate','Timing','#ecb2cb','circle-dot'],
  flight:['Star Courier','Action','#a9bde1','rocket'],
  bowling:['Mini Bowling','Sports','#e9bb9e','target'],
  platform:['Pocket Platformer','Action','#c0dfac','mountain'],
}
export const newCanvasGames=['pong','breaker','golf','dodge','basket','skate','builder','color','flight','bowling','platform']
export const newPuzzleGames=['merge','memory','solitaire','reaction']
export const arcadeCatalog=Object.entries(games).map(([id,[name,category,tint,symbol]])=>({id,name,category,tint,symbol,preview:'/side-reel/arcade/'+id+'.webp'}))
