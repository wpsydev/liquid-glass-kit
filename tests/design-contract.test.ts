// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createGlassDesignContract, parseGlassDesignContract } from '../src/design-contract.js';
import type { GlassDesignContractOptions } from '../src/design-contract.js';
import { getGlassProps, resolveOptions } from '../src/material.js';

const input = (): GlassDesignContractOptions => ({
  name: 'Field Notes', description: 'A calm workspace for close reading',
  tokens: { colors: { background: '#fafaf8', foreground: '#141922', primary: '#ad482b', accent: '#468164' } },
});
const unsafe = (value: unknown) => createGlassDesignContract(value as GlassDesignContractOptions);

describe('bounded agent design contracts', () => {
  it('produces all normative headings in order and only standard YAML token groups', () => {
    const contract = createGlassDesignContract(input()), output = contract.toDesignMarkdown();
    const headings = [...output.matchAll(/^## (.+)$/gm)].map(match => match[1]);
    expect(headings).toEqual(['Overview', 'Colors', 'Typography', 'Layout', 'Elevation & Depth', 'Shapes', 'Components', "Do's and Don'ts"]);
    expect(output.startsWith('---\nversion: alpha\nname: "Field Notes"\n')).toBe(true);
    const yaml = output.split('\n---\n')[0];
    expect(yaml).toContain('colors:\n  background: "#fafaf8"'); expect(yaml).toContain('typography:\n  body-md:');
    expect(yaml).toContain('spacing:\n  xs: "4px"'); expect(yaml).toContain('rounded:\n  md: "24px"');
    expect(yaml).toContain('components:\n  button-primary:'); expect(yaml).not.toContain('material:');
    expect(yaml).not.toContain('blur:'); expect(yaml).not.toContain('--lg');
    expect(output).toContain('Refraction is off; the default is portable CSS');
  });

  it('generates theme variables that agree with actual normalized material props', () => {
    const config = input(); config.material = { blur: 999, opacity: -.5, tint: '#ABC', refraction: 0, variant: 'clear', radius: 32, corner: 'continuous' };
    config.tokens.radius = 18; config.tokens.spacing = { md: 20, xl: 48 };
    const contract = createGlassDesignContract(config), css = contract.toThemeCSS();
    expect(contract.material).toEqual(resolveOptions({ ...config.material, radius: 18 }));
    for (const [key, value] of Object.entries(getGlassProps(contract.material).style)) expect(css).toContain(`${key}: ${value};`);
    expect(css).toContain('--lg-design-radius: 18px;'); expect(css).toContain('--lg-design-space-md: 20px;');
    expect(css).toContain('--lg-design-space-xs: 4px;'); expect(css).toContain('--lg-fill-rgb: 250 250 248;');
    expect(css).toContain(`${contract.selector} .lg-glass, ${contract.selector}.lg-glass {`);
    expect(css).toContain('@media (forced-colors: active)'); expect(css).toContain('color: CanvasText; background-color: Canvas;');
    expect(css).not.toContain('body {'); expect(css).not.toContain(':root'); expect(css).not.toContain('@import');
    expect(contract.toDesignMarkdown()).toContain('blur 64px');
  });

  it('defaults to the shared portable material and system font without runtime services', () => {
    const contract = createGlassDesignContract(input());
    expect(contract.material).toEqual(resolveOptions());
    expect(contract.material.refraction).toBe(0); expect(contract.material.interactive).toBe(false);
    expect(contract.toThemeCSS()).toContain('ui-sans-serif, system-ui, sans-serif');
    expect(contract.toDesignMarkdown()).toContain('no client-side controller or frame loop');
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
  });

  it('normalizes three-digit colors, stores a deterministic versioned manifest and roundtrips exactly', () => {
    const config = input(); config.tokens.colors = { background: '#FFF', foreground: '#000', primary: '#F90' }; config.material = { tint: '#ABC' };
    const first = createGlassDesignContract(config), next = parseGlassDesignContract(first.toJSON());
    expect(first.toJSON()).toContain('"kind": "liquid-glass-design-contract"'); expect(first.toJSON()).toContain('"version": 1');
    expect(first.toJSON()).toContain('"background": "#ffffff"');
    expect(next.toJSON()).toBe(first.toJSON()); expect(next.toDesignMarkdown()).toBe(first.toDesignMarkdown());
    expect(next.toThemeCSS()).toBe(first.toThemeCSS()); expect(next.id).toBe(first.id); expect(next.material.tint).toBe('#abc');
    expect(first.toDesignMarkdown()).toBe(createGlassDesignContract(config).toDesignMarkdown());
  });

  it('does not retain mutable input and returns immutable public material/contract', () => {
    const config = input(); config.tokens.spacing = { md: 20 }; config.guidance = ['Keep the useful action visible'];
    const contract = createGlassDesignContract(config), json = contract.toJSON();
    config.name = 'Mutated'; config.tokens.colors.background = '#000000'; config.tokens.spacing.md = 100; config.guidance[0] = 'Mutated';
    expect(contract.toJSON()).toBe(json); expect(Object.isFrozen(contract)).toBe(true); expect(Object.isFrozen(contract.material)).toBe(true);
    expect(() => { contract.material.blur = 50; }).toThrow();
  });

  it('makes selector identifiers stable, bounded and safe across punctuation and unicode', () => {
    const config = input(); config.name = '99 / "Ink" : <style> Studio 東京';
    const first = createGlassDesignContract(config), second = createGlassDesignContract({ ...config, name: '99 Ink Studio 東京' });
    expect(first.id).toMatch(/^[a-z0-9-]+$/); expect(first.id.length).toBeLessThanOrEqual(48);
    expect(first.selector).toBe(`[data-lg-design="${first.id}"]`); expect(first.id).not.toBe(second.id);
    expect(first.toThemeCSS()).not.toContain('<style>'); expect(createGlassDesignContract({ ...config, name: '東京' }).id).toMatch(/^theme-/);
  });

  it('escapes YAML quotes and Markdown structure without adding arbitrary headings or CSS', () => {
    const config = input(); config.name = 'Studio "Warm": #1'; config.description = 'A [careful](https://example.com) **workspace** <script>';
    config.guidance = ['## Fake heading', '`body { color: red }`'];
    const contract = createGlassDesignContract(config), markdown = contract.toDesignMarkdown();
    const yamlName = markdown.match(/^name: (.+)$/m)![1]; expect(JSON.parse(yamlName)).toBe(config.name);
    expect(markdown).toContain('A \\[careful\\]\\(https://example.com\\) \\*\\*workspace\\*\\* \\<script\\>');
    expect(markdown).toContain('- \\#\\# Fake heading'); expect(markdown).not.toContain('\n## Fake heading');
    expect(contract.toThemeCSS()).not.toContain('script'); expect(contract.toThemeCSS()).not.toContain('body {');
  });

  it('calculates opaque hex contrast only and reports failures without claiming translucent compliance', () => {
    const config = input(); config.tokens.colors.background = '#fff'; config.tokens.colors.foreground = '#000';
    const good = createGlassDesignContract(config).validate();
    expect(good).toEqual({ valid: true, warnings: [], contrast: { foregroundOnBackground: 21 } });
    config.tokens.colors.foreground = '#fff';
    const contract = createGlassDesignContract(config), bad = contract.validate();
    expect(bad.valid).toBe(false); expect(bad.contrast.foregroundOnBackground).toBe(1); expect(bad.warnings[0]).toContain('4.5:1');
    expect(contract.toDesignMarkdown()).toContain('does not measure translucent materials over changing content');
  });

  it('keeps experimental refraction explicit and warns about unusually large blur areas', () => {
    const config = input(); config.material = { refraction: 12, blur: 48 };
    const contract = createGlassDesignContract(config), output = contract.toDesignMarkdown();
    expect(output).toContain('Refraction is explicitly experimental at 12');
    expect(contract.validate().warnings).toEqual(expect.arrayContaining([expect.stringContaining('experimental'), expect.stringContaining('paint cost')]));
    expect(contract.material.refraction).toBe(12); expect(contract.toThemeCSS()).not.toContain('filter: url(');
  });

  it.each(['red', '#ffff', '#ffffff00', 'var(--color)', 'url(https://example.com)', '#fff; } body { color:red', '#fff\n'])('rejects unsafe or unsupported color %s', value => {
    const config = input(); config.tokens.colors.primary = value; expect(() => createGlassDesignContract(config)).toThrow(/opaque/);
  });

  it.each(['Inter; color:red', 'url(font.woff2)', '"Inter", sans-serif', 'Inter\nbody', 'Inter/*comment*/', 'var(--font)', 'Inter}'])('rejects unsafe font %s', value => {
    const config = input(); config.tokens.fontFamily = value; expect(() => createGlassDesignContract(config)).toThrow();
  });

  it('accepts local multiword font families without loading remote fonts', () => {
    const config = input(); config.tokens.fontFamily = 'Public Sans, system-ui, sans-serif';
    const contract = createGlassDesignContract(config);
    expect(contract.toThemeCSS()).toContain('--lg-design-font: Public Sans, system-ui, sans-serif;');
    expect(contract.toDesignMarkdown()).toContain('fontFamily: "Public Sans, system-ui, sans-serif"');
  });

  it('rejects custom prototypes, prototype keys, symbols and accessors before evaluating them', () => {
    const polluted = JSON.parse(JSON.stringify(input())); polluted.tokens.colors.__proto__ = { bad: true };
    expect(() => unsafe(polluted)).toThrow(/prototype/);
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const value = JSON.parse(JSON.stringify(input())); Object.defineProperty(value.tokens.spacing = {}, key, { value: 'unsafe', enumerable: true });
      expect(() => unsafe(value)).toThrow(/unknown key/);
    }
    const symbol = input(); Object.defineProperty(symbol, Symbol('secret'), { value: 'hidden' }); expect(() => unsafe(symbol)).toThrow(/unknown key/);
    let invoked = false; const getter = input(); Object.defineProperty(getter.tokens, 'radius', { get() { invoked = true; return 12; } });
    expect(() => unsafe(getter)).toThrow(/accessors/); expect(invoked).toBe(false);
    expect(() => unsafe(Object.create({ name: 'Inherited' }))).toThrow(/prototype/);
  });

  it('rejects unknown configuration, token and material fields instead of silently drifting', () => {
    for (const mutate of [(value: any) => { value.admin = true; }, (value: any) => { value.tokens.colors.gradient = '#fff'; }, (value: any) => { value.tokens.shadow = 'huge'; }, (value: any) => { value.tokens.spacing = { arbitrary: 10 }; }, (value: any) => { value.material = { invalid: true }; }]) {
      const config = input(); mutate(config); expect(() => unsafe(config)).toThrow(/unknown key/);
    }
  });

  it('rejects wrong types and nonfinite material values, while reusing material numeric bounds', () => {
    for (const material of [{ interactive: 'yes' }, { reducedTransparency: 1 }, { appearance: 'pink' }, { corner: 'squircle' }, { tint: 'blue' }, { opacity: NaN }, { radius: Infinity }, { blur: '10' }]) {
      expect(() => unsafe({ ...input(), material })).toThrow();
    }
    expect(createGlassDesignContract({ ...input(), material: { radius: -10, blur: 999, saturation: -2, opacity: 999, refraction: -3 } }).material)
      .toEqual(resolveOptions({ radius: -10, blur: 999, saturation: -2, opacity: 999, refraction: -3 }));
  });

  it('rejects out-of-range dimensions and oversized/multiline text and guidance', () => {
    for (const radius of [-1, 1000, Infinity, '12px']) expect(() => unsafe({ ...input(), tokens: { ...input().tokens, radius } })).toThrow();
    for (const md of [-1, 257, NaN, 'calc(1px)']) expect(() => unsafe({ ...input(), tokens: { ...input().tokens, spacing: { md } } })).toThrow();
    for (const name of ['', ' ', 'x'.repeat(81), 'name\n## Colors', 'name\u2028break']) expect(() => unsafe({ ...input(), name })).toThrow();
    expect(() => unsafe({ ...input(), description: 'x'.repeat(601) })).toThrow();
    for (const guidance of [Array(13).fill('entry'), ['x'.repeat(241)], ['line\nline'], [12], new Array(2)]) expect(() => unsafe({ ...input(), guidance })).toThrow();
  });

  it('rejects malformed JSON, unsupported versions, foreign keys and oversized manifests', () => {
    for (const value of ['', '---\nname: example\n---', '[]', 'null', '{broken}', 'x'.repeat(16385)]) expect(() => parseGlassDesignContract(value)).toThrow();
    const json = JSON.parse(createGlassDesignContract(input()).toJSON());
    for (const version of [0, 2, '1']) expect(() => parseGlassDesignContract(JSON.stringify({ ...json, version }))).toThrow(/version/);
    expect(() => parseGlassDesignContract(JSON.stringify({ ...json, kind: 'design.md' }))).toThrow(/kind/);
    expect(() => parseGlassDesignContract(JSON.stringify({ ...json, url: 'https://example.com' }))).toThrow(/unknown/);
    expect(() => parseGlassDesignContract('{"kind":"liquid-glass-design-contract","version":1,"config":{"__proto__":{"admin":true}}}')).toThrow(/unknown/);
  });
});
