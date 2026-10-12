# Resource 12: Mobbin

Reviewed 2026-10-11 with Exa and native T3 preview. Only publicly visible marketing/docs and two canonical screen pages were used; no account, paid flow library, MCP/API access or screenshot downloads were used.

## Two concrete public screen observations

- https://mobbin.com/explore/screens/c525c1ad-c67f-407f-b9a1-ec9689e85901 shows an Airbnb iOS map with a lower results sheet, rounded upper corners, a small grabber and continued map context above it. Its capture includes historical travel-restriction copy; the capture date was not established, so it is not evidence of current iOS/Airbnb styling.
- https://mobbin.com/explore/screens/b7210fef-88b9-4abf-b434-580e73bae634 shows an Airbnb coupon-entry sheet with a grabber, close control, labeled input, action button and onscreen keyboard. It is a good layout stress case, not proof of gesture implementation or keyboard behavior from a static image.

Save/copy features lead to signup. Screens were publicly visible; full flows and animations were not reviewed. Mobbin's https://mobbin.com/llms.txt explicitly distinguishes visible design observations from inferred recommendations and warns that conventions do not prove better metrics.

## Distinct independent feature

Add an optional glass bottom-sheet geometry/gesture controller around an authored native dialog, for example `attachGlassSheet(dialog, handle, { detents, onDetent, onDismissRequest, reducedMotion })`.

Support discrete resting heights, grabber-only dragging, a tap/keyboard way to cycle detents, explicit Close/Cancel, safe-area padding and visual-viewport resizing when a keyboard appears. Keep drag handling separate from scrollable content so controls, selection and scrolling remain native. Preserve native dialog modality/focus behavior and avoid claiming a geometry helper provides a complete accessible modal by itself. A clearly scoped first release may support modal native dialogs only; nonmodal panels have different interaction requirements.

Host applications own saving, validation and unsaved-change dismissal decisions. Swipe dismissal must not silently discard a form. Handle pointer cancellation and detached/destroyed controllers, restore owned styles/listeners, and avoid moving focus on every resize. An original map-like canvas plus filter/coupon form can demonstrate the two contexts without third-party screenshots or actual commerce/maps integration claims.

## Primary guidance and implementation constraints

- https://developer.apple.com/design/human-interface-guidelines/sheets defines scoped tasks, modal/nonmodal distinctions, one sheet at a time, medium/large/custom detents, grabber tap cycling, dismissal alternatives and unsaved-change handling. These are adapted interaction principles, not Apple's rendering implementation.
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog documents showModal/show/close and native modal semantics. Do not place tabindex on dialog itself.
- https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport documents keyboard/pinch-zoom changes that differ from layout viewport size.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action explains gesture ownership and pointercancel. Restrict custom gesture suppression to the handle; do not disable page zoom broadly.

Coalesce pointer writes to one active RAF, cache gesture-start geometry, recompute on actual viewport changes and stop frames at rest. Prefer transform while dragging and bounded settling; do not promise zero layout/paint when committing a new height. Use one glass sheet surface, not a backdrop-filter on every child. Validate 320/390px portrait, landscape, text enlargement, long content, pointercancel and reduced motion. Keyboard and real mobile assistive-technology testing are separate from desktop viewport emulation.

## Access and rights

https://docs.mobbin.com/overview and https://docs.mobbin.com/mcp/clients/overview document OAuth MCP on Pro/Team/Enterprise and bearer-key REST API on Team/Enterprise. No programmatic access was installed or used. https://mobbin.com/terms retains platform/content rights; public reference access is not permission to republish screen assets or reproduce branding. All proposed code, styling and demo media should be original.
