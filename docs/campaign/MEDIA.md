# Campaign media

These are recordings and screenshots of a working interface built with this repository's real `attachGlass` controller and `src/styles.css`. The backgrounds, icons, artwork, and layout are code. No generated mockup is presented as a working product.

Live demo: <https://wpsydev.github.io/liquid-glass-kit/campaign/>

Source: `campaign-media/index.html`, `campaign-media/main.ts`, and `campaign-media/style.css`. The published entry is `site/campaign/index.html`; Vite bundles the shared demo source. The showcase uses the portable CSS material with `appearance: 'dark'`, `variant: 'clear'`, and explicit `reducedTransparency` changes. It does not request experimental SVG refraction.

## Assets

The original launch assets in this table use paths relative to this document. Images are 1280 × 800 WebP screenshots. Videos are silent 1280 × 800 H.264 MP4, 30 fps, with `yuv420p` pixels and metadata moved to the start for streaming.

| Asset | Content | Suggested caption |
| --- | --- | --- |
| `assets/liquid-glass-showcase.mp4` | 24 seconds: composer, solid preference, glass, media controls, warm palette | Real glass surfaces. A solid preference. One portable material. |
| `assets/solid-toggle.mp4` | First 10 seconds of the real showcase: glass → solid → glass | Prefer less transparency? Switch the same interface to solid. |
| `assets/media-focus.mp4` | Final 14 seconds of the real showcase: media scene, visual playback, palette change | One material for a player, toolbar, and widgets. |
| `assets/composer-glass.webp` | Composer, suggestion buttons, dock, sample weather widget | A glass composer for your next AI interface. |
| `assets/composer-solid.webp` | The same seven material surfaces with solid mode enabled | A readable solid mode is part of the material. |
| `assets/composer-reading-surface.webp` | Composer with a solid sample response surface | Glass for the controls. A solid surface for the response. |
| `assets/media-glass.webp` | Media controls and weather widget | A material that travels between interfaces. |

The response is labeled **Sample response (UI demo)**. There is no AI backend call. The player is labeled **Visual playback demo** and animates local progress; it does not play audio. Weather is labeled **Demo data**.

## Capture and verification

Captured on 2026-10-10 using the T3 collaborative browser. The browser loaded a self-contained production bundle compiled from the same demo source, with its stylesheet and JavaScript inlined for local preview. The public Pages route was then checked separately in the collaborative browser.

The original capture was compressed and trimmed with FFmpeg. Its native browser recording used 2560 × 1600 physical pixels for a 1280 × 800 CSS viewport; exported campaign videos use 1280 × 800 pixels. The short videos are excerpts of that real recording. Screenshots were encoded as WebP without compositing or adding UI.

Browser checks, separate from unit tests:

- Seven actual material controllers were present; inspected renderer attributes reported `css`.
- The solid button set all seven surfaces' `data-lg-solid` to `true`, then returned them to glass.
- Switching to media made the media panel visible. Play toggled `aria-pressed` and local progress.
- Submitting the composer produced its explicitly labeled sample response. Its reading surface had a computed opaque `rgb(16, 35, 41)` background.
- The 390 × 844 responsive layout had no horizontal overflow. This check used a resized desktop browser viewport, not a physical iPhone or Safari engine.
- The source respects reduced-motion queries for the background and album animation.
- Extracted frames at 5 and 18 seconds confirmed the exported full video shows the solid state and warm media scene. Full-file decoding completed without errors for all 720 frames.
- The public `/campaign/` page loaded, and its solid, media, and playback controls worked.

`npm run check` passed after the demo changes: type checking, 12 existing tests, library build, and the Vite multi-page site build. Those tests validate the library; they do not establish physical-device performance, browser-wide optical equivalence, or experimental refraction support.

## Behavior update — 2026-10-10

`assets/behavior-showcase.mp4`: 25s, 1280×1024, H.264/yuv420p at30fps, 558205bytes. Recorded in the native T3 Chromium preview using the actual production-built behavior demo transferred into the preview (localhost belonged to another app). `window.runBehaviorShowcase()` uses the actual controllers for density/tint/tone, synthetic touch/keyboard feedback, backing bounds, real scroll state and solid mode. The native recording was trimmed and encoded with FFmpeg; sampled frames confirm every chapter. It has no audio, backend AI, performance claim or physical-device claim.

Live demo: https://wpsydev.github.io/liquid-glass-kit/behavior/
X post: https://x.com/wpsygames/status/2108948352230703519
Source at capture: 399840a. Production Pages was separately checked after deployment, including the standard solid backdrop-filter reset. Existing scheduled campaign posts remain in place; this is a separate feature-update post.

## Motion update — 2026-10-10

`assets/motion-showcase.mp4`: 28 seconds, 1280×900, H.264/yuv420p at 30 fps, 1,396,026 bytes. Recorded with the native T3 preview from the production-built motion demo. The actual `attachGlassMotion` and spring indicator controllers drive press/release, interrupted selection and native popover appearance. Color mood changes and explicit reduced motion are part of the walkthrough. There is no audio or backend service.

The self-contained production bundle was transferred into the preview because browser localhost resolves to another application. FFmpeg trimmed/compressed the native recording and moved metadata to the start. Sampled frames at 0, 2, 5, 9, 18 and 24 seconds show press deformation, selection, popover and quieter/gold/ocean states. Full-file decoding passed. Export frame rate is not a device performance measurement.

Live demo: https://wpsydev.github.io/liquid-glass-kit/motion/
Release: https://github.com/wpsydev/liquid-glass-kit/releases/tag/v0.3.0-preview.1

The final mobile overflow containment does not change the recorded desktop composition. Existing scheduled campaign posts remain unchanged. Native optical merging, Safari/Firefox and physical iOS fidelity are not claimed.

Published motion video post: https://x.com/wpsygames/status/2108956899718656041
Release/install reply: https://x.com/wpsygames/status/2108957155802177814

## Owned-scene optics update — 2026-10-10

`assets/optics-showcase.mp4`: 26 seconds, 1280×900, H.264/yuv420p at 30 fps, 3,363,354 bytes. Native T3 Chromium recording of the production-built optics demo, with real WebGL2 scene rendering, moving measured lenses, tactile/spring controls, palette changes, refraction off/on and solid/quiet fallback. The native recording was trimmed and encoded with FFmpeg; no audio, copied artwork or composited glass footage. Sampled frames at 1, 5, 10, 13, 18 and 23 seconds show the actual states. Full decoding passed. Export frame rate is not measured device performance.

Captured from a self-contained production bundle transferred into the preview because its localhost serves another application. The shader refracts only its own procedural wallpaper; foreground labels remain HTML. Source inspiration is [Okan Doğu Budak's screen-space discussion](https://x.com/okandogubudak/status/2108947960621146517), credited in the demo and launch copy. Shader, visuals and demo are original.

Live demo: https://wpsydev.github.io/liquid-glass-kit/optics/
Release: https://github.com/wpsydev/liquid-glass-kit/releases/tag/v0.4.0-preview.1

Existing scheduled posts remain unchanged. No native optical parity, arbitrary DOM refraction, physical-device performance or social reach is claimed.

Published optics video post: https://x.com/wpsygames/status/2108961116877664553
Original-thread follow-up: https://x.com/wpsygames/status/2108961400622317981

## Mobile update — 2026-10-10

`assets/mobile-showcase.mp4`: exactly 12 seconds, 1080×1920 vertical, H.264/yuv420p at 30fps, 48kHz stereo AAC. Recorded in the native T3 Chromium preview at 432×768 CSS pixels (864×1536 capture), using the final production-built mobile source transferred into the preview. Four chapters show real spring press/release, selection retargeting, a native editable form sheet and actual 320px-wide shell reflow. The player is a visual UI demo; the exported promotional video has its own soundtrack.

The original 160 BPM instrumental is generated without samples by scripts/render-mobile-beat.py, under this repository’s MIT license. Eight-beat phrases align with each three-second chapter. FFmpeg trims/scales the capture, adds the original track, normalizes loudness and writes streaming metadata. Six sampled frames and complete audio/video decoding passed. Audio peaks at −4.4dBFS; no copyrighted track or outside media was used. Export 30fps is not device performance evidence.

Live mobile studio: https://wpsydev.github.io/liquid-glass-kit/mobile/
Release: https://github.com/wpsydev/liquid-glass-kit/releases/tag/v0.5.0-preview.1
Resolution evidence: [mobile-validation.json](mobile-validation.json)

Coverage comprises resized desktop Chromium, enlarged-text layout simulation and synthetic VisualViewport bounds. No physical iPhone/Safari, Android hardware or software-keyboard certification is implied.

Published video: https://x.com/wpsygames/status/2108968276214579284
Release/install reply: https://x.com/wpsygames/status/2108968592322482382
Publication receipts and exact copy: [mobile-update.json](mobile-update.json). X’s processed 720×1280 version played real frames and decoded audio; its transcode adds approximately 0.05 seconds. The source release file is exactly 12 seconds and 2,793,765 bytes. Existing scheduled campaign posts remain unchanged.

## Studio redesign — 0.6.0-preview.1

`assets/studio-showcase.mp4`: exactly 12 seconds, 1080×1920 vertical, H.264/yuv420p at 30 fps and stereo 48 kHz AAC. Native T3 recording of the final production-built material workbench transferred as a self-contained bundle. The actual controls and spring indicator drive frost, palette and corner changes; the detail is a native dialog. Original CSS light artwork, no copied footage or composited fake UI. The opt-in recording layout uses the same controllers with condensed page framing.

The original upbeat 120 BPM soundtrack is synthesized by `scripts/render-studio-beat.py` under MIT, without external samples. FFmpeg trims/scales the recording, holds its final frame for one extra frame if needed, normalizes the original audio and writes streaming metadata. Six sampled frames and full decoding passed. Peak −3.5 dBFS; export 30 fps is not a rendering performance claim.

`../assets/studio.webp` is an uncomposited 1280×900 native preview screenshot of the actual workbench, encoded as WebP. UI research, asset selection and MIT attribution are in `../UI_RESEARCH.md` and `../THIRD_PARTY.md`.
