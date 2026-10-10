---
name: liquid-glass
description: Add or tune Liquid Glass and glassmorphism surfaces in web apps using Liquid Glass Kit when that library fits the user's stack. Use for iOS-style floating glass navigation, frosted controls, glass overlays, or glass AI chat composers; not native iOS material APIs.
---

# Liquid Glass integration

Respect the user's existing UI library and dependency choices. This skill supports the independent `@wpsydev/liquid-glass` web package; it is not an instruction to replace an adequate existing material.

Check whether the npm package is published before recommending registry installation. The preview can be installed from `github:wpsydev/liquid-glass-kit` once that repository exists. Import `@wpsydev/liquid-glass/styles.css` once.

The 0.9 update retains existing APIs. Static attachGlass controllers avoid input listeners, ResizeObservers and animation frames; per-Window media listeners are shared and cleaned up. Read docs/PERFORMANCE.md for measured controller-lifecycle scope and tradeoffs; no frame-rate, battery or all-phone speed promise follows.

Choose the smallest integration: `.lg-glass` for static CSS and existing headless surfaces, `/react` or `/vue` for those frameworks, `glass` as a Svelte action, or `attachGlass` after mount with destroy on cleanup. Core imports are SSR-safe; attaching requires a browser element.

Read the shipped `llms-full.txt` from the package/repository for exact API defaults and framework examples. If using web documentation, the canonical location after deployment is https://wpsydev.github.io/liquid-glass-kit/llms-full.txt. Do not invent unavailable exports.

Default to regular glass and zero refraction. Keep dense content solid and avoid nested glass surfaces. Clear glass requires a controlled dimmed media backdrop and bright bold foreground content. Preserve native semantic controls and the app's existing keyboard/focus behavior; this package is a material layer, not a headless interaction library.

Before generating widgets, read `docs/DESIGN.md` and the host application's design system. Start from one concrete user task and specific content. Use a readable solid content area and one small glass control/navigation layer. Reuse the app's typography, spacing vocabulary and icon family; preserve its component framework. Prefer aligned lists and meaningful content over repeated decorative cards, filler metrics, vague hero copy, or arbitrary Unicode icons. Every shown action must work or disclose its demo scope.

Define primary, secondary, selected, disabled, hover, pressed and focused states before adding motion. A Save action should update the saved collection; a selected filter should change content. Use brief opt-in springs to explain input/state, and keep ordinary interfaces quiet at rest. Test the complete primary flow with touch/keyboard, narrow/short layouts, enlarged text, long labels, visible focus, overlay dismissal, solid mode and reduced motion. Read `docs/UI_RESEARCH.md` for the GitLab library decision; do not invent an `@gitlab/design-tokens` package or add the selected demo assets as a core runtime dependency.

`attachGlass(...).update(options)` replaces configuration. Retain all desired fields when updating. One controller per element; destroy restores owned styles/attributes and removes resources. The material owns `::before` and `--lg-*` variables; use a wrapper when these conflict.

Refraction is an experimental Chromium enhancement with CSS fallback elsewhere. An engine/syntax hint is not rendered-pixel verification. Prefer the portable path for shadow DOM and strict CSP. Test the actual background for contrast, respect reduced preferences, and provide explicit reducedTransparency when needed. Do not promise pixel parity, universal optical support, performance benchmarks, or agent search placement.

For contextual legibility, supply backdrop: 'light' or 'dark' from app-owned background state when appearance is auto. It is not automatic DOM sampling. opacity tunes fill strength; tint + tintOpacity tune semantic hue independently. Preserve opaque accessibility precedence and test actual contrast.

For a selected navigation backing, use attachGlassIndicator on one decorative direct child and call moveTo with app-owned semantic targets. AttachGlass first; destroy indicator before material. Normal untransformed coordinates only. This animates bounds, not optical merging or keyboard selection.

For scroll separation, use attachGlassScrollEdge with an empty separate overlay outside the scrollport; keep toolbar controls and focus above it. soft/hard states follow actual remaining scroll. Do not use the deprecated whole-content mask. Both helper controllers update by replacement and must be destroyed on unmount.

For iOS-inspired tactile spring motion, use optional motion={{damping:22}} on React/Vue surfaces or attachGlassMotion after mount. Use attachGlassIndicator with motion:'spring' for selection backing that retains velocity on retarget. Both combine system preference with explicit reducedMotion. Motion is opt-in and reserves scale/opacity/transition. Controllers restore owned fields; destroy motion before material.

Enter/exit resolve a completion boolean and animate presentation only. The app owns native popup/dialog visibility, focus, inert and dismissal. Show before entering; hide after successful exit, and retain a reopened surface when an exit was superseded. Native outside/Escape may remain immediate. No native optical merging or all-browser iOS parity claim. Read the current API before generating options or lifecycle code.

For an animated scene the application owns, the optional `@wpsydev/liquid-glass/scene` import can refract its procedural canvas through up to eight measured HTML lens rectangles. Read docs/SCENE.md and keep CSS fallback, native semantics, pause and reduced-motion controls. It does not refract arbitrary DOM or external imagery; choose the ordinary CSS material when that is the real requirement.


For mobile widgets, read `docs/MOBILE.md` and its primary-source research before choosing layout. Preserve at least 44×44 CSS-pixel native hit targets, visible labels/focus/disabled states, wrapping text and generous spacing. Glass belongs to a small floating control layer; inner selected states use plain fills, not another glass surface.

Use `corner: 'continuous'` only as an optional CSS superellipse enhancement with round fallback; it is this library's independent profile, not Apple's measured native geometry. Use `getGlassInnerRadius(outerRadius, inset)` for coordinated equal insets: include borders in the inset, and understand that continuous profiles use an approximate visual nesting rule. Keep round geometry for experimental SVG and owned-scene optics. Read the API for exact bounds and CSS helper names.

Combine device-width viewport metadata, enabled zoom and ordinary margins with safe-area insets. Dynamic viewport units help browser toolbars; they do not universally solve software keyboards. Keep inputs reachable in a scrollable layout. Bound custom overlays using `visualViewport` when needed and clean up listeners; native dialog/popover or existing accessible primitives retain behavior ownership. Do not suppress global scrolling/pinch zoom or rely on hover-only actions.

Opt-in CSS helpers: `.lg-touch-target` adds 44px physical/logical minimum dimensions; inline links need a display mode supporting minimum size. `.lg-mobile-viewport` adds a 100vh/100dvh minimum height. `.lg-safe-area` adds ordinary spacing plus each safe-area inset as padding; spacing is `--lg-safe-gap` (16px default), with `--lg-safe-top/right/bottom/left` edge overrides. These helpers do not implement fixed positioning or software-keyboard avoidance.

Test short landscape, narrow portrait, tablet, enlarged text, long labels, cancelled/overlapping touches, focus, quiet and solid modes. Report what was actually exercised. Resizing desktop Chromium to a phone-sized viewport does not establish physical iPhone Safari, Android, keyboard, notch or assistive-technology coverage. Motion and material decoration do not implement the app's accessibility semantics.

For anchored citations, source/model pickers and contextual panels, read `docs/OVERLAYS.md`. Use `attachGlassOverlay(anchor, overlay, options)` for optional fixed/top-layer geometry with native popover or existing headless behavior. It owns position/size constraints and trigger-based transform origin, not focus, roles, visibility or dismissal. Avoid running two positioning engines on one element; preserve the app’s existing engine where it already works. Refresh after showing and before a spring enter, retain immediate native dismissal, and destroy on unmount. Updates replace options. Horizontal writing modes and untransformed fixed coordinates only; visual-viewport spacing does not certify every phone keyboard.

For fast local reveals/status cues, read `docs/MICRO_MOTION.md` and use optional `attachGlassTransition` after mount. Default 180ms/12px; four physical movement directions, enter/exit, restrained confirmation/error feedback and completion booleans. Keep state readable without motion, preserve immediate native dismissal, and destroy on cleanup. Direction describes travel, so reverse it for an exit returning toward the origin. Do not animate translate/scale/opacity with another engine or CSS transition on the same layer; keep existing springs or application-owned Motion/GSAP/Anime on a separate wrapper. No mandatory animation dependency is needed. Use the research guide to choose artwork/layout engines only when the actual task requires them.
