import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachGlassSceneLazy } from '../src/lazy.js';

const mocked = vi.hoisted(() => ({ attach: vi.fn() }));
vi.mock('../src/scene.js', () => ({ attachGlassScene: mocked.attach }));
let notify: IntersectionObserverCallback;
let observerOptions: IntersectionObserverInit | undefined;
const disconnect = vi.fn();
const pending: ReturnType<typeof attachGlassSceneLazy>[] = [];
const mounted = () => { const canvas = document.createElement('canvas'); document.body.append(canvas); return canvas; };
const observe = (canvas: HTMLCanvasElement, intersecting = true) => notify([{ target: canvas, isIntersecting: intersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
const controller = () => ({ supported: true, update: vi.fn(), destroy: vi.fn() });
const start = (...args: Parameters<typeof attachGlassSceneLazy>) => { const value = attachGlassSceneLazy(...args); pending.push(value); return value; };

beforeEach(() => {
  mocked.attach.mockReset().mockImplementation(controller); disconnect.mockClear();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) { notify = callback; observerOptions = options; }
    observe() {} disconnect = disconnect;
  });
});
afterEach(() => { for (const loader of pending.splice(0)) loader.destroy(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('lazy scene lifecycle', () => {
  it('waits for its own intersection and forwards custom visibility options', async () => {
    const canvas = mounted(), root = document.body;
    const loader = start(canvas, { palette: 'ocean' }, { root, rootMargin: '0px' });
    expect(observerOptions).toEqual({ root, rootMargin: '0px' });
    observe(canvas, false); observe(document.createElement('canvas'));
    expect(loader.state).toBe('waiting'); expect(mocked.attach).not.toHaveBeenCalled();
    observe(canvas); const scene = await loader.ready;
    expect(scene).toBe(loader.scene); expect(loader.state).toBe('ready');
    expect(mocked.attach).toHaveBeenCalledExactlyOnceWith(canvas, { palette: 'ocean' }); expect(disconnect).toHaveBeenCalled();
  });
  it('deduplicates explicit requests and uses the latest pending options', async () => {
    const canvas = mounted(), loader = start(canvas, { palette: 'neon' });
    expect(observerOptions?.rootMargin).toBe('200px');
    loader.update({ palette: 'sunset', paused: true });
    expect(loader.load()).toBe(loader.ready); expect(loader.load()).toBe(loader.ready); observe(canvas);
    const scene = await loader.ready;
    expect(mocked.attach).toHaveBeenCalledExactlyOnceWith(canvas, { palette: 'sunset', paused: true });
    loader.update({ palette: 'ocean' }); expect(scene?.update).toHaveBeenCalledExactlyOnceWith({ palette: 'ocean' });
  });
  it('waits for document visibility even after intersection or manual load', async () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const canvas = mounted(), loader = start(canvas);
    observe(canvas); loader.load(); await Promise.resolve();
    expect(loader.state).toBe('waiting'); expect(mocked.attach).not.toHaveBeenCalled();
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); await loader.ready;
    expect(mocked.attach).toHaveBeenCalledOnce();
  });
  it('avoids GPU mounting if visibility changes during module loading', async () => {
    const hidden = vi.spyOn(document, 'hidden', 'get');
    const loader = start(mounted()); loader.load(); hidden.mockReturnValue(true);
    await vi.waitFor(() => expect(loader.state).toBe('waiting'));
    expect(mocked.attach).not.toHaveBeenCalled();
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); await loader.ready;
    expect(mocked.attach).toHaveBeenCalledOnce();
  });
  it('cancels before visibility and ignores queued observer callbacks', async () => {
    const canvas = mounted(), loader = start(canvas); loader.destroy(); observe(canvas);
    expect(await loader.load()).toBeNull(); expect(loader.state).toBe('destroyed'); expect(mocked.attach).not.toHaveBeenCalled();
  });
  it('does not mount after destruction during an in-flight import', async () => {
    const loader = start(mounted()); loader.load(); loader.destroy();
    expect(await loader.ready).toBeNull(); await new Promise(resolve => setTimeout(resolve, 0));
    expect(mocked.attach).not.toHaveBeenCalled(); expect(loader.scene).toBeNull();
  });
  it('uses a visible fallback when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const loader = start(mounted()); await loader.ready;
    expect(mocked.attach).toHaveBeenCalledOnce(); expect(loader.error).toBeUndefined();
  });
  it('returns an unsupported controller so the host can preserve its CSS fallback', async () => {
    mocked.attach.mockReturnValue({ ...controller(), supported: false });
    const loader = start(mounted()); const scene = await loader.load();
    expect(scene?.supported).toBe(false); expect(loader.state).toBe('ready');
  });
  it('settles detached mounts without initializing and reports the reason', async () => {
    const canvas = mounted(), loader = start(canvas); canvas.remove();
    expect(await loader.load()).toBeNull(); expect(loader.state).toBe('failed'); expect(loader.error).toBeInstanceOf(Error);
    expect(mocked.attach).not.toHaveBeenCalled(); expect(disconnect).toHaveBeenCalled();
  });
  it('reports initializer failures without rejecting an unattended readiness promise', async () => {
    const reason = new Error('GPU unavailable'); mocked.attach.mockImplementation(() => { throw reason; });
    const loader = start(mounted()); expect(await loader.load()).toBeNull(); expect(loader.state).toBe('failed'); expect(loader.error).toBe(reason);
    await loader.load(); expect(mocked.attach).toHaveBeenCalledOnce();
  });
  it('settles invalid observation configuration without importing the renderer', async () => {
    vi.stubGlobal('IntersectionObserver', class { constructor() { throw new SyntaxError('Invalid root margin'); } });
    const loader = start(mounted(), {}, { rootMargin: 'invalid' });
    expect(await loader.ready).toBeNull(); expect(loader.state).toBe('failed'); expect(mocked.attach).not.toHaveBeenCalled();
  });
  it('destroys the mounted controller once and ignores updates after teardown', async () => {
    const loader = start(mounted()); const scene = await loader.load(); loader.destroy(); loader.destroy(); loader.update({ paused: true });
    expect(scene?.destroy).toHaveBeenCalledOnce(); expect(scene?.update).not.toHaveBeenCalled(); expect(loader.scene).toBeNull(); expect(loader.state).toBe('destroyed');
  });
});
