import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement, createRef, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createApp, h, nextTick, reactive, ref as vueRef } from 'vue';
import { GlassButton, GlassSurface as ReactSurface } from '../src/react.js';
import { GlassSurface } from '../src/vue.js';
import { registerGlassElement } from '../src/element.js';
import type { GlassMotionOptions } from '../src/index.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const movePointer = (element: HTMLElement, x = 25) => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 50, left: 0, top: 0 } as DOMRect);
  element.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: 10 }));
};
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
it('React rebinds a changed semantic tag, forwards the new node, and cleans up in StrictMode', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); const ref = createRef<HTMLElement>(); const clicked = vi.fn();
  const render = (as: 'div' | 'nav', interactive = true) => createElement(StrictMode, null,
    createElement(ReactSurface, { as, ref, onClick: clicked, 'aria-label': 'Main', glass: { interactive } }, 'Home'));
  await act(async () => { root.render(render('div')); });
  const previous = ref.current!; movePointer(previous);
  expect(previous.style.getPropertyValue('--lg-pointer-x')).toBe('25%');
  await act(async () => { root.render(render('nav')); });
  const current = ref.current!;
  expect(current).toBe(host.querySelector('nav')); expect(current).not.toBe(previous);
  expect(current.getAttribute('aria-label')).toBe('Main');
  expect(previous.style.getPropertyValue('--lg-pointer-x')).toBe('');
  movePointer(previous, 80); expect(previous.style.getPropertyValue('--lg-pointer-x')).toBe('');
  movePointer(current, 60); expect(current.style.getPropertyValue('--lg-pointer-x')).toBe('60%');
  await act(async () => { current.click(); }); expect(clicked).toHaveBeenCalledOnce();
  await act(async () => { root.render(render('nav', false)); });
  movePointer(current, 80); expect(current.style.getPropertyValue('--lg-pointer-x')).toBe('');
  await act(async () => { root.unmount(); });
  expect(ref.current).toBe(null); movePointer(current, 30);
  expect(current.style.getPropertyValue('--lg-pointer-x')).toBe('');
});
it('Vue rebinds a changed semantic tag and exposed element, then updates the new controller', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = reactive({ tag: 'div', glass: { interactive: true } });
  const surface = vueRef<{ element: HTMLElement }>(); const clicked = vi.fn();
  const app = createApp({ render: () => h(GlassSurface, { ref: surface, as: state.tag, glass: state.glass, onClick: clicked, 'aria-label': 'Main' }, () => 'Home') });
  app.mount(host); await nextTick();
  const previous = host.firstElementChild as HTMLElement; movePointer(previous);
  expect(previous.style.getPropertyValue('--lg-pointer-x')).toBe('25%');
  state.tag = 'nav'; await nextTick();
  const current = host.querySelector('nav')!;
  expect(surface.value?.element).toBe(current); expect(current).not.toBe(previous);
  expect(current.getAttribute('aria-label')).toBe('Main');
  expect(previous.style.getPropertyValue('--lg-pointer-x')).toBe('');
  movePointer(previous, 80); expect(previous.style.getPropertyValue('--lg-pointer-x')).toBe('');
  movePointer(current, 60); expect(current.style.getPropertyValue('--lg-pointer-x')).toBe('60%');
  current.click(); expect(clicked).toHaveBeenCalledOnce();
  state.glass.interactive = false; await nextTick();
  movePointer(current, 80); expect(current.style.getPropertyValue('--lg-pointer-x')).toBe('');
  app.unmount(); movePointer(current, 30);
  expect(current.style.getPropertyValue('--lg-pointer-x')).toBe('');
});
it('custom elements propagate saturation and material attributes through reconnects', () => {
  registerGlassElement('adapter-test-glass');
  const element = document.createElement('adapter-test-glass');
  element.setAttribute('saturation', '2'); element.setAttribute('tint', '#3366ff');
  element.setAttribute('tint-opacity', '.25'); element.setAttribute('opacity', '.5'); element.setAttribute('backdrop', 'light');
  document.body.append(element);
  expect(element.style.getPropertyValue('--lg-saturation')).toBe('2');
  expect(element.style.getPropertyValue('--lg-tint')).toBe('#3366ff');
  expect(element.style.getPropertyValue('--lg-tint-opacity')).toBe('0.25');
  expect(element.style.getPropertyValue('--lg-opacity')).toBe('0.5');
  expect(element.getAttribute('data-lg-backdrop')).toBe('light');
  element.setAttribute('saturation', '1.1'); expect(element.style.getPropertyValue('--lg-saturation')).toBe('1.1');
  element.setAttribute('backdrop', 'dark'); expect(element.getAttribute('data-lg-backdrop')).toBe('dark');
  element.setAttribute('tint-opacity', '2'); expect(element.style.getPropertyValue('--lg-tint-opacity')).toBe('1');
  element.removeAttribute('opacity'); expect(element.style.getPropertyValue('--lg-opacity')).toBe('1');
  element.remove(); expect(element.style.getPropertyValue('--lg-saturation')).toBe('');
  document.body.append(element); expect(element.style.getPropertyValue('--lg-saturation')).toBe('1.1');
  expect(element.getAttribute('data-lg-backdrop')).toBe('dark');
  expect(element.style.getPropertyValue('--lg-tint')).toBe('#3366ff'); element.remove();
});

function motionClock() {
  let time = 0, serial = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window.performance, 'now').mockImplementation(() => time);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = ++serial; frames.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  return {
    frames,
    settle() { time += 6500; const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(time); },
  };
}
function pressMotion(element: HTMLElement) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 50, left: 0, top: 0 } as DOMRect);
  element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 50, clientY: 25, bubbles: true }));
}

it('React motion is opt-in, updates press physics, disables cleanly and preserves native clicks', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const clock = motionClock(), host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), ref = createRef<HTMLButtonElement>(), click = vi.fn();
  const render = (motion?: GlassMotionOptions) => createElement(GlassButton, { ref, motion, glass: { radius: 18 }, onClick: click }, 'Save');
  await act(async () => { root.render(render()); });
  const button = ref.current!; expect(button.hasAttribute('data-lg-motion')).toBe(false);
  clock.settle();
  await act(async () => { root.render(render({ pressScale: .9, stretch: 0 })); });
  expect(button.classList.contains('lg-motion')).toBe(true); expect(button.getAttribute('data-lg-motion')).toBe('idle');
  expect(clock.frames.size).toBe(0); // Opting in starts visible and static; no automatic entry animation.
  expect(button.style.getPropertyValue('--lg-motion-opacity')).toBe('1');
  pressMotion(button); clock.settle(); expect(button.style.getPropertyValue('--lg-motion-scale-x')).toBe('0.9');
  await act(async () => { root.render(render({ stiffness: 340, damping: 30, mass: 2, pressScale: .98, stretch: 0 })); });
  pressMotion(button); clock.settle(); expect(button.style.getPropertyValue('--lg-motion-scale-x')).toBe('0.98');
  await act(async () => { root.render(render({ reducedMotion: true, pressScale: .9 })); });
  pressMotion(button); expect(button.style.getPropertyValue('--lg-motion-scale-x')).toBe('1'); expect(clock.frames.size).toBe(0);
  await act(async () => { root.render(render()); });
  expect(button.hasAttribute('data-lg-motion')).toBe(false); expect(button.classList.contains('lg-motion')).toBe(false);
  expect(button.style.getPropertyValue('--lg-motion-scale-x')).toBe(''); expect(button.style.scale).toBe('');
  expect(button.getAttribute('data-lg-renderer')).not.toBe(null); expect(button.style.getPropertyValue('--lg-radius')).toBe('18px');
  pressMotion(button); expect(button.hasAttribute('data-lg-motion-pressed')).toBe(false);
  await act(async () => { button.click(); root.unmount(); }); expect(click).toHaveBeenCalledOnce(); expect(ref.current).toBe(null);
});

it('React motion follows changed semantic nodes and disposes pending work in StrictMode', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const clock = motionClock(), host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), ref = createRef<HTMLElement>();
  const render = (as: 'div' | 'nav') => createElement(StrictMode, null, createElement(ReactSurface, { as, ref, motion: { stretch: 0 }, 'aria-label': 'Main' }, 'Home'));
  await act(async () => { root.render(render('div')); });
  const previous = ref.current!; pressMotion(previous);
  await act(async () => { root.render(render('nav')); });
  const current = ref.current!; expect(current.tagName).toBe('NAV'); expect(current).not.toBe(previous);
  expect(previous.hasAttribute('data-lg-motion')).toBe(false); expect(previous.style.getPropertyValue('--lg-motion-scale-x')).toBe('');
  expect(current.getAttribute('data-lg-motion')).toBe('idle');
  pressMotion(previous); expect(previous.hasAttribute('data-lg-motion-pressed')).toBe(false);
  pressMotion(current); await act(async () => { root.unmount(); });
  clock.settle(); expect(current.hasAttribute('data-lg-motion')).toBe(false); expect(clock.frames.size).toBe(0);
  expect(ref.current).toBe(null);
});

it('Vue motion observes deep options, rebinds tags and disables while preserving material semantics', async () => {
  const clock = motionClock(), host = document.createElement('div'); document.body.append(host);
  const state = reactive<{ tag: string; motion: GlassMotionOptions | undefined }>({ tag: 'div', motion: { pressScale: .9, stretch: 0 } });
  const surface = vueRef<{ element: HTMLElement }>();
  const app = createApp({ render: () => h(GlassSurface, { ref: surface, as: state.tag, motion: state.motion, glass: { radius: 20 }, 'aria-label': 'Main' }, () => 'Home') });
  app.mount(host); await nextTick();
  const previous = surface.value!.element; clock.settle();
  expect(previous.getAttribute('data-lg-motion')).toBe('idle'); expect(clock.frames.size).toBe(0);
  pressMotion(previous); clock.settle(); expect(previous.style.getPropertyValue('--lg-motion-scale-x')).toBe('0.9');
  state.motion!.pressScale = .97; state.motion!.stiffness = 400; state.motion!.damping = 31; state.motion!.mass = 1.2; await nextTick();
  pressMotion(previous); clock.settle(); expect(previous.style.getPropertyValue('--lg-motion-scale-x')).toBe('0.97');
  state.tag = 'nav'; await nextTick();
  const current = surface.value!.element; expect(current.tagName).toBe('NAV'); expect(current).not.toBe(previous);
  expect(previous.hasAttribute('data-lg-motion')).toBe(false); expect(current.getAttribute('data-lg-motion')).toBe('idle');
  state.motion!.reducedMotion = true; await nextTick(); clock.settle();
  pressMotion(current); expect(current.style.getPropertyValue('--lg-motion-scale-x')).toBe('1'); expect(clock.frames.size).toBe(0);
  state.motion = undefined; await nextTick();
  expect(current.hasAttribute('data-lg-motion')).toBe(false); expect(current.classList.contains('lg-motion')).toBe(false);
  expect(current.style.getPropertyValue('--lg-motion-scale-x')).toBe('');
  expect(current.style.getPropertyValue('--lg-radius')).toBe('20px'); expect(current.getAttribute('aria-label')).toBe('Main');
  state.motion = { stretch: 0 }; await nextTick(); pressMotion(current); app.unmount(); clock.settle();
  expect(current.hasAttribute('data-lg-motion')).toBe(false); expect(current.hasAttribute('data-lg-renderer')).toBe(false);
  expect(clock.frames.size).toBe(0);
});

it('custom element motion requires presence opt-in and updates attributes across reconnects', () => {
  const clock = motionClock(); registerGlassElement('adapter-motion-glass');
  const element = document.createElement('adapter-motion-glass'); element.setAttribute('motion-press-scale', '.9'); element.setAttribute('motion-stretch', '0');
  document.body.append(element); expect(element.hasAttribute('data-lg-motion')).toBe(false);
  element.setAttribute('motion', ''); clock.settle();
  expect(element.getAttribute('data-lg-motion')).toBe('idle'); expect(element.style.getPropertyValue('--lg-motion-opacity')).toBe('1');
  pressMotion(element); clock.settle(); expect(element.style.getPropertyValue('--lg-motion-scale-x')).toBe('0.9');
  element.setAttribute('motion-stiffness', '400'); element.setAttribute('motion-damping', '30'); element.setAttribute('motion-mass', '2');
  element.setAttribute('motion-press-scale', '.98'); pressMotion(element); clock.settle();
  expect(element.style.getPropertyValue('--lg-motion-scale-x')).toBe('0.98');
  element.setAttribute('reduced-motion', ''); pressMotion(element);
  expect(element.style.getPropertyValue('--lg-motion-scale-x')).toBe('1'); expect(clock.frames.size).toBe(0);
  element.removeAttribute('motion'); expect(element.hasAttribute('data-lg-motion')).toBe(false);
  expect(element.classList.contains('lg-motion')).toBe(false); expect(element.hasAttribute('data-lg-renderer')).toBe(true);
  element.setAttribute('motion', ''); element.remove();
  expect(element.hasAttribute('data-lg-motion')).toBe(false); expect(element.style.getPropertyValue('--lg-motion-scale-x')).toBe('');
  document.body.append(element); clock.settle(); expect(element.getAttribute('data-lg-motion')).toBe('idle');
  element.removeAttribute('reduced-motion'); pressMotion(element); element.remove(); clock.settle();
  expect(element.hasAttribute('data-lg-motion')).toBe(false); expect(clock.frames.size).toBe(0);
});
