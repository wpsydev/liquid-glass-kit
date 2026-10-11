# Intrinsic composition

Optional `/composition` is a pure render-props helper. `/composition.css` supplies scoped layout and typography; neither is part of the root import. Generate props on the server/build when you need no helper JavaScript in the client.

```tsx
import { getGlassCompositionProps } from '@wpsydev/liquid-glass/composition';
import '@wpsydev/liquid-glass/composition.css';

<section {...getGlassCompositionProps({ layout: 'split', ratio: '2:1', density: 'comfortable', measure: 60 })}>
  <figure>{/* Your original artwork */}</figure>
  <article>
    <h2 className="lg-composition-heading">A little room to think</h2>
    <p className="lg-composition-reading">Your real product content.</p>
  </article>
</section>
```

In plain DOM, add `className` through `classList`, set the three returned `data-lg-*` attributes, and apply each `style` custom property with `style.setProperty`. In Vue, bind `class`, the data attributes and `style`; React-style `className` is not a literal DOM attribute. Semantics, focus and application state stay with your authored elements.

`layout`: split (default), stack, cluster, grid. `ratio`: 1:1 (default), 2:1 or 1:2, controlling growth of the first two split children. Extra split children wrap. `density`: comfortable (default), compact or editorial; gaps 1.5rem/.75rem/2.5rem. `measure`: default60, clamped30–90ch. Invalid enum/numeric values use safe defaults. Returned objects are fresh and mutable for host integration.

Split children use intrinsic18rem minima bounded by100%; the named inline-size container collapses their bases below40rem. Grid uses auto-fit18rem tracks bounded by the available space. Logical properties inherit RTL; no node reordering or resize observer is introduced. Inline-size containment requires a host that supplies available width; don't expect a shrink-to-fit container to size itself from its children.

Put heading/reading helpers on descendants, not the container itself. Headings inherit fonts and use `clamp(1.875rem, 1.1rem + 3cqi, 4.5rem)` when supported; otherwise2rem. Short headings balance; paragraphs keep normal browser wrapping and bounded line measure. The nearest eligible inline-size ancestor controls cqi, so another nested container can intentionally change its reference. Reading measure is a maximum, not a promise of a fixed number of characters.

Scoped control helpers preserve44px minimum dimensions independently of density. Hosts remain responsible for labels,16px mobile fields, focus visibility, colors and actual accessibility checks. No font download, material effect, motion controller or runtime dependency is added. Import material CSS separately for glass surfaces. The studio's brief width transition, quiet/solid switches and bookmark are host demonstration behavior, not composition API options.

[Space / Form](https://wpsydev.github.io/liquid-glass-kit/composition/) uses original vector geometry and actual props, including240/480/960px requested nested widths (clamped to available width). [Research](resource-series/research/04-minimal-gallery.md) and [performance record](../benchmarks/composition.json) distinguish inspiration, pure generation, payload and browser rendering. CSS layout changes still cost browser layout/paint; there is no universal speedup claim.
