# Material preferences media and validation

The original Side B demo shows scoped appearance, explicit quiet mode, independent nested choices and a preserved local peach palette. The film records the demo's real `__preferencesDemo.tour()`: light/arrival, dark/overlap, then quiet/afterimage at 0, 3.2 and 6.4 seconds. The tour completes at 9.6 seconds and settles; the final export lasts 12 seconds. Three finite heading transitions settle, quiet mode forwards `reducedMotion: true` to the existing host motion adapter, and zero document animations remain at the final readback.

- Video: [material-preferences-showcase.mp4](assets/material-preferences-showcase.mp4)
- Poster: [material-preferences-showcase.png](assets/material-preferences-showcase.png)
- Detailed capture, camera CSS, state samples, music provenance and hashes: [MATERIAL_PREFERENCES_MEDIA.json](MATERIAL_PREFERENCES_MEDIA.json)

The H.264/yuv420p export is 960 × 960, 30 fps, 12.00 seconds, with AAC stereo at 48 kHz. Full video decoding produced 360 frames and full audio decoding passed. Reviewed frames at 0.8, 4.5 and 9.2 seconds show all three real appearance states, legible controls and a policy receipt above the caption strip. The export contains 657,552 bytes, SHA-256 `57ad467689c803b07c382abf27a01d313b420901867435d23bdbcea46d3e218a`. Export frame rate does not measure application or GPU rendering speed.

The score is original procedural music under MIT, with no external samples: cinematic, 96 BPM, piano patch, seed 31. Regenerate it with `python3 scripts/render-series-score.py --style cinematic --seed 31 --output /tmp/material-preferences-score.wav`, then use `scripts/render-series-film.mjs` with the native recording, score and three captions stored in the JSON metadata. The raw native recording path is also recorded there.

Temporary camera CSS compacts spacing and columns for the square export and hides the long system explanation and secondary storage/footer controls. It does not alter source files, controller state, widget geometry measurements or native interaction behavior. The actual theme/motion/transparency controls, nested scope, note editor, authored artwork, local palette and resolved policy remain visible. The receipt ends at CSS y = 872.55; captions begin at y = 882. The exact preview-only CSS is retained in metadata for reproduction.

# Native browser evidence

[material-preferences-native.json](../../benchmarks/material-preferences-native.json) contains 15 measured cases: light, dark and quiet at 320 × 700, 390 × 844, 768 × 1024, 844 × 390 and 1440 × 900. All cases had no horizontal document overflow, controls with at least 44 px hit targets and 16 px select/textarea text. The checkbox's associated clickable label supplies its 44 px hit target. These are CSS viewports in native desktop Chromium, not physical phone or Safari tests.

Computed surfaces verify that the automatic main material changes from light to dark, the nearest nested dark scope retains its own requested palette, and the explicitly authored local light/peach/ink palette remains intact. Quiet mode makes the main surface opaque and disables its material effect pseudo element. The nested scope remains independently requested; system reductions, when detected, remain authoritative.

Native textarea typing, two ArrowLeft keys, a policy change, clicking Save, pressing Enter and navigating to the next note and back preserved the exact edited string. The policy update preserved focused editor selection at position 84. The saved note remains session-only. Native select keyboard selection was not established reliably in this preview transport, so this report does not claim that particular keyboard path.

Native T3 color-scheme emulation changed live `matchMedia` from light to dark while both scopes requested `theme: 'system'`. Both actual scope attributes followed with `lastReason: 'system'`. Browser event painting was enabled by a short native recording; the OS settings themselves were not changed. The actual other media-query snapshot was false for reduced motion/transparency, increased contrast and forced colors. Those false matches do not establish support. Live changes for those four queries, assistive technology, physical devices, Safari and zoom remain untested here.

A supplied Map-backed storage port accepted explicit remembering, restored the same settings on controller reattachment and cleared only the dedicated key, leaving an unrelated value and session notes intact. A supplied read-denial fixture reported failure and retained usable in-memory controls. On the real `about:blank` origin, browser storage access was denied and remembering reported false. Supplied-port success is not evidence of real-origin persistence, physical reload or cross-tab behavior.

# Reproducible optional-controller measurement

Run `node scripts/material-preferences-benchmark.mjs` to rebuild the optional standalone minified ES2022 IIFE without touching shared `dist`. Load its `/tmp/lg-material-preferences-probe.html` document in the native T3 tab, then evaluate the async expression in `scripts/material-preferences-browser-probe.js`. Keep this fixture separate from Side B's finite motion adapter. Raw results are in [material-preferences-browser.json](../../benchmarks/material-preferences-browser.json); payload facts are in [material-preferences-payload.json](../../benchmarks/material-preferences-payload.json).

The controller including its environment helper is 5,612 raw / 2,335 gzip bytes as a standalone IIFE. Its optional CSS is 3,424 raw / 847 gzip bytes; prerequisite `material.css` is excluded from that CSS number. These are payload measurements, not import-bundle guarantees or a before/after speedup.

The connected probe exercised 32 ordinary scopes, 20 cycles per batch, five batches: 3,200 attach/set/duplicate-set/refresh/reset/destroy sequences. Observed batch times were 33.7, 27.4, 19.3, 15.5 and 15.9 ms, median 19.3 ms per 640-sequence batch. It counted zero custom RAF requests, zero JavaScript `getBoundingClientRect` reads and zero additional RAF requests during the subsequent 250 ms idle window. MQL change listeners were balanced at 16,000 added and 16,000 removed, and authored attributes were restored. Timings include synchronous controller/listener/attribute work and exclude layout, paint, material blur, GPU rendering and the demo's animation adapter.

The same native standalone fixture verified mounted scopes sharing one explicit storage object/key, successful key-only clearing and read/write/remove denial phases. Those additional storage cases are reported outside the measured lifecycle timings.

The 24 existing material-preferences unit tests pass separately from these native checks. Both new benchmark scripts pass Node syntax checks. Parent release validation owns the complete repository check, package assembly and publication; this preparation does not claim a published version, working public URL or X post.
