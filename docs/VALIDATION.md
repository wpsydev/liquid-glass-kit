# Validation evidence

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
