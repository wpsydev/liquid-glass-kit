# Original layered illustration recipes

`getGlassIllustrationScene` is an optional pure, SSR-safe helper for one to eight host-owned image layers. It returns frozen figure/stage/layer/picture/image props, static percentage geometry and declared provenance. It fetches no artwork, parses no SVG/HTML, contacts no catalog/MCP service and creates no animation engine. Use a release that declares `@wpsydev/liquid-glass/illustration`.

```ts
import { getGlassIllustrationScene } from '@wpsydev/liquid-glass/illustration';

const scene = getGlassIllustrationScene({
  id: 'empty-workspace',
  aspectRatio: { width: 4, height: 3 },
  semantics: { kind: 'informative', description: 'A small original house among trees.' },
  layers: [{
    id: 'house',
    image: { src: '/art/our-house.svg', width: 200, height: 180, alt: '', loading: 'lazy' },
    placement: { x: 50, y: 65, width: 38, anchor: 'bottom-center' },
    provenance: { creator: 'Our project', license: 'Our reviewed asset license' },
  }],
});
```

Render a figure from `figureProps`, one child from `stageProps`, then each layer wrapper/picture/image in the supplied order. Native picture sources precede the image. Camel-case image props use the existing responsive-image React/DOM mapping; do not use className or fetchPriority as literal HTML attribute names without mapping them. There is no separate illustration stylesheet; the returned bounded inline styles position the stage/layers. If you use other material/image recipes, import their actual styles explicitly.

The figure is either one informative role=img with its description, or completely decorative with `semantics: { kind: 'decorative' }`. Every layer alt is explicitly empty. Keep actual headings, captions and controls outside the noninteractive image group. No image layer should become a hidden button or contain interactive descendants.

Stage ratio terms are integers 1–32768, with resulting ratio between 1:8 and 8:1. Placement x/y are physical percentages from left/top (0–100); width is 1–100% of stage width. Rotation is -45–45 degrees. Anchors are center, top-left, top-right, bottom-left, bottom-right and bottom-center. Array order controls paint order. Derived height follows the fallback/crop ratio and must stay at most 200% of stage height.

Clipping is the default. `overflow: 'visible'` can overlap surrounding UI; author geometry is not automatically kept inside the stage. The host may choose another authored recipe at its own mobile breakpoint. The reserved stage ratio and explicit native image dimensions help keep geometry stable, but real image bytes, decoding and layout shift require browser validation. Native source/crop/priority validation is reused from responsive-image rather than guessed.

IDs must be stable, safe and unique; the host prevents collisions with other page IDs. Provenance requires bounded creator/license text and optional absolute HTTP(S) sourceURL without credentials/query/fragment. These are caller declarations, not proof of rights or asset ownership. Original project assets are preferable for the demo; external resources still require host review. No Kitbitz art/catalog/platform implementation is included.

The helper installs no listeners, timers, frame runner or per-layer glass effects. Optional finite animation belongs to a separately owned wrapper/controller with effective reduced-motion handling. Do not promise automatic responsive rearrangement, asset discovery, zero decoding cost, rights verification or image-rendering speed from recipe construction timings.
