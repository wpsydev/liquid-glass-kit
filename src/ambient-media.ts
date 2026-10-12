import { bounded } from './numeric.js';

export type GlassMediaState = 'idle' | 'eligible' | 'requesting' | 'playing' | 'paused' | 'blocked' | 'user-owned' | 'unsupported' | 'destroyed';
export interface GlassMediaCoordinatorOptions {
  /** Pending and playing ambient requests, clamped to 1–4. Default 1. */
  maxActive?: number;
  /** Explicit app preference OR the live OS preference; false never bypasses the OS. */
  reducedMotion?: boolean;
  /** Explicit app preference OR supported live navigator.connection.saveData. */
  saveData?: boolean;
}
export interface GlassAmbientMediaOptions {
  /** Manual default installs no intersection or pointer listeners and never starts playback. */
  trigger?: 'manual' | 'visible' | 'hover';
  /** Host owns fallback presentation. Exceptions are isolated from media cleanup. */
  onState?: (state: GlassMediaState, detail: { reason: string; error?: unknown }) => void;
}
type Connection = EventTarget & { readonly saveData?: boolean };
type Restore = () => void;
type Entry = {
  video: HTMLVideoElement; options: GlassAmbientMediaOptions; state: GlassMediaState;
  visible: boolean; hover: boolean; requested: boolean; suppressed: boolean; user: boolean; owned: boolean; removed: boolean;
  revision: number; pending: Set<number>; restore?: Restore; unlisten: () => void;
  completion?: Promise<boolean>; settle?: (result: boolean) => void;
};
const registrations = new WeakMap<HTMLVideoElement, Entry>();
const failure = (reason: string): never => { throw new TypeError(`Invalid ambient media: ${reason}`); };
const read = (input: unknown, keys: readonly string[]) => {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) return failure('expected plain options');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !keys.includes(key)) return failure('unknown option');
    const property = Object.getOwnPropertyDescriptor(input, key)!;
    if (property.get || property.set) return failure('accessors are not accepted'); result[key] = property.value;
  }
  return result;
};
const preferences = (input: GlassMediaCoordinatorOptions) => {
  const options = read(input, ['maxActive', 'reducedMotion', 'saveData']);
  if (options.maxActive !== undefined && (typeof options.maxActive !== 'number' || !Number.isFinite(options.maxActive))) failure('maxActive must be finite');
  for (const key of ['reducedMotion', 'saveData']) if (options[key] !== undefined && typeof options[key] !== 'boolean') failure(`${key} must be boolean`);
  return { maxActive: Math.floor(bounded(options.maxActive as number | undefined, 1, 1, 4)), reducedMotion: options.reducedMotion ?? false, saveData: options.saveData ?? false };
};
const attachment = (input: GlassAmbientMediaOptions): GlassAmbientMediaOptions => {
  const options = read(input, ['trigger', 'onState']);
  if (options.trigger !== undefined && !['manual', 'visible', 'hover'].includes(options.trigger as string)) failure('unknown trigger');
  if (options.onState !== undefined && typeof options.onState !== 'function') failure('onState must be a callback');
  return { trigger: options.trigger as GlassAmbientMediaOptions['trigger'] ?? 'manual', onState: options.onState as GlassAmbientMediaOptions['onState'] };
};

/**
 * Coordinate explicitly attached decorative previews, not ordinary media players.
 * Nothing plays until host request() or an explicit visible/hover policy qualifies.
 * Pending play promises reserve the same 1–4 budget as owned playback. Native
 * controls, preexisting playback and release() belong to the host and never get
 * paused by this coordinator. Call release() before exposing a full player or
 * changing ownership, and destroy handles before unmounting. Sources/posters and
 * accessible controls remain entirely host-owned; preload='none' is only a hint.
 * onState reports actual outcomes so the host can retain its poster on rejection.
 * Creation is SSR-safe. One browser document per coordinator; at most 128 handles.
 * Only opted-in triggers install IO/pointer listeners. Shared lifecycle observers
 * have no timers, geometry reads, scroll handlers, pixel reads or RAF loop.
 */
export function createGlassMediaCoordinator(initial: GlassMediaCoordinatorOptions = {}) {
  let options = preferences(initial), destroyed = false;
  let doc: Document | undefined, view: Window | null = null;
  let media: MediaQueryList | undefined, connection: Connection | undefined;
  let intersection: IntersectionObserver | undefined, mutation: MutationObserver | undefined;
  let reconciling = false, again = false;
  const entries = new Set<Entry>();
  const active = () => [...entries].filter(entry => entry.owned);
  const notify = (entry: Entry, state: GlassMediaState, reason: string, error?: unknown) => {
    if (entry.state === state && !error) return;
    entry.state = state;
    try { entry.options.onState?.(state, { reason, ...(error === undefined ? {} : { error }) }); } catch { /* host callback errors cannot orphan owned playback */ }
  };
  const paused = (video: HTMLVideoElement) => { try { video.pause(); } catch { /* teardown remains idempotent */ } };
  const policy = () => !destroyed && Boolean(doc && !doc.hidden) && !options.reducedMotion && !media?.matches && !options.saveData && !connection?.saveData;
  const eligible = (entry: Entry) => !entry.removed && !entry.user && !entry.suppressed && entry.video.isConnected && !entry.video.controls
    && (entry.requested || entry.options.trigger === 'visible' && entry.visible || entry.options.trigger === 'hover' && entry.hover);
  function stop(entry: Entry, pause: boolean, state: GlassMediaState, reason: string, error?: unknown) {
    const owned = entry.owned; entry.owned = false; entry.requested = false; entry.revision++;
    entry.settle?.(false); entry.settle = undefined; entry.completion = undefined;
    if (owned && pause && !entry.user && !entry.video.controls) paused(entry.video);
    entry.restore?.(); entry.restore = undefined; notify(entry, state, reason, error);
  }
  const ownProperties = (video: HTMLVideoElement): Restore => {
    const fields = ['muted', 'loop', 'playsInline', 'preload'] as const;
    const values = { muted: video.muted, loop: video.loop, playsInline: video.playsInline, preload: video.preload };
    const attributes = fields.map(key => [key === 'playsInline' ? 'playsinline' : key, video.getAttribute(key === 'playsInline' ? 'playsinline' : key)] as const);
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
    return () => {
      for (const [index, key] of fields.entries()) {
        // Preserve a host's later different value; ownership changes should still
        // call release() explicitly rather than racing this ambient preview.
        if (video[key] !== (key === 'preload' ? 'none' : true)) continue;
        const [attribute, value] = attributes[index]; value === null ? video.removeAttribute(attribute) : video.setAttribute(attribute, value);
        if (key === 'preload') { if (video.preload !== values.preload) video.preload = values.preload; }
        else if (video[key] !== values[key]) video[key] = values[key];
      }
    };
  };
  function start(entry: Entry) {
    if (entry.owned) return entry.completion ?? Promise.resolve(true);
    if (!policy() || !eligible(entry) || active().length >= options.maxActive) return Promise.resolve(false);
    if (!entry.video.paused || entry.video.controls) { entry.user = true; notify(entry, 'user-owned', 'Existing playback and native controls remain host-owned'); return Promise.resolve(false); }
    entry.owned = true; const revision = ++entry.revision;
    entry.restore = ownProperties(entry.video);
    const completion = new Promise<boolean>(resolve => { entry.settle = resolve; }); entry.completion = completion;
    notify(entry, 'requesting', 'Ambient request reserves one player slot');
    if (!entry.owned || entry.revision !== revision) return completion;
    if (!policy() || !eligible(entry)) { stop(entry, true, 'paused', 'Eligibility changed before playback'); return completion; }
    entry.pending.add(revision);
    let result: Promise<void> | undefined;
    try { result = entry.video.play(); }
    catch (error) { entry.pending.delete(revision); entry.suppressed = true; stop(entry, true, 'blocked', 'Playback rejected; retain the host poster fallback', error); reconcile(); return completion; }
    Promise.resolve(result).then(() => {
      entry.pending.delete(revision);
      if (!entry.owned || entry.revision !== revision || entry.removed || destroyed) {
        const registered = registrations.get(entry.video);
        if ((!registered || registered === entry) && !entry.owned && !entry.user && !entry.video.controls && !entry.video.paused) paused(entry.video);
        return;
      }
      if (!policy() || !eligible(entry) || entry.video.paused) { stop(entry, true, 'paused', 'Playback no longer eligible'); reconcile(); return; }
      notify(entry, 'playing', 'Ambient play promise fulfilled');
      entry.settle?.(true); entry.settle = undefined; entry.completion = undefined;
    }, error => {
      entry.pending.delete(revision);
      if (!entry.owned || entry.revision !== revision || entry.removed || destroyed) return;
      entry.suppressed = true; stop(entry, true, 'blocked', 'Playback rejected; retain the host poster fallback', error); reconcile();
    });
    syncMutation(); return completion;
  }
  function syncMutation() {
    mutation?.disconnect();
    if (active().length && doc) mutation?.observe(doc, { subtree: true, childList: true });
  }
  function reconcile() {
    if (reconciling) { again = true; return; }
    reconciling = true;
    do {
      again = false;
      for (const entry of entries) {
        if (entry.owned && entry.video.controls) { entry.user = true; stop(entry, false, 'user-owned', 'Native controls take ownership'); }
        else if (entry.owned && (!policy() || !eligible(entry))) stop(entry, true, 'paused', 'Ambient eligibility or saving preference changed');
      }
      const owned = active();
      for (const entry of owned.slice(options.maxActive)) stop(entry, true, 'eligible', 'Ambient player budget reduced');
      let occupied = active().length;
      if (policy()) for (const entry of entries) {
        if (entry.owned || !eligible(entry)) continue;
        if (occupied < options.maxActive) { void start(entry); if (entry.owned) occupied++; }
        else notify(entry, 'eligible', 'Waiting for an ambient player slot');
      }
      syncMutation();
    } while (again && !destroyed);
    reconciling = false;
  }
  function initialize(video: HTMLVideoElement) {
    if (doc && doc !== video.ownerDocument) failure('one document per coordinator');
    if (doc) return;
    const candidateDoc = video.ownerDocument, candidateView = candidateDoc.defaultView;
    if (!candidateView) throw new Error('Ambient media attachment requires a browser document');
    doc = candidateDoc; view = candidateView;
    media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
    connection = (view.navigator as Navigator & { connection?: Connection }).connection;
    doc.addEventListener('visibilitychange', reconcile); media?.addEventListener('change', reconcile); connection?.addEventListener?.('change', reconcile);
    const Mutation = (view as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
    if (Mutation) mutation = new Mutation(reconcile);
  }
  const remove = (entry: Entry) => {
    if (entry.removed) return;
    entry.removed = true; if (entry.video.controls) entry.user = true;
    stop(entry, true, 'destroyed', 'Ambient handle destroyed'); entry.unlisten(); intersection?.unobserve(entry.video); entries.delete(entry);
    if (registrations.get(entry.video) === entry) registrations.delete(entry.video); reconcile();
  };
  return {
    attach(video: HTMLVideoElement, input: GlassAmbientMediaOptions = {}) {
      if (destroyed) throw new Error('Ambient coordinator is destroyed');
      if (!video || video.tagName !== 'VIDEO' || typeof video.play !== 'function') failure('expected a native video element');
      const attached = attachment(input);
      if (entries.size >= 128) throw new RangeError('Ambient coordinator is limited to 128 handles');
      if (registrations.has(video)) throw new Error('Video already attached');
      initialize(video);
      const entry: Entry = { video, options: attached, state: 'idle', visible: false, hover: false, requested: false, suppressed: false,
        user: !video.paused || video.controls, owned: false, removed: false, revision: 0, pending: new Set(), unlisten: () => {} };
      entries.add(entry); registrations.set(video, entry);
      const played = () => {
        if (video.paused) return;
        if (entry.owned) { if (video.controls) { entry.user = true; stop(entry, false, 'user-owned', 'Native controls take ownership'); reconcile(); } return; }
        if (entry.pending.size && !entry.user && !video.controls) { paused(video); return; }
        entry.user = true; notify(entry, 'user-owned', 'Playback began outside an ambient request'); reconcile();
      };
      const pausedByHost = () => {
        // Native pause events are queued; a rapid new request may already have
        // restarted playback before a prior internal pause event is delivered.
        if (!entry.owned || !video.paused) return;
        entry.user = true; entry.requested = false; stop(entry, false, 'user-owned', 'Host or native controls paused playback'); reconcile();
      };
      const failed = () => { if (entry.owned) { entry.suppressed = true; stop(entry, true, 'blocked', 'Media error; retain the host poster fallback', video.error); reconcile(); } };
      const hover = (value: boolean) => { if (entry.hover === value) return; entry.hover = value; if (value) entry.suppressed = false; reconcile(); };
      video.addEventListener('play', played); video.addEventListener('pause', pausedByHost); video.addEventListener('error', failed);
      const entered = () => hover(true), left = () => hover(false);
      if (attached.trigger === 'hover') { video.addEventListener('pointerenter', entered); video.addEventListener('pointerleave', left); }
      entry.unlisten = () => {
        video.removeEventListener('play', played); video.removeEventListener('pause', pausedByHost); video.removeEventListener('error', failed);
        if (attached.trigger === 'hover') { video.removeEventListener('pointerenter', entered); video.removeEventListener('pointerleave', left); }
      };
      if (attached.trigger === 'visible') {
        const Observer = (view as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
        if (Observer) {
          try {
            intersection ??= new Observer(records => {
              for (const record of records) {
                const target = registrations.get(record.target as HTMLVideoElement); if (!target || !entries.has(target) || target.options.trigger !== 'visible') continue;
                const visible = record.isIntersecting && record.intersectionRatio > 0;
                if (visible && !target.visible) target.suppressed = false;
                target.visible = visible;
              }
              reconcile();
            }, { threshold: 0 });
            intersection.observe(video);
          } catch { notify(entry, 'unsupported', 'Visibility observation unavailable; call request() deliberately'); }
        } else notify(entry, 'unsupported', 'IntersectionObserver unavailable; call request() deliberately');
      }
      if (entry.user) notify(entry, 'user-owned', 'Existing playback or native controls remain host-owned');
      return {
        get state() { return entry.state; },
        request(): Promise<boolean> {
          if (destroyed || entry.removed) return Promise.resolve(false);
          if (entry.owned) return entry.completion ?? Promise.resolve(true);
          if (video.controls || !video.paused) { entry.user = true; notify(entry, 'user-owned', 'Existing playback or native controls remain host-owned'); return Promise.resolve(false); }
          entry.user = false; entry.suppressed = false; entry.requested = true;
          if (!policy()) { entry.requested = false; notify(entry, 'blocked', 'Ambient playback respects reduced motion, data saving and page visibility'); return Promise.resolve(false); }
          if (!eligible(entry)) { entry.requested = false; notify(entry, 'blocked', 'Video is disconnected'); return Promise.resolve(false); }
          if (active().length >= options.maxActive) { entry.requested = false; notify(entry, 'eligible', 'Waiting for an ambient player slot'); return Promise.resolve(false); }
          return start(entry);
        },
        pause() {
          if (destroyed || entry.removed) return;
          if (entry.user || video.controls) { entry.user = true; stop(entry, false, 'user-owned', 'Native playback remains host-owned'); }
          else { entry.requested = false; entry.suppressed = true; stop(entry, true, 'paused', 'Host paused ambient ownership'); }
          reconcile();
        },
        release() { if (destroyed || entry.removed) return; entry.user = true; entry.requested = false; entry.suppressed = true; stop(entry, false, 'user-owned', 'Host released playback ownership'); reconcile(); },
        destroy: () => remove(entry),
      };
    },
    update(next: GlassMediaCoordinatorOptions = {}) { if (destroyed) return; const resolved = preferences(next); options = resolved; reconcile(); },
    get stats() { return { attached: entries.size, ownedActive: active().length, pending: [...entries].filter(entry => entry.owned && entry.settle).length,
      playing: [...entries].filter(entry => entry.owned && entry.state === 'playing' && !entry.video.paused).length, maxActive: options.maxActive, visibilitySupported: Boolean(intersection), saveDataSupported: Boolean(connection && 'saveData' in connection) }; },
    destroy() {
      if (destroyed) return; destroyed = true;
      for (const entry of [...entries]) remove(entry);
      intersection?.disconnect(); mutation?.disconnect(); doc?.removeEventListener('visibilitychange', reconcile); media?.removeEventListener('change', reconcile); connection?.removeEventListener?.('change', reconcile);
    },
  };
}
