# Owned media behind experimental glass

Optional `/scene-texture` exports `attachGlassSceneTexture(canvas, options?)` for an explicitly experimental WebGL2 scene. It accepts decoded host-owned image, video, Canvas2D canvas or ImageBitmap content. This is an independent material renderer, not arbitrary webpage capture or Apple's private rendering. Portable CSS remains the default; keep semantic controls and a meaningful original-media/CSS fallback in ordinary HTML.

```ts
import { attachGlassSceneTexture } from '@wpsydev/liquid-glass/scene-texture';
const optics = attachGlassSceneTexture(decorativeCanvas, {
  source: originalArtworkCanvas,
  scene: { animate: false, maxDpr: 1.5, maxPixels: 1048576 },
  maxSourcePixels: 262144,
});
// After changing host Canvas2D artwork:
optics.invalidateSource();
// optics.destroy() on unmount
```

Import is SSR-safe; attach to a connected browser canvas after hydration. No source URLs, fetch, DOM screenshots, automatic video playback/pause or host ImageBitmap closing are provided. The host owns source decoding/CORS/licensing/playback and source fallback. An inaccessible source reports source-access/error and uses the scene's procedural receiver where available. Unsupported WebGL leaves fallback presentation to the host; don't hide it solely because a canvas element exists.

Options: source defaults null; fit cover by default or contain; position defaults[.5,.5], each component0–1; matte defaults[.02,.03,.05], opaque RGB0–1 for letterboxing/alpha. maxSourcePixels defaults1,048,576 and accepts integers65,536–4,194,304. maxSourceDimension defaults2048, accepts64–4096 and is also capped by actual MAX_TEXTURE_SIZE. Owned staging downscales before upload. Separate scene maxDpr/maxPixels bounds output backing; both limits explicitly trade resolution for cost.

Texture update merges supplied texture options. Supplied scene replaces scene settings, while omitted scene is retained. The wrapper's scene clock defaults static unless moving field/caustics are explicitly chosen; animate:false disables continuous scene-clock RAF, while explicit animate:true is honored. Ordinary `/scene` remains animate:true by default for compatibility. Static initial observer/resize settling can submit additional still frames; static does not mean literally one draw. Explicit render and uniform updates remain available.

Static media upload once while unchanged; changed Canvas2D pixels require `invalidateSource()`. Same-size updates use texSubImage2D, fit/crop/matte uniform changes reuse the upload, and texture parameters are cached. Invalidate explicitly retries blocked access and schedules a visible draw, never loads a URL. On a source-access failure, only owned tainted staging is discarded so a clean same-dimension retry can succeed. No host canvas is modified; this recovery is not a per-frame allocation.

videoFrames defaults false/frozen. Explicit true uses real requestVideoFrameCallback only when supported, playing, visible and preference-permitted; no polling fallback. Scene paused/reduced states and transparency/contrast/forced-color policy gate media work. The host keeps playback ownership; disposing the adapter does not pause its video. Scene-clock movement and presented-video frames are separate opt-in policies.

The handle exposes supported, sourceStats, stats, update, setDrops, render(timeSeconds?), invalidateSource and destroy. Source stats report status/reason/kind, successful upload count/pixels, bounded dimensions, downscaling and actual video callback/visibility facts. They are not FPS, transfer throughput or GPU timing. onChange receives changed frozen source snapshots; host callback failure reports lg-scene-texture-error. Context loss reports context-lost/unsupported; actual restoration rebuilds resources. Re-read support/state and retain the host fallback. Destroy releases owned GPU/observer/listener/staging resources and restores scene backing without taking source playback ownership.

[REAL / SOURCE](https://wpsydev.github.io/liquid-glass-kit/texture/) renders three original Canvas2D studies behind bounded lenses, fusion and optional caustics. Its ordinary controls remain HTML. The ten-and-a-half-second finite tour changes actual art and optics, reuses uploads for crop/fit changes and ends quiet/static. A separate original canvas fallback is functional; source art is not a screenshot of the page.

31 focused texture tests plus35 existing scene tests;30 native desktop viewport/state cases320–1440px retain44px controls,16px fields, no page overflow and source/output caps. Real WebGL2 readPixels verified source colors, cover/contain/matte/alignment, decoded image/bitmap, same-size upload reuse, actual downscaling and output resize. Native context loss/restoration and captureStream/requestVideoFrameCallback were tested. Physical phones, Safari and assistive technology remain unverified.

Native tests caught two real defects: source uniforms were set with another program active, causing INVALID_OPERATION1282; the renderer now activates its receiver before binding. Tainted owned staging also survived a clean same-size source change; fresh bounded staging on the failure boundary restores recovery. Regression tests and before/after native records cover both. The source33 edge-quality integration must preserve the receiver activation order.

Optional standalone entry includes the existing scene engine:43,902minified bytes/14,470gzip, zero runtime dependencies. Synchronous uniform-update plus explicit-render submissions measured below approximately0.1ms clock resolution at the median, p95approximately0.1ms. Zero samples mean below resolution, not zero work. Explicit diagnostic readPixels stalls are outside timing. A250ms settled idle window leaves draw/upload counters unchanged. No GPU elapsed/paint/FPS/decode/upload-throughput/comparative speedup claim.

Original twelve-second plucked-synthpop112 film records the actual source tour with disclosed camera density;360-frame/audio decode and three reviewed frames passed. Its five final uploads include explicit reset/invalidation and source changes; counts are not appFPS.

[Native GPU evidence](../benchmarks/scene-texture-browser.json) · [Defect regressions](../benchmarks/scene-texture-native-regressions.json) · [Layouts](../benchmarks/scene-texture-layouts.json) · [Research](resource-series/research/29-samasante-glass.md)

Independent Sam Asante-inspired owned-media optics, without copied assets, shaders or arbitrary-DOM refraction claims.
