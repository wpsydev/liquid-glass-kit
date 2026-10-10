# Designing AI apps with a deliberate point of view

Reviewed on 10 October 2026. Exa returned **68 search results across three research angles**: agent-readable design guidance, maintained accessible primitives, and human control/evidence/recovery patterns. This includes 60 results in the main workstream and eight from the parent agent’s additional app-reference search. These are overlapping candidates, not 68 independently validated resources. The twelve resources below were checked against official documentation, canonical source files, and licenses; package maintenance was checked through GitHub metadata and release endpoints. [Machine-readable research](campaign/ai-design-research.json).

The strongest starting point is a **real task, a specific visual brief, and one reliable interaction foundation**. Make the app's content, density and composition fit its users before adding effects. Liquid Glass supplies a material layer for appropriate controls; it does not choose typography, information architecture, component semantics, or a useful AI workflow.

## Four starters an agent can actually read

| Resource | Integrate into the agent workflow | License and boundary |
| --- | --- | --- |
| [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Name the subject, audience and primary job. Commit palette, type roles, composition and a memorable element derived from that subject; inspect the rendered work against the brief. | This specific folder has an [Apache-2.0 license](https://github.com/anthropics/skills/blob/main/skills/frontend-design/LICENSE.txt). Its [README](https://github.com/anthropics/skills) documents Claude Code marketplace installation. Other folders have different terms. It supplies art direction, not component behavior. |
| [Impeccable](https://impeccable.style/) | Record product facts separately from visual decisions. Choose the surface's mode: persuasion, operation, reading or experience. Use critique, type, layout and polish guidance to review hierarchy, density and rhythm. | [Apache-2.0](https://github.com/pbakaus/impeccable/blob/main/LICENSE), with [notices](https://github.com/pbakaus/impeccable/blob/main/NOTICE.md). Official install: `npx impeccable install`, then initialize context and reload the host. Hooks require host trust. We have researched it, not installed it. |
| [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) | Audit meaningful files for usable focus, native controls, mobile hit areas, resilient content, consistent states and interruptible motion. Convert findings into concrete fixes and browser checks. | The [source rules](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) are [MIT](https://github.com/vercel-labs/web-interface-guidelines/blob/main/LICENSE). The separate agent-skills wrapper has no verified license in this audit. A checklist supports craft; it does not prove taste. |
| [shadcn/ui skills](https://ui.shadcn.com/docs/skills) and [MCP](https://ui.shadcn.com/docs/mcp) | Read actual project configuration before choosing APIs. Search the registry and current docs, then compose existing controls and customize their tokens. | Official source is [MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md); external registries have separate terms. Official skill installation is `pnpm dlx skills add shadcn/ui`. Host setup and local configuration determine availability. |

Impeccable's current [agent skill](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/SKILL.md) and [Operate reference](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/operate.md) make an important distinction: an app can use a familiar type family, compact data and standard affordances deliberately. Display typography and dramatic choreography belong where they serve the surface. Product identity should survive from one screen to another. Its detectors remain opinionated; preserve an explicit design brief and validate actual usability.

Do not replace generic purple cards with a different universal template. A cream background, serif title and orange accent can become just as automatic. Decide from the product's actual subject, content and use scene. A reference image is useful when it explains a composition or behavior; a screenshot directory alone cannot supply semantics, recovery or a maintainable component API.

## Choose one interaction base for the application

| Resource | Best fit for these constraints | Practical limit |
| --- | --- | --- |
| [React Aria](https://react-aria.adobe.com/) | React research workbenches, complex forms and editors needing custom presentation around selection, keyboard and internationalized interactions. Components, contexts and hooks allow different levels of control. | [Apache-2.0](https://github.com/adobe/react-spectrum/blob/main/LICENSE). Latest observed release: [react-aria-components 1.22.0](https://github.com/adobe/react-spectrum/releases/tag/react-aria-components%401.22.0), 9 October 2026. Styling, labels and composed flows remain the app author's work. |
| [Base UI](https://base-ui.com/react/overview/about) | New React apps needing unstyled, composable controls and freedom to use their own CSS. Official docs publish supported React/browser criteria. | [MIT](https://github.com/mui/base-ui/blob/master/LICENSE). Latest observed release: [1.9.0](https://github.com/mui/base-ui/releases/tag/v1.9.0), 9 October 2026. Upstream environment tests are not our device certification. |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Existing Radix apps where reliable dialogs, menus and tabs are already integrated. Preserve that behavior while refining layout and tokens. | [MIT](https://github.com/radix-ui/primitives/blob/main/LICENSE). Repository push observed 9 October 2026; no latest GitHub Release returned. Authors still supply meaningful labels and validate composed workflows. |

The current [shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-07-react-aria) confirms React Aria, Base UI and Radix are separate supported bases; Base UI remains its default. Let project needs and incumbent behavior choose. Combining several overlapping focus/dialog architectures creates work without necessarily improving the interface.

**Other stacks:** Start with native HTML controls and the framework-neutral [WAI-ARIA APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/). APG describes behavior, while its [read-first guidance](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) warns that examples need browser/assistive-technology testing; it is not a production component library. Vue apps can consider unstyled [Reka UI](https://reka-ui.com/docs/overview/introduction), [MIT](https://github.com/unovue/reka-ui/blob/v2/LICENSE), with release 2.11.0 observed on 5 October 2026. Svelte apps can study [Melt UI builders](https://melt-ui.com/docs/introduction), [MIT](https://github.com/melt-ui/melt-ui/blob/develop/LICENSE), but the reviewed docs warn of pre-1.0 breaking changes and the latest GitHub Release observed was 0.86.6 from March 2025. Check version fit and maintenance before adopting. These supplementary references add no adapters or dependencies here.

These are **application integration choices**. The framework's portable CSS core stays free of runtime dependencies; React and Vue remain optional. Plain HTML apps can use native controls and dialogs directly. Adding a headless package cannot by itself improve an app's composition or make an AI output trustworthy.

## Design AI behavior at the point where people act

| Primary resource | Pattern to integrate | Boundary |
| --- | --- | --- |
| [Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/) | Mark AI involvement beside the affected result, offer a concise local explanation, support human editing, and retain a path back to the initial suggestion. | Carbon code is [Apache-2.0](https://github.com/carbon-design-system/carbon/blob/main/LICENSE); its IBM identity is separate. Latest observed release: [11.118.0](https://github.com/carbon-design-system/carbon/releases/tag/v11.118.0), 7 October 2026. Adopt the interaction with this app's own visual system. |
| [Microsoft HAX: Undo automated actions](https://www.microsoft.com/en-us/haxtoolkit/pattern/g9-c-undo-automated-actions/) | Tell the person what changed and which result can be restored. Preserve prior state and make correction efficient. Repeated correction should have an off switch or a better workflow. | A foundational research pattern, published 2021, supported by the [2019 guidelines research](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/). It is not a component library or a promise that external actions are reversible. |

A useful AI interface answers: what inputs are in scope, what happened, what evidence supports it, what can be edited, and what recovery really covers. Design those answers into the task. A generic sparkle badge or animated chat bubble supplies little of that information.

## Real AI applications to study separately

These are interaction references from official product documentation, **not open-source component resources**, endorsement, or claims that we tested the products end to end.

| Workflow and real application | Useful mechanism | Limits to preserve |
| --- | --- | --- |
| Research: [NotebookLM / Gemini Notebook chat](https://support.google.com/gemininotebook/answer/16179559?hl=en) | Visible source selection, quote previews, citations opening original context, and saved output retaining citations. | Current Google help uses the name Gemini Notebook while older links use NotebookLM. Mobile features have limitations; paid desktop agent functions are described as experimental. Citations give a verification path, not proof of correctness. |
| Creative editing: [Photoshop Generative Fill](https://helpx.adobe.com/photoshop/desktop/create-open-import-images/create-images/edit-images-with-generative-fill.html) | A visible selection scopes the change; the user chooses a variation within a non-destructive editing workflow. | A proprietary desktop app, not a portable widget. Preserve the original and show the affected region; results/model availability are not interchangeable with our own implementation. |
| Agent operations: [Claude Code's interaction loop](https://code.claude.com/docs/en/how-claude-code-works), [checkpointing](https://code.claude.com/docs/en/checkpointing) and [permissions](https://code.claude.com/docs/en/permissions) | Interrupt ongoing work, expose scope and inspect changes, with recovery tied to what was actually recorded. | File checkpoints do not reverse shell effects, remote writes, or many subagent edits. An app must label recovery coverage accurately rather than put an Undo button on every operation. |

Two additional primary references connect these patterns to implementation. The [Perplexity streaming citation cookbook](https://docs.perplexity.ai/docs/cookbook/articles/streaming-citations/README) explains collecting every search-result batch and mapping citation numbers by source ID as text arrives. Preserve that evidence relation in the UI; a link resolving successfully still does not prove its claim. This provider-specific API example has no reusable code license verified here.

The [Cursor PR review page](https://cursor.com/docs/cursor-review/pr-page) keeps the diff, discussion, checks and agent help in context. A selected line or range can become specific feedback or an agent prompt. That is a useful operations pattern: show what the assistant is acting on before requesting a change. It is another proprietary product reference, not an app we tested.

## A brief agents can use

```text
Build a [specific workflow] for [specific people] in [real use scene].
The primary task is [one concrete outcome].
Use [chosen existing component base] and preserve its native semantics.
Read the project's design tokens and current component docs before coding.

Choose composition, density, type roles and color from this task's content.
Give one signature detail a reason; keep supporting controls consistent.
Explain why this structure suits the workflow in a short design note.

Make source/input scope visible. Keep generated output editable.
Show useful evidence, honest loading states and a clear recovery path.
State which actions can be undone and which external effects cannot.

Use Liquid Glass on [specific small control layer] above solid content.
Respect reduced motion, readable contrast, keyboard focus and mobile targets.
Check the built result with real content, long labels, errors and small screens.
Report observed browser evidence separately from unit tests.
```

For this repository, extend [DESIGN.md](DESIGN.md), integration recipes and agent guides consistently when adopting a new pattern. Readability and task completion decide where glass belongs. Documentation can help agents choose the library when supplied as context; no install mechanism guarantees discovery, recommendation or adoption.

Source verification notes: Exa surfaced an obsolete Impeccable `source/skills/` path. A direct request returned 404, so it was discarded; the current `.agents/skills/` file returned 200 and identifies version 4.5.2. Source/release dates above are maintenance observations, not performance or popularity measurements. Research introduced no new runtime dependencies, installed skills, hook changes, or library API claims.
