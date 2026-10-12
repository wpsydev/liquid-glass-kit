import { bounded } from './numeric.js';
import { captureState, listen } from './lifecycle.js';

export type GlassFeedbackEffect = 'pixels' | 'sparks' | 'ripple';
export interface GlassFeedbackOptions {
  effect?: GlassFeedbackEffect;
  /** Host-supplied CSS-pixel size. No layout reads; defaults to original canvas dimensions. */
  width?: number;
  height?: number;
  /** Per-burst budget, clamped to 1–64. Default 24; ripple uses at most three rings. */
  particles?: number;
  /** Finite lifetime in milliseconds, clamped to 80–1000. Default 420. */
  duration?: number;
  /** Opaque #RGB/#RRGGBB, default #7c9fff. */
  color?: string;
  /** DPR ceiling, clamped to .5–2. Default 1.5; pixel budget can reduce it further. */
  maxDpr?: number;
  /** Backing-store pixels, clamped to 16384–1048576. Default 262144. */
  maxPixels?: number;
  /** Concurrent bursts, clamped to 1–4. Default 2. Saturation replaces the oldest. */
  maxBursts?: number;
  /** Explicit application preference, combined with the live OS preference. */
  reducedMotion?: boolean;
}
export interface GlassFeedbackPoint {
  /** Canvas-local CSS-pixel coordinates, clamped inside the supplied surface. */
  x: number;
  y: number;
  effect?: GlassFeedbackEffect;
  color?: string;
  /** Bounded 0–1; zero suppresses feedback. Default 1. */
  intensity?: number;
}
const maximumParticles = 64, maximumBursts = 4;
const optionKeys = ['effect', 'width', 'height', 'particles', 'duration', 'color', 'maxDpr', 'maxPixels', 'maxBursts', 'reducedMotion'];
const fail = (reason: string): never => { throw new TypeError(`Invalid glass feedback: ${reason}`); };
const record = (input: unknown, allowed: string[]) => {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) return fail('expected a plain options object');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail('unknown option');
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (descriptor.get || descriptor.set) return fail('accessors are not accepted');
    result[key] = descriptor.value;
  }
  return result;
};
const number = (value: unknown, key: string, fallback: number, min: number, max: number) => {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) return fail(`${key} must be a finite number`);
  return bounded(value as number | undefined, fallback, min, max);
};
const color = (value: unknown) => {
  if (value === undefined) return '#7c9fff';
  if (typeof value !== 'string' || !/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(value)) return fail('color must be opaque #RGB or #RRGGBB');
  return value.toLowerCase();
};
const effect = (value: unknown): GlassFeedbackEffect => {
  if (value === undefined) return 'pixels';
  if (value !== 'pixels' && value !== 'sparks' && value !== 'ripple') return fail('unknown effect');
  return value;
};
const resolve = (input: GlassFeedbackOptions, width: number, height: number) => {
  const value = record(input, optionKeys);
  if (value.reducedMotion !== undefined && typeof value.reducedMotion !== 'boolean') fail('reducedMotion must be a boolean');
  return {
    effect: effect(value.effect), color: color(value.color), reducedMotion: value.reducedMotion ?? false,
    width: number(value.width, 'width', width, 1, 2048), height: number(value.height, 'height', height, 1, 2048),
    particles: Math.floor(number(value.particles, 'particles', 24, 1, 64)), duration: number(value.duration, 'duration', 420, 80, 1000),
    maxDpr: number(value.maxDpr, 'maxDpr', 1.5, .5, 2), maxPixels: Math.floor(number(value.maxPixels, 'maxPixels', 262144, 16384, 1048576)),
    maxBursts: Math.floor(number(value.maxBursts, 'maxBursts', 2, 1, 4)),
  };
};
type Burst = { active: boolean; effect: GlassFeedbackEffect; color: string; x: number; y: number; intensity: number; count: number; started: number; duration: number };

/**
 * Finite original decorative feedback on a dedicated canvas, triggered only by
 * host-confirmed state changes. Controls, focus and input semantics stay outside
 * this renderer. Coordinates/dimensions are supplied by the host; no layout or
 * pixel readback occurs. At most 256 stored particles and four bursts are reused.
 * update() replaces options and cancels active feedback; it never emits/replays.
 * Hidden pages, reduced motion and disconnection cancel work. A later host action
 * may emit again after those conditions clear. destroy restores canvas attributes
 * and inline style priorities, not its original pixels; use an owned blank canvas.
 */
export function createGlassFeedbackEmitter(canvas: HTMLCanvasElement, initial: GlassFeedbackOptions = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') fail('expected a canvas');
  const originalWidth = Math.min(2048, Math.max(1, canvas.width)), originalHeight = Math.min(2048, Math.max(1, canvas.height));
  let options = resolve(initial, originalWidth, originalHeight);
  const doc = canvas.ownerDocument, view = doc.defaultView;
  let context: CanvasRenderingContext2D | null = null;
  try { if (view) context = canvas.getContext('2d', { alpha: true }); } catch { /* optional unsupported renderer */ }
  let supported = Boolean(context && view), destroyed = false, frame: number | null = null;
  const media = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const restore = captureState(canvas, ['pointer-events', 'width', 'height'], ['width', 'height', 'aria-hidden', 'tabindex', 'inert']);
  const bursts: Burst[] = Array.from({ length: maximumBursts }, () => ({ active: false, effect: 'pixels', color: '', x: 0, y: 0, intensity: 1, count: 0, started: 0, duration: 0 }));
  const directions = new Float32Array(maximumBursts * maximumParticles * 3);
  let width = 0, height = 0, backingWidth = 0, backingHeight = 0, dpr = 0, frames = 0;
  const Mutation = (view as Window & { MutationObserver?: typeof MutationObserver } | null)?.MutationObserver;
  const mutation = supported && Mutation ? new Mutation(() => { if (!canvas.isConnected) cancel(); }) : undefined;
  const count = () => bursts.reduce((total, burst) => total + Number(burst.active), 0);
  const clear = () => { try { context?.clearRect(0, 0, width, height); } catch { supported = false; } };
  function cancel() {
    if (destroyed) return;
    if (frame !== null) view?.cancelAnimationFrame(frame);
    frame = null; mutation?.disconnect();
    for (const burst of bursts) burst.active = false;
    if (supported) clear();
  }
  const allowed = () => !destroyed && supported && canvas.isConnected && !doc.hidden && !options.reducedMotion && !media?.matches;
  const resize = () => {
    if (!supported || !context || !view) return;
    const deviceDpr = Number.isFinite(view.devicePixelRatio) && view.devicePixelRatio > 0 ? view.devicePixelRatio : 1;
    const density = Math.min(deviceDpr, options.maxDpr, Math.sqrt(options.maxPixels / (options.width * options.height)));
    const nextWidth = Math.max(1, Math.floor(options.width * density)), nextHeight = Math.max(1, Math.floor(options.height * density));
    const changed = nextWidth !== backingWidth || nextHeight !== backingHeight || width !== options.width || height !== options.height;
    width = options.width; height = options.height; backingWidth = nextWidth; backingHeight = nextHeight;
    dpr = Math.min(backingWidth / width, backingHeight / height);
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    if (canvas.style.width !== `${width}px` || canvas.style.getPropertyPriority('width')) canvas.style.setProperty('width', `${width}px`);
    if (canvas.style.height !== `${height}px` || canvas.style.getPropertyPriority('height')) canvas.style.setProperty('height', `${height}px`);
    if (changed) context.setTransform(backingWidth / width, 0, 0, backingHeight / height, 0, 0);
  };
  const tick = (time: number) => {
    frame = null;
    if (!allowed() || !context) { cancel(); return; }
    try {
      clear();
      if (!supported) { cancel(); return; }
      for (let slot = 0; slot < bursts.length; slot++) {
        const burst = bursts[slot]; if (!burst.active) continue;
        const progress = Math.max(0, (time - burst.started) / burst.duration);
        if (progress >= 1) { burst.active = false; continue; }
        const eased = 1 - (1 - progress) ** 3;
        context.fillStyle = burst.color; context.strokeStyle = burst.color;
        context.globalAlpha = (1 - progress) ** 2 * burst.intensity;
        if (burst.effect === 'ripple') {
          for (let ring = 0; ring < burst.count; ring++) {
            context.lineWidth = 1 + (1 - progress) * 1.5;
            context.beginPath(); context.arc(burst.x, burst.y, 3 + eased * (18 + ring * 9) * burst.intensity, 0, Math.PI * 2); context.stroke();
          }
        } else for (let particle = 0; particle < burst.count; particle++) {
          const index = (slot * maximumParticles + particle) * 3;
          const dx = directions[index], dy = directions[index + 1], size = directions[index + 2];
          const x = burst.x + dx * eased * burst.intensity;
          const y = burst.y + dy * eased * burst.intensity + progress * progress * 8;
          if (burst.effect === 'pixels') context.fillRect(Math.round(x), Math.round(y), size, size);
          else {
            context.lineWidth = 1.5; context.beginPath(); context.moveTo(x, y);
            context.lineTo(x - dx * .16 * (1 - progress), y - dy * .16 * (1 - progress)); context.stroke();
          }
        }
      }
      context.globalAlpha = 1; frames++;
      if (supported && count()) frame = view!.requestAnimationFrame(tick);
      else mutation?.disconnect();
    } catch { supported = false; cancel(); }
  };
  const stateChanged = () => { if (!allowed()) cancel(); };
  let unlisten = () => {};
  if (supported) {
    canvas.setAttribute('aria-hidden', 'true'); canvas.setAttribute('tabindex', '-1'); canvas.setAttribute('inert', '');
    canvas.style.setProperty('pointer-events', 'none');
    try { resize(); } catch { supported = false; restore(); }
    if (supported) { unlisten = listen([[doc, 'visibilitychange', stateChanged]]); media?.addEventListener('change', stateChanged); }
  }
  return {
    get supported() { return supported && !destroyed; },
    get active() { return count() > 0; },
    get stats() { return { activeBursts: count(), activeParticles: bursts.reduce((total, burst) => total + (burst.active ? burst.count : 0), 0), width, height, backingWidth, backingHeight, dpr, pixels: backingWidth * backingHeight, frames }; },
    emit(point: GlassFeedbackPoint): boolean {
      if (destroyed) return false;
      const value = record(point, ['x', 'y', 'effect', 'color', 'intensity']);
      if (typeof value.x !== 'number' || !Number.isFinite(value.x) || typeof value.y !== 'number' || !Number.isFinite(value.y)) fail('x/y must be finite coordinates');
      const selectedEffect = value.effect === undefined ? options.effect : effect(value.effect);
      const selectedColor = value.color === undefined ? options.color : color(value.color);
      const intensity = number(value.intensity, 'intensity', 1, 0, 1);
      if (!allowed() || intensity === 0 || !view) { if (!allowed()) cancel(); return false; }
      let slot = bursts.findIndex((burst, index) => index < options.maxBursts && !burst.active);
      if (slot < 0) {
        slot = 0;
        for (let index = 1; index < options.maxBursts; index++) if (bursts[index].started < bursts[slot].started) slot = index;
      }
      const burst = bursts[slot];
      Object.assign(burst, { active: true, effect: selectedEffect, color: selectedColor, intensity,
        x: Math.min(width, Math.max(0, value.x as number)), y: Math.min(height, Math.max(0, value.y as number)),
        count: selectedEffect === 'ripple' ? Math.min(3, options.particles) : options.particles, started: view.performance.now(), duration: options.duration });
      for (let particle = 0; particle < burst.count; particle++) {
        const angle = particle * 2.399963229728653 + slot * .7;
        const distance = 14 + (particle * 17 % 37), index = (slot * maximumParticles + particle) * 3;
        directions[index] = Math.cos(angle) * distance; directions[index + 1] = Math.sin(angle) * distance; directions[index + 2] = 2 + particle % 3;
      }
      mutation?.observe(doc, { subtree: true, childList: true });
      if (frame === null) frame = view.requestAnimationFrame(tick);
      return true;
    },
    cancel,
    update(next: GlassFeedbackOptions = {}) {
      if (destroyed) return;
      const resolved = resolve(next, originalWidth, originalHeight); cancel(); options = resolved;
      try { resize(); } catch { supported = false; cancel(); }
    },
    destroy() {
      if (destroyed) return;
      cancel(); destroyed = true; mutation?.disconnect(); unlisten(); media?.removeEventListener('change', stateChanged); restore();
    },
  };
}
