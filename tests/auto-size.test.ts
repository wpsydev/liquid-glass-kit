import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassAutoSize } from '../src/auto-size.js';
import type { GlassAutoSize, GlassAutoSizeOptions } from '../src/auto-size.js';

const controllers: GlassAutoSize[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
function media() { const reduced = Object.assign(new EventTarget(), { matches: false }); vi.stubGlobal('matchMedia', () => reduced); return reduced; }
function sizes() {
  let notify: ResizeObserverCallback | undefined;
  const observe = vi.fn(), disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { notify = callback; } observe = observe; disconnect = disconnect; });
  return { observe, disconnect, send(target: HTMLElement, width: number, height: number) { notify?.([{ target, borderBoxSize: [{ inlineSize: width, blockSize: height }], contentRect: { width, height } } as unknown as ResizeObserverEntry], {} as ResizeObserver); } };
}
function fixture(options: GlassAutoSizeOptions = {}, setup?: (frame: HTMLDivElement, content: HTMLDivElement) => void) {
  const frame = document.createElement('div'), content = document.createElement('div'); frame.style.display = content.style.display = 'flow-root';
  const input = document.createElement('input'); input.value = 'Real draft'; input.setAttribute('aria-label', 'Real draft'); const button = document.createElement('button'); button.textContent = 'Real action'; content.append(input, button); frame.append(content); setup?.(frame, content); document.body.append(frame);
  let border = 120, width = 300, innerHeight = 120, presentation: number | undefined;
  const edges = () => frame.style.boxSizing === 'border-box' ? 0 : [frame.style.paddingTop, frame.style.paddingBottom, frame.style.borderTopWidth, frame.style.borderBottomWidth].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  const frameRect = vi.spyOn(frame, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: border, width, height: frame.style.height && frame.style.height !== 'auto' ? presentation ?? parseFloat(frame.style.height) + edges() : border } as DOMRect));
  const contentRect = vi.spyOn(content, 'getBoundingClientRect').mockImplementation(() => ({ width, height: innerHeight } as DOMRect));
  const animations: { finish(): void; fail(error: unknown): void; cancel: ReturnType<typeof vi.fn>; frames: Keyframe[]; settings: KeyframeAnimationOptions }[] = [];
  const animate = vi.fn((frames: Keyframe[], settings: KeyframeAnimationOptions) => {
    let done!: () => void, reject!: (error: unknown) => void; const finished = new Promise<void>((resolve, fail) => { done = resolve; reject = fail; });
    const cancel = vi.fn(() => { presentation = undefined; reject(new DOMException('Cancelled', 'AbortError')); });
    const animation = { finished, cancel }; animations.push({ finish: done, fail: reject, cancel, frames, settings }); return animation as unknown as Animation;
  });
  Object.assign(frame, { animate }); const controller = attachGlassAutoSize(frame, content, options); controllers.push(controller);
  return { frame, content, input, button, controller, frameRect, contentRect, animate, animations, setSize(next: number, nextWidth = width, nextInner = next) { border = next; width = nextWidth; innerHeight = nextInner; }, present(value: number) { presentation = value; } };
}

describe('natural-content block-size transitions', () => {
  it('animates one actual tree finitely and returns to natural auto sizing without replacing controls', async () => {
    media(); const raf = vi.spyOn(window, 'requestAnimationFrame'); const f = fixture(); const nodes = [...f.content.childNodes]; f.setSize(240); const pending = f.controller.refresh();
    expect(f.animations[0].frames).toEqual([{ height: '120px' }, { height: '240px' }]); expect(f.animations[0].settings.duration).toBe(220); expect(f.frame.dataset.lgAutoSizeActive).toBe('true'); expect(f.frame.style.height).toBe('120px');
    const reads = f.frameRect.mock.calls.length; await tick(); expect(f.frameRect).toHaveBeenCalledTimes(reads); expect(raf).not.toHaveBeenCalled(); f.animations[0].finish(); expect(await pending).toEqual({ completed: true, reason: 'finished' });
    expect(f.frame.style.height).toBe(''); expect(f.frame.style.blockSize).toBe(''); expect(f.frame.hasAttribute('data-lg-auto-size-active')).toBe(false); expect([...f.content.childNodes]).toEqual(nodes); expect(f.input.value).toBe('Real draft'); expect(f.input.getAttribute('aria-label')).toBe('Real draft');
  });
  it('skips identical sizes without scheduling animation or changing native semantics', async () => {
    media(); const f = fixture(); expect(await f.controller.refresh()).toEqual({ completed: true, reason: 'unchanged' }); expect(f.animate).not.toHaveBeenCalled(); expect(f.frame.getAttribute('role')).toBeNull(); expect(f.frame.hasAttribute('aria-expanded')).toBe(false); expect(f.controller.finish()).toBe(false); expect(f.controller.cancel()).toBe(false);
  });
  it('samples active presentation once and retargets rather than queuing old content states', async () => {
    media(); const f = fixture(); f.setSize(240); const first = f.controller.refresh(); f.present(170); f.setSize(320); const next = f.controller.refresh();
    expect(await first).toEqual({ completed: false, reason: 'retargeted' }); expect(f.animations[0].cancel).toHaveBeenCalledOnce(); expect(f.animations[1].frames).toEqual([{ height: '170px' }, { height: '320px' }]); f.animations[1].finish(); expect((await next).completed).toBe(true); expect(f.frame.style.height).toBe('');
  });
  it('does not restart an active transition to the same endpoint, avoiding shell feedback', async () => {
    media(); const f = fixture(); f.setSize(240); const pending = f.controller.refresh(); f.present(160); expect(await f.controller.refresh()).toEqual({ completed: true, reason: 'unchanged' }); expect((await pending).reason).toBe('retargeted'); expect(f.animate).toHaveBeenCalledOnce(); expect(f.frame.style.height).toBe('');
  });
  it('converts border-box measurements correctly for authored content-box padding and borders', async () => {
    media(); const f = fixture({}, frame => { frame.style.padding = '10px'; frame.style.border = '2px solid'; frame.style.minHeight = '60px'; frame.style.maxHeight = '600px'; }); f.setSize(264, 300, 240); const pending = f.controller.refresh(); expect(f.animations[0].frames).toEqual([{ height: '96px' }, { height: '240px' }]); f.animations[0].finish(); await pending;
    expect(f.frame.style.padding).toBe('10px'); expect(f.frame.style.borderTopWidth).toBe('2px'); expect(f.frame.style.minHeight).toBe('60px'); expect(f.frame.style.maxHeight).toBe('600px'); expect(f.frame.style.overflow).toBe('');
  });
  it('retains border-box sizing and adjusts a cached start for new authored edge sizes', async () => {
    media(); const a = fixture({}, frame => { frame.style.boxSizing = 'border-box'; frame.style.padding = '10px'; frame.style.border = '2px solid'; }); a.setSize(264); const pending = a.controller.refresh(); expect(a.animations[0].frames).toEqual([{ height: '120px' }, { height: '264px' }]); a.animations[0].finish(); await pending;
    const b = fixture(); b.frame.style.padding = '10px'; b.setSize(240); const second = b.controller.refresh(); expect(b.animations[0].frames).toEqual([{ height: '100px' }, { height: '220px' }]); b.animations[0].finish(); await second;
  });
  it('restores authored auto sizes and priorities while preserving later unrelated host edits', async () => {
    media(); const f = fixture({}, frame => { frame.style.setProperty('height', 'auto', 'important'); frame.style.setProperty('block-size', 'auto', 'important'); frame.setAttribute('data-lg-auto-size-active', 'authored'); }); f.setSize(240); const pending = f.controller.refresh(); f.frame.style.color = 'red'; f.animations[0].finish(); await pending;
    expect(f.frame.style.height).toBe('auto'); expect(f.frame.style.getPropertyPriority('height')).toBe('important'); expect(f.frame.style.blockSize).toBe('auto'); expect(f.frame.style.getPropertyPriority('block-size')).toBe('important'); expect(f.frame.dataset.lgAutoSizeActive).toBe('authored'); f.controller.destroy(); expect(f.frame.style.color).toBe('red');
  });
  it('retains ownership after native CSSOM pixel normalization, retargets and restores original priorities', async () => {
    media(); const f = fixture({}, frame => { frame.style.padding = '7.123456px'; frame.style.border = '1.333333px solid'; frame.style.setProperty('height', 'auto', 'important'); frame.style.setProperty('block-size', 'auto', 'important'); });
    const nativeWrite = f.frame.style.setProperty.bind(f.frame.style);
    vi.spyOn(f.frame.style, 'setProperty').mockImplementation((key, value, priority) => {
      // Chrome serializes finite px values with fewer significant digits than the
      // measured/arithmetically computed string. Model that native round-trip.
      const normalized = key === 'height' && typeof value === 'string' && value.endsWith('px') ? `${Number(Number.parseFloat(value).toPrecision(6))}px` : value;
      nativeWrite(key, normalized, priority);
    });
    f.setSize(263.1354321); const first = f.controller.refresh();
    expect(f.frame.style.height).not.toBe(f.animations[0].frames[0].height);
    f.present(170.3456789); f.setSize(320.1234567); const next = f.controller.refresh();
    expect((await first).reason).toBe('retargeted'); expect(f.animate).toHaveBeenCalledTimes(2);
    f.frame.style.color = 'red'; f.animations[1].finish(); expect(await next).toEqual({ completed: true, reason: 'finished' });
    expect(f.frame.style.height).toBe('auto'); expect(f.frame.style.getPropertyPriority('height')).toBe('important');
    expect(f.frame.style.blockSize).toBe('auto'); expect(f.frame.style.getPropertyPriority('block-size')).toBe('important');
    f.setSize(380.9876543); const third = f.controller.refresh(); f.controller.destroy();
    expect((await third).reason).toBe('destroyed'); expect(f.frame.style.height).toBe('auto'); expect(f.frame.style.getPropertyPriority('height')).toBe('important'); expect(f.frame.style.color).toBe('red');
  });

  it('stops for a later numeric size owner and leaves subsequent refresh/update inert', async () => {
    media(); const f = fixture(); f.setSize(240); const pending = f.controller.refresh(); f.frame.style.setProperty('height', '333px', 'important'); await tick(); expect((await pending).reason).toBe('external-owner'); expect(f.frame.style.height).toBe('333px'); expect(f.frame.style.getPropertyPriority('height')).toBe('important'); expect(f.frame.style.blockSize).toBe('');
    expect((await f.controller.refresh()).reason).toBe('external-owner'); f.controller.update({ duration: 500 }); f.controller.destroy(); expect(f.frame.style.height).toBe('333px'); expect(f.animate).toHaveBeenCalledOnce();
  });
  it('respects a host marker edit without overwriting it during finish or teardown', async () => {
    media(); const f = fixture(); f.setSize(240); const pending = f.controller.refresh(); f.frame.dataset.lgAutoSizeActive = 'host-later'; f.animations[0].finish(); await pending; f.controller.destroy(); expect(f.frame.dataset.lgAutoSizeActive).toBe('host-later');
  });
  it('observes only intrinsic content, coalesces notifications and does no idle geometry polling', async () => {
    media(); const resize = sizes(); const f = fixture(); expect(resize.observe).toHaveBeenCalledWith(f.content, { box: 'border-box' }); expect(resize.observe).toHaveBeenCalledOnce(); const reads = f.frameRect.mock.calls.length;
    resize.send(f.content, 300, 120); await tick(); expect(f.frameRect).toHaveBeenCalledTimes(reads); f.setSize(240); resize.send(f.content, 300, 200); resize.send(f.content, 300, 240); await tick(); expect(f.animate).toHaveBeenCalledOnce(); f.animations[0].finish(); await tick(); const settled = f.frameRect.mock.calls.length; await tick(); expect(f.frameRect).toHaveBeenCalledTimes(settled);
    f.controller.destroy(); expect(resize.disconnect).toHaveBeenCalledOnce(); resize.send(f.content, 300, 400); await tick(); expect(f.frameRect).toHaveBeenCalledTimes(settled);
  });
  it('snaps intrinsic width and viewport changes instead of animating responsive reflow', async () => {
    media(); const resize = sizes(); const f = fixture(); f.setSize(240, 200); resize.send(f.content, 200, 240); await tick(); expect(f.animate).not.toHaveBeenCalled(); f.setSize(300); const pending = f.controller.refresh(); expect(f.animate).toHaveBeenCalledOnce(); f.setSize(160, 180); window.dispatchEvent(new Event('resize')); expect((await pending).reason).toBe('retargeted'); expect(f.animate).toHaveBeenCalledOnce(); expect(f.frame.style.height).toBe('');
  });
  it('treats explicit and OS reduced motion as authoritative before and during native motion', async () => {
    const system = media(); const f = fixture({ reducedMotion: false }); system.matches = true; f.setSize(240); expect((await f.controller.refresh()).reason).toBe('reduced-motion'); expect(f.animate).not.toHaveBeenCalled(); system.matches = false; f.setSize(320); const pending = f.controller.refresh(); system.matches = true; system.dispatchEvent(new Event('change')); expect(await pending).toEqual({ completed: true, reason: 'reduced-motion' });
    f.controller.update({ reducedMotion: false }); f.setSize(400); expect((await f.controller.refresh()).reason).toBe('reduced-motion'); expect(f.animate).toHaveBeenCalledOnce(); system.matches = false; f.controller.update({ reducedMotion: true }); f.setSize(450); expect((await f.controller.refresh()).reason).toBe('reduced-motion');
  });
  it('snaps when essential real controls already have focus or receive it during growth', async () => {
    media(); const f = fixture(); f.input.focus(); f.setSize(240); expect((await f.controller.refresh()).reason).toBe('focus'); expect(document.activeElement).toBe(f.input); expect(f.animate).not.toHaveBeenCalled(); f.input.blur(); f.setSize(320); const pending = f.controller.refresh(); f.button.focus(); expect(await pending).toEqual({ completed: true, reason: 'focus' }); expect(document.activeElement).toBe(f.button); expect(f.frame.style.height).toBe(''); expect(f.input.value).toBe('Real draft');
  });
  it('uses normal natural layout when native element animation is unavailable', async () => {
    media(); const f = fixture(); Object.assign(f.frame, { animate: undefined }); f.setSize(240); expect(await f.controller.refresh()).toEqual({ completed: true, reason: 'unsupported' }); expect(f.frame.style.height).toBe('');
  });
  it('reports native creation and finish failures while consuming native rejections', async () => {
    media(); const f = fixture(); const error = new Error('Native snapshot failed'); f.animate.mockImplementationOnce(() => { throw error; }); f.setSize(240); expect(await f.controller.refresh()).toEqual({ completed: false, reason: 'native-failed', error }); expect(f.frame.style.height).toBe('');
    await f.controller.refresh(); f.setSize(320); const pending = f.controller.refresh(); f.animations[0].fail(error); expect(await pending).toEqual({ completed: false, reason: 'native-failed', error }); await tick(); expect(f.frame.style.height).toBe('');
  });
  it('settles explicit finish/cancel once and ignores late native completion', async () => {
    media(); const f = fixture(); f.setSize(240); const first = f.controller.refresh(); expect(f.controller.finish()).toBe(true); expect(await first).toEqual({ completed: true, reason: 'finished' }); expect(f.controller.finish()).toBe(false); f.animations[0].finish(); f.setSize(320); const next = f.controller.refresh(); expect(f.controller.cancel()).toBe(true); expect(await next).toEqual({ completed: false, reason: 'cancelled' }); expect(f.controller.cancel()).toBe(false); expect(f.frame.style.height).toBe(''); await tick();
  });
  it('cancels immediately for hidden documents and disconnected content without retaining fixed height', async () => {
    media(); const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); const f = fixture(); f.setSize(240); const first = f.controller.refresh(); hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); expect((await first).reason).toBe('hidden'); expect(f.frame.style.height).toBe(''); expect((await f.controller.refresh()).reason).toBe('hidden');
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); f.setSize(320); const pending = f.controller.refresh(); f.content.remove(); await tick(); expect((await pending).reason).toBe('detached'); expect(f.frame.style.height).toBe('');
  });
  it('does not animate hidden/inert authored disclosures and leaves visibility/ARIA under host control', async () => {
    media(); const f = fixture(); f.frame.hidden = true; f.frame.setAttribute('aria-expanded', 'false'); f.setSize(240); expect((await f.controller.refresh()).reason).toBe('hidden'); expect(f.frame.hidden).toBe(true); f.frame.hidden = false; f.frame.setAttribute('inert', ''); expect((await f.controller.refresh()).reason).toBe('hidden'); expect(f.frame.getAttribute('aria-expanded')).toBe('false');
  });
  it('cancels an active transition when the host hides an ancestor without polling', async () => {
    media(); const f = fixture(); f.setSize(240); const pending = f.controller.refresh(); const reads = f.frameRect.mock.calls.length; document.body.setAttribute('inert', ''); await tick(); expect((await pending).reason).toBe('hidden'); expect(f.frameRect).toHaveBeenCalledTimes(reads); expect(f.frame.style.height).toBe(''); document.body.removeAttribute('inert');
  });
  it('snaps active motion when updated to zero duration and retains a valid natural baseline', async () => {
    media(); const f = fixture(); f.setSize(240); const pending = f.controller.refresh(); f.controller.update({ duration: 0 }); expect(await pending).toEqual({ completed: true, reason: 'reduced-motion' }); expect(f.frame.style.height).toBe(''); f.controller.update({ duration: 100 }); f.setSize(320); const next = f.controller.refresh(); expect(f.animations[1].frames).toEqual([{ height: '240px' }, { height: '320px' }]); expect(f.animations[1].settings.duration).toBe(100); f.animations[1].finish(); await next;
  });
  it('tears down listeners, observers and active native work without removing authored content', async () => {
    const system = media(), resize = sizes(), remove = vi.spyOn(system, 'removeEventListener'); const f = fixture(); const nodes = [...f.content.childNodes]; f.setSize(240); const pending = f.controller.refresh(); f.controller.destroy(); f.controller.destroy(); expect((await pending).reason).toBe('destroyed'); expect(resize.disconnect).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledWith('change', expect.any(Function)); expect([...f.content.childNodes]).toEqual(nodes); expect(f.frame.style.display).toBe('flow-root'); expect(f.frame.style.height).toBe('');
    window.dispatchEvent(new Event('resize')); f.input.focus(); system.dispatchEvent(new Event('change')); expect(f.animate).toHaveBeenCalledOnce(); expect((await f.controller.refresh()).reason).toBe('destroyed'); const replacement = attachGlassAutoSize(f.frame, f.content); controllers.push(replacement);
  });
  it('bounds durations and copies options rather than following caller mutations', async () => {
    media(); const options = { duration: 999 }; const f = fixture(options); options.duration = 1; f.setSize(240); const pending = f.controller.refresh(); expect(f.animations[0].settings.duration).toBe(600); f.animations[0].finish(); await pending; f.controller.update({ duration: NaN }); f.setSize(320); const next = f.controller.refresh(); expect(f.animations[1].settings.duration).toBe(220); f.animations[1].finish(); await next; f.controller.update({ duration: -4 }); f.setSize(400); expect((await f.controller.refresh()).reason).toBe('reduced-motion'); expect(f.animate).toHaveBeenCalledTimes(2);
  });
  it('validates a dedicated natural horizontal flow tree and detects later malformed layout', async () => {
    media(); const f = fixture(); expect(() => attachGlassAutoSize(f.frame, f.content)).toThrow('sole direct'); f.controller.destroy(); f.frame.style.display = 'block'; expect(() => attachGlassAutoSize(f.frame, f.content)).toThrow('horizontal flow-root'); f.frame.style.display = 'flow-root'; f.content.style.height = '100%'; expect(() => attachGlassAutoSize(f.frame, f.content)).toThrow('natural auto'); f.content.style.height = ''; f.frame.style.transform = 'scale(2)'; expect(() => attachGlassAutoSize(f.frame, f.content)).toThrow('untransformed'); f.frame.style.transform = ''; f.content.style.writingMode = 'vertical-rl'; expect(() => attachGlassAutoSize(f.frame, f.content)).toThrow('horizontal'); f.content.style.writingMode = '';
    const controller = attachGlassAutoSize(f.frame, f.content); controllers.push(controller); f.setSize(240); const pending = controller.refresh(); f.frame.append(document.createElement('div')); await tick(); expect((await pending).reason).toBe('invalid-layout'); expect((await controller.refresh()).reason).toBe('invalid-layout'); expect(f.frame.style.height).toBe('');
  });
});
