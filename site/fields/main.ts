import { getGlassFieldProps } from '../../src/field.js';
import type { GlassFieldOptions, GlassFieldText } from '../../src/field.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type FieldId = 'note-title' | 'note-author' | 'note-collection' | 'note-source' | 'note-summary';
type Status = 'idle' | 'pending' | 'error' | 'recorded' | 'cancelled' | 'changed';
type Preset = 'blank' | 'native-error' | 'local-error' | 'ready' | 'research';
type Snapshot = { id: string; title: string; author: string; collection: string; source: string; summary: string };
type Decision = { ok: true } | { ok: false; field: FieldId; message: string } | { cancelled: true };
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const form = query<HTMLFormElement>('#note-form'), record = query<HTMLButtonElement>('#record'), cancelButton = query<HTMLButtonElement>('#cancel');
const source = query<HTMLInputElement>('#note-source'), collection = query<HTMLSelectElement>('#note-collection'), summary = query<HTMLTextAreaElement>('#note-summary');
const title = query<HTMLInputElement>('#note-title'), author = query<HTMLInputElement>('#note-author'), lateField = query<HTMLInputElement>('#late-result');
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const seed = (): Snapshot[] => [{ id: 'N01', title: 'A quiet first screen', author: 'Commonplace', collection: 'design', source: '', summary: 'Make the first action obvious. Let secondary choices wait until someone actually needs them.' }];
let notes = seed(), nextId = 2, state: Status = 'idle', message = 'Your note stays in this page. Nothing is sent.', errors = new Map<FieldId, string>();
let theme: 'light' | 'dark' = 'light', solid = false, quiet = false, revision = 0, submissions = 0, ignoredLateResults = 0, destroyed = false;
let snapshot: { values: [string, string][]; submitter: string | null; revision: number } | null = null;
type Job = { generation: number; controller: AbortController; timer: number; finish(decision: Decision): void };
const jobs = new Set<Job>(); let current: Job | undefined;
let tourVersion = 0, tourTimers: number[] = [], tourFinish: ((complete: boolean) => void) | undefined, tourStep = '';
const fields: Record<FieldId, { control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; label: string; description: string }> = {
  'note-title': { control: title, label: 'Note title', description: 'A short, specific thought. Five to eighty characters.' },
  'note-author': { control: author, label: 'Your display name', description: 'How this note will be attributed on the local desk.' },
  'note-collection': { control: collection, label: 'Collection', description: 'Research notes also need an HTTPS source.' },
  'note-source': { control: source, label: 'Source URL', description: 'Optional for reading and design. Required for research.' },
  'note-summary': { control: summary, label: 'The useful part', description: 'Twenty to six hundred characters. Keep your own interpretation.' },
};
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, content = '', className = '') => { const element = document.createElement(tag); element.textContent = content; if (className) element.className = className; return element; };
function attributes(element: HTMLElement, props: object, owned: readonly string[]) {
  const values = props as Record<string, unknown>;
  if (typeof values.className === 'string') element.classList.add(...values.className.split(' '));
  for (const key of owned) {
    const value = values[key]; if (value === undefined) element.removeAttribute(key); else element.setAttribute(key, String(value));
  }
}
function textNode(parent: HTMLElement, currentNode: HTMLElement | null, value: GlassFieldText | null): HTMLElement | null {
  if (!value) { currentNode?.remove(); return null; }
  const result = currentNode ?? node('p'); attributes(result, value.props, ['id', 'role', 'aria-atomic']); result.textContent = value.text;
  if (!result.parentElement) parent.append(result); return result;
}
function renderField(id: FieldId) {
  const field = fields[id], shell = query('[data-field="' + id + '"]'), group = shell.querySelector<HTMLElement>('.native-group'), text = shell.querySelector<HTMLElement>('.field-text')!;
  const config: GlassFieldOptions = {
    id, label: id === 'note-source' && source.required ? 'Source URL (required)' : field.label,
    description: id === 'note-summary' && collection.value === 'design' ? 'Describe one design choice you would reuse. Twenty to six hundred characters.' : field.description,
    ...(id === 'note-source' ? { describedBy: 'source-context' + (query('#source-guide').hidden ? '' : ' source-guide') } : {}),
    ...(errors.has(id) ? { error: errors.get(id)! } : {}), ...(state === 'pending' ? { busy: true } : {}),
    // Form-level outcomes announce deliberately. Keystrokes/inline nodes do not
    // install competing alerts; native invalid UI retains its own behavior.
    errorAnnouncement: 'off',
  };
  const props = getGlassFieldProps(config);
  attributes(shell, props.field, ['data-lg-field-invalid', 'data-lg-field-busy']);
  if (group) attributes(group, props.group, ['data-lg-field-invalid', 'data-lg-field-busy']);
  attributes(field.control, props.control, ['aria-describedby', 'aria-invalid', 'aria-busy']);
  const label = shell.querySelector<HTMLLabelElement>('label')!; label.classList.add(props.label.props.className); label.htmlFor = props.label.props.htmlFor!; label.textContent = props.label.text;
  textNode(text, text.querySelector('.lg-form-description'), props.description); textNode(text, text.querySelector('.lg-form-error'), props.error);
}
function render() {
  if (destroyed) return;
  source.required = collection.value === 'research';
  for (const id of Object.keys(fields) as FieldId[]) renderField(id);
  query('#summary-count').textContent = summary.value.length + ' / 600';
  form.setAttribute('aria-busy', String(state === 'pending')); record.setAttribute('aria-disabled', String(state === 'pending'));
  cancelButton.disabled = state !== 'pending'; query('#state-pill').textContent = state; query('#state-pill').dataset.state = state;
  query('#form-status').textContent = message;
  const errorSummary = query('#error-summary'); errorSummary.hidden = errors.size === 0;
  query('#error-links').replaceChildren(...[...errors].map(([id, text]) => { const entry = node('li'), link = node('a', fields[id].label + ': ' + text); link.href = '#' + id; entry.append(link); return entry; }));
  query('#note-count').textContent = notes.length + (notes.length === 1 ? ' note' : ' notes');
  query('#notes').replaceChildren(...notes.map(note => {
    const card = node('article', '', 'note-card'); card.dataset.note = note.id;
    const top = node('div', '', 'note-top'); top.append(node('span', note.id + ' / ' + note.collection), node('span', 'page session'));
    card.append(top, node('h3', note.title), node('p', note.summary), node('span', 'By ' + note.author, 'note-author'));
    // Source URLs are recorded as literal text, not fetched or activated.
    if (note.source) card.append(node('p', note.source, 'note-source')); return card;
  }));
  query('#snapshot-values').textContent = snapshot ? 'submitter: ' + (snapshot.submitter ?? 'none') + '\n' + snapshot.values.map(([name, value]) => name + ': ' + value).join('\n') : 'No new submission yet.';
  query('#readback-required').textContent = source.required ? 'Native required / research' : 'Optional / ' + collection.value;
  query('#readback-pending').textContent = jobs.size + ' local decisions'; query('#readback-stale').textContent = String(ignoredLateResults);
  query('#readback-description').textContent = source.getAttribute('aria-describedby') ?? 'None';
  query('#readback-motion').textContent = systemMotion.matches ? 'OS reduce (authoritative)' : quiet ? 'Explicit quiet' : 'Finite CSS state feedback';
  query('#tour-status').textContent = tourStep ? 'Finite tour / ' + tourStep : 'No automatic changes';
}
function preferences(next: { theme?: 'light' | 'dark'; solid?: boolean; quiet?: boolean }) {
  if (next.theme !== undefined && !['light', 'dark'].includes(next.theme)) return false;
  if (next.solid !== undefined && typeof next.solid !== 'boolean' || next.quiet !== undefined && typeof next.quiet !== 'boolean') return false;
  theme = next.theme ?? theme; solid = next.solid ?? solid; quiet = next.quiet ?? quiet;
  document.body.dataset.theme = theme; document.body.dataset.quiet = String(quiet || systemMotion.matches);
  query<HTMLSelectElement>('#theme').value = theme; query<HTMLInputElement>('#quiet').checked = quiet; query('#solid').setAttribute('aria-pressed', String(solid));
  const props = getGlassProps({ appearance: theme, reducedTransparency: solid, radius: 20, corner: 'continuous', blur: 12 });
  const paper = query('.form-paper'); paper.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) paper.style.setProperty(key, String(value));
  for (const [key, value] of Object.entries(props)) if (key.startsWith('data-')) paper.setAttribute(key, String(value));
  paper.style.setProperty('--lg-fill-rgb', theme === 'dark' ? '37 36 44' : '254 253 254'); paper.style.setProperty('--lg-solid-fill', theme === 'dark' ? '#25242c' : '#fefdfe'); paper.style.setProperty('--lg-ink', theme === 'dark' ? '#efedf4' : '#2f2938');
  render(); return true;
}
function help(open: boolean) {
  if (typeof open !== 'boolean') return false;
  query('#source-guide').hidden = !open; query('#source-help').setAttribute('aria-expanded', String(open)); renderField('note-source'); render(); return true;
}
function cancel(reason: 'cancelled' | 'changed' = 'cancelled') {
  revision++; const job = current; current = undefined;
  if (job) { job.controller.abort(); state = reason; message = reason === 'changed' ? 'The note changed. Its earlier local review was cancelled; submit the current version when ready.' : 'Review cancelled. Your fields are intact. A late result cannot add the old note.'; }
  render(); return Boolean(job);
}
function review(values: Omit<Snapshot, 'id'>, job: Job, ignoreAbort: boolean): Promise<Decision> {
  return new Promise(resolve => {
    let finished = false;
    const aborted = () => { if (!ignoreAbort) job.finish({ cancelled: true }); };
    job.finish = decision => { if (finished) return; finished = true; window.clearTimeout(job.timer); jobs.delete(job); job.controller.signal.removeEventListener('abort', aborted); resolve(decision); };
    job.controller.signal.addEventListener('abort', aborted, { once: true });
    job.timer = window.setTimeout(() => {
      let decision: Decision = { ok: true };
      if (values.title.trim().length < 5) decision = { ok: false, field: 'note-title', message: 'Use at least five meaningful characters for the title.' };
      else if (notes.some(note => note.title.trim().toLowerCase() === values.title.trim().toLowerCase())) decision = { ok: false, field: 'note-title', message: 'That title is already on this local desk. Give this thought a distinct title.' };
      else if (values.author.trim().length < 2) decision = { ok: false, field: 'note-author', message: 'Use at least two meaningful characters for your display name.' };
      else if (values.summary.trim().length < 20) decision = { ok: false, field: 'note-summary', message: 'Keep at least twenty meaningful characters in the note.' };
      else if (values.collection === 'research' && !/^https:\/\//i.test(values.source)) decision = { ok: false, field: 'note-source', message: 'Research notes need an HTTPS source. This local rule does not check whether the page exists.' };
      job.finish(decision);
    }, 600);
  });
}
form.addEventListener('submit', async event => {
  event.preventDefault(); if (state === 'pending' || destroyed) return;
  if (jobs.size >= 4) { state = 'error'; message = 'Four delayed local decisions are still finishing. Wait a moment, then explicitly submit again.'; render(); return; }
  const submitter = event.submitter, data = new FormData(form, submitter);
  snapshot = { values: [...data].map(([key, value]) => [key, String(value)]), submitter: submitter?.getAttribute('value') ?? null, revision: ++revision };
  const values = { title: String(data.get('title') ?? ''), author: String(data.get('author') ?? ''), collection: String(data.get('collection') ?? ''), source: String(data.get('source') ?? ''), summary: String(data.get('summary') ?? '') };
  const job: Job = { generation: revision, controller: new AbortController(), timer: 0, finish() {} }; current = job; jobs.add(job); submissions++;
  errors.clear(); state = 'pending'; message = 'Reviewing this exact local snapshot for 600 ms. You can edit or cancel.'; render();
  const decision = await review(values, job, lateField.checked);
  if ('cancelled' in decision) return;
  if (destroyed || job.controller.signal.aborted || job.generation !== revision || current !== job) { if (!destroyed) { ignoredLateResults++; render(); } return; }
  current = undefined;
  if (!decision.ok) {
    state = 'error'; errors.set(decision.field, decision.message); message = 'The local review needs one correction. ' + decision.message; render();
    // Focus only if the submitter still owns it. Typing cancels the job; other
    // focus changes are respected rather than overwritten by a late result.
    if (document.activeElement === submitter) fields[decision.field].control.focus(); return;
  }
  if (notes.length >= 12) { state = 'error'; message = 'This small session notebook holds twelve notes. Reset the demo to start a new notebook.'; render(); return; }
  const note = { ...values, id: 'N' + String(nextId++).padStart(2, '0') }; notes.unshift(note);
  state = 'recorded'; message = note.id + ' recorded on this local desk. Your field values stay available for editing.'; render();
});
let invalidFlush = false;
form.addEventListener('invalid', event => {
  const control = event.target as HTMLInputElement, id = control.id as FieldId;
  if (!Object.hasOwn(fields, id)) return;
  errors.set(id, control.validationMessage || 'Check this field.'); renderField(id);
  if (!invalidFlush) { const generation = revision; invalidFlush = true; queueMicrotask(() => { invalidFlush = false; if (destroyed || generation !== revision || errors.size === 0) return; state = 'error'; message = 'Check the highlighted native fields. The browser keeps its validation and first-invalid focus.'; render(); }); }
  // Do not preventDefault: native constraint validation remains the submit gate.
}, true);
function cancelTour() { tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = []; const finish = tourFinish; tourFinish = undefined; tourStep = ''; finish?.(false); render(); }
for (const [id, field] of Object.entries(fields) as [FieldId, typeof fields[FieldId]][]) field.control.addEventListener('input', () => {
  cancelTour(); if (current) cancel('changed'); else revision++;
  errors.delete(id); if (id === 'note-collection') { errors.delete('note-source'); }
  if (state === 'error' && errors.size === 0) { state = 'changed'; message = 'Correction kept. Explicitly submit when the note is ready.'; }
  render();
});
function submit() { if (destroyed) return false; form.requestSubmit(record); return true; }
function fillReady() {
  title.value = 'A better way to show sources'; author.value = 'Alex Rivers'; collection.value = 'design'; source.value = 'https://example.test/notes/source'; summary.value = 'Keep the original source beside the summary so readers can decide what to trust and inspect the details in their own time.';
  errors.clear(); state = 'idle'; message = 'A considered example is ready. Submit to record this actual local snapshot.'; render();
}
function resetWork() {
  cancel(); for (const job of [...jobs]) { job.controller.abort(); job.finish({ cancelled: true }); }
  revision++; form.reset(); notes = seed(); nextId = 2; snapshot = null; submissions = 0; ignoredLateResults = 0; errors.clear(); state = 'idle'; message = 'Your note stays in this page. Nothing is sent.'; help(false); render();
}
function reset() { cancelTour(); resetWork(); preferences({ theme: 'light', solid: false, quiet: false }); }
function preset(value: Preset) {
  if (!['blank', 'native-error', 'local-error', 'ready', 'research'].includes(value) || destroyed) return false;
  cancelTour(); cancel(); errors.clear(); state = 'idle';
  if (value === 'blank') { form.reset(); message = 'Start with a title and one useful thought.'; render(); return true; }
  fillReady();
  if (value === 'native-error') { source.value = 'not an address'; submit(); }
  else if (value === 'local-error') { title.value = 'A quiet first screen'; submit(); }
  else if (value === 'research') { collection.value = 'research'; source.value = ''; render(); message = 'Research now makes the actual native URL control required. Add an HTTPS source before recording.'; render(); }
  return true;
}
function correct() { cancelTour(); cancel(); title.value = 'A better way to show sources'; source.value = 'https://example.test/notes/source'; errors.delete('note-title'); errors.delete('note-source'); state = 'changed'; message = 'The correction is kept. The obsolete error nodes and description references are removed.'; render(); return true; }
function tour(): Promise<boolean> {
  reset(); fillReady(); title.value = 'A quiet first screen'; submit(); const epoch = ++tourVersion; tourStep = 'clear labels / local title check'; render();
  return new Promise(resolve => {
    tourFinish = resolve;
    const at = (delay: number, step: () => void) => { const timer = window.setTimeout(() => { tourTimers = tourTimers.filter(value => value !== timer); if (!destroyed && epoch === tourVersion) step(); }, delay); tourTimers.push(timer); };
    at(1800, () => { title.value = 'A better way to show sources'; errors.delete('note-title'); state = 'changed'; message = 'A distinct title is ready. The obsolete inline error is removed.'; help(true); tourStep = 'recover / useful source help'; render(); });
    at(3200, () => { collection.value = 'research'; source.value = 'https://example.test/notes/source'; render(); submit(); tourStep = 'native required / real snapshot'; render(); });
    at(5100, () => { preferences({ theme: 'dark', solid: true }); help(false); title.value = 'Keep useful errors close'; lateField.checked = true; submit(); tourStep = 'dark solid / finite review'; render(); });
    at(5400, () => { cancel(); tourStep = 'cancel / stale-result guard'; render(); });
    at(6800, () => { preferences({ theme: 'light', solid: false, quiet: true }); tourStep = 'late result ignored / quiet'; render(); });
    at(10000, () => { tourStep = ''; tourFinish = undefined; render(); resolve(true); });
  });
}
query('#source-help').addEventListener('click', () => { cancelTour(); help(query('#source-guide').hidden === true); });
cancelButton.addEventListener('click', () => { cancelTour(); cancel(); });
query<HTMLSelectElement>('#theme').addEventListener('change', event => { cancelTour(); preferences({ theme: (event.target as HTMLSelectElement).value as 'light' | 'dark' }); });
query('#solid').addEventListener('click', () => { cancelTour(); preferences({ solid: !solid }); }); query<HTMLInputElement>('#quiet').addEventListener('change', event => { cancelTour(); preferences({ quiet: (event.target as HTMLInputElement).checked }); });
lateField.addEventListener('change', cancelTour); record.addEventListener('click', cancelTour);
query('#example').addEventListener('click', () => { preset('ready'); }); query('#tour').addEventListener('click', () => { void tour(); }); query('#reset').addEventListener('click', reset);
const motionChanged = () => { document.body.dataset.quiet = String(quiet || systemMotion.matches); render(); }; systemMotion.addEventListener('change', motionChanged);
const readState = () => ({ status: state, message, notes: notes.map(note => ({ ...note })), errors: Object.fromEntries(errors), snapshot, revision, submissions, ignoredLateResults, pendingDecisions: jobs.size, sourceRequired: source.required, sourceValidity: source.validity.valid, sourceDescriptions: source.getAttribute('aria-describedby'), summaryCharacters: summary.value.length, helpOpen: !query('#source-guide').hidden, theme, solid, quiet, systemReduced: systemMotion.matches, tourStep, pendingTourSteps: tourTimers.length, focus: document.activeElement?.id || document.activeElement?.tagName || null });
const demo = { preset, submit, correct, help, preferences, cancel: () => { cancelTour(); return cancel(); }, reset, tour, state: readState };
(window as Window & { __fieldDemo?: typeof demo }).__fieldDemo = demo;
preferences({ theme: 'light', solid: false, quiet: false }); render();
window.addEventListener('pagehide', () => { cancelTour(); cancel(); destroyed = true; for (const job of [...jobs]) job.finish({ cancelled: true }); systemMotion.removeEventListener('change', motionChanged); }, { once: true });
