# Rendering research and architecture

Research date: 2026-10-10. This document records primary sources, implementation decisions, and open limits. Descriptions of other repositories are observations of their published designs, not measured performance comparisons. All implementation code in this repository was written independently.

## 1. What gives the material its character?

Apple describes a combination of optical lensing, responsive light, organic motion, and contextual separation. Its guidance places glass chiefly in floating navigation and control layers, discourages glass on glass, and differentiates versatile regular glass from more transparent clear glass. Clear needs a dimmed media backdrop and bright bold foreground content. Reduced transparency, contrast, and motion preferences are integral to the design. The browser implementation approximates these ideas with explicit appearances, layered CSS, pointer highlights, and optional lensing; it does not claim Apple's automatic pixel-dependent contrast adaptation.

Source: [Apple, Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/). Also [Apple technology overview](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass).

## 2. Portable baseline: composited CSS

`backdrop-filter` filters pixels behind an element rather than foreground content. Partial transparency is needed to see the filtered image. Backdrop roots and ancestor effects can change the sampled region; opacity, filter, masks, and containment decisions need inspection in the consumer's layout. Blur support is broader than support for arbitrary SVG URL backdrop filters. The portable tier uses blur/saturation, a tint fill, thin highlights, and shadows. A negative-z pseudo-element inside the surface's stacking context keeps text above the optical effect. Unsupported blur uses an opaque material.

Source: [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter), [CSSWG Filter Effects Level 2](https://drafts.csswg.org/filter-effects-2/).

## 3. Refraction: spatial displacement

SVG displacement maps shift source pixels using chosen image channels relative to their neutral value. A rounded-rectangle signed-distance field supplies edge normals; the center remains neutral so large surfaces avoid whole-background distortion. Maps use sRGB interpolation to keep encoded channel values predictable. Pixel maps are bounded, rasterized only when needed, and resized to the surface. An SVG filter references the map, and the CSS pseudo-element requests it as a backdrop filter. Foreground text stays outside the filter. The resulting lens is stylistic, not a full Snell-law renderer.

Source: [MDN feDisplacementMap](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap).

## 4. What the existing work teaches

[rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) demonstrates a React-oriented optical/interaction API. [shuding/liquid-glass](https://github.com/shuding/liquid-glass) demonstrates copy-paste SVG shader techniques. [aberhamm/liquid-glass-react](https://github.com/aberhamm/liquid-glass-react) documents explicit live-backdrop versus copied-content tiers. These projects establish that another visual demo alone would add little. Our product focus is portable semantic surfaces, a minimal framework-free core, explicit capabilities and limits, reusable agent guidance, and tested lifecycle behavior. Competitors may cover features that this preview does not; no unsupported superiority or bundle-size claim is made.

## 5. Why not make WebGL/WebGPU the default?

WebGL renders to a canvas and can implement sophisticated optics for textures the application supplies. It is useful for scenes that already own their background image/video/render graph. Our inference: arbitrary DOM does not arrive as a readable GPU texture through this API; making a canvas lens over a normal app needs a separate capture/duplication strategy. That creates synchronization, cross-origin, text, accessibility, and resource-management work. A future explicit image/video renderer can own those constraints. The initial library therefore avoids DOM screenshot dependencies and a permanent GPU animation loop.

Source: [MDN WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

## 6. Accessibility and performance

System reduced-transparency support is incomplete, so an explicit app preference is essential. CSS also handles contrast, forced colors, reduced motion, and print. Pointer lighting has no transform that would move hit targets; native buttons/dialogs preserve semantics. A translucent regular tint improves separation but cannot mathematically guarantee foreground contrast against every background. Validate actual content and provide a solid setting.

Limit blur area, avoid glass in long table rows, don't layer many filtered ancestors, and test scroll/video on real phones. Maps cap resolution and regenerate on resize/configuration/preferences, not each frame. Large filters and busy media can still be expensive. No device performance claim is established without a measured benchmark.

Sources: [MDN reduced transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency), [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), [MDN forced colors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors).

## 7. Agent-first distribution

`llms.txt` is an emerging documentation convention, not a search ranking contract. Typed imports, self-contained examples, searchable package/repository terms, framework recipes, and a scoped skill reduce integration ambiguity. Documentation must say which artifacts are published and distinguish implementation from plans. A shadcn registry is a possible future distribution channel, but this release does not claim registry compatibility or install an untested registry endpoint.

Sources: [llms.txt proposal](https://llmstxt.org/), [shadcn registry documentation](https://ui.shadcn.com/docs/registry).

## Decisions and remaining research

| Approach | Good fit | Main limit | Status |
| --- | --- | --- | --- |
| CSS material | General semantic application surfaces | No true refraction; arbitrary contrast needs validation | Implemented default |
| Live SVG backdrop lens | Opt-in Chromium optical demo | Engine/compositor differences; strict CSP may block bitmap | Experimental |
| Filtered duplicated media | Explicit background-owned scenes | Synchronize crop, scrolling, and dimensions | Future |
| WebGL/WebGPU texture lens | Canvas apps / explicit media renderer | Texture ownership, hardware, context loss | Future |
| DOM capture pipeline | Arbitrary static snapshot experiments | Fidelity, cross-origin content, updates, cost | Not implemented |
| Native iOS material | Native Apple apps | Not a web primitive | Out of scope |

Before claiming a stable optical tier: compare real Safari/Firefox/Chromium and iOS devices, test portals/shadow DOM/CSP/filter ancestry, benchmark video and scroll, and capture image comparisons. The compatibility document tracks the current evidence rather than treating a CSS supports query as a rendered-pixel test.
