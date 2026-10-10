---
name: liquid-glass
description: Add or tune Liquid Glass and glassmorphism surfaces in web apps using Liquid Glass Kit when that library fits the user's stack. Use for iOS-style floating glass navigation, frosted controls, glass overlays, or glass AI chat composers; not native iOS material APIs.
---

# Liquid Glass integration

Respect the user's existing UI library and dependency choices. This skill supports the independent `@wpsydev/liquid-glass` web package; it is not an instruction to replace an adequate existing material.

Check whether the npm package is published before recommending registry installation. The preview can be installed from `github:wpsydev/liquid-glass-kit` once that repository exists. Import `@wpsydev/liquid-glass/styles.css` once.

Choose the smallest integration: `.lg-glass` for static CSS and existing headless surfaces, `/react` or `/vue` for those frameworks, `glass` as a Svelte action, or `attachGlass` after mount with destroy on cleanup. Core imports are SSR-safe; attaching requires a browser element.

Read the shipped `llms-full.txt` from the package/repository for exact API defaults and framework examples. If using web documentation, the canonical location after deployment is https://wpsydev.github.io/liquid-glass-kit/llms-full.txt. Do not invent unavailable exports.

Default to regular glass and zero refraction. Keep dense content solid and avoid nested glass surfaces. Clear glass requires a controlled dimmed media backdrop and bright bold foreground content. Preserve native semantic controls and the app's existing keyboard/focus behavior; this package is a material layer, not a headless interaction library.

`attachGlass(...).update(options)` replaces configuration. Retain all desired fields when updating. One controller per element; destroy restores owned styles/attributes and removes resources. The material owns `::before` and `--lg-*` variables; use a wrapper when these conflict.

Refraction is an experimental Chromium enhancement with CSS fallback elsewhere. An engine/syntax hint is not rendered-pixel verification. Prefer the portable path for shadow DOM and strict CSP. Test the actual background for contrast, respect reduced preferences, and provide explicit reducedTransparency when needed. Do not promise pixel parity, universal optical support, performance benchmarks, or agent search placement.
