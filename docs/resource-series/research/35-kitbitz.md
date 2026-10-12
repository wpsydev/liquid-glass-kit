# Resource 35: Kitbitz

Reviewed 2026-10-11. Official public docs/license and actual read-only MCP metadata for two examples. No illustration source, PNG, template, screenshot or platform code copied. Native browser unavailable; catalog data inspection is not a live visual test.

## Actual examples and public API

- [Chestnut Tree](https://kitbitz.art/illustrations/nature-kit/chestnut-tree-02a571b6): documented public MCP search returned stable ID `nature-kit:Chesnut-Organic-V-L-Grass600@2x`, nature kit, object/Vegetation classification, portrait orientation, plant material, green/brown palette and SVG plus PNG availability. Search returned twelve matching variants and a cursor, so canonical choice matters. Direct Exa page fetch was empty; the example findings are live MCP metadata, not inferred pixels.
- [Dragon Skeleton](https://kitbitz.art/illustrations/dungeon-kit/dragon-skeleton-d16a2bad): the same read-only search returned one result, stable ID `dungeon-kit:Dragon skeleton full@2x`, dungeon kit, Decorative Props category, landscape orientation, bone material, beige/black palette and both formats. The public page title was available, but no image was downloaded or copied.
- [Getting started](https://kitbitz.art/docs/getting-started) recommends SVG for editable art, PNG for transparent raster, and kit filtering for a coherent style. It exposes equivalent web/Figma/MCP surfaces without requiring an account.
- [MCP docs](https://kitbitz.art/docs/mcp) publish unauthenticated Streamable HTTP at `https://mcp.kitbitz.art`. Actual initialize/tools-list/search requests succeeded. Its search schema has query max 200 characters, up to fifty filter items, result limit 1–100, `v1:` cursor, relevance/source sorting and variety mode. Inspection tool uses a stable assetId; prepare_asset_pack accepts 1–100 IDs, SVG/PNG preference and explicit fallback. We used only tools/list and two limit-one search calls, not source or pack downloads.

## One distinct optional feature

An original **illustration scene recipe**: typed, bounded image layers with stable responsive geometry and provenance, suited to empty states, onboarding, small explainer scenes and a distinctive hero. Generic composition layouts in source 4 do not position independent artwork layers; source 11's image props can be reused internally instead of copied.

Suggested `getGlassIllustrationScene({ aspectRatio, layers, description })` with each layer `{ id, image, anchor: {x,y}, width, rotation, order, provenance }`. Return structured figure/layer props and an optional original manifest; no HTML strings, network requests, raw SVG parsing, automatic catalog/MCP connection or external writes. Preserve intrinsic dimensions for each host image, define percentage coordinates clearly, cap layers/rotation/sizes, reject duplicate IDs/nonfinite coordinates, and keep deterministic order. A desktop/mobile art arrangement can be explicitly supplied where a single percentage layout becomes cramped.

Provenance stores the host's source URL, license identifier/URL, creator and local path; it is context, not automatic rights verification. Stable IDs and matching style/kit metadata help agents choose one coherent visual language rather than pile unrelated imagery into an app. The library should not reproduce Kitbitz's proprietary metadata tooling or full catalog/schema. Original fixture SVGs are drawn independently; this recommendation does not download even the reusable CC0 artwork.

Use a meaningful figure description for a combined informational scene, or mark the entire scene decorative and keep individual layer alt text empty. Avoid redundant announcements from every decorative layer. The visible explanation remains ordinary HTML; image layers do not become hidden buttons. Keep overlays away from actionable controls and support a static mobile/reduced-motion presentation. Existing sequence/tilt modules can optionally animate a dedicated wrapper; do not add a new always-running parallax engine for this source.

## Technical/performance guidance

- [SVG as image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image) distinguishes image-context restrictions from document/embed contexts. Prefer a normal img with a host-approved SVG URL rather than injecting arbitrary SVG markup.
- [Native image element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) and existing source 11 helpers support explicit dimensions, alt and loading priority. A decorative scene is not a reason to preload every layer.
- [CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/) does not grant third-party trademark/publicity/privacy rights or imply endorsement.

Reserve one aspect-ratio stage to avoid layout shift, use transform-only placement, keep image decoding/bytes explicit and use at most a small number of visible layers. Complex SVG filters/path counts and bitmap sizes remain asset costs; vector does not mean zero-cost. No glass blur is applied to every illustration layer. Manifest construction is pure/SSR safe and makes no filesystem or remote calls. Test bounds, semantic modes and deterministic output; actual image decode/CLS/mobile visual results require a separate browser run.

## Rights/access

[Official license guide](https://kitbitz.art/docs/license) dedicates original illustration files to CC0 1.0, but explicitly keeps website, plugin, MCP source, catalog tooling, docs and infrastructure proprietary. Public metadata reads do not license the platform implementation. The library's independent recipe and original fixtures avoid copying either. No account, Figma insertion, catalog mutation, pack preparation or art download occurred. MCP initialization creates only a transient protocol session, and search is documented read-only.
