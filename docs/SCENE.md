# Experimental owned-scene optics

This opt-in WebGL2 renderer bends its own procedural wallpaper behind semantic HTML surfaces. It does not read a page screenshot, sample arbitrary DOM, import external textures, or reproduce Apple's private compositor.

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

`attachGlassScene(canvas, options?)` returns a readonly `supported` status, `update(options?)`, `render(timeSeconds?)` and idempotent `destroy()`. Update replaces all configuration. One controller owns a canvas; create it after mount. Keep the canvas and surfaces in the same document and coordinate scale. Use a canvas without CSS transforms; transformed/rotated surfaces are represented by their axis-aligned bounding boxes, not their actual outlines.

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

Paused and reduced-motion scenes still accept explicit static redraws. Applications can call `render()` after changing layout while paused. Newly mounted surfaces require update. Canvas resize is observed when ResizeObserver is available. Context loss reports unsupported so the host can restore CSS material; restored contexts rebuild GPU resources. Re-read `supported` after context events when selecting fallback styles. Destroy releases owned GPU objects and restores canvas backing dimensions. It does not manage focus, route state, semantic visibility or surface styling.

## Boundaries and device testing

The shader draws a controlled scene, which is why it can refract that scene consistently. This does not establish a universal DOM refraction renderer. Overlapping lenses do not supply native physical shape union or shared glass grouping. A full-screen animated canvas consumes GPU work; the density cap, pause control and motion preference reduce that work, but there is no performance benchmark or device certification. Labels stay in HTML, above the optical layer.

Screen-space coordinates need a CSS-to-framebuffer scale and Y-axis conversion: GLSL's fragment window coordinates differ from DOM rectangles. Context restoration invalidates previous GPU resources. These are documented browser contracts, not an inference from screenshots. [Khronos WebGL2](https://registry.khronos.org/webgl/specs/latest/2.0/), [GLSL ES 3.00 coordinates](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf), [MDN context restoration](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event), [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

Validation distinguishes mocked lifecycle tests from actual browser rendering. Read [VALIDATION.md](VALIDATION.md). Safari, Firefox and physical iOS devices remain unverified.
