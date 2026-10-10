import type { attachGlassScene, GlassSceneOptions } from './scene.js';

export type LazyGlassSceneState = 'waiting' | 'loading' | 'ready' | 'failed' | 'destroyed';
export type GlassSceneController = ReturnType<typeof attachGlassScene>;
export interface LazyGlassSceneOptions {
  /** Begin near the viewport; zero waits for actual intersection. */
  rootMargin?: string;
  root?: Element | Document | null;
}

/** Defer the scene module and GPU initialization until visible or explicitly requested. */
export function attachGlassSceneLazy(canvas: HTMLCanvasElement, initial: GlassSceneOptions = {}, visibility: LazyGlassSceneOptions = {}) {
  const doc = canvas.ownerDocument, view = doc.defaultView;
  let options = initial, state: LazyGlassSceneState = 'waiting', error: unknown;
  let scene: GlassSceneController | null = null, module: typeof import('./scene.js') | undefined;
  let observer: IntersectionObserver | undefined, importing = false, requested = false;
  let settle!: (value: GlassSceneController | null) => void;
  const ready = new Promise<GlassSceneController | null>(resolve => { settle = resolve; });
  const cleanup = () => { observer?.disconnect(); observer = undefined; doc.removeEventListener('visibilitychange', visible); };
  const fail = (reason: unknown) => { error = reason; state = 'failed'; cleanup(); settle(null); };
  const mount = () => {
    if (state === 'destroyed' || state === 'failed' || scene || !module || doc.hidden) return;
    if (!canvas.isConnected) { fail(new Error('Mount the canvas before loading its scene')); return; }
    try { scene = module.attachGlassScene(canvas, options); state = 'ready'; cleanup(); settle(scene); }
    catch (reason) { fail(reason); }
  };
  function load() {
    if (state === 'destroyed' || state === 'failed' || scene) return ready;
    requested = true;
    observer?.disconnect(); observer = undefined;
    if (doc.hidden) return ready;
    if (module) mount();
    else if (!importing) {
      importing = true; state = 'loading';
      import('./scene.js').then(value => { module = value; if (state !== 'destroyed') { if (doc.hidden) state = 'waiting'; else mount(); } }, reason => { if (state !== 'destroyed') fail(reason); });
    }
    return ready;
  }
  function visible() { if (!doc.hidden && requested) load(); }
  doc.addEventListener('visibilitychange', visible);
  const Observe = (view as (Window & { IntersectionObserver?: typeof IntersectionObserver }) | null)?.IntersectionObserver;
  if (Observe) {
    try { observer = new Observe(entries => { if (entries.some(entry => entry.target === canvas && entry.isIntersecting)) load(); }, { root: visibility.root ?? null, rootMargin: visibility.rootMargin ?? '200px' }); observer.observe(canvas); }
    catch (reason) { fail(reason); }
  } else load();
  return {
    ready, load,
    get state() { return state; },
    get error() { return error; },
    get scene() { return scene; },
    update(next: GlassSceneOptions = {}) { if (state === 'destroyed' || state === 'failed') return; options = next; scene?.update(next); },
    destroy() { if (state === 'destroyed') return; state = 'destroyed'; cleanup(); scene?.destroy(); scene = null; settle(null); },
  };
}
