# Resource 08: Godly, now Recent

Reviewed 2026-10-11 with Exa and native T3 preview. https://godly.website/ redirected to https://recent.design/?ref=godly. https://recent.design/info explicitly states that Recent takes the place of Godly. Do not describe the historical Godly gallery as its current interface.

## Two observed motion examples

- https://recent.design/i/x6k4i8j-effort-slider-microinteraction credits ozzy and links https://x.com/ozzyxs1a/status/2107523169649389677. A public 5.55-second looping video shows an effort control whose discrete levels change the density/intensity of pixel energy and accompanying icon feedback. The small control is the focal object within otherwise restrained chrome.
- https://recent.design/i/maajesu-vibe-selector-microinteraction credits George and links https://x.com/vanjek/status/2107120208964116634. A public approximately 8.08-second video shows a selector producing different finite colored pixel effects when its choice changes. The important pattern is action-coupled feedback, not constantly animating the whole interface.

These are reference videos, not live controls or proof of an available library implementation. No source-level performance benchmark or mobile assistive-technology validation was possible from the videos. Public impression counters are not evidence of conversion, adoption or universal design quality.

## Distinct independent feature

Add a bounded optional feedback emitter, for example `createGlassFeedbackEmitter(canvas, { effect, particles, duration, reducedMotion })`, returning `burst`, `cancel` and `destroy`. Original pixel/spark/ripple primitives can accompany a host-confirmed selection or success state without replacing the native button, select, range or form semantics.

This differs from existing whole-element pulse/shake transitions: it creates a small finite decorative field. Begin with Canvas 2D or a small bounded WAAPI pool; do not introduce a WebGL engine for a handful of particles. Do not emit for every pointermove or every typed character. A range recipe can emit only when a meaningful discrete level changes. The effect should be aria-hidden, pointer-transparent and supplementary to a textual state label.

Useful original demo: effort, quality, volume, filter, selected mode and completed action in six small glass controls. Each trigger shows one short effect with quiet surrounding chrome. Use generated original shapes and original music; do not republish reference videos/audio or imitate creator branding.

## Performance contract

Hard-cap particle count, concurrent bursts, lifetime, backing-store pixels and DPR. Batch drawing into a supplied surface and reuse particle storage. Cache bounds once per burst rather than reading layout per particle/frame. Stop RAF when the final burst ends; cancel work on destroy, hidden page, reduced-motion changes or disconnected surface. Use elapsed time with bounded steps, so suspended tabs do not resume with runaway physics. Keep the optional module out of root imports and avoid runtime dependencies.

Benchmark burst submission, active update cost, rendered area and completion/idle state separately, with the exact particle/viewport/DPR fixture. Canvas 2D is not inherently faster than CSS or WebGL in every workload; compare the chosen implementation instead of making renderer-wide claims.

## Primary technical references and rights

- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range
- https://www.w3.org/WAI/ARIA/apg/patterns/slider/

Public feed/detail pages were accessible without signing in. Saving and other account features were not used. No explicit redistribution license for the referenced artwork/videos was established; creator credit is not a media license. This proposal uses independent code and original assets. No sponsorship, paid content or external posting was undertaken.
