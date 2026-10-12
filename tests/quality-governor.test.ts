// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  createGlassQualityGovernor,
  type GlassQualityDecision,
  type GlassQualityGovernorOptions,
  type GlassQualitySample,
} from '../src/quality-governor.js';

function fixture(options: Partial<GlassQualityGovernorOptions> = {}) {
  const kind = options.kind ?? 'frame-cadence';
  const governor = createGlassQualityGovernor({
    levels: ['small', 'balanced', 'full'], kind, targetMs: 10,
    windowSize: 4, downgradeWindows: 2, recoveryWindows: 3,
    cooldownMs: 0, maxGapMs: 10_000, ...options,
  });
  let time = -16;
  const feed = (milliseconds: number, patch: Partial<GlassQualitySample> = {}) => {
    time += 16;
    return governor.sample({ kind, milliseconds, time, valid: true, visible: true, ...patch });
  };
  const window = (milliseconds: number | readonly number[]) => {
    const values = typeof milliseconds === 'number' ? Array(options.windowSize ?? 4).fill(milliseconds) : milliseconds;
    let result: GlassQualityDecision | undefined;
    for (const value of values) result = feed(value);
    return result!;
  };
  return { governor, feed, window };
}

describe('pure host timing quality governor', () => {
  it('is usable without browser globals and never schedules work or reads a clock', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    const spies = [
      vi.spyOn(globalThis, 'setTimeout'),
      vi.spyOn(globalThis, 'setInterval'),
      vi.spyOn(Date, 'now'),
      vi.spyOn(performance, 'now'),
    ];
    spies.forEach(spy => spy.mockClear());
    const { governor, window: observations } = fixture();
    observations(20);
    observations(20);
    governor.lock('balanced');
    governor.unlock();
    governor.reset();
    const calls = spies.map(spy => spy.mock.calls.length);
    spies.forEach(spy => spy.mockRestore());
    expect(calls).toEqual([0, 0, 0, 0]);
  });

  it('defaults to the highest requested level and requires two nonoverlapping 30-sample pressure windows', () => {
    const governor = createGlassQualityGovernor({
      levels: ['portable', 'detailed'], kind: 'frame-cadence', targetMs: 10,
    });
    expect(governor.state).toMatchObject({
      level: 'detailed', pendingSamples: 0, cooldownRemainingMs: 0,
      lastTime: null, evidence: null, lastAction: null,
    });
    let result!: GlassQualityDecision;
    for (let index = 0; index < 59; index++) {
      result = governor.sample({ kind: 'frame-cadence', milliseconds: 20, time: index * 16, visible: true, valid: true });
      expect(result.action).toBe('hold');
    }
    expect(result).toMatchObject({ overloadWindows: 1, pendingSamples: 29, level: 'detailed' });
    result = governor.sample({ kind: 'frame-cadence', milliseconds: 20, time: 59 * 16, visible: true, valid: true });
    expect(result).toMatchObject({
      action: 'downgrade', previousLevel: 'detailed', level: 'portable',
      cooldownRemainingMs: 2500, evidence: { count: 30, startTime: 480, endTime: 944 },
    });
  });

  it('does not downgrade from a large isolated spike even when its window mean is high', () => {
    const { governor, window } = fixture();
    const result = window([10, 10, 10, 1000]);
    expect(result).toMatchObject({
      action: 'hold', reason: 'neutral', level: 'full', overloadWindows: 0,
      evidence: { meanMs: 257.5, minMs: 10, maxMs: 1000, pressureSamples: 1, classification: 'neutral' },
    });
    window([10, 10, 10, 1000]);
    expect(governor.state.level).toBe('full');
  });

  it('requires all eight default recovery windows before raising a requested quality level', () => {
    const governor = createGlassQualityGovernor({
      levels: ['portable', 'detailed'], initialLevel: 'portable',
      kind: 'frame-cadence', targetMs: 10, cooldownMs: 0,
    });
    for (let index = 0; index < 239; index++) {
      expect(governor.sample({
        kind: 'frame-cadence', milliseconds: 5, time: index * 16, visible: true, valid: true,
      }).action).toBe('hold');
    }
    expect(governor.state).toMatchObject({ recoveryWindows: 7, pendingSamples: 29, level: 'portable' });
    expect(governor.sample({
      kind: 'frame-cadence', milliseconds: 5, time: 239 * 16, visible: true, valid: true,
    })).toMatchObject({ action: 'upgrade', previousLevel: 'portable', level: 'detailed', evidence: { count: 30 } });
  });

  it('requires both a strict pressure mean and the 75% sample fraction', () => {
    const { window } = fixture();
    expect(window([12, 12, 12, 10])).toMatchObject({
      reason: 'neutral', evidence: { meanMs: 11.5, pressureSamples: 3 },
    });
    expect(window([14, 14, 14, 8])).toMatchObject({
      reason: 'sustained-pressure', overloadWindows: 1,
      evidence: { meanMs: 12.5, pressureSamples: 3, classification: 'pressure' },
    });
    expect(window([100, 100, 10, 10])).toMatchObject({
      reason: 'neutral', overloadWindows: 0, evidence: { pressureSamples: 2 },
    });
  });

  it('changes one requested level at a time and remains stable at the lower boundary', () => {
    const { governor, window } = fixture();
    expect(window(20).action).toBe('hold');
    const first = window(20);
    expect(first).toMatchObject({ action: 'downgrade', previousLevel: 'full', level: 'balanced', accepted: true });
    expect(first.lastAction).toMatchObject({
      action: 'downgrade', previousLevel: 'full', level: 'balanced', time: 112,
      evidence: { classification: 'pressure' },
    });
    window(20);
    expect(window(20)).toMatchObject({ action: 'downgrade', previousLevel: 'balanced', level: 'small' });
    const lastAction = governor.state.lastAction;
    for (let index = 0; index < 10; index++) {
      expect(window(20)).toMatchObject({
        action: 'hold', reason: 'lowest-level', level: 'small', overloadWindows: 0,
      });
    }
    expect(governor.state.lastAction).toBe(lastAction);
  });

  it('requires consecutive pressure windows and resets streaks on neutral or contrary evidence', () => {
    const { window } = fixture({ initialLevel: 'balanced' });
    expect(window(20).overloadWindows).toBe(1);
    expect(window(10)).toMatchObject({ overloadWindows: 0, recoveryWindows: 0 });
    expect(window(20)).toMatchObject({ action: 'hold', overloadWindows: 1, level: 'balanced' });
    expect(window(5)).toMatchObject({ overloadWindows: 0, recoveryWindows: 1 });
    expect(window(20)).toMatchObject({ action: 'hold', overloadWindows: 1, recoveryWindows: 0 });
  });

  it('requires longer stable recovery and upgrades only one level per complete streak', () => {
    const { window } = fixture({ initialLevel: 'small', recoveryWindows: 4 });
    for (let index = 1; index < 4; index++) {
      expect(window(5)).toMatchObject({ action: 'hold', reason: 'stable-recovery', recoveryWindows: index, level: 'small' });
    }
    expect(window(5)).toMatchObject({ action: 'upgrade', previousLevel: 'small', level: 'balanced' });
    window(5);
    expect(window(10).recoveryWindows).toBe(0);
    for (let index = 1; index < 4; index++) expect(window(5).action).toBe('hold');
    expect(window(5)).toMatchObject({ action: 'upgrade', level: 'full' });
    expect(window(5)).toMatchObject({ action: 'hold', reason: 'highest-level', recoveryWindows: 0, level: 'full' });
  });

  it('requires a strict recovery mean and at least 90% individual headroom', () => {
    const { window } = fixture({ initialLevel: 'balanced', windowSize: 10 });
    expect(window(Array(10).fill(6.5))).toMatchObject({ reason: 'neutral', evidence: { headroomSamples: 0 } });
    expect(window([...Array(8).fill(5), 7, 7])).toMatchObject({
      reason: 'neutral', evidence: { meanMs: 5.4, headroomSamples: 8 },
    });
    expect(window([...Array(9).fill(5), 10])).toMatchObject({
      reason: 'stable-recovery', recoveryWindows: 1,
      evidence: { meanMs: 5.5, headroomSamples: 9, classification: 'headroom' },
    });
  });

  it('discards cooldown observations and starts fresh windows when cooldown ends', () => {
    const { governor, feed, window } = fixture({ cooldownMs: 100 });
    window(20);
    const changed = window(20);
    expect(changed.cooldownRemainingMs).toBe(100);
    for (let index = 0; index < 6; index++) {
      expect(feed(20)).toMatchObject({
        action: 'hold', reason: 'cooldown', accepted: true, pendingSamples: 0,
        overloadWindows: 0, evidence: null, lastAction: changed.lastAction,
      });
    }
    expect(governor.state.cooldownRemainingMs).toBe(4);
    expect(feed(20)).toMatchObject({ reason: 'collecting', pendingSamples: 1, cooldownRemainingMs: 0 });
    for (let index = 0; index < 3; index++) feed(20);
    expect(governor.state).toMatchObject({ level: 'balanced', overloadWindows: 1, pendingSamples: 0 });
    expect(window(20)).toMatchObject({ action: 'downgrade', level: 'small' });
    expect(changed.evidence?.count).toBe(4);
  });

  it.each([
    [{ milliseconds: 0 }, 'invalid-duration'],
    [{ milliseconds: -1 }, 'invalid-duration'],
    [{ milliseconds: NaN }, 'invalid-duration'],
    [{ milliseconds: Infinity }, 'invalid-duration'],
    [{ milliseconds: 60_001 }, 'invalid-duration'],
    [{ visible: false }, 'hidden'],
    [{ interrupted: true }, 'interrupted'],
    [{ valid: false }, 'invalid-measurement'],
    [{ kind: 'gpu-elapsed' }, 'kind-mismatch'],
    [{ kind: 'fps' }, 'invalid-kind'],
    [{ valid: 1 }, 'invalid-flags'],
    [{ visible: undefined }, 'invalid-flags'],
    [{ interrupted: 'no' }, 'invalid-flags'],
  ])('rejects unusable measurements %j and clears all adaptation evidence', (patch, reason) => {
    const { governor, feed, window } = fixture();
    window(20);
    feed(20);
    expect(governor.state).toMatchObject({ overloadWindows: 1, pendingSamples: 1 });
    const result = feed(20, patch as Partial<GlassQualitySample>);
    expect(result).toMatchObject({
      action: 'hold', accepted: false, reason, level: 'full',
      overloadWindows: 0, recoveryWindows: 0, pendingSamples: 0, evidence: null, lastTime: 80,
    });
    expect(window(20)).toMatchObject({ action: 'hold', overloadWindows: 1 });
  });

  it.each([NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1, '100'])('rejects malformed observation time %s without advancing the watermark', time => {
    const { governor, feed } = fixture();
    feed(20, { time: 100 });
    const rejected = governor.sample({
      kind: 'frame-cadence', milliseconds: 20, time: time as number, valid: true, visible: true,
    });
    expect(rejected).toMatchObject({ reason: 'invalid-time', accepted: false, lastTime: 100, pendingSamples: 0 });
  });

  it('never rewinds or repeats time, but a well-formed rejected observation advances its watermark', () => {
    const { governor } = fixture();
    const sample = (time: number, patch: Partial<GlassQualitySample> = {}) => governor.sample({
      kind: 'frame-cadence', milliseconds: 20, time, visible: true, valid: true, ...patch,
    });
    expect(sample(100).accepted).toBe(true);
    expect(sample(100)).toMatchObject({ reason: 'nonmonotonic-time', lastTime: 100 });
    expect(sample(99)).toMatchObject({ reason: 'nonmonotonic-time', lastTime: 100 });
    expect(sample(200, { visible: false })).toMatchObject({ reason: 'hidden', lastTime: 200 });
    expect(sample(150)).toMatchObject({ reason: 'nonmonotonic-time', lastTime: 200 });
    expect(sample(201)).toMatchObject({ accepted: true, pendingSamples: 1 });
  });

  it('rejects a resumed-gap boundary then accepts the next observation into a fresh window', () => {
    const { governor } = fixture({ maxGapMs: 50 });
    const sample = (time: number) => governor.sample({
      kind: 'frame-cadence', milliseconds: 20, time, visible: true, valid: true,
    });
    for (const time of [0, 10, 20, 30, 40]) sample(time);
    expect(governor.state).toMatchObject({ overloadWindows: 1, pendingSamples: 1 });
    expect(sample(100)).toMatchObject({
      accepted: false, reason: 'gap', lastTime: 100, pendingSamples: 0, overloadWindows: 0, evidence: null,
    });
    expect(sample(110)).toMatchObject({ accepted: true, pendingSamples: 1, level: 'full' });
    for (const time of [120, 130, 140]) sample(time);
    expect(governor.state).toMatchObject({ overloadWindows: 1, evidence: { startTime: 110, endTime: 140 } });
    expect(sample(190).accepted).toBe(true);
  });

  it('never mixes frame cadence and GPU elapsed time in one evidence window', () => {
    const { governor, feed, window } = fixture({ kind: 'gpu-elapsed' });
    feed(20);
    expect(feed(20, { kind: 'frame-cadence' })).toMatchObject({
      kind: 'gpu-elapsed', reason: 'kind-mismatch', accepted: false, pendingSamples: 0,
    });
    expect(window(20)).toMatchObject({ kind: 'gpu-elapsed', evidence: { kind: 'gpu-elapsed', count: 4 } });
    expect(window(20)).toMatchObject({ action: 'downgrade', evidence: { kind: 'gpu-elapsed' } });
    expect(governor.state.kind).toBe('gpu-elapsed');
  });

  it('keeps explicit manual quality fixed while collecting bounded diagnostic evidence', () => {
    const { governor, feed, window } = fixture();
    expect(governor.lock('balanced')).toMatchObject({
      action: 'manual', reason: 'manual-lock', accepted: false, previousLevel: 'full',
      level: 'balanced', locked: true, lastAction: { time: null, evidence: null },
    });
    for (let index = 0; index < 15; index++) {
      expect(window(index % 2 ? 5 : 20)).toMatchObject({
        action: 'hold', reason: 'manual-lock', locked: true, level: 'balanced',
        overloadWindows: 0, recoveryWindows: 0, pendingSamples: 0,
      });
    }
    feed(20);
    const old = governor.state;
    expect(governor.lock('balanced')).toMatchObject({ action: 'hold', accepted: false, pendingSamples: 1 });
    expect(governor.state).toEqual(old);
  });

  it('unlock preserves the requested level, discards locked evidence and anchors cooldown to the next usable sample', () => {
    const { governor, feed, window } = fixture({ cooldownMs: 100 });
    governor.lock('small');
    window(5);
    expect(governor.state.evidence?.classification).toBe('headroom');
    expect(governor.unlock()).toMatchObject({
      action: 'hold', reason: 'unlocked', accepted: false, level: 'small', locked: false,
      cooldownRemainingMs: 100, evidence: null,
    });
    expect(feed(5, { visible: false })).toMatchObject({ accepted: false, cooldownRemainingMs: 100 });
    expect(feed(5)).toMatchObject({ reason: 'cooldown', cooldownRemainingMs: 100 });
    for (let index = 0; index < 6; index++) feed(5);
    expect(feed(5)).toMatchObject({ reason: 'collecting', cooldownRemainingMs: 0, pendingSamples: 1 });
    const pending = governor.state;
    expect(governor.unlock().reason).toBe('unlocked');
    expect(governor.state).toEqual(pending);
  });

  it('resets observation domains and begins a new cooldown while retaining manual locks', () => {
    const { governor, window } = fixture({ cooldownMs: 50 });
    governor.lock('balanced');
    window(20);
    const before = governor.state;
    expect(() => governor.reset('full')).toThrow(/manual lock/);
    expect(governor.state).toEqual(before);
    expect(governor.reset()).toMatchObject({
      action: 'reset', reason: 'reset', accepted: false, level: 'balanced', locked: true,
      lastTime: null, evidence: null, pendingSamples: 0, cooldownRemainingMs: 50,
      lastAction: { action: 'reset', time: null, evidence: null },
    });
    expect(governor.sample({ kind: 'frame-cadence', milliseconds: 10, time: 0, valid: true, visible: true }).accepted).toBe(true);
    governor.unlock();
    expect(governor.reset('full')).toMatchObject({ level: 'full', locked: false, previousLevel: 'balanced' });
    expect(governor.sample({ kind: 'frame-cadence', milliseconds: 10, time: 0, valid: true, visible: true })).toMatchObject({
      reason: 'cooldown', cooldownRemainingMs: 50,
    });
  });

  it('provides frozen snapshots and retains last action evidence independently of the current sample decision', () => {
    const levels = ['small', 'balanced', 'full'];
    const { governor, feed, window } = fixture({ levels });
    const initial = governor.state;
    levels[2] = 'mutated';
    window(20);
    const decision = window(20);
    for (const value of [initial, decision, decision.evidence, decision.lastAction, decision.lastAction?.evidence]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Object.isFrozen(levels)).toBe(false);
    const before = governor.state;
    expect(feed(10)).toMatchObject({ action: 'hold', reason: 'collecting', lastAction: decision.lastAction });
    expect(feed(10, { visible: false })).toMatchObject({ action: 'hold', evidence: null, lastAction: decision.lastAction });
    expect(governor.state.lastAction?.evidence).toBe(decision.evidence);
    expect(initial).toMatchObject({ level: 'full', lastTime: null, pendingSamples: 0, lastAction: null });
    expect(before).toMatchObject({ level: 'balanced', pendingSamples: 0, evidence: { count: 4 } });
    expect(governor.lock('full').level).toBe('full');
    expect(() => governor.lock('mutated')).toThrow(/supplied level/);
  });

  it('copies observation values rather than retaining mutable host sample objects', () => {
    const { governor, feed } = fixture();
    const sample = { kind: 'frame-cadence', milliseconds: 20, time: 0, valid: true, visible: true } as const;
    governor.sample(sample);
    Object.assign(sample, { milliseconds: 500, time: -100 });
    for (const time of [16, 32, 48]) feed(20, { time });
    expect(governor.state.evidence).toMatchObject({ startTime: 0, endTime: 48, meanMs: 20, maxMs: 20 });
    expect(Object.isFrozen(sample)).toBe(false);
  });

  it('keeps independent contexts and their sample kinds, levels, timestamps and targets isolated', () => {
    const frame = fixture({ initialLevel: 'balanced', targetMs: 10 });
    const gpu = fixture({ levels: ['economy', 'studio'], initialLevel: 'studio', targetMs: 20, kind: 'gpu-elapsed' });
    frame.window(20);
    frame.window(20);
    gpu.window(20);
    gpu.window(20);
    expect(frame.governor.state).toMatchObject({ level: 'small', lastAction: { action: 'downgrade' } });
    expect(gpu.governor.state).toMatchObject({ level: 'studio', lastAction: null, evidence: { classification: 'neutral' } });
    frame.governor.lock('full');
    expect(gpu.governor.state.locked).toBe(false);
    gpu.governor.reset('economy');
    expect(frame.governor.state).toMatchObject({ level: 'full', locked: true, lastTime: 112 });
  });
});

describe('bounded quality governor configuration and sample shapes', () => {
  const base = { levels: ['low', 'high'], kind: 'frame-cadence', targetMs: 10 } as const;
  it.each([
    { targetMs: undefined }, { targetMs: NaN }, { targetMs: 0 }, { targetMs: 1001 },
    { kind: undefined }, { kind: 'raf' },
    { levels: [] }, { levels: ['one'] }, { levels: Array.from({ length: 9 }, (_, index) => 'q' + index) },
    { levels: ['same', 'same'] }, { levels: ['low', '<script>'] }, { levels: ['low', 'x'.repeat(33)] },
    { levels: ['low', 1] }, { levels: ['low', 'two words'] }, { initialLevel: 'missing' },
    { windowSize: 3 }, { windowSize: 121 }, { windowSize: 4.5 },
    { downgradeWindows: 0 }, { downgradeWindows: 9 },
    { recoveryWindows: 1 }, { recoveryWindows: 33 }, { recoveryWindows: 2 },
    { cooldownMs: -1 }, { cooldownMs: 60_001 }, { cooldownMs: .5 },
    { maxGapMs: 0 }, { maxGapMs: 60_001 }, { maxGapMs: 1.5 },
    { unexpected: true },
  ])('rejects invalid configuration %j', patch => {
    expect(() => createGlassQualityGovernor({ ...base, ...patch } as unknown as GlassQualityGovernorOptions)).toThrow(TypeError);
  });

  it('accepts exact configuration bounds and precision for an explicit timing target', () => {
    expect(() => createGlassQualityGovernor({
      levels: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'], kind: 'gpu-elapsed',
      targetMs: .1, windowSize: 4, downgradeWindows: 1, recoveryWindows: 2,
      cooldownMs: 0, maxGapMs: 1,
    })).not.toThrow();
    expect(() => createGlassQualityGovernor({
      ...base, targetMs: 1000, windowSize: 120, downgradeWindows: 8, recoveryWindows: 32,
      cooldownMs: 60_000, maxGapMs: 60_000,
    })).not.toThrow();
    const governor = createGlassQualityGovernor({ ...base, targetMs: 16.6667 });
    expect(governor.sample({
      kind: 'frame-cadence', milliseconds: 60_000, time: Number.MAX_SAFE_INTEGER, valid: true, visible: true,
    }).accepted).toBe(true);
  });

  it('rejects inherited configuration, unknown symbols, sparse labels and accessors without executing getters', () => {
    const getter = vi.fn(() => 10);
    const accessor = { ...base };
    Object.defineProperty(accessor, 'targetMs', { get: getter, enumerable: true });
    const labels = ['low', 'high'];
    Object.defineProperty(labels, '1', { get: getter, enumerable: true });
    const sparse = ['low', 'high'];
    delete sparse[1];
    const nonEnumerable = { ...base };
    Object.defineProperty(nonEnumerable, 'targetMs', { value: 10, enumerable: false });
    const candidates = [
      Object.create(base), { ...base, [Symbol('extra')]: true }, accessor, nonEnumerable,
      { ...base, levels: labels }, { ...base, levels: sparse }, null, [],
    ];
    for (const candidate of candidates) {
      expect(() => createGlassQualityGovernor(candidate as GlassQualityGovernorOptions)).toThrow(TypeError);
    }
    expect(getter).not.toHaveBeenCalled();
    const nullPrototype = Object.assign(Object.create(null), base);
    expect(createGlassQualityGovernor(nullPrototype).state.level).toBe('high');
  });

  it('throws on malformed sample records before mutating live evidence or executing accessors', () => {
    const { governor, feed } = fixture();
    feed(20);
    const before = governor.state;
    const sample = { kind: 'frame-cadence', milliseconds: 20, time: 16, valid: true, visible: true };
    const getter = vi.fn(() => 16);
    const accessor = { ...sample };
    Object.defineProperty(accessor, 'time', { get: getter, enumerable: true });
    const candidates = [null, [], Object.create(sample), { ...sample, extra: 1 }, { ...sample, [Symbol('extra')]: 1 }, accessor];
    for (const candidate of candidates) {
      expect(() => governor.sample(candidate as GlassQualitySample)).toThrow(TypeError);
      expect(governor.state).toEqual(before);
    }
    expect(getter).not.toHaveBeenCalled();
    for (const label of ['unknown', '', 1, null]) {
      expect(() => governor.lock(label as string)).toThrow(TypeError);
      expect(() => governor.reset(label as string)).toThrow(TypeError);
      expect(governor.state).toEqual(before);
    }
  });
});
