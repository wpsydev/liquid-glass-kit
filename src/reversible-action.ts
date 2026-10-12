export type GlassReversiblePhase = 'apply' | 'undo' | 'commit';
export type GlassReversibleStatus = 'idle' | 'applying' | 'available' | 'undoing' | 'committing' | 'undone' | 'committed' | 'error' | 'destroyed';
export type GlassReversiblePause = 'manual' | 'focus' | 'pointer' | 'hidden';
export interface GlassReversibleContext {
  readonly key: string;
  readonly generation: number;
  readonly phase: GlassReversiblePhase;
  readonly signal: AbortSignal;
  readonly cause: 'explicit' | 'deadline';
}
export interface GlassReversibleState<Receipt = unknown> {
  readonly key: string;
  readonly generation: number;
  readonly status: GlassReversibleStatus;
  readonly phase: GlassReversiblePhase | null;
  /** True only once apply resolves. A valid host receipt may itself be undefined. */
  readonly hasReceipt: boolean;
  /** Host-owned reference. It is never copied, frozen, inspected or executed. */
  readonly receipt?: Receipt;
  readonly error?: unknown;
  readonly paused: boolean;
  readonly pauseReasons: readonly GlassReversiblePause[];
  readonly remainingMs: number | null;
  /** Monotonic local-clock timestamp, not a wall-clock/server deadline. */
  readonly deadlineMs: number | null;
}
export interface GlassReversibleOutcome<Receipt = unknown> {
  readonly phase: GlassReversiblePhase;
  /** Completion after destroy: host work resolved, but controller state stayed destroyed. */
  readonly stale: boolean;
  readonly receipt: Receipt;
  readonly state: GlassReversibleState<Receipt>;
}
export interface GlassReversibleAcknowledgment<Receipt = unknown> { readonly receipt: Receipt }
export interface GlassReversibleActionOptions<Receipt = unknown> {
  readonly key: string;
  /** Invoke immediately; resolve only after the host actually applied its provisional change. */
  readonly apply: (context: GlassReversibleContext) => GlassReversibleAcknowledgment<Receipt> | Promise<GlassReversibleAcknowledgment<Receipt>>;
  /** Real host compensation. It is not a guarantee of database/network rollback. */
  readonly undo: (receipt: Receipt, context: GlassReversibleContext) => void | Promise<void>;
  /** Resolve only after the host's actual finalization; deadline expiry alone is not success. */
  readonly commit: (receipt: Receipt, context: GlassReversibleContext) => void | Promise<void>;
  /** Persistent by default. Explicit timed windows accept integer 1,000–60,000ms. */
  readonly timeout?: number | null;
  readonly onChange?: (state: GlassReversibleState<Receipt>) => void | Promise<void>;
}
export interface GlassReversibleAction<Receipt = unknown> {
  /** Reading available state samples remaining time; no internal polling/announcements. */
  readonly state: GlassReversibleState<Receipt>;
  /** Latest real host-phase promise, including automatic commit and late failures. */
  readonly lastOperation: Promise<GlassReversibleOutcome<Receipt>> | null;
  /** Latest onChange exception, isolated from the actual host operation. */
  readonly observerError: unknown;
  start(): Promise<GlassReversibleOutcome<Receipt>>;
  undo(): Promise<GlassReversibleOutcome<Receipt>>;
  commit(): Promise<GlassReversibleOutcome<Receipt>>;
  /** Reasons compose: leaving pointer hover does not release an active focus pause. */
  pause(reason?: GlassReversiblePause): boolean;
  resume(reason?: GlassReversiblePause): boolean;
  /** Abort intent + timer cleanup only. Never silently undo or commit host work. */
  destroy(): void;
}
const reasons: readonly GlassReversiblePause[] = ['manual', 'focus', 'pointer', 'hidden'];
type Operation<Receipt> = { phase: GlassReversiblePhase; generation: number; controller: AbortController; promise: Promise<GlassReversibleOutcome<Receipt>>; resolve(value: GlassReversibleOutcome<Receipt>): void; reject(error: unknown): void };
function ordinary(value: unknown): value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value); if (prototype === null || prototype === Object.prototype) return true;
  // A different realm has its own Object.prototype. Inspect data descriptors,
  // never invoke constructor/getters, and still reject normal class prototypes.
  const constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor');
  return Object.getPrototypeOf(prototype) === null && Boolean(constructor && 'value' in constructor && typeof constructor.value === 'function');
}
function config<Receipt>(input: GlassReversibleActionOptions<Receipt>) {
  if (!ordinary(input)) throw new TypeError('Use ordinary reversible action options');
  const output: Record<string, unknown> = Object.create(null), allowed = ['key', 'apply', 'undo', 'commit', 'timeout', 'onChange'];
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError('Unsupported reversible action option'); const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (!('value' in descriptor) || !descriptor.enumerable) throw new TypeError('Reversible action accessors are not supported'); output[key] = descriptor.value;
  }
  if (typeof output.key !== 'string' || output.key.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(output.key)) throw new TypeError('Use a stable reversible action key of at most 128 ASCII characters');
  for (const key of ['apply', 'undo', 'commit']) if (typeof output[key] !== 'function') throw new TypeError(`Supply an explicit host ${key} callback`);
  if (output.onChange !== undefined && typeof output.onChange !== 'function') throw new TypeError('onChange must be a host callback');
  const timeout = output.timeout ?? null;
  if (timeout !== null && (typeof timeout !== 'number' || !Number.isSafeInteger(timeout) || timeout < 1000 || timeout > 60000)) throw new RangeError('Explicit reversible timeout must be 1,000–60,000 milliseconds or null');
  return { key: output.key, apply: output.apply as GlassReversibleActionOptions<Receipt>['apply'], undo: output.undo as GlassReversibleActionOptions<Receipt>['undo'], commit: output.commit as GlassReversibleActionOptions<Receipt>['commit'], onChange: output.onChange as GlassReversibleActionOptions<Receipt>['onChange'], timeout };
}
const rejected = <Receipt>(error: unknown): Promise<GlassReversibleOutcome<Receipt>> => { const promise = Promise.reject<GlassReversibleOutcome<Receipt>>(error); void promise.catch(() => {}); return promise; };
function acknowledgment<Receipt>(value: unknown): Receipt {
  if (!ordinary(value)) throw new TypeError('Host apply must acknowledge a plain { receipt } object');
  const keys = Reflect.ownKeys(value), descriptor = Object.getOwnPropertyDescriptor(value, 'receipt');
  if (keys.length !== 1 || keys[0] !== 'receipt' || !descriptor || !('value' in descriptor) || !descriptor.enumerable) throw new TypeError('Host apply acknowledgment requires one own receipt data property');
  return descriptor.value as Receipt;
}

/**
 * One independent host-owned reversible operation. Default persistent Undo has no
 * deadline or background work. Render native Undo/Commit buttons yourself; clicks,
 * keyboard and touch use the same methods. No hold-only gesture, DOM listener,
 * authentication, transaction rollback, retry, queue or automatic focus exists.
 * Timed mode requires an equally available non-timed host restore/history path.
 * Hosts wire pause('focus'/'pointer'/'hidden') and matching resume to their notice
 * and visibility lifecycle; this pure model cannot observe a document implicitly.
 * One active deadline timeout, no RAF/interval. Browser timers may be throttled.
 * A timeout chooses actual commit; committed appears only after the host resolves.
 * apply acknowledges a plain { receipt } before Undo is available. Unknown receipt
 * references never pass through Promise resolution. Async callbacks return native
 * Promises (including other realms); arbitrary thenable objects are not accepted.
 * First Undo/Commit choice locks the operation, duplicate in-flight calls share
 * its promise, and competing choices
 * reject. Errors stop the window and retain any acknowledged receipt. A failed
 * callback may have partially changed host state: explicit host recovery is needed;
 * there is no reset or replay. Recreate only after verifying actual host state.
 * Destroy clears timers and signals abort without compensation/finalization. Host
 * work may continue. Its original promise remains observable through lastOperation;
 * a late apply outcome carries its receipt and stale:true without repainting state.
 * Snapshots are frozen shallowly; unknown receipts/errors remain host references.
 */
export function createGlassReversibleAction<Receipt = unknown>(input: GlassReversibleActionOptions<Receipt>): GlassReversibleAction<Receipt> {
  const options = config(input);
  const now = () => { if (typeof performance === 'undefined' || typeof performance.now !== 'function') throw new Error('Timed reversible actions require a native monotonic performance clock'); return performance.now(); };
  let generation = 0, destroyed = false, hasReceipt = false, receipt: Receipt;
  let remaining: number | null = null, deadline: number | null = null, timer: ReturnType<typeof setTimeout> | null = null;
  let current: Operation<Receipt> | null = null, lastOperation: Promise<GlassReversibleOutcome<Receipt>> | null = null, observerError: unknown;
  const paused = new Set<GlassReversiblePause>();
  let state: GlassReversibleState<Receipt> = Object.freeze({ key: options.key, generation, status: 'idle', phase: null, hasReceipt: false, paused: false, pauseReasons: Object.freeze([]), remainingMs: null, deadlineMs: null });
  function left() { return remaining === null ? null : deadline === null ? remaining : Math.max(0, deadline - now()); }
  function snapshot(): GlassReversibleState<Receipt> { return Object.freeze({ ...state, paused: paused.size > 0, pauseReasons: Object.freeze([...paused]), remainingMs: state.status === 'available' ? left() : null, deadlineMs: state.status === 'available' ? deadline : null }); }
  function stopTimer() { remaining = left(); deadline = null; if (timer !== null) clearTimeout(timer); timer = null; }
  function publish(status: GlassReversibleStatus, phase: GlassReversiblePhase | null, error?: unknown, failed = false) {
    state = Object.freeze({ key: options.key, generation, status, phase, hasReceipt, ...(hasReceipt ? { receipt } : {}), ...(failed ? { error } : {}), paused: paused.size > 0, pauseReasons: Object.freeze([...paused]), remainingMs: status === 'available' ? left() : null, deadlineMs: status === 'available' ? deadline : null });
    const published = state;
    try {
      const notification = options.onChange?.(published);
      if (notification !== undefined) {
        const observed = Promise.prototype.then.call(notification, undefined, (error: unknown) => { observerError = error; }) as Promise<unknown>;
        void Promise.prototype.then.call(observed, undefined, (error: unknown) => { observerError = error; });
      }
    } catch (error) { observerError = error; }
    return published;
  }
  function arm() {
    if (destroyed || state.status !== 'available' || paused.size || remaining === null) return;
    deadline = now() + remaining;
    timer = setTimeout(() => {
      timer = null; if (destroyed || state.status !== 'available' || paused.size) return;
      remaining = left(); deadline = null;
      if (remaining !== null && remaining > 0) { arm(); return; }
      remaining = 0; void perform('commit', 'deadline').catch(() => {});
    }, Math.ceil(remaining));
  }
  function perform(phase: GlassReversiblePhase, cause: 'explicit' | 'deadline' = 'explicit'): Promise<GlassReversibleOutcome<Receipt>> {
    if (destroyed) return rejected<Receipt>(new Error('Reversible action is destroyed'));
    if (current) return current.phase === phase ? current.promise : rejected(new Error(`Reversible ${current.phase} already owns this operation`));
    if ((phase === 'apply' && state.status !== 'idle') || (phase !== 'apply' && state.status !== 'available')) return rejected<Receipt>(new Error(`Cannot ${phase} while reversible action is ${state.status}`));
    if (phase === 'apply' && options.timeout !== null) { try { now(); } catch (error) { return rejected<Receipt>(error); } }
    stopTimer(); if (phase === 'apply') generation++;
    let resolve!: Operation<Receipt>['resolve'], reject!: Operation<Receipt>['reject']; const promise = new Promise<GlassReversibleOutcome<Receipt>>((yes, no) => { resolve = yes; reject = no; }); void promise.catch(() => {});
    const operation: Operation<Receipt> = { phase, generation, controller: new AbortController(), promise, resolve, reject }; current = operation; lastOperation = promise;
    const context: GlassReversibleContext = Object.freeze({ key: options.key, generation, phase, signal: operation.controller.signal, cause });
    publish(phase === 'apply' ? 'applying' : phase === 'undo' ? 'undoing' : 'committing', phase);
    // An observer may dispose the model before callback invocation. No host work
    // was started in this case; do not call it with an already-expired lease.
    if (destroyed || current !== operation) { operation.reject(new Error('Reversible action was destroyed before host invocation')); return promise; }
    const settle = (value: unknown) => {
      const resultReceipt = phase === 'apply' ? acknowledgment<Receipt>(value) : receipt;
      if (phase !== 'apply' && value !== undefined) throw new TypeError('Host undo/commit must resolve void after actual completion');
      if (destroyed || current !== operation || generation !== operation.generation) { operation.resolve(Object.freeze({ phase, stale: true, receipt: resultReceipt, state: snapshot() })); return; }
      current = null;
      if (phase === 'apply') { receipt = resultReceipt; hasReceipt = true; remaining = options.timeout; }
      else { remaining = deadline = null; paused.clear(); }
      // Start a finite window only after actual apply acknowledgment, before the
      // state notification so hosts can immediately pause or choose Undo.
      const status = phase === 'apply' ? 'available' : phase === 'undo' ? 'undone' : 'committed';
      state = Object.freeze({ ...state, status }); if (phase === 'apply') arm();
      const published = publish(status, phase); operation.resolve(Object.freeze({ phase, stale: false, receipt: resultReceipt, state: published }));
    };
    const failure = (error: unknown) => {
      if (!destroyed && current === operation && generation === operation.generation) { current = null; stopTimer(); remaining = null; paused.clear(); publish('error', phase, error, true); }
      operation.reject(error);
    };
    const fulfilled = (value: unknown) => { try { settle(value); } catch (error) { failure(error); } };
    try {
      const work = phase === 'apply' ? options.apply(context) : phase === 'undo' ? options.undo(receipt, context) : options.commit(receipt, context);
      const plain = ordinary(work);
      if ((phase === 'apply' && plain) || (phase !== 'apply' && work === undefined)) fulfilled(work);
      else {
        // Observe the known native-Promise host protocol without reading an
        // arbitrary receipt's then property or executing an untrusted thenable.
        const observed = Promise.prototype.then.call(work, fulfilled, failure) as Promise<unknown>;
        void Promise.prototype.then.call(observed, undefined, failure);
      }
    } catch (error) { failure(error); }
    return promise;
  }
  function reason(value: GlassReversiblePause) { if (!reasons.includes(value)) throw new TypeError('Use manual, focus, pointer or hidden pause reason'); }
  function mayPause() { return !destroyed && ['idle', 'applying', 'available'].includes(state.status); }
  return {
    get state() { return snapshot(); }, get lastOperation() { return lastOperation; }, get observerError() { return observerError; },
    start: () => perform('apply'), undo: () => perform('undo'), commit: () => perform('commit'),
    pause(value = 'manual') { reason(value); if (!mayPause() || paused.has(value)) return false; stopTimer(); paused.add(value); publish(state.status, state.phase, state.error, state.status === 'error'); return true; },
    resume(value = 'manual') { reason(value); if (!mayPause() || !paused.delete(value)) return false; arm(); publish(state.status, state.phase, state.error, state.status === 'error'); return true; },
    destroy() { if (destroyed) return; destroyed = true; generation++; stopTimer(); remaining = deadline = null; paused.clear(); const operation = current; current = null; operation?.controller.abort(); publish('destroyed', state.phase); },
  };
}
