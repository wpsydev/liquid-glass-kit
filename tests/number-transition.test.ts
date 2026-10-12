// @vitest-environment node
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassNumber, formatGlassNumber } from '../src/number-transition.js';
import type { GlassNumberController, GlassNumberFormatOptions, GlassNumberOptions } from '../src/number-transition.js';

const fixtures: { controller?: GlassNumberController; dom: JSDOM }[] = [];
afterEach(() => { for (const fixture of fixtures) { fixture.controller?.destroy(); fixture.dom.window.close(); } fixtures.length = 0; vi.restoreAllMocks(); });
function fixture(options: Partial<GlassNumberOptions> = {}) {
  const dom = new JSDOM('<span id="visual"><em>author visual</em></span><span id="semantic"><strong>author semantic</strong></span><p id="status" role="status">author status</p>', { pretendToBeVisual: true });
  const view = dom.window, doc = view.document;
  const visual = doc.getElementById('visual')!, semantic = doc.getElementById('semantic')!, status = doc.getElementById('status')!;
  const originalVisual = visual.firstChild!, originalSemantic = semantic.firstChild!, originalStatus = status.firstChild!;
  let now = 0, nextFrame = 0, reduced = false;
  const callbacks = new Map<number, FrameRequestCallback>(), listeners = new Set<() => void>();
  vi.spyOn(view.performance, 'now').mockImplementation(() => now);
  const request = vi.spyOn(view, 'requestAnimationFrame').mockImplementation(callback => { const id = ++nextFrame; callbacks.set(id, callback); return id; });
  const cancel = vi.spyOn(view, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
  Object.defineProperty(view, 'matchMedia', { configurable: true, value: () => ({ get matches() { return reduced; },
    addEventListener: (_type: string, callback: () => void) => listeners.add(callback), removeEventListener: (_type: string, callback: () => void) => listeners.delete(callback) }) });
  const config = { value: 10, locale: 'en-US', semantic, status, duration: 200, ...options };
  const controller = attachGlassNumber(visual, config);
  fixtures.push({ controller, dom });
  return { dom, view, doc, visual, semantic, status, originalVisual, originalSemantic, originalStatus, controller, callbacks, request, cancel, listeners,
    flush(time: number) { now = time; const pending = [...callbacks.values()]; callbacks.clear(); for (const callback of pending) callback(time); },
    reduce(value: boolean) { reduced = value; for (const listener of listeners) listener(); },
    hidden(value: boolean) { Object.defineProperty(doc, 'hidden', { configurable: true, value }); doc.dispatchEvent(new view.Event('visibilitychange')); },
  };
}
const unsafeFormat = (value: unknown, config: unknown) => formatGlassNumber(value as number, config as GlassNumberFormatOptions);

describe('bounded SSR decimal presentation', () => {
  it('imports and formats without browser globals, including localized negative decimal values', () => {
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
    expect(formatGlassNumber(-1234.125, { locale: 'en-US', precision: 2 })).toBe('-1,234.13');
    expect(formatGlassNumber(1234.5, { locale: 'de-DE', precision: 2 })).toBe('1.234,50');
    expect(formatGlassNumber(1234.5, { locale: 'en-US', precision: 2, useGrouping: false })).toBe('1234.50');
    expect(formatGlassNumber(0.001, { locale: 'ar-EG', precision: 3 })).toBe('٠٫٠٠١');
    expect(formatGlassNumber(-0, { locale: 'en-US' })).toBe('0');
    expect(formatGlassNumber(1e9, { locale: 'en-US', precision: 6 })).toBe('1,000,000,000.000000');
  });

  it.each([NaN, Infinity, -Infinity, 1e9 + 1, -1e9 - 1, '42', null])('rejects nonfinite or unsupported numeric input %s', value => {
    expect(() => unsafeFormat(value, { locale: 'en-US' })).toThrow(/finite/);
  });

  it('bounds locale, precision and grouping without accepting money or unknown formatting options', () => {
    for (const locale of ['', 'zz-ZZ', 'not_a_locale', 'x'.repeat(129), undefined]) expect(() => unsafeFormat(1, { locale })).toThrow(/locale/);
    for (const precision of [-1, 0.5, 7, NaN, '2', null]) expect(() => unsafeFormat(1, { locale: 'en-US', precision })).toThrow(/precision/);
    expect(() => unsafeFormat(1, { locale: 'en-US', useGrouping: 'true' })).toThrow(/boolean/);
    expect(() => unsafeFormat(1, { locale: 'en-US', currency: 'USD' })).toThrow(/unknown/);
    let reads = 0;
    expect(() => unsafeFormat(1, { get locale() { reads++; return 'en-US'; } })).toThrow(/accessors/);
    expect(reads).toBe(0);
    expect(() => unsafeFormat(1, Object.create({ locale: 'en-US' }))).toThrow(/plain/);
  });
});

describe('finite actual-value replacement', () => {
  it('starts idle, preserves focus and immediately exposes the actual value separately', async () => {
    const f = fixture({ announce: true, announcementPrefix: 'Queue updated: ' });
    expect(f.request).not.toHaveBeenCalled(); expect(f.callbacks.size).toBe(0);
    expect(f.visual.getAttribute('aria-hidden')).toBe('true'); expect(f.semantic.textContent).toBe('10'); expect(f.status.textContent).toBe('author status');
    const button = f.doc.createElement('button'); f.doc.body.append(button); button.focus();
    const changed = f.controller.set(20);
    expect(f.semantic.textContent).toBe('20'); expect(f.status.textContent).toBe('author status'); expect(f.doc.activeElement).toBe(button);
    expect(f.visual.textContent).toBe('1020'); expect(f.callbacks.size).toBe(1);
    f.flush(100); expect(f.status.textContent).toBe('author status'); expect(f.callbacks.size).toBe(1);
    f.flush(200); expect(await changed).toBe(true);
    expect(f.visual.textContent).toBe('20'); expect(f.status.textContent).toBe('Queue updated: 20'); expect(f.callbacks.size).toBe(0);
    expect(f.controller.snapshot()).toEqual({ value: 20, displayValue: 20, active: false, destroyed: false });
    const calls = f.request.mock.calls.length; f.flush(10000); expect(f.request.mock.calls.length).toBe(calls);
    expect(f.status.getAttribute('role')).toBe('status'); expect(f.semantic.hasAttribute('aria-live')).toBe(false);
  });

  it('does not animate or announce unchanged values and shares an active unchanged promise', async () => {
    const f = fixture({ announce: true });
    expect(await f.controller.set(10)).toBe(true); expect(f.request).not.toHaveBeenCalled();
    const first = f.controller.set(30); expect(f.controller.set(30)).toBe(first);
    f.flush(200); expect(await first).toBe(true); expect(f.status.textContent).toBe('30');
    const statusNode = f.status.firstChild; expect(await f.controller.set(30)).toBe(true);
    expect(f.status.firstChild).toBe(statusNode); expect(f.callbacks.size).toBe(0);
    const quiet = fixture({ value: 0.1, precision: 0, announce: true });
    expect(await quiet.controller.set(0.2)).toBe(true); expect(quiet.callbacks.size).toBe(0); expect(quiet.status.textContent).toBe('author status');
    expect(quiet.controller.snapshot().value).toBe(0.2);
  });

  it('retargets one bounded pair, resolves superseded callers false and only announces the latest', async () => {
    const f = fixture({ announce: true }); const first = f.controller.set(50); f.flush(40);
    const second = f.controller.set(-12);
    expect(await first).toBe(false); expect(f.callbacks.size).toBe(1);
    expect(f.visual.firstElementChild?.childNodes).toHaveLength(2); expect(f.semantic.textContent).toBe('-12');
    expect(f.status.textContent).toBe('author status'); f.flush(240);
    expect(await second).toBe(true); expect(f.visual.textContent).toBe('-12'); expect(f.status.textContent).toBe('-12'); expect(f.callbacks.size).toBe(0);
  });

  it('cancels to the latest actual value quietly, and never leaves a pending lifecycle', async () => {
    const f = fixture({ announce: true }); const first = f.controller.set(80); f.flush(50); f.controller.cancel();
    expect(await first).toBe(false); expect(f.visual.textContent).toBe('80'); expect(f.semantic.textContent).toBe('80');
    expect(f.status.textContent).toBe('author status'); expect(f.callbacks.size).toBe(0);
    f.controller.cancel(); expect(f.controller.snapshot().active).toBe(false);
    const next = f.controller.set(90); f.flush(250); expect(await next).toBe(true); expect(f.status.textContent).toBe('90');
  });

  it('patches options without restart or accidental announcements and rejects invalid patches before cancellation', async () => {
    const f = fixture({ announce: true }); const first = f.controller.set(50);
    expect(() => f.controller.update({ precision: 9 })).toThrow(/precision/); expect(f.controller.snapshot().active).toBe(true);
    f.controller.update({ locale: 'de-DE', precision: 2 });
    expect(await first).toBe(false); expect(f.visual.textContent).toBe('50,00'); expect(f.semantic.textContent).toBe('50,00'); expect(f.status.textContent).toBe('author status'); expect(f.callbacks.size).toBe(0);
    const next = f.controller.set(60); f.flush(200); expect(await next).toBe(true); expect(f.status.textContent).toBe('60,00');
  });
});

describe('explicit nonfinancial interpolation', () => {
  it('interpolates decorative numbers while the readable actual value is always current', async () => {
    const f = fixture({ value: 0, mode: 'interpolate', precision: 1, announce: true });
    const first = f.controller.set(10); f.flush(100);
    expect(f.visual.textContent).toBe('8.8'); expect(f.semantic.textContent).toBe('10.0'); expect(f.status.textContent).toBe('author status');
    const second = f.controller.set(-10); expect(await first).toBe(false); expect(f.visual.textContent).toBe('8.8');
    f.flush(200); expect(f.visual.textContent).toBe('-7.7'); expect(f.semantic.textContent).toBe('-10.0');
    f.flush(300); expect(await second).toBe(true); expect(f.visual.textContent).toBe('-10.0'); expect(f.status.textContent).toBe('-10.0');
  });

  it('keeps a fixed pair of text nodes and skips duplicate rounded frame writes', async () => {
    const f = fixture({ value: 0, mode: 'interpolate', precision: 0 }); const changed = f.controller.set(1);
    const root = f.visual.firstElementChild!, numberNode = root.lastElementChild!.firstChild!;
    const changes: MutationRecord[] = []; const observer = new f.view.MutationObserver(records => changes.push(...records)); observer.observe(numberNode, { characterData: true });
    f.flush(1); await Promise.resolve(); const firstCount = changes.length;
    f.flush(2); await Promise.resolve(); expect(changes.length).toBe(firstCount); expect(root.lastElementChild!.firstChild).toBe(numberNode);
    expect(root.childNodes).toHaveLength(2); f.flush(200); expect(await changed).toBe(true); observer.disconnect();
  });
});

describe('motion preferences, visibility and leases', () => {
  it('quietly snaps explicit and live reduced-motion changes and never restarts idle work', async () => {
    const f = fixture({ announce: true }); const changed = f.controller.set(100); f.reduce(true);
    expect(await changed).toBe(true); expect(f.visual.textContent).toBe('100'); expect(f.status.textContent).toBe('author status'); expect(f.callbacks.size).toBe(0);
    expect(await f.controller.set(200)).toBe(true); expect(f.visual.textContent).toBe('200'); expect(f.status.textContent).toBe('author status');
    f.reduce(false); expect(f.callbacks.size).toBe(0);
    const next = f.controller.set(300); f.controller.update({ reducedMotion: true }); expect(await next).toBe(false); expect(f.visual.textContent).toBe('300');
    const explicit = fixture({ reducedMotion: true, announce: true }); expect(await explicit.controller.set(20)).toBe(true); expect(explicit.request).not.toHaveBeenCalled(); expect(explicit.status.textContent).toBe('author status');
  });

  it('cancels hidden active work, quietly settles hidden new values and does not replay on visibility', async () => {
    const f = fixture({ announce: true }); const changed = f.controller.set(20); f.hidden(true);
    expect(await changed).toBe(false); expect(f.callbacks.size).toBe(0); expect(f.visual.textContent).toBe('20');
    expect(await f.controller.set(40)).toBe(true); expect(f.status.textContent).toBe('author status');
    f.hidden(false); expect(f.callbacks.size).toBe(0);
  });

  it('cancels an offscreen observation without scheduling a return animation', async () => {
    const f = fixture(); f.controller.destroy();
    let callback!: IntersectionObserverCallback;
    const disconnect = vi.fn(), observe = vi.fn();
    Object.defineProperty(f.view, 'IntersectionObserver', { configurable: true, value: class { constructor(cb: IntersectionObserverCallback) { callback = cb; } observe = observe; disconnect = disconnect; } });
    const controller = attachGlassNumber(f.visual, { value: 1, locale: 'en-US', semantic: f.semantic }); fixtures[fixtures.length - 1].controller = controller;
    const changed = controller.set(2); expect(observe).toHaveBeenCalledWith(f.visual);
    callback([{ target: f.visual, isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(await changed).toBe(false); expect(f.callbacks.size).toBe(0); expect(disconnect).toHaveBeenCalled();
    callback([{ target: f.visual, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); expect(f.callbacks.size).toBe(0);
  });

  it('destroys detached active work and releases pending promises/listeners', async () => {
    const f = fixture(); const changed = f.controller.set(20); f.visual.remove(); await Promise.resolve();
    expect(await changed).toBe(false); expect(f.controller.snapshot().destroyed).toBe(true); expect(f.callbacks.size).toBe(0); expect(f.listeners.size).toBe(0);
    expect(f.visual.firstChild).toBe(f.originalVisual); expect(f.semantic.firstChild).toBe(f.originalSemantic);
    expect(await f.controller.set(30)).toBe(false);
  });

  it('restores original node identities and author aria-hidden, preserving author event handlers', async () => {
    const f = fixture({ announce: true }); const callback = vi.fn(); f.originalVisual.addEventListener('custom', callback);
    const changed = f.controller.set(20); f.flush(200); await changed; f.controller.destroy();
    expect(f.visual.firstChild).toBe(f.originalVisual); expect(f.semantic.firstChild).toBe(f.originalSemantic); expect(f.status.firstChild).toBe(f.originalStatus);
    expect(f.visual.hasAttribute('aria-hidden')).toBe(false); f.originalVisual.dispatchEvent(new f.view.Event('custom')); expect(callback).toHaveBeenCalledOnce();
    expect(f.listeners.size).toBe(0); expect(f.callbacks.size).toBe(0); f.controller.destroy();
  });

  it('never overwrites newer author visual/semantic content or status updates', async () => {
    const f = fixture({ announce: true }); const changed = f.controller.set(20);
    f.status.textContent = 'Host operation failed'; f.flush(200); expect(await changed).toBe(true); expect(f.status.textContent).toBe('Host operation failed');
    const next = f.controller.set(30); f.semantic.textContent = 'host replacement'; await Promise.resolve();
    expect(await next).toBe(false); expect(f.semantic.textContent).toBe('host replacement'); expect(f.status.textContent).toBe('Host operation failed');
    const other = fixture(); const pending = other.controller.set(40); other.visual.textContent = 'author visual replacement'; await Promise.resolve();
    expect(await pending).toBe(false); expect(other.visual.textContent).toBe('author visual replacement'); expect(other.visual.hasAttribute('aria-hidden')).toBe(false);
  });

  it('preserves edits to owned text/style/aria and does not steal relocated original nodes', async () => {
    const f = fixture(); const changed = f.controller.set(20); f.visual.firstElementChild!.setAttribute('style', 'color: red');
    f.flush(20); expect(await changed).toBe(false); expect(f.visual.firstElementChild?.getAttribute('style')).toBe('color: red');
    const other = fixture(); other.doc.body.append(other.originalVisual); other.visual.setAttribute('aria-hidden', 'false'); other.controller.destroy();
    expect(other.originalVisual.parentNode).toBe(other.doc.body); expect(other.visual.getAttribute('aria-hidden')).toBe('false');
  });

  it('respects a live-region opt-out and a changed semantic accessibility contract', async () => {
    const f = fixture({ announce: true }); const changed = f.controller.set(20); f.status.setAttribute('aria-live', 'off');
    f.flush(200); expect(await changed).toBe(true); expect(f.status.textContent).toBe('author status');
    f.semantic.setAttribute('aria-live', 'polite');
    expect(await f.controller.set(30)).toBe(false); expect(f.semantic.textContent).toBe('20');
    expect(f.semantic.getAttribute('aria-live')).toBe('polite'); expect(f.callbacks.size).toBe(0);
  });

  it('preserves new author status content after a prior owned announcement', async () => {
    const f = fixture({ announce: true }); const first = f.controller.set(20); f.flush(200); await first;
    f.status.firstChild!.textContent = 'Author changed the status';
    const next = f.controller.set(30); f.flush(400); expect(await next).toBe(true);
    f.controller.destroy(); expect(f.status.textContent).toBe('Author changed the status');
  });
});

describe('controller boundary validation', () => {
  it('rejects invalid targets before mutating authored nodes and reserves one owner per node', () => {
    const f = fixture();
    expect(() => attachGlassNumber(f.visual, { value: 1, locale: 'en-US', semantic: f.semantic })).toThrow(/unleased/);
    f.controller.destroy(); const html = f.doc.body.innerHTML;
    for (const options of [{ semantic: f.visual }, { semantic: f.semantic, status: f.semantic }, { semantic: f.semantic, announce: true }, { semantic: f.semantic, mode: 'fake' }, { semantic: f.semantic, duration: Infinity }, { semantic: f.semantic, announcementPrefix: 'x'.repeat(241) }]) {
      expect(() => attachGlassNumber(f.visual, { value: 1, locale: 'en-US', ...options } as GlassNumberOptions)).toThrow(); expect(f.doc.body.innerHTML).toBe(html);
    }
    f.semantic.setAttribute('aria-live', 'polite'); expect(() => attachGlassNumber(f.visual, { value: 1, locale: 'en-US', semantic: f.semantic })).toThrow(/non|live/);
    f.semantic.removeAttribute('aria-live'); f.status.removeAttribute('role');
    expect(() => attachGlassNumber(f.visual, { value: 1, locale: 'en-US', semantic: f.semantic, status: f.status })).toThrow(/live/);
  });

  it('does not cancel valid active work when a requested value is invalid', async () => {
    const f = fixture(); const changed = f.controller.set(20);
    expect(() => f.controller.set(NaN)).toThrow(/finite/); expect(f.controller.snapshot().active).toBe(true);
    f.flush(200); expect(await changed).toBe(true);
  });

  it('clamps finite duration, supports immediate values and keeps snapshots immutable', async () => {
    const f = fixture({ duration: 900 }); const changed = f.controller.set(20); f.flush(599); expect(f.controller.snapshot().active).toBe(true);
    f.flush(600); expect(await changed).toBe(true); expect(Object.isFrozen(f.controller.snapshot())).toBe(true);
    f.controller.update({ duration: -1, announce: true }); expect(await f.controller.set(30)).toBe(true); expect(f.callbacks.size).toBe(0); expect(f.status.textContent).toBe('30');
    expect(() => f.controller.update({ value: 50 } as never)).toThrow(/unknown/);
  });

  it('supports a missing RAF capability without starting an idle timer or hiding the actual value', async () => {
    const f = fixture({ announce: true });
    Object.defineProperty(f.view, 'requestAnimationFrame', { configurable: true, value: undefined });
    expect(await f.controller.set(20)).toBe(true); expect(f.visual.textContent).toBe('20'); expect(f.semantic.textContent).toBe('20');
    expect(f.callbacks.size).toBe(0); expect(f.status.textContent).toBe('20');
  });
});
