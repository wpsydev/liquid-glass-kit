import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGlassMediaCoordinator } from '../src/ambient-media.js';
import type { GlassAmbientMediaOptions, GlassMediaCoordinatorOptions } from '../src/ambient-media.js';

const cleanup: (() => void)[] = [];
const coordinator = (options: GlassMediaCoordinatorOptions = {}) => { const controller = createGlassMediaCoordinator(options); cleanup.push(controller.destroy); return controller; };
afterEach(() => { cleanup.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
function environment() {
  let reduced = false, saveData = false;
  const listeners = new Set<() => void>();
  const mediaRemove = vi.fn((_type: string, listener: () => void) => listeners.delete(listener));
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_type: string, listener: () => void) => listeners.add(listener), removeEventListener: mediaRemove }));
  const connection = new EventTarget(); Object.defineProperty(connection, 'saveData', { configurable: true, get: () => saveData });
  vi.stubGlobal('navigator', { connection });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const intersections: { callback: IntersectionObserverCallback; observe: ReturnType<typeof vi.fn>; unobserve: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn();
    constructor(public callback: IntersectionObserverCallback) { intersections.push(this); }
  });
  const mutations: { callback: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('MutationObserver', class { observe = vi.fn(); disconnect = vi.fn(); constructor(public callback: () => void) { mutations.push(this); } });
  return { listeners, mediaRemove, intersections, mutations, connection,
    reduced(value: boolean) { reduced = value; for (const listener of [...listeners]) listener(); },
    saving(value: boolean) { saveData = value; connection.dispatchEvent(new Event('change')); },
    visible(node: HTMLVideoElement, value: boolean, index = 0) { intersections[index].callback([{ target: node, isIntersecting: value, intersectionRatio: value ? 1 : 0 } as IntersectionObserverEntry], intersections[index] as unknown as IntersectionObserver); },
  };
}
function video(playing = false) {
  const node = document.createElement('video'); document.body.append(node);
  let paused = !playing;
  const tasks: { resolve: () => void; reject: (error?: Error) => void }[] = [];
  vi.spyOn(node, 'paused', 'get').mockImplementation(() => paused);
  const pause = vi.spyOn(node, 'pause').mockImplementation(() => { const changed = !paused; paused = true; if (changed) node.dispatchEvent(new Event('pause')); });
  const play = vi.spyOn(node, 'play').mockImplementation(() => {
    paused = false; node.dispatchEvent(new Event('play'));
    return new Promise<void>((resolve, reject) => tasks.push({ resolve, reject: error => reject(error ?? new DOMException('Blocked', 'NotAllowedError')) }));
  });
  return { node, pause, play, tasks, playing(value: boolean) { paused = !value; }, externalPlay() { paused = false; node.dispatchEvent(new Event('play')); }, externalPause() { paused = true; node.dispatchEvent(new Event('pause')); } };
}

describe('explicit ambient media coordination', () => {
  it('starts manual/idle without IO, pointer listeners, property mutations or RAF', () => {
    const env = environment(), media = video(), events = vi.spyOn(media.node, 'addEventListener'), raf = vi.spyOn(window, 'requestAnimationFrame');
    const controller = coordinator(), handle = controller.attach(media.node);
    expect(handle.state).toBe('idle'); expect(media.play).not.toHaveBeenCalled(); expect(media.node.muted).toBe(false); expect(media.node.loop).toBe(false); expect(media.node.hasAttribute('preload')).toBe(false);
    expect(env.intersections).toHaveLength(0); expect(events.mock.calls.map(([type]) => type)).toEqual(['play', 'pause', 'error']); expect(raf).not.toHaveBeenCalled();
    expect(controller.stats.ownedActive).toBe(0);
  });
  it('reserves pending requests in the same budget and reports fulfilled playback separately', async () => {
    environment(); const first = video(), second = video(), third = video(); const controller = coordinator({ maxActive: 2 });
    const a = controller.attach(first.node), b = controller.attach(second.node), c = controller.attach(third.node);
    const one = a.request(), two = b.request();
    expect(controller.stats.ownedActive).toBe(2); expect(controller.stats.pending).toBe(2); expect(a.state).toBe('requesting');
    expect(await c.request()).toBe(false); expect(third.play).not.toHaveBeenCalled(); first.tasks[0].resolve(); second.tasks[0].resolve();
    expect(await one).toBe(true); expect(await two).toBe(true); expect(controller.stats.pending).toBe(0); expect(a.state).toBe('playing');
    a.pause(); expect(controller.stats.ownedActive).toBe(1); expect(third.play).not.toHaveBeenCalled(); const request = c.request(); third.tasks[0].resolve(); expect(await request).toBe(true);
  });
  it('hard-caps active budgets and bounds attachment count', () => {
    environment(); const controller = coordinator({ maxActive: 999 }); const media = Array.from({ length: 5 }, () => video());
    media.forEach(item => void controller.attach(item.node).request()); expect(controller.stats.ownedActive).toBe(4); expect(controller.stats.maxActive).toBe(4); expect(media[4].play).not.toHaveBeenCalled();
    controller.update({ maxActive: -1 }); expect(controller.stats.maxActive).toBe(1); expect(controller.stats.ownedActive).toBe(1);
    const limited = coordinator(); for (let index = 0; index < 128; index++) limited.attach(video().node); expect(() => limited.attach(video().node)).toThrow(/128/);
  });
  it('uses one shared observer for explicit visible policies and promotes waiting eligible previews', async () => {
    const env = environment(), a = video(), b = video(), controller = coordinator();
    const first = controller.attach(a.node, { trigger: 'visible' }), second = controller.attach(b.node, { trigger: 'visible' });
    expect(env.intersections).toHaveLength(1); expect(a.play).not.toHaveBeenCalled(); env.visible(a.node, true); env.visible(b.node, true);
    expect(a.play).toHaveBeenCalledOnce(); expect(b.play).not.toHaveBeenCalled(); expect(second.state).toBe('eligible');
    a.tasks[0].resolve(); await settle(); env.visible(a.node, false); expect(a.pause).toHaveBeenCalledOnce(); expect(b.play).toHaveBeenCalledOnce();
    b.tasks[0].resolve(); await settle(); expect(first.state).toBe('paused'); expect(second.state).toBe('playing'); expect(controller.stats.ownedActive).toBe(1);
  });
  it('installs hover input only when requested and does not hijack focus or clicks', () => {
    environment(); const media = video(), events = vi.spyOn(media.node, 'addEventListener'), controller = coordinator(); const handle = controller.attach(media.node, { trigger: 'hover' });
    expect(events.mock.calls.map(([type]) => type)).toEqual(['play', 'pause', 'error', 'pointerenter', 'pointerleave']);
    const button = document.createElement('button'); document.body.append(button); button.focus(); const clicked = vi.fn(); media.node.addEventListener('click', clicked); media.node.click(); expect(clicked).toHaveBeenCalledOnce(); expect(media.play).not.toHaveBeenCalled();
    media.node.dispatchEvent(new Event('pointerenter')); expect(media.play).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(button);
    media.node.dispatchEvent(new Event('pointerleave')); expect(media.pause).toHaveBeenCalledOnce(); expect(handle.state).toBe('paused');
  });
  it('provides conservative deliberate-request fallback when IntersectionObserver is absent or fails', async () => {
    environment(); vi.stubGlobal('IntersectionObserver', undefined); const media = video(), controller = coordinator(), handle = controller.attach(media.node, { trigger: 'visible' });
    expect(handle.state).toBe('unsupported'); expect(media.play).not.toHaveBeenCalled(); const request = handle.request(); media.tasks[0].resolve(); expect(await request).toBe(true);
    handle.destroy(); vi.stubGlobal('IntersectionObserver', class { constructor() { throw new Error('Unavailable'); } });
    const another = controller.attach(video().node, { trigger: 'visible' }); expect(another.state).toBe('unsupported');
  });
  it('respects existing playback and native controlled full players without mutating or pausing them', async () => {
    const env = environment(), running = video(true), controlled = video(); controlled.node.controls = true;
    const controller = coordinator(), a = controller.attach(running.node), b = controller.attach(controlled.node, { trigger: 'hover' });
    expect(a.state).toBe('user-owned'); expect(b.state).toBe('user-owned'); expect(await a.request()).toBe(false); expect(await b.request()).toBe(false);
    controlled.node.dispatchEvent(new Event('pointerenter')); controller.update({ reducedMotion: true }); env.saving(true); a.pause(); b.pause(); controller.destroy();
    expect(running.pause).not.toHaveBeenCalled(); expect(controlled.pause).not.toHaveBeenCalled(); expect(running.node.muted).toBe(false); expect(controlled.node.controls).toBe(true);
  });
  it('yields native user play or pause and never automatically reclaims that player', () => {
    const env = environment(), media = video(), controller = coordinator(); const handle = controller.attach(media.node, { trigger: 'visible' });
    media.externalPlay(); env.visible(media.node, true); expect(handle.state).toBe('user-owned'); expect(media.play).not.toHaveBeenCalled(); env.reduced(true); expect(media.pause).not.toHaveBeenCalled();
    media.externalPause(); env.reduced(false); expect(media.play).not.toHaveBeenCalled();
    void handle.request(); expect(media.play).toHaveBeenCalledOnce(); media.externalPause(); expect(handle.state).toBe('user-owned'); env.visible(media.node, false); env.visible(media.node, true); expect(media.play).toHaveBeenCalledOnce();
  });
  it('pauses only owned previews on page hide and requires a fresh manual host action after resume', async () => {
    environment(); const owned = video(), user = video(true), controller = coordinator(), a = controller.attach(owned.node); controller.attach(user.node);
    const request = a.request(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    expect(await request).toBe(false); expect(owned.pause).toHaveBeenCalledOnce(); expect(user.pause).not.toHaveBeenCalled(); expect(controller.stats.ownedActive).toBe(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); expect(owned.play).toHaveBeenCalledOnce();
    const next = a.request(); owned.tasks[1].resolve(); expect(await next).toBe(true);
  });
  it('combines explicit and OS reduced-motion/save-data preferences without false overrides', async () => {
    const env = environment(), media = video(), controller = coordinator({ reducedMotion: true }), handle = controller.attach(media.node);
    expect(await handle.request()).toBe(false); controller.update({ reducedMotion: false }); env.reduced(true); expect(await handle.request()).toBe(false);
    env.reduced(false); controller.update({ saveData: true }); expect(await handle.request()).toBe(false); controller.update({ saveData: false }); env.saving(true); expect(await handle.request()).toBe(false);
    expect(media.play).not.toHaveBeenCalled(); expect(controller.stats.saveDataSupported).toBe(true); env.saving(false);
    const request = handle.request(); env.saving(true); expect(await request).toBe(false); expect(media.pause).toHaveBeenCalledOnce();
  });
  it('uses explicit saving preference when the browser exposes no connection API', async () => {
    environment(); vi.stubGlobal('navigator', {}); const media = video(), controller = coordinator({ saveData: true }), handle = controller.attach(media.node);
    expect(controller.stats.saveDataSupported).toBe(false); expect(await handle.request()).toBe(false); expect(media.play).not.toHaveBeenCalled();
  });
  it('handles rejected/synchronous play failures, retains host poster/source and avoids automatic retry loops', async () => {
    const env = environment(), media = video(); media.node.setAttribute('poster', 'host-poster.webp'); media.node.setAttribute('src', 'host-video.mp4'); const callback = vi.fn();
    const controller = coordinator(), handle = controller.attach(media.node, { trigger: 'visible', onState: callback }); env.visible(media.node, true); media.tasks[0].reject(); await settle();
    expect(handle.state).toBe('blocked'); expect(controller.stats.ownedActive).toBe(0); expect(media.node.getAttribute('poster')).toBe('host-poster.webp'); expect(media.node.getAttribute('src')).toBe('host-video.mp4');
    env.visible(media.node, true); expect(media.play).toHaveBeenCalledOnce(); expect(callback.mock.calls.at(-1)?.[1]).toMatchObject({ reason: expect.stringContaining('poster'), error: expect.any(DOMException) });
    media.play.mockImplementationOnce(() => { throw new Error('Denied'); }); expect(await handle.request()).toBe(false); expect(controller.stats.pending).toBe(0);
  });
  it('retries automatic playback only after a new eligibility edge', async () => {
    const env = environment(), media = video(), controller = coordinator(); controller.attach(media.node, { trigger: 'visible' }); env.visible(media.node, true); media.tasks[0].reject(); await settle();
    env.visible(media.node, false); env.visible(media.node, true); expect(media.play).toHaveBeenCalledTimes(2);
  });
  it('guards delayed completion after ineligibility and releases pending callers promptly', async () => {
    const env = environment(), media = video(), controller = coordinator(); const handle = controller.attach(media.node, { trigger: 'hover' });
    media.node.dispatchEvent(new Event('pointerenter')); const request = handle.request(); media.node.dispatchEvent(new Event('pointerleave'));
    handle.pause(); expect(await request).toBe(false); expect(controller.stats.pending).toBe(0);
    media.playing(true); media.tasks[0].resolve(); await settle(); expect(media.node.paused).toBe(true); expect(controller.stats.ownedActive).toBe(0);
    expect(env.mutations[0].disconnect).toHaveBeenCalled();
  });
  it('never pauses newly host-owned full playback after release or destroy resolves an old promise', async () => {
    environment(); const media = video(), controller = coordinator(), handle = controller.attach(media.node); const request = handle.request();
    handle.release(); expect(await request).toBe(false); const pauses = media.pause.mock.calls.length; media.node.controls = true; media.playing(true); handle.destroy(); media.tasks[0].resolve(); await settle();
    expect(media.pause).toHaveBeenCalledTimes(pauses); expect(media.node.paused).toBe(false);
    const next = video(), b = controller.attach(next.node), pending = b.request(); next.node.controls = true; b.destroy(); expect(await pending).toBe(false); next.node.controls = false; next.playing(true); next.tasks[0].resolve(); await settle(); expect(next.pause).not.toHaveBeenCalled();
  });
  it('does not let a destroyed owner pause a newly attached coordinator playback', async () => {
    environment(); const media = video(), first = coordinator(), handle = first.attach(media.node); const previous = handle.request(); handle.destroy(); expect(await previous).toBe(false);
    const second = coordinator(), current = second.attach(media.node), request = current.request(); const pauses = media.pause.mock.calls.length;
    media.tasks[0].resolve(); await settle(); expect(media.pause).toHaveBeenCalledTimes(pauses); media.tasks[1].resolve(); expect(await request).toBe(true);
  });
  it('ignores queued old pause/play events after a new ambient request has begun', async () => {
    environment(); const media = video(), controller = coordinator(), handle = controller.attach(media.node);
    const old = handle.request(); handle.pause(); expect(await old).toBe(false);
    const current = handle.request(); media.node.dispatchEvent(new Event('pause'));
    expect(handle.state).toBe('requesting'); expect(controller.stats.ownedActive).toBe(1);
    media.tasks[1].resolve(); expect(await current).toBe(true);
    handle.pause(); media.node.dispatchEvent(new Event('play')); expect(handle.state).toBe('paused');
  });
  it('restores owned properties/attributes exactly and preserves independent host changes', async () => {
    environment(); const media = video(); media.node.setAttribute('loop', 'loop'); media.node.setAttribute('playsinline', 'yes'); media.node.preload = 'metadata'; media.node.muted = false;
    const before = ['loop', 'playsinline', 'preload', 'muted'].map(key => [key, media.node.getAttribute(key)]); const controller = coordinator(), handle = controller.attach(media.node); const request = handle.request();
    expect(media.node.muted).toBe(true); expect(media.node.preload).toBe('none'); expect(media.node.loop).toBe(true); expect(media.node.playsInline).toBe(true);
    media.tasks[0].resolve(); expect(await request).toBe(true); handle.pause(); expect(media.node.muted).toBe(false); expect(media.node.preload).toBe('metadata');
    for (const [key, value] of before) expect(media.node.getAttribute(key!)).toBe(value);
    const another = handle.request(); media.node.preload = 'auto'; media.node.muted = false; handle.release(); expect(await another).toBe(false); expect(media.node.preload).toBe('auto'); expect(media.node.muted).toBe(false);
  });
  it('preserves absent native attributes on teardown', async () => {
    environment(); const media = video(), handle = coordinator().attach(media.node); const request = handle.request(); handle.destroy(); expect(await request).toBe(false);
    for (const key of ['muted', 'loop', 'playsinline', 'preload', 'controls', 'autoplay']) expect(media.node.hasAttribute(key)).toBe(false);
  });
  it('isolates callback exceptions, handles media errors and cleans listeners idempotently', async () => {
    const env = environment(), media = video(), remove = vi.spyOn(media.node, 'removeEventListener');
    const controller = coordinator(), handle = controller.attach(media.node, { trigger: 'hover', onState() { throw new Error('Host callback failed'); } });
    const request = handle.request(); media.node.dispatchEvent(new Event('error')); expect(await request).toBe(false); expect(controller.stats.ownedActive).toBe(0);
    handle.destroy(); handle.destroy(); handle.pause(); handle.release(); expect(await handle.request()).toBe(false); controller.destroy(); controller.destroy();
    expect(remove.mock.calls.map(([type]) => type)).toEqual(['play', 'pause', 'error', 'pointerenter', 'pointerleave']); expect(env.listeners.size).toBe(0); expect(env.mediaRemove).toHaveBeenCalledOnce();
  });
  it('handles reentrant release during requesting without starting or overriding ownership', async () => {
    environment(); const media = video(), controller = coordinator(); let handle!: ReturnType<typeof controller.attach>;
    handle = controller.attach(media.node, { onState(state) { if (state === 'requesting') handle.release(); } });
    expect(await handle.request()).toBe(false); expect(media.play).not.toHaveBeenCalled(); expect(handle.state).toBe('user-owned'); expect(controller.stats.ownedActive).toBe(0);
  });
  it('pauses disconnected owned previews through the shared active lifecycle observer', async () => {
    const env = environment(), media = video(), controller = coordinator(), handle = controller.attach(media.node); const request = handle.request();
    media.node.remove(); env.mutations[0].callback(); expect(await request).toBe(false); expect(media.pause).toHaveBeenCalledOnce(); expect(controller.stats.ownedActive).toBe(0);
  });
  it('rejects duplicate attachments across coordinators and rejects unsafe/unbounded option shapes', () => {
    environment(); const media = video(), first = coordinator(); first.attach(media.node);
    expect(() => first.attach(media.node)).toThrow(/already/); expect(() => coordinator().attach(media.node)).toThrow(/already/);
    for (const options of [{ maxActive: NaN }, { maxActive: '2' }, { reducedMotion: 0 }, { saveData: 'no' }, { src: 'injected.mp4' }, JSON.parse('{"__proto__":{}}')]) expect(() => coordinator(options as GlassMediaCoordinatorOptions)).toThrow();
    for (const options of [{ trigger: 'autoplay' }, { onState: true }, { poster: 'injected.webp' }]) expect(() => first.attach(video().node, options as GlassAmbientMediaOptions)).toThrow();
    let invoked = false; const config = {}; Object.defineProperty(config, 'maxActive', { get() { invoked = true; return 2; } }); expect(() => coordinator(config)).toThrow(/accessors/); expect(invoked).toBe(false);
  });
  it('creates a no-op idle coordinator during SSR without reading browser globals', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined); vi.stubGlobal('navigator', undefined);
    try { const { createGlassMediaCoordinator: create } = await import('../src/ambient-media.js'); const controller = create(); expect(controller.stats.attached).toBe(0); controller.update({ maxActive: 2 }); controller.destroy(); }
    finally { vi.unstubAllGlobals(); }
  });
});
