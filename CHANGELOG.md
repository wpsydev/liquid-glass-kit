# Changelog

## 0.13.0-preview.1 — Caustic light studies

- Add optional WebGL2 `caustics`: single-interface refracted mesh projection onto an owned planar receiver, up to eight sources, shared static UV/index buffers and one extra instanced draw.
- Add bounded intensity/IOR/depth/ripple/speed/resolution/light/renderScale options, copied canvas-local emitters, caustic submission counters and the `mineral` backdrop.
- Filter a lower-resolution RGBA8 light receiver inside the existing wallpaper pass; keep semantic HTML sharp. Skip caustics for opacity/contrast/forced-color preferences; preserve static motion reduction, context restoration and full cleanup.
- Add six interactive light studies, responsive/quiet/fallback validation, an original12-second film and soundtrack, recent research with implementation boundaries, and raw GPU/CPU/resource experiments.
- Preserve CSS defaults, runtime-dependency-free SSR-safe core, narrow imports, lazy startup and optional React/Vue peers. Caustics remains experimental planar optics, not full transport or Apple parity.


## 0.12.0-preview.1 — Material first

- Added narrow `/material`, `/dom`, `/capabilities`, `/motion`, `/indicator`, `/scroll-edge`, `/overlay`, `/micro-motion` and `/optics` entrypoints. Existing root exports and optional adapters remain compatible. Adapters now import their actual dependencies instead of the complete barrel.
- Added `/material.css` and component helper sheets with no CSS import chains. Complete `/styles.css` retains byte-identical 0.11 rules and order. Material-only CSS is 6,916 raw / 2,029 gzip bytes, versus 10,921 / 2,778 for the complete sheet.
- Added SSR-safe `/lazy`: `attachGlassSceneLazy` defers the scene module/GPU initialization until a canvas nears the viewport or is explicitly requested, waits while hidden, supports fallback, option replacement and cancellation-safe teardown.
- Distributed ESM uses formatting-only Oxc minification; exports, function names, module boundaries, shader strings and React's client directive are retained. No core runtime dependencies added. React library graph shrinks from 60,276 to 22,978 raw bytes, 19,624 to 8,426 summed per-file gzip bytes (framework excluded).
- Added the working loading study, payload audit and packaged-module checks. Four representative already tree-shaken bundles are byte-identical before/after. These are payload and deferral improvements, not measured LCP, INP or universal page-load-time gains.

Migration: optional narrow imports and component styles; no changes required to existing root/complete-sheet integrations. When using `/material.css`, add the corresponding sheet for spring motion, indicators or scroll edges. Mount one lazy loader per canvas and destroy it on unmount; a pending import cannot be aborted but will not mount after destruction. Keep HTML/CSS fallback and intrinsic canvas dimensions.

## 0.11.0-preview.1 — Soft Matter

- Added experimental owned-scene `fusion`: up to eight circular glass droplets form an analytic smooth union with a shared boundary normal, edge refraction, specular highlights and optional color dispersion. This applies to the renderer's procedural background, not arbitrary DOM or Apple's native glass groups.
- Added `GlassSceneDrop`, `GlassSceneFusionOptions`, `backdrop: 'studio'`, readonly `stats.fusionCount` and `setDrops(drops)`. Geometry is copied into preallocated storage without recreating ResizeObserver subscriptions; paused scenes submit staged changes through explicit `render()`. The ordinary ribbons backdrop remains the default.
- Fusion draws one bounded pass before existing HTML lenses and decorative fields. Fusion-only scenes use three scene draws including wallpaper and presentation. Draw counts describe submissions, not speed or frame-rate guarantees.
- Added the Soft Matter gallery with host-owned merge/orbit/split choreography, semantic controls and static accessibility/fallback states. Fusion measurement methodology and native-browser evidence are recorded separately in docs/FUSION.md and docs/VALIDATION.md.

Migration: additive `/scene` API; portable CSS, existing material options and optional React/Vue peers remain unchanged. `update` replaces configuration, including fusion. `setDrops` changes geometry only while fusion is enabled; it does not move HTML controls, supply hit testing or implement physical-fluid simulation. Preserve foreground semantics and an unsupported/context-loss fallback.

## 0.10.0-preview.1 — Glass in full flow

- Reworked optional `/scene` rendering: shared full-resolution wallpaper texture, trigonometric phase reuse, and bounded ordered instanced HTML lenses instead of an eight-lens loop across every pixel. Existing lens options and CSS-first controls remain.
- Added decorative GPU fields with stream/wave/orbit motion, deterministic seed, variable sizes and directional flow; up to 20,000 submitted instances, without per-particle DOM or transform uploads. Added readonly submission stats and explicit optional `maxPixels` resolution budgeting.
- Fixed native context restoration by clearing lost GPU handles before rebuilding. `speed: 0` freezes every field motion component. Hidden, paused and reduced-motion scenes retain static redraw and cleanup behavior.
- Optimized SVG displacement generation while retaining released bitmap bytes; unchanged geometry retains the filter/encoded map and strength changes update only its scale.
- Native Chrome 152 / Apple M1 Pro, equal 1280×800 backing resolution: eight-lens GPU median 1.5827 → 0.8455 ms (46.6% less), moving lenses 1.5800 → 0.8552 ms (45.9% less), five paired runs each. Eight-map CPU generation 16.8 → 4.1 ms (75.6% less), 31 pairs. These are scoped GPU/generation measurements, not whole-app or phone FPS gains. Raw samples and unsuccessful iterations are retained.
- Added the 3,000-instance flow studio and twelve-second recorded demonstration with an original synthesized score.

Migration: additive field/statistics/budget options; core imports, optional React/Vue adapters and replacement-style updates remain. Cached RGBA8 sampling, bounded shadows and ordered framebuffer blending introduce small visual differences, including bright overlapping rims; pixel identity is not promised. Keep semantic input in HTML and retain CSS fallback. See docs/SCENE.md and docs/RENDERING.md.

## 0.9.0-preview.1 — Less idle work

- Static material controllers allocate no input listeners, resize observers or RAFs. Four live media listeners and capability hints are shared per Window; optional interaction and refraction resources follow option/accessibility changes.
- Updates normalize material options once and skip unchanged owned fields. React, Vue and custom elements share a lifecycle that avoids duplicate initial and equivalent updates. Semantic press ownership, numeric bounds and reversible state/listener cleanup are reused across helpers.
- Scroll edges retain their observed children during attribute/text changes, refresh membership only when direct children change, and skip unchanged decoration writes.
- Clean package builds omit maps pointing at unshipped sources. The README begins with CSS-only usage; APIs/defaults remain compatible.
- Reproducible resource/source/bundle audit and native Chromium measurements: 100 static controllers mount in median 1.70 → 0.90 ms; complete synchronous lifecycle 3.70 → 2.20 ms across 31 paired runs. Library source 1,567 → 1,561 nonblank lines. Consumer JS bundles grew slightly; these are controller controller timing results, not FPS, phone, GPU or whole-app gains. See docs/PERFORMANCE.md for raw samples and limits.

Migration: existing imports and replacement-style updates remain unchanged. Source/declaration maps are no longer shipped; source remains in the repository. Optional adapters/scene keep their entrypoints; reduced preferences and native semantic behavior remain intact.

## 0.8.0-preview.1 — Fast microinteractions

- Added optional `attachGlassTransition` and `GlassTransitionOptions`: up/down/left/right timed entry and exit, restrained confirmation and error feedback, completion booleans and explicit cancellation.
- Native Web Animations run one bounded effect per controller; interruptions supersede old promises, live reduced motion settles the intended state, and cleanup restores owned styles/priorities. No runtime dependencies or semantic event handlers were added.
- Added a six-part one-screen studio with working native controls and a motion-toolbox research guide using primary documentation and dated adoption snapshots.

Migration: additive core API. Existing springs and adapter defaults remain compatible. Reserve individual translate/scale/opacity on a dedicated visual layer; use separate wrappers for another motion engine. The host still owns visibility, focus, dismissal, validation and announcements. Timed easing is not a velocity-preserving spring.

## 0.7.0-preview.1 — Anchored overlays

- Added dependency-free `attachGlassOverlay` and `GlassOverlayOptions` for same-document fixed/top-layer surfaces: vertical flipping, horizontal shifting, RTL alignment, constrained width/height and optional trigger width.
- Follow anchor/overlay resize, nested scrolling and visible-viewport changes; use unscaled layout dimensions during spring reveals.
- Expose actual placement and trigger-based transform origin while preserving native/headless visibility, focus, roles and dismissal. Restore owned geometry and priorities on cleanup.
- Added native-popover citation, model and source-panel studies plus agent and framework lifecycle recipes.

Migration: additive core exports; material/adapter defaults stay compatible. Horizontal writing modes, axis-aligned anchors and untransformed fixed coordinates only. This is not an arbitrary clipping-boundary solver or a physical-phone keyboard certification.


## 0.6.0-preview.1 — Studio redesign

- Rebuilt the homepage as a focused material workbench: editorial type, warm paper/ink palette, original moving light sculpture, flat parameter rail, useful documentation rows and native dialog.
- Redesigned the mobile listening room with original record artwork, ruled metadata, restrained press springs and functional saved-session feedback.
- Selected the official GitLab Pajamas ecosystem after researching GitLab-hosted alternatives; use pinned MIT GitLab SVG icons as build assets without adding a core runtime dependency.
- Added an agent design contract that asks for real workflows, coherent hierarchy, readable controls and purposeful motion.
- Added a twelve-second recorded redesign showcase with an original 120 BPM score.

Migration: public material APIs and defaults are unchanged. The demo icon dependency is development-only. No Apple rendering parity, upstream component certification or physical-device coverage is implied.

## 0.5.0-preview.1 — Mobile details

- Fixed primary-pointer ownership in material and spring feedback: secondary fingers, unrelated releases and other input modalities cannot clear the originating press. Descendant semantic controls keep their own feedback without deforming a parent surface.
- Added optional `corner: continuous` with a feature-gated independent web superellipse and round fallback, `getGlassInnerRadius`, and a continuous-corner syntax capability hint. React/Vue/custom-element integrations retain the same options. SVG optics remain round.
- Added opt-in 44px touch-target, safe-area padding and dynamic-viewport helpers; restricted hover feedback to hover-capable fine pointers, bounded small toolbar radii, and made toolbar rows/long labels wrap.
- Added a responsive mobile studio with native controls/sheet, spring selection, quiet/solid preferences, agent recipes and primary-source mobile design research.
- Added a 12-second vertical showcase with an original synthesized high-beat soundtrack.

Migration: all new material/layout fields are optional; round corners remain the default. Touch feedback now belongs to the originating pointer or key. Use native controls and application-owned overlay/focus state. Continuous corners are progressive enhancement, not Apple geometry or stable iOS certification. Safe-area and `dvh` helpers do not universally avoid software keyboards.

## 0.4.0-preview.1 — Experimental owned-scene optics

- Added optional `@wpsydev/liquid-glass/scene`: a WebGL2 procedural scene with screen-space sampling, analytic rounded-rectangle normals, neutral center displacement and separate edge highlights.
- Added the interactive neon optics lab and a recorded walkthrough with refraction comparison, draggable lenses, palettes and preference controls.
- Core CSS material remains independent of the optional renderer. This experiment refracts its own procedural canvas, not arbitrary DOM content or external imagery.


## 0.3.0-preview.1 — Motion preview

- Added `attachGlassMotion`: spring press/release, localized directional stretch and visual enter/exit transitions with completion/cancellation promises.
- Added optional velocity-preserving spring mode to `attachGlassIndicator`; existing ease mode remains default.
- Added motion options to React/Vue adapters and opt-in custom element attributes. SSR starts visible without replaying an entrance during hydration.
- Explicit and system reduced motion snap to targets; animation loops stop at rest and teardown restores owned styles.
- Explicit material isolation keeps negative backdrop decoration contained in flex controls.
- Added an animated motion playground, primary Apple spring/transition references and integration recipes.

Migration: existing material and ease indicator integrations continue to work. Motion is opt-in and reserves individual scale, opacity and transition; compose on a wrapper if these already belong to your app. Enter/exit are visual only; the app owns native popover/dialog visibility, focus and dismissal. Springs and bounds movement do not supply optical shape merging.

## 0.2.0-preview.1 — 2026-10-10

- Added independent fill strength (`opacity`), semantic hex tint (`tint`/`tintOpacity`) and application-provided backdrop tone (`backdrop`). Explicit appearance wins; preferences still override transparency.
- Added touch-local press lighting, keyboard feedback and restrained native button deformation with reduced-motion support. No input events are prevented.
- Added `attachGlassIndicator`: one decorative material backing moves between semantic controls. This is measured geometry, not physical shape merging.
- Added `attachGlassScrollEdge`: separate soft/hard decoration tied to remaining scroll, with resize/content observation and restored fields on teardown.
- Fixed React/Vue enhancement and refs when `as` replaces the DOM element. Custom element supports saturation and all new material options.
- Preserved production solid backdrop-filter resets after discovering a CSS minifier prefix regression.
- Fixed solid renderer status under explicit and detected accessibility fallbacks.
- Corrected clear's default blur from 18px to 6px; an explicit blur still wins.
- Removed the always-on `.lg-scroll-edge` content mask. Migrate to the dedicated overlay; content and focus are never masked.
- Published a 38-feature Apple comparison and a behavior lab. Shared optical sampling, physical merging, background sampling, size-dependent scattering and OS integration remain gaps.

Migration: new fields are optional. `update` still replaces configuration. Import the same stylesheet. Clear users needing the old 18px blur should specify it. Use wrapper-controlled transforms around interactive `.lg-button` if custom scale/transform behavior is required. Move legacy edge masks to the separate overlay recipe. Helpers need normal untransformed coordinate layout; targets retain their app-owned behavior and selection state.

## 0.1.0 — Preview

- Portable CSS glass with explicit light/dark/clear appearances and solid fallbacks.
- Typed DOM controller, rounded-rectangle displacement helper, optional experimental Chromium lens.
- React/Vue adapters, Svelte action contract, opt-in light-DOM custom element.
- Reduced preferences, forced-colors/print support, semantic native controls.
- Live material playground, integration/use-case docs, sourced research, agent guides and skill.

Known boundaries: no universal refraction parity, automatic background contrast inversion, GPU renderer, or native mobile material. See compatibility and validation docs.
