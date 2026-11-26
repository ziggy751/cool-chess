# Side Reel entertainment rebuild

Start a match, then choose the phone icon below the board or press **P**. AI Shorts, the licensed Music library, AI Music Lab, Spotify shortcuts and the Arcade are separate apps. [Play on Cloudflare](https://cool-chess.52560.workers.dev/)

## Media

- **Generated video** presents three pre-generated clips with their creators, sources and license information. The clips come from CogVideoX, Sora and VideoPoet. They play as local MP4 files with native seek and pause. The source footage sizes and aspect ratios are preserved proportionally. This library is a small set of pre-generated demonstrations.
- **Brainrot** has 201 authored concepts. Eleven new formats include the Jovian archive, the Key Bureau’s object duels, Channel Negative One’s streams and podcasts, the Everyday Games, Aero Office 2007, emergency bulletins, concerts, CCTV, boardroom sessions and broken game captures. Each format has a distinct shot sequence, scene treatment and beat timing. Recurring characters include Latch, Five-Pin, Pixel May, Yamwell and existing fictional characters. The app offers format filters, watch history, favourites and batches of three. Recent scripts, casts, effects and punchlines inform duplicate prevention. [Research database](../MEME_RESEARCH_DATABASE.md)
- **Music** starts with five complete CC BY 4.0 selections by Kevin MacLeod. The previously published original Side Reel tracks and Winter Bells remain in the library. Credits, source and license links appear on the player. Licensed audio is re-encoded for the web. The cover art is original.
- **AI Music Lab** performs offline composition in a worker. Choose from ten genres and twenty original comedy concepts, or randomly select a premise. The composer renders stereo audio with chord progressions, bass, drums, original melodies, synthetic vowel vocals, a verse, two drops, a breakdown and an outro. The player shows timed lyrics, artwork, progress, recent songs, favourites, seek and a spectrum visualizer. The synthesized vowels follow the melody. The lyrics on screen supply the words. Saved songs can be regenerated from their seed and the three most recent renders stay in memory while the page is open.
- **YouTube Shorts** offers an official player, manual scroll, swipe and arrows, a finite randomized playlist, and a direct link. Only the selected player is loaded. The curated library includes regular videos, too. Full-site search opens at YouTube. Category and title filtering in the phone use the curated list or the viewer’s saved links. Private and unavailable embeds may show provider errors. [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- **Spotify** opens the official site or saved Spotify playlist links separately. The game does not receive, cache or play Spotify audio. Spotify and external chess assistance are unavailable through the phone during active competitive matches. [Developer Policy](https://developer.spotify.com/policy) · [Embed Terms](https://developer.spotify.com/documentation/embeds/terms)

There are separate levels for regular music, AI Music Lab, videos, arcade and phone interface sounds. Chess move sounds and room ambience stay in the main game’s settings. If enabled, the phone pauses ordinary music while a video plays and restores it after leaving that video. Turn changes pause the active entertainment when the player has enabled that behavior. The match clock continues to run.

## Source and license credits

| Asset | Credits |
| --- | --- |
| Late Afternoon Swans | VulcanSphere, made in CogVideoX, CC0 1.0. Re-encoded from the original. [Source and license](https://commons.wikimedia.org/wiki/File:Late_Afternoon_Swans_(CogVideoX).webm) |
| Under the Ant Hill | OpenAI / Sora. Renamed and re-encoded from the clip that Wikimedia Commons identifies as public-domain algorithm output. [Source and license](https://commons.wikimedia.org/wiki/File:POV_of_an_ant_walking_inside_an_ant_nest_tunnel_(Sora_AI-video).webm) |
| Popcorn Quality Control | Google Research / VideoPoet. Renamed and re-encoded from the clip that Wikimedia Commons identifies as public-domain algorithm output. [Source and license](https://commons.wikimedia.org/wiki/File:Dog_popcorn_with_audio_6781BD0C.webm) |
| EDM Detection Mode | Kevin MacLeod, CC BY 4.0. [Original](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500026) |
| Club Diver | Kevin MacLeod, CC BY 4.0. [Original](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200020) |
| Rhinoceros | Kevin MacLeod, CC BY 4.0. [Original](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500040) |
| Bit Shift | Kevin MacLeod, CC BY 4.0. [Original](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600045) |
| That Zen Moment | Kevin MacLeod, CC BY 4.0. [Original](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2400001) |

[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) · [Incompetech licensing](https://apps.incompetech.com/music/royalty-free/licenses/)

## Provider status and configuration

Phone **Settings → Media sources** shows the sources available in this build. Paid generation and quota-bearing search are external services. The release has no configured keys, and creates no paid requests.

| Service | Findings and setup required |
| --- | --- |
| Google Veo | Veo 3.1 documents 9:16 output, native audio and asynchronous generation. Output length, queue time, resolution and quota depend on the model and account. The Gemini pricing page lists Standard 720p or 1080p with audio at US$0.40 per second. Interactive generation would need a paid project, restricted backend credentials, operator authorization, approved account terms, prompt moderation, explicit budgets and job controls. Confirm current pricing and rights before enabling. [Veo API](https://ai.google.dev/gemini-api/docs/video) · [Pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Runway | Runway lists Gen-4.5 at 12 credits per second. Available output formats and audio depend on the chosen model. Portrait generation and lip sync need model-specific verification. Production would need backend credentials, an approved right to use the generated output and a cost limit. [Runway API](https://docs.dev.runwayml.com/) · [Pricing](https://docs.dev.runwayml.com/guides/pricing/) |
| OpenAI Sora | The original demos are historical footage. OpenAI’s API deprecation log records shutdown of the Videos API on 24 September 2026. [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations) |
| Eleven Music | The API supports prompts and original generated vocals. Plan-specific music rights and pricing apply. Production needs an eligible plan covering this use, backend credentials, budget authorization and output review. [Eleven Music API](https://elevenlabs.io/eleven-music-api) · [Music rights](https://elevenlabs.io/music-terms) |
| YouTube Data API | An approved restricted project key and quota would allow backend search and a provider metadata check for embeddability. It would still leave playback subject to the uploader’s and viewer’s restrictions. [Search filters and quotas](https://developers.google.com/youtube/v3/docs/search/list) |
| Spotify | External official links require no player credentials. Embedded playback would need review and permission for this game use. [Spotify Developer Policy](https://developer.spotify.com/policy) |

## Browser samples

- [Before and after](screenshots/entertainment/phone-before-after.webp) · [Mobile view](screenshots/entertainment/mobile.webp)
- [Actual generated footage and Music Lab playback](screenshots/entertainment/new-apps.webp)
- [Brainrot timeline samples, part one](screenshots/entertainment/brainrot-timelines-1.webp) · [Part two](screenshots/entertainment/brainrot-timelines-2.webp)

The previous live build was captured in Chromium, including the main menu, 3D showroom, ranked AI, match view, the phone apps and all arcade playfields. The new release was exercised with desktop Chromium and a mobile viewport. A sample played all three generated MP4s and four Music Lab genres. It rendered 48 distinct frames across the legacy format and eleven new formats. One 1.8-second Chromium sample on the shared cloud CPU recorded 34.1 FPS with the phone closed, 31.9 FPS on Home and 36.0 FPS in Brainrot, with the 2D board behind the phone. The same sample generated four compositions in 2.0–4.1 seconds each. These are browser frame-cadence and generation samples under cloud load. A physical MacBook and sustained 60 FPS on consumer hardware were outside this test setup.

The test browser loaded the official players and their creator/title data for all 15 curated YouTube entries. The browser network blocked the IFrame API script and did not confirm actual YouTube video playback. Automated tests exercised the official frame arrangement, randomization, navigation, one-player lifecycle, error state and fallback. The external Spotify shortcut was verified with a navigation fixture. Its site handles account and playback availability independently.
