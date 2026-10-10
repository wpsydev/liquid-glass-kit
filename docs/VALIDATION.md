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
