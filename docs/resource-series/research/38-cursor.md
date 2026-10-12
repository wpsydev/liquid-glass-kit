# Resource 38: Cursor

Reviewed 2026-10-12. Official current rules/skills/MCP docs and terms, portable Agent Skills specification, and our existing skill/brief/starter files. No Cursor installation, account connection, generated product code or active client integration.

## Concrete documented workflows

- [Project rules](https://cursor.com/docs/context/rules) are `.mdc` files under `.cursor/rules`, with description/globs/alwaysApply. A plain `.md` in that directory is ignored. Current docs distinguish always-loaded, matching-file, relevance-based and manual rules; `alwaysApply:true` ignores globs/description. Examples show scoped component rules and manual references to canonical templates.
- [Agent Skills](https://cursor.com/docs/context/skills) discovers project `.agents/skills` and `.cursor/skills`, with compatibility for several other clients' skill directories. SKILL.md descriptions are presented first, bodies/reference resources load on demand. Current docs explicitly distinguish local global skills from project skills synced to remote/cloud workers.
- Rules guidance recommends concise actionable scope, under 500 lines, splitting large files and referring to canonical examples rather than copying them. That is a context-budget strategy, not a model token or quality benchmark.
- [MCP docs](https://cursor.com/docs/context/mcp) document tools/prompts/resources and stdio/SSE/Streamable HTTP plus OAuth. No MCP server is currently provided or callable as a library product; a rules bundle must not claim that connecting it installs tools or authorizes operations.

## Existing implementation and independent feature

Our single `skills/liquid-glass/SKILL.md` has useful original constraints but grows with each API. `createGlassIntegrationBrief` produces a task handoff, not scoped client-native project files. `createGlassDesignContract` exports design tokens; source 19 registry artifacts install original UI recipes. None supplies a deterministic client guidance file plan with conflict detection and progressive references.

Propose **scoped agent guidance pack**: `createGlassAgentPack({ stack, modules, globs, target })` returns `{ files, references, warnings, version }`, where each planned file has a relative path, original content, format and create-only ownership policy. A Cursor target emits a small `.cursor/rules/liquid-glass.mdc`; a portable target emits `.agents/skills/liquid-glass/SKILL.md` and short reference files. Reuse current integration recipes/export metadata rather than maintain an inconsistent second API table. Target selection changes file formats, not authorization or model behavior.

Defaults are relevant/path-scoped, not globally always-loaded. Match actual selected stack/client lifecycle and exact published exports, installation boundary and package revision. Keep material fallback/semantics/cleanup guardrails in a short root description and separate scene, accessibility, widget and evidence references. A feature/version catalog must reject invented module names and stale installation snippets. Include clear task keywords for relevance, while stating no agent discovery/search recommendation guarantee.

Validate bounded plain options, enums, module counts, glob lengths and relative output paths; escape YAML/frontmatter/Markdown correctly. Do not let a task string inject allowed-tools, hooks, permission changes, newline metadata or arbitrary file references. Host/private prompts remain quoted context, not appended instructions. No full existing app design guide copied into every rule. Pure output construction remains SSR safe and performs no filesystem/network/client commands.

An eventual CLI may preview/check/write the plan only within a chosen project root. Create-only is default, preserve existing handwritten rules and report conflicts rather than overwriting them. Updates require matching generator ownership/version and a reviewable diff; never replace AGENTS.md, global Cursor settings or team policies. This is distinct from source 37's runnable lint command: the pack routes guidance to the client, while lint performs bounded checks.

## Primary format and validation

[Agent Skills specification](https://agentskills.io/specification) defines name/description constraints, optional compatibility/license metadata and progressive reference directories. Use portable fields unless explicitly targeting a documented client extension. Experimental allowed-tools is unnecessary and omitted. Cursor's documented glob formats/frontmatter define its rule target; this is not a general YAML/parser implementation.

Test output paths, exact imports, escaped hostile strings, selected-only references, generated ownership/conflict handling and byte sizes. A local file-format test does not prove Cursor has loaded the rule or agents obey it. Actual client discovery should be recorded separately when a supported Cursor environment is available. Ship original minimal example packs and document remote/local scope differences.

## Rights/performance/access

[Cursor terms](https://cursor.com/terms-of-service), updated September 3, 2026, retain service rights and restrict service reproduction/reverse engineering/data extraction. We use documented interfaces and original guidance, not product source or marketplace copies. No customer code uploaded, benchmark of Cursor performed or paid account used. A transient Exa transport error recovered on a retry; official docs remained available.

Smaller on-demand files reduce always-loaded bytes, not a guaranteed token/cost/success improvement. No product runtime dependency is added, no IDE is bundled and no external install/indexing action happens from importing this authoring helper. Product/client compatibility remains documented rather than tested here.
