# Resource 03: VibePrompt command palette

Reviewed 2026-10-11. This update is an original implementation of a common interaction pattern, not reuse of the published Tailwind markup or prompt text.

## Evidence

- https://vibeprompts.dev/bonus/bonus-command-palette/ presents a Spotlight-style command search with grouped rows, an empty state, arrow navigation, command activation, backdrop dismissal and an optional Mod+K shortcut. Its public demo/source describes the pattern; visual polish alone does not establish accessible behavior or production execution.
- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ describes editable query behavior, listbox options and active-descendant focus. It specifically cautions against interfering with native text editing. Our query retains plain Home/End editing when nonempty; Ctrl+Home/End navigate boundaries.
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ describes modal focus containment, Escape, labels and invoking-focus restoration. Native `dialog.showModal()` supplies the top-layer and inert page behavior; unsupported browsers receive an explicit capability error rather than a misleading faux-modal fallback.
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal documents the native modality boundary. Native browser validation is separate from jsdom tests, which model only open/close state.

## Shipped behavior

The optional controller owns a native dialog, labeled combobox, named groups and bounded listbox options. It caches normalized catalog text, filters in one pass, updates only old/new active rows on arrows and does no idle animation-frame or geometry polling. Selection is explicit host execution: per-command handlers override the global handler; missing handlers remain unavailable. Replaced catalog entries and detached old rows cannot trigger commands. Pending host work is guarded against duplicate submission, rejected work remains retryable, and stale asynchronous completions cannot close a newer opening.

The original Cutroom showcase is a film-production notebook with system typography, original vector artwork and useful local actions. Commands switch storyboard/sound/delivery pages, mark a review, change the working theme, open a native keyboard guide and rehearse a bounded pending or rejected handoff. Rehearsals are labeled local and do not upload, render films or invoke a remote production service. Opaque and quiet-motion switches change host presentation. A disabled publish command makes the host boundary visible.

## Rights

The reference page carries a 2026 copyright notice. No explicit license granting reuse of its implementation source or prompt was found on the inspected page. No code, prompts, screenshots, logos, music or assets were copied. The controller, notebook, waveform and train-window illustration are original. Standards behavior is implemented independently; the system fonts require no download. Any soundtrack is prepared separately from this reference and requires its own rights evidence.

## Performance and validation limits

Core work is optional and dependency-free; the default library entry remains unchanged. Catalog normalization occurs on updates, not for every row on every keystroke. Default rendered results are 20, capped at 100; this is bounded result rendering, not full list virtualization. Browser benchmarks must state catalog size, matching rows, rendered rows, query, update type, environment and timing scope. Native modal focus containment, mobile layout, IME, touch and assistive-technology behavior need separate browser checks. Unit tests or module gzip size do not certify browser frame rate or universal phone compatibility.

The deterministic demo handle is `window.__commandsDemo`, with reset/open/close/query/select/setView/state methods. It drives the actual controller and host callbacks; it does not fabricate command completion.
