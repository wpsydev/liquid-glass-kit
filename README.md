# Liquid Glass Kit

**CSS-first glass for real web apps.** Portable materials, semantic controls, optional motion, and React/Vue adapters. Zero core runtime dependencies; safe to import during SSR.

Independent open source implementation inspired by Apple's Liquid Glass. This is a **0.19 command-palette preview**, with portable CSS as the default and experimental refraction available explicitly. It does not reproduce Apple's private renderer.

![Material workbench](docs/assets/studio.webp)

[Orbit dock](https://wpsydev.github.io/liquid-glass-kit/dock/) · [Code studio](https://wpsydev.github.io/liquid-glass-kit/workbench/) · [Light studies](https://wpsydev.github.io/liquid-glass-kit/caustics/) · [Playground](https://wpsydev.github.io/liquid-glass-kit/) · [Soft Matter](https://wpsydev.github.io/liquid-glass-kit/fusion/) · [Glass flow](https://wpsydev.github.io/liquid-glass-kit/flow/) · [API](docs/API.md) · [Integrations](docs/INTEGRATIONS.md) · [Agent guide](llms-full.txt)

## Start with CSS

The public repository is installable; npm registry publication is pending. Pin the preview for reproducible installs (Node 22.12+ is required to build it):

```sh
npm install github:wpsydev/liquid-glass-kit#v0.19.0-preview.1
```

Import the stylesheet once at your app root:

```js
import '@wpsydev/liquid-glass/material.css';
```

Add one class to an existing semantic surface. No JavaScript controller is required for static glass:

```html
<nav class="lg-glass lg-panel" aria-label="Main">
  <a href="/">Home</a>
</nav>
```

Keep dense content solid. Use glass for small floating controls, navigation, composers and overlays. Test contrast on your actual background; `regular` is the default. `clear` requires a controlled dimmed media backdrop. [Design guide](docs/DESIGN.md).

## Add only what the interaction needs

React and Vue are optional peers. Add `/motion.css` when passing `motion`; `/styles.css` remains the compatible all-helper stylesheet. Existing native or headless controls keep their keyboard, focus, disabled and dismissal behavior.

```tsx
import { GlassButton, GlassSurface } from '@wpsydev/liquid-glass/react';

<GlassSurface as="nav" aria-label="Main">...</GlassSurface>
<GlassButton motion={{ damping: 22 }} onClick={save}>Save</GlassButton>
// save is your application's handler. Motion is opt-in.
```

For HTML or another framework, attach after mount and destroy on cleanup:

```ts
import { attachGlass } from '@wpsydev/liquid-glass/dom';

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
| Proximity magnification for a semantic launcher | Optional `/dock` + `/dock.css`; stable native controls |
| Fast reveals or status feedback | Optional `attachGlassTransition` |
| Elastic press or selection | Optional `attachGlassMotion` / `attachGlassIndicator` |
| Anchored overlay / scroll boundary | Optional `attachGlassOverlay` / `attachGlassScrollEdge` |
| Owned procedural optical scene | Experimental `/scene`; keep CSS fallback |
| Thousands of decorative flowing shapes | Optional `/scene` field: one instanced draw, shader motion, explicit pixel budget |
| Light concentrating behind owned glass controls | Experimental `/scene` caustics: shared refracted mesh, planar receiver, semantic HTML foreground |
| Merging decorative glass droplets | Experimental `/scene` fusion: up to eight owned circular shapes, staged geometry and host-owned choreography |

Dedicated adapters are tested for React and Vue; other stacks have [recipes](docs/INTEGRATIONS.md). Static controllers avoid input listeners, resize observers and animation frames; preference listeners are shared per browser window. Adapters share one lifecycle and skip unchanged updates. See the [reproducible benchmark and limits](docs/PERFORMANCE.md).

## Examples and boundaries

[Mobile widgets](https://wpsydev.github.io/liquid-glass-kit/mobile/) · [Springs](https://wpsydev.github.io/liquid-glass-kit/motion/) · [Fast cues](https://wpsydev.github.io/liquid-glass-kit/micro-motion/) · [Overlays](https://wpsydev.github.io/liquid-glass-kit/overlays/) · [AI app studies](https://wpsydev.github.io/liquid-glass-kit/ai-design/) · [Optics experiment](https://wpsydev.github.io/liquid-glass-kit/optics/)

The material respects reduced motion, supported reduced transparency, increased contrast, forced colors and printing. Set `reducedTransparency` explicitly when needed. Mobile helpers cover minimum targets, wrapping, safe-area spacing and coordinated corners; they do not certify every phone or software keyboard. [Mobile guide](docs/MOBILE.md) · [Browser limits](docs/COMPATIBILITY.md) · [Use cases](docs/USE_CASES.md).

SVG refraction is an opt-in Chromium experiment. Its displacement generation is optimized without changing bitmap bytes. The separate WebGL2 scene caches its own procedural wallpaper, batches decorative stream/wave/orbit instances, and smoothly joins up to eight circular droplets. Fusion uses one shared boundary with edge refraction, specular lighting and optional color dispersion; `setDrops()` stages geometry for host-owned motion. It does not sample arbitrary DOM or replace semantic controls. Native Apple optical grouping, arbitrary DOM merging, native scattering and OS integration remain gaps. [Scene API](docs/SCENE.md) · [Fusion study](docs/FUSION.md) · [Rendering guide](docs/RENDERING.md) · [Apple feature audit](docs/APPLE_PARITY.md).

## Load less at startup

Use `/material.css` for static surfaces, `/material` for pure server-side props, `/dom` for enhancement, and individual helper entries for interactions. `/lazy` imports and mounts optional scene optics only near the viewport or on an explicit request. The complete root and stylesheet stay compatible. [Loading guide and measured payloads](docs/LOADING.md) · [Working loading study](https://wpsydev.github.io/liquid-glass-kit/loading/).

## For coding agents

[Start with a working recipe](https://wpsydev.github.io/liquid-glass-kit/start/): navigation, AI composer and native dialog. Copy HTML/React/Vue snippets or download a self-contained CSS example. The host owns application state and form behavior; the download includes small sample scripts and the MIT notice.

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

## Light studies

Opt-in `caustics` projects refracted mesh light onto the owned scene. Six UI studies explore search, player, dock, range, toast and action. Shared static buffers, one instanced pass and a filtered light receiver keep cost bounded. This is a single-interface planar approximation, not full light transport or DOM capture. [Guide and research](docs/CAUSTICS.md) · [Try the studies](https://wpsydev.github.io/liquid-glass-kit/caustics/).

## Code studio

A glass coding workspace with a real CSS editor, focused live lint rules, two terminal histories, an in-memory branching command set, token preview and native command palette. Optional `/tabs` and `/workbench.css` add reusable developer-tool interactions while the core stays dependency-free. [Guide](docs/WORKBENCH.md) · [Try it](https://wpsydev.github.io/liquid-glass-kit/workbench/).

## Orbit dock

Optional `/dock` adds spring-driven proximity magnification to a row or column of native buttons and links. Visual children lift and scale while their hit areas stay stable; focus provides a keyboard cue, touch keeps stable controls, and reduced motion disables magnification. The controller does not implement navigation or app state. [Integration guide](docs/DOCK.md) · [Try Orbit](https://wpsydev.github.io/liquid-glass-kit/dock/).

## Fieldnotes scroll reveal

Optional `/scroll-reveal` uses a native ViewTimeline where available and a timed viewport fallback elsewhere. Focus exposes content immediately; reduced motion leaves author presentation visible. No custom scroll frame loop or root import cost. [Working study](https://wpsydev.github.io/liquid-glass-kit/scroll/) · [API and boundaries](docs/SCROLL_REVEAL.md).

## Activity island

Optional `/activity-island` and `/activity-island.css` present agent sessions, permission commands, diffs, questions, plans and prompts. Your host supplies state and callbacks; the library performs no execution or uploads. Native controls, responsive sizing, revision guards and cleanup are documented in [the integration guide](docs/ACTIVITY_ISLAND.md).

## Design contract

Optional `/design-contract` exports a typed source of truth for DESIGN.md, scoped CSS and own roundtrip JSON. Generate artifacts during your build to keep the authoring utility out of client bundles. [Integration and limits](docs/DESIGN_CONTRACT.md) · [Token Studio](https://wpsydev.github.io/liquid-glass-kit/design-contract/).

## Command palette

Optional `/command-palette` and `/command-palette.css` provide a native modal combobox for your own actions. Bounded visible results, keyboard/focus handling and async revision guards preserve app control. [API](docs/COMMAND_PALETTE.md) · [Cutroom](https://wpsydev.github.io/liquid-glass-kit/commands/).
