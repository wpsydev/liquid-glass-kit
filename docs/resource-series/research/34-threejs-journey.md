# Resource 34: Three.js Journey

Reviewed 2026-10-11. Public lesson previews, course access labels and official general conditions, cross-checked against primary timer/graphics documentation. No paid course downloads, videos, models or source packs used. Native preview remained unavailable.

## Public examples and concrete lessons

- [Performance tips](https://threejs-journey.com/lessons/performance-tips) publicly exposes an introduction/setup/monitoring preview. It distinguishes CPU/GPU limits, testing multiple setups including mobile, delivery weight, frame monitoring, Spector draw-call inspection and renderer.info. The full lesson/video/project packs are paid/preview labelled; this audit does not claim to have reviewed the protected remainder. We did not remove browser FPS limits, install extensions or execute course code.
- [Post-processing](https://threejs-journey.com/lessons/post-processing) publicly explains rendering to a texture, alternating two targets and a final canvas pass. Its Damaged Helmet illustration is a credited third-party model, not ours. Each pass can multiply memory/bandwidth cost; a full-screen filter stack is not just one cheap material.
- The [course catalog](https://threejs-journey.com/) separates free and preview lessons and now includes WebGPU/TSL as well as Three.js. Neither course availability nor showcase screenshots establishes universal browser support. Paid lesson downloads, students' work and course media were not retrieved.

## One distinct optional feature

**Measurement-driven quality governor**, an original inference from the source's measurement-first advice. Existing scene maxDpr/maxPixels/caustic resolution are static explicit controls; they do not conservatively adapt to sustained host-provided performance evidence.

Suggested pure `createGlassQualityGovernor({ levels, initialLevel, targetMilliseconds, sampleWindow, cooldownMilliseconds, recoveryWindows })`, with `sample({ milliseconds, time, kind, valid, visible })`, `lock(level)`, `unlock()` and `reset()`. Levels are explicitly ordered budgets such as maxPixels and caustic renderScale/resolution, not arbitrary browser/device categories. Return a desired level plus the reason/sample summary; the host chooses how/when to apply it to existing scene options. Do not silently remove controls, animation functionality or host quality choices.

Require finite bounded timing inputs, monotonic observation timestamps, a fixed sample window and hysteresis: sustained overload can reduce one level, recovery needs a longer stable period, and cooldown prevents repeated framebuffer reallocations. Ignore invalid/disjoint measurements, hidden/paused observations, huge resumed-tab gaps and compile/warmup samples. Define separate `frame-cadence` and `gpu-elapsed` input kinds and avoid mixing them in one statistical window. CPU-limited or refresh-capped intervals are not proof of GPU cost. Reducing texture pixels may not fix a CPU bottleneck; report the policy decision rather than promise a speedup.

No built-in stats dependency, idle RAF meter, device fingerprint, hardware tier list or forced benchmark is needed. Hosts can feed their existing renderer loop, validated timer-query samples or an explicit manual test. A native quality selector provides a stable override. SSR imports remain pure and preferences can force solid/reduced motion outside the governor. After a viewport change, reset/retest rather than oscillate on stale samples.

## Primary technical/performance references

- [EXT_disjoint_timer_query](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query) measures GPU command durations without stalling and explicitly distinguishes WebGL 1/2 variants. Extension support is limited; a disjoint result is unusable evidence.
- [drawingBufferWidth](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawingBufferWidth) is actual backing width and may differ from the requested canvas width; use actual output sizes in budget records.
- [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) explains limits, resource allocation and synchronization costs.

Unit validation can check sustained overload, cooldown/recovery, manual lock, invalid samples and deterministic decisions. Browser benchmarks must then show the resulting image quality and actual work/cadence, with disclosed device/viewport/input kind. A lower maxPixels setting is a resolution tradeoff, not an automatically better renderer. Do not count average frame intervals as GPU milliseconds, or display a stable 60 as proof of rendering headroom. A governor cannot guarantee arbitrary custom shaders will finish quickly.

## Rights/access

[General conditions](https://www.threejs-journey.com/general-conditions), Article 5, retain platform ownership and restrict reproduction/integration of its media and text, with a narrow exception for exercise code examples. This is not a blanket permissive license for course projects, art or downloadable assets. Independent policy/math and original demo footage are proposed; no course source is copied. Public lesson text was sufficient for a carefully scoped inference. No purchase, authentication bypass, course video reuse or account action occurred. Native browser and performance validation remain pending.
