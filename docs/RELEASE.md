Glass Workbench brings Liquid Glass Kit to developer tools: readable system typography, precise tags, an editable CSS surface, live problems, terminal histories and a native command palette.

**0.14.0-preview.1** adds optional `/tabs` for semantic tool panes and `/workbench.css` for native fields, compact tags, focus and brief popover reveals. Tabs support manual/automatic selection, RTL/vertical keyboard navigation, disabled controls and lifecycle cleanup. Root imports, default CSS and runtime dependency requirements stay unchanged; React/Vue remain optional peers.

The interactive demo uses CodeMirror with a Lezer CSS parser and two focused rules. `lint` finds actual diagnostics; `fix` repairs known spans; `tokens` updates a restricted live surface; `branch name` preserves independent in-memory edits. Two terminal histories share this local browser workspace. It does not run an OS shell, Git worktrees, installs, builds or arbitrary supplied code; reload loses edits. The palette and 12-second guided tour demonstrate useful interactions instead of scripted fake compilation logs.

New tabs: **1,467 bytes gzip**; optional workbench CSS: **865 bytes gzip**, measured as individual built artifacts. Five warm native Chrome 152 runs of 1,000 selections over12 tabs had an8.1ms median total synchronous submission cost, with zero scheduled animation frames/bounding-rect calls. Raw ranges include an18.7ms run. This excludes paint, compositor and editor cost and is not a before/after speedup. The editor uses larger, separate site-only chunks; splitting defers its bytes rather than removing them. [Evidence and limitations](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/workbench.json).

[Try Code studio](https://wpsydev.github.io/liquid-glass-kit/workbench/) · [Integration guide](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/WORKBENCH.md) · [Validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md).

Install the ready-built archive attached to this prerelease or `npm i github:wpsydev/liquid-glass-kit#v0.14.0-preview.1`. npm registry publication remains pending.
