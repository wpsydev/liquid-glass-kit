# Native continuity between real views

Optional `/view-transition` exports `runGlassViewTransition` and `nameGlassView`. Import `/view-transition.css` separately. This is a same-document bridge, not a router, cross-document navigation layer or animation polyfill. The portable CSS material remains the default.

```ts
import { runGlassViewTransition, nameGlassView } from '@wpsydev/liquid-glass/view-transition';
import '@wpsydev/liquid-glass/view-transition.css';
const named = nameGlassView(artwork, 'selected-art');
const transition = runGlassViewTransition(async () => {
  await renderYourNextCommittedView();
}, { duration: 220 });
await transition.updateDone;
const result = await transition.finished;
// named.destroy() on unmount; transition.skip() skips visuals only
```

Keep a shared name on the corresponding old and new surface. Destroy the old helper attachment before naming a replacement element; two simultaneously rendered elements cannot share a helper-owned name. Suffixes are 1–49 lowercase letters/digits/hyphens, starting with a letter; the helper prefixes `lg-view-`. Names are document-unique among helper attachments; externally authored CSS names are not scanned. Duplicate native snapshots can reject readiness. `destroy()` conditionally restores captured inline value/priority without overwriting a newer owner.

Options: `document` defaults to the ambient document only when invoked; `reducedMotion` defaults false and cannot override the live OS reduction; `duration` defaults 220ms, clamps finite numbers to 180–300 and otherwise uses the default. Imports are SSR-safe. No-document, unsupported, hidden or reduced-motion cases update directly. The stylesheet applies only while a bridge call owns the temporary root attribute: named objects carry continuity; ordinary root content switches directly to avoid a duplicate full-page crossfade. Native snapshots still have paint and memory costs.

The host update executes exactly once, including fallback, skip and supersession. It is never retried after a native visual failure. `native` says whether the native API was used. `updateDone` rejects with the original host callback error. `ready` resolves true only for ready native snapshots. `finished` resolves `{ animated, reason, error? }`; reasons are complete/unsupported/reduced-motion/hidden/no-document/skipped/superseded/native-failed. Host errors reject `finished` unchanged; visual errors are reported without undoing the host update. Public rejected promises are internally observed but remain observable by callers.

`skip()` only skips visuals. A newer call skips the prior bridge's visuals while preserving each host update. This does not serialize async application operations: the host owns routing, revision checks, authorization, consequential actions, focus, persistence and stale-result handling. Keep updates short and commit the actual DOM inside the callback. Do not attach business logic to animation completion. Conditional cleanup restores root attributes/styles after the current owner finishes. The helper schedules no custom RAF and reads no DOM geometry.

[Form / State](https://wpsydev.github.io/liquid-glass-kit/transitions/) uses three original SVG forms, real gallery/detail/list state, local bookmarks and host-owned focus restoration. Twenty responsive Chromium cases fit 320–1440px with 44px buttons/labels; this does not establish physical-device or assistive-technology compatibility. [Research](resource-series/research/09-awwwards.md) · [Payload and Node fallback](../benchmarks/view-transition.json) · [Native evidence](../benchmarks/view-transition-browser.json).

Reproduce: `npm run build`, `node scripts/view-transition-benchmark.mjs`, then transfer the generated `/tmp/liquid-glass-view-transition-benchmark.html` to the active T3 preview and invoke `runGlassViewTransitionProbe()`. Five native 220ms runs completed with ready snapshots, followed by one quiet call and twenty superseding calls; all 26 callbacks executed once, with zero custom RAF/JavaScript rect reads and no remaining animation. Completion includes animation duration and browser capture, not helper CPU or FPS. The Node-only direct fallback is measured separately.
