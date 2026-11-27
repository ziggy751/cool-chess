# YouTube Shorts in Side Reel

## Project setup

| Setting | Current project |
| --- | --- |
| Engine and build tooling | Three.js 0.187.0 and Vite 8.3.8 |
| Platform | Desktop and mobile web browsers |
| Phone rendering | HTML and CSS beside the Three.js board |
| Previous implementation | A curated list feeding a YouTube iframe |
| Browser component | The browser already running the game. No extra package or API key is required. |

The game runs as a web page. It has no API to create an offscreen native Chromium instance with its own profile. Browser origin rules also protect another site's pixels, page controls and data. A 9:16 Chromium texture on a mesh, UV-to-browser input forwarding and a browser profile in the game's save folder would require a native host. Google disallows OAuth authorization requests in developer-controlled embedded user agents, including in native apps. [Browser same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) · [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies)

## Using the official feed

1. Start a local or casual AI match. Select **Open Side Reel phone** or press **P**.
2. Open **YouTube Shorts**, then choose **Open Shorts on YouTube**. The official page opens in a separate tab. Use the usual mouse, keyboard or touch controls on YouTube. Your device may open its YouTube app depending on its settings.
3. Use YouTube's own consent or sign-in screens if they appear. Cookies, sign-in persistence and recommendations are managed by YouTube and your browser profile.
4. Pause or close the YouTube tab to stop playback. The chess clock continues while you are away. Audio uses the browser or device's controls. The web game cannot throttle, mute, pause or resume the separate page, or mix its audio into the game's spatial audio.
5. If the browser reports that the device is offline, the phone shows a retry link. If YouTube fails to load while your device is online, retry in that tab. The phone cannot read errors from the separate page.

The shortcut is disabled during competitive play. The game does not send any request to YouTube until you use the shortcut.

## Install, build and deploy

1. Use Node.js 22.12 or later. Run `npm ci` from the repository root to install the lockfile versions.
2. Run `npm run dev`, then open `http://localhost:5173`.
3. Run `npm test`. To check the launcher in Chromium, run `npx playwright install chromium` and `npx playwright test tests/entertainment.spec.js --grep Shorts`.
4. Run `npm run build` to generate `dist/`. For the Git-connected Cloudflare Worker, use branch `main`, root `/`, build command `npm run build`, and deploy command `npx wrangler deploy`. The existing `wrangler.jsonc` configures the static assets and multiplayer server.

## Source files

| Path | Purpose |
| --- | --- |
| `src/handset/youtube.js` | Official Shorts link, offline state and listener cleanup |
| `src/handset/studio.css`, `src/phone.css` | Launcher layout and removal of the previous embedded player styles |
| `src/phone.js`, `src/handset/media-status.js` | Phone layout, turn behavior and status text |
| `tests/entertainment.spec.js`, `tests/handset.spec.js`, `tests/holiday.spec.js` | Browser checks for the phone, launcher and competitive access |
| `tests/entertainment.test.js`, `tests/handset.test.js`, `tests/side-reel-studio.test.js` | Unit suites updated to drop assertions for the retired curated feed |

## First checks on your device

Open Shorts in a casual match, scroll forward and back, then return and make a chess move. If you choose to sign in on YouTube, close both tabs and open the shortcut again to check your browser's sign-in persistence. The automated browser tests verify the exact destination against a navigation fixture, chess input, and offline retry. The test network restricted access to YouTube itself, so playback, recommendations and sign-in remain unverified. The launcher uses standard browser links and network status events.
