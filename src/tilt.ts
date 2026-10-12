import { bounded } from './numeric.js';
import { listen } from './lifecycle.js';
import { createGlassSpring, resolveGlassSpring } from './motion.js';
import type { GlassSpringOptions } from './motion.js';

export interface GlassTiltOptions extends GlassSpringOptions {
  /** Maximum projected rotation per axis, 0–15 degrees. Default8. */
  maxAngle?: number;
  /** One visual plane's positive translateZ, 0–32px. Default8. */
  maxDepth?: number;
  /** Transform projection distance, 400–1600px. Default900. */
  perspective?: number;
  /** Combines with live system reduction; false cannot override the OS. */
  reducedMotion?: boolean;
}
export interface GlassTilt {
  refresh(): void;
  update(options?: GlassTiltOptions): void;
  destroy(): void;
}
type StyleLease = { value: string; priority: string; owns(): boolean; write(value: string, priority?: string): boolean; restore(): void };
function style(element: HTMLElement, key: string): StyleLease {
  const value = element.style.getPropertyValue(key), priority = element.style.getPropertyPriority(key); let ownedValue = value, ownedPriority = priority, lost = false;
  const owns = () => !lost && element.style.getPropertyValue(key) === ownedValue && element.style.getPropertyPriority(key) === ownedPriority;
  return { value, priority, owns, write(next, importance = '') { if (!owns()) { lost = true; return false; } if (next !== ownedValue || importance !== ownedPriority) { next ? element.style.setProperty(key, next, importance) : element.style.removeProperty(key); ownedValue = element.style.getPropertyValue(key); ownedPriority = element.style.getPropertyPriority(key); } return true; }, restore() { if (owns()) value ? element.style.setProperty(key, value, priority) : element.style.removeProperty(key); } };
}
const attached = new WeakSet<HTMLElement>();
const controls = 'button,a[href],input,select,textarea,summary,iframe,object,embed,audio[controls],video[controls],[tabindex],[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="slider"],[role="tab"]';
const resolve = (input: GlassTiltOptions) => ({ ...resolveGlassSpring(input), maxAngle: bounded(input.maxAngle, 8, 0, 15), maxDepth: bounded(input.maxDepth, 8, 0, 32), perspective: bounded(input.perspective, 900, 400, 1600), reducedMotion: Boolean(input.reducedMotion) });

/**
 * Independently authored bounded projection on one dedicated direct visual child.
 * The visual must contain no interactive/focusable content. Native controls belong
 * on the stable host or outside the visual. Reserve transform and its timing;
 * do not add a competing CSS transform transition. Prior inline transform/priority
 * is retained at rest and restored on teardown; an external inline owner stops us.
 * Fine hover only, no sensors/pointer capture/light tracking/roles/tabindex. Focus,
 * presses/touch and OS reductions stay neutral. Pointer events on the visual are
 * suppressed only while projected, keeping its pixels from expanding the hit area.
 * Scrolling clears hover; deliberately reenter to measure its new viewport bounds.
 * This is one plane, not a promise that isolation/filter preserves layered 3D.
 * Keep fixed overlays outside the projected subtree. No free GPU/compositing claim.
 */
export function attachGlassTilt(host: HTMLElement, visual: HTMLElement, initial: GlassTiltOptions = {}): GlassTilt {
  const doc = host?.ownerDocument, view = doc?.defaultView;
  if (!view || !host.isConnected || visual?.ownerDocument !== doc || visual.parentElement !== host || attached.has(visual)) throw new Error('Use a connected stable host with one unowned direct visual child');
  const browser = view;
  function validate() { if (visual.matches(controls) || visual.querySelector(controls)) throw new RangeError('Tilt visual content must be noninteractive and not focusable'); }
  validate();
  let options = resolve(initial), destroyed = false, abandoned = false, inside = false, handlingPointer = false, structureValid = true;
  let point: { x: number; y: number } | null = null, bounds: { left: number; top: number; width: number; height: number } | null = null;
  const transform = style(visual, 'transform'), pointerEvents = style(visual, 'pointer-events'), hadStyle = visual.hasAttribute('style');
  const reducedMedia = browser.matchMedia?.('(prefers-reduced-motion: reduce)'), fine = browser.matchMedia?.('(any-hover: hover) and (any-pointer: fine)');
  const reduced = () => options.reducedMotion || Boolean(reducedMedia?.matches);
  const connected = () => !destroyed && !abandoned && host.isConnected && visual.parentElement === host && visual.isConnected && transform.owns() && pointerEvents.owns();
  const eligible = () => connected() && structureValid && !doc.hidden && !reduced() && Boolean(fine?.matches) && !host.matches(':disabled,[aria-disabled="true"]') && !host.closest('[hidden],[inert]') && !host.contains(doc.activeElement);
  function neutralStyles() { transform.write(transform.value, transform.priority); pointerEvents.write(pointerEvents.value, pointerEvents.priority); }
  function relinquish() { abandoned = true; inside = false; point = null; bounds = null; transform.restore(); pointerEvents.restore(); }
  function render(values: readonly number[]) {
    if (handlingPointer || destroyed || abandoned) return;
    if (!transform.owns() || !pointerEvents.owns()) { relinquish(); return; }
    const x = bounded(values[0], 0, -options.maxAngle, options.maxAngle), y = bounded(values[1], 0, -options.maxAngle, options.maxAngle), z = bounded(values[2], 0, 0, options.maxDepth);
    if (Math.abs(x) < .0001 && Math.abs(y) < .0001 && z < .0001) { neutralStyles(); return; }
    const base = transform.value && transform.value !== 'none' ? ` ${transform.value}` : '';
    transform.write(`perspective(${options.perspective}px) rotateX(${x.toFixed(4)}deg) rotateY(${y.toFixed(4)}deg) translateZ(${z.toFixed(4)}px)${base}`); pointerEvents.write('none');
  }
  const spring = createGlassSpring(browser, [0, 0, 0], options, render, completed => {
    if (!completed && !destroyed && !abandoned) { inside = false; point = null; bounds = null; if (!transform.owns() || !pointerEvents.owns()) relinquish(); else neutralStyles(); }
  }, connected);
  function neutral(immediate = true) { inside = false; point = null; if (immediate || !connected()) spring.reset([0, 0, 0]); else spring.target([0, 0, 0]); }
  function measure() {
    if (!connected() || doc.hidden) { bounds = null; return; }
    const style = browser.getComputedStyle(host);
    if (style.display === 'none' || style.visibility === 'hidden') { bounds = null; return; }
    const rect = host.getBoundingClientRect(); bounds = rect.width > 0 && rect.height > 0 ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
  }
  function retarget(fromPointer = false) {
    if (!transform.owns() || !pointerEvents.owns()) { relinquish(); spring.stop(); return; }
    if (!eligible() || !inside || !point || !bounds) { neutral(); return; }
    const x = Math.max(-1, Math.min(1, (point.x - bounds.left) / bounds.width * 2 - 1)), y = Math.max(-1, Math.min(1, (point.y - bounds.top) / bounds.height * 2 - 1));
    // The shared spring is the sole animation loop for all three values. Suppress
    // its immediate target sample on pointer packets; only its frame paints them.
    handlingPointer = fromPointer; try { spring.target([-y * options.maxAngle, x * options.maxAngle, options.maxDepth]); } finally { handlingPointer = false; }
  }
  const pointer = (event: PointerEvent) => event.isPrimary !== false && (event.pointerType === 'mouse' || event.pointerType === 'pen') && !(event.buttons > 0) && Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && !event.defaultPrevented;
  const enter = (event: PointerEvent) => { if (event.target !== host || !pointer(event) || !eligible()) return; measure(); inside = true; point = { x: event.clientX, y: event.clientY }; retarget(true); };
  const move = (event: PointerEvent) => {
    if (!inside || abandoned || destroyed) return;
    const target = event.target instanceof browser.Element ? event.target.closest(controls) : null;
    if (!pointer(event) || !eligible() || (target && target !== host && host.contains(target))) { neutral(); return; }
    point = { x: event.clientX, y: event.clientY }; retarget(true);
  };
  const leave = (event: PointerEvent) => { if (event.target === host) neutral(false); };
  const press = () => neutral();
  const focus = () => neutral();
  const blur = () => neutral();
  const scrolled = () => { bounds = null; neutral(); };
  const resized = () => { if (destroyed || abandoned) return; measure(); if (inside) retarget(); };
  const preference = () => { if (!eligible()) neutral(); };
  const visibility = () => { if (doc.hidden) { bounds = null; neutral(); } };
  const Resize = (browser as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(resized) : undefined;
  const unlisten = listen([
    [host, 'pointerenter', enter as EventListener, { passive: true }], [host, 'pointermove', move as EventListener, { passive: true }], [host, 'pointerleave', leave as EventListener, { passive: true }],
    [host, 'pointerdown', press, { passive: true }], [host, 'pointercancel', press, { passive: true }], [host, 'focusin', focus], [host, 'keydown', focus],
    [browser, 'blur', blur], [browser, 'resize', resized], [browser, 'scroll', scrolled, { capture: true, passive: true }], [doc, 'visibilitychange', visibility],
  ]);
  attached.add(visual); observer?.observe(host); reducedMedia?.addEventListener('change', preference); fine?.addEventListener('change', preference);
  return {
    refresh() { if (destroyed || abandoned) return; try { validate(); structureValid = true; } catch (error) { structureValid = false; neutral(); throw error; } measure(); if (inside) retarget(); },
    update(next = {}) { if (destroyed || abandoned) return; options = resolve(next); spring.configure(options); if (!eligible()) neutral(); else if (inside) retarget(); },
    destroy() {
      if (destroyed) return; destroyed = true; spring.stop(); observer?.disconnect(); unlisten(); reducedMedia?.removeEventListener('change', preference); fine?.removeEventListener('change', preference); attached.delete(visual);
      transform.restore(); pointerEvents.restore(); if (!hadStyle && !visual.getAttribute('style')) visual.removeAttribute('style');
    },
  };
}
