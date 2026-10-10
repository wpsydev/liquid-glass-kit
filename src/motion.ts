import { glassPointerId, isGlassPressTarget } from './input.js';

export interface GlassSpringOptions {
  /** Spring stiffness, clamped to 20–1000. Default 260. */
  stiffness?: number;
  /** Damping, clamped to 1–100. Default 22. */
  damping?: number;
  /** Mass, clamped to .1–10. Default 1. */
  mass?: number;
}
export interface GlassMotionOptions extends GlassSpringOptions {
  /** Press scale, clamped to .85–1. Default .94. */
  pressScale?: number;
  /** Restrained directional deformation, clamped to 0–.08. Default .035. */
  stretch?: number;
  /** Explicit application preference; combines with the system preference. */
  reducedMotion?: boolean;
}
type SpringParameters = Required<GlassSpringOptions>;
const bounded = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback;

/** Internal shared spring parameters; no browser globals are read during import. */
export function resolveGlassSpring(options: GlassSpringOptions = {}): SpringParameters {
  return {
    stiffness: bounded(options.stiffness, 260, 20, 1000),
    damping: bounded(options.damping, 22, 1, 100),
    mass: bounded(options.mass, 1, .1, 10),
  };
}

/** Exact solution of m*x'' + c*x' + k*(x-target) = 0 over elapsed seconds. */
export function advanceGlassSpring(value: number, velocity: number, target: number, seconds: number, options: SpringParameters): [number, number] {
  const time = Math.max(0, seconds);
  const displacement = value - target;
  const omegaSquared = options.stiffness / options.mass;
  const alpha = options.damping / (2 * options.mass);
  const discriminant = alpha * alpha - omegaSquared;
  let position: number, speed: number;
  if (Math.abs(discriminant) < 1e-7 * omegaSquared) {
    const exponent = Math.exp(-alpha * time);
    const b = velocity + alpha * displacement;
    position = exponent * (displacement + b * time);
    speed = exponent * (velocity - alpha * b * time);
  } else if (discriminant < 0) {
    const omega = Math.sqrt(-discriminant);
    const exponent = Math.exp(-alpha * time);
    const cosine = Math.cos(omega * time), sine = Math.sin(omega * time);
    position = exponent * (displacement * cosine + (velocity + alpha * displacement) / omega * sine);
    speed = exponent * (velocity * cosine - (alpha * velocity + omegaSquared * displacement) / omega * sine);
  } else {
    const root = Math.sqrt(discriminant);
    const first = -omegaSquared / (alpha + root), second = -alpha - root;
    const a = (velocity - second * displacement) / (first - second), b = displacement - a;
    const aTime = a * Math.exp(first * time), bTime = b * Math.exp(second * time);
    position = aTime + bTime;
    speed = first * aTime + second * bTime;
  }
  return [target + position, speed];
}

/** Internal transient RAF runner shared by material motion and the indicator. */
export function createGlassSpring(view: Window, initial: number[], initialOptions: SpringParameters,
  render: (values: readonly number[]) => void, complete: (completed: boolean) => void,
  connected: () => boolean, precision = .001) {
  let values = [...initial], goals = [...initial], velocities = initial.map(() => 0);
  let options = initialOptions;
  let frame: number | null = null;
  let active = false, last = 0, started = 0;
  const sample = (time: number) => {
    const elapsed = Math.max(0, time - last) / 1000;
    for (let i = 0; i < values.length; i++) [values[i], velocities[i]] = advanceGlassSpring(values[i], velocities[i], goals[i], elapsed, options);
    last = time;
  };
  const cancelFrame = () => { if (frame !== null) view.cancelAnimationFrame(frame); frame = null; };
  const finish = (completed: boolean) => {
    cancelFrame(); active = false;
    if (completed) { values = [...goals]; velocities.fill(0); render(values); }
    complete(completed);
  };
  const tick = (time: number) => {
    frame = null;
    if (!active) return;
    if (!connected()) { finish(false); return; }
    sample(time); render(values);
    // A bounded deadline also handles pathological, deliberately underdamped settings.
    if (time - started >= 6000 || values.every((value, i) => Math.abs(value - goals[i]) < precision && Math.abs(velocities[i]) < precision * 10)) finish(true);
    else frame = view.requestAnimationFrame(tick);
  };
  return {
    target(next: number[], snap = false) {
      if (!connected()) { finish(false); return; }
      const time = view.performance.now();
      if (active) sample(time);
      goals = [...next]; started = time; last = time;
      if (snap || values.every((value, i) => Math.abs(value - goals[i]) < precision && Math.abs(velocities[i]) < precision * 10)) { finish(true); return; }
      active = true; render(values);
      if (frame === null) frame = view.requestAnimationFrame(tick);
    },
    reset(next: number[]) { cancelFrame(); active = false; values = [...next]; goals = [...next]; velocities.fill(0); render(values); },
    configure(next: SpringParameters) { if (active) sample(view.performance.now()); options = next; },
    stop() { finish(false); },
    get active() { return active; },
  };
}

/**
 * Spring motion on an existing surface. Entry/exit affect presentation only:
 * consumers own hidden/inert/popover state, focus, and removal after completion.
 * One controller per element. Reserve scale/opacity/transition on this surface;
 * use a wrapper for other transforms. Press points are local CSS-pixel coordinates.
 */
export function attachGlassMotion(element: HTMLElement, initial: GlassMotionOptions = {}) {
  const view = element.ownerDocument.defaultView;
  if (!view) throw new Error('Glass motion requires an element in a browser document');
  const resolve = (next: GlassMotionOptions) => ({ ...resolveGlassSpring(next),
    pressScale: bounded(next.pressScale, .94, .85, 1), stretch: bounded(next.stretch, .035, 0, .08), reducedMotion: next.reducedMotion ?? false });
  let options = resolve(initial);
  let destroyed = false, pressed = false, appearanceTarget = 1;
  let activePointer: number | null = null;
  let activeKey: string | null = null;
  let direction = 0;
  let pending: ((completed: boolean) => void) | undefined;
  const keys = ['scale', 'opacity', 'transition', '--lg-motion-scale-x', '--lg-motion-scale-y', '--lg-motion-opacity', '--lg-motion-light-x', '--lg-motion-light-y'];
  const originalStyles = keys.map(key => [key, element.style.getPropertyValue(key), element.style.getPropertyPriority(key)]);
  const originalState = element.getAttribute('data-lg-motion');
  const originalPress = element.getAttribute('data-lg-motion-pressed');
  const hadClass = element.classList.contains('lg-motion');
  const originalOpacity = [element.style.getPropertyValue('opacity'), element.style.getPropertyPriority('opacity')];
  const computedAlpha = Number.parseFloat(view.getComputedStyle(element).opacity);
  const alpha = Number.isFinite(computedAlpha) ? computedAlpha : 1;
  const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => options.reducedMotion || Boolean(reduced?.matches);
  const restoreOpacity = () => { if (originalOpacity[0]) element.style.setProperty('opacity', originalOpacity[0], originalOpacity[1]); else element.style.removeProperty('opacity'); };
  const resolvePending = (completed: boolean) => { const resolve = pending; pending = undefined; resolve?.(completed); };
  const apply = (values: readonly number[]) => {
    if (destroyed) return;
    element.style.setProperty('--lg-motion-scale-x', String(Math.min(1.35, Math.max(.65, values[0]))));
    element.style.setProperty('--lg-motion-scale-y', String(Math.min(1.35, Math.max(.65, values[1]))));
    element.style.setProperty('--lg-motion-opacity', String(Math.min(1, Math.max(0, values[2]))));
  };
  const spring = createGlassSpring(view, [1, 1, 1], options, apply, completed => {
    if (completed && !destroyed) {
      element.setAttribute('data-lg-motion', appearanceTarget === 0 ? 'hidden' : pressed ? 'pressed' : 'idle');
      if (appearanceTarget === 1) restoreOpacity();
    }
    resolvePending(completed);
  }, () => !destroyed && element.isConnected);
  element.classList.add('lg-motion'); element.setAttribute('data-lg-motion', 'idle');
  element.style.setProperty('scale', 'var(--lg-motion-scale-x, 1) var(--lg-motion-scale-y, 1)');
  element.style.setProperty('transition', 'none');
  apply([1, 1, 1]);
  const target = () => {
    const scale = pressed && !reducedMotion() ? options.pressScale : appearanceTarget === 0 && !reducedMotion() ? .94 : 1;
    const deformation = pressed && !reducedMotion() ? direction * options.stretch : 0;
    spring.target([scale * (1 + deformation), scale * (1 - deformation), appearanceTarget], reducedMotion());
  };
  const press = (point?: { x: number; y: number }) => {
    if (destroyed || !element.isConnected || element.matches(':disabled, [aria-disabled="true"]')) return;
    resolvePending(false); pressed = true; direction = 0;
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = Math.min(1, Math.max(0, point.x / rect.width)), y = Math.min(1, Math.max(0, point.y / rect.height));
        direction = Math.abs(x - .5) * 2 - Math.abs(y - .5) * 2;
        element.style.setProperty('--lg-motion-light-x', `${x * 100}%`); element.style.setProperty('--lg-motion-light-y', `${y * 100}%`);
      }
    }
    element.setAttribute('data-lg-motion-pressed', 'true'); element.setAttribute('data-lg-motion', 'pressed'); target();
  };
  const release = () => {
    activePointer = null; activeKey = null;
    if (destroyed || !pressed) return;
    pressed = false; element.removeAttribute('data-lg-motion-pressed');
    element.style.removeProperty('--lg-motion-light-x'); element.style.removeProperty('--lg-motion-light-y'); target();
  };
  const materialize = (visible: boolean) => {
    if (destroyed || !element.isConnected) return Promise.resolve(false);
    resolvePending(false); pressed = false; activePointer = null; activeKey = null; element.removeAttribute('data-lg-motion-pressed');
    if (visible && appearanceTarget === 1 && !spring.active && !reducedMotion()) spring.reset([.92, .92, 0]);
    appearanceTarget = visible ? 1 : 0;
    element.setAttribute('data-lg-motion', visible ? 'enter' : 'exit');
    element.style.setProperty('opacity', `calc(var(--lg-motion-opacity, 1) * ${alpha})`);
    return new Promise<boolean>(resolve => { pending = resolve; target(); });
  };
  const pointerDown = (event: PointerEvent) => {
    if (activePointer !== null || activeKey !== null || event.isPrimary === false || !isGlassPressTarget(element, event) || element.matches(':disabled, [aria-disabled="true"]') || (event.button !== undefined && event.button !== 0)) return;
    const rect = element.getBoundingClientRect(); press({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    if (pressed) activePointer = glassPointerId(event);
  };
  const pointerRelease = (event: PointerEvent) => { if (activePointer !== null && (event.pointerId === undefined || glassPointerId(event) === activePointer)) release(); };
  const keyDown = (event: KeyboardEvent) => {
    if (activePointer === null && activeKey === null && event.target === element && !event.repeat && (event.key === 'Enter' || event.key === ' ') && element.matches('button, a[href], [role="button"]')) { press(); if (pressed) activeKey = event.key; }
  };
  const keyUp = (event: KeyboardEvent) => { if (event.target === element && event.key === activeKey) release(); };
  const preferenceChanged = () => {
    if (destroyed) return;
    pressed = false; activePointer = null; activeKey = null; element.removeAttribute('data-lg-motion-pressed');
    element.style.removeProperty('--lg-motion-light-x'); element.style.removeProperty('--lg-motion-light-y');
    target();
  };
  reduced?.addEventListener('change', preferenceChanged);
  element.addEventListener('pointerdown', pointerDown); element.addEventListener('keydown', keyDown); element.addEventListener('keyup', keyUp);
  element.addEventListener('lostpointercapture', pointerRelease); element.addEventListener('focusout', release);
  view.addEventListener('pointerup', pointerRelease); view.addEventListener('pointercancel', pointerRelease); view.addEventListener('blur', release);
  return {
    press, release,
    enter: () => materialize(true), exit: () => materialize(false),
    update(next: GlassMotionOptions = {}) { if (destroyed) return; options = resolve(next); spring.configure(options); preferenceChanged(); },
    destroy() {
      if (destroyed) return; destroyed = true; spring.stop(); resolvePending(false);
      reduced?.removeEventListener('change', preferenceChanged);
      element.removeEventListener('pointerdown', pointerDown); element.removeEventListener('keydown', keyDown); element.removeEventListener('keyup', keyUp);
      element.removeEventListener('lostpointercapture', pointerRelease); element.removeEventListener('focusout', release);
      view.removeEventListener('pointerup', pointerRelease); view.removeEventListener('pointercancel', pointerRelease); view.removeEventListener('blur', release);
      if (!hadClass) element.classList.remove('lg-motion');
      for (const [key, value, priority] of originalStyles) value ? element.style.setProperty(key, value, priority) : element.style.removeProperty(key);
      if (originalState === null) element.removeAttribute('data-lg-motion'); else element.setAttribute('data-lg-motion', originalState);
      if (originalPress === null) element.removeAttribute('data-lg-motion-pressed'); else element.setAttribute('data-lg-motion-pressed', originalPress);
    },
  };
}
