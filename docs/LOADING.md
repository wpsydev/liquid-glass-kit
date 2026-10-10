# Load only the material you need

0.12 keeps every existing feature and root import, while adding narrow JavaScript entrypoints, separate stylesheets and a lazy owned-scene loader. Start with server-rendered semantic HTML and CSS. Add controllers for interactions that actually need them. Keep essential application actions eager; defer decorative optics rather than a user's Save handler.

## Choose an entrypoint

| Need | JavaScript | CSS |
| --- | --- | --- |
| Static material | None | `/material.css` |
| Pure server-side material attributes | `/material`: `getGlassProps`, `resolveOptions`, `getGlassInnerRadius` | `/material.css` |
| Capability hints | `/capabilities`: `getGlassCapabilities` | None |
| Pointer lighting or experimental SVG lens | `/dom`: `attachGlass`, `glass` | `/material.css` |
| Press/entry spring | `/motion`: `attachGlassMotion` | `/material.css` + `/motion.css` |
| Selection backing | `/indicator`: `attachGlassIndicator` | `/material.css` + `/indicator.css` |
| Scroll edge | `/scroll-edge`: `attachGlassScrollEdge` | `/material.css` + `/scroll-edge.css` |
| Anchored overlay | `/overlay`: `attachGlassOverlay` | `/material.css`; host owns overlay presentation |
| Small WAAPI transitions | `/micro-motion`: `attachGlassTransition` | `/material.css` if using glass |
| Displacement bitmap utility | `/optics`: `createDisplacementMap` | None |
| React or Vue | `/react` or `/vue` | `/material.css`; add `/motion.css` when passing `motion` |
| Eager decorative scene | Experimental `/scene`: `attachGlassScene` | Host canvas sizing and fallback |
| Deferred decorative scene | `/lazy`: `attachGlassSceneLazy` | Host canvas sizing and fallback |

The original root exports and `/styles.css` remain compatible. The aggregate stylesheet is byte-identical to 0.11. Use it when the page needs several helpers or when migrating imports would add complexity. Do not import both `/styles.css` and its component sheets. The component sheets contain no CSS `@import` chain.

`/material` also exports the lower-level `getResolvedGlassProps(resolved)` used by adapters; pass a fully resolved configuration from `resolveOptions`. Most applications should use `getGlassProps`. `/motion` retains its existing typed spring utilities; the primary element API is `attachGlassMotion`.

```ts
import '@wpsydev/liquid-glass/material.css';
import { getGlassProps } from '@wpsydev/liquid-glass/material';
// Use this pure helper in server rendering. CSS alone displays static glass.
```

## Defer an owned scene

Reserve canvas dimensions before any JavaScript loads to avoid a layout shift. Keep labels, controls and useful fallback content in HTML. Mount the loader in the browser, then destroy it on unmount; importing `/lazy` is SSR-safe.

```html
<section aria-label="Optional optical artwork">
  <div style="height:360px;position:relative;background:#eee9df">
    <canvas id="art" aria-hidden="true"
      style="display:block;width:100%;height:100%"></canvas>
  </div>
  <button id="load-art" type="button">Load optional artwork</button>
  <p id="art-status" role="status">Optional artwork is deferred.</p>
</section>
```

```ts
import { attachGlassSceneLazy } from '@wpsydev/liquid-glass/lazy';

const canvas = document.querySelector<HTMLCanvasElement>('#art')!;
const status = document.querySelector('#art-status')!;
const lazy = attachGlassSceneLazy(canvas, {
  backdrop: 'studio',
  maxDpr: 1.5, maxPixels: 600_000,
  fusion: {
    drops: [{ x: 120, y: 180, radius: 80 }, { x: 230, y: 180, radius: 65 }],
    smoothness: 48,
  },
}, { rootMargin: '200px' });

document.querySelector('#load-art')!.addEventListener('click', () => lazy.load());
lazy.ready.then(scene => {
  status.textContent = scene?.supported ? 'Artwork ready.' : 'Keeping the HTML/CSS fallback.';
  // A failed module import/initializer resolves null; inspect lazy.error if needed.
});
// On unmount: lazy.destroy().
```

The loader has **no static runtime dependency on the scene module**. Its dynamic import starts when its canvas intersects the observer's expanded root, or `load()` explicitly requests it. Default `rootMargin` is `200px`; set `0px` to wait for actual intersection. `root` accepts an Element, Document or null. The loader waits while the document is hidden, including when a pending import finishes while hidden. An unsupported IntersectionObserver falls back to loading when the document is visible. A canvas already near the viewport loads immediately after observation; no first-paint guarantee is implied.

It returns `ready`, `load()`, `update(options?)`, `destroy()`, and readonly `state`, `error`, `scene` getters. States are `waiting`, `loading`, `ready`, `failed`, `destroyed`. `load()` is idempotent and returns the same readiness promise. `update` replaces the pending configuration or delegates to the mounted scene. An unsupported GPU still produces a controller with `supported: false`; an import/initialization failure or cancellation before readiness resolves null. Invalid observer configuration fails with an inspectable error. Removing the canvas before an explicit mount fails without creating a scene.

Destroy disconnects observation, removes the visibility listener and destroys a mounted renderer once. A pending import cannot be aborted; destroying prevents it from mounting and settles pending readiness with null. If readiness already resolved, it retains its previously resolved controller, which has now been destroyed. Calling `load` after teardown does not restart it. Mount one scene/loader per canvas. Use the controller from `ready` for `setDrops` and animation; the host owns responsive geometry and choreography.

## Audit the whole loading path

- **Network and parse:** use narrow entries; bundle browser modules with your host build; serve compressed, fingerprinted assets with suitable cache headers. Module graphs below count potential raw ESM requests, not measured network fetches. A normal app bundler already tree-shakes named imports from the root. Avoid namespace imports that preserve the whole API.
- **Render-blocking CSS:** import the smallest needed sheet once. The material requires no JavaScript, image, web font or network service. Each extra helper is an explicit CSS choice. Keep a readable opaque fallback and retain the prefixed/standard backdrop resets; this release deliberately preserves CSS declarations rather than applying an unsafe minifier rewrite.
- **Hydration:** use static markup or pure server-side props for read-only surfaces. `/react` still carries `use client`; choose CSS in a Server Component/Astro page if no interactive adapter is needed. An adapter entry excludes other UI helpers now, but the host's React/Vue runtime remains its own cost.
- **Initialization:** default static DOM controllers allocate no input handlers, resize observer or RAF. CSS-only surfaces need no controller at all. Interactive feedback, springs, layout-aware indicators/overlays and displacement-map generation still do work when opted in. Avoid mounting thousands of those controllers during critical startup.
- **Graphics startup:** scene imports parse shader strings and initialize programs, texture/framebuffer storage and the first draw. A lazy loader moves this cost to when optional artwork becomes relevant; it does not make GPU compilation free. Never preload a deliberately deferred scene unconditionally. Keep its fallback usable if a chunk or GPU fails.
- **First rendering:** large overlapping blur surfaces, high blur radii, large/high-density canvases and nested glass can make the first frame expensive. Keep material surfaces modest and scene pixel budgets explicit. Lower resolution trades quality for work; it is separate from download timing. Avoid blanket `will-change`, full-page glass, or layering optical effects over dense content.
- **Application costs:** oversized images, web fonts, host framework hydration, analytics, videos and HTTP cache policy are outside this library. Lazy-load below-fold assets and measure actual LCP, CLS and interaction responsiveness in your app. An intrinsic-size container or `content-visibility` may help ordinary below-fold content, but test blur sampling, popovers and positioning before applying it to glass.
- **Installation:** a GitHub checkout invokes a build and downloads development tools. The release `.tgz` contains ready-built modules and avoids that source-build path. Installation latency is not browser page loading. npm registry publication remains pending.

This follows [web.dev's code-splitting guidance](https://web.dev/learn/performance/code-split-javascript) and [MDN's IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver). Resource hints should describe assets actually needed now; [modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload) is not an excuse to fetch every optional renderer.

## Reproducible package measurements

Extract the verified 0.11 GitHub release archive into a directory containing `package.json` and `dist/`, then run:

```sh
npm run build
node scripts/loading-benchmark.mjs --baseline /path/to/extracted/package
```

The [raw audit](../benchmarks/loading-package.json) compares that package with built 0.12 modules. Compression is the sum of each file compressed independently with gzip level 9 / Brotli quality 11, excluding HTTP headers, application code and React/Vue peers. Static imports/reexports count; dynamic imports are excluded until invoked. These are deterministic payload sizes, not network timings or measured LCP/INP gains.

| Library graph / sheet | 0.11 raw / gzip bytes | 0.12 raw / gzip bytes |
| --- | ---: | ---: |
| Compatible complete root | 57,071 / 18,571 | 39,026 / 14,242 |
| React library graph, framework excluded | 60,276 / 19,624 | 22,978 / 8,426 |
| Vue library graph, framework excluded | 59,939 / 19,650 | 22,568 / 8,431 |
| Scene graph | 39,809 / 10,778 | 32,345 / 9,639 |
| Material props, previously through root | 57,071 / 18,571 | 1,646 / 749 through `/material` |
| DOM enhancement, previously through root | 57,071 / 18,571 | 12,806 / 5,057 through `/dom` |
| Complete CSS | 10,921 / 2,778 | 10,921 / 2,778 (unchanged) |
| Material-only CSS | Complete CSS above | 6,916 / 2,029 |
| Lazy bootstrap before scene demand | Scene graph above if imported eagerly | 1,895 / 787, excluding deferred scene |

The React graph drops from 14 to 10 library modules; `/material` reaches two, `/dom` seven, and `/lazy` initially one. The compatibility root reaches **13 rather than 12** modules after extracting the DOM controller, despite smaller total bytes. Use narrow entries and an app bundler to avoid that extra raw-module request. Formatting-only Oxc minification preserves module boundaries, exports, names, React's client directive and shader strings. Compression and identifier rewriting are disabled; this remains a runtime-dependency-free library.

Four representative minified tree-shaken consumer bundles—material props, DOM attach, microtransition and scene—are byte-identical before/after. Existing well-bundled applications should not expect an additional JavaScript-byte reduction for those same eager imports. The useful new choices are smaller raw distributions, slimmer unbundled adapters, selecting CSS and moving the **optional** scene out of initial loading.
