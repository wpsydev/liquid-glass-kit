# FIELDNOTES: original art, explicit meaning

FIELDNOTES is an original graphite/coral illustration studio. Six independently drawn layers compose a house, pine, sun, ground, shrub and bird. Seven original SVG files total 3,443 bytes, including an alternate portrait house. No Kitbitz catalog, paid assets, external fonts or copied illustration code is included. [Optional pure helper guide](../ILLUSTRATION.md).

The actual `getGlassIllustrationScene` recipe supplies one informative image group with a description, or a wholly decorative group. Each layer has explicitly empty alt text. Headings, captions and native controls remain outside the noninteractive image group. Controls select a layer, edit X/rotation, move that layer to the front and restore the composition. Stable objects and DOM nodes are retained across edits.

Wide and tall arrangements are independently authored host recipes, selected by native controls or an explicit host breakpoint. Native picture chooses the supplied house resource at its authored media boundary. The helper does not infer mobile composition, discover/fetch assets, verify provenance, parse SVG or install an animation engine. Reserved stage geometry and image dimensions do not eliminate actual decoding/layout/painting costs.

## Native evidence, separate from unit tests

`benchmarks/illustration-responsive.json` records fifteen settled active-paint cases: three presets at 320×700, 390×844, 768×1024, 844×390 and 1440×900. All have zero page horizontal overflow, no enabled targets below 44px, no native fields below 16px and six decoded images. At mobile widths native picture selects the alternate portrait house and Auto selects the host portrait arrangement. An initial narrow-layout failure was corrected before rerunning all fifteen cases.

`benchmarks/illustration-native.json` records actual ArrowRight changing sun X72→73 while retaining the focused range and figure/image/input identities. Physical Bring to front moves the house last with z-index5, retaining its identity and disabling the now-unnecessary front action. Physical Quiet/Solid controls yield zero-duration transitions and no inspector backdrop filter. A settled 700ms interval has unchanged update count, zero pending tour timers and zero active animations.

The informative/decorative semantic switch was verified with an explicit native-select DOM change fixture and presets. Physical OS select-menu keyboard delivery did not change its value through the available automation tool, so that case is not claimed as a verified keyboard interaction. These are desktop T3 Chromium viewport tests, not physical phones, Safari or screen-reader certification.

Native evidence and film came from the earlier isolated source35 fixture. The integrated helper source still has SHA256 `b30e10c2a88694de03bb584648172fe5674cd7903b415f03845fdb02f08785e0`. Its 19 focused tests and standalone strict demo TypeScript pass. The earlier isolated full check passed 593 tests across 35 files; root's current integrated/package checks are separate. No extra browser session was used for this evidence handoff.

For a current settled viewport, evaluate `scripts/illustration-browser-probe.js` and call `__probeIllustrationDemo()`. It inspects the actual controls, decoded images, semantics and public demo state without mutating them or scheduling a loop. To reproduce the recorded layouts, choose the corresponding native viewport and demo preset, enable active T3 painting, then inspect after native settling. It does not simulate physical hardware or certify assistive technology.

## Standalone helper versus demo payload

Run `node scripts/illustration-payload.mjs`. `benchmarks/illustration-payload.json` records Vite 8.3.4 minified ES2022 standalone IIFE bytes: **9,299 raw / 3,716 gzip**, including existing native picture/image validation. It excludes all SVG assets, demo interactions, styles and material CSS. Source/bundle hashes and all seven original asset hashes are recorded. An actual Node ESM import with no window/document exposes `getGlassIllustrationScene`.

`benchmarks/illustration-demo-payload.json` preserves the earlier separate demo fixture: **20,604 raw / 8,251 gzip JS**, including original asset strings/helper, and **9,070 raw / 2,594 gzip CSS**. These are distinct build scopes; subtracting them is not a meaningful isolated cost measurement. Neither fixture measures page loading, image decode, rendering time, FPS or a comparative speedup. Pure recipe construction cannot establish image-rendering performance. The core has no startup listeners, timers or frame runner; the host owns the finite demo transitions.

## Original twelve-second film

`assets/illustration-showcase.mp4` is H.264 High/yuv420p, 960×960, 12 seconds, 30fps export, stereo AAC-LC 48kHz. All 360 frames fully decode. Representative wide 0.8s, tall 4.4s and meaning 9.5s frames were reviewed. Export frame rate is a media setting, not application FPS. `ILLUSTRATION_MEDIA.json` contains exact bytes/hashes, original recording path, captions, camera CSS and original intermediate metadata. Decode logs and per-frame hashes are in `benchmarks/illustration-decode.log` and `illustration-frames.md5`.

The actual tour uses nine bounded host timers and finishes at 10.5 seconds. It changes authored layout, edits layers and switches meaning; final state is informative/wide with six decoded images and zero timers. `__illustrationDemo` exposes preset/reset/tour/cancel/state/tourPromise. Cancellation clears timers and resolves the tour promise. It starts only on request. Quiet and authoritative system reduced motion disable the optional CSS transitions; Solid removes the inspector blur.

Temporary recording-only CSS compacts masthead/intro/vertical spacing without shrinking native targets/fields, replacing art or faking state. The opaque caption band at y882/h78 covers only the lower attribution/tour footer. All original composition/control actions are recorded from actual DOM. Physical capture 1280×1280 represented a 960 CSS viewport before downscaling to the 960px export. The camera changes are absent from the demo patch.

Music is newly synthesized original MIT funk at 104 BPM with a brass patch, seed 51 and RMS 0.1467. It uses no external recordings or samples. Reproduce with `python3 scripts/render-series-score.py --style funk --seed 51 --output /tmp/lg-illustration-score.wav`, then the existing film renderer using the raw recording and original captions. The shared score generator is byte-identical to the one used for capture. The WAV is an external intermediate, not a newly shipped binary.

Release emphasis: original layered assets, explicit informative/decorative semantics, retained native image/control identity, authored wide/tall arrangements and static-at-rest behavior. Do not claim automatic agent discovery, rights certification, automatic responsive design, zero image cost or pixel-identical iOS rendering. Publish and verify the release/demo destination before promoting its URL.
