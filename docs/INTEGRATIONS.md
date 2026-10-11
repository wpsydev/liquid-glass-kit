# Framework recipes

The existing examples work with the complete `@wpsydev/liquid-glass/styles.css`. In 0.12, choose `/material.css` for static surfaces and add only needed `/motion.css`, `/indicator.css` or `/scroll-edge.css`. Narrow JS entries reduce the raw import graph; see [LOADING.md](LOADING.md). Material options do not implement dialog/menu state. Use your existing semantic/headless components.

## React / Next.js / React Router

Import CSS at the app root. The `/react` entry includes `use client`. Server pages can render `GlassSurface`; callbacks belong in a client component.

```tsx
'use client';
import { GlassButton, GlassSurface } from '@wpsydev/liquid-glass/react';
export function Controls() {
  return <GlassSurface as="nav" className="lg-panel" aria-label="Actions">
    <a href="/">Home</a>
  </GlassSurface>;
}
export function Action() {
  return <GlassButton glass={{ interactive: true }} onClick={() => alert('Saved')}>Save</GlassButton>;
}
```

Avoid nesting GlassButton in GlassSurface: use a transparent native button inside a glass toolbar instead.

## Vue / Nuxt

Add CSS to Nuxt's css array or import at the app root. Mounted enhancement is automatic.

```vue
<script setup>
import { GlassSurface } from '@wpsydev/liquid-glass/vue';
</script>
<template>
  <GlassSurface as="nav" class="lg-panel" :glass="{ radius: 28 }" aria-label="Main">
    <a href="/">Home</a>
  </GlassSurface>
</template>
```

## Svelte / SvelteKit

The `glass` action returns Svelte's update/destroy lifecycle contract. Class/attributes provide the initial SSR material. The action starts after mount.

```svelte
<script>
  import '@wpsydev/liquid-glass/styles.css';
  import { glass } from '@wpsydev/liquid-glass';
</script>
<nav class="lg-glass lg-panel" data-lg-appearance="light"
  use:glass={{ appearance: 'light', radius: 28, interactive: true }} aria-label="Main">
  <a href="/">Home</a>
</nav>
```

## Astro / static HTML

```astro
---
import '@wpsydev/liquid-glass/styles.css';
---
<nav class="lg-glass lg-panel" aria-label="Main"><a href="/">Home</a></nav>
```

No hydration needed. In a plain HTML app, load the built stylesheet through your bundler or host `dist/styles.css` yourself.

## Solid

```tsx
import { onMount, onCleanup } from 'solid-js';
import { attachGlass } from '@wpsydev/liquid-glass';
function Toolbar() {
  let el!: HTMLDivElement;
  onMount(() => {
    const controller = attachGlass(el, { interactive: true });
    onCleanup(() => controller.destroy());
  });
  return <div ref={el} class="lg-glass lg-panel">Tools</div>;
}
```

## Angular

Import the stylesheet globally. Style `<nav class="lg-glass">` for the CSS-only path. For enhancement, inject `ElementRef`, call `attachGlass` in `afterNextRender` (which skips server rendering), and register `controller.destroy()` with `DestroyRef.onDestroy`. Restrict it to the actual surface rather than a component-wide query. Keep option updates explicit.

## Qwik

Use CSS-only class styling to keep resumability simple. For pointer/lens enhancement, acquire the element with `useSignal`, attach within `useVisibleTask$`, and register cleanup. This intentionally opts that surface into client JS; the core has no Qwik adapter.

## Lit / custom elements

CSS works inside a shadow root when the stylesheet is supplied there. Keep refraction zero inside shadow DOM. Alternatively use the opt-in light-DOM element:

```ts
import { registerGlassElement } from '@wpsydev/liquid-glass/element';
registerGlassElement();
```

```html
<liquid-glass appearance="light" radius="28" style="display: block; padding: 16px">
  <nav aria-label="Main"><a href="/">Home</a></nav>
</liquid-glass>
```

## Tailwind / shadcn / Radix / Base UI

Keep the component's focus/keyboard/portal behavior. Apply `lg-glass` to its existing surface and remove conflicting opaque backgrounds. Use Tailwind for layout; the material class owns its pseudo-element and border radius. Example: `<nav className="lg-glass flex items-center gap-4 p-4">...</nav>`. Prefer CSS variables or the typed options for material tuning. A registry installer is not shipped in this preview.

## Optional motion across stacks

React: `<GlassButton glass={{interactive:true}} motion={{damping:22}}>Save</GlassButton>`.
Vue: `<GlassSurface :glass="{interactive:true}" :motion="{damping:22}">...</GlassSurface>`.

Other frameworks can call `attachGlassMotion(element, {damping:22})` in the same mounted lifecycle as `attachGlass`. Destroy motion before the material. For popup coordination, keep the controller and await `enter`/`exit` completion booleans; the app owns semantic visibility/focus. Existing Svelte/headless components retain their event and keyboard models.

Custom element: `<liquid-glass motion motion-damping="22" reduced-motion>...</liquid-glass>` combines explicit reduced motion with system settings. Motion attributes enhance the wrapper; native semantic children keep their behavior. Preserve static server rendering instead of hiding content until JavaScript starts.

## Anchored popovers across stacks

Use the same `attachGlassOverlay` core controller after refs mount in React, Vue, Svelte, Astro or plain HTML. [OVERLAYS.md](OVERLAYS.md) includes native markup and React/Vue cleanup recipes. This is optional geometry; keep an incumbent headless library’s positioning instead of running two engines. Overlay behavior and accessibility semantics remain with the browser or host.

## Timed microinteractions across stacks

Use `attachGlassTransition(ref, { direction: 'up', duration: 180, distance: 12 })` in the same mounted lifecycle as `attachGlass`, then destroy it before the material. React effects, Vue mount/unmount hooks, Svelte actions and plain HTML use the same core helper; it is not an adapter `motion` prop. Effects resolve completion booleans and remain presentation-only. Read [MICRO_MOTION.md](MICRO_MOTION.md) before coordinating visibility or feedback.

If Motion, GSAP or Anime.js already animates your component, let it continue on its own layer and apply glass as material. Keep this helper or the existing springs on a different wrapper if needed; never run competing translate/scale/opacity owners. Rive/Lottie artwork should sit in a separate artwork layer with semantic HTML controls and static/reduced-motion state. No animation engine is added to the core dependency graph.

## Optional owned visual field across stacks

Import `attachGlassScene` from `@wpsydev/liquid-glass/scene`; attach to a decorative `aria-hidden` canvas after mount and destroy on cleanup. React effects, Vue mounted hooks and Svelte actions use the same controller. Pass `{ field: { count: 3000, motion: 'wave' }, maxDpr: 1.5 }` for decorative instances; the foreground controls remain semantic HTML with the ordinary CSS material. Provide pause and unsupported/context-loss fallback states. `update` replaces all options, so retain the field when updating pause. [SCENE.md](SCENE.md) lists exact defaults, pixel budgets, stats and limits; the canvas samples its owned background, not arbitrary DOM.

## Optional circular fusion across stacks

Use the same `/scene` controller after mount with `{ fusion: { drops }, backdrop: 'studio', paused: true }` when the app owns a decorative glass animation. Each drop is `{ x, y, radius }` in canvas-local CSS pixels; at most eight circles are combined. `backdrop` here selects the scene artwork (`ribbons`/`studio`), unlike the material controller's light/dark tone hint.

```ts
import { attachGlassScene, type GlassSceneDrop } from '@wpsydev/liquid-glass/scene';

const scene = attachGlassScene(canvas, {
  backdrop: 'studio', paused: true, maxDpr: 1.5,
  fusion: { drops: [], smoothness: 32, refraction: 36 },
});
function presentPose(drops: readonly GlassSceneDrop[], seconds: number) {
  scene.setDrops(drops); // copies geometry; does not recreate layout observers
  scene.render(seconds); // explicit submission because the scene is paused
}
// Host supplies presentPose callers.
// Cancel the host timeline/RAF and call scene.destroy() on unmount.
```

`setDrops` is a geometry-only staging method; it does not enable omitted fusion or change its optical settings. Use `update` for full configuration replacement and preserve desired fusion/backdrop/palette fields. React/Vue adapters do not add a fusion prop: attach the optional scene through the host's existing effect/mounted lifecycle. SSR retains static HTML and CSS; no canvas attachment runs on the server. Respect reduced motion in the host choreography as well as the scene, retain explicit pause/solid state, and restore a static/CSS fallback after context loss. The shader supplies neither input hit testing nor focus semantics. Read [SCENE.md](SCENE.md) and [FUSION.md](FUSION.md) before integrating; this does not merge arbitrary page controls or sample their backgrounds.

Caustics (0.13) is an opt-in `/scene` or `/lazy` option, independent of material adapters. Enable `caustics: { intensity: .16, depth: 100, ripple: .5 }` with measured HTML surfaces and an owned canvas; retain semantic HTML/opaque CSS fallback and destroy in the host cleanup lifecycle. `/scene` exports `GlassSceneCausticsOptions` and `GlassSceneCausticEmitter`. `backdrop: "mineral"` adds the dark-teal receiver. Read [CAUSTICS.md](CAUSTICS.md) for all bounds, source geometry, performance tradeoffs and researched limits.


Workbench (0.14): optional `/tabs` exports `attachGlassTabs` and `GlassTabsOptions`; `/workbench.css` adds scoped `.lg-workbench`, `.lg-code`, `.lg-tag`, `.lg-field` and native popover reveal styles. Defaults: activation:'automatic',orientation:'horizontal',loop:true. Author a labelled role=tablist, unique tab ids and separate unique aria-controls panels; nonfocusable-content panels need tabindex=0. Methods select(id,focus=false):boolean, selectedId:string|null, update(replacementOptions), destroy(). Arrow/Home/End navigation skips disabled tabs; manual activation waits for Enter/Space/click; horizontal RTL reverses arrows. Bubbling lg-tab-change detail:{id:string|null,previousId:string|null}; select and disabled-state update emit only on selection changes, including all-disabled null. Manual activation restores the selected Tab entry point when focus leaves the list. Static membership; update after disabling/enabling; destroy and reattach after membership changes. Cleanup restores owned attributes. No layout measurements or animation loop in this controller. Pair existing /indicator, /overlay, /motion and /micro-motion explicitly; no React/Vue prop added. CodeMirror/lint/terminal execution belong to the host app, not core. Read docs/WORKBENCH.md for integration and the demo's bounded in-memory commands.
