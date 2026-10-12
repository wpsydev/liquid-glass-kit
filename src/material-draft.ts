import { resolveOptions } from './material.js';
import type { GlassOptions, ResolvedGlassOptions } from './material.js';

export type GlassMaterialDraftStatus = 'editing' | 'prepared' | 'cancelled';
export type GlassMaterialDraftPreview = 'before' | 'after';
export type GlassMaterialDraftOptionsSnapshot = Readonly<ResolvedGlassOptions>;

export interface GlassMaterialDraftOptions {
  /** Initial options use the canonical material resolver, including its defaults and clamps. */
  initial?: GlassOptions;
  /** Host-owned opaque revision tag: 1–96 printable ASCII characters, without whitespace. */
  revision: string;
  /** Maximum retained material snapshots including the current entry, integer 2–128; default 32. */
  historyLimit?: number;
}
export interface GlassMaterialDraftState {
  readonly status: GlassMaterialDraftStatus;
  /** Captured host tag, not an independently verified remote/business revision. */
  readonly baseRevision: string;
  /** Monotonic local state version; never an authoritative server revision. */
  readonly draftVersion: number;
  readonly before: GlassMaterialDraftOptionsSnapshot;
  readonly after: GlassMaterialDraftOptionsSnapshot;
  readonly previewMode: GlassMaterialDraftPreview;
  /** Options for an explicit host preview; this module never applies them. */
  readonly previewMaterial: GlassMaterialDraftOptionsSnapshot;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly historyLength: number;
  readonly historyIndex: number;
  readonly historyLimit: number;
}
export interface GlassMaterialDraftRequest {
  readonly kind: 'glass-material-draft';
  readonly baseRevision: string;
  readonly draftVersion: number;
  readonly before: GlassMaterialDraftOptionsSnapshot;
  /** Always the pending after state, even while previewMode is before. */
  readonly material: GlassMaterialDraftOptionsSnapshot;
  readonly dirty: boolean;
}
export type GlassMaterialDraftCommitResult =
  | Readonly<{ ok: true; reason: 'prepared'; request: GlassMaterialDraftRequest; state: GlassMaterialDraftState }>
  | Readonly<{
    ok: false;
    reason: 'revision-conflict' | 'cancelled';
    /** The captured baseline and the caller's supplied current revision. No independent read occurs. */
    baseRevision: string;
    suppliedRevision: string;
    request: null;
    state: GlassMaterialDraftState;
  }>;
export interface GlassMaterialDraft {
  readonly state: GlassMaterialDraftState;
  /** Merge known fields into complete normalized after options. Explicit undefined resets that field. */
  patch(options: GlassOptions): GlassMaterialDraftState;
  undo(): GlassMaterialDraftState;
  redo(): GlassMaterialDraftState;
  /** Before/after comparison changes preview intent, not the pending material or history. */
  preview(mode: GlassMaterialDraftPreview): GlassMaterialDraftState;
  /**
   * Prepare immutable review data when the caller's tag matches the baseline.
   * The host must independently authorize, apply and check its real business
   * revision atomically. This comparison cannot prevent a subsequent host race.
   */
  commit(expectedRevision: string): GlassMaterialDraftCommitResult;
  /** Editing only: return baseline intent and discard pending history. Never roll back host actions. */
  cancel(): GlassMaterialDraftState;
}

const CONFIG_KEYS = ['initial', 'revision', 'historyLimit'] as const;
const MATERIAL_KEYS = Object.freeze(Object.keys(resolveOptions()) as (keyof ResolvedGlassOptions)[]);
const DEFAULT_HISTORY_LIMIT = 32;
const MIN_HISTORY_LIMIT = 2;
const MAX_HISTORY_LIMIT = 128;
const MAX_REVISION_LENGTH = 96;

function invalid(path: string, message: string): never {
  throw new TypeError('Invalid glass material draft ' + path + ': ' + message);
}
function plain(input: unknown, path: string): object {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    return invalid(path, 'expected a plain data object');
  }
  return input;
}
function revision(input: unknown): string {
  if (typeof input !== 'string' || !input.length || input.length > MAX_REVISION_LENGTH || !/^[!-~]+$/.test(input)) {
    return invalid('revision', 'expected 1–96 printable ASCII characters without whitespace');
  }
  return input;
}
function configuration(input: GlassMaterialDraftOptions) {
  const value = plain(input, 'options');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !(CONFIG_KEYS as readonly string[]).includes(key)) return invalid('options', 'unknown property');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!('value' in descriptor) || !descriptor.enumerable) return invalid('options', 'accessors and non-enumerable properties are unsupported');
    result[key] = descriptor.value;
  }
  const limit = result.historyLimit === undefined ? DEFAULT_HISTORY_LIMIT : result.historyLimit;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < MIN_HISTORY_LIMIT || limit > MAX_HISTORY_LIMIT) {
    return invalid('historyLimit', 'expected an integer from 2 through 128');
  }
  return {
    revision: revision(result.revision), historyLimit: limit,
    before: normalized(result.initial === undefined ? {} : materialData(result.initial)),
  };
}
function materialData(input: unknown): GlassOptions {
  const value = plain(input, 'material');
  const copy: Record<string, unknown> = Object.create(null);
  for (const key of MATERIAL_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if (!('value' in descriptor) || !descriptor.enumerable) return invalid('material.' + key, 'use an enumerable data property');
    copy[key] = descriptor.value;
  }
  // Unknown material keys are intentionally ignored like resolveOptions. Their
  // values/getters are not copied, read, retained, rendered or serialized.
  return copy as GlassOptions;
}
function normalized(options: GlassOptions): GlassMaterialDraftOptionsSnapshot {
  const resolved = resolveOptions(options);
  if (typeof resolved.interactive !== 'boolean' || typeof resolved.reducedTransparency !== 'boolean') {
    return invalid('material', 'interactive and reducedTransparency must resolve to booleans');
  }
  // Canonical options are scalar. Freeze only this newly created resolver result,
  // never the caller's options object or nested unknown metadata.
  return Object.freeze(resolved);
}
function equivalent(left: GlassMaterialDraftOptionsSnapshot, right: GlassMaterialDraftOptionsSnapshot): boolean {
  return MATERIAL_KEYS.every(key => Object.is(left[key], right[key]));
}

/**
 * Pure local staging for material options. No DOM, callbacks, promises, clocks,
 * source rewriting, model requests, network access, storage or implicit apply.
 *
 * Patches merge into a full canonical snapshot: changing regular to clear
 * preserves an existing blur of 18 rather than resetting it to clear's initial
 * default of 6. Explicit undefined may request that field's canonical default.
 * Before comparison never edits after/history or the material in a prepared
 * request. Material no-ops are deduplicated; a genuine edit after undo discards
 * the redo branch. Limited history may lose old undo entries, while the original
 * baseline always remains available for before/cancel.
 *
 * commit compares only caller-supplied tags and seals review data as prepared.
 * Prepared does not mean styles applied, source generated, saved or authorized.
 * Repeated commit with the same baseline returns the same prepared request; the
 * host owns idempotency of any actual action. Prepared edits/undo/redo/preview
 * are closed; cancellation cannot retract an exported or already consumed
 * request. A cancelled draft cannot prepare anything. Create a new draft for a
 * new host revision. The host must independently guard asynchronous apply,
 * stale UI results and its authoritative business revision.
 */
export function createGlassMaterialDraft(options: GlassMaterialDraftOptions): GlassMaterialDraft {
  const config = configuration(options);
  const before = config.before;
  let history: GlassMaterialDraftOptionsSnapshot[] = [before], cursor = 0, version = 0;
  let status: GlassMaterialDraftStatus = 'editing', view: GlassMaterialDraftPreview = 'after';
  let cachedState: GlassMaterialDraftState | undefined;
  let prepared: Extract<GlassMaterialDraftCommitResult, { ok: true }> | undefined;
  const after = () => history[cursor];
  function state(): GlassMaterialDraftState {
    return cachedState ??= Object.freeze({
      status, baseRevision: config.revision, draftVersion: version, before, after: after(),
      previewMode: view, previewMaterial: view === 'before' ? before : after(),
      dirty: !equivalent(before, after()), canUndo: status === 'editing' && cursor > 0,
      canRedo: status === 'editing' && cursor < history.length - 1,
      historyLength: history.length, historyIndex: cursor, historyLimit: config.historyLimit,
    });
  }
  function editing() { if (status !== 'editing') invalid('state', 'create a new draft after preparation or cancellation'); }
  function advance() {
    if (version === Number.MAX_SAFE_INTEGER) invalid('version', 'local version exhausted; create a new draft');
    version++; cachedState = undefined;
  }
  return Object.freeze({
    get state() { return state(); },
    patch(input: GlassOptions) {
      editing();
      const next = normalized({ ...after(), ...materialData(input) });
      const unchanged = equivalent(next, after());
      if (unchanged && view === 'after') return state();
      advance(); view = 'after';
      if (!unchanged) {
        history = history.slice(0, cursor + 1); history.push(next);
        if (history.length > config.historyLimit) history.shift();
        cursor = history.length - 1;
      }
      return state();
    },
    undo() {
      editing();
      if (cursor === 0) return state();
      advance(); cursor--; view = 'after'; return state();
    },
    redo() {
      editing();
      if (cursor === history.length - 1) return state();
      advance(); cursor++; view = 'after'; return state();
    },
    preview(mode: GlassMaterialDraftPreview) {
      editing();
      if (mode !== 'before' && mode !== 'after') invalid('preview', 'expected before or after');
      if (mode === view) return state();
      advance(); view = mode; return state();
    },
    commit(expectedRevision: string): GlassMaterialDraftCommitResult {
      const suppliedRevision = revision(expectedRevision);
      if (status === 'cancelled' || suppliedRevision !== config.revision) {
        return Object.freeze({
          ok: false, reason: status === 'cancelled' ? 'cancelled' : 'revision-conflict',
          baseRevision: config.revision, suppliedRevision, request: null, state: state(),
        });
      }
      if (prepared) return prepared;
      advance(); status = 'prepared';
      const snapshot = state();
      const request = Object.freeze({
        kind: 'glass-material-draft' as const, baseRevision: config.revision,
        draftVersion: version, before, material: after(), dirty: snapshot.dirty,
      });
      prepared = Object.freeze({ ok: true, reason: 'prepared', request, state: snapshot });
      return prepared;
    },
    cancel() {
      if (status !== 'editing') return state();
      advance(); status = 'cancelled'; view = 'before'; history = [before]; cursor = 0;
      return state();
    },
  });
}
