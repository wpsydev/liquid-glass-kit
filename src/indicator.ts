import { bounded } from './numeric.js';
import { createGlassSpring, resolveGlassSpring } from './motion.js';
import type { GlassSpringOptions } from './motion.js';
import { captureState, listen } from './lifecycle.js';

export interface GlassIndicatorOptions extends GlassSpringOptions {
  /** Geometry transition duration in milliseconds, clamped to 0–1000. */
  duration?: number;
  /** Decorative backing corner radius in CSS pixels, clamped to 0–999. */
  radius?: number;
  /** Ease is the compatible default; spring retains geometry velocity when retargeted. */
  motion?: 'ease' | 'spring';
  /** Explicit application preference; combines with the system preference. */
  reducedMotion?: boolean;
}


/**
 * Moves one decorative backing between semantic targets. This is a geometry
 * transition, not optical shape merging. Attach the material to backing separately.
 * Backing must be empty and a direct child of an untransformed container whose targets
 * share its CSS coordinate scale.
 * Invalid target ancestry throws RangeError, including a removed target passed
 * to moveTo. Null or a previously selected target becoming disconnected hides
 * the backing on the next geometry refresh.
 */
export function attachGlassIndicator(container: HTMLElement, backing: HTMLElement, initial: GlassIndicatorOptions = {}) {
  const view = container.ownerDocument.defaultView;
  if (!view) throw new Error('Glass indicator requires a browser document');
  if (backing.parentElement !== container) throw new RangeError('Glass indicator backing must be a direct child of its container');
  if (backing.children.length || backing.textContent?.trim()) throw new Error('Glass indicator backing must be empty decorative markup');
  const resolve = (next: GlassIndicatorOptions) => ({ ...resolveGlassSpring(next), duration: bounded(next.duration, 280, 0, 1000), radius: bounded(next.radius, 24, 0, 999), motion: next.motion === 'spring' ? 'spring' : 'ease', reducedMotion: next.reducedMotion ?? false });
  let options = resolve(initial);
  let target: HTMLElement | null = null;
  let positioned = false;
  let destroyed = false;
  let frame = 0;
  const keys = ['position', 'left', 'top', 'width', 'height', 'visibility', 'pointer-events', 'transition', '--lg-radius'];
  const restore = captureState(backing, keys, ['aria-hidden'], 'lg-glass-indicator');
  const restoreContainer = captureState(container, ['position']);
  const positionContainer = view.getComputedStyle(container).position;
  const ownsContainerPosition = !positionContainer || positionContainer === 'static';
  if (ownsContainerPosition) container.style.setProperty('position', 'relative');
  backing.classList.add('lg-glass-indicator');
  backing.setAttribute('aria-hidden', 'true');
  backing.style.setProperty('position', 'absolute');
  backing.style.setProperty('pointer-events', 'none');
  backing.style.setProperty('visibility', 'hidden');
  backing.style.setProperty('--lg-radius', `${options.radius}px`);
  const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const isReduced = () => options.reducedMotion || Boolean(reduced?.matches);
  const applyBounds = (bounds: readonly number[]) => {
    if (destroyed) return;
    backing.style.setProperty('left', `${bounds[0]}px`); backing.style.setProperty('top', `${bounds[1]}px`);
    backing.style.setProperty('width', `${Math.max(0, bounds[2])}px`); backing.style.setProperty('height', `${Math.max(0, bounds[3])}px`);
  };
  const spring = createGlassSpring(view, [0, 0, 0, 0], options, applyBounds, completed => {
    if (!completed && !destroyed) { backing.style.setProperty('visibility', 'hidden'); positioned = false; }
  }, () => !destroyed && Boolean(target?.isConnected && container.isConnected && backing.isConnected && container.contains(target)), .03);

  const render = (animate: boolean) => {
    if (destroyed) return;
    const bounds = target?.isConnected && container.isConnected && backing.isConnected && container.contains(target)
      ? target.getBoundingClientRect() : undefined;
    if (!bounds?.width || !bounds.height) {
      spring.stop();
      backing.style.setProperty('transition', 'none');
      backing.style.setProperty('visibility', 'hidden');
      positioned = false;
      return;
    }
    const origin = container.getBoundingClientRect();
    const geometry = [bounds.left - origin.left - container.clientLeft + container.scrollLeft,
      bounds.top - origin.top - container.clientTop + container.scrollTop, bounds.width, bounds.height];
    const duration = animate && positioned && !isReduced() && options.motion === 'ease' ? options.duration : 0;
    backing.style.setProperty('transition', duration
      ? `left ${duration}ms cubic-bezier(.2,.8,.2,1), top ${duration}ms cubic-bezier(.2,.8,.2,1), width ${duration}ms cubic-bezier(.2,.8,.2,1), height ${duration}ms cubic-bezier(.2,.8,.2,1)`
      : 'none');
    if (options.motion === 'spring' && positioned && !isReduced() && (animate || spring.active)) spring.target(geometry);
    else spring.reset(geometry);
    backing.style.setProperty('visibility', 'visible');
    // Commit the first, unanimated placement before a subsequent moveTo call.
    if (!positioned) void backing.offsetWidth;
    positioned = true;
  };
  const schedule = () => {
    if (!frame && !destroyed) frame = view.requestAnimationFrame(() => { frame = 0; render(false); });
  };
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(schedule) : undefined;
  observer?.observe(container);
  const preferenceChanged = () => render(false);
  const unlisten = listen([[container, 'scroll', schedule, { passive: true, capture: true }], [view, 'resize', schedule]]);
  reduced?.addEventListener('change', preferenceChanged);

  return {
    moveTo(next: HTMLElement | null) {
      if (destroyed) return;
      if (next && (next === container || next === backing || backing.contains(next) || !container.contains(next))) {
        throw new RangeError('Glass indicator target must be inside the container and outside its backing');
      }
      if (target !== next) {
        if (target) observer?.unobserve(target);
        target = next;
        if (target) observer?.observe(target);
      }
      render(true);
    },
    update(next: GlassIndicatorOptions = {}) {
      if (destroyed) return;
      options = resolve(next); spring.configure(options);
      backing.style.setProperty('--lg-radius', `${options.radius}px`);
      render(false);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; spring.stop();
      view.cancelAnimationFrame(frame);
      observer?.disconnect();
      unlisten();
      reduced?.removeEventListener('change', preferenceChanged);
      restore();
      if (ownsContainerPosition) restoreContainer();
      target = null;
    },
  };
}
