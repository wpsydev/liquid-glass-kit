# Rendering glass efficiently

Choose the renderer by what it needs to sample. The ordinary CSS material remains the default for website controls and arbitrary page backdrops. The optional `/scene` module owns a procedural canvas background and can batch decorative glass shapes; it does not capture DOM. A canvas field is not a replacement for buttons, forms, readable content or accessible application state.

## Where the work happens

Controller setup is only one cost. A moving backdrop under `backdrop-filter` needs rendering work even when the JavaScript controller is idle. Thousands of blurred DOM surfaces can increase filtered area, overlapping passes and compositing work. JavaScript mount timings do not establish that those pixels render faster. Keep glass on small floating surfaces; share a toolbar material rather than placing blur on every child. Dense tables and long text should remain solid.

For ordinary UI movement, prefer transforms and opacity to repeatedly changing layout geometry, and inspect the actual paint/compositing result. Transform animation does not make backdrop sampling free; opacity can change backdrop roots. Avoid blanket `will-change` or `translateZ(0)` on thousands of elements, which can consume resources. Browser tooling can distinguish paint, frame timing and unnecessary layer work. [web.dev animation guide](https://web.dev/articles/animations-guide), [Chrome rendering tools](https://developer.chrome.com/docs/devtools/rendering/performance)

## Owned-scene batching

The next-generation renderer evaluates the procedural wallpaper into one texture, then reuses it for refractive sampling. Shared trigonometric phases avoid repeated ribbon calculations. Rounded edges and independent rim lighting remain in the lens shader, which now draws bounded, ordered lens quads rather than evaluating all eight lenses across every canvas pixel. A 96 CSS-pixel shadow margin omits an attenuation below 0.00002 per lens. Field motion runs in the vertex shader from time, instance identity and a seed; the application does not write thousands of DOM transforms or upload new particle positions every frame. Instancing submits the decorative field together, while keeping the wallpaper and optional HTML-lens passes separate.

This reduces repeated procedural evaluation and submission work. It does not eliminate fragment shading, overlapping glass coverage, texture memory or the canvas's pixel budget. A thousand large overlapping shapes can cost more than many small shapes. The optimization changes wallpaper sampling to a cached RGBA8 image and blends lenses in order; intermediate clamping can affect bright overlapping rims. Compare actual rendering rather than claiming pixel-identical output. [WebGL2 instanced drawing](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced)

Use an explicit pixel-density budget and test on the intended viewport. Double pixel density means approximately four times the canvas pixels. Reuse GPU resources; pause a background when it is hidden or reduced motion is requested; delete owned resources on teardown. Avoid synchronous GPU status/readback calls in the animation loop. These choices follow documented WebGL guidance, but the observed result depends on the browser backend and hardware. [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

## SVG generation

The experimental SVG path retains its previous displacement bitmap bytes. Straight regions use exact axis distance without a Euclidean calculation; pixels outside the edge band do not need normals. An unchanged lens geometry retains its definition and encoded bitmap; changing only displacement strength updates the filter scale. Resize/radius changes rebuild the map, and opaque preferences remove the filter. This optimizes generation and definition churn, not the browser's arbitrary-DOM SVG compositing cost.

Ten golden bitmap digests from the 0.9 release cover odd dimensions, fractional and clamped radii, invalid radius fallbacks and maximum dimensions. Seven native-fixture byte comparisons are recorded separately from unit tests.

## Read the measurements correctly

The rendering harness compares the frozen 0.9 source with the new source at the same viewport, framebuffer density, palette, timestamps and eight-lens layout. Native browser records separate JavaScript submission time, animation-frame intervals and optional asynchronous GPU timer samples. A benchmark-only serialized completion test uses `gl.finish()` to wait for queued work; that result is elapsed render-plus-wait time, not normal animation behavior or pure GPU time. No production loop calls `finish()`.

Measured in the native T3 preview, Chromium 152 on an Apple M1 Pro through ANGLE Metal, with capture active to keep the preview rendering:

| Controlled workload | 0.9 baseline | New renderer | Measurement |
| --- | ---: | ---: | --- |
| Eight stationary lenses, 1280 × 800 backing pixels | 1.5827 ms | 0.8455 ms | GPU time, 46.6% less |
| Eight moving lenses, same backing pixels | 1.5800 ms | 0.8552 ms | GPU time, 45.9% less |
| Eight 256 × 160 displacement maps, radius 28 | 16.8 ms | 4.1 ms | CPU generation time, 75.6% less |

The GPU numbers are medians of five run medians from seeded randomized paired runs, each two seconds after 12 warmup frames. The asynchronous timer extension was available; no samples were disjoint, skipped, or unanswered. Both versions retained approximately 60 Hz callback cadence. JavaScript submission medians were unchanged at 0.1 ms for stationary lenses and 0.2 ms for moving lenses. These results establish lower measured GPU work on this workload, not a whole-app speedup, higher FPS, or physical-phone performance. [Raw rendering results](../benchmarks/render-browser.json)

The displacement-map numbers use 31 paired batches after five warmups. Output allocation is included; SVG/filter composition is excluded. The harness compares seven dimension/radius cases byte for byte before timing. [Raw optics results](../benchmarks/optics-browser.json)

The new field is an additional workload because the previous release did not support thousands of scene instances. Its count and draw calls establish submitted graphics, not thousands of DOM widgets. Frame callbacks and a video's export rate are not proof of presented frames or physical-phone performance. Keep raw samples, timing conditions, source hashes, disjoint-query status and resource accounting with any claimed result.

At 1280 × 800 backing pixels, a field of 3,000 instances with nominal size 12 CSS pixels measured 0.9075 ms GPU time across five runs. A separate portrait workload uses 720 × 1280 CSS pixels, DPR capped at 1.5, a 1080 × 1920 backing buffer, and nominal size 22; its three-run median was 2.0392 ms. This is a larger scene with larger shapes, not another before/after comparison or the measured runtime of every sequence in the showcase video. Both fields submit three draw calls: wallpaper, background presentation, and one instanced field draw. Adding HTML lenses uses a fourth draw. Field-only frames read one canvas bound, construct no new explicit `Float32Array`, and upload no per-instance buffers in the instrumented pass. Owned GPU handle counts return to zero after destruction. [Portrait results](../benchmarks/render-showcase.json)

The fixed-time stationary scene differs from the analytical baseline by a mean 0.4653 RGB levels on an 8-bit channel; 95% of channels differ by at most one level, but the largest local difference is 44. Moving lenses show a maximum of 79. Eight heavily overlapping lenses across all three palettes show mean differences around 0.96–1.05 levels, with maxima up to 68. These checks expose local bright-rim and intermediate-clamping changes that averages alone hide. Native context loss clears support/stats; restoration recreates a combined 3,000-instance/lens scene with no WebGL error. These browser checks are separate from mocked unit tests. [Overlap and restoration evidence](../benchmarks/render-validation.json)

For exact reproduction commands, source hashes, retained unsuccessful experiments, and the timer methodology, see [RENDERING_RESEARCH.md](RENDERING_RESEARCH.md).

The previous controller-only results remain in [PERFORMANCE.md](PERFORMANCE.md). Rendering measurements, physical devices and lifecycle counters are different evidence and should not be combined into a whole-app speed promise.
