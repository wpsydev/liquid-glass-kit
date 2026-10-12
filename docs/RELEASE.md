A small detail at the edges. **0.49.0-preview.1** adds explicit `edgeQuality: 'pixel'` to the experimental owned-scene renderer.

[SEAM](https://wpsydev.github.io/liquid-glass-kit/edges/) compares identical legacy and pixel-aware scenes, with actual output crops, glass tiles, fused drops and bounded backing sizes. Legacy remains default; all nine default shader strings are unchanged. A failed pixel shader compilation falls back to legacy optics while retaining the owned texture.

85 focused scene/texture/edge tests and 20 native desktop viewport states passed. Actual WebGL compilation, output readback, compiler failure, context recovery and keyboard controls were checked separately from unit tests. This is not physical-phone or Safari certification.

The optional scene bundle adds493 gzip bytes (10,959 →11,452); texture+scene adds491 (14,471 →14,962) with the measured build. Pixel coverage adds shader work and conservative padding. GPU elapsed time was not measured; there is no speedup or FPS claim.

Twelve-second original144BPM glass-tine two-step film, recorded from the working demo. [Guide](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/SCENE.md).

Use the release archive or `npm i github:wpsydev/liquid-glass-kit#v0.49.0-preview.1`. npm publication remains pending. Independently implemented from output-footprint principles; no copied art or shaders.
