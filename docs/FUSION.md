# Glass fusion in an owned scene

The optional `@wpsydev/liquid-glass/scene` entrypoint can draw up to eight circular glass drops that visually join and separate. Fusion combines their signed-distance shapes, bends the scene's own background around the resulting boundary, and adds rim lighting. It is an experimental canvas effect. The portable CSS material remains the default for web controls.

Apple demonstrates nearby glass views merging and separating through `UIGlassContainerEffect` in [Build a UIKit app with the new design, WWDC25](https://developer.apple.com/videos/play/wwdc2025/284/), starting around 23:52. That behavior informs this interaction idea. This library implements an independent web shader; it does not reproduce Apple's native optics, UIKit APIs, or arbitrary-DOM background capture.

## Use the scene API

Create the controller after the canvas mounts. Importing the optional scene module is safe during SSR; mounting needs a browser-owned canvas and WebGL 2. Keep readable labels and semantic controls in HTML above the decorative canvas. Hide the canvas from assistive technology and give the containing section a useful text description if the visual matters.

```html
<section aria-label="Glass droplets joining and separating">
  <canvas id="glass-scene" aria-hidden="true" style="width:100%;height:360px;display:block"></canvas>
  <button type="button" id="join">Join droplets</button>
</section>
```

```ts
import { attachGlassScene } from '@wpsydev/liquid-glass/scene';

const canvas = document.querySelector<HTMLCanvasElement>('#glass-scene')!;
const width = canvas.clientWidth;
const radius = Math.min(60, width * .16);
const drops = [
  { x: width * .35, y: 180, radius },
  { x: width * .65, y: 180, radius },
];
const scene = attachGlassScene(canvas, {
  paused: true,
  backdrop: 'studio',
  maxDpr: 1.5,
  maxPixels: 900_000,
  fusion: { drops, smoothness: 32, refraction: 36, dispersion: 0 },
});

document.querySelector('#join')!.addEventListener('click', () => {
  drops[0].x = width * .45;
  drops[1].x = width * .55;
  scene.setDrops(drops);
  scene.render(0);
});

// Call scene.destroy() when the canvas unmounts.
```

Size the canvas with CSS before attaching. Coordinates and radii use CSS pixels relative to its top-left corner; resize your drop layout when the canvas layout changes. The example is a discrete semantic action. Animate geometry with your existing animation scheduler when desired, while respecting reduced motion and stopping when hidden. Call `setDrops()` to stage positions, then `render(timeSeconds)` once for that frame when managing a paused scene yourself. Staging does not tear down resize observers or render a paused scene, so several position changes can share one draw.

`update(options)` replaces scene options and refreshes the scene. Use it for appearance, preference, backdrop, or renderer-budget changes. Use `setDrops(drops)` for frequent geometry changes; it retains the other options. Avoid attaching another controller to the same canvas before destroying the previous one.

## Options and boundaries

| Option | Meaning |
| --- | --- |
| `fusion.drops` | First eight non-null `{ x, y, radius }` circles in canvas CSS coordinates. Positions use finite values, fall back to zero, and are bounded to ±100,000. Radius defaults to 80 and is bounded to 1–1,024. An empty list draws no fusion surface. |
| `fusion.smoothness` | Smooth union width, default 32, bounded to 0–120 CSS pixels. Zero combines circles without a smoothing bridge. |
| `fusion.refraction` | Edge displacement strength, default 36, bounded to 0–100 CSS pixels. |
| `fusion.dispersion` | Optional color-channel separation, default 0, bounded to 0–8. Use small values for a restrained edge. |
| `backdrop` | `'ribbons'` or `'studio'`; these are scene-owned backgrounds, never a capture of the page. |
| `maxDpr` | Cap backing density. Higher density increases pixel work approximately quadratically. |
| `maxPixels` | Explicit backing-pixel ceiling. Reduces resolution when required; this is a quality/performance tradeoff. |

The regular scene pause, reduced-motion, reduced-transparency, context-loss, and teardown behavior also applies. `scene.supported` tells you whether the current pipeline is usable; preserve an HTML/CSS fallback when it is false. `scene.stats.fusionCount` reports the last submitted drop count, alongside draw calls and backing dimensions; it becomes zero when fusion is absent, outside the canvas, or unsupported. Stats are accounting, not timing or an FPS guarantee. Fusion adds one bounded draw to the scene's background/presentation passes. `setDrops()` has no effect when fusion has not been enabled in the current scene options.

The scene samples a cached RGBA8 background, with bilinear filtering and bounded optical settings. Dispersion is a stylized approximation rather than physical spectral rendering. Glass drops supply no labels, focus handling, click targets, or application state. A large translucent decorative surface may look appealing while making real content less legible; keep text in clear HTML layers and use solid controls when appropriate.

## Benchmark the actual workload

[MDN's WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) recommends reusing resources, limiting pixel work, and avoiding blocking queries in production animation loops. Measure GPU work separately from JavaScript staging/submission and browser callback cadence.

```sh
node scripts/fusion-benchmark.mjs
```

Open `/tmp/lg-fusion-preview.html` in the native T3 collaborative preview with active capture so rendering continues. Then run:

```js
await window.runFusionBenchmark();
// Save JSON.stringify(window.lastFusionBenchmark) as the raw browser report.
await window.runFusionValidation();
// Separate readback/recovery proof: JSON.stringify(window.lastFusionValidation).
```

The default workload uses three moving, merging drops on the studio background, smoothness 64, refraction 62, dispersion 3, five two-second runs after 12 warmup frames, a 720 × 1280 CSS canvas, DPR capped at 1.5, and an explicit 900,000-pixel budget. It uses the gallery's merge target positions and size ratios, excluding UI easing and interactions; radii at this canvas size are approximately 195, 135, and 97 CSS pixels. The raw samples and `stats` record actual backing dimensions and pixel count after density/budget calculations; CSS dimensions alone do not establish the rendered pixel workload. GPU timing uses optional asynchronous non-disjoint timer queries; unsupported timers produce no GPU-time claim. The separate instrumented pass checks initialization, staged geometry, steady frames, and resource teardown.

The benchmark deliberately measures a full 720 × 1280 canvas. A gallery page may use a shorter artwork canvas within a header/control layout. Matching optical settings and pixel ceilings does not make different canvas aspect ratios, drop trajectories, or coverage the same workload. Describe any comparison with the demo as an absolute representative scene cost, not the measured runtime of every frame in its exported video.

This is an absolute cost measurement of a new feature, not a speedup over a previous release that had no fusion API. Recorded callback cadence does not establish presented FPS, full-app speed, physical iPhone performance, or battery savings. No benchmark result is implied by generating the fixture; publish claims only after saving and checking the native-browser report.

## Native measured example

The [saved browser report](../benchmarks/fusion-browser.json) measures the default three-drop workload in the native T3 preview, Chromium 152, on Apple M1 Pro through ANGLE Metal. Capture remained active throughout timing, with no other animated scene or heavy build running concurrently. The browser viewport was 1280 × 800 at device DPR 2; the measured canvas itself was 720 × 1280 CSS pixels. Five two-second runs followed 12 warmup frames each. This is the rendering fixture's cost, excluding gallery layout, text, controls, interaction handling, UI easing, and export encoding.

| Measurement | Median of five run medians | Range of run medians |
| --- | ---: | ---: |
| Asynchronous GPU time | 0.5841 ms | 0.5712–0.5905 ms |
| CPU staging plus render submission | 0.1 ms | 0.1–0.1 ms |

GPU samples vary within each animated run: per-run p95 values are 2.5268–2.5566 ms, and the largest recorded GPU sample is 2.6639 ms. The sub-millisecond median is not a bound on every frame. Timer queries were available, with zero disjoint events, rejected samples, skipped queries, or unanswered queries. `setDrops()` alone has a zero recorded median at the main-thread clock's precision; this means its usual duration was too short to resolve, not that it costs no work. Observed callback cadence has a median of 59.998 Hz, with run values 58.9599–60.012 Hz. Callback cadence is not presented FPS.

The explicit pixel budget produces a 711 × 1264 backing buffer: 898,704 pixels. The controller's calculated density is approximately 0.988, below one backing pixel per CSS pixel despite `maxDpr: 1.5`. The 900,000-pixel ceiling takes precedence over that density cap. This reduces resolution to contain work; the timing does not establish performance at a full 1080 × 1920 buffer or an equal-quality improvement over another renderer.

The independent instrumented pass records no draw, layout read, explicit `Float32Array` construction, GPU upload, resize-observer operation, animation request, or synchronous status query from paused `setDrops()` staging. A steady rendered frame uses three draws and one canvas-bounds read, with no new explicit `Float32Array`, buffer/texture upload, or synchronous status query. Initialization still allocates owned programs, shaders, a vertex array, a texture, a framebuffer, and four typed arrays. Every counted owned GPU handle returns to zero after destruction. These counts exclude ordinary JavaScript arrays/objects, browser and driver allocations, and total VRAM.

The separate [native validation record](../benchmarks/fusion-validation.json) renders three fixed-time 320 × 240 readbacks with changing pixel hashes and no WebGL error. Actual context loss clears support and stats; restoration brings back three drops, three draws, and `NO_ERROR`. This demonstrates a compiled, changing native shader and recoverable context on this browser, rather than visual equivalence to Apple's material or coverage of physical Safari/iPhone hardware. It is separate evidence from unit tests and from timing.

Both records identify measured source SHA-256 `5c48b8bdf0086474b94defe7e6453423862f30e09458ad0adaa2c93eeb1bd238`. New hardware, optical coverage, aspect ratios, or backgrounds need their own measurements.
