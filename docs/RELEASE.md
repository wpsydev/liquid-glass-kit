A command palette should keep the user in control. **0.19.0-preview.1** adds optional `/command-palette` and `/command-palette.css`: a native modal combobox for host-owned commands, cached accent-insensitive search and bounded visible results.

Keyboard navigation preserves text editing and IME. Tab cycles through the two owned controls; Escape returns focus to the opener. Opt-in Mod+K stays outside editable fields. Async guards prevent duplicate activation and stale catalog/UI completion; failures expose retry. Execution, revision validation and cancellation remain with the host.

Cutroom is an original notebook with actual local actions: switch views/theme/review, open help, prepare a pending handoff or rehearse an error. No upload or production service is connected. Native browser validation covers 30 query/theme/viewport combinations, 44px buttons, 16px search input, actual modal/focus behavior and rejected-then-successful callbacks. Film review found and corrected a theme-variable inheritance bug before release.

Optional standalone JS is **3,076 bytes gzip**, separate CSS **1,470 bytes gzip**. Five native Chrome 152 batches of 30 mount/open/query/update/destroy cycles over 1,000 commands measured median 77.9ms and at most 20 visible results, with zero custom RAF requests or JavaScript rectangle reads. Synchronous native modal/focus work is included. These are UI lifecycle/query timings, not paint/compositing/FPS or a comparative speedup. Default material CSS and root imports remain unchanged.

[Try Cutroom](https://wpsydev.github.io/liquid-glass-kit/commands/) · [API and host boundaries](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/COMMAND_PALETTE.md) · [Raw measurement](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/command-palette-browser.json) · [Reference investigation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/03-vibeprompts.md).

Original 12-second film with an original 112BPM synthpop score. The public VibePrompts examples inspired the pattern; no reference source, fonts, assets or footage were reused. Native dialog support is required; desktop Chromium CSS viewports do not establish physical-phone/Safari or assistive-technology certification.

Install the ready-built archive attached to this prerelease, or `npm i github:wpsydev/liquid-glass-kit#v0.19.0-preview.1`. npm registry publication remains pending.
