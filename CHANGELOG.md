# Changelog

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
