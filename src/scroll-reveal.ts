import { bounded } from './numeric.js';
import { captureState, listen } from './lifecycle.js';

export interface GlassScrollRevealOptions {
  /** Direction of the incoming motion. Default up. */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Translation in CSS pixels, clamped to 0–48. Default 24. */
  distance?: number;
  /** Intersection fallback duration in milliseconds, clamped to 0–700. Default 420. */
  duration?: number;
  /** Fraction of the author opacity at entry, clamped to .2–1. Default .35. */
  startOpacity?: number;
  /** Application preference, combined with the live OS reduced-motion preference. */
  reducedMotion?: boolean;
  /** Prefer native ViewTimeline when available. Default true. */
  native?: boolean;
  /** Keep the author presentation after the first completed entry. Default true. */
  once?: boolean;
  /** IntersectionObserver root. A non-null root selects the intersection fallback. */
  root?: Element | null;
}

export type GlassScrollRevealRenderer = 'native-view-timeline' | 'intersection-reveal' | 'static';
type Visual = { opacity: string; translate: string };
type ViewTimelineConstructor = new (options: { subject: Element; axis: 'block' }) => AnimationTimeline;
const properties = ['opacity', 'translate'] as const;
const resolveOptions = (options: GlassScrollRevealOptions) => ({
  direction: ['up', 'down', 'left', 'right'].includes(options.direction ?? '') ? options.direction! : 'up',
  distance: bounded(options.distance, 24, 0, 48),
  duration: bounded(options.duration, 420, 0, 700),
  startOpacity: bounded(options.startOpacity, .35, .2, 1),
  reducedMotion: options.reducedMotion ?? false,
  native: options.native ?? true,
  once: options.once ?? true,
  root: options.root ?? null,
});
const shifted = (translate: string, x: number, y: number) => {
  // Preserve calc() components and the author's optional third (z) component.
  const parts = translate && translate !== 'none' ? translate.match(/(?:[^\s()]+|\((?:[^()]|\([^()]*\))*\))+/g) ?? [] : [];
  const offset = (value: string, distance: number) => distance ? `calc(${value} + ${distance}px)` : value;
  return [offset(parts[0] ?? '0px', x), offset(parts[1] ?? '0px', y), ...parts.slice(2)].join(' ');
};

/**
 * Reveal a dedicated visual layer with browser-managed opacity/translate motion.
 * Native entry progress is scrubbed; the fallback is a timed entry animation,
 * not a scroll-scrubbing polyfill. No scroll handlers, geometry reads or custom
 * animation-frame loop are installed. ViewTimeline ignores transforms when
 * calculating its subject's layout range, so no wrapper or semantic change is needed.
 * Reserve opacity/individual translate on this layer; other effects need a wrapper.
 * Focus and reveal() settle the author presentation immediately and permanently.
 * Reduced motion settles visible. update() replaces options without replaying a
 * completed once reveal. destroy() restores captured inline values/priorities.
 */
export function attachGlassScrollReveal(element: HTMLElement, initial: GlassScrollRevealOptions = {}) {
  const view = element.ownerDocument.defaultView;
  if (!view) throw new Error('Glass scroll reveals require an element in a browser document');
  let options = resolveOptions(initial), destroyed = false;
  let renderer: GlassScrollRevealRenderer = 'static';
  let animation: Animation | undefined, observer: IntersectionObserver | undefined;
  let completed = false, exposed = false, generation = 0;
  const restore = captureState(element, properties);
  const computed = view.getComputedStyle(element);
  const opacity = Number.parseFloat(computed.opacity);
  const baseline: Visual = {
    opacity: String(Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1),
    translate: computed.translate || 'none',
  };
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => options.reducedMotion || Boolean(media?.matches);
  const origin = (): Visual => {
    const distance = options.distance;
    const x = options.direction === 'left' ? distance : options.direction === 'right' ? -distance : 0;
    const y = options.direction === 'up' ? distance : options.direction === 'down' ? -distance : 0;
    return { opacity: String(Number(baseline.opacity) * options.startOpacity), translate: shifted(baseline.translate, x, y) };
  };
  const clear = () => {
    generation++;
    observer?.disconnect(); observer = undefined;
    const previous = animation; animation = undefined;
    previous?.cancel(); restore();
  };
  const wait = () => {
    restore();
    const start = origin();
    for (const key of properties) element.style.setProperty(key, start[key]);
  };
  const visible = (permanent = false) => {
    clear(); completed = true; exposed ||= permanent;
  };
  const watch = (task: Animation, native: boolean) => {
    const token = generation;
    task.finished.then(() => {
      if (destroyed || token !== generation || animation !== task) return;
      if (!element.isConnected) { destroy(); return; }
      completed = true;
      if (options.once) visible();
      else if (!native) { animation = undefined; task.cancel(); restore(); }
    }, () => {
      if (destroyed || token !== generation || animation !== task) return;
      // A rejected native timeline must not leave a partially supported effect.
      clear();
      if (native) intersection(); else { renderer = 'static'; completed = true; }
    });
  };
  const animate = (nativeTimeline?: AnimationTimeline) => {
    restore();
    // Inline !important fields outrank animations; explicit keyframes preserve
    // their computed baseline while we temporarily relinquish these two fields.
    for (const key of properties) element.style.removeProperty(key);
    const timing: KeyframeAnimationOptions & { rangeStart?: string; rangeEnd?: string } = nativeTimeline
      ? { timeline: nativeTimeline, rangeStart: 'entry 0%', rangeEnd: 'entry 100%', fill: 'both', easing: 'linear' }
      : { duration: options.duration, fill: 'both', easing: 'cubic-bezier(.2, .8, .2, 1)' };
    animation = element.animate([origin(), baseline], timing);
    watch(animation, Boolean(nativeTimeline));
  };
  function intersection() {
    const Intersection = (view as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    if (!Intersection || typeof element.animate !== 'function') { renderer = 'static'; restore(); return; }
    const token = generation;
    let intersecting = false;
    try {
      observer = new Intersection(entries => {
        if (destroyed || token !== generation || exposed || reduced()) return;
        if (!element.isConnected) { destroy(); return; }
        for (const entry of entries) {
          if (entry.target !== element) continue;
          if (entry.isIntersecting) {
            if (intersecting) continue;
            intersecting = true;
            if (animation || (completed && options.once)) continue;
            try { animate(); } catch { visible(); renderer = 'static'; }
          } else {
            intersecting = false;
            if (!options.once) {
              const previous = animation; animation = undefined;
              previous?.cancel(); completed = false; wait();
            }
          }
        }
      }, { root: options.root, threshold: 0 });
      renderer = 'intersection-reveal'; wait(); observer.observe(element);
    } catch { clear(); renderer = 'static'; }
  }
  const configure = () => {
    clear(); renderer = 'static';
    if (destroyed) return;
    if (!element.isConnected) { destroy(); return; }
    if (element.contains(element.ownerDocument.activeElement)) exposed = true;
    if (reduced() || options.duration === 0) { completed = true; return; }
    if (exposed || (completed && options.once)) return;
    const Timeline = (view as Window & { ViewTimeline?: ViewTimelineConstructor }).ViewTimeline;
    if (options.native && !options.root && Timeline && typeof element.animate === 'function') {
      try {
        const timeline = new Timeline({ subject: element, axis: 'block' });
        animate(timeline); renderer = 'native-view-timeline'; return;
      } catch { clear(); }
    }
    intersection();
  };
  const expose = () => {
    if (destroyed) return;
    if (!element.isConnected) { destroy(); return; }
    visible(true); renderer = 'static';
  };
  const preferenceChanged = () => {
    if (!element.isConnected) destroy();
    else if (reduced()) { visible(); renderer = 'static'; }
    else configure();
  };
  const unlisten = listen([[element, 'focusin', expose]]);
  media?.addEventListener('change', preferenceChanged);
  function destroy() {
    if (destroyed) return;
    destroyed = true; clear(); renderer = 'static'; unlisten();
    media?.removeEventListener('change', preferenceChanged);
  }
  configure();
  return {
    get renderer(): GlassScrollRevealRenderer { return renderer; },
    reveal: expose,
    update(next: GlassScrollRevealOptions = {}) {
      if (destroyed) return;
      options = resolveOptions(next); configure();
    },
    destroy,
  };
}
