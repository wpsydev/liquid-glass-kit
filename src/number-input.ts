import { bounded } from './numeric.js';
import { listen } from './lifecycle.js';

export interface GlassNumberInputState {
  readonly raw: string;
  readonly value: number | null;
  readonly empty: boolean;
  readonly valid: boolean;
  readonly validity: { readonly badInput: boolean; readonly valueMissing: boolean; readonly rangeUnderflow: boolean; readonly rangeOverflow: boolean; readonly stepMismatch: boolean; readonly customError: boolean };
  readonly precisionSupported: boolean;
  readonly canStep: boolean;
  readonly canScrub: boolean;
  readonly scrubbing: boolean;
}
export type GlassNumberCancelReason = 'manual' | 'escape' | 'pointercancel' | 'lostcapture' | 'blur' | 'hidden' | 'detached' | 'disabled' | 'constraints' | 'external-owner' | 'secondary-pointer' | 'updated' | 'destroyed';
export interface GlassNumberInputSettings {
  /** Default8, clamped2–64. Modifier speed changes rebase at the current draft. */
  readonly pixelsPerStep?: number;
  /** Defaultfalse. Shift10× stepping/scrub; Alt slower scrub on the same native grid. */
  readonly modifierKeys?: boolean;
  /** Defaultfalse: native change reports actual validation without coercing values. */
  readonly normalizeOnChange?: boolean;
}
export interface GlassNumberInputOptions extends GlassNumberInputSettings {
  readonly handle?: HTMLButtonElement;
  readonly incrementButton?: HTMLButtonElement;
  readonly decrementButton?: HTMLButtonElement;
  readonly onInput?: (state: GlassNumberInputState, source: 'typing' | 'step' | 'scrub' | 'normalize' | 'cancel') => void;
  readonly onCommit?: (state: GlassNumberInputState, source: 'manual' | 'change' | 'step' | 'scrub') => void;
  readonly onCancel?: (state: GlassNumberInputState, reason: GlassNumberCancelReason) => void;
}
export interface GlassNumberInput {
  readonly state: GlassNumberInputState;
  /** Explicit native steps, signed integer±1–1000. Unsupported precision declines. */
  step(steps: number): boolean;
  /** Explicit clamp/snap of finite values; blank/badInput remains native. */
  commit(): GlassNumberInputState;
  cancel(): boolean;
  refresh(): void;
  update(settings?: GlassNumberInputSettings): void;
  destroy(): void;
}
type Rules = { supported: boolean; quantum: number | null; scale: number; base: number; low: number; high: number; min: number | null; max: number | null; signature: string };
type Gesture = { id: number; origin: string; owned: string; rules: Rules; anchorX: number; anchorIndex: number; factor: number; desired: number; wrote: boolean; captured: boolean; cleanup(): void };
const attached = new WeakSet<HTMLInputElement>(), buttons = new WeakSet<HTMLButtonElement>();
const limit = 1e9;
const normalize = (options: GlassNumberInputSettings) => ({ pixelsPerStep: bounded(options.pixelsPerStep, 8, 2, 64), modifierKeys: options.modifierKeys === true, normalizeOnChange: options.normalizeOnChange === true });
const numeric = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i;
function places(value: number) { const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e'); return Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent)); }
const fingerprint = (attrs: readonly (string | null)[]) => JSON.stringify([attrs[0], attrs[1], attrs[2], attrs[0] !== null && attrs[0] !== '' && numeric.test(attrs[0]) ? null : attrs[3], attrs[4]]);
const signature = (input: HTMLInputElement) => fingerprint(['min', 'max', 'step', 'value', 'type'].map(key => input.getAttribute(key)));
function rules(input: HTMLInputElement): Rules {
  const attrs = ['min', 'max', 'step', 'value', 'type'].map(key => input.getAttribute(key)), signature = fingerprint(attrs);
  let supported = input.type === 'number';
  const parse = (raw: string | null): number | null => { if (raw === null || raw === '') return null; if (raw.length > 64 || !numeric.test(raw)) { supported = false; return null; } const value = Number(raw); if (!Number.isFinite(value) || Math.abs(value) > limit || places(value) > 6) supported = false; return value; };
  const min = parse(attrs[0]), max = parse(attrs[1]), attributeValue = min === null ? parse(attrs[3]) : null;
  const any = attrs[2]?.toLowerCase() === 'any', step = any ? null : attrs[2] === null || attrs[2] === '' ? 1 : parse(attrs[2]);
  if (!any && (step === null || step <= 0)) supported = false;
  if (min !== null && max !== null && min > max) supported = false;
  const baseValue = min ?? attributeValue ?? 0, precision = Math.max(...[min, max, baseValue, step].filter((value): value is number => value !== null && Number.isFinite(value)).map(places)), scale = supported ? 10 ** precision : 1;
  const base = Math.round(baseValue * scale), quantum = step === null ? null : Math.round(step * scale), lower = Math.round((min ?? -limit) * scale), upper = Math.round((max ?? limit) * scale);
  if (![base, lower, upper, ...(quantum === null ? [] : [quantum])].every(Number.isSafeInteger) || (quantum !== null && quantum <= 0)) supported = false;
  const low = quantum ? Math.ceil((lower - base) / quantum) : lower, high = quantum ? Math.floor((upper - base) / quantum) : upper;
  if (low > high) supported = false;
  return { supported, quantum, scale, base, low, high, min, max, signature };
}
function classLease(element: HTMLElement, name: string) { const had = element.classList.contains(name), attribute = element.hasAttribute('class'); element.classList.add(name); return () => { if (!had && element.classList.contains(name)) { element.classList.remove(name); if (!attribute && element.classList.length === 0) element.removeAttribute('class'); } }; }

/**
 * Enhance an authored native number input, with optional named type=button tap
 * controls and one dedicated scrub handle. No replaced input, custom spinbutton,
 * wheel interception, default arrow/Enter/submit override, locale formatter, save
 * callback or financial guarantee. Native name/labels/constraints/validity remain.
 * Typing/badInput/empty drafts are never rewritten. Native change reports by default;
 * only commit() or normalizeOnChange:true clamps/snaps finite values. step='any'
 * permits clamp-only commit; it never invents a scrub/step granularity. Canonical
 * authored numeric attributes≤64 characters, ≤6 decimal places and |value|≤1e9
 * permit bounded scaled-integer calculations. Other constraints/numbers leave
 * native editing/arrows/validation intact and decline helper stepping/scrubbing.
 * Step base follows min, then value ATTRIBUTE, then0; equal snap ties favor the
 * positive direction. Tap stepping delegates directional alignment to native APIs.
 * Optional modifiers preserve the native grid; Alt slows drag distance, not step.
 * A real typed field or tap step controls supplies a non-drag alternative. Import
 * number-input.css for44px/16px targets; visible labels/unit are host-authored.
 * Only the dedicated handle owns touch-action:none. Pointer deltas require no rect
 * reads; one coalesced RAF exists only for active scrub packets, no idle runner.
 * User release commits once; cancellation restores only still-owned gesture draft.
 * Changed host values/constraints win. Native synthetic input/change events carry
 * actual values with isTrusted:false. Controlled frameworks must explicitly sync
 * host state through callbacks/adapters; this is not universal React drop-in binding.
 * Notification callbacks are synchronous; hosts own async work/error handling.
 * A thrown notification reports lg-number-input-error without changing native value.
 */
export function attachGlassNumberInput(input: HTMLInputElement, initial: GlassNumberInputOptions = {}): GlassNumberInput {
  const doc = input?.ownerDocument, browser = doc?.defaultView;
  if (!browser || !(input instanceof browser.HTMLInputElement) || input.type !== 'number' || !input.isConnected || attached.has(input)) throw new Error('Use an unowned connected native number input');
  const view = browser, handle = initial.handle, increment = initial.incrementButton, decrement = initial.decrementButton;
  const controls = [handle, increment, decrement].filter((button): button is HTMLButtonElement => button !== undefined);
  if (new Set(controls).size !== controls.length || controls.some(button => !(button instanceof view.HTMLButtonElement) || button.type !== 'button' || button.ownerDocument !== doc || !button.isConnected || buttons.has(button))) throw new Error('Use distinct unowned connected native type=button controls in the same document');
  const named = (element: HTMLElement) => Boolean(element.textContent?.trim() || element.getAttribute('aria-label')?.trim() || element.getAttribute('aria-labelledby')?.trim());
  if (controls.some(button => !named(button))) throw new Error('Number controls require authored accessible names');
  const { onInput, onCommit, onCancel } = initial;
  if ([onInput, onCommit, onCancel].some(callback => callback !== undefined && typeof callback !== 'function')) throw new TypeError('Number input callbacks must be host functions');
  let options = normalize(initial), destroyed = false, dispatching = 0, gesture: Gesture | null = null, frame = 0, suppressClick = false;
  const touch = handle ? { value: handle.style.getPropertyValue('touch-action'), priority: handle.style.getPropertyPriority('touch-action') } : null;
  if (handle) handle.style.setProperty('touch-action', 'none');
  const restoreClasses = [classLease(input, 'lg-number-input'), ...controls.map(button => classLease(button, button === handle ? 'lg-number-scrub-handle' : 'lg-number-step'))];
  const originalMarker = handle?.getAttribute('data-lg-number-scrubbing') ?? null;
  const marker = (value: string | null) => { if (!handle) return; value === null ? handle.removeAttribute('data-lg-number-scrubbing') : handle.setAttribute('data-lg-number-scrubbing', value); };
  const report = (error: unknown, phase: string) => input.dispatchEvent(new view.CustomEvent('lg-number-input-error', { bubbles: true, detail: { error, phase } }));
  const blocked = () => destroyed || input.ownerDocument !== doc || input.type !== 'number' || !input.isConnected || input.readOnly || input.matches(':disabled,[aria-disabled="true"]') || Boolean(input.closest('[hidden],[inert]')) || doc.hidden;
  const allowedButton = (button: HTMLButtonElement) => button.ownerDocument === doc && button.isConnected && !button.matches(':disabled,[aria-disabled="true"]') && !button.closest('[hidden],[inert]');
  function snapshot(): GlassNumberInputState {
    const value = input.valueAsNumber, configuration = rules(input), numericValue = Number.isFinite(value) ? value : null, validity = input.validity;
    const precisionSupported = configuration.supported && (numericValue === null || Math.abs(numericValue) <= limit), canStep = !blocked() && precisionSupported && configuration.quantum !== null && !validity.badInput;
    return Object.freeze({ raw: input.value, value: numericValue, empty: input.value === '', valid: validity.valid, validity: Object.freeze({ badInput: validity.badInput, valueMissing: validity.valueMissing, rangeUnderflow: validity.rangeUnderflow, rangeOverflow: validity.rangeOverflow, stepMismatch: validity.stepMismatch, customError: validity.customError }), precisionSupported, canStep, canScrub: canStep && numericValue !== null && !validity.stepMismatch && !validity.rangeUnderflow && !validity.rangeOverflow, scrubbing: gesture !== null });
  }
  function notify(kind: 'input' | 'commit' | 'cancel', source: string) {
    if (destroyed || (kind !== 'cancel' && input.ownerDocument !== doc)) return;
    try { if (kind === 'input') onInput?.(snapshot(), source as Parameters<NonNullable<GlassNumberInputOptions['onInput']>>[1]); else if (kind === 'commit') onCommit?.(snapshot(), source as Parameters<NonNullable<GlassNumberInputOptions['onCommit']>>[1]); else onCancel?.(snapshot(), source as GlassNumberCancelReason); }
    catch (error) { report(error, kind); }
  }
  function native(type: 'input' | 'change') { dispatching++; try { input.dispatchEvent(type === 'input' && typeof view.InputEvent === 'function' ? new view.InputEvent(type, { bubbles: true, inputType: 'insertReplacementText' }) : new view.Event(type, { bubbles: true })); } finally { dispatching--; } }
  function changed(source: Parameters<NonNullable<GlassNumberInputOptions['onInput']>>[1]) { native('input'); notify('input', source); }
  function write(value: number, source: 'scrub' | 'normalize') { if (input.valueAsNumber === value) return false; input.value = String(value); if (gesture) { gesture.owned = input.value; gesture.wrote = true; } changed(source); return true; }
  function owned(current: Gesture) { return input.ownerDocument === doc && input.value === current.owned && signature(input) === current.rules.signature; }
  function stop(reason: GlassNumberCancelReason, commit = false, notifyCommit = true) {
    const current = gesture; if (!current) return false;
    const restore = owned(current) && reason !== 'constraints' && reason !== 'external-owner'; gesture = null; if (frame) view.cancelAnimationFrame(frame); frame = 0; current.cleanup();
    if (handle?.getAttribute('data-lg-number-scrubbing') === 'true') marker(originalMarker);
    try { if (current.captured && (!handle?.hasPointerCapture || handle.hasPointerCapture(current.id))) handle?.releasePointerCapture?.(current.id); } catch { /* Native capture may already have ended. */ }
    suppressClick = current.wrote || !commit;
    if (!commit && restore && input.value !== current.origin) { input.value = current.origin; changed('cancel'); }
    if (!commit) notify('cancel', reason);
    else if (notifyCommit && restore && current.wrote && !blocked()) { native('change'); notify('commit', 'scrub'); }
    return true;
  }
  function invalid(current: Gesture): GlassNumberCancelReason | null {
    if (!input.isConnected || !handle?.isConnected || input.ownerDocument !== doc || handle.ownerDocument !== doc) return 'detached';
    if (signature(input) !== current.rules.signature) return 'constraints';
    if (input.value !== current.owned || handle.style.getPropertyValue('touch-action') !== 'none' || handle.style.getPropertyPriority('touch-action') !== '') return 'external-owner';
    if (doc.hidden || input.closest('[hidden],[inert]') || handle.closest('[hidden],[inert]')) return 'hidden';
    if (blocked() || !allowedButton(handle)) return 'disabled';
    return null;
  }
  function flush() {
    frame = 0; const current = gesture; if (!current) return; const reason = invalid(current); if (reason) { stop(reason); return; }
    const integer = current.rules.base + current.desired * current.rules.quantum!;
    if (!Number.isSafeInteger(integer)) { stop('constraints'); return; } write(integer / current.rules.scale, 'scrub');
  }
  function schedule() { if (!frame) frame = view.requestAnimationFrame(flush); }
  function commit(source: 'manual' | 'change' = 'manual', dispatchChange = true) {
    if (gesture) { if (frame) { view.cancelAnimationFrame(frame); frame = 0; flush(); } stop('manual', true, false); } if (blocked()) return snapshot();
    const state = snapshot(), configuration = rules(input);
    if ((source === 'manual' || options.normalizeOnChange) && state.precisionSupported && state.value !== null && !state.validity.badInput) {
      let value = Math.min(configuration.max ?? limit, Math.max(configuration.min ?? -limit, state.value));
      if (configuration.quantum !== null) { const index = Math.min(configuration.high, Math.max(configuration.low, Math.round((value * configuration.scale - configuration.base) / configuration.quantum))); value = (configuration.base + index * configuration.quantum) / configuration.scale; }
      write(value, 'normalize');
    }
    if (!destroyed) { if (dispatchChange) native('change'); notify('commit', source); } return snapshot();
  }
  function step(count: number) {
    if (!Number.isSafeInteger(count) || count === 0 || Math.abs(count) > 1000) throw new RangeError('Number steps must be signed integers±1–1000');
    if (gesture) stop('manual'); if (!snapshot().canStep) return false;
    const before = input.value, configuration = rules(input);
    try { count > 0 ? input.stepUp(count) : input.stepDown(-count); } catch (error) { report(error, 'step'); return false; }
    const result = input.valueAsNumber;
    if (!Number.isFinite(result) || Math.abs(result) > limit) { input.value = before; return false; }
    const integer = Math.round(result * configuration.scale); if (!Number.isSafeInteger(integer)) { input.value = before; return false; }
    input.value = String(integer / configuration.scale);
    if (input.value === before) return false; changed('step'); if (!destroyed) { native('change'); notify('commit', 'step'); } return true;
  }
  function down(event: PointerEvent) {
    if (!handle || gesture || event.defaultPrevented || event.button !== 0 || event.isPrimary === false || !['mouse', 'touch', 'pen'].includes(event.pointerType) || !Number.isFinite(event.clientX) || !allowedButton(handle) || !snapshot().canScrub) return;
    if (view.getComputedStyle(input).display === 'none' || view.getComputedStyle(handle).display === 'none') return;
    const configuration = rules(input), index = Math.round((input.valueAsNumber * configuration.scale - configuration.base) / configuration.quantum!);
    const factor = (event: PointerEvent) => options.modifierKeys ? (event.shiftKey ? 10 : 1) * (event.altKey ? .1 : 1) : 1;
    const current: Gesture = { id: event.pointerId, origin: input.value, owned: input.value, rules: configuration, anchorX: event.clientX, anchorIndex: index, factor: factor(event), desired: index, wrote: false, captured: false, cleanup() {} };
    gesture = current; suppressClick = false; marker('true'); event.preventDefault();
    const move = (packet: PointerEvent, releasing = false) => {
      if (gesture !== current || packet.pointerId !== current.id || packet.defaultPrevented || !Number.isFinite(packet.clientX)) return;
      if (!releasing && packet.pointerType === 'mouse' && packet.buttons === 0) { stop('pointercancel'); return; }
      const reason = invalid(current); if (reason) { stop(reason); return; }
      const speed = factor(packet); if (speed !== current.factor) { current.anchorX = packet.clientX; current.anchorIndex = current.desired; current.factor = speed; }
      const delta = Math.max(-1000000, Math.min(1000000, Math.trunc((packet.clientX - current.anchorX) / options.pixelsPerStep * speed)));
      current.desired = Math.min(configuration.high, Math.max(configuration.low, current.anchorIndex + delta)); schedule();
    };
    const up = (packet: PointerEvent) => { if (gesture !== current || packet.pointerId !== current.id) return; if (packet.defaultPrevented || (packet.pointerType === 'mouse' && packet.button !== 0)) { stop('manual'); return; } move(packet, true); if (frame) { view.cancelAnimationFrame(frame); frame = 0; flush(); } if (gesture !== current) return; const reason = invalid(current); if (reason) stop(reason); else { const wrote = current.wrote; stop('manual', true); if (!wrote && !blocked()) input.focus({ preventScroll: true }); } };
    const pointerCancel = (packet: PointerEvent) => { if (packet.pointerId === current.id) stop('pointercancel'); };
    const lost = (packet: PointerEvent) => { if (packet.pointerId === current.id) stop('lostcapture'); };
    const secondary = (packet: PointerEvent) => { if (packet.pointerId !== current.id) stop('secondary-pointer'); };
    const keyboard = (packet: KeyboardEvent) => { if (!packet.defaultPrevented && packet.key === 'Escape') { packet.preventDefault(); stop('escape'); } };
    const focus = () => { if (doc.activeElement !== input && doc.activeElement !== handle) stop('blur'); };
    const blur = () => stop('blur'), visibility = () => { if (doc.hidden) stop('hidden'); }, resize = () => stop('updated');
    const reset = (packet: Event) => { queueMicrotask(() => { if (gesture === current && !packet.defaultPrevented) stop('external-owner'); }); };
    const cleanup = listen([[doc, 'pointermove', move as EventListener], [doc, 'pointerup', up as EventListener], [doc, 'pointercancel', pointerCancel as EventListener], [doc, 'pointerdown', secondary as EventListener], [handle, 'lostpointercapture', lost as EventListener], [doc, 'keydown', keyboard as EventListener], [doc, 'focusin', focus], [view, 'blur', blur], [view, 'resize', resize], [doc, 'visibilitychange', visibility], ...(input.form ? [[input.form, 'reset', reset]] as const : [])]);
    const observer = new view.MutationObserver(records => {
      if (gesture !== current) return; const reason = invalid(current); if (reason) { stop(reason); return; }
      if (records.some(record => record.type === 'attributes' && (record.attributeName === 'style' || record.attributeName === 'class') && record.target instanceof view.HTMLElement && view.getComputedStyle(record.target).display === 'none')) stop('hidden');
    });
    observer.observe(doc, { childList: true, subtree: true }); observer.observe(input, { attributes: true, attributeFilter: ['min', 'max', 'step', 'value', 'type', 'disabled', 'readonly', 'hidden', 'inert', 'style', 'class', 'aria-disabled'] }); observer.observe(handle, { attributes: true, attributeFilter: ['disabled', 'hidden', 'inert', 'style', 'class', 'aria-disabled'] });
    for (let parent = input.parentElement; parent; parent = parent.parentElement) observer.observe(parent, { attributes: true, attributeFilter: ['disabled', 'hidden', 'inert', 'style', 'class'] });
    for (let parent = handle.parentElement; parent; parent = parent.parentElement) observer.observe(parent, { attributes: true, attributeFilter: ['disabled', 'hidden', 'inert', 'style', 'class'] });
    current.cleanup = () => { observer.disconnect(); cleanup(); };
    try { handle.setPointerCapture?.(current.id); current.captured = typeof handle.setPointerCapture === 'function'; } catch { /* Scoped document events remain the fallback. */ }
  }
  const typed = () => { if (dispatching || destroyed) return; if (input.ownerDocument !== doc || !input.isConnected || input.type !== 'number') { if (gesture) stop(input.type === 'number' ? 'detached' : 'constraints'); return; } if (gesture) stop('external-owner'); notify('input', 'typing'); };
  const change = () => { if (!dispatching && !destroyed) commit('change', false); };
  const key = (event: KeyboardEvent) => { if (event.defaultPrevented || !options.modifierKeys || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || !snapshot().canStep) return; event.preventDefault(); step(event.key === 'ArrowUp' ? 10 : -10); };
  const activate = (button: HTMLButtonElement, count: number) => (event: MouseEvent) => { if (!event.defaultPrevented && allowedButton(button)) step(count * (options.modifierKeys && event.shiftKey ? 10 : 1)); };
  const click = (event: MouseEvent) => { if (event.defaultPrevented || !handle || !allowedButton(handle) || blocked()) return; if (suppressClick && event.detail > 0) { suppressClick = false; event.preventDefault(); return; } input.focus({ preventScroll: true }); };
  const unlisten = listen([[input, 'input', typed], [input, 'change', change], [input, 'keydown', key as EventListener], ...(handle ? [[handle, 'pointerdown', down as EventListener], [handle, 'click', click as EventListener]] as const : []), ...(increment ? [[increment, 'click', activate(increment, 1) as EventListener]] as const : []), ...(decrement ? [[decrement, 'click', activate(decrement, -1) as EventListener]] as const : [])]);
  attached.add(input); controls.forEach(button => buttons.add(button));
  return {
    get state() { return snapshot(); }, step, commit: () => commit(), cancel: () => stop('manual'),
    refresh() { if (destroyed) return; if (gesture) { const reason = invalid(gesture); if (reason) stop(reason); } },
    update(next = {}) { if (destroyed) return; if (gesture) stop('updated'); options = normalize(next); },
    destroy() { if (destroyed) return; stop('destroyed'); destroyed = true; unlisten(); restoreClasses.forEach(restore => restore()); if (handle?.style.getPropertyValue('touch-action') === 'none' && handle.style.getPropertyPriority('touch-action') === '') touch!.value ? handle.style.setProperty('touch-action', touch!.value, touch!.priority) : handle.style.removeProperty('touch-action'); attached.delete(input); controls.forEach(button => buttons.delete(button)); },
  };
}
