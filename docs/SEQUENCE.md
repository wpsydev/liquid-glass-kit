# Finite visual choreography

Optional `/sequence` exports `attachGlassSequence(root, {tracks, reducedMotion?})`. Imports are SSR-safe; attach after hydration and destroy on unmount. One sequence coordinates1–32unique noninteractive visual descendants through native Web Animations. Keep native controls, text editing and app actions outside the animated layers.

```ts
import { attachGlassSequence } from '@wpsydev/liquid-glass/sequence';
const motion = attachGlassSequence(stage, { tracks: [
  { element: firstShape, from: { y: 20, opacity: 0 }, to: { y: 0, opacity: 1 } },
  { element: nextShape, at: 120, to: { x: 16 }, duration: 280 },
] });
await motion.play();
// motion.destroy() on unmount
```

Tracks accept plain numeric from/to frames: x/y between−1000 and1000CSS pixels, scale.5–2, opacity0–1. Omitted from fields use the authored baseline. Duration defaults220ms, finite0–6000; at defaults0, absolute0–10000ms; total at+duration cannot exceed10000ms. Easing is linear/ease/ease-in/ease-out/ease-in-out, default ease-out. Each dedicated element is unleased, connected and noninteractive, including its descendants. Host-authored transforms compose as a baseline rather than being discarded; reserve transform/opacity from competing writers.

`play()` starts/resumes and returns `{completed,reason,error?}`. Repeated play calls while playing share the pending promise. Native effects use a shared document-timeline start time; no JS RAF/timer clock or business callback runs at offsets. `pause()` holds actual effect time. `seek(milliseconds)` clamps to the finite timeline and pauses presentation only; it never runs navigation, focus changes or app actions. `state` samples status/time/duration on demand, not through polling. A displayed time readout is event-sampled unless the host explicitly implements a live clock.

Finished/paused poses remain until cancellation or a new play. `cancel()` stops only owned effects and restores still-owned inline transform/opacity including priorities. `destroy()` releases leases, effects, listeners and observation; unrelated host native animations survive. Actual CSSOM serialization tracks owned styles. External inline changes win, and detached/hidden/interactive-insertion guards cancel without replay. The host owns content, semantics, focus and actual app state; cancelling decoration does not revert a task.

Explicit reducedMotion combines with OS reduction. Quiet/unsupported motion presents the finite endpoint and resolves with its reason. Hidden work stops; it does not replay when shown. Structural/style guard observation remains while a held/finished pose is owned, so zero RAF is not zero observer or active rendering cost. Animated transforms/opacity can still paint/composite; no compositor guarantee is implied.

[Offbeat](https://wpsydev.github.io/liquid-glass-kit/sequence/) is an original six-shape composition. Real Play/Pause/Seek/Cancel controls coordinate independent visual layers while a native draft retains focus and editing. The host's finite tour changes three motion studies, pauses/seeks actual native effects and ends quiet with no native effects remaining. The sampled seek position is labelled honestly; footer navigation has a44px target.

22 focused tests and40 native desktop viewport/state cases across five320–1440px sizes retain44px targets,16px fields and no page overflow. Actual shared start time, held pause, seek1150ms, resume promise, authored rotate(−14deg)!important restoration, external ownership, unrelated native animation retention, quiet/hidden cancellation, inserted control and focused draft were verified. Physical phones, Safari and assistive technology remain unverified.

Optional IIFE3149bytesgzip.100connected two-track attach/paused-seek180ms/cancel/destroy cycles measured medianapproximately.20ms/p95.30ms atapproximately.1ms timer resolution. Scope includes native setup, computed-style baselines, timing-property/style writes and cleanup; no rectangle/JSRAF requests, no retained effects or250ms idle work. Active elapsed animation, painting/compositor/GPU/FPS and comparative speedups are outside scope.

Original twelve-second chamber-pizzicato126BPM film records the actual finite tour, with disclosed camera framing.360-frame/audio decode and three reviewed frames passed; export30fps is not appFPS.

[Native evidence](../benchmarks/sequence-browser.json) · [Layouts](../benchmarks/sequence-layouts.json) · [Research](resource-series/research/30-animejs.md)

Independent Anime.js-inspired coordinated motion, without copied animation or mandatory animation-engine dependency.
