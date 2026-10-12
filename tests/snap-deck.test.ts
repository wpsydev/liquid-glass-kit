import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassSnapDeck } from '../src/snap-deck.js';
import type { GlassSnapDeck, GlassSnapDeckOptions } from '../src/snap-deck.js';

const controllers: GlassSnapDeck[] = [];
const scrollEnd = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onscrollend');
afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); if (scrollEnd) Object.defineProperty(HTMLElement.prototype, 'onscrollend', scrollEnd); });
function fixture(extra: Partial<GlassSnapDeckOptions> = {}, dimensions: { widths?: number[]; viewport?: number; rtl?: boolean; vertical?: boolean } = {}) {
  const scroller = document.createElement('ul'); scroller.setAttribute('aria-label', 'Useful studies'); scroller.style.direction = dimensions.rtl ? 'rtl' : 'ltr'; scroller.innerHTML = '<li><a href="/one">Study one</a><input value="keep"></li><li><a href="/two">Study two</a></li><li><a href="/three">Study three</a></li>'; document.body.append(scroller);
  const items = [...scroller.children] as HTMLElement[]; let widths = dimensions.widths ?? [300, 300, 300], viewport = dimensions.viewport ?? 300;
  const extent = () => widths.reduce((sum, width) => sum + width, 0) + 20 * (widths.length - 1);
  Object.defineProperties(scroller, { clientWidth: { configurable: true, get: () => dimensions.vertical ? 300 : viewport }, clientHeight: { configurable: true, get: () => dimensions.vertical ? viewport : 150 }, clientLeft: { value: 2, configurable: true }, clientTop: { value: 2, configurable: true }, scrollWidth: { configurable: true, get: () => dimensions.vertical ? 300 : extent() }, scrollHeight: { configurable: true, get: () => dimensions.vertical ? extent() : 150 } });
  const rect = vi.spyOn(scroller, 'getBoundingClientRect').mockImplementation(() => ({ left: 50, top: 20, right: 54 + scroller.clientWidth, bottom: 24 + scroller.clientHeight, width: scroller.clientWidth + 4, height: scroller.clientHeight + 4 } as DOMRect));
  const itemRects = items.map((item, index) => vi.spyOn(item, 'getBoundingClientRect').mockImplementation(() => {
    const before = widths.slice(0, index).reduce((sum, width) => sum + width + 20, 0), axis = dimensions.vertical ? scroller.scrollTop : scroller.scrollLeft;
    const low = dimensions.rtl && !dimensions.vertical ? viewport - before - widths[index] : before;
    return dimensions.vertical ? { top: 22 + low - axis, left: 52, width: 300, height: widths[index], right: 352, bottom: 22 + low - axis + widths[index] } as DOMRect : { left: 52 + low - axis, top: 22, width: widths[index], height: 150, right: 52 + low - axis + widths[index], bottom: 172 } as DOMRect;
  }));
  let intended = 0;
  const scrollTo = vi.fn((options: ScrollToOptions) => { intended = options.left ?? options.top ?? 0; if (options.behavior === 'instant') { if (dimensions.vertical) scroller.scrollTop = intended; else scroller.scrollLeft = intended; } }); Object.defineProperty(scroller, 'scrollTo', { configurable: true, value: scrollTo });
  const onChange = vi.fn(), controller = attachGlassSnapDeck(scroller, { items, axis: dimensions.vertical ? 'y' : 'x', onChange, ...extra }); controllers.push(controller);
  function move(value = intended, end = true) { if (dimensions.vertical) scroller.scrollTop = value; else scroller.scrollLeft = value; scroller.dispatchEvent(new Event('scroll')); if (end) scroller.dispatchEvent(new Event('scrollend')); }
  return { scroller, items, controller, onChange, rect, itemRects, scrollTo, move, setWidths(next: number[]) { widths = next; }, setViewport(next: number) { viewport = next; } };
}

describe('optional native snap deck', () => {
  it('keeps authored semantics, native links/form values, source order, focus and style identity', () => {
    const { scroller, items, controller } = fixture(); const nodes = [...scroller.childNodes], input = items[0].querySelector('input')!, link = items[0].querySelector('a')!; input.value = 'local edit'; link.focus(); controller.next(); expect(document.activeElement).toBe(link); expect(scroller.getAttribute('role')).toBeNull(); expect(items.every(item => !item.hasAttribute('aria-hidden') && !item.hasAttribute('tabindex'))).toBe(true);
    controller.destroy(); expect([...scroller.childNodes]).toEqual(nodes); expect(input.value).toBe('local edit'); expect(scroller.getAttribute('aria-label')).toBe('Useful studies'); expect(scroller.style.direction).toBe('ltr'); expect(items[0].hasAttribute('data-lg-snap-item')).toBe(false);
  });
  it('reports actual settled state without prematurely selecting a requested smooth target', () => {
    const { controller, move, items, onChange, scrollTo } = fixture(); expect(controller.index).toBe(0); expect(controller.next()).toBe(true); expect(scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: 'smooth' }); expect(controller.index).toBe(0); expect(items[0].dataset.lgSnapActive).toBe('true');
    move(170, false); expect(controller.index).toBe(0); move(320); expect(controller.index).toBe(1); expect(items[1].dataset.lgSnapActive).toBe('true'); expect(onChange).toHaveBeenLastCalledWith({ index: 1, item: items[1], canNext: true, canPrevious: true, reason: 'scroll' });
  });
  it('coalesces duplicate settled notifications and has no idle timer/RAF or repeated geometry reads', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'); const { controller, move, rect, itemRects, onChange } = fixture(); const initial = rect.mock.calls.length + itemRects.reduce((sum, mock) => sum + mock.mock.calls.length, 0); controller.goTo(1);
    for (let value = 0; value < 320; value++) move(value, false); move(320); move(320); expect(onChange).toHaveBeenCalledTimes(2); expect(rect.mock.calls.length + itemRects.reduce((sum, mock) => sum + mock.mock.calls.length, 0)).toBe(initial); expect(raf).not.toHaveBeenCalled();
  });
  it('supports rapid explicit next requests without publishing their intermediate requested indices', () => {
    const { controller, scrollTo, move } = fixture(); controller.next(); controller.next(); expect(controller.index).toBe(0); expect(scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: 'smooth' }); expect(controller.next()).toBe(false); move(640); expect(controller.index).toBe(2); expect(controller.canNext).toBe(false); expect(controller.previous()).toBe(true);
  });
  it('disables both reachable directions when every card fits and notifies resize even if index is unchanged', () => {
    const { controller, setViewport, onChange } = fixture(); expect(controller.canNext).toBe(true); setViewport(1000); controller.refresh(); expect(controller.index).toBe(0); expect(controller.canNext).toBe(false); expect(controller.canPrevious).toBe(false); expect(controller.next()).toBe(false); expect(controller.previous()).toBe(false); expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ index: 0, canNext: false, reason: 'refresh' }));
  });
  it('uses native signed RTL coordinates with logical first/last edges and opposite physical targets', () => {
    const { controller, scrollTo, move } = fixture({}, { rtl: true }); expect(controller.index).toBe(0); controller.next(); expect(scrollTo).toHaveBeenLastCalledWith({ left: -320, behavior: 'smooth' }); move(-320); expect(controller.index).toBe(1); controller.next(); move(-640); expect(controller.index).toBe(2); expect(controller.canNext).toBe(false); controller.previous(); expect(scrollTo).toHaveBeenLastCalledWith({ left: -320, behavior: 'smooth' });
  });
  it('handles unequal-width cards and maps the final clamped position to the final card', () => {
    const { controller, scrollTo, move } = fixture({}, { widths: [200, 380, 160] }); controller.goTo(1); expect(scrollTo).toHaveBeenLastCalledWith({ left: 220, behavior: 'smooth' }); move(220); expect(controller.index).toBe(1); controller.goTo(2); expect(scrollTo).toHaveBeenLastCalledWith({ left: 480, behavior: 'smooth' }); move(480); expect(controller.index).toBe(2);
  });
  it('tracks a long card containing viewport center rather than choosing an unrelated nearby small card center', () => {
    const { controller, move } = fixture({}, { widths: [100, 1000, 100] }); controller.goTo(1); move(120); expect(controller.index).toBe(1);
  });
  it('supports vertical proximity decks without stealing native keys or transferring focus', () => {
    const { controller, scroller, scrollTo, move, items } = fixture({}, { vertical: true }); const link = items[0].querySelector('a')!; link.focus(); const key = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }); link.dispatchEvent(key); expect(key.defaultPrevented).toBe(false);
    controller.next(); expect(scrollTo).toHaveBeenLastCalledWith({ top: 320, behavior: 'smooth' }); move(320); expect(controller.index).toBe(1); expect(document.activeElement).toBe(link); expect(scroller.dataset.lgSnapDeck).toBe('y');
  });
  it('accounts for authored scroll padding/margin at cached snap targets', () => {
    const { controller, scroller, items, scrollTo } = fixture(); scroller.style.scrollPaddingLeft = '10%'; items[1].style.scrollMarginLeft = '7px'; controller.refresh(); controller.goTo(1); expect(scrollTo).toHaveBeenLastCalledWith({ left: 283, behavior: 'smooth' });
  });
  it('settles instant reduced-motion navigation immediately using the real resulting position', () => {
    const { controller, scrollTo, scroller } = fixture({ reducedMotion: true }); expect(controller.goTo(2)).toBe(true); expect(scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: 'instant' }); expect(scroller.scrollLeft).toBe(640); expect(controller.index).toBe(2); expect(scroller.dataset.lgSnapReduced).toBe('true');
  });
  it('keeps OS reduction authoritative and interrupts only owned smooth scrolling', () => {
    const media = Object.assign(new EventTarget(), { matches: false }); vi.stubGlobal('matchMedia', () => media); const { controller, scrollTo, move, scroller } = fixture({ reducedMotion: false }); controller.next(); move(100, false); media.matches = true; media.dispatchEvent(new Event('change')); expect(scrollTo).toHaveBeenLastCalledWith({ left: 100, behavior: 'instant' }); expect(scroller.dataset.lgSnapReduced).toBe('true'); controller.goTo(2); expect(controller.index).toBe(2);
  });
  it('hands touch/wheel scrolling to the browser and does not abort that movement on preference change', () => {
    const media = Object.assign(new EventTarget(), { matches: false }); vi.stubGlobal('matchMedia', () => media); const { controller, scrollTo, scroller } = fixture(); controller.next(); scroller.dispatchEvent(new Event('pointerdown')); media.matches = true; media.dispatchEvent(new Event('change')); expect(scrollTo).toHaveBeenCalledOnce();
    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true }); scroller.dispatchEvent(wheel); expect(wheel.defaultPrevented).toBe(false);
  });
  it('does not publish a still-moving user scroll as settled when an OS preference changes', () => {
    const media = Object.assign(new EventTarget(), { matches: false }); vi.stubGlobal('matchMedia', () => media); const { controller, move } = fixture(); move(320, false); expect(controller.index).toBe(0); media.matches = true; media.dispatchEvent(new Event('change')); expect(controller.index).toBe(0); move(320); expect(controller.index).toBe(1);
  });
  it('settles the actual user-interrupted position rather than the old requested target', () => {
    const { controller, scroller, move } = fixture(); controller.goTo(2); scroller.dispatchEvent(new Event('wheel')); move(320); expect(controller.index).toBe(1);
  });
  it('uses bounded scroll debounce only during movement when native scrollend is absent', () => {
    Reflect.deleteProperty(HTMLElement.prototype, 'onscrollend'); vi.useFakeTimers(); const { controller, move, onChange } = fixture({ settleDelay: 100 }); expect(vi.getTimerCount()).toBe(0); move(320, false); expect(controller.index).toBe(0); expect(vi.getTimerCount()).toBe(1); vi.advanceTimersByTime(99); expect(controller.index).toBe(0); move(640, false); expect(vi.getTimerCount()).toBe(1); vi.advanceTimersByTime(100); expect(controller.index).toBe(2); expect(onChange).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
  });
  it('clamps fallback delay and cancels pending settle callbacks on teardown', () => {
    Reflect.deleteProperty(HTMLElement.prototype, 'onscrollend'); vi.useFakeTimers(); const { controller, move, onChange } = fixture({ settleDelay: 1 }); move(320, false); vi.advanceTimersByTime(79); expect(controller.index).toBe(0); vi.advanceTimersByTime(1); expect(controller.index).toBe(1); move(640, false); controller.destroy(); const calls = onChange.mock.calls.length; expect(vi.getTimerCount()).toBe(0); vi.advanceTimersByTime(1000); expect(onChange).toHaveBeenCalledTimes(calls);
  });
  it('settles an already-current target without waiting for a scrollend event that will never fire', () => {
    const { controller, scrollTo, onChange } = fixture(); expect(controller.goTo(0)).toBe(true); expect(scrollTo).not.toHaveBeenCalled(); expect(controller.index).toBe(0); expect(onChange).toHaveBeenCalledOnce();
  });
  it('refreshes actual geometry after resizing and skips hidden/detached authored cards', () => {
    const { controller, items, move, setWidths, scrollTo } = fixture(); setWidths([150, 400, 300]); controller.refresh(); controller.goTo(1); expect(scrollTo).toHaveBeenLastCalledWith({ left: 170, behavior: 'smooth' }); move(170); expect(controller.index).toBe(1); items[1].hidden = true; controller.refresh(); expect(controller.goTo(1)).toBe(false); items[2].remove(); controller.refresh(); expect(controller.goTo(2)).toBe(false);
  });
  it('reports -1/null with no measurable content without hiding or deleting authored nodes', () => {
    const { controller, scroller, onChange, items } = fixture(); scroller.hidden = true; controller.refresh(); expect(controller.index).toBe(-1); expect(controller.canNext).toBe(false); expect(onChange).toHaveBeenLastCalledWith({ index: -1, item: null, canNext: false, canPrevious: false, reason: 'refresh' }); expect(items.every(item => !item.hidden)).toBe(true);
  });
  it('disconnects resize observations and observes the current authored catalogue only', () => {
    let callback!: ResizeObserverCallback; const observe = vi.fn(), disconnect = vi.fn(); vi.stubGlobal('ResizeObserver', class { constructor(value: ResizeObserverCallback) { callback = value; } observe = observe; disconnect = disconnect; });
    const { controller, items, setWidths, scrollTo } = fixture(); expect(observe).toHaveBeenCalledTimes(4); setWidths([140, 300, 300]); callback([], {} as ResizeObserver); controller.next(); expect(scrollTo).toHaveBeenLastCalledWith({ left: 160, behavior: 'smooth' }); controller.update({ items, reducedMotion: true }); expect(disconnect).toHaveBeenCalledOnce(); controller.destroy(); expect(disconnect).toHaveBeenCalledTimes(2);
  });
  it('keeps immediate smooth RTL requests alive through unchanged initial and re-observe deliveries', () => {
    let callback!: ResizeObserverCallback;
    vi.stubGlobal('ResizeObserver', class { constructor(value: ResizeObserverCallback) { callback = value; } observe() {} disconnect() {} });
    const { controller, items, scrollTo, move, onChange } = fixture({}, { rtl: true });
    controller.goTo(1); callback([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenCalledOnce(); expect(scrollTo).toHaveBeenLastCalledWith({ left: -320, behavior: 'smooth' });
    // Even an intermediate native scroll must not become a settled notification
    // merely because a first observer delivery occurred while it was moving.
    move(-320, false); callback([], {} as ResizeObserver);
    expect(controller.index).toBe(0); expect(onChange).toHaveBeenCalledOnce(); expect(scrollTo).toHaveBeenCalledOnce();
    move(-320); expect(controller.index).toBe(1);
    controller.update({ items }); const count = onChange.mock.calls.length;
    controller.goTo(2); callback([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenCalledTimes(2); expect(scrollTo).toHaveBeenLastCalledWith({ left: -640, behavior: 'smooth' });
    expect(controller.index).toBe(1); expect(onChange).toHaveBeenCalledTimes(count);
    move(-640); expect(controller.index).toBe(2);
  });
  it('interrupts a smooth request when layout actually changes before the first observer delivery', () => {
    let callback!: ResizeObserverCallback;
    vi.stubGlobal('ResizeObserver', class { constructor(value: ResizeObserverCallback) { callback = value; } observe() {} disconnect() {} });
    const { controller, scrollTo, setWidths, move } = fixture({}, { rtl: true });
    controller.goTo(2); move(-100, false);
    setWidths([280, 240, 300]); callback([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenCalledTimes(2); expect(scrollTo).toHaveBeenLastCalledWith({ left: -100, behavior: 'instant' });
    controller.goTo(1); expect(scrollTo).toHaveBeenLastCalledWith({ left: -300, behavior: 'smooth' });
  });
  it('preserves real viewport, padding, hidden-card and direction invalidation on resize deliveries', () => {
    let callback!: ResizeObserverCallback;
    vi.stubGlobal('ResizeObserver', class { constructor(value: ResizeObserverCallback) { callback = value; } observe() {} disconnect() {} });
    const dimensions = { rtl: false };
    const { controller, scroller, items, scrollTo, setViewport } = fixture({}, dimensions);
    controller.goTo(2); setViewport(360); callback([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'instant' });
    controller.goTo(1); scroller.style.scrollPaddingLeft = '20px'; callback([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'instant' });
    controller.goTo(1); expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });
    items[1].hidden = true; callback([], {} as ResizeObserver); expect(controller.goTo(1)).toBe(false);
    items[1].hidden = false; dimensions.rtl = true; scroller.style.direction = 'rtl'; callback([], {} as ResizeObserver);
    controller.goTo(1); expect(scrollTo).toHaveBeenLastCalledWith({ left: -320, behavior: 'smooth' });
  });
  it('leaves late observer/listener deliveries inert after destroy and removes the old observer catalogue', () => {
    let callback!: ResizeObserverCallback;
    const observe = vi.fn(), disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class { constructor(value: ResizeObserverCallback) { callback = value; } observe = observe; disconnect = disconnect; });
    const { controller, items, rect, itemRects, scrollTo, onChange } = fixture();
    controller.update({ items: [items[0], items[2]] }); expect(disconnect).toHaveBeenCalledOnce();
    expect(observe.mock.calls.slice(-3).map(([item]) => item)).toEqual([items[0], items[2], items[0].parentElement]);
    controller.goTo(1); controller.destroy();
    const reads = rect.mock.calls.length + itemRects.reduce((sum, item) => sum + item.mock.calls.length, 0);
    const scrollCalls = scrollTo.mock.calls.length, notifications = onChange.mock.calls.length;
    callback([], {} as ResizeObserver); window.dispatchEvent(new Event('resize'));
    expect(rect.mock.calls.length + itemRects.reduce((sum, item) => sum + item.mock.calls.length, 0)).toBe(reads);
    expect(scrollTo).toHaveBeenCalledTimes(scrollCalls); expect(onChange).toHaveBeenCalledTimes(notifications);
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
  it('validates updates transactionally, snapshots source arrays and keeps source order', () => {
    const { controller, items, scroller } = fixture(); expect(() => controller.update({ items: [] })).toThrow(); expect(controller.index).toBe(0); expect(() => controller.update({ items: [...items].reverse() })).toThrow('source order'); const next = [...items]; controller.update({ items: next }); next.length = 0; expect(controller.next()).toBe(true); expect(scroller.children).toHaveLength(3);
  });
  it('restores only owned markers and preserves later host attributes/styles', () => {
    const { controller, scroller, items } = fixture(); scroller.setAttribute('data-lg-snap-deck', 'host'); items[0].setAttribute('data-lg-snap-active', 'host-active'); scroller.style.scrollBehavior = 'auto'; controller.destroy(); expect(scroller.dataset.lgSnapDeck).toBe('host'); expect(items[0].dataset.lgSnapActive).toBe('host-active'); expect(scroller.style.scrollBehavior).toBe('auto'); expect(items[0].hasAttribute('data-lg-snap-item')).toBe(false);
  });
  it('rejects duplicate/nonchild/foreign/reordered/oversized item catalogues and duplicate attachments', () => {
    const { controller, scroller, items } = fixture(); expect(() => attachGlassSnapDeck(scroller, { items })).toThrow('existing'); controller.destroy();
    for (const bad of [[], Array(129).fill(items[0]), [items[0], items[0]], [document.createElement('section')], [...items].reverse()]) expect(() => attachGlassSnapDeck(scroller, { items: bad })).toThrow(); expect(scroller.hasAttribute('data-lg-snap-deck')).toBe(false);
  });
  it('interrupts owned movement on hidden/destroy, releases listeners and leaves late events inert', () => {
    const { controller, scroller, scrollTo, move, onChange } = fixture(); controller.next(); move(100, false); vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); expect(scrollTo).toHaveBeenLastCalledWith({ left: 100, behavior: 'instant' }); expect(controller.goTo(2)).toBe(false); controller.destroy(); controller.destroy(); const count = onChange.mock.calls.length; move(640); window.dispatchEvent(new Event('resize')); expect(onChange).toHaveBeenCalledTimes(count); expect(controller.next()).toBe(false); controller.refresh();
  });
  it('reports callback errors without disrupting native scrolling or cleanup', () => {
    const { controller, scroller, move } = fixture({ onChange() { throw Error('Host observer'); } }); const report = vi.fn(); scroller.addEventListener('lg-deck-error', report); controller.next(); move(320); expect(controller.index).toBe(1); expect(report).toHaveBeenCalledOnce(); expect(() => controller.destroy()).not.toThrow();
  });
});
