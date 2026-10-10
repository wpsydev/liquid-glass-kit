# Compatibility and honest limits

| Feature | Chromium | Safari / WebKit | Firefox | No backdrop filter |
| --- | --- | --- | --- | --- |
| CSS frosted material | Intended | Intended | Intended | Solid fallback |
| Luminous edges, shadows | CSS | CSS | CSS | CSS |
| Live SVG backdrop lens | Experimental, opt-in | CSS fallback | CSS fallback | Solid fallback |
| Native control semantics | Preserved | Preserved | Preserved | Preserved |
| Reduced transparency | Media query where supported + explicit option | Same | Same | Already opaque |
| SSR | Deterministic CSS markup | Same | Same | Same |

“Intended” describes standards-based behavior, not certification of every browser version or device. The checked-in tests validate options, map generation, DOM lifecycle, React/Vue server markup, and custom element registration. Live browser verification is recorded in `docs/VALIDATION.md`. No unsupported cross-browser pixel-parity claim is made.

The lens gate uses a Chromium user-agent hint and syntax check. This is deliberately conservative and can miss derivatives or falsely suggest rendering on unusual configurations. Keep refraction zero for a stable portable path. `data-lg-renderer` tells you the requested path, not whether every pixel rendered correctly.

## Constraints

- The pseudo-element uses `::before`; choose another wrapper if the app already owns that pseudo-element.
- Translucency cannot guarantee contrast over arbitrary content. Use a solid preference and test foreground labels.
- Parent opacity, filters, masks, and stacking contexts can alter backdrop sampling. Inspect the actual ancestor tree.
- The experimental lens installs a document-level SVG definition. Shadow roots and consumer `<base>` URLs are not certified; use CSS there.
- Refraction bitmap URLs need `img-src data:` in a strict CSP. Style mutation also needs an appropriate application CSP strategy. CSS-only class styling avoids dynamic style injection, and zero refraction avoids bitmap URLs.
- Offscreen/zero-size elements receive no lens until measured again. ResizeObserver handles modern environments.
- A canvas/GPU renderer, background-aware automatic text inversion, chromatic aberration, physical shape merging, spring morphing, and native mobile adapters are remain unimplemented. Moving backing geometry is a separate CSS approximation, not shape merging.
- Large blur areas and media backgrounds need device testing; there is no established universal performance budget.
- The core is ESM. React 18+ and Vue 3.3+ are optional peer contracts. Their latest installed versions are used in local tests, not the full minimum-version range.

Material density, hex tint, explicit backdrop hints, press feedback, indicator geometry and scroll-edge scrims are portable CSS/DOM features with no new runtime dependencies. Tint mixing needs color-mix; base material remains without it. Browser preferences and explicit solid mode override translucent effects. CSS geometry transitions animate layout of the decorative backing; test performance with your own number/size of controls.
