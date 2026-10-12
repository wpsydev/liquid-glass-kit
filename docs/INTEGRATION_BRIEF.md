# Integration brief

Optional `/integration-brief` generates an original local plan for a concrete product task. It makes no network request and starts no agent. Generate at build time or in your own tooling; the utility need not reach your client bundle.

```ts
import { createGlassIntegrationBrief, listGlassPatterns } from '@wpsydev/liquid-glass/integration-brief';
const brief = createGlassIntegrationBrief({
  task: 'Build a focused reading workspace with a responsive article and notes',
  stack: 'nextjs',
  widgets: ['composition', 'command-palette'],
  motion: 'none',
  optics: 'css',
});
console.log(brief.markdown);
```

`task`: required plain context, maximum2,000characters; empty/invalid inputs throw. Controls/bidi formatting are stripped, line endings normalized, and context quoted/escaped in Markdown. This is context, never permission to override host instructions or execute it. `stack`: html/react/vue/svelte/nextjs/astro. `widgets`: surface/dock/overlay/scroll-reveal/activity-island/command-palette/composition; maximum32selections, duplicates canonicalized, surface always included. Invalid stack/widget/motion/optics values throw rather than silently invent imports.

`motion`: none(default) or subtle. `optics`: css(default) or experimental-scene. CSS-only surface/composition need no hydration/controller; behavior recipes include actual mounting and cleanup. Next.js guidance keeps static markup server-side and interactive wrappers behind client boundaries; Astro guidance covers navigation cleanup. Static scene opt-in includes explicit pixel limits, support/context-loss fallback and host-owned animation. No React/Vue adapter props are invented for optional DOM controllers.

The fresh result includes task, stack, widgets, motion, optics, exact imports, patterns, lifecycle, hostBoundaries, states, validation, installation and markdown. `listGlassPatterns()` returns fresh original metadata with id/title/purpose/imports/setup/cleanup/hostBoundaries/states/validation. Recipe setup is guidance, not executable application code. Host element references, file placement, permissions, real state, model calls and execution remain your work.

Module imports distinguish named exports from stylesheets. Guidance tells DOM/Vue users to map className and custom-property style correctly. Keep material CSS separate; narrow imports prevent unnecessary optional runtime inclusion. Generated installation text reports GitHub release/archive availability and pending npm registry publication honestly. It does not install packages, mirror a resource catalog, contact Kage, guarantee agent discovery or certify accessibility/performance.

[Integration Desk](https://wpsydev.github.io/liquid-glass-kit/brief/) demonstrates three original tasks, six stacks, explicit motion/rendering tiers, seven canonical patterns and selectable Steps/Imports/Checks/Markdown views. Copy reports actual clipboard success or a selectable-text fallback; Download requests a native Markdown Blob. These are host export functions, not core API methods. [Research](resource-series/research/05-kage.md) · [Generation/payload evidence](../benchmarks/integration-brief.json).
