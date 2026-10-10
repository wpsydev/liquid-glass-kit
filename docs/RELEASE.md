Liquid Glass Kit 0.9 reduces idle work while keeping its existing CSS-first API.

For 100 static controllers, input listeners drop 1,000 → 0; media listeners 400 → 4; resize observers and queued frames 100 → 0. Interactive input and experimental refraction allocate resources only when needed. React/Vue/custom elements share one lifecycle, semantic press ownership and reversible cleanup are reused, and unchanged material updates avoid redundant DOM setters.

Native desktop Chromium 152, five warm-up pairs and 31 randomized recorded pairs: static mount median **1.70 → 0.90 ms (47.1% less elapsed time)**; mount + two updates + destroy **3.70 → 2.20 ms (40.5% less)**. Interactive mount: 1.70 → 1.10 ms. All library TS/TSX/CSS totals 1,567 → 1,561 nonblank lines, a modest six-line reduction. These results exclude fixture construction and painting; no mobile, GPU, FPS or whole-application speed claim is made.

Consumer JS bundles grew slightly as shared/lazy resource handling was added. Clean package builds omit source/declaration maps referencing unshipped TS sources. The README is shorter and starts with CSS-only usage; existing APIs and replacement-update semantics remain compatible. Source remains in the tagged repository.

[Performance studio](https://wpsydev.github.io/liquid-glass-kit/performance/) · [Benchmark methodology and raw samples](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/PERFORMANCE.md) · [API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/API.md)

Install the attached archive or `npm i github:wpsydev/liquid-glass-kit#v0.9.0-preview.1`. npm registry publication remains pending. The attached twelve-second demo records actual browser output with an original synthesized score. Independent web implementation; portable CSS remains the default and optical refraction remains experimental.
