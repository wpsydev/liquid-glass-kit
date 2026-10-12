import { retainGlassEnvironment } from './environment.js';
import type { GlassOptions } from './material.js';

export interface GlassMaterialPreferences {
  theme: 'system' | 'light' | 'dark';
  motion: 'system' | 'reduce';
  transparency: 'system' | 'solid';
}
export interface GlassMaterialSystemPreferences {
  dark?: boolean;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  contrastMore?: boolean;
  forcedColors?: boolean;
}
export interface GlassMaterialPreferenceState {
  readonly preferences: Readonly<GlassMaterialPreferences>;
  readonly appearance: 'light' | 'dark';
  readonly reducedMotion: boolean;
  readonly reducedTransparency: boolean;
  readonly contrastMore: boolean;
  readonly forcedColors: boolean;
  /** Forward explicitly to a host's existing material renderer update options. */
  readonly material: Readonly<Pick<GlassOptions, 'appearance' | 'reducedTransparency'>>;
  /** Forward explicitly to host-owned motion controllers. CSS alone does not stop JS. */
  readonly motion: Readonly<{ reducedMotion: boolean }>;
}
export type GlassPreferenceReason = 'initial' | 'user' | 'reset' | 'system' | 'storage' | 'clear';
export type GlassPreferenceErrorPhase = 'read' | 'write' | 'remove' | 'callback';
export interface GlassMaterialPreferenceOptions {
  initial?: Partial<GlassMaterialPreferences>;
  /** Explicit key AND supplied storage object. The library never accesses localStorage. */
  persistence?: { key: string; storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> };
  onChange?: (state: GlassMaterialPreferenceState, reason: GlassPreferenceReason) => void;
  onError?: (error: unknown, phase: GlassPreferenceErrorPhase) => void;
}
export interface GlassMaterialPreferenceController {
  readonly state: GlassMaterialPreferenceState;
  set(preferences: Partial<GlassMaterialPreferences>): GlassMaterialPreferenceState;
  /** Reset all requested choices to system; persists only when explicitly configured. */
  reset(): GlassMaterialPreferenceState;
  /** Remove only the configured key and reset to system after successful removal. */
  clearPersistence(): boolean;
  refresh(): void;
  destroy(): void;
}
const defaults: GlassMaterialPreferences = { theme: 'system', motion: 'system', transparency: 'system' };
const choices = { theme: ['system', 'light', 'dark'], motion: ['system', 'reduce'], transparency: ['system', 'solid'] } as const;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
function normalize(input: Partial<GlassMaterialPreferences>, previous: GlassMaterialPreferences = defaults): GlassMaterialPreferences {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Material preferences must be an object');
  const output = { ...previous };
  for (const key of Object.keys(choices) as (keyof GlassMaterialPreferences)[]) if (own(input, key)) {
    if (!(choices[key] as readonly string[]).includes(input[key] as string)) throw new RangeError(`Invalid material preference: ${key}`);
    Object.assign(output, { [key]: input[key] });
  }
  return output;
}

/** Pure deterministic SSR policy; omitted system fields mean no detected reduction. */
export function resolveGlassMaterialPreferences(input: Partial<GlassMaterialPreferences> = {}, system: GlassMaterialSystemPreferences = {}): GlassMaterialPreferenceState {
  const preferences = normalize(input), appearance = preferences.theme === 'system' ? system.dark ? 'dark' : 'light' : preferences.theme;
  const reducedMotion = preferences.motion === 'reduce' || Boolean(system.reducedMotion);
  const forcedColors = Boolean(system.forcedColors), contrastMore = Boolean(system.contrastMore);
  const reducedTransparency = preferences.transparency === 'solid' || Boolean(system.reducedTransparency) || contrastMore || forcedColors;
  return Object.freeze({ preferences: Object.freeze(preferences), appearance, reducedMotion, reducedTransparency, contrastMore, forcedColors,
    material: Object.freeze({ appearance, reducedTransparency }), motion: Object.freeze({ reducedMotion }) });
}

const attached = new WeakSet<HTMLElement>();
type Store = NonNullable<GlassMaterialPreferenceOptions['persistence']>['storage'];
type Subscriber = (serialized: string | null) => void;
const hubs = new WeakMap<Store, Map<string, Set<Subscriber>>>();
function parse(value: string): Partial<GlassMaterialPreferences> | undefined {
  if (value.length > 2048) return;
  try {
    const data = JSON.parse(value) as Record<string, unknown>;
    if (!data || typeof data !== 'object' || Array.isArray(data) || !own(data, 'version') || data.version !== 1 || !own(data, 'preferences') || !data.preferences || typeof data.preferences !== 'object' || Array.isArray(data.preferences)) return;
    const result: Partial<GlassMaterialPreferences> = {};
    for (const key of Object.keys(choices) as (keyof GlassMaterialPreferences)[]) {
      const stored = data.preferences as Record<string, unknown>;
      if (own(stored, key) && (choices[key] as readonly unknown[]).includes(stored[key])) Object.assign(result, { [key]: stored[key] });
    }
    return result;
  } catch { return; }
}

/**
 * Scoped requested/effective policy, not a renderer or global animation switch.
 * Import /material-preferences.css AFTER /material.css for optional palette/solid
 * presentation. Explicit local appearance/backdrop and inline palette tokens stay
 * local; nearest nested preference scopes supply their own inherited policy.
 * Wire onChange.material/motion to existing JS controllers; this function never
 * crawls widgets, rewrites their options, stops an arbitrary canvas, or claims
 * motion/transparency media-query support on every browser. Forced-color CSS uses
 * the platform palette. Persistence is in-memory unless the host supplies both
 * key and storage. Initial explicit choices override a valid stored choice.
 */
export function attachGlassMaterialPreferences(scope: HTMLElement, initial: GlassMaterialPreferenceOptions = {}): GlassMaterialPreferenceController {
  const doc = scope?.ownerDocument, view = doc?.defaultView;
  if (!view || !scope.isConnected) throw new Error('Material preferences require a connected browser scope');
  if (attached.has(scope)) throw new Error('Destroy the existing material preferences before attaching another');
  normalize(initial.initial ?? {});
  const browser = view, authoredInitial = { ...initial.initial }, persistence = initial.persistence ? { ...initial.persistence } : undefined;
  if (persistence && (typeof persistence.key !== 'string' || !persistence.key.trim() || persistence.key.length > 128 || !persistence.storage || !['getItem', 'setItem', 'removeItem'].every(key => typeof persistence.storage[key as keyof Store] === 'function'))) throw new RangeError('Persistence requires an explicit key of at most 128 characters and a storage object');
  // Snapshot callbacks/options: caller mutations do not silently reconfigure it.
  const onChange = initial.onChange, onError = initial.onError;
  let destroyed = false, requested = { ...defaults }, state!: GlassMaterialPreferenceState;
  const keys = ['data-lg-material-preferences', 'data-lg-pref-theme', 'data-lg-pref-motion', 'data-lg-pref-transparency', 'data-lg-pref-forced-colors'];
  const leases = keys.map(key => ({ key, original: scope.getAttribute(key), owned: scope.getAttribute(key) }));
  const write = (key: string, value: string) => { const lease = leases.find(item => item.key === key)!; lease.owned = value; if (scope.getAttribute(key) !== value) scope.setAttribute(key, value); };
  function report(error: unknown, phase: GlassPreferenceErrorPhase) {
    try { onError?.(error, phase); } catch (callbackError) { scope.dispatchEvent(new browser.CustomEvent('lg-preferences-error', { bubbles: true, detail: { error: callbackError, phase: 'callback' } })); }
    scope.dispatchEvent(new browser.CustomEvent('lg-preferences-error', { bubbles: true, detail: { error, phase } }));
  }
  if (persistence) { try { const value = persistence.storage.getItem(persistence.key); if (value !== null) requested = normalize(parse(value) ?? {}); } catch (error) { report(error, 'read'); } }
  // Only the explicitly authored initial fields override persisted preferences.
  requested = normalize(authoredInitial, requested);
  const dark = browser.matchMedia?.('(prefers-color-scheme: dark)');
  const environment = retainGlassEnvironment(browser, () => recompute('system'));
  function snapshot() { return resolveGlassMaterialPreferences(requested, { dark: Boolean(dark?.matches), reducedMotion: Boolean(environment.media[0]?.matches), reducedTransparency: Boolean(environment.media[1]?.matches), contrastMore: Boolean(environment.media[2]?.matches), forcedColors: Boolean(environment.media[3]?.matches) }); }
  function recompute(reason: GlassPreferenceReason, force = false) {
    if (destroyed) return;
    const next = snapshot(), changed = !state || JSON.stringify(state) !== JSON.stringify(next); state = next;
    write('data-lg-material-preferences', ''); write('data-lg-pref-theme', state.appearance); write('data-lg-pref-motion', state.reducedMotion ? 'reduce' : 'full');
    write('data-lg-pref-transparency', state.reducedTransparency ? 'solid' : 'glass'); write('data-lg-pref-forced-colors', String(state.forcedColors));
    if (force || changed) { try { onChange?.(state, reason); } catch (error) { report(error, 'callback'); } }
  }
  const fromStorage: Subscriber = value => {
    if (destroyed) return;
    const parsed = value === null ? defaults : parse(value); if (!parsed) return;
    // Invalid/unknown stored fields cannot silently relax an existing requested
    // reduction. Our own persisted snapshots include all three valid fields.
    requested = normalize(parsed, requested); recompute('storage');
  };
  let subscribers: Set<Subscriber> | undefined;
  if (persistence) {
    let keys = hubs.get(persistence.storage); if (!keys) { keys = new Map(); hubs.set(persistence.storage, keys); }
    subscribers = keys.get(persistence.key); if (!subscribers) { subscribers = new Set(); keys.set(persistence.key, subscribers); } subscribers.add(fromStorage);
  }
  function broadcast(value: string | null) { for (const subscriber of [...subscribers ?? []]) if (subscriber !== fromStorage) subscriber(value); }
  function persist() {
    if (!persistence || destroyed) return;
    const value = JSON.stringify({ version: 1, preferences: requested });
    try { persistence.storage.setItem(persistence.key, value); broadcast(value); } catch (error) { report(error, 'write'); }
  }
  function set(input: Partial<GlassMaterialPreferences>, reason: GlassPreferenceReason = 'user') {
    if (destroyed) return state;
    requested = normalize(input, requested); recompute(reason); persist(); return state;
  }
  const systemChanged = () => recompute('system');
  const storageChanged = (event: StorageEvent) => { if (persistence && event.storageArea === persistence.storage && (event.key === persistence.key || event.key === null)) fromStorage(event.key === null ? null : event.newValue); };
  attached.add(scope); dark?.addEventListener('change', systemChanged); if (persistence) browser.addEventListener('storage', storageChanged);
  recompute('initial', true);
  return {
    get state() { return state; }, set, reset: () => set(defaults, 'reset'), refresh: () => recompute('system'),
    clearPersistence() {
      if (destroyed || !persistence) return false;
      try { persistence.storage.removeItem(persistence.key); requested = { ...defaults }; recompute('clear'); broadcast(null); return true; } catch (error) { report(error, 'remove'); return false; }
    },
    destroy() {
      if (destroyed) return; destroyed = true; attached.delete(scope); environment.release(); dark?.removeEventListener('change', systemChanged); if (persistence) browser.removeEventListener('storage', storageChanged);
      if (persistence && subscribers) { subscribers.delete(fromStorage); if (!subscribers.size) { const keys = hubs.get(persistence.storage); keys?.delete(persistence.key); if (!keys?.size) hubs.delete(persistence.storage); } }
      for (const lease of leases) if (scope.getAttribute(lease.key) === lease.owned) lease.original === null ? scope.removeAttribute(lease.key) : scope.setAttribute(lease.key, lease.original);
    },
  };
}
