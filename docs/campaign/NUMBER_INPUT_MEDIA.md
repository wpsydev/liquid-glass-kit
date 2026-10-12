# Hinge: a native surface editor

Hinge edits one original, local object through three real number inputs: radius, blur and spacing. Typing, native arrows, named tap buttons and optional dedicated handles remain alternatives. The object updates only after a valid commit. Its visible card changes actual CSS material settings and content gap; no backend, persistence or arbitrary DOM refraction is involved.

The optional `attachGlassNumberInput` enhances an existing native input instead of replacing it with a custom spinbutton. Labels, name, min/max/step, required, validity, native forms and default keyboard editing remain browser-owned. Default native change reports the draft. Explicit commit or an opted-in change policy clamps/snaps a finite value; blank and bad-input drafts are never invented as zero. Native step any does not acquire an arbitrary helper increment or drag granularity.

## Native validation

`benchmarks/number-input-native.json` records 16 states at 320×700, 390×844, 768×1024, 844×390 and 1440×900. All 80 cases have no page horizontal overflow, labeled targets at least 44 CSS pixels and 18-pixel native number fields. These are actual desktop Chromium viewport measurements, not physical iPhone/Android/Safari or assistive-technology certification. `scripts/number-input-demo-probe.js` reproduces the case assertions at a selected viewport.

An actual native ArrowUp changed radius 20 to 22 while focus stayed in the same native input. Actual typing of blur 12.25 preserved the draft, native stepMismatch and the previous object value 12. A real Record click was blocked by native validation with no form snapshot. Explicit Apply snapped to 12.5, then an actual valid submission recorded native FormData radius 22, blur 12.5, gap 12 and intent record, plus the real submitter. No custom input role was added. A real scrub-handle click without movement focused its native input.

Actual native typing of a minus sign produced badInput and empty DOM value, while keeping the previous object. Native number editing can show an incomplete UI fragment that is not represented by its canonical `.value`; the helper does not claim to read that hidden fragment or rewrite it. In this browser, native fields visually use decimal commas while DOM values and FormData remain canonical decimal strings. The library does not install a locale formatter.

Synthetic PointerEvent probes are separate from physical input evidence. Document-targeted packets on the actual controller produced a draft 28 and one release commit. Manual cancellation and an actual Escape during a scripted gesture restored the still-owned origin 20. An external host value 30 won over the gesture; changed max constraints retained the host-owned invalid draft 28 rather than silently rolling it back. Explicit Shift speed produced 40 and Alt slowed distance to 22 on the same native two-pixel grid. Synthetic pointer capture may decline; these probes exercise scoped document listeners and do not establish physical dragging or touch capture on phones.

No demonstrated core defect required a change. The demo separately gives the three Apply draft buttons distinct accessible names containing their visible label. Its preview note now states the precise host behavior of changing material settings after a valid commit, avoiding an unmeasured claim about repainting cost. The framework core, CSS and tests remain unchanged.

The copied core passed 27 focused tests. Complete isolated `npm run check` after the demo refinement passed 803 tests in 41 files plus exports/SSR/site/campaign checks. Strict demo TypeScript passed. Native evidence is separate from the unit tests' mocked environments.

## Boundaries and integration drawbacks

The helper intentionally limits its scaled-integer stepping/scrubbing to canonical numeric constraints of at most six decimal places and bounded magnitude. Unsupported precision leaves native editing and validation available and declines helper stepping/scrubbing. A real seven-decimal step fixture in `number-input-boundaries.json` shows the helper declining while actual native ArrowUp changes 12 to 12.0000001. This is deliberate backoff, not a financial calculation guarantee.

Controlled frameworks require an explicit callback/state adapter. Synthetic helper input/change events are not trusted user events and do not make every React/Vue controlled binding automatically work. Hosts own custom validity, actual value meaning, async work, persistence and constraints. Only the dedicated handle uses touch-action none; the native field and tap controls retain their normal touch alternatives.

A temporary MutationObserver watches document/subtree membership and relevant input/handle/ancestor attributes while a scrub is active. Unrelated DOM mutations can therefore add observer delivery work during a gesture; the host should keep draft feedback small and destroy on unmount. The controller closes its observer/listeners when the gesture ends. Neither the packet benchmark nor the plain lifecycle benchmark measures a large app's host callbacks, changing blur paint, browser compositing or GPU work.

## Scoped performance evidence

Run `node scripts/number-input-benchmark.mjs` to build the standalone fixture without modifying shared dist. Evaluate `scripts/number-input-browser-probe.js` in native T3 after loading `/tmp/lg-number-input-probe.html`.

The optional controller including numeric/lifecycle helpers is 10,901 raw minified IIFE bytes/4284 gzip bytes. Optional CSS is 913 raw/403 gzip bytes and excludes prerequisite material CSS. Five native batches of 160 connected attach/step/commit/update/refresh/destroy sequences have a median time of 25.6 ms, for 800 sequences. They observe zero requested frames, explicit rectangle reads and computed-style reads during the synchronous lifecycle loop; 5600 listener additions/removals balance. These times include actual native input, validity, events, class and style operations and exclude host rendering callbacks.

A separate 100-packet synthetic scrub burst queues one frame and leaves draft 20 untouched until delivery. That delivered frame performs one input/write to 26. Release commits once, with its follow-up scheduled frame cancelled synchronously. The full gesture makes two computed-style reads at start, zero rectangles, and balances its one MutationObserver. All 5617 measured listener additions/removals balance. Settled idle and the 250 ms period after destroy both request zero frames.

The deliberate 60 ms wait in the gesture probe is fixture pacing, not input latency or frame time. No GPU, CSS paint, FPS, physical-device speed, financial guarantee or comparative speedup follows from these measurements. Zero explicit geometry reads is not a certification of zero browser rendering cost.

## Original showcase and score

`assets/number-input-showcase.mp4` is H.264, 960×960, 30 fps and 12 seconds, with stereo AAC at 48 kHz. All 360 frames and audio decode; frames at 2.6, 5.9 and 9.6 seconds were reviewed. The final-valid-value poster comes from 9.6 seconds. Exact byte counts and hashes are in `NUMBER_INPUT_MEDIA.json`.

The actual native capture follows a finite 10.5-second host step/draft/commit fixture. It shows fractional mismatch, explicit snap, range overflow/clamp, required blank, host custom validity and native step any. It does not depict a physical or synthetic drag. The final real object is radius 32, blur 12.5 and gap 10.3, with zero pending tour steps.

Temporary camera styling compacts density and hides decorative rulers, extended help/presets/explanation and credits. Native fields, tap/apply/form controls, error text and the actual object stay visible above the caption strip. Its compositing layer is a recording choice, not a source performance optimization. The shipped demo receives only the naming and wording refinement above.

Music is an original MIT disco composition at 120 BPM, seed 58, using a rounded electric-key voice, four-on-the-floor percussion and bass, with no external samples or recordings. Reproduce it with `python3 scripts/render-number-input-score.py --seed 58 --output /tmp/number-input-score.wav`, then use the existing `scripts/render-series-film.mjs` with the raw recording and captions from the media JSON.
