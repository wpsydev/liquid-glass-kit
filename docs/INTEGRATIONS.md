# Framework recipes

All examples assume the package is installed and `@wpsydev/liquid-glass/styles.css` is loaded. Material options do not implement dialog/menu state. Use your existing semantic/headless components.

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
