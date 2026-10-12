# Native actions with honest outcomes

Optional `/action` exports `attachGlassAction(button, options)` for authored native `type="button"` controls and `attachGlassFormAction(form, options)` for a real form. Attach after hydration; destroy during unmount. No action stylesheet or runtime dependency is required. Importing is SSR-safe.

```ts
import { attachGlassFormAction } from '@wpsydev/liquid-glass/action';
const action = attachGlassFormAction(form, {
  labelElement: submitLabel,
  statusElement: statusOutsideForm,
  async run({ formData, signal }) {
    const receipt = await yourHostSave(formData, { signal });
    return { status: 'success', message: 'Saved by the host', receipt };
  },
});
// action.cancel() asks cooperative work to stop
// action.destroy() releases the UI on unmount
```

`yourHostSave` is application code. The host owns authorization, revisions, side effects, persistence, network retry and idempotency. Aborting a signal cannot undo work already accepted elsewhere.

A connected target must have no other action attachment. `run` receives frozen context with `signal`, `generation`, `target`, `submitter` and `formData`. Button actions have null submitter/data. Forms use native successful-control serialization and a permitted associated native submit button/input. Browser submission validates first; `invoke(submitter?)` also validates unless native `novalidate`/`formnovalidate` applies. Native FormData image-submitter coordinates come from its constructor, not a captured pointer. The form controller explicitly prevents its normal submit path; unrelated host submit listeners remain the host's responsibility.

The handle exposes readonly `state`, `invoke`, `retry`, `cancel`, `reset`, `destroy`. States are idle, pending, submitted, success, error and cancelled. Pending calls share one promise. Explicit success is required for confirmed completion; a void result means submitted and locks repeated work until reset. An error is nonretryable unless its result supplies `retryable:true` or `isRetryable(error)` returns exactly true. Retry uses current live values and the last permitted submitter, so application retry policy must account for changed input. Message length is at most500 characters; custom labels at most120.

Pending sets owned `aria-busy` and `aria-disabled` without changing native disabled or replacing the control. Submitted remains aria-disabled. Existing native/ARIA disablement is honored; anchors keep ordinary navigation. Editable fields and authored child identities remain intact. Optional `labelElement` is a contained text-only span; optional `statusElement` is an unowned text-only region outside the changing target. The host supplies its accessible name/role and announcement policy. Label/status elements cannot be shared by live controllers.

`cancel` resolves local pending state and sends abort intent. Late host results cannot overwrite the cancelled UI, but noncooperative host work may still finish. `reset` invalidates the old generation without resetting form values. `destroy` removes listeners, invalidates pending work and conditionally restores only attributes/text the helper still owns. Host callbacks should check signal/generation before their own writes; the helper cannot roll back application changes. `onState` and retry-policy exceptions dispatch `lg-action-error`; they do not authorize another attempt.

[Review Room](https://wpsydev.github.io/liquid-glass-kit/actions/) is an original local session study. Its real brief queue, record-only intents and reviewer expose each outcome. Delays are disclosed fixture pacing; there is no backend or remote save. One example deliberately completes host work after client cancellation.

Native desktop Chromium testing covers invalid fields, Enter submission, named submitter FormData, single flight, preserved focus/draft/node identity, retry, void submission, cooperative/noncooperative cancellation and stale results. Fifteen state/viewport cases fit320–1440px with44px targets and16px fields. Physical phones, software keyboards, Safari and assistive technology remain unverified.

Optional standalone JS is2,402bytesgzip. Each of two mount/destroy variants ran8,000 measured cycles after50 warmup cycles:400 batches of20, median normalized batch average about0.005ms percycle. These figures exclude options/fixture creation, action execution, async/network work, style and paint. Batch percentiles do not describe individual callbacks, and there is no comparative speedup claim. [Payload](../benchmarks/action-payload.json) · [Lifecycle](../benchmarks/action-lifecycle-native.json) · [Native behavior](../benchmarks/action-native.json) · [Responsive cases](../benchmarks/action-responsive.json).

[Research](resource-series/research/16-cta.md): CTA Gallery informed the action hierarchy, without copying reference assets or code.
