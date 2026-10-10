# Small motion that helps people use glass

Research snapshot: **2026-10-10**. This is a selection rationale, not a benchmark or a claim that every user prefers animation. Implementation contracts belong in [API.md](API.md); unit tests and live browser evidence belong in [VALIDATION.md](VALIDATION.md). The existing velocity-preserving spring rationale remains in [MOTION_RESEARCH.md](MOTION_RESEARCH.md).

## Decision

Use **native Web Animations API for small timed transitions**, keep the existing spring for direct press/selection motion, and leave larger animation toolboxes optional in the consuming application. These solve different problems. A short directional entrance need not install a React-oriented layout engine, vector player, or full timeline system. Native keyframes supply timing and cancellation; they do not automatically supply velocity-continuous springs. [MDN Web Animations guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API)

The focused addition is `attachGlassTransition`: four short directions for entry/exit and restrained confirmation/rejection feedback. Its defaults are independent design choices: **12 CSS pixels and 180 ms** for entry. This is a timed easing transition, not an Apple spring reconstruction. Keep core runtime dependencies at zero, read browser APIs only after attachment, and keep focus, visibility, accessible state, and application actions owned by the host.

The goal is a panel that feels responsive and connected to its trigger, a status cue that confirms an action, and a surface that stops moving promptly. Avoid obligatory scroll reveals, perpetual decorative wobble, content hidden until a stagger finishes, and cinematic transitions on every repeated action.

## A practical toolbox selection

These are recommendations for their stated task, not an overall winner or an endorsement of vendor performance claims.

| Tool | Best task in an application using this library | Why it stays outside the core |
| --- | --- | --- |
| **CSS + native WAAPI** | Hover/focus styling and short explicit enter/exit/feedback transitions. | No animation package is required. Detect browser capability, supply an immediate final-state fallback, and handle cancellation. [MDN guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API), [cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel) |
| **Motion** | React component presence, gestures, layout changes and shared-element transitions; its JavaScript API also supports sequences. | Choose it when the application needs that lifecycle/layout engine. Keep glass material on a nested surface so two engines do not animate the same properties. [React layout](https://motion.dev/docs/react-layout-animations), [JavaScript animate](https://motion.dev/docs/animate) |
| **GSAP** | Complex coordinated timelines and intentionally authored scenes. | Its tween/timeline model is useful when choreography is a feature of the application. Scope work and use `context().revert()` when appropriate on unmount. [GSAP docs](https://gsap.com/docs/v3/GSAP/), [context cleanup](https://gsap.com/docs/v3/GSAP/gsap.context()/) |
| **Anime.js** | Framework-independent DOM/SVG animation and custom keyframe work. | It offers an ordinary animation engine and a separate WAAPI route. Choose the route according to required features; another engine is unnecessary for our bounded transition helper. [Animation](https://animejs.com/documentation/animation/), [WAAPI](https://animejs.com/documentation/web-animation-api/) |
| **Rive** | Designer-authored interactive vector art, with state-machine behavior. | Treat it as an illustration/player, not the semantic control itself. The web runtime loads a `.riv` asset and uses JavaScript/WASM; its current guide recommends WebGL2 for most projects and documents explicit cleanup. [Web runtime](https://rive.app/docs/runtimes/web/web-js), [state machines](https://rive.app/docs/runtimes/state-machines) |
| **Lottie-web** | Exported motion artwork or a brief authored illustration. | It plays exported animation data using SVG/canvas/HTML renderers. Keep accessible meaning in ordinary HTML, disable unwanted loops/autoplay, and destroy the player when no longer used. [Official repository usage](https://github.com/airbnb/lottie-web) |
| **AutoAnimate** | Simple list additions, removals, and reordering when its automatic behavior fits. | It targets immediate child changes, can change parent positioning, and documents flex-size caveats. It already respects reduced motion. Do not run it and another layout animator on the same children. [Official guide](https://auto-animate.formkit.com/) |

## Popularity: measured attention, not taste

GitHub stars were read from each repository's public API on **2026-10-10**. npm counts are downloads for **2026-10-02 through 2026-10-08**, as reported by npm's download API during this research. Neither metric counts distinct satisfied users, active production apps, accessibility quality, or design quality. Downloads include automation and dependencies. Repository scope differs, especially for Rive, whose web runtime is only one part of its product.

| Project / sampled npm package | GitHub stars | npm downloads in sampled week |
| --- | ---: | ---: |
| [Motion](https://api.github.com/repos/motiondivision/motion) / [`motion`](https://api.npmjs.org/downloads/point/2026-10-02:2026-10-08/motion) | 33,941 | 24,365,798 |
| Same Motion project / [`framer-motion`](https://api.npmjs.org/downloads/point/2026-10-02:2026-10-08/framer-motion) | Same repository; not an extra total | 50,066,213 |
| [GSAP](https://api.github.com/repos/greensock/GSAP) / [`gsap`](https://api.npmjs.org/downloads/point/2026-10-02:2026-10-08/gsap) | 29,015 | 5,905,639 |
| [Anime.js](https://api.github.com/repos/juliangarnier/anime) / [`animejs`](https://api.npmjs.org/downloads/point/2026-10-02:2026-10-08/animejs) | 73,467 | 1,049,681 |
| [Lottie-web](https://api.github.com/repos/airbnb/lottie-web) / [`lottie-web`](https://api.npmjs.org/downloads/point/2026-10-02:2026-10-08/lottie-web) | 32,194 | 6,223,632 |
| [Rive web runtime](https://api.github.com/repos/rive-app/rive-wasm) / [`@rive-app/canvas`](https://api.npmjs.org/downloads/point/2026-10-02:2026-10-08/%40rive-app%2Fcanvas) | 973 | 1,157,308 |
| [AutoAnimate](https://api.github.com/repos/formkit/auto-animate) / [`@formkit/auto-animate`](https://api.npmjs.org/downloads/point/2026-10-02:2026-10-08/%40formkit%2Fauto-animate) | 13,928 | 1,590,128 |

Do not sum `motion` and `framer-motion`: package lineage and dependencies overlap. The sampled Canvas package does not represent all Rive runtime installations and is not the default recommended by the current Rive guide. Native CSS/WAAPI has no comparable npm installation or GitHub-star metric.

The defensible conclusion is that this shortlist contains widely used choices across distinct tasks. The data does **not** establish a most-loved animation library or justify importing the highest-starred package into every project.

## What designers recommend

**Apple HIG:** Use motion to explain state and give feedback; make it purposeful, brief, precise, optional, and cancelable. Repeated interactions should not impose a performance that people must watch. Direction should fit the action: a presentation revealed from one edge should not arbitrarily dismiss toward another. Touch can justify more emphasis than pointer interaction. These are design principles, not a recipe for pixel-identical native glass. [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion?changes=l_9_3)

**Material 3:** Current guidance uses spring-based standard and expressive schemes, rather than presenting the older duration/easing system as the sole current model. The standard scheme is suited to utilitarian products; expressive motion emphasizes key moments. Spatial motion and effects have different token roles. This supports retaining the library's spring for interaction while offering a distinct timed helper for brief presentation; we are not adopting Google's native token implementation. [Material motion physics](https://m3.material.io/styles/motion)

**Carbon:** Its documented productive/expressive distinction separates routine task feedback from occasional emphasized moments. The accessible v10 guide uses small duration tokens, including 110 ms fades and 150 ms microinteractions. This is a useful established reference, explicitly **v10 guidance**, not a claim about every current Carbon implementation. [Carbon v10 motion](https://v10.carbondesignsystem.com/guidelines/motion/overview/)

**Nielsen Norman Group:** Motion should communicate feedback, changes, and spatial relationships without taking over the task. Its duration guidance suggests roughly 100 ms for simple feedback and 200–300 ms for larger transitions, with distance and complexity affecting the choice. Seek the shortest duration that remains comprehensible rather than a universal fixed number. Our 180 ms / 12 px entry is a restrained local choice; actual use still requires inspection. [Purpose](https://www.nngroup.com/articles/animation-purpose-ux/), [duration](https://www.nngroup.com/articles/animation-duration/)

## What people say: small, self-selected samples

In an April 2026 React discussion, several developers favored Motion's React ergonomics, while others said ordinary CSS covered most of their animation needs. The thread has few participants; it cannot rank satisfaction across frameworks. [First-person Motion/Anime discussion](https://www.reddit.com/r/reactjs/comments/1sfl34a/motion_vs_anime_js/)

A January 2026 web-development thread contains frustration with content that remains hidden while scrolling animations finish, alongside participants who like well-timed effects and want a choice to disable them. That supports testing interruption and immediate content access; it does not prove that all users dislike animation. [First-person animation complaints and responses](https://www.reddit.com/r/webdev/comments/1q88hvv/animations/)

These anecdotes are opinion evidence only. Technical claims in forum replies, including universal CSS-versus-JavaScript performance statements or outdated license assumptions, are not used as implementation authority. No representative user survey or usability experiment on this library was conducted for this update.

## Apply the selection without animation conflicts

Use one owner per animated property on an element. If the app already uses Motion/GSAP/Anime for presence or layout, let it animate an **outer wrapper** and attach the glass material to an **inner surface**. If our transition helper owns translate/scale/opacity on a surface, do not make another engine drive those properties on that surface. Use another wrapper for existing glass press motion as well. The geometry helper can still position the outer popover, with appearance on its inner content.

No optional third-party library is required or imported by the core. These are integration choices for the consuming app, not bundled adapters or a claim that arbitrary combinations were browser-tested.

Use direction to express the relationship, not for random novelty:

The helper's direction names describe **travel**: `up` enters from below and exits above. For a sheet that should return toward its origin, change the direction to `down` before exit; similarly reverse left/right when returning along a prior path. Do not confuse a travel direction with an edge-placement option.

| Situation | Motion choice | Information preserved without motion |
| --- | --- | --- |
| Small sheet arriving from below | Brief upward entry, reverse-direction exit. | The sheet and its heading appear immediately. |
| Adjacent workflow content | Left/right according to the actual spatial change. | Current step, heading, and action state. |
| Contextual panel | A small direction that fits its actual placement. | Anchor relationship, readable panel, native dismissal. |
| Successful action | One restrained confirmation on a decorative icon/backing. | Persistent success text or state; live announcement only when appropriate. |
| Rejected action | At most a tiny one-shot cue. | Specific error text and the relevant field association. |
| Frequent press/selection | Existing interruptible spring, used selectively. | Native activation and visible selected/pressed state. |

The host should update important state immediately, allow repeated input, and handle stale completions after cancellation. A timed animation finishing is not evidence that a backend request succeeded. A rejection shake is not a replacement for an explanation.

## Implementation and showcase acceptance criteria

- Importing the core on the server reads no browser globals. No runtime dependency is added for these transitions.
- Unsupported `Element.animate`, zero-duration settings, and reduced motion apply final presentation immediately. Live reduced-motion changes stop active nonessential motion. [MDN preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- Retargeting/canceling/destroying resolves owned work predictably, restores owned inline styles, and does not leave stale animation effects. Intentional WAAPI cancellation must account for rejected `finished` promises. [MDN cancellation](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel)
- Keyboard focus, buttons, visibility, modal/nonmodal behavior, and assistive-technology meaning remain semantic and host-owned. Disabled controls do not produce false confirmation.
- The demo shows four directions and two feedback cues in one composed screen. Each panel remains readable; motion is short and sequentially emphasized rather than all panels pulsing forever.
- The selling video records actual running demo controls and captions the feature. Music belongs to the exported campaign clip, not automatic application playback. Avoid flashing contrast changes and claims of guaranteed engagement or universal device performance.
- Unit tests cover finite bounded options, cancellation and cleanup. Browser validation separately records native keyframe playback, responsiveness, keyboard behavior and reduced-motion state. Performance statements require measurements on named devices and browsers.

The research identifies useful patterns and capable tools. It does not establish Apple's full optical renderer, native haptics, universal refraction, or benchmark superiority for this independent web library.
