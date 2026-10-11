Fieldnotes adds a deliberate scroll entrance to existing web interfaces. Supported browsers own the entry timeline; other environments use a timed viewport entrance or static content.

**0.16.0-preview.1** introduces optional `/scroll-reveal`. `attachGlassScrollReveal()` animates opacity and individual translate on a dedicated visual layer, preserves native semantics, exposes content on focus, respects live reduced motion and restores author inline values/priorities on cleanup. It has no custom animation-frame loop, scroll handler or geometry polling. Root imports and the portable material stylesheet remain unchanged.

The native timeline is tied to the nearest ancestor scroller. Decorative clipping should use `overflow:clip`; an `overflow:hidden` wrapper can become an unintended timeline source. The IntersectionObserver fallback is a timed entrance, not equivalent continuous scrubbing. Unsupported browsers remain visible. No pixel-identical Apple rendering or universal timeline support is claimed.

The standalone optional controller bundle including shared helpers is **1,716 bytes gzip**. Five warm native Chrome152 batches of200 connected-element attach/destroy operations measured median10.3ms for the native path and8.1ms for the viewport path, with0 customRAF requests,0 rectangle reads and0 scroll listeners. These are synchronous setup/cleanup samples, not rendering/FPS, device-wide speedups or a comparison with another library. [Raw samples](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/scroll-reveal-browser.json).

[Try Fieldnotes](https://wpsydev.github.io/liquid-glass-kit/scroll/) · [API and limits](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/SCROLL_REVEAL.md) · [Resource investigation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/01-scrolltide.md).

The original12-second study film uses an original160BPM drum-and-bass score. No source template, paid prompt, artwork or promotional footage was copied. Inspiration is credited to Scrolltide's public scroll-story examples; this is an independent implementation.

Install the ready-built archive attached to this prerelease, or `npm i github:wpsydev/liquid-glass-kit#v0.16.0-preview.1`. npm registry publication remains pending. Browser validation and performance scope are separate from unit tests.
