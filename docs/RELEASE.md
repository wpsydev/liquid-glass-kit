Liquid Glass Kit 0.8 adds fast, purposeful microinteractions: four directional reveals plus short confirmation and error cues.

`attachGlassTransition` is an optional typed core helper with a 180 ms / 12 px default, bounded distance/timing, per-effect completion booleans, cancellation and live reduced-motion support. Native Web Animations handle the timed effects; unsupported animation capability or reduced motion settles the intended state immediately. Core imports remain SSR-safe and runtime dependencies stay at zero. Existing spring motion remains available for elastic input and velocity-preserving retargeting.

The [one-screen studio](https://wpsydev.github.io/liquid-glass-kit/micro-motion/) demonstrates all six cues with real native controls and local sample state. It stays quiet until interaction or an explicit replay. The recorded short video uses actual browser output and an original score; no connected backend is implied.

[Transition guide](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/MICRO_MOTION.md) · [Toolbox research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/MICRO_MOTION_RESEARCH.md) · [API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/API.md) · [Validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md)

Install the attached archive or `npm i github:wpsydev/liquid-glass-kit#v0.8.0-preview.1`. npm registry publication remains pending.

Migration is additive. Reserve individual translate/scale/opacity on a dedicated visual layer, with no competing engine/CSS transitions on those fields. Host code retains visibility, inert/focus, native dismissal, real operations and announcements. These are short timing curves, not Apple's renderer or a velocity-continuous spring. Browser observations are distinct from physical-device, cross-browser and assistive-technology certification.
