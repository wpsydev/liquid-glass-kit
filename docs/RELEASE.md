Liquid Glass Kit 0.11 adds **Soft Matter**: circular glass droplets that merge, orbit and separate along a shared refracting boundary.

The experimental `/scene` renderer now combines up to eight owned circular shapes using an analytic smooth union. Edge refraction and specular lighting follow the joined contour; optional stylized RGB dispersion adds controlled color separation. A new `studio` backdrop supplies original procedural artwork. Existing ribbons, HTML lenses, decorative fields, portable CSS material and optional React/Vue adapters remain available.

`setDrops(drops)` stages copied CSS-pixel geometry in preallocated storage without recreating layout-observer subscriptions. With `paused: true`, submit an application-owned pose through `render(seconds)`. `update` still replaces all configuration. Fusion adds one bounded pass: fusion-only scenes use three scene draws including wallpaper and presentation. These are submission counts, not a speed or FPS claim.

Native Chrome 152 / Apple M1 Pro (ANGLE Metal), three animated drops: **0.5841 ms GPU time**, median of five valid run medians, at a 711×1264 backing buffer under an explicit 900,000-pixel budget. Per-run p95 is 2.5268–2.5566 ms. This is an absolute fixture cost at reduced resolution, not an earlier-version speedup, whole-app frame time, phone benchmark or FPS improvement. Raw samples and timer validity are documented in the fusion study.

Fusion samples the renderer's own background. It does not capture arbitrary DOM, merge semantic HTML widgets, simulate fluid volume or reproduce Apple's native optical groups. Preserve foreground controls, host-owned reduced-motion choreography and unsupported/context-loss fallback. Portable CSS remains the default and the core remains dependency-free and SSR import-safe.

[Soft Matter gallery](https://wpsydev.github.io/liquid-glass-kit/fusion/) · [Fusion study and measurement scope](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/FUSION.md) · [Scene API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/SCENE.md) · [Validation record](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md)

Install the release archive or `npm i github:wpsydev/liquid-glass-kit#v0.11.0-preview.1`. npm registry publication remains pending because the authenticated publishing session lacked npm's required 2FA authorization. Browser validation and demonstration-media receipts are recorded separately in the validation record.
