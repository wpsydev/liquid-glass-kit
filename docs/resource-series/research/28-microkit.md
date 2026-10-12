# Resource 28: MicroKit

Reviewed 2026-10-11. Public live component pages, two interactive examples, official repository license and primary numeric-control/accessibility references. No snippets, third-party assets or gallery media reused.

## Observed examples

- [Scrub Number Field](https://microkit.co/components/scrub-number-field) offers drag scrubbing, click-to-type, modifier step speeds, a ruler and boundary feedback. In native collaborative preview, clicking the labelled Opacity textbox focused it; Shift+ArrowUp changed 48 to 58. Typing 150 and pressing Enter settled to 100 and blurred. Inspection found `type=text`, no native min/max/step attributes, a 32px outer frame, 13px input text, and `touch-action:none` on the frame. These are concrete reasons to adapt the behavior to larger mobile targets and native numeric semantics. A physical touch-drag workflow was not tested.
- [Sliding Content Tabs](https://microkit.co/components/sliding-content-tabs) actually changed its content to a reactions summary on native click. The selected attribute changed correctly. ArrowRight left focus/selection on Reactions; the three tabs all had tabIndex 0 and no aria-controls in this inspection. The preview nevertheless contained a tabpanel. This behavior belongs to our existing tabs module, so it is not a distinct new feature for this source.
- [Homepage](https://microkit.co/) distinguishes React/CSS and trigger types, explains per-component dependencies, and intentionally distributes editable files through a registry rather than an npm runtime. Its FAQ acknowledges some components originated from public examples/Webflow exports. This supports explicit dependencies and provenance rather than claiming all gallery content is ours.

## Distinct optional feature

An original **precision number controller** for design tools: material blur, radius, opacity, spacing, duration and other real host values. Source 22 animates numeric output; source 20 provides field semantics. Neither adds optional numeric scrubbing and committed/draft value behavior.

Suggested `attachGlassNumber(input, { handle, decrementButton, incrementButton, min, max, step, pixelsPerStep, onInput, onCommit, onCancel })`. The primary element remains a labelled native `input[type=number]` with name, min/max/step and normal editing/validation. Ordinary tap buttons and direct text entry provide alternatives to drag. A dedicated optional handle owns horizontal scrubbing rather than intercepting text selection or every touch inside the input. Motion decoration goes on a separate ruler layer, never replaces the semantic value.

The controller should maintain a starting value, a finite draft and an explicit commit boundary. Escape/cancel restores the starting gesture without committing a discarded draft. Handle primary pointers only; cancel on pointercancel, lost capture, blur/hidden/destroy, or host disabling. Ignore secondary pointers and non-primary mouse buttons. Rebase when modifier step speed changes so previously travelled distance does not jump tenfold. Clamp and snap relative to min/step with tested decimal precision, negative values and non-integer bases. Do not strip arbitrary characters and accidentally reinterpret an invalid string as a different value. Locale formatting and storage representation are separate explicit host concerns.

Provide mobile controls at least 44px, editable text at least 16px, visible focus, and a visible value label/unit. Avoid `touch-action:none` on the whole input. A dedicated handle can use an appropriate touch-action policy; native page scrolling elsewhere must remain available. Do not hijack wheel scrolling to change values unless the host explicitly requests and tests that mode. Reduced motion removes ruler movement and boundary shake while real values still change.

## Primary technical guidance and performance

- [Native number input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number) provides incremental numeric semantics and constraint validation. Step has a base, and numeric inputs are unsuitable for identifiers such as ZIP codes or card numbers. Client validation does not validate server actions.
- [W3C Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) requires an equivalent single-pointer action; direct text entry can qualify, and keyboard support alone is insufficient.
- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) describes capture and cancellation. The handle must cleanly release capture and restore any temporary styles.
- [W3C Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) is useful guidance if a custom semantic control ever becomes necessary. Prefer native number input rather than adding an incomplete spinbutton role to a text field.

Only active gestures request frames. Coalesce visual updates and host callbacks, keep geometry reads at gesture start/resize rather than each event, and expose commit separately so expensive rendering/network work can happen once. Clamp step/pixel bounds and callback update budgets; do not manufacture frame-rate claims. Numeric functions are pure/SSR safe; attachment uses the input's ownerDocument and creates no global handlers on import. Do not add React, icon or animation dependencies to the portable core.

## Rights and access

[Official repository license](https://github.com/henriquegpb/microkit/blob/main/LICENSE) is MIT, copyright 2026 Henrique Barone. Preserve its notice if source is ever reused; this recommendation calls for independent implementation. The FAQ's third-party adaptation note means imagery and every upstream contribution are not automatically assumed cleared by the site-level statement. Public examples needed no login. No favorites, submissions, external purchase/download buttons or account mutations were used. Sample audience statistics are demonstration data, not evidence of our growth.

Native keyboard/content observations are distinct from documentation, synthetic tests, touch-device tests and performance benchmarks. No copied preview recording is a release asset.
