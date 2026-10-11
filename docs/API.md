# API reference

Import `@wpsydev/liquid-glass/material.css` once for material-only pages, or retain `/styles.css` for the complete helper sheet. Core imports have no framework or runtime dependencies. ESM only.

## Loading and narrow imports (0.12)

Root exports remain compatible. Choose `/material` for pure props/radius/option helpers, `/dom` for `attachGlass` and `glass`, `/capabilities` for `getGlassCapabilities`, and `/motion`, `/indicator`, `/scroll-edge`, `/overlay`, `/micro-motion`, `/optics` for the named helper. React/Vue/custom-element and `/scene` paths remain available. `/material` also exports `getResolvedGlassProps`, which accepts a fully resolved configuration.

Component stylesheets `/material.css`, `/motion.css`, `/indicator.css`, `/scroll-edge.css` contain no imports. `/styles.css` includes all four with its previous rules/order. Add each needed helper sheet once; do not duplicate the aggregate and components.

`attachGlassSceneLazy(canvas, sceneOptions?, visibilityOptions?)` is exported only from `/lazy`. It observes a mounted canvas with `{ root: null, rootMargin: '200px' }` defaults and dynamically imports `/scene` when near the viewport or explicitly requested, waiting while the document is hidden. No IntersectionObserver means a visible-document fallback. It returns `ready: Promise<GlassSceneController | null>`, `load()` (same promise), `update(options?)`, `destroy()` and readonly `scene`, `state`, `error`. States: waiting/loading/ready/failed/destroyed. Readiness returns an unsupported controller for a GPU fallback, or null on failed import/initialization or pre-ready destruction. Updates replace pending/mounted options. Destroy prevents a pending import from mounting, releases observation/listeners and destroys a mounted scene once. Already resolved readiness retains its now-destroyed controller; imports already started cannot be cancelled. Types: `GlassSceneController`, `LazyGlassSceneOptions`, `LazyGlassSceneState`. [Loading guide](LOADING.md) covers recipes, failure handling and measured payload boundaries.

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
| `corner` | `round` | `round` or optional `continuous` superellipse; rounded fallback when unsupported; SVG rendering stays round |
| `blur` | regular `18`, clear `6` | CSS pixels, clamped 0–64 |
| `saturation` | `1.35` | Scalar, clamped 0–3 |
| `refraction` | `0` | SVG displacement pixels, clamped 0–60; experimental Chromium path |
| `interactive` | `false` | Pointer light + touch/keyboard press illumination; lg-button press scale; reduced motion disables deformation |
| `reducedTransparency` | `false` | Force a solid readable material |

Nonfinite numeric values use defaults. Invalid variants/appearances use defaults. Large CSS radii are naturally constrained by the browser; lens map corners are constrained to half the surface dimensions.

## attachGlass(element, options?) / glass(element, options?)

Enhances an existing `HTMLElement`; call after mount. Returns `{ update(options), destroy() }`. `update` replaces the complete configuration, so unspecified fields return to defaults. Use one controller per element. Destroy before reattaching. Destroy is idempotent and restores library-owned properties and attributes present before attachment, including priorities. External edits to those same owned fields during attachment are not preserved on destroy.

The controller owns `.lg-glass`, `data-lg-*` attributes, and `--lg-radius`, `--lg-blur`, `--lg-saturation`, `--lg-filter`, `--lg-pointer-*`, `--lg-opacity`, `--lg-tint`, and `--lg-tint-opacity` variables. Interactive native `.lg-button` elements use CSS `scale`; put custom transforms/scale on a wrapper. Put layout and custom animations on a wrapper. Do not assign your own `::before` on the glass element: the material uses it to keep effects behind foreground content.

Static CSS controllers allocate no input listeners, resize observers or animation frames. Interactive input is installed only while `interactive` is enabled. Four browser preference subscriptions and capability hints are shared per Window while controllers are mounted; final cleanup releases them. Eligible experimental refraction alone allocates resize/frame resources. Unchanged owned styles/attributes are not rewritten; updates still replace options and repair modified owned fields.

SVG maps regenerate on resize, options changes, and relevant preference changes. Resize work is coalesced into a frame; generated maps are capped at 256 pixels on their longest side. No continuous animation loop. A resize without ResizeObserver is not automatically tracked; call update in older environments. Unsupported refraction uses CSS; no blur uses a solid fallback.

## getGlassProps(options?)

A pure SSR-safe function returning `{ className, style, 'data-lg-variant', 'data-lg-appearance', 'data-lg-backdrop', 'data-lg-solid', 'data-lg-interactive', 'data-lg-corner' }`. `style` contains CSS variables. React can spread it directly; other frameworks can rename className to class. It does not install event listeners or refraction filters.

## getGlassCapabilities(view?)

Returns `{ backdrop, experimentalRefraction, continuousCorners }`. `continuousCorners` reports syntax support for the independent `superellipse(1.5)` shape; it is not an Apple geometry or visual guarantee. The first reports syntax support for blur; the second is a **conservative Chromium hint** plus URL filter syntax support. CSS parsing cannot prove the compositor actually rendered a lens. Do not present this as a visual or performance guarantee. `data-lg-renderer` reports the path requested by the controller: `solid`, `css`, or `svg-experimental`.

## getGlassInnerRadius(outerRadius, inset)

Pure SSR-safe helper for coordinated corners: `max(0, outerRadius − inset)`, with inputs clamped 0–999. The total inset includes borders. This is exact for uniformly inset circular curves before CSS radius normalization; for continuous corners it is a visual coordination token. See [mobile design](MOBILE.md) for the input fallback contract and recipes.

## createDisplacementMap(width, height, radius)

Pure optical helper returning RGBA `Uint8ClampedArray`. Width and height must be integers from 1–512; invalid dimensions throw. Red and green carry rounded-rectangle surface normals, the center is approximately neutral (128/255), blue is neutral, alpha is opaque. The map is a stylized height field rather than a physical optical simulation.

## React

`GlassSurface` accepts `as` (`div`, `section`, `nav`, `aside`, `header`, `footer`), `glass`, native HTML attributes, `children`, and a forwarded element ref. Default tag is div. `GlassButton` accepts `glass`, native button attributes, and a forwarded button ref; default type is button. Both preserve callbacks, disabled states, and user classes. Set material variables through `glass`; avoid conflicting inline overrides of fields the controller owns.

No headless dialog/menu state is included. Compose with native dialog/popover or your app's existing headless library. The React entry has a `use client` directive for Next.js.

## Vue

`GlassSurface` accepts `as` (default div), `glass`, forwarded attributes/classes/styles, and the default slot. It exposes `{ element }`. Use semantic tags and native event handlers. It destroys its controller on unmount and watches glass options deeply. Both React and Vue rebind enhancement when `as` replaces the element; refs follow the current element.

## Custom element

`registerGlassElement(name = 'liquid-glass', view?)` from `/element` explicitly registers the light-DOM element. Importing is SSR-safe; registration is a no-op without a browser. Supported attributes: variant, appearance, backdrop, radius, corner, blur, saturation, opacity, tint, tint-opacity, refraction, interactive, reduced-transparency. Boolean attributes are enabled by presence. Supply `display: block` or your desired layout. Wrap semantic children; the element itself does not replace a button or nav.

## CSS helpers

`.lg-glass` is the material; `.lg-panel` adds padding; `.lg-button` styles native buttons with a 44px minimum target; `.lg-toolbar` wraps direct button children and long labels to keep them within the container; The old `.lg-scroll-edge` helper is now unmasked to preserve essential content and focus. Use the dedicated overlay helper below.

Opt-in `.lg-touch-target` supplies a 44×44 CSS-pixel minimum without changing semantics. `.lg-mobile-viewport` supplies `min-height: 100vh` with a supported `100dvh` enhancement. `.lg-safe-area` sets four paddings to ordinary spacing plus `env(safe-area-inset-*)`: `--lg-safe-gap` defaults to 16px, with `--lg-safe-top/right/bottom/left` overrides. Use it on a layout wrapper; avoid overriding these paddings accidentally. It does not measure software keyboards.

`corner: continuous` feature-gates the same profile on the material and its decoration. Existing circular round geometry remains the default. The SVG experimental renderer forces round geometry; owned-scene lenses require round surfaces.

## Material tuning and input feedback

`opacity` multiplies the variant's base fill alpha (regular .72, clear .24). It is an application-controlled density preference, not Apple's exact ultraclear-to-tinted compositor. `tintOpacity` colors a separate layer; neither option changes foreground opacity. Hex-only tint validation is SSR-safe. Tint uses CSS color-mix on supporting browsers; the base fill remains if tint mixing is unavailable. Opaque fallback ignores these transparency effects.

`appearance: 'auto', backdrop: 'light'` chooses light fill and dark ink; `backdrop: 'dark'` chooses dark fill and light ink. Explicit appearance wins. With backdrop auto the OS scheme applies; clear's legacy auto light-theme path uses dark fill and bright ink for controlled media. A backdrop hint is information your app supplies, not automatic reading of arbitrary DOM pixels. Test contrast on real images, including opacity zero; no tone or tint option guarantees contrast.

Interactive controllers retain the first primary pointer and ignore unrelated pointer releases or secondary fingers. A descendant semantic control owns its tap, so containing material/motion surfaces do not also press. Hover decoration is restricted to hover-capable fine pointers. Controllers preserve scrolling and zoom gestures without pointer capture or event prevention. They localize press lighting on touch as well as pointer input, and reset press state on pointer release/cancel, capture loss, focus loss, window blur, update and destruction. Space/Enter feedback on native buttons/links and role=button surfaces does not implement their keyboard behavior. Keep native controls; the controller never prevents native clicks. Native disabled and aria-disabled surfaces suppress feedback. Reduced motion suppresses press lighting/deformation; CSS-only interactive lg-button users get :active scaling with the same preference override.

## attachGlassScrollEdge(scrollport, edgeLayer, options?)

An optional DOM controller for a separate, aria-hidden, noninteractive decoration layer. Place the layer over a positioned wrapper; keep actual toolbar controls above it. It never masks the scrollport or its focus rings. Options: `edge: 'top' | 'bottom' | 'both'` (both), `style: 'soft' | 'hard'` (soft), `size` (32 CSS pixels, clamped 0–160), `reducedTransparency` (false; thin opaque separator). Soft uses a gradient; hard uses a uniform backing. Active edges reflect remaining vertical scroll, with a small boundary tolerance.

Returns `{ update(options), destroy() }`; update replaces options. Scroll, resize and content changes refresh states; observer work is coalesced. CSS `--lg-scroll-edge-fill` / `--lg-scroll-edge-solid-fill` / `--lg-scroll-edge-line` can customize its scrim (see stylesheet). Explicit solid mode and accessibility preferences replace blur with a thin opaque separator; print removes it. Edges hide while scroll content has keyboard focus so decorations cannot obscure its focused control. See [behavior demo](https://wpsydev.github.io/liquid-glass-kit/behavior/) for layer placement. These are web scrims, not automatic toolbar minimization or native adaptive dimming.

## attachGlassIndicator(container, backing, options?)

One decorative backing moves between measured semantic targets. `backing` must be a direct child of an untransformed `container`; targets must use the same CSS coordinate scale; enhance it separately with `attachGlass` to choose its material. Options: `duration` (280 ms, 0–1000; ease mode), `radius` (24 px, 0–999), `motion: 'ease' | 'spring'` (ease), spring `stiffness` (260, 20–1000), `damping` (22, 1–100), `mass` (1, .1–10), and `reducedMotion` (false). Returns `{ moveTo(targetOrNull), update(options), destroy() }`. The host owns selection, routing, events and ARIA; buttons and focus remain in place.

First placement is immediate, later selections transition left/top/width/height; repeated moves can interrupt transitions. Null hides the backing; a selected target that later disconnects hides on refresh. Calling moveTo with an already detached outside target throws. Invalid outside targets or the backing/its descendants throw RangeError. Geometry accounts for container border and scroll. Resize/scroll snap settled indicators to layout; an active spring retargets the new bounds while retaining velocity. Reduced-motion changes remove animation. A static container temporarily becomes positioned, restored on destroy along with owned backing styles/attributes. Attach material first and indicator second; destroy the indicator before the material because both own --lg-radius.

This is a matched-bounds visual approximation. Spring mode preserves velocity when retargeted. It does not merge arbitrary shapes or share optical sampling across surfaces or implement Apple's GlassEffectContainer. Do not animate layout of the container/targets concurrently without refreshing moveTo after layout settles.

## attachGlassMotion(element, options?)

Opt-in spring feedback and appearance transitions on an existing semantic surface. Core exports `attachGlassMotion` and `GlassMotionOptions`. No DOM globals are accessed during import; attach after mount.

| Option | Default | Bounds / behavior |
| --- | --- | --- |
| stiffness | 260 | 20–1000 |
| damping | 22 | 1–100 |
| mass | 1 | .1–10 |
| pressScale | .94 | .85–1 |
| stretch | .035 | 0–.08, restrained directional scale deformation |
| reducedMotion | false | App preference combines with system reduced motion |

Nonfinite numeric inputs use defaults. The controller returns `press(point?)`, `release()`, `enter()`, `exit()`, `update(options)`, `destroy()`. A press point is `{x,y}` in local CSS pixels. Pointer/touch and native-button keyboard feedback are installed automatically; disabled controls suppress press. No clicks/keyboard events are prevented. The host owns keyboard behavior for custom roles.

`enter()` and `exit()` return `Promise<boolean>`: true after completion, false when superseded, disconnected or destroyed. They alter presentation only: scale and whole-surface opacity. They never toggle hidden/inert, manage popover visibility, remove elements or move focus. Your app must show a surface before enter, and hide/remove it after a successful exit. Reset your app's state when an animation is interrupted; a false result is not permission to remove a newly reopened surface. Native Escape/outside dismissal can remain immediate.

Springs use an analytic damped model and elapsed frame timestamps. Repeated targets preserve velocity; work stops at rest. A six-second upper settling bound prevents deliberately low-damping settings from running indefinitely. CSS geometry springs are a web approximation, not native optical union. Existing ease indicator behavior remains the default.

Explicit/system reduced motion snaps to the target immediately. A live preference change stops deformation and completes the current presentation target. Motion consumes `.lg-motion`, `data-lg-motion`, `data-lg-motion-pressed`, individual inline `scale`, presentation `opacity`, `transition`, and `--lg-motion-*` variables; destroy restores original fields/priorities. Attach material first, motion second; destroy motion before material. Reserve these fields or use a wrapper for other animations. No foreground blur/filter is installed.

React `GlassButton`/`GlassSurface` and Vue `GlassSurface` accept optional `motion: GlassMotionOptions`. Providing an object enables motion; omitting it disables it. Server markup stays visible/static, and mount does not automatically replay enter. To coordinate popover lifecycle, use the core controller on a ref within the application's existing effect lifecycle.

Custom elements support `motion` by presence and `motion-stiffness`, `motion-damping`, `motion-mass`, `motion-press-scale`, `motion-stretch`, `reduced-motion`. The last is an explicit app preference. The element remains a light-DOM material wrapper, not a replacement for a semantic control.

## attachGlassOverlay(anchor, overlay, options?)

Optional geometry for a same-document fixed/top-layer native or headless surface. Returns `{ refresh(), update(options), destroy() }`; visibility, focus, roles and dismissal stay with the host. Options: `placement: 'top' | 'bottom'` (bottom), `align: 'start' | 'center' | 'end'` (start, direction-aware), `gap` (8px, 0–128), `padding` (16px, 0–128), `matchWidth` (false). Nonfinite numbers use defaults; updates replace options.

Flips vertically when needed and the opposite side has more room, shifts horizontally and constrains maximum width/height with internal overflow. Native fit-content dimensions are measured from a neutral inset; unscaled layout dimensions avoid chasing spring scale. Follows resize, nested scroll, native toggle and optional VisualViewport events, coalesced into one pending frame. Closed/disconnected surfaces no-op. Refresh after showing; beforetoggle opening is still hidden.

Actual side is `data-lg-overlay-placement`; `--lg-overlay-origin` and inline `transform-origin` point an entry spring toward the trigger. Owns fixed positioning/insets, margins, sizing/overflow and native anchor-rule overrides; restores authored declarations/priorities on cleanup. Does not own scale/opacity or semantic state. Do not combine positioning engines on one surface. Horizontal writing modes, axis-aligned anchors and untransformed fixed coordinates only; no virtual anchors, arbitrary clipping-boundary solver or phone keyboard certification. Safe insets and offscreen-anchor policy belong to the app. [OVERLAYS.md](OVERLAYS.md) contains native markup and framework lifecycle recipes.

## attachGlassTransition(element, options?)

Optional timed microinteractions; core exports `attachGlassTransition` and `GlassTransitionOptions`. Defaults: direction `up` (`up/down/left/right`, physical movement), distance 12px (0–32), duration 180ms (0–600), reducedMotion false combined with the live system preference. Nonfinite numbers use defaults. Updates replace options for subsequent effects; enabling reduced motion or duration 0 also settles an active effect.

Returns `{ enter(), exit(), feedback('confirm' | 'reject'), cancel(), update(options), destroy() }`. Effect promises resolve a completion boolean. Superseding/canceling/disconnecting/destroying resolves false; missing Web Animations, duration 0 and reduced motion settle the intended state immediately. Enter restores authored fields after completion; exit retains its translated opacity-zero endpoint until enter/cancel/destroy. Confirmation is a short scale cue; rejection is a small horizontal nudge. Feedback preserves the previous stable presentation and skips disabled surfaces.

Owns individual translate/scale/opacity on a dedicated layer. Samples current visual state when interrupted; these timed curves do not promise spring velocity continuity. Restores owned values/priorities and removes pending work/listeners on cleanup. The host owns hidden/inert, focus, roles, dismissal, operations and live announcements. Do not combine motion engines or CSS transitions on the same owned fields. [MICRO_MOTION.md](MICRO_MOTION.md) supplies lifecycle and integration guidance.

## Experimental owned-scene optics

`attachGlassScene` is available from `@wpsydev/liquid-glass/scene`, separate from the CSS core. It measures up to eight HTML surfaces over a canvas and refracts its own procedural wallpaper. Optional `field` submits up to 20,000 decorative GPU instances with stream/wave/orbit motion, shared time and a deterministic seed; these are graphics, not semantic widgets. Optional `fusion` smoothly joins up to eight circular `GlassSceneDrop` shapes in canvas-local CSS pixels. Fusion defaults: smoothness 32 (0–120), refraction 36 (0–100), dispersion 0 (0–8). `backdrop` selects `ribbons` (default) or `studio`.

Returns readonly `supported` and `stats` getters, `update(options?)`, `setDrops(drops)`, `render(timeSeconds?)` and `destroy()`. Updates replace all configuration. `setDrops` copies/stages geometry without observer churn; fusion must already be enabled, and paused scenes require an explicit `render()` to submit it. `stats.fusionCount` describes the last submitted fusion draw; other counters describe instance submissions and backing dimensions, not frame rate. `maxPixels` is an explicit resolution tradeoff. Import safely during SSR; attach after mount. The scene does not capture arbitrary DOM or external imagery, merge semantic HTML controls or reproduce Apple's optical grouping. See [SCENE.md](SCENE.md) for exact bounds, fallback, preferences, coordinates and cleanup.

Caustics (0.13) is an opt-in `/scene` or `/lazy` option, independent of material adapters. Enable `caustics: { intensity: .16, depth: 100, ripple: .5 }` with measured HTML surfaces and an owned canvas; retain semantic HTML/opaque CSS fallback and destroy in the host cleanup lifecycle. `/scene` exports `GlassSceneCausticsOptions` and `GlassSceneCausticEmitter`. `backdrop: "mineral"` adds the dark-teal receiver. Read [CAUSTICS.md](CAUSTICS.md) for all bounds, source geometry, performance tradeoffs and researched limits.


Workbench (0.14): optional `/tabs` exports `attachGlassTabs` and `GlassTabsOptions`; `/workbench.css` adds scoped `.lg-workbench`, `.lg-code`, `.lg-tag`, `.lg-field` and native popover reveal styles. Defaults: activation:'automatic',orientation:'horizontal',loop:true. Author a labelled role=tablist, unique tab ids and separate unique aria-controls panels; nonfocusable-content panels need tabindex=0. Methods select(id,focus=false):boolean, selectedId:string|null, update(replacementOptions), destroy(). Arrow/Home/End navigation skips disabled tabs; manual activation waits for Enter/Space/click; horizontal RTL reverses arrows. Bubbling lg-tab-change detail:{id,previousId}; no event on unchanged selection. Static membership; update after disabling/enabling; destroy and reattach after membership changes. Cleanup restores owned attributes. No layout measurements or animation loop in this controller. Pair existing /indicator, /overlay, /motion and /micro-motion explicitly; no React/Vue prop added. CodeMirror/lint/terminal execution belong to the host app, not core. Read docs/WORKBENCH.md for integration and the demo's bounded in-memory commands.
