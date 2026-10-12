import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassSequence } from '../src/sequence.js';
import type { GlassSequence, GlassSequenceOptions, GlassSequenceTrack } from '../src/sequence.js';

const controllers: GlassSequence[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function media(initial = false) { const query = Object.assign(new EventTarget(), { matches: initial }); vi.stubGlobal('matchMedia', () => query); return query; }
function fixture(options: Partial<GlassSequenceOptions> = {}, setup?: (a: HTMLElement, b: HTMLElement) => void) {
  const root = document.createElement('section'), a = document.createElement('div'), b = document.createElement('div'); a.textContent = 'Material A'; b.textContent = 'Material B'; root.append(a, b); document.body.append(root); setup?.(a, b);
  const timeline = { currentTime: 1000 }; Object.defineProperty(document, 'timeline', { configurable: true, value: timeline });
  const animations: Array<{ animation: Animation; finish(): void; fail(error: unknown): void; frames: Keyframe[]; settings: KeyframeAnimationOptions; pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }> = [];
  const animate = vi.fn((frames: Keyframe[], settings: KeyframeAnimationOptions) => {
    let resolve!: () => void, reject!: (error: unknown) => void;
    const finished = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
    const pause = vi.fn(), play = vi.fn(), cancel = vi.fn(() => reject(new DOMException('Cancelled', 'AbortError')));
    const animation = { finished, ready: Promise.resolve(), currentTime: 0, startTime: null, pause, play, cancel, playState: 'paused' } as unknown as Animation;
    animations.push({ animation, finish: resolve, fail: reject, frames, settings, pause, play, cancel }); return animation;
  });
  Object.assign(a, { animate }); Object.assign(b, { animate });
  const tracks: GlassSequenceTrack[] = [{ element: a, from: { x: -80, scale: 0.8, opacity: 0.2 }, to: { x: 20 }, duration: 200 }, { element: b, from: { y: 40 }, to: { y: -10, opacity: 0.6 }, at: 100, duration: 500 }];
  const controller = attachGlassSequence(root, { tracks, ...options }); controllers.push(controller);
  return { root, a, b, tracks, controller, animations, animate, timeline };
}

describe('finite scoped native visual sequences', () => {
  it('does not autoplay, change the authored tree, or schedule per-frame work on attachment', () => {
    media(); const raf = vi.spyOn(window, 'requestAnimationFrame'), timer = vi.spyOn(window, 'setTimeout'); const f = fixture();
    expect(f.controller.duration).toBe(600); expect(f.controller.state).toEqual({ status: 'idle', time: 0, duration: 600 }); expect(Object.isFrozen(f.controller.state)).toBe(true);
    expect(f.animate).not.toHaveBeenCalled(); expect(raf).not.toHaveBeenCalled(); expect(timer).not.toHaveBeenCalled(); expect(f.root.children.length).toBe(2); expect(f.a.getAttribute('aria-hidden')).toBeNull(); expect(f.a.style.transform).toBe('');
  });
  it('shares one native document start time with bounded absolute delays and finite effects', async () => {
    media(); const f = fixture(); const promise = f.controller.play(); expect(f.controller.play()).toBe(promise);
    expect(f.animations.map(track => track.animation.startTime)).toEqual([1000, 1000]); expect(f.animations.map(track => track.settings)).toEqual([
      { delay: 0, duration: 200, easing: 'ease-out', iterations: 1, fill: 'both' }, { delay: 100, duration: 500, easing: 'ease-out', iterations: 1, fill: 'both' },
    ]);
    f.animations[0].finish(); await tick(); expect(f.controller.state.status).toBe('playing'); f.animations[1].finish(); expect(await promise).toEqual({ completed: true, reason: 'finished' }); expect(f.controller.state.time).toBe(600);
    expect(f.animations[0].cancel).not.toHaveBeenCalled(); expect(f.controller.cancel()).toBe(true); expect(f.animations.every(track => track.cancel.mock.calls.length === 1)).toBe(true);
  });
  it('uses the longest effect clock when shorter tracks already finished, and resumes one paused operation', async () => {
    media(); const f = fixture(); const result = f.controller.play(); f.animations[0].animation.currentTime = 200; f.animations[1].animation.currentTime = 350;
    expect(f.controller.state.time).toBe(350); expect(f.controller.pause()).toBe(true); expect(f.controller.state.status).toBe('paused'); expect(f.animations.map(track => track.animation.currentTime)).toEqual([350, 350]);
    f.timeline.currentTime = 1500; expect(f.controller.play()).toBe(result); expect(f.animations.map(track => track.animation.startTime)).toEqual([1150, 1150]); expect(f.animate).toHaveBeenCalledTimes(2); f.controller.cancel(); expect((await result).reason).toBe('cancelled');
  });
  it('seeks presentation while paused without callbacks, app effects, focus changes, geometry reads or idle RAF', async () => {
    media(); const f = fixture(); const action = document.createElement('button'); action.textContent = 'Host action'; document.body.append(action); action.focus(); const click = vi.fn(); action.addEventListener('click', click);
    const rectA = vi.spyOn(f.a, 'getBoundingClientRect'), rectRoot = vi.spyOn(f.root, 'getBoundingClientRect'), raf = vi.spyOn(window, 'requestAnimationFrame');
    expect(f.controller.seek(275)).toEqual({ status: 'paused', time: 275, duration: 600 }); expect(f.animations.map(track => track.animation.currentTime)).toEqual([275, 275]); expect(f.animations.every(track => track.play.mock.calls.length === 0)).toBe(true);
    expect(f.controller.seek(-40).time).toBe(0); expect(f.controller.seek(9999).time).toBe(600); expect(() => f.controller.seek(NaN)).toThrow('finite'); expect(document.activeElement).toBe(action); expect(click).not.toHaveBeenCalled(); await tick(); expect(rectA).not.toHaveBeenCalled(); expect(rectRoot).not.toHaveBeenCalled(); expect(raf).not.toHaveBeenCalled();
  });
  it('composes the author transform, uses author opacity for omitted components, and preserves priorities on cancel', async () => {
    media(); const f = fixture({}, (a, b) => { a.style.setProperty('transform', 'rotate(7deg)', 'important'); a.style.setProperty('opacity', '0.7', 'important'); b.style.transform = 'skewX(3deg)'; });
    const promise = f.controller.play(); expect(f.animations[0].frames).toEqual([
      { transform: 'translate3d(-80px, 0px, 0) scale(0.8) rotate(7deg)', opacity: '0.2' }, { transform: 'translate3d(20px, 0px, 0) scale(1) rotate(7deg)', opacity: '0.7' },
    ]);
    expect(f.a.style.getPropertyPriority('transform')).toBe(''); f.a.style.color = 'red'; f.controller.cancel(); expect((await promise).completed).toBe(false); expect(f.a.style.transform).toBe('rotate(7deg)'); expect(f.a.style.getPropertyPriority('transform')).toBe('important'); expect(f.a.style.opacity).toBe('0.7'); expect(f.a.style.getPropertyPriority('opacity')).toBe('important'); expect(f.a.style.color).toBe('red');
  });
  it('leaves fields outside a track entirely untouched', async () => {
    media(); const f = fixture({}, (_, b) => { b.style.scale = '0.9'; b.style.translate = '2px'; b.style.filter = 'blur(2px)'; }); const promise = f.controller.play(); f.controller.cancel(); await promise;
    expect(f.b.style.scale).toBe('0.9'); expect(f.b.style.translate).toBe('2px'); expect(f.b.style.filter).toBe('blur(2px)'); expect(f.b.hidden).toBe(false); expect(f.b.hasAttribute('inert')).toBe(false);
  });
  it('uses a stable endpoint without a timer under explicit and authoritative OS motion reduction', async () => {
    const query = media(true); const f = fixture({ reducedMotion: false }); expect(await f.controller.play()).toEqual({ completed: true, reason: 'reduced-motion' }); expect(f.animate).not.toHaveBeenCalled(); expect(f.a.style.transform).toBe('translate3d(20px, 0px, 0) scale(1)'); expect(f.b.style.opacity).toBe('0.6'); expect(f.controller.state.time).toBe(600);
    expect(f.controller.seek(100).time).toBe(600); f.controller.cancel(); expect(f.a.style.transform).toBe(''); query.matches = false; const pending = f.controller.play(); query.matches = true; query.dispatchEvent(new Event('change')); expect(await pending).toEqual({ completed: true, reason: 'reduced-motion' }); expect(f.animations.every(track => track.cancel.mock.calls.length === 1)).toBe(true);
  });
  it('applies only presentation fallback when WAAPI or a shared document timeline is absent', async () => {
    media(); const f = fixture(); Object.assign(f.a, { animate: undefined }); expect(await f.controller.play()).toEqual({ completed: true, reason: 'unsupported' }); expect(f.animate).not.toHaveBeenCalled(); expect(f.b.style.opacity).toBe('0.6'); f.controller.destroy(); expect(f.b.style.opacity).toBe('');
    const other = fixture(); Object.defineProperty(document, 'timeline', { configurable: true, value: { currentTime: null } }); expect((await other.controller.play()).reason).toBe('unsupported'); expect(other.animate).not.toHaveBeenCalled();
  });
  it('preserves a later external property owner and makes this controller inert', async () => {
    media(); const f = fixture({}, a => a.style.setProperty('opacity', '0.8', 'important')); const pending = f.controller.play(); f.a.style.setProperty('transform', 'rotate(18deg)', 'important'); await tick();
    expect(await pending).toEqual({ completed: false, reason: 'external-owner' }); expect(f.a.style.transform).toBe('rotate(18deg)'); expect(f.a.style.getPropertyPriority('transform')).toBe('important'); expect(f.a.style.opacity).toBe('0.8'); expect(f.a.style.getPropertyPriority('opacity')).toBe('important'); expect((await f.controller.play()).reason).toBe('external-owner'); expect(f.controller.seek(150).status).toBe('cancelled'); f.controller.destroy(); expect(f.a.style.transform).toBe('rotate(18deg)');
  });
  it('does not take ownership of a host property edited before first play', async () => {
    media(); const f = fixture(); f.a.style.opacity = '0.4'; expect((await f.controller.play()).reason).toBe('external-owner'); expect(f.animate).not.toHaveBeenCalled(); f.controller.destroy(); expect(f.a.style.opacity).toBe('0.4');
  });
  it('cancels hidden documents without autoplaying when the document becomes visible again', async () => {
    media(); const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); const f = fixture(); const pending = f.controller.play(); hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); expect((await pending).reason).toBe('hidden'); expect(f.controller.state.status).toBe('cancelled'); expect(f.a.style.transform).toBe(''); hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); expect(f.animate).toHaveBeenCalledTimes(2);
    const next = f.controller.play(); expect(f.animate).toHaveBeenCalledTimes(4); f.controller.cancel(); await next;
  });
  it('cancels hidden ancestors and detached or adopted targets with no geometry polling', async () => {
    media(); const f = fixture(); const pending = f.controller.play(); f.root.hidden = true; await tick(); expect((await pending).reason).toBe('hidden'); f.root.hidden = false; const next = f.controller.play(); f.b.remove(); await tick(); expect((await next).reason).toBe('detached'); expect(f.a.style.transform).toBe(''); expect((await f.controller.play()).reason).toBe('detached');
  });
  it('cancels a CSS-hidden ancestor while preserving host disclosure attributes', async () => {
    media(); const f = fixture(); const pending = f.controller.play(); f.root.style.display = 'none'; f.root.setAttribute('aria-expanded', 'false'); await tick(); expect((await pending).reason).toBe('hidden'); expect(f.root.style.display).toBe('none'); expect(f.root.getAttribute('aria-expanded')).toBe('false'); expect(f.a.style.transform).toBe('');
  });
  it('keeps controls separate and stops if host later adds an essential control to the visual plane', async () => {
    media(); const f = fixture(); const pending = f.controller.play(); const input = document.createElement('input'); input.value = 'Owned draft'; f.a.append(input); await tick(); expect((await pending).reason).toBe('invalid-visual'); expect(input.value).toBe('Owned draft'); expect(input.isConnected).toBe(true); expect(f.a.style.transform).toBe('');
  });
  it('restores only its own animations and ignores obsolete native completion after a new play', async () => {
    media(); const f = fixture(); const first = f.controller.play(); f.controller.cancel(); expect((await first).reason).toBe('cancelled'); const second = f.controller.play(); f.animations[0].finish(); f.animations[1].finish(); await tick(); expect(f.controller.state.status).toBe('playing'); f.animations[2].finish(); f.animations[3].finish(); expect((await second).reason).toBe('finished');
  });
  it('reports partial native creation failures and safely releases already-created effects', async () => {
    media(); const f = fixture(); const error = new Error('Creation failed'); f.animate.mockImplementationOnce((frames, settings) => { const animation = { ready: Promise.resolve(), finished: new Promise(() => {}), pause: vi.fn(), cancel: vi.fn(), currentTime: 0 }; f.animations.push({ animation: animation as unknown as Animation, finish: vi.fn(), fail: vi.fn(), frames, settings, pause: animation.pause, play: vi.fn(), cancel: animation.cancel }); return animation as unknown as Animation; }); f.animate.mockImplementationOnce(() => { throw error; });
    expect(await f.controller.play()).toEqual({ completed: false, reason: 'native-failed', error }); expect(f.animations[0].cancel).toHaveBeenCalledOnce(); expect(f.a.style.transform).toBe(''); expect(f.b.style.opacity).toBe('');
  });
  it('reports native completion rejection without an unhandled canceled sibling promise', async () => {
    media(); const f = fixture(); const error = new Error('Native playback failed'); const pending = f.controller.play(); f.animations[1].fail(error); expect(await pending).toEqual({ completed: false, reason: 'native-failed', error }); await tick(); expect(f.animations[0].cancel).toHaveBeenCalledOnce(); expect(f.a.style.transform).toBe('');
  });
  it('tears down idempotently, resolves active work and permits a fresh controller after destroy', async () => {
    const query = media(); const remove = vi.spyOn(query, 'removeEventListener'); const f = fixture(); const nodes = [...f.root.childNodes]; const pending = f.controller.play(); f.controller.destroy(); f.controller.destroy(); expect((await pending).reason).toBe('destroyed'); expect(f.controller.state.status).toBe('destroyed'); expect((await f.controller.play()).reason).toBe('destroyed'); expect(f.controller.cancel()).toBe(false); expect(f.controller.pause()).toBe(false); expect([...f.root.childNodes]).toEqual(nodes); expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
    const next = attachGlassSequence(f.root, { tracks: f.tracks }); controllers.push(next); expect(next.state.status).toBe('idle');
  });
  it('rejects malformed scopes, duplicate ownership and interactive targets before installing work', () => {
    media(); const f = fixture(); expect(() => attachGlassSequence(f.root, { tracks: f.tracks })).toThrow('unowned'); f.controller.destroy(); expect(() => attachGlassSequence(f.root, { tracks: [f.tracks[0], f.tracks[0]] })).toThrow('unique'); expect(() => attachGlassSequence(f.root, { tracks: [{ element: f.root, to: { x: 0 } }] })).toThrow('noninteractive');
    const button = document.createElement('button'); f.root.append(button); expect(() => attachGlassSequence(f.root, { tracks: [{ element: button, to: { opacity: 0 } }] })).toThrow('noninteractive'); const foreign = document.implementation.createHTMLDocument().createElement('div'); expect(() => attachGlassSequence(f.root, { tracks: [{ element: foreign, to: { x: 0 } }] })).toThrow('one document');
  });
  it('bounds tracks, frame values, duration, offsets, easing and rejects frame accessors', () => {
    media(); const f = fixture(); f.controller.destroy(); const make = (overrides: object) => attachGlassSequence(f.root, { tracks: [{ ...f.tracks[0], ...overrides }] });
    expect(() => attachGlassSequence(f.root, { tracks: [] })).toThrow('1 to 32'); expect(() => attachGlassSequence(f.root, { tracks: Array(33).fill(f.tracks[0]) })).toThrow('1 to 32');
    for (const overrides of [{ duration: 6001 }, { at: -1 }, { duration: 6000, at: 5000 }, { to: { x: 1001 } }, { from: { opacity: -0.1 } }, { to: { scale: 0 } }, { to: {} }, { to: { filter: 'blur(2px)' } }, { easing: 'bounce' }]) expect(() => make(overrides)).toThrow();
    const read = vi.fn(() => 0); expect(() => make({ to: Object.defineProperty({}, 'x', { get: read, enumerable: true }) })).toThrow('data properties'); expect(read).not.toHaveBeenCalled();
    const valid = make({ duration: 0, to: { x: 0 } }); controllers.push(valid); expect(valid.duration).toBe(0);
  });
  it('copies caller tracks and frame values rather than changing the sequence after attachment', async () => {
    media(); const f = fixture(); f.tracks[0].to.x = 999; f.tracks[0].duration = 4000; f.tracks[1].at = 5000; const pending = f.controller.play(); expect(f.controller.duration).toBe(600); expect(f.animations[0].frames[1].transform).toContain('20px'); expect(f.animations[0].settings.duration).toBe(200); f.controller.cancel(); await pending;
  });
  it('rejects detectable competing property effects but never cancels unrelated animations', async () => {
    media(); const f = fixture(); const unrelatedCancel = vi.fn(), effect = { getKeyframes: () => [{ color: 'red' }, { color: 'blue' }] }; const unrelated = { playState: 'running', effect, cancel: unrelatedCancel }; Object.assign(f.a, { getAnimations: () => [unrelated] }); const pending = f.controller.play(); f.controller.cancel(); await pending; expect(unrelatedCancel).not.toHaveBeenCalled(); f.controller.destroy();
    Object.assign(f.a, { getAnimations: () => [{ playState: 'running', effect: { getKeyframes: () => [{ transform: 'none' }] } }] }); expect(() => attachGlassSequence(f.root, { tracks: f.tracks })).toThrow('competing');
  });
});
