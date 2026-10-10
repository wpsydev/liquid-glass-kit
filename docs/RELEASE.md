Liquid Glass Kit's motion preview adds reusable spring interactions and a live motion playground.

- `attachGlassMotion`: tactile press/release, directional stretch and spring-driven appearance/exit transitions.
- `attachGlassIndicator(..., { motion: 'spring' })`: a selection backing that preserves velocity when retargeted. The existing ease mode remains the default.
- Optional `motion` props in React/Vue and motion attributes on the custom element. The same dependency-free DOM API works in other web stacks.
- Explicit and system reduced-motion preferences snap transitions; cancellation and cleanup stop work. No animation loop runs at rest.

[Live motion playground](https://wpsydev.github.io/liquid-glass-kit/motion/) · [API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/API.md) · [Apple motion references](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/MOTION_RESEARCH.md)

Install the attached package archive, or use `npm i github:wpsydev/liquid-glass-kit#v0.3.0-preview.1`. npm registry publication remains pending. The release workflow builds the archive after project checks and includes the recorded video when present.

These are independent web animations inspired by Apple's design principles. Geometry transitions and spring reveals do not reproduce native optical shape merging, shared background sampling or Apple's private compositor. Native controls retain their semantics; applications own routing, focus, popover visibility and dismissal. `enter`/`exit` animate visuals only.

Motion controllers own individual scale/opacity and motion variables. Use wrappers around consumers with their own transforms or animations. Attach material first and motion second, then destroy motion before material. See the changelog for exact options and composition guidance. Rendering is verified in the T3 Chromium preview; Safari, Firefox and physical iOS devices are not yet certified.
