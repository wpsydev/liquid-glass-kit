import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { parseSync } from 'rolldown/utils';
import { snippet, standalone, type Recipe } from '../site/start/recipes';
const css = readFileSync('src/material.css', 'utf8');
const license = readFileSync('LICENSE', 'utf8');
describe('portable starter recipes', () => {
  it.each(['toolbar', 'composer', 'dialog'] as Recipe[])('downloads a self-contained %s with native controls', recipe => {
    const html = standalone(recipe, true, css, license), doc = new JSDOM(html).window.document;
    expect(doc.querySelector('.lg-glass')?.getAttribute('data-lg-solid')).toBe('true');
    expect(doc.querySelector('link[rel=stylesheet],script[src]')).toBeNull();
    expect(html).toContain('prefers-reduced-motion');
    expect(html).toContain('forced-colors');
    expect(html).toContain(license.trim());
    if (recipe === 'toolbar') expect(doc.querySelectorAll('nav a')).toHaveLength(3);
    if (recipe === 'composer') expect(doc.querySelector('label')?.htmlFor).toBe(doc.querySelector('textarea')?.id);
    if (recipe === 'dialog') expect(doc.querySelector('dialog form')?.getAttribute('method')).toBe('dialog');
  });
  it.each(['toolbar', 'composer', 'dialog'] as Recipe[])('produces valid JSX for %s, including adjacent dialog elements', recipe => {
    expect(parseSync('Surface.jsx', snippet(recipe, 'react', false)).errors).toEqual([]);
  });
  it('preserves React and Vue native attributes and explicit host-owned behavior', () => {
    expect(snippet('composer', 'react', false)).toContain('htmlFor="question"');
    expect(snippet('composer', 'react', false)).not.toMatch(/\bclass=/);
    expect(snippet('dialog', 'vue', false)).toContain('method="dialog"');
    expect(snippet('dialog', 'html', false)).toContain('Host app owns');
  });
});
