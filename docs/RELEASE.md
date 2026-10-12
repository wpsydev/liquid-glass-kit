Good context should respect attention. **0.29.0-preview.1** adds optional `/preview-intent`: delayed fine-pointer entry, immediate keyboard access and an explicit native-button path for touch.

A pointer can cross into the panel without losing it. Escape closes without moving focus or reopening on unchanged focus. Manual show pins the panel. Closing or replacing intent aborts the old host request; the host checks the signal before applying content. Navigation links stay links.

[Context Studio](https://wpsydev.github.io/liquid-glass-kit/preview/) has three original directions: a noninteractive description, a real selectable disclosure and cancelable local details. Its finite 10.1 s tour uses host-authored 160 ms reveals with quiet/OS fallbacks. An original twelve-second funk/brass film is attached.

Semantics are explicit: authored tooltip descriptions, native-button disclosures or host-owned none. Portable hidden panels are default; explicitly authored manual popovers are optional. The helper does not position, animate, move focus or fetch.

Fifteen native desktop Chromium viewport/content cases fit 320–1440 px with 44 px controls and 16 px fields. Actual native popover selection and Escape were tested. Synthetic pointer crossing and touch-ignore checks are reported separately; physical phones, Safari and assistive technology remain unverified.

Standalone optional JS is 3,299 bytes gzip. Five batches of 20 cycles over 64 connected manual descriptions had 42.6 ms median per batch, 6,400 opens/closes and no custom RAF or JavaScript rectangle reads. That excludes placement, content requests, animation, rendering and paint. No comparative speedup or FPS claim; core/default CSS remains unchanged.

[API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/PREVIEW_INTENT.md) · [Evidence](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/preview-intent-browser.json) · [Research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/13-hoverstates.md)

Hoverstates informed an independent study of useful context, without copying source, art, fonts or recordings. Use the attached ready-built archive or `npm i github:wpsydev/liquid-glass-kit#v0.29.0-preview.1`. npm registry publication remains pending.
