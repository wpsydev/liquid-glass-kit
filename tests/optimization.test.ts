import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlass, attachGlassMotion } from '../src/index.js';

const controllers: ReturnType<typeof attachGlass>[] = [];
const mount = (options = {}) => {
  const element = document.createElement('button'); document.body.append(element);
  const controller = attachGlass(element, options); controllers.push(controller);
  return { element, controller };
};
afterEach(() => { for (const controller of controllers.splice(0)) controller.destroy(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function preferences() {
  const media = new Map<string, { matches: boolean; listeners: Set<() => void>; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> }>();
  const matchMedia = vi.fn((query: string) => {
    const listeners = new Set<() => void>();
    const result = { matches: false, listeners, addEventListener: vi.fn((_type: string, fn: () => void) => listeners.add(fn)), removeEventListener: vi.fn((_type: string, fn: () => void) => listeners.delete(fn)) };
    media.set(query, result); return result;
  });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('CSS', { supports: vi.fn(() => true) });
  return { media, matchMedia };
}

describe('material resource ownership', () => {
  it('keeps the portable static default free of input listeners, observers and animation frames', () => {
    preferences();
    const frames = vi.spyOn(window, 'requestAnimationFrame');
    const observer = vi.fn(); vi.stubGlobal('ResizeObserver', class { constructor() { observer(); } observe() {} disconnect() {} });
    const element = document.createElement('button'); document.body.append(element);
    const input = vi.spyOn(element, 'addEventListener'), globalInput = vi.spyOn(window, 'addEventListener');
    const controller = attachGlass(element); controllers.push(controller);
    expect(input).not.toHaveBeenCalled(); expect(globalInput).not.toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled(); expect(frames).not.toHaveBeenCalled();
    expect(element.getAttribute('data-lg-renderer')).toBe('css');
  });

  it('shares live media listeners across a document and releases them only after the last controller', () => {
    const { media, matchMedia } = preferences();
    const first = mount(), second = mount();
    expect(matchMedia).toHaveBeenCalledTimes(4);
    for (const query of media.values()) expect(query.addEventListener).toHaveBeenCalledOnce();
    first.controller.destroy();
    const contrast = media.get('(prefers-contrast: more)')!; contrast.matches = true;
    for (const listener of contrast.listeners) listener();
    expect(second.element.getAttribute('data-lg-renderer')).toBe('solid');
    expect(first.element.hasAttribute('data-lg-renderer')).toBe(false);
    for (const query of media.values()) expect(query.removeEventListener).not.toHaveBeenCalled();
    second.controller.destroy();
    for (const query of media.values()) { expect(query.removeEventListener).toHaveBeenCalledOnce(); expect(query.listeners.size).toBe(0); }
    mount(); expect(matchMedia).toHaveBeenCalledTimes(8);
  });

  it('enables input on demand, then removes listeners and active feedback when options replace it', () => {
    preferences(); const { element, controller } = mount();
    const added = vi.spyOn(element, 'addEventListener'), removed = vi.spyOn(element, 'removeEventListener');
    controller.update({ interactive: true }); controller.update({ interactive: true });
    expect(added).toHaveBeenCalledTimes(7);
    const press = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    expect(element.dispatchEvent(press)).toBe(true); expect(element.getAttribute('data-lg-pressed')).toBe('true');
    controller.update({}); expect(element.hasAttribute('data-lg-pressed')).toBe(false); expect(removed).toHaveBeenCalledTimes(7);
    element.dispatchEvent(press); expect(element.hasAttribute('data-lg-pressed')).toBe(false);
    controller.update({ interactive: true }); element.dispatchEvent(press); expect(element.getAttribute('data-lg-pressed')).toBe('true');
  });

  it('does not rewrite unchanged fields and repairs an externally modified owned field', () => {
    preferences(); const { element, controller } = mount();
    const attributes = vi.spyOn(element, 'setAttribute'), styles = vi.spyOn(element.style, 'setProperty');
    controller.update({}); expect(attributes).not.toHaveBeenCalled(); expect(styles).not.toHaveBeenCalled();
    element.style.setProperty('--lg-radius', '9px', 'important'); element.setAttribute('data-lg-appearance', 'dark');
    controller.update({}); expect(element.style.getPropertyValue('--lg-radius')).toBe('24px'); expect(element.style.getPropertyPriority('--lg-radius')).toBe('');
    expect(element.getAttribute('data-lg-appearance')).toBe('auto');
  });

  it('allocates refraction resources only while supported and cancels frame zero on a solid preference', () => {
    const { media } = preferences(); vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Chrome/152');
    const queued = new Map<number, FrameRequestCallback>(); let next = 0;
    const frames = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { const id = next++; queued.set(id, fn); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queued.delete(id); });
    const observed = vi.fn(), disconnected = vi.fn();
    vi.stubGlobal('ResizeObserver', class { observe = observed; disconnect = disconnected; });
    const { element, controller } = mount(); controller.update({ refraction: 12 });
    expect(observed).toHaveBeenCalledOnce(); expect(frames).toHaveBeenCalledOnce(); expect(queued.has(0)).toBe(true);
    controller.update({ refraction: 18 }); expect(frames).toHaveBeenCalledOnce();
    const forced = media.get('(forced-colors: active)')!; forced.matches = true;
    for (const listener of forced.listeners) listener();
    expect(queued.size).toBe(0); expect(disconnected).toHaveBeenCalledOnce(); expect(element.getAttribute('data-lg-renderer')).toBe('solid');
    forced.matches = false; for (const listener of forced.listeners) listener();
    expect(observed).toHaveBeenCalledTimes(2); expect(queued.size).toBe(1);
    controller.update({}); expect(queued.size).toBe(0); expect(disconnected).toHaveBeenCalledTimes(2);
  });

  it('renders experimental SVG on demand and removes it immediately when refraction is disabled', () => {
    preferences(); vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Chrome/152');
    let queued: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { queued = fn; return 0; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { queued = undefined; });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData() {} } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    const { element, controller } = mount();
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 50 } as DOMRect);
    controller.update({ refraction: 12 }); const render = queued!; queued = undefined; render(0);
    expect(element.getAttribute('data-lg-renderer')).toBe('svg-experimental');
    expect(document.querySelector('feDisplacementMap')?.getAttribute('scale')).toBe('12');
    expect(document.querySelector('feImage')?.getAttribute('href')).toBe('data:image/png;base64,test');
    controller.update({}); expect(document.querySelector('svg')).toBeNull(); expect(element.style.getPropertyValue('--lg-filter')).toBe('');
    expect(element.getAttribute('data-lg-renderer')).toBe('css'); expect(queued).toBeUndefined();
  });

  it('clears gesture ownership when a spring controller is released programmatically or enters again', async () => {
    preferences(); vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const element = document.createElement('button'); document.body.append(element);
    const motion = attachGlassMotion(element, { reducedMotion: true });
    try {
      const down = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      down(); expect(element.getAttribute('data-lg-motion-pressed')).toBe('true');
      motion.release(); down(); expect(element.getAttribute('data-lg-motion-pressed')).toBe('true');
      await motion.enter(); down(); expect(element.getAttribute('data-lg-motion-pressed')).toBe('true');
      element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      expect(element.hasAttribute('data-lg-motion-pressed')).toBe(false);
    } finally { motion.destroy(); }
  });
});
