# Native icon actions with one keyboard entry

`attachGlassIconToolbar` adds a roving keyboard entry to an explicitly supplied group of existing native buttons and links. The host owns labels, action handlers, pressed state, disabled activation, dialogs, routing and business values. Arrow focus never executes an action. The module is SSR import-safe; attachment requires a connected client container. Use a release that declares the optional entry and its stylesheet.

```ts
import { attachGlassIconToolbar, getGlassIconActionProps } from '@wpsydev/liquid-glass/icon-toolbar';
import '@wpsydev/liquid-glass/icon-toolbar.css';

// root and actions are existing connected DOM nodes in authored order.
const toolbar = attachGlassIconToolbar(root, {
  items: actions,
  label: 'Poster tools',
  orientation: 'horizontal',
  direction: 'auto',
  wrap: true,
});

// Host changes membership/disabled/hidden state, then tells the controller.
toolbar.refresh();
// Before unmount:
toolbar.destroy();

const boldProps = getGlassIconActionProps({ label: 'Bold', pressed: false });
// Apply to a native button; host click logic owns its real aria-pressed value.
```

Supply 1–32 unique buttons/links in DOM order; three or more related actions are the usual reason to use a toolbar. All group actions must be supplied. Fields, nested composites, nested toolbars and interactive descendants require another keyboard policy and are rejected. A small ordinary button group can retain native Tab behavior instead.

The container receives toolbar role/name/orientation and each action receives an owned tabindex. An authored aria-labelledby relationship retains naming precedence. Tab enters/exits one remembered available stop. Horizontal Left/Right respects explicit/inherited direction; vertical Up/Down respects orientation. Home/End go to available edges. Default wrapping is true. Native Enter/Space/click and ordinary link navigation remain native. Perpendicular keys, modified keys, composition and defaultPrevented events are preserved.

Native disabled and aria-disabled=true actions are excluded, as are detectable hidden/inert actions. Removing an aria-disabled anchor from roving focus does not prevent its native activation; the host must enforce its disabled action contract. `refresh()` is explicit after visibility/disabled/layout changes, including inherited direction. `update(partial)` merges copied configuration and validates new items before mutation. `activeItem` is an inspectable native node or null. No polling or observer is installed.

Before host hide/removal, capture an owned activeElement. Mutate and refresh/update, then restore an available action or explicit outside fallback only if that captured action became unavailable. Browser blur can happen before the controller sees removal, so automatic rescue is best-effort. Do not move focus that was already outside. If no usable action remains, the host owns its outside fallback.

Destroy removes owned listeners/claims and restores attributes only while still owned. External tabindex/role/orientation changes make the controller inert until destroy rather than compete with another focus manager. Preserve those external edits. Native action pressed state is never automatically changed.

`getGlassIconActionProps({ label, pressed?, disabled? })` returns native button props with a stable accessible label. Labelled artwork is decorative: image alt="" with explicit dimensions or SVG aria-hidden=true. Keep readable `.lg-icon-action-label` text for artwork failure/forced colors. The toolbar CSS supplies 44px action targets and explicitly preserves authored hidden actions; visible focus and actual authored cascade still need testing. Material styling remains optional and separate.

No 3dicons images, 3D engine, tooltip or motion renderer ships with this controller. The original Margin demo uses independently drawn vector icons and real local editing actions. W3C-inspired keyboard behavior is not accessibility certification; check actual native keyboard, labels, hidden/dynamic actions, forced colors and target devices separately.
