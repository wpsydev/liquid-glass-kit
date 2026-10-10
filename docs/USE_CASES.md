# Use-case coverage

This matrix covers common application scenarios and explicitly identifies limits. It is not a claim to cover every conceivable UI.

| Scenario | Recipe / material | Integration detail |
| --- | --- | --- |
| Desktop nav, mobile tab bar, dock | Regular nav + lg-toolbar | Preserve links/buttons; selected state belongs to app; account for safe-area-inset-bottom |
| Sticky header | Regular header | Keep content padding and z-index explicit; inspect scrolling backdrop roots |
| Media controls | Clear over a controlled dimmed image/video | Bold bright labels; never assume random media passes contrast |
| AI chat composer | Regular form | Native textarea, label, submit button; solid response content |
| Agent task status / command palette | Regular overlay | Use native dialog or existing headless command UI; keep live status announcements |
| Citations, source/model pickers, popovers | Native popover + optional attachGlassOverlay | Viewport flip/shift/constraints; keep roles, focus, dismissal and keyboard behavior native or in the existing library |
| Menus and tooltips | Style existing headless surface | Keep complete keyboard/hover/focus model and existing positioning engine |
| Modal / sheet | lg-glass on native dialog | showModal gives focus containment and Escape behavior; label dialog; safe viewport dimensions |
| Sidebar / inspector | Regular aside | Use stable appearance across a large surface; do not flip on every pixel |
| Buttons / toggles | Native button + lg-button | Default button type; disabled, aria-pressed, focus ring and >=44px targets |
| Tabs / segmented control | One shared glass container | attachGlassIndicator optionally springs one decorative backing; implement keyboard model in app/headless library |
| Forms / input fields | Solid inputs in glass panel | Glass should not swallow labels/errors or obscure selection |
| Dense tables / dashboards / long text | Solid content; glass toolbar | Avoid repeated blur in every row |
| Toasts / notifications | Existing live-region surface | Preserve announcement semantics; don't move focused controls |
| Scroll edges | attachGlassScrollEdge + separate layer | Scroll-aware soft/hard scrim; keep toolbar and focus above decoration |
| Reduced transparency / high contrast | Explicit solid option + media queries | Preference fallback for browsers without transparency query |
| Touch / mobile | CSS material | Touch press lighting and optional spring deformation; reduced motion overrides; avoid hover-only actions |
| Toast, local reveal, short status feedback | Optional attachGlassTransition | Four physical directions, confirmation/error cues; host owns visibility, semantic state and announcements; no background loop |
| Print | Solid black-on-white CSS | Browser-native print stylesheet |
| SSR / hydration | CSS markup + mounted enhancement | Import-safe core/adapters; deterministic options |
| Portals | Attach after portaled element mounts | Clean up when portal unmounts; definitions live in owning document |
| Iframes | Element owning document | Supports document/window ownership; do not access cross-origin frames |
| Shadow DOM | CSS-only path | Provide stylesheet inside shadow root; experimental document filter IDs not certified |
| Strict CSP | Static class + external CSS | Omit refraction unless bitmap/style policy permits it |
| Canvas / WebGL app | CSS overlay controls or optional procedural scene | Owned-scene refraction only; external texture rendering remains future work |
| Thousands of decorative flowing shapes | Optional /scene field | GPU instancing, deterministic stream/wave/orbit motion, shared wallpaper and explicit pixel budget; retain semantic controls outside the canvas |
| Merging decorative glass droplets / owned animated artwork | Optional /scene fusion | Up to eight circular shapes form one smooth boundary; stage copied CSS-pixel geometry with setDrops, render explicitly while paused, and retain host-owned choreography, foreground semantics and fallback |
| Native React Native / Expo | Out of web scope | Use native material primitives; web exports need DOM |

## Native dialog recipe

```html
<button id="open">Open preferences</button>
<dialog id="preferences" class="lg-glass lg-panel" aria-labelledby="heading">
  <form method="dialog">
    <h2 id="heading">Preferences</h2>
    <p>Keep essential text on a readable surface.</p>
    <button class="lg-button">Close</button>
  </form>
</dialog>
<script>
  document.querySelector('#open').addEventListener('click', () =>
    document.querySelector('#preferences').showModal());
</script>
```

## AI composer recipe

```html
<form class="lg-glass lg-panel" aria-label="Message composer">
  <label for="prompt">Your message</label>
  <textarea id="prompt" name="prompt" rows="3" required></textarea>
  <button type="submit" class="lg-button">Send</button>
</form>
```

Supply your app's submit behavior; the material library does not call models, add telemetry, or create backend dependencies.

For spring appearance, enhance the native surface with attachGlassMotion and show it before enter(). An explicit close can await exit() before hiding, while retaining native Escape/outside dismissal. Do not assume opacity zero removes focus or accessibility exposure; that state belongs to the host. The motion helper also works with existing menu/sheet components but supplies no headless state or focus model.
