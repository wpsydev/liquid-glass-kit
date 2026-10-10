# Launch and adoption plan

## Positioning

Liquid Glass Kit is a portable web material layer: CSS first, typed enhancement, semantic controls, optional React/Vue, and clear instructions for agents. Lead with a real interactive demonstration and the small integration surface. Avoid universal optical parity, unmeasured performance, and “best library” claims.

## Before outreach

- Publish source, verify CI, enable GitHub Pages Actions, and verify public demo/docs links.
- Publish the package to npm when the maintainer's npm account/scope is available; replace repository install instructions only after verifying the registry artifact.
- Add GitHub topics: liquid-glass, glassmorphism, typescript, css, react, vue, svelte, ai, accessibility, ui-components.
- Set the repository website to the working demo. Pin the repository on the maintainer's profile if desired.
- Release a tagged preview with accurate compatibility limits and actual validation evidence.
- Capture a real 15–30 second demo: portable material → dark → solid preference → experimental lens. Include captions and the fallback behavior.

## Launch copy

### Developer social post

I built Liquid Glass Kit: a CSS-first Liquid Glass material for web apps.

Use it with HTML, React, Vue, or a Svelte action. The core has no runtime dependencies; native controls keep their semantics. Refraction is an explicit experimental Chromium enhancement, with portable CSS and solid fallbacks.

It includes a live playground, typed options, agent-readable docs, and a focused integration skill.

Try it: https://wpsydev.github.io/liquid-glass-kit/
Source: https://github.com/wpsydev/liquid-glass-kit

I'd love reproducible browser reports and feedback from real app integrations.

### Show HN draft

Title: Show HN: Liquid Glass Kit – CSS-first glass surfaces for any web stack

I wanted a material layer that could work with existing semantic controls rather than requiring a particular component stack. This preview provides CSS material styles, a TypeScript DOM controller, React/Vue adapters, and a Svelte action.

The tricky part is optical support: live SVG backdrop refraction behaves differently across engines. I made it opt-in and experimental; portable CSS and solid preference fallbacks are the default. The docs describe what is implemented and what remains unverified.

The playground shows the actual library. Feedback on browser behavior, foreground contrast, and integration ergonomics would be useful.

### Technical article outline

Title: Liquid Glass on the web: where CSS ends and refraction begins

Explain backdrop sampling and roots; demonstrate why filtering the foreground blurs labels; show the rounded-rectangle edge map; distinguish CSS support from rendered-pixel support; cover reduced preferences and explicit solid mode; finish with framework integration and honest limits. Link research sources and actual runnable code.

## Four weeks after release

| Week | Useful work | Evidence to collect |
| --- | --- | --- |
| 1 | Publish demo/release; share one tailored post per relevant community where allowed | Views, clone traffic, issues, real installs |
| 2 | Write optics article; add one genuine AI composer integration | Reproducible adoption report, documented bugs |
| 3 | Fix highest-impact browser/integration issues; invite small contributions | Successful fixes and outside contributors |
| 4 | Publish measured comparison/demo update; improve recipes based on real use | Retained usage, downloads after npm publication |

Measure stars alongside actual installs, retention, useful issues, and contributors. No purchased stars, mass unsolicited messages, fabricated testimonials, or artificial adoption counts. Community posts are prepared here; posting requires access to the intended account and its community rules. No external social posts are claimed by this document.
