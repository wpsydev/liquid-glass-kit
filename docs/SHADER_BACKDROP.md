# A little light, an explicit clock

Optional `/shader-backdrop` exports `attachGlassShaderBackdrop(canvas, options)` for trusted host-authored GLSL ES3.00. It renders one procedural WebGL2 canvas behind separate semantic HTML. Portable CSS and visible fallback siblings remain host-owned; no source URL, Shadertoy import/channel API, arbitrary DOM capture, eval or runtime dependency is added.

```ts
import { attachGlassShaderBackdrop } from '@wpsydev/liquid-glass/shader-backdrop';
const light = attachGlassShaderBackdrop(canvas, {
  fragment: 'vec4 glassBackdrop(vec2 pixel) { return vec4(0.2,0.4,0.6,1.0); }',
  provenance: { author: 'Your project', license: 'Your actual license' },
  maxPixels: 262144,
});
// light.play() only after an explicit host/user choice
// light.destroy() on unmount
```

Import is SSR-safe; attach to an unowned browser canvas after hydration. Fragment defines vec4 glassBackdrop(vec2 pixel), up to32,768characters, inside the controller's version300es wrapper. Pixel input/uResolution use bottom-left backing pixels; uCssResolution uses CSS pixels. uTime is active playback seconds, uDelta caps.1seconds and uFrame counts submissions. Quiet policy zeros animation uniforms while diagnostics retain actual submission totals. Custom uniforms supply real host pointer/task values; no synthetic pointer state is invented by the renderer.

Provenance is a required bounded caller declaration of author/license, not verified ownership. Source and pixel caps do not bound shader instruction cost, sandbox code or prevent GPU watchdog failures. Use only trusted, licensed shaders and measure their actual workload. Avoid undefined GLSL constructs: pow with a negative base is undefined even when its exponent is2.0; square signed distances with multiplication. No borrowed shader gallery assets are included.

Uniforms are at most16declared float/int/vec2/vec3/vec4 values with safe nonreserved names. Components are finite within±1,000,000; int values are integers. Reserved uResolution/uCssResolution/uTime/uDelta/uFrame/gl_ names cannot be overridden. updateUniforms patches only declared names/types, validates the whole patch and submits an actual draw only when values change. Locations and programs are cached; ordinary value changes do not recompile.

Limits: maxDpr default1.5/range.25–2; maxPixels default1,048,576/range4096–4,194,304 integers; maxDimension default2048/range64–4096 with actual hardware cap. These bound output resolution and trade fidelity for cost, not GPU instruction time. enabled defaults true; play defaults false. Static initial observer/resize settling can submit additional still frames without advancing the clock. Explicit play starts finite host-permitted playback; the controller itself supplies no duration stop, so the host stops decorative playback when its task finishes.

Handle: state, render(seconds?), updateUniforms(values), replaceFragment(source,provenance), play(), pause(), setEnabled(boolean), destroy(). Explicit time accepts0–1,000,000seconds. Replacement compiles a candidate and keeps last-good program/pixels/provenance on failure; diagnostics describe the real compiler result. Playback stops for hidden/offscreen, reduction/transparency/contrast/forced colors, disabled or context loss. Return/restoration stays paused rather than replaying. Re-read support/state and preserve a native fallback. Destroy releases owned GPU objects, observers/listeners/frames and conditionally restores authored backing attributes.

state reports ready/unsupported/error/context-lost/destroyed, actual playing/visible/enabled/reason, submission count, dimensions/pixels, time, bounded diagnostics and provenance. Counts are JS driver submissions, not completed GPU work or FPS. onStatus receives changed frozen snapshots; host callback errors are separate from shader execution. This controller does not hide DOM content, label controls or manage focus.

[Light Studies](https://wpsydev.github.io/liquid-glass-kit/shaders/) presents three original analytical Ice/Solar/Tidal functions. Real native warmth/intensity/seek controls and separate glass HTML settings are functional. Invalid-fragment testing retains the actual previous pixels; the finite tour ends paused. Paused count is exact, playback readout is sampled, and Seek time is labelled rather than presented as a live clock. Four original signed-distance squares now use explicit multiplication; sampled native pixels were unchanged on the tested driver.

30 focused tests and40 desktop native viewport/state cases across320–1440px retain44px targets,16px fields and no page overflow. Real WebGL2 pixels distinguish all three styles; actual compiler rejection, last-good retention, WEBGL_lose_context loss/restoration, native controls, offscreen/quiet/solid gates and capped backing were verified. Physical phones, Safari, live OS preference changes and assistive technology remain unverified.

Optional controller4441bytesgzip excluding demo fragments/material CSS.200commands on128×96backing: median.6ms per40CPU/driver submissions, including200geometry/style reads,1200uniform attempts/600nonnull calls,0recompile/location lookup/texture-buffer upload in measured batches. Separate lifecycle balances6programs/6VAOs/14shaders; settled idle/post-destroy work adds0RAF/submissions. No GPU elapsed/paint/FPS/watchdog safety/comparative speedup inference.

Original twelve-second breakbeat148 acid-bass/glass-FM film uses three actual shader styles and the final portable demo source. Full360-frame/audio decode and four reviewed frames passed; export30fps is not appFPS.

[Native evidence](../benchmarks/shader-backdrop-native.json) · [Benchmark](../benchmarks/shader-backdrop-browser.json) · [Boundaries](../benchmarks/shader-backdrop-boundaries.json) · [Research](resource-series/research/32-shadertoy.md)

Independent Shadertoy-inspired procedural authoring, without copied shaders or channel compatibility claims.
