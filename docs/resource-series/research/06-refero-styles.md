# Resource 06: Refero Styles

Reviewed 2026-10-11 with Exa and native T3 preview. These are generated reference analyses, not official brand specifications.

## Public examples and patterns

- https://styles.refero.design/ exposes searchable visual directions and public style records.
- https://styles.refero.design/style/12255b63-e506-4bc1-a4cd-d05487de32f3 (Intercom) separates canvas, content surfaces, primary/secondary/helper text and accent roles. Its controls expose Preview, DESIGN.md, Tailwind v4, CSS Variables and Design Tokens. Restrained color does not remove the need to check each readable state.
- https://styles.refero.design/style/3e52dd36-6ab1-48c6-bc40-47ef6d33abc2 (monopo saigon) contrasts neutral foreground controls with expressive chromatic imagery. This is a useful test case for glass readability across varying backdrops, not a preset to reproduce.
- https://styles.refero.design/style/4e3b4717-84c8-4599-baaf-a343c3d619b6 (Cursor) documents separate reading, UI and code typography and functional surface roles.
- https://styles.refero.design/ai-agents/design-md-examples explicitly distinguishes generated style records from official brand guides and says a website capture does not establish every in-product screen.

## Distinct independent feature

Add a pure optional readability resolver: `resolveGlassReadability({ foregrounds, surface, opacity, backdrops, minimumRatio })`. It should evaluate host-provided solid backdrop samples, composite the supplied fill, report the worst measured pair, select a foreground only if it satisfies the supplied samples, and recommend an opaque surface when transparency cannot meet the requirement.

The contract exporter records intended style; this feature checks a concrete material/color combination. Keep supported input formats explicit, reject unknown colors rather than reporting a fabricated pass, and reuse existing normalized material options where possible. Return evidence and limitations beside any recommendation. A sample-based pass is not universal WCAG conformance, nor proof over an arbitrary image, blur, tint, gradient, shadow, video or experimental refraction pipeline.

Demo: an original navigation/composer slides over six locally generated backgrounds; show the evaluated samples, selected ink and opaque fallback. Do not use Refero screenshots or brand fonts.

## Access and licensing boundaries

Public style detail pages were accessible without sign-in. No paid API/MCP access was used. https://doc.refero.design/legal/terms-of-use permits insights for ordinary product design work but restricts republishing reference content, dataset/model use and undocumented systematic extraction. Customer-facing integrations require separate agreement. No export pack, proprietary typeface or reference image was copied into the repository.

## Technical basis and performance

- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html describes contrast requirements and cautions against rounding a failing ratio up to a pass.
- https://www.w3.org/TR/compositing-1/#simplealphacompositing defines alpha compositing; state the exact simplified model the helper supports.

No pixel sampling, canvas readback, WebGL, polling or per-frame work. Bound the supplied sample count and perform O(samples × candidate foregrounds) checks once when host state changes. Cache parsed colors within a call. Do not assume opacity-to-contrast is monotonic for an arbitrary colored foreground; avoid a binary search without proven conditions. Benchmark pure evaluation separately from actual browser glass paint and test opaque/transparent extremes, exact thresholds, malformed colors and mixed light/dark samples.
