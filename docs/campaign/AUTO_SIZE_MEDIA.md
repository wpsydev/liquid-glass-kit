# Source23 auto-size handoff

Isolated worktree `/tmp/liquid-glass-source23`, base `316f24819414649bef7431ad5bfcf6127028af06`. Root helper/tests/demo/scripts copied read-only. No root/shared exports/package/version changes, commits, release or publication. Demo main/HTML/CSS remained unchanged.

## Separate proven core fix

`/tmp/liquid-glass-source23-core-fix.patch`: 1,687 bytes, SHA256 `cead2c73cd5858a693593c0b8057e2648dbb4202a03c48a78305204947e89c6b`.
`/tmp/liquid-glass-source23-test-fix.patch`: 3,436 bytes, SHA256 `625e15ad06d3920936279a334956fb00e9d70e4462814111817a539fa4feb905`.

The lease stored the raw requested height, while native Chrome serialized the fractional pixel value differently. With fractional content-box padding/borders, the controller wrote approximately23.72183px; Chrome returned23.7218px. The untouched animation falsely resolved external-owner and left that numeric height with its original important priority lost. Actual before/after evidence is in `/tmp/lg-auto-size-native.json`. The narrow fix records getPropertyValue/getPropertyPriority after the controlled write. Initial/original values were already CSSOM-read; existing external-owner safeguards remain in place.

Regression models the actual native significant-digit round trip, fails external-owner before the patch and verifies retarget, finish, original auto/important restoration, unrelated host color preservation and destroy afterward. Native fractional fixture confirms retargeted→finished, both height/block-size auto important restored, then destruction during another transition also restores both. Both patches reverse-check against the isolated copy and read-only apply-check against root.

Focused24 tests pass. Full isolated `npm run check`:39 test files,739 tests, typecheck/library/site/SSR/export/campaign checks pass; log `/tmp/lg-source23-check.log`. No packaging changes. Fixed helper source SHA256 `ac35b501b5fcb6fcbc83ae1a881bf528d2d523c4d9c30b8d67f9d41225c8495b`.

## Actual native validation

Own T3 tab `tab_4f`, created after status/open. Other root/X/demo tabs untouched; all recordings stopped. `/tmp/lg-auto-size-responsive.json`:20 settled active-paint cases, compact/expanded/focused/narrow at320×700,390×844,768×1024,844×390,1440×900. Zero horizontal overflow, zero enabled actions below44px, draft font16px, zero settled content clipping, no retained numeric height/block-size. Desktop Chromium/Electron layout emulation only; not physical phones, Safari or screen-reader coverage.

`/tmp/lg-auto-size-native.json` records:

- Physical outside Expand-context action creates real native WAAPI height motion: active frame height315.828125→323.1484375, natural endpoint324, then zero animations and empty owned sizing
- Actual add/remove host notes and rapid updates retain input identity; rapid changes produce retargeted then finished with no animation left
- Focused preset preserves the same draft, value and selection5–10; immediate reasonfocus, zero animations, natural sizing
- Width512.40625→390 reflows content408→462 with focused draft/selection intact and no animation; observer owns that responsive snap rather than claiming text scaling
- Native summary Enter opens real details with summary focus and no active height animation; observer/event scheduling may give unchanged outcomes, so an exact reasonfocus is not claimed for that native-details case
- Physicalx replaces the selected native input text and leaves the same input; physical Hide-draft leaves focus on the outside Edit button
- Explicit Quiet gives reduced-motion, real content still visible, zero animations and numeric inline styles cleared; OS reduction remains authoritative in core tests
- Authored fractional padding/border/min/max preserved for content-box and border-box. Content-box border heights clamp92.359375–223.109375, while border-box clamps80.125–210.875. Host-authored max/overflow can intentionally constrain content; this is preservation, not a promise that an arbitrary constrained host layout never clips
- Native normalization regression and cleanup as described above

The controller supplies size transitions, not disclosure semantics or business callbacks. The host owns notes, visibility, focus rescue and validation. Real height motion incurs layout/paint; no GPU-only claim.

## Reproducible scoped benchmark

`/tmp/liquid-glass-source23-benchmark.patch`: 4,257 bytes, SHA256 `8fe541b494a8a8ae7a84a05f00b50cfa08f627e430ea8d88d2f1f018a6a7be95`, containing only `scripts/auto-size-benchmark.mjs` and `scripts/auto-size-browser-probe.js`.

Run the builder to produce `/tmp/lg-auto-size-helper.iife.js` and `/tmp/lg-auto-size-payload.json`. Inject the IIFE and probe into an actual T3 page, run `window.__runAutoSizeBenchmark()`, and save the returned record.

Standalone optional controller5,851bytes/2,469gzip including numeric/lifecycle helpers, no required CSS and default material runtime unchanged. `/tmp/lg-auto-size-lifecycle-native.json`:20 existing connected natural fixtures,400 measured batches after50warmups, attach/destroy median0.015ms/p950.035ms per-cycle batch average; input/style identity and cleanup pass.

Measured workload includes precondition validation, native computed styles/rectangles and any synchronous style/layout processing those reads induce, observer/listener lifetime, ownership and teardown. Setup/preparation, content mutations, active animation, retarget/focus/resize paths, async waits, asynchronous paint/compositor/network are outside this timing. Warming layout does not prove reads never induce synchronous layout; no trace-based exemption or comparative speed-up is claimed. Quantized batch averages are not per-action latency/FPS.

## Actual finite tour and original film

Video `/tmp/lg-auto-size-showcase.mp4`:666,747bytes, SHA256 `f0bc86bcce89c4bfac9e3fd2a18b000f1ff4b904af6eeab26a1ad75f840e046c`.
Poster `/tmp/lg-auto-size-showcase.png`:276,141bytes, SHA256 `2199506a363253b2b5d442402a9e59cf3c4159d44bb974000800b1c9f04f9fc2`.
Raw native recording `/home/fieldwork/.t3/userdata/attachments/28105162-0472-4705-8632-6b21d2e581a1-39bfbcc3-6fdb-47e6-a39c-a3d74ecc65e2-mp4.mp4`.

12seconds,960²,H264High/yuv420p,30fps export,AAC-LCstereo48k. Full decode360 frames passes (`/tmp/lg-auto-size-frames.md5`, `/tmp/lg-auto-size-decode.log`); grow2.6s/narrow6.3s/focus9.1s reviewed. ExportFPS is not application-performance evidence.

Original procedural cinematic96BPM/piano/seed39,RMS0.12, no external samples. `/tmp/lg-auto-size-score.wav`:2,304,044bytes,SHA256 `66aa3cead4834c1fedbf7ffaec0d24613d849f97d360f728319bbbb271948aa6`; score record `/tmp/lg-auto-size-score.json`. Media metadata `/tmp/lg-auto-size-media.json`; captions `/tmp/lg-auto-size-captions.json`.

Captions: “Real content. Finite natural-height motion.” / “Rapid updates retarget. Narrow layouts reflow.” / “The same draft. Focus and caret stay put.”

No camera-only CSS, scroll choreography, fake values/errors/heights or alternate render were needed. The actual10s `__sizeDemo.tour()` was captured after a fresh page load; `/tmp/lg-auto-size-tour-native.json` stores actual half-second states. Maximum action-bottom802.375px and tour-controls-bottom869.375px, above caption band y882. Actual final state:3 notes, original draft selected5–10, focused, same input/frame, no active animation or inline sizes, tour stopped. Native capture1280² for960CSS then scaled960². The local copied renderer's opaque ink caption band covers only lower presentation text/footer; rendering script excluded from patch.

Root release assets are docs/campaign/assets/auto-size-showcase.mp4 and auto-size-showcase.png; /tmp paths above describe isolated capture provenance. The common render-series-score.py and render-series-film.mjs reproduce original piano/seed39 score and caption framing.
