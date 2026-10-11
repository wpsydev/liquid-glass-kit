import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassScrollReveal } from '../src/scroll-reveal.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function element() {
  const node = document.createElement('section');
  node.innerHTML = '<button>Open details</button>'; document.body.append(node); return node;
}
function animations(node: HTMLElement) {
  const calls: { frames: Keyframe[]; timing: KeyframeAnimationOptions & { rangeStart?: string; rangeEnd?: string }; finish: () => void; reject: () => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const animate = vi.fn((frames: Keyframe[], timing: KeyframeAnimationOptions) => {
    let finish!: () => void, reject!: (error: Error) => void;
    const finished = new Promise<void>((resolve, fail) => { finish = resolve; reject = fail; });
    const cancel = vi.fn(() => reject(new DOMException('Animation canceled', 'AbortError')));
    calls.push({ frames, timing, finish, reject: () => reject(new Error('Unsupported animation')), cancel });
    return { finished, cancel } as unknown as Animation;
  });
  Object.defineProperty(node, 'animate', { configurable: true, value: animate });
  return { calls, animate };
}
function intersection() {
  const instances: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  class Observer {
    observe = vi.fn(); disconnect = vi.fn();
    constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) { instances.push(this); }
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  return { instances, send(index: number, node: HTMLElement, isIntersecting: boolean) {
    instances[index].callback([{ target: node, isIntersecting } as IntersectionObserverEntry], instances[index] as unknown as IntersectionObserver);
  } };
}
function nativeTimeline() {
  const options: { subject: Element; axis: string }[] = [];
  class Timeline { constructor(value: { subject: Element; axis: string }) { options.push(value); } }
  vi.stubGlobal('ViewTimeline', Timeline);
  return { options, Timeline };
}
function media(matches = false) {
  const listeners = new Set<() => void>();
  const remove = vi.fn((_type: string, listener: () => void) => listeners.delete(listener));
  vi.stubGlobal('matchMedia', () => ({ get matches() { return matches; }, addEventListener: (_type: string, listener: () => void) => listeners.add(listener), removeEventListener: remove }));
  return { listeners, remove, set(value: boolean) { matches = value; for (const listener of [...listeners]) listener(); } };
}

describe('optional scroll reveals', () => {
  it('uses the original layout subject and native entry ranges without a timed duration', async () => {
    const node = element(), waapi = animations(node), timeline = nativeTimeline(), io = intersection();
    const reveal = attachGlassScrollReveal(node);
    expect(reveal.renderer).toBe('native-view-timeline');
    expect(timeline.options).toEqual([{ subject: node, axis: 'block' }]);
    expect(waapi.calls[0].timing).toMatchObject({ rangeStart: 'entry 0%', rangeEnd: 'entry 100%', fill: 'both', easing: 'linear' });
    expect(waapi.calls[0].timing.duration).toBeUndefined();
    expect(waapi.calls[0].frames).toEqual([{ opacity: '0.35', translate: '0px calc(0px + 24px)' }, { opacity: '1', translate: 'none' }]);
    expect(node.children).toHaveLength(1); expect(io.instances).toHaveLength(0);
    waapi.calls[0].finish(); await Promise.resolve();
    expect(waapi.calls[0].cancel).toHaveBeenCalledOnce(); expect(node.style.opacity).toBe('');
    reveal.update(); expect(waapi.animate).toHaveBeenCalledOnce(); reveal.destroy();
  });

  it('keeps a repeatable native timeline when once is false', async () => {
    const node = element(), waapi = animations(node); nativeTimeline();
    const reveal = attachGlassScrollReveal(node, { once: false });
    waapi.calls[0].finish(); await Promise.resolve();
    expect(waapi.calls[0].cancel).not.toHaveBeenCalled();
    reveal.destroy(); expect(waapi.calls[0].cancel).toHaveBeenCalledOnce();
  });

  it('selects a timed intersection fallback for explicit roots or native false', async () => {
    const node = element(), waapi = animations(node), io = intersection(), timeline = nativeTimeline();
    const root = document.createElement('main'); document.body.append(root); root.append(node);
    const reveal = attachGlassScrollReveal(node, { root });
    expect(reveal.renderer).toBe('intersection-reveal'); expect(timeline.options).toHaveLength(0);
    expect(io.instances[0].options).toEqual({ root, threshold: 0 });
    expect(node.style.opacity).toBe('0.35'); expect(waapi.animate).not.toHaveBeenCalled();
    io.send(0, node, true);
    expect(waapi.calls[0].timing).toMatchObject({ duration: 420, fill: 'both', easing: 'cubic-bezier(.2, .8, .2, 1)' });
    waapi.calls[0].finish(); await Promise.resolve();
    expect(node.style.opacity).toBe(''); expect(io.instances[0].disconnect).toHaveBeenCalledOnce();
    reveal.destroy();
    const another = attachGlassScrollReveal(node, { native: false });
    expect(another.renderer).toBe('intersection-reveal'); expect(timeline.options).toHaveLength(0); another.destroy();
  });

  it('does not animate other observed targets or duplicate intersection notifications', async () => {
    const node = element(), waapi = animations(node), io = intersection();
    const reveal = attachGlassScrollReveal(node);
    io.send(0, element(), true); expect(waapi.animate).not.toHaveBeenCalled();
    io.send(0, node, false); expect(waapi.animate).not.toHaveBeenCalled();
    io.send(0, node, true); io.send(0, node, true); expect(waapi.animate).toHaveBeenCalledOnce();
    waapi.calls[0].finish(); await Promise.resolve(); io.send(0, node, true);
    expect(waapi.animate).toHaveBeenCalledOnce(); reveal.destroy();
  });

  it('replays timed reveals only on re-entry when once is false', async () => {
    const node = element(), waapi = animations(node), io = intersection();
    const reveal = attachGlassScrollReveal(node, { once: false });
    io.send(0, node, true); waapi.calls[0].finish(); await Promise.resolve();
    expect(node.style.opacity).toBe(''); expect(io.instances[0].disconnect).not.toHaveBeenCalled();
    io.send(0, node, true); expect(waapi.animate).toHaveBeenCalledOnce();
    io.send(0, node, false); expect(node.style.opacity).toBe('0.35');
    io.send(0, node, true); expect(waapi.animate).toHaveBeenCalledTimes(2);
    io.send(0, node, false); await Promise.resolve();
    expect(waapi.calls[1].cancel).toHaveBeenCalledOnce(); expect(node.style.opacity).toBe('0.35');
    io.send(0, node, true); expect(waapi.animate).toHaveBeenCalledTimes(3); reveal.destroy();
  });

  it('falls back if constructing a ViewTimeline or its animation throws', () => {
    const node = element(), waapi = animations(node), io = intersection();
    vi.stubGlobal('ViewTimeline', class { constructor() { throw new Error('Not supported'); } });
    const first = attachGlassScrollReveal(node); expect(first.renderer).toBe('intersection-reveal'); first.destroy();
    nativeTimeline(); waapi.animate.mockImplementationOnce(() => { throw new Error('Range unsupported'); });
    const second = attachGlassScrollReveal(node);
    expect(second.renderer).toBe('intersection-reveal'); expect(io.instances).toHaveLength(2);
    expect(node.style.opacity).toBe('0.35'); io.send(1, node, true); expect(waapi.animate).toHaveBeenCalledTimes(2); second.destroy();
  });

  it('falls back on asynchronous native rejection and does not react to stale cancelled tasks', async () => {
    const node = element(), waapi = animations(node), io = intersection(); nativeTimeline();
    const reveal = attachGlassScrollReveal(node);
    waapi.calls[0].reject(); await Promise.resolve(); expect(reveal.renderer).toBe('intersection-reveal');
    expect(waapi.calls[0].cancel).toHaveBeenCalledOnce(); expect(node.style.opacity).toBe('0.35');
    io.send(0, node, true); waapi.calls[1].finish(); await Promise.resolve(); reveal.destroy();
    const next = attachGlassScrollReveal(node, { once: false });
    next.update({ native: false }); await Promise.resolve();
    expect(next.renderer).toBe('intersection-reveal'); expect(io.instances).toHaveLength(2); next.destroy();
  });

  it('settles visible when timed WAAPI rejects or throws', async () => {
    const node = element(), waapi = animations(node), io = intersection();
    const reveal = attachGlassScrollReveal(node);
    io.send(0, node, true); waapi.calls[0].reject(); await Promise.resolve();
    expect(reveal.renderer).toBe('static'); expect(node.style.opacity).toBe(''); expect(io.instances[0].disconnect).toHaveBeenCalledOnce(); reveal.destroy();
    waapi.animate.mockImplementationOnce(() => { throw new Error('Unsupported translate'); });
    const next = attachGlassScrollReveal(node); io.send(1, node, true);
    expect(next.renderer).toBe('static'); expect(node.style.translate).toBe(''); next.destroy();
  });

  it('uses static author presentation when observer/WAAPI are unavailable or observer creation fails', () => {
    const node = element();
    const first = attachGlassScrollReveal(node); expect(first.renderer).toBe('static'); expect(node.style.opacity).toBe(''); first.destroy();
    animations(node);
    const second = attachGlassScrollReveal(node); expect(second.renderer).toBe('static'); second.destroy();
    vi.stubGlobal('IntersectionObserver', class { constructor() { throw new Error('Invalid root'); } });
    const third = attachGlassScrollReveal(node); expect(third.renderer).toBe('static'); expect(node.style.opacity).toBe(''); third.destroy();
  });

  it('respects initial reduced motion and zero duration without installing an observer or animation', () => {
    const preference = media(true), node = element(), waapi = animations(node), io = intersection(); nativeTimeline();
    const first = attachGlassScrollReveal(node); expect(first.renderer).toBe('static'); first.destroy();
    preference.set(false);
    const second = attachGlassScrollReveal(node, { reducedMotion: true }); expect(second.renderer).toBe('static'); second.destroy();
    const third = attachGlassScrollReveal(node, { duration: 0 }); expect(third.renderer).toBe('static'); third.destroy();
    expect(waapi.animate).not.toHaveBeenCalled(); expect(io.instances).toHaveLength(0); expect(node.style.opacity).toBe('');
  });

  it('settles on live reduced motion, cleans listeners and permits explicit repeat mode after preference changes', async () => {
    const preference = media(), node = element(), waapi = animations(node), io = intersection();
    const reveal = attachGlassScrollReveal(node); io.send(0, node, true);
    preference.set(true); await Promise.resolve();
    expect(reveal.renderer).toBe('static'); expect(node.style.opacity).toBe(''); expect(waapi.calls[0].cancel).toHaveBeenCalledOnce();
    expect(io.instances[0].disconnect).toHaveBeenCalledOnce();
    preference.set(false); expect(io.instances).toHaveLength(1);
    reveal.update({ once: false }); expect(reveal.renderer).toBe('intersection-reveal'); expect(io.instances).toHaveLength(2);
    reveal.update({ reducedMotion: true }); expect(reveal.renderer).toBe('static'); expect(node.style.opacity).toBe('');
    reveal.destroy(); reveal.destroy(); expect(preference.listeners.size).toBe(0); expect(preference.remove).toHaveBeenCalledOnce();
  });

  it('exposes focused controls immediately without changing semantics, focus or native input', () => {
    const node = element(), waapi = animations(node), io = intersection();
    const reveal = attachGlassScrollReveal(node), button = node.querySelector('button')!;
    const clicked = vi.fn(); button.addEventListener('click', clicked); button.focus(); button.click();
    expect(reveal.renderer).toBe('static'); expect(node.style.opacity).toBe(''); expect(io.instances[0].disconnect).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(button); expect(clicked).toHaveBeenCalledOnce();
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }); button.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
    expect(node.hasAttribute('aria-hidden')).toBe(false); expect(node.hasAttribute('inert')).toBe(false); expect(node.hidden).toBe(false);
    reveal.update({ once: false }); expect(waapi.animate).not.toHaveBeenCalled(); reveal.destroy();
    const initiallyFocused = attachGlassScrollReveal(node); expect(initiallyFocused.renderer).toBe('static'); initiallyFocused.destroy();
  });

  it('manually reveals immediately and permanently, with no delayed observer replay', () => {
    const node = element(), waapi = animations(node), io = intersection(), reveal = attachGlassScrollReveal(node, { once: false });
    reveal.reveal(); expect(node.style.opacity).toBe(''); expect(reveal.renderer).toBe('static');
    io.send(0, node, true); reveal.update({ once: false }); expect(waapi.animate).not.toHaveBeenCalled();
    expect(io.instances).toHaveLength(1); reveal.destroy();
  });

  it('preserves author translate components, opacity fraction, inline priorities and unrelated styles', async () => {
    const node = element(); node.style.setProperty('opacity', '.6', 'important'); node.style.setProperty('translate', '10% 4px', 'important'); node.style.color = 'red';
    const original = ['opacity', 'translate'].map(key => [key, node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]);
    const waapi = animations(node), io = intersection(), reveal = attachGlassScrollReveal(node, { direction: 'left' });
    expect(node.style.opacity).toBe('0.21');
    io.send(0, node, true); expect(node.style.getPropertyPriority('opacity')).toBe('');
    expect(waapi.calls[0].frames[0].translate).toBe('calc(10% + 24px) 4px');
    expect(waapi.calls[0].frames[1]).toEqual({ opacity: '0.6', translate: '10% 4px' });
    waapi.calls[0].finish(); await Promise.resolve();
    for (const [key, value, priority] of original) { expect(node.style.getPropertyValue(key)).toBe(value); expect(node.style.getPropertyPriority(key)).toBe(priority); }
    expect(node.style.color).toBe('red'); reveal.destroy();
  });

  it('preserves nested computed calc expressions and a z component in native keyframes', () => {
    const node = element(), waapi = animations(node); nativeTimeline();
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ opacity: '.6', translate: '10% calc(4px + (2% * 2)) 3px' } as CSSStyleDeclaration);
    const reveal = attachGlassScrollReveal(node, { direction: 'left' });
    expect(waapi.calls[0].frames[0]).toEqual({ opacity: '0.21', translate: 'calc(10% + 24px) calc(4px + (2% * 2)) 3px' });
    expect(waapi.calls[0].frames[1].translate).toBe('10% calc(4px + (2% * 2)) 3px'); reveal.destroy();
  });

  it('bounds numeric options, handles invalid inputs and replaces options on update', () => {
    const node = element(), waapi = animations(node), io = intersection();
    const reveal = attachGlassScrollReveal(node, { direction: 'right', distance: 999, duration: 999, startOpacity: -10 });
    io.send(0, node, true); expect(waapi.calls[0].frames[0]).toEqual({ translate: 'calc(0px + -48px) 0px', opacity: '0.2' }); expect(waapi.calls[0].timing.duration).toBe(700);
    reveal.update({ direction: 'down', distance: Infinity, duration: NaN, startOpacity: Infinity });
    expect(io.instances[0].disconnect).toHaveBeenCalledOnce(); io.send(0, node, true); expect(waapi.animate).toHaveBeenCalledOnce();
    io.send(1, node, true); expect(waapi.calls[1].frames[0]).toEqual({ translate: '0px calc(0px + -24px)', opacity: '0.35' }); expect(waapi.calls[1].timing.duration).toBe(420);
    reveal.update({ distance: -1, duration: -5, startOpacity: 5 }); expect(reveal.renderer).toBe('static'); expect(node.style.opacity).toBe(''); reveal.destroy();
  });

  it('destroy is idempotent, restores waiting/active author values and makes later calls inert', async () => {
    const preference = media(), node = element(); node.style.setProperty('opacity', '.8', 'important');
    const waapi = animations(node), io = intersection(), reveal = attachGlassScrollReveal(node);
    io.send(0, node, true); reveal.destroy(); reveal.destroy(); reveal.reveal(); reveal.update(); io.send(0, node, true); await Promise.resolve();
    expect(reveal.renderer).toBe('static'); expect(waapi.calls[0].cancel).toHaveBeenCalledOnce(); expect(waapi.animate).toHaveBeenCalledOnce();
    expect(node.style.opacity).toBe('0.8'); expect(node.style.getPropertyPriority('opacity')).toBe('important');
    expect(io.instances[0].disconnect).toHaveBeenCalledOnce(); expect(preference.listeners.size).toBe(0);
    const waiting = attachGlassScrollReveal(node); waiting.destroy(); expect(node.style.opacity).toBe('0.8');
  });

  it('does not install scroll listeners, custom RAF callbacks or read geometry during entry', () => {
    const node = element(), waapi = animations(node), io = intersection();
    const raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(node, 'getBoundingClientRect');
    const listeners = vi.spyOn(node, 'addEventListener'), windowListeners = vi.spyOn(window, 'addEventListener');
    const reveal = attachGlassScrollReveal(node); io.send(0, node, true);
    expect(waapi.animate).toHaveBeenCalledOnce(); expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled();
    expect(listeners.mock.calls.some(([name]) => name === 'scroll')).toBe(false); expect(windowListeners.mock.calls.some(([name]) => name === 'scroll')).toBe(false); reveal.destroy();
  });

  it('cleans disconnected elements on observer callbacks and method calls', () => {
    const preference = media(), node = element(), waapi = animations(node), io = intersection(), reveal = attachGlassScrollReveal(node);
    node.remove(); io.send(0, node, true);
    expect(reveal.renderer).toBe('static'); expect(node.style.opacity).toBe(''); expect(waapi.animate).not.toHaveBeenCalled(); expect(preference.listeners.size).toBe(0);
    document.body.append(node); reveal.update(); expect(io.instances).toHaveLength(1);
    const other = attachGlassScrollReveal(node); node.remove(); other.reveal(); expect(node.style.opacity).toBe(''); expect(preference.listeners.size).toBe(0);
  });

  it('is import-safe without browser globals', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { expect(typeof (await import('../src/scroll-reveal.js')).attachGlassScrollReveal).toBe('function'); }
    finally { vi.unstubAllGlobals(); }
  });
});
