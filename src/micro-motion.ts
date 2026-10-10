import { bounded } from './numeric.js';
import { captureState } from './lifecycle.js';

export interface GlassTransitionOptions {
  /** Movement direction. Up enters from below and exits above. Default up. */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Translation in CSS pixels, clamped to 0–32. Default 12. */
  distance?: number;
  /** Timed transition duration, clamped to 0–600 ms. Default 180. */
  duration?: number;
  /** Explicit application preference, combined with the live OS preference. */
  reducedMotion?: boolean;
}
type Visual = { translate: string; scale: string; opacity: string };
type Task = { animation?: Animation; end: Visual | null; resolve: (completed: boolean) => void };
const properties = ['translate', 'scale', 'opacity'] as const;
const resolveOptions = (options: GlassTransitionOptions) => ({
  direction: ['up', 'down', 'left', 'right'].includes(options.direction ?? '') ? options.direction! : 'up',
  distance: bounded(options.distance, 12, 0, 32),
  duration: bounded(options.duration, 180, 0, 600),
  reducedMotion: options.reducedMotion ?? false,
});
// Keep calc() components intact when a computed percentage remains unresolved.
const components = (value: string) => value.match(/(?:[^\s()]+|\((?:[^()]|\([^()]*\))*\))+/g) ?? [];
const translated = (translate: string, x: number, y: number) => {
  const parts = translate && translate !== 'none' ? components(translate) : [];
  const shifted = (value: string, offset: number) => offset ? `calc(${value} + ${offset}px)` : value;
  return [shifted(parts[0] ?? '0px', x), shifted(parts[1] ?? '0px', y), ...parts.slice(2)].join(' ');
};
const scaled = (scale: string, multiplier: number) => {
  const parts = scale && scale !== 'none' ? components(scale) : ['1'];
  return parts.map(value => `calc(${value} * ${multiplier})`).join(' ');
};

/**
 * Short WAAPI presentation transitions; no input, focus, visibility or semantics
 * are managed. Reserve individual translate/scale/opacity on a dedicated visual
 * layer; use another wrapper for attachGlassMotion or an external animation engine.
 * Enter completion/cancel/destroy restore author inline values and priorities.
 * Exit holds its endpoint until enter/cancel/destroy. A live reduced-motion change
 * settles the intended endpoint successfully. Active disconnection destroys the
 * controller; idle disconnection is checked on the next method call.
 */
export function attachGlassTransition(element: HTMLElement, initial: GlassTransitionOptions = {}) {
  const view = element.ownerDocument.defaultView;
  if (!view) throw new Error('Glass transitions require an element in a browser document');
  let options = resolveOptions(initial), destroyed = false;
  let active: Task | undefined, exited: Visual | null = null;
  const restore = captureState(element, properties);
  const computed = view.getComputedStyle(element);
  const alpha = Number.parseFloat(computed.opacity);
  const baseline: Visual = {
    translate: computed.translate || 'none', scale: computed.scale || 'none',
    opacity: String(Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1),
  };
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => options.reducedMotion || Boolean(media?.matches);
  const apply = (visual: Visual | null) => {
    restore();
    if (visual) for (const key of properties) element.style.setProperty(key, visual[key]);
  };
  const sample = (): Visual => {
    const style = view.getComputedStyle(element);
    return { translate: style.translate || baseline.translate, scale: style.scale || baseline.scale, opacity: style.opacity || baseline.opacity };
  };
  const offset = (sign: number) => {
    const distance = options.distance * sign;
    return options.direction === 'up' ? [0, -distance] : options.direction === 'down' ? [0, distance] : options.direction === 'left' ? [-distance, 0] : [distance, 0];
  };
  const endpoint = (sign: number): Visual => {
    const [x, y] = offset(sign);
    return { ...baseline, translate: translated(baseline.translate, x, y), opacity: '0' };
  };
  const Mutation = (view as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
  const observer = Mutation ? new Mutation(() => { if (active && !element.isConnected) destroy(); }) : undefined;
  const stop = (completed: boolean, end: Visual | null = null) => {
    const task = active; active = undefined; observer?.disconnect();
    exited = completed ? end : null;
    apply(exited);
    task?.animation?.cancel();
    task?.resolve(completed);
  };
  const preferenceChanged = () => {
    if (!element.isConnected) destroy(); else if (active && reduced()) stop(true, active.end);
  };
  media?.addEventListener('change', preferenceChanged);
  function destroy() {
    if (destroyed) return;
    destroyed = true; stop(false); observer?.disconnect();
    media?.removeEventListener('change', preferenceChanged);
  }
  const run = (frames: Visual[], end: Visual | null, feedback = false): Promise<boolean> => {
    if (destroyed) return Promise.resolve(false);
    if (!element.isConnected) { destroy(); return Promise.resolve(false); }
    stop(false);
    if (reduced() || options.duration === 0 || typeof element.animate !== 'function') {
      exited = end; apply(end); return Promise.resolve(true);
    }
    // Inline !important values would outrank the animation; the explicit first
    // keyframe preserves the captured visual while temporarily removing them.
    for (const key of properties) element.style.removeProperty(key);
    return new Promise<boolean>(resolve => {
      const task: Task = { end, resolve }; active = task;
      try {
        task.animation = element.animate(frames, {
          duration: feedback ? Math.min(240, options.duration) : options.duration,
          easing: feedback ? 'ease-in-out' : 'cubic-bezier(.2, .8, .2, 1)', fill: 'both',
        });
        observer?.observe(element.ownerDocument, { subtree: true, childList: true });
        task.animation.finished.then(() => {
          if (active !== task) return;
          if (!element.isConnected) destroy(); else stop(true, end);
        }, () => { if (active === task) stop(false); });
      } catch { if (active === task) stop(false); }
    });
  };
  const materialize = (visible: boolean) => {
    // Read the in-flight computed presentation before cancellation to reverse
    // without a fresh hidden/visible first frame.
    const from = active ? sample() : visible ? exited ?? endpoint(-1) : exited ?? baseline;
    const end = visible ? null : endpoint(1);
    return run([from, end ?? baseline], end);
  };
  return {
    enter: () => materialize(true),
    exit: () => materialize(false),
    feedback(kind: 'confirm' | 'reject'): Promise<boolean> {
      if (!element.isConnected) { destroy(); return Promise.resolve(false); }
      if (destroyed || element.matches(':disabled, [aria-disabled="true"]')) return Promise.resolve(false);
      const stable = exited, base = stable ?? baseline;
      const from = active ? sample() : base;
      if (kind === 'confirm') return run([from, { ...base, scale: scaled(base.scale, 1.045) }, base], stable, true);
      return run([from, { ...base, translate: translated(base.translate, -3, 0) }, { ...base, translate: translated(base.translate, 3, 0) }, base], stable, true);
    },
    cancel() { if (!element.isConnected) destroy(); else if (!destroyed) stop(false); },
    update(next: GlassTransitionOptions = {}) {
      if (destroyed) return;
      if (!element.isConnected) { destroy(); return; }
      options = resolveOptions(next);
      if (active && (reduced() || options.duration === 0)) stop(true, active.end);
    },
    destroy,
  };
}
