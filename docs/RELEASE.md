Give an image the right dimensions and real choices. **0.27.0-preview.1** adds optional `/responsive-image` and `/responsive-image.css`: pure native image/picture props.

Actual intrinsic dimensions, supplied width candidates, authored sizes and explicit critical/normal/below-fold intent. Ordered picture sources support a separate phone composition. Focal points and explicit display crops change framing; they do not optimize files. The browser owns selection, caching and delivery. No source engine, request/decoder/controller/runtime dependency or default import change.

[Image Office](https://wpsydev.github.io/liquid-glass-kit/images/) has nine original WebP still-life files (69,118bytes total), critical hero, independently composed portrait and lazy editorial frames. A finite9.6-second tour inspects all three. Fifteen native responsive Chromium cases fit320–1440px with44px buttons/16px fields; physical phones/Safari/assistive technology unverified.

Fresh390px/DPR2 native blob fixture selected960×640/7316bytehero and960×1200/10986byteportrait. Warm resize retained cached1440hero: source choice and byte reductions are not guaranteed. Blob decoding establishes source/layout behavior, not network timing. Session shift sums are not field/windowedCLS, and React19SSR may independently preload eager images.

Standalone optional JS1805bytesgzip/CSS395bytesgzip. Separate Node25×1000 generation+JSON batches recorded image/picture medians.00638485/.009654222ms; this is not network/render/decoder/FPS/load-speedup evidence.

[API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/RESPONSIVE_IMAGE.md) · [Measured boundaries](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/responsive-image-browser.json) · [Research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/11-landbook.md)

LandBook's composition references informed independent artwork and native resource policy; no external art/fonts/source copied. Original twelve-second film with a112BPM synthpop score attached.

Use the ready-built archive attached here or `npm i github:wpsydev/liquid-glass-kit#v0.27.0-preview.1`. npm registry publication remains pending.
