import { beginnerMove } from './beginner.js'
self.onmessage=({data:{fen,level,style}})=>{
  try { self.postMessage({move:beginnerMove(fen,level,style)}) }
  catch (error) { self.postMessage({error:error.message}) }
}
