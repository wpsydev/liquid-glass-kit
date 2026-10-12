# Resource 30: Anime.js

Reviewed 2026-10-11. Official current documentation, two actual live documentation examples, primary WAAPI references and repository license. No source or site artwork copied and no runtime dependency added.

## Actual API and live evidence

- [Timeline](https://animejs.com/documentation/timeline/) exposes add, sync, call and label, with playback controls and explicit child positions. [Time positions](https://animejs.com/documentation/timeline/time-position/) distinguish absolute, relative and labelled positions. Its actual live square/circle/triangle example was inspected in the collaborative browser; the visible completed geometry had a 240px translate, while separately mounted example copies remained untransformed. This is existence/state evidence, not a synchronization benchmark.
- [Scope](https://animejs.com/documentation/scope/) owns root selection, defaults/media queries and batch reversion. Its [revert example](https://animejs.com/documentation/scope/scope-methods/revert) animates two independently scoped rows. Native Revert row 1 removed the first row's inline opacity values while row 2 retained an animated 0.7266 opacity. That concretely demonstrates cleanup ownership without changing another component.
- The current docs include module subpaths and JS-versus-WAAPI distinctions. [When to use WAAPI](https://animejs.com/documentation/web-animation-api/when-to-use-waapi) discusses tradeoffs; its target-count suggestions and site payload figures are product guidance, not our measurements.
- [Acceleration guidance](https://animejs.com/documentation/web-animation-api/hardware-accelerated-animations) specifically limits acceleration claims by property/browser/easing. Filter/clip-path and custom linear easings have different paths; do not promise every WAAPI animation runs outside the main thread.

## One distinct optional feature

**Finite, scoped material sequence**. Existing motion/micro-motion animate one surface; scroll reveal schedules entrances, but neither supports coordinated multi-element playback, pausing and deterministic seeking as a single owned sequence.

Suggested `attachGlassSequence(root, { tracks, reducedMotion })` with tracks `{ element, from, to, at, duration, easing }` and `play()`, `pause()`, `seek(milliseconds)`, `cancel()`, `destroy()`, duration/status and a completion result. Explicit finite offsets are sufficient initially; do not clone Anime.js's entire timeline DSL, arbitrary property engine, repeat system or callback scheduler. Cap tracks, keyframes and total duration. Reject elements outside the owned root and ambiguous overlap on the same target/property. Use dedicated visual wrappers for transform/opacity to preserve existing press/indicator ownership.

Prefer native WAAPI animations with one document clock/start time, per-track delays, and common pause/seek time. No idle RAF engine is needed for CSS playback. Resolve canceled completion predictably and handle `finished` AbortError. Cancel/destroy restores captured inline properties and priorities; it must not cancel unrelated animations found by an indiscriminate global query. Hide/disconnect/preferences settle or stop according to a documented policy. Under reduced motion, apply the intended stable endpoint without unnecessary staggered waiting.

Seeking changes presentation only. It must not replay network calls, deletion, focus changes or navigation at timeline offsets. The host separately performs real semantic state changes. A completed opacity fade does not by itself make content hidden, inert, accessible or focus-safe. Explicit user play is appropriate for a demo; ordinary forms should use short functional transitions without long distraction loops.

## Primary technical and performance references

- [Web Animations specification](https://www.w3.org/TR/web-animations-1/) defines timeline timing, effects and playback. Its referenced publication is a Working Draft, not a promise of every feature's implementation.
- [Animation.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime) supports running or paused seeking; clock precision can vary by browser privacy settings.
- [Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel) clears effects and rejects a running finished promise with AbortError.

Bounded transform/opacity tracks can reduce per-frame JS work; actual compositing still depends on glass filters, ancestor effects, size and browser. Many animations/layers remain expensive. Read baseline styles once at attachment/start, not each frame; do not animate blur/displacement maps or layout dimensions in this first sequencer. Benchmark CPU-load behavior, canceled/repeated mounts, retained animation objects and exact endpoints separately. Root-scoped media listeners are installed only on explicit attachment and removed on destroy; module imports stay SSR safe. Native browser observations here are not FPS/power or iOS results.

## Rights and access

[Official license](https://github.com/juliangarnier/anime/blob/master/LICENSE.md) is MIT, copyright 2025 Julian Garnier. Original implementation can use the public behavior/API concepts without importing its source; preserve notice if source is reused later. Sponsor/course content and artwork are not assumed under that license. Public docs/examples needed no login. A short private recording only unpaused background preview rendering and is not a promotional asset. No CPU-blocking demonstration was activated.
