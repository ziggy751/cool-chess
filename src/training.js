import { Chess } from 'chess.js'
export const lessons=[
  {name:'Pawn advance',fen:'4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',solution:'e4',prompt:'Move the pawn two squares from its starting square.'},
  {name:'Knight jump',solution:'Nf3',prompt:'Jump the right knight over the pawns and land on f3.'},
  {name:'Bishop diagonals',fen:'4k3/8/8/8/8/8/4P3/2B1K3 w - - 0 1',solution:'Bh6',prompt:'Move the bishop along its diagonal to h6.'},
  {name:'Rook files',fen:'4k3/8/8/8/8/8/P7/R3K3 w - - 0 1',solution:'Rd1',prompt:'The pawn blocks the file. Move the rook across the rank to d1.'},
  {name:'Queen checks',fen:'4k3/8/8/8/8/8/P7/3QK3 w - - 0 1',solution:'Qa4+',prompt:'Use a diagonal to place the king in check from a4.'},
  {name:'King movement',fen:'4k3/8/8/8/8/8/P7/4K3 w - - 0 1',solution:'Kd2',prompt:'Move your king one square diagonally to d2.'},
  {name:'Pawn captures',fen:'4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1',solution:'exd5',prompt:'Capture the knight diagonally with the pawn.'},
  {name:'En passant',fen:'4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',solution:'exd6',prompt:'Black just advanced two squares. Capture on d6 immediately.'},
  {name:'Castling',fen:'4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',solution:'O-O',prompt:'Castle kingside by moving the king two squares toward the rook.'},
  {name:'Promotion',fen:'7k/P7/8/8/8/8/8/7K w - - 0 1',solution:'a8=Q+',prompt:'Advance the pawn to the final rank and promote to a queen.'},
  {name:'Opening development',moves:['e4','e5'],solution:'Nf3',prompt:'Develop your kingside knight and attack the e5 pawn.'},
  {name:'Knight fork',fen:'3q3k/8/3N4/8/8/8/8/4K3 w - - 0 1',solution:'Nf7+',prompt:'Check the king while attacking the queen from f7.'},
  {name:'Pin a piece',fen:'4k3/4n3/8/8/8/8/8/R5K1 w - - 0 1',solution:'Re1',prompt:'Place the rook on the e-file to pin the knight in front of its king.'},
  {name:'Back-rank mate',fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',solution:'Re8#',prompt:'Mate the king trapped behind its pawns.'},
  {name:'Avoid stalemate',fen:'7k/5K2/8/6Q1/8/8/8/8 w - - 0 1',solution:'Qg7#',prompt:'Give checkmate rather than leaving the king with no moves while out of check.'},
].flatMap(lesson=>{
  try {
    const chess=new Chess(lesson.fen)
    for(const move of lesson.moves || [])chess.move(move)
    const fen=chess.fen()
    const chosen=chess.move(lesson.solution)
    return [{...lesson,fen,solution:chosen.san}]
  } catch { return [] }
})
