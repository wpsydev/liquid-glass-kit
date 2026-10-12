# Resource 17: Supahero

Reviewed 2026-10-11 with Exa and native T3 preview. Public gallery entries, two live destinations, and primary scroll/carousel references were inspected. The gallery is a reference library, not an implementation package. Search discovery returned four candidates, checked against canonical live links.

## Two concrete examples

- https://supahero.io/hero/zed is a hero capture dated November 3, 2024. https://zed.dev/ has since changed: its current landing presents Zed Industries, two product choices (Delta and Zed), and a shared interactive product stage. The inspected product selector has a tablist, two tab buttons, and a labeled panel relationship on the selected item. The live page contains three canvases and a detailed sample editor/agent interface. This is evidence for specific product presentation and an inspectable stage, not evidence that our tiny library should recreate its entire editor or canvas implementation.
- https://supahero.io/hero/better-stack is dated October 29, 2024. https://betterstack.com/ currently uses a two-line observability heading, one primary start action, a concise product index, and native horizontal feature-card rows below the hero. Live rows had `overflow-x: auto`, `scroll-snap-type: x mandatory`, smooth scrolling and CSS snap classes. The first rows introduce AI SRE and tracing features through multiple cards. The native snap behavior was established from computed CSS and actual overflowing containers; this audit does not establish physical-device swipe performance or every navigation-control behavior.

The transferable pattern is a strong single story with a compact, user-controlled product stage. The old captures are not proof of present copy, pricing, code, or framework choice. The Supahero homepage contained hundreds of images; do not copy the gallery's full asset load into a first-view hero.

## Distinct independent feature

Add an optional native snap-deck enhancement: `attachGlassDeck(scroller, { items, axis, onChange, reducedMotion })` returning `goTo(index)`, `next()`, `previous()`, `refresh()` and `destroy()`. Author a normal list of useful cards and optional native control buttons; preserve browser wheel/touch scrolling, text selection, links and vertical page scrolling. CSS owns overflow, card sizing and snap positions. The helper tracks the nearest/current item and makes explicit controls work; it does not replace scrolling with a custom drag physics engine.

No autoplay, infinite cloned slides, autoplay restart on focus exit, or hidden copies of links. Keep Previous/Next controls keyboard reachable with predictable disabled edge states. A numbered status should update on settled user navigation, not announce every scroll pixel. Normal list semantics may be simpler than carousel roles for a small horizontally scrollable set of cards. If a host chooses carousel semantics, implement the actual APG contract rather than assigning roles decoratively.

Support unequal-width items, gaps, a resized container, reduced motion, and logical inline direction. Do not assume positive `scrollLeft` or LTR geometry. Restrict `goTo` scrolling to the supplied container rather than unexpectedly scrolling the whole document via an unrestricted scrollIntoView call. A vertical deck is optional and should not trap content taller than its viewport; proximity snapping is a safer authored default for variable reading content than mandatory full-screen paging. Detached items or changed card collections need an explicit refresh path and cleanup.

This differs from the existing tabs, source 01 entrance scroll reveal, source 09 document view transition, and source 10 media policy: it adds native scrollable paging and settled selection, not another animation preset. An original showcase can use three glass feature panels with locally authored SVG instrument views and real action controls, moving through them only on user navigation or a bounded recording tour.

## Primary guidance and performance

- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap documents authored snap positions, scroll-padding and scroll-margin.
- https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event documents settled scrolling and notes that no event fires when position did not change. It is newly baseline for latest browsers; use feature detection and a bounded scroll-debounce fallback for older browsers.
- https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ explains slide/control semantics and the extra requirements if automatic rotation is offered. In particular, automatic rotation must stop on focus and not resume without an explicit request. The proposed first release avoids automatic rotation entirely.

Use native CSS scrolling, one scroll/settle path, one optional resize observation, and geometry reads batched outside repeated writes. No idle RAF, custom pointer-move layout loop, or generated slide clones. Recompute bounds on actual layout changes and coalesce index notifications. Do not preload every image/video in a deck; reuse source 10/11 media/image policies and retain useful poster content. One restrained glass surface per panel is sufficient; do not animate every child filter during scrolling. Benchmark controller scripting separately from GPU/filter/content load. Validate 320 px, landscape, unequal cards, RTL, reduced motion, keyboard traversal, button edge cases, resize while scrolling, detached cards and destroy during a pending settle. Native scrolling does not guarantee zero paint cost or fast performance with arbitrary content.

## Rights and access

Supahero identifies itself as part of Screensdesign and provides public screenshots/contact links. No reusable source-code or asset license was established; attempted public About/Privacy URLs returned not found. Zed's https://zed.dev/terms explicitly distinguishes service terms from separately licensed source code. That does not license all brand assets, screenshots, or hero illustrations. Better Stack's public marketing material is likewise not a supplied component license. No gallery image, canvas source, editor data, template, or paid Screensdesign content was copied. Independently write the deck and all showcased artwork/copy.
