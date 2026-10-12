# Proof / material review media

Proof is an original charcoal/cobalt/copper review workbench for the optional pure material-draft model. All artwork is CSS geometry authored for this project. Two actual material elements use the current canonical `getGlassProps` and portable material CSS: the pending preview and the independent local host baseline. This is a local fixture with no model request, server, storage, checkout or source rewrite.

## What the demo does

- Cobalt, Copper and Clear patch real normalized material options. Range/select controls patch the same draft, retaining note content and its caret. Rendering keeps the native controls in place.
- Before switches preview intent to the captured baseline while preserving pending options. After restores the pending preview. Undo/redo walk actual bounded material snapshots.
- Prepare compares the captured revision with the caller-supplied local host tag and freezes an immutable review request. The baseline remains unchanged. Native controls close edits on the prepared draft.
- Apply locally is a separate explicit host action. This synchronous local fixture checks the request against its own current tag, sets its actual local material, increments the host revision and updates the baseline element's CSS. A consumed request disables Apply. This does not establish server atomicity, authorization, persistence or remote idempotency.
- Changing the host revision demonstrates both prepare-time and apply-time conflicts. Edits/review data survive; material is not applied. Cancel returns baseline preview intent and discards editing history without rolling back an earlier host action. New draft captures the current host material/tag.
- Solid uses an explicit host material policy. Quiet adds no motion. There are no continuous animations or polling loops. The optional finite host tour is 10.5 seconds and stops; user actions and page visibility cancellation cancel its timers.

`window.__materialReviewDemo` exposes `reset()`, `cancel()`, `preset(name)`, `tour()` and `state()`; state is a function. It reports actual draft/request/host state, an authored note, bounded changes and tour/policy flags. Prepared review data is not presented as persisted data.

## Native browser evidence

`benchmarks/material-review-native.json` preserves 75 cases: 15 real fixture states at 320×700, 390×844, 768×1024, 844×390 and 1440×900 CSS pixels. The native desktop Chromium DOM proves no horizontal page overflow and every effective button/link/range/select/textarea/checkbox-label target at least 44×44 px. Range/select/textarea text uses 16 px. A small checkbox's associated clickable label provides its target, rather than claiming the 19 px checkbox alone is 44 px.

The matrix uses explicitly programmatic fixture clicks; native collaborative browser input was separately checked in `benchmarks/material-review-actions.json`. Real typing filled the note with `keep these edges quiet`. A host-selected range 5–10 remained selected with the textarea focused during a material preset update. A real range click followed by native ArrowRight produced blur 33 in the draft while the host stayed 18. Native Before and Prepare retained pending 33 in the immutable request while both displayed Before and the baseline stayed 18. Native Apply then changed the baseline CSS to 33 px and its revision to local-r2, disabled the consumed Apply button and retained the note.

Both prepare-time and prepared-apply conflicts preserved edits and kept the actual baseline intact. Actual computed `::before` backdrop-filter changed from `blur(0px) blur(18px) saturate(1.35)` to 8 px for Copper. Solid changed that pseudo-filter to `none` and the element fill to an opaque RGB 25/33/51. This browser supports backdrop filtering and continuous corner shape. The app still uses the canonical round-corner fallback where that CSS enhancement is unsupported. OS reduced-motion/transparency values were read as false; no physical OS preference change was performed. There were 0 native Web Animations after settling.

These checks are not physical iPhone/Android, Safari, assistive-technology or universal material-support certification. Native typed/focus/selection probes are narrower than full form/AT audits. Local revision checks cannot prevent an asynchronous server race.

## Scoped performance evidence

Run `node scripts/material-review-benchmark.mjs` for reproducible standalone optional-model payload and Node pure operation batches. The minified ES2022 IIFE is 3917 bytes raw / 1756 gzip including its canonical material resolver/numeric helper. Portable material CSS is separately 6916 raw / 2033 gzip. These are optional standalone artifacts, not a measurement of the package root or total application bytes.

Five batches of 4000 cycles constructed actual drafts, patched twice, undid/redid, previewed Before and prepared review data. 20000 cycles completed. Median 129.44 ms per 4000 was observed in Node V8; no DOM, CSS, layout, network, storage, paint or GPU work occurs in this pure model scope. The benchmark executes caller objects in the same VM realm as the model; it does not assert cross-realm object support.

`scripts/material-review-host-probe.js` separately measures the actual connected demo. Five batches of 80 reset→preset→prepare→explicit Apply cycles yielded median 15.6 ms per 80 cycles. 400 cycles include all the demo's field/state/JSON rendering, attribute and CSS variable writes. Instrumentation counted 19200 CSS property writes and 22400 attribute writes, 0 rect/style reads and 0 requested animation frames in those batches. This excludes later painting; instruments themselves add overhead.

A separate five-by 30 batch expressly forces native geometry/computed-style reads after reset/preset. Median 8.6 ms per 30 cycles includes possible style/layout resolution. No claim that these reads are free or GPU-timed is made. 250 ms native idle checks before and after work recorded 0 RAF, rect/style reads, CSS writes or attribute writes. No comparative speedup, FPS, GPU completion, cold-load or physical-device performance claim is supported.

## Video and original score

`docs/campaign/assets/material-review-showcase.mp4` is 12 seconds, H264 High yuv420p 960×960 at 30 fps with AAC stereo 48 kHz. The complete 360 frames and audio decoded successfully. Four frames at 1.1, 3.9, 6.8 and 9.7 seconds were reviewed: Cobalt, Copper, prepared-not-applied, then the preserved conflicting Clear draft with the actual Copper baseline. Captions remain below the native controls and status.

The native finite tour starts static, edits Cobalt, compares Before/After, stages Copper, undoes/redoes, prepares, explicitly applies locally, then shows an unprepared conflicting Clear draft. The final state is not touring, with 1 actual local apply and 1 conflict. Its local revision is r3, actual baseline blur 8 and pending blur 3. Last frame padding extends the native capture to 12 seconds.

The camera-only density stylesheet is recorded in actions evidence. It compacts the page and hides corner/note/conflict controls, review JSON and footer in this video, while preserving visible native controls, material cards, revisions and status. The shipped page includes the complete editor and review record. Camera composition is not a rendering performance claim.

The score is original jungle at 160 BPM, seed 89: inharmonic airy bells, hand drums, soft bass and synthesized breakbeat. Melody/rhythm/instruments were written for this demo; it contains no licensed third-party song, recordings or samples. Reproduce it with:

```sh
python3 scripts/render-material-review-score.py --seed 89 --output /tmp/material-review-score.wav
```

Render the captured browser video with the unchanged shared `scripts/render-series-film.mjs` using the raw path and three captions in `MATERIAL_REVIEW_MEDIA.json`. The raw file is environment evidence, not a published URL.

Full isolated `npm run check` passed 607 tests / 34 files, including 57 material-draft tests. Strict standalone demo TypeScript passed with Vite CSS declarations. Core source, tests and the existing `material-draft.patch` were unchanged; the media/demo patch excludes core/shared/package files. Root owns final release packaging, published URLs and X publication.
