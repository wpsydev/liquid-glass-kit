import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassIndicator } from '../src/indicator.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height } as DOMRect);
function fixture() {
  const container = document.createElement('nav');
  const backing = document.createElement('div');
  const one = document.createElement('button'); one.textContent = 'One';
  const two = document.createElement('button'); two.textContent = 'Two';
  container.append(backing, one, two); document.body.append(container);
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect(100, 80, 300, 100));
  vi.spyOn(one, 'getBoundingClientRect').mockReturnValue(rect(120, 90, 80, 44));
  vi.spyOn(two, 'getBoundingClientRect').mockReturnValue(rect(220, 100, 90, 50));
  return { container, backing, one, two };
}

describe('decorative geometry indicator', () => {
  it('uses padding-box coordinates with borders and scroll and leaves native selection to the app', () => {
    const { container, backing, one, two } = fixture();
    Object.defineProperties(container, { clientLeft: { value: 3 }, clientTop: { value: 5 }, scrollLeft: { value: 11, writable: true }, scrollTop: { value: 20, writable: true } });
    const click = vi.fn(); one.addEventListener('click', click);
    const c = attachGlassIndicator(container, backing);
    c.moveTo(one);
    expect(backing.style.left).toBe('28px'); expect(backing.style.top).toBe('25px');
    expect(backing.style.width).toBe('80px'); expect(backing.style.height).toBe('44px');
    expect(backing.style.transition).toBe('none');
    c.moveTo(two); expect(backing.style.left).toBe('128px'); expect(backing.style.transition).toContain('280ms');
    c.moveTo(one); expect(backing.style.left).toBe('28px');
    one.click(); expect(click).toHaveBeenCalledOnce(); expect(one.hasAttribute('aria-selected')).toBe(false);
    expect(backing.getAttribute('aria-hidden')).toBe('true'); expect(backing.style.pointerEvents).toBe('none');
    c.moveTo(null); expect(backing.style.visibility).toBe('hidden');
    c.destroy();
  });

  it('handles invalid targets without changing the selected backing and hides disconnected geometry', () => {
    const { container, backing, one } = fixture();
    const c = attachGlassIndicator(container, backing); c.moveTo(one);
    const inner = document.createElement('span'); backing.append(inner);
    for (const invalid of [container, backing, inner, document.createElement('button')]) expect(() => c.moveTo(invalid)).toThrow(RangeError);
    expect(backing.style.visibility).toBe('visible'); expect(backing.style.width).toBe('80px');
    one.remove(); c.update(); expect(backing.style.visibility).toBe('hidden');
    expect(() => c.moveTo(one)).toThrow(RangeError);
    container.append(one); c.moveTo(one); expect(backing.style.visibility).toBe('visible'); expect(backing.style.transition).toBe('none');
    c.destroy();
    expect(() => attachGlassIndicator(container, document.createElement('div'))).toThrow(RangeError);
    const wrapper = document.createElement('div'); wrapper.append(backing); container.append(wrapper);
    expect(() => attachGlassIndicator(container, backing)).toThrow(RangeError);
  });

  it('snaps to reduced-motion changes and bounds options without permanently disabling later motion', () => {
    const { container, backing, one, two } = fixture();
    let reduced = false; let change: (() => void) | undefined;
    const remove = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: remove }));
    const c = attachGlassIndicator(container, backing, { duration: 9000, radius: -9 });
    c.moveTo(one); c.moveTo(two); expect(backing.style.transition).toContain('1000ms');
    expect(backing.style.getPropertyValue('--lg-radius')).toBe('0px');
    reduced = true; change!(); expect(backing.style.transition).toBe('none');
    c.moveTo(one); expect(backing.style.transition).toBe('none');
    reduced = false; change!(); c.moveTo(two); expect(backing.style.transition).toContain('1000ms');
    c.update({ duration: NaN, radius: Infinity }); c.moveTo(one);
    expect(backing.style.transition).toContain('280ms'); expect(backing.style.getPropertyValue('--lg-radius')).toBe('24px');
    c.update({ duration: 0 }); c.moveTo(two); expect(backing.style.transition).toBe('none');
    c.destroy(); expect(remove).toHaveBeenCalledOnce();
  });

  it('repositions on resize/scroll and fully restores ownership during queued work', () => {
    const { container, backing, one, two } = fixture();
    container.style.setProperty('position', 'static', 'important');
    backing.className = 'existing'; backing.setAttribute('aria-hidden', 'false');
    backing.style.setProperty('left', '7px', 'important'); backing.style.setProperty('transition', 'opacity 1s');
    backing.style.setProperty('--lg-radius', '13px', 'important');
    let resize: (() => void) | undefined; let queued: FrameRequestCallback | undefined;
    const observed = new Set<Element>(); const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class { constructor(fn: () => void) { resize = fn; } observe(el: Element) { observed.add(el); } unobserve(el: Element) { observed.delete(el); } disconnect() { observed.clear(); disconnect(); } });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { queued = fn; return 9; });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const c = attachGlassIndicator(container, backing); c.moveTo(one);
    expect(observed.has(one)).toBe(true); c.moveTo(two);
    expect(observed.has(one)).toBe(false); expect(observed.has(two)).toBe(true);
    vi.spyOn(two, 'getBoundingClientRect').mockReturnValue(rect(250, 110, 110, 40));
    resize!(); queued!(0); expect(backing.style.left).toBe('150px'); expect(backing.style.transition).toBe('none');
    container.scrollLeft = 30; container.dispatchEvent(new Event('scroll')); queued!(0); expect(backing.style.left).toBe('180px');
    container.dispatchEvent(new Event('scroll')); c.destroy(); queued!(0);
    c.destroy(); c.moveTo(one); c.update({ radius: 90 });
    expect(backing.className).toBe('existing'); expect(backing.getAttribute('aria-hidden')).toBe('false');
    expect(backing.style.left).toBe('7px'); expect(backing.style.getPropertyPriority('left')).toBe('important');
    expect(backing.style.transition).toBe('opacity 1s'); expect(backing.style.getPropertyValue('--lg-radius')).toBe('13px');
    expect(backing.style.getPropertyPriority('--lg-radius')).toBe('important');
    expect(container.style.position).toBe('static'); expect(container.style.getPropertyPriority('position')).toBe('important');
    expect(cancel).toHaveBeenCalledWith(9); expect(disconnect).toHaveBeenCalledOnce();
    expect(observed.size).toBe(0);
  });

  it('preserves preexisting class and positioned container', () => {
    const { container, backing } = fixture(); container.style.position = 'absolute'; backing.className = 'lg-glass-indicator';
    const c = attachGlassIndicator(container, backing); c.destroy();
    expect(container.style.position).toBe('absolute'); expect(backing.className).toBe('lg-glass-indicator');
    expect(backing.hasAttribute('aria-hidden')).toBe(false);
  });

  it('rejects content-bearing backing before hiding its content or changing ownership', () => {
    const { container, backing } = fixture();
    backing.className = 'app-backing'; backing.setAttribute('aria-hidden', 'false');
    backing.textContent = 'Important visible label';
    expect(() => attachGlassIndicator(container, backing)).toThrow('empty decorative markup');
    expect(backing.getAttribute('aria-hidden')).toBe('false'); expect(backing.className).toBe('app-backing');
    expect(container.style.position).toBe(''); expect(backing.style.visibility).toBe('');
    backing.textContent = ''; backing.append(document.createElement('button'));
    expect(() => attachGlassIndicator(container, backing)).toThrow('empty decorative markup');
    expect(backing.getAttribute('aria-hidden')).toBe('false');
    backing.replaceChildren(document.createTextNode('  '));
    const c = attachGlassIndicator(container, backing); c.destroy();
    expect(backing.getAttribute('aria-hidden')).toBe('false');
  });

  it('springs geometry with overshoot and preserves velocity when the selection changes mid-flight', () => {
    const { container, backing, one, two } = fixture();
    let now = 0, next = 0; const callbacks = new Map<number, FrameRequestCallback>();
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = next++; callbacks.set(id, callback); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
    const step = (ms = 16) => { now += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(now)); };
    const c = attachGlassIndicator(container, backing, { motion: 'spring', damping: 8 });
    c.moveTo(one); c.moveTo(two); expect(backing.style.left).toBe('20px'); expect(backing.style.transition).toBe('none');
    step(50); const intermediate = Number.parseFloat(backing.style.left);
    expect(intermediate).toBeGreaterThan(20); expect(intermediate).toBeLessThan(120);
    c.moveTo(one); expect(Number.parseFloat(backing.style.left)).toBeCloseTo(intermediate, 10);
    step(5); expect(Number.parseFloat(backing.style.left)).toBeGreaterThan(intermediate);
    for (let i = 0; i < 400 && callbacks.size; i++) step();
    expect(backing.style.left).toBe('20px'); expect(callbacks.size).toBe(0);
    c.moveTo(two); let maximum = 0;
    for (let i = 0; i < 400 && callbacks.size; i++) { step(); maximum = Math.max(maximum, Number.parseFloat(backing.style.left)); }
    expect(maximum).toBeGreaterThan(120); expect(backing.style.left).toBe('120px');
    expect(backing.style.width).toBe('90px'); expect(backing.style.height).toBe('50px'); expect(callbacks.size).toBe(0);
    c.moveTo(one); expect(callbacks.size).toBe(1); c.destroy(); expect(callbacks.size).toBe(0);
    expect(backing.style.left).toBe('');
  });

  it('retains an active spring through resize delivery, snaps explicit reduced motion, and stops for disconnected targets', () => {
    const { container, backing, one, two } = fixture();
    let now = 0, next = 0, resize: (() => void) | undefined; const callbacks = new Map<number, FrameRequestCallback>();
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = next++; callbacks.set(id, callback); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} unobserve() {} disconnect() {} });
    const step = (ms = 16) => { now += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(now)); };
    const c = attachGlassIndicator(container, backing, { motion: 'spring' }); c.moveTo(one); c.moveTo(two); step(50);
    resize!(); step(); expect(Number.parseFloat(backing.style.left)).toBeLessThan(120); expect(callbacks.size).toBe(1);
    c.update({ motion: 'spring', reducedMotion: true }); expect(backing.style.left).toBe('120px'); expect(callbacks.size).toBe(0);
    c.moveTo(one); expect(backing.style.left).toBe('20px'); expect(callbacks.size).toBe(0);
    c.update({ motion: 'spring' }); c.moveTo(two); two.remove(); step();
    expect(callbacks.size).toBe(0); expect(backing.style.visibility).toBe('hidden'); c.destroy();
  });
});
