# Fast glass microinteractions

Use motion to explain an appearance, confirm an action or point to an error. `attachGlassTransition` provides short timed effects on an existing visual layer. It uses native Web Animations when available, with immediate final states otherwise. It is optional, dependency-free and safe to import during SSR; attach after mounting DOM refs.

```ts
import { attachGlass, attachGlassTransition } from '@wpsydev/liquid-glass';
import '@wpsydev/liquid-glass/styles.css';

const material = attachGlass(panel, { radius: 20 });
const transition = attachGlassTransition(panel, {
  direction: 'up', distance: 12, duration: 180,
});

// The host makes its existing panel visible first.
panel.hidden = false;
await transition.enter();

// An explicit close may wait for the visual exit.
// A superseding enter cancels this exit, so a reopened panel stays visible.
if (await transition.exit()) panel.hidden = true;

// Teardown: transition.destroy(); material.destroy();
```

`panel` above is the application's mounted HTMLElement. Keep focus, native popover/dialog state, accessible names and dismissal with the app or existing primitive. Opacity zero does not make content inert or remove it from accessibility navigation. For a native popover, keep Escape/outside dismissal immediate; call `enter()` after its open `toggle` and `cancel()` after it closes. A focusable/interactive panel needs the host's actual hidden/inert state when visually exited.

## Options and lifecycle

| Option | Default | Contract |
| --- | --- | --- |
| direction | `up` | `up`, `down`, `left`, `right` describe movement. Up enters from positive Y and exits toward negative Y; left enters from positive X and exits toward negative X. Down/right reverse those signs. These are physical directions, not RTL logical sides. |
| distance | 12 | CSS pixels, finite values clamped to 0–32. Use 0 for a fade without travel. |
| duration | 180 | Milliseconds, finite values clamped to 0–600. A 0 duration settles immediately. Use modest values; no mandatory minimum delay. |
| reducedMotion | false | App preference combines with live `prefers-reduced-motion: reduce`. |

The controller returns `{ enter(), exit(), feedback(kind), cancel(), update(options), destroy() }`.

- `enter()` reveals with a small directional translation and opacity, then restores authored inline fields.
- `exit()` moves in that direction and fades to zero. Its completed endpoint remains until a later enter/cancel/destroy. The host owns semantic hiding/removal.
- `feedback('confirm')` supplies a single restrained scale cue; `feedback('reject')` supplies a small horizontal nudge. They restore the previous stable presentation after finishing. Native disabled and `aria-disabled="true"` suppress feedback. A cue alone is not a save operation or form validation.
- The three effect methods resolve `true` for a completed intended state, `false` when superseded, canceled, disconnected or destroyed. A live reduced-motion preference completes the active intended state immediately. Missing Web Animations and explicit duration 0 also settle immediately.
- One effect runs per controller. A new intent samples the current visual state before canceling the previous effect, avoiding a reset to its original first frame. Timed easing does not preserve physical velocity; use `attachGlassMotion` when that spring behavior matters.
- `cancel()` restores the attachment's original owned inline fields. `update(options)` replaces the previous options for subsequent effects; duration 0 or reduced motion also settles an active effect. Destroy removes listeners and pending work and restores owned values/priorities.

The helper owns individual `translate`, `scale` and `opacity` on this layer. Avoid stylesheet `!important` rules on those properties, which can override Web Animations. Do not animate the same properties with CSS transitions, `attachGlassMotion`, Motion, GSAP, Anime.js or another engine on the same element. Use separate visual wrappers. It installs no blur, scroll gate, animation loop, input interception or autofocus policy. Whole-layer opacity can temporarily change glass backdrop sampling; check the actual surface/background composition.

Direction describes travel rather than an origin edge. For a sheet that enters upward and should return downward, call `update({ direction: 'down', duration: 180, distance: 12 })` before exit. Include every desired option because updates replace the configuration.

## Feedback belongs to a real state change

```ts
const cue = attachGlassTransition(saveButton, { duration: 160 });
saveButton.addEventListener('click', async () => {
  try {
    await saveDocument(); // Your actual application operation.
    status.textContent = 'Saved'; // status uses the app's live-announcement policy.
    void cue.feedback('confirm');
  } catch {
    status.textContent = 'Could not save. Try again.';
    void cue.feedback('reject');
  }
});
```

Define `saveButton`, `status` and `saveDocument` in the host and remove the handler/controller on unmount. Use an inline error near an invalid field and keep a retry path. Sound, color and motion cannot be the only information. Do not celebrate success before an operation has actually succeeded.

## Framework and external toolbox choices

React attaches in `useEffect` to a mounted element ref and returns `destroy` from cleanup. Vue uses `onMounted`/`onBeforeUnmount`; Svelte uses an action or `onMount`; Astro and HTML attach in browser code. These are uses of the same core helper, not new adapter props. Render SSR content visible, then enhance interactions instead of hiding it for hydration.

An existing animation library can keep owning animation. Add `.lg-glass` or `attachGlass` for material and omit this helper on that layer. Use Motion for React layout/presence, GSAP for coordinated timelines, Anime.js for detailed SVG/keyframe work, Rive for stateful vector artwork and Lottie for exported vector playback when those tasks call for them. None is added as a runtime dependency here. Read [the researched toolbox selection](MICRO_MOTION_RESEARCH.md) for official sources, adoption signals and constraints.

Try the [microinteraction studio](https://wpsydev.github.io/liquid-glass-kit/micro-motion/): four directional appearances and two feedback cues on one screen. The authored content is a local UI study; its buttons update demo state, with no connected service. Prefer quiet screens at rest, fast native feedback and a reduced-motion option over autoplaying decoration.

Platform references: [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate), [Animation.finished](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished), [Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel), [reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). Browser evidence is recorded separately in [VALIDATION.md](VALIDATION.md); no physical-device or performance certification is implied.
