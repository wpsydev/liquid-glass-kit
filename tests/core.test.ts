import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlass, createDisplacementMap, getGlassProps, resolveOptions } from '../src/index.js';
import { registerGlassElement } from '../src/element.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });
describe('material configuration', () => {
  it('clamps invalid inputs and produces deterministic SSR attributes', () => {
    expect(resolveOptions({ radius: -5, blur: Infinity, saturation: 9, refraction: NaN })).toMatchObject({ radius: 0, blur: 18, saturation: 3, refraction: 0 });
    expect(getGlassProps({ appearance: 'dark', reducedTransparency: true })).toMatchObject({ 'data-lg-appearance': 'dark', 'data-lg-solid': 'true' });
    expect(getGlassProps().style['--lg-radius']).toBe('24px');
  });
});
describe('lens geometry', () => {
  it('keeps the center neutral and bends opposite edges in opposite directions', () => {
    const width = 100, height = 80;
    const pixels = createDisplacementMap(width, height, 20);
    const pixel = (x: number, y: number) => [...pixels.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];
    expect(pixel(50, 40)).toEqual([128, 128, 128, 255]);
    expect(pixel(1, 40)[0]).toBeLessThan(128);
    expect(pixel(98, 40)[0]).toBeGreaterThan(128);
    expect(pixel(50, 1)[1]).toBeLessThan(128);
    expect(pixel(50, 78)[1]).toBeGreaterThan(128);
  });
  it('bounds memory and rejects invalid dimensions', () => {
    for (const size of [0, -1, 513, .5, NaN, Infinity]) expect(() => createDisplacementMap(size, 10, 20)).toThrow(RangeError);
    expect(createDisplacementMap(1, 1, Infinity)).toHaveLength(4);
  });
});
describe('DOM lifecycle', () => {
  it('enhances native controls and restores owned fields with priorities', () => {
    const button = document.createElement('button'); button.textContent = 'Save'; button.className = 'existing';
    button.setAttribute('data-lg-appearance', 'original'); button.style.setProperty('--lg-radius', '9px', 'important');
    document.body.append(button);
    const click = vi.fn(); button.addEventListener('click', click);
    const controller = attachGlass(button, { appearance: 'dark', radius: 36, refraction: 0 });
    expect(button.classList.contains('lg-glass')).toBe(true);
    expect(button.style.getPropertyValue('--lg-radius')).toBe('36px');
    button.click(); expect(click).toHaveBeenCalledOnce();
    controller.update({ blur: 10 });
    expect(button.getAttribute('data-lg-appearance')).toBe('auto');
    expect(button.style.getPropertyValue('--lg-radius')).toBe('24px');
    controller.destroy(); controller.destroy(); controller.update({ radius: 99 });
    expect(button.className).toBe('existing');
    expect(button.getAttribute('data-lg-appearance')).toBe('original');
    expect(button.style.getPropertyValue('--lg-radius')).toBe('9px');
    expect(button.style.getPropertyPriority('--lg-radius')).toBe('important');
    expect(button.hasAttribute('data-lg-renderer')).toBe(false);
    expect(button.style.getPropertyValue('--lg-blur')).toBe('');
  });
  it('retains an existing material class and suppresses motion-dependent pointer tracking', () => {
    const listeners = new Map<string, EventListener>();
    const matches = { value: false };
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() { return query.includes('motion') && matches.value; },
      addEventListener: (_: string, cb: EventListener) => listeners.set(query, cb),
      removeEventListener: (_: string, cb: EventListener) => { if (listeners.get(query) === cb) listeners.delete(query); },
    }));
    const el = document.createElement('div'); el.className = 'lg-glass'; document.body.append(el);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 50, left: 0, top: 0 } as DOMRect);
    const controller = attachGlass(el, { interactive: true });
    el.dispatchEvent(new MouseEvent('pointermove', { clientX: 25, clientY: 10 }));
    expect(el.style.getPropertyValue('--lg-pointer-x')).toBe('25%');
    matches.value = true;
    listeners.get('(prefers-reduced-motion: reduce)')!(new Event('change'));
    el.dispatchEvent(new MouseEvent('pointermove', { clientX: 70, clientY: 10 }));
    expect(el.style.getPropertyValue('--lg-pointer-x')).toBe('');
    controller.destroy(); expect(listeners.size).toBe(0); expect(el.className).toBe('lg-glass');
    vi.unstubAllGlobals();
  });
  it('registers a light DOM custom element with reactive attributes and reconnect cleanup', () => {
    registerGlassElement('test-glass'); registerGlassElement('test-glass');
    const el = document.createElement('test-glass'); el.setAttribute('radius', '32'); document.body.append(el);
    expect(el.style.getPropertyValue('--lg-radius')).toBe('32px');
    el.setAttribute('radius', '16'); expect(el.style.getPropertyValue('--lg-radius')).toBe('16px');
    el.remove(); expect(el.classList.contains('lg-glass')).toBe(false);
    document.body.append(el); expect(el.style.getPropertyValue('--lg-radius')).toBe('16px'); el.remove();
  });
});

describe('density, tint and backdrop contracts', () => {
  it('keeps variants distinct, bounds density and emits deterministic tone hints', () => {
    expect(resolveOptions({ variant: 'clear' }).blur).toBe(6);
    expect(resolveOptions({ variant: 'clear', blur: 12 }).blur).toBe(12);
    expect(resolveOptions({ opacity: -2, tintOpacity: 8, tint: 'url(https://invalid)' })).toMatchObject({ opacity: 0, tintOpacity: 1, tint: '#ffffff' });
    expect(getGlassProps({ backdrop: 'light', tint: '#AbC', tintOpacity: .2 }).style).toMatchObject({ '--lg-tint': '#abc', '--lg-tint-opacity': '0.2' });
    expect(getGlassProps({ backdrop: 'dark' })['data-lg-backdrop']).toBe('dark');
  });
  it('restores added attributes and color variables on destroy', () => {
    const el = document.createElement('button'); el.style.setProperty('--lg-tint', '#123456', 'important'); el.setAttribute('data-lg-backdrop', 'prior');
    document.body.append(el); const c = attachGlass(el, { tint: '#00ffcc', opacity: .4 });
    expect(el.style.getPropertyValue('--lg-opacity')).toBe('0.4');
    c.destroy(); expect(el.style.getPropertyValue('--lg-tint')).toBe('#123456'); expect(el.style.getPropertyPriority('--lg-tint')).toBe('important');
    expect(el.getAttribute('data-lg-backdrop')).toBe('prior'); expect(el.style.getPropertyValue('--lg-opacity')).toBe('');
  });
});
describe('input feedback and accurate fallback state', () => {
  it('handles touch/cancel and keyboard without canceling native events', () => {
    const button = document.createElement('button'); document.body.append(button);
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 50, left: 0, top: 0 } as DOMRect);
    const c = attachGlass(button, { interactive: true });
    const touch = new MouseEvent('pointerdown', { bubbles: true, clientX: 75, clientY: 25, cancelable: true }); Object.defineProperty(touch, 'pointerType', { value: 'touch' });
    expect(button.dispatchEvent(touch)).toBe(true); expect(button.getAttribute('data-lg-pressed')).toBe('true'); expect(button.style.getPropertyValue('--lg-pointer-x')).toBe('75%');
    window.dispatchEvent(new Event('pointercancel')); expect(button.hasAttribute('data-lg-pressed')).toBe(false);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); expect(button.getAttribute('data-lg-pressed')).toBe('true');
    button.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true })); expect(button.hasAttribute('data-lg-pressed')).toBe(false);
    button.disabled = true; button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); expect(button.hasAttribute('data-lg-pressed')).toBe(false);
    c.destroy(); button.disabled = false; button.dispatchEvent(touch); expect(button.hasAttribute('data-lg-pressed')).toBe(false);
  });
  it('reports solid immediately for explicit fallback even when blur syntax exists', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'CSS');
    Object.defineProperty(window, 'CSS', { value: { supports: () => true }, configurable: true });
    const el = document.createElement('div'); document.body.append(el); const c = attachGlass(el, { reducedTransparency: true });
    expect(el.getAttribute('data-lg-renderer')).toBe('solid');
    c.update({}); expect(el.getAttribute('data-lg-renderer')).toBe('css'); c.destroy();
    if (original) Object.defineProperty(window, 'CSS', original); else Reflect.deleteProperty(window, 'CSS');
  });
});
