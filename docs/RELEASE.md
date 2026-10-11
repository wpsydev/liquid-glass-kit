Glass Workbench brings Liquid Glass Kit to developer tools: readable system typography, precise tags, editable CSS, live problems, split terminal histories and a native command palette.

**0.14.0-preview.2** includes the optional dependency-free `/tabs` and `/workbench.css` introduced in the first preview. This audited patch corrects disabled-tab selection events, manual-tab re-entry, palette ArrowUp entry and persisted back-navigation lifecycle. Preview tokens now come from parsed declarations; malformed CSS diagnostics stop collecting at30 before further line counting.

The demo uses CodeMirror and Lezer CSS parsing with two focused lint rules. `lint`, `fix`, `tokens`, `branch name`, `theme` and `split` operate in a local in-memory browser workspace. It does not run an OS shell or Git worktree; reload loses edits. The12-second interactive tour demonstrates real commands and feedback.

Tabs are **1,549 bytes gzip** and optional widget CSS **865 bytes gzip**, measured separately. Five warm native Chrome152 runs of1,000 selections over12 tabs had a6.9ms median synchronous submission cost, with no scheduled animation frames or bounding-rect calls. This excludes paint/compositor/focus/editor cost and is not a speedup claim. Editor/parser dependencies remain larger site-only chunks.

On one deliberately malformed30,000-character CSS input, five paired Node24 runs had median1,467ms before and83ms after while retaining30 diagnostics. This is a scoped linter improvement, not overall app speed. [Raw lint runs](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/workbench-lint.json) · [Module/browser evidence](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/workbench.json).

161 tests, typechecks, packaged SSR imports and15 site builds pass. Native preview checks cover five CSS viewport sizes, editor/terminal/palette interactions and controlled persisted lifecycle events; physical iPhone/Safari/BFCache eligibility is not established.

[Try Code studio](https://wpsydev.github.io/liquid-glass-kit/workbench/) · [Integration guide](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/WORKBENCH.md) · [Validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md).

Install the ready-built archive attached to this prerelease or `npm i github:wpsydev/liquid-glass-kit#v0.14.0-preview.2`. npm registry publication remains pending.
