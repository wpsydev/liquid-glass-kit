# Context when someone asks for it

Optional `/preview-intent` exports `attachGlassPreview(trigger, panel, options)` and `GlassPreviewOptions`. It manages finite intent and visibility. The host authors the panel, accessible name, loading states and geometry. There is no component CSS or runtime dependency.

```ts
import { attachGlassPreview } from '@wpsydev/liquid-glass/preview-intent';
const preview = attachGlassPreview(previewButton, panel, {
  interaction: 'manual',
  semantics: 'disclosure',
});
previewButton.addEventListener('click', () => preview.toggle());
// preview.destroy() when unmounting
```

Supply separate, nonnested elements in the same browser document. Default options: interaction `hover-focus`, semantics `none`, native false, openDelay 120 ms, closeDelay 120 ms. Finite delays clamp to 0–1000 ms. Option objects must contain recognized own data fields; invalid values/accessors are rejected.

Fine-pointer entry waits for intent. Keyboard focus opens immediately. Leaving the trigger allows a crossing grace period; pointer or focus inside either element keeps the preview open. Escape closes without moving focus and suppresses reopening on unchanged focus. Touch events do not synthesize hover. The helper never intercepts clicks: keep navigation links intact and provide a separate native Preview button for touch.

`interaction: 'manual'` disables automatic hover/focus opening. Bind native clicks yourself. `show()` pins the panel until an explicit close, update or lifecycle cancellation. The returned handle has readonly `open`, `pending`, `renderer` (`hidden` or `native-popover`), plus `show/hide/toggle/update(replacementOptions)/destroy`. Pending describes the host's onOpen promise, not network or animation progress.

Declare semantics explicitly. `description` requires an authored noninteractive `role=tooltip` and adds its ID to the trigger's existing aria-describedby references. `disclosure` requires a native button and a non-tooltip, nonmodal panel; aria-controls/expanded are managed. `none` preserves host semantics. Rich interactive panels must not be labeled tooltips. Accessible panel labels, readable content, focus order and Close controls remain host-owned.

For an explicitly authored `popover=manual`, `native: true` requests the native tier. Missing support or authored autofocus uses a portable hidden panel instead. The helper avoids native autofocus on hover and synchronizes actual native visibility. Nested modal/popover Escape handling is preserved. Attribute restoration is conditional: later host changes remain authoritative.

`onOpen({reason, signal})` may return a promise; reasons are hover/focus/manual/native. Closing, update, hidden document, detachment or destruction aborts old intent. The host must check the signal and its own request generation before applying fetched or computed content. Aborting intent does not undo arbitrary writes or cancel a remote server operation. Late failures are ignored for an obsolete generation. `onClose({reason})` reports leave/escape/manual/update/native/hidden/detached; `onError(error)` is guarded so reporting cannot strand cleanup.

Update replaces options and closes the old intent, waiting for a fresh action. Destroy removes listeners, pending timers, active observation and owned attributes. Call destroy on unmount. Imports are SSR-safe; attaching needs a browser document. Active detachment checks use MutationObserver when available; the host must still clean up the controller.

No placement, focus transfer, downloaded assets, blur layers, pointer-move loop, rectangle reads or custom RAF are added by this helper. Compose `attachGlassOverlay` only while open if placement is needed; measure that separately. Any reveal animation belongs to the host.

[Context Studio](https://wpsydev.github.io/liquid-glass-kit/preview/) contains three original art directions: a description, a native-button interactive choice and a cancelable 350 ms local-detail fixture. The navigation link remains a link. The finite 10.1 s tour reveals panels with a host-authored 160 ms CSS animation; quiet and OS reduced-motion settings disable it. No data is fetched.

Fifteen native T3 desktop Chromium viewport/content cases fit 320–1440 px with 44 px controls and 16 px fields. Native popover selection returns focus through an explicit host action; Escape keeps the preview closed on unchanged focus. Synthetic mouse/touch events separately verify quick cancellation and pointer-to-panel crossing; they are not physical-device tests. Physical phones, Safari and assistive technology remain unverified.

Standalone optional JS is 3,299 bytes gzip. Five batches of 20 cycles over 64 connected manual descriptions measured 42.6 ms median per batch; all 6,400 opens and closes completed with no custom RAF, JavaScript rectangle reads or subsequent idle RAF. This excludes placement, content requests, animation, rendering and paint, and claims no comparative speedup. Reproduce the fixture with `node scripts/preview-intent-benchmark.mjs`, then run `scripts/preview-intent-browser-probe.js` in the generated native browser fixture.

[Research](resource-series/research/13-hoverstates.md) · [Payload](../benchmarks/preview-intent-payload.json) · [Native evidence](../benchmarks/preview-intent-browser.json). The interaction study is independently authored; no reference art, assets, fonts, recordings or source reused.
