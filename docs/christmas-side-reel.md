# Christmas season and Side Reel

Choose **Christmas menu** on the home screen to preview the decorated cabin and seasonal set. The home theme keeps your selected match setup. Turn on **Festive music** from the menu if you want the original bell arrangement, or change the light pattern and checkmate effects under **Settings → Christmas**.

In **Collection**, use the Christmas filter in **Environments**, **Piece sets** or **Chessboards**. The four locations, eight collections, six boards and four tables are free. Curated setups combine a room, board, and matching pieces. The previews use frames rendered from the game.

| Location | Room preview |
| --- | --- |
| Luxury Christmas Cabin | [Cabin](../public/world-previews/christmas-cabin.webp) |
| Santa’s Workshop | [Workshop](../public/world-previews/christmas-workshop.webp) |
| Christmas Village | [Village](../public/world-previews/christmas-village.webp) |
| Northern Lights Christmas | [Observatory](../public/world-previews/christmas-aurora.webp) |

## Side Reel

Open the phone below the match board or press **P**. On wide screens it sits in its own column and can move to either side. On narrow screens it sits below the board. Use the arrow buttons, swipe or scroll to browse the finite library. Play each clip manually. Closing, minimizing or hiding the tab pauses playback.

**Phone settings** contains screen side, size, case, volume, turn auto-pause and the keyboard shortcut. Save built-in clips with the bookmark button. Local MP4 or WebM files play through browser object URLs and stay in the current browser session. Local files and the chess instructional clip are available in local and casual AI play. Competitive matches use the curated non-chess clips. The phone handles media separately from chess rules, clocks, input and networking.

The bundled *Winter window*, *Polar sky*, *Turned light* and *Smothered mate* videos and the bell music were made for this update. They are original animation studies, with the smothered-mate clip using a legal chess position. Video decoding uses the browser’s native player. The room uses original scene geometry and the previously credited cabin assets. [Existing cabin asset credits](immersive-worlds.md#assets)

## Browser captures

[Christmas menu](screenshots/christmas/menu.webp) · [Phone beside a 3D match](screenshots/christmas/phone.webp) · [Phone on mobile](screenshots/christmas/phone-mobile.webp)

## Performance sample

With the Santa’s Workshop pieces and Christmas Walnut board, Chromium’s SwiftShader at 520 × 340 in Performance mode drew 414–488 batches and about 216,000–276,000 triangles per frame across the four rooms. Batching the small decorative meshes saved 62 draws per frame in the sampled angle. Software rendering ranged from 0.2 to 0.8 FPS while other browser checks shared the CPU. These results characterize the cloud software renderer. Hardware frame rates still need measurement. The native player decoded a 360 × 640 built-in clip at its original size. It reported ten decoded frames and zero dropped frames in the short desktop smoke sample.
