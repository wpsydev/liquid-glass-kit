// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createGlassMaterialDraft } from '../src/material-draft.js';
import type { GlassMaterialDraftOptions, GlassMaterialDraftPreview } from '../src/material-draft.js';
import { getGlassProps, resolveOptions } from '../src/material.js';
import type { GlassOptions } from '../src/material.js';

describe('pure staged material review', () => {
  it('is SSR-safe and schedules no work, reads no clock and makes no fetch request', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    const spies = [
      vi.spyOn(globalThis, 'setTimeout'), vi.spyOn(globalThis, 'setInterval'),
      vi.spyOn(Date, 'now'), vi.spyOn(performance, 'now'), vi.spyOn(globalThis, 'fetch'),
    ];
    spies.forEach(spy => spy.mockClear());
    const draft = createGlassMaterialDraft({ revision: 'surface-01/r7' });
    draft.patch({ radius: 32 }); draft.undo(); draft.redo(); draft.preview('before'); draft.commit('surface-01/r7'); draft.cancel();
    const calls = spies.map(spy => spy.mock.calls.length);
    spies.forEach(spy => spy.mockRestore());
    expect(calls).toEqual([0, 0, 0, 0, 0]);
  });

  it('starts from exact canonical defaults and portable refraction, without a pending edit or phantom history', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1' });
    expect(draft.state).toMatchObject({
      status: 'editing', baseRevision: 'r1', draftVersion: 0, dirty: false,
      historyLength: 1, historyIndex: 0, historyLimit: 32,
      canUndo: false, canRedo: false, previewMode: 'after',
    });
    expect(draft.state.before).toEqual(resolveOptions());
    expect(draft.state.after).toEqual(resolveOptions());
    expect(draft.state.after.refraction).toBe(0);
    expect(draft.state.previewMaterial).toBe(draft.state.after);
    expect(draft.undo()).toBe(draft.state);
    expect(draft.redo()).toBe(draft.state);
  });

  it('reuses canonical scalar normalization, fallbacks and clamps rather than inventing material defaults', () => {
    const initial = { variant: 'clear', appearance: 'dark', radius: -4, blur: Infinity, saturation: 9, opacity: -1, tint: '#AbC', tintOpacity: 10, refraction: NaN } as const;
    const draft = createGlassMaterialDraft({ revision: 'r1', initial });
    expect(draft.state.after).toEqual(resolveOptions(initial));
    expect(draft.state.after).toMatchObject({ blur: 6, radius: 0, saturation: 3, opacity: 0, tint: '#abc', tintOpacity: 1, refraction: 0 });
    const patch = { radius: 1200, blur: NaN, opacity: undefined, tint: 'url(https://invalid)', corner: 'unknown' } as unknown as GlassOptions;
    const expected = resolveOptions({ ...draft.state.after, ...patch });
    expect(draft.patch(patch).after).toEqual(expected);
    expect(draft.state.after).toMatchObject({ radius: 999, blur: 6, opacity: 1, tint: '#ffffff', corner: 'round' });
  });

  it('preserves complete normalized fields on patches, including existing blur when changing variant', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1', initial: { appearance: 'dark', corner: 'continuous', opacity: .75 } });
    const initial = draft.state.after;
    expect(draft.patch({ variant: 'clear' }).after).toEqual(resolveOptions({ ...initial, variant: 'clear' }));
    expect(draft.state.after.blur).toBe(18);
    expect(resolveOptions({ variant: 'clear' }).blur).toBe(6);
    expect(draft.state.after).toMatchObject({ appearance: 'dark', corner: 'continuous', opacity: .75 });
    expect(draft.patch({ blur: undefined }).after.blur).toBe(6);
    expect(draft.patch({ variant: 'regular' }).after.blur).toBe(6);
    expect(draft.patch({ blur: undefined }).after.blur).toBe(18);
  });

  it('compares before without editing after, material history or the target of a prepared request', () => {
    const draft = createGlassMaterialDraft({ revision: 'r7', initial: { radius: 12, blur: 8 } });
    draft.patch({ radius: 28, blur: 20 });
    const edit = draft.state;
    const before = draft.preview('before');
    expect(before.previewMaterial).toBe(before.before);
    expect(before.after).toBe(edit.after);
    expect(before.historyLength).toBe(edit.historyLength);
    expect(before.historyIndex).toBe(edit.historyIndex);
    expect(before.dirty).toBe(true);
    expect(draft.preview('before')).toBe(before);
    const result = draft.commit('r7');
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error('Expected a prepared request');
    expect(result.request.material).toMatchObject({ radius: 28, blur: 20 });
    expect(result.state.previewMode).toBe('before');
    expect(result.state.previewMaterial).toMatchObject({ radius: 12, blur: 8 });
    expect(result.request.material).toBe(result.state.after);
    expect(result.request.draftVersion).toBe(result.state.draftVersion);
    expect(result.request.baseRevision).toBe('r7');
  });

  it('deduplicates material no-ops and leaves a valid redo branch intact', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1' });
    const initial = draft.state;
    expect(draft.patch({})).toBe(initial);
    expect(draft.patch({ radius: 24 })).toBe(initial);
    draft.patch({ radius: 28 }); draft.patch({ radius: 32 }); draft.undo();
    const current = draft.state;
    expect(draft.patch({ radius: 28 })).toBe(current);
    expect(draft.state.canRedo).toBe(true);
    expect(draft.redo().after.radius).toBe(32);
    draft.preview('before');
    const length = draft.state.historyLength, version = draft.state.draftVersion;
    draft.patch({ radius: 32 });
    expect(draft.state.previewMode).toBe('after');
    expect(draft.state.historyLength).toBe(length);
    expect(draft.state.draftVersion).toBe(version + 1);
  });

  it('branches edits after undo while keeping monotonic local versions and the original baseline', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1' });
    draft.patch({ radius: 28 }); const first = draft.state;
    draft.patch({ radius: 32 }); const second = draft.state;
    const undone = draft.undo();
    expect(undone.after).toBe(first.after);
    expect(undone.draftVersion).toBeGreaterThan(second.draftVersion);
    draft.preview('before'); const version = draft.state.draftVersion;
    const branched = draft.patch({ blur: 22 });
    expect(branched.after).toMatchObject({ radius: 28, blur: 22 });
    expect(branched.draftVersion).toBe(version + 1);
    expect(branched.previewMode).toBe('after');
    expect(branched.canRedo).toBe(false);
    expect(draft.redo()).toBe(branched);
    expect(draft.undo().after).toEqual(first.after);
    expect(draft.undo().after).toEqual(resolveOptions());
    expect(draft.state.before).toEqual(resolveOptions());
    expect(first.after).toMatchObject({ radius: 28, blur: 18 });
  });

  it('bounds retained snapshots while preserving before/cancel even after old undo entries expire', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1', historyLimit: 3, initial: { radius: 12 } });
    for (let radius = 13; radius <= 100; radius++) {
      draft.patch({ radius });
      expect(draft.state.historyLength).toBeLessThanOrEqual(3);
    }
    expect(draft.state).toMatchObject({ historyLength: 3, historyIndex: 2, before: { radius: 12 }, after: { radius: 100 } });
    expect(draft.undo().after.radius).toBe(99);
    expect(draft.undo().after.radius).toBe(98);
    const floor = draft.state;
    expect(draft.undo()).toBe(floor);
    expect(draft.state.canUndo).toBe(false);
    expect(draft.preview('before').previewMaterial.radius).toBe(12);
    const cancelled = draft.cancel();
    expect(cancelled).toMatchObject({ status: 'cancelled', after: { radius: 12 }, historyLength: 1, historyIndex: 0, dirty: false, canUndo: false, canRedo: false });
    expect(draft.cancel()).toBe(cancelled);
  });

  it('returns structured caller-tag conflicts without changing history, preview intent or local version', () => {
    const draft = createGlassMaterialDraft({ revision: 'surface-7@r3' });
    draft.patch({ radius: 36 }); draft.undo(); draft.preview('before');
    const snapshot = draft.state;
    const result = draft.commit('surface-7@r4');
    expect(result).toEqual({
      ok: false, reason: 'revision-conflict', baseRevision: 'surface-7@r3',
      suppliedRevision: 'surface-7@r4', request: null, state: snapshot,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(draft.state).toBe(snapshot);
    expect(draft.state.canRedo).toBe(true);
    draft.redo();
    expect(draft.commit('surface-7@r3').ok).toBe(true);
  });

  it('prepares immutable review data idempotently without claiming host application or enabling business-action undo', () => {
    const draft = createGlassMaterialDraft({ revision: 'r3', initial: { tint: '#abc', interactive: true } });
    draft.patch({ radius: 40 });
    const result = draft.commit('r3');
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error('Expected prepared review data');
    expect(result).toMatchObject({
      reason: 'prepared', request: { kind: 'glass-material-draft', baseRevision: 'r3', dirty: true, material: { radius: 40, tint: '#abc', interactive: true } },
      state: { status: 'prepared', canUndo: false, canRedo: false },
    });
    expect(draft.commit('r3')).toBe(result);
    expect(draft.cancel()).toBe(result.state);
    expect(draft.state.dirty).toBe(true);
    expect(draft.commit('r4')).toMatchObject({ ok: false, reason: 'revision-conflict', state: result.state });
    expect(draft.state).toBe(result.state);
    for (const edit of [() => draft.patch({ radius: 1 }), () => draft.undo(), () => draft.redo(), () => draft.preview('after')]) {
      expect(edit).toThrow(/new draft/);
    }
    expect(Object.keys(result.request).sort()).toEqual(['baseRevision', 'before', 'dirty', 'draftVersion', 'kind', 'material']);
    expect(getGlassProps(result.request.material)).toEqual(getGlassProps(draft.state.after));
  });

  it('can prepare an unchanged material as explicitly clean review data', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1' });
    const result = draft.commit('r1');
    expect(result).toMatchObject({ ok: true, request: { dirty: false }, state: { status: 'prepared', historyLength: 1 } });
  });

  it('cancels pending intent and closes edits without pretending to restore a host-controlled preview or saved state', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1', initial: { radius: 15 } });
    draft.patch({ radius: 32 }); draft.patch({ blur: 24 }); draft.undo();
    const result = draft.cancel();
    expect(result).toMatchObject({
      status: 'cancelled', dirty: false, previewMode: 'before', before: { radius: 15 },
      after: { radius: 15, blur: 18 }, historyLength: 1, canUndo: false, canRedo: false,
    });
    expect(draft.commit('r1')).toMatchObject({ ok: false, reason: 'cancelled', request: null, state: result });
    expect(draft.commit('new-host-revision')).toMatchObject({ ok: false, reason: 'cancelled' });
    expect(draft.cancel()).toBe(result);
    expect(() => draft.patch({ radius: 1 })).toThrow();
    expect(() => draft.preview('after')).toThrow();
    expect(() => draft.undo()).toThrow();
    expect(() => draft.redo()).toThrow();
  });

  it('never freezes or retains mutable caller data and keeps previous snapshots stable', () => {
    const metadata = { secret: 'host-only' }, initial = { radius: 20, metadata } as GlassOptions;
    const options = { initial, revision: 'r1', historyLimit: 3 };
    const draft = createGlassMaterialDraft(options), original = draft.state;
    initial.radius = 99; options.revision = 'mutated'; options.historyLimit = 128; metadata.secret = 'changed';
    const patch = { blur: 12, nested: metadata } as GlassOptions;
    draft.patch(patch); patch.blur = 40;
    expect(draft.state).toMatchObject({ baseRevision: 'r1', historyLimit: 3, before: { radius: 20 }, after: { radius: 20, blur: 12 } });
    expect(original).toMatchObject({ draftVersion: 0, after: { radius: 20, blur: 18 }, historyLength: 1 });
    expect(draft.state.after).not.toHaveProperty('metadata');
    expect(draft.state.after).not.toHaveProperty('nested');
    for (const host of [metadata, initial, options, patch]) expect(Object.isFrozen(host)).toBe(false);
    expect(Object.isFrozen(draft)).toBe(true);
    const result = draft.commit('r1');
    if (!result.ok) throw Error('Expected prepared result');
    for (const own of [original, original.before, original.after, draft.state, draft.state.after, result, result.request, result.request.material]) {
      expect(Object.isFrozen(own)).toBe(true);
    }
    expect(() => Object.assign(result.request.material, { blur: 60 })).toThrow();
  });

  it('ignores unknown material keys without evaluating or retaining their getters, matching the canonical resolver', () => {
    const getter = vi.fn(() => 'do not read');
    const initial = { radius: 18, external: { value: 'private' } };
    Object.defineProperty(initial, 'unknown', { enumerable: true, get: getter });
    const draft = createGlassMaterialDraft({ revision: 'r1', initial });
    const patch = { radius: 30, [Symbol('unknown')]: 'private' };
    Object.defineProperty(patch, '__proto__', { enumerable: true, value: { polluted: true } });
    Object.defineProperty(patch, 'unknown', { enumerable: true, get: getter });
    expect(draft.patch(patch).after).toEqual(resolveOptions({ ...draft.state.before, radius: 30 }));
    expect(getter).not.toHaveBeenCalled();
    expect(draft.state.after).not.toHaveProperty('polluted');
    expect(JSON.stringify(draft.state)).not.toContain('private');
    const before = draft.state;
    expect(draft.patch({ unknown: 1 } as GlassOptions)).toBe(before);
  });

  it('keeps independent surface drafts, baseline revisions and histories separate', () => {
    const first = createGlassMaterialDraft({ revision: 'surface1/r1', initial: { radius: 10 } });
    const second = createGlassMaterialDraft({ revision: 'surface2/r8', initial: { radius: 24 } });
    first.patch({ radius: 30 }); second.patch({ tint: '#F00' });
    first.cancel(); const prepared = second.commit('surface2/r8');
    expect(first.state).toMatchObject({ status: 'cancelled', after: { radius: 10 } });
    expect(prepared).toMatchObject({ ok: true, request: { baseRevision: 'surface2/r8', material: { radius: 24, tint: '#f00' } } });
  });
});

describe('draft data boundary validation', () => {
  it.each([undefined, null, [], 'options', Object.create({ revision: 'r1' }), { revision: 'r1', extra: 1 }])('rejects malformed controller configuration %j', input => {
    expect(() => createGlassMaterialDraft(input as GlassMaterialDraftOptions)).toThrow(TypeError);
  });
  it.each(['', 'r 1', 'r1\n', 'r\t1', 'é', '\u007f', 'x'.repeat(97), 1, null, undefined])('bounds revision tag %j', value => {
    expect(() => createGlassMaterialDraft({ revision: value as string })).toThrow(TypeError);
    const draft = createGlassMaterialDraft({ revision: 'r1' });
    expect(() => draft.commit(value as string)).toThrow(TypeError);
    expect(draft.state.draftVersion).toBe(0);
  });
  it.each([1, 129, 3.5, NaN, Infinity, '32', null])('rejects unbounded history size %j', value => {
    expect(() => createGlassMaterialDraft({ revision: 'r1', historyLimit: value as number })).toThrow(TypeError);
  });
  it('accepts exact history/revision bounds, opaque case-sensitive printable tags and null-prototype data', () => {
    for (const historyLimit of [2, 128]) {
      const draft = createGlassMaterialDraft({ revision: 'x'.repeat(96), historyLimit });
      expect(draft.state.historyLimit).toBe(historyLimit);
    }
    const opaque = createGlassMaterialDraft({ revision: 'W/"asset-5"' });
    expect(opaque.commit('w/"asset-5"')).toMatchObject({ ok: false, reason: 'revision-conflict' });
    expect(opaque.commit('W/"asset-5"').ok).toBe(true);
    const draft = createGlassMaterialDraft(Object.assign(Object.create(null), { revision: 'r1', initial: Object.assign(Object.create(null), { radius: 7 }) }));
    expect(draft.state.after.radius).toBe(7);
  });
  it.each([null, [], 'patch', 1, new Date(), Object.create({ radius: 8 })])('rejects malformed material records %j without changing a draft', input => {
    const draft = createGlassMaterialDraft({ revision: 'r1' }), before = draft.state;
    expect(() => draft.patch(input as GlassOptions)).toThrow(TypeError);
    expect(draft.state).toBe(before);
    expect(() => createGlassMaterialDraft({ revision: 'r1', initial: input as GlassOptions })).toThrow(TypeError);
  });
  it('refuses controller/known-material accessors and non-enumerable properties without executing them', () => {
    const getter = vi.fn(() => 12);
    const config = { revision: 'r1' };
    Object.defineProperty(config, 'historyLimit', { get: getter, enumerable: true });
    expect(() => createGlassMaterialDraft(config)).toThrow(TypeError);
    expect(() => createGlassMaterialDraft({ revision: 'r1', [Symbol('extra')]: true } as GlassMaterialDraftOptions)).toThrow(TypeError);
    const draft = createGlassMaterialDraft({ revision: 'r1' }), before = draft.state;
    const accessor = {}; Object.defineProperty(accessor, 'radius', { get: getter, enumerable: true });
    const hidden = {}; Object.defineProperty(hidden, 'blur', { value: 12 });
    for (const patch of [accessor, hidden]) expect(() => draft.patch(patch)).toThrow(TypeError);
    expect(draft.state).toBe(before);
    expect(getter).not.toHaveBeenCalled();
  });
  it.each([{}, [], 0, 1, 'false', 'true'])('refuses flags that the permissive resolver would otherwise retain as nonboolean %j', value => {
    const draft = createGlassMaterialDraft({ revision: 'r1' }), before = draft.state;
    for (const key of ['interactive', 'reducedTransparency']) {
      expect(() => draft.patch({ [key]: value } as GlassOptions)).toThrow(TypeError);
      expect(draft.state).toBe(before);
      expect(() => createGlassMaterialDraft({ revision: 'r1', initial: { [key]: value } as GlassOptions })).toThrow(TypeError);
    }
  });
  it('retains the resolver’s nullish false semantics for material flags', () => {
    const draft = createGlassMaterialDraft({ revision: 'r1', initial: { interactive: true, reducedTransparency: true } });
    expect(draft.patch({ interactive: null, reducedTransparency: undefined } as unknown as GlassOptions).after).toMatchObject({ interactive: false, reducedTransparency: false });
  });
  it.each(['invalid', '', null, 1])('rejects invalid comparison mode %j transactionally', mode => {
    const draft = createGlassMaterialDraft({ revision: 'r1' }), before = draft.state;
    expect(() => draft.preview(mode as GlassMaterialDraftPreview)).toThrow(TypeError);
    expect(draft.state).toBe(before);
  });
});
