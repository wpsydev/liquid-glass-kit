Review the change before it becomes real. **0.55.0-preview.1** adds optional `/material-draft`.

[Proof](https://wpsydev.github.io/liquid-glass-kit/material-review/) stages glass changes, walks Undo/Redo and compares Before/After. Preparing a request preserves the pending After result; a separate host action applies it. Native fields remain editable, and conflicts preserve the draft instead of silently replacing host material.

The pure model reads no DOM and writes no files or network state. Revision tags are local caller data; an actual app owns authoritative server checks, permissions, persistence and idempotency. Canceling a draft does not roll back already applied work.

57 focused tests and75 native desktop viewport workflows passed. Helper1,756gzip bytes. Recorded pure4,000-cycle batches median129.44ms; connected CSS/DOM80-cycle batches15.6ms and forced-layout30-cycle batches8.6ms are separate scopes. No paint/GPU/FPS or speedup claim.

Original twelve-second160BPM airy-bell jungle video. [Guide](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/MATERIAL_DRAFT.md).

Use the archive or `npm i github:wpsydev/liquid-glass-kit#v0.55.0-preview.1`. npm publication pending. Independent v0-inspired review workflow, with no v0 service calls or source rewrite.
