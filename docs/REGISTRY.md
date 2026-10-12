# Original recipes with explicit destinations

Optional `/registry` exports pure `createGlassRegistryItem(input, policy)` and `validateGlassRegistryItem(value, policy)`. They produce or check a bounded authored-file subset of the official shadcn registry-item format. Neither reads disk, fetches dependencies, executes source, installs files or publishes a catalog. Import is SSR-safe and runtime dependencies remain zero.

```ts
import { createGlassRegistryItem, validateGlassRegistryItem } from '@wpsydev/liquid-glass/registry';
const policy = { targetRoots: ['components/liquid-glass'] };
const item = createGlassRegistryItem({
  name: 'my-original-surface',
  type: 'registry:style',
  files: [{ path: 'registry/surface.css', target: 'components/liquid-glass/surface.css',
    type: 'registry:style', content: '.my-surface { border-radius: 22px; }' }],
}, policy);
const json = JSON.stringify(item, null, 2);
const check = validateGlassRegistryItem(JSON.parse(json), policy);
```

The host supplies reviewed original or properly licensed source, any needed imports and license notices. Validation checks data and destinations, not what source code does. Review before using a real installer. Passing this subset does not certify safe code, dependency lifecycle scripts, successful shadcn CLI installation or marketplace eligibility.

The item builder supplies `$schema:https://ui.shadcn.com/schema/registry-item.json`; validation requires that exact schema URL. Supported kinds are registry:lib/style/ui/component/file. One to32 files must have explicit relative source and target paths, compatible declared types/extensions and unique case-insensitive destinations. Targets must stay below one of1–8 explicit authorized project roots. Traversal, hidden/encoded/reserved segments, node_modules and secret/package/config destinations reject. This stricter subset deliberately excludes powerful upstream behaviors.

Content is nonempty original text, at most64KiB per file and256KiB total UTF-8 source. Invalid surrogates and NUL reject. Metadata is JSON only, bounded to16KiB serialized,256 values and five nesting levels; the total serialized item is at most1MiB. Plain own data is expected: accessors, unknown fields, sparse arrays and duplicate names reject. Bounds do not turn hostile JavaScript objects into a sandbox; prefer parsed JSON for validation.

Optional title/description/author/docs/categories and metadata are retained with documented bounds. Dependencies/devDependencies require exact npm name@version pins and one classification per package. Registry references must be explicit namespaced items, individually pinned GitHub refs or credential/query/fragment-free HTTPS JSON URLs. A qualified URL or version string is still a declaration, not availability or trust evidence.

Optional `meta.glass` contains an exact semantic `version`, unique `imports` and provenance `repository-release` or `npm-reference`. Imports must belong to the host's explicit `availableExports` snapshot, at most128 entries. The helper never verifies the actual package, repo tag, registry login or publication. Do not infer npm availability from npm-reference metadata. Missing required source and CSS must be supplied separately.

The builder returns frozen owned data with deterministic file/dependency/metadata ordering and throws invalid input. Validator results are frozen `valid:true,item` or `valid:false,issues`, with the first validation issue; validation does not silently repair or strip arbitrary source. Keep generated JSON and reviewed source together.

[Artifact Desk](https://wpsydev.github.io/liquid-glass-kit/registry/) is an original authoring study. Native inputs edit an original CSS or TypeScript recipe; JSON inspection shows the exact artifact. An intentional traversal target blocks export, and Repair explicitly chooses the host's authorized destination. Its declared four-export snapshot is version0.25, not a live query. References are not bundled library source. Download revalidates serialized JSON and hands its Blob to the browser; no installation occurs.

Twenty-three focused tests cover bounds, destinations, dependency pins, snapshots, metadata and SSR. Fifteen native desktop Chromium preset/viewport cases320–1440px fit without horizontal overflow, with44px targets and16px fields. Actual Repair/JSON controls, undeclared-import/latest-version rejection and preserved source editor value/focus/caret were separately checked. The native Download Blob exactly matches shown JSON plus newline and retains the MIT notice; saving to disk is unverified. Physical phones/Safari/AT remain unverified.

Standalone Vite ESM payload4,145bytesgzip. Warmed Node24 create/serialize/parse/validate workloads ran100warmups+25×200operations for each1-file and32-file case: median normalized batch averages0.0859ms and0.8586ms respectively. Source fixture is1,136UTF-8bytes per file. These are pure data workloads, excluding browser rendering, source review, install, network or filesystem, with no comparative speedup or per-call tail claim. [Benchmark](../benchmarks/registry.json) · [Native evidence](../benchmarks/registry-browser.json) · [Research](resource-series/research/19-21st.md).
