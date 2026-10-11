// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getGlassCompositionProps } from '../src/composition.js';
import type { GlassCompositionOptions } from '../src/composition.js';

const css = readFileSync(new URL('../src/composition.css', import.meta.url), 'utf8');
const unknownOptions = (value: unknown) => getGlassCompositionProps(value as GlassCompositionOptions);

describe('intrinsic glass composition props', () => {
  it('is import-safe and returns deterministic defaults without browser state', () => {
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
    expect(getGlassCompositionProps()).toEqual({
      className: 'lg-composition', 'data-lg-layout': 'split', 'data-lg-ratio': '1:1', 'data-lg-density': 'comfortable',
      style: { '--lg-composition-gap': '1.5rem', '--lg-composition-measure': '60ch', '--lg-composition-leading': '1', '--lg-composition-trailing': '1' },
    });
    expect(getGlassCompositionProps()).toEqual(getGlassCompositionProps());
  });

  it.each(['split', 'stack', 'cluster', 'grid'] as const)('supports %s without inventing element semantics', layout => {
    const props = getGlassCompositionProps({ layout });
    expect(props['data-lg-layout']).toBe(layout);
    expect(Object.keys(props).sort()).toEqual(['className', 'data-lg-density', 'data-lg-layout', 'data-lg-ratio', 'style']);
    expect(props).not.toHaveProperty('role'); expect(props).not.toHaveProperty('tabIndex'); expect(props).not.toHaveProperty('aria-hidden');
  });

  it.each([
    ['compact', '.75rem'], ['comfortable', '1.5rem'], ['editorial', '2.5rem'],
  ] as const)('uses %s spacing without introducing smaller target tokens', (density, gap) => {
    const props = getGlassCompositionProps({ density }); expect(props.style['--lg-composition-gap']).toBe(gap);
    expect(Object.keys(props.style).some(key => key.includes('target') || key.includes('font'))).toBe(false);
  });

  it('represents asymmetry in flex weights while preserving first/second source order', () => {
    expect(getGlassCompositionProps({ ratio: '2:1' }).style).toMatchObject({ '--lg-composition-leading': '2', '--lg-composition-trailing': '1' });
    expect(getGlassCompositionProps({ ratio: '1:2' }).style).toMatchObject({ '--lg-composition-leading': '1', '--lg-composition-trailing': '2' });
    expect(getGlassCompositionProps({ ratio: '1:1' }).style).toMatchObject({ '--lg-composition-leading': '1', '--lg-composition-trailing': '1' });
  });

  it.each([[0, '30ch'], [-10, '30ch'], [30, '30ch'], [60.5, '60.5ch'], [90, '90ch'], [1000, '90ch'], [Infinity, '60ch'], [NaN, '60ch']])('bounds measure %s to %s', (measure, expected) => {
    expect(getGlassCompositionProps({ measure: measure as number }).style['--lg-composition-measure']).toBe(expected);
  });

  it.each([undefined, null, 'grid', 30, [], true])('falls back for non-object runtime options %s', value => {
    expect(unknownOptions(value)).toEqual(getGlassCompositionProps());
  });

  it('does not coerce invalid CSS-bearing enum or numeric values into the output', () => {
    for (const value of ['grid; color:red', '<script>', 'calc(99px)', '60', {}, Symbol('invalid')]) {
      expect(unknownOptions({ layout: value, ratio: value, density: value, measure: value })).toEqual(getGlassCompositionProps());
    }
    const props = unknownOptions({ layout: 'grid', density: 'compact', measure: '80', extra: '<script>' });
    expect(props['data-lg-layout']).toBe('grid'); expect(props.style['--lg-composition-measure']).toBe('60ch'); expect(JSON.stringify(props)).not.toContain('script');
  });

  it('does not retain or mutate callers or share returned style objects', () => {
    const options: GlassCompositionOptions = Object.freeze({ layout: 'grid', measure: 75 });
    const first = getGlassCompositionProps(options), next = getGlassCompositionProps(options);
    first.style['--lg-composition-measure'] = '999ch';
    expect(next.style['--lg-composition-measure']).toBe('75ch'); expect(options.measure).toBe(75);
  });
});

describe('composition CSS safety and fallback contract', () => {
  it('keeps grid and split lower bounds inside the available inline size', () => {
    expect(css).toContain('minmax(min(100%, 18rem), 1fr)');
    expect(css).toContain('min-inline-size: min(100%, 18rem);'); expect(css).toContain('flex: 1 1 0;');
    expect(css).toContain('max-inline-size: 100%;'); expect(css).toContain('overflow-wrap: anywhere;');
    expect(css).not.toMatch(/grid-template-columns:\s*(?:repeat\([^,]+,\s*)?minmax\(18rem/);
  });

  it('queries descendants rather than making a container query its own size', () => {
    expect(css).toContain('container-name: lg-composition;'); expect(css).toContain('container-type: inline-size;');
    const query = css.match(/@container lg-composition \(max-width: 40rem\) \{([\s\S]*?)\n\}/)![1];
    expect(query).toContain(".lg-composition[data-lg-layout='split'] > * { flex-basis: 100%; }");
    expect(query).not.toMatch(/\.lg-composition(?:\[[^\]]+\])?\s*\{/);
    expect(css).toContain('flex-wrap: wrap;');
  });

  it('provides static type before container-relative enhancement and balances only the heading opt-in', () => {
    const fallback = css.indexOf('font-size: 2rem;'), enhanced = css.indexOf('font-size: clamp(');
    expect(fallback).toBeGreaterThan(-1); expect(enhanced).toBeGreaterThan(fallback);
    expect(css).toContain('@supports (font-size: 1cqi)');
    expect(css).toContain('.lg-composition .lg-composition-heading {');
    expect(css).toContain('clamp(1.875rem, calc(1.1rem + 3cqi), 4.5rem)');
    expect(css.match(/text-wrap:\s*balance/g)).toHaveLength(1);
    expect(css).toMatch(/\.lg-composition-heading\s*\{[^}]*text-wrap: balance;/);
    expect(css).toContain('font-family: inherit;'); expect(css).not.toContain('@font-face');
  });

  it('does not reset the page, reorder content, conceal focus or introduce motion/render effects', () => {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(/(?:^|\})\s*(?:body|html|:root|\*)\s*\{/);
    expect(stripped).not.toMatch(/\border\s*:|row-reverse|column-reverse|grid-auto-flow\s*:\s*dense/);
    expect(stripped).not.toMatch(/outline\s*:\s*(?:none|0)|overflow\s*:\s*hidden|opacity\s*:|pointer-events\s*:\s*none/);
    expect(stripped).not.toMatch(/@keyframes|animation\s*:|transition\s*:|backdrop-filter|will-change|transform\s*:/);
    expect(stripped).not.toContain('@import');
  });

  it('keeps 44px controls at all densities and leaves ordinary inline links alone', () => {
    const controls = css.match(/\.lg-composition :where\(([^\n]+)\) \{([^}]+)\}/)!;
    expect(controls[1]).toContain('button'); expect(controls[1]).toContain("input:not([type='hidden'])");
    expect(controls[1]).toContain('.lg-composition-control'); expect(controls[1]).not.toContain('a[href]');
    expect(controls[2]).toContain('min-inline-size: 44px;'); expect(controls[2]).toContain('min-block-size: 44px;');
    expect(css).not.toMatch(/data-lg-density='compact'[^}]*min-(?:block|inline)-size/);
  });
});
