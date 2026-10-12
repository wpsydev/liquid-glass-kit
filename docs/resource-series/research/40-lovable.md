# Resource 40: Lovable

Reviewed 2026-10-12. Official current browser-testing/preview/knowledge/visual-edit/best-practice docs and terms, primary DOM/W3C references, plus our existing source lint/contrast/brief APIs. No account, project mutation, customer app, browser-testing service or product source used.

## Two concrete documented workflows

- [Browser testing](https://docs.lovable.dev/features/browser-testing) documents the actual process: screenshots, clicks/form entry, navigation, console/network observations and viewport changes against the currently viewed preview version in a virtual environment. It distinguishes test/live backend environments and authenticated access. The explicit example reproduces a profile-page crash, fixes it and verifies again; this is a documented workflow, not a test we ran.
- [Testing overview](https://docs.lovable.dev/features/testing) distinguishes browser flows from Vitest/React Testing Library/jsdom frontend tests and Deno backend tests. [Preview guide](https://docs.lovable.dev/features/projects/preview) distinguishes an editable preview from a published snapshot, but says backend/data can be shared; test-environment separation depends on the project's setup. A preview is not automatically a disposable backend. Our read-only geometry helper performs neither frontend test execution nor backend actions.
- [Build a real product](https://docs.lovable.dev/tips-tricks/best-practice) uses a concrete photography booking app: session type, available time and real form content, then small verified iterations. Another example groups slots, disables booked slots and confirms the selected booking summary. Real content/states expose layout errors that generic empty cards hide. No example prompt or app design copied into our templates.
- [Knowledge](https://docs.lovable.dev/features/knowledge) distinguishes always-included workspace/project text, currently up to 10,000 characters each, from on-demand skills. Source 38's agent pack already covers scoped/progressive guidance; another knowledge exporter is unnecessary.
- [Edit from preview](https://docs.lovable.dev/features/visual-edit) now documents a preview toolbar replacing the old separate Visual edits experience: select, inline text, annotation and comments. Source 39 already proposes independent pending edit/Apply mechanics and source 36 a native action toolbar. Do not duplicate them or assume older product tutorials are current.

## Important browser-agent limits

Current browser-testing docs say canvas/drawing tools cannot be interacted with, complex uploads/drag/clipboard can be unreliable, subtle visual/color assessment is unreliable, and icon-only buttons are harder than text-labelled ones. External authentication providers have limits compared with the built-in Cloud backend. Desktop virtual mobile-sized screenshots are not physical iPhone/Android tests. A failed automation attempt does not by itself prove a broken application.

Our feature does not log in, click purchases/submit real forms, access authentication or promise to automate these unsupported capabilities. The library must keep semantic HTML above canvas, retain visible labels/focus and record actual interaction verification separately from geometry/unit tests.

## One distinct independent feature

A **bounded rendered-layout audit**, useful to agents, developer tools and original demo validation. Source 37 checks CSS text; source 6 estimates supplied backdrop contrast; integration briefs list tests. No current portable helper measures the actual rendered widget targets and layout in a browser.

Suggested `auditGlassLayout(root, { targets, minTarget: 44, minInputFont: 16, limit, overflowTolerance })` returns local measurements and advisories with viewport/state metadata, checked/skipped counts and an explicit truncated/incomplete flag. Prefer host-supplied target elements/IDs or a tightly bounded widget traversal; do not query every element in an unbounded document. Restrict findings to configured policy: target border-box size, computed editable-field font and unexpected horizontal overflow of declared containers. Do not invent a general accessible-name algorithm, color/contrast checker, safe-area/virtual-keyboard detector or all-phone certification.

Make exemptions explicit for intentional horizontal scrolling, inline links, hidden native controls with visible labels, decorative/unsupported elements and compound hit areas. A small native checkbox's box is not necessarily its full clickable label target. A transformed border box is not proof of the complete hit-test shape; pseudo-elements and irregular shapes need manual checks. Offscreen content in a normal scroller is not automatically inaccessible. Avoid treating opacity-zero or hidden menus as passed visible controls. Unknown/skipped is distinct from clean configured measurements.

The helper is read-only: no style/attribute changes, focus movement, clicks, screenshots, source edits or uploads. Do not collect form values, innerHTML or private content. Host IDs plus numeric geometry are enough. A pure measurement-rule layer can accept supplied values for deterministic testing; a separate DOM sampler measures the current view through ownerDocument. Import remains SSR safe and performs no browser work until explicitly called.

An original QA demo can show an intentionally cramped form, actual measured advisories at several widths, then host CSS fixes and a second measurement. Label results as configured policy checks, not “fully accessible” or “all iPhones passed.” Browser evidence must show the actual viewport and current UI state; the audit does not resize the app or perform complete user flows.

## Primary technical guidance and cost

- [getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) returns viewport-relative border-box bounds including padding/border; scroll and transforms affect interpretation.
- [scrollWidth](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollWidth) measures content width including overflow. Scroll/client widths can include pseudo-elements and rounded dimensions; use a small declared tolerance and intentional-scroll policy.
- [W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) specifies 24×24 CSS pixels with spacing/equivalent/inline/user-agent/essential exceptions. Our 44px recommendation is a library design policy, not that criterion's threshold or an automated WCAG verdict.

Batch bounded style/geometry reads with no intervening writes. No idle RAF, observers or repeated expensive audit after each pointer movement. Expose explicit rerun when a host changes state/width, with record limits and missing-data notes. Measuring layout can force style/layout; benchmark actual synchronous work on representative fixtures and avoid claiming it measures paint/GPU/browser FPS. Mock DOM unit measurements do not establish real-browser results, and a clean audit does not establish keyboard, screen-reader, authentication, contrast or physical-device behavior.

## Rights/access

[Lovable terms](https://lovable.dev/terms) distinguish Customer Data from proprietary Lovable Materials, including product software, UI, documentation, templates and technology. Public docs guide an independently implemented helper; no product code/UI, public customer templates, screenshots or generated projects copied. No Lovable account or backend is connected, no test service called and no active integration claimed. Documentation and public examples were reviewed; actual framework audit implementation/browser testing remain future release work.
