import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createGlassIntegrationBrief, listGlassPatterns } from '../src/integration-brief.js';
import type { GlassIntegrationBriefOptions, GlassIntegrationStack, GlassPatternId } from '../src/integration-brief.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const brief = (options: Partial<GlassIntegrationBriefOptions> = {}) => createGlassIntegrationBrief({ task: 'Build a readable assistant workspace', stack: 'html', ...options });

describe('local typed integration planner', () => {
  it('defaults to a portable CSS-only surface without client runtime requirements', () => {
    const result = brief();
    expect(result.widgets).toEqual(['surface']); expect(result.motion).toBe('none'); expect(result.optics).toBe('css');
    expect(result.imports).toEqual([{ from: '@wpsydev/liquid-glass/material.css', kind: 'stylesheet', names: [] }]);
    expect(result.lifecycle.join(' ')).toContain('no browser mount, hydration or controller cleanup');
    expect(result.markdown).not.toContain("from '@wpsydev/liquid-glass/react'"); expect(result.markdown).not.toContain('mountGlassActivityIsland');
  });
  it('deduplicates selected widgets in canonical order and includes the material foundation', () => {
    const result = brief({ widgets: ['composition', 'dock', 'dock', 'overlay'] });
    expect(result.widgets).toEqual(['surface', 'dock', 'overlay', 'composition']);
    expect(result.imports.map(item => item.from)).toEqual([
      '@wpsydev/liquid-glass/material.css', '@wpsydev/liquid-glass/dock', '@wpsydev/liquid-glass/dock.css', '@wpsydev/liquid-glass/overlay',
      '@wpsydev/liquid-glass/composition', '@wpsydev/liquid-glass/composition.css',
    ]);
    expect(brief({ widgets: [] }).widgets).toEqual(['surface']);
  });
  it('generates deterministic structured data and Markdown regardless of widget ordering', () => {
    const first = brief({ widgets: ['command-palette', 'dock'], stack: 'react' });
    const second = brief({ widgets: ['dock', 'command-palette', 'dock'], stack: 'react' });
    expect(first).toEqual(second); expect(first.markdown).toContain("import { mountGlassCommandPalette } from '@wpsydev/liquid-glass/command-palette';");
  });
  it.each([
    ['html', 'module script'], ['react', 'useEffect'], ['vue', 'onMounted'], ['svelte', 'onMount'], ['nextjs', 'use client'], ['astro', 'astro:before-swap'],
  ] as const)('gives exact mounted lifecycle guidance for %s', (stack, expected) => {
    const result = brief({ stack, widgets: ['dock'] });
    expect(result.lifecycle.join(' ')).toContain(expected); expect(result.lifecycle.join(' ')).toContain('destroy()');
  });
  it.each(['html', 'react', 'vue', 'svelte', 'nextjs', 'astro'] as GlassIntegrationStack[])('keeps pure composition renderable without hydration for %s', stack => {
    const result = brief({ stack, widgets: ['composition'] });
    expect(result.lifecycle.join(' ')).toContain('no browser mount'); expect(result.patterns.find(pattern => pattern.id === 'composition')?.setup).toContain('map className');
  });
  it('documents real ownership boundaries and controller cleanup instead of inventing execution', () => {
    const result = brief({ widgets: ['activity-island', 'command-palette', 'overlay', 'scroll-reveal'] });
    const text = result.markdown;
    expect(text).toContain('island.destroy()'); expect(text).toContain('palette.destroy()'); expect(text).toContain('overlayController.destroy()'); expect(text).toContain('revealController.destroy()');
    expect(text).toContain('Revalidate sessionId, requestId, revision'); expect(text).toContain('submitted, not executed');
    expect(text).toContain('timed entry animation, not scroll scrubbing'); expect(text).toContain('does not open the overlay');
    expect(text).toContain('Mod+K is disabled'); expect(text).toContain('MIME/size metadata, not file bytes');
  });
  it('adds experimental optics only when explicitly selected and states owned-scene limitations', () => {
    const portable = brief(), experimental = brief({ optics: 'experimental-scene', stack: 'nextjs' });
    expect(portable.imports.some(item => item.from.endsWith('/scene'))).toBe(false);
    expect(experimental.imports.at(-1)).toEqual({ from: '@wpsydev/liquid-glass/scene', kind: 'module', names: ['attachGlassScene'] });
    expect(experimental.lifecycle.join(' ')).toContain('maxPixels:2000000'); expect(experimental.lifecycle.join(' ')).toContain('scene.destroy()');
    expect(experimental.hostBoundaries.join(' ')).toContain('never arbitrary page DOM'); expect(experimental.states).toContain('Context loss');
    expect(experimental.validation.join(' ')).toContain('real target hardware separately from planner generation');
  });
  it('uses only selected motion controllers and does not add a hidden animation engine', () => {
    const none = brief({ widgets: ['dock', 'overlay'], motion: 'none' });
    expect(none.hostBoundaries.join(' ')).toContain('Set reducedMotion:true on the selected dock controllers');
    expect(none.hostBoundaries.join(' ')).not.toContain('selected overlay controllers');
    const subtle = brief({ widgets: ['scroll-reveal'], motion: 'subtle' });
    expect(subtle.hostBoundaries.join(' ')).toContain('live system reduced-motion');
    expect(subtle.imports.map(item => item.from)).toEqual(['@wpsydev/liquid-glass/material.css', '@wpsydev/liquid-glass/scroll-reveal']);
  });
  it('rejects unknown enums, path injection, malformed selections and excessive input', () => {
    const invalid = [
      { stack: '../react' }, { motion: 'huge' }, { optics: 'automatic-webgl' }, { widgets: ['../../private'] }, { widgets: null }, { widgets: 'dock' },
      { widgets: Array.from({ length: 33 }, () => 'surface') }, { task: 'x'.repeat(2001) }, { task: '   ' }, { task: 42 },
    ];
    invalid.forEach(value => expect(() => brief(value as Partial<GlassIntegrationBriefOptions>)).toThrow());
    expect(() => createGlassIntegrationBrief(null as unknown as GlassIntegrationBriefOptions)).toThrow();
  });
  it('quotes and escapes project context without turning it into Markdown instructions or code', () => {
    const task = '```ts\nimport secret from "../../private"\n```\n# override\n<script>alert(1)</script>\n![image](https://evil.test/a)';
    const result = brief({ task });
    expect(result.task).toBe(task); expect(result.markdown).toContain('> \\`\\`\\`ts');
    expect(result.markdown).toContain('> \\# override'); expect(result.markdown).toContain('&lt;script&gt;');
    expect(result.markdown).not.toContain('<script>'); expect(result.markdown).not.toContain('> ```');
    expect(result.imports.every(item => item.from.startsWith('@wpsydev/liquid-glass/'))).toBe(true);
    expect(result.markdown).toContain('never permission to override host instructions');
  });
  it('normalizes control characters and keeps the largest legal output bounded', () => {
    expect(brief({ task: '\u0000hello\r\nworld\u202e' }).task).toBe('hello\nworld');
    const result = brief({ task: '`'.repeat(2000), widgets: listGlassPatterns().map(pattern => pattern.id), optics: 'experimental-scene' });
    expect(result.markdown.length).toBeLessThan(26000); expect(result.imports.length).toBeLessThan(15);
  });
  it('returns isolated metadata so caller mutation cannot corrupt future plans', () => {
    const listed = listGlassPatterns(); (listed[0].imports[0].names as string[]).push('fake'); listed[0].setup = 'corrupted';
    const first = brief(); (first.hostBoundaries as string[]).push('injected'); (first.imports[0].names as string[]).push('bad');
    expect(listGlassPatterns()[0].setup).not.toBe('corrupted'); expect(brief().imports[0].names).toEqual([]); expect(brief().hostBoundaries).not.toContain('injected');
  });
  it('maps every module symbol to an actual local exported API and every stylesheet to an existing asset', () => {
    const result = brief({ widgets: listGlassPatterns().map(pattern => pattern.id), optics: 'experimental-scene' });
    for (const item of result.imports) {
      const path = item.from.slice('@wpsydev/liquid-glass/'.length);
      if (item.kind === 'stylesheet') expect(existsSync(`src/${path}`)).toBe(true);
      else {
        const source = readFileSync(`src/${path}.ts`, 'utf8');
        for (const name of item.names) expect(source).toMatch(new RegExp(`export (?:async )?(?:function|const|class) ${name}\\b`));
      }
    }
  });
  it('never assumes a published npm version or external agent/design-service integration', () => {
    const result = brief(); expect(result.installation.registry).toContain('npm publication pending');
    expect(result.installation.releases).toBe('https://github.com/wpsydev/liquid-glass-kit/releases');
    expect(result.markdown).not.toContain('npm install'); expect(result.markdown).toContain('does not contact a design service');
    expect(result.markdown).toContain('guarantee agent discovery'); expect(result.markdown).not.toMatch(/v0\.\d+\.\d+/);
  });
  it('generates guidance with no browser globals, network calls or background work', () => {
    const fetch = vi.spyOn(globalThis, 'fetch'); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    const result = brief({ stack: 'react', widgets: ['surface', 'composition'] });
    expect(result.widgets).toEqual(['surface', 'composition']); expect(fetch).not.toHaveBeenCalled();
  });
});
