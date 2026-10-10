import { attachGlass } from './dom.js';
import { attachGlassMotion, type GlassMotionOptions } from './motion.js';
import type { GlassOptions } from './material.js';

function sameOptions<T extends object>(previous: T | undefined, next: T | undefined) {
  if (!previous || !next) return previous === next;
  const keys = Object.keys(next) as (keyof T)[];
  return keys.length === Object.keys(previous).length && keys.every(key => Object.is(previous[key], next[key]));
}

/** Shared adapter lifecycle; snapshots also detect in-place option changes. */
export function bindGlass(element: HTMLElement, options: GlassOptions = {}, motion?: GlassMotionOptions) {
  const material = attachGlass(element, options);
  let physics = motion ? attachGlassMotion(element, motion) : undefined;
  let previous = { ...options }, previousMotion = motion && { ...motion }, destroyed = false;
  return {
    element,
    update(next: GlassOptions = {}, nextMotion?: GlassMotionOptions) {
      if (destroyed) return;
      if (!sameOptions(previous, next)) { material.update(next); previous = { ...next }; }
      if (sameOptions(previousMotion, nextMotion)) return;
      if (!nextMotion) { physics?.destroy(); physics = undefined; }
      else if (physics) physics.update(nextMotion);
      else physics = attachGlassMotion(element, nextMotion);
      previousMotion = nextMotion && { ...nextMotion };
    },
    destroy() { if (!destroyed) { destroyed = true; physics?.destroy(); material.destroy(); } },
  };
}
