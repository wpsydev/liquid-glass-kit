// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getGlassImageProps, getGlassPictureProps } from '../src/responsive-image.js';
import type { GlassImageOptions, GlassPictureOptions } from '../src/responsive-image.js';

const base = { src: '/images/original.svg', alt: 'A blue instrument on a cream background', width: 1200, height: 800 };
const css = readFileSync(new URL('../src/responsive-image.css', import.meta.url), 'utf8');
const unsafeImage = (value: unknown) => getGlassImageProps(value as GlassImageOptions);
const unsafePicture = (value: unknown) => getGlassPictureProps(value as GlassPictureOptions);

describe('portable image props and source selection inputs', () => {
  it('is deterministic and browser-free without inventing a high-priority policy', () => {
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
    const result = getGlassImageProps(base);
    expect(result).toEqual(getGlassImageProps(base));
    expect(result).toMatchObject({ src: base.src, alt: base.alt, width: 1200, height: 800, loading: 'eager', fetchPriority: 'auto', decoding: 'auto' });
    expect(result).not.toHaveProperty('srcSet'); expect(result).not.toHaveProperty('sizes');
    expect(result.style).not.toHaveProperty('--lg-image-ratio');
  });

  it('applies only an explicitly requested critical or below-fold policy', () => {
    expect(getGlassImageProps({ ...base, priority: 'critical' })).toMatchObject({ loading: 'eager', fetchPriority: 'high', decoding: 'auto' });
    expect(getGlassImageProps({ ...base, priority: 'below-fold' })).toMatchObject({ loading: 'lazy', fetchPriority: 'low', decoding: 'async' });
    expect(() => unsafeImage({ ...base, priority: 'preload' })).toThrow(/priority/);
  });

  it('sorts width candidates without changing supplied URLs or caller order', () => {
    const candidates = Object.freeze([Object.freeze({ src: '/wide.avif?v=2&quality=80', width: 1200 }), Object.freeze({ src: '/narrow.avif', width: 480 })]);
    const sizes = '(width >= 48rem) min(60vw, 1000px), calc(100vw - 2rem)';
    const result = getGlassImageProps(Object.freeze({ ...base, candidates, sizes }));
    expect(result.srcSet).toBe('/narrow.avif 480w, /wide.avif?v=2&quality=80 1200w');
    expect(result.sizes).toBe(sizes); expect(candidates[0].width).toBe(1200);
    expect(() => getGlassImageProps({ ...base, candidates })).toThrow(/sizes/);
    expect(() => getGlassImageProps({ ...base, sizes: '100vw' })).toThrow(/candidates/);
  });

  it('preserves picture source order and distinct intrinsic crop dimensions', () => {
    const picture = getGlassPictureProps({ image: base, sources: [
      { media: '(width < 40rem)', type: 'IMAGE/AVIF', candidates: [{ src: '/portrait.avif', width: 600 }], sizes: '100vw', width: 600, height: 900 },
      { type: 'image/webp', candidates: [{ src: '/landscape.webp', width: 1200 }], sizes: 'min(80vw, 1200px)', width: 1200, height: 800 },
    ] });
    expect(picture.sources).toEqual([
      { srcSet: '/portrait.avif 600w', sizes: '100vw', width: 600, height: 900, media: '(width < 40rem)', type: 'image/avif' },
      { srcSet: '/landscape.webp 1200w', sizes: 'min(80vw, 1200px)', width: 1200, height: 800, type: 'image/webp' },
    ]);
    expect(picture.image.width).toBe(1200); expect(picture.image.height).toBe(800);
    expect(picture.image.style).not.toHaveProperty('--lg-image-ratio');
    expect(getGlassPictureProps({ image: base }).sources).toEqual([]);
  });

  it('keeps explicit display crops separate from natural asset dimensions', () => {
    const image = getGlassImageProps({ ...base, fit: 'cover', focalPoint: { x: 72.5, y: 0 }, aspectRatio: { width: 3, height: 4 } });
    expect(image).toMatchObject({ width: 1200, height: 800, 'data-lg-image-crop': 'true' });
    expect(image.style).toEqual({ '--lg-image-fit': 'cover', '--lg-image-position': '72.5% 0%', '--lg-image-ratio': '3 / 4' });
    expect(getGlassImageProps({ ...base, focalPoint: { x: -0, y: 100 } }).style['--lg-image-position']).toBe('0% 100%');
  });

  it('requires explicit alt intent while permitting deliberate decoration and literal text', () => {
    expect(getGlassImageProps({ ...base, alt: '' }).alt).toBe('');
    expect(() => unsafeImage({ ...base, alt: undefined })).toThrow(/alt/);
    expect(() => getGlassImageProps({ ...base, alt: '   ' })).toThrow(/alt/);
    const props = getGlassImageProps({ ...base, alt: '<script> is a label, "not markup"' });
    const html = renderToStaticMarkup(createElement('img', props));
    expect(html).toContain('alt="&lt;script&gt; is a label, &quot;not markup&quot;"');
    expect(html).not.toContain('<script>');
  });

  it('renders source attributes and the required fallback through native React casing', () => {
    const picture = getGlassPictureProps({ image: { ...base, priority: 'below-fold' }, sources: [{ width: 400, height: 600, sizes: '100vw', media: '(max-width: 30rem)', candidates: [{ src: '/portrait.webp?x=1&y=2', width: 400 }] }] });
    const html = renderToStaticMarkup(createElement('picture', {}, ...picture.sources.map((props, index) => createElement('source', { ...props, key: index })), createElement('img', picture.image)));
    expect(html.indexOf('<source')).toBeLessThan(html.indexOf('<img'));
    expect(html).toContain('srcSet="/portrait.webp?x=1&amp;y=2 400w"');
    expect(html).toContain('fetchPriority="low"'); expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('rel="preload"');
    expect(html).toContain('width="400" height="600"'); expect(html).toContain('width="1200" height="800"');
  });

  it('accepts bounded supplied HTTP, relative, blob and raster-data resources', () => {
    for (const src of ['/img/a.svg', '../img/a.png', '//cdn.example/a.webp', 'https://cdn.example/a.avif?x=1&y=2', 'http://localhost:5173/a.png', 'blob:https://example.test/123', 'blob:null/123', 'data:image/png;base64,iVBORw0KGgo=']) {
      expect(getGlassImageProps({ ...base, src }).src).toBe(src);
    }
  });

  it.each(['javascript:alert(1)', 'vbscript:test', 'file:///tmp/a.png', 'ftp://example/a.png', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', 'blob:javascript:evil', 'https:/example/a.png', '/a.png 2x', '/a.png\n1200w', '/a.png,', '/a".png', 'x'.repeat(8193)])('rejects unsafe or ambiguous resource %s', src => {
    expect(() => getGlassImageProps({ ...base, src })).toThrow();
  });

  it.each([0, -1, 1.5, 32769, NaN, Infinity, '600', null])('rejects invalid intrinsic dimension %s', width => {
    expect(() => unsafeImage({ ...base, width })).toThrow(/integer/);
    expect(() => unsafeImage({ ...base, height: width })).toThrow(/integer/);
  });

  it('bounds candidates, source groups and attribute text without pretending to parse native CSS', () => {
    const candidate = { src: '/a.png', width: 600 };
    expect(() => getGlassImageProps({ ...base, candidates: [], sizes: '100vw' })).toThrow(/1–16/);
    expect(() => getGlassImageProps({ ...base, candidates: Array(17).fill(candidate), sizes: '100vw' })).toThrow(/1–16/);
    expect(() => getGlassImageProps({ ...base, candidates: [candidate, candidate], sizes: '100vw' })).toThrow(/unique/);
    expect(() => getGlassImageProps({ ...base, candidates: Array(1), sizes: '100vw' })).toThrow(/object/);
    const group = { width: 600, height: 400, candidates: [candidate], sizes: '100vw' };
    expect(() => getGlassPictureProps({ image: base, sources: Array(9).fill(group) })).toThrow(/eight/);
    for (const sizes of ['', ' ', 'x'.repeat(2049), '100vw\n', '"100vw"', 'auto,'.repeat(130)]) {
      expect(() => getGlassImageProps({ ...base, candidates: [candidate], sizes })).toThrow();
    }
    for (const type of ['text/html', 'image/png; codecs=bad', 'image/png" onerror="x']) {
      expect(() => getGlassPictureProps({ image: base, sources: [{ ...group, type }] })).toThrow(/MIME/);
    }
    expect(() => unsafePicture({ image: base, sources: 'not-an-array' })).toThrow(/array/);
    expect(() => unsafePicture({ image: base, sources: null })).toThrow(/array/);
    expect(() => unsafePicture({ image: base, sources: [null] })).toThrow(/object/);
    expect(() => unsafePicture({ image: base, sources: Array(1) })).toThrow(/object/);
  });

  it('rejects CSS-bearing numeric/enumerated inputs instead of injecting a style string', () => {
    for (const focalPoint of [{ x: NaN, y: 50 }, { x: 101, y: 50 }, { x: -1, y: 50 }, { x: '50%;color:red', y: 50 }]) {
      expect(() => unsafeImage({ ...base, focalPoint })).toThrow();
    }
    expect(() => unsafeImage({ ...base, fit: 'cover; color:red' })).toThrow(/fit/);
    expect(() => unsafeImage({ ...base, fit: null })).toThrow(/fit/);
    expect(() => unsafeImage({ ...base, priority: null })).toThrow(/priority/);
    expect(() => unsafeImage({ ...base, aspectRatio: { width: '1; color:red', height: 1 } })).toThrow(/integer/);
    for (const options of [undefined, null, [], 'image']) expect(() => unsafeImage(options)).toThrow(/object/);
  });

  it('shares neither styles nor source props between calls', () => {
    const first = getGlassImageProps(base); first.style['--lg-image-fit'] = 'fill';
    expect(getGlassImageProps(base).style['--lg-image-fit']).toBe('contain');
    const source = Object.freeze({ width: 600, height: 400, sizes: '100vw', candidates: Object.freeze([Object.freeze({ src: '/a.png', width: 600 })]) });
    const options = Object.freeze({ image: Object.freeze(base), sources: Object.freeze([source]) });
    const result = getGlassPictureProps(options); result.sources[0].width = 1;
    expect(getGlassPictureProps(options).sources[0].width).toBe(600);
  });
});

describe('image layout contract', () => {
  it('preserves native reserved ratios unless the host explicitly requests a crop', () => {
    const imageRule = css.match(/\.lg-image\s*\{([^}]+)\}/)![1];
    expect(imageRule).not.toContain('aspect-ratio');
    expect(imageRule).toContain('block-size: auto'); expect(imageRule).toContain('max-inline-size: 100%');
    expect(css).toContain(".lg-image[data-lg-image-crop='true'] { aspect-ratio: var(--lg-image-ratio); }");
    expect(css).toContain('object-fit: var(--lg-image-fit, contain)');
    expect(css).not.toMatch(/picture[^}]*object-fit/);
  });

  it('keeps native captions readable without global rendering or animation effects', () => {
    expect(css).toContain('padding-block-start: .75rem'); expect(css).toContain('overflow-wrap: anywhere');
    expect(css).not.toMatch(/overflow:\s*hidden|position:\s*absolute|animation:|backdrop-filter|@import|@font-face/);
  });
});
