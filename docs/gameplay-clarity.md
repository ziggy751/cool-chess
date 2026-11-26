# Gameplay clarity update

## Move guidance

- A green dot marks a legal empty destination. A green ring marks a legal capture, including en passant. The selected piece lifts above its square. The check ring marks the threatened king.
- The last move leaves two gold markers. The destination is stronger, and a dashed destination marks a capture. The optional arrow can be enabled in **Settings → Gameplay visibility**.
- **Minimal**, **Clear**, and **Beginner** set the marker size, opacity, outline and notification preferences. The settings save in the current browser and apply in 2D and 3D.
- Review an earlier position by clicking its move in the list. **Return to live game** restores the current position. Cancel a blue premove with **Cancel premove** or **Esc**. The game checks the move again when your turn begins.

## Browser captures

| View | Previous release | Gameplay update |
| --- | --- | --- |
| Legal moves on the animated lava board | [3D](screenshots/gameplay-clarity/before-webgl.webp), [2D](screenshots/gameplay-clarity/before-2d.webp) | [3D selection and dots](screenshots/gameplay-clarity/webgl.webp) |
| Move and capture | | [Last move and arrow](screenshots/gameplay-clarity/last-move.webp), [Capture ring](screenshots/gameplay-clarity/capture.webp), [Eight board surfaces](screenshots/gameplay-clarity/surfaces.webp) |
| Visibility and touch controls | | [Visibility settings](screenshots/gameplay-clarity/settings.webp), [Mobile 2D](screenshots/gameplay-clarity/mobile.webp), [Mobile 3D](screenshots/gameplay-clarity/mobile-webgl.webp) |

The 3D move guides are projected from the board into a separate layer, so the tone mapping and reflections of the scene do not affect their color. Selection uses the main piece mesh and the board plane. Decorative meshes stay outside the picking targets. Last-move highlights and clocks are drawn from the accepted game state.

## Verification

The 23 Node tests and 13 Chromium tests cover legal moves, pins, check and endings, castling, en passant, underpromotion, all 30 AI settings, Ranked AI, mobile layout, saved games, the showroom and photography. The added multiplayer test creates a room, joins through the invite with a second browser context, cancels an invalid premove, completes a legal one, compares clocks, and verifies the capture again after reload. The Cloudflare Worker passed its dry run and the WebSocket test against a local Durable Object.
