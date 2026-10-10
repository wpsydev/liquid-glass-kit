import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassTransition } from '../src/micro-motion.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function element() {
  const node = document.createElement('button'); node.textContent = 'Save'; document.body.append(node); return node;
}
function animations(node: HTMLElement) {
  const calls: { frames: Keyframe[]; options: KeyframeAnimationOptions; finish: () => void; reject: () => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const animate = vi.fn((frames: Keyframe[], options: KeyframeAnimationOptions) => {
    let finish!: () => void, reject!: (error: Error) => void;
    const finished = new Promise<void>((resolve, fail) => { finish = resolve; reject = fail; });
    const cancel = vi.fn(() => reject(new DOMException('Animation canceled', 'AbortError')));
    calls.push({ frames, options, finish, reject: () => reject(new Error('Animation failed')), cancel });
    return { finished, cancel } as unknown as Animation;
  });
  Object.defineProperty(node, 'animate', { configurable: true, value: animate });
  return { calls, animate };
}
function media() {
  let matches = false;
  const listeners = new Set<() => void>();
  const remove = vi.fn((_type: string, listener: () => void) => { listeners.delete(listener); });
  vi.stubGlobal('matchMedia', () => ({ get matches() { return matches; }, addEventListener: (_type: string, listener: () => void) => listeners.add(listener), removeEventListener: remove }));
  return { remove, listeners, set(value: boolean) { matches = value; for (const listener of listeners) listener(); } };
}

describe('short presentation transitions', () => {
  it('uses short directional WAAPI motion and restores the author layer after entry', async () => {
    const node = element(); node.style.opacity = '.65'; node.style.translate = '10px 20px';
    const waapi = animations(node), transition = attachGlassTransition(node);
    const entered = transition.enter();
    expect(waapi.calls[0].frames[0]).toMatchObject({ translate: '10px calc(20px + 12px)', opacity: '0' });
    expect(waapi.calls[0].frames[1]).toMatchObject({ translate: '10px 20px', opacity: '0.65' });
    expect(waapi.calls[0].options).toMatchObject({ duration: 180, fill: 'both' });
    waapi.calls[0].finish(); expect(await entered).toBe(true);
    expect(node.style.translate).toBe('10px 20px'); expect(node.style.opacity).toBe('0.65');
    expect(waapi.calls[0].cancel).toHaveBeenCalledOnce(); transition.destroy();
  });

  it('holds a completed exit and uses that endpoint when entering again', async () => {
    const node = element(), waapi = animations(node), transition = attachGlassTransition(node, { direction: 'left' });
    const exited = transition.exit(); waapi.calls[0].finish(); expect(await exited).toBe(true);
    expect(node.style.opacity).toBe('0'); expect(node.style.translate).toBe('calc(0px + -12px) 0px');
    const entered = transition.enter();
    expect(waapi.calls[1].frames[0]).toMatchObject({ translate: 'calc(0px + -12px) 0px', opacity: '0' });
    waapi.calls[1].finish(); expect(await entered).toBe(true);
    expect(node.style.translate).toBe(''); expect(node.style.opacity).toBe(''); transition.destroy();
  });

  it('samples the active presentation before reversing and settles interrupted callers false', async () => {
    const node = element(), waapi = animations(node), transition = attachGlassTransition(node);
    const exited = transition.exit();
    const computed = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ translate: '0px -5px', scale: '1', opacity: '0.42' } as CSSStyleDeclaration);
    const entered = transition.enter(); computed.mockRestore();
    expect(await exited).toBe(false); expect(waapi.calls[0].cancel).toHaveBeenCalledOnce();
    expect(waapi.calls[1].frames[0]).toEqual({ translate: '0px -5px', scale: '1', opacity: '0.42' });
    waapi.calls[0].finish(); await Promise.resolve();
    expect(waapi.calls[1].cancel).not.toHaveBeenCalled();
    waapi.calls[1].finish(); expect(await entered).toBe(true); transition.destroy();
  });

  it('runs restrained confirmation and rejection feedback relative to author presentation', async () => {
    const node = element(); node.style.scale = '.9 1.1'; node.style.translate = '5px 8px';
    const waapi = animations(node), transition = attachGlassTransition(node, { duration: 600 });
    const confirmed = transition.feedback('confirm');
    expect(waapi.calls[0].frames[1]).toMatchObject({ scale: 'calc(.9 * 1.045) calc(1.1 * 1.045)' });
    expect(waapi.calls[0].options.duration).toBe(240); waapi.calls[0].finish(); expect(await confirmed).toBe(true);
    const rejected = transition.feedback('reject');
    expect(waapi.calls[1].frames[1]).toMatchObject({ translate: 'calc(5px + -3px) 8px' });
    expect(waapi.calls[1].frames[2]).toMatchObject({ translate: 'calc(5px + 3px) 8px' });
    waapi.calls[1].finish(); expect(await rejected).toBe(true); expect(node.style.translate).toBe('5px 8px'); transition.destroy();
  });

  it('feedback preserves the stable exit state rather than revealing hidden content', async () => {
    const node = element(), waapi = animations(node), transition = attachGlassTransition(node);
    const exited = transition.exit(); waapi.calls[0].finish(); await exited;
    const endpoint = node.style.translate;
    const feedback = transition.feedback('reject');
    expect(waapi.calls[1].frames.every(frame => frame.opacity === '0')).toBe(true);
    waapi.calls[1].finish(); expect(await feedback).toBe(true);
    expect(node.style.opacity).toBe('0'); expect(node.style.translate).toBe(endpoint); transition.destroy();
  });

  it('snaps without WAAPI, zero duration, or explicit reduced motion and uses no RAF loop', async () => {
    const node = element(), frames = vi.spyOn(window, 'requestAnimationFrame');
    const fallback = attachGlassTransition(node);
    expect(await fallback.exit()).toBe(true); expect(node.style.opacity).toBe('0');
    expect(await fallback.enter()).toBe(true); expect(node.style.opacity).toBe(''); fallback.destroy();
    const waapi = animations(node), transition = attachGlassTransition(node, { duration: 0 });
    expect(await transition.exit()).toBe(true); expect(waapi.animate).not.toHaveBeenCalled();
    transition.update({ reducedMotion: true }); expect(await transition.enter()).toBe(true);
    expect(await transition.feedback('confirm')).toBe(true); expect(waapi.animate).not.toHaveBeenCalled();
    expect(frames).not.toHaveBeenCalled(); transition.destroy();
  });

  it('settles intended endpoints on live reduced motion and keeps the listener until destroy', async () => {
    const preference = media(), node = element(), waapi = animations(node), transition = attachGlassTransition(node);
    const exited = transition.exit(); preference.set(true);
    expect(await exited).toBe(true); expect(node.style.opacity).toBe('0'); expect(waapi.calls[0].cancel).toHaveBeenCalledOnce();
    expect(await transition.enter()).toBe(true); expect(waapi.animate).toHaveBeenCalledOnce();
    preference.set(false); const entered = transition.enter(); transition.update({ reducedMotion: true });
    expect(await entered).toBe(true); expect(node.style.opacity).toBe('');
    transition.destroy(); expect(preference.listeners.size).toBe(0); expect(preference.remove).toHaveBeenCalledOnce();
  });

  it('preserves owned author values and priorities on entry completion, cancel and destroy', async () => {
    const node = element(); node.style.setProperty('opacity', '.6', 'important'); node.style.setProperty('scale', '.9', 'important');
    node.style.setProperty('translate', '10% 4px', 'important'); node.style.color = 'red';
    const original = ['opacity', 'scale', 'translate'].map(key => [key, node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]);
    const waapi = animations(node), transition = attachGlassTransition(node);
    const entered = transition.enter(); expect(node.style.getPropertyPriority('opacity')).toBe('');
    waapi.calls[0].finish(); expect(await entered).toBe(true);
    const assertRestored = () => {
      for (const [key, value, priority] of original) { expect(node.style.getPropertyValue(key)).toBe(value); expect(node.style.getPropertyPriority(key)).toBe(priority); }
      expect(node.style.color).toBe('red');
    };
    assertRestored(); const exiting = transition.exit(); transition.cancel(); expect(await exiting).toBe(false); assertRestored();
    const feedback = transition.feedback('confirm'); transition.destroy(); expect(await feedback).toBe(false); assertRestored();
    transition.destroy(); expect(await transition.enter()).toBe(false); expect(await transition.feedback('reject')).toBe(false);
  });

  it('bounds distance and duration, handles invalid numeric inputs, and replaces options on update', async () => {
    const node = element(), waapi = animations(node), transition = attachGlassTransition(node, { direction: 'right', distance: 999, duration: 999 });
    const first = transition.enter();
    expect(waapi.calls[0].frames[0].translate).toBe('calc(0px + -32px) 0px'); expect(waapi.calls[0].options.duration).toBe(600);
    waapi.calls[0].finish(); await first;
    transition.update({ direction: 'down', distance: Infinity, duration: NaN }); const second = transition.enter();
    expect(waapi.calls[1].frames[0].translate).toBe('0px calc(0px + -12px)'); expect(waapi.calls[1].options.duration).toBe(180);
    transition.update({ distance: -1, duration: -5 }); expect(await second).toBe(true);
    expect(await transition.exit()).toBe(true); expect(node.style.translate).toBe('0px 0px');
    transition.update(); const defaults = transition.enter(); expect(waapi.calls[2].options.duration).toBe(180);
    waapi.calls[2].finish(); await defaults; transition.destroy();
  });

  it('skips disabled feedback without hijacking native events or focus', async () => {
    const node = element(), waapi = animations(node), transition = attachGlassTransition(node); node.focus();
    const clicked = vi.fn(); node.addEventListener('click', clicked); node.click(); expect(clicked).toHaveBeenCalledOnce();
    const key = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }); node.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false); expect(document.activeElement).toBe(node);
    node.disabled = true; expect(await transition.feedback('confirm')).toBe(false);
    node.disabled = false; node.setAttribute('aria-disabled', 'true'); expect(await transition.feedback('reject')).toBe(false);
    expect(waapi.animate).not.toHaveBeenCalled(); expect(node.hidden).toBe(false); expect(node.hasAttribute('inert')).toBe(false);
    expect(node.hasAttribute('aria-hidden')).toBe(false); transition.destroy();
  });

  it('cancels active disconnection immediately and detects idle disconnection on the next call', async () => {
    const preference = media(), node = element(); node.style.opacity = '.7';
    const waapi = animations(node), transition = attachGlassTransition(node);
    const entering = transition.enter(); node.remove();
    expect(await entering).toBe(false); expect(waapi.calls[0].cancel).toHaveBeenCalledOnce();
    expect(node.style.opacity).toBe('0.7'); expect(preference.listeners.size).toBe(0);
    document.body.append(node); expect(await transition.enter()).toBe(false);
    const idle = attachGlassTransition(node); const exited = idle.exit(); waapi.calls[1].finish(); await exited;
    node.remove(); await Promise.resolve(); expect(node.style.opacity).toBe('0');
    expect(await idle.enter()).toBe(false); expect(node.style.opacity).toBe('0.7'); expect(preference.listeners.size).toBe(0);
  });

  it('handles failed finished promises and synchronous animation errors without orphaned callers', async () => {
    const node = element(), waapi = animations(node), transition = attachGlassTransition(node);
    const entering = transition.enter(); waapi.calls[0].reject(); expect(await entering).toBe(false); expect(node.style.opacity).toBe('');
    waapi.animate.mockImplementationOnce(() => { throw new Error('Unsupported keyframe'); });
    expect(await transition.exit()).toBe(false); expect(node.style.translate).toBe(''); transition.destroy();
  });

  it('can be imported without browser globals', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { expect(typeof (await import('../src/micro-motion.js')).attachGlassTransition).toBe('function'); }
    finally { vi.unstubAllGlobals(); }
  });
});
