# Progress that reports actual work

Optional `/task-progress` exports pure `getGlassTaskProgressProps(options)`. Import `/task-progress.css` separately for scoped styling. No DOM controller, task runner, observer, timer or runtime dependency is installed; importing and constructing props is SSR-safe.

```ts
import { getGlassTaskProgressProps } from '@wpsydev/liquid-glass/task-progress';
const view = getGlassTaskProgressProps({
  id: 'notes-progress', statusId: 'notes-status',
  label: 'Inspect selected notes', statusText: 'Three records checked',
  state: 'busy', mode: 'determinate', value: 3, max: 8,
});
```

Render `view.progress` on a native progress element, `view.label.props` on its label and `view.label.text` as escaped text. Render `view.status.props` on a separate status paragraph and its text as escaped text. Spread `view.frame` on a dedicated wrapper, `view.decorative` on an empty decorative indicator, and `view.region` only on the actual updating results region. Keep the status node and real Cancel/Retry buttons outside the busy results and native progress element. IDs are explicit stable host-authored values; label/progress/status associations stay distinct.

State is explicitly idle, busy, complete, error or cancelled. Determinate mode requires finite value between0 and positive max; fractions are supported, over-max rejects rather than clamps. Indeterminate mode must omit value and max entirely. When patching an existing native progress element from determinate to unknown, remove those attributes rather than assign an undefined-looking value. Unknown progress is not zero. Terminal unknown progress hides its track; complete/error/cancelled never invents a100% amount. `valueText` may describe actual units, and `describedBy` adds host references.

Required plain `statusText` reports the host's real stage or outcome. Status announcements default off; choose polite or assertive deliberately for meaningful milestones, not every tick. The helper supplies status/alert metadata, not proof of screen-reader speech. Actual execution, quantities, delays, cancellation, retries, guards and completion receipts remain host-owned. Use meter semantics rather than progress for capacity measurements.

Decoration defaults static. `animated:true` enables one small CSS ring only while busy and indeterminate. Explicit reducedMotion and CSS OS reduction stop our ring. The host disables animation when offscreen or document-hidden; this pure helper does not discover visibility. Native platform progress painting may vary. No elapsed-time fake percentage, creeping bar, completion callback or endless idle animation is added.

[Index Room](https://wpsydev.github.io/liquid-glass-kit/progress/) checks14 original local notes: eight interface and six writing records. Each actual checked record computes UTF-8 bytes and Unicode letter/number word segments. A320ms preparation and chosen per-record delay make states inspectable; these are timing fixtures, not measured processing speed. Real partial rejection, cancel, explicit retry and terminal unknown outcomes preserve already measured results. Final interface collection totals1166bytes; writing totals797bytes.

41 focused tests;75 native desktop viewport/state cases across five320–1440px sizes retain44px targets,16px fields and no page overflow. Known zero0/8, fractional135/1166, explicit rejection426/1166, terminal unknown hiding, native cancellation/retry and meaningful status changes were verified separately. Native ring stops with real offscreen and quiet updates; status remains outside the busy region. Physical phones, Safari, native select popup delivery and assistive technology remain unverified.

Optional IIFE1613bytesgzip and CSS907bytesgzip excluding material CSS. Separate native probes:50,000pure props, median10.9ms/10,000-call batch;12,800connected props/DOM applications, median12.1ms/2560-apply batch with0RAF/explicit rect reads;500forced style/layout updates, median4.8ms/100-update batch including browser style/layout. No subsequent250ms idle RAF. These are absolute synchronous scopes, excluding actual task processing, painting/GPU and networking; no comparative speedup, FPS or loading-time claim.

Original twelve-second960-square video uses an original160BPM vibraphone drum-and-bass score. Its ten-second native tour changes real local records and quantities; camera-only density is disclosed. Full360-frame/audio decode and three reviewed frames passed. Export30fps is not application FPS.

[Native evidence](../benchmarks/task-progress-native.json) · [Benchmark](../benchmarks/task-progress-browser.json) · [Research](resource-series/research/24-uiverse.md)

Independent adaptation of Uiverse's loading-state ideas, without copied illustration or perpetual fetching animation.
