import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGlassFeedbackEmitter } from '../src/interaction-feedback.js';
import type { GlassFeedbackOptions, GlassFeedbackPoint } from '../src/interaction-feedback.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function fixture() {
  const canvas = document.createElement('canvas'); document.body.append(canvas);
  const context = {
    clearRect: vi.fn(), setTransform: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1,
  };
  const getContext = vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  let time = 0, id = 0;
  const queue = new Map<number, FrameRequestCallback>();
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { queue.set(++id, callback); return id; });
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(key => { queue.delete(key); });
  vi.spyOn(window.performance, 'now').mockImplementation(() => time);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  let matches = false;
  const listeners = new Set<() => void>();
  const remove = vi.fn((_type: string, listener: () => void) => { listeners.delete(listener); });
  vi.stubGlobal('matchMedia', () => ({ get matches() { return matches; }, addEventListener: (_type: string, listener: () => void) => listeners.add(listener), removeEventListener: remove }));
  const observers: { callback: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('MutationObserver', class {
    observe = vi.fn(); disconnect = vi.fn();
    constructor(public callback: () => void) { observers.push(this); }
  });
  return { canvas, context, getContext, raf, cancel, queue, remove, listeners, observers,
    now(value: number) { time = value; },
    frame(value: number) { time = value; const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(callback => callback(value)); },
    reduced(value: boolean) { matches = value; for (const listener of [...listeners]) listener(); },
  };
}

describe('finite host-triggered interaction feedback', () => {
  it('starts idle and uses one shared RAF for a committed action until completion', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas);
    expect(emitter.supported).toBe(true); expect(emitter.active).toBe(false); expect(f.raf).not.toHaveBeenCalled();
    expect(emitter.emit({ x: 100, y: 60 })).toBe(true); expect(f.queue.size).toBe(1); expect(emitter.stats.activeParticles).toBe(24);
    f.frame(0); expect(f.context.fillRect).toHaveBeenCalledTimes(24); expect(f.queue.size).toBe(1);
    f.frame(210); expect(f.context.fillRect).toHaveBeenCalledTimes(48); f.frame(420);
    expect(emitter.active).toBe(false); expect(emitter.stats.activeParticles).toBe(0); expect(f.queue.size).toBe(0);
    expect(emitter.stats.frames).toBe(3); expect(f.context.globalAlpha).toBe(1); expect(f.observers[0].disconnect).toHaveBeenCalled(); emitter.destroy();
  });

  it.each(['pixels', 'sparks', 'ripple'] as const)('renders original finite %s primitives', effect => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas, { effect, particles: 10 });
    emitter.emit({ x: 70, y: 40 }); f.frame(100);
    if (effect === 'pixels') { expect(f.context.fillRect).toHaveBeenCalledTimes(10); expect(f.context.stroke).not.toHaveBeenCalled(); }
    if (effect === 'sparks') { expect(f.context.lineTo).toHaveBeenCalledTimes(10); expect(f.context.stroke).toHaveBeenCalledTimes(10); }
    if (effect === 'ripple') { expect(f.context.arc).toHaveBeenCalledTimes(3); expect(emitter.stats.activeParticles).toBe(3); }
    f.frame(1000); expect(emitter.active).toBe(false); expect(f.queue.size).toBe(0); emitter.destroy();
  });

  it('coalesces emits and replaces the oldest burst at the bounded concurrency limit', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas, { particles: 999, maxBursts: 999, duration: 9999 });
    for (let index = 0; index < 20; index++) { f.now(index); emitter.emit({ x: index * 5, y: 30 }); }
    expect(emitter.stats.activeBursts).toBe(4); expect(emitter.stats.activeParticles).toBe(256); expect(f.raf).toHaveBeenCalledOnce();
    f.frame(100); expect(f.context.fillRect).toHaveBeenCalledTimes(256);
    f.frame(1019); expect(emitter.active).toBe(false); expect(f.queue.size).toBe(0); emitter.destroy();
  });

  it('clips finite coordinates to the supplied surface and bounds intensity', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas, { width: 200, height: 100, effect: 'ripple', particles: 1 });
    emitter.emit({ x: -100, y: 999, intensity: 999 }); f.frame(0);
    expect(f.context.arc).toHaveBeenCalledWith(0, 100, 3, 0, Math.PI * 2); emitter.cancel();
    const calls = f.raf.mock.calls.length;
    expect(emitter.emit({ x: 1, y: 1, intensity: 0 })).toBe(false); expect(emitter.emit({ x: 1, y: 1, intensity: -2 })).toBe(false);
    expect(f.raf).toHaveBeenCalledTimes(calls); expect(emitter.active).toBe(false); emitter.destroy();
  });

  it('uses per-action effects/colors without changing subsequent defaults', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas, { particles: 2, color: '#ABC' });
    emitter.emit({ x: 20, y: 30, effect: 'sparks', color: '#F00' }); f.frame(20);
    expect(f.context.strokeStyle).toBe('#f00'); expect(f.context.lineTo).toHaveBeenCalledTimes(2); emitter.cancel();
    f.context.fillRect.mockClear(); emitter.emit({ x: 20, y: 30 }); f.frame(40);
    expect(f.context.fillStyle).toBe('#abc'); expect(f.context.fillRect).toHaveBeenCalledTimes(2); emitter.destroy();
  });

  it('hard-bounds CSS dimensions, DPR and backing pixels even on a high-DPR display', () => {
    const f = fixture(); vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(8);
    const emitter = createGlassFeedbackEmitter(f.canvas, { width: 9999, height: 9999, maxDpr: 99, maxPixels: 99999999 });
    expect(emitter.stats.width).toBe(2048); expect(emitter.stats.height).toBe(2048);
    expect(emitter.stats.pixels).toBeLessThanOrEqual(1048576); expect(emitter.stats.dpr).toBe(.5);
    expect(f.canvas.width).toBe(1024); expect(f.canvas.height).toBe(1024); emitter.destroy();
    const smaller = createGlassFeedbackEmitter(f.canvas, { width: 200, height: 100, maxDpr: 2 });
    expect(smaller.stats.backingWidth).toBe(400); expect(smaller.stats.backingHeight).toBe(200); expect(smaller.stats.dpr).toBe(2); smaller.destroy();
  });

  it('allows the pixel budget to lower effective DPR below the configured ceiling', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas, { width: 2048, height: 2048, maxDpr: .5, maxPixels: 1 });
    expect(emitter.stats.pixels).toBe(16384); expect(emitter.stats.dpr).toBe(.0625); emitter.destroy();
  });

  it('replaces options on update, cancels old effects and resizes backing only when necessary', () => {
    const f = fixture(), widthWrites = vi.spyOn(f.canvas, 'width', 'set'), heightWrites = vi.spyOn(f.canvas, 'height', 'set');
    const emitter = createGlassFeedbackEmitter(f.canvas, { width: 300, height: 150, particles: 5, effect: 'ripple' });
    const beforeWidth = widthWrites.mock.calls.length, beforeHeight = heightWrites.mock.calls.length, beforeTransform = f.context.setTransform.mock.calls.length;
    emitter.emit({ x: 10, y: 10 }); emitter.update({ width: 300, height: 150 });
    expect(emitter.active).toBe(false); expect(f.queue.size).toBe(0);
    expect(widthWrites).toHaveBeenCalledTimes(beforeWidth); expect(heightWrites).toHaveBeenCalledTimes(beforeHeight); expect(f.context.setTransform).toHaveBeenCalledTimes(beforeTransform);
    emitter.emit({ x: 10, y: 10 }); f.frame(20); expect(f.context.fillRect).toHaveBeenCalledTimes(24);
    emitter.update({ width: 400, height: 200 }); expect(widthWrites.mock.calls.length).toBeGreaterThan(beforeWidth); expect(emitter.stats.width).toBe(400);
    emitter.update(); expect(emitter.stats.width).toBe(300); expect(emitter.stats.height).toBe(150); emitter.destroy();
  });

  it('cancels hidden-page work and waits for a new host action instead of resuming automatically', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas); emitter.emit({ x: 50, y: 50 });
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    expect(emitter.active).toBe(false); expect(f.queue.size).toBe(0); expect(emitter.emit({ x: 10, y: 10 })).toBe(false);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    expect(f.queue.size).toBe(0); expect(emitter.emit({ x: 10, y: 10 })).toBe(true); emitter.destroy();
  });

  it('combines explicit and live reduced motion, never replaying cancelled bursts', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas); emitter.emit({ x: 50, y: 50 }); f.reduced(true);
    expect(f.queue.size).toBe(0); expect(emitter.active).toBe(false); expect(emitter.emit({ x: 50, y: 50 })).toBe(false);
    f.reduced(false); expect(f.queue.size).toBe(0); expect(emitter.emit({ x: 50, y: 50 })).toBe(true);
    emitter.update({ reducedMotion: true }); expect(emitter.active).toBe(false); f.reduced(false); expect(emitter.emit({ x: 50, y: 50 })).toBe(false);
    emitter.update(); expect(emitter.emit({ x: 50, y: 50 })).toBe(true); emitter.destroy(); expect(f.listeners.size).toBe(0); expect(f.remove).toHaveBeenCalledOnce();
  });

  it('ends suspended-timestamp work without runaway integration or additional frames', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas); emitter.emit({ x: 100, y: 70 });
    f.frame(600000); expect(emitter.active).toBe(false); expect(f.context.fillRect).not.toHaveBeenCalled(); expect(f.queue.size).toBe(0); emitter.destroy();
  });

  it('cancels disconnected canvases through active lifecycle checks and permits deliberate reattachment', () => {
    const f = fixture(), emitter = createGlassFeedbackEmitter(f.canvas); emitter.emit({ x: 50, y: 50 }); f.canvas.remove(); f.observers[0].callback();
    expect(emitter.active).toBe(false); expect(f.queue.size).toBe(0); expect(emitter.emit({ x: 50, y: 50 })).toBe(false);
    document.body.append(f.canvas); expect(emitter.emit({ x: 50, y: 50 })).toBe(true); f.canvas.remove(); f.frame(10); expect(emitter.active).toBe(false); emitter.destroy();
  });

  it('preserves author canvas attributes/style priorities and makes destroy idempotent', () => {
    const f = fixture(); f.canvas.setAttribute('width', '500'); f.canvas.setAttribute('height', '200'); f.canvas.setAttribute('aria-hidden', 'false'); f.canvas.setAttribute('tabindex', '0');
    f.canvas.style.setProperty('width', '80%', 'important'); f.canvas.style.setProperty('height', '4rem', 'important'); f.canvas.style.setProperty('pointer-events', 'auto', 'important'); f.canvas.style.color = 'red';
    const docListeners = vi.spyOn(document, 'removeEventListener'), emitter = createGlassFeedbackEmitter(f.canvas, { width: 300, height: 100 });
    expect(f.canvas.getAttribute('aria-hidden')).toBe('true'); expect(f.canvas.style.pointerEvents).toBe('none'); expect(f.canvas.getAttribute('tabindex')).toBe('-1'); expect(f.canvas.hasAttribute('inert')).toBe(true);
    emitter.emit({ x: 50, y: 50 }); emitter.destroy(); const clears = f.context.clearRect.mock.calls.length;
    emitter.destroy(); emitter.cancel(); emitter.update(); expect(emitter.emit({ x: 50, y: 50 })).toBe(false);
    expect(f.context.clearRect).toHaveBeenCalledTimes(clears); expect(emitter.supported).toBe(false); expect(emitter.active).toBe(false);
    expect(f.canvas.getAttribute('width')).toBe('500'); expect(f.canvas.getAttribute('height')).toBe('200'); expect(f.canvas.getAttribute('aria-hidden')).toBe('false'); expect(f.canvas.getAttribute('tabindex')).toBe('0'); expect(f.canvas.hasAttribute('inert')).toBe(false);
    for (const [key, value] of [['width', '80%'], ['height', '4rem'], ['pointer-events', 'auto']]) { expect(f.canvas.style.getPropertyValue(key)).toBe(value); expect(f.canvas.style.getPropertyPriority(key)).toBe('important'); }
    expect(f.canvas.style.color).toBe('red'); expect(f.queue.size).toBe(0); expect(docListeners.mock.calls.some(([name]) => name === 'visibilitychange')).toBe(true); expect(f.listeners.size).toBe(0);
  });

  it('preserves absent canvas attributes on teardown', () => {
    const f = fixture(); const emitter = createGlassFeedbackEmitter(f.canvas, { width: 100, height: 100 }); emitter.destroy();
    expect(f.canvas.hasAttribute('width')).toBe(false); expect(f.canvas.hasAttribute('height')).toBe(false); expect(f.canvas.style.width).toBe(''); expect(f.canvas.hasAttribute('aria-hidden')).toBe(false);
  });

  it('does not bind input or resize listeners, read layout or change native controls', () => {
    const f = fixture(), geometry = vi.spyOn(f.canvas, 'getBoundingClientRect');
    const documentListeners = vi.spyOn(document, 'addEventListener'), windowListeners = vi.spyOn(window, 'addEventListener'), canvasListeners = vi.spyOn(f.canvas, 'addEventListener');
    const button = document.createElement('button'); document.body.append(button); button.focus(); const clicked = vi.fn(); button.addEventListener('click', clicked);
    const emitter = createGlassFeedbackEmitter(f.canvas); button.click(); emitter.emit({ x: 50, y: 50 }); f.frame(20);
    expect(document.activeElement).toBe(button); expect(clicked).toHaveBeenCalledOnce(); expect(button.hasAttribute('aria-hidden')).toBe(false);
    expect(geometry).not.toHaveBeenCalled(); expect(canvasListeners).not.toHaveBeenCalled(); expect(windowListeners).not.toHaveBeenCalled();
    expect(documentListeners.mock.calls.map(([name]) => name)).toEqual(['visibilitychange']); emitter.destroy();
  });

  it('handles missing/throwing 2D contexts without altering authors or leaving listeners', () => {
    const f = fixture(), listeners = vi.spyOn(document, 'addEventListener'); f.getContext.mockReturnValue(null);
    const first = createGlassFeedbackEmitter(f.canvas); expect(first.supported).toBe(false); expect(first.emit({ x: 10, y: 10 })).toBe(false);
    expect(f.canvas.hasAttribute('aria-hidden')).toBe(false); expect(f.listeners.size).toBe(0); expect(listeners).not.toHaveBeenCalled(); first.destroy();
    f.getContext.mockImplementation(() => { throw new Error('Disabled canvas'); });
    const second = createGlassFeedbackEmitter(f.canvas); expect(second.supported).toBe(false); expect(f.raf).not.toHaveBeenCalled(); second.destroy();
  });

  it('cleans up initial resize failures and terminates active draw failures', () => {
    const f = fixture(), docListeners = vi.spyOn(document, 'addEventListener'); f.context.setTransform.mockImplementationOnce(() => { throw new Error('Lost context'); });
    const first = createGlassFeedbackEmitter(f.canvas); expect(first.supported).toBe(false); expect(f.canvas.hasAttribute('aria-hidden')).toBe(false); expect(docListeners).not.toHaveBeenCalled(); expect(f.listeners.size).toBe(0); first.destroy();
    const second = createGlassFeedbackEmitter(f.canvas); second.emit({ x: 50, y: 50 }); f.context.fillRect.mockImplementationOnce(() => { throw new Error('Drawing disabled'); }); f.frame(10);
    expect(second.supported).toBe(false); expect(second.active).toBe(false); expect(f.queue.size).toBe(0); second.destroy();
    const third = createGlassFeedbackEmitter(f.canvas); third.emit({ x: 50, y: 50 }); f.context.clearRect.mockImplementationOnce(() => { throw new Error('Clearing disabled'); }); f.frame(20);
    expect(third.supported).toBe(false); expect(third.active).toBe(false); expect(f.queue.size).toBe(0); third.destroy();
  });

  it('rejects invalid options/actions and leaves current work untouched after rejected updates', () => {
    const f = fixture();
    for (const options of [{ color: 'red' }, { color: '#fff;' }, { effect: 'confetti' }, { duration: NaN }, { particles: '20' }, { reducedMotion: 'yes' }, { maxDpr: Infinity }, { radius: 20 }]) expect(() => createGlassFeedbackEmitter(f.canvas, options as GlassFeedbackOptions)).toThrow();
    const emitter = createGlassFeedbackEmitter(f.canvas); emitter.emit({ x: 50, y: 50 });
    for (const point of [{ x: Infinity, y: 1 }, { x: 1 }, { x: '1', y: 1 }, { x: 1, y: 1, effect: 'flame' }, { x: 1, y: 1, color: 'var(--color)' }, { x: 1, y: 1, intensity: NaN }, { x: 1, y: 1, target: '#button' }]) expect(() => emitter.emit(point as GlassFeedbackPoint)).toThrow();
    expect(() => emitter.update({ width: NaN })).toThrow(); expect(emitter.active).toBe(true); expect(f.queue.size).toBe(1); emitter.destroy();
  });

  it('rejects prototype/unknown/accessor inputs without evaluating accessors', () => {
    const f = fixture(); expect(() => createGlassFeedbackEmitter(f.canvas, JSON.parse('{"__proto__":{"admin":true}}'))).toThrow();
    expect(() => createGlassFeedbackEmitter(f.canvas, Object.create({ particles: 10 }))).toThrow();
    let called = false; const payload = {}; Object.defineProperty(payload, 'duration', { get() { called = true; return 100; } });
    expect(() => createGlassFeedbackEmitter(f.canvas, payload)).toThrow(/accessors/); expect(called).toBe(false);
  });

  it('can be imported without browser globals', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { expect(typeof (await import('../src/interaction-feedback.js')).createGlassFeedbackEmitter).toBe('function'); }
    finally { vi.unstubAllGlobals(); }
  });
});
