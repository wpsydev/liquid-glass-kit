# API reference

Import `@wpsydev/liquid-glass/styles.css` once. Core imports have no framework or runtime dependencies. ESM only.

## GlassOptions

| Option | Default | Meaning |
| --- | --- | --- |
| `variant` | `regular` | `regular` or `clear`; clear requires a controlled media backdrop |
| `appearance` | `auto` | `auto` follows color scheme; `light` and `dark` are explicit |
| `radius` | `24` | CSS pixels, clamped 0–999 |
| `blur` | `18` | CSS pixels, clamped 0–64 |
| `saturation` | `1.35` | Scalar, clamped 0–3 |
| `refraction` | `0` | SVG displacement pixels, clamped 0–60; experimental Chromium path |
| `interactive` | `false` | Pointer-following highlight; disabled for touch/reduced motion |
| `reducedTransparency` | `false` | Force a solid readable material |

Nonfinite numeric values use defaults. Invalid variants/appearances use defaults. Large CSS radii are naturally constrained by the browser; lens map corners are constrained to half the surface dimensions.

## attachGlass(element, options?) / glass(element, options?)

Enhances an existing `HTMLElement`; call after mount. Returns `{ update(options), destroy() }`. `update` replaces the complete configuration, so unspecified fields return to defaults. Use one controller per element. Destroy before reattaching. Destroy is idempotent and restores library-owned properties and attributes present before attachment, including priorities. External edits to those same owned fields during attachment are not preserved on destroy.

The controller owns `.lg-glass`, `data-lg-*` attributes, and `--lg-radius`, `--lg-blur`, `--lg-saturation`, `--lg-filter`, and `--lg-pointer-*` variables. Put layout and custom animations on a wrapper. Do not assign your own `::before` on the glass element: the material uses it to keep effects behind foreground content.

SVG maps regenerate on resize, options changes, and relevant preference changes. Resize work is coalesced into a frame; generated maps are capped at 256 pixels on their longest side. No continuous animation loop. A resize without ResizeObserver is not automatically tracked; call update in older environments. Unsupported refraction uses CSS; no blur uses a solid fallback.

## getGlassProps(options?)

A pure SSR-safe function returning `{ className, style, 'data-lg-variant', 'data-lg-appearance', 'data-lg-solid', 'data-lg-interactive' }`. `style` contains CSS variables. React can spread it directly; other frameworks can rename className to class. It does not install event listeners or refraction filters.

## getGlassCapabilities(view?)

Returns `{ backdrop, experimentalRefraction }`. The first reports syntax support for blur; the second is a **conservative Chromium hint** plus URL filter syntax support. CSS parsing cannot prove the compositor actually rendered a lens. Do not present this as a visual or performance guarantee. `data-lg-renderer` reports the path requested by the controller: `solid`, `css`, or `svg-experimental`.

## createDisplacementMap(width, height, radius)

Pure optical helper returning RGBA `Uint8ClampedArray`. Width and height must be integers from 1–512; invalid dimensions throw. Red and green carry rounded-rectangle surface normals, the center is approximately neutral (128/255), blue is neutral, alpha is opaque. The map is a stylized height field rather than a physical optical simulation.

## React

`GlassSurface` accepts `as` (`div`, `section`, `nav`, `aside`, `header`, `footer`), `glass`, native HTML attributes, `children`, and a forwarded element ref. Default tag is div. `GlassButton` accepts `glass`, native button attributes, and a forwarded button ref; default type is button. Both preserve callbacks, disabled states, and user classes. Set material variables through `glass`; avoid conflicting inline overrides of fields the controller owns.

No headless dialog/menu state is included. Compose with native dialog/popover or your app's existing headless library. The React entry has a `use client` directive for Next.js.

## Vue

`GlassSurface` accepts `as` (default div), `glass`, forwarded attributes/classes/styles, and the default slot. It exposes `{ element }`. Use semantic tags and native event handlers. It destroys its controller on unmount and watches glass options deeply.

## Custom element

`registerGlassElement(name = 'liquid-glass', view?)` from `/element` explicitly registers the light-DOM element. Importing is SSR-safe; registration is a no-op without a browser. Supported attributes: variant, appearance, radius, blur, refraction, interactive, reduced-transparency. Boolean attributes are enabled by presence. Supply `display: block` or your desired layout. Wrap semantic children; the element itself does not replace a button or nav.

## CSS helpers

`.lg-glass` is the material; `.lg-panel` adds padding; `.lg-button` styles native buttons with a 44px minimum target; `.lg-toolbar` lays out direct button children; `.lg-scroll-edge` masks the edges of a scroll viewport. Set actual overflow/height yourself. The mask is visual and must not clip focus indicators or essential text.
