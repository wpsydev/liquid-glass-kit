A concrete design contract helps agents build with intent. **0.18.0-preview.1** adds optional `/design-contract`: one bounded typed configuration exports canonical DESIGN.md guidance, matching scoped theme CSS and this library's roundtrippable version-1 JSON.

It runs in Node or the browser without runtime dependencies. Generate the files before deployment to keep the authoring utility out of client bundles. The default material CSS and root imports remain unchanged. Theme scope, semantic controls and actual material attributes are explicit. Opaque-token contrast checks do not certify translucent rendered UI.

The original Token Studio offers three directions, palette/material controls, Preview/DESIGN.md/CSS/JSON views and real download requests. Native Chromium checked all sixty preset/view combinations across five viewport sizes; fields are 16px and controls at least 44px. Invalid colors disable exports and recovery is verified. These are desktop viewport/interaction checks, not physical iPhone/Safari certification.

Three generated documents passed the official isolated `@google/design.md@0.4.0` validator with zero errors and one optional accent-token orphan warning each. Glass-specific guidance stays in prose/own JSON rather than invented Google fields. No external MCP service or agent indexing is promised.

The optional standalone utility including shared material helpers is **4,812 bytes gzip**. The measured Node authoring operation creates a contract, exports all three files, imports the own JSON and compares the roundtrip: median 0.04275ms/p95 0.05298ms across 25 rounds of 500 operations after 100 warmups on Node 24.21.0/AMD Ryzen 5 6600H. These measure generation only, not rendering, network or application speedups.

[Try Token Studio](https://wpsydev.github.io/liquid-glass-kit/design-contract/) · [API and scope](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/DESIGN_CONTRACT.md) · [Official validation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/design-contract-validation.json) · [Raw benchmark](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/design-contract.json).

Original 12-second film, original 120BPM disco score. Inspired by the public designmd.ai reference workflow and Google's public DESIGN.md spec; no library assets, remote fonts or paid material were copied.

Install the ready-built archive attached to this prerelease, or `npm i github:wpsydev/liquid-glass-kit#v0.18.0-preview.1`. npm registry publication remains pending.
