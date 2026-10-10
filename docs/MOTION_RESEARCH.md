# Motion research: making glass respond and transition

Research date: **2026-10-10**. This document specifies motion goals and validation criteria. It complements [APPLE_PARITY.md](APPLE_PARITY.md); it does not make new implementation or browser-performance claims. See [API.md](API.md) for shipped behavior and [VALIDATION.md](VALIDATION.md) for actual browser evidence.

## Findings from primary Apple references

Apple describes interactive glass as a coupled visual and motion material: touch produces flex and localized light, while controls can transform into larger presentations. Elasticity is an interaction cue, not a requirement to make every glass surface bounce. Reduced Motion removes elastic material behavior. [Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/)

Custom interactive glass receives scaling, bouncing and shimmering behavior; container grouping and identity coordinate shape transitions. Standard controls should retain their existing behavior rather than having custom gestures substituted just to obtain the material. [Build a SwiftUI app with the new design, WWDC25](https://developer.apple.com/videos/play/wwdc2025/323/)

The current custom-views guide makes the native transition model concrete. A `GlassEffectContainer` defines which neighboring effects interact; its spacing controls the proximity at which blending begins. Effects receive distinct IDs within a namespace, and geometry transitions apply during changes to the view hierarchy. Farther-apart effects should use materialization rather than arbitrary long-distance merging. [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)

The two native transition kinds have different purposes:

| Native transition | Documented behavior | Independent web interpretation |
| --- | --- | --- |
| `matchedGeometry` | An appearing/disappearing shape derives geometry from a nearby shape in its container. It may also scale/offset content when identity remains but content changes. | A decorative backing moving between measured bounds preserves the spatial relationship. It is not arbitrary native path blending or a shared optical compositor. |
| `materialize` | Content fades while the glass material animates in/out; it does not match another effect's geometry. | A local reveal can combine opacity, small scale, blur or highlight modulation. It must be identified as an independently designed reveal rather than Apple's optical materialization. |

References: [Apple matchedGeometry](https://developer.apple.com/documentation/swiftui/glasseffecttransition/matchedgeometry), [Apple materialize](https://developer.apple.com/documentation/swiftui/glasseffecttransition/materialize).

In WWDC26, Apple demonstrates interactive custom glass on macOS and distinguishes an inactive iPad window by dimming its icons/text. Pointer-optimized feedback and active-state hierarchy therefore matter alongside phone touch input. These observations do not prescribe web timing constants. [What's new in SwiftUI, WWDC26](https://developer.apple.com/videos/play/wwdc2026/269/)

## What “spring” needs to mean

Apple's spring session emphasizes continuity of both position and velocity. Gesture handoff and retargeting use the current velocity as the next spring's initial velocity. A spring can be nonbouncy; zero bounce is the general-purpose starting point. Duration refers to perceived pacing, while the point at which tiny residual motion is discarded is a separate settling decision. Apple recommends restraint with large bounce values. [Animate with springs, WWDC23](https://developer.apple.com/videos/play/wwdc2023/10158/)

SwiftUI's animation architecture makes this interruption behavior explicit: spring animations incorporate prior animation state when merging and supply velocity. Timing curves take a different path. The same session also shows why animation should be scoped to the properties intended to change, instead of spilling into arbitrary child content. [Explore SwiftUI animation, WWDC23](https://developer.apple.com/videos/play/wwdc2023/10156/)

For this web library, calling an easing curve a spring would conceal the distinction. A real optional spring should retain current position and velocity when its target changes. A useful independent model is a damped second-order system:

`acceleration = stiffness × (target − position) − damping × velocity`

This is an engineering model, not a reconstruction of Apple's internal material physics. Apply it consistently to decorative geometry or explicitly owned scale. Keep limits on dimensions, overshoot and computation; appearance should settle to the exact destination and stop scheduling frames. A “duration” option needs a documented mapping to the independent model, because native and web parameter names do not establish equal motion.

## Recommended interaction and presentation patterns

| Pattern | Motion purpose | Implementation boundary |
| --- | --- | --- |
| Press and release | Immediate response, then controlled return. | Keep native click, pointer cancellation, keyboard activation and disabled behavior. Scale only an explicitly owned visual layer; the event target/hit area must stay usable. |
| Rapid segmented selection | Continue the moving backing toward the latest destination. | Retarget current position/velocity rather than resetting to the preceding target or stacking conflicting animations. Selection and ARIA state remain application-owned. |
| Menu/popover reveal | Explain the relationship to the invoking control. | Use actual native popover/dialog DOM and existing focus/dismissal behavior. Animate presentation appearance or a decorative layer; do not clone interactive content. |
| Expand/collapse | Preserve the visual identity of the surface. | A single backing may interpolate bounds/radius. Never claim nearby arbitrary shapes fuse unless a renderer actually implements that behavior. |
| Materialization | Make a local appearance feel intentional. | A short opacity/scale/light reveal is useful. It is not optical lens modulation, and should not distort the foreground text for effect. |
| Reduced motion | Preserve information and immediate responsiveness. | Snap geometry and disable deformation; update the preference while an animation is running. Keep visible selection, focus and readable content. |

These recommendations are our design choices informed by the cited references. Timing, damping and scale must be tuned against the demo and ordinary application content. An attractive reel alone does not validate accessibility or interruption handling.

## Browser mechanics

`requestAnimationFrame` is a one-shot callback generally aligned with display refresh and often paused for hidden tabs. Use its timestamp, rather than a fixed distance per frame, so speed does not depend on 60 versus 120 Hz. Use a nullable frame handle: request IDs can eventually overflow to zero. After a long pause, evaluate elapsed time safely or bound integration steps; do not take a single enormous physics step. [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

Web Animations can animate presentation properties with explicit cancellation, but canceling an unfinished animation rejects its `finished` promise with `AbortError`. Handle intentional interruptions and destruction accordingly. If using timing-curve keyframes, document them as timing curves; WAAPI itself does not supply the above velocity-preserving spring contract. [MDN Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel)

Honor live `prefers-reduced-motion` changes in both JavaScript scheduling and CSS. A CSS animation override alone does not terminate an independent JavaScript frame loop. The platform signal describes a preference to remove, reduce or replace nonessential motion. [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

## Acceptance criteria for motion work

- Position has no jump when a running animation is retargeted. Spring velocity remains continuous within numerical tolerance; test a direction reversal and a third target before settling.
- Equal elapsed time produces comparable output at different frame cadences. Long frame gaps, hidden-tab resumption and invalid parameters produce finite bounded geometry.
- Settling snaps to the destination and leaves no permanent frame loop. Destruction, disconnected elements, null targets and explicit zero duration cancel pending work.
- Reduced Motion enabled before attachment prevents elastic movement. Enabling it during movement immediately reaches the correct state and cancels scheduling. Re-enabling motion works for a later interaction.
- Pointer release, cancellation, capture loss, focus loss, window blur and disabling the control clear press state. Native click and keyboard behavior still work once.
- Focus outline, text, selected state and accessible names remain clear. Decorative layers stay noninteractive and hidden from assistive technology; do not aria-hide a content-bearing backing.
- Popover/dialog reveal survives quick show/hide, Escape, outside dismissal, resize and scroll. Focus returns according to the native/application contract, even if the animation is interrupted.
- The CSS fallback and SSR import path remain usable without motion APIs. No DOM access occurs merely from importing the core.
- Live browser validation records observed visual continuity, mobile-sized layouts, keyboard use and preference switching separately from deterministic math/lifecycle tests. Device performance claims require device measurements.

## Remaining native gaps

Adding a spring or presentation helper would close an interaction gap. It would not implement Apple's shared backdrop sampling, shape union/path fusion, automatic content-aware illumination, native light-bending materialization, haptics or OS-window integration. Claims and agent recipes must distinguish a velocity-preserving independent spring, a matched-bounds backing, and a presentation reveal from those still-missing native features.

The targeted follow-up used Exa for 20 search results in two queries. Primary Apple transcripts/API pages and MDN references were fetched; third-party reproductions were excluded as authority. WWDC23 animation guidance predates Liquid Glass and supplies general motion principles. WWDC25/26 references supply the material-specific behavior. Live documentation pages are cited by access date, not their copyright footer.
