import { afterEach, describe, expect, it, vi } from 'vitest';
import { advanceGlassSpring, attachGlassMotion, resolveGlassSpring } from '../src/motion.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function clock() {
  let now = 0, next = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = next++; callbacks.set(id, callback); return id; });
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
  return {
    callbacks, cancel,
    step(milliseconds = 16) { now += milliseconds; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(now)); },
    settle() { for (let i = 0; i < 500 && callbacks.size; i++) this.step(); expect(callbacks.size).toBe(0); },
  };
}
function button() {
  const element = document.createElement('button'); element.textContent = 'Save'; document.body.append(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 100, height: 50 } as DOMRect);
  return element;
}
const number = (element: HTMLElement, key: string) => Number(element.style.getPropertyValue(key));

describe('analytic spring motion', () => {
  it('has equivalent elapsed-time results across refresh rates and converges for all damping regimes', () => {
    for (const options of [resolveGlassSpring({ damping: 8 }), resolveGlassSpring({ stiffness: 100, damping: 20 }), resolveGlassSpring({ damping: 100 })]) {
      const direct = advanceGlassSpring(0, 0, 1, .5, options);
      let accumulated: [number, number] = [0, 0];
      for (let i = 0; i < 60; i++) accumulated = advanceGlassSpring(accumulated[0], accumulated[1], 1, .5 / 60, options);
      expect(accumulated[0]).toBeCloseTo(direct[0], 11); expect(accumulated[1]).toBeCloseTo(direct[1], 10);
      const settled = advanceGlassSpring(0, 0, 1, 30, options);
      expect(settled[0]).toBeCloseTo(1, 8); expect(settled[1]).toBeCloseTo(0, 8);
    }
    expect(resolveGlassSpring({ stiffness: Infinity, damping: -5, mass: 50 })).toEqual({ stiffness: 260, damping: 1, mass: 10 });
  });

  it('presses directionally, preserves velocity when released, overshoots, then stops requesting frames', () => {
    const time = clock(), element = button(); const motion = attachGlassMotion(element, { damping: 8 });
    expect(time.callbacks.size).toBe(0);
    motion.press({ x: 90, y: 25 }); time.step(60);
    const scaleBeforeRelease = number(element, '--lg-motion-scale-y');
    expect(scaleBeforeRelease).toBeLessThan(1);
    expect(number(element, '--lg-motion-scale-x')).toBeGreaterThan(scaleBeforeRelease);
    expect(element.style.getPropertyValue('--lg-motion-light-x')).toBe('90%');
    motion.release(); time.step(5);
    // Existing inward velocity continues briefly after changing the target outward.
    expect(number(element, '--lg-motion-scale-y')).toBeLessThan(scaleBeforeRelease);
    let maximum = 0;
    for (let i = 0; i < 200 && time.callbacks.size; i++) { time.step(); maximum = Math.max(maximum, number(element, '--lg-motion-scale-y')); }
    expect(maximum).toBeGreaterThan(1);
    time.settle(); expect(number(element, '--lg-motion-scale-y')).toBe(1);
    expect(element.getAttribute('data-lg-motion')).toBe('idle'); expect(time.callbacks.size).toBe(0);
    motion.destroy();
  });

  it('materializes without changing visibility, focus, native events, or semantic attributes', async () => {
    const time = clock(), element = button(); const clicked = vi.fn(); element.addEventListener('click', clicked);
    const motion = attachGlassMotion(element); element.focus();
    const entered = motion.enter(); expect(number(element, '--lg-motion-opacity')).toBe(0);
    time.settle(); expect(await entered).toBe(true); expect(element.style.opacity).toBe('');
    const exited = motion.exit(); time.settle(); expect(await exited).toBe(true);
    expect(number(element, '--lg-motion-opacity')).toBe(0);
    expect(element.hidden).toBe(false); expect(element.hasAttribute('aria-hidden')).toBe(false);
    expect(element.hasAttribute('inert')).toBe(false); expect(element.style.visibility).toBe('');
    expect(document.activeElement).toBe(element); element.click(); expect(clicked).toHaveBeenCalledOnce();
    const reentered = motion.enter(); time.settle(); expect(await reentered).toBe(true);
    expect(element.style.opacity).toBe(''); motion.destroy();
  });

  it('settles interrupted promises and resumes from current position rather than restarting', async () => {
    const time = clock(), element = button(); const motion = attachGlassMotion(element);
    const exiting = motion.exit(); time.step(70);
    const opacity = number(element, '--lg-motion-opacity');
    const entering = motion.enter(); expect(await exiting).toBe(false);
    expect(number(element, '--lg-motion-opacity')).toBeCloseTo(opacity, 10);
    time.step(5); expect(number(element, '--lg-motion-opacity')).toBeLessThan(opacity);
    time.settle(); expect(await entering).toBe(true);
    const interrupted = motion.enter(); time.step(); motion.press(); expect(await interrupted).toBe(false);
    motion.release(); time.settle(); motion.destroy();
  });

  it('snaps on OS or explicit reduced motion and handles paused-tab gaps', async () => {
    const time = clock(), element = button(); let reduced = false; let change: (() => void) | undefined;
    const remove = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, listener: () => void) => { change = listener; }, removeEventListener: remove }));
    const motion = attachGlassMotion(element); const exiting = motion.exit(); time.step(60);
    reduced = true; change!(); expect(await exiting).toBe(true); expect(time.callbacks.size).toBe(0);
    expect(number(element, '--lg-motion-scale-x')).toBe(1);
    expect(await motion.enter()).toBe(true); motion.press(); expect(number(element, '--lg-motion-scale-x')).toBe(1);
    motion.release(); reduced = false; change!();
    const normal = motion.exit(); time.step(30000); expect(await normal).toBe(true); expect(time.callbacks.size).toBe(0);
    motion.update({ reducedMotion: true }); expect(await motion.enter()).toBe(true); expect(time.callbacks.size).toBe(0);
    motion.destroy(); expect(remove).toHaveBeenCalledOnce();
  });

  it('preserves native input behavior and handles pointer cancellation, blur, and disabled controls', () => {
    const time = clock(), element = button(); const motion = attachGlassMotion(element);
    const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); element.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false); expect(element.getAttribute('data-lg-motion-pressed')).toBe('true');
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })); time.settle();
    const pointer = new MouseEvent('pointerdown', { button: 0, clientX: 90, clientY: 40, bubbles: true, cancelable: true }); element.dispatchEvent(pointer);
    expect(pointer.defaultPrevented).toBe(false); expect(element.getAttribute('data-lg-motion-pressed')).toBe('true');
    window.dispatchEvent(new Event('pointercancel')); time.settle(); expect(element.hasAttribute('data-lg-motion-pressed')).toBe(false);
    motion.press(); window.dispatchEvent(new Event('blur')); time.settle();
    element.disabled = true; motion.press(); element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(time.callbacks.size).toBe(0); expect(element.hasAttribute('data-lg-motion-pressed')).toBe(false);
    motion.destroy();
  });

  it('stops on disconnection or destroy, resolves false, and restores owned values including priorities', async () => {
    const time = clock(), element = button(); element.className = 'existing';
    element.style.setProperty('scale', '.9', 'important'); element.style.setProperty('opacity', '.8', 'important');
    element.style.setProperty('transition', 'opacity 1s', 'important'); element.setAttribute('data-lg-motion', 'original');
    element.style.setProperty('--lg-motion-scale-x', '.7', 'important');
    const motion = attachGlassMotion(element); const entering = motion.enter();
    expect(time.callbacks.has(0)).toBe(true); motion.destroy();
    expect(await entering).toBe(false); expect(time.cancel).toHaveBeenCalledWith(0); expect(time.callbacks.size).toBe(0);
    motion.destroy(); motion.press(); motion.update(); expect(await motion.enter()).toBe(false);
    expect(element.className).toBe('existing'); expect(element.style.scale).toBe('0.9');
    expect(element.style.getPropertyPriority('scale')).toBe('important'); expect(element.style.opacity).toBe('0.8');
    expect(element.style.getPropertyPriority('opacity')).toBe('important'); expect(element.style.transition).toBe('opacity 1s');
    expect(element.style.getPropertyPriority('--lg-motion-scale-x')).toBe('important'); expect(element.getAttribute('data-lg-motion')).toBe('original');
    const second = attachGlassMotion(element); const interrupted = second.exit(); element.remove(); time.step();
    expect(await interrupted).toBe(false); expect(time.callbacks.size).toBe(0); second.destroy();
  });

  it('imports without window/document globals', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { const module = await import('../src/motion.js'); expect(typeof module.attachGlassMotion).toBe('function'); expect(module.resolveGlassSpring().stiffness).toBe(260); }
    finally { vi.unstubAllGlobals(); }
  });
});
