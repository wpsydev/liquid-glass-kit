# Deliberate ambient media

Optional `/ambient-media` exports `createGlassMediaCoordinator(options)`. It coordinates explicitly attached decorative previews; it is not a video renderer, player UI, source loader or network optimizer. No additional CSS is required by the helper.

```ts
import { createGlassMediaCoordinator } from '@wpsydev/liquid-glass/ambient-media';
const media = createGlassMediaCoordinator({ maxActive: 1 });
const preview = media.attach(video, {
  trigger: 'manual',
  onState(state, detail) { showYourPosterOrOutcome(state, detail.reason); },
});
await preview.request(); // returns whether owned playback started
// preview.pause(); preview.release(); preview.destroy();
// media.update({ maxActive: 2, reducedMotion: true }); media.destroy();
```

The host owns sources, posters, accessible play controls, fallback copy and layout. Use a decorative muted thumbnail with `preload="none"`, not a normal controlled media player. Sources are never assigned or removed by this helper. Preload is a browser hint, not a zero-request/decoder-memory guarantee. Only one coordinator may attach a given video, at most128 attachments per coordinator, all in one document. Create after mount, destroy on cleanup. Imports and unattached creation are SSR-safe; the core has no runtime dependencies.

Coordinator defaults: `maxActive:1` (finite values floor/clamp1–4), `reducedMotion:false`, `saveData:false`. Explicit reductions combine with the live OS motion preference and supported navigator.connection.saveData; false cannot bypass the OS. `update(replacementOptions)` resolves defaults again, then reconciles eligibility. Unknown properties, accessors and invalid options throw.

Attachment defaults to `trigger:'manual'`; it installs no intersection/pointer trigger and starts nothing. `visible` explicitly opts into shared IntersectionObserver eligibility, and `hover` into fine-pointer intent. A missing observer leaves visible auto-start unavailable; deliberate manual requests remain possible. An `onState(state,{reason,error?})` exception is isolated from cleanup; the host handles visual fallback. States: idle, eligible, requesting, playing, paused, blocked, user-owned, unsupported, destroyed.

Pending play promises reserve the same slot as owned playing videos. A successful play promise confirms the request, not smooth decoding/FPS. Rejection reports blocked and keeps fallback with the host. Automatic eligible previews can use newly available slots; a manual request while the budget is full returns false and needs a fresh request. `pause()` suppresses owned auto-play until fresh intent/request, pauses only owned previews and frees the slot. Hidden documents, detachment, reduced motion and save-data reconciliation stop only owned playback. Stale play outcomes cannot restart or pause a newly released host player. There are no polling timers, frame loops, scroll handlers, pixel reads or geometry reads in the coordinator.

`release()` yields ownership without pausing playback, restores conditionally owned muted/loop/playsInline/preload properties and makes later coordinator policies leave that player alone. Call it before exposing native controls or changing ownership. Preexisting playback and native controlled videos are treated as user-owned. Host code decides whether to pause a released thumbnail, open a different full player, mute/unmute it or reattach later; the helper never claims those actions. `destroy()` disconnects owned resources and pauses only still-owned previews. Captured properties/attributes restore conditionally, preserving a later distinct owner.

Fresh `stats`: attached, ownedActive, pending, playing, maxActive, visibilitySupported, saveDataSupported. Counts exclude user-owned players and are not decoder/memory/frame-rate measurements. Browser `getVideoPlaybackQuality()` counters are separate cumulative decoded/dropped-frame evidence.

[Motion Library](https://wpsydev.github.io/liquid-glass-kit/media/) uses six existing original MIT films and covers. Native controls let viewers request previews, select a1–4 budget, opt into visible/hover policies, pause by saving preferences or open a separate native full player. Its finite11.2-second tour shows actual requests, a declined second slot, a raised budget, data-saving pause and explicit full-player ownership; no unattended loop or fake bandwidth counter. Full playback may be rejected by native autoplay policy; use its native controls.

[Research](resource-series/research/10-landing-love.md) · [Optional payload](../benchmarks/ambient-media-payload.json) · [Native lifecycle/playback evidence](../benchmarks/ambient-media-browser.json). The active source-preview's initial videos were paused with0 owned requests; currentSrc was already selected. Cross-origin timing hides byte sizes, so zero timing fields are not zero transferred bytes. Supplied file sizes are documented separately. No cold/warm network speedup, mobile decoder-memory or physical-device claim is made.

Reproduce manual lifecycle: `npm run build`, `node scripts/ambient-media-benchmark.mjs`; transfer its generated `/tmp/liquid-glass-media-benchmark.html` into the active T3 preview and invoke `runGlassMediaLifecycleProbe()`. Five batches of20 connected128-video attach/update/destroy cycles had a7.5ms median with0 custom RAF/rectangle reads and0 subsequent idle RAF. This intentionally excludes source fetching, playback and decoder work.
