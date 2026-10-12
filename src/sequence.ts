/** Optional finite visual sequencing. Import-safe during SSR; attachment needs a browser document. */
export interface GlassSequenceFrame { x?: number; y?: number; scale?: number; opacity?: number }
export type GlassSequenceEasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
export interface GlassSequenceTrack {
  /** Dedicated noninteractive visual descendant; keep native controls outside this layer. */
  element: HTMLElement;
  from?: GlassSequenceFrame;
  to: GlassSequenceFrame;
  /** Absolute offset in milliseconds. No callbacks or semantic actions run at an offset. */
  at?: number;
  duration?: number;
  easing?: GlassSequenceEasing;
}
export interface GlassSequenceOptions { tracks: readonly GlassSequenceTrack[]; reducedMotion?: boolean }
export type GlassSequenceStatus = 'idle' | 'playing' | 'paused' | 'finished' | 'cancelled' | 'destroyed';
export interface GlassSequenceState { readonly status: GlassSequenceStatus; readonly time: number; readonly duration: number }
export type GlassSequenceReason = 'finished' | 'reduced-motion' | 'unsupported' | 'cancelled' | 'destroyed' | 'hidden' | 'detached' | 'external-owner' | 'invalid-visual' | 'native-failed';
export interface GlassSequenceResult { readonly completed: boolean; readonly reason: GlassSequenceReason; readonly error?: unknown }
export interface GlassSequence {
  readonly duration: number;
  readonly state: GlassSequenceState;
  /** Starts or resumes. Repeated calls while playing share the current completion promise. */
  play(): Promise<GlassSequenceResult>;
  pause(): boolean;
  /** Pauses and changes presentation only. Does not run app actions, focus, or navigation. */
  seek(milliseconds: number): GlassSequenceState;
  /** Restores owned inline properties; does not cancel unrelated native animations. */
  cancel(): boolean;
  destroy(): void;
}

const owners = new WeakSet<HTMLElement>();
const focusable = 'a[href],area[href],button,input,select,textarea,summary,[tabindex],[contenteditable]:not([contenteditable="false"]),audio[controls],video[controls]';
const easings = new Set<GlassSequenceEasing>(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']);
type Property = 'transform' | 'opacity';
type Lease = { property: Property; original: string; priority: string; value: string; ownedPriority: string };
type Track = { element: HTMLElement; from: Keyframe; to: Keyframe; at: number; duration: number; easing: GlassSequenceEasing; leases: Lease[]; animation?: Animation };
function number(value: unknown, fallback: number, min: number, max: number, label: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new RangeError(`Glass sequence ${label} must be finite between ${min} and ${max}`);
  return value;
}
function frame(value: GlassSequenceFrame | undefined, required: boolean): GlassSequenceFrame {
  if (value === undefined && !required) return {};
  if (!value || typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new TypeError('Glass sequence frames must be plain objects');
  const result: GlassSequenceFrame = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !['x', 'y', 'scale', 'opacity'].includes(key)) throw new TypeError('Glass sequence supports only x, y, scale and opacity');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!('value' in descriptor)) throw new TypeError('Glass sequence frame values must be data properties');
    const limits = key === 'scale' ? [0.5, 2] : key === 'opacity' ? [0, 1] : [-1000, 1000];
    result[key as keyof GlassSequenceFrame] = number(descriptor.value, key === 'scale' ? 1 : 0, limits[0], limits[1], key);
  }
  if (required && !Object.keys(result).length) throw new TypeError('Glass sequence requires a nonempty endpoint');
  return result;
}
function visual(element: HTMLElement): boolean { return !element.matches(focusable) && !element.querySelector(focusable); }

/**
 * Own up to 32 unique visual descendants for a finite sequence (total <= 10 seconds).
 * Translation/scale wrap the authored computed transform; explicit opacity is absolute.
 * Each missing frame component uses rest (x/y=0, scale=1, authored opacity).
 * Endpoints hold until cancel/destroy; opacity never manages hidden/inert/ARIA semantics.
 * One document timeline synchronizes native effects. No per-frame JS or autoplay is installed.
 * Dedicated wrappers must not have another transform/opacity engine or essential controls.
 */
export function attachGlassSequence(root: HTMLElement, options: GlassSequenceOptions): GlassSequence {
  const doc = root.ownerDocument, view = doc.defaultView;
  if (!view || !root.isConnected) throw new TypeError('Glass sequence requires a connected browser root');
  if (!Array.isArray(options?.tracks) || !options.tracks.length || options.tracks.length > 32) throw new RangeError('Glass sequence requires 1 to 32 tracks');
  const targets = new Set<HTMLElement>();
  // Validate the complete scope before claiming targets or installing listeners.
  for (const track of options.tracks) {
    const element = track.element;
    if (!element || element.ownerDocument !== doc || element === root || !root.contains(element) || !element.isConnected || !('style' in element) || !visual(element)) throw new TypeError('Glass sequence targets must be dedicated noninteractive descendants in one document');
    if (targets.has(element) || owners.has(element)) throw new TypeError('Glass sequence targets must be unique and unowned');
    targets.add(element);
  }
  const tracks: Track[] = options.tracks.map(input => {
    const start = frame(input.from, false), end = frame(input.to, true);
    const at = number(input.at, 0, 0, 10000, 'offset'), duration = number(input.duration, 220, 0, 6000, 'duration');
    if (at + duration > 10000) throw new RangeError('Glass sequence total duration must not exceed 10000ms');
    const easing = input.easing ?? 'ease-out'; if (!easings.has(easing)) throw new TypeError('Glass sequence easing is unsupported');
    const computed = view.getComputedStyle(input.element), baseline = computed.transform && computed.transform !== 'none' ? ` ${computed.transform}` : '';
    const opacity = Number.parseFloat(computed.opacity) || (computed.opacity === '0' ? 0 : 1);
    const transform = ['x', 'y', 'scale'].some(key => key in start || key in end);
    const transparency = 'opacity' in start || 'opacity' in end;
    const convert = (value: GlassSequenceFrame): Keyframe => ({
      ...(transform ? { transform: `translate3d(${value.x ?? 0}px, ${value.y ?? 0}px, 0) scale(${value.scale ?? 1})${baseline}` } : {}),
      ...(transparency ? { opacity: String(value.opacity ?? opacity) } : {}),
    });
    const properties: Property[] = [...(transform ? ['transform' as const] : []), ...(transparency ? ['opacity' as const] : [])];
    const leases = properties.map(property => { const original = input.element.style.getPropertyValue(property), priority = input.element.style.getPropertyPriority(property); return { property, original, priority, value: original, ownedPriority: priority }; });
    return { element: input.element, from: convert(start), to: convert(end), at, duration, easing, leases };
  });
  const total = Math.max(...tracks.map(track => track.at + track.duration));
  const clockTrack = tracks.find(track => track.at + track.duration === total)!;
  const competing = (track: Track) => track.element.getAnimations?.().some(animation => animation !== track.animation && animation.playState !== 'idle' && typeof (animation.effect as KeyframeEffect | null)?.getKeyframes === 'function' && (animation.effect as KeyframeEffect).getKeyframes().some(key => track.leases.some(lease => lease.property in key)));
  if (tracks.some(competing)) throw new TypeError('Glass sequence needs a visual layer without competing transform/opacity animations');
  targets.forEach(element => owners.add(element));
  const explicitReduction = options.reducedMotion === true;
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let status: GlassSequenceStatus = 'idle', time = 0, generation = 0, blocked: GlassSequenceReason | undefined;
  let pending: { promise: Promise<GlassSequenceResult>; resolve(result: GlassSequenceResult): void } | undefined;
  let observing = false;
  const Observer = (view as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
  const owned = () => tracks.every(track => track.leases.every(lease => track.element.style.getPropertyValue(lease.property) === lease.value && track.element.style.getPropertyPriority(lease.property) === lease.ownedPriority));
  const hidden = () => {
    if (doc.hidden) return true;
    const checked = new Set<HTMLElement>();
    for (const track of tracks) for (let element: HTMLElement | null = track.element; element && !checked.has(element); element = element.parentElement) {
      checked.add(element);
      if (element.hidden || element.hasAttribute('inert')) return true;
      const style = view.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return true;
    }
    return false;
  };
  const detached = () => root.ownerDocument !== doc || !root.isConnected || tracks.some(track => track.element.ownerDocument !== doc || !root.contains(track.element) || !track.element.isConnected);
  const snapshot = (): GlassSequenceState => {
    if (status === 'playing') { const sampled = clockTrack.animation?.currentTime; if (typeof sampled === 'number' && Number.isFinite(sampled)) time = Math.max(0, Math.min(total, sampled)); }
    return Object.freeze({ status, time, duration: total });
  };
  const settle = (completed: boolean, reason: GlassSequenceReason, error?: unknown) => { const operation = pending; pending = undefined; operation?.resolve(Object.freeze({ completed, reason, ...(error === undefined ? {} : { error }) })); };
  const stopNative = () => { for (const track of tracks) { const animation = track.animation; track.animation = undefined; if (animation) { void animation.finished.catch(() => {}); void animation.ready.catch(() => {}); try { animation.cancel(); } catch { /* Owned cancellation must not prevent restoration. */ } } } };
  const restore = () => {
    for (const track of tracks) for (const lease of track.leases) {
      if (track.element.style.getPropertyValue(lease.property) !== lease.value || track.element.style.getPropertyPriority(lease.property) !== lease.ownedPriority) continue;
      if (lease.original) track.element.style.setProperty(lease.property, lease.original, lease.priority); else track.element.style.removeProperty(lease.property);
      lease.value = lease.original; lease.ownedPriority = lease.priority;
    }
  };
  const stop = (reason: GlassSequenceReason, error?: unknown) => {
    generation++; stopNative(); restore(); observer?.disconnect(); observing = false;
    if (reason === 'external-owner' || reason === 'invalid-visual') blocked = reason;
    if (status !== 'destroyed') status = 'cancelled';
    time = 0; settle(false, reason, error);
  };
  const guard = (): GlassSequenceReason | undefined => {
    if (status === 'destroyed') return 'destroyed';
    if (blocked) return blocked;
    if (!owned()) return 'external-owner';
    if (detached()) return 'detached';
    if (hidden()) return 'hidden';
    if (tracks.some(track => !visual(track.element))) return 'invalid-visual';
    return undefined;
  };
  const observer = Observer ? new Observer(records => {
    if (!records.some(record => record.target instanceof view.Node && (record.target === root || root.contains(record.target) || (record.target as Node).contains(root)))) return;
    const reason = guard(); if (reason) stop(reason);
  }) : undefined;
  const observe = () => { if (!observing) { observer?.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'inert', 'tabindex', 'contenteditable', 'href', 'controls'] }); observing = true; } };
  const write = (track: Track, lease: Lease, value: string) => { track.element.style.setProperty(lease.property, value); lease.value = track.element.style.getPropertyValue(lease.property); lease.ownedPriority = ''; };
  const endpoint = (reason: 'finished' | 'reduced-motion' | 'unsupported') => {
    generation++; stopNative();
    for (const track of tracks) for (const lease of track.leases) write(track, lease, String(track.to[lease.property]));
    time = total; status = 'finished'; observe(); settle(true, reason);
    return Object.freeze({ completed: true, reason });
  };
  const clock = () => { const current = doc.timeline?.currentTime; return typeof current === 'number' && Number.isFinite(current) ? current : undefined; };
  const supported = () => clock() !== undefined && tracks.every(track => typeof track.element.animate === 'function');
  const create = () => {
    for (const track of tracks) {
      if (track.animation) continue;
      if (competing(track)) throw new Error('Competing transform/opacity animation');
      // Temporarily remove authored !important so native effects can own their properties.
      for (const lease of track.leases) write(track, lease, lease.original);
      const animation = track.element.animate([track.from, track.to], { delay: track.at, duration: track.duration, easing: track.easing, iterations: 1, fill: 'both' });
      track.animation = animation;
      void animation.finished.catch(() => {}); void animation.ready.catch(() => {});
      animation.pause(); animation.currentTime = time;
      void animation.finished.catch(() => {}); void animation.ready.catch(() => {});
    }
    observe();
  };
  const reduced = () => explicitReduction || !!media?.matches;
  const check = () => { const reason = guard(); if (reason) stop(reason); return reason; };
  const onVisibility = () => { if (doc.hidden && (status === 'playing' || status === 'paused' || status === 'finished')) stop('hidden'); };
  const onReduction = () => { if (reduced() && (status === 'playing' || status === 'paused')) { if (!check()) endpoint('reduced-motion'); } };
  const onFocus = () => { if (tracks.some(track => track.element === doc.activeElement || track.element.contains(doc.activeElement))) stop('invalid-visual'); };
  doc.addEventListener('visibilitychange', onVisibility); root.addEventListener('focusin', onFocus); media?.addEventListener('change', onReduction);
  const controller: GlassSequence = {
    duration: total,
    get state() { return snapshot(); },
    play() {
      const reason = check(); if (reason) return Promise.resolve(Object.freeze({ completed: false, reason }));
      if (status === 'playing' && pending) return pending.promise;
      if (status === 'finished' || status === 'cancelled') { stopNative(); restore(); time = 0; }
      if (reduced()) return Promise.resolve(endpoint('reduced-motion'));
      if (!supported()) return Promise.resolve(endpoint('unsupported'));
      if (!total) return Promise.resolve(endpoint('finished'));
      if (!pending) { let resolve!: (value: GlassSequenceResult) => void; const promise = new Promise<GlassSequenceResult>(done => { resolve = done; }); pending = { promise, resolve }; }
      const operation = pending.promise;
      try {
        create(); status = 'playing'; const ticket = ++generation, start = clock()! - time;
        for (const track of tracks) { track.animation!.play(); track.animation!.startTime = start; void track.animation!.ready.catch(() => {}); void track.animation!.finished.catch(() => {}); }
        void Promise.all(tracks.map(track => track.animation!.finished)).then(() => {
          if (ticket !== generation || status !== 'playing') return;
          const reason = check(); if (reason) return;
          time = total; status = 'finished'; settle(true, 'finished');
        }, error => { if (ticket === generation && status === 'playing') stop('native-failed', error); });
      } catch (error) { stop('native-failed', error); }
      return operation;
    },
    pause() {
      if (check() || status !== 'playing') return false;
      snapshot(); generation++;
      try { for (const track of tracks) { track.animation!.pause(); track.animation!.currentTime = time; void track.animation!.finished.catch(() => {}); void track.animation!.ready.catch(() => {}); } status = 'paused'; return true; }
      catch (error) { stop('native-failed', error); return false; }
    },
    seek(milliseconds) {
      if (typeof milliseconds !== 'number' || !Number.isFinite(milliseconds)) throw new RangeError('Glass sequence seek requires finite milliseconds');
      if (check()) return snapshot();
      time = Math.max(0, Math.min(total, milliseconds)); generation++;
      if (reduced()) { endpoint('reduced-motion'); return snapshot(); }
      if (!supported()) { endpoint('unsupported'); return snapshot(); }
      try { create(); for (const track of tracks) { track.animation!.pause(); track.animation!.currentTime = time; void track.animation!.finished.catch(() => {}); void track.animation!.ready.catch(() => {}); } status = 'paused'; }
      catch (error) { stop('native-failed', error); }
      return snapshot();
    },
    cancel() {
      if (status === 'destroyed') return false;
      const active = status === 'playing' || status === 'paused' || status === 'finished';
      if (active) stop('cancelled'); return active;
    },
    destroy() {
      if (status === 'destroyed') return;
      stop('destroyed'); status = 'destroyed'; targets.forEach(element => owners.delete(element));
      doc.removeEventListener('visibilitychange', onVisibility); root.removeEventListener('focusin', onFocus); media?.removeEventListener('change', onReduction);
    },
  };
  return controller;
}
