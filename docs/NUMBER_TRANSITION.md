# Readable now, finite movement

Optional `/number-transition` exports pure `formatGlassNumber(value, options)` and browser `attachGlassNumber(visual, options)`. A dedicated decorative value animates while a separate readable semantic node shows the actual value immediately. The host owns real data, labels, styling, visibility and live-region timing.

```ts
import { attachGlassNumber } from '@wpsydev/liquid-glass/number-transition';
const count = attachGlassNumber(decorativeCount, {
  value: 25, locale: 'en-US', semantic: actualCount,
});
await count.set(42);
// count.destroy() during unmount
```

Use distinct, connected, unleased text-only elements in one document. The semantic value stays readable outside hidden/inert/aria-hidden trees and live regions. The helper hides only the visual from assistive technology. Optional status is a separate authored readable status/alert/aria-live node. Import is SSR-safe; attaching happens after hydration. No stylesheet or runtime dependency is required.

Values must be finite within±1e9. Supply an explicit supported locale; precision is an integer0–6 (default0), grouping defaults true. The pure formatter uses half-expand decimal display rounding over the supplied binary floating-point value; it is not exact financial arithmetic. Match server/client locale and ICU data for hydrated strings. At most32 formatters are cached, with none constructed at import time.

Mode defaults `replace`: two real formatted strings move/fade finitely. The separate semantic node updates to the new actual value immediately. Explicit `interpolate` may show intermediate decorative numbers for nonfinancial studies; it never changes the semantic actual value. Keep prices, balances and decision values in replace mode and use `/pricing` for exact minor-unit displays. Duration defaults280ms and finite values clamp0–600ms. Explicit reducedMotion combines with live OS reduction.

`set(value)` returns a promise: latest completion true; superseded, cancelled, hidden or detached work false. `cancel` snaps quietly to the current actual value. `update(partialSettings)` patches formatting/motion and quietly snaps active work without restarting. `snapshot` exposes actual value, current decorative displayValue, active and destroyed. `destroy` cancels and conditionally restores authored nodes/attributes only while content leases remain owned. New host content is preserved. Visibility cancellation never auto-replays.

Announcements default off. Set announce:true with a separate status region to announce once per changed displayed value on a settled update. announcementPrefix is bounded single-line text up to240 characters. Initial, reduced, hidden and configuration snaps remain quiet. Announcements should describe the host task; this helper does not certify screen-reader speech.

Replacement and explicit interpolation use one finite active RAF loop, with no rectangle reads or idle loop. Host CSS/rendering still has costs. The controller stores actual CSSOM serialization of owned styles, preserving browser number normalization. Avoid competing visual content or style writers.

[Calibre](https://wpsydev.github.io/liquid-glass-kit/numbers/) is an original local session log and instrument study. Native record/undo changes actual session totals; the log always replaces values. Editable temperature and CSS grid settings are explicitly nonfinancial study values. Staged session records are not measured productivity, sensor readings, money or growth. Quiet, solid, locale and optional announcement choices preserve native editing.

Twenty-nine focused tests;100 native desktop Chromium cases across five320–1440px viewports retain immediate semantic values, aria-hidden decoration,44px targets and16px fields with no page overflow. Native42-minute submit/undo, overlap false/true, quiet cancellation, real element-hidden cancellation without replay and cleanup were checked separately. Physical phones, Safari and assistive technology remain unverified.

Optional IIFE3,444bytesgzip. Eight connected controllers/4,000quiet set calls had median/p95~0.1ms per eight-call batch at~0.1ms clock resolution,0RAF/rectangles. Zero samples mean below resolution, not zero work. Active animation elapsed times, latest-result status writes and250msidle checks are separate; no baseline, speedup, GPU or appFPS claim. [Payload](../benchmarks/number-transition-payload.json) · [Native probe](../benchmarks/number-transition-browser.json) · [Layouts](../benchmarks/number-transition-layouts.json) · [Real form](../benchmarks/number-transition-native-form.json).

[Research](resource-series/research/22-magicui.md): independent numeric continuity inspired by Magic UI, without copied components or mandatory Motion/React dependencies.
