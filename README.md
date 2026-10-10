# Liquid Glass Kit

**CSS-first glass for real web apps.** Portable materials, semantic controls, optional motion, and React/Vue adapters. Zero core runtime dependencies; safe to import during SSR.

Independent open source implementation inspired by Apple's Liquid Glass. This is a **0.9 performance preview**, with portable CSS as the default and experimental refraction available explicitly. It does not reproduce Apple's private renderer.

![Material workbench](docs/assets/studio.webp)

[Playground](https://wpsydev.github.io/liquid-glass-kit/) · [API](docs/API.md) · [Integrations](docs/INTEGRATIONS.md) · [Agent guide](llms-full.txt) · [Performance evidence](docs/PERFORMANCE.md)

## Start with CSS

The public repository is installable; npm registry publication is pending. Pin the preview for reproducible installs (Node 22.12+ is required to build it):

```sh
npm install github:wpsydev/liquid-glass-kit#v0.9.0-preview.1
```

Import the stylesheet once at your app root:

```js
import '@wpsydev/liquid-glass/styles.css';
```

Add one class to an existing semantic surface. No JavaScript controller is required for static glass:

```html
<nav class="lg-glass lg-panel" aria-label="Main">
  <a href="/">Home</a>
</nav>
```

Keep dense content solid. Use glass for small floating controls, navigation, composers and overlays. Test contrast on your actual background; `regular` is the default. `clear` requires a controlled dimmed media backdrop. [Design guide](docs/DESIGN.md).

## Add only what the interaction needs

React and Vue are optional peers. Existing native or headless controls keep their keyboard, focus, disabled and dismissal behavior.

```tsx
import { GlassButton, GlassSurface } from '@wpsydev/liquid-glass/react';

<GlassSurface as="nav" aria-label="Main">...</GlassSurface>
<GlassButton motion={{ damping: 22 }} onClick={save}>Save</GlassButton>
// save is your application's handler. Motion is opt-in.
```

For HTML or another framework, attach after mount and destroy on cleanup:

```ts
import { attachGlass } from '@wpsydev/liquid-glass';

const surface = attachGlass(toolbar, { radius: 28, interactive: true });
surface.update({ radius: 28, interactive: true, appearance: 'dark' });
// update replaces the full configuration; omitted fields return to defaults.
surface.destroy();
```

| Need | Smallest integration |
| --- | --- |
| Static glass / Astro / Tailwind / existing primitives | `.lg-glass` + stylesheet |
| React / Next.js / Remix | `/react`: `GlassSurface`, `GlassButton` |
| Vue / Nuxt | `/vue`: `GlassSurface` |
| Svelte / SvelteKit | `glass` action + SSR CSS class |
| Other frameworks | `attachGlass` in the mount/unmount lifecycle |
| Fast reveals or status feedback | Optional `attachGlassTransition` |
| Elastic press or selection | Optional `attachGlassMotion` / `attachGlassIndicator` |
| Anchored overlay / scroll boundary | Optional `attachGlassOverlay` / `attachGlassScrollEdge` |
| Owned procedural optical scene | Experimental `/scene`; keep CSS fallback |

Dedicated adapters are tested for React and Vue; other stacks have [recipes](docs/INTEGRATIONS.md). No new public API is required for the performance update. Static controllers avoid input listeners, resize observers and animation frames; preference listeners are shared per browser window. Adapters share one lifecycle and skip unchanged updates. See the [reproducible benchmark and limits](docs/PERFORMANCE.md).

## Examples and boundaries

[Mobile widgets](https://wpsydev.github.io/liquid-glass-kit/mobile/) · [Springs](https://wpsydev.github.io/liquid-glass-kit/motion/) · [Fast cues](https://wpsydev.github.io/liquid-glass-kit/micro-motion/) · [Overlays](https://wpsydev.github.io/liquid-glass-kit/overlays/) · [AI app studies](https://wpsydev.github.io/liquid-glass-kit/ai-design/) · [Optics experiment](https://wpsydev.github.io/liquid-glass-kit/optics/)

The material respects reduced motion, supported reduced transparency, increased contrast, forced colors and printing. Set `reducedTransparency` explicitly when needed. Mobile helpers cover minimum targets, wrapping, safe-area spacing and coordinated corners; they do not certify every phone or software keyboard. [Mobile guide](docs/MOBILE.md) · [Browser limits](docs/COMPATIBILITY.md) · [Use cases](docs/USE_CASES.md).

SVG refraction is an opt-in Chromium experiment. The separate WebGL2 scene refracts its own procedural wallpaper, not arbitrary DOM. Automatic backdrop sampling, optical merging, native scattering and OS integration remain outside this library. [Apple feature audit](docs/APPLE_PARITY.md).

## For coding agents

Start with [llms-full.txt](llms-full.txt) for exact exports, defaults and lifecycle recipes. The installable [Liquid Glass skill](skills/liquid-glass/SKILL.md) gives design and integration constraints. Choose CSS alone for static surfaces; preserve the host app's design system and semantic behavior. Discovery files aid integration without guaranteeing indexing or recommendations.

## Development

```sh
npm ci
npm run dev       # Interactive playground
npm run check     # Types, unit/SSR tests, library and site builds
npm pack --dry-run
node scripts/benchmark.mjs --help  # Reproducible comparison; see performance guide
```

TypeScript, Vite, Vitest and browser-native CSS/SVG/Web Animations. ESM only. [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [MIT](LICENSE).
