Liquid Glass Kit 0.12 improves the loading path while retaining existing functionality.

Choose narrow `/material`, `/dom`, `/capabilities` and individual interaction entrypoints instead of loading the complete raw module graph. React, Vue and custom-element adapters now import only their actual dependencies. The complete root remains compatible. Distributed ESM uses formatting-only Oxc minification, preserving exports, names, module boundaries, shader strings and React's client directive; core runtime dependencies remain absent.

New `/material.css` contains the portable material without unused helper rules. Add `/motion.css`, `/indicator.css` or `/scroll-edge.css` when needed, or retain the byte-identical complete `/styles.css`.

New `/lazy` provides `attachGlassSceneLazy`: it defers the scene module and GPU startup until the canvas nears the viewport or is explicitly requested, waits while hidden, forwards replacement options and supports cancellation-safe teardown. Reserve canvas dimensions and preserve useful HTML/CSS fallback. Essential application controls stay eager.

The reproducible package audit records the React library graph at **60,276 → 22,978 raw bytes** and **19,624 → 8,426 summed per-file gzip bytes** (framework excluded; 57% less compressed payload). Material-only CSS is **6,916 raw / 2,029 gzip bytes**, versus 10,921 / 2,778 for the unchanged complete sheet (27% less gzip). The lazy bootstrap is **1,895 raw / 787 gzip bytes** before scene demand.

These are distributed payload sizes, not measured whole-page load times, LCP/INP gains or physical-phone results. Four representative already tree-shaken consumer bundles are byte-identical before/after; well-bundled applications should expect benefits from CSS selection and optional-scene deferral rather than another reduction for unchanged eager imports. The compatibility root has one additional raw-module request after extracting the DOM controller; prefer narrow entries and a host bundler.

[Working loading study](https://wpsydev.github.io/liquid-glass-kit/loading/) · [Loading guide and scope](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/LOADING.md) · [Raw audit](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/loading-package.json) · [API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/API.md) · [Validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md)

Install the ready-built release archive, or `npm i github:wpsydev/liquid-glass-kit#v0.12.0-preview.1` for a source build. npm registry publication remains pending because the authenticated session lacks the required publishing 2FA authorization.
