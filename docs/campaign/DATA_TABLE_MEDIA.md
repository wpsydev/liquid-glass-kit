# Source 26: native data table evidence and media

Isolated worktree: `/tmp/liquid-glass-source26`, detached base `c445ffb3256d4d61db0bfd101b8aac5ec1dcdb63`. Root files were read only. No package, release, commit, or publishing changes.

## Changes

No model/API bug found. The original home link measured 33px high in the native browser; the scoped `.brand { min-height: 44px }` correction restores a 44px touch target. Native measurements after this change passed every responsive case.

- `/tmp/liquid-glass-source26-demo-fix.patch`: 1,301 bytes; SHA256 `60c5e5422f62607ca2c911e30388085f9dad32e2c55d355e9e1843d8cec9c1a3`
- `/tmp/liquid-glass-source26-benchmark.patch`: 5,744 bytes; SHA256 `926082e032ac2b62dc7fedd396cecc96f378ea370e5b530053ae4a65506d2832`

Both patches pass read-only `git apply --check` against root. Benchmark patch adds only `scripts/data-table-benchmark.mjs` and `scripts/data-table-browser-probe.js`. Copied source/tests/demo files, node_modules symlink, and temporary renderer edits are excluded.

## Checks and native behavior

Strict isolated demo TypeScript check passed. Focused model suite: 23 tests. Full isolated `npm run check`: 40 test files / 780 tests passed, plus build and typecheck. Log: `/tmp/lg-source26-check.log`. No packaging changes; no pack check needed.

Own T3 tab: `tab_4j`. All recordings stopped. Native evidence: `/tmp/lg-data-table-native.json`.

- Real header clicks preserve stable ST-001 / ST-002 / ST-003 tie order in both sort directions. Changing the sort header removes the previous `aria-sort`; exactly one active header remains.
- Native caption and `th scope=col` are present; no grid role. Original table and header controls retain DOM identity across view updates.
- Physical typing of Print yields 9 filtered / 18 total, retains search input identity, focus and caret at 5. Physical Next shows range 7–9 and exactly 3 body rows, then disables Next.
- Selects were prepared by explicit DOM change events; physical Apply changes ST-008 from Review to Ready, increments the local change count once, preserves all 18 IDs, and recreates the immutable model. This is an original local fixture, not a save/upload/backend claim.
- Empty view has range 0–0 and zero pages. Physical Clear search restores all rows and focus to the existing search field.
- At 320px, physical ArrowRight on the named, focused table region moves its own scrollLeft to 40; page width stays equal to viewport client width (305). Horizontal table scrolling is intentional and keyboard reachable.
- Separate connected native nullable fixture renders descending IDs tie-a / tie-b / zero / null-a / null-b, with caption, column scopes and only descending aria-sort. Nulls remain last in both directions. Default lowercase matching is locale independent: ß matches ß, not ss. No Intl.Collator or Unicode casefold claim.

Responsive evidence: `/tmp/lg-data-table-responsive.json`. Twenty states: ties, page, empty, edit × 320×700 / 390×844 / 768×1024 / 844×390 / 1440×900. Zero page overflow, enabled targets below 44px, text fields below 16px font or 44px height, or clipped labels. At 320/390, the 690px table intentionally scrolls inside its region; 768px has enough region width and needs no horizontal scrolling. These are native desktop Chrome/Electron layout cases, not physical iPhones, Safari or assistive technology tests.

## Payload and benchmark

`/tmp/lg-data-table-payload.json`: standalone optional model + props JS 6,046 bytes / 2,600 gzip; CSS 1,979 / 777 gzip. Source SHA256 `eaf67db96c01d46df4b902b93d28b6521ddc5a1eebf03bde765720dcd16c1458`; CSS `6090a9d8874ae0d6d2aa6f241a685e690487d8cae2f85a8e4c8536577db7322a`.

`/tmp/lg-data-table-benchmark-native.json`: original 5,000-row / 6-column / 30,000-cell native browser fixture. Prepared inputs/options excluded. Model creation includes validation, copies/freezing and cached search/sort strings. Reused views still execute filtering/sorting when requested and create ordered/page snapshots; there is no cached view-result claim. Connected render measures native row/cell construction, textContent and tbody replacement, including any synchronous style/layout work induced. Initial host shell/preflush, event wiring, asynchronous paint/compositor and network are excluded.

| Workload | Median ms | p95 ms |
| --- | ---: | ---: |
| Recreate 5,000-row model | 11.70 | 17.30 |
| Reused model, unfiltered view | 0.040 | 0.045 |
| Cached-string filtering | 0.140 | 0.150 |
| Numeric sorting | 1.550 | 1.675 |
| String sorting | 0.950 | 1.050 |
| Filter and sort | 0.775 | 0.950 |
| Host authoring/replacement, 6 rows | 0.032 | 0.044 |
| Host authoring/replacement, 200 rows | 1.100 | 1.600 |

Batch sizes/warmups/raw summaries are recorded. Small measurements are batch averages due timer quantization. Shared-machine noise applies. Different workloads are not a before/after speed-up comparison; no FPS, virtualized 5,000 DOM rows, whole-app action latency, remote totals or locality claim. Page size bounds rendered rows; filter/sort still process the full local dataset.

Reproduce: run `node scripts/data-table-benchmark.mjs`, inject `/tmp/lg-data-table-helper.iife.js` and `scripts/data-table-browser-probe.js` into an owned native preview tab, then call `window.__runDataTableBenchmark()`. The fixture creates/removes only its own connected table.

## Original film

- `/tmp/lg-data-table-showcase.mp4`: 651,714 bytes; SHA256 `27df29f759d37296e7d0e64eb03a14f5645b8315f74bec787d395cf16cff61ce`
- `/tmp/lg-data-table-showcase.png`: 281,641 bytes; SHA256 `7cf03c7533ef690ef658871d7be1dd89a8273b0ad83440f052fb8b6f746816f4`
- `/tmp/lg-data-table-score.wav`: 2,304,044 bytes; SHA256 `79e905ecd511bd785a08f2ae4f287bcacc73e21a3947223225fb9a4e81f1541c`

12 seconds, 960×960 H264/yuv420p, 30fps export, AAC stereo 48kHz. Original procedural disco, 120bpm, keys patch, seed42, source RMS .1462, no external samples. Actual native 10-second demo tour sorts ties, filters Print, advances the actual second page, edits ST-008 locally, displays empty view, then recovers. Final state is 18 rows, one local change, not touring. No synthetic outcomes or FPS claims. Export 30fps is a media encoding setting.

Raw capture: `/home/fieldwork/.t3/userdata/attachments/28105162-0472-4705-8632-6b21d2e581a1-3f55069a-aa88-4210-ad94-ab39878c9924-mp4.mp4`.

Media/tour records: `/tmp/lg-data-table-media.json`, `/tmp/lg-data-table-tour-native.json`, `/tmp/lg-data-table-raw.json`. Full video decoded to 360 frames: `/tmp/lg-data-table-frames.md5`. Reviewed frames at 1.2s ties, 5.5s local edit, 7.3s empty, 9.5s recovery: `/tmp/lg-data-table-{ties,edit,empty,recovery}.png`. Controls and editable fields are visible and unclipped in all reviewed frames.

The movie uses temporary camera-only density CSS stored verbatim in tour/media JSON, retaining actual native state, 44px controls and 16px input text. It reduces margins/table row padding and empty-state height so the editor and all tour controls remain above the caption band. Maximum measured editor bottom 770.29px; action controls 852.69px; caption begins at 882px. No camera CSS or renderer edits are part of the patches. Captions cover some low-priority footer/cost text, not controls. The recording is stopped, camera CSS removed, and actual tour is idle.

Suggested honest release copy: native tables with stable ties, explicit sorting, complete local filtering, bounded pagination and ordinary semantic markup; a small optional model, with host rendering/editing/focus/network left explicit. Avoid claims about an all-in-one grid, locale-aware sorting, server paging, virtualization or a comparative performance boost.

Root release assets: docs/campaign/assets/data-table-showcase.mp4 and data-table-showcase.png. Temporary paths above describe isolated capture provenance. Common render-series-score.py reproduces disco120/keys seed42 score.
