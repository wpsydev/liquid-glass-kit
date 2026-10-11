# 01 · Scrolltide → scroll reveal

Source list: https://x.com/himanshubuildss/status/2109130327277142377. Resource: https://www.scrolltide.co/.

Reviewed the live homepage and catalog, the public Ora detail page, FAQ and terms. The author of the source post is Scrolltide's founder. The useful pattern is a complete scroll-led story with a deliberate motion sequence and an explicit integration workflow. Catalog counts differ between the cached extraction and live page, so neither is used as evidence of quality or adoption.

The [Ora detail](https://www.scrolltide.co/templates/ora) describes chaptered image-sequence scrubbing. [The public catalog](https://www.scrolltide.co/templates) includes pinned storytelling, layered scenes and presentation entrances. Those establish the interaction territory, not a need to import all of their listed animation engines.

The [FAQ](https://www.scrolltide.co/faq) and [terms](https://www.scrolltide.co/terms) distinguish customer site use from redistribution of prompts, source templates and promotional assets. Our code, artwork, film and soundtrack are independently authored. No purchased prompt, template code, preview video or marketing asset is used.

## Feature selected

Optional `attachGlassScrollReveal` uses a browser-owned ViewTimeline for entry opacity and individual translation. Unsupported environments use a timed IntersectionObserver entrance or static content. The fallback intentionally changes the mechanism rather than installing a continuously polling scroll engine. Focus settles content immediately, reduced motion restores the author presentation, and cleanup removes only owned resources.

The original Fieldnotes study makes three restrained glass surfaces arrive through ordinary native scrolling. Typography and art supply the story; the effect does not animate blur, capture the DOM, decode a video sequence or add a canvas.

## Primary technical references

- [MDN ViewTimeline](https://developer.mozilla.org/en-US/docs/Web/API/ViewTimeline): subject-relative scroll progression, nearest scrolling ancestor and limited browser availability.
- [WebKit animation ranges](https://webkit.org/blog/17184/so-many-ranges-so-little-time-a-cheatsheet-of-animation-ranges-for-your-next-scroll-driven-animation/): entry ranges distinguish the moment an element appears from its later movement through the viewport.
- [Scroll-driven Animations specification](https://www.w3.org/TR/scroll-animations/#view-timeline-ranges): timeline ranges use layout geometry and ignore transforms, allowing translation of the same subject without an injected layout wrapper.

## Performance decision

Only opacity and individual translate are animated. The helper installs no scroll handler, geometry polling or custom requestAnimationFrame loop. Those are implementation/resource observations, not a promise that glass paint becomes free or that every animation is composited. The release records optional bundle size and scoped connected-element setup/cleanup timings separately from rendering. Native timing, fallback behavior, focus and mobile layout require real browser validation in addition to mocked unit tests.
