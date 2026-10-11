Orbit adds a magnetic glass dock to real web interfaces: tools magnify and lift around pointer position or keyboard focus while native controls keep their layout positions. Touch keeps neutral presentation; reduced motion cancels scale and lift immediately.

**0.15.0-preview.1** introduces optional `/dock` and `/dock.css`. Use direct native buttons or links marked `data-lg-dock-item`, each with one noninteractive `data-lg-dock-visual` child. `attachGlassDock()` returns `refresh()`, replacement `update()` and `destroy()`. Application actions, selection and navigation remain host-owned. No new adapter props or runtime dependencies are required; importing the module is SSR-safe.

The Orbit workspace demonstrates five working creative tools: editable notes, three palettes, motion controls, local files and client-side SVG/JSON exports. Original solar artwork and an optional12-second tour show the new interaction. It is an independent web design informed by desktop Dock magnification, not Apple's renderer or OS integration.

The standalone optional controller bundle, including shared helpers, is **2,603 bytes gzip**; helper CSS is **225 bytes gzip**. Five warm native Chrome152 batches of1,000 pointer events on a six-button fixture scheduled one coalesced update each, read no geometry during submission/spring motion and reached0 pending/new idle frames after settlement. Median synchronous submission was4.2ms. This excludes layout, paint, compositor and glass blur; it is not app FPS, physical-phone performance or a before/after speedup. [Raw measurements](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/dock-browser.json) · [Scope and reproduction](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/PERFORMANCE.md).

172 tests in16 files, typechecks, packaged SSR imports and16 site routes pass. Browser checks, responsive layouts and media evidence are recorded separately in [Validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/VALIDATION.md).

[Try Orbit](https://wpsydev.github.io/liquid-glass-kit/dock/) · [API and integration recipes](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/DOCK.md) · [Design sources](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/DOCK_RESEARCH.md).

Install the ready-built archive attached to this prerelease or `npm i github:wpsydev/liquid-glass-kit#v0.15.0-preview.1`. npm registry publication remains pending. Existing material-only imports and the root API remain compatible; dock JavaScript/CSS are opt-in.
