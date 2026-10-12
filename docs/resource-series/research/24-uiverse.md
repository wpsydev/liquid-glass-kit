# Resource 24: Uiverse

Reviewed 2026-10-11 with Exa and native T3 preview. Two public live loader previews, their page controls/DOM, official loading collections, repository license and primary progress/accessibility guidance were inspected. No account, comment, report, favorite, export, CLI install, purchase, copied CSS/HTML or republished asset was used. Discovery returned five canonical candidates.

## Two actual public live previews

- https://uiverse.io/AHMED-MIT/quick-dragonfly-5 is a circular indeterminate-style loader. Its live shadow-root preview contains a spinner wrapper and twelve child bars with 1 second infinite CSS rotation/translation animation. The sampled nodes had no native progress element, progressbar role or accessible task label. It is decorative waiting motion, not actual task completion data or an execution API.
- https://uiverse.io/nawinasokan/terrible-cheetah-45 is a file-fetching scene with six moving file shapes. Computed CSS showed 3 second infinite flyRight animations; the animation changes left position, scale and opacity. The page exposes native HTML/CSS tabs; CSS activation switches the source-view selection. The preview itself has no task control or native progress semantics. Its fetching-themed copy is illustration, not evidence that files are fetched or an estimate of time remaining.

https://uiverse.io/ui/css-loaders explicitly collects CSS-only loading indicators, while https://uiverse.io/ui/loading-ui covers waiting/progress/microinteraction patterns. CSS-only implementation avoids an animation runtime dependency, but infinite animation and left-position changes can still cost rendering work. Public appearance and popularity are not accessibility or performance certification.

## Distinct independent feature

Add a small optional task-progress view-data helper and scoped CSS around native progress elements: `getGlassProgressProps({ mode, value, max, label, valueText, reducedMotion })`, optionally accompanied by host-owned status/busy-region props. Use an explicit discriminated mode: determinate requires finite actual value/max with max greater than zero and value between zero and max; indeterminate omits the value attribute entirely. Do not represent unknown progress as zero, synthesize percentages from elapsed time, crawl toward 99 percent, or complete merely because an animation finished.

Native label association or aria-label/labelledby must name the actual task. A unit-aware valueText can describe completed files/steps when a percentage is less useful. Keep Cancel/Retry as separate real buttons outside the progress element; descendants of a progressbar are presentational. The host owns execution, cancellation, retries, stage changes, limits and completion receipts. A completed/cancelled/error state should come from a host update and should not automatically invent a 100 percent outcome for incomplete work.

Scope aria-busy to the actual updating region, not the entire page or the status message that needs to announce an error. Present plain useful waiting text even when visual animation is paused/absent. A separate status region may announce stage changes or meaningful milestones; do not announce every numeric update or every CSS loop. Distinguish task completion from meter values such as battery/capacity, which use different semantics.

Use a stable native bar and, optionally, one small original decorative spinner/stripe that runs only while its explicit busy state is active. Reduced motion produces a static indicator plus text. Hidden/offscreen policy should stop unnecessary decoration without pausing the host's real task or lying about its latest state. Pure SSR props/CSS require no observers, timers or DOM work; an optional mounted binder can supply event-driven updates and cleanup, but should not add a second operation runner.

This differs from source 16's asynchronous action lifecycle: that module coordinates invoking/settling an action, while this module describes and styles task progress, including unknown amount and unit-aware known amount. It also differs from source 22 numeric decoration and activity island's display-only inline progress. All can compose through host state without duplicated authorization/execution logic.

An original showcase can show a locally simulated unknown step, a real local asset-count progress update, a host-confirmed completion and a controlled error/cancel state. Label simulations clearly. Do not reuse the fetching-loader art, claim a backend connection, or attach fake speed percentages. A bounded video can show three states while the same real progress element and native controls remain in use.

## Primary references and performance

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress specifies value/max, labeling, indeterminate omission, and scoped busy regions. Text inside progress is fallback content, not its accessible label. To return a previously determinate node to indeterminate, remove its value attribute rather than merely set an undefined-looking property.
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role explains value semantics, unit text and presentational descendants; native progress is preferred when appropriate.
- https://www.w3.org/WAI/ARIA/apg/patterns/meter/ distinguishes range measurements from task progress.
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html covers concise non-focus-stealing progress/results announcements.
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html discusses automatic movement and its essential-activity exceptions. Do not assume every indefinite spinner is essential merely because another part of the page is loading.

Validate/format finite state only on host updates. No per-frame task interpolation, idle RAF or generated delayed fake milestones. Use one small active decoration instead of many animated pieces, avoid left/top/width animation loops and nested backdrop filters, and stop motion on nonbusy/hidden/reduced states. Native progress styling differs by engine; retain useful native/forced-color fallbacks instead of depending on one vendor pseudo-element. Benchmark actual rendering and scripting with explicit numbers of active indicators; a CSS animation is not automatically free. Test indeterminate↔determinate transitions, omitted attributes, zero value, invalid totals, unknown units, localized labels, host error/cancel, announcements, reduced motion, forced colors, SSR and cleanup. Unit tests do not prove physical mobile assistive-technology behavior.

## Rights and access

Both inspected component pages link an MIT license. https://github.com/uiverse-io/galaxy/blob/main/LICENSE is the official repository license, copyright 2023 Uiverse.io. Its README explicitly says the archived UI elements are MIT and encourages author/platform attribution. Substantial reused code would still require the MIT notice; no implementation was copied here. Site branding, advertising, external fonts/images and platform code are separate from an individual licensed UI snippet. Public Terms and Conditions link to https://app.termly.io/document/terms-of-service/bdc0e7cf-cb88-4f24-9cb5-13761e20dedb; guessed local terms URLs did not resolve. No term acceptance, publication or community interaction was performed. Independently author our props/state rules and all visuals, preserving research attribution without presenting community work as ours.
