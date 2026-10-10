# Validation evidence

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
