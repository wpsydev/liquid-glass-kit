# Index room: progress that reports actual work

The demo inspects 14 original notes embedded in the page, divided into eight interface notes and six writing notes. Each checked record computes Unicode letter/number word segments and UTF-8 bytes from its title, a newline, and note text. The source shelf, native checkboxes, unit selection, preparation-only choice, deliberate rejection choice, cancellation and explicit next-plan retry all affect local work. No file, model service or network is involved.

The helper is a pure `getGlassTaskProgressProps` function. It returns semantic native progress, label, separate status, decorative-ring and busy-region metadata. It does not execute tasks or supply a progress controller. The demo host owns processing, AbortSignal cancellation, its generation guard and the result list.

## Native evidence

`benchmarks/task-progress-native.json` records 15 meaningful states at five viewport sizes: 320×700, 390×844, 768×1024, 844×390 and 1440×900. The 75 combinations show no page horizontal overflow, labeled control targets at least 44 CSS pixels and 16-pixel native selects. These are actual desktop Chromium viewport measurements, not physical iPhone/Android/Safari or assistive-technology validation.

Unknown progress omits both value and max attributes and has native position −1. Native DOM properties still expose browser defaults value 0/max 1; those defaults are not host business quantities. Known zero is a real value 0/max 8 with position 0. Byte progress includes the exact fraction 135/1166 after one measured interface record. Error preserves 426/1166 after three records; cancelled partial progress remains below its real maximum. Unknown terminal outcomes hide the bar and ring without inventing a total or completion quantity.

Actual native Inspect, Cancel and Try current plan clicks verified three measured records remained after cancellation and an explicit fresh retry reached eight checked records. Retry starts the current plan anew and clears its previous measurements; it does not pretend to resume a partial job. Terminal state has no pending host waits. Native select-popup key automation did not change the collection, so the writing collection was separately checked through an explicit host fixture rather than claimed as a successful native menu interaction.

`benchmarks/task-progress-fixtures.json` independently records all 14 original fixture input hashes and quantities. The eight interface results total 1166 UTF-8 bytes/198 word segments; six writing results total 797 bytes/134 segments. Those records match the actual demo results, including accented text. Word segments are not model tokens or general linguistic word counts.

The ring actually animates only in an explicitly animated, in-view busy unknown stage. Quiet motion stops it. `task-progress-actions.json` also shows actual scrolling out of view stopped the ring while the unknown task remained busy; cancellation kept it stopped. Status stays outside the busy results region. `task-progress-announcements.json` records four meaningful status text changes across eight record updates: preparation, known zero, midpoint and completion. This checks DOM behavior and announcement metadata, not actual screen-reader speech.

## Scoped performance evidence

Run `node scripts/task-progress-benchmark.mjs` to rebuild the standalone fixture and payload report without touching shared dist. Evaluate `scripts/task-progress-browser-probe.js` in native T3 after loading `/tmp/lg-task-progress-probe.html`.

The optional helper's standalone minified IIFE is 3707 raw bytes/1613 gzip bytes; optional CSS is 3013 raw/907 gzip bytes and excludes material CSS. Five native batches of 10,000 pure props constructions have a median batch time of 10.9 ms. A separate connected host adapter executes 12,800 props-plus-DOM applications across 32 scopes; the median batch of 2560 applications is 12.1 ms, with zero requested animation frames and zero JavaScript rectangle reads. A separate forced computed-style/rectangle pass performs 500 updates; its median batch of 100 is 4.8 ms and explicitly includes browser style/layout. The subsequent 250 ms idle probe observes zero requested frames and no idle animations.

These absolute measurements describe this desktop browser and fixture. They exclude task processing, CSS paint, GPU work, backend cost, physical-device throttling and comparative speedups. A zero-rectangle synchronous adapter can still cause deferred browser rendering work. Do not use the timing as a render-rate or loading-time claim.

The copied core passed 41 focused tests. Complete isolated `npm run check` passed 756 tests in 39 files plus exports/SSR/site/campaign checks. The copied progress demo separately passed strict TypeScript. No core or demo bug required a source modification during this audit.

## Original film and music

`docs/campaign/assets/task-progress-showcase.mp4` is a 12-second H.264 960×960/30 fps film with stereo AAC at 48 kHz. All 360 frames and audio decode; reviewed frames at 0.15, 3.6 and 9.4 seconds show unknown waiting, honest partial error and quiet completion. Exact media hashes and bytes are in `TASK_PROGRESS_MEDIA.json`.

The native T3 capture follows the finite 10-second host tour. It processes real local text, while its 320 ms preparation and per-record delays deliberately make states inspectable. Those delays are fixtures, not measured CPU processing duration. The final real count is 1166/1166 bytes; host waits, fixture actions and tour steps end at zero.

Recording-only typography and density styling keeps actual native actions, quantities, policies and source selection visible. Source/results are scrollable, while extended explanation, snapshot receipt and credits are hidden in the camera framing. The shipped demo is unchanged. The caption strip sits below the controls.

Music is a newly authored original MIT dnb composition at 160 BPM, seed 40, using a vibraphone-like finite mallet voice, breakbeat percussion and bass. It contains no external samples or recordings. Reproduce it with `python3 scripts/render-task-progress-score.py --seed 40 --output /tmp/task-progress-score.wav`, then use the existing `scripts/render-series-film.mjs` with the native raw recording and captions from the JSON metadata.
