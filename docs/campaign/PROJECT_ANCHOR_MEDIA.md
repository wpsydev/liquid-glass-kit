# Source 31: Parallax native validation and original swing film

Isolated worktree `/tmp/liquid-glass-source31`, detached base `48c2eaf49d6dbf1023bc4e9af0cd1a675c2c5111`. Core `src/project-anchor.ts` and its 16 tests are unchanged. No root/shared exports/package edits, commit, release or publishing action.

## Three scoped demo fixes

1. More studies footer link measured 12.5px high; it now has a native 44px minimum height.
2. Starting a tour used reset() to clear an explicitly selected Quiet or Solid preference. It now restores those choices before calculating the finite pose count. Native regression: quiet/solid stay checked, first transition uses one intentional pose, yaw reaches26, total render count2 after 2.1s. Cancel leaves render count stable.
3. The demo authored `backdrop-filter:none` before `-webkit-backdrop-filter:none`. Vite's CSS optimization left only the prefixed declaration; current native Chrome ignored it, leaving blur8px active. Reversing this order to match core material.css preserves the standard property. Rebuilt native CSSOM and computed Solid label pseudo-style now both report `backdrop-filter:none`. OS transparency fallback uses the corrected order too; actual OS preference emulation was not claimed.

No core defect confirmed. All edits are in `site/anchors/main.ts` and `site/anchors/style.css`; camera-only styles below are excluded.

- `/tmp/liquid-glass-source31-demo-fix.patch`: 24,013 bytes, SHA256 `3b2a1a0e5b4648d60b51b70f1c69ca365430125bb0b295f2bd7097b9ae5fe6ac`. Size reflects the original minified CSS line, not a broad stylesheet rewrite.
- `/tmp/liquid-glass-source31-benchmark.patch`: 6,268 bytes, SHA256 `35b3fe847d57a2aa33a92114f3cf84eb7836d7a7c3fc82d5c55bd928d1214bfd`; adds only `scripts/project-anchor-benchmark.mjs` and `scripts/project-anchor-browser-probe.js`.
- `/tmp/liquid-glass-source31-score.patch`: 3,611 bytes, SHA256 `9dd6928912e5353a6ec31d31982b2ab21cc1274a325199f09424e86d0e6237f6`; adds only the original `scripts/project-anchor-score.py` generator.

All three pass read-only root `git apply --check`. Copied core/tests/demo, temporary renderer and node_modules symlink are not included.

## Checks

Strict standalone demo TypeScript passed after the fixes. Focused projection suite: 16 tests. Full isolated `npm run check`: 43 test files / 845 tests pass plus build/typecheck; `/tmp/lg-source31-check.log`. No package changes, so no pack check was required.

## Native controls, math and layout

Owned T3 tab `tab_4p`; all recordings stopped. Evidence `/tmp/lg-anchor-native.json`.

Physical ArrowRight changes native yaw -16→-15; physical ArrowLeft changes FOV52→51. Input identity and focus remain stable. Physical clearing of point X leaves an incomplete draft and preserves the last valid projected point rather than coercing it. Actual boundary/behind button clicks update the host's world point and inspector; ordinary HTML label nodes retain identity. Behind W≤0 returns null coordinates and the host hides its label. Outside positive-W keeps finite inspectable coordinates but hides its off-frustum label. Inspector controls remain accessible outside the decorative SVG; no interactive semantic content is inside the artwork.

Independent reference math reconstructs the host's orbit camera coordinates directly from yaw/FOV/world point; it does not use the helper or multiply its returned matrix. Across scene/parallax/outside/behind × five viewports, maximum projection difference is `1.1368683772161603e-13` CSS-pixel/depth units. A separate actively painted native SVG screen-bounds comparison verifies actual drawn circle centers against CSS-pixel projections: maximum difference `0.00004244172680500924`px. Cached viewport dimensions agree with actual scene size.

`/tmp/lg-anchor-responsive.json`: 20 cases, scene / parallax / boundary / behind × 320×700 / 390×844 / 768×1024 / 844×390 / 1440×900. Zero page overflow, targets below44px, fields below16px font/44px height, or visible label boxes clipped by their scene. `/tmp/lg-anchor-screen-native.json` contains a further 20 actively painted native screen-position cases. Browser recording was used to activate painting; background preview can defer ResizeObserver and otherwise return stale viewport/cache bounds. Only settled active-paint screen measurements are retained as evidence.

Depth fixtures separately verify: WebGL near depth approximately-1, WebGPU near0, middle depths .65/.825 respectively at the same CSS512/174 location including authored12/24 origin; translated asymmetric ortho center CSS412/224; positive homogeneous scaling preserves ratios; positive-W off-frustum coordinates remain unclamped; behind camera returns null. Existing tests cover malformed/nonfinite inputs, exact matrix layout, inclusive clip tolerance, unsafe relative W and overflow.

These are native desktop T3 Chrome/Electron tests and viewport emulation, not physical phones, Safari or assistive technology certification. NDC depth is unremapped clipZ/W, not distance or z-index. Frustum membership does not test occlusion or DOM visibility. Host boxes use an explicit gutter/vertical offset policy separate from actual point leaders; overlap/collision/occlusion policies remain host responsibilities.

## Payload and separate workloads

`/tmp/lg-anchor-payload.json`: optional standalone helper 2,203 bytes / 1,055 gzip, source SHA256 `4e34a7b4cc54e97fb3c14985192aab67ef78d02129d1ee8be6f9e9bb518d1341`. No renderer, engine dependency, CSS or default-runtime growth.

Native benchmark `/tmp/lg-anchor-benchmark-native.json`:

| Workload | Median ms | p95 ms |
| --- | ---: | ---: |
| 1,024 validated projections, ordinary matrix array | 2.100 | 2.300 |
| 1,024 validated projections, Float32Array matrix | 2.100 | 2.300 |
| 1,024 validated projections, Float64Array matrix | 2.100 | 2.300 |
| Original host camera/SVG/HTML authoring, one pose | 0.425 | 0.600 |

Pure cases: 40 measured batches after10 warmups, 1,024 actual calls per batch, prepared point/matrix/viewport inputs outside timing; includes per-call descriptor validation, multiplication/division, clip checks and frozen result allocation. Host case: 40 measured batches after5 warmups, four actual poses per batch, total180 host renders; includes original host matrix computation, geometry and label projections, native SVG node creation/replacement, inspector/control/style updates and any synchronous style/layout work induced. Asynchronous paint/compositor/raster/GPU/network and initial fixture setup excluded. The host workload has many projections per pose and is separate, not subtracted from the pure workload. Timer quantization/shared-machine noise applies. No comparative speed-up, GPU acceleration, FPS or rendered1,024-DOM-label claim.

Reproduce: `node scripts/project-anchor-benchmark.mjs`; inject `/tmp/lg-anchor-helper.iife.js` and `scripts/project-anchor-browser-probe.js` into an owned native Parallax preview; call `window.__runAnchorBenchmark()`. Native math validation helper `window.__compareAnchorReference()` includes projected values and actual SVG screen bounds; activate preview painting before resize/screen checks. Host benchmark resets its authored scene afterward.

## Original 12-second film

- `/tmp/lg-anchor-showcase.mp4`: 764,408 bytes, SHA256 `4559a72eb5ab805bb3a5487581fc7a2153dd2c63d1edfb38a85f483a0ae4e7ab`
- `/tmp/lg-anchor-showcase.png`: 296,195 bytes, SHA256 `5fcbcf2f2dbe65ba736a25d6e2e5189431afbb1fed732c593c6c7674115c75a9`
- `/tmp/lg-anchor-score.wav`: 2,304,044 bytes, SHA256 `15c74f2c3233b0e859b2971518fb76aa52b30c175451c767958b82e2fca9b9fb`

960×960 H264/yuv420p,12s,30fps export, AAC stereo48kHz. New original 138bpm swing-jazz with synthesized upright walking bass, brushed drums, woody reed melody and vibraphone voicings. Seed47, original RMS .1393; new progression/melody/swing rhythm, no external samples or artist imitation. It is synthesized instrumentation, not a recording of live performers.

Actual finite10s tour uses scheduled host camera poses, selects the glass plane, moves the real probe outside the clip volume and behind the camera, restores perspective/parallax, then finishes with Quiet selected. Final state touringfalse,66 actual host renders in captured tour; no idle camera loop/timer remains. Render count is a host update counter, not frame rate, throughput or GPU evidence. The helper itself never schedules or renders.

Raw capture `/home/fieldwork/.t3/userdata/attachments/28105162-0472-4705-8632-6b21d2e581a1-395d9a8b-3245-48ad-b4ff-543f1b84410b-mp4.mp4`. Records: `/tmp/lg-anchor-media.json`, `/tmp/lg-anchor-tour-native.json`, `/tmp/lg-anchor-raw.json`. Full decode `/tmp/lg-anchor-frames.md5`:360 frames. Reviewed camera1.3s/outside4.3s/behind5.7s/quiet9.4s: `/tmp/lg-anchor-{camera,outside,behind,quiet}.png`.

Temporary camera density CSS is stored verbatim in the media/tour JSON. It brings the existing compact desktop styling into960px height, uses the existing three-column experiment layout, and reduces spacing; it does not replace points, matrices, controls, source order or semantic content. Native camera, inspector, boundary, quiet/solid, coordinate and matrix-disclosure controls remain fully visible: maximum bottom833.89px, at least44px actions and16px fields. Caption starts882px and covers lower method/footer content, not those controls. Camera CSS removed; owned tab is idle. Resizing naturally schedules one ResizeObserver render, distinct from an idle loop.

Suggested honest release emphasis: connect world-space meaning to native HTML using a small pure CSS-pixel projection helper, explicit clipping/depth conventions and host-owned rendering/visibility. Do not promise automatic renderer integration, occlusion detection, collision-free labels, raycasting, a WebGL scene, GPU performance or navigation/focus management.

Root release assets: docs/campaign/assets/project-anchor-showcase.mp4 and project-anchor-showcase.png. Temporary paths above are isolated provenance; scripts/project-anchor-score.py reproduces the original swing score.
