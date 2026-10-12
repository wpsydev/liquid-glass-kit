// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveGlassReadability } from '../src/readability.js';
import type { GlassReadabilityOptions } from '../src/readability.js';
import { getGlassProps, resolveOptions } from '../src/material.js';

const unsafe = (value: unknown) => resolveGlassReadability(value as GlassReadabilityOptions);

describe('host-supplied sample readability preflight', () => {
  it('runs without browser globals and makes deterministic advisory estimates', () => {
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
    const first = resolveGlassReadability({ backdrops: ['#000', '#fff'] });
    expect(first).toEqual(resolveGlassReadability({ backdrops: ['#000', '#fff'] }));
    expect(first.chosenInk).toBe('#000000'); expect(first.solid).toBe(false); expect(first.minimumRatio).toBe(4.5);
    expect(first.estimatedFill).toEqual({ color: '#f5f7fc', alpha: .72 });
    expect(first.assumptions.join(' ')).toContain('no DOM or pixel sampling');
    expect(first.assumptions.join(' ')).toContain('not a WCAG conformance claim');
  });

  it('composites a known uniform fill in nonlinear sRGB before luminance conversion', () => {
    const result = resolveGlassReadability({ backdrops: ['#000'], material: { opacity: .5 }, candidates: ['#000'], minimumRatio: 1 });
    expect(result.estimatedFill.alpha).toBe(.36);
    expect(result.samples[0].estimatedRGB).toEqual([245 * .36, 247 * .36, 252 * .36]);
    expect(result.samples[0].estimatedSurface).toBe('#58595b');
    expect(result.samples[0].ratio).toBeGreaterThan(2); expect(result.samples[0].ratio).toBeLessThan(4);
  });

  it('uses the worst supplied sample rather than an average or a single favorable backdrop', () => {
    const result = resolveGlassReadability({ backdrops: ['#000', '#fff', '#f00'], material: { opacity: 0 } });
    expect(result.translucent.worstSampleRatio).toBe(1); expect(result.solid).toBe(true);
    expect(result.translucent.samples.map(sample => sample.backdrop)).toEqual(['#000000', '#ffffff', '#ff0000']);
    expect(result.translucent.worstSampleRatio).toBe(Math.min(...result.translucent.samples.map(sample => sample.ratio)));
    expect(result.reason).toContain('No supplied ink');
  });

  it('selects the candidate with the strongest worst-case ratio, retaining order for ties', () => {
    const result = resolveGlassReadability({ backdrops: ['#222', '#000'], material: { opacity: 0 }, candidates: ['#fff', '#000', '#f00'] });
    expect(result.chosenInk).toBe('#ffffff'); expect(result.solid).toBe(false);
    expect(result.worstSampleRatio).toBe(result.translucent.worstSampleRatio);
    const tie = resolveGlassReadability({ backdrops: ['#000', '#fff'], material: { opacity: 0 }, candidates: ['#fff', '#000'], minimumRatio: 1 });
    expect(tie.translucent.chosenInk).toBe('#ffffff'); expect(tie.solid).toBe(false);
  });

  it('pins the default light tone and derives an explicit dark tone from supplied options', () => {
    expect(resolveGlassReadability({ backdrops: ['#000'] }).props['data-lg-appearance']).toBe('light');
    const dark = resolveGlassReadability({ backdrops: ['#000', '#fff'], material: { appearance: 'dark' } });
    expect(dark.props['data-lg-appearance']).toBe('dark'); expect(dark.estimatedFill.color).toBe('#161c2b'); expect(dark.chosenInk).toBe('#ffffff');
    expect(resolveGlassReadability({ backdrops: ['#000'], material: { backdrop: 'dark' } }).props['data-lg-appearance']).toBe('dark');
    expect(resolveGlassReadability({ backdrops: ['#000'], material: { appearance: 'dark' }, appearance: 'light' }).props['data-lg-appearance']).toBe('light');
  });

  it('uses actual variant density, bounds material options and returns actual core props', () => {
    const material = { variant: 'clear' as const, opacity: 999, blur: 999, radius: -10, corner: 'continuous' as const, interactive: true };
    const result = resolveGlassReadability({ backdrops: ['#fff', '#000'], material });
    expect(result.estimatedFill.alpha).toBe(.24); expect(result.solid).toBe(true);
    const actual = getGlassProps({ ...resolveOptions(material), appearance: 'light', reducedTransparency: true });
    for (const [key, value] of Object.entries(actual)) if (key !== 'style') expect(result.props[key as keyof typeof result.props]).toEqual(value);
    for (const [key, value] of Object.entries(actual.style)) expect(result.props.style[key]).toBe(value);
    expect(result.props.style['--lg-fill-alpha']).toBe('0.24'); expect(result.props.style['--lg-ink']).toBe(result.chosenInk);
    expect(result.props.style['--lg-solid-fill']).toBe(result.opaqueFallback.fill);
  });

  it('keeps explicit clear-tone and opaque fallback pairs coherent', () => {
    for (const appearance of ['light', 'dark'] as const) {
      const result = resolveGlassReadability({ backdrops: ['#000', '#fff'], material: { variant: 'clear', reducedTransparency: true }, appearance });
      expect(result.solid).toBe(true); expect(result.props['data-lg-solid']).toBe('true'); expect(result.props['data-lg-appearance']).toBe(appearance);
      expect(result.opaqueFallback.ink).toBe(result.chosenInk); expect(result.opaqueFallback.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.samples.every(sample => sample.estimatedSurface === result.opaqueFallback.fill)).toBe(true);
      expect(result.worstSampleRatio).toBe(result.opaqueFallback.ratio);
      expect(result.reason).toContain('explicitly requested');
    }
  });

  it('preserves a readable opaque CSS preference fallback for custom translucent inks', () => {
    const result = resolveGlassReadability({ backdrops: ['#000'], material: { opacity: 0 }, candidates: ['#fff'] });
    expect(result.solid).toBe(false); expect(result.chosenInk).toBe('#ffffff');
    expect(result.opaqueFallback).toEqual({ fill: '#000000', ink: '#ffffff', ratio: 21 });
    expect(result.props.style['--lg-ink']).toBe('#ffffff'); expect(result.props.style['--lg-solid-fill']).toBe('#000000');
  });

  it('retains translucent evidence while returning a stronger opaque recommendation', () => {
    const result = resolveGlassReadability({ backdrops: ['#000', '#fff'], material: { opacity: 0 }, candidates: ['#f00'] });
    expect(result.translucent.chosenInk).toBe('#ff0000'); expect(result.solid).toBe(true);
    expect(result.chosenInk).toBe('#000000'); expect(result.worstSampleRatio).toBeGreaterThan(result.translucent.worstSampleRatio);
    expect(result.samples.map(sample => sample.estimatedSurface)).toEqual([result.opaqueFallback.fill, result.opaqueFallback.fill]);
    expect(result.translucent.samples.map(sample => sample.estimatedSurface)).toEqual(['#000000', '#ffffff']);
  });

  it('uses exact black/white opaque pairs when a stringent threshold requires them', () => {
    for (const appearance of ['light', 'dark'] as const) {
      const result = resolveGlassReadability({ backdrops: ['#000', '#fff'], appearance, minimumRatio: 21 });
      expect(result.solid).toBe(true); expect(result.worstSampleRatio).toBe(21);
      expect(result.opaqueFallback.fill).toBe(appearance === 'light' ? '#ffffff' : '#000000');
      expect(result.opaqueFallback.ink).toBe(appearance === 'light' ? '#000000' : '#ffffff');
    }
  });

  it('does not round a just-failing contrast ratio into a passing threshold', () => {
    const sampled = resolveGlassReadability({ backdrops: ['#fff'], material: { opacity: 0 }, candidates: ['#777'], minimumRatio: 1 });
    const exact = sampled.translucent.worstSampleRatio;
    expect(exact).toBeLessThan(4.5); expect(exact).toBeGreaterThan(4.47);
    expect(resolveGlassReadability({ backdrops: ['#fff'], material: { opacity: 0 }, candidates: ['#777'], minimumRatio: exact }).solid).toBe(false);
    expect(resolveGlassReadability({ backdrops: ['#fff'], material: { opacity: 0 }, candidates: ['#777'], minimumRatio: exact + 1e-10 }).solid).toBe(true);
  });

  it('forces opaque recommendations for unmodeled tint or experimental refraction', () => {
    for (const material of [{ tint: '#f00', tintOpacity: .2 }, { refraction: 1 }]) {
      const result = resolveGlassReadability({ backdrops: ['#fff'], material });
      expect(result.solid).toBe(true); expect(result.reason).toContain('outside the simplified model');
      expect(result.props['data-lg-solid']).toBe('true'); expect(result.worstSampleRatio).toBeGreaterThanOrEqual(4.5);
    }
    expect(resolveGlassReadability({ backdrops: ['#fff'], material: { tint: '#f00', tintOpacity: 0, refraction: 0 } }).solid).toBe(false);
  });

  it('explains omitted effects instead of claiming default blur/saturation predict rendered pixels', () => {
    const result = resolveGlassReadability({ backdrops: ['#fff'], material: { blur: 18, saturation: 1.35 } });
    expect(result.reason).toContain('simplified estimates only');
    expect(result.assumptions.join(' ')).toContain('Blur, gradients, tint, saturation, shadows, refraction');
    expect(result.assumptions.join(' ')).toContain('unseen content and stylesheet overrides');
    expect(result.assumptions.join(' ')).toContain('unrounded estimated RGB');
  });

  it('keeps known base-tone constants and density assumptions tied to the actual stylesheet', () => {
    const css = readFileSync(new URL('../src/material.css', import.meta.url), 'utf8');
    expect(css).toContain('--lg-fill-rgb: 245 247 252; --lg-fill-alpha: .72; --lg-solid-fill: #f4f6fb;');
    expect(css).toContain('--lg-fill-rgb: 22 28 43; --lg-solid-fill: #192133;');
    expect(css).toContain('--lg-fill-alpha: .24;');
    expect(css).toContain(".lg-glass[data-lg-solid='true']::before { -webkit-backdrop-filter: none; backdrop-filter: none; background: none; }");
  });

  it('bounds the threshold without numeric coercion and accepts maximum sample/candidate counts', () => {
    expect(resolveGlassReadability({ backdrops: ['#fff'], minimumRatio: -1 }).minimumRatio).toBe(1);
    expect(resolveGlassReadability({ backdrops: ['#fff'], minimumRatio: 999 }).minimumRatio).toBe(21);
    expect(resolveGlassReadability({ backdrops: Array(64).fill('#fff'), candidates: Array(8).fill('#000') }).samples).toHaveLength(64);
    for (const minimumRatio of ['4.5', NaN, Infinity, null]) expect(() => unsafe({ backdrops: ['#fff'], minimumRatio })).toThrow(/finite/);
  });

  it('does not mutate callers, shares no input arrays and normalizes opaque shorthand', () => {
    const backdrops = ['#ABC'], candidates = ['#000']; const input = Object.freeze({ backdrops, candidates });
    const result = resolveGlassReadability(input); backdrops[0] = '#fff'; candidates[0] = '#fff';
    expect(result.samples[0].backdrop).toBe('#aabbcc'); expect(result.translucent.chosenInk).toBe('#000000');
    result.props.style['--lg-ink'] = 'red'; expect(resolveGlassReadability({ backdrops: ['#abc'] }).props.style['--lg-ink']).not.toBe('red');
  });

  it.each(['red', '#ffff', '#ffffff00', 'var(--sample)', 'rgb(0 0 0)', '#fff;', '#fff\n', 'url(https://example.com)'])('rejects nonopaque or unsafe sample %s', value => {
    expect(() => resolveGlassReadability({ backdrops: [value] })).toThrow(/opaque/);
    expect(() => resolveGlassReadability({ backdrops: ['#fff'], candidates: [value] })).toThrow(/opaque/);
  });

  it('rejects empty, oversized, sparse or accessor-driven arrays', () => {
    for (const backdrops of [[], Array(65).fill('#fff'), new Array(1), '#fff']) expect(() => unsafe({ backdrops })).toThrow();
    for (const candidates of [[], Array(9).fill('#000'), new Array(1)]) expect(() => unsafe({ backdrops: ['#fff'], candidates })).toThrow();
    let called = false; const samples = ['#fff']; Object.defineProperty(samples, '0', { get() { called = true; return '#fff'; } });
    expect(() => unsafe({ backdrops: samples })).toThrow(/accessors/); expect(called).toBe(false);
  });

  it('rejects unknown/prototype fields and unsupported material types', () => {
    for (const payload of [null, [], Object.create({ backdrops: ['#fff'] }), { backdrops: ['#fff'], sampleDOM: true }, { backdrops: ['#fff'], appearance: 'auto' }, { backdrops: ['#fff'], material: { blur: '18' } }, { backdrops: ['#fff'], material: { interactive: 'yes' } }, { backdrops: ['#fff'], material: { tint: 'red' } }, { backdrops: ['#fff'], material: { radius: Infinity } }, { backdrops: ['#fff'], material: { corner: 'squircle' } }, JSON.parse('{"backdrops":["#fff"],"__proto__":{"admin":true}}')]) expect(() => unsafe(payload)).toThrow();
    let called = false; const payload = { backdrops: ['#fff'] }; Object.defineProperty(payload, 'material', { get() { called = true; return {}; } });
    expect(() => unsafe(payload)).toThrow(/accessors/); expect(called).toBe(false);
  });
});
