# Resource 13: HOVERSTAT.ES

Reviewed 2026-10-11 with Exa and the native T3 preview. The public gallery, two canonical entries, their live destination pages, and primary browser/accessibility guidance were inspected. This is an inspiration archive, not a component package or a compatibility test suite.

## Two concrete examples

- https://www.hoverstat.es/features/soft-labor/ links https://www.softlabor.biz/. The live editorial uses SVG turbulence/displacement filters on the navigation, logo, and article text. Its content filter had a displacement scale of 15; a separate hover filter had scale 0. Keyboard-focusing the first article link left its content at `filter: url("#noise-content")` even though the card matched `:focus-within`. Thus the appealing pointer effect is not evidence of equivalent keyboard clarity. Do not reproduce unreadable-by-default body text.
- https://www.hoverstat.es/features/tiger-dingsun/ links https://tiger.exposed/. The gallery describes a transition from scattered stacks to an ordered index. The live page contains a semantic text/link index alongside many fixed, rotated image containers, with 200 ms transform transitions and narrow-screen hiding on some images. Several clickable images and the About trigger had no role or keyboard tab stop. The images and transforms were observed directly; an explicit keyboard-operable stack/list mode switch was not established.

The transferable idea is meaningful context at the point of attention, with a reliable way to obtain it without a mouse. Decorative distortion and dozens of fixed previews should not become framework defaults.

## Distinct independent feature

Add an optional preview-intent controller around an authored trigger and panel, for example `attachGlassPreview(trigger, panel, { openDelay, closeDelay, onOpen, onClose, interaction })`. Existing `attachGlassOverlay` can continue owning geometry; this new helper owns finite interaction state and timer cleanup, not positioning, downloaded images, or data fetching.

Required behavior: delayed pointer entry to avoid accidental flashes; immediate keyboard-focus access; persistence while the pointer or focus is in either trigger or panel; Escape dismissal without immediately reopening on the unchanged focus; a manual button path on touch; cancellation on pointer exit, destruction, and detached hosts. A gallery-link trigger must remain a real link: do not consume its first touch to simulate hover. Provide a separate Preview button if touch users need an optional panel.

Plain noninteractive descriptions can use tooltip semantics and `aria-describedby`. Rich previews with links/buttons need an appropriate nonmodal panel, explicit label and dismissal, and must not be mislabeled as a tooltip. Do not move focus just because the pointer entered a trigger, or overwrite an existing accessible name. Host applications own content and loading/failed states. Late asynchronous content must be ignored if its request generation no longer matches.

An original showcase can preview small locally authored project cards from a text index, support mouse/focus/manual buttons, and show all content normally when the enhancement is absent. This is distinct from the existing geometry-only overlay, one-element entrance animation, and proposed document view-transition bridge.

## Primary guidance and performance

- https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html requires additional hover/focus content to be dismissible, hoverable, and persistent, subject to its exceptions.
- https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/ distinguishes nonfocusable tooltips from interactive popups. The APG explicitly labels this pattern work in progress, not a completed conformance guarantee.
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/popover documents native popover visibility and light dismissal. Feature-detect it; newer `hint` behavior is not a universal baseline.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/hover distinguishes primary input hover capability. Media-query capability must not disable keyboard or manual access.

Use a bounded pair of timers and event listeners, with no pointer-move frame loop or idle animation. Load optional preview content only after intent, cache according to the host, and avoid SVG turbulence/blur on readable body text or filters on every image. One shared preview can serve a large index; independent controllers should still have predictable cleanup. Validate pointer-to-panel crossing, quick enter/leave, Escape suppression, keyboard focus, touch activation, reduced motion, and destruction during an async request. No speed or conversion claim follows from gallery inclusion.

## Rights and access

https://www.hoverstat.es/about/ describes a curated archive maintained by Mike Guppy and Dan Powell. No public source-code license for the gallery or either destination was established in this audit. Public access permits inspection, not reuse of their recordings, project images, typography assets, branding, or implementation. The proposed controller and showcase must be independently authored; no source/assets were downloaded or copied. Exa discovery returned four candidate sources, which were checked against live canonical links.
