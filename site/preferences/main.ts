import { attachGlassMaterialPreferences } from '../../src/material-preferences.js';
import type { GlassMaterialPreferences, GlassMaterialPreferenceState, GlassPreferenceErrorPhase, GlassPreferenceReason } from '../../src/material-preferences.js';
import { attachGlassTransition } from '../../src/micro-motion.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Preset = 'light' | 'dark' | 'quiet';
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const scope = query('#app-scope'), corner = query('#nested-scope');
const storageKey = 'liquid-glass-kit.preferences-demo.v1';
const notes = [
  { id: 'arrival', title: 'Leave a little room.', description: 'The useful detail should arrive before the decorative one.', text: 'A little restraint helps the useful thing feel intentional. Keep the first action clear, then let the details carry the character.' },
  { id: 'overlap', title: 'A little motion, with a point.', description: 'A short transition can show continuity without becoming the whole story.', text: 'A useful transition connects two committed states. Keep it finite, make the change legible and respect the person’s preference for less motion.' },
  { id: 'afterimage', title: 'Let the right thing remain.', description: 'Quiet surfaces can keep the character while making room for the content.', text: 'The palette can belong to the work, while comfort belongs to the person. Give material effects a readable solid alternative and let the content settle.' },
] as const;
type NoteId = typeof notes[number]['id'];
const drafts = new Map<NoteId, string>(notes.map(note => [note.id, note.text]));
const saved = new Set<NoteId>();
let noteId: NoteId = 'arrival', remembering = false, storage: StoragePort | undefined, errorRevision = 0, destroyed = false;
let rootState: GlassMaterialPreferenceState | undefined, nestedState: GlassMaterialPreferenceState | undefined, lastReason: GlassPreferenceReason = 'initial';
let root: ReturnType<typeof attachGlassMaterialPreferences> | undefined, nested: ReturnType<typeof attachGlassMaterialPreferences>;
let motionRevision = 0, motionEpoch = 0, motionRequests = 0, motionSettled = 0, motionCancelled = 0, tourVersion = 0, tourStep: Preset | null = null;
let tourTimers: number[] = [], tourFinish: ((complete: boolean) => void) | undefined;
const failures: { phase: GlassPreferenceErrorPhase; at: number }[] = [];
const queries = {
  dark: '(prefers-color-scheme: dark)', reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)', contrastMore: '(prefers-contrast: more)', forcedColors: '(forced-colors: active)',
} as const;
// Readback only; mounted preference controllers own live media subscriptions.
const media = Object.fromEntries(Object.entries(queries).map(([key, value]) => {
  try { return [key, window.matchMedia?.(value)]; } catch { return [key, undefined]; }
})) as Record<keyof typeof queries, MediaQueryList | undefined>;
const snapshot = () => Object.fromEntries(Object.entries(media).map(([key, value]) => [key, value ? Boolean(value.matches) : null]));
const motion = attachGlassTransition(query('#note-heading'), { duration: 220, distance: 8, reducedMotion: true });
const summarize = (state: GlassMaterialPreferenceState) => state.appearance + ' / ' + (state.reducedMotion ? 'reduced motion' : 'system motion') + ' / ' + (state.reducedTransparency ? 'solid surfaces' : 'glass allowed') + (state.forcedColors ? ' / platform colours' : '');
const render = () => {
  if (destroyed || !rootState) return;
  for (const key of ['theme', 'motion', 'transparency'] as const) query<HTMLSelectElement>('#' + key).value = rootState.preferences[key];
  query<HTMLInputElement>('#remember').checked = remembering;
  query('#effective-policy').textContent = summarize(rootState);
  query('#motion-policy').textContent = rootState.reducedMotion ? 'Heading adapter: reducedMotion = true' : 'Heading adapter: reducedMotion = false';
  query('#change-reason').textContent = lastReason + ' / ' + (remembering ? 'remember requested' : 'memory');
  const system = snapshot(), labels = { dark: '#system-dark', reducedMotion: '#system-motion', reducedTransparency: '#system-transparency', contrastMore: '#system-contrast', forcedColors: '#system-forced' };
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) query(labels[key]).textContent = system[key] === null ? 'unavailable' : system[key] ? 'matches true' : 'matches false';
  if (nestedState) {
    query<HTMLSelectElement>('#nested-theme').value = nestedState.preferences.theme;
    query<HTMLSelectElement>('#nested-surface').value = nestedState.preferences.transparency;
    query('#nested-result').textContent = summarize(nestedState) + ' / independent requested choices';
  }
  query('#session-count').textContent = saved.size + (saved.size === 1 ? ' note saved' : ' notes saved');
};
const error = (_error: unknown, phase: GlassPreferenceErrorPhase) => {
  if (destroyed) return;
  errorRevision++; failures.push({ phase, at: performance.now() }); if (failures.length > 12) failures.shift();
  query('#storage-status').textContent = 'The browser did not accept a settings ' + phase + ' operation. Current in-memory choices remain usable; no success is assumed.';
};
const onChange = (state: GlassMaterialPreferenceState, reason: GlassPreferenceReason) => {
  rootState = state; lastReason = reason;
  // The explicit host adapter updates the actual optional transition controller.
  // The preference stylesheet separately scopes known material presentation.
  motion.update({ ...state.motion, duration: 220, distance: 8, direction: 'up' });
  render();
  if (reason === 'user' || reason === 'reset' || reason === 'clear' || reason === 'storage') query('#preference-status').textContent = 'Workspace: ' + summarize(state) + '.';
};
const attachRoot = (initial?: Partial<GlassMaterialPreferences>, supplied?: StoragePort) => {
  root?.destroy();
  root = attachGlassMaterialPreferences(scope, { initial, ...(supplied ? { persistence: { key: storageKey, storage: supplied } } : {}), onChange, onError: error });
};
const material = (id: string, local = false) => {
  const element = query(id), props = getGlassProps({ appearance: local ? 'light' : 'auto', radius: local ? 12 : 15, blur: local ? 8 : 14, corner: 'continuous' });
  element.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) element.style.setProperty(key, value);
  for (const [key, value] of Object.entries(props)) if (key !== 'style' && key !== 'className') element.setAttribute(key, String(value));
  if (local) {
    element.style.setProperty('--lg-fill-rgb', '248 209 172'); element.style.setProperty('--lg-solid-fill', '#f8d1ac'); element.style.setProperty('--lg-ink', '#583021');
  }
};
material('#note-card'); material('#nested-card'); material('#local-card', true);
attachRoot();
nested = attachGlassMaterialPreferences(corner, { initial: { theme: 'dark' }, onChange(state) { nestedState = state; render(); } });
const cancelTour = () => {
  tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = [];
  tourStep = null; tourFinish?.(false); tourFinish = undefined; query('#tour').textContent = 'Short tour ↗';
};
const memory = () => {
  if (!remembering) return;
  const current = root!.state.preferences; remembering = false; attachRoot(current);
  query('#storage-status').textContent = 'In-memory mode. A previously saved key is left alone until you explicitly clear it.';
  render();
};
const remember = (enabled: boolean, provided?: StoragePort) => {
  if (typeof enabled !== 'boolean') throw new TypeError('Remember choice must be boolean');
  cancelTour();
  if (!enabled) { memory(); render(); return false; }
  const current = root!.state.preferences, before = errorRevision;
  try {
    // Only this deliberate host action accesses browser storage; the library
    // receives an explicit object and key, never a global-storage default.
    const candidate = provided ?? window.localStorage;
    if (!candidate || !['getItem', 'setItem', 'removeItem'].every(key => typeof candidate[key as keyof StoragePort] === 'function')) throw new TypeError('Storage port is unavailable');
    const previousRecord = candidate.getItem(storageKey);
    storage = candidate; remembering = true;
    // Recall is also explicit. The library validates the versioned record; new
    // opt-ins retain current choices when there is no prior saved record.
    attachRoot(previousRecord === null ? current : undefined, storage);
    root!.set(root!.state.preferences); // One deliberate write of resolved choices.
    if (before === errorRevision) query('#storage-status').textContent = previousRecord === null ? 'The browser accepted these settings under our own key. Notes remain session-only.' : 'Remembered settings were read through the validated controller, and the browser accepted the current choices. Notes remain session-only.';
    render(); return before === errorRevision;
  } catch {
    remembering = false; attachRoot(current); error(undefined, 'read'); render(); return false;
  }
};
const set = (preferences: Partial<GlassMaterialPreferences>) => {
  const before = errorRevision; const state = root!.set(preferences);
  if (remembering && before === errorRevision) query('#storage-status').textContent = 'The browser accepted the updated settings under our own key.';
  else if (!remembering) query('#storage-status').textContent = 'In-memory choices updated. No storage write was requested.';
  render(); return state;
};
const clear = () => {
  cancelTour();
  const wasRemembering = remembering, current = root!.state.preferences;
  if (!wasRemembering) {
    try {
      storage = storage ?? window.localStorage; remembering = true; attachRoot(current, storage);
    } catch { remembering = false; attachRoot(current); error(undefined, 'remove'); render(); return false; }
  }
  const cleared = root!.clearPersistence();
  const after = root!.state.preferences;
  if (!wasRemembering) { remembering = false; attachRoot(after); }
  if (cleared) query('#storage-status').textContent = 'Only this demo’s settings key was removed. Unrelated browser data and session notes were left alone.';
  render(); return cleared;
};
const requestMotion = async (kind: 'enter' | 'confirm') => {
  const request = ++motionRevision, epoch = motionEpoch; motionRequests++;
  const completed = await (kind === 'enter' ? motion.enter() : motion.feedback('confirm'));
  if (destroyed || epoch !== motionEpoch) return completed;
  if (completed) motionSettled++; else motionCancelled++;
  if (destroyed || request !== motionRevision) return completed;
  query('#motion-result').textContent = !completed ? 'Previous heading presentation cancelled; native content remains usable.' : rootState?.reducedMotion ? 'Heading settled under the reduced-motion policy.' : typeof query('#note-heading').animate !== 'function' ? 'Heading settled without WAAPI; native content remains usable.' : 'Finite heading transition settled. No idle animation loop.';
  return completed;
};
const select = (id: NoteId, animate = true) => {
  const note = notes.find(item => item.id === id); if (!note) throw new TypeError('Unknown original listening note');
  drafts.set(noteId, query<HTMLTextAreaElement>('#note-editor').value); noteId = id;
  query('#note-number').textContent = 'NOTE 0' + (notes.indexOf(note) + 1) + ' / ' + note.id.toUpperCase();
  query('#note-title').textContent = note.title; query('#note-description').textContent = note.description; query<HTMLTextAreaElement>('#note-editor').value = drafts.get(id)!;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-note]')) button.setAttribute('aria-pressed', String(button.dataset.note === id));
  query('#note-status').textContent = 'This note is held in the page’s memory. Nothing is uploaded or persisted.';
  if (animate) void requestMotion('enter'); render();
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-note]')) button.addEventListener('click', () => { cancelTour(); select(button.dataset.note as NoteId); });
query('#next-note').addEventListener('click', () => { cancelTour(); select(notes[(notes.findIndex(note => note.id === noteId) + 1) % notes.length].id); });
query('#save-note').addEventListener('click', () => {
  cancelTour(); drafts.set(noteId, query<HTMLTextAreaElement>('#note-editor').value); saved.add(noteId); query('#note-status').textContent = 'Kept in this session. This note is not in the settings storage key.';
  void requestMotion('confirm'); render();
});
for (const key of ['theme', 'motion', 'transparency'] as const) query<HTMLSelectElement>('#' + key).addEventListener('change', event => {
  cancelTour(); set({ [key]: (event.target as HTMLSelectElement).value });
});
query<HTMLInputElement>('#remember').addEventListener('change', event => { remember((event.target as HTMLInputElement).checked); });
query('#clear-settings').addEventListener('click', clear);
query<HTMLSelectElement>('#nested-theme').addEventListener('change', event => { cancelTour(); nested.set({ theme: (event.target as HTMLSelectElement).value as GlassMaterialPreferences['theme'] }); });
query<HTMLSelectElement>('#nested-surface').addEventListener('change', event => { cancelTour(); nested.set({ transparency: (event.target as HTMLSelectElement).value as GlassMaterialPreferences['transparency'] }); });
query('#reset-system').addEventListener('click', () => {
  cancelTour(); const before = errorRevision; root!.reset();
  if (remembering && before === errorRevision) query('#storage-status').textContent = 'The browser accepted system choices under this demo’s settings key.';
  else if (!remembering) query('#storage-status').textContent = 'System choices restored in memory. Any previously saved key was left alone.';
  render();
});
const preset = (id: Preset) => {
  if (!['light', 'dark', 'quiet'].includes(id)) throw new TypeError('Unknown preference fixture');
  memory(); set({ theme: id === 'light' ? 'light' : 'dark', motion: id === 'quiet' ? 'reduce' : 'system', transparency: id === 'quiet' ? 'solid' : 'system' });
  nested.set({ theme: 'dark', motion: 'system', transparency: 'system' });
};
const reset = () => {
  cancelTour(); memory(); root!.reset(); nested.set({ theme: 'dark', motion: 'system', transparency: 'system' });
  motionRevision++; motionEpoch++; motion.cancel(); motionRequests = 0; motionSettled = 0; motionCancelled = 0; saved.clear();
  for (const note of notes) drafts.set(note.id, note.text); noteId = 'arrival'; query<HTMLTextAreaElement>('#note-editor').value = drafts.get(noteId)!; select('arrival', false);
  query('#motion-result').textContent = 'One finite heading transition, on a deliberate action.';
  query('#storage-status').textContent = 'Reset in memory. Previously saved settings and unrelated browser data were not cleared.';
  render();
};
const tour = () => {
  cancelTour(); memory(); const version = tourVersion;
  const step = (value: Preset, id: NoteId) => {
    if (version !== tourVersion) return;
    preset(value); tourStep = value; select(id); query('#tour').textContent = 'Tour / ' + value;
  };
  step('light', 'arrival');
  return new Promise<boolean>(resolve => {
    tourFinish = resolve;
    tourTimers.push(window.setTimeout(() => step('dark', 'overlap'), 3200), window.setTimeout(() => step('quiet', 'afterimage'), 6400), window.setTimeout(() => {
      if (version !== tourVersion) return;
      tourStep = null; tourTimers = []; tourFinish = undefined; query('#tour').textContent = 'Short tour ↗'; resolve(true);
    }, 9600));
  });
};
query('#tour').addEventListener('click', () => { void tour(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelTour(); motionRevision++; motion.cancel(); } });
window.addEventListener('pagehide', () => { cancelTour(); destroyed = true; motionRevision++; motionEpoch++; motion.destroy(); root?.destroy(); nested.destroy(); }, { once: true });
Object.assign(window, { __preferencesDemo: {
  preset(id: Preset) { cancelTour(); preset(id); }, reset, tour, remember, clear,
  set(value: Partial<GlassMaterialPreferences>) { cancelTour(); return set(value); },
  nested(value: Partial<GlassMaterialPreferences>) { cancelTour(); return nested.set(value); },
  note(id: NoteId) { cancelTour(); select(id); },
  refresh() { root?.refresh(); nested.refresh(); render(); },
  get state() { return { requested: rootState?.preferences, effective: rootState, nested: nestedState, system: snapshot(), remembering, storageKey, lastReason, failures: [...failures], noteId, savedNotes: [...saved], motion: { requests: motionRequests, settled: motionSettled, cancelled: motionCancelled, waapiAvailable: typeof query('#note-heading').animate === 'function' }, tourStep, local: { appearance: query('#local-card').getAttribute('data-lg-appearance'), fill: query('#local-card').style.getPropertyValue('--lg-fill-rgb'), solidFill: query('#local-card').style.getPropertyValue('--lg-solid-fill'), ink: query('#local-card').style.getPropertyValue('--lg-ink') } }; },
} });
render();
