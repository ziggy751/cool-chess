# Stockfish game review

Open **Review game** on a completed match, or use **Analysis** to import a PGN, study a FEN or reopen a saved review. Select a move in the graph or move list to jump to the position. An engine candidate opens its variation on the 3D or 2D board. Use **Retry move** to look for a stronger option from the position before the move.

**Settings → Gameplay visibility** sets live coaching to Instant feedback, Detailed coaching, Post-game review only, or Disabled. Coaching runs in standard local, sandbox and casual AI games. In casual AI it waits for the opponent’s reply so analysis does not compete with the opponent worker. Active online matches and Ranked AI have no review, candidate lines or evaluation bar.

## How scores are calculated

- A Stockfish 19 Lite WASM worker searches each pre-move position. MultiPV supplies candidates and their principal variations. If it did not return the played move, the same position is searched again with the legal played move restricted at the root. A position that ends in mate or stalemate is evaluated directly under the chess rules.
- Engine scores are in centipawns and are shown from White’s perspective. The classification compares the positions from the mover’s perspective. The estimated winning-chance scale is `100 / (1 + exp(−0.00368208 × centipawns))`. A forced mate maps to 100 or 0, with the forced mate distance kept in the display. These are comparison scores and do not account for the draw probability of a particular human matchup.
- Loss is the drop in estimated winning chances between the strongest candidate and the played move, floored at zero. The normal loss thresholds are 7, 14 and 27 percentage points for inaccuracy, mistake and blunder. Missing a forced mate or dropping a substantial winning edge can be a missed opportunity. Great requires a large gap to the next candidate. Brilliant requires the top move to remain winning after the principal variation accepts a meaningful material concession, with another plausible option substantially weaker when the winning chance is already near 100%. Book moves follow a documented opening sequence and must stay within the loss threshold. Forced moves have just one legal option.
- Each side’s estimated accuracy is the mean of `100 × exp(−loss / 22)` over evaluable, non-forced moves. Performance Elo is a heuristic based on that game’s accuracy, rounded to 50 points. It uses `500 + 0.2 × accuracy²` and has no effect on ranked Elo. Depth, time budget and available hardware affect these estimates.
- Explanations use legal engine variations and position checks for threats, a material sacrifice, forks, pins, skewers, development and castling. The explorer follows documented move orders. It does not calculate master-game frequencies or match opening transpositions.

The review supports standard chess and completed Fog of War games. Variant play and saved games remain available through their existing systems. Stockfish position results are reused within the browser session, and **Save analysis** stores completed results in the current browser. Exiting review terminates any active analysis worker.

Opening data comes from the Lichess chess-openings project under CC0. [Dataset and license](https://github.com/lichess-org/chess-openings)

## Browser captures

[Post-game review](screenshots/review/review.webp) · [Engine variation on the 3D board](screenshots/review/variation.webp) · [Classification breakdown](screenshots/review/breakdown.webp) · [Mobile review](screenshots/review/mobile.webp)
