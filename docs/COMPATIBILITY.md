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

The 0.10 scene adds decorative instanced fields and a cached RGBA8 wallpaper. Texture interpolation, quantization, edge clamping and float rounding differ from the original analytical shader. `maxPixels` is an explicit resolution tradeoff, never enabled by default. Instance counts are submitted graphics, including boundary-clipped shapes; they do not certify thousands of semantic widgets or any phone's frame rate. Normal CSS backdrop-filter cost remains scene- and device-dependent. See [RENDERING.md](RENDERING.md) for separate map-generation, GPU, cadence and resource evidence.

## Mobile layout and continuous corners

The mobile preview adds primary-pointer ownership and descendant-control isolation to material and motion input. Native scroll/zoom is preserved. Optional 44px target, safe-area padding and dynamic-viewport helpers are layout building blocks; applications still own responsive layout and native dialog/form semantics. `dvh` and safe-area insets do not universally solve software-keyboard placement.

Continuous corners use a feature-gated independent CSS superellipse with the existing rounded fallback. Stable Safari/iOS and Firefox are not claimed to support it; the dated primary-source compatibility record is in [MOBILE_RESEARCH.md](MOBILE_RESEARCH.md). Experimental SVG optics remain circular, and owned-scene lenses should use round surfaces.

See [MOBILE.md](MOBILE.md) for recipes. The resolution matrix in [VALIDATION.md](VALIDATION.md) establishes reflow in resized Chromium, not physical iPhone/Android testing or certification of every phone.

## Anchored overlay geometry

`attachGlassOverlay` uses DOM layout and optional VisualViewport/ResizeObserver. Its native-popover recipe requires a browser with the Popover API; geometry itself can enhance an existing fixed accessible surface. Positioning uses measured layout dimensions, avoiding transient spring scale. Scope is same-document horizontal-writing fixed/top-layer overlays, with viewport bounds, not arbitrary clipping ancestors or virtual anchors. Avoid transformed containing blocks and competing positioning engines. Padding does not include hardware safe insets. Host owns roles, focus, dismissal and offscreen-anchor policy. See [OVERLAYS.md](OVERLAYS.md).

## Fast timed transitions

`attachGlassTransition` uses optional native Web Animations and individual translate/scale/opacity; unavailable animation support settles immediately. Imported core code remains SSR-safe. Explicit/system reduced motion removes temporal movement and preserves the intended endpoint. Use a dedicated layer without competing animations/CSS transitions on those properties. An active effect observes DOM detachment; idle controllers should still be destroyed during host unmount. No GPU/compositor guarantee, browser benchmark, physical-phone or accessibility certification is implied. These short timing curves differ from the existing velocity-preserving spring helper. See [MICRO_MOTION.md](MICRO_MOTION.md).
