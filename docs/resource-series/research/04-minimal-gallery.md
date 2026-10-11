# Resource 04: Minimal Gallery

Reviewed 2026-10-11. The useful lesson is deliberate content hierarchy and grouping, not another decorative material effect. This is independent composition work, not a reproduction of featured sites.

## References

- https://minimal.gallery/ curates websites by type and platform and exposes separate desktop/mobile previews. Directory placement is inspiration, not evidence that a design is universally usable or fast.
- https://minimal.gallery/grndwrk-studio/ and https://grndwrk.studio/ provide a studio reference; the gallery identifies production/agency context and credits the designer. The source uses client-rendered presentation, so extracted page text is limited.
- https://minimal.gallery/melius/ and https://www.melius.com/ provide a creative-tool reference. This suggests evaluating real product content and workflow alongside visual hierarchy, rather than adding unexplained dashboard decoration.
- https://minimal.gallery/michael-gatt/ and https://michaelgatt.com/ provide a composer/production reference. It illustrates why a project’s subject, editorial emphasis and authored work should set the visual direction. The source’s extracted text is limited; no claim of exhaustive implementation access is made.
- https://drafts.csswg.org/css-conditional-5/#container-lengths specifies container-relative units and the closest eligible ancestor used for each axis. Use these units on descendants with an actual inline-size container; viewport units do not solve nested component scale.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length#container_query_length_units documents progressive use of container lengths. Unsupported enhancement retains ordinary font sizing and flex/grid layout.

## Independent implementation

The optional composition helper returns actual scoped data attributes and custom properties for split/stack/cluster/grid, first/second split growth, compact/comfortable/editorial spacing and bounded reading measure. It preserves DOM order and inherits the host’s fonts. Container-relative heading rules apply to descendants; a container cannot query its own size. Layout is intrinsic CSS, not a resize observer or continuously running script. Controls keep minimum targets independently of density.

Space / Form is an original architecture-journal studio with a code-native courtyard drawing and a restrained typographic hierarchy. Its real controls call `getGlassCompositionProps` and apply the returned attributes/styles to the existing elements. Three nested examples request 240/480/960px widths and clamp to available space; requested width is explicitly distinguished from actual width. RTL changes logical flow, not node order. Quiet and opaque-toolbar preferences affect host presentation. The saved-study button changes local state only.

The deterministic `window.__compositionDemo` exposes reset/preset/state. Split, grid and narrow/RTL cases support a short actual-browser film. Preset switching never substitutes pre-rendered images or a fake layout result.

## Rights

https://minimal.gallery/legal/ reserves gallery screenshots, thumbnails, descriptions and presentation and restricts public reuse without permission. Browsing for inspiration is permitted. No gallery content, featured-site assets, source, screenshots, branding, fonts or music were copied. All journal copy and vector geometry are original; typefaces come from the system. Soundtrack rights require separate evidence.

## Verification and performance boundaries

Measure helper execution, compressed module/CSS size and actual browser rendering separately. A tiny pure function does not prove every consuming page is faster. Browser checks should include nested container heading scale, unsupported container enhancement, long labels, narrow/landscape sizes, RTL logical flow, source order, contrast and control targets. CSS layout can still incur normal layout/paint work when settings change. The framework claims no universal typography score, no mandatory webfont download and no automatic human-design guarantee.
