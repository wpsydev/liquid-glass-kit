# Anchored glass overlays

A citation should open beside its claim. A picker near an edge should stay reachable. `attachGlassOverlay` supplies optional geometry for a native popover or an existing accessible fixed surface; it does not replace its interaction model.

```html
<button id="source-button" popovertarget="source">Read source</button>
<section id="source" popover="auto" aria-labelledby="source-title">
  <h2 id="source-title">Interview notes</h2>
  <p>Keep the quote and context readable.</p>
  <button popovertarget="source" popovertargetaction="hide" autofocus>Close source</button>
</section>
```

```ts
import '@wpsydev/liquid-glass/styles.css';
import { attachGlass, attachGlassMotion, attachGlassOverlay } from '@wpsydev/liquid-glass';

const trigger = document.querySelector<HTMLElement>('#source-button')!;
const popover = document.querySelector<HTMLElement>('#source')!;
const material = attachGlass(popover, { radius: 24, appearance: 'light' });
const motion = attachGlassMotion(popover, { reducedMotion: false });
const position = attachGlassOverlay(trigger, popover, {
  placement: 'bottom', align: 'start', gap: 8, padding: 16,
});
const onToggle = (event: Event) => {
  if ((event as ToggleEvent).newState === 'open') {
    position.refresh();
    void motion.enter();
  }
};
popover.addEventListener('toggle', onToggle);

// On unmount: remove this handler, then destroy in this order.
// popover.removeEventListener('toggle', onToggle);
// position.destroy(); motion.destroy(); material.destroy();
```

Give the panel an app-defined readable size, for example `width: 22rem; padding: 20px`, and use at least 44px native button targets. Constraints can shrink the panel; let labels wrap. Do not make large padding/borders or child minimum widths exceed the visible viewport. If focus belongs on a particular control, use a deliberate `autofocus` policy. Popovers are non-modal; they do not trap focus. These ordinary buttons use Tab/Enter. A true ARIA menu needs its complete arrow-key and focus model from the host or an existing primitive.

## Geometry contract

Options replace the previous configuration. The return value is `{ refresh(), update(options), destroy() }`.

| Option | Default | Meaning |
| --- | --- | --- |
| placement | `bottom` | Preferred `top` or `bottom`; flip if it cannot fit and the other side offers more space. |
| align | `start` | `start`, `center`, `end`; start/end follow the anchor's computed RTL/LTR direction. |
| gap | 8 | Separation from the trigger, finite values clamped to 0–128px. |
| padding | 16 | Ordinary spacing inside the visible viewport, finite values clamped to 0–128px. |
| matchWidth | false | Match measured trigger width, still constrained to the viewport. Otherwise preserve the app's width. |

The helper shifts horizontally, constrains maximum width and height to the selected side, and enables internal overflow. `data-lg-overlay-placement` reports the actual side. `--lg-overlay-origin` and inline `transform-origin` align an entry spring with the trigger. Unscaled layout dimensions avoid chasing the spring's transient scale. Native fit-content panels are measured from a neutral inset before final placement.

ResizeObserver, window/nested scroll, resize, native `toggle`, and VisualViewport resize/scroll schedule at most one pending animation frame. There is no continuous animation loop in the geometry helper. Closed or detached elements are not measured. Call `refresh()` after a headless surface appears or its layout moves without an observed resize/scroll; `beforetoggle` opening still sees a closed native surface.

It temporarily owns fixed position, physical/logical insets and margins, width when requested, min/max sizing, border-box sizing, overflow, native anchor-rule overrides and transform origin. Cleanup restores the captured fields and priorities, leaving motion scale/opacity and semantic attributes alone. Do not run it alongside Floating UI, another positioning engine, or app CSS anchor rules on the same element. One controller per overlay.

## Use it after refs mount

React's existing component can attach geometry without a new wrapper:

```tsx
useEffect(() => {
  if (!triggerRef.current || !popoverRef.current) return;
  const position = attachGlassOverlay(triggerRef.current, popoverRef.current);
  return () => position.destroy();
}, []); // Include dependencies if your refs' elements can be replaced.
```

Vue uses the same controller:

```ts
let position: ReturnType<typeof attachGlassOverlay> | undefined;
onMounted(() => {
  if (trigger.value && popover.value) position = attachGlassOverlay(trigger.value, popover.value);
});
onBeforeUnmount(() => position?.destroy());
```

These are lifecycle excerpts: import the framework hooks and core helper, define the refs, and handle element replacement in the app. Svelte actions/onMount and plain HTML use the same mounted DOM API. Core imports are server-safe; attaching requires browser elements. Attach material and motion separately when needed, and clean up their controllers too.

## Boundaries and primary sources

Use a same-document top-layer native popover/dialog or an ordinary fixed surface with no transformed/scaled containing block. The first API supports horizontal writing modes and axis-aligned anchor rectangles; it does not solve arbitrary clipping ancestors, virtual anchors, rotated overlays or browser-specific mobile keyboard behavior. An offscreen anchor can leave the panel clamped to the visible rectangle; the host decides whether to close it without losing a user's draft. Padding is not a hardware safe-area measurement. Do not counter-scale pinch zoom.

The [HTML Popover standard](https://html.spec.whatwg.org/multipage/popover.html) defines native auto-popover visibility, light dismissal and invocation. The host still supplies appropriate semantics. [CSS anchor positioning](https://drafts.csswg.org/css-anchor-position-1/) already provides native placement mechanisms; this helper offers a measured integration path rather than inventing positioning. [CSSOM View](https://drafts.csswg.org/cssom-view/) and [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) distinguish visible bounds and offsets from layout coordinates. Use [Floating UI](https://floating-ui.com/docs/computeposition) or an incumbent headless engine when its broader positioning model is required.

The [working overlay studies](https://wpsydev.github.io/liquid-glass-kit/overlays/) use authored sample data and native controls. Browser observations are recorded separately from unit tests in [VALIDATION.md](VALIDATION.md). Viewport resizing in Chromium does not establish physical iPhone/Android, assistive-technology or software-keyboard certification.
