Commit the action, then add a small celebration. **0.24.0-preview.1** adds optional `/interaction-feedback`: finite pixels, sparks or ripples on a decorative canvas.

Native controls and real state stay with the host. The renderer accepts canvas-local dimensions and points, pools at most 256 particles and four bursts, caps backing pixels and DPR, and runs only while feedback is active. Reduced motion, hidden documents or detachment cancel work without changing the host action. It performs no input handling, DOM geometry polling or pixel readback.

[Good Loop](https://wpsydev.github.io/liquid-glass-kit/feedback/) demonstrates actual local note saving, effort commits, radio color changes and checklist completion. Fifteen native desktop Chromium viewport/effect cases fit 320–1440px with 44px controls and associated labels, and 16px fields. Quiet mode keeps committed state and stops decorative frames. Browser evidence is separate from physical-device and assistive-technology validation.

Optional standalone JavaScript: 2,833 bytes gzip including shared helpers, with no runtime dependency or default import change. Native finite cases at 262,088 and 1,048,576 actual backing pixels completed before 800ms; subsequent 250ms idle windows made zero RAF requests and zero JavaScript rectangle reads. Draw, frame and submission counters are not FPS or GPU timing; no comparative speedup is claimed. Reproduce in an active tab with the included browser probe.

[API and host boundaries](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/INTERACTION_FEEDBACK.md) · [Measured scope](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/interaction-feedback-browser.json) · [Research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/08-godly-recent.md)

Godly/Recent's interaction examples informed original finite feedback; no code or media was copied. Original 12-second film with a 160BPM drum-and-bass score attached.

Use the ready-built archive attached here, or `npm i github:wpsydev/liquid-glass-kit#v0.24.0-preview.1`. npm registry publication remains pending.
