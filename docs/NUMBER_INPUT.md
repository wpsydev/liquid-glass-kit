# Native drafts, deliberate precision

Optional `/number-input` exports `attachGlassNumberInput(input, options?)`. Import `/number-input.css` separately for scoped44px targets and16px fields. Import is SSR-safe; attach after hydration, destroy on unmount. The authored native type=number input, labels, name, constraints, validation and form behavior remain intact.

```ts
import { attachGlassNumberInput } from '@wpsydev/liquid-glass/number-input';
const editor = attachGlassNumberInput(input, {
  handle: scrubButton,
  incrementButton: increaseButton,
  decrementButton: decreaseButton,
  onCommit: state => { if (state.valid) applyHostSetting(state.value); },
});
// editor.destroy() on unmount
```

Optional controls are distinct connected authored native type=button elements with meaningful names. The scrub handle is separate from the text field; only it owns touch-action:none. Keep visible labels/units and a non-drag alternative through typing or tap controls. No custom spinbutton role, replacement field, wheel interception, default arrow/Enter/submit override, locale formatter or save callback is installed. Native ArrowUp/Down remains available independently of helper support.

Settings: pixelsPerStep defaults8/clamps2–64; modifierKeys defaults false, opting into Shift10× and slower Alt drag distance on the same native step grid. normalizeOnChange defaults false, so ordinary native change reports actual validation without coercing drafts. Typing, blank and badInput are never rewritten. Browsers can represent an incomplete typed minus as an empty DOM value plus badInput; do not invent a zero from it.

`state` gives actual raw string, value or null, empty/valid/native validity flags, precisionSupported/canStep/canScrub and scrubbing. `step(steps)` accepts signed integer±1–1000 and delegates supported directional alignment to native APIs. `commit()` explicitly clamps/snaps a finite value, leaving blank/badInput intact. `cancel()` restores only a still-owned gesture draft; `refresh()` samples host changes and updates tap controls; `update(settings)` replaces settings/defaults and cancels active gestures. `destroy()` releases resources and conditionally restores owned controls/styles without undoing real host data.

Supported canonical numeric attributes are at most64characters, at most6decimal places and absolute values within1e9 with safe scaled-integer calculations. Step base follows min, then the value attribute, then0. Equal explicit snap ties favor positive direction. step=any permits clamp-only Commit and invents no scrub/step granularity. Unsupported precision/constraints decline helper stepping/scrubbing while preserving native editing/arrows/validation. This is a UI helper, not exact financial arithmetic or universal native-input equivalence.

During a primary-pointer scrub, deltas coalesce into one active RAF and require no rectangle reads. Release commits once. Escape/manual/blur/hidden/detached/disabled/constraint/lost-capture/secondary-pointer/update/destroy cancellation restores only owned draft values; external host value/constraint changes win. Active-gesture subtree observation has cost; no observer or RAF loop polls when idle. Input/change events generated for helper writes are synthetic; host adapters must account for them and current controlled state.

Callbacks distinguish onInput typing/step/scrub/normalize/cancel, onCommit manual/change/step/scrub and onCancel reason. The host validates meaning, applies actual settings, persists data and controls any animations. A controlled React/Vue host integrates these callbacks with its own state and lifecycle rather than letting competing renders overwrite an active draft. Constraint/validity/DOM checks are not server authorization.

[Hinge](https://wpsydev.github.io/liquid-glass-kit/scrub/) edits actual local material radius/blur and content spacing. Drafts remain separate from committed objects. Material settings change after valid Commit, avoiding per-packet host updates. Distinct Apply labels describe each field, and real native submission records FormData and its submitter. The bounded tour uses explicitly synthetic scrub packets through the actual controller; it does not demonstrate physical touch delivery.

27 focused tests and80 native desktop viewport/state cases across320–1440px retain44px targets and18px demo fields with no page overflow. Actual ArrowUp20→22, typed12.25 stepMismatch/draft preservation, native badInput, invalid submit, explicit12.5 Apply and FormData were verified. Separate synthetic scrub probes cover release once, Escape/manual cancellation, external values, constraint changes and modifiers. Seven-decimal helper backoff leaves native ArrowUp functional. Physical phones, pointer capture/drag delivery, Safari and assistive technology remain unverified.

Optional controller4284bytesgzip/CSS403gzip.100synthetic moves coalesce into one input frame/write, two start-style reads and0rect reads, release commits once.800connected attach/destroy sequences median25.6ms/160batch with0syncRAF/style/rect and5600balanced listener pairs. Separate active lifecycle totals5617balanced listeners/one balanced observer, idle/post-destroy250ms0RAF. These are scoped synchronous/packet counts, not paint/GPU/FPS/comparative speedup evidence.

Original twelve-second disco120/electric-keys video records native draft/commit state and disclosed synthetic scrub stages. Full360-frame/audio decode and three reviewed frames passed; export30fps is not appFPS.

[Native evidence](../benchmarks/number-input-native.json) · [Boundaries](../benchmarks/number-input-boundaries.json) · [Benchmark](../benchmarks/number-input-browser.json) · [Research](resource-series/research/28-microkit.md)

Independent Microkit-inspired precision interaction, without copied ruler/widget or mandatory framework runtime.
