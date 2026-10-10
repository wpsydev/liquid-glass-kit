# Changelog

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
