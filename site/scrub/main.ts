import { attachGlassNumberInput } from '../../src/number-input.js';
import type { GlassNumberInput, GlassNumberInputState } from '../../src/number-input.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Field = 'radius' | 'blur' | 'gap';
type Preset = 'ready' | 'fraction' | 'blank' | 'outside' | 'custom' | 'any';
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const fields: Field[] = ['radius', 'blur', 'gap'], inputs = Object.fromEntries(fields.map(field => [field, query<HTMLInputElement>('#' + field)])) as Record<Field, HTMLInputElement>;
const controllers = {} as Record<Field, GlassNumberInput>, form = query<HTMLFormElement>('#editor-form');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const object = { id: 'surface-01', radius: 20, blur: 12, gap: 12 };
const bounds = { radius: { min: '0', max: '48', step: '2', value: '20' }, blur: { min: '0', max: '32', step: '0.5', value: '12' }, gap: { min: '0', max: '48', step: '0.25', value: '12' } };
const names: Record<Field, string> = { radius: 'Corner radius', blur: 'Backdrop blur', gap: 'Content spacing' };
const customMessage = 'This local reading preset requires at least eight pixels of content spacing.';
let gapRule = false, quiet = false, solid = false, modifiers = false, normalize = false, revision = 0, draftNotifications = 0, commitNotifications = 0, cancelNotifications = 0, lastSource = 'None', destroyed = false;
let snapshot: { submitter: string | null; values: [string, string][]; object: typeof object } | null = null;
let tourVersion = 0, tourTimers: number[] = [], tourFinish: ((complete: boolean) => void) | undefined, tourStep = '';
const text = (element: HTMLElement, value: string) => { if (element.textContent !== value) element.textContent = value; };
function ownedRule() {
  const input = inputs.gap;
  if (gapRule && (!Number.isFinite(input.valueAsNumber) || input.valueAsNumber < 8)) { if (!input.validity.customError || input.validationMessage === customMessage) input.setCustomValidity(customMessage); }
  else if (input.validity.customError && input.validationMessage === customMessage) input.setCustomValidity('');
}
function applyObject() {
  const props = getGlassProps({ appearance: 'light', radius: object.radius, blur: object.blur, corner: 'continuous', opacity: .94, reducedTransparency: solid });
  const card = query('#preview-card'); card.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) card.style.setProperty(key, String(value));
  for (const [key, value] of Object.entries(props)) if (key.startsWith('data-')) card.setAttribute(key, String(value));
  card.style.setProperty('--lg-fill-rgb', '252 252 234'); card.style.setProperty('--lg-solid-fill', '#fcfcea'); card.style.setProperty('--lg-ink', '#28392f');
  query('.preview-items').style.gap = object.gap + 'px'; text(query('#object-revision'), 'Revision ' + revision); text(query('#object-json'), JSON.stringify(object, null, 2));
}
function render() {
  if (destroyed) return;
  for (const field of fields) {
    const input = inputs[field], state = controllers[field]?.state; if (!state) continue;
    const shell = query('[data-field="' + field + '"]'), error = query('#' + field + '-error'), invalid = !state.valid;
    shell.dataset.invalid = String(invalid); input.setAttribute('aria-invalid', String(invalid));
    error.hidden = !invalid; text(error, invalid ? input.validationMessage || 'Check this native number draft.' : '');
    input.setAttribute('aria-describedby', field + '-help' + (invalid ? ' ' + field + '-error' : ''));
    query<HTMLButtonElement>('#' + field + '-up').disabled = !state.canStep; query<HTMLButtonElement>('#' + field + '-down').disabled = !state.canStep;
    query<HTMLButtonElement>('#' + field + '-handle').disabled = !state.canScrub || state.validity.customError;
    text(query('#' + field + '-draft'), 'Draft / ' + (state.empty ? 'blank' : state.raw)); text(query('#' + field + '-committed'), 'Object / ' + object[field]);
    const numeric = state.value, point = numeric === null ? 0 : Math.max(0, Math.min(100, (numeric - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100));
    shell.querySelector<HTMLElement>('.ruler')!.style.setProperty('--draft-position', point + '%');
  }
  text(query('#gap-help'), inputs.gap.step === 'any' ? 'Zero to forty-eight pixels. Native step any keeps arbitrary decimals; helper stepping and scrubbing are unavailable.' : gapRule ? 'Zero to forty-eight pixels in quarter-pixel steps, with an explicit host rule requiring at least eight.' : 'Zero to forty-eight pixels, in native quarter-pixel steps.');
  query<HTMLButtonElement>('#clear-rule').disabled = !gapRule; query<HTMLButtonElement>('#cancel-scrub').disabled = !fields.some(field => controllers[field].state.scrubbing);
  text(query('#readback-source'), lastSource); text(query('#readback-counts'), draftNotifications + ' / ' + commitNotifications + ' / ' + cancelNotifications);
  text(query('#readback-scrub'), fields.filter(field => controllers[field].state.scrubbing).join(', ') || 'None');
  text(query('#readback-precision'), (controllers.gap.state.precisionSupported ? 'Supported' : 'Native-only precision') + ' / ' + (controllers.gap.state.canStep ? 'available' : 'unavailable'));
  text(query('#readback-recorded'), snapshot ? 'Actual FormData / ' + snapshot.values.length + ' controls' : 'Not recorded');
  text(query('#snapshot-label'), snapshot ? 'Native FormData and submitter, sampled when the valid local form submitted.' : 'No settings snapshot recorded yet.');
  query('#snapshot-json').hidden = snapshot === null; text(query('#snapshot-json'), snapshot ? JSON.stringify(snapshot, null, 2) : '');
  text(query('#policy-note'), normalize ? 'Explicit opt-in: native change now clamps/snaps finite drafts. Typing remains untouched and blank/bad-input drafts stay native.' : 'Default: typing and native change keep drafts untouched. Apply draft explicitly clamps and snaps a finite value; blank or incomplete native input stays blank.');
  document.body.dataset.quiet = String(quiet || motion.matches); query('#solid').setAttribute('aria-pressed', String(solid)); text(query('#tour-status'), tourStep ? 'Finite tour / ' + tourStep : 'No automatic editing');
}
function accepted(field: Field, _reported: GlassNumberInputState, source: string) {
  if (destroyed) return;
  commitNotifications++; ownedRule(); const actual = controllers[field].state; lastSource = field + ' / commit / ' + source;
  if (actual.valid && actual.value !== null) { if (object[field] !== actual.value) { object[field] = actual.value; revision++; applyObject(); } text(query('#host-status'), names[field] + ' committed to the local object. The native field remains available for editing.'); }
  else text(query('#host-status'), names[field] + ' did not update the object. Its native draft or host constraint still needs a correction.');
  render();
}
for (const field of fields) {
  controllers[field] = attachGlassNumberInput(inputs[field], {
    handle: query<HTMLButtonElement>('#' + field + '-handle'), incrementButton: query<HTMLButtonElement>('#' + field + '-up'), decrementButton: query<HTMLButtonElement>('#' + field + '-down'),
    onInput(_state, source) { if (destroyed) return; draftNotifications++; ownedRule(); lastSource = field + ' / draft / ' + source; render(); },
    onCommit(state, source) { accepted(field, state, source); },
    onCancel(_state, reason) { if (destroyed) return; cancelNotifications++; lastSource = field + ' / cancel / ' + reason; text(query('#host-status'), names[field] + ' scrub ended without committing its discarded draft. Changed host values or constraints retain ownership.'); render(); },
  });
  query('#' + field + '-apply').addEventListener('click', () => { cancelTour(); controllers[field].commit(); });
}
function draft(field: Field, raw: string, change = false) {
  if (!fields.includes(field) || typeof raw !== 'string' || raw.length > 64 || destroyed) return false;
  inputs[field].value = raw; inputs[field].dispatchEvent(new Event('input', { bubbles: true })); if (change) inputs[field].dispatchEvent(new Event('change', { bubbles: true })); render(); return true;
}
function settings(next: { modifiers?: boolean; normalize?: boolean }) {
  if (!next || typeof next !== 'object' || Object.keys(next).some(key => !['modifiers', 'normalize'].includes(key) || typeof next[key as keyof typeof next] !== 'boolean')) return false;
  modifiers = next.modifiers ?? modifiers; normalize = next.normalize ?? normalize; query<HTMLInputElement>('#modifiers').checked = modifiers; query<HTMLInputElement>('#normalize').checked = normalize;
  for (const field of fields) controllers[field].update({ modifierKeys: modifiers, normalizeOnChange: normalize }); render(); return true;
}
function preferences(next: { quiet?: boolean; solid?: boolean }) {
  if (!next || typeof next !== 'object' || Object.keys(next).some(key => !['quiet', 'solid'].includes(key) || typeof next[key as keyof typeof next] !== 'boolean')) return false;
  quiet = next.quiet ?? quiet; solid = next.solid ?? solid; query<HTMLInputElement>('#quiet').checked = quiet; applyObject(); render(); return true;
}
function cancel() { let changed = false; for (const field of fields) changed = controllers[field].cancel() || changed; render(); return changed; }
function cancelTour() { tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = []; const finish = tourFinish; tourFinish = undefined; tourStep = ''; finish?.(false); render(); }
function reset() {
  cancelTour(); cancel(); gapRule = false;
  for (const field of fields) { const input = inputs[field], rules = bounds[field]; input.min = rules.min; input.max = rules.max; input.step = rules.step; input.value = rules.value; input.readOnly = input.disabled = false; input.setCustomValidity(''); controllers[field].refresh(); }
  Object.assign(object, { radius: 20, blur: 12, gap: 12 }); revision = draftNotifications = commitNotifications = cancelNotifications = 0; lastSource = 'None'; snapshot = null;
  settings({ modifiers: false, normalize: false }); preferences({ quiet: false, solid: false }); text(query('#fixture-label'), 'Native constraints'); text(query('#host-status'), 'The preview shows the committed local object. Invalid drafts keep its previous value.'); render();
}
function preset(value: Preset) {
  if (!['ready', 'fraction', 'blank', 'outside', 'custom', 'any'].includes(value) || destroyed) return false; reset();
  if (value === 'fraction') { draft('blur', '12.25', true); text(query('#fixture-label'), 'Native half-pixel mismatch'); }
  else if (value === 'blank') { draft('radius', '', true); text(query('#fixture-label'), 'Required blank stays blank'); }
  else if (value === 'outside') { draft('radius', '150', true); text(query('#fixture-label'), 'Native range overflow'); }
  else if (value === 'custom') { gapRule = true; draft('gap', '4', true); text(query('#fixture-label'), 'Explicit local gap rule'); }
  else if (value === 'any') { inputs.gap.step = 'any'; controllers.gap.refresh(); draft('gap', '10.3'); text(query('#fixture-label'), 'Native step any'); }
  render(); return true;
}
function tour(): Promise<boolean> {
  reset(); const version = ++tourVersion; tourStep = 'native tap / actual radius'; controllers.radius.step(2); render();
  return new Promise(resolve => {
    tourFinish = resolve;
    const at = (delay: number, step: () => void) => { const timer = window.setTimeout(() => { tourTimers = tourTimers.filter(value => value !== timer); if (!destroyed && version === tourVersion) step(); }, delay); tourTimers.push(timer); };
    at(1600, () => { draft('blur', '12.25', true); tourStep = 'fractional draft / untouched'; render(); });
    at(2300, () => { controllers.blur.commit(); tourStep = 'explicit snap / native half-pixel grid'; render(); });
    at(3500, () => { draft('radius', '150', true); tourStep = 'above maximum / object retained'; render(); });
    at(4300, () => { controllers.radius.commit(); tourStep = 'explicit clamp / forty-eight'; render(); });
    at(5500, () => { draft('radius', '', true); controllers.radius.commit(); tourStep = 'required blank / never invented zero'; render(); });
    at(6400, () => { draft('radius', '32'); controllers.radius.commit(); tourStep = 'native recovery / valid object'; render(); });
    at(7400, () => { gapRule = true; draft('gap', '4', true); tourStep = 'host custom constraint / no false commit'; render(); });
    at(8200, () => { draft('gap', '8'); controllers.gap.commit(); tourStep = 'actual host-rule correction'; render(); });
    at(9100, () => { gapRule = false; ownedRule(); inputs.gap.step = 'any'; controllers.gap.refresh(); draft('gap', '10.3'); controllers.gap.commit(); tourStep = 'step any / honest decimal parameter'; render(); });
    at(10500, () => { tourStep = ''; tourFinish = undefined; render(); resolve(true); });
  });
}
form.addEventListener('submit', event => {
  event.preventDefault(); cancelTour(); for (const field of fields) controllers[field].commit();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = new FormData(form, event.submitter); snapshot = { submitter: event.submitter?.getAttribute('value') ?? null, values: [...data].map(([name, value]) => [name, String(value)]), object: { ...object } };
  text(query('#host-status'), 'These valid native settings were recorded in this page session. Nothing was sent or published.'); render();
});
form.addEventListener('invalid', () => { text(query('#host-status'), 'Native validation blocked the settings record. Correct the draft or explicitly apply a finite value.'); render(); }, true);
for (const field of fields) {
  inputs[field].addEventListener('input', event => { if (event.isTrusted) cancelTour(); });
  for (const action of ['up', 'down', 'handle']) { const button = query('#' + field + '-' + action); button.addEventListener('pointerdown', cancelTour, { passive: true }); button.addEventListener('click', cancelTour); }
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.addEventListener('click', () => { preset(button.dataset.preset as Preset); });
query('#clear-rule').addEventListener('click', () => { cancelTour(); gapRule = false; ownedRule(); controllers.gap.refresh(); text(query('#host-status'), 'The owned local rule is cleared. Apply the current native draft when ready.'); render(); });
query('#cancel-scrub').addEventListener('click', () => { cancelTour(); cancel(); });
query<HTMLInputElement>('#modifiers').addEventListener('change', event => { cancelTour(); settings({ modifiers: (event.target as HTMLInputElement).checked }); }); query<HTMLInputElement>('#normalize').addEventListener('change', event => { cancelTour(); settings({ normalize: (event.target as HTMLInputElement).checked }); });
query<HTMLInputElement>('#quiet').addEventListener('change', event => { cancelTour(); preferences({ quiet: (event.target as HTMLInputElement).checked }); }); query('#solid').addEventListener('click', () => { cancelTour(); preferences({ solid: !solid }); }); query('#tour').addEventListener('click', () => { void tour(); }); query('#reset').addEventListener('click', reset);
const visibility = () => { if (document.hidden) cancelTour(); render(); }; document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', render);
const state = () => ({ object: { ...object }, revision, fields: Object.fromEntries(fields.map(field => [field, { ...controllers[field].state, validity: { ...controllers[field].state.validity }, min: inputs[field].min, max: inputs[field].max, step: inputs[field].step, validationMessage: inputs[field].validationMessage }])), snapshot: snapshot ? { ...snapshot, values: snapshot.values.map(value => [...value]), object: { ...snapshot.object } } : null, gapRule, modifiers, normalize, quiet: quiet || motion.matches, solid, draftNotifications, commitNotifications, cancelNotifications, lastSource, tourStep, pendingTourSteps: tourTimers.length, focus: document.activeElement?.id || document.activeElement?.tagName || null });
const demo = { preset, reset, tour, cancel: () => { cancelTour(); return cancel(); }, state, draft: (field: Field, raw: string) => { cancelTour(); return draft(field, raw); }, commit: (field: Field) => { cancelTour(); return fields.includes(field) ? controllers[field].commit() : null; }, step: (field: Field, count: number) => { cancelTour(); return fields.includes(field) ? controllers[field].step(count) : false; }, settings: (next: Parameters<typeof settings>[0]) => { cancelTour(); return settings(next); }, preferences: (next: Parameters<typeof preferences>[0]) => { cancelTour(); return preferences(next); } };
(window as Window & { __numberInputDemo?: typeof demo }).__numberInputDemo = demo;
applyObject(); render();
window.addEventListener('pagehide', () => { cancelTour(); destroyed = true; for (const field of fields) controllers[field].destroy(); motion.removeEventListener('change', render); document.removeEventListener('visibilitychange', visibility); }, { once: true });
