# Experimental owned-scene optics

This opt-in WebGL2 renderer bends its own procedural wallpaper behind semantic HTML surfaces and can animate thousands of decorative glass instances. It does not read a page screenshot, sample arbitrary DOM, import external textures, or reproduce Apple's private compositor.

## Inspiration and implementation

In [the original discussion](https://x.com/wpsygames/status/2108939185662878135), [Okan Doğu Budak described screen-space analytical wallpaper](https://x.com/okandogubudak/status/2108947960621146517) and an edge normal obtained from a sampled mask. Our original implementation evaluates a procedural scene at screen coordinates and derives rounded-rectangle normals analytically. Its edge envelope concentrates refraction near the boundary; the center has neutral displacement. Highlight intensity is independent of the refraction amount. No source code, screenshots, artwork or shader assets were copied from his project.

The [optics lab](https://wpsydev.github.io/liquid-glass-kit/optics/) uses this renderer with semantic controls and the existing motion API. Dragging changes measured lens bounds in the same screen coordinate space. The comparison control removes displacement while preserving the owned scene and independent lighting.

## Mount after the canvas is visible

```ts
import '@wpsydev/liquid-glass/styles.css';
import { attachGlass } from '@wpsydev/liquid-glass';
import { attachGlassScene } from '@wpsydev/liquid-glass/scene';

const material = attachGlass(panel, { appearance: 'dark' });
const scene = attachGlassScene(canvas, {
  surfaces: [{ element: panel, radius: 28, refraction: 22 }],
  palette: 'neon',
  maxDpr: 2,
});
// If scene.supported, use transparent foreground styling for the shader lens.
// Otherwise retain the CSS material. Keep canvas decorative and behind controls.
// Teardown: scene.destroy(); material.destroy();
```

Imports are safe during SSR. React/Vue/Svelte integrations can attach in their existing mounted lifecycle; the canvas renderer has no framework dependency. Do not add it just to obtain the ordinary CSS material.

## Contract

`attachGlassScene(canvas, options?)` returns readonly `supported` and `stats` getters, `update(options?)`, `render(timeSeconds?)` and idempotent `destroy()`. Update replaces all configuration, including `field`; nested options are snapshotted. One controller owns a canvas; create it after mount. Keep the canvas and surfaces in the same document and coordinate scale. Use a canvas without CSS transforms; transformed/rotated surfaces are represented by their axis-aligned bounding boxes, not their actual outlines.

| Option | Default | Meaning |
| --- | --- | --- |
| surfaces | [] | First eight mounted, same-document `{ element, radius, refraction }` entries |
| radius | 28 | Rounded lens radius in CSS pixels, bounded 0–256, then constrained to half the measured width/height |
| refraction | 22 | Edge displacement in CSS pixels; bounded 0–80; zero removes bending |
| palette | neon | `neon`, `sunset` or `ocean` procedural scene |
| paused | false | Freeze scene time and remove the continuous animation loop |
| reducedMotion | false | App preference combined with the system setting |
| reducedTransparency | false | App preference combined with supported accessibility queries |
| maxDpr | 2 | Rendering density cap, bounded to 1–2 |
| maxPixels | absent | Optional backing-pixel budget, finite values bounded to 65,536–16,777,216; can lower effective DPR below 1, explicitly trading resolution for cost |
| field | absent | Optional decorative GPU field; no per-instance DOM nodes or semantics |

## Thousands of decorative instances

```ts
const scene = attachGlassScene(canvas, {
  palette: 'sunset',
  maxDpr: 1.5,
  field: { count: 3000, size: 22, speed: 100, motion: 'wave', direction: 'right', seed: 7 },
});
// Keep the canvas aria-hidden and controls in HTML. Host owns pause/fallback UI.
// scene.update() replaces all options; carry forward field/palette when changing pause.
```

`GlassSceneFieldOptions`, `GlassSceneOptions`, `GlassSceneSurface` and `GlassSceneStats` are type exports from `/scene`.

| Field option | Default | Meaning |
| --- | --- | --- |
| count | 1000 | Rounded instance count, bounded 0–20,000; zero disables the field |
| size | 24 | Nominal CSS-pixel width, bounded 4–180; per-instance sizes vary, with a few larger shapes |
| speed | 60 | Nominal flow speed in CSS pixels per second, bounded 0–600; per-instance velocities vary; zero freezes field motion while wallpaper can remain animated |
| direction | right | `right`, `left`, `up`, `down`; in orbit mode right/down rotate clockwise and left/up reverse rotation |
| motion | stream | `stream`, `wave`, `orbit`; time-driven shader motion |
| seed | 1 | Deterministic layout seed, bounded 0–65,535 |

`stats` is a copied snapshot of the last submitted draw: `renderer: 'webgl2'`, `fieldCount`, `drawCalls`, `wallpaperPasses`, `width`, `height`, `dpr`, and `pixels`. Unsupported/lost/destroyed scenes report zero counters; use `supported` to select fallback. Background alone uses two draws. Visible HTML lenses add one ordered instanced draw; the field adds one separate instanced draw. Field-only scenes therefore use three total draws, and scenes with both lenses and field use four. `fieldCount` counts submitted GPU instances, including any clipped at the canvas boundary. It is not a visible-widget count, measured FPS or GPU timing. The dpr is the requested effective density before integer backing dimensions; pixel scales account for that rounding.

The wallpaper is evaluated once into a reusable full-resolution RGBA8 texture, then lenses sample it. Shared trigonometric phases reduce repeated ribbon calculations using angle-addition identities. HTML lens quads include a 96 CSS-pixel shadow margin, geometrically avoiding shading distant pixels; the omitted attenuation is below 0.00002 per lens. Ordered blending preserves lens mixing, while intermediate RGBA8 clamping/quantization can change bright overlapping rims. Float rounding, interpolation and canvas-edge sampling also differ from the original analytical shader. Existing optics, displacement-zero behavior and semantic lens anchors remain, but output is not byte-identical. Field objects sample the wallpaper rather than recursively refracting other instances or HTML lenses. Pixel budget is explicit and never silently enabled. See [rendering decisions and benchmarks](RENDERING.md) and the [flow studio](https://wpsydev.github.io/liquid-glass-kit/flow/).

Paused and reduced-motion scenes still accept explicit static redraws. Applications can call `render()` after changing layout while paused. Newly mounted surfaces require update. Canvas resize is observed when ResizeObserver is available. Context loss reports unsupported so the host can restore CSS material; restored contexts rebuild GPU resources. Re-read `supported` after context events when selecting fallback styles. Destroy releases owned GPU objects and restores canvas backing dimensions. It does not manage focus, route state, semantic visibility or surface styling.

## Boundaries and device testing

The shader draws a controlled scene, which is why it can refract that scene consistently. This does not establish a universal DOM refraction renderer. Overlapping lenses do not supply native physical shape union or shared glass grouping. A full-screen animated canvas consumes GPU work; the density cap, optional pixel budget, pause control and motion preference bound that work. The scoped rendering benchmark does not establish physical-device performance or certification. Labels stay in HTML, above the optical layer.

Screen-space coordinates need a CSS-to-framebuffer scale and Y-axis conversion: GLSL's fragment window coordinates differ from DOM rectangles. Context restoration invalidates previous GPU resources. These are documented browser contracts, not an inference from screenshots. [Khronos WebGL2](https://registry.khronos.org/webgl/specs/latest/2.0/), [GLSL ES 3.00 coordinates](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf), [MDN context restoration](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event), [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

Validation distinguishes mocked lifecycle tests from actual browser rendering. Read [VALIDATION.md](VALIDATION.md). Safari, Firefox and physical iOS devices remain unverified.
