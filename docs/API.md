# API reference

Import `@wpsydev/liquid-glass/styles.css` once. Core imports have no framework or runtime dependencies. ESM only.

## GlassOptions

| Option | Default | Meaning |
| --- | --- | --- |
| `variant` | `regular` | `regular` or `clear`; clear requires a controlled media backdrop |
| `appearance` | `auto` | `auto` follows color scheme; `light` and `dark` are explicit |
| `backdrop` | `auto` | App-supplied `light` / `dark` tone, used when appearance is auto; no pixel sampling |
| `opacity` | `1` | Fill strength multiplier 0–1; does not reduce blur or override opaque accessibility |
| `tint` | `#ffffff` | Semantic hue, #RGB or #RRGGBB only |
| `tintOpacity` | `0` | Separate semantic tint layer alpha, 0–1 |
| `radius` | `24` | CSS pixels, clamped 0–999 |
| `blur` | regular `18`, clear `6` | CSS pixels, clamped 0–64 |
| `saturation` | `1.35` | Scalar, clamped 0–3 |
| `refraction` | `0` | SVG displacement pixels, clamped 0–60; experimental Chromium path |
| `interactive` | `false` | Pointer light + touch/keyboard press illumination; lg-button press scale; reduced motion disables deformation |
| `reducedTransparency` | `false` | Force a solid readable material |

Nonfinite numeric values use defaults. Invalid variants/appearances use defaults. Large CSS radii are naturally constrained by the browser; lens map corners are constrained to half the surface dimensions.

## attachGlass(element, options?) / glass(element, options?)

Enhances an existing `HTMLElement`; call after mount. Returns `{ update(options), destroy() }`. `update` replaces the complete configuration, so unspecified fields return to defaults. Use one controller per element. Destroy before reattaching. Destroy is idempotent and restores library-owned properties and attributes present before attachment, including priorities. External edits to those same owned fields during attachment are not preserved on destroy.

The controller owns `.lg-glass`, `data-lg-*` attributes, and `--lg-radius`, `--lg-blur`, `--lg-saturation`, `--lg-filter`, `--lg-pointer-*`, `--lg-opacity`, `--lg-tint`, and `--lg-tint-opacity` variables. Interactive native `.lg-button` elements use CSS `scale`; put custom transforms/scale on a wrapper. Put layout and custom animations on a wrapper. Do not assign your own `::before` on the glass element: the material uses it to keep effects behind foreground content.

SVG maps regenerate on resize, options changes, and relevant preference changes. Resize work is coalesced into a frame; generated maps are capped at 256 pixels on their longest side. No continuous animation loop. A resize without ResizeObserver is not automatically tracked; call update in older environments. Unsupported refraction uses CSS; no blur uses a solid fallback.

## getGlassProps(options?)

A pure SSR-safe function returning `{ className, style, 'data-lg-variant', 'data-lg-appearance', 'data-lg-backdrop', 'data-lg-solid', 'data-lg-interactive' }`. `style` contains CSS variables. React can spread it directly; other frameworks can rename className to class. It does not install event listeners or refraction filters.

## getGlassCapabilities(view?)

Returns `{ backdrop, experimentalRefraction }`. The first reports syntax support for blur; the second is a **conservative Chromium hint** plus URL filter syntax support. CSS parsing cannot prove the compositor actually rendered a lens. Do not present this as a visual or performance guarantee. `data-lg-renderer` reports the path requested by the controller: `solid`, `css`, or `svg-experimental`.

## createDisplacementMap(width, height, radius)

Pure optical helper returning RGBA `Uint8ClampedArray`. Width and height must be integers from 1–512; invalid dimensions throw. Red and green carry rounded-rectangle surface normals, the center is approximately neutral (128/255), blue is neutral, alpha is opaque. The map is a stylized height field rather than a physical optical simulation.

## React

`GlassSurface` accepts `as` (`div`, `section`, `nav`, `aside`, `header`, `footer`), `glass`, native HTML attributes, `children`, and a forwarded element ref. Default tag is div. `GlassButton` accepts `glass`, native button attributes, and a forwarded button ref; default type is button. Both preserve callbacks, disabled states, and user classes. Set material variables through `glass`; avoid conflicting inline overrides of fields the controller owns.

No headless dialog/menu state is included. Compose with native dialog/popover or your app's existing headless library. The React entry has a `use client` directive for Next.js.

## Vue

`GlassSurface` accepts `as` (default div), `glass`, forwarded attributes/classes/styles, and the default slot. It exposes `{ element }`. Use semantic tags and native event handlers. It destroys its controller on unmount and watches glass options deeply. Both React and Vue rebind enhancement when `as` replaces the element; refs follow the current element.

## Custom element

`registerGlassElement(name = 'liquid-glass', view?)` from `/element` explicitly registers the light-DOM element. Importing is SSR-safe; registration is a no-op without a browser. Supported attributes: variant, appearance, backdrop, radius, blur, saturation, opacity, tint, tint-opacity, refraction, interactive, reduced-transparency. Boolean attributes are enabled by presence. Supply `display: block` or your desired layout. Wrap semantic children; the element itself does not replace a button or nav.

## CSS helpers

`.lg-glass` is the material; `.lg-panel` adds padding; `.lg-button` styles native buttons with a 44px minimum target; `.lg-toolbar` lays out direct button children; The old `.lg-scroll-edge` helper is now unmasked to preserve essential content and focus. Use the dedicated overlay helper below.

## Material tuning and input feedback

`opacity` multiplies the variant's base fill alpha (regular .72, clear .24). It is an application-controlled density preference, not Apple's exact ultraclear-to-tinted compositor. `tintOpacity` colors a separate layer; neither option changes foreground opacity. Hex-only tint validation is SSR-safe. Tint uses CSS color-mix on supporting browsers; the base fill remains if tint mixing is unavailable. Opaque fallback ignores these transparency effects.

`appearance: 'auto', backdrop: 'light'` chooses light fill and dark ink; `backdrop: 'dark'` chooses dark fill and light ink. Explicit appearance wins. With backdrop auto the OS scheme applies; clear's legacy auto light-theme path uses dark fill and bright ink for controlled media. A backdrop hint is information your app supplies, not automatic reading of arbitrary DOM pixels. Test contrast on real images, including opacity zero; no tone or tint option guarantees contrast.

Interactive controllers localize press lighting on touch as well as pointer input, and reset press state on pointer release/cancel, capture loss, focus loss, window blur, update and destruction. Space/Enter feedback on native buttons/links and role=button surfaces does not implement their keyboard behavior. Keep native controls; the controller never prevents native clicks. Native disabled and aria-disabled surfaces suppress feedback. Reduced motion suppresses press lighting/deformation; CSS-only interactive lg-button users get :active scaling with the same preference override.

## attachGlassScrollEdge(scrollport, edgeLayer, options?)

An optional DOM controller for a separate, aria-hidden, noninteractive decoration layer. Place the layer over a positioned wrapper; keep actual toolbar controls above it. It never masks the scrollport or its focus rings. Options: `edge: 'top' | 'bottom' | 'both'` (both), `style: 'soft' | 'hard'` (soft), `size` (32 CSS pixels, clamped 0–160), `reducedTransparency` (false; thin opaque separator). Soft uses a gradient; hard uses a uniform backing. Active edges reflect remaining vertical scroll, with a small boundary tolerance.

Returns `{ update(options), destroy() }`; update replaces options. Scroll, resize and content changes refresh states; observer work is coalesced. CSS `--lg-scroll-edge-fill` / `--lg-scroll-edge-solid-fill` / `--lg-scroll-edge-line` can customize its scrim (see stylesheet). Explicit solid mode and accessibility preferences replace blur with a thin opaque separator; print removes it. Edges hide while scroll content has keyboard focus so decorations cannot obscure its focused control. See [behavior demo](https://wpsydev.github.io/liquid-glass-kit/behavior/) for layer placement. These are web scrims, not automatic toolbar minimization or native adaptive dimming.

## attachGlassIndicator(container, backing, options?)

One decorative backing moves between measured semantic targets. `backing` must be a direct child of an untransformed `container`; targets must use the same CSS coordinate scale; enhance it separately with `attachGlass` to choose its material. Options: `duration` (280 ms, 0–1000), `radius` (24 px, 0–999). Returns `{ moveTo(targetOrNull), update(options), destroy() }`. The host owns selection, routing, events and ARIA; buttons and focus remain in place.

First placement is immediate, later selections transition left/top/width/height; repeated moves can interrupt transitions. Null hides the backing; a selected target that later disconnects hides on refresh. Calling moveTo with an already detached outside target throws. Invalid outside targets or the backing/its descendants throw RangeError. Geometry accounts for container border and scroll. Resize/scroll realign immediately. Reduced-motion changes remove animation. A static container temporarily becomes positioned, restored on destroy along with owned backing styles/attributes. Attach material first and indicator second; destroy the indicator before the material because both own --lg-radius.

This is a matched-bounds visual approximation. It does not merge arbitrary shapes, provide spring physics, share optical sampling across surfaces or implement Apple's GlassEffectContainer. Do not animate layout of the container/targets concurrently without refreshing moveTo after layout settles.
