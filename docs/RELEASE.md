Liquid Glass Kit 0.13 introduces **caustic light studies**: light concentrating through glass, behind useful semantic HTML controls.

Enable optional `caustics` in `/scene` or `/lazy` with up to eight owned sources. A shared static refracted mesh projects light onto a planar receiver; derivative area ratios brighten converging rays. A filtered lower-resolution RGBA8 light buffer is sampled by the existing wallpaper pass, so the glass also refracts the illuminated background. One additional instanced draw, no new composition pass or runtime dependency. CSS remains the default; React and Vue remain optional peers.

Six interactive examples showcase search, music player, navigation dock, range control, status toast and primary action. The 12-second release video combines the working UI with an original upbeat synthesized score, including an end card. Labels and behavior stay in HTML; reduced motion, opaque modes, GPU-unavailable fallback and context recovery are covered.

The default six-widget fixture measured **.6553 ms median full-scene GPU time** (median of three run medians) on **Apple M1 Pro / Chrome 152**,711×1264 main backing pixels and355×632 light pixels. Run p95:.7410/.7774/.7353 ms; maxima up to3.7049 ms. CPU submission medians were.1 ms at coarse clock precision. These are desktop-browser fixture results, not movie timing, physical-phone performance or measured presented FPS. Mesh/resolution experiments and negative results are retained; different focal pixels prevent a pixel-identical speedup claim.

This is an original, artist-directed **single-interface planar approximation**, informed by current caustics research and foundational WebGL work. It does not implement ReSTIR/SMS, full glass-volume light transport, fluid, spectral caustics, arbitrary DOM capture or Apple's private renderer.

[Try the six studies](https://wpsydev.github.io/liquid-glass-kit/caustics/) · [Watch the film](https://wpsydev.github.io/liquid-glass-kit/docs/campaign/assets/caustics-showcase.mp4) · [Research, exact options and benchmarks](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/CAUSTICS.md) · [Raw evidence](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/caustics-browser.json) · [Validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md)

Install the ready-built archive attached to this release, or `npm i github:wpsydev/liquid-glass-kit#v0.13.0-preview.1` for a source build. npm registry publication remains pending because the authenticated session lacks the required publishing2 FA authorization.
