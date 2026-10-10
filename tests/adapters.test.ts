import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createApp, h, nextTick, reactive } from 'vue';
import { GlassButton } from '../src/react.js';
import { GlassSurface } from '../src/vue.js';

afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); });
it('React preserves refs/events, updates options, and cleans up on unmount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); const ref = createRef<HTMLButtonElement>(); const clicked = vi.fn();
  await act(async () => { root.render(createElement(GlassButton, { ref, onClick: clicked, glass: { radius: 30 } }, 'Save')); });
  const button = ref.current!;
  expect(button.tagName).toBe('BUTTON'); expect(button.style.getPropertyValue('--lg-radius')).toBe('30px');
  await act(async () => { button.click(); }); expect(clicked).toHaveBeenCalledOnce();
  await act(async () => { root.render(createElement(GlassButton, { ref, disabled: true, glass: { radius: 10, reducedTransparency: true } }, 'Save')); });
  expect(button.disabled).toBe(true); expect(button.style.getPropertyValue('--lg-radius')).toBe('10px');
  expect(button.getAttribute('data-lg-solid')).toBe('true');
  await act(async () => { root.unmount(); });
  expect(ref.current).toBe(null); expect(button.hasAttribute('data-lg-renderer')).toBe(false);
});
it('Vue reacts to deep option changes and removes enhancement on unmount', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = reactive({ radius: 30, appearance: 'light' as const });
  const app = createApp({ render: () => h(GlassSurface, { as: 'nav', glass: options, 'aria-label': 'Main' }, () => 'Home') });
  app.mount(host); const nav = host.querySelector('nav')!;
  expect(nav.style.getPropertyValue('--lg-radius')).toBe('30px');
  options.radius = 12; await nextTick();
  expect(nav.style.getPropertyValue('--lg-radius')).toBe('12px');
  expect(nav.getAttribute('aria-label')).toBe('Main');
  app.unmount(); expect(nav.hasAttribute('data-lg-renderer')).toBe(false);
});
