Keep the cards. Keep native scrolling. **0.33.0-preview.1** adds optional `/snap-deck` and `/snap-deck.css`.

Settled LTR/RTL views drive Previous/Next state. Cached targets avoid rectangle reads on ordinary scroll and repeated requests. One authored tree keeps ordinary links, buttons and focus. No autoplay, clones, custom keys or focus transfer.

[Offset](https://wpsydev.github.io/liquid-glass-kit/deck/) is an original art-direction board with real local concept selection. Its twelve-second132BPM garage/bell video shows actual native movement and RTL selection. The final frame is held for readability; export30fps is not appFPS.

Native testing found and fixed a first-request race: an unchanged initial ResizeObserver delivery no longer cancels smooth RTL movement. Thirty focused tests and fifteen native desktop Chromium cases cover320–1440px,44px targets and16px fields; physical phones/Safari/AT unverified.

Optional JS2,700bytesgzip/CSS443bytesgzip. Separate32-card probes:5×20 lifecycle batches had4.5ms median/6,600total rectangle reads; cached20×4instant-request batches had0.70ms median/0rectangle rereads. Both scheduled0customRAF. Native scroll animation/layout/paint are excluded; no comparative speedup claim.

[API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/SNAP_DECK.md) · [Native evidence](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/snap-deck-functional.json) · [Research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/17-supahero.md)

Use the attached ready-built archive or `npm i github:wpsydev/liquid-glass-kit#v0.33.0-preview.1`. npm registry publication remains pending. Default core/material/CSS stay unchanged.
