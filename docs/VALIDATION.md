# Validation evidence

## 0.12.0-preview.1 loading path — 10 October 2026

- Verify, Publish playground and Publish preview release passed for `d272dbec98ed97a54370b4b6f88bc0bb0a84e7b6`. The release archive was downloaded, its digest checked, and all 13 non-peer JS entrypoints imported from a fresh installed consumer with React/Vue absent. Public guide, agent text and payload audit return HTTP 200; the source hash matches. Native public ResourceTiming records only the loading bootstrap, its stylesheet and modulepreload polyfill before scrolling, with the canvas still waiting. After native scrolling, the deferred scene and lifecycle chunks appear and two drops render in three draws. Native Pause retains focus and pressed state. A separate host build of the packed `/lazy` entry produces a 2,724-byte initial chunk with zero static imports/no renderer and a deferred 25,517-byte scene chunk. These establish working delivery/deferral, not cold-network timing or an LCP speedup. Publication receipts are in the browser record.
- `npm run check` passed TypeScript, 142 tests across 13 files, the distributed-package verifier and all thirteen site routes. Twelve new lazy lifecycle cases exercise observation/manual requests, deduplication, pending option replacement, hidden/in-flight handling, teardown, missing observers, detached mounts, invalid configuration and initializer/unsupported fallback. The loading page passes a separate strict TypeScript check.
- `npm pack --dry-run` passed with 80 files. A fresh offline consumer installed the packed archive with scripts disabled, imported all 13 non-peer JS entrypoints without browser globals or installed React/Vue, and verified shared root/narrow function identities. Packaged-module checks preserve React's `use client`, CSS accessibility resets, export/type paths and the lazy loader's absent static scene dependency.
- [The payload audit](../benchmarks/loading-package.json) records per-file raw/gzip/Brotli byte sums, static module reachability and source hashes against the verified 0.11 package. React's library graph changes from 60,276 to 22,978 raw / 19,624 to 8,426 gzip bytes, excluding React. Material-only CSS changes from complete-sheet 10,921 / 2,778 to 6,916 / 2,029 bytes. The complete sheet is byte-identical. Four representative already tree-shaken consumer bundles are byte-identical. The compatibility root adds one raw-module request while reducing bytes. These are payload sizes, not LCP/INP, network timing or universal application speedups; the whole archive includes added guides/component sheets and is not claimed smaller.
- Separate [native browser evidence](../benchmarks/loading-browser.json) imports actual distributed modules through a transfer fixture. Before scrolling, only `lazy.js` evaluated and zero WebGL2 contexts were requested. After native scrolling, scene/numeric/lifecycle/shader modules evaluated, one context was requested, two drops rendered in three draws at 599,760 backing pixels, and native Pause retained focus. Destruction reported a null scene and destroyed state. Module strings are embedded up front in this fixture, so it verifies deferred evaluation/mounting rather than HTTP loading.
- Layouts 320×568, 390×844, 568×320, 1280×800 and 720×1280 had no horizontal overflow and all links/buttons were at least 44 CSS pixels tall. This is responsive Chromium, not physical iOS/Safari or assistive-technology certification. An initial transfer harness failed to rewrite a template-literal import and exposed the readable CSS fallback with no GPU startup; the corrected harness was used for valid checks. Public deployment/request receipts are added separately after publication.

## 0.11.0-preview.1 Soft Matter — 10 October 2026

- Verify, Publish playground and Publish preview release passed for `8d5d417e8902acca5c8933879323327b2b4ea7c6`. The public `/fusion/` gallery renders three drops / three draws within its pixel budget; Orbit and citrus controls reproduce state. The public source hash matches the timed workload, and Pages/release video SHA-256 matches the local export. The downloaded release archive is version 0.11 with 69 files, no runtime dependencies and optional React/Vue peers. The [X video thread](https://x.com/wpsygames/status/2109050831026741286) and two replies are published; all three shortened links resolve to the intended demo, methodology and release. Native public playback decoded nonblack 720×1280 frames and 303,208 audio bytes with sound enabled. X's processed duration is 12.053333 seconds; the source is exactly twelve. Full receipts are in [campaign/fusion-update.json](campaign/fusion-update.json).
- `npm run check` passed TypeScript, 130 tests across 12 files, the library build and all twelve site routes. Six new scene cases cover bounded fusion inputs, replacement/staging semantics, draw accounting, deferred active rendering, unavailable/offscreen states and lifecycle. The gallery also passed a separate strict TypeScript check. Core remains dependency-free and SSR-safe; React/Vue remain optional peers.
- `npm pack --dry-run` passed with 69 package files. A fresh offline consumer installed the packed archive with scripts disabled and imported core, scene and custom-element entrypoints without browser globals or React/Vue installed. npm registry publication remains pending; the GitHub release archive and version tag are the installation path.
- Separate native T3 Chrome 152 / ANGLE Metal / Apple M1 Pro evidence is in `benchmarks/fusion-browser.json` and `fusion-validation.json`. Five valid GPU runs at 711×1264 backing pixels, three animated drops and RGB dispersion produced a median of run medians of 0.5841 ms. Per-run p95 is 2.5268–2.5566 ms; maximum 2.6639 ms. These are absolute canvas fixture timings at an explicit 900,000-pixel quality budget, not prior-version gains, whole-page performance, physical-phone tests or presented FPS. Timer queries had no disjoint, skipped or unanswered results.
- Instrumented paused `setDrops` staging creates no explicit typed arrays, layout reads, observer replacement, upload or draw. Steady frames submit three scene draws and one canvas layout read. All owned GPU handle counters return to zero after destroy. Native fixed-time readbacks change across animated poses with GL error zero; actual `WEBGL_lose_context` recovers fusion rendering. This is lifecycle/pixel evidence, not optical-equivalence certification.
- Final production-source gallery was transferred to native T3 preview. Layouts 320×568, 390×844, 568×320, 1280×900 and 720×1280 had no horizontal overflow; buttons and range targets were at least 44×44 CSS pixels. Native Enter activates Split while retaining focus; ArrowRight increments tension. A controlled, shared reduced-motion media-query fixture stops the host loop and shows the film's final static composition. This is not an OS preference toggle, physical-touch, iOS Safari or assistive-technology test.
- Final gallery graphics-context loss stopped its host-owned animation loop and zeroed render counts; restoration resumed three drops / three draws, supported status and GL error zero. The normal film completes all five transitions at twelve seconds, preserves its end card and stops paused. Capture uses an 807×1114 buffer within the pixel budget at a 720×1280 viewport.
- H.264/yuv420p export is 720×1280, 360 frames, 30 export fps and exactly twelve seconds, with fast-start metadata and stereo 48 kHz AAC. Original 160 BPM synthesized music has no external samples. Complete decoding and six contact frames pass; audio peak is −2.1 dBFS, mean −14.5 dBFS. Export cadence is not a rendering benchmark. Publication receipts are recorded in [campaign/fusion-update.json](campaign/fusion-update.json).

## 0.10.0-preview.1 rendering pipeline — 10 October 2026

- Verify, Publish playground and Publish preview release workflows passed for `d3a2fb82bf10434556c47d3bd1a32b8a25f7f11f`. The public `/flow/` route reproduced 3,000 instances, three scene draws, the 1080×1920 buffer and labelled eight-lens benchmark. Public raw source hash matches the measured source; the Pages video and GitHub release asset match local SHA-256. The published package archive was downloaded and verified as version 0.10 with 68 files and no runtime dependencies. The [X video thread](https://x.com/wpsygames/status/2109037423493828848) and two replies were published; native public playback decoded 720×1280 video frames and its audio track, with sound enabled. X transcoding duration is 12.053333 seconds; source is exactly twelve. Receipts and text are saved in [campaign/flow-update.json](campaign/flow-update.json). npm registry publication remains pending.
- `npm run check` passed: 124 tests across 12 files, TypeScript, library build and all eleven site routes. Added byte-identical displacement-map golden cases, refraction update reuse, bounded pixel/field inputs, draw accounting, resource cleanup and mocked context lifecycle tests. Core remains SSR import-safe without runtime dependencies; adapters remain optional peers.
- `npm pack --dry-run` passed with 68 files (141.2 kB archive / 432.4 kB unpacked). A fresh offline packed consumer imported core, scene and custom-element entrypoints without browser globals or React/Vue installed. Full H.264/AAC decoding passed for the 720×1280, 360-frame, twelve-second fast-start video; audio peak is −2.2 dBFS, mean −14.4 dBFS. Contact frames include all modes and the final end card.
- Separate native T3 Chrome 152 / Apple M1 Pro evidence is saved in `benchmarks/render-browser.json`, `optics-browser.json`, `render-showcase.json` and `render-validation.json`. At equal 1280×800 backing resolution, the median of five paired per-run GPU medians changed from 1.5827 to 0.8455 ms for eight static lenses (46.6% less) and 1.5800 to 0.8552 ms for moving lenses (45.9% less). Thirty-one paired eight-map batches changed from 16.8 to 4.1 ms (75.6% less), preserving bitmap bytes. Both versions retain near-60 Hz callback cadence. These are scoped GPU/CPU workload timings, not whole-app, physical-phone, battery or FPS measurements.
- Fixed-time native readbacks cover isolated lenses and six overlapping cases across all palettes and zero/nonzero refraction. Cached RGBA8 sampling differs from procedural recomputation: overlap RGB mean absolute error 0.958–1.051/255, p95 2/255, localized maxima 58–68/255. Quality is approximate; bright rim differences are explicit. Actual `WEBGL_lose_context` restoration with a DOM lens and 3,000 instances recovered four draws and no GL error; lost-state counts were zero. All owned handle counters returned to zero after destroy.
- Final production-source flow studio was transferred as standalone HTML to native T3 preview. Layouts 320×568, 390×844, 568×320, 1280×800 and 720×1280 had no horizontal overflow; buttons/selects measured at least 44×44 CSS pixels. Short viewports scroll naturally. Native wave/vortex/reverse clicks and a density change reproduced scene state and instance counts. Responsive Chromium is not physical iOS/Safari validation.
- The actual film completed five scene transitions at 12 seconds, stopped its loop, remained paused and reported 3,000 instances / three scene draws / 1080×1920 buffer. The field itself uses one draw. Video export is a presentation artifact, not a capture frame-rate benchmark; original 160 BPM synthesized audio has no external samples. See [campaign receipt](campaign/flow-update.json) for publication verification as it becomes available.


## 0.8.0-preview.1 fast microinteractions — 10 October 2026

- Verify, Pages and preview-release workflows passed for `57f0c7434915caddda90fd35bfea5f3b848d7616`. The deployed studio reproduced the 320/390/720/1280px layouts, 44px button minima and immediate reduced-motion reveal with no Animation objects. The release contains the installable package archive and actual twelve-second video. The [three-post X thread](https://x.com/wpsygames/status/2109015324276465803) was published with all public text, link destinations and video/audio playback verified; detailed receipts are in [campaign/micro-motion-update.json](campaign/micro-motion-update.json).
- `npm run check` passes typechecking, 95 tests across 10 files, the library build and all nine site routes. Thirteen focused transition cases exercise direction and numeric bounds, replacement options, authored alpha/translation/scale, priority restoration, WAAPI failure and AbortError handling, interrupted promises, disabled feedback, disconnection, reduced motion and SSR-safe import.
- `npm pack --dry-run` reports 81 files including `dist/micro-motion.js`, its types/maps and both microinteraction guides. Core runtime dependencies remain absent; React/Vue peers remain optional.
- The actual bundled library and studio were transferred into native T3 Chromium for browser checks because browser localhost points to another service. At 720×1280, 390×844 and 1280×800, all six examples and the footer fit the viewport. At 320×568 the page scrolls naturally, with no horizontal overflow. Visible native buttons measure at least 44×44 CSS pixels. Enter activated the toast trigger while retaining focus and updating its live status.
- A real WAAPI fixture with authored translation `10px 20px`, scale `.9` and alpha `.65` paused entry at 90 ms. On reversing, both the sampled presentation and the new effect's first frame were `10px 20.647px` / `.9` / `.614952`: no reset jump. The superseded entry resolved false; exit completed true with no retained Animation objects. Enabling the app's reduced-motion setting returned the authored fields immediately with zero active effects.
- Native keyboard activation of the studio's reduced-motion button followed by a reveal produced visible opacity 1 and no Animation objects. Removing the override respects the system preference; deterministic unit tests exercise live system-preference changes separately.
- These are browser observations and synthetic lifecycle tests, not physical-phone, Safari/Firefox, assistive-technology or performance certification. No animation benchmark, universal preference or Apple rendering parity is claimed. The host still owns semantic hiding, focus, native dismissal and real operations.

## 0.7.0-preview.1 anchored overlays — 10 October 2026

- `npm run check` passed typechecking, 82 tests across 9 files, the library build and the complete multi-page site build. Thirteen overlay cases cover edge flips, constraints, synthetic visible-viewport offsets/shrink, RTL, unscaled spring dimensions, width replacement, hidden/disconnected elements, native semantics, coalesced updates and cleanup. Regressions exercise partial/mixed-priority physical/logical margins/insets, overflow restoration and intrinsic fit-content measurement near an edge.
- `npm pack --dry-run` found 75 files, including distributed `overlay.js`/types and `docs/OVERLAYS.md`. Core still has no runtime dependencies; React/Vue stay optional. The Node SSR suite imports the new helper without browser globals.
- Native T3 Chromium demo checks at 320×568, 390×844, 768×1024 and 1280×800 found no horizontal overflow. Ordinary source/model buttons operate; Escape after keyboard invocation closes a native popover and restores trigger focus; outside click dismisses. The final source remains reachable through internal scrolling at 320px.
- A separate actual native popover without an authored width retained a 334px layout width when its anchor moved between the left and right edges at a 390px viewport. Repeated refresh kept it within 16px viewport margins. This browser check covers the fit-content regression that mocked rectangles alone cannot establish.
- The 720×1280 portrait film checks source placement above its trigger, model placement below, and a scrollable source list, with unobstructed captions. Demo data and display selections are authored/simulated; no model/backend is connected.
- Evidence is resized Chromium plus synthetic geometry tests. No physical iPhone/Android, software-keyboard, screen-reader, performance or Apple-native parity certification is claimed. Visible-viewport padding does not measure hardware safe insets. The host owns semantics, focus, visibility and offscreen-anchor policy.

Date: 2026-10-10. Environment: Node 24.21.0, Linux x64. Dependencies are pinned by package-lock.json.

- `npm run check`: passed TypeScript checking, 12 Vitest tests across core DOM/lens, mounted React/Vue adapters, and Node SSR suites, package build, and production playground build.
- `npm pack --dry-run`: inspected export artifacts, stylesheet, API/agent docs and skill; demo screenshots are excluded from the npm artifact. This is package inspection, not an application bundle benchmark.
- Skill creator validator: passed `skills/liquid-glass` frontmatter/structure checks.
- Clean consumer verification: both the packed tarball and `github:wpsydev/liquid-glass-kit` installed with only the core package, and the distributed ESM import returned material props successfully. npm reported its install-script policy notice; distributed files were present and usable.
- GitHub Actions: Verify and preview-release workflows passed. Pages build/deploy passed after enabling/configuring the Pages source. The public demo, both agent text files, seven documentation links, and generated CSS/JS assets returned HTTP 200.
- T3 collaborative Chromium preview (Chrome 152 / Electron 44 on macOS): live playground loaded; inspected the portable glass screenshot and computed backdrop CSS. Requested SVG path installed unique definitions; foreground heading filter remained `none`.
- Browser DOM interaction checks: dark appearance applied, explicit reduced transparency removed the optical filter and SVG definitions; native dialog opened with focus on its close button; Escape closed it; 390px mobile viewport and 1280px desktop viewport had no horizontal overflow.

The browser checks used the T3 preview and native DOM interaction through its evaluation API. They establish observed behavior in that browser, not pixel parity, all-device performance, or universal accessibility certification. Some preview click calls returned before observable interactions, so final checks explicitly dispatched native DOM clicks and waited for rendering.

Not yet verified: real Safari/Firefox rendering, iOS devices, minimum React/Vue versions, strict CSP deployments, shadow DOM lenses, screen-reader navigation, video performance, and quantitative contrast on arbitrary imagery. The compatibility document intentionally preserves these limits.

No social reach, stars, npm downloads, or agent indexing is represented as measured by these checks.

## Behavior preview iteration — 0.2.0-preview.1

- Full `npm run check` passed: 31 tests in five files, library TypeScript, package build and all three production site routes. Added tests cover material bounds/tint/tone, touch cancellation, keyboard press state, fallback reporting, React StrictMode/tag/ref cleanup, Vue tag replacement, custom-element options, indicator geometry/ownership/preferences and scroll/focus boundaries.
- The behavior demo passed a separate strict TypeScript check including Vite CSS declarations.
- Packed tarball installed with scripts disabled in a fresh core-only consumer. Both new helpers imported without browser globals; packaged stylesheet contained both helpers with no unresolved CSS imports; clear default emitted 6px blur. Inspected npm dry run and migration changelog inclusion. npm registry publication remains pending.
- Native T3 Chromium preview loaded the built behavior page as a self-contained transfer because browser localhost resolved to a different application. Actual material options changed ink/fill, touch cancellation cleared press state, selected backing moved to the requested bounds, middle/end scrolling updated edge states, and focused scroll content suppressed both overlay pseudos. The scrollport's computed mask was none.
- Production CSS verification caught a minifier dropping the standard backdrop-filter reset after a prefixed declaration. Corrected declaration order and retained CSS without minification in the demo build. Rechecked explicit solid mode: opaque fill, renderer=solid and computed backdrop-filter=none. Unit tests alone had not caught this compositor/style issue.
- Desktop 1280×1024 and responsive 390×844 layouts were checked in Chromium. No horizontal overflow; no nested glass; demo button targets measure at least 44×44 CSS pixels. Responsive resizing is not physical iOS testing.

Still unverified: Safari/Firefox rendering, physical-device behavior, screen-reader audit, arbitrary-image contrast, minimum adapter peer versions, strict CSP deployment and quantitative optical/performance comparisons. See APPLE_PARITY.md for the native gaps; moving backing geometry and explicit tone hints do not establish optical parity or automatic sampling.

Deployed behavior verification: GitHub Verify and Publish playground workflows passed for399840a. The public /behavior/ route and its CSS/JS assets loaded in native preview; explicit solid mode again computed backdrop-filter=none. Published the25s walkthrough to X with a verified send receipt and native processed-video attachment. No reach or star count is implied by publication.

## Motion preview iteration — 0.3.0-preview.1

- `npm run check` passed: 47 tests in six files, library TypeScript, package build and four production site routes. Motion coverage includes analytical spring timing, three damping regimes, overshoot, velocity-preserving retargeting, native input, intentional cancellation, reduced motion, long background pauses, disconnection, cleanup and adapter lifecycle/SSR.
- Motion/behavior demos passed a separate strict TypeScript check. Package inspection and a fresh packed consumer verified SSR-safe motion/indicator exports, composed CSS with no unresolved imports, the preview version and zero runtime dependencies.
- Native T3 Chromium preview loaded a self-contained production bundle of the motion demo. Press/release changed directional scale and settled to scale 1; selection aligned to requested bounds. Explicit motion-off snapped the backing and removed ambient animations. The native popover opened with expanded state and Escape dismissed it, clearing that state. No nested glass remained.
- Browser review found negative pseudo-element stacking failures in flex controls; explicit material isolation corrected blank labels and backdrop spill. The plain studio frame does not use a backdrop filter; separate controls remain material surfaces.
- Responsive 390×844 layout had no horizontal document overflow after clipping decorative spill; demo buttons measured at least 44×44 CSS pixels. This is resized Chromium, not physical iOS testing.

The motion layer approximates web geometry and appearance. Native optical merging/shared sampling remain absent. Whole-surface opacity fades can temporarily change CSS backdrop sampling. Browser RAF is throttled in background previews; no frame-rate claim is made.

Deployed motion verification: GitHub Verify, Publish playground and Publish preview release passed for `bda257d`. The public motion route and both release assets returned HTTP 200. The public demo reproduced motion-off snap/no ambient animations, native popover dismissal and no nested glass or mobile horizontal overflow.

## Owned-scene optics preview — 0.4.0-preview.1

- `npm run check` passed: 61 tests across seven files, package typecheck/build and five site routes. The 14 scene tests mock WebGL to verify SSR import, unsupported contexts, backend draw failure, bounded GPU inputs/observers, pause/system motion/visibility, RAF handle zero, context recovery, exact cleanup and one backend error query per initialization. These tests do not render pixels.
- Optics demo passed separate strict TypeScript. Package dry run includes the optional scene entrypoint and scene documentation. A fresh packed consumer imports the scene without DOM globals, while the core entry remains independent and dependency-free.
- Native T3 Chromium/Metal browser verification found a backend failure despite successful GLSL compile/link: the initial shader produced `GL_INVALID_OPERATION` and a black canvas. Simplifying repeated wallpaper evaluation and squared-power expressions fixed the actual render. A first-draw backend error check now reports unsupported and releases resources if a driver fails.
- The final live shader rendered vivid ribbons with WebGL error 0. With time paused, refraction-off/on pixel samples had identical center [120,105,52,255] and outside [53,167,255,255] values; an edge sample changed from [29,52,80,255] to [32,41,52,255]. This is a narrow observed screen-space comparison, not an optical parity or performance benchmark.
- ArrowRight moved the lens by 16 CSS pixels. Native context loss switched to CSS fallback and disabled lens comparison; restoration rebuilt the context. Explicit solid mode removed all three surface backdrop filters, and quiet mode retained semantic controls.
- Desktop 1280×900 fits the scene and controls; responsive 390×844 has no horizontal document overflow and button targets at least 44×44 CSS pixels. No nested glass. Resized Chromium is not physical iOS/Safari certification.

The scene samples only its own generated wallpaper. Arbitrary DOM capture, external texture support, physical optical merging and cross-device fidelity remain unverified or absent.

Deployment verification: Verify, Publish playground and Publish preview release all passed for `152ecff`. The public optics route rendered WebGL2 with error 0, comparison/pause state changed, and foreground label filter remained none. Demo and both release assets returned HTTP 200.

## Mobile details preview — 0.5.0-preview.1

- Final `npm run check` passed 69 tests across eight files, package typecheck/build and all six site routes. Coverage includes pointer/key ownership, unrelated release, cancellation/capture loss, nested icon/control handling, native input preservation, cleanup, corner tokens, adapter updates and SSR.
- The mobile studio passes a separate strict TypeScript check. Package inspection includes mobile research/recipes and matching agent guidance. A fresh core-only consumer installed the packed library and imported corner props, inner-radius calculation and capabilities without browser globals.
- Native T3 Chromium loaded the final production-built self-contained mobile page. Twenty resized viewports passed horizontal overflow, control bounds, 44×44 CSS-pixel targets and native sheet bounds: 320×480, 320×568, 360×640, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 480×800, 540×720, 568×320, 667×375, 844×390, 932×430, 768×1024, 820×1180, 1024×768, 1280×800 and 1920×1080. The text input remained 16px.
- Doubling every computed HTML font size produced no horizontal document overflow at 320×568, 390×844, 568×320 and 768×1024. This is a layout simulation, not OS text settings or pinch zoom. It caught a missing literal heading space, which was fixed.
- Native input editing updated the title and accessible save name. Escape dismissed the sheet and restored the focused trigger. Selection changed state/backing bounds. Synthetic touch events verified that unrelated release preserves feedback and owning cancellation clears it. Foreground title filter remained `none`.
- Solid mode removed all six material backdrop filters; quiet mode paused ambient animation and snapped springs. Continuous corners rendered as `superellipse(1.5)`; explicit round and requested SVG mode used `superellipse(1)`. A toolbar fixture wrapped four buttons and an unbroken localized label within a 320px viewport, retaining 44px minimum targets and nonnegative radii.
- Ordinary safe-area spacing overrides computed 20px 12px 34px 12px. Actual desktop env insets are zero, so this is not notch testing. A synthetic 240×180 VisualViewport at offset (50,120) bounded the scrollable sheet to (64,134)–(276,286); its focused input stayed within that rectangle. This checks placement logic, not a real software keyboard or pinch gesture.
- The 12-second vertical video records real press springs, selection, a native sheet and actual 320px-wide app reflow. Export: 1080×1920 H.264/yuv420p at 30fps, stereo 48kHz AAC. Original 160 BPM audio is synthesized by `scripts/render-mobile-beat.py` without external samples. Six sampled frames and full audio/video decoding passed; peak audio was −4.4dBFS. Export frame rate is not measured device performance.

Machine-readable evidence: [campaign/mobile-validation.json](campaign/mobile-validation.json). Physical iOS Safari/Android hardware, software keyboards, pinch gestures, VoiceOver/TalkBack and cross-device performance remain unverified. Continuous corners retain a round fallback; no all-phone or native Apple geometry certification is claimed.

Verify, Publish playground and Publish preview release passed for `94740e8`. The public mobile studio, mobile guide, agent index and both release assets returned HTTP 200. The deployed page reproduced corners, solid/quiet preferences, editing, Escape and focus restoration with no horizontal overflow at 390px.

[Published video](https://x.com/wpsygames/status/2108968276214579284) · [Release/install reply](https://x.com/wpsygames/status/2108968592322482382). X’s processed player decoded nonblack 720×1280 frames and 111,114 audio bytes. Its transcode pads duration to approximately 12.05 seconds; the uploaded/released source file is exactly 12 seconds. No reach or star count is implied.

## Studio redesign — 0.6.0-preview.1

- `npm run check` passes all 69 tests, package typecheck/build and six site routes. Both redesigned routes pass an additional strict TypeScript check. Public material APIs and defaults remain compatible; GitLab SVGs are pinned development-only assets. Package dry-run passes, and a fresh core-only packed consumer imports without browser globals or runtime dependencies.
- The final production-built workbench and listening-room bundles were transferred into the native T3 preview. Each passed twenty resized Chromium layouts from 320×480 through 1920×1080, including short landscape: no horizontal document overflow, out-of-bounds controls or visible action targets below 44×44 CSS pixels. See [campaign/studio-validation.json](campaign/studio-validation.json) for exact dimensions and measurements.
- Browser verification caught and fixed a palette selector that accidentally matched the backdrop div and stopped initialization. The corrected selectors target native buttons. Live radius, palette and opaque controls update the actual material. The native detail dialog moves focus on open; Escape closes it and restores the triggering button.
- Doubling every computed HTML font size caught header and documentation-label overflow. Reflow fixes pass 320×568,390×844,568×320 and768×1024. The listening room also passes all four sizes when computed desktop font sizes are doubled, and its enlarged sheet remains scrollable within 320px. These are layout simulations, not OS text scaling or pinch zoom.
- In the listening room, saved-session state and its accessible label survive moving between tracks. The native appearance sheet stays within 390×844, focuses its close button, dismisses on Escape and restores the appearance trigger.
- The twelve-second video records the actual workbench, palette spring, radius/material transitions and native dialog. Export: 1080×1920, H.264/yuv420p at 30 fps, stereo 48 kHz AAC, original 120 BPM synthesized music without external samples. Sampled frames and complete audio/video decoding pass. Audio peak −3.5 dBFS; export frame rate is not a device benchmark.

Physical Safari/Android hardware, OS text settings and assistive technologies remain unverified. This design update does not add Apple compositor parity or upstream component certification.

Verify, Pages and release workflows passed for `27503f4`. The public workbench, listening room, research and both release downloads returned HTTP 200. Deployed controls reproduced palette, radius, opaque material, native Escape/focus restoration and saved state; foreground text filter remained `none`.

[Published redesign video](https://x.com/wpsygames/status/2108976875443810436) · [Release/install reply](https://x.com/wpsygames/status/2108977086245556558). The released source is exactly twelve seconds; X may pad its processed rendition. No reach or repository-star growth is claimed.

X’s public processed player decoded nonblack 720×1280 frames and 20,219 audio bytes; its observed duration was 12.03 seconds. This verifies a playable published video and audio track, not listener volume or engagement.


## Performance and simplification — 0.9.0-preview.1

`npm run check` passes 104 tests across 11 files, typecheck, library and ten-route site builds. New regressions verify zero static input/observer/frame allocations, shared live preference teardown, interactive enable/disable, unchanged setters, experimental allocation/accessibility/frame-zero cancellation, semantic gesture ownership after programmatic spring actions, adapter duplicate updates and scroll observation stability. Existing priorities, native input behavior, SSR and geometry cases remain covered.

Native T3 desktop Chromium measurements compare frozen `49e2b19` with source hash `601ade5c20f324630d99449d5f9508def7479b09edd922f0f89961c14760b065`. Five warm-up pairs and 31 seeded randomized pairs per 100-controller static/interactive scenario retain all samples. The final uninterrupted run used active preview capture; an earlier stalled run is retained and excluded from claims. Static mount median 1.70 → 0.90 ms; complete lifecycle 3.70 → 2.20 ms. Browser validation is separate from jsdom resource counters and unit tests. Raw records and limitations are in [PERFORMANCE.md](PERFORMANCE.md). These do not establish GPU/FPS, physical-device, battery or whole-app improvements.

The final production-bundled performance studio was transferred into the native preview. Static/Interactive buttons change all 100 real surfaces between zero and 100 interactive surfaces; five resized layouts (320×568,390×844,568×320,1280×800,720×1280) show no horizontal overflow or visible targets below 44 CSS pixels. The 720×1280 view fits one screen. The twelve-second replay ends with its finite animation finished and no active film frame. These are desktop layout/input checks, not physical-phone certification.

The recorded promotional source is exactly 12 seconds, 360 frames, 1080×1920 H264/yuv420p/30fps/SAR1:1, with 48kHz stereo AAC and an original 120BPM synthesized score. Six frames were inspected; full video/audio decode passes; decoded peak −2.1dBFS. Export FPS is not an application benchmark. `npm pack --dry-run` passes and a fresh offline consumer installs one package and imports core/element/scene without browser globals. Detailed provenance and publication receipts are in [campaign/performance-update.json](campaign/performance-update.json).

Verify, Publish playground and Publish preview release passed for `d4b4b6996d86acc053f5ed9da350922c3ef80fb2`. The public performance studio and raw browser benchmark returned HTTP 200 and matched the measured source hash and 31 recorded pairs. The released video downloaded with the expected SHA-256; the GitHub release contains the installable archive. Its final 120,056-byte archive differs from the explicitly labeled initial package-size snapshot after documentation updates.

[Published twelve-second video](https://x.com/wpsygames/status/2109026252111610018) · [Benchmark scope and size tradeoff](https://x.com/wpsygames/status/2109026614910873856) · [GitHub installation reply](https://x.com/wpsygames/status/2109027205691080858). Public post text and reply parents were verified through the native preview. X's processed player decoded nonblack 720×1280 frames and 185,780 audio bytes; playback advanced and its rendition is padded to 12.053333 seconds. X automatically muted playback; this verifies a decoded audio track, not listener loudness or engagement.

The authenticated npm account is `wpsydev`, but publication was rejected with E403 because this session lacks the required 2FA publishing authorization. The registry package is not published. GitHub tag installation and the release archive are available; no token or authentication bypass was introduced.

## 0.13 caustic light studies

`npm run check`:148 tests across13 files, types, SSR/package assertions, library and14-route site build. `npm pack --dry-run` verifies packaging. Six added controller tests cover opt-in target/buffer ownership, warm reuse, defaults/zero intensity, opaque preferences, bounds and topology changes, copied geometry/light, source priority/culling and context restoration/failure. Unit WebGL mocks verify calls; native validation separately compiles shaders and reads pixels.

Native Chrome152/ANGLE Metal Apple M1 Pro benchmark:18 runs across six variants, three1.5-second repetitions each,16 warmup frames, alternating order. Default six-source40-cell/half-scale scene median .6553ms GPU; per-run p95 .7410/.7774/.7353ms, maximum3.7049ms. Main backing711×1264, receiver355×632, four draws. No disjoint/skipped/unanswered queries. CPU medians .1ms at coarse precision; callback16.7ms is not proof of presented FPS. No exact-render percentage speedup: expanded/indexed readbacks differ, and resolution/mesh changes alter quality. Source hash and raw samples in `benchmarks/caustics-browser.json`; three earlier experiment reports retained.

Native pixels changed when caustics were enabled and between animated poses; all sampled GL errors0. Explicit reduced-motion poses were byte-identical. Explicit opaque mode submitted zero caustics. Actual `WEBGL_lose_context` loss zeroed counters/stopped support; restoration rebuilt six sources without error. A separate instrumented warm frame used seven layout reads, four draws, no mesh/texture uploads or explicit Float32/Uint16 allocations, and no synchronous GL status calls. All owned handles released after destroy.

The six gallery layouts were inspected at320×568,390×844,568×320,1280×800 and720×1280: no horizontal overflow, active objects contained, visible button/input targets at least44 CSS pixels in each dimension. Film mode was checked at320×568,390×844,568×320 and720×1280; a short-landscape width cascade failure was fixed and all six cases rechecked. Native clicks/keyboard verified player state, dock selection, range72→73, toast acknowledgment, booking demo disclosure, search focus/status and Escape returning from film.

Controlled GPU denial preserved opaque CSS/native controls; a player click still changed its state. A controlled matchMedia fixture produced the static final film pose, elapsed12 with no host timeline RAF. These are controlled browser fixtures, not native OS toggles or physical iPhone/Android/Safari, software keyboard or assistive-technology tests.

The final12-second720×1280 release film includes all six cases and an end card, with original141.176BPM music. Full decode:360 video frames, no errors; stereo48kHzAAC, audio mean−14.8/peak−2.5dBFS, faststart ordering. Case frames and end card inspected. Media hashes and release/X evidence are recorded in `docs/campaign/caustics-update.json`.

## 0.14 Workbench

Functional/package checks: `npm run check` (typecheck, unit tests, SSR-safe built exports, site build) and `npm pack --dry-run`. Tabs tests cover disabled/wrapping navigation, manual selection, RTL/vertical behavior, restored authored attributes, invalid membership and all-disabled recovery. Demo tests cover actual parser diagnostics/fixes, comment/string preservation, bounded lint, isolated in-memory branches, unknown shell commands and restricted tokens.

Native browser evidence, separately from unit tests: T3 Chrome152 desktop, final production-equivalent self-contained HTML (local port resolved to an unrelated Finance app, so the native preview received the compiled fixture). Editor initialized with parser-derived/focused diagnostics; native terminal typing/Enter ran lint, ArrowUp recalled history, second terminal switched in-memory branch; file-tab ArrowRight focused README and changed panel visibility; native palette click focused filter, placement fit viewport, Escape dismissed. Fix clicked repaired source and cleared configured diagnostics, with a native notification. Responsive layouts320×568,390×844,568×320,768×1024,1280×800: all windows horizontally contained/no page overflow; visible phone-width buttons/inputs≥44px. Desktop compact controls and coarse-pointer44px rule are distinct. No real phone, Safari, virtual keyboard or assistive-tech test is claimed.

A separate12-tab native fixture measured five warm1,000-selection runs; raw values and submission-only scope in benchmarks/workbench.json. It left exactly one visible panel; destroy restored owned attributes; instrumented RAF/bounding-rect calls zero. This is not presented FPS or general app speed.

Final archive:87 files,14 nonpeer JS entrypoints imported from a fresh extracted consumer with no window/document/React/Vue. Native editor typing changed38px corner/20px padding. Final command prompts stay within the terminal pane after output grows. Fix uses the real transient confirmation animation. Controlled reduced-motion query skips timed tour; normal tour finishes after12 seconds with known fixes,38px corner,experiment branch and light theme, then returns to idle.

Published validation:release commit5ebeffa3f4a7d9a46c21000928fc61ee78af1730,site correction8fe3ca46018a556b3cb43b53b4b8a848071af031;Verify/Pages/release Actions successful. Public /workbench loaded its actual dynamic editor/model chunks; native terminal lint and fix worked. Public guide URL resolved within /liquid-glass-kit/docs;390px viewport had no horizontal overflow,16px editor/terminal text and44px terminal inputs. Published87-file release archive downloaded independently; sha2569c9dcd12653025ad26f0843369af51719575eeeb4a1767323b049f39b6cdcd3a,package version0.14.0-preview.1. Public screenshot bytes match local media digests. Preview-fixture timing excludes network; published one-off startup timing is not promoted as a loading benchmark.


## Workbench0.14.0-preview.2 audit patch

Unit/build: `npm run check` passes161 tests in15 files, both core/workbench typechecks, packaged SSR export checks and15 production site routes. Packaging: `npm pack --dry-run` passes87 files. No runtime dependencies or root/default CSS additions.

Native T3 Chrome152 validation is separate: manual tabs return entry indices [0,-1] after leaving; disabling selected A emits B/A, then all-disabled emits null/B. Palette ArrowUp from its filter focuses the last action. Controlled persisted pagehide/pageshow leaves editor and branch commands operational; this tests event handling, not actual BFCache eligibility. Parsed-token preview ignores quoted declarations and --padding; actual --corner18px/padding20px/--accent#abcdef set the live card.30,000 malformed characters returned30 diagnostics in one51.6ms native lint call; this single call is not a comparative benchmark.

Raw native tabs benchmark: five1,000-selection runs over12 tabs,100 warm selections;6.9ms median; zero scheduled frames or bounding reads; one visible panel and attributes restored. Exact module3936raw/1549gzip bytes; widget CSS2010/865. See benchmarks/workbench.json. Preserve first-preview evidence separately in workbench-preview1.json.

Paired Node benchmark: AMD Ryzen5 6600H, Node24.21.0; five alternating synchronous calls per implementation on30,000-character repeated close-braces/newlines. Median1467.391288ms old vs83.315888ms patch; both return30 diagnostics. All runs, cold work, commits/input/source hashes and scope are in benchmarks/workbench-lint.json. Browser/editor/paint and general page performance are excluded.

Publication: tag0.14.0-preview.2 at941638780fd7951821893d27c435533d5c4ca4a3; Verify38098748611, release38098748527 and Pages38098748595 all success. Public archive184024bytes SHA256ab63ed7629df64c37907c660a52dbbf8ee6db313de2565d64b059884510bc761 independently downloaded;87members,correct version,no runtime deps,14 SSR entrypoints imported. Actual hosted named workbench/editor/model chunks loaded; native lint Enter returned2 diagnostics and ArrowUp picked final palette action. Screenshots are real browser UI; the first preview's two images remain accurate for the visually unchanged patch.


## 0.15 magnetic dock (2026-10-11)

Automated: 172 tests in 16 files, core/workbench types, distributed SSR imports, 16 site routes and a 92-file pack dry run pass. Eleven new dock tests cover input coalescing, cached geometry, focus/touch, visual click bubbling, explicit/live motion reduction, hidden-page updates, resize/scroll/vertical orientation, membership validation, disconnection and exact owned-style restoration.

Browser checks are separate. Native T3 Chrome 152 loaded a fresh bundled source preview at 320×720, 390×844, 768×1024, 844×390, 960×960 and 1440×900. Five panels were checked at each size, with no page horizontal overflow. A boundary read while an inspector scrollbar was being removed initially showed 11px local overflow at 1440; the settled color panel measured 237/237, with no overflowing child. Intentional vertical inspector scrolling keeps larger content reachable. Form fields are 16px; mobile dock controls are 44×48px.

Native palette activation updated the artwork and its accessible label; typing updated the title; Tab then Enter activated Color. A controlled touch PointerEvent kept bounds stable and visuals neutral; explicit reducedMotion immediately neutralized scale and lift. Native Pause stopped CSS art. A native SVG export request produced an image/svg+xml blob containing the edited title; filesystem completion was not established.

The native 12-second tour completed all six chapters, returned to Notes, reset speed/angle/palette and stopped its scheduling. The export chapter does not automatically download. Original music, inspected film frames and decoding evidence are recorded in campaign/DOCK_MEDIA.md. A separate active-preview controller benchmark is recorded in benchmarks/dock-browser.json and PERFORMANCE.md; export FPS does not establish app FPS.

These are CSS viewport and controlled-input checks in desktop Chromium, not physical iPhone/Safari/Android, screen-reader or all-phone certification.

## 0.16 scroll reveal (2026-10-11)

Local `npm run check` passed with the scroll controller and queued prototypes. The release scope adds 20 scroll tests to the prior 182 tests; queued optional features are not declared exports or included in this release. A 95-file `npm pack --dry-run` passed. The new compiler derives entrypoints from public exports, so unfinished modules are not emitted into the archive.

Separate native T3 Chrome 152 source-preview checks verified a partial ViewTimeline entry (progress .4994, opacity .6746), full entry, focus exposing content, native dialog focus/close, explicit reduced motion yielding static content with zero active animations, and solid material switching. Decorative `overflow:hidden` originally selected the wrong scroller; `overflow:clip` corrected it. The forced IntersectionObserver path completed its entrance, reset to .35 after leaving, and re-entered to opacity 1. The 390px mobile rendering was visually inspected. Sizes 320×700, 390×844, 768×1024, 844×390 and 1440×900 had no horizontal overflow; controls were at least 44px tall and fields 16px. These are desktop Chromium viewport checks, not physical phones or Safari.

The benchmark files record a 1,716-byte gzip standalone helper and five 200-element attach/destroy batches. Native median 10.3ms, viewport-path median 8.1ms; zero custom RAF requests, rectangle reads or scroll listeners in those batches. This measures synchronous setup and teardown, not compositing or FPS. Root index.js and material.css hashes are unchanged. Published-page verification will be recorded after deployment.

0.16 publication: commit f96d23d181884b6d718090056105dd82ee8bca1a passed Verify 38181607965 (202 tests in 19 files), release 38181607971 and Pages 38181607969. The downloaded archive has 95 members, 200,574 bytes, SHA256 `5bcfc3cab7ccba92ac73f4794c6c3b97c560b3e8048b51102156907e47652a82`; scroll-reveal.js is present and queued feature modules absent. Native hosted /scroll/ loaded its actual site chunks, fallback control selected intersection-reveal, native note dialog opened with button focus, and 390px layout measured 375/375 client/scroll width. X main film readback: https://x.com/wpsygames/status/2109415222024782267, actual native video duration 12.00009 seconds, readyState 4.

## 0.17 activity island (2026-10-11)

Nineteen controller tests exercise state/revision guards, duplicate submission, failures/retry, metadata draft preservation, request variants, attachments and cleanup. Local `npm run check` passes with queued prototypes too; this release adds the nineteen tests to the 202 published tests. Packaging is checked separately.

Native T3 Chrome152 source previews measured all six scenarios at320×700,390×844,768×1024,844×390 and1440×900. All client/scroll widths matched, all visible buttons were at least44px high, textarea/file inputs16px. The 390px question view was visually inspected; native radio selection and Enter on Send answer cleared the request and recorded the chosen label in the host ledger. A separate320px lifecycle fixture retained the same focused textarea/selection after metadata update. Escape collapsed without emitting an action or resolving the permission. These checks use desktop Chromium with CSS viewports, not physical phones or assistive technology.

Separate payload/lifecycle files report 4,797-byte gzip standalone JS and1,995-byte gzip CSS; five100-cycle synchronous mount/update/destroy samples have median15.3ms, zero custom RAF requests and zero rectangle reads. These do not measure layout/paint/compositing/FPS, blur cost, network or task execution.

Final local integrated check passed 391 tests in 27 files including queued prototypes; final pack dry-run passed 99 files. Native opening through the disclosure button then Escape from its editor restored focus to that button and retained the plan. The finite tour reached completion, recorded its actual prompt callback, stopped all demo scheduling and had zero active animations after finishing. Original desktop/mobile and film frames were visually inspected.

0.17 publication: commit 3fe11d112dfe2323ee5ff7a67c8e021ed32b6578 passed Verify38182372785 (221 tests), release38182372782 and Pages38182372772. Downloaded archive99 members/212,551 bytes, SHA256 `f8f87ebb06708e233b09fa99128584161f645c495dd1c2ffcc2ce4ee83dc0c37`; controller/CSS present and queued feature JS absent. Native hosted320px /island/ loaded actual island chunks, matched client/scroll width305px and its allow-once callback recorded a decision. Main X film https://x.com/wpsygames/status/2109418794401562849 plays at12 seconds/readyState4. Reference reply https://x.com/wpsygames/status/2109420053389046157 verified.

## 0.18 design contract (2026-10-11)

The optional utility adds29 tests to the221 published tests. Local integrated check passes391 tests in27 files including queued prototypes; package dry-run passes102 files. Official isolated Google validator0.4.0 returned zero errors/one optional accent orphan warning for each original preset; exact source/output hashes and reproduction script are recorded separately. No validator runtime dependency is added.

Native T3 source preview checked all60 combinations (three presets ×four views ×five viewports320×700,390×844,768×1024,844×390,1440×900). No horizontal overflow, visible controls>=44px, text/color fields and selects16px. JSON roundtrip remained valid; invalid color input produced aria-invalid, visible error and disabled exports, then valid preset restored them. Native mobile and desktop frames were visually reviewed; mobile preview/edit anchor links improve navigation. Browser checks are desktop Chromium, not physical-device or screen-reader certification. Native download requests are verified separately from filesystem completion.

Node benchmark records25 rounds ×500 complete generation/roundtrip operations after100 warmups, median0.04275ms/p950.05298ms, standalone4,812-byte gzip payload including shared helpers. It excludes rendering/paint/network and claims no comparative speedup. Artifacts can be generated before client load.

Native export buttons each created a real Blob with text/markdown, text/css or application/json; JSON bytes matched the current contract state and the CSS contained its scope. This verifies download requests/artifact content, not completion on disk. Root index.js remains457 bytes and material.css6,916 bytes with hashes identical to the prior release.

0.18 publication: commit e388720b94ba3c00465328a7b12ff10a8896417d passed Verify38183290998 (250 tests), release38183290920 and Pages38183290953. Downloaded archive102 members/221,746 bytes, SHA256 `a416406cffa0d885b58d59481029c778172339072a607a01c7d6f79fb8973ed7`; utility present, queued feature JS absent. Native hosted Token Studio loaded actual site/material chunks; Command Room JSON view had valid roundtrip. X main https://x.com/wpsygames/status/2109422776532766940 verified with12-second playback; two thread replies are recorded in the media guide.

## 0.19 command palette (2026-10-11)

Twenty-one behavior tests cover catalog/search, grouping, disabled/no-handler actions, keyboard editing/composition, focus lifecycle, async duplicate/retry, stale catalog/results, shortcut scope, host preservation and cleanup. Native Chrome exposed a scroll-container Tab stop; explicit list tabindex=-1 and owned boundary cycling now keep Tab/Shift+Tab between search/Close. The native browser confirmed that cycle and Escape returning focus to the actual opener. Native dialog modal/top-layer status was verified.

Separate source-preview mobile/desktop checks found no overflow at320×700,390×844,768×1024,844×390,1440×900 in full/single/empty-query states; buttons44px and search16px. A real rejected local callback kept retry available; a subsequent handoff resolved and closed. Film review found inherited dark ink paired with a child-local light fill; moving the enhancement fill default to the palette scope corrected inherited theme variables. Dusk surface/ink were inspected before the film was rerecorded. Native viewports do not establish physical-phone/Safari/screen-reader support.

Final native layout matrix covers30 full/single/empty-query ×paper/dusk ×viewport combinations, all without horizontal overflow. Dusk surface rgba(42,62,51,.91) and ink rgb(242,240,230) were verified. Final `npm run check` passed492 tests in31 files including queued prototypes; final dry-run pack106 files. This release adds21 command-palette tests to the250 published tests; queued feature modules remain outside exports/archive. Final lifecycle batches over1,000-command catalogs recorded median77.9ms per30 cycles,20 rendered results maximum, zero custom RAF requests/JS rectangle reads. Any synchronous native modal/focus work is included; this is not rendering FPS.

0.19 publication: commit1611ae82b7702ab2fb16f3c8d72e2446c3d35251 passed Verify38185208205 (271 tests in22files), release38185208142 and Pages38185208073. Downloaded archive106members/229,657bytes SHA256 `27e1e2261e36724369cc385876dda59beeebe9b40e8fdc48575dd7425370d7d4`; palette JS/CSS/types present, queued modules absent. Hosted Cutroom native modal/theme callback and corrected Dusk colors were verified. Main X https://x.com/wpsygames/status/2109430921627664774 has12-second playable video/readyState4.

## 0.20 composition (2026-10-11)

Thirty focused tests cover pure SSR props, defaults, bounds and layout contracts. Separate native T3 desktop Chromium checks measured30 settled combinations (six arrangements ×320×700,390×844,844×390,1280×800,1440×900) without horizontal overflow or DOM order changes. Narrow480px presentation clamps to available space; RTL reverses logical side placement while keeping art before text in source. At1280px page width, nested containers238/478/958px yielded headings30/30.74/45.14px. At390px with32px root font, all headings reached60px and page still fit. This simulates root-font enlargement, not browser zoom or physical-device/AT certification.

Controls measured44px minimum heights; mobile selects16px. Original desktop/mobile/film frames were visually reviewed. Quiet mode disables the host width transition; optional composition itself has no motion loop. Node generation+serialization timings and standalone optional JS/CSS bytes are recorded separately in benchmarks/composition.json, with normalized batch mean scope. No browser rendering-speed or comparative speedup claim is made.

Final integrated check passed573tests in34files including queued prototypes; release scope is271 prior tests +30 composition tests. Package dry-run passed110files, with queued modules excluded by declared-entrypoint compilation. Root index.js457bytes and material.css6,916bytes hashes remain identical. Native Enter on bookmark changed the local saved state and preserved focus; explicit quiet mode produced0s width transition; solid toolbar selection worked.

0.20 publication: commitfc887d110f0d198637015f5c3da51cae573d62a3 passed Verify38186019027 (301tests/23files), release38186019032 and Pages38186019052. Downloaded110-member archive234,402bytes SHA256 `34e2dac8ecd91b34d8a32026cd50d6f912e7a2c4279ef1663c9109e7e856cadf`; compositionCSS/JS/types present, queued modules absent. Hosted390px study loaded actualchunks, RTL/sourceorder andnoflowchecked. Xmain https://x.com/wpsygames/status/2109433036299182491 with12-second video.

## 0.21 integration brief (2026-10-11)

Twenty-five focused tests cover deterministic recipe generation, six stacks, canonical selection, safety bounds/context escaping, precise optionalimports/lifecycle and freshcopies. Node performance file records25×500 generation/serialization batches after100warmups for default andallsevenpatterns; medians .00994/.04149ms with6,275-byte gzip standalonepayload. Authoringonly, notrenderer/agentexecution/network/indexingorcomparativespeedup.

NativeT3desktopChromium source-preview measured60 cases (threepresets×fourviews×fiveviewports320×700,390×844,768×1024,844×390,1440×900): nohorizontaloverflow,44pxcontrols,16pxfields. Actual native MarkdownBlob type/content matched the workspacebrief (7,294chars). Nativeclipboard absent onblanksourcepreview triggered selectableMarkdown fallback. Emptytask disabledboth exports andaria-invalid+associatedactualerror; validpresetrecovered. Demoedits clearstaleexportstatus. Filmframes visuallyreviewed. This isCSSviewport/sourcepreview evidence, notphysicaldevices/ATcertificate ordiskdownloadcompletion.

Final integrated npm run check passed574tests/34files including queued prototypes; published release adds25brief tests to301prior tests. npm pack dry-run passed113files. Updated empty-context field associates error andclearsstalestatus; clipboard fallback rechecked afterthatdemochange. Rootmaterial/defaultimports remainunchanged.

0.21 publication: commitfe653a7c83d16da2c0ad2b339cd08b8a4ed679a8 passed Verify38186401812,release38186401792,Pages38186401831. Downloaded113-member archive244,926bytes SHA256 `e3d06e9f344cb443188a01236fc53148c2a6b1bd737570b1d99c6c542b3fe073`; brief JS/types present, queuedmodulesabsent. Hostedworkspace valid; HTTPSclipboardAPIexists but browserwritepermissiondenied, selectableMarkdownfallbackworked. Xmain https://x.com/wpsygames/status/2109434514246132174 plays12seconds/readyState4.

## 0.22 readability (2026-10-12)

Twenty-six focusedtests cover plaininputs/bounds, exactunroundedcontrast, candidateworstcase/tieorder, pinnedtones, coreprops, neutralfallbacks, omitted-effects boundaries andmutation isolation. Candidate-scoring refinement avoids detailedrecords for losinginks; finalnative presets retained exactoriginaloutputs.

NativeT3Chromium measured15presets×viewportcases320×700,390×844,768×1024,844×390,1440×900, nooverflow. Nativefields/selects16px/buttons44px;17px checkbox has44px-tall associatedlabel. Actualprops pinblackorwhiteink; opaque states computedbackdrop-filter:none. Quiet/translucentworstratio16.1928; dynamicrequested1.4007→opaque19.4219; strictrequested4.1818→opaque16.0713. Ratios describe modelinputs, notcapturedpixels. Finite1.6second movement endedwithzerorunninganimations; quietpreferenceleaveszeroanimations. Source/browserframes visuallyreviewed, notphysicaldevice/ATcertification.

Node25×500 advisory-resolutionbatches after100warmups cover4samples×2inks and64samples×8inks: medians .012396/.097577ms, standalone2,826bytesgzip. Separateboundedmath/serializationmeasurements, notrenderer/FPS/network orcomparativespeedup.

0.21 Verify job114609540648 confirms326publishedtests in24files. Final0.22 integrated check passed602tests/35files including queuedprototypes; releaseadds26readabilitytests to326prior tests. npm packdryrun116files. Candidate-order regression alreadytests genuineequal-worstcase distinctblack/whiteinks, so unchangedbehavior is verified beyondpresetvisuals.

0.22 publication: commitbfa3bf4ad3e0cbce248e3ecdb70596095507de57 passed Verify38186818589, release38186818590 andPages38186818604. Downloaded116-member archive251,637bytes SHA256 `a660da92a59277aa899efd1a64d70d94f72392c92883a2b81fb4b321c820a4e0`; readabilityJS/types present, queued modules absent. HostedLightTable actualdynamicrecommendation solidtrue/19.4219 withfourcomputedfiltersnone, nooverflow. Xmain https://x.com/wpsygames/status/2109436584370356622 plays12seconds/readyState4.

## 0.23 resource tree (2026-10-12)

Eighteen focusedtests cover structure, snapshots, single-selection/expansion, keyboard/typeahead, disabled/hiddennodes, callbacks, replacement/cleanup. Native long-scroller fixture foundEndfocusoffscreen withpreventScroll:true:100rows/200px panel, row99bottom4468px/scrollTop0. Nativefocus scrollingfix broughtsame rowbottom200.83px withinhostbottom202px atscrollTop4267.5, pageScroll0. Browser geometryevidence is separatefromunitchecks.

Twenty nativeT3Chromium viewport/project/theme cases (320×700,390×844,768×1024,844×390,1440×900; twoinventories/twothemes) nooverflow,44pxbuttons/carets/rows,16pxfields. ArrowUp changedfocuswhilekeepingselection; Enterupdated actualpreview. FilteringallnodesoutrescuedfocusedtreeitemtotheemptyULinsideownedhost; appalreadyexternalfocusnotstolen. Originalframes reviewed, nofilesystem/Gitaccess orphysical-device/ATcertification.

Five native500-node connectedlifecyclebatches of10cycles median153.4ms, no customRAF requests orJavaScriptrectreads. Allboundednodesrendered, notvirtualized. Finalintegrated npmruncheck628tests/36filesincludingqueuedprototypes; releaseadds18tree tests to352prior publishedtests. npmpackdryrun119files. Optionalpayload3,080JSgzip/1,051CSSgzip, no comparativeFPS/paint/loadclaim.

0.23 publication: commit23d0dbfe3ff9c135f1747e5c6caa2ae592191864 passedVerify38187577343 (370tests/26files/final120-filepack),release38187577383 andPages38187577420. Downloadedarchive120members/259,611bytes SHA256 `afaca7d5f928c0854916d036d3bbddca02473be1a07718feac7ed088e802ad5b`; treeJS/CSS/typespresent,queuedmodulesabsent. Earlierlocal119-filepackprecedesnewguideinclusion; finalCIpackincludesit. Hostedactualchunksanddocfilter5visiblematchingrowsnoflowverified. Xpublicationawaitsexactpermalinkreadback.

0.23 Xmain https://x.com/wpsygames/status/2109440013880689102 readbackverifiedwithactual12-secondvideo/readyState4 afterfreshprofile reload. Publicationnotinferredfrombuttonclickalone.

## 0.24 finite interaction feedback (2026-10-12)

Twenty-two focusedcontroller tests coverpool/lifetime budgets, nativefallbacks, replacement/cancel, hide/reduce/detach andcleanup. Integratedcheckpassed752tests/39filesincludingqueuedprototypes; releasescope370prior+22feedbacktests. Finalpackdryrun123filesafternewguideinclusion. Controllerstandalone2,833bytesgzip, no rootdefaultCSS/importchange.

NativeT3source-preview15effect/viewportcases (pixels/sparks/ripple ×320×700,390×844,768×1024,844×390,1440×900): nooverflow,44pxbuttons/nativefieldcontrols andassociatedradio/checkboxlabels,16pxfields/selects. NativeSave button committedsessionnote, retainedfocus andemittedactual24-particleburst. Quietmodecancelledvisualwork whilechecklistcommitremainedtrue, cumulativeframesunchangedafter1,200ms.

Finalactive-browserprobe used8emitcallsat24/64particleceilings andtwo/fourburstcaps. Actualbacking262,088/1,048,576pixels, peaks48/134activeparticles, settled0before800ms, drawrequests27/28, zeroRAFrequestsinfollowing250msidle andzeroJavaScriptrectreads. Submit-only timings0/.4ms, firstbelowbrowserclockresolution; notFPS/GPU/paint/performancecomparison. Discardedinactivebackground-tabrunremainedpendingat800ms, so activepaintingwasrequiredandrerun explicitly. Originalfilms/frames visuallyreviewed, notphysicaldevicecertification.

0.24 publication: commit5da18e7aee2bcbeece601e0d0dbefc426b960324 passed Verify38188790959 (392tests/27files), release38188791122 and Pages38188791000. Verified123-member archive SHA256 `2dc8e84fa4f641dfaba3da4eaa7836d97bbef64f8ab3474d7c59b8af0acfb4ac`, hosted actual action/chunks and X video main2109445011989532806/replies2109447754661695629/2109448143674953880. npm registry pending.

## 0.25 native view continuity (2026-10-12)

Twenty-one focused tests cover exactly-once callbacks, skip/supersession, fallback, native/host failures, naming/restoration and SSR. Node25×500 after100warmups observed12600/12600 callbacks; normalized batch timings/payload in benchmarks/view-transition.json, not renderer performance. Optional JS1557gzip/CSS338gzip; default imports/CSS unchanged.

Twenty native T3 Chromium viewport/mode cases (320×700,390×844,768×1024,844×390,1440×900 ×grid/detail/list/quiet) fit without horizontal overflow; all buttons and preference labels >=44px. Actual card click focuses detail heading; Back restores original card. Background visual failure preserved committed state/focus, emphasizing optional animation. Quiet updates once without native capture. No physical-device/Safari/AT certification.

Final active reproducible fixture has one named surface. Five actual native220ms transitions had ready snapshots and completed (250.1–267.4ms including duration/capture); one quiet +20 superseding calls preserved26/26 callbacks (19 superseded/one complete), zero custom RAF/JSrect reads, zero remaining running animations. No helper-CPU/FPS/GPU comparison. First film exposed duplicated root text; optional CSS now switches root directly, named surfaces retain continuity. Final original film/frames reviewed,12seconds360frames/garage132seed25.

Final integrated `npm run check` passed 884tests/44files including queued prototypes; this release adds21tests to392prior published tests. Final `npm pack --dry-run` passed127files. Full media decode passed360frames/12seconds; video938874bytes SHA256 `d64d72f132f0dca1bb22e7a2c5e9d960bc187fba2d0e99a18dc30161346ee270`. CI release-only counts and archive verification follow publication.

0.25 publication: commit12ceb0589809a6ef26d31a3a5ef906374c729a6e passed Verify38190224095 (413tests/28files/127filepack),release38190224166,Pages38190224462. Downloaded archive127members/272187bytes SHA256 `aca8948cdbf255ca8fb41f078bac52edcc68677b6f8b8089692043ba939d4361`; queued modules absent. Hosted actual native API/demo chunk verified. Xmain2109449557944008767/reply12109450587641463009 readback withactual12.053333second/readyState4video. npm registry pending.

0.25 secondthreadreply https://x.com/wpsygames/status/2109451156028346612 readbackverifiedunderfirstreply; main +two useful replies complete.

## 0.26 deliberate ambient media (2026-10-12)

Twenty-four focused lifecycle tests cover pendingbudget, rejection, stale outcomes, hostcontrolled/releasedownership, reducedmotion/savedata, hidden/detach/restoration andSSR. Optional payload3152bytesgzip, root/defaultCSS unchanged. Native connected128manualvideo lifecycle:5×20cycles, batches34.3/8.3/7.2/6.3/7.5ms, median7.5ms,0customRAF/JSrectreads/subsequent250msidleRAF; excludes source/play/decoder work.

Native gallery actual firstdock requestfulfilled/secondscrollrequestfalse atmax1; film raisedmax2 andconfirmedbothplaying, savingpausedboth. Separate fullnativeplayer remainedplayingafterprogrammatichostquietpreference, eventuallydecoded360frames/reached12seconds. Sixoriginalcovers loaded. InitialpausedcurrentSrc alreadyselected; cross-origin timing transfer/encoded fields0 dueTAO boundary, notzeronetwork. Actualsourcefilesizesseparate, no cold/warm speedup/FPS/memoryclaim.

Fifteen manual/visible/quiet ×320×700,390×844,768×1024,844×390,1440×900 casesnoflow,44pxbuttons/16pxselects. Finaladdedtourbutton fitsallfive sizes44px; nativefocusmodalclosebutton, associatedselectlabels. DesktopresponsiveChromiumnotphysicalphone/Safari/AT. StrictdemoTSwithvite/clientpasses. Originalfilm actualtourrequests/ownership, cameraonlydensecaptions and100pxspacer, fullplayermuted; reviewed .8/4.5/9seconds,decode360frames12seconds. Disco120keysseed26,video801332bytes SHA256 `641c4cbab826c0d850fb169174ed1f9e01bc8ed1932f246f491e59b0f274436f`.

Final integrated `npm run check` passed884tests/44filesincludingqueuedprototypes; releasescope adds24tests to413priorpublished. Final `npm pack --dry-run` passed130files. Browser/media evidence is separate fromunit tests; no default import/CSS change.

0.26 publication: commit2ef8392142b98cb411f0f69a3e797d2db5170b5b passedVerify38190983629 (437tests/29files/130filepack), release38190983612,Pages38190983621. Archive130members/280413bytes SHA256 `28bad22d9ba74a52de48dd0f841c8bb9e1177b8fe7258a7e1d93f7a8e97bfecc`, mediaexportspresent/queuedimageabsent; hostedactualinitialmanual0-owned anddockplayingverified. Xmain2109455104550257011 sentalert+canonicalreadback; malformedowneditingdraftneverposted, freshcomposerexactdraftguardused.

## 0.27 native image props (2026-10-12)

34 focusedtests include boundednativeattrs/srcsets/groups, aspect/focal, alt/URL/input errors, ReactSSR escaping/lazy hint behavior. PureSSRprops1805gzipJS/395gzipCSS, no fetch/preload/decoder/defaultimport/CSS/runtime dependency. Node25×1000 generation+JSON median.00638485msimage/.009654222picture, normalizedbatchesnotnetwork/renderperformance.

Fifteen nativeT3Chromium responsivehero/art/editorial cases320×700,390×844,768×1024,844×390,1440×900 hadnooverflow,44pxbuttons/16pxselects. Original WebPs transferred unchanged asblobURLassetreferences, nativecurrentSrc/actualdimensionsread. Warm resizedherokeptcached1440resource; fresh390px/DPR2URLs selected960×640/7316bytehero,960×1200/10986byteportrait; phoneartdirectionaspectdistinctfromfallback. Nativefields/associatedportrait44label, no physicalphones/Safari/ATclaim. BlobURLsprove source/decode/layout, notnetwork.

Firstreuseddocument observationbuffer includedearlierpreviewshifts: discarded asCLS/sessionevidence. Demo now initializes observationboundarywithperformance.now() beforehero authoring; sumexcludesrecentinput andisnotfield/windowedCLS. Nativeimagehintsnotzero-requestguarantees, lazybrowserthresholdmayloadnearbyframes. React19SSRmayindependentlypreloadeagerimages; helperdoesnot. Original12second360framefilm synthpop112squareseed27 reviewed; cameraonlydense fields/310portrait/filenameblobmap; video584379bytes SHA256 `2f0c809faf43d72fa6c15b20992fab35bda1b14b08d0a17e592b535ecf48a6c7`.

Final integrated `npm run check` passed907tests/45filesincludingqueuedprototypes; releaseadds34tests to437previouslypublished. Final `npm pack --dry-run` passed134files. Coreprops/SSRandpackagingchecksseparatefromnativebrowserandoriginalmediaevidence.

0.27 publication: commit0de0ecd733c79fa05f865bb348c426bd8c65d98f passed Verify38192181723 (471tests/30files), release38192181681 and Pages38192181731. Downloaded134-member archive287893bytes SHA256 `6536da3e73a82f7144922d012fb8d75674e969da73df26ead7b734ba6c22746d`. Hosted hero/phone-picture source bytes and canonical Xmain+two replies read back; bounded publication/hosted observations in campaign/RESPONSIVE_IMAGE_PUBLICATION.json. npm registry pending.

## 0.28 native bottom sheets (2026-10-12)

21 focused tests cover detents, native forms/focus, dirty/stale dismissal decisions, callback errors, viewport/gesture lifecycle, hidden/reduced motion and SSR. Optional JS3484bytesgzip/CSS1174bytesgzip. Core/default CSS/import graph unchanged. Explicit dark/solid default themes tested separately from author-violet demo palette.

Fifteen native T3 desktop Chromium detent/viewport cases at320×700,390×844,768×1024,844×390,1440×900 fit horizontally with44px buttons/16px fields. Actual native card open+close restored focus to that card; Escape dirty guard focused Keep editing and retained content. Actual native submit saved local title/body, not a server. Tap/Enter resized through configured resting heights. Synthetic eight-move touch handler check coalesced1RAF/1start rectangle read; no physical pointer-capture or phone/keyboard claim.

Connected native reduced-motion lifecycle5×20 attach/open/two-snap/await-close/destroy batches22.2/5.8/5.3/4.3/8.7ms had5.8ms median,0customRAF/JavaScript rectangle reads and0following250msidleRAF. This excludes actual animated height layout/paint; transitions are180ms CSS, not GPU-only transforms. Host owns cleanup/geometry/model revision; native dialog APIs bypass guards.

Original film actual native local editor tour/unsaved choices,12seconds360frames,124BPM marimba seed28. No camera geometry or synthetic pointer actions in film. Final representative frames reviewed and full decode passed;826285bytes SHA256 `609eaf636a0877aafccbbbeb61f821587675094ce3ebf7a59017502c2b2f1cce`. Export30fps is not app FPS. Browser validation remains separate from unit/SSR/package checks; no comparative speedup.

Final integrated npm run check passed978tests/48files including queued independent prototypes; this release adds21tests to471previously published. Final npm pack --dry-run passed138files; queued feature modules are absent. Release-only CI counts follow publication.

0.26 two canonical replies read back: https://x.com/wpsygames/status/2109455675436970395 and https://x.com/wpsygames/status/2109457717647855920; main plus two replies complete.

0.28 publication: commit0850dbb89aa8e58dd3a4fd167ef18887e28f8b8f passed Verify38195344085 (492tests/31files), release38195344124 and Pages38195344178. Archive138members/297516bytes SHA256 `02c13e7ba5940275e63de85a746b8e64356751e51a4192501ef323b33534fdf1`. Actual hosted focus restoration and Xmain/two replies read back. Bounded receipt campaign/BOTTOM_SHEET_PUBLICATION.json; npm registry pending.

## 0.29 deliberate contextual previews (2026-10-12)

34 focused tests cover delay/crossing, focus/Escape, manual/native visibility, declaration validation, stale async generations, nested modal Escape, teardown and SSR. Optional standalone JS3299bytesgzip; no CSS/default import/runtime dependency change. Geometry and finite160ms demo reveal are separately host-owned.

Fifteen native T3 desktop Chromium sizes/content cases320×700,390×844,768×1024,844×390,1440×900 fit page/panels,44px controls/16px fields. Actual native tooltip focus opened; Escape retained focus/suppressed unchanged-focus reopening. Actual native disclosure selection changed the local direction and explicit host Close restored trigger focus. Native manual popover tier present for all three. Physical phones/Safari/AT unverified.

Synthetic fine-pointer quick entry/exit produced0opens; deliberate entry opened, trigger-to-panel crossing kept it open, final leave closed, touch entry did not hover. This is handler evidence, not physical mouse/touch certification. Actual local350ms fixture close aborted before content commit; next current request completed with0stale writes. Signal/generation checks belong to the host, not a network rollback guarantee.

Connected native manual description lifecycle5×20cycles×64controllers had batches266.6/52.3/34/30.2/42.6ms, median42.6ms perbatch;6400opens/6400closes,0customRAF/JavaScript rectangles/following250msidleRAF. Excludes placement, content fetch, animation, rendering and paint. Repro fixture generator/browser probe committed; no comparative speedup.

Original12second360framefilm104BPMfunk/brass seed29,651141bytes SHA256 `a34d1f2a336e7e5afe26f91897af2497d93f2f883def25a8b21444443c37f3cd`; actual tour+finite reveals, camera density separately documented. Full decode and representative image review passed. Export30fps not appFPS.

Final integrated npm run check passed1022tests/50files including queued independent prototypes; release scope adds34tests to492previously published. Final npm pack --dry-run passed141files, queued modules absent. Release-only CI receipts follow publication.

0.29 publication: commit7d23bf78cf37914378684da5c4ab87bd69d0ef08 passed Verify38196190502 (526tests/32files), release38196190497 and Pages38196190486. Archive141members/305676bytes SHA256 `ec5236b9e90d81e5468b1cf1b46ea7e060db9285abd59a08d0380a351b62f3f1`. Hosted actualselection/focus return and canonical Xmain/two replies/video12seconds read back; bounded campaign/PREVIEW_INTENT_PUBLICATION.json. npm registry pending.

## 0.30 semantic disclosure navigation (2026-10-12)

24 focused tests cover native links/buttons, one-open state, focus/Escape/outside closure, nested modal isolation, explicit breakpoint rescue, refresh/update/conditional teardown/SSR. Standalone optional JS2727bytesgzip/CSS891bytesgzip, default imports/core/CSS unchanged.

Fifteen native T3 desktop Chromium groups/sizes320×700,390×844,768×1024,844×390,1440×900 fit page/panel horizontally, all visible button/link/input/select/summary targets44px andfields16px. Actual Tab reached ordinary route anchor; Escape restoredroutes trigger. Actual nested dialog Escape closedonlydialog andretainedplanner/focusplanning-notes. Actual nativeform createdlocalBergen2026-11-03/unhurriedpreview; no booking/network. Ordinary #coast link navigated/focusedcoast andfocus-leaveclosedgroup. Active1440→390 breakpoint closed/hiddenhost andrescuednavigation-toggle; inactive firstread wasnot usedasfinaleventevidence. Physicalphones/Safari/zoom/AT unverified.

Connected32-group attach/open-close-all/refresh/destroy5×20batches29/12.4/10.8/11.1/11.2ms median11.2ms perbatch,6400notifications,0customRAF/JavaScript rectangles/subsequent250msidleRAF. Includes visibilitycomputedstyle checks, excludes menuanimation/layout/paint andusernavigation. Repro generator/browserprobe committed; no comparative speedup.

Original twelve-second/360frame nativefilm144BPM electro/metal seed30,621914bytes SHA256 `da2ca48396172e4b1df2b6a69dc7d7211ea3251dc7da2ab401b654aa05173db5`. Actual threegroups/hosthidefocusrescue; no cameraCSS/fakegeometry/viewport in film. Separate dialog/breakpoint tests not describedasfilmfootage. Finalrepresentativeframes reviewed andfull decode passed; export30fps not appFPS.

Final integrated npm run check passed1094tests/51files including queued prototypes; this release adds24tests to526previously published. Final npm pack --dry-run passed145files; future modules absent. Browser/media validation stays separate from unit/SSR/package checks. Release-only CI counts follow publication.

0.30 publication: commitd1f3e9c02d986adc609472d3b10dec6924f2bb55 passedVerify38197326198 (550tests/33files),release38197326209,Pages38197326197. Downloaded145members/313617bytes archive SHA256 `1c1478a6bbc7d1de79c1066b957cbb85464d8bc94c3368490153c91a41c027f9`. Hostednativekeyboard/focus andXmain+two replies/video12seconds readback; boundedcampaign/DISCLOSURE_NAV_PUBLICATION.json. npmregistry pending.

## 0.31 scoped material preferences (2026-10-12)

24focusedtests coverpureSSRpolicy/OS precedence, scopedattrs/palette, suppliedstoragevalidity/sync/errors/clear andteardown. OptionalJS2335gzip/CSS847gzip excludingmaterial.css. Core/defaultCSS/imports unchanged. Nativecontroller3,200sequentialscopes/cycles5×20×32 batches33.7/27.4/19.3/15.5/15.9ms median19.3ms,0customRAF/JavaScript rectangles/subsequent250msidleRAF,16,000change listeneradds=removes, authoredattrsrestored. Excludesmotionadapter/style/layout/paint/GPU; no comparativespeedup.

Fifteen nativeT3desktopChromium light/dark/quiet ×320×700,390×844,768×1024,844×390,1440×900 fitnoflow/44targets/16fields. Nativeeditorfocus/text/caret84 survivedactualdark/reduce/solid policychange, savedrealnote andreturnedexacttext. Nesteddark andlocalpeachpalette stayedindependent; quietrootopaque/effectpseudo none. NativeT3color-schemeemulationlight→dark changedsystemroot+nestedreason=system afteractivepainting. OtherliveOSreduction/contrast/forcedcolors,physicalphones/Safari/ATunverified. Mapport success/samescope sync/key-onlyclear/read-write-remove denial separatefromactualaboutblankstoragedenial, notcrosstabproof.

Original12second360framecinematic96pianoseed31 native9.6stour completestrue/3settled finiteheadingrequests/0finaldocumentanimations. Actualcontrols/policy receiptabove882pxcaption; camera-onlydensity exactCSSinmediaJSON, nofakestates/geometry/colors. Film657552bytes SHA256 `57ad467689c803b07c382abf27a01d313b420901867435d23bdbcea46d3e218a`; subagentreviewed .8/4.5/9.2frames/fullaudio-videodecode, browser/unit/packaging scopesseparate.

Previewhelper now usescallbackreplacements forCSS/JavaScript insertion: $backtick/$apostrophe/$ampersand source remainsliteral. NativeRegistrypreview previouslyhadSyntaxError beforecontrollerassignment, fixedgeneratedscript passednode--check andactualcontrollerloaded. Toolingfixnotaruntimeglassspeedclaim.

Final integrated npm run check passed 1,142 tests in 53 files, including queued prototypes; the release scope adds 24 tests to the previously published 550. npm pack --dry-run passed 149 files and excludes future optional modules. Publication CI will independently test only published sources.

0.31 publication: commit556b5d5e97e66697a1db78665838da2edc6e5808 passed Verify38200613556 (574tests/34files), release38200613536 and Pages38200613545. Downloaded149members/321950bytes archive SHA256 `0010d486f6a78a3ed945b171c9fc373be955b1aaab25423de099a0c7ef1ef273`. Hosted theme/reduce/solid policy and independent palettes reproduced; X main video read back at12seconds. Main and two replies have sent receipts in campaign/MATERIAL_PREFERENCES_PUBLICATION.json. npm registry pending.

## 0.32 native actions (2026-10-12)

28 focused tests cover native buttons/forms, validation and submitter FormData, single-flight promises, explicit outcomes, host-confirmed retry, cooperative abort intent, stale UI suppression and conditional ownership/SSR. Optional standalone JS2,402bytesgzip. Native17case record includes actual Enter submission, invalid field0callbacks, live FormData, preserved dirtydraft/control identity and focus, submitted versus success, retry, cooperative cancellation and noncooperative late host commit. Pending CSS actually changes while painted, ends at completion and remains absent in quiet mode. Fifteen native desktop Chromium state/viewport cases fit320–1440px with44px targets and16px fields; physical phones/Safari/AT unverified.

Two lifecycle variants each ran50warmups then400×20connected attach/destroy batches (8,000cycles each). Median normalized batch average~0.005ms/cycle andp95~0.010ms; fixture/options creation, action invocation/asyncwork/network/style/paint excluded. Batch averages are not individualcallback percentiles. No comparative speedup/load/FPS claim.

Original12second360frame960square native Review Room film uses160BPM drum-and-bass/FM seed32. Actual11stour ends clientcancelled, one submittedintent, one latehostcommit, fivebriefs, reviewerSuccess and0pendinghosttasks. Camera-only density/readonlyqueueviewport recorded exactly; no fabricated outcomes. Bytes662705 SHA256 `e233994717bd1d4cfbff642969a243a46ff42dcf1eb595b74073928ea6f4bbbc`; full audiovisual decode and frames.8/3.5/8.6reviewed. Export30fps is not appFPS.

Final integrated npm run check passed1,142tests/53files including queued prototypes; this release adds28tests to574published tests. Packaging/browser checks recorded separately; release-only CI counts follow publication.

Final npm pack --dry-run passed152files and excludes future optional modules. No action stylesheet is required. The published-scope verification will independently check602tests/35files if the expected additions hold.

## 0.33 native snap decks (2026-10-12)

30 focused tests include unchanged initial ResizeObserver delivery after update preserving immediate smoothRTLgoTo, plus actualgeometry/direction/padding/margin/visibility/membership invalidation. Optional JS2,700gzip/CSS443gzip, legacydefaultcore/CSS unchanged. Native T3desktopChromium fifteen3mode×5viewportcases fit320–1440px/44targets/16fields; ten functional checks cover firstRTL movement, actualLTR/RTLmiddle/end, quiet/allfit controls, one authored tree and native selectionfocus. Physicalphones/Safari/touchmomentum/AT unverified.

Native32-card probe:5×20 lifecycle batches7.6/3.9/4.5/7.1/3.2ms median4.5ms,6,600geometryreads across100cycles. Separate5×20×4cachedinstantrequest batches.9/.7/.5/.6/1.4ms median.70ms,0rectrereads. Both0custom/idleRAF. Native smoothscroll events settle actualview instead of publishing requestedindex optimistically. Excludes native scrollanimation/layout/paint, no appFPS orcomparativespeedup.

Original12second360frame960square Offset film132BPMgarage/bell seed33,744719bytes SHA256 `1dc6fdda4bbcbfab0a7d2fcf7a27e3f8e8c8a704ee3c6056d3e27c360d386679`. Actual10stour endsRTLindex1/scrollLeft-692.5/Motionconcept/picks2/0timers. Camera density and finalnativeframehold recorded; no invented selections. Three representativeframes2/6.5/9.5 reviewed, fullaudio/videodecode passed with280uniqueframehashes. Export30fps is not appFPS.

Final integrated npm run check passed1,142tests/53files including queued prototypes. Final npm pack --dry-run passed156files, excluding future modules. This release adds30tests to602published tests; release-only CI counts follow publication.

0.32 publication: initialcommitce63edf32f535437185f71465edbf7621f57b8b1 passedruntime verification/pages but release asset upload failed because media descriptors were outside the allowed directory. Correctiona505aa27a855898600b1aa5a2b584b39a13627d9 stages identicalverifiedmedia underdocs/campaign/assets; Verify38201207839 (602tests/35files),release38201207815 andPages38201207795 allpassed. Existingtag remainsce63edf; packageAPI/runtime unchanged bymedia-onlycorrection. Downloaded152members/328979bytes archive SHA256 `905c7f425b8ba749c2d0db92ee1d84e4252aa472f3da317e669ffbe38a530fee`. Hostedactual FormData/native queue submission producedB03/success/onecallback. npmregistry pending.

## 0.34 exact pricing displays (2026-10-12)

60 focused tests cover pure model bounds, exact safe-integer minor-unit formatting, explicit monthly rounding, typed free/contact/usage distinctions and compatible recurring comparisons/unsafe derived totals. Optional JS2,573gzip. Node24 benchmark100warmups+25×500measured operations (12,600total) includes modelgeneration/comparison/JSON with warmedIntl: median normalized batch average0.042606926ms/op, p95normalizedbatch.04745392ms/op and17,577,000serializedcharacters. Excludesbrowser/rendering/network/checkout, batchpercentiles notper-call tail, no comparative speedup.

Twenty-five native T3 desktopChromium5presets×5viewport320–1440cases fitnoflow/44pxcontrols+associatedradio-checkboxlabels/16pxfields. ActualMonthly39/noannualsaving; Annual$359.99 withrounded$30/month andone-minor-unit disclosure; mismatchedquantity/scope removes saving. Quiet+BHD0runninganimations, Solidknownsurfacesopaque/filter:none, actualamountsunchanged. JPY0/BHD3 fictional independentprices, no conversion. Physicalphones/Safari/ATunverified.

Original native10stour exported12seconds360frames960square,120BPMdisco/keys seed34;727880bytes SHA256 `96c9bc3f74e60b2b6e139e95b30fd356c23cc036dc421f2d1792c27f3c0362a6`. No cameraCSS/fakedamounts/geometry. Frames.8/6.5/9.2reviewed, fullaudio-videodecode passed. Export30fps notappFPS.

Final integrated npm run check passed1,142tests/53files includingqueuedprototypes. Final npm pack --dry-run passed159files excludingfuturemodules. This release adds60tests to632publishedtests; published-scope CI follows publication.

0.33 publication: commitcc929d3cb7a1a1935ba95cff40af5824a586fc86 passedVerify38201482558 (632tests/36files),release38201482567 andPages38201482560. Downloaded156members/336474bytes archive SHA256 `a6cd160b95b5de077c885017971d7200e13055e9d036485311cd450d24ee11f2`. Hosted immediateRTLrequest actuallysettled index1/scrollLeft-778 with1185px viewportandoneauthoredtree. Xmainvideo readback12seconds, canonical main/two replyreceipts incampaign/SNAP_DECK_PUBLICATION.json. npmregistry pending.

0.34 publication: commit54057c40647406d08a4abf6ea6b7541e9de0e9e4 passedVerify38201825622 (692tests/37files),release38201825611 andPages38201825623. Downloaded159members/343528bytes archive SHA256 `10109144c9e2c698470101d52d0aa8b25d6112c726ec4920fd0a065deb23337a`. Hosted incompatibleBHDscope returnsnullsaving while preserving exact35999minor/rounded3000monthly. Xmain/two canonicalreplies readback, video12seconds; campaign/PRICING_PUBLICATION.json. npmregistry pending.

## 0.35 original registry recipes (2026-10-12)

23focusedtests coverauthored-file JSON subset, bounds/types/paths/pins/snapshots/metadata/SSR. StandaloneViteESM JS4145gzip. Node24 create/serialize/parse/validate: each1-file/32-file1136UTF8byte-sourcecase100warmups+25×200operations, median normalizedbatchaverage.08590393/.85860492ms/op; p95normalizedbatch.12829976/1.41403847. Excludesrendering/filesystem/install/network/source-review, notper-calltails/comparativespeedup. No code-safety certification.

Fifteen nativeT3desktopChromium3presets×5viewport320–1440cases fitnoflow/44targets/16fields. ActualRepair corrects explicittraversaldestination, JSONview parsesonefile/exactschema. Declaredimportremoval rejects, latestversion rejects. Validate preserveseditornode/value/focus/caret20. ActualnativeDownload yields2559byteapplication/jsonBlob exactlyrenderedJSON+newline/MITnotice/SHA256 `7eb0a8d328e798038cdadbda804e88e0ec72760957fd39a3c1f594028da52d91`. BrowserBlob observedwithout modifyingbytes; filesystemsave/installationunverified. Four-exportv0.25snapshot isdeclared, notlivequery. Physicalphones/Safari/ATunverified.

Two nativecamera iterations; final12second360framefilm112BPMsynthpop/squareseed35,625802bytes SHA256 `86e499e0baf59f6b8054966328506657a95343194dba9476ca922529fc6ed359`. Actual10stour/JSON/rejection/repair,0finalrunninganimations/nativeDownloadrequest1. Camera-onlydensity/art-sizing/duplicate-decorative-text removal recordedverbatim; no fakedoutcomes/source/geometry. Fourfinalframes.8/4.8/6.7/9.3reviewed andfullaudiovisualdecodepass; export30fps notappFPS. Toolpreview callback insertion fix fromv0.31 preservesRegExp-dollar source.

Final integrated npm run check passed1,142tests/53files includingqueuedprototypes. npm pack --dry-run passed162files and excludes future optional entries. This release adds23tests to692publishedtests; published-scope CI follows publication.

0.35 publication: commit316f24819414649bef7431ad5bfcf6127028af06 passedVerify38202791180 (715tests/38files),release38202791332 andPages38202791131. Downloaded162members/352374bytes archive SHA256 `5b6e73d1dd60042df83b5663919be0038b0d7f7c120c19907782cb8162e89266`. Hostedtraversalrejection/actualrepair reproduce; Xmain/two canonicalreplies/video12seconds readback. campaign/REGISTRY_PUBLICATION.json. npmregistry pending.

## 0.36 native fields (2026-10-12)

42 focused tests coverpurefieldanatomy/bounds/labels/contextrefs/error/busy/announcements/SSR, plusconnectedCSSaddon regression. ActualnativeHelp42.2px beforecascadefix/44pxafter. Hostshorterror-summary links29.59px before/44pxafter. TwentyfinalnativeT3desktopChromium4states×5viewport320–1440cases fitnoflow/44targets+associatedlabels/16fields. ActualnativeRecordrequired/URLfocus/0callbacks, realFormDatasubmitter/singleflight/editablebusy controls, preservedcaret5–9/nativeidentity, duplicatecurrenterror clearsafterphysicalinput, cancelledsnapshot/noncooperativelate resultguard andquietspinner verified. Native select mode changes separatelyfixture-driven; no physicalpopupkeyboard/phones/Safari/AT claim.

Optionalpurefactory1364gzip/CSS1270gzip.400batches after50warmups: construction100calls/batch median normalized.001ms/call; connectedhostadapterapply/clear20cycles/batch .005ms/cycle; combinedtwoconstructions+apply/clear .010ms/cycle. Fields/constraints/labels/valuesretainidentityafterloops. Setup/nativevalidation/forcedlayout/paint/600msasync/networkexcluded, quantizedbatchaverages notper-eventtails/comparativespeedup. There isnoattach/destroyfieldcontroller.

Originalnative10stour exported12seconds360frames960square,124BPMafro/marimba seed36,927864bytes SHA256 `abc91967e44cbb477ca1817e659550bfbc4292e0e95d5c4a2c43fe6303035abf`. Actualfinalcancelled/twonotes/oneignoredlate result/0pending. LiteralcameraCSS+boundedscrolls recorded; nativefields stay16/44, nofakevalidation/modelchanges. Fourframes.9/3.6/5.7/8.5 reviewedbydelegate/full decodepassed. Export30fps notappFPS.

Final integrated npm run check passed1,144tests/53files includingqueuedprototypes. npm pack --dry-run passed166files excludingfutureentries. This release adds42tests to715publishedtests; published-scope CI followspublication.

## 0.37 fine-pointer visual tilt (2026-10-12)

19 focused tests include actualCSSOMserialization modeled regression, nativebutton/anchor semantics, noninteractivevisualstructure, eventgate, sharedspring/cachedgeometry/ownership/reduction/teardown. Chromiumnativebeforefix trimmednumeric transformstrings, triggeringfalseexternal-owner abandonment/stuckplane; recordingactualstoredinlinevalue/priority fixesit. Native trustedShift+Tabwave→atlas→orbit actuallyneutralizesOrbit; EnterWave createsrealpagebookmark; actualQuiet clearsalltransforms/pointer suppression. ImmediateDOMfocus frominactivepreviewwasnotusedasfinalnativefocusproof. Synthetic101mousepackets1scheduledRAF/1entryrectread; actualpaintedtransformapproachesboundedtarget. Syntheticneutral touchenter/move0RAF/transformempty. Physicalpointerdelivery/phones/Safari/ATunverified.

Fifteen desktopmode/viewport320–1440cases fitnoflow/44controls+labels/16fields. OptionalIIFE2736gzip(sharedspring included). Connected32host5×20attach/refresh/destroy batches19.2/11.4/13.8/12.1/8.3ms median12.1ms,3200sequences/3200rectreads/0customRAF/subsequent250msidleRAF. Includesnativegeometry andanysynchronousstyle/layout; excludesfixturecreation/active spring/asynchronouspaint. No comparative speedup/GPU/appFPS claim.

Original12second360frame772281bytefunk104/brassseed37 native10scameratour SHA256 `2f0cdb51938750f1ac4a86d7246e567617febd3fc0755cc50b8c32469aacb5db`. Explicitlysimulatedmouse/actualfinegate/originalSVGs, nocameraCSS/fakedstate. Finalthreeemptytransforms/cameraoff/0documentanimations/following300ms0RAF/rectangles. Fourframes.8/4.1/7.2/10.8reviewed andfullaudio/videodecodepass; export30fpsnotappFPS.

Final integrated npm run check passed1,144tests/53files includingqueuedprototypes. Final npm pack --dry-run passed169files excludingfutureentries. This release adds19tests to757publishedtests; published-scope CI followspublication.

0.36 publication: commitc445ffb3256d4d61db0bfd101b8aac5ec1dcdb63 passedVerify38204555365 (757tests/39files),release38204555375 andPages38204555412. Downloaded166members/359612bytes archive SHA256 `ac31931d59b9fadf66fc59f3a9ed163fb6c7941892b2acdc0b4237b1acd6f9c4`. HostedblankRecordfirstinvalidfocusnote-title/0submissions andHelp44px verified. Xmain+twocanonicalreplies readback, freshpublicplayer12seconds/ready4; campaign/FIELD_PUBLICATION.json. npmregistry pending.

## 0.38 number continuity (2026-10-12)

29 focused tests;100 native desktop Chromium cases20states×5viewports320–1440px. Immediate readable actual values, aria-hidden decoration,44px targets,16px fields and no page overflow. Actual42-minute record/Undo, focus/caret identity, overlap latest completion, real element-hidden cancellation/no replay, conditional cleanup and deliberate announcements checked separately. Physical phones/Safari/AT unverified.

Eight connected controllers/4,000quiet sets, median/p95 approximately0.1ms/eight-call batch at approximately0.1ms clock resolution; zeros are below resolution.0RAF/rectangles; active65RAF/417.6ms elapsed separate from synchronous scope; subsequent250ms no follow-on requests. No painting/GPU/FPS/baseline speedup claim. OptionalIIFE3444gzip.

Original12s960square360-frame606116-byte electro144/bright-FM major-seven film SHA256700444cb01cb31f2e6ed1afa66a3365519d0978636bca647ec6a9edace9b99c4. Actual finite tour ends150localminutes,8requested/completed,0cancelled/active; camera density and above-control caption band disclosed. Full decode and four frame reviews passed independently. Export30fps is not appFPS.

Integrated npm run check passed1,144tests/53files including unreleased prototypes. npm pack --dry-run passed172members with only declared public entries; the published-scope CI count is recorded after release.

## 0.39 natural sizing (2026-10-12)

24 focused tests include fractional nativeCSSOM ownership regression.20 native desktop viewport/state cases320–1440px:44px actions,16px drafts, no page overflow or settled clipping. Actual WAAPI height growth, retargeting, focus/caret/node preservation, native details keyboard, width reflow, authored min/max/box sizing and auto!important restoration separately checked. Phones/Safari/AT unverified.

Optional2469gzip.20connected fixtures/400measuredbatches after50warmup: median.015/p95.035ms normalizedcycle; includes native computedstyles/rects and induced syncstyle/layout, lifetime/leases/teardown. Excludes setup/content changes/active animation/asyncpainting/network. No comparative speedup/FPS/GPU claim.

Original666747-byte12s360frame960square cinematic96/piano seed39 film SHA256f0bc86bcce89c4bfac9e3fd2a18b000f1ff4b904af6eeab26a1ad75f840e046c. Actual10stour, no cameraCSS, final3notes/same focused draft/selection5–10/zeroactiveanimations/clearedsizes. Controls bottom869.4 above caption882. Full decode/threeframe review passed; export30fps is not appFPS.

Integrated npm run check passed1,145tests/53files including queued prototypes. npm pack --dry-run passed175members and excluded future entries. Published-scope CI follows release.

## 0.40 task progress (2026-10-12)

41 focused tests;75native15states×5viewports320–1440cases44targets/16fields/noflow. Actualnativeunknown0/1position−1 with attrsabsent, known0/8, fraction135/1166, error426/1166, terminalunknownhidden. Actual InspectCancel retains3measuredrecords; TryCurrentPlan8/8. Separate fixture-driven select mode notnativepopupproof.14records8interface/6writing allactual1166/797UTF8bytes and198/134wordsegments.4statusmilestones outsidebusyregion; realoffscreen/quietringstops. No physicalphones/Safari/AT claim.

Pure50kcalls10.9ms/10kbatchmedian;connected12800applies12.1ms/2560median0RAF/rects; separate500forcedstylelayout4.8ms/100includeslayout;250idle0. Optional1613gzip/CSS907 excludingmaterial. No paint/GPU/taskprocessing/speedup/FPS inference.

Original752612-byte12s960square360frame vibraphonednb160seed40 SHA256ef8b3ea4dea439816aa9cb33f6790777723588d782ae5121dbb5b463911aef81. Actual10stourfinal1166/1166bytes/0waits/actions/steps, staged delays notCPUmeasurement, cameradensitydisclosed. Fullaudio/decode/threeframespassed.

Integrated npm run check passed1,145tests/53files including unreleased prototypes. npm pack --dry-run passed179members with only declared public entries. Published-scope CI follows release.

## 0.41 reader following (2026-10-12)

21 focused tests;75native desktopcases44targets/16fields/noflow. ActualcomposerEnter appends/preservesfocus; ReadOlder then3appends preserves474scrolltop/unread3; JumpLatestactualtail/focusbutton/unread0; ArrowUppauses. Range/nodeidentity retained, ROwidthpinnedvpaused checked. New10-recordReset clearsoldunread with initiallyFollowingfalse reattach, noforcedjump. Physicalphones/Safari/ATunverified.

Optional2721gzip.800connectedsequences31ms/160median;26400nativegeometrygetters0explicitrect/0syncRAF/9600listenersbalance; native inducedsyncstyle/layout included/paintGPUexcluded. Following250idle/postdestroy0RAF. NoFPS/speedup.

Original668830-byte12s960square360frame garage132/pluckedkeys seed41 SHA25666493a161f0d28a0819d156cdc3f71839c1632339b44d6975aef8e3060fe8148. Actualtour14records/3unreadolder/0afterexplicitjump/0newrecordsforinplacetextgrowth. Cameraframingdisclosed; crop/fullframe reviews confirmcompletecontrols/text. No demonstratedrendererbug. Fulldecodepassed.

Integrated npm run check passed1,145tests/53files including queued prototypes. npm pack --dry-run passed182members excluding future entries. Published-scope CI follows release.

## 0.42 native data table (2026-10-12)

23focused/20desktopresponsivecases44/16/nopageoverflow. Realheader stabletiesbothdirections/singlearia-sort/caption/scopecol/samenodes. NativePrinttyping9/18caret5/Next7–9three rows; actualApply afterfixtureselects changesST-008Review→Ready/modelrecreate/all18IDs. ActualClearSearch restoresqueryfocus.320nativeArrowRighttableScroll40/pagefit. Nullslastascending/descending/lowercaseßnotss checked. No phones/Safari/AT/backend/nativepopupclaim.

Optional2600gzip/CSS777gzip. Separatepure5000rowconstruction11.70msmedian/cachedfilter.14/numericsort1.55; host200rowauthor/replace1.10median includesinducedsyncstyle/layout/noasyncpainting. Boundsnotvirtualization/noFPS/speedup/wholeapplatency.

Original651714-byte12s960square360frame disco120keys seed42 SHA25627df29f759d37296e7d0e64eb03a14f5645b8315f74bec787d395cf16cff61ce. Actual10stour18rows/1localchange/notouring,4reviewframes/full decodepassed/cameradensitydisclosed/editor770/control853abovecaption882.

Integrated npm run check passed1,145tests/53files including unreleased prototypes. npm pack --dry-run passed186members excluding future entries. Published-scope CI follows release.

## 0.43 reversible action (2026-10-12)

22focused/25native desktop320–1440cases44/16/noflow. ActualArchiveafter220msack/focusUndo/EnterUndo180mscompensation returnsoriginalobject/article/button/order/focus. ActualCommitthenindependentEnterRestore. RejectedUndo retainsreceipt/member/error; ignored-AbortApplyafterdestroy changesrealhost/staleoutcome/Restore recovers. Samephasepromisesidentical/competingreject/callbackcounts1Apply1Undo0Commit. Explicit3sdeadlineCommitonlyafterhostack/persistentRestore. Composefocus/pointer/manualpause; no liveOS/backgroundclaim. NativeQuiettransition0s/Solidcomputednone. Phones/Safari/ATunverified.

Optional2250gzip. Purebatchaverageconstructdestroy.002/synhostApplyUndo.008/ApplyCommit.004msmedian, excludesDOM/waits/asyncservice/painting, noFPS/speedup. Original791717-byte12s360frame acousticpop116nylon/handclaps/woodblockseed43 SHA2565fab2932c8af339251900581c98668b7a31b5241a2758f1128ba368b8d2d060d. Actualfiniteactions/finalnohostwaits/toursteps; newmelody/rhythm/progression, cameradensitydisclosed, controls≤865.73abovecaption882/full decode/fourframespass.

Integrated npm run check passed1,145tests/53files including queued prototypes. npm pack --dry-run passed189members excluding future entries. Published-scope CI follows release.

## 0.44 native number inputs (2026-10-12)

27focused/80nativecases16states×5desktop320–1440sizes44targets/18fields/noflow. ActualArrowUp20→22/nativeconstraints/no customrole. Typed12.25 staysdraft/object12/stepMismatch; invalidsubmitnull; actualApply12.5/nativeRecordFormDataradius22blur12.5gap12intentrecord/submitterrecord. TypedminusbadInputDOMempty/nofakezero. Separate100syntheticmovepackets1RAF/write/releaseonce; cancellation/hostvalues/constraintchanges/modifiers backed, physicaldrag/capture/phones/Safari/ATunverified.7decimalhelperdeclines/nativeArrowUp12.0000001 works.

Optional4284gzip/CSS403.800connectedlifecycles25.6/160median0syncRAF/style/rect5600listenersbalance; live5617listeners/oneobserverbalanced;250idle/destroy0RAF. No paintGPUFPSspeedupfinanceclaim. Original574935-byte12s960square360frame electrickeysdisco120seed58 SHA256c0c3fce46d32e2067b6cd599aebe00bf6a587b6cb269315d073ca9febda3d023. Actualstate/cameradensity/syntheticdragdisclosed/controlsbottom871abovecaption882/full decode/threeframespass.

Integrated npm run check passed1,145tests/53files including queued prototypes. npm pack --dry-run passed193members excluding future entries. Published-scope CI follows release.

## 0.45 owned media textures (2026-10-12)

31texture+35scenefocused tests. ActualGPUANGLEMetalAppleM1ProWebGL2: error1282wrongprogram beforefix/error0afteractivation, cleanrecoverycyan[0,255,255,255] aftertainted256stagingresetfailureboundary.13pixel/sourcecases originalquadrants/image/bitmap/containmatte/coverposition/texSubsame-size/uniformreuse/2048×1024→362×181cap65536/realoutputresize. Actualcontextloss/restorationevent/resource recovery; hostcaptureStream/rVFCuploads12→15/disposaldoesnotpausehostvideo.30desktop320–1440cases44/16/noflow/sourceoutputcaps. Phones/Safari/ATunverified.

Optional43902raw/14470gzip includesexistingengine. CPUuniformupdate/render submissionmedianbelow~.1clockresolution/p95~.1ms; readPixelstallsnotintiming/GPUelapsednotmeasured/noFPSspeedup.250idle490draws/16uploadsunchanged. Original1121677-byte12s960square360frame pluckedsynthpop112seed45 SHA25649e13a44c0db399bea9fa3f58ef98ce96c4352b95afeb5bea44da63b79f67735; finite10.5tourendquiet/static/5uploads/cameraCSSdisclosed/324unique hashes/threeframe/fullaudio decodepassed.

Integrated npm run check passed1,176tests/54files including queued prototypes. npm pack --dry-run passed198members with only declared public entries. Published-scope CI follows release.

## 0.46 finite sequencing (2026-10-12)

22focused/40nativecases44/16/nopageoverflow. ActualWAAPIsharedstarttime/play/pauseheld/seek1150/resumepromisetrue; authoredrotate−14!importantrestore/externalstylewins/unrelatednativeeffectretained/quietendpoint/hiddennoreplay/insertedbuttonpreserved/nativefocused draftuntouched. Phones/Safari/ATunverified. Optional3149gzip;1002-tracksetup/seek180/cancel/destroy median~.20p95~.30ms quantized~.1resolution/includescomputedstyles/setup/writes/cleanup0JSRAF/rects/retained effects/250idle. No activepaintcompositorGPUFPSspeedupclaim.

Original915433-byte12s960square360frame chamberpizzicato126seed49 SHA2568b8e5f382713f2849cb10a89e8947169b4dcc7a1acbcb1aac7d9b35a3768db36. Actualfinite tourendsquietfinished/noeffects; disclosedcameraframing/323unique frames/three reviews/full decodepassed.

Integrated npm run check passed1,176tests/54files including queued prototypes. npm pack --dry-run passed201members excluding future entries. Published-scope CI follows release.

## 0.47 spatial anchors (2026-10-12)

16focused/20desktopresponsive+20activelypainted screenchecks44/16/nopageoverflow/labelclip. Independentreferencecamera maxerror1.14e−13/math actualSVGdotposition<.000043px. NativeyawArrowRight−16→−15/FOVArrowLeft52→51/samefocus/input; incompletedraft preserveslastvalidpoint; boundarypositiveWfiniteunclamped/behindnull/HTMLlabelidentity. QuietSolidtourchoicespreserved/SolidbuiltCSSunprefixednoneafterorderingfix/footer44. Frustumnotocclusion/phonesSafariATunverified. Optional1055gzip;separatepure1024projection2.1msmedian/hostpose.425msmedian noGPUFPSspeedup.

Original764408-byte12s960square360frame swingjazz138upright/brushes/woodreed/vibraphoneseed47 SHA2564559a72eb5ab805bb3a5487581fc7a2153dd2c63d1edfb38a85f483a0ae4e7ab. Actualfiniteposes/disclosedcameracontrolbottom834abovecaption882/newmelodyprogression/full decode/fourframespass.

Integrated npm run check passed1,176tests/54files including queued prototypes. npm pack --dry-run passed204members excluding future entries. Published-scope CI follows release.

## 0.48 shader backdrop (2026-10-12)

30focused/40desktop320–1440cases44/16/noflow. Actual3styleWebGL2pixels/glError0/compilerrejectlastgoodidenticalpixels/provenance; realcontextlost/restoredpaused/250idleunchanged; nativewarmthArrowRight.35→.36/focus/nativeSavePlayPause/IOoffscreennoreplay/quietsolid/backingcaps.4signedpowGaussianmultiplications portabilityfix27sampledRGBAbyteidenticaldriver; pausedexactcount4; valuepreset1vs2before/no recompile. Corecommentonlyclarifiesobserverstilldraws. PhonesSafariATliveOSunverified. Optional4441gzip;200128×96CPUdrivercommands.6ms/40medianincludes200geometry/styles/1200uniformattempts600nonnull/0recompilelookuptexturebufferupload.6programs6VAOs14shadersbalanced/idlepostdestroy0RAF/submissions. NoGPUFPSspeedupwatchdogclaim.

Original711140-byte12s960square360frame breakbeat148acidbassFMseed73 SHA25653c7c0b991afaeefbdc8a061deffe8ba94956ea72e27eadb08498a327267da4c. Actualfinite10.5tour3styles/lastgoodrejection/endpaused393submissionscountsnotFPS/cameradensitydisclosed/fourframes/full decodepass.

Integrated npm run check passed1,176tests/54files including queued prototypes. Final npm pack --dry-run passed207members/448480bytes. Skill-creator validator passed,11new guide links resolve and63checked import declarations match public exports. Published-scope CI follows release.

## 0.49.0 pixel-aware edges (2026-10-12)

85focused scene/texture/edge tests.20actual desktop viewport states320–1440,44px controls/16px field text/no overflow or clippedlabels. Real WebGL pixel optics for lens/field/fusion compile with error0; real failed compiler falls back to identical legacy pixels while retaining source upload1; actual context restoration recreates source/upload2. Independent analytic .125-scale fixture partial coverage16→100pixels is a broader sampled transition, not a quality score. Native keyboard/focus/Quiet/Opaque/MobileInspectvisibility passed. Physical phones/Safari/AT/GPU elapsed time unmeasured.

Measured optional scene10,959→11,452gzip (+493), scene-texture14,471→14,962 (+491); all9legacy GLSL hashes unchanged. No free coverage/GPU/FPS/speedup claim. Original12s960square360-frame144BPM two-step film SHA2561fc6464eb084b8ac173c5d3c1f84eef2bc666346a469f469f61cd6ae37128fee; native finite tour, original source, readback sample timing and camera CSS disclosed; full decode/four-frame review passed.

Integrated npm run check passed1,195tests/55files including queued prototypes; final site build and npm pack --dry-run passed208members/454213bytes after guide integration. Published-scope CI follows release.

## 0.50.0 quality policy (2026-10-12)

70focused governor tests; actual35desktop viewport states44pxcontrols/16pxfields/noflow. Syntheticcondensed threshold fixtures explicitly separate from6s native frame-cadence run360observations/last72bounded; actualgeometry420→300 resetsoldlive evidence but manualhold retained. Native cadence notGPUtime; no physicalphones/Safari/ATcertification. Purepayload5837raw2275gzip;2k-sample CPUbatch median1.723p952.363ms excludesrendering. NoGPU/FPS/speedupclaim.

Original649625-byte12s960square360frame104BPM clavinet/brushed jazz-funk61 SHA256073a3611aead9956f01104d9cc10734dbc79ba8ea93e40cab8c4686cd7910978; finite10.85nativecapture+1.15hold/323uniqueframes/three-reviewed/full decodepassed. Film illustrates labeledsyntheticpolicy ratherthanGPUbenchmark.

Integrated npm run check passed1,195tests/55files including queued prototypes. npm pack --dry-run passed211members/462348bytes, public export and SSR checks passed. Published-scope CI follows release.

## 0.51.0 illustration recipes (2026-10-12)

19focused helpertests/strict standalone demoTS/SSRimport.15native activepaint desktop states5sizes44pxcontrols/16pxfields/noflow/nativeArrowRightX72→73samefocus/image/controlidentity/reorderoriginalnodes/QuietSolid/idle. Native-select meaning change DOMfixture distinguished OS-menu delivery; physicalphones/Safari/ATunverified. Standalone9299raw3716gzip includespicturevalidation, art/demoCSSexcluded; separatedemo20604raw8251gzip JS +2594gzipCSS includesoriginalart.7originalSVG3443B. NoGPU/FPS/decoding/loadtimespeedupclaim.

Original550046-byte12s960square360-frame104BPM funk/brass seed51 film SHA256acff6b410b24a8e62192aa245f347980d7941d14a9335e021f35b7e86e111742; finite10.5tour/owncomposition/editing/meaning/Quietstaticend; cameraCSS disclosed, full decode/threeframespass.

Integrated npm run check passed1,195tests/55files including queued prototypes. npm pack --dry-run passed214members/468665bytes, declared exports and SSR passed. Published-scope CI follows release.

## 0.52.0 native icon actions (2026-10-12)

26focused tests includingactualhidden CSS regression.20native desktop states44/16/noflow; actualArrow/HomeEnd/RTL/vertical/wrap/skiphidden and finalhostcapturebeforemutationfocusrepair/externalcaret. Earlierbrowserblur boundary preserved; controller notpromisedautomatic rescue arbitraryremoval. Actualtrustednativekeyboard vs syntheticfilmchoreography separate. Phones/Safari/ATunverified. Finalhelper6444raw2601gzip andCSS1777raw752gzip excludingmaterial/art/frameworkpeers; SSR ESM exportsconfirmed. NoGPU/FPS/loadtime/speedupclaim.

Original618949-byte12s960square360frame124BPM afrobeat/marimba52 film SHA25698332a0fc228f79c04adcaac11374c60d5f28645629cbdfd07b529d4c723bd10; unchangedmusic/video/311uniqueframes/full decode/threeframes/nativefiniteendsstatic/hostactionsreal.

Integrated npm run check passed1,196tests/55files. npm pack --dry-run passed218members/475275bytes; declared exports/CSS and SSR checks passed. Published-scope CI follows release.

## 0.53.0 developer CLI (2026-10-12)

Sharedchecker extracted fromexistingworkbench preservinggrammar/vectors/threeconfiguredrules; 12CLItests plusworkbench suite.25actual distributed NodeCLIprocess cases includingUTF8/path/root/symlink/byteunitcaps/exitcodes/advisoryhook/helpversion; no clientdeliveryorWindowsFSsandboxclaim.30native desktop cases44px/16px/noflow; actualediting/caret/CtrlEnter/diagnosticselection/stalesnapshot/file/Blob/race/quiet/finitecancel. Near63954UTF16browsercheck21.5msincludingDOMexcludepaint. Node78919-byte command includes4MITnotices4535B, no browsermaterialparser/runtime deps. Process/native/puretimings separatelyscoped, noGPU/FPS/speedupclaim.

Original608419-byte12s960square360-frame130BPM flute-FM breakbeatseed67 film SHA256cea830af765441a883c992cc2f77fab72d2856bab2a75f29b6608d8c06ca2365; recapturedactualCLI0.53/313uniqueframes/threeframes/full decode/native10.43+1.57hold; CLIpanel labeled savedreceipts, notlivebrowserterminal. Originalscorepreserved.

Integrated npm run check passed1,208tests/56files includingactualdistributedCLI verifier. npm pack --dry-run passed221members/510095bytes with executablecli.js mode755 andfourMITnotices. Final0.53binary78919B/SHA25670dbfe6695ac79823effac48aeb760142bc33c268214905029d944a4590cbcdd matchesrecapturedfilm/receipts.25CLIprocess fixtures regenerated withcommittedsource/input/artifacthashes and no temporarypatch reads; finalsitebuild passed. Published-scope CI followsrelease.

## 0.54.0 agent integration plans (2026-10-12)

33focusedplanner +25canonicalintegrationbrief tests. PureSSR-safe /agent-pack handlesselectedexactcatalog/runtimevalues/namespaceimports/scopedglobs/quotedtasks/fixedcreate-onlydestinations/caseancestorconflicts withoutFS/network/install/hook/permissionwrites.35native desktop cases44/16/noflow/caret/stalereview/portable/conflict/exportBlob13956BcanCreatefalse/reviewOnly/exclusiveCreationRequired; actualclientdelivery/OSbackground/physicalphonesSafariATunverified. Standalone31500raw11032gzip includescanonicalbrief; separatepurevsconnectedhosttimings, noGPU/FPS/speedupclaim.

Original626421-byte12s960square360-frame122BPM kalimba/wood afro71 film SHAd6fe7c90a7f9370d13e545c947050dda27afb5a9cb238faf99f22f15c71e3ef4; recapturedexplicitcatalog0.54/native10.39+1.61hold/281uniqueframes/full decode/threeframespass; no clientinstallation/AIexecution shown.

Integrated npm run check passed1,241tests/57files incldistributedCLI. npm pack --dry-run passed224members/521302bytes/SSR/publicexports. Final0.54catalog rebuiltfromactual4declaredNodevalue/CSSexports, source hashes matchacceptedcore, modelbenchmarkfresh31500raw11032gzip withpure100-call medians3.586/6.007/6.046ms(cursor/both/conflict), noDOM/rendering/clientloadingcost. Published-scope CI followsrelease.
