# Native sheets, real form controls

Optional `/bottom-sheet` exports `attachGlassBottomSheet(dialog,options)` and typed detent/dismiss/handle options. Import `/bottom-sheet.css` separately. Supply a connected, closed, accessibly named native `<dialog>` with showModal/close support; author its real form and autofocus before attaching.

```ts
import { attachGlassBottomSheet } from '@wpsydev/liquid-glass/bottom-sheet';
import '@wpsydev/liquid-glass/bottom-sheet.css';
const sheet = attachGlassBottomSheet(dialog, {
  detents: ['medium', .68, 'large'], label: 'Local note editor controls',
  onDismissRequest: reason => askYourHostAboutUnsavedEdits(reason),
});
openButton.addEventListener('click', () => sheet.open('medium'));
// sheet.snapTo('large'); await sheet.close(); sheet.destroy() on cleanup
```

Defaults: detents medium(.5)/large(.9), initial first detent, reducedMotion false combined with live OS preference, dismissOnDrag true, control-group label `Sheet controls`. Configure1–4 detents: finite fractions clamp .25–.95, deduplicate and sort; requested heights choose the closest configured value. Nominal detent fractions use the usable visual viewport, with a small-height floor up to120px. Controls keep44px targets and fields16px. This does not prove software-keyboard compatibility on physical devices.

Handle: readonly `detent`, `open(detent?)`, `close():Promise<boolean>`, `snapTo(detent):boolean`, `update(replacementOptions)`, `destroy()`. Opening preserves authored autofocus, native modal semantics and focus. Tap/Enter/Space on the dedicated grabber or resize button cycle heights; ordinary field keys remain native. Dragging suppresses touch scrolling only on the grabber, not the form. Pointer geometry is sampled once at gesture start, moves coalesce into one active RAF, and cancellation returns to a resting height. Content scrolls normally.

Optional `onDetent(fraction)` reports changed resting choices. `onDismissRequest(reason)` must return exactly true to approve; false/other values retain the form. Reasons: api/close/escape/drag/backdrop. Calls share one pending decision for an unchanged opening/edit state. Reopening, update or a new native form input/change invalidates old approvals. Host callback errors propagate unchanged from close(), also report `lg-sheet-error` for native actions; visible error/recovery copy remains with the host. Guard approval only controls closing, not saving, permissions, revision checks or business transactions.

Native `dialog.close()`, method=dialog forms and explicit destroy bypass helper guards. Choose ordinary forms plus explicit sheet.close() if your application requires a decision. Programmatic host changes must invalidate/update the guard state appropriately; the helper cannot infer external model revisions. Host owns validation, persistence, edited content and ownership. Destroy closes and removes helper controls/listeners, restoring captured geometry/class/attributes; reserve this dialog's fixed geometry for one owner, never another positioning/animation engine.

Viewport resize/scroll updates height/offset geometry without moving focus or replacing controls. Actual CSS height/top transitions last180ms and incur layout/paint; they are not a GPU-only large-mask transform. Reduced motion snaps directly, hides cancel active dragging, and there is no idle polling/frame loop. Imports are SSR-safe; attachment is browser-only. No runtime dependency, router or native-dialog polyfill.

Host theming: `data-lg-sheet-appearance="dark"` supplies an explicit dark palette; `data-lg-sheet-solid="true"` makes the surface opaque with no backdrop filter. CSS variables: --lg-sheet-fill-rgb, --lg-sheet-ink, --lg-sheet-solid, --lg-sheet-border, --lg-sheet-control-border, --lg-sheet-grabber, --lg-sheet-focus, --lg-sheet-radius(26px), --lg-sheet-control-radius(13px), --lg-sheet-blur(20px), --lg-sheet-saturation(1.15). Host styles remain authoritative; the original demo intentionally authors a violet palette. Motion/transparency/forced-colors fallbacks stay active. Corners are independent web geometry, not Apple's private rendering.

[Field / Notes](https://wpsydev.github.io/liquid-glass-kit/sheet/) has two real local briefs, three resting heights, native save and inline Keep editing/Discard choices. Saves are page-session state, not uploads. Its finite11.2s tour uses actual height changes and edited data. [Research](resource-series/research/12-mobbin.md) · [Optional payload](../benchmarks/bottom-sheet-payload.json) · [Native evidence](../benchmarks/bottom-sheet-browser.json).

Fifteen native desktop Chromium viewport/detent cases fit320–1440px with44px controls/16px fields. Actual browser clicks return focus to the original card; Escape preserves edits pending a decision; native submit updates the local brief. A synthetic touch-event test coalesced8moves into1RAF/1start rect read; it is not a physical gesture test. Five20-cycle native reduced-motion attach/open/two-snap/close/destroy batches had5.8ms median and0customRAF/JSrectreads/subsequentidleRAF, excluding animated paint. No FPS, GPU, load speedup or universal-phone claim.
