/** Optional same-document native continuity; no router or animation polyfill. */
export interface GlassViewTransitionOptions {
  /** Defaults to the ambient document only when this function is invoked. */
  document?: Document;
  reducedMotion?: boolean;
  /** Scoped CSS duration in milliseconds, clamped to 180–300. Default 220. */
  duration?: number;
}
export type GlassViewTransitionReason = 'complete' | 'unsupported' | 'reduced-motion' | 'hidden' | 'no-document' | 'skipped' | 'superseded' | 'native-failed';
export interface GlassViewTransitionResult {
  animated: boolean;
  reason: GlassViewTransitionReason;
  /** Native visual failure only. Host update errors reject updateDone/finished. */
  error?: unknown;
}
export interface GlassViewTransitionHandle {
  readonly native: boolean;
  /** Rejects with the unchanged synchronous/asynchronous host error. */
  readonly updateDone: Promise<void>;
  /** Native snapshots became ready; false for fallback or a visual failure. */
  readonly ready: Promise<boolean>;
  /** Rejects with a host update error, never retries a consequential update. */
  readonly finished: Promise<GlassViewTransitionResult>;
  /** Skip visual continuity only; the host callback still runs exactly once. */
  skip(): void;
}
interface NativeTransition {
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  finished: Promise<void>;
  skipTransition(): void;
}
type Scope = { skip: (reason: GlassViewTransitionReason) => void; restore: () => void };
const active = new WeakMap<Document, Scope>();
const styles = new WeakMap<Document, { attribute: string | null; value: string; priority: string; hadStyle: boolean; ownedDuration: string }>();
const names = new WeakMap<Document, Map<string, HTMLElement>>();
const namedElements = new WeakMap<HTMLElement, string>();

/**
 * A newer bridge call skips the previous bridge's visual animation, not its host
 * update. Host routers own async sequencing, authorization and focus decisions.
 * Native failures fall back without replaying an already-invoked callback.
 * No cross-document transition, layout reads, RAF or GPU-cost guarantee is supplied.
 */
export function runGlassViewTransition(update: () => void | Promise<void>, options: GlassViewTransitionOptions = {}): GlassViewTransitionHandle {
  if (typeof update !== 'function') throw new TypeError('View transition requires a host update function');
  const doc = options.document ?? (typeof document !== 'undefined' ? document : undefined);
  const media = doc?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const duration = typeof options.duration === 'number' && Number.isFinite(options.duration) ? Math.max(180, Math.min(300, options.duration)) : 220;
  let transition: NativeTransition | undefined, usedNative = false, skipped: GlassViewTransitionReason | undefined;
  let visualError: unknown, invoked: Promise<void> | undefined, settled = false;
  let resolveUpdate!: () => void, rejectUpdate!: (error: unknown) => void;
  const updateDone = new Promise<void>((resolve, reject) => { resolveUpdate = resolve; rejectUpdate = reject; });
  // Observe internally to avoid stray unhandled promises when a caller chooses
  // to await finished only; the public promises remain rejected/observable.
  void updateDone.catch(() => {});
  const invoke = () => {
    if (!invoked) {
      invoked = Promise.resolve().then(update);
      void invoked.then(resolveUpdate, rejectUpdate);
    }
    return invoked;
  };
  function skip(reason: GlassViewTransitionReason = 'skipped') {
    if (settled || skipped) return;
    skipped = reason;
    try { transition?.skipTransition(); } catch (error) { visualError = error; }
  }
  const root = doc?.documentElement;
  const scope: Scope = { skip, restore() {
    if (!doc || active.get(doc) !== scope) return;
    active.delete(doc);
    const saved = styles.get(doc); styles.delete(doc);
    if (!saved || !root) return;
    if (root.getAttribute('data-lg-view-transition') === 'active') saved.attribute === null ? root.removeAttribute('data-lg-view-transition') : root.setAttribute('data-lg-view-transition', saved.attribute);
    if (root.style.getPropertyValue('--lg-view-duration') === saved.ownedDuration && !root.style.getPropertyPriority('--lg-view-duration')) {
      if (saved.value) root.style.setProperty('--lg-view-duration', saved.value, saved.priority); else root.style.removeProperty('--lg-view-duration');
    }
    if (!saved.hadStyle && !root.getAttribute('style')) root.removeAttribute('style');
  } };
  if (doc) { active.get(doc)?.skip('superseded'); active.set(doc, scope); }
  const preference = () => { if (media?.matches) skip('reduced-motion'); };
  const visibility = () => { if (doc?.hidden) skip('hidden'); };
  let fallback: GlassViewTransitionReason | undefined;
  if (!doc) fallback = 'no-document';
  else if (options.reducedMotion || media?.matches) fallback = 'reduced-motion';
  else if (doc.hidden) fallback = 'hidden';
  else if (typeof doc.startViewTransition !== 'function') fallback = 'unsupported';
  if (!fallback && doc && root) {
    if (!styles.has(doc)) styles.set(doc, { attribute: root.getAttribute('data-lg-view-transition'), value: root.style.getPropertyValue('--lg-view-duration'), priority: root.style.getPropertyPriority('--lg-view-duration'), hadStyle: root.hasAttribute('style'), ownedDuration: `${duration}ms` });
    styles.get(doc)!.ownedDuration = `${duration}ms`;
    root.setAttribute('data-lg-view-transition', 'active'); root.style.setProperty('--lg-view-duration', `${duration}ms`);
    try {
      transition = doc.startViewTransition(invoke); usedNative = true;
      // The browser exposes independent promises; consume its update promise
      // while preserving host rejection through our own two public boundaries.
      void transition.updateCallbackDone.catch(() => {});
      media?.addEventListener?.('change', preference); doc.addEventListener('visibilitychange', visibility);
    } catch (error) { visualError = error; fallback = 'native-failed'; invoke(); }
  } else invoke();
  const ready = transition ? transition.ready.then(() => true, error => { visualError = error; return false; }) : Promise.resolve(false);
  const nativeFinished = transition ? transition.finished.catch(error => { visualError = error; }) : Promise.resolve();
  const finished = nativeFinished.then(async () => {
    // The native contract calls update even after a skipped transition. A broken
    // wrapper that finishes without doing so still gets one direct host update.
    await invoke(); await updateDone;
    const snapshots = await ready;
    return { animated: usedNative && snapshots && !skipped && visualError === undefined,
      reason: skipped ?? fallback ?? (snapshots && visualError === undefined ? 'complete' : 'native-failed'),
      ...(visualError === undefined ? {} : { error: visualError }) } as GlassViewTransitionResult;
  }).finally(() => {
    settled = true; media?.removeEventListener?.('change', preference); doc?.removeEventListener('visibilitychange', visibility); scope.restore();
  });
  void finished.catch(() => {});
  return { get native() { return usedNative; }, updateDone, ready, finished, skip: () => skip() };
}

/**
 * Assign an original safe shared name and return explicit restoration cleanup.
 * One helper attachment per element; helper-owned names must be document-unique.
 * External CSS names are not scanned. Native ready can reject duplicate snapshots.
 */
export function nameGlassView(element: HTMLElement, suffix: string) {
  if (!element?.ownerDocument || typeof suffix !== 'string' || !/^[a-z][a-z0-9-]{0,48}$/.test(suffix)) throw new RangeError('Shared view suffix must be 1–49 lowercase letters/digits/hyphens, starting with a letter');
  if (namedElements.has(element)) throw new Error('Destroy the existing shared-view name attachment before renaming');
  const doc = element.ownerDocument, name = `lg-view-${suffix}`;
  let registered = names.get(doc); if (!registered) { registered = new Map(); names.set(doc, registered); }
  if (registered.has(name)) throw new Error('Shared view names must be unique within their document');
  const value = element.style.getPropertyValue('view-transition-name'), priority = element.style.getPropertyPriority('view-transition-name'), hadStyle = element.hasAttribute('style');
  registered.set(name, element); namedElements.set(element, name); element.style.setProperty('view-transition-name', name);
  let destroyed = false;
  return { name, destroy() {
    if (destroyed) return; destroyed = true;
    if (registered!.get(name) === element) registered!.delete(name); namedElements.delete(element);
    if (!registered!.size) names.delete(doc);
    if (element.style.getPropertyValue('view-transition-name') === name && !element.style.getPropertyPriority('view-transition-name')) {
      value ? element.style.setProperty('view-transition-name', value, priority) : element.style.removeProperty('view-transition-name');
    }
    if (!hadStyle && !element.getAttribute('style')) element.removeAttribute('style');
  } };
}
