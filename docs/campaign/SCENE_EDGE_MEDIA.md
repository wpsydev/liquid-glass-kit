# SEAM: pixel edges, original optics, honest comparison

The scene now has explicit `'legacy' | 'pixel'` edge coverage. Legacy remains default. The pixel option uses a local fragment-derivative footprint and bounded quad padding for lenses, decorative field instances and fused drops. It changes local coverage, not Apple's compositor, arbitrary DOM refraction, caustic transport or CSS controls. [API and cost discussion](../EDGE_QUALITY.md).

SEAM is an independently authored violet/cyan editorial study with one original Canvas2D poster and two actual WebGL scenes. Both begin static and legacy; only the right comparison explicitly opts into pixel. Native controls select geometry, backing caps, maximum DPR, manual phase, Quiet and Opaque. Unsupported/context-lost output shows the original host poster and explains that no optics are rendered. No copied shader, artwork, font or Book of Shaders asset is included.

## Native validation

`benchmarks/scene-edge-native.json` contains actual desktop Chromium compilation, pipeline selection, GPU readback and native context-loss/restoration evidence. All six optional optics shaders compile. Lenses, field and fusion give nonzero differences with GL error zero; ordinary geometry switches keep source uploads at one. A deliberate native compiler error falls back to legacy while retaining the ready source. After diagnostic removal and quality reset, pixel rendering returns. Context restoration rebuilds resources and uploads the source again.

Readback uses the same-task rendered buffer. The changed-RGBA-pixel count and mean RGB byte delta compare two outputs; they are not a quality score, a GPU timing or an improved-quality percentage. A separate original analytic circle fixture records broader partial coverage at a low backing scale. No GPU timer result was measured, despite the extension being available. Extra derivative work and padded fragments have hardware-dependent cost.

`benchmarks/scene-edge-responsive.json` has 20 cases: legacy, pixel, low budget and fusion at five viewport sizes from 320 to 1440 pixels. No horizontal page overflow, controls below 44 pixels, fields below 16-pixel text or clipped labels were found. Both comparison canvases use matching backing dimensions. Legacy/legacy differences are exactly zero; explicit pixel comparisons differ. Low-cap output stays below 65,536 backing pixels. Actual native DPR ArrowRight keeps range focus. Physical Inspect brings both offscreen scenes into view before reading, and preserves its own focus.

This is native desktop Chromium with emulated layouts, not physical iPhone/Android, Safari/Firefox or assistive-technology certification. The native capture predates the v0.48 integration clone; integrated scene, shader and texture source hashes match the fixture. Focused integration tests pass 85 cases; isolated baseline full check passes 1,081 tests across 52 files. Root's final integrated checks and publication are recorded separately.

Inject `scripts/edge-browser-probe.js` into the actual demo and run `__runEdgeCoverageProbe()` and `__runEdgePipelineProbe()` to reproduce the owned native fixtures. Active T3 recording enables real painting in a background preview. Diagnostic context methods are restored conditionally; temporary analytic GPU objects/canvas are destroyed. The demo's own finite user-triggered host tour is not a framework autoplay clock.

## Standalone payload, not a speedup

`benchmarks/scene-edge-payload-comparison.json` compares published v0.48 sources with this edge update using identical standalone minified ES2022 IIFE builds. Optional scene grows 33,488→35,012 raw bytes and 10,959→11,452 gzip bytes, a 493-byte gzip increase. Texture plus scene grows 43,901→45,410 raw and 14,471→14,962 gzip, a 491-byte increase. All nine exported legacy shader string hashes match. Node imports expose both controllers with no window/document.

Run `node scripts/edge-payload-comparison.mjs 583a8fd1a8ea3592efca450599030a7d1c668a38`. Lazy construction avoids eager optional string allocation, but does not remove those shipped bytes. `benchmarks/scene-edge-payload.json` records the earlier identical final source fixture; the comparison file adds the actual baseline/deltas. Neither measures default CSS/core, browser loading, paint completion, GPU execution or FPS.

## Original 12-second film

`assets/scene-edge-showcase.mp4` is H.264/yuv420p, 960×960, 12 seconds, 30 fps export and stereo AAC at 48 kHz. All 360 frames and audio decode; frames at 1.4, 4.8, 6.5 and 9.4 seconds were reviewed. Export frame rate is a media setting, not measured application FPS. Exact bytes, SHA256 hashes, raw native recording, captions and full decode log are in `SCENE_EDGE_MEDIA.json`; per-frame decode hashes are `benchmarks/scene-edge-frames.md5`.

The actual finite ten-second tour explicitly selects pixel, lowers the backing cap, moves 40 decorative tiles through 24 bounded host poses, switches to two fused drops, restores the larger cap and ends quiet. It finishes with zero scheduled tour timers; source uploads remain one per scene. Readback during the field poses retains its explicitly labeled last sampled phase rather than continuously synchronizing GPU readback. `benchmarks/scene-edge-tour-native.json` records actual states, dimensions and control bounds.

Temporary capture density CSS compacts margins, crops and control placement without replacing geometry, values or outcomes. It is recorded verbatim in the evidence. All relevant controls remain visible and at least 44px; inputs are 16px. The greatest relevant control/disclosure bottom is 876.32px, above captions beginning at 882px. Small footer notes can be below the captured fold. This camera-only CSS is absent from the shipped demo.

Music is a newly authored MIT 144 BPM two-step score with inharmonic glass tines, plucked sub, rim and shuffled drums, seed 59. It has a fresh melody, progression and drum pattern; no external recordings, samples or artist imitation. Reproduce with `python3 scripts/edge-score.py --seed 59 --output /tmp/lg-edge-score.wav`, then the existing `scripts/render-series-film.mjs` using the raw capture and three captions in the JSON. The WAV remains an external intermediate; the checked-in generator and finished AAC are sufficient to reproduce it.

## Suggested release emphasis

Opt-in pixel-aware local edges, visible legacy comparison, bounded backing resolution, observable compiler fallback and actual native readback. Keep derivatives/padding costs explicit. Do not advertise free quality, universal antialiasing, GPU speedups, pixel-perfect iOS, DOM capture or guaranteed device performance. The source guide distinguishes prototype inspiration from original implementation and verified behavior.
