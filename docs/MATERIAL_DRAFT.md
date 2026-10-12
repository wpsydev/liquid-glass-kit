# Review material intent before applying it

Optional `/material-draft` exports pure `createGlassMaterialDraft(options)`. It stages canonical material options, bounded undo/redo history and before/after preview intent. Imports and calls are SSR-safe with no runtime dependency, DOM controller, network request, storage or source writer. The host renders previews and explicitly applies a prepared request.

```ts
import { createGlassMaterialDraft } from '@wpsydev/liquid-glass/material-draft';

const draft = createGlassMaterialDraft({
  initial: { appearance: 'dark', blur: 18, radius: 24 },
  revision: 'local-r1',
  historyLimit: 24,
});
draft.patch({ blur: 28, radius: 38 });
draft.preview('before');
const review = draft.commit('local-r1');
if (review.ok) {
  // Still review data: material is the pending blur 28, even while preview is before.
  const pendingMaterial = review.request.material;
  const baselineMaterial = review.request.before;
}
```

`initial` uses the canonical `resolveOptions` defaults and bounds. `revision` is an opaque host-supplied tag: 1–96 printable ASCII characters without whitespace. It is not read independently from a server or source repository. `historyLimit` defaults to 32, accepts integers 2–128 and counts the current snapshot. Ordinary data options are required; accessors are rejected and unknown material fields are ignored without reading their values. The model freezes only its own canonical snapshots, not caller objects.

`state` is a getter returning a frozen snapshot: status `editing | prepared | cancelled`, baseRevision, monotonic local draftVersion, before, after, previewMode, previewMaterial, dirty and history position/availability. The original baseline remains available even when bounded history drops older undo entries. A local draftVersion is not an authoritative business revision.

- `patch(options)` merges known fields into the complete pending material. A variant change retains an existing explicit blur; `undefined` resets that field through canonical defaults. Material no-ops are deduplicated. A genuine edit after undo discards the redo branch.
- `undo()` and `redo()` change pending history. `preview('before' | 'after')` changes preview intent only, preserving the pending material and history. A patch returns preview intent to after.
- `commit(expectedRevision)` compares caller-supplied tags. A match seals an immutable `request` as prepared; it does not apply CSS, authorize an action, save data or rewrite source. Request material is always after, including when the active preview is before. A conflict returns `ok:false`, reason `revision-conflict`, supplied/captured tags, null request and preserved state.
- Repeated commit against the same baseline returns the same prepared request. Prepared edits, history changes and preview changes are closed. The host owns consumed-request idempotency and stale UI handling.
- `cancel()` during editing discards pending history and returns baseline preview intent with cancelled status. It cannot roll back an already applied host action or retract a prepared/exported request. A cancelled draft cannot prepare. Create a new draft after preparation/cancellation or a new host revision.

A host-owned local apply may be a separate deliberate function:

```ts
import { getGlassProps } from '@wpsydev/liquid-glass/material';
import type { GlassOptions } from '@wpsydev/liquid-glass/material';
import type { GlassMaterialDraftRequest } from '@wpsydev/liquid-glass/material-draft';

let hostRevision = 1;
let hostMaterial: GlassOptions = { blur: 18, radius: 24 };
function applyPreparedLocally(request: GlassMaterialDraftRequest) {
  if (request.baseRevision !== `local-r${hostRevision}`) return null;
  hostMaterial = request.material;
  hostRevision++;
  return getGlassProps(hostMaterial); // The host deliberately renders these props.
}
```

This synchronous fixture owns its own local data. A real service must independently authorize and atomically check its authoritative revision during apply, including races after preparation. Abort, cancel, review completion and UI animations are not transaction or rollback guarantees. Map camel-case props/custom styles through the host renderer; preserve semantic controls and render review data as escaped text.

`site/material-review/` contains Proof, an original charcoal/cobalt/copper local workbench with actual pending and applied material elements. Native range/select editing, before/after, undo/redo, preparation, explicit local Apply, consumed-request disabling, cancellation and both conflict paths work. Its note node and selection survive staging. This is not a model, backend, persistence or source-editing service.

57 focused model tests pass. Separately, 75 desktop Chromium workflow/viewport cases at 320×700, 390×844, 768×1024, 844×390 and 1440×900 fit without horizontal page overflow, with effective 44px targets and 16px fields. Native typing, range keyboard input, prepare-from-before and explicit local apply were checked. Physical phones, Safari and assistive technology remain unverified.

The standalone optional model IIFE is 3,917 raw / 1,756 gzip bytes including the canonical material resolver/numeric helper. Material CSS is separate. Five Node batches of 4,000 construct/patch/undo/redo/preview/prepare cycles had a 129.44ms median per batch; this pure scope contains no DOM, layout, paint or GPU work. Connected host rendering is separate: 400 reset/preset/prepare/apply cycles, median 15.6ms per 80, including actual demo field/JSON/CSS writes; forced style/layout batches are separately recorded. Idle checks found no RAF/writes, not zero browser rendering cost. No comparative speedup, cold-load, GPU or FPS claim follows.

[Model payload and pure timing](../benchmarks/material-review-payload.json) · [Host scope](../benchmarks/material-review-host.json) · [Native workflows](../benchmarks/material-review-native.json) · [Native actions](../benchmarks/material-review-actions.json) · [Media details](campaign/MATERIAL_REVIEW_MEDIA.md)

The original 12-second Proof film uses a finite actual tour and an original jungle 160 bells/hand-drums/soft-bass score. Camera density and final-frame hold are disclosed; export 30fps is not application FPS. Integration/release publication is separate from these prepared artifacts; verify the matching released package entry before recommending installation.
