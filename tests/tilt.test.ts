import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassTilt } from '../src/tilt.js';
import type { GlassTilt, GlassTiltOptions } from '../src/tilt.js';

const controllers: GlassTilt[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function clock() {
  let now = 0, id = 0; const frames = new Map<number, FrameRequestCallback>(); vi.spyOn(window.performance, 'now').mockImplementation(() => now); const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++id, callback); return id; }); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(value => { frames.delete(value); });
  return { frames, request, step() { now += 16; const next = [...frames.values()]; frames.clear(); next.forEach(callback => callback(now)); }, settle() { for (let index = 0; index < 450 && frames.size; index++) this.step(); expect(frames.size).toBe(0); } };
}
function media() { const fine = Object.assign(new EventTarget(), { matches: true }), reduced = Object.assign(new EventTarget(), { matches: false }); vi.stubGlobal('matchMedia', (query: string) => query.includes('pointer') ? fine : reduced); return { fine, reduced }; }
function fixture(options: GlassTiltOptions = {}, hostTag = 'button') {
  const host = document.createElement(hostTag); if (hostTag === 'button') (host as HTMLButtonElement).type = 'button'; if (hostTag === 'a') host.setAttribute('href', '/original-route'); host.setAttribute('aria-label', 'Original instrument'); const visual = document.createElement('span'); visual.innerHTML = '<span>Original instrument</span><svg aria-hidden="true"><path d="M0 0h10"></path></svg>'; host.append(visual); document.body.append(host);
  const rect = vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, width: 200, height: 100 } as DOMRect); const visualRect = vi.spyOn(visual, 'getBoundingClientRect'); const controller = attachGlassTilt(host, visual, options); controllers.push(controller); return { host, visual, controller, rect, visualRect };
}
function pointer(host: HTMLElement, type = 'pointerenter', x = 300, y = 50, pointerType = 'mouse', more: Record<string, unknown> = {}) { const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 0 }); Object.defineProperties(event, Object.fromEntries(Object.entries({ pointerType, isPrimary: true, ...more }).map(([key, value]) => [key, { value }]))); host.dispatchEvent(event); return event; }
function angles(visual: HTMLElement) { return [...visual.style.transform.matchAll(/(?:rotateX|rotateY|translateZ)\((-?[\d.]+)(?:deg|px)\)/g)].map(value => Number(value[1])); }

describe('original dedicated visual tilt', () => {
  it('starts only on deliberate fine hover and settles with zero idle RAF/geometry polling', () => {
    const time = clock(); media(); const { host, visual, controller, rect, visualRect } = fixture(); expect(time.frames.size).toBe(0); expect(rect).not.toHaveBeenCalled(); pointer(host, 'pointermove'); expect(time.frames.size).toBe(0);
    pointer(host); expect(time.frames.size).toBe(1); time.settle(); expect(angles(visual)).toEqual([8, 8, 8]); expect(visual.style.pointerEvents).toBe('none'); expect(rect).toHaveBeenCalledOnce(); expect(visualRect).not.toHaveBeenCalled(); pointer(host, 'pointerleave'); time.settle(); expect(visual.style.transform).toBe(''); expect(visual.style.pointerEvents).toBe(''); controller.destroy();
  });
  it('uses one shared spring vector, suppresses immediate pointer packet paints and caches move geometry', () => {
    const time = clock(); media(); const { host, visual, rect } = fixture(); pointer(host); const setter = vi.spyOn(visual.style, 'setProperty');
    for (let index = 0; index < 100; index++) pointer(host, 'pointermove', 300 - index, 50 + index / 2); expect(time.frames.size).toBe(1); expect(setter).not.toHaveBeenCalled(); expect(rect).toHaveBeenCalledOnce(); time.step(); expect(setter.mock.calls.filter(args => args[0] === 'transform')).toHaveLength(1); time.settle(); expect(rect).toHaveBeenCalledOnce();
  });
  it('retains ownership of browser-normalized transforms through focus, reduction and cleanup', () => {
    const time = clock(); media(); const { host, visual, controller } = fixture();
    const nativeSet = visual.style.setProperty.bind(visual.style);
    vi.spyOn(visual.style, 'setProperty').mockImplementation((name, value, priority) => {
      const normalized = name === 'transform' ? String(value).replace(/(-?\d+(?:\.\d+)?)(deg|px)\)/g, (_match, number, unit) => `${Number(number)}${unit})`) : value;
      nativeSet(name, normalized, priority);
    });
    pointer(host); time.settle();
    expect(angles(visual)).toEqual([8, 8, 8]); expect(visual.style.pointerEvents).toBe('none');
    host.focus(); expect(visual.style.transform).toBe(''); expect(visual.style.pointerEvents).toBe('');
    host.blur(); pointer(host); time.settle(); controller.update({ reducedMotion: true });
    expect(visual.style.transform).toBe(''); expect(visual.style.pointerEvents).toBe('');
    controller.update(); pointer(host); time.settle(); controller.destroy();
    expect(visual.style.transform).toBe(''); expect(visual.style.pointerEvents).toBe('');
  });
  it('preserves host hit area, roles, native button focus and click/keyboard activation', () => {
    const time = clock(); media(); const { host, visual, controller } = fixture(); const content = [...host.childNodes], clicked = vi.fn(); host.addEventListener('click', clicked); pointer(host); time.settle(); host.click(); expect(clicked).toHaveBeenCalledOnce(); host.focus(); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); expect(document.activeElement).toBe(host);
    const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); host.dispatchEvent(key); expect(key.defaultPrevented).toBe(false); expect(host.getAttribute('role')).toBeNull(); expect(host.hasAttribute('tabindex')).toBe(false); expect(host.getAttribute('aria-label')).toBe('Original instrument'); controller.destroy(); expect([...host.childNodes]).toEqual(content);
  });
  it('preserves native anchors and default-prevented pointer intent', () => {
    const time = clock(); media(); const { host, visual } = fixture({}, 'a'); const event = new MouseEvent('pointerenter', { clientX: 300, clientY: 50, bubbles: true, cancelable: true }); Object.defineProperties(event, { pointerType: { value: 'mouse' }, isPrimary: { value: true } }); event.preventDefault(); host.dispatchEvent(event); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); expect(host.getAttribute('href')).toBe('/original-route');
  });
  it('does not oscillate the parent when a decorative child receives entry/leave packets', () => {
    const time = clock(); media(); const { host, visual, rect } = fixture(); pointer(host); time.settle(); const projected = visual.style.transform; pointer(visual, 'pointerleave'); pointer(visual, 'pointerenter'); time.settle(); expect(visual.style.transform).toBe(projected); expect(rect).toHaveBeenCalledOnce();
  });
  it('keeps coarse/touch/unsupported pointer media neutral and never captures or suppresses gestures', () => {
    const time = clock(), system = media(); const { host, visual } = fixture(); const capture = vi.fn(); Object.assign(host, { setPointerCapture: capture }); system.fine.matches = false; pointer(host); expect(time.frames.size).toBe(0); system.fine.matches = true; pointer(host, 'pointerenter', 300, 50, 'touch'); pointer(host, 'pointermove', 300, 50, 'touch'); expect(time.frames.size).toBe(0);
    pointer(host); time.settle(); const down = pointer(host, 'pointerdown', 300, 50, 'touch'); expect(down.defaultPrevented).toBe(false); expect(visual.style.transform).toBe(''); expect(visual.style.pointerEvents).toBe(''); expect(capture).not.toHaveBeenCalled(); expect(host.style.touchAction).toBe('');
  });
  it('treats presses and pointer cancellation as immediate neutral stable-control states', () => {
    const time = clock(); media(); const { host, visual } = fixture(); pointer(host); time.step(); expect(time.frames.size).toBe(1); pointer(host, 'pointerdown', 300, 50, 'mouse', { buttons: 1 }); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); pointer(host); time.step(); pointer(host, 'pointercancel'); expect(time.frames.size).toBe(0); expect(visual.style.pointerEvents).toBe('');
  });
  it('makes explicit/system reduced motion authoritative and requires deliberate reentry after reduction', () => {
    const time = clock(), system = media(); const { host, visual, controller } = fixture({ reducedMotion: false }); pointer(host); time.step(); system.reduced.matches = true; system.reduced.dispatchEvent(new Event('change')); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); controller.update({ reducedMotion: false }); pointer(host); expect(time.frames.size).toBe(0);
    system.reduced.matches = false; system.reduced.dispatchEvent(new Event('change')); pointer(host, 'pointermove'); expect(time.frames.size).toBe(0); pointer(host); time.settle(); expect(angles(visual)).toEqual([8, 8, 8]); controller.update({ reducedMotion: true }); expect(visual.style.transform).toBe('');
  });
  it('responds to fine-pointer availability changes and remains neutral when media detection is absent', () => {
    const time = clock(), system = media(); const { host, visual } = fixture(); pointer(host); time.step(); system.fine.matches = false; system.fine.dispatchEvent(new Event('change')); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe('');
    vi.stubGlobal('matchMedia', undefined); const other = fixture(); pointer(other.host); expect(time.frames.size).toBe(0); expect(other.visual.style.transform).toBe('');
  });
  it('clamps options and all rendered spring overshoot to safe rotation/depth limits', () => {
    const time = clock(); media(); const { host, visual } = fixture({ maxAngle: 100, maxDepth: 100, perspective: 10, damping: 1 }); pointer(host);
    for (let count = 0; count < 450 && time.frames.size; count++) { time.step(); const values = angles(visual); expect(values[0]).toBeLessThanOrEqual(15); expect(values[1]).toBeLessThanOrEqual(15); expect(values[2]).toBeLessThanOrEqual(32); expect(values[2]).toBeGreaterThanOrEqual(0); }
    expect(time.frames.size).toBe(0); expect(visual.style.transform).toContain('perspective(400px)');
  });
  it('restores authored inline transforms/priorities at rest and cleanup without wiping unrelated styles', () => {
    const time = clock(); media(); const host = document.createElement('button'); host.type = 'button'; const visual = document.createElement('span'); visual.textContent = 'Authored'; visual.style.setProperty('transform', 'rotate(2deg)', 'important'); visual.style.setProperty('pointer-events', 'auto', 'important'); host.append(visual); document.body.append(host); vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100 } as DOMRect);
    const controller = attachGlassTilt(host, visual); controllers.push(controller); pointer(host, 'pointerenter', 200, 0); time.settle(); expect(visual.style.transform).toContain('rotate(2deg)'); pointer(host, 'pointerleave'); time.settle(); expect(visual.style.transform).toBe('rotate(2deg)'); expect(visual.style.getPropertyPriority('transform')).toBe('important'); visual.style.color = 'red'; controller.destroy(); expect(visual.style.transform).toBe('rotate(2deg)'); expect(visual.style.getPropertyPriority('pointer-events')).toBe('important'); expect(visual.style.color).toBe('red');
  });
  it('stops for a later transform owner and never overwrites its value/priority', () => {
    const time = clock(); media(); const { host, visual, controller } = fixture(); pointer(host); time.step(); visual.style.setProperty('transform', 'translateX(9px)', 'important'); time.step(); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe('translateX(9px)'); expect(visual.style.pointerEvents).toBe(''); pointer(host, 'pointermove'); controller.refresh(); controller.update({ maxAngle: 15 }); expect(time.frames.size).toBe(0); controller.destroy(); expect(visual.style.getPropertyPriority('transform')).toBe('important');
  });
  it('stops when an outside owner edits pointer-event policy and keeps the new policy', () => {
    const time = clock(); media(); const { host, visual, controller } = fixture(); pointer(host); time.step(); visual.style.pointerEvents = 'auto'; time.step(); expect(time.frames.size).toBe(0); expect(visual.style.pointerEvents).toBe('auto'); expect(visual.style.transform).toBe(''); controller.destroy(); expect(visual.style.pointerEvents).toBe('auto');
  });
  it('neutralizes disabled/inert/hidden hosts and keyboard focus on controls outside the visual', () => {
    const time = clock(); media(); const { host, visual, controller } = fixture({}, 'article'); const control = document.createElement('button'); control.textContent = 'Stable action'; host.append(control); pointer(host); time.step(); control.focus(); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); control.blur(); host.setAttribute('inert', ''); pointer(host); expect(time.frames.size).toBe(0); host.removeAttribute('inert'); host.hidden = true; controller.refresh(); expect(visual.style.transform).toBe('');
  });
  it('clears hover on actual scroll and remeasures only upon explicit refresh/reentry/resize', () => {
    const time = clock(); media(); const { host, visual, rect, controller } = fixture(); pointer(host); time.step(); window.dispatchEvent(new Event('scroll')); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); expect(rect).toHaveBeenCalledOnce(); pointer(host, 'pointermove'); expect(time.frames.size).toBe(0); controller.refresh(); expect(rect).toHaveBeenCalledTimes(2); pointer(host); expect(rect).toHaveBeenCalledTimes(3); window.dispatchEvent(new Event('resize')); expect(rect).toHaveBeenCalledTimes(4);
  });
  it('disconnects actual resize observers and cancels hidden/detached animations with no persistent layer promotion', () => {
    const time = clock(); media(); const observe = vi.fn(), disconnect = vi.fn(); vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; }); const { host, visual, controller } = fixture(); expect(observe).toHaveBeenCalledWith(host); pointer(host); time.step(); host.remove(); time.step(); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); expect(visual.style.willChange).toBe(''); controller.destroy(); expect(disconnect).toHaveBeenCalledOnce();
  });
  it('responds immediately to document visibility/window blur and leaves late events inert after teardown', () => {
    const time = clock(); media(); const { host, visual, controller } = fixture(); pointer(host); time.step(); window.dispatchEvent(new Event('blur')); expect(time.frames.size).toBe(0); pointer(host); time.step(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); expect(time.frames.size).toBe(0); expect(visual.style.transform).toBe(''); controller.destroy(); controller.destroy(); pointer(host); window.dispatchEvent(new Event('resize')); expect(time.frames.size).toBe(0); expect(visual.hasAttribute('style')).toBe(false);
  });
  it('validates noninteractive dedicated markup before mutation and during host refresh', () => {
    clock(); media(); const { host, visual, controller } = fixture(); expect(() => attachGlassTilt(host, visual)).toThrow('unowned'); controller.destroy();
    for (const markup of ['<button>Bad</button>', '<a href="/">Bad</a>', '<span tabindex="-1">Bad</span>', '<video controls></video>', '<div contenteditable="true">Bad</div>']) { visual.innerHTML = markup; expect(() => attachGlassTilt(host, visual)).toThrow('noninteractive'); expect(visual.style.transform).toBe(''); }
    visual.textContent = 'Valid visual'; const next = attachGlassTilt(host, visual); controllers.push(next); visual.append(document.createElement('input')); expect(() => next.refresh()).toThrow('noninteractive'); expect(visual.style.transform).toBe(''); pointer(host); expect(visual.style.transform).toBe('');
  });
});
