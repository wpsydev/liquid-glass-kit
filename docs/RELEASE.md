Liquid Glass Kit's optics preview adds an optional WebGL2 renderer and an original interactive neon demo.

- Screen-space analytical wallpaper with rounded-rectangle distance-field normals.
- Edge refraction with neutral center displacement and independently tuned highlights.
- Draggable semantic lenses, palette changes, a refraction comparison and existing spring controls.
- A separate `@wpsydev/liquid-glass/scene` import, with no runtime dependency and no import-time DOM requirement.
- Pause, motion/transparency preferences, bounded rendering density and context-loss fallback.

[Live optics lab](https://wpsydev.github.io/liquid-glass-kit/optics/) · [Scene API and limitations](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/SCENE.md) · [Inspiration discussion](https://x.com/okandogubudak/status/2108947960621146517)

Install the attached package archive or `npm i github:wpsydev/liquid-glass-kit#v0.4.0-preview.1`. npm registry publication remains pending.

The renderer refracts only its own procedural canvas. It does not sample arbitrary DOM content or external images/video, implement optical shape union, or reproduce Apple's private compositor. The shader and demo are an original implementation inspired by the public technical discussion. Ordinary CSS material integrations stay independent of this renderer.

Browser validation uses the T3 Chromium preview. Mocked WebGL tests establish lifecycle and API behavior, not optical fidelity. Safari, Firefox and physical iOS devices remain unverified.
