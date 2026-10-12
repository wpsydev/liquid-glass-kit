Glass should keep the words useful. **0.22.0-preview.1** adds optional `/readability`, a pure preflight over host-supplied opaque backdrop colors.

It chooses the ink with the strongest worst-sample estimate and returns actual material props. When supplied inks fail the threshold, transparency is reduced or tint/refraction exceeds the model, it applies an opaque recommendation with coherent fill/ink. Ratios use unrounded sRGB math; detailed sample objects are allocated only for the winning ink.

[Light Table](https://wpsydev.github.io/liquid-glass-kit/readability/) shows three actual directions: quiet colors, a finite moving field with opaque fallback, and a stricter dark-tone target. Fifteen native Chromium preset/viewport cases fit320–1440px,44px controls/associated checkbox labels and16px fields. Returned props pin ink/material and fallback states disable actual backdrop filtering. These are separate from physical-device/assistive-technology checks.

This models uniform source-over fill over supplied colors. Blur, gradients, highlights, saturation, shadows, style overrides and unseen pixels are excluded. It does not sample pixels or certify rendered contrast/WCAG conformance; inspect actual applications separately.

Optional standalone JS2,826bytes gzip; no runtime dependency, event listeners or animation controller. Generate advice before clientload if colors are known. Reproducible Node benchmarks cover4×2 and64×8 sample/candidate cases; no renderer/FPS or comparative speedup claim. Root/defaultCSS unchanged.

[Model/API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/READABILITY.md) · [Measurement](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/readability.json) · [Research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/06-refero-styles.md)

Original12-second film with144BPM electro score. Refero's style examples inspired the readability problem; no reference source/assets copied.

Use the ready-built archive attached here, or `npm i github:wpsydev/liquid-glass-kit#v0.22.0-preview.1`. npm registry publication remains pending.
