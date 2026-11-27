# Ranked AI progression and bot calibration

New players start at 0 Elo. Ranked AI uses its own browser-local save, separate from the server's Ranked Online ladder. Existing ratings and saved games carry forward. Existing players can opt into a one-time reset. Match configuration is fixed at the start.

Rating uses the standard Elo expectation with a floor of zero and no upper cap. K is 64 for the first 20 completed games, 40 from game 21 through game 100, and 32 after that. Above 2000, K is 24 after the first 20 games. The result screen displays the actual integer change after rounding and applying the floor.

The app saves active moves and rating settlement separately from cosmetic preferences. A match ID and the active match record prevent duplicate rewards. A second tab can resume a match and takes over from the first. Engine failures pause the match clocks and offer a retry. A normal exit preserves the match and its elapsed clock. The local AI ladder is editable by someone with access to their browser storage. It has no public leaderboard and does not submit AI results to the multiplayer server.

Casual AI has 100 presets spanning 0–3000 plus an unrestricted-strength Stockfish 19 Lite option at the selected time limit. Type any integer within the range or use the slider, categories, preset list, recommendations, and favourites. Skill meters describe the bot’s configuration. They are estimates, with separate measurements below. Survival and Boss Battles retain their previous engine levels.

## Tournament

The stronger target led **17 of 19 pairings**, scoring **86%** overall when capped positions were adjudicated. The final measurements comprise **196 games**, **13,319 legal test plies**, and **77 rule-complete games**. Adjacent 0/100 and 2800/3000 could not be reliably separated in this sample. The largest strength jump was between the top of the dedicated beginner engine and the first measured Stockfish setting.

The same profile and move-selection code runs in the game and benchmark. The sample uses paired colors, up to six openings, and deterministic personality noise. Games at the 80-ply cap are adjudicated separately by unrestricted Stockfish Lite at 18,000 nodes. An evaluation beyond ±150 counts as an adjudicated lead. Results in each column are from the higher target's perspective.

```sh
node scripts/benchmark-ai.js 12 low
node scripts/benchmark-ai.js 8 high
```

| Pair | Games | Finished W–L–D | Capped ahead–behind–level | Mean move search |
| --- | ---: | ---: | ---: | ---: |
| 0 / 100 | 12 | 1–0–0 | 4–5–2 | <1 ms |
| 0 / 400 | 12 | 1–0–0 | 11–0–0 | <1 ms |
| 100 / 200 | 12 | 0–1–0 | 7–3–1 | <1 ms |
| 200 / 400 | 12 | 0–0–0 | 10–1–1 | <1 ms |
| 200 / 800 | 12 | 6–0–2 | 4–0–0 | 1 ms |
| 400 / 600 | 12 | 1–0–0 | 8–2–1 | <1 ms |
| 600 / 800 | 12 | 3–1–0 | 5–3–0 | <1 ms |
| 600 / 1200 | 12 | 12–0–0 | 0–0–0 | 10 ms |
| 800 / 1000 | 12 | 11–0–0 | 1–0–0 | <1 ms |
| 1000 / 1200 | 12 | 12–0–0 | 0–0–0 | 9 ms |
| 1000 / 1800 | 12 | 12–0–0 | 0–0–0 | 30 ms |
| 1200 / 1500 | 8 | 5–0–0 | 3–0–0 | 14 ms |
| 1500 / 1800 | 8 | 0–0–0 | 7–0–1 | 29 ms |
| 1500 / 2400 | 8 | 4–0–0 | 4–0–0 | 136 ms |
| 1800 / 2000 | 8 | 2–0–1 | 4–0–1 | 52 ms |
| 2000 / 2400 | 8 | 0–0–0 | 6–0–2 | 112 ms |
| 2000 / 3000 | 8 | 1–0–0 | 6–0–1 | 343 ms |
| 2400 / 2800 | 8 | 0–0–0 | 6–0–2 | 413 ms |
| 2800 / 3000 | 8 | 0–0–1 | 0–0–7 | 629 ms |

## Position probes

A 13-position suite samples opening moves, endgame moves, easier and harder tactics, and mate in one with repeated seeded trials. Loss is measured against unrestricted Stockfish Lite at 22,000 nodes and capped at 1,000 engine centipawns per trial. Blunders lose at least 200, and a non-mate tactical solution is within 45. These probes are small, so neighboring entries can change order. The internal Elo estimate fits the tournament scores including adjudication, applies modest smoothing, and sets the 0 preset as its reference. Neither the fitted values nor the preset labels are human Elo estimates.

| Target | Internal Elo above 0 preset | Tactics correct | Blunders | Missed mates | Mean loss | Opening loss | Endgame loss | Mean decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | +0 | 4/28 | 20/52 | 8/8 | 304 | 157 | 95 | 0.1 ms |
| 100 | +21 | 4/28 | 23/52 | 7/8 | 315 | 146 | 134 | 0.1 ms |
| 200 | +112 | 5/28 | 18/52 | 7/8 | 232 | 88 | 4 | 0.2 ms |
| 400 | +326 | 9/28 | 13/52 | 7/8 | 200 | 74 | 17 | 0.1 ms |
| 600 | +451 | 13/28 | 14/52 | 4/8 | 177 | 58 | 59 | 0.3 ms |
| 800 | +466 | 15/28 | 9/52 | 3/8 | 129 | 88 | 3 | 0.3 ms |
| 1000 | +750 | 19/28 | 4/52 | 0/8 | 57 | 64 | 3 | 0.3 ms |
| 1200 | +967 | 11/14 | 1/26 | 0/4 | 25 | 23 | 6 | 4.2 ms |
| 1500 | +1173 | 12/14 | 0/26 | 0/4 | 17 | 24 | 5 | 18.8 ms |
| 1800 | +1297 | 13/14 | 0/26 | 0/4 | 6 | 6 | 2 | 23.3 ms |
| 2000 | +1451 | 12/14 | 0/26 | 0/4 | 9 | 3 | 2 | 60.0 ms |
| 2400 | +1586 | 14/14 | 0/26 | 0/4 | 2 | 3 | 0 | 105.3 ms |
| 2800 | +1766 | 14/14 | 0/26 | 0/4 | 0 | 0 | 0 | 335.2 ms |
| 3000 | +1745 | 13/14 | 0/26 | 0/4 | 4 | 0 | 0 | 350.1 ms |

Search measurements exclude artificial presentation delays and worker startup. Device speed can change search depth achieved within the time cap. No comparison with human players was performed.

## Game checks

Chromium tested one legal move from each of the 100 presets and the maximum-strength opponent. Rank tests covered a first win (+32 Elo against a 0 Elo opponent), losing at the zero floor, a repetition draw, promotion, demotion, a legacy reset, result review and one-time settlement on reload. Casual browser games included opponents at 0 and 2800 Elo. Worker tests covered legal move validation, reconnects and persistence for the separate Ranked Online system.

## Source

| File | Purpose |
| --- | --- |
| `src/ranked-ai.js` | Rating, ranks, migration, reset, and opponent selection |
| `src/bot-profiles.js`, `src/bot-moves.js` | Bot configuration, personality and move selection |
| `src/engine.js`, `src/beginner-worker.js` | Off-main-thread searches and shared Stockfish integration |
| `src/main.js` | Match flow, persistence, results and opponent pickers |
| `src/ranked-ai.css`, `src/rank-emblem.js` | Ranked interface, emblems and animation |
| `src/icons.js` | Icons for the rank emblems |
| `scripts/benchmark-ai.js` | Bot match and position probe runner |
| `tests/standard.test.js`, `tests/overhaul.spec.js` | Elo, matchmaking, legal moves and ranked browser scenarios |
