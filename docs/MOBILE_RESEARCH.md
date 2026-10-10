# Mobile design research

Reviewed 10 October 2026. This update adapts Apple design principles to independent web controls. It does not reproduce UIKit, identify a phone's hardware corner radius, or certify every mobile browser.

Exa searches reviewed 20 candidate results across three angles: Apple's mobile interface guidance, web corner geometry, and mobile viewports/input. The decisions below use primary Apple, WebKit, MDN and browser-platform references; third-party interpretations were excluded. Some Apple HIG pages expose only a title to crawlers, so the source record also includes readable Apple documentation and WWDC transcripts.

## Decisions backed by sources

| Finding | Web implementation decision | Boundary |
| --- | --- | --- |
| Apple recommends at least 44×44 pt hit regions and recognizable press feedback. | Keep native buttons, give web targets at least 44×44 CSS pixels, and retain visible focus/disabled states. | Native points and CSS pixels are different units; this is a web design target, not a physical-size equivalence. [Apple Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) |
| Floating controls relate to surrounding curved geometry; dense content should remain distinct from the control layer. | Coordinate outer/inner radii; apply glass to navigation, composers and transient controls, with solid content behind them. | Radius tokens cannot infer the hardware shape; avoid glass on glass. [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) |
| Custom motion should be purposeful, brief, optional and interruptible. | Use restrained press springs and retargetable selection feedback; expose quiet mode and preserve immediate dismissal. | Motion is presentation, not focus, routing or dialog state. [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| Larger text, contrast alternatives and multiple ways to perceive feedback matter. | Use flexible heights, wrapping labels, relative text sizes, text/state cues and solid material preference. | A translucent material alone cannot guarantee arbitrary-background contrast or screen-reader accessibility. [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| Edge-to-edge Safari pages must protect content from device cutouts and the home indicator. | Combine `viewport-fit=cover` with `env(safe-area-inset-*)` and ordinary spacing. | Safe insets do not replace margins and do not report the keyboard. [WebKit's iPhone layout guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) |
| Mobile keyboards and pinch zoom can change the visible area without resizing layout. | Keep focused controls reachable; use `visualViewport` resize/scroll when positioning custom overlays. | Desktop resizing does not simulate the actual mobile keyboard or pinch interaction. [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) |
| Dynamic viewport units account for expanding/collapsing browser toolbars. | Prefer `min-height: 100dvh` with a `100vh` fallback for the application shell. | Keyboard size is generally excluded; `dvh` is not a universal keyboard fix. [Web.dev viewport units](https://web.dev/blog/viewport-units) |
| Browsers cancel pointer input when they take over a gesture. | Track the originating pointer/touch, release its feedback on cancellation, and preserve scrolling/pinch zoom. | Custom drag surfaces need their own gesture policy and a non-drag alternative. [MDN pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event), [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) |

## Corner geometry

For a uniformly inset circular rounded rectangle, the practical concentric rule is `inner = max(0, outer − inset)`, using the total inset between the two visible boundaries. Borders count toward that inset. CSS may normalize large radii to fit the box, so the requested radius and rendered radius can differ.

`corner: 'continuous'` is this library's optional `superellipse(1.5)` design treatment. MDN defines `superellipse(1)` as the ordinary round profile and `superellipse(2)` as the squircle profile. The intermediate value is a restrained independent choice, not Apple's measured native curve. Subtracting an inset for this profile provides visual coordination rather than a mathematically exact parallel superellipse. [MDN superellipse](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/superellipse)

Use `border-radius` as the portable baseline. `corner-shape` is experimental and not Baseline; enhancement belongs inside `@supports`. The material and its decoration must use the same profile. A rounded-rectangle optical map cannot faithfully model a different silhouette, so the experimental SVG path keeps round geometry and owned-scene lenses should use round surfaces. [MDN corner-shape](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape)

MDN's compatibility data inspected on 10 October 2026 lists Chrome 139 as added, with Firefox and Safari as preview entries and iOS support mirrored from Safari. This is a dated source observation, not a promise about an installed browser. Keep round fallback for iPhones and feature-detect rather than select by device name. [MDN browser compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/properties/corner-shape.json)

## Viewport and keyboard choices

Use a device-width viewport and allow zoom. `interactive-widget=resizes-content` is an optional browser hint; implementations differ, so recipes must not rely on it alone. Native dialogs/popovers or an existing accessible overlay library remain preferable to rebuilding focus and keyboard behavior. [MDN viewport metadata](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)

Use the visual viewport for the position and maximum dimensions of a custom sheet while focused inputs remain in a scrollable region. Do not apply inverse zoom scaling to the whole app: text should grow when users zoom. Cleanup viewport listeners with the application's mount lifecycle. Safe-area variables and keyboard avoidance solve separate problems. [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)

## Evidence required before stronger claims

Automated DOM tests can establish pointer ownership, cancellation, lifecycle and option handling. A resized collaborative Chromium preview can establish reflow, target bounds and rendered geometry in that engine. Neither establishes physical iPhone Safari behavior, Android hardware performance, VoiceOver/TalkBack, a software keyboard's geometry, or all-phone compatibility.

Before certifying an application, test portrait/landscape on actual iOS Safari and Android browsers, text enlargement, pinch zoom, keyboard opening/dismissal, cutout/home-indicator placement, scrolling gestures, reduced preferences, and assistive technology. Record browser/device/OS versions and results separately from library unit tests. See [MOBILE.md](MOBILE.md) for the integration contract and [VALIDATION.md](VALIDATION.md) for observed evidence.
