# Magnetic glass dock

`attachGlassDock` adds proximity magnification to native buttons and links. It is an optional presentation helper: each target stays in its original layout position while a dedicated child scales and lifts. Application actions, selection, panel visibility, focus order and link navigation remain host-owned. The independent interaction references desktop Dock magnification; it is not an Apple renderer. [Design rationale and sources](DOCK_RESEARCH.md)

## Use the optional entrypoints

```ts
import { attachGlassDock } from '@wpsydev/liquid-glass/dock';
import '@wpsydev/liquid-glass/material.css';
import '@wpsydev/liquid-glass/dock.css';

const element = document.querySelector<HTMLElement>('#tools')!;
const dock = attachGlassDock(element, { maxScale: 1.5, radius: 110, lift: 14 });

// After adding/removing items or changing disabled state / host layout:
dock.refresh();
// Replaces options; omitted values return to defaults:
dock.update({ maxScale: 1.35, radius: 96, lift: 10 });
// On host unmount:
dock.destroy();
```

```html
<div id="tools" role="group" class="lg-glass tool-dock" aria-label="Workspace tools">
  <button type="button" data-lg-dock-item aria-label="Open notes">
    <span data-lg-dock-visual aria-hidden="true">N</span>
  </button>
  <button type="button" data-lg-dock-item aria-label="Open colors">
    <span data-lg-dock-visual aria-hidden="true">C</span>
  </button>
  <a href="/files" data-lg-dock-item aria-label="Browse files">
    <span data-lg-dock-visual aria-hidden="true">F</span>
  </a>
</div>
```

Use the existing material recipe to configure the shelf's glass appearance; the dock helper does not attach a material or require WebGL. Size and space the original native controls in application CSS, for example:

```css
.tool-dock { display: flex; gap: 12px; padding: 16px; overflow: visible; }
.tool-dock > [data-lg-dock-item] {
  display: grid;
  place-items: center;
  min-width: 48px;
  min-height: 48px;
}
.tool-dock > [data-lg-dock-item]:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
```

Choose `nav` for navigation, or a labelled ordinary group when these controls perform actions rather than navigate. No toolbar, tablist or menu keyboard model is added. The labels above demonstrate accessible names; replace the letters with your own decorative SVG or artwork and retain those names.

## Contract

Each **direct** child marked `data-lg-dock-item` must be a native `button` or `a[href]`. Each item must have exactly one **direct**, noninteractive `data-lg-dock-visual` child with no interactive descendants. Malformed structure throws a `RangeError` before replacing the current attachment. One controller should own each dock.

The helper adds `.lg-dock-visual` and owns three inline custom properties on that child: `--lg-dock-scale`, `--lg-dock-x`, `--lg-dock-y`. `/dock.css` maps them to individual `scale` and `translate`. The child retains ordinary hit testing, so clicking enlarged artwork can bubble to its native button or link; its original target stays in place. Avoid an application `pointer-events: none` override if you want that enlarged artwork to remain clickable. Reserve scale/translate for this controller. If another engine animates this artwork, use another nested layer. Original owned inline values and the child's prior class state are restored by refresh replacement and teardown.

| Option | Default | Behavior |
| --- | --- | --- |
| `maxScale` | `1.65` | Peak scale; clamped to `1–2.25`. Presentation stays within the configured limit, including underdamped spring overshoot. |
| `radius` | `120` | Influence distance along the dock axis, in CSS pixels; clamped to `24–360`. |
| `lift` | `18` | Target visual displacement in CSS pixels; clamped to `0–48`. |
| `orientation` | `'horizontal'` | Horizontal proximity uses x coordinates and lifts upward; `'vertical'` uses y coordinates and lifts rightward. Set the container's actual layout separately. |
| `stiffness`, `damping`, `mass` | `260`, `22`, `1` | Existing bounded spring configuration; see [motion API](API.md). |
| `reducedMotion` | `false` | Explicit neutral scale/lift, combined with the live system reduced-motion preference. |

Mouse/pen proximity and focus can emphasize neighbors. Touch down cancels magnification until subsequent non-touch movement or keyboard interaction. Moving with a pressed pointer does not retarget the dock. Disabled native controls, `aria-disabled="true"`, hidden or zero-size targets receive neutral presentation. For links, the host must still enforce any declared `aria-disabled` behavior; the helper does not intercept activation.

Coordinates are viewport-relative and target rectangles are cached. Resize observation, window resize and captured scroll invalidate geometry. Call `refresh()` after changing item membership, visibility, disabled state or layout that the browser does not report through these routes. It validates and recaptures the complete set; it is not an automatic mutation observer. There is no public pointer-position API, synthetic click, active-item state or selection event.

The spring uses shared scheduling and settles at rest; visibility loss and window blur neutralize presentation. `update()` replaces all options, including omitted defaults. `destroy()` cancels owned work, disconnects observers, removes listeners and restores captured visual state. Importing `/dock` is SSR-safe; attachment requires an element in a browser document. Destroy before removing the host, rather than relying on detachment as lifecycle cleanup.

## React and Vue lifecycle recipes

These recipes use the optional helper directly; no new React/Vue adapter prop or peer dependency is required. Render semantic children with the DOM contract above.

```tsx
import { useEffect, useRef } from 'react';
import { attachGlassDock } from '@wpsydev/liquid-glass/dock';
import '@wpsydev/liquid-glass/dock.css';

function ToolDock() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dock = attachGlassDock(root.current!, { maxScale: 1.5 });
    return () => dock.destroy();
  }, []);
  return <div ref={root} role="group" aria-label="Workspace tools">
    <button type="button" data-lg-dock-item aria-label="Open notes">
      <span data-lg-dock-visual aria-hidden="true">N</span>
    </button>
  </div>;
}
```

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { attachGlassDock } from '@wpsydev/liquid-glass/dock';
import '@wpsydev/liquid-glass/dock.css';
const root = ref<HTMLElement>();
let dock: ReturnType<typeof attachGlassDock> | undefined;
onMounted(() => { dock = attachGlassDock(root.value!); });
onBeforeUnmount(() => dock?.destroy());
</script>
<template>
  <div ref="root" role="group" aria-label="Workspace tools">
    <button type="button" data-lg-dock-item aria-label="Open notes">
      <span data-lg-dock-visual aria-hidden="true">N</span>
    </button>
  </div>
</template>
```

When a framework updates the child list, call `refresh()` after the DOM commit (`useEffect`/`nextTick` as appropriate). Preserve stable keys. Keep icon labels and state available without hover; `aria-pressed`, `aria-current`, panel selection and any announcements belong to the application.

## Orbit showcase

The `site/dock/` showcase is an original creative workspace with a copper solar disc, orbital paths and five tool panels: notes, color, motion, files and export. It uses portable glass CSS and the optional dock controller. Native controls edit the composition and provide client-side downloads; a short optional tour demonstrates those controls. The demo is not an operating-system desktop, remote editor or automatic export service.

Run `npm run dev` and open `/dock/` for a local preview. The showcase's `window.dockDemo` hook exposes `startTour()`, `stopTour()`, `selectTool()`, and readable state for capture/inspection; these are demo helpers, not additions to the library controller. `?film=1` requests the 12-second tour when the page is visible and motion is permitted. Real pointer or keyboard interaction interrupts the tour, and hidden pages or live reduced-motion changes stop it. The tour changes palettes and controls but does not automatically export or claim a download.

Publication, native-browser validation, bundle evidence and the launch film are recorded separately in [DOCK_MEDIA.md](campaign/DOCK_MEDIA.md) and [VALIDATION.md](VALIDATION.md). Do not infer phone/browser support, frame rate or a performance improvement from the film.
