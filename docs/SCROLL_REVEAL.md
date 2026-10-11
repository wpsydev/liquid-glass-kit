# Scroll reveal

Optional `@wpsydev/liquid-glass/scroll-reveal` adds an entry presentation to a dedicated visual layer. The root API and material CSS do not import it. No runtime dependency or extra stylesheet is required.

```ts
import { attachGlassScrollReveal } from '@wpsydev/liquid-glass/scroll-reveal';
const reveal = attachGlassScrollReveal(visual, { direction: 'up', distance: 24 });
// On unmount:
reveal.destroy();
```

A browser-owned `ViewTimeline` scrubs opacity and individual translate over the `entry 0%` to `entry 100%` range. The timeline uses the element's layout position; transforms do not alter the range. When unsupported, an IntersectionObserver triggers a timed entrance. With neither mechanism, content stays static. The fallback is not a scroll-scrubbing polyfill.

The native timeline uses the nearest ancestor scroll container. An `overflow:hidden` decorative wrapper can become that container even if you never scroll it, preventing the page scroll from driving the effect. Use `overflow:clip` for a purely decorative clipping wrapper, or place the visual under the intended scroller. Passing `root` explicitly selects the timed IntersectionObserver path.

| Option | Default / limit |
| --- | --- |
| direction | up; up/down/left/right describe movement into place |
| distance | 24px; 0–48px |
| duration | 420ms; 0–700ms, timed fallback only; zero disables enhancement |
| startOpacity | .35 times author opacity; .2–1 |
| native | true; prefer native timeline |
| once | true; preserve author presentation after first complete entry |
| root | null; non-null Element chooses the IntersectionObserver fallback |
| reducedMotion | false; combined with live OS preference |

Methods: `reveal()` exposes the author presentation immediately and permanently; `update(replacementOptions)` replaces configuration without replaying a completed once reveal; `destroy()` is idempotent and restores captured inline values/priorities. `renderer` reports `native-view-timeline`, `intersection-reveal` or `static`. Constructor and animation failures fall back rather than hiding content. Call cleanup when a layer is removed; idle removal is checked on the next method/observer callback, not by permanent document polling.

Focus inside the layer exposes its content immediately without moving focus. No role, tab order, navigation, visibility, inert state or application action is changed. Opacity is a visual enhancement; it does not hide elements from assistive technology. Avoid putting critical task instructions at low opacity. Keep text readable over your backdrop and use opaque material when needed. Use a dedicated layer when another controller owns opacity or translate.

## React, Vue and other hosts

Attach after the element mounts and destroy during unmount. React/Vue peers stay optional; there is no adapter-specific prop for this helper. Static SSR output remains visible until an explicit browser enhancement attaches.

```tsx
useEffect(() => {
  if (!visual.current) return;
  const reveal = attachGlassScrollReveal(visual.current);
  return () => reveal.destroy();
}, []);
```

```ts
onMounted(() => { reveal = attachGlassScrollReveal(visual.value); });
onBeforeUnmount(() => reveal?.destroy());
```

The [Fieldnotes study](https://wpsydev.github.io/liquid-glass-kit/scroll/) uses three original editorial surfaces and `once:false` for repeatable study. Controls compare native/fallback, opaque glass and reduced motion. Its native dialogs contain sample reading notes.

## Evidence and limits

The controller has no scroll handler, getBoundingClientRect polling or custom animation-frame loop. Browser-managed animation still has rendering cost; glass blur, paint/compositing and the rest of your page remain significant. Native availability varies. Unit tests mock timeline timing; real browser evidence and scoped setup/cleanup measurements are recorded separately.

[Resource investigation](resource-series/01-scrolltide.md) · [Lifecycle fixture](../scripts/scroll-reveal-benchmark.mjs) · [Payload metadata](../benchmarks/scroll-reveal-payload.json) · [Native browser measurements](../benchmarks/scroll-reveal-browser.json).

Primary references: [MDN ViewTimeline](https://developer.mozilla.org/en-US/docs/Web/API/ViewTimeline), [WebKit range explanation](https://webkit.org/blog/17184/so-many-ranges-so-little-time-a-cheatsheet-of-animation-ranges-for-your-next-scroll-driven-animation/), [W3C range definition](https://www.w3.org/TR/scroll-animations/#view-timeline-ranges). Independent implementation informed by Scrolltide's public scroll-story examples; no template code, prompt, image or promotional footage copied.
