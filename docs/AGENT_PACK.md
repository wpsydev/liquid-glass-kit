# A scoped guidance plan, not an agent installation

Optional `/agent-pack` exports pure `createGlassAgentPack(options)`. It produces create-only Cursor project-rule and/or portable skill file plans from a caller-checked package catalog. Import and construction are SSR-safe with no runtime dependency. The planner never reads/writes files, fetches docs, installs packages/skills, changes settings/hooks/permissions or verifies client discovery.

```ts
import { createGlassAgentPack } from '@wpsydev/liquid-glass/agent-pack';
import type { GlassAgentPackageCatalog } from '@wpsydev/liquid-glass/agent-pack';

function planProjectGuidance(checkedCatalog: GlassAgentPackageCatalog) {
  return createGlassAgentPack({
    target: 'both', stack: 'react', catalog: checkedCatalog,
    modules: ['./material', './material.css'],
    globs: ['src/**/*.tsx'],
    task: 'Use readable material for the existing toolbar.',
    existingPaths: ['.cursor/rules/liquid-glass.mdc'],
  });
}
```

The supplied catalog requires packageName `@wpsydev/liquid-glass`, exact SemVer `version` (not a range/tag), `verification:'host-checked'` and 1–128 flat export entries. That verification string is a caller assertion, not network verification, proof of export contents, license validation, package publication or npm availability. Optional artifact is bounded plain provenance text. Verify the actual artifact first; a declaration is insufficient evidence.

Each catalog export supplies exact subpath `.` or `./name`, kind `module | stylesheet`, host-declared runtime `css | pure | dom | experimental-webgl`, optional runtimeNames and optional trusted guidance lines. Stylesheets require CSS runtime and a `.css` subpath, with no runtime names. At most 64 unique JavaScript value-export identifiers may be listed per module; **type-only declarations must not be supplied as runtime names**. Generated code uses namespace imports rather than binding those names as values. The host still checks actual API types/defaults/lifecycle; omitted guidance does not imply an invented recipe.

Catalog runtime/guidance is trusted host policy. `task` is separate untrusted context, at most 2,000 characters, normalized and escaped into blockquotes. Quoting does not make it a prompt-injection security boundary and grants no permissions. Ordinary bounded data arrays/objects are required; getters, unknown fields and sparse arrays are rejected.

Target is `cursor | portable | both`; stack is `html | react | vue | svelte | nextjs | astro`. Select 1–16 distinct exact catalog subpaths in the desired reference order. Imports, CSS and prerequisite dependencies are never inferred. Selecting material JavaScript without its required stylesheet yields a warning; select styles deliberately. Reused integration-brief guidance supplies stack lifecycle only, not a second invented API table.

Cursor globs allow at most eight relative scoped patterns, each at most 120 characters, with a literal directory prefix and only `*`/whole-segment `**` wildcard forms. Defaults follow the selected stack, such as React `src/**/*.tsx`/`src/**/*.jsx` and Next.js `app/**/*.tsx`/`src/**/*.tsx`. `globs:[]` omits file-pattern metadata for relevance-based guidance; generated rules always use `alwaysApply:false`. Globs are rejected for portable-only plans. Actual Cursor matcher/loading behavior remains a client-side check.

Outputs use fixed project-relative destinations:

- Cursor root: `.cursor/rules/liquid-glass.mdc`, with selected references under `.cursor/rules/liquid-glass/references/`
- Portable root: `.agents/skills/liquid-glass/SKILL.md`, with selected references under `.agents/skills/liquid-glass/references/`

The frozen plan includes catalogIdentity, selected modules/globs/task, exact imports, generated files/references, conflicts, canCreate and warnings. Files carry ownership `create-only` and status `create | conflict`; contents are at most 20,000 characters each. Existing generator markers never authorize an overwrite.

`existingPaths` is a supplied snapshot of at most 1,024 relative occupied file/symlink paths and exact destination directories. Ordinary parent directories need not be listed. Matching is conservatively ASCII-case-insensitive: conflicts distinguish exact existence, case collision, occupied ancestor and destination-as-container. Any known conflict makes canCreate false, while keeping the full plan inspectable. Paths are bounded and traversal/absolute destinations are rejected. This is not a filesystem probe or sandbox: recheck destinations and exclusively create the reviewed plan through host-authorized code to handle races.

There is no fs writer, agent/client API, global setting, hook, allowed-tools field or permission modification. The host reviews generated text and preserves existing project policy. A downloadable JSON plan is not installed guidance, accepted tool configuration or evidence that an agent obeyed/discovered it.

## Check the final artifact

`site/agent-studio/` contains Dispatch, an original plan-review workbench. Its catalog is generated from declared package exports and actual built Node ESM namespaces for the explicitly selected material/DOM/motion/CSS entries. It reports real create-only conflicts, selected-only references and quoted task context. Its JSON download is a review artifact, with no filesystem install or model execution.

After integrating this entry and the **final root package version/build**, run:

```sh
node scripts/agent-studio-catalog.mjs
node scripts/agent-studio-benchmark.mjs
```

The development catalog script checks actual declared import artifacts, byte hashes and runtime namespace names; CSS is checked as a readable artifact rather than imported in Node. It updates the demo catalog and provenance. This local check is separate from registry/release delivery or actual Cursor/portable-client loading. Regenerate after a version/build change; the preserved isolated catalog is not a substitute for the final root artifact. The benchmark records fresh source/catalog/artifact hashes and explicit inputs. Its accepted original handoff hash is labeled static historical metadata, not a current file verification; no original temporary patch is required.

33 focused planner tests passed, with existing integration-brief tests separate. The release-version study reports 35 desktop Chromium layout cases with real task/caret/conflict/quoted-context/solid/cancel checks. These do not establish physical phones, Safari, assistive technology, an actual installed agent skill or Cursor rule delivery.

Recorded standalone optional ESM payload is 31,500 raw / 11,032 gzip bytes including the reused integration-brief lifecycle dependency. Three Node planner contexts used 80 batches of 100 calls after 20 warmups: median 3.939ms for a three-file rule, 6.311ms for a ten-file dual-target plan and 6.415ms for a conflicted ten-file plan. This pure scope includes copies, generated text and frozen results; excludes DOM, file writing, downloads, client loading, layout and paint. A separate release-version 30-call connected host probe had median 0.1ms/p95 0.4ms including plan+host DOM updates at coarse timer resolution, excluding layout/paint/client work. Final root regeneration may change payload/contents; record those facts rather than claiming a speedup.

[Local catalog evidence](../benchmarks/agent-studio-catalog.json) · [Pure model/payload scope](../benchmarks/agent-studio-model.json) · [Connected host](../benchmarks/agent-studio-host-current.json) · [Layouts](../benchmarks/agent-studio-layouts.json) · [Media details](campaign/AGENT_STUDIO_MEDIA.md)

The original 12-second Dispatch film records a finite actual plan-review tour with an original afro 122 kalimba/wooden-percussion score. Selected catalog version, camera density and final-frame hold are disclosed. Export 30fps is not app FPS. This is an independent Cursor-inspired guidance planner; it neither invokes Cursor nor promises agent discovery. Verify final release/package/demo publication separately from these prepared artifacts.
