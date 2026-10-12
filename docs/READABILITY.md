# Supplied-color readability preflight

Optional `/readability` exports the pure, SSR-safe `resolveGlassReadability(options)` utility. It evaluates known opaque colors supplied by your host. It does not sample page pixels or run a browser controller.

```ts
import { resolveGlassReadability } from '@wpsydev/liquid-glass/readability';
import '@wpsydev/liquid-glass/material.css';
const advice = resolveGlassReadability({
  backdrops: ['#0f1724', '#faf7ef', '#ff447f', '#bfd948'],
  appearance: 'light',
  material: { variant: 'clear', opacity: .3, blur: 0, saturation: 1 },
  candidates: ['#000000', '#ffffff'],
  minimumRatio: 4.5,
});
// React: spread advice.props on your authored semantic surface.
// DOM: add className via classList; set data attrs and style.setProperty.
// Vue: map className to class and bind attributes/custom-property style.
```

Supply1–64opaque `#RGB`/`#RRGGBB` backdrops and optionally1–8opaque ink candidates (defaultblack/white). `material` uses known core GlassOptions. `appearance` is explicit light/dark, otherwise derives from explicit material appearance/backdrop and finally light. No OS inspection occurs. `minimumRatio` defaults4.5 and clamps1–21; nonfinite/coerced numbers, unknown properties, accessors, sparse arrays and invalid enums/colors throw. Reevaluate when host samples or appearance change.

The model composites uniform base fill over supplied colors in nonlinear sRGB: light245/247/252 or dark22/28/43; regular basealpha.72 or clear.24, multiplied by normalized material opacity. It evaluates WCAG sRGB luminance on unrounded channels and chooses the ink with the highest worst-sample ratio, retaining candidate order for ties. Rounded estimatedSurface hex is a preview, never the calculation input. Detailed sample objects are allocated only for the winning candidate.

If no ink meets the threshold, reducedTransparency is requested, or tint/refraction exceed this model, the recommendation is opaque. Its black/white ink can differ from supplied brand candidates. Fill is the matching core solid color or an exact black/white pair when the requested threshold requires it. `opaqueFallback` also pins a safe pair if CSS accessibility settings later make a translucent result solid. Apply actual returned props, including `data-lg-solid`, `--lg-ink`, fill variables and fallback fill, rather than just changing a label.

Result: chosenInk/solid/worstSampleRatio/samples/props/assumptions/reason/minimumRatio/estimatedFill, plus translucent candidate estimate and opaqueFallback. `samples` describes the applied recommendation; `translucent.samples` retains the requested simplified estimate for comparison. Normal CSS blending, blur, gradients, highlights, saturation, shadows, unseen colors, style overrides and refraction are outside this model. A numeric estimate cannot certify rendered contrast, video/images or WCAG conformance. Inspect your actual interface and devices separately.

[Light Table](https://wpsydev.github.io/liquid-glass-kit/readability/) applies actual props to four original sample surfaces, including finite moving fields and stricter dark-tone targets. Motion is host demonstration behavior; intermediate animated overlaps are explicitly unsampled. The helper has no DOM/canvas readback, event listeners, animation frames, network access or runtime dependency. It can run before client load. [Research](resource-series/research/06-refero-styles.md) · [Math/payload scope](../benchmarks/readability.json) · [Separate browser checks](../benchmarks/readability-browser.json).
