# Resource 27: Kinetics

Reviewed 2026-10-11. Public live gallery, two local interactions, official repository metadata and primary accessibility guidance. No gallery source, snippets or assets copied.

## Observed examples

- [Undo Snackbar](https://kinetics.colorion.co/#library), located by that named card, displays a delete trigger and an Undo action with a draining bar. Its visible parameter is 3000ms. In native collaborative preview, Delete item changed the snackbar to its shown state; clicking Undo removed that state. No actual file deletion or backend exists in this inspected demonstration.
- [Hold to Confirm](https://kinetics.colorion.co/#library), located by that named card, has a native button labelled Hold to confirm and an SVG ring. Its visible parameter is 800ms. A normal native click returned to idle without completion. A separate synthetic pointerdown, 900ms wait and pointerup in the live browser showed holding, then a checkmark/done state before release. That establishes timer-driven preview behavior, not a physical touch test. Support for assistive technology and a non-hold alternative was not established.
- Both examples have separate CSS, React and agent-prompt presentations. These are examples, not an accessibility or performance certification. The [physics section](https://kinetics.colorion.co/#physics) distinguishes stiffness/damping/velocity, but several public CSS examples actually use fixed-duration cubic-bezier transitions. The card-height/max-height examples perform layout work despite the page's generalized compositor claims. Do not repeat those claims in our documentation.

## Distinct optional feature

An independently designed **reversible action window**, useful for removing prompt attachments, archiving local history, dismissing workspace panels or changing a filter. Existing action lifecycle handles pending requests and settlement; it does not restore an already applied host change.

Suggested `createGlassUndo({ apply, undo, commit, timeout: null | milliseconds, onChange })` returns `start()`, `undo()`, `commit()`, `pause()`, `resume()`, and `destroy()`. Use one explicit operation or a small bounded queue, stable host keys and immutable snapshots. Host callbacks perform actual state changes; the controller never invents success or claims to reverse an irreversible network operation. Settlements run once; reject duplicate calls and ignore stale async results. Define what destroy does without silently committing pending work.

Default to a persistent action with no timeout, or retain an equally available non-timed history/restore alternative. An optional visual countdown is not the only undo opportunity. Pause while focus or pointer is inside the actionable notice and when the document is hidden. A native Undo button remains reachable, progress decoration is hidden from assistive technology, and a separate concise status announcement conveys real success/failure. Do not move focus to every new notice. Keep errors visible rather than replacing them with a fake success animation.

An original host-driven demo can remove and restore local panels visibly. Caption it as simulated local state, not a real service integration. Motion uses existing finite material transitions, so the new value is reliable reversible state rather than another spring preset.

## Primary guidance and performance

- [W3C Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) describes disabling, adjusting or extending time limits and an equivalent non-timed alternative. A decorative countdown is not sufficient accessibility support.
- [W3C Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html) favors up-event completion and abort/undo for complex gestures. A hold timer firing before release is unsuitable as an unqualified irreversible confirmation primitive.
- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) covers primary pointers, capture and cancellation; if a future hold option is added, handle lost capture, cancellation, leaving, blur and keyboard alternatives explicitly.

Use one finite timeout based on actual remaining time, not an idle requestAnimationFrame or interval driving framework renders. Countdown decoration can use CSS/WAAPI on a separate layer; disable it under reduced motion. Pause/resume with monotonic elapsed time and clear all listeners/timers. A notice is one bounded glass surface, not one blur layer per particle. Keep the pure state model import-safe in SSR; DOM attachment is optional. Benchmark callback/layout cost separately from any decorative effect.

## Rights and access

The [official public repository](https://github.com/ckissi/kinetics) is linked by the live gallery. Fetches of `LICENSE` and `LICENSE.md` returned not found; [package.json](https://github.com/ckissi/kinetics/blob/main/package.json) has `private:true` and no license field. A public repository and copy-paste marketing are not verified redistribution permission. Use behavior inspiration and independently written code only. No purchase, source download or template media used. Fonts and graphics are not assumed licensed for reuse.

Native observations here are local preview state checks, not performance benchmarks or a full keyboard/screen-reader/mobile audit.
