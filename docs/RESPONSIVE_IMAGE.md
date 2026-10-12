# Real image resources, deliberate loading hints

Optional `/responsive-image` exports pure `getGlassImageProps(options)` and `getGlassPictureProps(options)`; import `/responsive-image.css` separately. The helper authors native props. It does not generate image variants, compress files, fetch/decode/preload resources, choose the browser's source or implement an image CDN.

```ts
import { getGlassImageProps } from '@wpsydev/liquid-glass/responsive-image';
const props = getGlassImageProps({
  src: '/art-1440.webp', alt: 'An original ceramic arch beside a blue sphere',
  width: 1440, height: 960,
  candidates: [{ src: '/art-480.webp', width: 480 },
    { src: '/art-960.webp', width: 960 }, { src: '/art-1440.webp', width: 1440 }],
  sizes: '(min-width: 900px) 700px, calc(100vw - 40px)',
  priority: 'critical', fit: 'cover', focalPoint: { x: 65, y: 52 },
});
```

Use actual intrinsic `width`/`height` (integers1–32768), supplied resources and meaningful alternative text. `alt:''` deliberately marks decoration; whitespace-only alt is rejected. Candidates contain1–16 unique intrinsic width descriptors; `sizes` is required with candidates and forbidden without them. The host authors valid sizes/media grammar; expressions are bounded, not fully parsed. Browser density-adjusted naturalWidth may differ from file pixel width. Candidates are sorted by width; the browser owns selection, caching and delivery.

Priorities: `normal` default emits eager/auto/auto loading/fetchPriority/decoding; `critical` emits eager/high/auto; `below-fold` emits lazy/low/async. Use critical sparingly for the actual leading image, below-fold for genuinely secondary content. These hints do not guarantee scheduling, zero initial requests or performance gains. React19 SSR may independently insert preload links for eager images, including normal/auto; this helper emits none. Native lazy thresholds can fetch images before they become visible.

Props use `className`, `srcSet`, `fetchPriority` and a CSS custom-property `style` map. React can spread the props and cast the style to `React.CSSProperties`; Vue/DOM adapters map className→class, srcSet→srcset, fetchPriority→fetchpriority and apply styles individually. Apply dimensions/loading hints/sizes before URLs, render picture sources before its image, and spread/map attributes rather than interpolating raw HTML. Imports and functions are SSR-safe with no runtime dependency.

Fit defaults contain, with cover/fill/none/scale-down supported. Focal x/y are percentages0–100, default50/50. Optional `aspectRatio:{width,height}` explicitly supplies a display crop and data marker; this changes framing, not file bytes. Without a crop the stylesheet leaves native selected-source ratio hints intact, rather than imposing the fallback ratio on all picture sources.

`getGlassPictureProps({image: imageOptions,sources:[...]})` returns `{image,sources}`. Up to8 ordered groups each require candidates/sizes/actual source width+height, optional media/type. Render `<source>` groups before the semantic fallback `<img>`. Supported media/type decides the native source; source dimension hints are browser-dependent. Keep fallback dimensions and alt meaningful. Source URLs are bounded relative/HTTP(S)/blob or small base64 raster URLs (≤8192 characters); no HTML/SVG data payload. Host owns licensing, blob lifetime and candidate consistency.

[Image Office](https://wpsydev.github.io/liquid-glass-kit/images/) contains nine original WebP still-life files (69,118 bytes total), critical hero, independently composed phone portrait and lazy editorial frames. Its finite9.6-second tour explicitly forces the portrait on desktop for inspection. Supplied pixel/byte metadata, actual currentSrc, density-adjusted natural size, rendered bounds and native hints are shown separately. Resource timings may be unavailable/size-redacted; reset does not clear cache. The observed shift sum excludes recent input and is not field/windowed CLS or a zero-shift guarantee.

[Research](resource-series/research/11-landbook.md) · [Payload/Node generation](../benchmarks/responsive-image.json) · [Browser source/layout evidence](../benchmarks/responsive-image-browser.json). Fifteen desktop Chromium responsive cases fit320–1440px with44px buttons/16px selects; physical phones/Safari/assistive technology are unverified. In a fresh390px/DPR2 blob fixture the hero selected960×640/7,316bytes, portrait960×1200/10,986bytes. A previously loaded1440 hero remained selected after shrinking: cache reuse is allowed, not a helper bug or promised byte reduction. Blob transfer establishes decoded asset/source behavior, not network performance. Public hosted delivery is checked separately after release.

Reproduce `npm run build`, `node scripts/responsive-image-benchmark.mjs`: standalone optional JS1805bytesgzip/CSS395bytesgzip; Node25×1000 props-generation+JSON batches for image/picture, not request/render/decoder/CLS/FPS/load timing. Original artwork can be regenerated with development-only Pillow via `python3 site/images/create-artwork.py`; consumers do not install Pillow.
