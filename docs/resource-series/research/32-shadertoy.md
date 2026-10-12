# Resource 32: Shadertoy

Reviewed 2026-10-11. Official how-to, terms, editor interface and primary WebGL documentation. Two live shader pages were attempted, but actual shader contents did not become available. No shader, artwork, texture, music or private API copied.

## What was actually available

- [Official how-to](https://www.shadertoy.com/howto) defines a per-pixel mainImage output and inputs including pixel resolution, playback time, frame information, mouse and up to four channels. It separately defines sound and VR entrypoints. This is an explicit host/shader contract, not a general guarantee that a fragment can safely run at arbitrary resolution.
- [Terms](https://www.shadertoy.com/terms) say creators choose their individual shader license; absent an explicit license, the default is Creative Commons Attribution-NonCommercial-ShareAlike 3.0. Public viewing/forking and a downloadable shader are not permission to distribute it under our MIT license or in commercial demos.
- The how-to says API keys require an account with Silver/Gold status, only Public + API shaders are exposed, and the current documented limit is 1500 requests/month. We requested no key, account elevation, API download or authentication bypass.
- Native `/howto` encountered Cloudflare security verification. Native [example Ms2SD1](https://www.shadertoy.com/view/Ms2SD1) loaded only the editor shell at 1024×576, with zero source characters, empty author/tags and zeroed timing. [Example 4ttSWf](https://www.shadertoy.com/view/4ttSWf) likewise did not provide actual shader content; a subsequent native evaluation timed out. Exa also returned empty generic editor shells. Consequently this audit cannot describe the visuals, exact shader implementation or individual license of these examples. It is not a live shader benchmark.
- The actual public editor help exposes independent channel filter/wrap/flip choices and compile diagnostics. Its shell has a typed uniform contract; these generic interfaces are sufficient evidence for the independent extension below. No community shader snippet was used.

## One distinct optional feature

**Host-authored single-pass procedural backdrop extension**, complementary to source 29's owned media texture ingestion. Existing scene backdrops are a fixed enum; users cannot supply their own licensed procedural field. Do not add another refraction, caustic or particle algorithm for this source.

Suggested `attachGlassShaderBackdrop(canvas, { fragment, uniforms, maxDpr, maxPixels, paused, reducedMotion, onStatus })` returns `render(timeSeconds)`, `updateUniforms(values)`, `pause()`, `resume()`, `replaceFragment(source)`, `destroy()` and a status/diagnostics snapshot. Define a small documented pixel/color function contract, explicit resolution/time/delta/pointer uniforms and scalar/vector host parameters. If accepting mainImage-style functions, call it partial single-pass compatibility only: no multipass buffers, channels, sound, VR, webcam, arbitrary textures, API lookup or copied shader catalog.

Shader strings are explicitly trusted, authored/licensed by the host and compiled only after attachment or explicit replacement. Do not compile code scraped from URLs or execute arbitrary assistant/user output by default. Bound source length, declared uniform count/name/value dimensions and output resolution. These bounds do not prove shader execution cost or sandbox malicious/unbounded GPU work; static text linting cannot certify GLSL performance. Prefer original short analytic fields for release fixtures, with a fixed procedural test at known times and a plain CSS fallback.

Compile once, retain bounded diagnostics as plain text, and report compile/link errors rather than blank success. Log warnings are not compilation failure by themselves: inspect compile/link status appropriately. Optional parallel compile support can avoid immediate blocking status polling. Swap only after the new program is valid; dispose prior program/resources and reject stale replacement results. Reuse lifecycle/resource helpers where practical without changing the portable material default or forcing this engine into root imports.

Clock semantics must be explicit: active playback seconds do not jump across hidden tabs, seeking is host-controlled, reduced motion renders a stable frame, and no audio plays. Pointer coordinates are canvas-local backing pixels with a documented origin and CSS-to-backing conversion; do not confuse CSS pixels or touch activity with mouse-down uniforms. Host keeps actual controls as semantic HTML above the decorative canvas and owns all source rights. No cloned DOM or readable text is rasterized.

## Primary technical/performance references

- [WebGL 2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) defines the context/GLSL ES environment; the latest linked publication is an editor's draft.
- [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) covers limits, synchronization costs, optional extensions and resource release. Per-pixel instruction cost scales with output pixels, so a small source file can be expensive.
- [KHR_parallel_shader_compile](https://developer.mozilla.org/en-US/docs/Web/API/KHR_parallel_shader_compile) supports asynchronous completion checks when present; feature-detect rather than require it.
- [getShaderInfoLog](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getShaderInfoLog) returns warnings and errors. Render diagnostics using textContent, not HTML.
- [uniform uploads](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniform) require type/dimension agreement; cache locations per compiled program rather than query per frame.
- [Context loss](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event) invalidates resource assumptions. Stop frames, preserve fallback and explicitly rebuild valid resources on restoration.

Use one bounded framebuffer/viewport/program initially, no readPixels/gl.finish, no status query per frame, no perpetually compiling editor input. Budget both DPR/output pixels and active drawing frequency, pause when hidden/offscreen or explicitly stopped, and stop entirely when transparency preferences choose solid UI. Actual author shader cost cannot be promised by a maxPixels limit. Benchmark compile latency, context restore, steady draw submission and GPU time where a valid non-disjoint timer extension exists; CPU frame intervals are not GPU durations. Do not claim thousands of arbitrary custom shaders will remain fast.

## Rights/access outcome

This site's default noncommercial/share-alike shader license is unsuitable to assume for our MIT/commercial framework. A named author may choose MIT or another license, but that must be checked for each shader and each channel asset. Site branding, bundled textures and music are separate. No shader/media copied and no external action performed. The proposed feature ships only independently authored fixtures, with a host-owned provenance field if useful. Live visual coverage remains limited by unavailable shader data; no bypass was attempted.
