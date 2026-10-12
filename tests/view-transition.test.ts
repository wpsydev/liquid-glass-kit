import { afterEach, describe, expect, it, vi } from 'vitest';
import { nameGlassView, runGlassViewTransition } from '../src/view-transition.js';

const originalStart = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren(); document.documentElement.removeAttribute('data-lg-view-transition'); document.documentElement.removeAttribute('style'); if (originalStart) Object.defineProperty(document, 'startViewTransition', originalStart); else Reflect.deleteProperty(document, 'startViewTransition'); });
function deferred<T = void>() { let resolve!: (value: T | PromiseLike<T>) => void, reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function native(readyError?: unknown) {
  const records: { skip: ReturnType<typeof vi.fn>; finish(): void; callback: () => void | Promise<void> }[] = [];
  const start = vi.fn((callback: () => void | Promise<void>) => {
    const gate = deferred(), callbackDone = Promise.resolve().then(callback); let skipped = false;
    const ready = callbackDone.then(() => { if (skipped) throw new DOMException('Skipped', 'AbortError'); if (readyError) throw readyError; });
    const finish = () => gate.resolve();
    const skip = vi.fn(() => { skipped = true; finish(); });
    records.push({ skip, finish, callback });
    return { ready, updateCallbackDone: callbackDone, finished: Promise.all([callbackDone, gate.promise]).then(() => {}), skipTransition: skip };
  });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
  return { start, records };
}

describe('native same-document view transition bridge', () => {
  it('invokes an unsupported direct update exactly once and reports an honest fallback', async () => {
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: undefined });
    const update = vi.fn(), handle = runGlassViewTransition(update, { document });
    expect(await handle.ready).toBe(false); await handle.updateDone; expect(await handle.finished).toEqual({ animated: false, reason: 'unsupported' });
    handle.skip(); expect(update).toHaveBeenCalledOnce(); expect(handle.native).toBe(false);
  });
  it('runs once without ambient browser globals during SSR invocation', async () => {
    vi.stubGlobal('document', undefined); vi.stubGlobal('window', undefined);
    const update = vi.fn(), handle = runGlassViewTransition(update);
    await handle.updateDone; expect(await handle.finished).toEqual({ animated: false, reason: 'no-document' }); expect(update).toHaveBeenCalledOnce();
  });
  it('uses native snapshots and separate update/readiness/completion promises', async () => {
    const { start, records } = native(), update = vi.fn(), handle = runGlassViewTransition(update, { document });
    expect(handle.native).toBe(true); expect(start).toHaveBeenCalledOnce(); await handle.updateDone; expect(update).toHaveBeenCalledOnce();
    expect(await handle.ready).toBe(true); expect(document.documentElement.style.getPropertyValue('--lg-view-duration')).toBe('220ms');
    records[0].finish(); expect(await handle.finished).toEqual({ animated: true, reason: 'complete' });
    expect(document.documentElement.hasAttribute('data-lg-view-transition')).toBe(false); expect(document.documentElement.hasAttribute('style')).toBe(false);
  });
  it('falls back for explicit/system reduced motion and cannot override the system with false', async () => {
    const { start } = native(); const first = runGlassViewTransition(vi.fn(), { document, reducedMotion: true }); expect((await first.finished).reason).toBe('reduced-motion'); expect(start).not.toHaveBeenCalled();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const update = vi.fn(), second = runGlassViewTransition(update, { document, reducedMotion: false }); expect((await second.finished).reason).toBe('reduced-motion'); expect(update).toHaveBeenCalledOnce(); expect(start).not.toHaveBeenCalled();
  });
  it('updates hidden documents directly without capturing native snapshots', async () => {
    const { start } = native(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const update = vi.fn(), handle = runGlassViewTransition(update, { document }); expect((await handle.finished).reason).toBe('hidden'); expect(start).not.toHaveBeenCalled(); expect(update).toHaveBeenCalledOnce();
  });
  it('preserves synchronous and asynchronous host errors through both public update boundaries', async () => {
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: undefined });
    const error = new Error('host mutation failed');
    for (const update of [vi.fn(() => { throw error; }), vi.fn(async () => { throw error; })]) {
      const handle = runGlassViewTransition(update, { document }); await expect(handle.updateDone).rejects.toBe(error); await expect(handle.finished).rejects.toBe(error); expect(update).toHaveBeenCalledOnce();
    }
  });
  it('never reports native success or retries when the host update rejects', async () => {
    native(); const error = new Error('host failure'), update = vi.fn(() => Promise.reject(error));
    const handle = runGlassViewTransition(update, { document }); await expect(handle.updateDone).rejects.toBe(error); await expect(handle.finished).rejects.toBe(error);
    expect(await handle.ready).toBe(false); expect(update).toHaveBeenCalledOnce(); expect(document.documentElement.hasAttribute('data-lg-view-transition')).toBe(false);
  });
  it('cleans up rejected native work when the caller observes updateDone only', async () => {
    native(); const error = new Error('observed only at host boundary'), handle = runGlassViewTransition(() => Promise.reject(error), { document });
    await expect(handle.updateDone).rejects.toBe(error);
    for (let index = 0; index < 10; index++) await Promise.resolve();
    expect(document.documentElement.hasAttribute('data-lg-view-transition')).toBe(false);
    // Intentionally do not await finished/ready; their internal rejection
    // observers prevent an extra unhandled rejection from independent promises.
  });
  it('does not duplicate a callback when native start throws after invoking it', async () => {
    const visualError = new Error('platform wrapper failed');
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value(callback: () => Promise<void>) { void callback(); throw visualError; } });
    const update = vi.fn(), handle = runGlassViewTransition(update, { document }); const result = await handle.finished;
    expect(update).toHaveBeenCalledOnce(); expect(result).toEqual({ animated: false, reason: 'native-failed', error: visualError }); expect(handle.native).toBe(false);
  });
  it('shares one host promise even if a native adapter mistakenly invokes the callback twice', async () => {
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value(callback: () => Promise<void>) {
      const first = callback(), second = callback(); expect(first).toBe(second);
      return { ready: first, finished: second, updateCallbackDone: first, skipTransition() {} };
    } });
    const update = vi.fn(), handle = runGlassViewTransition(update, { document }); await handle.finished; expect(update).toHaveBeenCalledOnce();
  });
  it('does not swallow a host error after native start throws', async () => {
    const error = new Error('consequential host failure');
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value(callback: () => Promise<void>) { void callback(); throw new Error('native failure'); } });
    const update = vi.fn(() => { throw error; }), handle = runGlassViewTransition(update, { document });
    await expect(handle.finished).rejects.toBe(error); await expect(handle.updateDone).rejects.toBe(error); expect(update).toHaveBeenCalledOnce();
  });
  it('reports duplicate-name/snapshot failure separately while keeping the committed update', async () => {
    const error = new DOMException('Duplicate transition names', 'InvalidStateError'), { records } = native(error);
    const update = vi.fn(), handle = runGlassViewTransition(update, { document }); await handle.updateDone; expect(await handle.ready).toBe(false);
    records[0].finish(); expect(await handle.finished).toEqual({ animated: false, reason: 'native-failed', error }); expect(update).toHaveBeenCalledOnce();
  });
  it('skips only the visual when explicitly cancelled, leaving exactly one host update', async () => {
    const { records } = native(), update = vi.fn(), handle = runGlassViewTransition(update, { document }); handle.skip(); handle.skip();
    const result = await handle.finished; expect(result.animated).toBe(false); expect(result.reason).toBe('skipped'); expect(records[0].skip).toHaveBeenCalledOnce(); expect(update).toHaveBeenCalledOnce();
  });
  it('supersedes old visuals without cancelling or racing cleanup over a newer root scope', async () => {
    const { records } = native(); const root = document.documentElement; root.style.setProperty('--lg-view-duration', '99ms', 'important'); root.setAttribute('data-lg-view-transition', 'author');
    const firstUpdate = vi.fn(), secondUpdate = vi.fn(); const first = runGlassViewTransition(firstUpdate, { document, duration: 180 }); const second = runGlassViewTransition(secondUpdate, { document, duration: 300 });
    expect((await first.finished).reason).toBe('superseded'); expect(firstUpdate).toHaveBeenCalledOnce(); expect(root.style.getPropertyValue('--lg-view-duration')).toBe('300ms'); expect(root.getAttribute('data-lg-view-transition')).toBe('active');
    records[1].finish(); await second.finished; expect(secondUpdate).toHaveBeenCalledOnce(); expect(root.style.getPropertyValue('--lg-view-duration')).toBe('99ms'); expect(root.style.getPropertyPriority('--lg-view-duration')).toBe('important'); expect(root.getAttribute('data-lg-view-transition')).toBe('author');
  });
  it('applies duration bounds and preserves unrelated host changes during cleanup', async () => {
    const { records } = native(), root = document.documentElement;
    const first = runGlassViewTransition(() => {}, { document, duration: 1 }); expect(root.style.getPropertyValue('--lg-view-duration')).toBe('180ms');
    root.style.setProperty('--lg-view-duration', 'custom'); root.setAttribute('data-lg-view-transition', 'host'); root.style.setProperty('color', 'red'); records[0].finish(); await first.finished;
    expect(root.style.getPropertyValue('--lg-view-duration')).toBe('custom'); expect(root.getAttribute('data-lg-view-transition')).toBe('host'); expect(root.style.color).toBe('red');
    const second = runGlassViewTransition(() => {}, { document, duration: 9999 }); expect(root.style.getPropertyValue('--lg-view-duration')).toBe('300ms'); records[1].finish(); await second.finished;
  });
  it('responds to live motion/visibility changes and removes its listeners on finish', async () => {
    const { records } = native(); let reduced = false, changed: (() => void) | undefined; const remove = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, callback: () => void) => { changed = callback; }, removeEventListener: remove }));
    const update = vi.fn(), handle = runGlassViewTransition(update, { document }); reduced = true; changed!();
    expect((await handle.finished).reason).toBe('reduced-motion'); expect(update).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce();
    reduced = false; const hidden = runGlassViewTransition(() => {}, { document }); vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    expect((await hidden.finished).reason).toBe('hidden'); expect(records[1].skip).toHaveBeenCalledOnce();
  });
  it('does not install RAF/geometry polyfills or claim routing/focus ownership', async () => {
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: undefined });
    const raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect'); const input = document.createElement('input'); document.body.append(input); input.focus();
    const handle = runGlassViewTransition(() => {}, { document }); await handle.finished; expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
  });
});

describe('explicit shared-view names', () => {
  it('assigns a safe scoped name and restores previous inline value/priority', () => {
    const element = document.createElement('div'); element.style.setProperty('view-transition-name', 'author-name', 'important'); element.style.color = 'red';
    const name = nameGlassView(element, 'project-preview'); expect(name.name).toBe('lg-view-project-preview'); expect(element.style.getPropertyValue('view-transition-name')).toBe(name.name);
    name.destroy(); name.destroy(); expect(element.style.getPropertyValue('view-transition-name')).toBe('author-name'); expect(element.style.getPropertyPriority('view-transition-name')).toBe('important'); expect(element.style.color).toBe('red');
  });
  it('rejects injection and helper-managed duplicate names transactionally', () => {
    const first = document.createElement('div'), second = document.createElement('div'); const attachment = nameGlassView(first, 'hero');
    expect(() => nameGlassView(second, 'hero')).toThrow('unique'); expect(second.hasAttribute('style')).toBe(false);
    for (const unsafe of ['bad name', 'a);color:red', '../hero', '', 'A', '-root', 'a'.repeat(50)]) expect(() => nameGlassView(second, unsafe)).toThrow();
    expect(() => nameGlassView(first, 'other')).toThrow('Destroy'); attachment.destroy(); const replacement = nameGlassView(second, 'hero'); replacement.destroy();
  });
  it('does not clobber externally changed name or priority during destruction', () => {
    const element = document.createElement('div'), first = nameGlassView(element, 'first'); element.style.setProperty('view-transition-name', 'host-name'); first.destroy(); expect(element.style.getPropertyValue('view-transition-name')).toBe('host-name');
    const second = nameGlassView(element, 'second'); element.style.setProperty('view-transition-name', second.name, 'important'); second.destroy(); expect(element.style.getPropertyValue('view-transition-name')).toBe(second.name); expect(element.style.getPropertyPriority('view-transition-name')).toBe('important');
  });
  it('removes only its empty style attribute and permits the same name in another document', () => {
    const first = document.createElement('div'), other = document.implementation.createHTMLDocument().createElement('div'); const one = nameGlassView(first, 'hero'), two = nameGlassView(other, 'hero');
    one.destroy(); two.destroy(); expect(first.hasAttribute('style')).toBe(false); expect(other.hasAttribute('style')).toBe(false);
  });
});
