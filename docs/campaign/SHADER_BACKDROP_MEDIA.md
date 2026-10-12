# Light Studies: trusted shaders, native controls

Light Studies contains three independently authored analytic GLSL ES functions: Ice, Solar and Tidal. A bounded WebGL2 canvas owns the backdrop while headings, buttons, labels, ranges, compiler diagnostics and the glass note remain real HTML. There are no community shader copies, stock assets, remote source fetches, channels, sound shaders or arbitrary DOM capture/refraction.

`attachGlassShaderBackdrop` accepts trusted host source and caller-declared provenance. Source length, uniforms, DPR, dimension and pixel bounds do not constrain arbitrary instruction cost or certify GPU watchdog safety. The host owns source rights and visible fallback siblings. Neither the controller nor these tests verify a license declaration.

## Actual native WebGL evidence

`benchmarks/shader-backdrop-native.json` records actual desktop Chromium WebGL2 behavior. All three fragments compile, return distinct opaque native pixel samples and report GL error zero. Samples are read immediately after same-task renders because the context does not preserve its drawing buffer. GPU readback deliberately synchronizes correctness validation; it is excluded from performance timing.

An actual invalid fragment is rejected while status remains ready. The last valid program's nine sampled pixels and provenance remain identical. Real `WEBGL_lose_context` extension events produce context-lost state, hide the canvas through the host and leave the CSS/native fallback visible. Native restoration rebuilds the renderer, produces the expected pixel and remains paused. Subsequent settled 250 ms idle submits no new draws. This is an actual driver context-loss test, not a real GPU crash, watchdog test or synthetic context event.

Forty responsive cases cover eight states at 320×700, 390×844, 768×1024, 844×390 and 1440×900. They have no page horizontal overflow, native semantic controls and at least 44-pixel targets after the two measured header-link refinements. The decorative aria-hidden canvas still draws. These are viewport tests, not physical iPhone/Android/Safari or assistive-technology certification.

Actual native range ArrowRight changes warmth from 0.35 to 0.36 and keeps focus on that range. Actual study, bookmark, Play and Pause buttons work; the bookmark remains local. Quiet mode has time zero and no playback. Solid mode is an explicit host fallback. CSS visibility hiding stops an active clock and returning stays paused. Actual IntersectionObserver exit/return likewise stops playback and submits no continuing idle sequence after return. The host's cancellation callback can replace an offscreen reason with paused; visible state remains false at the boundary. No document-hidden or overlay/occlusion proof is inferred from those tests.

Oversized native canvas rectangles also exercise caps: 2400×1600 CSS pixels produce 1086×724 backing pixels, or 786264, below the 786432 budget. A 9000×100 rectangle produces 1536×17, respecting the configured dimension cap. The lower backing ratio trades detail for bounded backing dimensions; it does not guarantee equal visual quality, GPU memory or instruction time.

`shader-backdrop-boundaries.json` separately covers an explicit getContext-denial port on a real canvas. It returns unsupported, declines play/render and leaves native fallback text/button visible. That provided-port test is not a claim that this browser actually lacks WebGL2.

## Narrow host refinements

The brand link measured 27–34 pixels high and the mobile Source link 40.5 pixels wide. The demo now gives them 44-pixel minimum targets. The values preset previously submitted two draws/16 uniform calls while a normal input update submitted one/eight. Removing its redundant render leaves one draw at the existing clock, with no source recompilation or accidental seek rewind. This is a measured reduction of one redundant submission, not a GPU speedup.

Paused renderer facts previously displayed one submission while the actual controller had three after observer settling. The host now publishes exact counters when paused, while retaining sampling every 20 submissions during playback. The UI explains that sampling and labels the range Seek time, distinguishing its explicit cursor from the advancing play clock. Native regression observes one parameter-preset draw and equal displayed/actual paused counters.

The original Ice/Tidal functions also used four signed Gaussian squares through `pow(x, 2.0)`. The GLSL ES3.00 specification leaves negative-base `pow` undefined, so those expressions now use explicit `x*x`. The tested driver returns exactly the same nine sampled pixels for each corrected study, but this is a portability correction rather than proof across every GPU. [Khronos GLSL ES3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf).

The only framework-source change is an approved comment correction: static default does not mean exactly one lifetime submission. Native initial observer/resize settling can submit several still frames without advancing time. Actual native startup observed one then five submissions; the standalone fixture settled at three. Once settled it has zero continuous clock and idle submissions. No renderer behavior changed.

The core passed 30 focused unit tests. Complete isolated `npm run check` after host refinements passed 921 tests across 45 files plus exports/SSR/site/campaign checks. Strict demo TypeScript passed. `scripts/shader-backdrop-demo-probe.js` reproduces native responsive/state assertions on the unframed demo; unit mocks and native GL results remain separate.

## Scoped command and payload measurements

Run `node scripts/shader-backdrop-benchmark.mjs` to rebuild the standalone fixture without touching shared dist. Evaluate `scripts/shader-backdrop-browser-probe.js` in native T3 after loading `/tmp/lg-shader-backdrop-probe.html`.

The optional controller including its lifecycle helper is 10132 raw minified IIFE bytes/4441 gzip bytes. It excludes the three demo functions and material CSS. The benchmark uses an original finite analytic function at 128×96 backing pixels. Its 100 changed uniform updates and 100 explicitly requested manual renders intentionally make 200 submissions. Five batches of 40 commands have a median synchronous JS/driver wall time of 0.6 ms. The batch performs 1200 uniform call attempts, including 600 calls with non-null locations; optimized-out locations are counted separately. It performs zero recompiles, links or uniform-location queries during those command batches.

Each submission reads a native rectangle and computed style, so the batch totals 200 of each. Those queries may cause browser style/layout work when the host has changed layout. The controller does not claim a geometry-free render loop. The timing is not completed GPU execution, pixel throughput, frame time, FPS, browser loading time or a comparative speedup.

Five warm create/render/destroy sequences reuse one native context, with median synchronous wall time 2.7 ms. Driver compilation caching may apply; this is not a cold startup measurement. Six programs and VAOs, and fourteen compiled shader allocations including the rejected candidate, balance with deletion. Texture image/subimage and buffer-data uploads are zero for this procedural single-pass path. These are API call counts, not bytes transferred or universal renderer guarantees. Settled idle and post-destroy 250 ms request zero frames. No GPU timer query was used.

## Original 12-second film

`assets/shader-backdrop-showcase.mp4` is H.264, 960×960, 30 fps and 12 seconds, with stereo AAC at 48 kHz. All 360 frames and audio decode. Frames at 1.1, 3.2, 6.7 and 9.2 seconds were reviewed, showing all three styles and rejected-source recovery. Exact media byte counts/hashes are in `SHADER_BACKDROP_MEDIA.json`.

The native T3 recording follows the finite 10.5-second host tour, with explicit short playback intervals, real uniform changes and invalid replacement. Its final 387 submissions are command counters, never FPS or completed GPU work. It finishes paused with no continuing clock. Temporary camera density makes the art larger and hides extended compiler details/credits; native controls, renderer facts and replacement outcome remain above the captions. The camera compositing layer is a recording choice, not a source optimization.

Music is newly authored MIT procedural breakbeat at 148 BPM, seed 73, with an acid-bass voice, glass FM lead, fresh melody and alternating percussion patterns. There are no external recordings or samples. Reproduce it with `python3 scripts/render-shader-backdrop-score.py --seed 73 --output /tmp/shader-backdrop-score.wav`, then use the existing `scripts/render-series-film.mjs` with the raw recording and captions in the media JSON.
