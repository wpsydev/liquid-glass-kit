// @vitest-environment node
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassFollow } from '../src/follow.js';
import type { GlassFollowController, GlassFollowOptions } from '../src/follow.js';

const fixtures: { dom: JSDOM; controller?: GlassFollowController }[] = [];
afterEach(() => { for (const f of fixtures) { f.controller?.destroy(); f.dom.window.close(); } fixtures.length = 0; vi.restoreAllMocks(); });
function fixture(options: Partial<GlassFollowOptions> = {}, start = 400) {
  const dom = new JSDOM('<div id="scroll" tabindex="0" role="log" aria-label="Build log"><div id="content"><p>Actual host text to select</p><button>Copy</button></div></div><button id="jump">Jump latest</button>', { pretendToBeVisual: true });
  const view = dom.window, doc = view.document, scroller = doc.getElementById('scroll')!, content = doc.getElementById('content')!;
  let total = 600, height = 200, top = start, nextFrame = 0, reduced = false;
  const frames = new Map<number, FrameRequestCallback>(), mediaListeners = new Set<() => void>();
  const callbacks: { resize?: ResizeObserverCallback; intersection?: IntersectionObserverCallback } = {};
  const resized = vi.fn(), resizeDisconnect = vi.fn(), intersected = vi.fn(), intersectionDisconnect = vi.fn();
  Object.defineProperties(scroller, { scrollHeight: { configurable: true, get: () => total }, clientHeight: { configurable: true, get: () => height },
    scrollTop: { configurable: true, get: () => top, set: value => { top = value; } } });
  const scroll = vi.fn((settings: ScrollToOptions) => { if (settings.behavior !== 'smooth') top = Math.max(0, Math.min(Math.max(0, total - height), settings.top ?? top)); });
  Object.defineProperty(scroller, 'scrollTo', { configurable: true, value: scroll });
  const request = vi.spyOn(view, 'requestAnimationFrame').mockImplementation(callback => { const id = nextFrame++; frames.set(id, callback); return id; });
  vi.spyOn(view, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  Object.defineProperty(view, 'ResizeObserver', { configurable: true, value: class { constructor(callback: ResizeObserverCallback) { callbacks.resize = callback; } observe = resized; disconnect = resizeDisconnect; } });
  Object.defineProperty(view, 'IntersectionObserver', { configurable: true, value: class { constructor(callback: IntersectionObserverCallback) { callbacks.intersection = callback; } observe = intersected; disconnect = intersectionDisconnect; } });
  Object.defineProperty(view, 'matchMedia', { configurable: true, value: () => ({ get matches() { return reduced; },
    addEventListener: (_: string, callback: () => void) => mediaListeners.add(callback), removeEventListener: (_: string, callback: () => void) => mediaListeners.delete(callback) }) });
  const controller = attachGlassFollow(scroller, { content, ...options }); fixtures.push({ dom, controller });
  return { dom, view, doc, scroller, content, controller, scroll, request, frames, resized, resizeDisconnect, intersected, intersectionDisconnect, mediaListeners,
    setTop(value: number, event = true) { top = value; if (event) scroller.dispatchEvent(new view.Event('scroll')); },
    setHeight(value: number) { total = value; }, setViewport(value: number) { height = value; },
    resize() { callbacks.resize?.([], {} as ResizeObserver); },
    intersection(value: boolean) { callbacks.intersection?.([{ target: scroller, isIntersecting: value } as IntersectionObserverEntry], {} as IntersectionObserver); },
    hidden(value: boolean) { Object.defineProperty(doc, 'hidden', { configurable: true, value }); doc.dispatchEvent(new view.Event('visibilitychange')); },
    reduced(value: boolean) { reduced = value; for (const callback of mediaListeners) callback(); },
    flush() { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(0); },
  };
}

describe('cached pinned intent and explicit append counts', () => {
  it('imports without browser globals and attaches without scrolling, frames, roles or markup writes', () => {
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
    const f = fixture(); expect(f.controller.state).toEqual({ following: true, nearEnd: true, distance: 0, unread: 0, visible: true, destroyed: false });
    expect(f.scroll).not.toHaveBeenCalled(); expect(f.request).not.toHaveBeenCalled(); expect(f.frames.size).toBe(0);
    expect(f.scroller.getAttribute('role')).toBe('log'); expect(f.content.querySelector('p')?.textContent).toBe('Actual host text to select');
    expect(f.resized.mock.calls.map(call => call[0])).toEqual([f.scroller, f.content]); expect(f.intersected).toHaveBeenCalledWith(f.scroller);
    const middle = fixture({}, 120); expect(middle.controller.state.following).toBe(false); expect(middle.scroll).not.toHaveBeenCalled();
    expect(fixture({ initiallyFollowing: false }).controller.state.following).toBe(false);
  });

  it('uses pre-growth pinning rather than the newly increased distance and follows immediately', () => {
    const f = fixture(); f.scroller.style.scrollBehavior = 'smooth'; const button = f.doc.getElementById('jump')!; button.focus();
    f.setHeight(1000); f.controller.notifyAppend(2);
    expect(f.scroll).toHaveBeenLastCalledWith({ top: 800, behavior: 'instant' }); expect(f.scroller.scrollTop).toBe(800);
    expect(f.controller.state).toMatchObject({ following: true, nearEnd: true, unread: 0, distance: 0 });
    expect(f.doc.activeElement).toBe(button); expect(f.scroller.style.scrollBehavior).toBe('smooth');
    f.setHeight(1040); f.controller.notifyAppend(0); expect(f.scroller.scrollTop).toBe(840); expect(f.controller.state.unread).toBe(0);
    expect(f.frames.size).toBe(0);
  });

  it('preserves a paused reader and accumulates only host-reported new items', () => {
    const f = fixture(); f.controller.pause(); f.setTop(100, false); f.setHeight(800); f.controller.notifyAppend(3);
    expect(f.scroller.scrollTop).toBe(100); expect(f.controller.state).toMatchObject({ following: false, unread: 3, distance: 500 }); expect(f.scroll).not.toHaveBeenCalled();
    f.setHeight(900); f.resize(); f.flush(); expect(f.controller.state.unread).toBe(3); expect(f.scroller.scrollTop).toBe(100);
    f.controller.notifyAppend(0); expect(f.controller.state.unread).toBe(3);
    f.controller.notifyAppend(2); expect(f.controller.state.unread).toBe(5);
    expect(f.controller.follow()).toBe(true); expect(f.scroller.scrollTop).toBe(700); expect(f.controller.state).toMatchObject({ following: true, unread: 0 });
  });

  it('does not wait for a scheduled scroll frame before respecting actual upward movement', () => {
    const f = fixture(); f.setTop(390); f.setHeight(700); f.controller.notifyAppend(1);
    expect(f.scroller.scrollTop).toBe(390); expect(f.controller.state).toMatchObject({ following: false, unread: 1 });
    f.flush(); expect(f.scroller.scrollTop).toBe(390); expect(f.controller.state.unread).toBe(1);
    const refresh = fixture(); refresh.setTop(100); refresh.controller.refresh(); expect(refresh.scroller.scrollTop).toBe(100); expect(refresh.controller.state.following).toBe(false);
  });

  it('coalesces resize/scroll events including frame id zero and performs no idle polling', () => {
    const f = fixture(); f.setHeight(700); f.resize(); f.resize(); f.view.dispatchEvent(new f.view.Event('resize'));
    expect(f.frames.size).toBe(1); expect(f.request).toHaveBeenCalledOnce(); f.flush(); expect(f.scroller.scrollTop).toBe(500);
    expect(f.controller.state.unread).toBe(0); expect(f.frames.size).toBe(0); const calls = f.request.mock.calls.length; f.flush(); expect(f.request.mock.calls.length).toBe(calls);
    expect(f.resized).toHaveBeenCalledTimes(2); expect(f.resizeDisconnect).not.toHaveBeenCalled();
  });

  it('handles fractional tail tolerance, Safari elastic positions and content shrinking', () => {
    const near = fixture({}, 350.5); expect(near.controller.state.nearEnd).toBe(false);
    const inside = fixture({}, 351); expect(inside.controller.state.nearEnd).toBe(true);
    const elastic = fixture({}, 410); expect(elastic.controller.state.distance).toBe(0); expect(elastic.controller.state.following).toBe(true);
    elastic.setHeight(500); elastic.controller.refresh(); expect(elastic.scroller.scrollTop).toBe(410); expect(elastic.controller.state.distance).toBe(0);
    const negative = fixture({}, -10); expect(negative.controller.state.distance).toBe(400); expect(negative.controller.state.following).toBe(false);
    const short = fixture({}, 0); short.setHeight(100); short.controller.refresh(); expect(short.controller.state.distance).toBe(0);
  });
});

describe('reader movement, selection and native controls', () => {
  it('pauses on upward wheel intent without preventing native scroll, and keeps a sticky pause', () => {
    const f = fixture(); const event = new f.view.WheelEvent('wheel', { deltaY: -1, cancelable: true }); f.scroller.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false); expect(f.controller.state.following).toBe(false);
    f.setTop(400); f.flush(); expect(f.controller.state.following).toBe(false);
    f.setHeight(700); f.controller.notifyAppend(1); expect(f.scroller.scrollTop).toBe(400); expect(f.controller.state.unread).toBe(1);
    expect(f.controller.jumpLatest()).toBe(true); expect(f.controller.state.following).toBe(true);
    const zoom = new f.view.WheelEvent('wheel', { deltaY: -1, ctrlKey: true }); f.scroller.dispatchEvent(zoom); expect(f.controller.state.following).toBe(true);
  });

  it('respects upward navigation without hijacking input/button keyboard behavior', () => {
    const f = fixture(); const button = f.content.querySelector('button')!;
    button.focus(); button.dispatchEvent(new f.view.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); expect(f.controller.state.following).toBe(true);
    const event = new f.view.KeyboardEvent('keydown', { key: 'PageUp', cancelable: true }); f.scroller.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false); expect(f.doc.activeElement).toBe(button); expect(f.controller.state.following).toBe(false);
    f.controller.follow(); f.scroller.dispatchEvent(new f.view.KeyboardEvent('keydown', { key: ' ', shiftKey: true })); expect(f.controller.state.following).toBe(false);
  });

  it('pauses an upward touch gesture without pointer capture or event cancellation', () => {
    const f = fixture(); const down = new f.view.Event('pointerdown', { bubbles: true, cancelable: true }); Object.assign(down, { pointerType: 'touch', pointerId: 1, clientY: 100 }); f.scroller.dispatchEvent(down);
    const move = new f.view.Event('pointermove', { cancelable: true }); Object.assign(move, { pointerId: 1, clientY: 110 }); f.scroller.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(false); expect(f.controller.state.following).toBe(false);
    const up = new f.view.Event('pointerup'); Object.assign(up, { pointerId: 1 }); f.view.dispatchEvent(up);
    f.controller.follow(); f.scroller.dispatchEvent(move); expect(f.controller.state.following).toBe(true);
  });

  it('preserves selected transcript text and releases follow without clearing the selection', () => {
    const f = fixture(); const text = f.content.querySelector('p')!.firstChild!; const range = f.doc.createRange(); range.setStart(text, 0); range.setEnd(text, 6);
    const selection = f.view.getSelection()!; selection.addRange(range); f.doc.dispatchEvent(new f.view.Event('selectionchange'));
    expect(f.controller.state.following).toBe(false); expect(selection.toString()).toBe('Actual');
    f.setHeight(700); f.controller.notifyAppend(2); expect(f.scroller.scrollTop).toBe(400); expect(f.controller.state.unread).toBe(2); expect(selection.toString()).toBe('Actual');
    selection.removeAllRanges(); f.controller.follow(); expect(f.controller.state.following).toBe(true);
  });
});

describe('explicit navigation and visibility boundaries', () => {
  it('uses optional native smooth only for explicit jump and aborts only its owned navigation', () => {
    const f = fixture({}, 100); f.controller.notifyAppend(2); expect(f.controller.state.unread).toBe(2);
    expect(f.controller.jumpLatest({ smooth: true })).toBe(true); expect(f.scroll).toHaveBeenLastCalledWith({ top: 400, behavior: 'smooth' });
    expect(f.controller.state.unread).toBe(2); expect(f.frames.size).toBe(0);
    f.setTop(250); f.flush(); expect(f.controller.state.following).toBe(true);
    const wheel = new f.view.WheelEvent('wheel', { deltaY: -10 }); f.scroller.dispatchEvent(wheel);
    expect(f.scroll).toHaveBeenLastCalledWith({ top: 250, behavior: 'instant' }); expect(f.controller.state.following).toBe(false);
    f.scroll.mockClear(); f.controller.pause(); expect(f.scroll).not.toHaveBeenCalled();
  });

  it('clears acknowledged counts only on reaching the explicit smooth tail, with reduced motion instant', () => {
    const f = fixture({}, 100); f.controller.notifyAppend(3); f.controller.jumpLatest({ smooth: true }); f.setTop(400); f.flush();
    expect(f.controller.state).toMatchObject({ following: true, unread: 0, nearEnd: true });
    f.controller.pause(); f.setTop(100, false); f.reduced(true); f.controller.jumpLatest({ smooth: true }); expect(f.scroll).toHaveBeenLastCalledWith({ top: 400, behavior: 'instant' });
    f.reduced(false); f.controller.pause(); f.setTop(100, false); f.controller.jumpLatest({ smooth: true }); f.reduced(true);
    expect(f.scroller.scrollTop).toBe(400); expect(f.controller.state.following).toBe(true);
    const explicit = fixture({ reducedMotion: true }, 100); explicit.controller.jumpLatest({ smooth: true }); expect(explicit.scroll).toHaveBeenLastCalledWith({ top: 400, behavior: 'instant' });
  });

  it('pauses hidden/offscreen work, cancels scheduled frames and never replays when visible', () => {
    const f = fixture(); f.resize(); expect(f.frames.size).toBe(1); f.hidden(true); expect(f.frames.size).toBe(0);
    f.setHeight(800); f.controller.notifyAppend(2); expect(f.scroller.scrollTop).toBe(400); expect(f.controller.state).toMatchObject({ following: false, unread: 2, visible: false });
    expect(f.controller.follow()).toBe(false); f.hidden(false); f.flush(); expect(f.scroller.scrollTop).toBe(400); expect(f.controller.state.following).toBe(false);
    f.controller.follow(); f.intersection(false); f.setHeight(900); f.controller.notifyAppend(1); expect(f.scroller.scrollTop).toBe(600); expect(f.controller.state.visible).toBe(false);
    f.intersection(true); f.flush(); expect(f.scroller.scrollTop).toBe(600); expect(f.controller.state).toMatchObject({ following: false, unread: 1, visible: true });
  });

  it('does not follow a zero-height or hidden host region', () => {
    const f = fixture(); f.scroller.hidden = true; f.setHeight(700); f.controller.notifyAppend(1); expect(f.scroll).not.toHaveBeenCalled(); expect(f.controller.state.visible).toBe(false);
    f.scroller.hidden = false; f.setViewport(0); expect(f.controller.follow()).toBe(false); expect(f.controller.state.visible).toBe(false);
  });

  it('counts actual hidden/offscreen appends without forcing scroll geometry reads', () => {
    const f = fixture(); f.hidden(true);
    const total = vi.spyOn(f.scroller, 'scrollHeight', 'get'), height = vi.spyOn(f.scroller, 'clientHeight', 'get'), top = vi.spyOn(f.scroller, 'scrollTop', 'get');
    f.setHeight(900); f.controller.notifyAppend(4); expect(f.controller.state.unread).toBe(4);
    expect(total).not.toHaveBeenCalled(); expect(height).not.toHaveBeenCalled(); expect(top).not.toHaveBeenCalled();
    f.hidden(false); f.flush(); f.intersection(false); total.mockClear(); height.mockClear(); top.mockClear();
    f.controller.notifyAppend(2); expect(f.controller.state.unread).toBe(6); expect(total).not.toHaveBeenCalled(); expect(height).not.toHaveBeenCalled(); expect(top).not.toHaveBeenCalled();
  });
});

describe('cleanup, callbacks and validation', () => {
  it('destroys when detached or content is replaced, with no old-position restoration', () => {
    const f = fixture(); f.resize(); f.scroller.remove(); f.flush(); expect(f.controller.state.destroyed).toBe(true); expect(f.frames.size).toBe(0);
    expect(f.resizeDisconnect).toHaveBeenCalledOnce(); expect(f.intersectionDisconnect).toHaveBeenCalledOnce(); expect(f.mediaListeners.size).toBe(0); expect(f.scroll).not.toHaveBeenCalled();
    const replaced = fixture(); replaced.content.replaceWith(replaced.doc.createElement('div')); replaced.controller.notifyAppend(1); expect(replaced.controller.state.destroyed).toBe(true);
    expect(replaced.controller.follow()).toBe(false);
  });

  it('cleans observers/listeners and stops only owned smooth navigation without restoring reader offset', () => {
    const f = fixture({}, 100); f.controller.jumpLatest({ smooth: true }); f.setTop(240, false); f.controller.destroy();
    expect(f.scroll).toHaveBeenLastCalledWith({ top: 240, behavior: 'instant' }); expect(f.scroller.scrollTop).toBe(240); expect(f.controller.state.destroyed).toBe(true);
    const calls = f.request.mock.calls.length; f.resize(); f.scroller.dispatchEvent(new f.view.Event('scroll')); f.view.dispatchEvent(new f.view.Event('resize')); expect(f.request.mock.calls.length).toBe(calls);
    expect(f.frames.size).toBe(0); f.controller.destroy(); expect(f.resizeDisconnect).toHaveBeenCalledOnce();
  });

  it('emits only changed frozen snapshots and reports callback failures without breaking scroll intent', () => {
    const changed = vi.fn(); const f = fixture({ onChange: changed }); f.controller.refresh(); expect(changed).not.toHaveBeenCalled();
    f.controller.pause(); expect(changed).toHaveBeenCalledOnce(); expect(Object.isFrozen(changed.mock.calls[0][0])).toBe(true); f.controller.pause(); expect(changed).toHaveBeenCalledOnce();
    const failure = fixture({ onChange() { throw Error('Host observer failed'); } }); const reported = vi.fn(); failure.scroller.addEventListener('lg-follow-error', reported);
    expect(() => failure.controller.pause()).not.toThrow(); expect(reported).toHaveBeenCalledOnce();
    expect((reported.mock.calls[0][0] as CustomEvent).detail.message).toBe('Host observer failed');
  });

  it('rejects invalid append counts before changing the reader position or unread state', () => {
    const f = fixture(); for (const count of [-1, .5, NaN, Infinity, 1e6 + 1, Number.MAX_SAFE_INTEGER, '1', null]) expect(() => f.controller.notifyAppend(count as number)).toThrow(/append count/);
    expect(f.controller.state.unread).toBe(0); expect(f.scroll).not.toHaveBeenCalled(); f.controller.pause(); f.controller.notifyAppend(1e6); f.controller.notifyAppend(1e6); expect(f.controller.state.unread).toBe(2e6);
  });

  it('validates one direct child, ownership, option bounds and callbacks without accessor execution', () => {
    const f = fixture(); expect(() => attachGlassFollow(f.scroller, { content: f.content })).toThrow(/already/); f.controller.destroy();
    const before = f.scroller.outerHTML;
    for (const options of [{ content: f.scroller }, { content: f.content.querySelector('p') }, { content: f.content, threshold: NaN }, { content: f.content, initiallyFollowing: 'true' }, { content: f.content, observeResize: null }, { content: f.content, onChange: 1 }, { content: f.content, fakeStream: true }]) expect(() => attachGlassFollow(f.scroller, options as GlassFollowOptions)).toThrow();
    let reads = 0; expect(() => attachGlassFollow(f.scroller, { content: f.content, get threshold() { reads++; return 48; } })).toThrow(/accessors/); expect(reads).toBe(0); expect(f.scroller.outerHTML).toBe(before);
    expect(() => f.controller.jumpLatest({ smooth: 'yes' } as never)).toThrow(/boolean/);
  });

  it('supports absent observation/RAF/native scrollTo through explicit event-driven refresh', () => {
    const f = fixture(); f.controller.destroy();
    Object.defineProperty(f.view, 'ResizeObserver', { configurable: true, value: undefined }); Object.defineProperty(f.view, 'IntersectionObserver', { configurable: true, value: undefined });
    Object.defineProperty(f.view, 'requestAnimationFrame', { configurable: true, value: undefined }); Object.defineProperty(f.scroller, 'scrollTo', { configurable: true, value: undefined });
    const controller = attachGlassFollow(f.scroller, { content: f.content, observeResize: false }); fixtures[fixtures.length - 1].controller = controller;
    f.setHeight(800); controller.notifyAppend(1); expect(f.scroller.scrollTop).toBe(600); expect(controller.state.unread).toBe(0);
    f.setTop(100); expect(controller.state.following).toBe(false); expect(f.frames.size).toBe(0); expect(controller.follow()).toBe(true); expect(f.scroller.scrollTop).toBe(600);
  });
});
