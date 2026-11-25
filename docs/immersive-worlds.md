# Immersive worlds

The 31 supplied images informed the rooms, materials, camera views and showroom. The environment picker previews a render of the geometry that loads into the game. The cabin, penthouse and orbital observation deck received the most detailed furnishings and views.

## Browser captures

| View | Previous release | Immersive update |
| --- | --- | --- |
| Match | [Angled match](screenshots/immersive/before-match.webp) | [Mountain Cabin seated](screenshots/immersive/cabin.webp), [Cyberpunk Penthouse free roam](screenshots/immersive/neon.webp), [Space Station seated](screenshots/immersive/orbit.webp) |
| Collection | [Showroom](screenshots/immersive/before-showroom.webp), [environments](screenshots/immersive/before-environments.webp), [boards](screenshots/immersive/before-boards.webp) | [Location and table showroom](screenshots/immersive/showroom.webp) |
| Individual piece | [Previous piece editor](screenshots/immersive/before-piece.webp) | [Liquid Mercury in the piece editor](screenshots/immersive/piece.webp) |
| Other screens | [Home](screenshots/immersive/before-menu.webp), [ranked AI](screenshots/immersive/before-ranked.webp), [multiplayer](screenshots/immersive/before-multiplayer.webp) | [Photography controls](screenshots/immersive/photography.webp), [mobile free roam](screenshots/immersive/mobile.webp), [ranked AI](screenshots/immersive/ranked.webp) |

The location previews cover the showroom angle for all 25 rooms. A separate sheet records the view from the other side of each table. [Location previews](../public/world-previews) · [Alternate viewpoints](screenshots/immersive/location-walkthroughs.webp)

## Rendering

Only the selected location and table enter the scene graph. Loading another location releases the previous scene geometry, materials and textures. Low uses shorter particle lists, lower geometric detail and a shared reflection environment. Higher quality settings capture a local reflection cubemap after room changes. Ultra and Cinematic also refresh it periodically while the environment moves. The photographs use the same camera and scene as the game.

There is more close-up detail in the three priority locations than in the remaining procedural worlds. Weather, water and fire run as shaders and lightweight geometry. Some requested production techniques, including baked global illumination and a full location soundtrack, are outside this release. World lighting adjustments use presets.

## Verification

The Node suite passed 23 tests. Browser checks covered 3D and 2D input, all 30 AI levels, Ranked AI, private multiplayer with reconnect, legal special moves, mobile layout, saves, and showroom presets. All 31 animated collections and 16 animated boards rendered distinct shader phases. A separate regression case switched rooms and tables during a match, exported a PNG with background blur, and verified the position was preserved. The production Worker bundle passed Wrangler’s dry run and the local Durable Object passed the socket test.

### Software rendering sample

The benchmark used Chromium with SwiftShader at 640 × 420 and a fixed free-roam camera. Setup time includes the room assets and three warm-up frames. The cloud CPU was shared with browser checks during part of the run. These measurements describe that software renderer. The 60 FPS target still needs testing on hardware-accelerated devices.

| Location | Preset | Triangles before | Triangles after | Setup after | Software FPS after |
| --- | --- | ---: | ---: | ---: | ---: |
| Mountain Cabin | High | 1,055,454 | 414,942 | 13.7 s | 0.36 |
| Mountain Cabin | Performance | 457,928 | 135,216 | 8.0 s | 0.38 |
| Cyberpunk Penthouse | High | 814,052 | 251,732 | 13.3 s | 0.27 |
| Cyberpunk Penthouse | Performance | 421,040 | 112,056 | 3.2 s | 0.77 |
| Space Station | High | 786,886 | 224,566 | 7.2 s | 0.71 |
| Space Station | Performance | 397,134 | 88,150 | 2.9 s | 1.03 |

Returning to Mountain Cabin after four location switches left renderer counts at 90 geometries and 50 textures. The browser’s reported JavaScript heap moved from 25 to 26 MiB after garbage collection. Free-roam checks verified the scene boundary and the table collision. The showroom's high-detail piece inspector retained the detailed mesh, and the match uses a lighter version of the same silhouette.

## Assets

| Game files | Source | Terms |
| --- | --- | --- |
| `carved-chair.glb` | [ArmChair 01 by Poly Haven](https://polyhaven.com/a/ArmChair_01) | [CC0](https://polyhaven.com/license) |
| `lounge-chair.glb` | [Modern Arm Chair 01 by Poly Haven](https://polyhaven.com/a/modern_arm_chair_01) | [CC0](https://polyhaven.com/license) |
| `granite.glb` | [Rock Face 01 by Poly Haven](https://polyhaven.com/a/rock_face_01) | [CC0](https://polyhaven.com/license) |
| `moss-rocks.glb` | [Rock Moss Set 01 by Poly Haven](https://polyhaven.com/a/rock_moss_set_01) | [CC0](https://polyhaven.com/license) |
| `fern.glb` | [Fern 02 by Poly Haven](https://polyhaven.com/a/fern_02) | [CC0](https://polyhaven.com/license) |
| `wood.webp`, `wood-normal.webp` | [Wood Planks by Poly Haven](https://polyhaven.com/a/wood_planks) | [CC0](https://polyhaven.com/license) |
| `studio-small.hdr` | [Studio Small 03 by Poly Haven](https://polyhaven.com/a/studio_small_03) | [CC0](https://polyhaven.com/license) |
| `earth.webp` | [NASA Earth Observatory, Blue Marble](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) | [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) |

The Poly Haven models are repackaged as local GLB files with their textures embedded. Wood maps and the Earth surface are local WebP files. Room ambience and chess sounds are synthesized in the browser.
