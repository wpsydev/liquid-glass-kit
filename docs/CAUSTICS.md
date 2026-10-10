# Caustics: light studies

0.13 adds opt-in WebGL2 caustics to the owned-scene tier. The CSS material and material adapters remain unchanged. [Six interactive studies](https://wpsydev.github.io/liquid-glass-kit/caustics/) use command search, a player, navigation dock, range control, status toast and primary action. Their controls are semantic HTML, above one decorative canvas. Their search/player/booking behavior is explicitly a demo.

This is an original **single-interface planar approximation**: analytic wave and rounded-edge normals bend incoming rays using Snell refraction. The GPU rasterizes the refracted mesh onto a receiver. Fragment derivatives estimate the source-to-receiver area ratio; convergence produces bright light and overlapping folds add. Determinants account for shear. A five-tap finite footprint in the existing wallpaper shader softens narrow focal lines. The result is bounded, artist-directed and intentionally clipped to RGBA8. It does not conserve total scene energy, solve a glass volume, trace arbitrary geometry, simulate fluid, calculate spectral dispersion, account for Fresnel throughput/occlusion or match Apple's optics.

## Integrate

```ts
import { attachGlassScene } from '@wpsydev/liquid-glass/scene';

const scene = attachGlassScene(canvas, {
  surfaces: [{ element: toolbar, radius: 32, refraction: 28 }],
  backdrop: 'mineral', maxDpr: 1.5, maxPixels: 900_000,
  caustics: { intensity: .16, depth: 100, ripple: .5 }
});
// Preserve native HTML behavior, visible focus, contrast and a CSS fallback.
// update() replaces the whole configuration. Destroy on unmount:
scene.destroy();
```

The existing `/lazy` entry accepts the same options and defers this scene module/GPU work. React/Vue material adapters do not gain a caustics prop: attach the scene after mounting a canvas in the host's lifecycle. Do not add a canvas to an ordinary page if portable CSS already meets its design requirement.

| Caustics option | Default | Bounds and meaning |
| --- | --- | --- |
| intensity | .16 | 0–1; zero skips rendering and new caustic resources |
| ior | 1.45 | 1–2.4; single air-to-material interface |
| depth | 100 | 0–240 CSS pixels; receiver separation |
| ripple | .5 | 0–1; analytic wave slope, not fluid simulation |
| speed | .6 | 0–3; wave phase speed |
| resolution | 40 | Rounded integer 16–96; cells per source mesh axis |
| renderScale | .5 | .25–1 of the scene's backing width/height; .5 is approximately a quarter of its area |
| light | [.45, .65] | Incoming XY slopes, each bounded -1–1; Z is -1 before normalization |
| emitters | [] | Additional canvas-local rounded rectangles, maximum eight total with visible HTML surfaces taking priority |

`GlassSceneCausticsOptions` and `GlassSceneCausticEmitter` are type exports from `/scene`. Emitter `x/y` are center coordinates in canvas-local CSS pixels, `width/height` are full sizes (positive, bounded 1–2048), and `radius` defaults28 and is bounded by its half extents and1024. Nonpositive sizes are skipped; finite coordinates are bounded ±100,000. Sources more than480px outside the canvas are culled. Visible HTML surfaces use their measured bounds/radius automatically; there is no DOM capture. Offscreen HTML surfaces retain the existing surface culling behavior. Fusion/field do not automatically emit light; approximate them with explicitly owned emitters if needed. Emitters do not create interactive controls or change a fusion boundary.

Options, emitter records and light tuples are copied on replacement updates. Updating topology/resolution uploads a new static mesh; do not call full `update()` every animation frame. Move actual HTML controls using the host's layout; the renderer measures them as before. For standalone emitter motion, this release intentionally has no staging API—choose shader phase animation or infrequent configuration changes.

## Rendering and performance choices

Caustics are disabled by default. Enabling them lazily creates one shader program, two static mesh buffers, a small RGBA8 texture and framebuffer, and two source-data arrays. The mesh is shared across up to eight instanced emitters. At40 cells it stores1,681 UV vertices and9,600 indices; UV/index storage is32,648 bytes. The warm path uploads uniforms, without mesh buffers or textures being recreated. Resizing reallocates texture storage; changing resolution rebuilds the mesh. Destroy releases owned resources; context restoration rebuilds them.

One instanced caustic draw renders the lower-resolution light buffer. The **existing** wallpaper draw then samples it, so presentation, glass and fusion all see the illuminated receiver. No new fullscreen composition pass is added. Six HTML lenses plus caustics use four draws total; adding fusion and field produces six. `stats.causticCount`, `causticTriangles` and `causticPixels` report last-submitted source count, mesh triangles and light-buffer area. They are not visible pixels, physical photons or FPS. `stats.pixels` is the main scene's backing area, excluding this extra receiver texture.

Half-scale light filtering trades spatial detail for softer focal lines and lower blending work; it is not an equal-quality speedup. `maxPixels` separately trades the main scene's resolution for speed. Labels stay in HTML at browser resolution. For a busy real app, reduce intensity/mesh resolution, keep glass in a small control layer, defer optional scenes, provide pause and profile the complete app on target hardware.

Reduced motion stops continuous animation; explicit redraws stay static when motion reduction is enabled. Reduced transparency, increased contrast and forced colors skip the caustic pass and keep opaque lens rendering. Existing allocated buffers/targets remain reusable until resize, replacement or destroy. Hosts must also supply usable opaque CSS/semantic controls when WebGL is unavailable. Paused scenes still draw after layout/update or explicit render.

## Research and implementation boundaries

- [Hong et al., SIGGRAPH Asia 2025: sample-space partitioning and spatiotemporal reuse for specular manifold sampling](https://research.nvidia.com/labs/rtr/publication/hong2025partition/) improves interactive caustic sampling using bounded Newton walks and ReSTIR. We take the design lesson to constrain expensive work; this release does **not** implement SMS, ReSTIR or hardware ray tracing.
- [NVIDIA adaptive anisotropic photon scattering](https://developer.nvidia.com/blog/generating-ray-traced-caustic-effects-in-unreal-engine-4-part-1/) reconstructs ray-traced photon footprints with temporal feedback and adaptive density. Its general scene/light transport and RTX pipeline are outside a small dependency-free WebGL2 UI renderer. The useful lesson here is to budget samples and screen-space blending separately.
- [Evan Wallace's original WebGL water renderer](https://github.com/evanw/webgl-water/blob/master/renderer.js) demonstrates refracted mesh projection and derivative area-ratio concentration. Our shaders independently implement a bounded rounded-rectangle/analytic-wave model and a determinant-based area ratio. No code or assets are copied. This foundational browser technique predates the recent research; we do not market it as a new 2026 algorithm.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) informs shared immutable storage, bounded back buffers, avoiding warm-path synchronous status calls, and batched draws. Native timer queries are optional and invalid disjoint samples must be discarded.

The 2026 Eurographics record for “Guided ReSTIR FG+ Photon Resampling for Large Scenes and Many Lights” appeared in search, but the publisher returned403 during this session. It is not relied on as an inspected implementation reference.

## Experiments and measured results

[`benchmarks/caustics-browser.json`](../benchmarks/caustics-browser.json) records source hash `9380a40a2aa01dd0fde712274c7d4e14ed64641d298bcdb027e4a5c449ec657b`, Chrome 152/ANGLE Metal on Apple M1 Pro,720×1280 CSS viewport and711×1264 main backing buffer (898,704 pixels). Six HTML source rectangles share one 40-cell mesh. Half-scale light storage is355×632 (224,360 pixels). Three1.5-second runs per variant,16 warmup frames, reversed variant order in the middle repetition. GPU measurements use asynchronous non-disjoint timer queries; all18 runs had zero disjoint, skipped or unanswered queries.

| Variant | Full-scene GPU median of three run medians | Range of run medians |
| --- | --- | --- |
| No caustics | .4505 ms | .4388–.4927 ms |
| Indexed24 cells, half-scale | .6294 ms | .6192–.6605 ms |
| **Default indexed40, half-scale** | **.6553 ms** | **.6540–.6819 ms** |
| Indexed40, full-scale | .7102 ms | .7082–.7142 ms |
| Indexed64, half-scale | .7428 ms | .7422–.7468 ms |
| Expanded static UV40, half-scale | .7673 ms | .7186–.8184 ms |

Default per-run GPU p95 was .7410/.7774/.7353 ms, with individual maxima2.4430/3.7049/2.1324 ms. CPU submission medians were .1 ms at the browser clock's coarse precision. Callback intervals were16.7 ms; these are not presented-frame FPS. The movie uses **one** source at64 cells, stronger light and different geometry; do not call the six-source fixture its measured frame cost.

Early procedural-grid indexing alone did not consistently improve timings. Moving UV generation into static buffers reduced repeated shader work; lowering light resolution reduced blending work while changing quality.24 cells was cheaper but visibly coarser;40 is the library balance,64 is the large-gallery choice. We kept three earlier raw experiment reports rather than suppressing their negative results and warm-run variability.

The expanded/indexed comparison shares UV inputs, optics, triangle topology and target size, but its focal/derivative pixels are **not byte-identical**:80,866 channel bytes differ out3,594,816, maximum difference57. Earlier same-indexed repeat control was byte-identical. Do not promote that comparison as an exact-render speedup or infer a percentage improvement between separate iterations. The table gives measured absolute scene costs and quality choices, not a hardware-wide guarantee.

A separate resource pass found zero warm-frame mesh uploads, texture allocations, explicit Float32/Uint16 allocations or synchronous GL status calls; seven layout reads remain for the canvas and six HTML sources. All owned programs, shaders, buffers, vertex array, textures and framebuffers were released after destroy. This does not measure every JS allocation, driver memory, VRAM or host app work.

Native pixel checks observed66,627 pixels change when enabling caustics and123,742 between animated poses, with no GL errors. Motion-reduced explicit poses were byte-identical; opacity reduction skipped caustics. Real context loss zeroed counters and reported unsupported, then restoration rebuilt six emitters without GL errors. Browser evidence is separate from unit tests.

## Visual iterations

1. Direct full-resolution mesh projection exposed harsh discontinuous focus lines; a first compile check also caught a GLSL built-in naming collision, corrected before benchmarking.
2. A lower-resolution receiver softened thin peaks and kept one extra draw; shared static UV/index buffers removed grid-coordinate work from the shader.
3. Six UI studies replaced abstract optical shapes. Layout checks exposed a clipped320px player and short-landscape film controls; their width rules were corrected and rechecked.
4. Broader analytic waves plus the five-tap receiver footprint produced coherent light trails. The final movie uses64 cells and larger type for readable mobile playback; all six studies and the end card were inspected.

All desktop resized layouts and controlled preference fixtures are recorded in [VALIDATION.md](VALIDATION.md) and the campaign receipt. Physical iPhone Safari/Android, software keyboards and assistive technology were not exercised in this environment.

