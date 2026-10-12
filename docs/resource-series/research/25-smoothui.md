# Resource 25: SmoothUI

Reviewed 2026-10-11. Public documentation, machine-readable catalog, official repository license, and two native collaborative-browser previews. No source or media copied.

## Observed examples

- [AI Conversation](https://smoothui.dev/docs/components/ai-conversation) documents a bounded transcript that follows only while the reader is within 48px of the end. Scrolling away releases it; a labelled jump button returns to the tail. Content changes use an explicit key and ResizeObserver, and reduced motion makes jumps instant. Its [public preview](https://smoothui.dev/preview/ai-conversation?embed=1) actually progresses through thinking, a named tool call, and a response with citation markers. Native inspection found a 384px-high `overflow-y:auto` container and `overscroll-behavior:contain`, plus labelled Copy/Retry/rating buttons. The example fit the container at both 1280px and 390px; therefore release/resume behavior is documented evidence, not a completed native overflow test.
- [AI Response](https://smoothui.dev/docs/components/ai-response) uses actual arriving text, animates only new words, and makes citations without URLs plain text. The [public preview](https://smoothui.dev/preview/ai-response?embed=1) started with a growing paragraph and Replay stream button. Native inspection found a plain paragraph with word spans and no per-word live region. Documentation specifies immediate words and a static caret under reduced motion.
- [Chat template](https://smoothui.dev/docs/templates/chat) identifies its scripted agent as simulation and gives three integration seams for a real model. Its transcript uses AI Conversation. [AI/chat guidance](https://skills.smoothui.dev/docs/ai-chat) also emphasizes preserving reading position and matching actual stream arrival. Treat numerical UX thresholds in this guide as recommendations, not validated library benchmarks.

## Distinct optional feature

An independently implemented **conversation follow controller**, also useful for build logs and agent traces. Existing `scroll-edge` reports geometry but does not preserve follow intent.

Suggested API: `attachGlassFollow(scroller, { content, threshold, onChange })` returning `refresh()`, `jumpToLatest()`, `pause()`, `destroy()`, and a following state. Host appends actual content and chooses when a send should force an explicit jump. The controller never starts a model request, fabricates tokens, moves keyboard focus, or assumes streaming means the reader wants to return to the end.

Measure the old pinned state before content growth; do not decide from the newly increased scrollHeight. Clamp Safari overscroll, tolerate fractional scrollTop, and distinguish programmatic writes from deliberate user scroll. Observe one content wrapper and the viewport; coalesce changed measurements, avoid perpetual animation loops, and offer explicit refresh when observation is unavailable. A native labelled button owns the return action. Preserve ordinary browser anchoring for older history; prepend compensation needs explicit host coordination rather than arbitrary DOM interception.

The host supplies the transcript label, live-region policy, content retention/virtualization, sanitized text, and real completion events. A named `role=log` is appropriate for sequential appended messages; announcing every token is usually distracting. Do not silently turn every generic scroller into a live region.

## Technical references and boundaries

- [Element.scrollHeight](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight): integer dimensions versus fractional scrollTop require tolerance.
- [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver): callbacks can trigger repeated layout; avoid resizing the measured content in response to itself, and disconnect on destroy.
- [ARIA log](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/log_role): sequential order, accessible name, implicit polite announcements.
- [overflow-anchor](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor): browser anchoring and manual compensation must not fight each other.

One observer does not make an unbounded transcript cheap. DOM size, syntax highlighting and streamed markdown remain host costs. Automatic follow should be immediate; smooth scrolling is reserved for explicit navigation and disabled by reduced motion. No dependency on React, Motion, GSAP, or SmoothUI is required. Attachment is explicit and DOM globals stay out of module evaluation.

## Rights and access

[Official repository license](https://github.com/educlopez/smoothui/blob/main/LICENSE) is MIT, copyright Eduardo Calvo. Independently implement the behavior rather than importing its source. Product imagery, branding, third-party content and separate paid items are not presumed covered. Public docs and previews needed no login. The homepage/llms.txt and llms-full catalog showed differing component totals; do not publish a fixed count as verified.

Browser evidence is separate from documentation and unit tests. Two earlier new-tab opens timed out; reusing our own existing research tab succeeded. Short native recording was solely to allow background preview animation to settle and is not a reusable promotional asset.
