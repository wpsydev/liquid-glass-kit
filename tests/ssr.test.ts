// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createSSRApp, h } from 'vue';
import { renderToString as renderVue } from '@vue/server-renderer';
import { attachGlassOverlay, getGlassCapabilities, getGlassProps } from '../src/index.js';
import { registerGlassElement } from '../src/element.js';
import { GlassButton, GlassSurface } from '../src/react.js';
import { GlassSurface as VueSurface } from '../src/vue.js';

describe('server rendering without browser globals', () => {
  it('imports the core and registration entry without a window', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof attachGlassOverlay).toBe('function');
    expect(getGlassCapabilities()).toEqual({ backdrop: false, experimentalRefraction: false, continuousCorners: false });
    expect(() => registerGlassElement()).not.toThrow();
    expect(getGlassProps()).toEqual(getGlassProps());
  });
  it('renders React native buttons with safe default type and forwarded semantics', () => {
    const html = renderToString(createElement(GlassButton, { disabled: true, 'aria-label': 'Save', glass: { appearance: 'dark' } }, 'Save'));
    expect(html).toContain('type="button"'); expect(html).toContain('disabled=""');
    expect(html).toContain('aria-label="Save"'); expect(html).toContain('data-lg-appearance="dark"');
    expect(html).not.toContain('svg');
  });
  it('renders React navigation deterministically', () => {
    const node = createElement(GlassSurface, { as: 'nav', className: 'custom', 'aria-label': 'Main' }, 'Home');
    const html = renderToString(node); expect(html).toBe(renderToString(node));
    expect(html).toContain('<nav'); expect(html).toContain('lg-glass custom'); expect(html).toContain('Home');
  });
  it('renders Vue semantic markup and merged user classes on the server', async () => {
    const html = await renderVue(createSSRApp({ render: () => h(VueSurface, { as: 'nav', class: 'custom', 'aria-label': 'Main', glass: { radius: 32 } }, () => 'Home') }));
    expect(html).toContain('<nav'); expect(html).toContain('lg-glass custom');
    expect(html).toContain('--lg-radius:32px'); expect(html).toContain('aria-label="Main"'); expect(html).toContain('Home');
  });
  it('renders opt-in React motion as visible static markup without browser scheduling or hydration entry', () => {
    const node = createElement(GlassButton, { motion: { stiffness: 350, pressScale: .9 }, 'aria-label': 'Save' }, 'Save');
    const html = renderToString(node);
    expect(html).toBe(renderToString(node)); expect(html).toContain('lg-motion'); expect(html).toContain('Save');
    expect(html).not.toContain('data-lg-motion'); expect(html).not.toContain('--lg-motion');
    expect(html).not.toMatch(/(?:style="|;)opacity:/); expect(html).not.toContain('motion="');
    expect(renderToString(createElement(GlassSurface, { motion: {}, as: 'nav' }, 'Home'))).toContain('lg-motion');
  });
  it('renders opt-in Vue motion as visible static semantic markup without entering', async () => {
    const html = await renderVue(createSSRApp({ render: () => h(VueSurface, { as: 'nav', motion: { reducedMotion: true }, 'aria-label': 'Main' }, () => 'Home') }));
    expect(html).toContain('<nav'); expect(html).toContain('lg-motion'); expect(html).toContain('Home');
    expect(html).not.toContain('data-lg-motion'); expect(html).not.toContain('--lg-motion');
    expect(html).not.toMatch(/(?:style="|;)opacity:/); expect(html).not.toContain('motion="');
  });
});
