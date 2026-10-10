# Changelog

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
- Published a 37-feature Apple comparison and a behavior lab. Shared optical sampling, physical merging, background sampling, size-dependent scattering and OS integration remain gaps.

Migration: new fields are optional. `update` still replaces configuration. Import the same stylesheet. Clear users needing the old 18px blur should specify it. Use wrapper-controlled transforms around interactive `.lg-button` if custom scale/transform behavior is required. Move legacy edge masks to the separate overlay recipe. Helpers need normal untransformed coordinate layout; targets retain their app-owned behavior and selection state.

## 0.1.0 — Preview

- Portable CSS glass with explicit light/dark/clear appearances and solid fallbacks.
- Typed DOM controller, rounded-rectangle displacement helper, optional experimental Chromium lens.
- React/Vue adapters, Svelte action contract, opt-in light-DOM custom element.
- Reduced preferences, forced-colors/print support, semantic native controls.
- Live material playground, integration/use-case docs, sourced research, agent guides and skill.

Known boundaries: no universal refraction parity, automatic background contrast inversion, GPU renderer, or native mobile material. See compatibility and validation docs.
