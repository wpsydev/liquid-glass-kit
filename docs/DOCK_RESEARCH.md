# A magnetic dock with stable controls

Research snapshot: **2026-10-11**. The new dock is an independent web interaction, informed by a familiar desktop pattern. Apple documents macOS Dock magnification as an adjustable enlargement when the pointer moves over icons. This source supports the interaction reference; it supplies no public spring constants, optical shader, iOS equivalence or pixel-identical implementation. [Apple Desktop & Dock settings](https://support.apple.com/en-gb/guide/mac-help/mchlp1119/mac)

## The design choice

Make a small group of tools easier to inspect by magnifying a neighborhood around pointer position or focused control. Preserve the native target's layout rectangle and magnify a dedicated child with no independent action. This keeps application actions, link navigation and normal Tab navigation independent of the effect. Enlarged artwork retains normal hit testing: its clicks can bubble to the native parent, including portions outside the original target. Size the original control generously too, so touch and reduced-motion users have useful hit areas without relying on magnification.

The selected defaults are local design choices: target scale **1.65**, influence radius **120 CSS pixels**, lift **18 CSS pixels**, and the library's existing configurable spring. A cosine influence has zero weight at the radius boundary, so adjacent visuals can participate gradually rather than switching between isolated hover states. The current helper does not redistribute control positions, enlarge the shelf, implement drag-and-drop or reproduce Apple's magnification algorithm. [Usage and options](DOCK.md)

## Input is a capability, not a screen width

The web exposes primary input precision through `pointer` and hover ability through `hover`; a narrow viewport alone does not establish touchscreen input. Touch devices can also synthesize inconvenient hover behavior. Keep essential labels and activation available without hover. [MDN pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer), [MDN hover](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/hover)

Use the actual Pointer Event type to reject touch magnification. The event distinguishes mouse, pen and touch; this is useful on mixed-input hardware where a touchscreen and external mouse can coexist. The helper suppresses proximity presentation on touch down and resumes after a subsequent non-touch move or native keyboard interaction. This is a presentation policy, not hardware detection or proof of support on every phone. [MDN pointerType](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType)

## Motion is optional

Honor the live system reduced-motion preference and the explicit `reducedMotion` option. Neutral scale and lift preserve the complete interface; changing that preference should stop active motion rather than wait for a spring to settle. W3C's C39 technique describes using the preference to prevent nonessential interaction animation. It is a technique supporting an accessibility criterion, not an automatic conformance certificate for an app. [W3C C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html)

## Size targets before adding animation

WCAG 2.2 AA's target-size criterion specifies **24×24 CSS pixels**, with defined exceptions and a spacing alternative. The enhanced AAA criterion specifies **44×44 CSS pixels**, also with exceptions. Use at least 44×44 controls as a practical dock design target, then assess the actual app. Do not rely on hover magnification to repair an undersized resting hit area. Check enlarged neighbors for overlap, and assess rounded target shapes separately. [W3C minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [W3C enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)

## Render work is bounded, not magically free

Animate individual scale and translate on the visual child, cache target geometry between invalidations, and share one spring across the group. Avoid changing width, height, margins or positional layout properties every pointer event. The Chrome team's animation guide recommends transformation over layout-triggering properties and cautions against premature layer promotion. These are optimization principles; glass blur, styling, browser compositing and device capabilities still affect the actual result. [web.dev animation guide](https://web.dev/articles/animations-guide)

The optional `/dock` entrypoint and `/dock.css` keep unused dock code out of material-only integration paths. Root imports, portable CSS and experimental optical tiers retain their existing responsibilities. Claim bundle sizes or timing improvements only from recorded build or browser evidence. Idle scheduling, live preference changes, disabled controls, geometry refresh and teardown are verifiable contracts; a polished 12-second film is not a performance benchmark.

## Acceptance checklist for agents

- Author direct native buttons or destination links with accessible names. A dedicated visual child contains no nested interactive control. Keep selection and panel visibility in host code.
- Reserve sufficient original hit area, room for magnified neighbors and lift, and visible focus indication. Avoid clipping via a tight scrolling ancestor or `overflow: hidden` shelf.
- Offer useful labels and state without hover. Test touch input, keyboard navigation and reduced motion independently from responsive layout.
- Call `refresh()` after membership, disabled state or host layout changes; call `destroy()` when the host unmounts. Do not let another animation engine own the visual layer's scale/translate.
- Record unit tests separately from live browser results. Viewport checks in a desktop browser establish responsive behavior in that browser, not physical iPhone/Safari validation or universal compatibility.
