export type GlassTaskState = 'idle' | 'busy' | 'complete' | 'error' | 'cancelled';
export type GlassTaskAnnouncement = 'off' | 'polite' | 'assertive';
export interface GlassTaskProgressBase {
  /** Unique host-authored native progress ID. No counters or random IDs. */
  readonly id: string;
  readonly label: string;
  /** Distinct stable ID of the separate status node rendered by the host. */
  readonly statusId: string;
  /** Required plain task/stage/outcome text. No business status is synthesized. */
  readonly statusText: string;
  readonly state: GlassTaskState;
  /** Optional host-authored unit context, for example "3 of 8 files processed". */
  readonly valueText?: string;
  readonly describedBy?: string;
  /** Default off; choose meaningful milestone/outcome updates rather than each tick. */
  readonly statusAnnouncement?: GlassTaskAnnouncement;
  /** Opt-in decorative motion, only for busy + indeterminate. Default false. */
  readonly animated?: boolean;
  readonly reducedMotion?: boolean;
}
export interface GlassDeterminateTaskProgress extends GlassTaskProgressBase {
  readonly mode: 'determinate';
  /** Host-reported finite amount between zero and max. Over-max is rejected, not clamped. */
  readonly value: number;
  /** Required finite positive total, never inferred or defaulted to 100. */
  readonly max: number;
}
export interface GlassIndeterminateTaskProgress extends GlassTaskProgressBase {
  readonly mode: 'indeterminate';
  readonly value?: never;
  readonly max?: never;
}
export type GlassTaskProgressOptions = GlassDeterminateTaskProgress | GlassIndeterminateTaskProgress;
export interface GlassNativeTaskProgressProps {
  readonly id: string;
  readonly className: 'lg-task-bar';
  readonly value?: number;
  readonly max?: number;
  readonly hidden: boolean;
  readonly 'aria-describedby': string;
  readonly 'aria-valuetext'?: string;
}
export interface GlassTaskProgressText {
  readonly props: {
    readonly className: 'lg-task-label' | 'lg-task-status';
    readonly htmlFor?: string;
    readonly id?: string;
    readonly role?: 'status' | 'alert';
    readonly 'aria-atomic'?: true;
  };
  /** Render as escaped text/children/textContent, never as innerHTML. */
  readonly text: string;
}
export interface GlassTaskProgressProps {
  readonly progress: GlassNativeTaskProgressProps;
  readonly label: GlassTaskProgressText;
  readonly status: GlassTaskProgressText;
  readonly frame: {
    readonly className: 'lg-task-progress';
    readonly 'data-lg-task-state': GlassTaskState;
    readonly 'data-lg-task-mode': 'determinate' | 'indeterminate';
    readonly 'data-lg-task-motion': 'animate' | 'static';
  };
  /** Spread only on the actual updating content region, outside the status node. */
  readonly region: { readonly 'aria-busy': boolean };
  readonly decorative: {
    readonly className: 'lg-task-indicator';
    readonly 'aria-hidden': true;
    readonly hidden: boolean;
  };
}
const fail = (path: string, reason: string): never => { throw new TypeError(`Invalid glass task progress ${path}: ${reason}`); };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail('options', 'expected a plain object');
  const allowed = ['id', 'label', 'statusId', 'statusText', 'state', 'mode', 'value', 'max', 'valueText', 'describedBy', 'statusAnnouncement', 'animated', 'reducedMotion'];
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail('options', 'unknown property');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return fail('options', 'accessors are not accepted');
    result[key] = descriptor.value;
  }
  return result;
}
function id(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_:.-]{1,128}$/.test(value)) return fail(path, 'expected a bounded ASCII ID without spaces');
  return value;
}
function text(value: unknown, path: string, maximum: number, multiline = false): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/ : /[\x00-\x1f\x7f-\x9f]/).test(value)) return fail(path, 'expected bounded nonempty text');
  return value;
}
function boolean(value: unknown, path: string): boolean {
  if (value !== undefined && typeof value !== 'boolean') return fail(path, 'expected a boolean');
  return value === true;
}
function references(value: unknown, progressId: string, statusId: string): string {
  if (value !== undefined && (typeof value !== 'string' || value.length > 8192 || /[\x00-\x08\x0b\x0e-\x1f\x7f-\x9f]/.test(value))) return fail('describedBy', 'expected bounded space-separated ID tokens');
  const tokens = typeof value === 'string' && value.trim() ? value.trim().split(/[\t\n\f\r ]+/) : [];
  if (tokens.length > 64) return fail('describedBy', 'expected at most 64 input tokens');
  const unique = new Set(tokens.map(token => id(token, 'describedBy')));
  if (unique.has(progressId)) return fail('describedBy', 'progress cannot describe itself');
  unique.delete(statusId);
  if (unique.size > 32) return fail('describedBy', 'expected at most 32 unrelated ID tokens');
  unique.add(statusId); return [...unique].join(' ');
}

/**
 * Pure SSR props over actual host task state. Native <progress> retains quantity
 * semantics; label text is an associated <label>, not fallback children of the bar.
 * Indeterminate omits value/max entirely. Idle/terminal unknown bars are hidden,
 * leaving their required visible label/status without inventing zero or completion.
 * A determinate terminal state preserves the exact host amount even below max.
 * The host owns execution, cancellation, stage changes, real quantities, document-
 * unique IDs and meaningful status announcements. This is not a meter or task runner.
 * Place status outside the aria-busy content region so an error can still announce.
 * Plain text/props only: no DOM mutation, timer, fake elapsed progress or live loop.
 * className/htmlFor use React casing; raw DOM adapters map these to class/for and
 * remove omitted attributes (particularly value when switching to indeterminate).
 * Animation is optional, busy-only decoration. Host disables it when offscreen;
 * OS reduced motion stops our CSS ring, while native platform painting may vary.
 */
export function getGlassTaskProgressProps(input: GlassTaskProgressOptions): GlassTaskProgressProps {
  const config = record(input), progressId = id(config.id, 'id'), statusId = id(config.statusId, 'statusId');
  if (progressId === statusId) return fail('statusId', 'progress and status IDs must be distinct');
  const label = text(config.label, 'label', 240), statusText = text(config.statusText, 'statusText', 2000, true);
  const state = config.state as GlassTaskState;
  if (!['idle', 'busy', 'complete', 'error', 'cancelled'].includes(state)) return fail('state', 'expected an explicit host task state');
  const mode = config.mode;
  if (mode !== 'determinate' && mode !== 'indeterminate') return fail('mode', 'expected determinate or indeterminate');
  let amounts: { value: number; max: number } | undefined;
  if (mode === 'determinate') {
    if (typeof config.max !== 'number' || !Number.isFinite(config.max) || config.max <= 0) return fail('max', 'expected a finite positive total');
    if (typeof config.value !== 'number' || !Number.isFinite(config.value) || config.value < 0 || config.value > config.max) return fail('value', 'expected a finite amount between zero and max; no clamping');
    amounts = { value: config.value === 0 ? 0 : config.value, max: config.max };
  } else if (Object.hasOwn(config, 'value') || Object.hasOwn(config, 'max')) return fail('mode', 'indeterminate must omit value and max');
  const announcement = config.statusAnnouncement === undefined ? 'off' : config.statusAnnouncement;
  if (announcement !== 'off' && announcement !== 'polite' && announcement !== 'assertive') return fail('statusAnnouncement', 'expected off, polite or assertive');
  const animate = boolean(config.animated, 'animated'), reduced = boolean(config.reducedMotion, 'reducedMotion');
  const waiting = state === 'busy' && mode === 'indeterminate';
  const describedBy = references(config.describedBy, progressId, statusId);
  const valueText = config.valueText === undefined ? undefined : text(config.valueText, 'valueText', 320);
  return Object.freeze({
    progress: Object.freeze({ id: progressId, className: 'lg-task-bar', ...amounts, hidden: mode === 'indeterminate' && !waiting,
      'aria-describedby': describedBy, ...(valueText !== undefined ? { 'aria-valuetext': valueText } : {}),
    }),
    label: Object.freeze({ props: Object.freeze({ className: 'lg-task-label', htmlFor: progressId }), text: label }),
    status: Object.freeze({ props: Object.freeze({ className: 'lg-task-status', id: statusId,
      ...(announcement === 'off' ? {} : { role: announcement === 'polite' ? 'status' : 'alert', 'aria-atomic': true }),
    }), text: statusText }),
    frame: Object.freeze({ className: 'lg-task-progress', 'data-lg-task-state': state, 'data-lg-task-mode': mode,
      'data-lg-task-motion': waiting && animate && !reduced ? 'animate' : 'static',
    }),
    region: Object.freeze({ 'aria-busy': state === 'busy' }),
    decorative: Object.freeze({ className: 'lg-task-indicator', 'aria-hidden': true, hidden: !waiting }),
  });
}
