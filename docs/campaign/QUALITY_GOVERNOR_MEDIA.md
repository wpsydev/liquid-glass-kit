# Current: bounded quality decisions

This release candidate uses the real optional `createGlassQualityGovernor` module. The original Canvas2D artwork is controlled by a host-owned mapping. Requested quality and applied rendering remain separate, including a visible declined mapping near the end of the film.

The 12-second showcase is a native T3 recording of the finite 10.5-second deterministic fixture tour. Synthetic traces are explicitly labeled on screen. It shows isolated spikes, a one-level downgrade, cooldown, slower recovery, manual hold, rejected gap evidence and host ownership. It does not measure GPU duration or establish a speedup.

The score is original upbeat jazz-funk at 104 BPM: a short-decay clavinet patch, major-seventh voicings, swung bass and a brushed noise rhythm, seed 61. No samples or artist imitation. Original art and music are MIT licensed.

## Native validation

The native T3 Chromium/Electron preview used five CSS viewport sizes: 320×700, 390×844, 768×1024, 844×390 and 1440×900. Seven policy contexts at each size produced 35 cases. Controls and checkbox labels met the library's 44px policy, fields used 16px text, horizontal overflow was zero, and each actual canvas buffer stayed below its applied tier cap. This does not verify physical phones, Safari or assistive technology.

A separate explicit six-second live run used actual requestAnimationFrame timestamp differences, production window defaults and a fresh context. It collected 360 observations in this run, retained only the latest 72 in the bounded trace, stopped both its frame and fallback timer, and made no further draw over the next 100ms. Native frame cadence includes scheduling and host work; it is not GPU elapsed time. The Node contract also proves cadence inputs are rejected by a GPU-elapsed context rather than silently relabeled.

Native validation found a demo boundary flaw: a real artwork geometry change kept previous evidence. The separate demo patch now resets timing evidence only when measured dimensions actually change during a live run. Requested level and manual lock persist. Native before/after evidence, unchanged core hash and the focused tests are recorded in `benchmarks/quality-governor-browser.json`. Scripted native control activations also verify invalid budgets, quiet cancellation, no replay, solid plate, preserved focused input value and declined mapping. OS reduced motion was observed false; a real OS setting was not changed.

## Cost scope

The optional standalone minified IIFE is 5,837 bytes, or 2,275 bytes gzipped. This is one entry, not an npm tarball or a network/load-time result. On this Linux Node 24 session, 100 batches of 2,000 samples after 20 warmup batches had a median 1.830ms and p95 3.719ms per batch (about 0.915µs per sample median). These synchronous model calls include input checking and frozen output copies; creation, native frame scheduling, Canvas2D, layout, paint and GPU work are excluded. No before/after speedup is claimed.

Validation passed: 70 focused quality tests, the isolated full `npm run check` (961 tests / 45 files), strict standalone demo TypeScript, standalone Vite production build and actual Node SSR import. Core source SHA-256: `addd9d47bd3df155c01b845b5190e1113f7dc8946593b97891389948f4b4c9a3`.

## Film provenance and reproduction

The recording-only 960px camera uses denser static CSS. It hides the below-the-fold policy prose, native runner, fixture selector and secondary interval/motion diagnostics; it retains actual controls, source labels, evidence, requested quality, actual mapping and native buffer dimensions. Full responsive validation preceded this camera. No fixture samples were substituted for the separate live measurement.

The original native capture is 10.85 seconds at 1920×1920, with variable event cadence. Export adds a 1.15-second final-frame hold and original stereo audio. The final H264/AAC 960×960 export has exactly 360 decoded frames at 30fps, 323 unique decoded hashes and no decode errors. Export frame rate is not a rendered performance claim. Frames at 0.8s, 4.5s and 9.7s were reviewed: captions remain below controls and the final mismatch is visible.

Reproduce model evidence with `node scripts/quality-governor-benchmark.mjs`. Generate music with `python3 scripts/render-quality-score.py --style funk --seed 61 --output /tmp/quality-score.wav`. Create the inline page with `node scripts/inline-preview.mjs --study quality --output /tmp/quality-inline.html`, load it into an owned native T3 tab, inject `scripts/quality-governor-capture.js`, start recording, await `window.__qualityFilm.record()`, then stop recording promptly. Finish it with `node scripts/render-quality-film.mjs --input <native-recording.mp4> --score /tmp/quality-score.wav --output docs/campaign/assets/quality-governor-showcase.mp4 --poster docs/campaign/assets/quality-governor-showcase.png --captions docs/campaign/QUALITY_GOVERNOR_CAPTIONS.json`.

Prepared locally. Parent agent owns integration, versioning, publishing and X. Do not describe these assets or the optional entry as published until the release is verified.
