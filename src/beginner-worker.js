import { beginnerMove } from './beginner.js'
import { weakBotMove } from './bot-moves.js'
self.onmessage=({data:{fen,level,style,profile}})=>{
  try { self.postMessage({move:profile?weakBotMove(fen,profile):beginnerMove(fen,level,style)}) }
  catch (error) { self.postMessage({error:error.message}) }
}
