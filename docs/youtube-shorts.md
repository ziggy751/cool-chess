# YouTube Shorts in Side Reel

Chess Evolution 3D uses Three.js 0.187.0, Vite 8.3.8 and npm. Wrangler serves the assets in `dist/` and routes `/socket` to the ChessLobby Durable Object. The phone is HTML and CSS with lazily loaded apps, a session state per app, and a close transition. Closing or minimizing the phone pauses and destroys the app before the transition finishes. Minimizing returns to the app when the phone is opened again.

The phone feed uses the official YouTube IFrame Player API. It shows links from a game-managed catalog. YouTube blocks the personalized Shorts website inside other pages. The phone provides no sign-in. [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) · [Player requirements](https://developers.google.com/youtube/terms/required-minimum-functionality)

## Use the feed

1. Open Side Reel in a local or casual AI game, then select **YouTube Shorts**. The catalog shuffles once per phone session.
2. Wheel or drag on the video caption or the vertical grip. Use **↑** and **↓** while the phone has keyboard focus, or use the separate previous and next buttons. The YouTube video frame retains its own clicks, swipes, and native controls. The browser does not deliver events inside that frame to the game.
3. Playback starts muted when the video is sufficiently in view and the browser allows it. Use **Unmute Short** for audio, or **Play** if autoplay is denied. The progress bar reports the current position. An unavailable embed is passed over. A network error or an exhausted feed offers a retry.
4. Closing, minimizing, switching apps, or hiding the page pauses playback. Opening Shorts again restores the current Short and its saved position for that tab. Competitive matches retain the same restrictions. The game keeps routing clicks on the chessboard to chess.

## Catalog maintenance

Edit `src/handset/shorts.json` and rebuild. For each entry add the exact 11-character ID from a creator's published Shorts link, along with its title and channel.

```json
{"id":"KecOzYrJnoo","title":"Building in stop motion","channel":"LEGO"}
```

The catalog has 31 creator-published IDs sourced from current public listings and the project's existing curated clips. This workspace's proxy rejected all 31 direct oEmbed requests before they reached YouTube and prevented a real playback check. Availability, embedding permissions, region restrictions, ads, and behavior on a given device remain YouTube-controlled. To validate from a browser or terminal with YouTube access, pass your full Shorts URL to the official oEmbed endpoint.

```sh
curl -fsSG https://www.youtube.com/oembed \
  --data-urlencode 'url=https://www.youtube.com/shorts/KecOzYrJnoo' \
  --data-urlencode 'format=json'
```

Phase 1 uses no YouTube API key. It adds no Worker routes and consumes no YouTube Data API search quota. Phase 2, the optional search endpoint, is outside this release.

## Build and verify

```sh
npm ci
npm test
npx playwright install chromium
npx playwright test tests/entertainment.spec.js tests/handset.spec.js --grep 'Shorts|separate media'
npm run build
npx wrangler dev --local
npx wrangler deploy
```

The Chromium tests exercise the controls with an IFrame API fixture, including a touch swipe, muted startup, error skipping, offline retry, one-player teardown, resume, and chess input. In a short software-rendered WebGL check, the 95th-percentile frame interval was 33 ms both with a local video playing in the fixture and with the board alone. Actual YouTube decoding, playback, audio, and frame pacing remain unverified. The unmocked browser hit a network tunnel failure and displayed the retry control. This JavaScript project has no lint or typecheck scripts. Changed JavaScript passed Node's syntax check, and Vite built successfully.

For the first live-device check, open the app on a phone, swipe the grip, unmute, minimize, and confirm audio stops. Reopen and check that playback resumes at the saved point. Check a few clips in both a mobile browser and a desktop browser.

## Files

| File | Purpose |
| --- | --- |
| `src/handset/shorts.json` | Editable creator catalog |
| `src/handset/youtube-player.js` | Official IFrame API loader with a timeout and retry |
| `src/handset/youtube.js` | One-player feed, gestures, progression, media lifecycle, and retry |
| `src/handset/studio.css` | Video layout and controls inside the existing phone shell |
| `src/phone.js` | Player minimum width in compact mode and turn-based pause |
| `src/icons.js` | Grip and muted-player icons used by the phone |
| `src/handset/media-status.js` | Current YouTube behavior in the media sources screen |
| `tests/entertainment.spec.js`, `tests/handset.spec.js` | Browser regression coverage |
