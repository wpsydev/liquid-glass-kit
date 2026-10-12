# Native scrolling, authored cards

Optional `/snap-deck` exports `attachGlassSnapDeck(scroller, options)`; import `/snap-deck.css` separately after your material stylesheet. Author semantic cards and separate labeled native Previous/Next buttons. The controller adds no roles, tabindex, cloned content, autoplay, drag engine or custom key behavior.

```ts
import { attachGlassSnapDeck } from '@wpsydev/liquid-glass/snap-deck';
import '@wpsydev/liquid-glass/snap-deck.css';
const deck = attachGlassSnapDeck(scroller, {
  items: [...scroller.children],
  onChange({ index, canNext, canPrevious }) {
    nextButton.disabled = !canNext;
    previousButton.disabled = !canPrevious;
    yourSettledView(index);
  },
});
nextButton.addEventListener('click', () => deck.next());
// deck.destroy() during unmount
```

Use a connected unowned scroller with1–128 unique, unowned same-document direct child items in their actual source order. `axis` defaults x and may be y. Horizontal writing modes and native signed RTL scrollLeft are supported; host CSS owns sizes, gaps, snap alignment and direction. Active markers must not resize cards. Layout transforms and unsupported coordinate conventions require separate host validation.

Options include `reducedMotion:false`, `settleDelay:120` clamped80–250ms and `onChange`. Live OS motion reduction wins. The handle exposes settled `index`, `canNext`, `canPrevious`, `goTo(index):boolean`, `next`, `previous`, `refresh`, `update(fullOptions)` and `destroy`. Index-1 means no measurable card. An accepted smooth request is not a settled index: native scrollend or a debounce following actual scroll events supplies the final view. Fully fitting cards disable both movement directions. The controller never transfers focus.

Measured card intervals are cached. Attach, refresh, resize and update can measure geometry; scrolling and cached goTo do not read card rectangles. Initial unchanged ResizeObserver delivery leaves an in-flight request alone. Real geometry, direction, padding, margin, visibility or membership changes can interrupt owned scrolling and rebuild the cache. Explicitly refresh after host direction/visibility changes; update replaces item membership and all options.

Reduced motion uses instant movement. Reduction, hidden document and destroy request instant interruption of controller-owned smooth scrolling; native momentum cancellation is not universally guaranteed. User input yields the requested target to actual scroll state. No custom RAF loop or idle geometry polling runs. Cleanup releases observation/listeners and conditionally restores owned markers. Errors in `onChange` dispatch `lg-deck-error`. Import is SSR-safe; attach after hydration.

[Offset](https://wpsydev.github.io/liquid-glass-kit/deck/) is an original art-direction board. Its cards contain native controls that select real local Form, Colour and Motion concepts. Story, compact, RTL and quiet modes preserve one authored tree; there is no navigation service or autoplay.

Thirty focused tests include the unchanged-resize/first-RTL-request regression. Native desktop Chromium testing covers actual LTR/RTL settling, padding, all-fit controls, focus, source identity and fifteen state/viewport cases320–1440px with44px targets and16px fields. Physical phones, touch momentum, Safari and assistive technology remain unverified.

Optional JS2,700bytesgzip/CSS443bytesgzip. A32-card connected lifecycle probe ran5×20 cycles:4.5ms median perbatch and6,600 total rectangle reads. A separate cached request probe ran20×4 instant requests perbatch:0.70ms median perbatch with0rectangle rereads. Both had0custom/idle RAF calls. These are distinct controller workloads, excluding native scroll animation, layout/paint and rendering; no comparative speedup or appFPS claim. [Payload](../benchmarks/snap-deck-payload.json) · [Lifecycle](../benchmarks/snap-deck-browser.json) · [Native behavior](../benchmarks/snap-deck-functional.json) · [Layouts](../benchmarks/snap-deck-layouts.json).

[Research](resource-series/research/17-supahero.md): Supahero informed independent direction studies without copied artwork, code or recordings.
