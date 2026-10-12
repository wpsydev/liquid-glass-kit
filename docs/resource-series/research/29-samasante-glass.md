# Resource 29: Sam Asante's liquid-glass

Reviewed 2026-10-11. Public playground/docs/examples, actual native video and switch interactions, official repository README/browser notes and MIT license. No renderer code, wallpaper, video or example assets copied.

## Actual API and observed examples

- [Docs](https://glass.samasante.com/?view=docs) expose one React Glass wrapper: crisp children above a refracted source, optional explicit `refract` node, geometry/optics, and `src` or `draw` for a GPU media surface with multiple lenses. Per-frame geometry values can subscribe to changes without React renders. Source ownership is the key pattern, not the exact optics vocabulary.
- [Examples](https://glass.samasante.com/?view=examples) include an actual video transport. Native inspection found a decoded 960×540 same-origin video at readyState 4, two output canvases, and labelled rewind/pause/forward controls. Clicking Pause set the real video paused and changed the accessible label to Play. The canvas demo is a separate original procedural source; no video/media was downloaded for reuse.
- The same page's native Demo switch changed checked state on click. Its Demo slider is a real range input with min/max/step but visually clipped to 1px and pointer-events none; a direct click did not focus/change it. A switch-to-next Tab test also did not establish slider focus. Do not assert full keyboard accessibility from its marketing statement. The illustrative notification/context-menu copy is not ours to reuse.
- Playground has bounded native range controls for optics and geometry. Its generic “every browser” headline is broader than the repository's important distinction below.

## Browser support evidence and boundary

[README](https://github.com/samasante/liquid-glass) explicitly says wrapping an arbitrary live backdrop bends it in Chromium, while Safari/Firefox need supplied/owned content to copy or filter. [BROWSERS.md](https://github.com/samasante/liquid-glass/blob/main/BROWSERS.md) describes SourceGraphic SVG filtering, 1× WebKit maps, shape-triggered regeneration and known wide-panel/GPU limitations, and reports Playwright Chromium/WebKit tests. These are the author's claims, not our independently completed browser matrix. Its matrix/landing copy must not be presented as proof of universal arbitrary DOM refraction.

## One distinct optional library feature

**Owned media texture source** for the existing optional glass scene/lens engine. Our current scene generates ribbons/studio/mineral procedurally; it cannot ingest a real host video/image/canvas. Reuse existing bounded lenses, CSS-coordinate geometry, pause/preferences and resource lifecycle rather than creating another all-purpose renderer.

Suggested explicit options `source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement`, `sourceFit: 'cover' | 'contain'`, `sourcePosition: {x,y}` and `invalidateSource()` for externally drawn canvases. Inputs must be supplied decoded elements rather than automatic remote URLs. The host owns media loading, CORS setup, playback, user consent, original assets and native transport controls. Limit texture/output pixels and lens count; preserve a normal native media/CSS fallback on errors. Crisp semantic HTML remains above canvas. No screenshotting/cloning arbitrary DOM, hidden duplicate forms, IDs, event handlers or accessibility trees.

Image texture uploads happen on ready/source change; a static source never needs an idle loop. Video uses requestVideoFrameCallback when available, uploading once per newly presented frame instead of every display frame; seek/pause/source change invalidates a static draw. Canvas sources upload only after an explicit host invalidation. Lens movement may draw again without uploading an unchanged source. Expose unsupported/loading/tainted/lost-context outcomes instead of treating a blank canvas as success. Restore/dispose without destroying host-owned video or canvas.

## Primary technical and performance references

- [requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) tracks presented video frames, works differently from display RAF, and offers no strict synchronization guarantee. Feature-detect and cancel on destroy.
- [WebGL textures](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL) explains CORS, texture orientation, size and filtering. A cross-origin source without approval cannot be fixed by this library.
- [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) explains pixel budgets, expensive queries and resource lifetime.

Video decode, texture upload, bandwidth and source resolution remain real costs. One renderer does not make a full-HD upload free. Bound MAX_TEXTURE_SIZE/explicit budgets once at initialization; avoid synchronous readback and status queries in every frame. Benchmarks must separate decode/upload/draw, contain/cover mapping, frozen-source correctness and reduced-motion behavior. Background/hidden source processing should stop; a host's independent playback policy must not be silently changed by a decorative material adapter.

## Rights and access

[License](https://github.com/samasante/liquid-glass/blob/main/LICENSE) is MIT, copyright 2026 Sam Asante. Independent implementation is preferred; attribution/notice would be needed for reused source. Third-party video, wallpaper and credited prior art have independent provenance and are not assumed redistributable. No assets copied, package installed, purchase made or external account action performed. Our browser observations were one Chromium collaborative preview, not Safari/iPhone coverage or a timing benchmark.
