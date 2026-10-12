# Resource 37: Claude Code

Reviewed 2026-10-12. Official product/docs for hooks, skills and memory, current repository terms, plus our actual workbench/starter/agent code. No Claude installation, model request, account connection or copied product code.

## Actual documented workflows

- [Claude Code product](https://claude.com/product/claude-code) and [overview](https://code.claude.com/docs/en/overview) describe a coding-agent environment, not an automatically callable service in this repository.
- [Hooks reference](https://code.claude.com/docs/en/hooks) defines lifecycle events, command stdin JSON, matchers and output decisions. [Hooks guide](https://code.claude.com/docs/en/hooks-guide) contrasts deterministic commands with model-chosen actions and demonstrates post-edit checks. PostToolUse occurs after the tool succeeded; feedback does not undo an edit or supply host authorization. Hook output/configuration is version-sensitive and should be tested in the actual target client before advertising support.
- [Memory](https://code.claude.com/docs/en/memory) now documents CLAUDE.md and AGENTS.md. Both are context, not deterministic enforcement. [Skills](https://code.claude.com/docs/en/skills) documents SKILL.md/frontmatter and on-demand loading, including portable Agent Skills versus Claude-specific extensions. Existing library skill guidance alone does not ensure a check will run.

## Existing implementation and genuine gap

`site/workbench/model.ts` performs actual bounded CSS parser diagnostics and two focused rules, but runCommand works only on an in-memory workspace. It does not read project files, launch an OS shell or persist edits. `package.json` has no bin entry. `site/start/recipes.ts` creates portable starter snippets, and existing skill/design-contract/integration-brief files provide guidance, not a runnable project check. Do not describe the existing workbench as a filesystem CLI or comprehensive linter.

## One independent feature

An **optional real read-only lint command**, with a small explicit hook adapter. Suggested `liquid-glass lint <paths> --format text|json` and `--stdin` support, reporting original rule IDs, source positions, severity and checked/skipped status. Exit codes distinguish clean configured checks, findings and invalid invocation. No fixes, subprocesses, package installation, network calls, settings writes or permission changes by default.

Extract/reuse the existing parser-backed checker rather than create a second regex linter. Keep the 64,000-character input and 30-diagnostic bounds, ensure comments/strings are not property findings, and describe syntax/property-typo/explicit-transition coverage precisely. Prefer a separately bundled developer-tool parser instead of shipping the entire CodeMirror editor or adding a core runtime dependency. Measure the optional command's process startup/payload independently from browser material imports.

An explicit Claude adapter can read the documented PostToolUse JSON, inspect only an eligible CSS file and return plain additional context with real findings. Do not concatenate tool commands, evaluate tool input, auto-approve calls or claim the adapter implements a security boundary. Require bounded stdin, allowlisted tool/event/file shape, canonical project-root containment, file-size limits, explicit symlink policy and bounded output. Skip unsupported files honestly. Diagnostics should not echo private source lines or send them anywhere. A standalone CLI remains useful without any Claude client.

Generated hook configuration is opt-in and reviewable; do not overwrite existing hooks or install global settings. Native lint verification should occur locally against real temporary files/JSON fixtures before claiming adapter compatibility. A real Claude Code hook run is separate evidence and was not performed here. An agent may use the library skill for guidance and the command for deterministic checks; neither certifies rendering, accessibility, all CSS conformance or browser performance.

## Boundaries/performance

Avoid running a whole project build after every token/edit. Match eligible tools and small files, reuse one checker, distinguish skipped from passed and keep process/output costs bounded. A CSS linter cannot validate unknown DOM backgrounds, keyboard behavior or iPhone rendering. Existing AGENTS.md requires a separate native browser validation record. No model token spend or third-party API is required by this feature; Node tooling remains optional and core SSR imports remain untouched.

## Rights/access

[Claude Code repository license](https://github.com/anthropics/claude-code/blob/main/LICENSE.md) retains Anthropic rights and refers use to Commercial Terms. Public docs/config schemas are references, not permission to copy the product. Our checker/adapters/fixtures are original. No Claude SDK or binary is installed, no running product integration has been claimed, and no external configuration changed. Direct markdown fetch returned 403, while official Exa page content was available; no bypass attempted.
