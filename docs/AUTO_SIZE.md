# Real content, natural sizing

Optional `/auto-size` exports `attachGlassAutoSize(frame, content, { duration?, reducedMotion? })`. Import is SSR-safe; attach after hydration and destroy on unmount. The host commits actual content first, then calls `refresh()` after its renderer finishes.

```ts
import { attachGlassAutoSize } from '@wpsydev/liquid-glass/auto-size';
const sizing = attachGlassAutoSize(frame, content);
// Commit actual content, then:
const result = await sizing.refresh();
// sizing.destroy() on unmount
```

Use a dedicated untransformed horizontal `display:flow-root` frame containing exactly one direct content element. Its content uses flow-root, grid or flex, with independently natural height. Neither frame nor content may have fixed/percentage height; default auto height is required. Preserve authored padding, borders, box sizing, min/max and overflow. The helper does not add clipping, clone content or scale text. Reserve frame height/block-size and transform timing; use material styling on an appropriate child rather than transforming the measured frame.

Duration defaults220ms and clamps0–600ms. Explicit reducedMotion combines with OS preference. Native WAAPI performs finite height motion; it incurs layout and painting, so use a few panels rather than large animated streams. Content-size changes are observed when ResizeObserver exists. Observer-driven width and viewport changes snap responsive reflow. Without that observer the host explicitly refreshes committed changes.

`refresh()` resolves `{completed, reason, error?}`. Retargeted work resolves false while the latest transition settles; reasons distinguish focus, reduced-motion, resize, hidden, invalid-layout, native failure and external ownership. `finish()` snaps active work and returns whether it finished anything; `cancel()` stops decoration without reverting real host content. `update(options)` replaces settings, returning omitted fields to defaults; zero duration or reduction snaps active work. `destroy()` releases observers/listeners, cancels active decoration and conditionally restores authored sizing and priorities. Numeric owned heights disappear at rest. CSSOM ownership uses the browser's actual stored value and priority, including rounded fractional pixels.

Focus inside snaps immediately and preserves actual nodes, editing and caret. The helper supplies no disclosure semantics, focus movement, business callbacks or async operation state. The host moves focus deliberately before hiding a focused editor and owns `aria-expanded`, native details/form behavior and visibility. Hidden/detached work stops; becoming visible refreshes natural sizing rather than replaying the old transition. Arbitrary authored max-height/overflow can constrain content; this API cannot guarantee that every host layout avoids clipping.

[Session Notes](https://wpsydev.github.io/liquid-glass-kit/size/) adds and removes real local notes, filters them, expands native context and keeps one editable draft through responsive reflow. Its ten-second tour ends with the original draft selected and no numeric owned size or active animation. Original twelve-second cinematic/piano media uses the actual native tour without camera CSS or invented heights.

24 focused tests include the reproduced native fractional CSSOM ownership defect. Twenty desktop Chromium viewport/state checks across320–1440px retain44px controls,16px draft text and no page overflow or settled clipping. Actual native WAAPI, keyboard/details, retarget, focused selection, width reflow, min/max and authored priority restoration were checked separately. Physical phones, Safari and assistive technology remain unverified.

Optional controller2,469bytesgzip. A connected20-fixture attach/destroy benchmark reports median0.015ms/p950.035ms per-cycle batch average after warmup. It includes validation, computed styles/rectangles and synchronous style/layout those reads induce, observers/listeners, leases and cleanup. Setup, content changes, active animation, asynchronous painting and networking are excluded. Quantized batch averages are not per-action latency, FPS or comparative speedup.

[Native evidence](../benchmarks/auto-size-native.json) · [Layouts](../benchmarks/auto-size-responsive.json) · [Benchmark](../benchmarks/auto-size-lifecycle-native.json) · [Research](resource-series/research/23-motion-primitives.md)

Independent implementation inspired by Motion Primitives, with no copied component or required Motion/React dependency.
