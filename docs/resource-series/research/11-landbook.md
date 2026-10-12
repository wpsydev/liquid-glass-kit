# Resource 11: Landbook

Reviewed 2026-10-11 using Exa and native T3 preview. Only public previews, metadata and linked public websites were inspected; paid full/mobile/history/download content was not accessed.

## Two concrete references

- https://land-book.com/websites/100924-nossara-imabari-towels-made-in-japan credits Vitrea Studio and links the public https://nossara.com/ shop. The reference is photography-led with product images, calm surfaces and restrained product metadata. The public original site was inspected without copying assets.
- https://land-book.com/websites/100901-ai-agents-for-enterprise-customer-service-parloa links https://www.parloa.com/ and categorizes the landing page's background media and product cards. Its full preview/history content is gated; this audit does not claim to have reviewed those flows.
- On https://land-book.com/, the two inspected gallery cards declare 600×900 image dimensions, `srcset`, and a responsive `sizes` expression using viewport width on narrow screens and 600px otherwise. They used eager loading. Other menu previews used lazy/async loading; those observations are distinct contexts.

## Independent feature proposal

Add a pure optional responsive-image/media-frame helper: `getGlassImageProps({ src, candidates, sizes, width, height, alt, priority, focalPoint, fit })`, plus an original `<picture>` art-direction recipe and scoped frame CSS.

It should preserve native semantic images, captions and declared aspect ratios, generate deterministic width-descriptor source sets from supplied URLs, require meaningful alt handling, expose explicit critical versus below-fold loading and keep a focal subject visible when a glass media card changes shape. This complements source10's playback lifecycle coordinator; it does not control video decoding or import gallery content.

Do not guess missing image dimensions, invent transformed image URLs or imply an image/CDN optimization service. A source-set candidate must exist. `sizes` should reflect the actual authored layout, not a universal default. Critical hero images should not be indiscriminately lazy-loaded; priority is a hint, not guaranteed network scheduling. Use object-fit/position on the image rather than the picture wrapper.

## Performance and demo

Pure SSR-safe attribute generation and CSS framing require no runtime dependency, observers or idle frames. Original demo: the same supplied illustration/product photo retains its focal point across portrait/landscape cards; show selected source width and measured reserved space under cold-cache loading. Measure bytes, selected asset, load/decode time and layout shifts separately. Declared dimensions reduce one source of shifts but do not establish zero page/field CLS. Benchmark with explicit viewport/DPR/source sizes; do not assume AVIF or a larger asset always wins.

## Primary technical sources and rights

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
- https://web.dev/articles/optimize-cls
- https://land-book.com/pro documents limited free access and paid mobile previews, historic versions and screenshot downloads.
- https://land-book.com/terms-of-service retains submitted work with creators and reserves Landbook's own interface/data rights. No gallery screenshots, proprietary fonts, templates or image packs were copied, downloaded or purchased. The implementation should contain only original code and licensed/original demo assets.
