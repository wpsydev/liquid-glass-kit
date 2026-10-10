import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachGlassOverlay } from '../src/overlay.js';

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let resizeCallback: ResizeObserverCallback;
let observed: Set<Element>;
let disconnect: ReturnType<typeof vi.fn>;

const rect = (left: number, top: number, width: number, height: number) => ({
  left, top, width, height, right: left + width, bottom: top + height,
  x: left, y: top, toJSON: () => ({}),
}) as DOMRect;
const flush = () => {
  const pending = [...frames.values()]; frames.clear();
  for (const callback of pending) callback(0);
};

function fixture(anchorRect = rect(100, 100, 120, 40), width = 200, height = 160) {
  const wrapper = document.createElement('div');
  const anchor = document.createElement('button'); anchor.textContent = 'Open options';
  const overlay = document.createElement('div');
  overlay.innerHTML = '<label>Filter <input aria-label="Filter"></label><button>Apply</button>';
  wrapper.append(anchor, overlay); document.body.append(wrapper);
  let currentAnchor = anchorRect;
  const anchorGeometry = vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(() => currentAnchor);
  const overlayGeometry = vi.spyOn(overlay, 'getBoundingClientRect').mockImplementation(() => {
    const requestedWidth = overlay.style.width.endsWith('px') ? Number.parseFloat(overlay.style.width) : width;
    const maxWidth = Number.parseFloat(overlay.style.maxWidth) || Infinity;
    const maxHeight = Number.parseFloat(overlay.style.maxHeight) || Infinity;
    return rect(0, 0, Math.min(requestedWidth, maxWidth), Math.min(height, maxHeight));
  });
  vi.spyOn(anchor, 'getClientRects').mockImplementation(() => anchor.hidden ? [] as unknown as DOMRectList : [currentAnchor] as unknown as DOMRectList);
  vi.spyOn(overlay, 'getClientRects').mockImplementation(() => overlay.hidden ? [] as unknown as DOMRectList : [rect(0, 0, width, height)] as unknown as DOMRectList);
  return { wrapper, anchor, overlay, anchorGeometry, overlayGeometry, setAnchor: (value: DOMRect) => { currentAnchor = value; } };
}

beforeEach(() => {
  frames = new Map(); nextFrame = 0; observed = new Set(); disconnect = vi.fn(() => observed.clear());
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = ++nextFrame; frames.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  vi.stubGlobal('innerWidth', 800); vi.stubGlobal('innerHeight', 600);
  vi.stubGlobal('visualViewport', undefined);
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
    observe(element: Element) { observed.add(element); }
    unobserve(element: Element) { observed.delete(element); }
    disconnect = disconnect;
  });
});
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('anchored overlay geometry', () => {
  it('flips a popover near the bottom while keeping its real controls and focus intact', () => {
    const { anchor, overlay } = fixture(rect(100, 550, 120, 40), 200, 200);
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-label', 'Options');
    const input = overlay.querySelector('input')!; input.focus();
    const click = vi.fn(); overlay.querySelector('button')!.addEventListener('click', click);
    const controller = attachGlassOverlay(anchor, overlay, { placement: 'bottom', align: 'start', gap: 8, padding: 12 });
    expect(overlay.getAttribute('data-lg-overlay-placement')).toBe('top');
    expect(overlay.style.left).toBe('100px'); expect(overlay.style.top).toBe('342px');
    expect(overlay.style.position).toBe('fixed'); expect(overlay.style.margin).toBe('0px');
    expect(overlay.style.maxHeight).toBe('530px');
    expect(overlay.style.getPropertyValue('--lg-overlay-origin')).not.toBe('');
    expect(overlay.style.transformOrigin).not.toBe('');
    expect(document.activeElement).toBe(input);
    expect(overlay.getAttribute('role')).toBe('dialog'); expect(overlay.getAttribute('aria-label')).toBe('Options');
    expect(overlay.hasAttribute('aria-hidden')).toBe(false); expect(overlay.hasAttribute('inert')).toBe(false);
    expect(anchor.hasAttribute('aria-expanded')).toBe(false);
    overlay.querySelector('button')!.click(); expect(click).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it('aligns a requested top overlay with the trigger’s end and flips back when only the bottom fits', () => {
    const { anchor, overlay, setAnchor } = fixture(rect(500, 300, 120, 40), 200, 160);
    const controller = attachGlassOverlay(anchor, overlay, { placement: 'top', align: 'end', gap: 10, padding: 12 });
    expect(overlay.getAttribute('data-lg-overlay-placement')).toBe('top');
    expect(overlay.style.left).toBe('420px'); expect(overlay.style.top).toBe('130px');
    setAnchor(rect(500, 20, 120, 40)); controller.refresh();
    expect(overlay.getAttribute('data-lg-overlay-placement')).toBe('bottom');
    expect(overlay.style.left).toBe('420px'); expect(overlay.style.top).toBe('70px');
    controller.destroy();
  });

  it('constrains a large overlay to the visible viewport and keeps its contents internally scrollable', () => {
    const viewport = Object.assign(new EventTarget(), { offsetLeft: 30, offsetTop: 100, width: 320, height: 300 });
    vi.stubGlobal('visualViewport', viewport);
    const { anchor, overlay } = fixture(rect(320, 200, 20, 40), 500, 500);
    const controller = attachGlassOverlay(anchor, overlay, { placement: 'bottom', align: 'center', gap: 8, padding: 12 });
    expect(overlay.style.maxWidth).toBe('296px'); expect(overlay.style.maxHeight).toBe('140px');
    expect(overlay.style.left).toBe('42px'); expect(overlay.style.top).toBe('248px');
    expect(overlay.style.overflow).toBe('auto'); expect(overlay.style.boxSizing).toBe('border-box');
    // The virtual keyboard shrinks the visual viewport; its resize event must update placement.
    viewport.height = 180; viewport.dispatchEvent(new Event('resize')); flush();
    expect(overlay.getAttribute('data-lg-overlay-placement')).toBe('top');
    expect(overlay.style.maxHeight).toBe('80px'); expect(overlay.style.top).toBe('112px');
    viewport.offsetLeft = 50; viewport.dispatchEvent(new Event('scroll')); flush();
    expect(overlay.style.left).toBe('62px');
    controller.destroy();
  });

  it('can match a trigger width and restores the application’s width when replacement options omit it', () => {
    const { anchor, overlay } = fixture(rect(200, 150, 130, 40), 220, 100);
    overlay.style.setProperty('width', '220px', 'important');
    const controller = attachGlassOverlay(anchor, overlay, { matchWidth: true, align: 'end', gap: 0, padding: 0 });
    expect(overlay.style.width).toBe('130px'); expect(overlay.style.left).toBe('200px');
    controller.update({ align: 'end', gap: 0, padding: 0 });
    expect(overlay.style.width).toBe('220px'); expect(overlay.style.getPropertyPriority('width')).toBe('important');
    expect(overlay.style.left).toBe('110px');
    controller.destroy();
    const second = attachGlassOverlay(anchor, overlay, { gap: 0, padding: 0 });
    expect(overlay.style.width).toBe('220px'); second.destroy();
  });

  it('measures intrinsic content before edge placement so fit-content popovers do not collapse', () => {
    const { anchor, overlay, overlayGeometry } = fixture(rect(750, 100, 40, 40), 200, 100);
    overlay.style.width = 'fit-content'; overlay.style.left = '760px';
    // Model shrink-to-fit width: measuring at the previous edge location leaves only 28px.
    overlayGeometry.mockImplementation(() => rect(0, 0, Math.min(200, 788 - Number.parseFloat(overlay.style.left)), 100));
    const controller = attachGlassOverlay(anchor, overlay, { gap: 8, padding: 12 });
    expect(overlay.style.width).toBe('fit-content'); expect(overlay.style.left).toBe('588px');
    controller.refresh(); expect(overlay.style.left).toBe('588px');
    controller.destroy(); expect(overlay.style.left).toBe('760px');
  });

  it('bounds hostile spacing values without placing controls outside the viewport', () => {
    const { anchor, overlay } = fixture(rect(300, 250, 80, 40), 100, 40);
    const controller = attachGlassOverlay(anchor, overlay, { gap: 999, padding: 999, align: 'start' });
    expect(overlay.style.maxWidth).toBe('544px');
    expect(overlay.style.top).toBe('418px'); expect(overlay.style.maxHeight).toBe('54px');
    controller.update({ gap: -10, padding: -20, align: 'start' });
    expect(overlay.style.maxWidth).toBe('800px'); expect(overlay.style.top).toBe('290px');
    controller.destroy();
  });

  it('respects RTL start/end alignment without using the overlay’s animated scale as its layout size', () => {
    const { anchor, overlay, overlayGeometry } = fixture(rect(500, 300, 120, 40), 200, 160);
    anchor.style.direction = 'rtl'; overlay.style.scale = '0.5';
    Object.defineProperties(overlay, {
      offsetWidth: { value: 200, configurable: true }, offsetHeight: { value: 160, configurable: true },
    });
    overlayGeometry.mockReturnValue(rect(0, 0, 100, 80));
    const controller = attachGlassOverlay(anchor, overlay, { placement: 'top', align: 'start', gap: 8, padding: 12 });
    expect(overlay.style.left).toBe('420px'); expect(overlay.style.top).toBe('132px');
    expect(overlay.style.scale).toBe('0.5');
    controller.update({ placement: 'top', align: 'end', gap: 8, padding: 12 });
    expect(overlay.style.left).toBe('500px'); expect(overlay.style.top).toBe('132px');
    controller.destroy(); expect(overlay.style.scale).toBe('0.5');
  });

  it('coalesces layout events and handles immediate refresh without swallowing native input', () => {
    const { wrapper, anchor, overlay, setAnchor } = fixture();
    const controller = attachGlassOverlay(anchor, overlay, { gap: 8, padding: 12 });
    expect(observed.has(anchor)).toBe(true); expect(observed.has(overlay)).toBe(true);
    setAnchor(rect(250, 200, 120, 40));
    wrapper.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize'));
    overlay.dispatchEvent(new Event('toggle')); resizeCallback([], {} as ResizeObserver);
    expect(frames.size).toBe(1); expect(overlay.style.left).toBe('100px');
    flush(); expect(overlay.style.left).toBe('250px'); expect(overlay.style.top).toBe('248px');
    setAnchor(rect(280, 220, 120, 40)); controller.refresh();
    expect(overlay.style.left).toBe('280px'); expect(overlay.style.top).toBe('268px');
    const key = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    overlay.querySelector('input')!.dispatchEvent(key); expect(key.defaultPrevented).toBe(false);
    controller.destroy();
  });

  it('ignores hidden or detached geometry and resumes when the application shows the overlay', () => {
    const { anchor, overlay, setAnchor } = fixture();
    const controller = attachGlassOverlay(anchor, overlay, { gap: 8, padding: 12 });
    const previousTop = overlay.style.top;
    overlay.hidden = true; setAnchor(rect(250, 200, 120, 40)); controller.refresh();
    expect(overlay.hidden).toBe(true); expect(overlay.style.top).toBe(previousTop);
    overlay.hidden = false; overlay.dispatchEvent(new Event('toggle')); flush();
    expect(overlay.style.top).toBe('248px');
    anchor.remove(); setAnchor(rect(400, 400, 120, 40)); controller.refresh();
    expect(overlay.style.left).toBe('250px');
    document.body.append(anchor); controller.refresh(); expect(overlay.style.left).toBe('400px');
    overlay.remove(); controller.refresh(); expect(overlay.isConnected).toBe(false);
    controller.destroy();
  });

  it('restores owned styles with their priorities and cancels every future callback after destroy', () => {
    const viewport = Object.assign(new EventTarget(), { offsetLeft: 0, offsetTop: 0, width: 800, height: 600 });
    vi.stubGlobal('visualViewport', viewport);
    const { anchor, overlay } = fixture();
    const owned = {
      position: 'absolute', inset: '3px', margin: '7px', 'box-sizing': 'content-box', overflow: 'hidden',
      left: '11px', top: '13px', width: '170px', 'max-width': '710px', 'max-height': '500px',
      'transform-origin': '10% 20%', '--lg-overlay-origin': 'original', 'min-width': '90px', 'min-height': '70px',
      'position-anchor': '--application-trigger', 'position-area': 'bottom', 'position-try-fallbacks': 'flip-block',
    };
    for (const [property, value] of Object.entries(owned)) overlay.style.setProperty(property, value, 'important');
    overlay.style.setProperty('opacity', '0.8'); overlay.style.setProperty('scale', '0.95');
    overlay.setAttribute('data-lg-overlay-placement', 'application'); overlay.setAttribute('popover', 'manual');
    overlay.setAttribute('role', 'dialog');
    const controller = attachGlassOverlay(anchor, overlay, { matchWidth: true, gap: 8, padding: 12 });
    expect(overlay.style.getPropertyValue('position-anchor')).toBe('auto');
    expect(overlay.style.getPropertyValue('position-area')).toBe('none');
    expect(overlay.style.getPropertyValue('position-try-fallbacks')).toBe('none');
    expect(overlay.style.minWidth).toBe('0px'); expect(overlay.style.minHeight).toBe('0px');
    window.dispatchEvent(new Event('resize')); expect(frames.size).toBe(1);
    const staleCallbacks = [...frames.values()]; controller.destroy(); controller.destroy();
    controller.refresh(); controller.update({ gap: 90 }); staleCallbacks.forEach(callback => callback(0));
    resizeCallback([], {} as ResizeObserver); viewport.dispatchEvent(new Event('resize'));
    viewport.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize'));
    anchor.dispatchEvent(new Event('scroll')); overlay.dispatchEvent(new Event('toggle')); flush();
    expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledOnce(); expect(observed.size).toBe(0);
    for (const [property, value] of Object.entries(owned)) {
      expect(overlay.style.getPropertyValue(property), property).toBe(value);
      expect(overlay.style.getPropertyPriority(property), property).toBe('important');
    }
    expect(overlay.style.opacity).toBe('0.8'); expect(overlay.style.getPropertyValue('scale')).toBe('0.95');
    expect(overlay.getAttribute('data-lg-overlay-placement')).toBe('application');
    expect(overlay.getAttribute('popover')).toBe('manual'); expect(overlay.getAttribute('role')).toBe('dialog');
    const clean = document.createElement('div'); document.body.append(clean);
    vi.spyOn(clean, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 100));
    vi.spyOn(clean, 'getClientRects').mockReturnValue([rect(0, 0, 100, 100)] as unknown as DOMRectList);
    const second = attachGlassOverlay(anchor, clean); second.destroy();
    expect(clean.hasAttribute('data-lg-overlay-placement')).toBe(false);
    expect(clean.style.getPropertyValue('--lg-overlay-origin')).toBe(''); expect(clean.style.position).toBe('');
  });

  it('rejects the same element and cross-document elements before changing application state', () => {
    const { anchor, overlay } = fixture();
    anchor.style.position = 'relative'; overlay.style.left = '9px';
    expect(() => attachGlassOverlay(anchor, anchor)).toThrow();
    const elsewhere = document.implementation.createHTMLDocument('Other document').createElement('div');
    elsewhere.style.position = 'relative';
    expect(() => attachGlassOverlay(anchor, elsewhere)).toThrow();
    expect(anchor.style.position).toBe('relative'); expect(anchor.hasAttribute('data-lg-overlay-placement')).toBe(false);
    expect(overlay.style.left).toBe('9px'); expect(elsewhere.style.position).toBe('relative');
    overlay.append(anchor);
    expect(() => attachGlassOverlay(anchor, overlay)).toThrow();
    expect(overlay.style.left).toBe('9px'); expect(overlay.hasAttribute('data-lg-overlay-placement')).toBe(false);
    expect(observed.size).toBe(0); expect(frames.size).toBe(0);
  });

  it('restores partial margin and overflow declarations without losing differing priorities', () => {
    const { anchor, overlay } = fixture();
    overlay.style.setProperty('margin-left', '21px', 'important');
    overlay.style.setProperty('overflow-x', 'hidden', 'important');
    overlay.style.setProperty('overflow-y', 'scroll');
    const controller = attachGlassOverlay(anchor, overlay, { gap: 8, padding: 12 });
    expect(overlay.style.marginLeft).toBe('0px');
    controller.destroy();
    expect(overlay.style.marginLeft).toBe('21px');
    expect(overlay.style.getPropertyPriority('margin-left')).toBe('important');
    expect(overlay.style.marginTop).toBe(''); expect(overlay.style.marginRight).toBe(''); expect(overlay.style.marginBottom).toBe('');
    expect(overlay.style.overflowX).toBe('hidden'); expect(overlay.style.getPropertyPriority('overflow-x')).toBe('important');
    expect(overlay.style.overflowY).toBe('scroll'); expect(overlay.style.getPropertyPriority('overflow-y')).toBe('');
    expect(overlay.style.overflow).toBe('');
  });

  it('neutralizes logical inset and margin rules while attached, then restores authored longhands', () => {
    const { anchor, overlay } = fixture();
    const logical = [
      ['inset-inline-start', '25px', 'important'],
      ['inset-block-end', '33px', ''],
      ['margin-inline-start', '17px', 'important'],
      ['margin-block-end', '9px', ''],
    ] as const;
    for (const [property, value, priority] of logical) overlay.style.setProperty(property, value, priority);
    const controller = attachGlassOverlay(anchor, overlay, { gap: 8, padding: 12 });
    expect(overlay.style.getPropertyValue('inset-inline')).toBe('auto');
    expect(overlay.style.getPropertyValue('inset-block')).toBe('auto');
    expect(overlay.style.getPropertyValue('margin-inline')).toBe('0px');
    expect(overlay.style.getPropertyValue('margin-block')).toBe('0px');
    expect(overlay.style.getPropertyPriority('inset-inline-start')).toBe('');
    expect(overlay.style.getPropertyPriority('margin-inline-start')).toBe('');
    controller.destroy();
    for (const [property, value, priority] of logical) {
      expect(overlay.style.getPropertyValue(property), property).toBe(value);
      expect(overlay.style.getPropertyPriority(property), property).toBe(priority);
    }
    expect(overlay.style.getPropertyValue('inset-inline')).toBe('');
    expect(overlay.style.getPropertyValue('inset-block')).toBe('');
    expect(overlay.style.getPropertyValue('margin-inline')).toBe('');
    expect(overlay.style.getPropertyValue('margin-block')).toBe('');
  });
});
