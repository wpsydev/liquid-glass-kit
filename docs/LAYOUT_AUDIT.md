# Inspect an explicit layout scope

Optional `/layout-audit` exports `auditGlassLayout(root, options)`. Import is SSR-safe; calling requires a connected native HTMLElement and its document/window. This is an explicit read-only browser sampler, not a pure server-side layout calculator, crawler, automatic repair tool or accessibility certificate. It adds no stylesheet or runtime dependency.

```ts
import { auditGlassLayout } from '@wpsydev/liquid-glass/layout-audit';

function inspectReview(
  root: HTMLElement,
  saveButton: HTMLButtonElement,
  titleInput: HTMLInputElement,
) {
  return auditGlassLayout(root, {
    targets: [
      { id: 'save', element: saveButton, kind: 'control' },
      { id: 'title', element: titleInput, kind: 'field' },
    ],
    limit: 64, maxReads: 512,
    minTarget: 44, minInputFont: 16,
  });
}
```

The host supplies actual element references and stable non-content IDs. No selectors, DOM names, form values, HTML, screenshots or content text are collected. The sampler never writes DOM/CSS, clicks, moves focus, installs observers/listeners, starts timers/RAF, repairs markup or sends data. Host-authored fixes and report rendering are separate actions. Rerun explicitly after the host changes layout; an old report is a snapshot, not current validation.

Options use ordinary data objects. At most 512 supplied records are accepted; only the first `limit` records are consumed and validated. Limit defaults to 64, integers 1–128; later records are reported unvisited, not implicitly checked. IDs among consumed records are unique, 1–64 printable ASCII characters without whitespace.

Each target defaults to kind `control`. Both element and optional hitArea must be connected native HTML elements inside the supplied root. `hitArea` is an explicit compound/label border box; this declaration does not prove native click association or actual hit testing. `sizeExempt:true` is a host exemption from this library policy, not a WCAG exception verdict.

- Controls compare their supplied border box with the target-size policy. The helper does not infer that a div is a semantic control.
- Fields additionally sample computed font size for supported native text inputs, textarea and select. Hidden, checkbox/radio, button, color and range inputs are not text-field font checks. Meaning, labeling, validation and keyboard behavior remain host-owned.
- Containers report horizontal scroll/client width. `allowHorizontalOverflow:true` marks intentional target-container scrolling as exempt. `allowRootHorizontalOverflow` applies to the root only; viewport overflow remains reported independently.

`minTarget` defaults to 44 and accepts finite 24–128 CSS pixels; `minInputFont` defaults to 16, finite 12–32. `overflowTolerance` defaults to 1, finite 0–16. These configurable library policies do not certify accessibility, evaluate WCAG exceptions or establish physical touch delivery.

`maxReads` defaults to 512, integers 16–4096. It counts explicit style-snapshot/rect calls and numeric dimension reads, not every browser internal operation. Per-call caches share measured styles/rectangles. Ancestor inspection is capped at 16 inclusive nodes, potentially outside root; retained advisories are capped at 256. Style/geometry reads can force synchronous browser layout.

The frozen report contains policy, viewport/root facts, targets, advisories, counts, reads, truncation, truncated, incomplete and limitations. Each target is measured or skipped, with reason, rect, size/font checks, optional overflow, suppliedHitArea, viewportOffscreen and partialClipping. Check values are `within-policy | advisory | exempt | unknown | not-requested`; measured/checked means geometry sampled, not passed accessibility or interaction checks.

Hidden, fully clipped, unsupported, detached, outside-root, unavailable, shadow-boundary and exhausted-budget cases remain skipped/unknown. Partial clipping is advisory/incomplete, with conservative ancestor border-box geometry rather than precise transformed/pseudo-element/irregular hit areas. Viewport-offscreen measurable content is distinct from ancestor clipping; offscreen alone does not prove inaccessibility. aria-hidden and inert alone are not visual invisibility. Slotted/shadow composed-tree visibility is not inferred.

`counts.advisories` counts all generated advisories, including any beyond the retained advisory limit. `truncation` distinguishes target/read/ancestor/advisory limits. Always examine `incomplete`, skipped/unvisited records and limitations alongside advisories. Zero advisories, even with incomplete:false, applies only to this supplied scope/current view; it is not a whole-page, keyboard, contrast, zoom, screen-reader, software-keyboard or phone conformance result.

`site/audit/` contains FitCheck, an original local review form and report workbench. Its cramped fixture intentionally has small targets, small field text and unwrapped overflow. A separate host CSS action fixes the authored layout; the helper only samples again. Actual draft/focus/selection survives, and old reports are marked stale until explicitly rerun. Native label and intentional-scroll declarations are disclosed. Nothing is persisted to a server or repository.

57 focused sampler tests pass. Independent desktop Chromium checks at 320×700, 390×844, 768×1024, 844×390 and 1440×900 matched actual rect/style/root/viewport facts. The four-target cramped fixture reports four configured advisories; the fixed fixture reports zero in that supplied scope. Outer demo controls use 44px targets/16px fields; deliberately small/hidden/clipped examples remain disclosed exceptions. Physical phones, iOS Safari, actual click hit testing, full keyboard task completion and assistive technology remain unverified.

Standalone optional IIFE payload is 9,164 raw / 3,893 gzip bytes. The connected native benchmark uses 32 real fields: one warmup and 100 measured explicit calls, median about 0.10ms/p95 0.30ms at approximately 0.1ms timer resolution. Each call records 106 sampler operations: 33 rects, 67 styles, 6 dimensions. It includes synchronous style/layout queries and report allocation, excludes later painting/GPU/network/application frame rate and is not a comparative speedup. Zero timing samples mean below clock resolution, not zero work. Instrumentation found zero DOM mutations/RAF requests and unchanged counters through a subsequent 250ms idle wait; there is no audit polling.

[Payload](../benchmarks/layout-audit-payload.json) · [Connected sampler scope](../benchmarks/layout-audit-browser.json) · [Layouts](../benchmarks/layout-audit-layouts.json) · [Native workflows](../benchmarks/layout-audit-functional.json) · [Finite tour](../benchmarks/layout-audit-tour.json) · [Media details](campaign/LAYOUT_AUDIT_MEDIA.md)

The original 12-second FitCheck film uses actual six-state sampling and a finite host CSS tour with an original electro 144 metal-synthesis score. Camera density/scrolling and final-frame hold are disclosed; export 30fps is not app FPS. These prepared artifacts do not establish package, demo or social publication; verify the matching released entrypoint before installation.
