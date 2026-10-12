# Finite decorative feedback

Optional `/interaction-feedback` exports `createGlassFeedbackEmitter(canvas, options)` and typed options/point/effect. Use an owned blank, decorative canvas; native controls and real state stay in your application. No stylesheet is required for this renderer.

```ts
import { createGlassFeedbackEmitter } from '@wpsydev/liquid-glass/interaction-feedback';
const feedback = createGlassFeedbackEmitter(canvas, {
  width: 512, height: 256, particles: 24, duration: 420,
  maxBursts: 2, maxDpr: 1.5, maxPixels: 262144,
});
await saveYourOwnState();
feedback.emit({ x: 120, y: 80, effect: 'pixels', color: '#254ae9' });
// feedback.cancel(); feedback.update(replacementOptions); feedback.destroy();
```

Host-supplied dimensions/coordinates use canvas-local CSS pixels. The renderer performs no layout read or input handling; measure stable host geometry on appropriate resize/refresh boundaries, outside its frame loop. Reserve the canvas CSS size, position it over your actual controls and call emit only after a host-confirmed action. Do not use decorative bursts to imply an upload/save succeeded when it hasn't.

Options defaults/bounds: effect pixels/sparks/ripple (pixels default); width/height default original canvas dimensions,1–2048; particles24,1–64 per burst (ripple at most3rings); duration420ms,80–1000; opaque hexcolor default#7c9fff; maxDpr1.5,.5–2 ceiling; maxPixels262144,16384–1048576; maxBursts2,1–4; reducedMotionfalse combined with live OS preference. The backing-pixel budget may reduce actual DPR below its requested ceiling. Unknown options, accessors, nonfinite values or invalid colors/effects throw.

`emit({x,y,effect?,color?,intensity?})` returnswhether feedback starts. Coordinates clamp inside the supplied dimensions; intensity defaults1/clamps0–1, zero suppresses. Capacity replaces the oldest active burst. Preallocated storage bounds four bursts/256particles; deterministic directions are original. No work runs until emit. Hidden documents, reduced motion or canvas detachment cancel active work; recovery needs a fresh host action, never automatic replay.

Handle `supported`, `active` and fresh `stats` expose burst/particle counts, requested CSS dimensions, actual backing dimensions/DPR/pixels and drawn frame count. These are counters, not FPS/GPU timing. `cancel()` clears active feedback. `update(replacementOptions)` validates then cancels; same-size updates do not reset backing dimensions needlessly. `destroy()` disconnects owned listeners/active-only mutation observation and restores captured canvas attributes and inline priorities; it cannot restore old canvas pixels. Don't share the drawing context with another owner.

Canvas is aria-hidden, inert, untabbable and pointer-transparent while owned. This preserves native action/focus semantics but does not replace labels, success/error text, motion preferences or rendered contrast checks. Imports are SSR-safe; create the emitter after mount and destroy on cleanup. Unsupported rendering leaves your real host action available. No runtime dependency, DOM pixel sampling or idle RAF loop is introduced.

[Good Loop](https://wpsydev.github.io/liquid-glass-kit/feedback/) demonstrates actual local note saving, native effort change, radio color selection and checklist completion. Its ResizeObserver caches host points; its six-step tour is finite. [Research](resource-series/research/08-godly-recent.md) · [Optional payload](../benchmarks/interaction-feedback-payload.json) · [Browser finite-work evidence](../benchmarks/interaction-feedback-browser.json).
