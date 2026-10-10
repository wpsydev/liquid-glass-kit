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
- Arbitrary-DOM GPU refraction, background-aware automatic text inversion, chromatic aberration, physical shape merging and native mobile adapters remain unimplemented. Spring motion and moving backing geometry are separate CSS/DOM approximations, not optical shape merging.
- Large blur areas and media backgrounds need device testing; there is no established universal performance budget.
- The core is ESM. React 18+ and Vue 3.3+ are optional peer contracts. Their latest installed versions are used in local tests, not the full minimum-version range.

Material density, hex tint, explicit backdrop hints, press feedback, indicator geometry and scroll-edge scrims are portable CSS/DOM features with no new runtime dependencies. Tint mixing needs color-mix; base material remains without it. Browser preferences and explicit solid mode override translucent effects. CSS geometry transitions animate layout of the decorative backing; test performance with your own number/size of controls.

Motion uses browser RAF timestamps and CSS individual scale/opacity. It preserves retarget velocity and stops when settled; layout-based indicator geometry still needs device-level performance testing. Native popover/dialog semantics are owned by the browser/app, not the material controller. Explicit and system reduced motion are supported.

Entry/exit fades change whole-surface opacity. Values below 1 create a CSS backdrop root, which can temporarily change the child material's background sampling; this is a web compositor limitation. Test translucent overlays in your actual layout.

An optional `@wpsydev/liquid-glass/scene` WebGL2 renderer now refracts its own procedural background. It is separate from the CSS/SVG paths and does not sample arbitrary DOM or external imagery. Keep a CSS fallback on context failure/loss and use preference/pause controls. See [SCENE.md](SCENE.md).
