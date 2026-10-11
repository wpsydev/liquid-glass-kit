import { bounded } from './numeric.js';
import { captureState, listen } from './lifecycle.js';
import { createGlassSpring, resolveGlassSpring } from './motion.js';
import type { GlassSpringOptions } from './motion.js';

export interface GlassDockOptions extends GlassSpringOptions {
  /** Maximum proximity scale, clamped to 1–2.25. Default 1.65. */
  maxScale?: number;
  /** Proximity radius in CSS pixels, clamped to 24–360. Default 120. */
  radius?: number;
  /** Visual lift in CSS pixels, clamped to 0–48. Default 18. */
  lift?: number;
  /** Horizontal lifts up; vertical lifts right. Default horizontal. */
  orientation?: 'horizontal' | 'vertical';
  /** Disables scale and lift, combined with the live system preference. */
  reducedMotion?: boolean;
}

type Item = { target: HTMLElement; visual: HTMLElement; center: number; available: boolean; restore: () => void };
type Point = { x: number; y: number };
const fields = ['--lg-dock-scale', '--lg-dock-x', '--lg-dock-y'] as const;
const resolve = (options: GlassDockOptions) => ({
  ...resolveGlassSpring(options), maxScale: bounded(options.maxScale, 1.65, 1, 2.25),
  radius: bounded(options.radius, 120, 24, 360), lift: bounded(options.lift, 18, 0, 48),
  orientation: options.orientation === 'vertical' ? 'vertical' : 'horizontal',
  reducedMotion: options.reducedMotion ?? false,
});

/**
 * Proximity presentation for existing native links/buttons; no activation,
 * keyboard-navigation, role, selection or focus policy is supplied. Each direct
 * data-lg-dock-item child needs one direct data-lg-dock-visual child. Reserve
 * individual scale/translate on that noninteractive visual layer; import /dock.css.
 * Geometry is cached between resize, scroll and refresh. Call refresh after item
 * membership, disabled state or host layout changes. Updates replace all options.
 */
export function attachGlassDock(container: HTMLElement, initial: GlassDockOptions = {}) {
  const view = container.ownerDocument.defaultView;
  if (!view) throw new Error('Glass dock requires an element in a browser document');
  const springWindow: Window = view;
  let options = resolve(initial), items: Item[] = [], destroyed = false;
  let frame: number | null = null, dirty = true;
  let pointer: Point | null = null, focused: HTMLElement | null = null;
  let touchSuppressed = false, keyboardFocus = true;
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => options.reducedMotion || Boolean(media?.matches);
  const neutral = () => items.flatMap(() => [1, 0]);
  const connected = () => !destroyed && container.isConnected && items.every(item =>
    item.target.parentElement === container && item.visual.parentElement === item.target);
  const render = (values: readonly number[]) => {
    if (destroyed) return;
    items.forEach((item, index) => {
      const scale = Math.max(1, Math.min(options.maxScale, values[index * 2]));
      const lift = Math.max(0, Math.min(options.lift, values[index * 2 + 1]));
      item.visual.style.setProperty('--lg-dock-scale', String(scale));
      item.visual.style.setProperty('--lg-dock-x', `${options.orientation === 'vertical' ? lift : 0}px`);
      item.visual.style.setProperty('--lg-dock-y', `${options.orientation === 'horizontal' ? -lift : 0}px`);
    });
  };
  let spring = createGlassSpring(view, [], options, render, () => {}, connected);
  const measure = () => {
    dirty = false;
    for (const item of items) {
      const rect = item.target.getBoundingClientRect();
      item.center = options.orientation === 'horizontal' ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      item.available = rect.width > 0 && rect.height > 0 && !item.target.matches(':disabled, [aria-disabled="true"], [hidden]');
    }
  };
  const cancel = () => { if (frame !== null) view.cancelAnimationFrame(frame); frame = null; };
  const settle = () => { cancel(); spring.reset(neutral()); };
  const retarget = () => {
    if (!connected()) { spring.stop(); return; }
    if (reduced() || container.ownerDocument.hidden) { settle(); return; }
    if (dirty) measure();
    const focus = keyboardFocus && !touchSuppressed ? items.find(item => item.target === focused && item.available) : undefined;
    const position = pointer ? options.orientation === 'horizontal' ? pointer.x : pointer.y : focus?.center;
    const values = items.flatMap(item => {
      const distance = position === undefined ? Infinity : Math.abs(item.center - position);
      const weight = item.available && distance < options.radius && !reduced() ? (1 + Math.cos(Math.PI * distance / options.radius)) / 2 : 0;
      return [1 + (options.maxScale - 1) * weight, options.lift * weight];
    });
    spring.target(values, reduced());
  };
  const schedule = () => {
    if (destroyed || frame !== null) return;
    if (reduced() || container.ownerDocument.hidden) { settle(); return; }
    frame = view.requestAnimationFrame(() => { frame = null; retarget(); });
  };
  const invalidate = () => { dirty = true; schedule(); };
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(invalidate) : undefined;

  function refresh() {
    if (destroyed) return;
    // Validate the complete replacement before touching the current attachment.
    const targets = Array.from(container.children).filter(node => node.hasAttribute('data-lg-dock-item'));
    const next = targets.map(target => {
      if (!target.matches('button, a[href]')) throw new RangeError('Glass dock items must be native buttons or links');
      const visuals = Array.from(target.children).filter(node => node.hasAttribute('data-lg-dock-visual'));
      if (visuals.length !== 1 || visuals[0].matches('button, a[href], input, select, textarea, [tabindex], [contenteditable]') ||
        visuals[0].querySelector('button, a[href], input, select, textarea, [tabindex], [contenteditable]')) {
        throw new RangeError('Each glass dock item needs one direct noninteractive data-lg-dock-visual child');
      }
      return { target: target as HTMLElement, visual: visuals[0] as HTMLElement };
    });
    cancel(); spring.stop(); observer?.disconnect();
    items.forEach(item => item.restore());
    items = next.map(({ target, visual }) => {
      const hadClass = visual.hasAttribute('class'), hadStyle = visual.hasAttribute('style');
      const restoreFields = captureState(visual, fields, [], 'lg-dock-visual');
      const restore = () => {
        restoreFields();
        if (!hadClass && !visual.getAttribute('class')) visual.removeAttribute('class');
        if (!hadStyle && !visual.getAttribute('style')) visual.removeAttribute('style');
      };
      visual.classList.add('lg-dock-visual');
      return { target, visual, restore, center: 0, available: false };
    });
    // Spring vector dimensions are fixed for its lifetime; membership refresh
    // gets one new runner rather than reusing mismatched velocity dimensions.
    spring = createGlassSpring(springWindow, neutral(), options, render, () => {}, connected);
    observer?.observe(container); items.forEach(item => observer?.observe(item.target));
    focused = items.find(item => item.target === container.ownerDocument.activeElement ||
      item.target.contains(container.ownerDocument.activeElement))?.target ?? null;
    dirty = true; spring.reset(neutral()); retarget();
  }

  const move = (event: PointerEvent) => {
    if (event.isPrimary === false || event.pointerType === 'touch' || event.buttons > 0 ||
      !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    touchSuppressed = false; pointer = { x: event.clientX, y: event.clientY }; schedule();
  };
  const leave = () => { pointer = null; schedule(); };
  const down = (event: PointerEvent) => {
    keyboardFocus = false;
    if (event.pointerType === 'touch') { touchSuppressed = true; pointer = null; settle(); }
  };
  const focus = (event: FocusEvent) => {
    focused = items.find(item => item.target === event.target || item.target.contains(event.target as Node))?.target ?? null;
    schedule();
  };
  const unfocus = (event: FocusEvent) => {
    focused = items.find(item => item.target === event.relatedTarget || item.target.contains(event.relatedTarget as Node))?.target ?? null;
    schedule();
  };
  const key = () => { keyboardFocus = true; touchSuppressed = false; pointer = null; schedule(); };
  const blur = () => { pointer = null; focused = null; settle(); };
  const visibility = () => { if (container.ownerDocument.hidden) blur(); else invalidate(); };
  const preference = () => { if (reduced()) settle(); else invalidate(); };

  // A malformed initial attachment leaves no listeners or altered styles behind.
  refresh();
  const unlisten = listen([
    [container, 'pointermove', move as EventListener, { passive: true }],
    [container, 'pointerleave', leave], [container, 'pointercancel', leave],
    [container, 'pointerdown', down as EventListener, { passive: true }],
    [container, 'focusin', focus as EventListener], [container, 'focusout', unfocus as EventListener],
    [container, 'keydown', key], [view, 'blur', blur], [view, 'resize', invalidate],
    [view, 'scroll', invalidate, { capture: true, passive: true }],
    [container.ownerDocument, 'visibilitychange', visibility],
  ]);
  media?.addEventListener('change', preference);
  return {
    refresh,
    update(next: GlassDockOptions = {}) {
      if (destroyed) return;
      options = resolve(next); spring.configure(options); dirty = true;
      if (reduced() || container.ownerDocument.hidden) settle(); else retarget();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; cancel(); spring.stop(); observer?.disconnect(); unlisten();
      media?.removeEventListener('change', preference);
      items.forEach(item => item.restore()); items = [];
    },
  };
}
