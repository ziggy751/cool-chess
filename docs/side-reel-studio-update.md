# Side Reel Studio update

This report describes an earlier release. The current YouTube app uses a revised in-phone feed. [Current setup](youtube-shorts.md)

Open a chess match, then select the phone icon below the board or press **P**. Use **Arcade** to browse games and add Home shortcuts. **Arrange** on Home opens folder and dock controls. The bell opens match notifications. [Play on Cloudflare](https://cool-chess.52560.workers.dev/)

## Changes

- **AI Shorts** screens batches of three original 17-second vertical clips. The engine has 101 scripted setups with timed payoffs, 50 character designs, 30 scene presets, 100 props, 50 synthesizer effects, 30 camera presets, 25 editing treatments, 20 voice profiles, 30 expression presets, 50 movement presets and 25 short musical beds. These are reusable Canvas and sound presets. Some share visual silhouettes and drawing logic. Screenings avoid repeating scripts, recent character pairs, recent edit styles and similar punchlines. Bookmarks store the generation seed so the same clip can be replayed.
- **Music** has 14 newly composed Side Reel Studio tracks across 14 genres and the prior Winter Bells track. The new pieces have distinct chord, melody and drum patterns, with introductions, breaks and drops. The audio and art are produced offline by the included script. The app has a library and now-playing view, artist credits, a seek bar, shuffle, repeat, favourites, a playlist, recently played tracks, local audio import, a mini player and an optional spectrum analyser.
- **Arcade** covers 23 entries, including the previous seven minigames and Chess Puzzles. The 15 new games include three-hole Mini Golf, Solitaire, Neon Pong, Pocket Platformer, Space Dodger and Reaction Time. The library displays screenshots of playable builds, per-game records, favourites, recent games and shortcuts.
- **Returning games** have new pixel-art flight graphics, a smoother Snake, authored Geometry Runner obstacle sequences, additional Stack Tower materials, smoother racing steering, 2048 tile travel and Block Puzzle placement previews. Existing saved scores and puzzle boards still use their prior storage keys.
- **The phone and chess interface** have a denser system layout, app icons and notifications. The chess menu provides a direct multiplayer shortcut. Match, ranked, review and showroom screens share updated spacing and focus treatments. The chess board and controls stay separate from the phone. Videos and games pause on turn changes by default. Active competitive matches disable YouTube, Chess Puzzles and local audio uploads.

## Screenshots

- [Phone, YouTube, AI Shorts, Music and Arcade before and after](screenshots/studio-update/phone-before-after.webp)
- [Main menu, showroom, ranked AI and match HUD before and after](screenshots/studio-update/chess-before-after.webp)
- [Returning games before and after](screenshots/studio-update/classic-games-before-after.webp)
- [All 23 arcade playfields](screenshots/studio-update/arcade-playfields.webp)
- [A generated meme frame](screenshots/studio-update/meme-dialogue.webp) and [mobile arcade layout](screenshots/studio-update/mobile.webp)

## Verification and performance

Chromium rendered six different frames from every scripted story, 606 distinct frames in total. The browser tests also exercised generated playback, pausing on a chess move, saved bookmarks and screening history. The Arcade integration tests launched all 15 additions and checked score saving, library filtering and shortcuts. Existing tests cover local and AI chess, Stockfish review, private matches, clocks, reconnects, ranked restrictions and WebGL board rendering.

One two-second Chromium frame-cadence sample on the shared cloud CPU recorded 39.0 FPS with the phone closed, 40.2 FPS on phone Home, 37.7 FPS during meme playback and 43.6 FPS during Neon Pong. The sample used the 2D match board and is a comparison of those four sampled states. The 95th percentile frame gap was about 50 ms. A separate browser check verified that opening Home created no video, iframe, audio or canvas elements. Physical MacBook trackpad behavior and sustained 60 FPS on gaming hardware remain unverified.

## Media availability

YouTube uses the official privacy-enhanced iframe, with API controls when the YouTube script can load. Curated titles, pasted video URLs, favourites and watch history are supported. Search across the full catalogue opens on YouTube. The test browser could load official embed pages for four sampled videos, but its network blocked the YouTube control script and did not deliver playable media. API progress, mute and turn pausing passed against a test fixture. When the video cannot play in the embed, use the app’s direct YouTube link. [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) · [Privacy-enhanced embed](https://support.google.com/youtube/answer/171780)

The meme engine runs locally without an external AI video service or paid requests. Narration uses voices installed in the browser. The approaches to archival overlays and rapid cuts were informed by the two trend references below. All story events, characters and audio are original. [YouTube Culture & Trends](https://blog.youtube/culture-and-trends/next-gen-creativity/) · [Jupiter Incident format history](https://knowyourmeme.com/memes/jupiter-incident-2011)
