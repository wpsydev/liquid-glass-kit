Liquid Glass Kit 0.7 adds anchored glass overlays for citations, source/model pickers and contextual controls.

`attachGlassOverlay` supplies viewport-aware top/bottom placement, edge flipping, horizontal shifting, RTL alignment, size constraints and trigger-based spring origins. Native popovers or an existing headless primitive retain visibility, focus, roles and dismissal. Geometry uses unscaled layout dimensions during motion and restores authored styles/priorities on cleanup. The core stays free of runtime dependencies and import-safe during SSR.

The [working overlay studies](https://wpsydev.github.io/liquid-glass-kit/overlays/) show a citation opening above its trigger, native model-choice buttons and a scrollable source library. All content is authored sample data; no AI model or external service runs in this study.

[Overlay guide](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/OVERLAYS.md) · [API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/API.md) · [Validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md)

Install the attached archive or `npm i github:wpsydev/liquid-glass-kit#v0.7.0-preview.1`. npm registry publication remains pending.

Migration is additive; existing material/adapters and defaults remain compatible. Geometry supports horizontal writing modes and same-document fixed/top-layer surfaces without transformed containing blocks. It does not replace a general clipping-boundary solver. Browser observations use resized T3 Chromium viewports; physical iOS/Android, assistive-technology and software-keyboard certification are not implied. This independent material does not claim Apple's native rendering parity.
