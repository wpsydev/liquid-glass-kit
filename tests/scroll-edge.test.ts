import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachGlassScrollEdge } from '../src/scroll-edge.js';

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const flush = () => {
  const pending = [...frames.values()]; frames.clear();
  for (const callback of pending) callback(0);
};
function fixture() {
  const wrapper = document.createElement('div');
  const scrollport = document.createElement('div');
  const layer = document.createElement('div');
  scrollport.innerHTML = '<div><button>Focusable content</button></div>';
  wrapper.append(scrollport, layer); document.body.append(wrapper);
  let height = 600;
  Object.defineProperties(scrollport, {
    scrollHeight: { get: () => height, configurable: true },
    clientHeight: { value: 200, configurable: true },
  });
  return { scrollport, layer, setHeight: (value: number) => { height = value; } };
}

beforeEach(() => {
  frames = new Map(); nextFrame = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = ++nextFrame; frames.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
});
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('scroll edge controller', () => {
  it('shows only boundaries with hidden content at the start, middle, and end', () => {
    const { scrollport, layer } = fixture();
    const controller = attachGlassScrollEdge(scrollport, layer);
    expect(layer.getAttribute('data-lg-edge-top')).toBe('false');
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('true');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.hasAttribute('inert')).toBe(true);
    expect(layer.getAttribute('tabindex')).toBe('-1');
    expect(scrollport.getAttribute('aria-hidden')).toBeNull();
    scrollport.scrollTop = 200; scrollport.dispatchEvent(new Event('scroll')); flush();
    expect(layer.getAttribute('data-lg-edge-top')).toBe('true');
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('true');
    scrollport.scrollTop = 400; scrollport.dispatchEvent(new Event('scroll')); flush();
    expect(layer.getAttribute('data-lg-edge-top')).toBe('true');
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('false');
    // Safari elastic overscroll must not invent a boundary beyond an endpoint.
    scrollport.scrollTop = -10; scrollport.dispatchEvent(new Event('scroll')); flush();
    expect(layer.getAttribute('data-lg-edge-top')).toBe('false');
    scrollport.scrollTop = 410; scrollport.dispatchEvent(new Event('scroll')); flush();
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('false');
    controller.destroy();
  });

  it('hides both boundaries when there is no overflow and recomputes on update', () => {
    const { scrollport, layer, setHeight } = fixture();
    setHeight(200);
    const controller = attachGlassScrollEdge(scrollport, layer, { style: 'hard', size: 48 });
    expect(layer.getAttribute('data-lg-edge-top')).toBe('false');
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('false');
    setHeight(600); scrollport.scrollTop = 50;
    controller.update({ edge: 'bottom', reducedTransparency: true, size: -3 });
    expect(layer.getAttribute('data-lg-edge-top')).toBe('false');
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('true');
    expect(layer.getAttribute('data-lg-edge-style')).toBe('soft');
    expect(layer.getAttribute('data-lg-edge-solid')).toBe('true');
    expect(layer.style.getPropertyValue('--lg-scroll-edge-size')).toBe('0px');
    controller.update({ edge: 'top', size: Infinity });
    expect(layer.getAttribute('data-lg-edge-top')).toBe('true');
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('false');
    expect(layer.style.getPropertyValue('--lg-scroll-edge-size')).toBe('32px');
    controller.update({ size: 999 });
    expect(layer.style.getPropertyValue('--lg-scroll-edge-size')).toBe('160px');
    controller.destroy();
  });

  it('restores owned state and cancels pending work without changing content styles or focus', () => {
    const { scrollport, layer } = fixture();
    layer.className = 'existing lg-scroll-edges'; layer.setAttribute('aria-hidden', 'false'); layer.setAttribute('tabindex', '0');
    layer.setAttribute('data-lg-edge-top', 'original');
    layer.style.setProperty('--lg-scroll-edge-size', '9px', 'important');
    scrollport.style.color = 'red';
    const button = scrollport.querySelector('button')!; button.focus();
    const controller = attachGlassScrollEdge(scrollport, layer);
    scrollport.scrollTop = 100; scrollport.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(1);
    controller.destroy(); controller.destroy(); controller.update({ size: 99 }); flush();
    expect(frames.size).toBe(0);
    expect(layer.className).toBe('existing lg-scroll-edges');
    expect(layer.getAttribute('aria-hidden')).toBe('false');
    expect(layer.getAttribute('tabindex')).toBe('0');
    expect(layer.hasAttribute('inert')).toBe(false);
    expect(layer.getAttribute('data-lg-edge-top')).toBe('original');
    expect(layer.hasAttribute('data-lg-edge-bottom')).toBe(false);
    expect(layer.style.getPropertyValue('--lg-scroll-edge-size')).toBe('9px');
    expect(layer.style.getPropertyPriority('--lg-scroll-edge-size')).toBe('important');
    expect(scrollport.style.color).toBe('red'); expect(document.activeElement).toBe(button);
    scrollport.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize'));
    expect(frames.size).toBe(0);
  });

  it('suppresses the overlay while content is focused and cleans up focus listeners', () => {
    const { scrollport, layer } = fixture();
    const button = scrollport.querySelector('button')!;
    button.focus();
    const controller = attachGlassScrollEdge(scrollport, layer, { style: 'hard' });
    expect(layer.getAttribute('data-lg-edge-focus')).toBe('true');
    button.blur(); flush();
    expect(layer.getAttribute('data-lg-edge-focus')).toBe('false');
    button.focus();
    expect(layer.getAttribute('data-lg-edge-focus')).toBe('true');
    controller.destroy();
    expect(layer.hasAttribute('data-lg-edge-focus')).toBe(false);
    button.blur(); button.focus(); flush();
    expect(layer.hasAttribute('data-lg-edge-focus')).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('updates for content changes and observes newly inserted children, then disconnects', async () => {
    const observed: Element[] = [];
    let onResize: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    class ResizeMock {
      constructor(callback: ResizeObserverCallback) { onResize = callback; }
      observe(element: Element) { observed.push(element); }
      disconnect = disconnect;
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeMock);
    const { scrollport, layer, setHeight } = fixture();
    const controller = attachGlassScrollEdge(scrollport, layer);
    expect(observed).toContain(scrollport);
    expect(observed).toContain(scrollport.firstElementChild);
    setHeight(200); onResize!([], {} as ResizeObserver); flush();
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('false');
    const newContent = document.createElement('div'); scrollport.append(newContent); setHeight(600);
    await Promise.resolve(); flush();
    expect(observed).toContain(newContent);
    expect(layer.getAttribute('data-lg-edge-bottom')).toBe('true');
    controller.destroy();
    const calls = disconnect.mock.calls.length;
    scrollport.append(document.createElement('div')); await Promise.resolve();
    expect(disconnect).toHaveBeenCalledTimes(calls);
    expect(layer.classList.contains('lg-scroll-edges')).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('rejects overlays that would hide real content or sit inside the scrolling content', () => {
    const { scrollport, layer } = fixture();
    expect(() => attachGlassScrollEdge(scrollport, scrollport)).toThrow(/separate overlay/);
    scrollport.append(layer);
    expect(() => attachGlassScrollEdge(scrollport, layer)).toThrow(/separate overlay/);
    document.body.append(layer); layer.innerHTML = '<button>Do not hide me</button>';
    expect(() => attachGlassScrollEdge(scrollport, layer)).toThrow(/must be empty/);
  });
});
