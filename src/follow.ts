import { bounded } from './numeric.js';
import { listen } from './lifecycle.js';

export interface GlassFollowState {
  readonly following: boolean;
  readonly nearEnd: boolean;
  /** Last measured distance from the bottom, clamped against elastic overscroll. */
  readonly distance: number;
  /** Host-declared appended items not acknowledged by following/jumping to the tail. */
  readonly unread: number;
  /** Document/observed viewport/hidden-attribute/positive-height gate, not occlusion proof. */
  readonly visible: boolean;
  readonly destroyed: boolean;
}
export interface GlassFollowOptions {
  /** One direct child containing the host's normal top-to-bottom transcript/log. */
  readonly content: HTMLElement;
  /** Near-tail tolerance in CSS pixels, clamped 0–512. Default 48 plus 1px rounding. */
  readonly threshold?: number;
  /** Default true, but attachment never jumps and starts only if already near the end. */
  readonly initiallyFollowing?: boolean;
  /** Optional native observer of viewport + content only. Default true. */
  readonly observeResize?: boolean;
  readonly reducedMotion?: boolean;
  /** Frozen changed snapshots only. Errors dispatch lg-follow-error on the scroller. */
  readonly onChange?: (state: GlassFollowState) => void;
}
export interface GlassFollowController {
  readonly state: GlassFollowState;
  /** Call after actual appends. Count 0 is text growth, not a new message; max 1e6. */
  notifyAppend(count: number): void;
  /** Explicit geometry refresh; useful without ResizeObserver. Never guesses unread. */
  refresh(): void;
  /** Reader pause is sticky until an explicit follow/jump. */
  pause(): void;
  /** Explicit instant return to the latest content, without changing keyboard focus. */
  follow(): boolean;
  /** Optional native smooth navigation only for this explicit host/user action. */
  jumpLatest(options?: { readonly smooth?: boolean }): boolean;
  destroy(): void;
}
type Metrics = { maximum: number; position: number; rawPosition: number; height: number; distance: number; nearEnd: boolean };
const owners = new WeakSet<HTMLElement>();
const fail = (reason: string): never => { throw new TypeError(`Invalid glass follow: ${reason}`); };
function record(input: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) return fail('expected plain options');
  const output: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail('unknown option');
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (descriptor.get || descriptor.set) return fail('accessors are not accepted');
    output[key] = descriptor.value;
  }
  return output;
}
function boolean(value: unknown, fallback: boolean, name: string): boolean {
  if (value !== undefined && typeof value !== 'boolean') return fail(`${name} must be a boolean`);
  return value === undefined ? fallback : value as boolean;
}
function validElement(element: HTMLElement): boolean {
  return Boolean(element && element.nodeType === 1 && element.namespaceURI === 'http://www.w3.org/1999/xhtml' && element.ownerDocument.defaultView && element.isConnected);
}

/**
 * Reader-intent following for one normal vertical top-to-bottom scrollport. No
 * live-region roles, text/markup changes, requests, fake stream, focus movement,
 * selection clearing, virtualization or prepend compensation. Attachment is idle.
 * Host supplies real append counts; ResizeObserver never invents messages/unread.
 * Cached pre-growth geometry keeps a pinned reader pinned. Moving up, selecting,
 * leaving the visible boundary or calling pause releases follow until explicit
 * follow/jump. Automatic writes are instant; native smooth is explicit navigation.
 * There is no animation loop: event/observer work coalesces into one finite frame.
 * IntersectionObserver, if available, checks this element's viewport intersection;
 * it does not prove whole-page visibility or absence of overlays. Without it,
 * document visibility, hidden/inert attributes and measured height are the gates;
 * hosts must pause for their own additional offscreen/occlusion policy.
 * Hidden/detached content never auto-replays. Destroy never restores an old reader
 * offset. Native smooth abort affects only a jump requested by this controller.
 * Content must remain the same direct child; virtualized/reversed/prepended history
 * and scroll anchoring policies are host-owned. Destroy on unmount; idle detachment
 * is detected at the next event, observer callback or public call, without polling.
 */
export function attachGlassFollow(scroller: HTMLElement, input: GlassFollowOptions): GlassFollowController {
  const options = record(input, ['content', 'threshold', 'initiallyFollowing', 'observeResize', 'reducedMotion', 'onChange']);
  const content = options.content as HTMLElement;
  if (!validElement(scroller) || !validElement(content) || content.parentElement !== scroller || content.ownerDocument !== scroller.ownerDocument) return fail('connected scroller and direct content child in one browser document are required');
  if (owners.has(scroller)) return fail('scroller already has a follow controller');
  if (options.threshold !== undefined && (typeof options.threshold !== 'number' || !Number.isFinite(options.threshold))) return fail('threshold must be finite');
  if (options.onChange !== undefined && typeof options.onChange !== 'function') return fail('onChange must be a function');
  const threshold = bounded(options.threshold as number | undefined, 48, 0, 512);
  const initiallyFollowing = boolean(options.initiallyFollowing, true, 'initiallyFollowing');
  const observeResize = boolean(options.observeResize, true, 'observeResize');
  const reducedMotion = boolean(options.reducedMotion, false, 'reducedMotion');
  const onChange = options.onChange as GlassFollowOptions['onChange'];
  const doc = scroller.ownerDocument, view = doc.defaultView!;
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const measure = (): Metrics => {
    const total = scroller.scrollHeight, height = scroller.clientHeight, rawPosition = scroller.scrollTop;
    if (![total, height, rawPosition].every(Number.isFinite) || total < 0 || height < 0) return fail('native scroll geometry must be finite and nonnegative');
    const maximum = Math.max(0, total - height), position = Math.max(0, Math.min(maximum, rawPosition)), distance = maximum - position;
    return { maximum, position, rawPosition, height, distance, nearEnd: distance <= threshold + 1 };
  };
  let metrics = measure(), inViewport = true, destroyed = false, unread = 0, following = false, nativeJump = false;
  let frame: number | null = null, scrollPending = false, touch: { id: number; y: number } | undefined;
  const connected = () => scroller.isConnected && content.isConnected && content.parentElement === scroller && content.ownerDocument === doc && scroller.ownerDocument === doc;
  const visible = () => !destroyed && connected() && !doc.hidden && inViewport && metrics.height > 0 && !scroller.closest('[hidden],[inert],[aria-hidden="true"]');
  const selecting = () => {
    const selection = view.getSelection();
    return Boolean(selection && !selection.isCollapsed && ((selection.anchorNode && content.contains(selection.anchorNode)) || (selection.focusNode && content.contains(selection.focusNode))));
  };
  const snapshot = (): GlassFollowState => Object.freeze({ following, nearEnd: metrics.nearEnd, distance: metrics.distance, unread, visible: visible(), destroyed });
  following = initiallyFollowing && metrics.nearEnd && visible() && !selecting();
  let previousState = snapshot();
  owners.add(scroller);
  const emit = () => {
    const state = snapshot();
    if (Object.keys(state).every(key => state[key as keyof GlassFollowState] === previousState[key as keyof GlassFollowState])) return;
    previousState = state;
    try { onChange?.(state); } catch (error) {
      const Custom = (view as Window & { CustomEvent: typeof CustomEvent }).CustomEvent;
      scroller.dispatchEvent(new Custom('lg-follow-error', { detail: error }));
    }
  };
  const cancelFrame = () => { if (frame !== null) view.cancelAnimationFrame(frame); frame = null; scrollPending = false; };
  const instant = (top: number) => {
    if (typeof scroller.scrollTo === 'function') {
      try { scroller.scrollTo({ top, behavior: 'instant' }); return; } catch { /* older native interface */ }
    }
    scroller.scrollTop = top;
  };
  const abortJump = () => {
    if (!nativeJump) return;
    nativeJump = false;
    if (connected()) instant(Math.max(0, Math.min(Math.max(0, scroller.scrollHeight - scroller.clientHeight), scroller.scrollTop)));
  };
  const pause = () => {
    if (destroyed) return;
    following = false; abortJump(); emit();
  };
  const valid = () => { if (destroyed) return false; if (!connected()) { destroy(); return false; } return true; };
  const writeLatest = () => {
    nativeJump = false;
    if (Math.abs(metrics.position - metrics.maximum) > 1) instant(metrics.maximum);
    metrics = measure();
    if (metrics.nearEnd) unread = 0;
  };
  const process = () => {
    frame = null;
    if (!valid()) return;
    const wasPinned = following && metrics.nearEnd, old = metrics, userScroll = scrollPending; scrollPending = false;
    metrics = measure();
    if (!visible()) { following = false; abortJump(); emit(); return; }
    // Growth/viewport changes are not reader movement. Native scroll events moving
    // up at unchanged/grown range release intent, including scrollbar dragging.
    if (selecting() || (metrics.maximum >= old.maximum && metrics.position < old.position - 1)
      || (userScroll && !nativeJump && metrics.maximum === old.maximum && !metrics.nearEnd)) following = false;
    if (!following) abortJump();
    else if (wasPinned && (!nativeJump || metrics.maximum !== old.maximum)) writeLatest();
    else if (metrics.nearEnd) { unread = 0; if (metrics.distance <= 1) nativeJump = false; }
    else if (!nativeJump) following = false;
    emit();
  };
  const schedule = (fromScroll = false) => {
    if (!valid()) return;
    scrollPending ||= fromScroll;
    if (doc.hidden || !inViewport) { cancelFrame(); following = false; abortJump(); emit(); return; }
    if (frame !== null) return;
    if (typeof view.requestAnimationFrame === 'function') frame = view.requestAnimationFrame(process); else process();
  };
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const Intersection = (view as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  const resize = observeResize && Resize ? new Resize(() => schedule()) : undefined;
  const intersection = Intersection ? new Intersection(entries => {
    if (!valid()) return;
    const entry = entries.find(entry => entry.target === scroller);
    if (!entry) return;
    inViewport = entry.isIntersecting;
    if (!inViewport) { cancelFrame(); pause(); } else schedule();
  }) : undefined;
  resize?.observe(scroller); resize?.observe(content); intersection?.observe(scroller);
  const upward = (event: WheelEvent) => { if (!event.defaultPrevented && !event.ctrlKey && event.deltaY < 0) pause(); };
  const key = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as Element | null;
    if (target?.closest?.('input,textarea,select,button,a[href],[contenteditable]:not([contenteditable="false"])')) return;
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || ((event.key === ' ' || event.key === 'Spacebar') && event.shiftKey)) pause();
  };
  const pointerDown = (event: PointerEvent) => { if (event.pointerType === 'touch' && event.isPrimary !== false) touch = { id: event.pointerId, y: event.clientY }; };
  const pointerMove = (event: PointerEvent) => { if (touch && event.pointerId === touch.id && event.clientY - touch.y > 3) pause(); };
  const pointerEnd = (event: PointerEvent) => { if (touch && event.pointerId === touch.id) touch = undefined; };
  const selection = () => { if (valid() && selecting()) pause(); };
  const visibility = () => {
    if (!valid()) return;
    if (doc.hidden) { cancelFrame(); pause(); } else schedule();
  };
  const preference = () => {
    if (!valid()) return;
    if (nativeJump && (reducedMotion || media?.matches)) {
      abortJump(); metrics = measure(); if (visible() && following) writeLatest(); emit();
    }
  };
  const scrollEnd = () => { if (valid() && nativeJump) { nativeJump = false; schedule(); } };
  const bindings: Parameters<typeof listen>[0][number][] = [
    [scroller, 'scroll', () => schedule(true), { passive: true }], [scroller, 'scrollend', scrollEnd],
    [scroller, 'wheel', upward as EventListener, { passive: true }], [scroller, 'keydown', key as EventListener],
    [scroller, 'pointerdown', pointerDown as EventListener, { passive: true }], [scroller, 'pointermove', pointerMove as EventListener, { passive: true }],
    [view, 'pointerup', pointerEnd as EventListener, { passive: true }], [view, 'pointercancel', pointerEnd as EventListener, { passive: true }],
    [doc, 'selectionchange', selection], [doc, 'visibilitychange', visibility], [view, 'resize', () => schedule()],
  ];
  if (media) bindings.push([media, 'change', preference]);
  const unlisten = listen(bindings);
  function destroy() {
    if (destroyed) return;
    abortJump(); destroyed = true; following = false; cancelFrame(); resize?.disconnect(); intersection?.disconnect(); unlisten(); owners.delete(scroller); emit();
  }
  const jumpLatest = (settings: { readonly smooth?: boolean } = {}): boolean => {
    const config = record(settings, ['smooth']), smooth = boolean(config.smooth, false, 'smooth');
    if (!valid()) return false;
    cancelFrame(); metrics = measure();
    if (!visible()) { pause(); return false; }
    following = true; abortJump();
    if (smooth && !reducedMotion && !media?.matches && metrics.distance > 1 && typeof scroller.scrollTo === 'function') {
      nativeJump = true;
      try { scroller.scrollTo({ top: metrics.maximum, behavior: 'smooth' }); } catch { writeLatest(); }
      metrics = measure(); if (metrics.nearEnd) unread = 0;
    } else writeLatest();
    emit(); return true;
  };
  return {
    get state() { valid(); return snapshot(); },
    notifyAppend(count: number) {
      if (!Number.isSafeInteger(count) || count < 0 || count > 1e6) return fail('append count must be a safe integer from 0 to 1e6');
      if (!valid()) return;
      if (!Number.isSafeInteger(unread + count)) throw new RangeError('Glass follow unread count would exceed safe integer precision');
      // Hidden append notifications update real counts without forcing layout.
      // Geometry is refreshed after visibility returns, with follow still paused.
      if (doc.hidden || !inViewport || scroller.closest('[hidden],[inert],[aria-hidden="true"]')) {
        unread += count; following = false; abortJump(); emit(); return;
      }
      const old = metrics, position = Math.max(0, Math.min(old.maximum, scroller.scrollTop));
      const pinned = following && old.nearEnd && old.maximum - position <= threshold + 1 && position >= old.position - 1;
      metrics = measure(); unread += count;
      if (pinned && visible() && !selecting()) writeLatest();
      else { if (!nativeJump || !visible() || selecting()) { following = false; abortJump(); } }
      emit();
    },
    refresh() { if (valid()) { const userScroll = scrollPending; cancelFrame(); scrollPending = userScroll; process(); } },
    pause() { if (valid()) pause(); }, follow: () => jumpLatest(), jumpLatest, destroy,
  };
}
