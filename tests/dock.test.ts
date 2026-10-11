import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassDock } from '../src/dock.js';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function clock() {
  let now = 0, id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const next = id++; frames.set(next, callback); return next; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(next => { frames.delete(next); });
  return { frames, step() { now += 16; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); },
    settle() { for (let i = 0; i < 500 && frames.size; i++) this.step(); expect(frames.size).toBe(0); } };
}
function fixture() {
  document.body.innerHTML = '<nav aria-label="Tools"><button data-lg-dock-item aria-pressed="true"><span data-lg-dock-visual>Draw</span></button><a href="#write" data-lg-dock-item><span data-lg-dock-visual>Write</span></a><button data-lg-dock-item disabled><span data-lg-dock-visual>Export</span></button></nav>';
  const container = document.querySelector('nav')!, targets = [...container.children] as HTMLElement[];
  const visuals = targets.map(target => target.firstElementChild as HTMLElement);
  const reads = targets.map((target, index) => vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ left: index * 60, top: index * 60, width: 48, height: 48 } as DOMRect));
  return { container, targets, visuals, reads };
}
function pointer(element: HTMLElement, type: string, x = 24, y = 24, pointerType = 'mouse', extra: Record<string, unknown> = {}) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true });
  Object.defineProperties(event, Object.fromEntries(Object.entries({ pointerType, isPrimary: true, ...extra }).map(([key, value]) => [key, { value }])));
  element.dispatchEvent(event); return event;
}
const scale = (element: HTMLElement) => Number(element.style.getPropertyValue('--lg-dock-scale'));

describe('semantic proximity dock', () => {
  it('magnifies a neighborhood without per-frame geometry reads or idle animation work', () => {
    const time = clock(), f = fixture(), dock = attachGlassDock(f.container);
    expect(time.frames.size).toBe(0); f.reads.forEach(read => expect(read).toHaveBeenCalledOnce());
    for (let i = 0; i < 30; i++) pointer(f.container, 'pointermove');
    expect(time.frames.size).toBe(1); time.settle();
    expect(scale(f.visuals[0])).toBeCloseTo(1.65); expect(scale(f.visuals[1])).toBeCloseTo(1.325);
    expect(scale(f.visuals[2])).toBe(1); expect(f.visuals[0].style.getPropertyValue('--lg-dock-y')).toBe('-18px');
    f.reads.forEach(read => expect(read).toHaveBeenCalledOnce());
    pointer(f.container, 'pointerleave'); time.settle(); expect(scale(f.visuals[0])).toBe(1);
    expect(time.frames.size).toBe(0); dock.destroy();
  });

  it('keeps native focus, clicks, link targets and semantic attributes untouched', () => {
    const time = clock(), f = fixture(), before = f.targets.map(target => target.outerHTML), clicked = vi.fn();
    f.targets[0].addEventListener('click', clicked); const dock = attachGlassDock(f.container);
    f.targets[1].focus(); time.settle(); expect(scale(f.visuals[1])).toBeCloseTo(1.65);
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    f.targets[1].dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
    f.targets[0].click(); expect(clicked).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(f.targets[1]); expect(f.targets[1].getAttribute('href')).toBe('#write');
    dock.destroy(); expect(f.targets.map(target => target.outerHTML)).toEqual(before);
  });

  it('accepts bubbling proximity and activation from the expanded visual without intercepting native clicks', () => {
    const time = clock(), f = fixture(), clicked = vi.fn(); f.targets[0].addEventListener('click', clicked);
    const dock = attachGlassDock(f.container); pointer(f.visuals[0], 'pointermove'); time.settle();
    expect(scale(f.visuals[0])).toBeCloseTo(1.65);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true }); f.visuals[0].dispatchEvent(click);
    expect(clicked).toHaveBeenCalledOnce(); expect(click.defaultPrevented).toBe(false);
    expect(f.targets[0].getAttribute('aria-pressed')).toBe('true'); dock.destroy();
  });

  it('cues an already focused item and bounds spring presentation to configured limits', () => {
    const time = clock(), f = fixture(); f.targets[1].focus();
    const dock = attachGlassDock(f.container, { maxScale: 1.2, lift: 4, damping: 1 });
    for (let i = 0; i < 500 && time.frames.size; i++) {
      time.step();
      for (const visual of f.visuals) {
        expect(scale(visual)).toBeGreaterThanOrEqual(1); expect(scale(visual)).toBeLessThanOrEqual(1.2);
        expect(Number.parseFloat(visual.style.getPropertyValue('--lg-dock-y'))).toBeGreaterThanOrEqual(-4);
      }
    }
    expect(time.frames.size).toBe(0); expect(scale(f.visuals[1])).toBeCloseTo(1.2);
    dock.update(); time.settle(); expect(scale(f.visuals[1])).toBeCloseTo(1.65);
    expect(f.visuals[1].style.getPropertyValue('--lg-dock-y')).toBe('-18px'); dock.destroy();
  });

  it('keeps touch targets stable and restores keyboard cues after touch input', () => {
    const time = clock(), f = fixture(), dock = attachGlassDock(f.container);
    pointer(f.container, 'pointermove'); time.settle(); expect(scale(f.visuals[0])).toBeGreaterThan(1);
    const down = pointer(f.targets[1], 'pointerdown', 84, 84, 'touch'); expect(down.defaultPrevented).toBe(false);
    f.targets[1].focus(); pointer(f.container, 'pointermove', 84, 84, 'touch'); time.settle();
    expect(f.visuals.map(scale)).toEqual([1, 1, 1]);
    f.targets[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); time.settle();
    expect(scale(f.visuals[1])).toBeCloseTo(1.65); dock.destroy();
  });

  it('responds immediately to live reduced motion and explicit updates', () => {
    const time = clock(), f = fixture(); let reduced = false, changed: (() => void) | undefined;
    const remove = vi.fn(); vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; },
      addEventListener: (_: string, callback: () => void) => { changed = callback; }, removeEventListener: remove }));
    const dock = attachGlassDock(f.container); pointer(f.container, 'pointermove'); time.step(); time.step();
    expect(time.frames.size).toBeGreaterThan(0); reduced = true; changed!();
    expect(time.frames.size).toBe(0); expect(f.visuals.map(scale)).toEqual([1, 1, 1]);
    reduced = false; changed!(); time.settle(); expect(scale(f.visuals[0])).toBeCloseTo(1.65);
    dock.update({ reducedMotion: true }); expect(time.frames.size).toBe(0); expect(f.visuals.map(scale)).toEqual([1, 1, 1]);
    dock.destroy(); expect(remove).toHaveBeenCalledOnce();
  });

  it('never starts spring or geometry work from update or refresh while the document is hidden', () => {
    const time = clock(), f = fixture(), dock = attachGlassDock(f.container);
    pointer(f.container, 'pointermove'); time.settle();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(time.frames.size).toBe(0); f.reads.forEach(read => read.mockClear());
    f.targets[1].focus(); dock.update({ maxScale: 2 }); dock.refresh();
    expect(time.frames.size).toBe(0); expect(f.visuals.map(scale)).toEqual([1, 1, 1]);
    f.reads.forEach(read => expect(read).not.toHaveBeenCalled()); dock.destroy();
  });

  it('invalidates cached geometry on scroll and resize and supports vertical orientation', () => {
    const time = clock(), f = fixture(), dock = attachGlassDock(f.container, { orientation: 'vertical' });
    pointer(f.container, 'pointermove', 200, 84); time.settle(); expect(scale(f.visuals[1])).toBeCloseTo(1.65);
    expect(f.visuals[1].style.getPropertyValue('--lg-dock-x')).toBe('18px');
    expect(f.visuals[1].style.getPropertyValue('--lg-dock-y')).toBe('0px');
    f.reads[1].mockReturnValue({ left: 60, top: 120, width: 48, height: 48 } as DOMRect);
    window.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize')); time.settle();
    expect(f.reads[1]).toHaveBeenCalledTimes(2); expect(scale(f.visuals[1])).toBeCloseTo(1.325);
    dock.update({ maxScale: Infinity, radius: -100, lift: 999 }); pointer(f.container, 'pointermove'); time.settle();
    expect(scale(f.visuals[0])).toBeCloseTo(1.65); expect(f.visuals[0].style.getPropertyValue('--lg-dock-y')).toBe('-48px');
    dock.destroy();
  });

  it('refreshes changed membership, restores removed visuals, and rejects malformed markup atomically', () => {
    const time = clock(), f = fixture(), dock = attachGlassDock(f.container);
    const original = f.visuals[0]; f.targets[0].remove(); dock.refresh();
    expect(original.classList.contains('lg-dock-visual')).toBe(false); expect(original.style.getPropertyValue('--lg-dock-scale')).toBe('');
    const added = document.createElement('button'); added.setAttribute('data-lg-dock-item', '');
    added.innerHTML = '<span data-lg-dock-visual>New</span>'; f.container.append(added);
    vi.spyOn(added, 'getBoundingClientRect').mockReturnValue({ left: 180, top: 180, width: 48, height: 48 } as DOMRect);
    dock.refresh(); added.focus(); time.settle(); expect(scale(added.firstElementChild as HTMLElement)).toBeCloseTo(1.65);
    const bad = document.createElement('div'); bad.setAttribute('data-lg-dock-item', ''); f.container.append(bad);
    const before = f.container.innerHTML; expect(() => dock.refresh()).toThrow('native buttons or links');
    expect(f.container.innerHTML).toBe(before); bad.remove(); dock.destroy();
    const invalid = fixture(); invalid.visuals[0].innerHTML = '<a href="#nested">Nested</a>';
    const invalidBefore = invalid.container.innerHTML; expect(() => attachGlassDock(invalid.container)).toThrow('noninteractive');
    expect(invalid.container.innerHTML).toBe(invalidBefore); expect(time.frames.size).toBe(0);
  });

  it('cancels queued work on blur, disconnection and destroy, restoring exact author styles and classes', () => {
    const time = clock(), f = fixture(); f.visuals[0].className = 'existing lg-dock-visual';
    f.visuals[0].style.setProperty('--lg-dock-scale', '.8', 'important');
    f.visuals[0].style.setProperty('--lg-dock-x', '3px');
    const before = f.visuals.map(visual => visual.outerHTML), dock = attachGlassDock(f.container);
    pointer(f.container, 'pointermove'); time.step(); window.dispatchEvent(new Event('blur'));
    expect(time.frames.size).toBe(0); expect(f.visuals.map(scale)).toEqual([1, 1, 1]);
    pointer(f.container, 'pointermove'); time.step(); f.container.remove(); time.settle();
    dock.destroy(); dock.destroy(); dock.update(); dock.refresh();
    expect(f.visuals.map(visual => visual.outerHTML)).toEqual(before);
    expect(f.visuals[0].style.getPropertyPriority('--lg-dock-scale')).toBe('important');
    expect(time.frames.size).toBe(0);
  });

  it('imports safely without browser globals', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { expect(typeof (await import('../src/dock.js')).attachGlassDock).toBe('function'); }
    finally { vi.unstubAllGlobals(); }
  });
});
