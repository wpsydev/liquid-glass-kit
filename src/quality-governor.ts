export type GlassQualitySampleKind = 'frame-cadence' | 'gpu-elapsed';
export type GlassQualityAction = 'hold' | 'downgrade' | 'upgrade' | 'manual' | 'reset';
export type GlassQualityReason =
  | 'collecting' | 'neutral' | 'sustained-pressure' | 'stable-recovery'
  | 'cooldown' | 'lowest-level' | 'highest-level' | 'manual-lock' | 'unlocked' | 'reset'
  | 'invalid-duration' | 'invalid-time' | 'nonmonotonic-time' | 'invalid-kind' | 'kind-mismatch'
  | 'invalid-flags' | 'invalid-measurement' | 'hidden' | 'interrupted' | 'gap';

export interface GlassQualityGovernorOptions {
  /** Two to eight distinct ASCII labels, lowest budget first. Host owns their rendering mapping. */
  readonly levels: readonly string[];
  readonly kind: GlassQualitySampleKind;
  /** Explicit budget for this measurement kind, finite 0.1–1,000 milliseconds. */
  readonly targetMs: number;
  /** Default highest supplied level. This is requested quality, not confirmed renderer state. */
  readonly initialLevel?: string;
  /** Nonoverlapping evidence windows, integer 4–120; default 30. */
  readonly windowSize?: number;
  /** Consecutive pressure windows, integer 1–8; default 2. */
  readonly downgradeWindows?: number;
  /** Consecutive headroom windows, integer 2–32 and greater than downgradeWindows; default 8. */
  readonly recoveryWindows?: number;
  /** Default 2,500ms, integer 0–60,000. During cooldown, adaptation evidence is discarded. */
  readonly cooldownMs?: number;
  /** Default 1,000ms, integer 1–60,000. Larger observation gaps reject their boundary sample. */
  readonly maxGapMs?: number;
}
export interface GlassQualitySample {
  readonly kind: GlassQualitySampleKind;
  /** Positive elapsed/cadence measurement, finite up to 60,000ms. Never a fabricated FPS value. */
  readonly milliseconds: number;
  /** Caller-owned monotonic observation milliseconds; not a Date/wall-clock timestamp. */
  readonly time: number;
  /** Host verifies measurement usability, e.g. completed/non-disjoint GPU query. */
  readonly valid: boolean;
  readonly visible: boolean;
  /** Mark pause, warmup, compilation, discontinuity or other unsuitable observations. */
  readonly interrupted?: boolean;
}
export interface GlassQualityEvidence {
  readonly kind: GlassQualitySampleKind;
  readonly count: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly meanMs: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly pressureSamples: number;
  readonly headroomSamples: number;
  readonly classification: 'pressure' | 'headroom' | 'neutral';
}
export interface GlassQualityLastAction {
  readonly action: Exclude<GlassQualityAction, 'hold'>;
  readonly reason: 'sustained-pressure' | 'stable-recovery' | 'manual-lock' | 'reset';
  readonly previousLevel: string;
  readonly level: string;
  /** Evidence observation time for automatic changes; manual/reset actions have no implicit clock. */
  readonly time: number | null;
  readonly evidence: GlassQualityEvidence | null;
}
export interface GlassQualityGovernorState {
  readonly level: string;
  readonly locked: boolean;
  readonly kind: GlassQualitySampleKind;
  readonly pendingSamples: number;
  readonly overloadWindows: number;
  readonly recoveryWindows: number;
  /** Latest well-formed monotonic observation, including a rejected measurement boundary. */
  readonly lastTime: number | null;
  readonly cooldownRemainingMs: number;
  /** Latest complete eligible window; rejection/cooldown/reset clears it. */
  readonly evidence: GlassQualityEvidence | null;
  /** Ordinary collecting/ignored/hold decisions do not overwrite the last actual policy action. */
  readonly lastAction: GlassQualityLastAction | null;
}
export interface GlassQualityDecision extends GlassQualityGovernorState {
  readonly previousLevel: string;
  readonly action: GlassQualityAction;
  readonly reason: GlassQualityReason;
  /** Sample usability, not a claim of applied rendering settings or GPU performance. */
  readonly accepted: boolean;
}
export interface GlassQualityGovernor {
  readonly state: GlassQualityGovernorState;
  sample(sample: GlassQualitySample): GlassQualityDecision;
  lock(level: string): GlassQualityDecision;
  /** Preserve requested level; discard locked evidence and start cooldown at the next usable sample. */
  unlock(): GlassQualityDecision;
  /** Clear observation domain/evidence, keep current level unless supplied. A manual lock persists. */
  reset(level?: string): GlassQualityDecision;
}

const PRESSURE_FACTOR = 1.15;
const HEADROOM_FACTOR = .65;
const PRESSURE_FRACTION = .75;
const HEADROOM_FRACTION = .9;
const MAX_SAMPLE_MS = 60_000;
const OPTIONS = ['levels', 'kind', 'targetMs', 'initialLevel', 'windowSize', 'downgradeWindows', 'recoveryWindows', 'cooldownMs', 'maxGapMs'] as const;
const SAMPLE = ['kind', 'milliseconds', 'time', 'valid', 'visible', 'interrupted'] as const;
type Observation = { milliseconds: number; time: number };
const fail = (path: string, reason: string): never => { throw new TypeError('Invalid glass quality ' + path + ': ' + reason); };
function record(input: unknown, allowed: readonly string[], path: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) return fail(path, 'expected plain options');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail(path, 'unknown property');
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (!('value' in descriptor) || !descriptor.enumerable) return fail(path, 'accessors/non-enumerable properties are unsupported');
    result[key] = descriptor.value;
  }
  return result;
}
function range(value: unknown, fallback: number | undefined, min: number, max: number, path: string, integer = false): number {
  const resolved = value === undefined ? fallback : value;
  if (typeof resolved !== 'number' || !Number.isFinite(resolved) || resolved < min || resolved > max || integer && !Number.isInteger(resolved)) return fail(path, 'expected bounded ' + (integer ? 'integer' : 'finite number'));
  return resolved;
}
function configuration(input: GlassQualityGovernorOptions) {
  const config = record(input, OPTIONS, 'options'), source = config.levels;
  if (!Array.isArray(source) || source.length < 2 || source.length > 8) return fail('levels', 'expected two to eight ordered labels');
  const levels: string[] = [];
  for (let index = 0; index < source.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(source, String(index));
    if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,31}$/.test(descriptor.value)) return fail('levels', 'expected dense ASCII data labels of at most 32 characters');
    levels.push(descriptor.value);
  }
  if (new Set(levels).size !== levels.length) return fail('levels', 'labels must be distinct');
  if (config.kind !== 'frame-cadence' && config.kind !== 'gpu-elapsed') return fail('kind', 'explicit frame-cadence or gpu-elapsed is required');
  const initialLevel = config.initialLevel === undefined ? levels.at(-1)! : config.initialLevel;
  if (typeof initialLevel !== 'string' || !levels.includes(initialLevel)) return fail('initialLevel', 'use a supplied level label');
  const downgradeWindows = range(config.downgradeWindows, 2, 1, 8, 'downgradeWindows', true), recoveryWindows = range(config.recoveryWindows, 8, 2, 32, 'recoveryWindows', true);
  if (recoveryWindows <= downgradeWindows) return fail('recoveryWindows', 'recovery must need more windows than downgrade');
  return Object.freeze({
    levels: Object.freeze(levels), kind: config.kind as GlassQualitySampleKind, initialLevel,
    targetMs: range(config.targetMs, undefined, .1, 1000, 'targetMs'),
    windowSize: range(config.windowSize, 30, 4, 120, 'windowSize', true), downgradeWindows, recoveryWindows,
    cooldownMs: range(config.cooldownMs, 2500, 0, 60_000, 'cooldownMs', true),
    maxGapMs: range(config.maxGapMs, 1000, 1, 60_000, 'maxGapMs', true),
  });
}

/**
 * Pure advice over host-supplied timings, with no clock, renderer, DOM, timer or
 * frame runner. Levels are lowest-to-highest requested budgets; the host decides
 * whether/how to map and apply changes. Reset after a viewport/context change and
 * recreate when changing measurement kind. Frame cadence is not GPU elapsed
 * time: refresh caps/CPU work can affect it and lower pixels may not improve it.
 *
 * Default 30-sample nonoverlapping windows require mean >1.15×target and 75% of
 * individual samples above that threshold for pressure; recovery needs mean
 * <.65×target and 90% below it. Two pressure windows downgrade one level; eight
 * consecutive recovery windows upgrade one. Neutral/contrary windows reset
 * streaks; ordinary holds never imply a renderer change or proven speedup.
 *
 * Rejected measurements clear adaptation evidence. A valid monotonic timestamp
 * still advances the watermark; backward/equal or malformed time cannot rewind
 * it. A gap sample is rejected as an interruption boundary; the next sample can
 * start a new window. Accepted cooldown samples advance time but are not stored.
 * Lock/unlock/reset discard evidence. Unlock/reset begin cooldown at the next
 * usable observation, requiring fresh evidence afterward. Manual lock persists
 * across reset; resetting to another level while locked rejects without mutation.
 * State/decision snapshots and their small evidence/action records are frozen.
 */
export function createGlassQualityGovernor(input: GlassQualityGovernorOptions): GlassQualityGovernor {
  const config = configuration(input);
  let level = config.initialLevel, locked = false, lastTime: number | null = null, changeTime: number | null = null, startCooldown = false;
  let observations: Observation[] = [], overloadWindows = 0, recoveryWindows = 0, evidence: GlassQualityEvidence | null = null, lastAction: GlassQualityLastAction | null = null;
  function clearEvidence() { observations = []; overloadWindows = recoveryWindows = 0; evidence = null; }
  function cooldown() { return startCooldown ? config.cooldownMs : changeTime === null || lastTime === null ? 0 : Math.max(0, config.cooldownMs - (lastTime - changeTime)); }
  function state(): GlassQualityGovernorState { return Object.freeze({ level, locked, kind: config.kind, pendingSamples: observations.length, overloadWindows, recoveryWindows, lastTime, cooldownRemainingMs: cooldown(), evidence, lastAction }); }
  function decision(action: GlassQualityAction, reason: GlassQualityReason, accepted: boolean, previousLevel = level): GlassQualityDecision { return Object.freeze({ ...state(), previousLevel, action, reason, accepted }); }
  function levelLabel(next: string) { if (typeof next !== 'string' || !config.levels.includes(next)) return fail('level', 'use a supplied level label'); return next; }
  function ignored(reason: GlassQualityReason) { clearEvidence(); return decision('hold', reason, false); }
  function action(kind: Exclude<GlassQualityAction, 'hold'>, reason: GlassQualityLastAction['reason'], previousLevel: string, time: number | null) {
    lastAction = Object.freeze({ action: kind, reason, previousLevel, level, time, evidence });
    return decision(kind, reason, false, previousLevel);
  }
  function completedWindow(): GlassQualityEvidence {
    let sum = 0, minMs = Infinity, maxMs = 0, pressureSamples = 0, headroomSamples = 0;
    for (const sample of observations) {
      sum += sample.milliseconds; minMs = Math.min(minMs, sample.milliseconds); maxMs = Math.max(maxMs, sample.milliseconds);
      if (sample.milliseconds > config.targetMs * PRESSURE_FACTOR) pressureSamples++;
      if (sample.milliseconds < config.targetMs * HEADROOM_FACTOR) headroomSamples++;
    }
    const meanMs = sum / observations.length;
    const classification = meanMs > config.targetMs * PRESSURE_FACTOR && pressureSamples / observations.length >= PRESSURE_FRACTION ? 'pressure'
      : meanMs < config.targetMs * HEADROOM_FACTOR && headroomSamples / observations.length >= HEADROOM_FRACTION ? 'headroom' : 'neutral';
    return Object.freeze({ kind: config.kind, count: observations.length, startTime: observations[0].time, endTime: observations.at(-1)!.time, meanMs, minMs, maxMs, pressureSamples, headroomSamples, classification });
  }
  function sample(input: GlassQualitySample): GlassQualityDecision {
    const value = record(input, SAMPLE, 'sample');
    if (typeof value.time !== 'number' || !Number.isFinite(value.time) || value.time < 0 || value.time > Number.MAX_SAFE_INTEGER) return ignored('invalid-time');
    if (lastTime !== null && value.time <= lastTime) return ignored('nonmonotonic-time');
    const gap = lastTime !== null && value.time - lastTime > config.maxGapMs; lastTime = value.time;
    if (value.kind !== 'frame-cadence' && value.kind !== 'gpu-elapsed') return ignored('invalid-kind');
    if (value.kind !== config.kind) return ignored('kind-mismatch');
    if (typeof value.valid !== 'boolean' || typeof value.visible !== 'boolean' || value.interrupted !== undefined && typeof value.interrupted !== 'boolean') return ignored('invalid-flags');
    if (!value.visible) return ignored('hidden');
    if (value.interrupted) return ignored('interrupted');
    if (!value.valid) return ignored('invalid-measurement');
    if (typeof value.milliseconds !== 'number' || !Number.isFinite(value.milliseconds) || value.milliseconds <= 0 || value.milliseconds > MAX_SAMPLE_MS) return ignored('invalid-duration');
    if (gap) return ignored('gap');
    if (startCooldown) { startCooldown = false; changeTime = value.time; }
    if (!locked && cooldown() > 0) { clearEvidence(); return decision('hold', 'cooldown', true); }
    observations.push({ milliseconds: value.milliseconds, time: value.time });
    if (observations.length < config.windowSize) return decision('hold', locked ? 'manual-lock' : 'collecting', true);
    evidence = completedWindow(); observations = [];
    if (locked) { overloadWindows = recoveryWindows = 0; return decision('hold', 'manual-lock', true); }
    const index = config.levels.indexOf(level);
    if (evidence.classification === 'pressure') { overloadWindows = Math.min(config.downgradeWindows, overloadWindows + 1); recoveryWindows = 0; }
    else if (evidence.classification === 'headroom') { recoveryWindows = Math.min(config.recoveryWindows, recoveryWindows + 1); overloadWindows = 0; }
    else { overloadWindows = recoveryWindows = 0; return decision('hold', 'neutral', true); }
    if (evidence.classification === 'pressure' && index === 0) { overloadWindows = recoveryWindows = 0; return decision('hold', 'lowest-level', true); }
    if (evidence.classification === 'headroom' && index === config.levels.length - 1) { overloadWindows = recoveryWindows = 0; return decision('hold', 'highest-level', true); }
    if (overloadWindows < config.downgradeWindows && recoveryWindows < config.recoveryWindows) return decision('hold', evidence.classification === 'pressure' ? 'sustained-pressure' : 'stable-recovery', true);
    const previousLevel = level, downgrade = evidence.classification === 'pressure';
    level = config.levels[index + (downgrade ? -1 : 1)]; changeTime = value.time; overloadWindows = recoveryWindows = 0;
    lastAction = Object.freeze({ action: downgrade ? 'downgrade' : 'upgrade', reason: downgrade ? 'sustained-pressure' : 'stable-recovery', previousLevel, level, time: value.time, evidence });
    return decision(downgrade ? 'downgrade' : 'upgrade', downgrade ? 'sustained-pressure' : 'stable-recovery', true, previousLevel);
  }
  return {
    get state() { return state(); }, sample,
    lock(next) {
      const selected = levelLabel(next); if (locked && selected === level) return decision('hold', 'manual-lock', false);
      const previousLevel = level; level = selected; locked = true; clearEvidence(); changeTime = null; startCooldown = true;
      return action('manual', 'manual-lock', previousLevel, null);
    },
    unlock() {
      if (!locked) return decision('hold', 'unlocked', false);
      locked = false; clearEvidence(); changeTime = null; startCooldown = true; return decision('hold', 'unlocked', false);
    },
    reset(next = level) {
      const selected = levelLabel(next); if (locked && selected !== level) return fail('reset', 'manual lock must be released before changing its level');
      const previousLevel = level; level = selected; clearEvidence(); lastTime = changeTime = null; startCooldown = true;
      return action('reset', 'reset', previousLevel, null);
    },
  };
}
