# Keep the reader's place

Optional `/follow` exports `attachGlassFollow(scroller, options)`. This browser controller enhances one connected, normal top-to-bottom scrollport and its direct content child. Import is SSR-safe; mount after hydration and destroy on unmount. No stylesheet or runtime dependency is required.

```ts
import { attachGlassFollow } from '@wpsydev/liquid-glass/follow';
const reader = attachGlassFollow(scroller, { content });
// Host appends actual records first, then:
reader.notifyAppend(1);
// reader.destroy() on unmount
```

Native content, keyboard scrolling, text selection, input focus and actual messages remain host-owned. Do not use transformed scroll geometry, reversed-flex chat layout, virtualization or a second scroll manager. Content remains a direct child with a positive measurable scrollport. Keep the scroller's overflow anchoring/scroll styling compatible with the controller's conditional leases.

Threshold defaults48CSS pixels and clamps0–512, plus1px rounding tolerance. initiallyFollowing defaults true but never jumps at attachment; following starts only if already near the tail. Explicit pause is sticky until `follow()` or `jumpLatest()`. A user scroll/input pause does not auto-resume just because they later approach the end. `notifyAppend(count)` accepts host-declared new items up to1e6; zero means in-place text growth, not a new message. The controller never infers unread count from DOM mutations. When following and permitted it keeps the tail; while paused it preserves position and increments unread from declared appends. Old node identities and text selection are not replaced.

`state` returns frozen current following/nearEnd/distance/unread/visible/destroyed facts. `refresh()` explicitly measures geometry, especially without ResizeObserver. `pause()` preserves reading. `follow()` explicitly returns instantly to the tail without moving keyboard focus. `jumpLatest({smooth?})` allows native smooth navigation only for this explicit user/host action; quiet/OS reduction makes it immediate. `destroy()` releases observers/listeners and conditionally restores authored scroll styles. Attachment after a new host session is the deliberate way to clear an old unread ledger; ordinary refresh does not pretend the unread items were read.

observeResize defaults true; observe viewport and content only, coalescing event-driven checks. Live document/element visibility and positive-height gates suspend automatic tail work; they are not proof of occlusion. Hidden/offscreen work does not replay an old jump on return. reducedMotion defaults false and combines with OS preference. Optional onChange receives changed frozen snapshots only; callback errors dispatch lg-follow-error on the scroller. Automatic append following is instant; no perpetual streaming timer or idle loop is installed.

[Relay](https://wpsydev.github.io/liquid-glass-kit/follow/) is an original local review log. Read older records, append actual local notes, preserve selected text, and explicitly return with Jump latest. Its composer preserves native editing. Reset creates a new ten-record session and clears the old unread ledger without a controller-driven jump. The finite tour creates14 actual records, shows3unread while paused, then acknowledges them with the explicit jump. This is a local authored demonstration, not an AI backend or background stream.

21 focused tests and75 native desktop viewport/state cases across320–1440px retain44px targets,16px fields and no page overflow. Actual composer Enter, Read Older/append/Jump Latest, ArrowUp pause, selected text/node identity and width-change observation were checked. Physical phones, Safari and assistive technology remain unverified.

Optional controller2721bytesgzip.800connected lifecycle sequences: median31ms/160-sequence batch,26,400native geometry getter reads,0explicit rectangle reads,0synchronous RAF and9600balanced listener pairs. Includes induced synchronous style/layout; no paint/GPU/FPS/comparative speedup claim. Following250ms idle and post-destroy windows schedule no RAF.

Original twelve-second garage132/plucked-keys film records the actual bounded tour, with disclosed camera framing. Full360-frame/audio decode and crop/frame review passed; export30fps is not appFPS.

[Native evidence](../benchmarks/follow-native.json) · [Benchmark](../benchmarks/follow-browser.json) · [Research](resource-series/research/25-smoothui.md)

Independent Smooth UI-inspired reader-intent behavior, with no copied chat widget or mandatory React dependency.
