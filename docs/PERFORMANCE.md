# Lifecycle performance and source audit

This update removes unused setup work from ordinary CSS glass surfaces and shares preference subscriptions within each browser Window. Existing `attachGlass(element, options)` integrations retain the same replacement-style `update()` and reversible `destroy()` lifecycle. Interactive feedback and experimental refraction remain explicit options.

Measurements compare the frozen 0.8 checkout at `49e2b19eaec04844a04f92bac590df5308c4e60e` with the refactored source. They describe controller setup, option updates, teardown, owned resources and selected bundle sizes. They do not measure animation frame rate, backdrop-filter GPU cost, scrolling smoothness, mobile battery use or whole-application performance.

Measurements use `performance.now()` elapsed time, not an OS/thread CPU counter.

## Measured result — 0.9.0-preview.1

Native T3 desktop Chromium 152, 1280×800, five warm-up pairs and 31 recorded randomized pairs, 100 controllers per batch:

| Workload / stage | 0.8 median | 0.9 median | Less elapsed time |
| --- | ---: | ---: | ---: |
| Static mount | 1.70 ms | 0.90 ms | 47.1% |
| Static mount + two updates + destroy | 3.70 ms | 2.20 ms | 40.5% |
| Interactive mount | 1.70 ms | 1.10 ms | 35.3% |
| Interactive complete lifecycle | 3.70 ms | 2.70 ms | 27.0% |

These are synchronous controller elapsed-time measurements, with fixture construction and actual painting excluded. Millisecond differences are small and timer precision matters. They are not a claim about application loading, animation FPS or phone rendering.

For 100 static controllers, owned input listeners drop 1,000 → 0, media listeners 400 → 4, resize observers 100 → 0, and queued frames 100 → 0. Interactive controllers retain their 1,000 required input listeners. Every tracked resource is released after destroy. Same-options static updates go from 600 style setter calls and 700 attribute setter calls to zero setters; changing radius/blur writes only those two styles per surface.

All library TS/TSX/CSS, including new internal helpers and comments, totals **1,567 → 1,561 nonblank lines**. This is a small six-line reduction, not a dramatic code shrink. The README is shorter and starts with the CSS-only path; lifecycle and input ownership are shared, with existing public APIs retained.

The final uninterrupted timing run used the collaborative preview with capture active to keep its animation-frame scheduler progressing. Both versions ran under that same condition. An earlier stalled background-preview run is retained in `browser-interrupted.json` and excluded from claims because capture activation and a concurrent local build changed its conditions. The final run was recorded after local checks ended; it was not selected for having the fastest result.

## Evidence

- [Source and minified bundle measurements](../benchmarks/source-and-size.json) record the compiler target, source scope, per-file counts and source SHA-256.
- [Resource accounting](../benchmarks/resources.json) records fresh-window static and interactive scenarios, individual lifecycle stages, intercepted method calls, observed attribute changes and live-resource totals.
- [Native browser measurements](../benchmarks/browser.json) preserve every timing sample, randomized execution order, median, p95, viewport and user agent.

The `commit` field identifies the checkout used to prepare a report. During development it can be the parent commit; `sourceSha256` identifies the actual measured contents of every source file, including uncommitted files. `workingTreeChanges` records whether the source differed from that checkout. Compare this hash when confirming that a browser report matches a source/resource report.

## Reproduce

Use the same installed dependencies for both source checkouts. The baseline source must be unmodified.

```sh
npm ci
git worktree add --detach /tmp/liquid-glass-0.8-benchmark 49e2b19eaec04844a04f92bac590df5308c4e60e
node scripts/benchmark.mjs --baseline /tmp/liquid-glass-0.8-benchmark --out benchmarks
```

The script bundles each source directly through the installed Vite version; it does not require a baseline `dist` directory. Run `node scripts/benchmark.mjs --help` for its paths.

Open the generated `/tmp/lg-perf-preview.html` in the T3 collaborative preview. Keep the preview foregrounded, close other active animation/recording workloads, then run:

```js
await window.runGlassBenchmark({ count: 100, repetitions: 31, warmups: 5, seed: 91206 });
```

Save the returned JSON as `benchmarks/browser.json`. Use the product-native preview to run and inspect this fixture; the script does not launch a separate browser. If the T3 preview scheduler stalls while its panel is closed, enable native preview recording before starting the run and keep that capture condition fixed for both versions. The published run used capture throughout. Discard a run if the preview becomes hidden, capture changes during it, or unrelated work interrupts it.

## Method

Both versions run in the same browser page, use the same current CSS and receive equivalent connected DOM fixtures. One scenario mounts 100 default surfaces; another mounts 100 native buttons with `{ interactive: true }`. Each batch measures four synchronous phases: mount, one update with equivalent options, one update changing radius and blur, and destroy. Fixture element creation, appending and removal sit outside the timed phases.

Each scenario receives five unreported warm-up pairs and 31 recorded pairs. A seeded generator chooses whether the baseline or current version runs first in each pair. A browser animation frame separates pairs. Every controller is destroyed within its batch, before a queued rendering frame can run. Results are milliseconds per batch of 100 surfaces, with median and nearest-rank p95 computed from the retained samples. Small sub-millisecond stages can be affected by timer precision; p95 is descriptive for this small sample, not a population estimate.

The resource report runs each version/scenario in a fresh jsdom Window, with matching media preferences, supported CSS blur, unsupported experimental refraction and instrumented observers. It counts lifecycle listener registration/removal, media-query subscriptions, ResizeObserver allocations and queued/cancelled RAF callbacks. Frames remain queued until teardown, matching the synchronous browser workload. The script fails if any owned listener, media subscription, observer or frame remains live after destroy. DOM-method call counts are distinct from MutationObserver attribute records; neither is a GPU measurement.

Source size counts every nonblank line under `src` ending in `.ts`, `.tsx` or `.css`, including comments and optional adapters/scene code. It excludes tests, research, benchmark scripts, docs, demos and generated distribution files. This avoids calling reduced documentation or shorter formatting a runtime improvement. Newly extracted source helpers stay within the counted scope.

Bundle size uses two equivalent named-import fixtures: `attachGlass` for DOM enhancement and `getGlassProps` for static/SSR attributes. Both builds use the same IIFE global name, ES2022 target, minification and gzip level 9. CSS, source maps, React/Vue peers, documentation and package archives are excluded. These are measured consumer JavaScript bundles; they are not npm download sizes. An API can become simpler while its bundle grows, so report the measured direction for each fixture.

## Bundle and package tradeoff

The same `attachGlass` consumer fixture measures 7,748 → 7,847 minified bytes and 3,064 → 3,350 gzip bytes. `getGlassProps` measures 1,256 → 1,274 minified bytes and 638 → 643 gzip bytes. Lazy/shared resource management adds JavaScript despite reducing duplicated source and controller controller work. We do **not** advertise a smaller client bundle.

Package builds now clean `dist` before compilation and omit source/declaration maps. The old maps referenced TS sources absent from the package; shipping them did not provide complete source debugging. JavaScript and declarations remain available, and source is in the tagged repository. Consumer bundlers can still map emitted JavaScript. This reduces the distributed library payload independently of runtime timings; no measured network-load speedup is implied.

[Package accounting](../benchmarks/package.json) records freshly packed local baseline/current snapshots using the same dependencies. Distributed `dist` files total **199,091 → 104,995 bytes (47.3% smaller)**, chiefly because 26 unusable map files are removed; files count 53 → 35. JavaScript/declarations are retained, and source is available in the tagged repository. This is library file payload, not minified browser code. The initial compared archives total 131,590 → 119,371 bytes; later release documentation can change exact archive bytes, so treat `package.json` as its explicitly recorded snapshot rather than the release download's checksum.

## Interpreting the result

Fewer resources on default surfaces reduce avoidable setup and teardown work. Unchanged updates should produce fewer owned DOM writes. Timing improvements apply to these controller lifecycle batches on the recorded browser and device. For an application, measure its own surface count, interaction mix and real rendering workload before predicting a user-visible speedup. Retain the CSS fallback and reduced-motion/transparency behavior when profiling.
