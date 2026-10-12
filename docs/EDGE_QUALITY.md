# Pixel-aware experimental scene edges

`GlassSceneOptions.edgeQuality` selects coverage for rounded lenses, decorative field instances and fused circular drops in the optional `/scene` renderer. It also works in `/scene-texture` through that wrapper's `scene` option. It does not change the portable CSS material, procedural wallpaper, caustic light projection or ordinary HTML controls.

The default is `'legacy'`, retaining the fixed CSS-distance coverage band. Explicit `'pixel'` uses a bounded local fragment-derivative footprint, allowing an edge transition to account for the actual backing resolution. A low pixel cap can make a backing pixel span several CSS pixels. This approximation cannot recover genuinely subpixel features, implement MSAA, certify visual quality or match Apple's private compositor.

## Opt in after mount

```ts
import { attachGlassScene } from '@wpsydev/liquid-glass/scene';
import type { GlassSceneOptions } from '@wpsydev/liquid-glass/scene';

// Host-authored native canvas and mounted lens anchor; keep controls in HTML.
const options: GlassSceneOptions = {
  animate: false,
  surfaces: [{ element: lens, radius: 28, refraction: 22 }],
  maxDpr: 1.5,
  maxPixels: 262_144,
  edgeQuality: 'pixel',
};
const scene = attachGlassScene(canvas, options);
if (!scene.supported) {
  // Host retains its CSS/opaque fallback instead of claiming rendered optics.
}
scene.render(0); // Explicit static submission; observer settling may also redraw.
scene.update({ ...options, edgeQuality: 'legacy' });
// Cleanup on unmount: scene.destroy().
```

`update()` replaces the complete scene configuration. Carry forward surfaces, field, fusion, motion and caps when changing quality. Omitting `edgeQuality`, or supplying an unknown runtime value, selects legacy. With `/scene-texture`, texture options merge, but a supplied `scene` still replaces its scene settings. Imports remain SSR-safe; attachment needs a browser canvas. No automatic loop is required by this feature.

## Effective policy and fallback

The copied `stats` snapshot adds:

| Field | Meaning |
| --- | --- |
| `requestedEdgeQuality` | Normalized `'legacy'` or `'pixel'` request |
| `edgeQuality` | Effective optics policy; unsupported or destroyed scenes report legacy |
| `edgeQualityFallback` | The requested pixel optics pipeline failed compilation/linking and fell back |

These fields describe policy, not proof that a lens, field or fusion region was visible or submitted. Continue to use `supported` and geometry/draw counters. A pixel pipeline failure falls back all optics to legacy, preserving the independently owned receiver. The failed policy is remembered until a quality change or native context restoration, avoiding repeated failed compilation on ordinary draws. Native context restoration recreates GPU resources; host fallback visibility remains the host's responsibility.

## Coverage math and cost

The original implementation evaluates `fwidth(distance)` once in fragment `main`, after distance helpers reconverge and before coverage branches or discard. It uses half that footprint, a positive floor and a cap based on the actual X/Y CSS-to-backing scales. The floor keeps smoothstep endpoints ordered. Vertex variants enlarge bounds conservatively so the new edge band is not clipped by the old quads. Existing interior lighting/refraction formulas, wallpaper and caustic shaders retain their source text.

This introduces derivative and coverage instructions. Padded quads can also shade extra fragments, particularly at low backing density. It uses the existing passes rather than adding supersampling or a new coverage texture, but that does **not** make the quality option free. Thin features, corners, fusion seams and anisotropic scales still require visual review on target hardware. No GPU elapsed time, FPS improvement or load-time improvement was measured here. `readPixels` synchronizes correctness inspection and is excluded from any performance claim.

The GLSL basis is [Khronos fwidth](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/fwidth.xhtml) and [smoothstep](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/smoothstep.xhtml). This is an independently authored implementation. The Book of Shaders is linked as educational inspiration; its code, chapter text, screenshots and assets are not redistributed.

## Measured optional-module payload

Run `node scripts/edge-payload-comparison.mjs 583a8fd1a8ea3592efca450599030a7d1c668a38`. The script uses read-only local Git source from published v0.48 and the current source, with identical Vite 8.3.4 minified ES2022 IIFE settings. It does not checkout a commit, write shared dist or fetch a remote.

| Standalone optional module | Before raw / gzip | After raw / gzip | Gzip increase |
| --- | ---: | ---: | ---: |
| `/scene` | 33,488 / 10,959 bytes | 35,012 / 11,452 bytes | 493 bytes, 4.50% |
| `/scene-texture` including scene | 43,901 / 14,471 bytes | 45,410 / 14,962 bytes | 491 bytes, 3.39% |

The optional source builder constructs strings lazily when needed, but its code still ships in these bundles even when the selected policy is legacy. These are standalone fixtures, not default-entry, page-network, loading-time or GPU measurements. [Comparison JSON](../benchmarks/scene-edge-payload-comparison.json) records configuration, source/bundle hashes, all loaded baseline modules, matching hashes for all nine legacy shader exports, and actual Node imports with no window/document.

## Native comparison study

SEAM pairs two original owned-canvas scenes. Left remains legacy; right explicitly opts into pixel. Native controls choose lenses, 40 decorative field instances or two fused drops, backing caps, DPR, static phase, Quiet and Opaque. Both start static and legacy. The original poster is a host-authored Canvas2D source, not a screenshot or arbitrary DOM capture. Changed-pixel counts and nearest-neighbor edge crops are actual readback differences, never quality percentages.

[Native evidence](../benchmarks/scene-edge-native.json) records successful native compilation of all six pixel shaders, nonzero lens/field/fusion differences, zero GL readback errors, deliberate compiler failure falling back to byte-identical legacy output, and actual context loss/restoration. A separate original analytic fixture at 64×48 backing has 16 partially covered legacy pixels versus 100 under pixel policy. That demonstrates a broader coverage transition for that circle/scale, not a universal quality result.

[Responsive evidence](../benchmarks/scene-edge-responsive.json) covers 20 cases at 320×700, 390×844, 768×1024, 844×390 and 1440×900 with no page overflow, targets below 44px, fields below 16px or clipped labels. Native keyboard DPR adjustment preserves focus; mobile Inspect brings offscreen output into view before readback. Tests use desktop Chromium viewport emulation, not physical phones, Safari, Firefox or assistive technology certification. A GPU timer extension was available, but no timed result was measured.

The [media record](campaign/SCENE_EDGE_MEDIA.md) documents the original finite tour, 12-second film, distinct 144 BPM score, actual controls, frame review and measurement boundaries. Native evidence was captured in the earlier isolated dependency fixture; integrated scene/texture/shader source hashes match it. Unit mocks and native shader/readback evidence remain separate.
