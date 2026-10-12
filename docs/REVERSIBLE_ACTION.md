# Leave a way back

Optional `/reversible-action` exports pure `createGlassReversibleAction({key,apply,undo,commit,timeout?,onChange?})`. Imports are SSR-safe with no runtime dependency or DOM enhancement. The host owns actual operations, semantics, visuals and focus.

```ts
import { createGlassReversibleAction } from '@wpsydev/liquid-glass/reversible-action';
const action = createGlassReversibleAction({
  key: 'archive-note',
  apply: async context => ({ receipt: await archiveLocally(context.signal) }),
  undo: async (receipt, context) => restoreLocally(receipt, context.signal),
  commit: async (receipt, context) => finalizeLocally(receipt, context.signal),
});
await action.start();
// Offer real Undo or Commit; destroy on host disposal
```

Apply must acknowledge actual provisional work with an ordinary `{receipt}` object. The receipt is an opaque host-owned reference: never copied, frozen, inspected or executed, and undefined may be a legitimate acknowledged receipt. Undo performs actual host compensation; Commit acknowledges actual finalization. Neither is synthesized from animation completion, a timer or abort intent. These callbacks are not a database transaction or network rollback guarantee.

State is a frozen snapshot with key, generation, status, active phase, hasReceipt/receipt, error, composed pause reasons and sampled remaining/deadline. Status distinguishes idle, applying, available, undoing, committing, undone, committed, error and destroyed. Context supplies key/generation/phase, AbortSignal and explicit/deadline cause. `start`, `undo` and `commit` return actual phase outcomes with receipt/state and stale flag. Duplicate calls in the same in-flight phase share the same promise; competing phases reject without extra callbacks. `lastOperation` exposes the latest actual phase promise, including automatic Commit and late failure. Observer exceptions are isolated in observerError rather than changing the host outcome.

Persistent Undo is the default (`timeout:null`). Explicit integer1000–60000ms windows schedule one deadline only while available and unpaused. Expiry selects Commit, but status becomes committed only after the callback resolves. Deadline is monotonic local-clock time, not a server/wall-clock deadline. State reads sample remaining time; no polling or countdown announcements occur. `pause(reason)` and `resume(reason)` compose manual/default, focus, pointer and hidden reasons. The host supplies actual UI/visibility events and an accessible persistent recovery policy where needed.

`destroy()` aborts intent, clears timing and leaves state destroyed. It never silently Undo/Commits host work. A host callback may ignore AbortSignal and complete later; its outcome is stale while real host data may have changed. The host records/reconciles this and supplies a separate persistent Restore when appropriate. Failed Undo retains the receipt and real membership until the host explicitly recovers it. Dispose/cancel text must not claim that writes were prevented.

Render semantic buttons/status and deliberate announcements. Preserve the original row/object/node when your host compensation allows it. If an initiating item is removed, move focus to the available Undo or recovery action; restore it deliberately when the item returns. This pure model does not move focus or watch the DOM. Use optional existing finite motion around the authored visual, respecting OS/explicit reduction.

[Kept](https://wpsydev.github.io/liquid-glass-kit/undo/) is an original six-item local reference shelf. Actual Apply archives an original item, Undo returns the same object/article/button, Commit enables separate history Restore, and rejection/stale-Apply fixtures keep truthful host state. Short local waits expose pending phases; they are fixtures, not backend processing metrics. A three-second option is explicitly a preview window and persistent history Restore remains available.

22 focused tests and25 native desktop viewport/state cases across five320–1440px sizes retain44px targets,16px fields and no page overflow. Actual Archive/Enter Undo, Commit/Enter Restore, focus rescue, original identity, failed compensation, ignored-abort late Apply, deadline callback acknowledgment and composed pauses were verified. Native Quiet/Solid controls work; physical phones, Safari, assistive technology and live background/OS changes remain unverified.

Optional model2250bytesgzip. Pure50-call batch-average medians: construct/destroy0.002ms, actual synchronous host Apply/Undo0.008ms, Apply/Commit0.004ms. These include Promise/state/receipt lifecycle but exclude DOM, demo waits, asynchronous service work and painting. No connected-render, FPS or comparative speedup claim.

Original twelve-second acoustic-pop116 nylon-pluck/handclap/woodblock film uses a fresh melody, progression and rhythm. It records actual finite host actions; four reviewed states keep controls below866px above caption882. Full360-frame/audio decode passed; export30fps is not appFPS.

[Native evidence](../benchmarks/reversible-action-native.json) · [Benchmark](../benchmarks/reversible-action-benchmark-native.json) · [Research](resource-series/research/27-kinetics.md)

Independent Kinetics-inspired recoverable interaction, without copied animation or mandatory runtime.
