# Rendering thousands of glass surfaces

This work separates ordinary semantic controls from a decorative GPU field. Portable CSS remains the default. The existing experimental scene owns its wallpaper and lenses; it never samples arbitrary HTML behind the canvas. A canvas field does not replace buttons, labels, keyboard navigation, hit testing, or screen-reader semantics.

## Where the work actually goes

Animating JavaScript values cheaply does not prove that glass is cheap to render. Browsers must also lay out content, paint, composite layers, submit commands, and execute fragment shaders. Thousands of `backdrop-filter` surfaces can each demand background sampling and intermediate buffers. A stress scene should avoid creating thousands of independent DOM controls, blur layers, observers, or animation loops when its objects are decorative.

[Google's animation guidance](https://web.dev/articles/animations-guide) recommends considering the rendering stage affected by an animated property. Transforms and opacity are useful for DOM motion because they can avoid layout and paint; backdrop effects still require measurement on the actual scene. Promoting every object with `will-change` is not a free performance improvement and can consume memory.

[MDN's WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) recommends batching draws, keeping vertex-array state stable, limiting pixel and memory budgets, and avoiding synchronous queries in production hot paths. These recommendations suggest a shared rendering layer: evaluate the owned wallpaper once, sample that texture for lens optics, and draw decorative objects with instancing. That is an architectural choice informed by the sources, not a guaranteed speedup on every device.

## Implementation choices

- Keep the existing eight semantic HTML lens anchors and their public options. Read their actual bounds so CSS transforms remain aligned with the scene.
- Render the analytical wallpaper into one reusable texture at the existing backing resolution. Do not claim that reducing resolution is an equivalent-quality speedup.
- Draw the existing lenses as bounded, ordered instanced quads with a 96 CSS-pixel shadow margin. Evaluate the signed-distance field only over each quad and sample the shared wallpaper, rather than processing every lens over every canvas pixel. The omitted far shadow attenuation is below 0.00002 per lens.
- Share ribbon trigonometric phases through angle-addition identities. The wallpaper remains at the same backing resolution in the before/after measurement.
- Use [WebGL 2 instanced drawing](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced) for the decorative field. A per-instance index and deterministic seed provide position, phase, size, and direction in shaders; JavaScript changes time and shared options, rather than uploading thousands of transforms every frame.
- Keep geometry for field objects bounded. Fragment cost depends on projected area and overlap, not only object count. A thousand large overlapping panes can still be expensive with one draw call.
- Reuse GPU resources until size or context changes, delete owned resources on destruction, and rebuild after context restoration. Stop animation when hidden, paused, or reduced motion is requested. Preserve the explicit reduced-transparency path.

A shared RGBA8 texture introduces quantization, bilinear sampling, and clamping relative to the previous analytical sample at every warped coordinate. Ordered lens blending introduces intermediate framebuffer clamping; bright rims and overlaps can change locally. The benchmark compares fixed-time 8-bit RGB output separately from timings, and the public demo needs a visual check. This implementation is independent of Apple's rendering and is not pixel-identical to iOS or the previous analytical shader.

## Evidence and limitations

The generator is `scripts/render-benchmark.mjs`. It bundles a frozen `0.9.0-preview.1` checkout and the working scene with the same target, minifier, CSS dimensions, backing DPR, eight lens bounds, palette, time, and optics. Moving and stationary lens workloads are paired with seeded randomized version order. New 1,000- and 3,000-instance workloads are measured separately because the old API did not offer a field.

The harness distinguishes four measurements:

1. `performance.now()` around `render(time)` measures main-thread submission and geometry work; it is not GPU elapsed time.
2. Animation-frame intervals measure observed callback cadence, which can be constrained by the shared preview, recording, refresh rate, and scheduling. They are not a universal FPS promise.
3. Optional asynchronous GPU samples use the [Khronos timer-query specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/). Results are read only after availability, and disjoint samples are rejected. Unsupported timers produce no GPU-time claim.
4. A separate benchmark-only `render(time)` plus `gl.finish()` sample measures serialized completion wall time after draining prior commands. It includes JavaScript, browser IPC, driver, and GPU work. Blocking completion is deliberately absent from production code and is not normal animation behavior.

An independent instrumented pass counts draw calls, instance submissions, layout reads, uploads, explicit typed-array construction, and live owned WebGL handles after destruction. These counters do not measure all JavaScript allocation, browser/driver memory, or total VRAM. Object count, pixel budget, draw count, CPU submission time, GPU work, and callback cadence must be reported separately.

The same native fixture exposes `runOpticsBenchmark()`: 31 seeded paired batches after five warmups, with eight 256 × 160 displacement maps at radius 28 per batch. This measures synchronous pixel generation and allocation, excluding CSS/SVG composition. Axis-aligned signed-distance regions need no Euclidean distance, and pixels outside the active edge band need no normal samples. Seven dimension/radius cases are checked byte for byte against the frozen baseline before timing. This optimization changes computation, not the resulting map; its CPU gain must not be presented as a whole-app or GPU-rendering speedup.

## Final measured result

The final [native rendering report](../benchmarks/render-browser.json) was captured in Chromium 152 through the shared T3 preview, with recording active to keep animation callbacks progressing. The backend identifies itself as ANGLE Metal on Apple M1 Pro. The browser viewport was 1280 × 800, with device DPR 2; both renderer versions explicitly used `maxDpr: 1`, so each backing buffer held 1,024,000 pixels. No lower-resolution wallpaper was substituted.

The test uses five seeded randomized pairs per eight-lens scenario, two seconds per version after 12 warmup frames, seed 971301. Asynchronous GPU queries were available; every final run reports zero disjoint, skipped, or unanswered samples. Aggregate values are medians of the five run medians, not a selected fastest frame:

| Workload | Baseline GPU median | New GPU median | Reduction |
| --- | ---: | ---: | ---: |
| Eight stationary lenses | 1.5827 ms | 0.8455 ms | 46.6% |
| Eight moving lenses | 1.5800 ms | 0.8552 ms | 45.9% |

Both versions observed approximately 60 Hz callback cadence. Main-thread submission medians were 0.1 ms stationary and 0.2 ms moving for both versions. The separate completion diagnostic did not show a wall-time improvement: stationary medians were 0.1 → 0.15 ms, and moving medians 0.15 → 0.2 ms. Its synchronization and coarse main-thread clock make it distinct from the asynchronous GPU timing; it is retained in the raw report rather than used to infer a GPU or FPS result.

The final [optics report](../benchmarks/optics-browser.json) measures 16.8 → 4.1 ms per eight-map batch, a 75.6% reduction in CPU generation time. Its 31 paired batches follow five warmups, seed 407111. Outputs are byte-identical in the seven fixture comparisons; ten baseline golden digests are also covered by unit tests. This result excludes the browser's SVG compositing work.

The new-only field scenarios at 1280 × 800 use nominal size 12 CSS pixels, speed 60, rightward wave motion, and seed 731. Five-run GPU medians are 0.7724 ms for 1,000 instances and 0.9075 ms for 3,000. The separate [portrait field report](../benchmarks/render-showcase.json) uses nominal size 22, 720 × 1280 CSS pixels and a 1080 × 1920 buffer at capped DPR 1.5. Its three-run GPU median is 2.0392 ms. Individual instance sizes vary, including larger foreground shapes; nominal size does not mean every instance occupies that area. These capacity scenes are not before/after comparisons with thousands of old DOM widgets, and they do not measure every transition or palette in the promotional film.

An instrumented field-only frame submits two ordinary draws and one instanced draw, reads the canvas bounds once, and performs no explicit typed-array allocation or buffer/texture upload. Adding the existing HTML lens batch makes four total draws. Existing eight-lens scenes retain nine geometry reads so animated HTML stays aligned. Every instrumented scenario releases all counted owned GPU handles on destruction; this does not prove zero driver memory retention.

## Quality and recovery checks

Fixed-time readback at two seconds, equal resolution and optics, gives stationary-scene RGB mean absolute difference 0.4653/255, p95 one level, and maximum 44. Moving lenses give mean 0.4894/255, p95 one, and maximum 79. The averages are small, but the local maxima show that cached sampling and bright rims change; no pixel-equivalence claim follows.

[Native overlap checks](../benchmarks/render-validation.json) deliberately place eight 210 × 140 lenses almost on top of one another on a 320 × 240 canvas, with radius 28. Across neon, sunset, and ocean palettes at refraction 0 and 22, mean RGB differences are 0.96–1.05 levels, p95 two levels, maxima 58–68, and approximately 2.01–2.46% of channels differ by more than eight levels. The same validation record exercises actual context loss and restoration: a combined 3,000-instance/lens scene becomes unsupported with empty stats on loss, then restores support, four draws, and `NO_ERROR`. These are native browser checks, separate from mocked unit tests.

## Retained experiments

Raw exploratory runs remain available with their own source hashes:

- [Initial shared-texture renderer](../benchmarks/render-initial.json): stationary GPU time 1.5939 → 1.5667 ms, a modest improvement.
- [Fragment early-out experiment](../benchmarks/render-earlyout.json): 1.5955 → 1.7990 ms, a regression. A branch inside a full-screen lens loop did not deliver the expected gain on this backend.
- [Shared trigonometric phases](../benchmarks/render-trig.json): 1.5907 → 1.3726 ms before switching the lens work to bounded instanced quads.

The final result belongs to the final architecture and frozen source, rather than a favorable frame from an earlier experiment. Each run compares against the same unchanged baseline source. These experiments explain why limiting rasterized lens area was more useful here than adding a fragment branch.

## Reproduce

With the project's development dependencies installed, create a clean baseline checkout and generate the fixture:

```sh
git worktree add --detach /tmp/liquid-glass-0.9-render-baseline bb1f647c2d9920863ce41a0134a9000873dac5a9
node scripts/render-benchmark.mjs --baseline /tmp/liquid-glass-0.9-render-baseline
```

Open the generated `/tmp/lg-render-preview.html` in the native T3 collaborative preview. Keep it actively rendering throughout the run, with the same capture conditions. The rendering command used for the final report is:

```js
await window.runRenderBenchmark({ width: 1280, height: 800, maxDpr: 1 });
// Raw samples: JSON.stringify(window.lastRenderBenchmark)
```

Run the optics measurement and separate portrait/validation workloads:

```js
await window.runOpticsBenchmark();
// Raw samples: JSON.stringify(window.lastOpticsBenchmark)
await window.runRenderBenchmark({
  scenarios: ['field3000'], repetitions: 3,
  width: 720, height: 1280, maxDpr: 1.5, fieldSize: 22
});
await window.runSceneValidation();
// Native overlap/recovery record: JSON.stringify(window.lastSceneValidation)
```

Save each raw report before the next call replaces `lastRenderBenchmark`. Browser-tool outputs may need JSON chunks because the complete rendering report exceeds a single tool's return limit. Do not run source builds or other animated scenes concurrently; discard interrupted or hidden runs. Generating HTML alone does not produce timing evidence. A new device/browser independently reproduces the workload, not necessarily these numbers.

The frozen baseline source SHA-256 is `601ade5c20f324630d99449d5f9508def7479b09edd922f0f89961c14760b065`; the final measured source SHA-256 is `d70d055210b3c5234474a8e381835877389cdf5e25597f2142c7c560c9bb61f5`. The generator hashes sorted `.ts`, `.tsx`, and `.css` files under `src`, including file names and NUL separators; the source metadata also records uncommitted paths at measurement time. Benchmark fixtures bundle source directly, rather than potentially stale `dist` output.

Mobile-sized viewports in desktop Chromium are layout checks, not evidence about physical iPhone GPU performance or battery life. These results do not establish a whole-app speedup, universal refresh rate, or iOS rendering parity.
