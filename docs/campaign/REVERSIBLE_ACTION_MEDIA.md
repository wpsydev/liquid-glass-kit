# Source 27: reversible actions native evidence and original media

Isolated worktree `/tmp/liquid-glass-source27`, detached base `c74f6a21a96dbc54293bdbd1c2e49442a657b99e`. Root sources/tests/demo copied read only and remain byte-identical. No core or demo defect was confirmed; no unnecessary functional patch, package edit, commit, release or publishing action.

## Optional reproducibility patches

- `/tmp/liquid-glass-source27-benchmark.patch`: 4,538 bytes, SHA256 `4c34a0b0237bf16fbc2e2cbeafa879d42cb302b0e2c92d894ce1fcf0301e3831`; adds only `scripts/reversible-action-benchmark.mjs` and `scripts/reversible-action-browser-probe.js`.
- `/tmp/liquid-glass-source27-score.patch`: 3,429 bytes, SHA256 `d54ff53c374cbf403a0e864dcf8aeae161b8bdf6636c1c226fc085a5f2f95f39`; adds only `scripts/reversible-action-score.py`, an original procedural acoustic score generator.

Both pass read-only `git apply --check` against root. Copied source/tests/demo/node_modules and temporary camera/renderer edits are excluded. Score generator is optional to publish; the finished video is already self-contained.

## Checks

Strict standalone demo TypeScript and focused reversible suite (22 tests) pass. Full isolated `npm run check`: 41 test files / 798 tests pass, plus build and typecheck; `/tmp/lg-source27-check.log`. No packaging changes, so no pack check was needed. Model remains SSR import-safe and runtime dependency-free.

## Actual native behavior

Own T3 tab `tab_4n`; all recordings stopped. Evidence `/tmp/lg-reversible-native.json`.

- Physical Archive click first shows applying, with Undo disabled and the original card still present until the actual 220ms local Apply callback resolves. Available state then has a real receipt and the original object in provisional archive history.
- When the initiating card is removed, this demo rescues native focus to Undo. Physical Enter activates Undo; after the actual 180ms compensation resolves, the same original object, article DOM node and Archive button return in original order. Focus returns to that Archive button.
- Physical Commit finalizes the actual local archive after its callback resolves. History Restore becomes enabled and receives focus. Physical Enter restores the same object and returns focus to its original Archive button. This history action is independent of the concluded controller.
- The explicit Undo rejection fixture retains the acknowledged receipt and real archived object with error status. History Restore recovers host membership; controller status remains error, with no invented retry/rollback.
- The delayed Apply fixture ignores AbortSignal: disposal leaves the controller destroyed, but the original local host callback actually archives the item later. Its public outcome is observed as stale, the host entry says needs recovery, and Restore recovers it. No silent compensation or claim that abort prevented host writes.
- Native-browser pure-model async race fixture: duplicate Apply and Undo calls share their exact in-flight promises. Competing choices reject. Actual callback counts are Apply1 / Undo1 / Commit0; host membership and original receipt identity remain correct.
- Explicit timed mode: actual 3-second deadline selects Commit, and committed is reported only after the host callback resolves. Persistent history Restore remains available. It is a preview window, not irreversible-action authorization.
- Native focus, pointer and explicit manual pause reasons compose. Remaining stays 3000ms across the inspected pause; removing manual pause leaves focus/pointer pause active. Moving focus out leaves pointer pause active. Actual hidden-page/OS visibility was not simulated or claimed.
- Physical Quiet checkbox yields archive transition duration 0s. Physical Solid button yields `backdrop-filter: none` and pressed true. No idle animation or polling exists.

Responsive record `/tmp/lg-reversible-responsive.json`: 25 states, persistent / timed / committed / rejected Undo / stale Apply × 320×700 / 390×844 / 768×1024 / 844×390 / 1440×900. Zero page overflow, enabled native action/link/summary/checkbox-label targets under 44px, select fields below 16px text or 44px height, or horizontally clipped labels/status/headings. Long screens scroll vertically intentionally. These are native T3 desktop Chrome/Electron layout cases, not physical phones, Safari or assistive technology testing.

## Payload and honest benchmark

`/tmp/lg-reversible-payload.json`: optional standalone model 5,693 bytes / 2,250 gzip; source SHA256 `709b4309ff49aec02b2d9efff5c03e5d111fabc39b00a0660e4647c852f56328`. The pure model has no controller DOM, default CSS, document listener, RAF or connected-element lifecycle.

Native benchmark `/tmp/lg-reversible-benchmark-native.json` uses persistent mode and actual synchronous authored host callbacks. Apply moves the original object from a saved array to history; Undo restores it, Commit verifies the same receipt/history item. Every completed phase promise and postcondition is checked after timing. Host calls across warmups and measurement: Apply12,000 / Undo6,000 / Commit6,000.

| Pure-model workload | Median ms | p95 ms |
| --- | ---: | ---: |
| Construct / destroy | 0.002 | 0.008 |
| Construct / actual sync Apply / Undo / destroy | 0.008 | 0.010 |
| Construct / actual sync Apply / Commit / destroy | 0.004 | 0.006 |

Each value is a batch average of 50 calls; 100 measured batches after 20 warmup batches. Includes options validation/allocation, native AbortController and frozen states, local fixture arrays/authored callbacks, phase Promise creation, snapshots and destruction cleanup. Excludes async Promise/microtask completion (verified outside timing), deliberate demo 220/180ms waits, DOM/focus/style/layout/paint and network. These very small quantized shared-machine measurements are not whole-app action latency, remote callback performance, FPS or a before/after speed-up. No connected-controller benchmark is invented for a pure model.

Reproduce: `node scripts/reversible-action-benchmark.mjs`; inject the generated `/tmp/lg-reversible-helper.iife.js` plus `scripts/reversible-action-browser-probe.js` into an owned native preview tab; await `window.__runReversibleBenchmark()`.

## Distinct original film

- `/tmp/lg-reversible-showcase.mp4`: 791,717 bytes; SHA256 `5fab2932c8af339251900581c98668b7a31b5241a2758f1128ba368b8d2d060d`
- `/tmp/lg-reversible-showcase.png`: 322,961 bytes; SHA256 `43eb427de282026970d90623516edc6bde9713517bff16cdc65b64a989c7af15`
- `/tmp/lg-reversible-score.wav`: 2,304,044 bytes; SHA256 `66604121c109f568ebe95f2d0b61c2ed536c122aef8c41968fca8a97e5e0314f`

12s, 960×960 H264/yuv420p, 30fps export, AAC stereo 48kHz. New original acoustic-pop 116bpm with nylon pluck, brushed handclaps and woodblock, seed43, RMS .1185. Distinct melody contour, voicings, progression and rhythm from prior shared synth-score presets; no samples or artist imitation. Generated with the separate score patch above.

Actual native finite 10-second tour archives K01, Undoes K01, archives K02, Commits K02, restores K02 through persistent history, starts an explicit timed K03 action, pauses it, then Undoes while paused. Final state has six same-original-object references, zero archived entries, three actual operations, undone status, no outstanding host waits/fixture actions/tour steps. No inferred host success, hold-only action, deletion or backend rollback. Export 30fps is a media setting, not application FPS evidence.

Raw capture `/home/fieldwork/.t3/userdata/attachments/28105162-0472-4705-8632-6b21d2e581a1-05eeffa2-7c4e-4a43-8076-b18de360a540-mp4.mp4`.

Records `/tmp/lg-reversible-media.json`, `/tmp/lg-reversible-tour-native.json`, `/tmp/lg-reversible-raw.json`; full decode `/tmp/lg-reversible-frames.md5` contains 360 frames. Reviewed Apply1.1s, Undo2.3s, Commit5.5s, paused8.8s: `/tmp/lg-reversible-{apply,undo,commit,paused}.png`. Original content, all actual visible Archive/Undo/Commit/history Restore/active mode controls are unclipped, including disabled Restore in the timed state.

Temporary camera-only density CSS is recorded verbatim in tour/media JSON. It compacts margins/typography/art/card padding and places history headings inline. Inputs stay 16px and every visible native action remains at least 44px. Maximum visible control bottom, including disabled controls, is 865.73px; captions start882px. No business state/source data, layout source order or native semantics were replaced. Lower mechanics/footer content lies below the camera viewport and some is covered by captions; it remains on the full page. No camera/renderer changes are in the patches. Camera CSS removed and recording/tour stopped.

## Practical boundaries to highlight

The useful feature is a truthful host-owned receipt/compensation model with persistent native Undo as the default. A host must author controls, real mutations, error recovery, focus rescue, pause wiring and independent persistent Restore/history. It cannot infer safe rollback, enforce server authorization, recover partially applied failed host callbacks, or guarantee background deadline precision. Do not promise automatic DOM animation, automatic focus management, automatic hidden-page pausing, database transactions or financial safety. Those explicit boundaries keep the helper small and portable rather than requiring unnecessary framework machinery.

Root release assets: docs/campaign/assets/reversible-action-showcase.mp4 and reversible-action-showcase.png. Temporary paths above are isolated provenance; scripts/reversible-action-score.py reproduces the original acoustic score.
