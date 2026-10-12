import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassMaterialPreferences, resolveGlassMaterialPreferences } from '../src/material-preferences.js';
import type { GlassMaterialPreferenceOptions, GlassMaterialPreferenceController } from '../src/material-preferences.js';

const controllers: GlassMaterialPreferenceController[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function media() {
  const values = new Map<string, EventTarget & { matches: boolean }>();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => { if (!values.has(query)) values.set(query, Object.assign(new EventTarget(), { matches: false, media: query })); return values.get(query)!; }));
  return { values, set(query: string, matches: boolean) { window.matchMedia(query); values.get(query)!.matches = matches; values.get(query)!.dispatchEvent(new Event('change')); } };
}
function store(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed)); return { values, storage: { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value); }), removeItem: vi.fn((key: string) => { values.delete(key); }) } };
}
function fixture(options: GlassMaterialPreferenceOptions = {}) {
  const scope = document.createElement('section'); scope.innerHTML = '<button type="button" class="lg-glass" data-lg-appearance="dark" data-lg-solid="false" style="--lg-fill-rgb:10 20 30">Local material</button>'; document.body.append(scope);
  const onChange = vi.fn(), onError = vi.fn(); const controller = attachGlassMaterialPreferences(scope, { onChange, onError, ...options }); controllers.push(controller); return { scope, controller, onChange, onError, button: scope.firstElementChild as HTMLButtonElement };
}
const serialized = (preferences: Record<string, unknown>, version = 1) => JSON.stringify({ version, preferences });
function storageEvent(storage: object, key: string | null, newValue: string | null) { const event = new Event('storage'); Object.defineProperties(event, { storageArea: { value: storage }, key: { value: key }, newValue: { value: newValue } }); window.dispatchEvent(event); }

describe('pure material preference policy', () => {
  it('has deterministic SSR defaults and produces existing material/motion update shapes', () => {
    const state = resolveGlassMaterialPreferences(); expect(state.preferences).toEqual({ theme: 'system', motion: 'system', transparency: 'system' }); expect(state.appearance).toBe('light'); expect(state.material).toEqual({ appearance: 'light', reducedTransparency: false }); expect(state.motion).toEqual({ reducedMotion: false });
  });
  it('keeps OS reductions authoritative and distinguishes contrast/forced-color policy', () => {
    const state = resolveGlassMaterialPreferences({ theme: 'light', motion: 'system', transparency: 'system' }, { dark: true, reducedMotion: true, reducedTransparency: true }); expect(state.appearance).toBe('light'); expect(state.reducedMotion).toBe(true); expect(state.reducedTransparency).toBe(true);
    expect(resolveGlassMaterialPreferences({}, { contrastMore: true }).reducedTransparency).toBe(true); const forced = resolveGlassMaterialPreferences({ theme: 'dark' }, { forcedColors: true }); expect(forced.forcedColors).toBe(true); expect(forced.reducedTransparency).toBe(true); expect(forced.reducedMotion).toBe(false);
  });
  it('supports explicit reductions where system media signals are absent', () => { const state = resolveGlassMaterialPreferences({ theme: 'dark', motion: 'reduce', transparency: 'solid' }); expect(state.appearance).toBe('dark'); expect(state.reducedMotion).toBe(true); expect(state.reducedTransparency).toBe(true); });
  it('rejects invalid choices and ignores inherited/unknown fields without prototype pollution', () => {
    for (const value of [{ theme: 'night' }, { motion: 'full' }, { transparency: 'glass' }, { theme: undefined }]) expect(() => resolveGlassMaterialPreferences(value as never)).toThrow('Invalid');
    expect(resolveGlassMaterialPreferences(Object.create({ theme: 'dark' })).appearance).toBe('light'); expect(resolveGlassMaterialPreferences(JSON.parse('{"__proto__":{"theme":"dark"},"unknown":"x"}')).appearance).toBe('light'); expect(({} as Record<string, unknown>).theme).toBeUndefined();
  });
  it('returns frozen nested state and does not mutate caller choices', () => { const input = { theme: 'dark' as const }; const state = resolveGlassMaterialPreferences(input); expect(Reflect.set(state.preferences, 'theme', 'light')).toBe(false); expect(Reflect.set(state.material, 'appearance', 'light')).toBe(false); expect(Reflect.set(state.motion, 'reducedMotion', true)).toBe(false); expect(input.theme).toBe('dark'); });
});

describe('optional scoped material preference controller', () => {
  it('defaults to memory, never reads automatic localStorage, and leaves widget attributes/styles intact', () => {
    media(); const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Unexpected storage access'); }); const { controller, scope, button, onChange } = fixture(); const markup = button.outerHTML;
    controller.set({ theme: 'dark', transparency: 'solid', motion: 'reduce' }); expect(getter).not.toHaveBeenCalled(); expect(button.outerHTML).toBe(markup); expect(scope.dataset.lgPrefTheme).toBe('dark'); expect(scope.dataset.lgPrefTransparency).toBe('solid'); expect(scope.dataset.lgPrefMotion).toBe('reduce'); expect(onChange).toHaveBeenLastCalledWith(controller.state, 'user');
    controller.destroy(); expect(button.outerHTML).toBe(markup); expect(scope.hasAttribute('data-lg-material-preferences')).toBe(false);
  });
  it('reads a small versioned opt-in record with explicit initial choices taking precedence', () => {
    media(); const { storage } = store({ prefs: serialized({ theme: 'dark', motion: 'reduce', transparency: 'solid' }) }); const { controller } = fixture({ initial: { theme: 'light' }, persistence: { key: 'prefs', storage } });
    expect(controller.state.preferences).toEqual({ theme: 'light', motion: 'reduce', transparency: 'solid' }); expect(storage.getItem).toHaveBeenCalledWith('prefs'); expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('ignores malformed, wrong-version, oversized records while retaining valid known fields', () => {
    media(); for (const value of ['{bad', serialized({ theme: 'dark' }, 2), 'x'.repeat(2049), JSON.stringify({ version: 1, preferences: [] })]) { const { storage } = store({ prefs: value }); const { controller } = fixture({ persistence: { key: 'prefs', storage } }); expect(controller.state.preferences.theme).toBe('system'); }
    const { storage } = store({ prefs: serialized({ theme: 'invalid', motion: 'reduce', transparency: 'invalid', arbitrary: { url: 'https://example.invalid' } }) }); expect(fixture({ persistence: { key: 'prefs', storage } }).controller.state.preferences).toEqual({ theme: 'system', motion: 'reduce', transparency: 'system' });
  });
  it('persists only intentional choices, not mount or OS media changes', () => {
    const system = media(), { storage } = store(); const { controller } = fixture({ persistence: { key: 'prefs', storage } }); system.set('(prefers-color-scheme: dark)', true); expect(controller.state.appearance).toBe('dark'); expect(storage.setItem).not.toHaveBeenCalled();
    controller.set({ motion: 'reduce' }); expect(storage.setItem).toHaveBeenCalledOnce(); expect(JSON.parse(storage.setItem.mock.calls[0][1])).toEqual({ version: 1, preferences: { theme: 'system', motion: 'reduce', transparency: 'system' } }); controller.reset(); expect(controller.state.preferences.motion).toBe('system'); expect(storage.setItem).toHaveBeenCalledTimes(2);
  });
  it('tracks live theme, motion, transparency, contrast and forced-color media changes', () => {
    const system = media(); const { controller, scope } = fixture(); system.set('(prefers-color-scheme: dark)', true); system.set('(prefers-reduced-motion: reduce)', true); system.set('(prefers-reduced-transparency: reduce)', true);
    controller.set({ theme: 'light', motion: 'system', transparency: 'system' }); expect(controller.state.appearance).toBe('light'); expect(controller.state.reducedMotion).toBe(true); expect(controller.state.reducedTransparency).toBe(true);
    system.set('(prefers-reduced-transparency: reduce)', false); system.set('(prefers-contrast: more)', true); expect(controller.state.contrastMore).toBe(true); expect(controller.state.reducedTransparency).toBe(true);
    system.set('(prefers-contrast: more)', false); system.set('(forced-colors: active)', true); expect(scope.dataset.lgPrefForcedColors).toBe('true'); expect(controller.state.material.reducedTransparency).toBe(true);
  });
  it('keeps nested scopes independent and effective system reductions authoritative in both', () => {
    const system = media(); const outer = fixture({ initial: { theme: 'dark', transparency: 'solid' } }), inner = fixture({ initial: { theme: 'light' } }); outer.scope.append(inner.scope);
    expect(outer.scope.dataset.lgPrefTheme).toBe('dark'); expect(inner.scope.dataset.lgPrefTheme).toBe('light'); expect(inner.controller.state.reducedTransparency).toBe(false);
    system.set('(prefers-reduced-transparency: reduce)', true); expect(outer.controller.state.reducedTransparency).toBe(true); expect(inner.controller.state.reducedTransparency).toBe(true); inner.controller.destroy(); expect(outer.scope.dataset.lgPrefTheme).toBe('dark');
  });
  it('synchronizes same-document instances only for the explicitly shared storage object/key', () => {
    media(); const { storage } = store(), shared = { persistence: { key: 'prefs', storage } }; const first = fixture(shared), second = fixture(shared), other = fixture({ persistence: { key: 'other', storage } });
    first.controller.set({ theme: 'dark', transparency: 'solid' }); expect(second.controller.state.preferences.theme).toBe('dark'); expect(second.onChange).toHaveBeenLastCalledWith(second.controller.state, 'storage'); expect(other.controller.state.preferences.theme).toBe('system'); expect(storage.setItem).toHaveBeenCalledOnce();
    second.controller.destroy(); first.controller.set({ theme: 'light' }); expect(second.controller.state.preferences.theme).toBe('dark');
  });
  it('uses matching browser storage events without writes and ignores unrelated/invalid payloads', () => {
    media(); const { storage } = store(), other = store().storage; const { controller } = fixture({ persistence: { key: 'prefs', storage } });
    storageEvent(other, 'prefs', serialized({ theme: 'dark' })); storageEvent(storage, 'other', serialized({ theme: 'dark' })); storageEvent(storage, 'prefs', '{bad'); expect(controller.state.preferences.theme).toBe('system');
    storageEvent(storage, 'prefs', serialized({ theme: 'dark', motion: 'reduce' })); expect(controller.state.preferences.theme).toBe('dark'); expect(controller.state.preferences.motion).toBe('reduce'); expect(storage.setItem).not.toHaveBeenCalled();
    storageEvent(storage, null, null); expect(controller.state.preferences.theme).toBe('system');
  });
  it('clears only its configured key, resets peers and preserves unrelated storage', () => {
    media(); const { storage, values } = store({ unrelated: 'keep', prefs: serialized({ theme: 'dark' }) }); const first = fixture({ persistence: { key: 'prefs', storage } }), second = fixture({ persistence: { key: 'prefs', storage } });
    expect(first.controller.clearPersistence()).toBe(true); expect(values.get('unrelated')).toBe('keep'); expect(values.has('prefs')).toBe(false); expect(first.controller.state.preferences.theme).toBe('system'); expect(second.controller.state.preferences.theme).toBe('system'); expect(storage.setItem).not.toHaveBeenCalled(); expect(fixture().controller.clearPersistence()).toBe(false);
  });
  it('ignores invalid external fields without relaxing existing requested reductions', () => {
    media(); const { storage } = store(); const { controller } = fixture({ initial: { theme: 'dark', motion: 'reduce', transparency: 'solid' }, persistence: { key: 'prefs', storage } });
    storageEvent(storage, 'prefs', serialized({ theme: 'light', motion: 'full', transparency: 'glass' })); expect(controller.state.preferences).toEqual({ theme: 'light', motion: 'reduce', transparency: 'solid' });
    storageEvent(storage, 'prefs', serialized({ arbitrary: true })); expect(controller.state.preferences.motion).toBe('reduce');
  });
  it('catches denied reads/quota writes and retains usable in-memory choices', () => {
    media(); const { storage } = store(); const readError = new Error('Denied'), writeError = new Error('Quota'); storage.getItem.mockImplementation(() => { throw readError; }); storage.setItem.mockImplementation(() => { throw writeError; });
    const { controller, onError } = fixture({ persistence: { key: 'prefs', storage } }); expect(onError).toHaveBeenCalledWith(readError, 'read'); expect(() => controller.set({ theme: 'dark' })).not.toThrow(); expect(controller.state.appearance).toBe('dark'); expect(onError).toHaveBeenCalledWith(writeError, 'write');
  });
  it('does not broadcast failed persistence or discard choices when removal is denied', () => {
    media(); const { storage } = store(); const first = fixture({ persistence: { key: 'prefs', storage } }), second = fixture({ persistence: { key: 'prefs', storage } }); storage.setItem.mockImplementation(() => { throw Error('Denied'); }); first.controller.set({ theme: 'dark' }); expect(second.controller.state.preferences.theme).toBe('system');
    storage.removeItem.mockImplementation(() => { throw Error('Denied'); }); expect(first.controller.clearPersistence()).toBe(false); expect(first.controller.state.preferences.theme).toBe('dark');
  });
  it('catches throwing notifications without breaking updates or teardown', () => {
    media(); const { controller, scope } = fixture({ onChange() { throw Error('Host notification'); }, onError() { throw Error('Host error handler'); } }); const report = vi.fn(); scope.addEventListener('lg-preferences-error', report); expect(() => controller.set({ theme: 'dark' })).not.toThrow(); expect(report).toHaveBeenCalled(); expect(controller.state.appearance).toBe('dark'); expect(() => controller.destroy()).not.toThrow();
  });
  it('restores only attributes still owned, preserving authored attributes/styles and later host changes', () => {
    media(); const scope = document.createElement('div'); scope.setAttribute('data-lg-pref-theme', 'authored'); scope.style.setProperty('color-scheme', 'dark', 'important'); document.body.append(scope); const controller = attachGlassMaterialPreferences(scope); controllers.push(controller); scope.setAttribute('data-lg-pref-motion', 'host-edited'); scope.style.color = 'red'; controller.destroy();
    expect(scope.dataset.lgPrefTheme).toBe('authored'); expect(scope.dataset.lgPrefMotion).toBe('host-edited'); expect(scope.style.getPropertyPriority('color-scheme')).toBe('important'); expect(scope.style.color).toBe('red');
  });
  it('rejects malformed configuration and duplicate scopes before applying attributes or listeners', () => {
    media(); const scope = document.createElement('div'); document.body.append(scope);
    for (const options of [{ persistence: { key: '', storage: store().storage } }, { persistence: { key: 'x'.repeat(129), storage: store().storage } }, { persistence: { key: 'x', storage: {} } }, { initial: { motion: 'full' } }]) expect(() => attachGlassMaterialPreferences(scope, options as never)).toThrow(); expect(scope.attributes).toHaveLength(0);
    const controller = attachGlassMaterialPreferences(scope); controllers.push(controller); expect(() => attachGlassMaterialPreferences(scope)).toThrow('existing');
  });
  it('does not let exposed/source option mutations change cached policy or callbacks', () => {
    media(); const initial = { theme: 'dark' as 'dark' | 'light' }, callback = vi.fn(), options = { initial, onChange: callback }; const { controller } = fixture(options); initial.theme = 'light'; options.onChange = vi.fn();
    expect(Reflect.set(controller.state.preferences, 'theme', 'light')).toBe(false); controller.set({ transparency: 'solid' }); expect(controller.state.appearance).toBe('dark'); expect(callback).toHaveBeenCalledTimes(2);
  });
  it('validates partial updates before changing state, storage or attributes', () => {
    media(); const { storage } = store(); const { controller, scope } = fixture({ persistence: { key: 'prefs', storage } }); const before = scope.outerHTML; expect(() => controller.set({ theme: 'invalid' } as never)).toThrow(); expect(scope.outerHTML).toBe(before); expect(controller.state.preferences.theme).toBe('system'); expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('shares existing media environment and releases the last listeners with no RAF/geometry polling', () => {
    const system = media(), raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect'); const first = fixture(), second = fixture();
    const reduced = system.values.get('(prefers-reduced-motion: reduce)')!, remove = vi.spyOn(reduced, 'removeEventListener'); first.controller.destroy(); expect(remove).not.toHaveBeenCalled(); second.controller.destroy(); expect(remove).toHaveBeenCalledOnce(); expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled();
  });
  it('tears down media/storage listeners, ignores late changes and makes methods inert', () => {
    const system = media(), { storage } = store(), remove = vi.spyOn(window, 'removeEventListener'); const { controller, scope } = fixture({ persistence: { key: 'prefs', storage } }); controller.destroy(); controller.destroy(); const state = controller.state;
    controller.set({ theme: 'dark' }); controller.reset(); controller.refresh(); system.set('(prefers-color-scheme: dark)', true); storageEvent(storage, 'prefs', serialized({ theme: 'dark' })); expect(controller.state).toBe(state); expect(controller.clearPersistence()).toBe(false); expect(scope.hasAttribute('data-lg-material-preferences')).toBe(false); expect(remove).toHaveBeenCalledWith('storage', expect.any(Function)); expect(storage.setItem).not.toHaveBeenCalled();
  });
});
