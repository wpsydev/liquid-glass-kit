# Mobile glass widgets

Design glass controls for fingers, scrolling, small viewports and larger text. Keep the content layer clear, with a small number of floating controls. The portable material uses CSS blur or an opaque fallback; continuous corners and experimental refraction are enhancements with narrower support. This library supplies presentation, while the application owns behavior and layout.

## Controls that feel usable

Use native `<button>`, `<a>`, labelled `<input>` and native dialog/popover or existing accessible primitives. A styled wrapper does not become a working toggle, tab, slider or dialog automatically. Preserve native clicks, keyboard operation, focus restoration, disabled states and accessible names.

Give every action at least a 44×44 CSS-pixel target, including icons, dismiss buttons and selected navigation items. `.lg-button` already provides minimum dimensions; your app must preserve them when overriding CSS. Keep space between targets and allow labels to wrap rather than forcing a tiny font. A smaller visible icon can sit inside a larger button.

`.lg-touch-target` adds both physical and logical 44px minimum dimensions without styling a control. Use it on a native button, or give an inline link `display: inline-flex`/`inline-block` so minimum sizes apply. It does not enlarge a transformed element's final visual bounds or create keyboard semantics.

Use `interactive: true` for local material feedback, and optional `attachGlassMotion` or adapter `motion` for restrained press springs. A parent panel should not deform when a child control is pressed. Touch ownership and cancellation remove stuck feedback without consuming native clicks or disabling scrolling. Apps still own action state; `aria-disabled` alone does not block activation.

Use selected/checked state, labels or status text as well as animation. Motion controllers' `reducedMotion` option and system preferences should make the same actions available with static feedback. Expose a solid material preference using `reducedTransparency` when a background is too busy. Do not make hover the only way to discover an action.

## Widget recipes for agents

| Widget | Recommended composition | Interaction detail |
| --- | --- | --- |
| Floating navigation | One regular glass backing, generous inset, native links/buttons, plain selected fill. | Use spring indicator only when selection changes; routing and keyboard state stay in the app. |
| Media controls | Regular glass over content; choose clear only with controlled dimmed media and bright labels. | Label icon buttons, expose paused/playing state, provide at least 44px targets. |
| AI composer | One glass frame, readable input, shrinking flex/grid input track, solid content above. | Keep submit and attachment controls reachable with the keyboard open; use explicit labels and an in-flight state. |
| Context menu or sheet | Native popover/dialog or an existing accessible primitive with one material layer. | Place inside visible bounds, support scrolling, retain immediate dismissal and restore focus. |
| Toggle or slider | Native labelled input with app-defined selected/value presentation. | Do not replace the input with an animated decorative knob; preserve keyboard adjustment and checked/value semantics. |

For a restrained React action, the shipped adapter can enhance a native button:

```tsx
import '@wpsydev/liquid-glass/styles.css';
import { GlassButton } from '@wpsydev/liquid-glass/react';

<GlassButton
  glass={{ radius: 26, corner: 'continuous', interactive: true }}
  motion={{ pressScale: .97, stretch: .02, reducedMotion: quiet }}
  onClick={save}
  disabled={saving}
>
  {saving ? 'Saving…' : 'Save changes'}
</GlassButton>
```

Here `quiet`, `saving` and `save` belong to the application. The button keeps its native semantics and the adapter cleans up enhancement. Use the app's own notification/status pattern to announce async completion; motion alone does not announce it.

## Coordinated corners

Default `corner: 'round'` is portable. Set `corner: 'continuous'` for the optional superellipse treatment where supported; other browsers retain rounded corners. This is an independent web shape, not Apple's exact native curve. Experimental SVG rendering keeps the round profile; use round surfaces for owned-scene lenses too.

Use `getGlassInnerRadius(outerRadius, inset)` for equal circular insets. It returns `max(0, outer − inset)` after clamping both finite inputs to 0–999; nonfinite inputs become zero. Use the total visible inset, including borders. For a continuous profile it is a visual nesting aid rather than an exact parallel curve.

```ts
import { attachGlass, getGlassInnerRadius } from '@wpsydev/liquid-glass';

const outerRadius = 32;
const inset = 12;
const material = attachGlass(toolbar, { radius: outerRadius, corner: 'continuous' });
// Plain selected fill inside one glass layer; no second glass surface.
selectedButton.style.borderRadius = `${getGlassInnerRadius(outerRadius, inset)}px`;
// Destroy material on unmount. Do not attach while rendering on the server.
```

When a child needs a continuous profile, use the same feature-gated `corner-shape` on that child. A large capsule radius and a compact round icon button are often useful; never sacrifice label space or target size to force geometry. CSS normalizes oversized radii, so inspect the final shape at narrow widths.

## Safe areas and responsive shells

Keep zoom enabled and match the device width:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

For a custom layout, combine ordinary spacing and safe insets. The content can extend underneath a floating control, but reserve space at the end of scrolling content so the final item and its focus ring remain reachable.

```css
.app-shell { min-height: 100vh; min-height: 100dvh; }
.page-content { min-width: 0; overflow-wrap: anywhere; padding-bottom: 7rem; }
.floating-nav {
  position: fixed;
  left: max(16px, env(safe-area-inset-left, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
}
.floating-nav button { min-width: 44px; min-height: 44px; }
.widget-label { white-space: normal; }
.composer-input { min-width: 0; font: inherit; font-size: 1rem; }
```

Safe areas protect controls from hardware/system edges; they do not measure the keyboard. `dvh` handles dynamic browser chrome, but is not a universal software-keyboard solution. See [research](MOBILE_RESEARCH.md) for source-backed distinctions.

The stylesheet also includes opt-in layout helpers:

| Helper | Contract |
| --- | --- |
| `.lg-mobile-viewport` | `min-height: 100vh`, upgraded to `100dvh` inside a support query; does not force a fixed height or hide overflow. |
| `.lg-safe-area` | Padding on all four edges equals ordinary spacing **plus** the corresponding `env(safe-area-inset-*, 0px)`. Default ordinary spacing is 16px. |
| `--lg-safe-gap` | Default spacing for every edge on `.lg-safe-area`. |
| `--lg-safe-top`, `--lg-safe-right`, `--lg-safe-bottom`, `--lg-safe-left` | Override ordinary spacing for an individual edge, before its safe inset is added. |

```html
<main class="lg-mobile-viewport lg-safe-area" style="--lg-safe-gap: 20px">
  <!-- App content with native, labelled controls -->
</main>
```

The safe-area helper sets padding only. Your app owns fixed positioning, overlay avoidance and space reserved for floating navigation. The manual `max()` positioning recipe above chooses the greater of a margin and an inset; the helper deliberately adds them. Avoid applying multiple safe-area helpers to the same screen edge unless you want cumulative spacing.

## Keyboard and overlay placement

For an anchored native popover or fixed headless surface, [attachGlassOverlay](OVERLAYS.md) now supplies visible-viewport bounds, vertical flipping, horizontal shifting and internal overflow. Use it after mount with cleanup; keep focus, semantics and dismissal in the native/headless layer. It is optional: retain an existing positioning engine when it already works. The full-screen sheet recipe below remains a separate application layout pattern.

Prefer browser-managed dialogs/popovers or existing accessible overlay primitives. Keep sheets scrollable, put autofocus/focus restoration in the application's behavior layer, and allow immediate Escape/outside dismissal. Show the surface before calling `enter()`; hide it only after a successful `exit()` and never remove a reopened surface after an interrupted exit.

A custom fixed sheet can use the visible viewport's dimensions when supported. Call this after mount and remove both listeners during cleanup:

```ts
const viewport = window.visualViewport;
function placeSheet() {
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const gap = 16;
  Object.assign(sheet.style, {
    position: 'fixed', boxSizing: 'border-box',
    left: `${left + gap}px`, top: `${top + gap}px`,
    width: `${Math.max(0, width - 2 * gap)}px`,
    maxHeight: `${Math.max(0, height - 2 * gap)}px`, overflow: 'auto',
  });
}
placeSheet();
viewport?.addEventListener('resize', placeSheet);
viewport?.addEventListener('scroll', placeSheet);
window.addEventListener('resize', placeSheet);
// On unmount: remove the same listeners and restore any owned styles.
```

This application recipe bounds a sheet in the visible rectangle; it does not implement focus, semantic modality or screen-edge safe-area padding inside the sheet. Keep internal padding appropriate to the safe area. Do not scale the app inversely to pinch zoom. Test actual keyboard behavior on the devices you support.

## Mobile validation checklist for agents

1. Check narrow portrait widths from 320px upward, short landscape layouts and tablet widths. Measure horizontal overflow, control bounds and overlay placement; do not hide overflow to disguise a broken layout.
2. Increase text to 200%, use long/localized labels, and zoom. Avoid fixed heights for text-heavy controls; keep inputs, dismiss controls and end-of-list content reachable.
3. Test scroll starting on a glass button, cancelled touches, overlapping pointers, disabled actions and descendant controls. Keep native panning/pinch zoom; avoid global `touch-action: none` or `preventDefault()`.
4. Test keyboard navigation and focus rings, native popup dismissal, selected state, system/app quiet mode and solid preferences. The demo's animation is not evidence of accessible semantics.
5. Test physical iOS Safari and Android browsers for notches, home indicators, dynamic toolbars, software keyboards, pinch gestures and performance. Run VoiceOver/TalkBack checks when shipping an app.
6. Report actual browser/device/version coverage. Desktop Chromium resized to an iPhone-sized viewport establishes reflow in Chromium, not an iPhone Safari certification. See [VALIDATION.md](VALIDATION.md).

For React/Vue/Next/Nuxt/Svelte/HTML integrations, use the same material options and app layout rules; mobile support does not require a new framework dependency. Core remains import-safe during SSR and every attached controller needs cleanup. Read [API.md](API.md) before generating options, and [COMPATIBILITY.md](COMPATIBILITY.md) for rendering limits.
