# Design contract

One typed, bounded configuration exports matching DESIGN.md guidance, scoped theme CSS and this library's roundtrippable JSON manifest. The optional authoring entrypoint can run in Node before deployment; pages can consume the artifacts without loading its JavaScript.

```ts
import { createGlassDesignContract, parseGlassDesignContract } from '@wpsydev/liquid-glass/design-contract';

const contract = createGlassDesignContract({
  name: 'My reading app',
  description: 'A warm reading workspace with restrained signals',
  tokens: {
    colors: { background: '#f5f1e9', foreground: '#262922', primary: '#a34024' },
    fontFamily: 'Georgia, serif',
    spacing: { sm: 8, md: 16, lg: 24 },
    radius: 14,
  },
  material: { appearance: 'light', blur: 16 },
  guidance: ['Keep sustained reading on the opaque page foundation'],
});
const markdown = contract.toDesignMarkdown();
const css = contract.toThemeCSS();
const json = contract.toJSON();
const restored = parseGlassDesignContract(json);
console.log(restored.selector, restored.validate());
```

A build script can write these strings to your chosen paths; the library performs no filesystem/network operations. `parseGlassDesignContract()` accepts only the exporter's version-1 JSON, not arbitrary YAML, third-party DESIGN.md or remote resources.

## Apply the exported theme

Load the portable material CSS, then the generated theme CSS. Put `data-lg-design=contract.id` on the intended container (or surface). Apply `getGlassProps(contract.material)` to semantic surface elements so appearance/variant/corner/accessibility attributes match the generated variables. Import `getGlassProps` from `/material` if needed. The theme uses a generated scoped selector; other page themes are untouched.

The CSS exposes `--lg-design-background`, `--lg-design-foreground`, `--lg-design-primary`, optional accent, font, spacing and radius variables. It applies ink/fill variables to scoped `.lg-glass` surfaces. Font names resolve through the browser; no remote font is fetched. Material refraction remains an explicit experimental choice and requires its existing enhancement/fallback integration.

## Inputs and validation

| Field | Accepted values |
| --- | --- |
| `name` | nonempty single-line text, up to 80 characters |
| `description` | optional single-line text, up to 600 characters |
| colors | required background/foreground/primary, optional accent; opaque #RGB or #RRGGBB |
| `fontFamily` | unquoted comma-separated family names, up to 160 characters |
| spacing | optional xs/sm/md/lg/xl numbers, each 0–256px; defaults 4/8/16/24/40 |
| radius | optional 0–999px; overrides material.radius |
| material | existing typed material options; values normalized by the core |
| guidance | up to 12 single-line instructions, 240 characters each |
| own JSON import | up to 16,384 characters, recognized kind/version only |

Unknown keys, nonfinite values, custom prototypes/accessors, malformed colors and unsafe CSS strings are rejected. Exported Markdown escapes prose. The immutable returned contract has `id`, `selector`, `material`, export functions and `validate()`.

`validate().valid` checks the opaque foreground/background token pair at a 4.5:1 threshold. It does not test translucent rendered pixels or the primary button's foreground. Warnings identify that pair, large blur and experimental refraction. Check actual controls and changing backdrops in your application. Semantic controls, focus, user preferences and device profiling remain host responsibilities.

## Format and discovery

Generated DESIGN.md uses Google's documented alpha frontmatter token sections and eight canonical prose headings. Glass-specific material/motion/mobile/performance instructions stay in prose and the own JSON manifest. No invented Google token fields are emitted. The three original studio documents passed official `@google/design.md@0.4.0` validation with zero errors; each has one optional accent-token orphan warning. [Exact results](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/design-contract-validation.json) and [research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/02-designmd.md) identify sources, hashes and boundaries. That validator is isolated development tooling, never a runtime dependency.

This makes a concrete artifact available to agents in your repository. It does not register your project with an agent, guarantee indexing, install an external MCP service or enforce a design automatically.
