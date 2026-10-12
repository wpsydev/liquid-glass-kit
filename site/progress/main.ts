import { getGlassTaskProgressProps } from '../../src/task-progress.js';
import type { GlassTaskProgressOptions, GlassTaskState } from '../../src/task-progress.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Collection = 'interface' | 'writing';
type Unit = 'records' | 'bytes';
type Preset = 'idle' | 'unknown' | 'zero' | 'complete' | 'fraction' | 'error' | 'cancelled';
interface RecordNote { id: string; title: string; text: string }
interface Measurement { id: string; title: string; words: number; bytes: number }
interface Plan { unit?: Unit; prepareOnly?: boolean; failFourth?: boolean; delay?: number }
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const collections: Record<Collection, { title: string; notes: RecordNote[] }> = {
  interface: { title: 'Interface field notes', notes: [
    { id: 'A01', title: 'Keep the first step obvious', text: 'A useful opening screen offers one clear next action. Supporting choices can wait until someone needs them.' },
    { id: 'A02', title: 'Put the source beside the answer', text: 'A summary becomes easier to inspect when its original source remains close by. Give the reader room to decide what to trust.' },
    { id: 'A03', title: 'Make cancellation specific', text: 'Say which operation stopped and which results remain. A stopped task is not necessarily a rolled-back task.' },
    { id: 'A04', title: 'A label before an icon', text: 'Use words that explain what a control does. An icon can support a familiar action without replacing the visible label.' },
    { id: 'A05', title: 'An error worth reading', text: 'A small error should describe the problem and offer a concrete correction. Keep the field value and let the person carry on.' },
    { id: 'A06', title: 'Leave room for longer text', text: 'A résumé, a translated heading, or a precise explanation may need more space. Avoid a fixed height that clips useful content.' },
    { id: 'A07', title: 'A quiet way to wait', text: 'Waiting can be clear without constant movement. Keep a useful task label and respect the person who chooses reduced motion.' },
    { id: 'A08', title: 'Name what you actually counted', text: 'Records, bytes, and elapsed time answer different questions. A percentage is only useful when its total and units are known.' },
  ] },
  writing: { title: 'Writing field notes', notes: [
    { id: 'B01', title: 'Keep one useful thought', text: 'A short note works best when it keeps a concrete observation rather than every detail of the original conversation.' },
    { id: 'B02', title: 'Write the thing you would reuse', text: 'Describe the choice, why it helped, and the condition where it might help again.' },
    { id: 'B03', title: 'A small amount of context', text: 'A good example names its situation. Readers need to know whether the observation came from a prototype, a shipped app, or a local study.' },
    { id: 'B04', title: 'Leave the uncertainty visible', text: 'A confident sentence should not cover a missing measurement. Separate what happened from what might explain it.' },
    { id: 'B05', title: 'Readable is useful', text: 'Plain words, shorter sentences, and enough line spacing let an idea reach more people.' },
    { id: 'B06', title: 'A café note for later', text: 'An accented word is still text. UTF-8 bytes and letter segments measure different properties of this original note.' },
  ] },
};
const collectionField = query<HTMLSelectElement>('#collection'), unitField = query<HTMLSelectElement>('#unit'), delayField = query<HTMLSelectElement>('#delay');
const prepareField = query<HTMLInputElement>('#prepare-only'), failField = query<HTMLInputElement>('#fail-fourth');
const bar = query<HTMLProgressElement>('#inspection-progress'), statusNode = query('#task-status'), frame = query('#task-frame'), region = query('#results-region'), ring = query('#waiting-ring');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const encoder = new TextEncoder();
let selected = new Set(collections.interface.notes.map(note => note.id)), results: Measurement[] = [], failedId: string | null = null;
let state: GlassTaskState = 'idle', mode: 'indeterminate' | 'determinate' = 'indeterminate', unit: Unit = 'records', value = 0, max = 0, checkedBytes = 0;
let status = 'Choose a local collection and explicitly start an inspection.', stage = 'No run started', snapshot: { collection: Collection; title: string; ids: string[]; prepareOnly: boolean } | null = null;
let animated = false, quiet = false, announce = true, solid = false, inView = false, generation = 0, completedRuns = 0, destroyed = false;
type Wait = { timer: number; finish(ready: boolean): void };
const waits = new Set<Wait>();
type Job = { generation: number; controller: AbortController; promise: Promise<GlassTaskState>; finish(outcome: GlassTaskState): void };
let current: Job | undefined;
let tourVersion = 0, tourTimers: number[] = [], fixtureTimer: number | undefined, tourFinish: ((complete: boolean) => void) | undefined, tourStep = '';
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; };
function attributes(element: HTMLElement, props: object, keys: readonly string[]) {
  const values = props as Record<string, unknown>;
  if (typeof values.className === 'string') element.classList.add(...values.className.split(' '));
  for (const key of keys) { const value = values[key]; if (value === undefined) { if (element.hasAttribute(key)) element.removeAttribute(key); } else if (element.getAttribute(key) !== String(value)) element.setAttribute(key, String(value)); }
}
function text(element: HTMLElement, value: string) { if (element.textContent !== value) element.textContent = value; }
function props(): GlassTaskProgressOptions {
  const base = { id: 'inspection-progress', label: 'Inspect selected local notes', statusId: 'task-status', statusText: status, state, describedBy: 'task-hint', statusAnnouncement: announce ? 'polite' as const : 'off' as const, animated: animated && !document.hidden && inView, reducedMotion: quiet || motion.matches };
  return mode === 'indeterminate' ? { ...base, mode } : { ...base, mode, value, max, valueText: unit === 'records' ? results.length + ' of ' + max + ' selected records checked' : checkedBytes + ' of ' + max + ' UTF-8 bytes checked' };
}
function render() {
  if (destroyed) return;
  const view = getGlassTaskProgressProps(props());
  attributes(frame, view.frame, ['data-lg-task-state', 'data-lg-task-mode', 'data-lg-task-motion']);
  attributes(bar, view.progress, ['value', 'max', 'aria-describedby', 'aria-valuetext']); bar.hidden = view.progress.hidden;
  const label = query<HTMLLabelElement>('#task-label'); label.classList.add(view.label.props.className); label.htmlFor = view.label.props.htmlFor!; text(label, view.label.text);
  attributes(statusNode, view.status.props, ['role', 'aria-atomic']); text(statusNode, view.status.text);
  attributes(region, view.region, ['aria-busy']); attributes(ring, view.decorative, ['aria-hidden']); ring.hidden = view.decorative.hidden;
  text(query('#state-pill'), state); query('#state-pill').dataset.state = state;
  text(query('#amount'), mode === 'indeterminate' ? 'No quantity reported' : value + ' / ' + max + (unit === 'records' ? ' records checked' : ' UTF-8 bytes checked'));
  text(query('#stage'), stage); text(query('#snapshot-receipt'), snapshot ? 'Current task snapshot: ' + snapshot.title + ' / ' + (snapshot.prepareOnly ? 'preparation only; no record batch' : snapshot.ids.length + ' selected records') + '. Changes apply to the next run.' : 'No task snapshot yet.');
  query('#run').setAttribute('aria-disabled', String(state === 'busy')); query<HTMLButtonElement>('#cancel').disabled = state !== 'busy'; query<HTMLButtonElement>('#retry').disabled = state !== 'error' && state !== 'cancelled';
  text(query('#result-count'), results.length + (results.length === 1 ? ' record checked' : ' records checked'));
  query('#results').replaceChildren(...results.map(result => { const row = node('tr'); const record = node('th'); record.scope = 'row'; record.append(node('span', result.id, 'result-id'), node('span', result.title, 'result-title')); row.append(record, node('td', String(result.words)), node('td', String(result.bytes))); return row; }));
  query('#empty-results').hidden = results.length > 0; text(query('#words-total'), results.reduce((sum, result) => sum + result.words, 0) + ' word segments'); text(query('#bytes-total'), checkedBytes + ' measured bytes');
  for (const entry of document.querySelectorAll<HTMLElement>('[data-record]')) {
    const id = entry.dataset.record!, checked = results.some(result => result.id === id), failed = failedId === id;
    entry.dataset.outcome = checked ? 'checked' : failed ? 'rejected' : 'ready'; text(entry.querySelector<HTMLElement>('.record-outcome')!, checked ? 'checked' : failed ? 'rejected fixture' : 'not processed');
  }
  text(query('#selection-count'), selected.size + ' selected ' + (selected.size === 1 ? 'record' : 'records')); text(query('#select-all'), selected.size === collections[collectionField.value as Collection].notes.length ? 'Clear selection' : 'Select all');
  document.body.dataset.quiet = String(quiet || motion.matches);
  text(query('#motion-policy'), motion.matches ? 'OS reduced motion is authoritative.' : quiet ? 'Quiet motion: the waiting ring stays static.' : animated ? 'One optional ring, only during a visible busy unknown stage.' : 'Waiting decoration is static.');
  text(query('#readback-native'), (bar.getAttribute('value') ?? 'omitted') + ' / ' + (bar.getAttribute('max') ?? 'omitted'));
  text(query('#readback-mode'), mode + ' / ' + state); text(query('#readback-busy'), region.getAttribute('aria-busy')!); text(query('#readback-status'), statusNode.closest('[aria-busy]') ? 'Yes' : 'No');
  text(query('#readback-waits'), String(waits.size)); text(query('#readback-runs'), generation + ' / ' + completedRuns); text(query('#tour-status'), tourStep ? 'Finite tour / ' + tourStep : 'No automatic work');
}
function material() {
  const material = getGlassProps({ appearance: 'light', radius: 16, blur: 12, corner: 'continuous', reducedTransparency: solid });
  const console = query('.task-console'); console.classList.add(material.className);
  for (const [key, value] of Object.entries(material.style)) console.style.setProperty(key, String(value));
  for (const [key, value] of Object.entries(material)) if (key.startsWith('data-')) console.setAttribute(key, String(value));
  console.style.setProperty('--lg-fill-rgb', '248 250 254'); console.style.setProperty('--lg-solid-fill', '#f8fafe'); console.style.setProperty('--lg-ink', '#23344d');
  query('#solid').setAttribute('aria-pressed', String(solid));
}
function preferences(next: { quiet?: boolean; animated?: boolean; announce?: boolean; solid?: boolean }) {
  if (!next || typeof next !== 'object' || Object.keys(next).some(key => !['quiet', 'animated', 'announce', 'solid'].includes(key) || typeof next[key as keyof typeof next] !== 'boolean')) return false;
  quiet = next.quiet ?? quiet; animated = next.animated ?? animated; announce = next.announce ?? announce; solid = next.solid ?? solid;
  query<HTMLInputElement>('#quiet').checked = quiet; query<HTMLInputElement>('#animated').checked = animated; query<HTMLInputElement>('#announce').checked = announce; material(); render(); return true;
}
function recordOptions() {
  query('#record-options').replaceChildren(...collections[collectionField.value as Collection].notes.map(note => {
    const label = node('label', '', 'record-choice'); label.dataset.record = note.id;
    const input = node('input'); input.type = 'checkbox'; input.name = 'record'; input.value = note.id; input.checked = selected.has(note.id);
    const description = node('span', '', 'record-description'); description.append(node('span', note.id, 'record-id'), node('strong', note.title), node('span', 'not processed', 'record-outcome'));
    label.append(input, description); input.addEventListener('change', () => { cancelTour(); cancel(); input.checked ? selected.add(note.id) : selected.delete(note.id); render(); }); return label;
  }));
}
function wait(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    let finished = false;
    const item: Wait = { timer: 0, finish(ready) { if (finished) return; finished = true; window.clearTimeout(item.timer); waits.delete(item); signal.removeEventListener('abort', aborted); render(); resolve(ready); } };
    const aborted = () => item.finish(false);
    if (signal.aborted) { resolve(false); return; }
    waits.add(item); signal.addEventListener('abort', aborted, { once: true }); item.timer = window.setTimeout(() => item.finish(true), milliseconds); render();
  });
}
function cancel() {
  if (fixtureTimer !== undefined) window.clearTimeout(fixtureTimer); fixtureTimer = undefined;
  if (!current) return false;
  const job = current; current = undefined; generation++; job.controller.abort(); job.finish('cancelled'); state = 'cancelled'; stage = 'Stopped by the host';
  status = mode === 'indeterminate' ? 'Preparation cancelled before any quantity was reported. No completion amount is invented.' : 'Inspection cancelled. ' + results.length + ' checked records and their measured bytes remain; the rest were not processed.';
  render(); return true;
}
async function execute(job: Job, notes: RecordNote[], plan: Required<Plan>) {
  const valid = () => !destroyed && current === job && generation === job.generation && !job.controller.signal.aborted;
  const finish = (outcome: GlassTaskState) => { if (current === job) current = undefined; job.finish(outcome); };
  try {
    if (!await wait(320, job.controller.signal) || !valid()) { finish('cancelled'); return; }
    if (plan.prepareOnly) { state = 'complete'; stage = 'Preparation complete'; status = 'The local preparation fixture completed. No record batch was requested and no quantity was reported.'; completedRuns++; finish('complete'); render(); return; }
    mode = 'determinate'; max = plan.unit === 'records' ? notes.length : notes.reduce((sum, note) => sum + encoder.encode(note.title + '\n' + note.text).byteLength, 0); value = 0;
    stage = 'Known total / zero checked'; status = 'The selected records are ready. Their total is now reported; no record has been checked yet.'; render();
    for (const [index, note] of notes.entries()) {
      if (!await wait(plan.delay, job.controller.signal) || !valid()) { finish('cancelled'); return; }
      if (plan.failFourth && index === 3) { failedId = note.id; state = 'error'; stage = 'Explicit rejection fixture'; status = 'The local fixture rejected ' + note.id + ' before processing it. ' + results.length + ' actual results remain. Clear the rejection choice and explicitly try the current plan.'; finish('error'); render(); return; }
      const source = note.title + '\n' + note.text, measured: Measurement = { id: note.id, title: note.title, words: source.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0, bytes: encoder.encode(source).byteLength };
      if (!valid()) { finish('cancelled'); return; }
      results.push(measured); checkedBytes += measured.bytes; value = plan.unit === 'records' ? results.length : checkedBytes;
      stage = 'Checking actual text';
      if (results.length === Math.ceil(notes.length / 2)) status = 'A meaningful midpoint: ' + results.length + ' of ' + notes.length + ' local records have been checked.';
      render();
    }
    if (!valid()) { finish('cancelled'); return; }
    state = 'complete'; stage = 'All selected records checked'; status = 'Inspection complete. ' + results.length + ' original local records produced ' + checkedBytes + ' UTF-8 bytes and ' + results.reduce((sum, result) => sum + result.words, 0) + ' letter/number word segments.'; completedRuns++; finish('complete'); render();
  } catch {
    if (valid()) { state = 'error'; stage = 'Local processing error'; status = 'The local text operation failed. Already measured records remain; no completion amount is invented.'; finish('error'); render(); } else finish('cancelled');
  }
}
function run(input: Plan = {}): Promise<GlassTaskState | false> {
  if (destroyed || !input || typeof input !== 'object' || Object.keys(input).some(key => !['unit', 'prepareOnly', 'failFourth', 'delay'].includes(key))) return Promise.resolve(false);
  const plan: Required<Plan> = { unit: input.unit ?? unitField.value as Unit, prepareOnly: input.prepareOnly ?? prepareField.checked, failFourth: input.failFourth ?? failField.checked, delay: input.delay ?? Number(delayField.value) };
  if (!['records', 'bytes'].includes(plan.unit) || typeof plan.prepareOnly !== 'boolean' || typeof plan.failFourth !== 'boolean' || !Number.isInteger(plan.delay) || plan.delay < 80 || plan.delay > 500) return Promise.resolve(false);
  if (current) return current.promise;
  const key = collectionField.value as Collection, notes = collections[key].notes.filter(note => selected.has(note.id)).map(note => ({ ...note }));
  if (!notes.length && !plan.prepareOnly) { state = 'error'; mode = 'indeterminate'; status = 'No local records were selected. Choose a record and explicitly try the current plan.'; stage = 'No task started'; render(); return Promise.resolve('error'); }
  unitField.value = plan.unit; prepareField.checked = plan.prepareOnly; failField.checked = plan.failFourth;
  delayField.querySelector('[data-custom-delay]')?.remove(); if (![...delayField.options].some(option => Number(option.value) === plan.delay)) { const option = node('option', plan.delay + ' ms / record'); option.value = String(plan.delay); option.dataset.customDelay = 'true'; delayField.append(option); } delayField.value = String(plan.delay);
  results = []; checkedBytes = value = max = 0; failedId = null; mode = 'indeterminate'; unit = plan.unit; state = 'busy'; stage = 'Local preparation fixture'; status = 'Preparing the local inspection for 320 ms. This fixture stage reports no quantity.'; snapshot = { collection: key, title: collections[key].title, ids: notes.map(note => note.id), prepareOnly: plan.prepareOnly };
  let resolve!: (outcome: GlassTaskState) => void, settled = false; const promise = new Promise<GlassTaskState>(done => { resolve = done; });
  const job: Job = { generation: ++generation, controller: new AbortController(), promise, finish(outcome) { if (!settled) { settled = true; resolve(outcome); } } }; current = job;
  void execute(job, notes, plan); render(); return promise;
}
function cancelTour() { tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = []; if (fixtureTimer !== undefined) window.clearTimeout(fixtureTimer); fixtureTimer = undefined; const finish = tourFinish; tourFinish = undefined; tourStep = ''; finish?.(false); render(); }
function reset() {
  cancelTour(); cancel(); for (const pending of [...waits]) pending.finish(false); generation++;
  results = []; failedId = null; checkedBytes = value = max = 0; mode = 'indeterminate'; state = 'idle'; unit = 'records'; snapshot = null; completedRuns = 0;
  stage = 'No run started'; status = 'Choose a local collection and explicitly start an inspection.'; collectionField.value = 'interface'; unitField.value = 'records'; delayField.value = '200'; prepareField.checked = failField.checked = false; selected = new Set(collections.interface.notes.map(note => note.id));
  preferences({ animated: false, quiet: false, announce: true, solid: false }); recordOptions(); render();
}
function preset(value: Preset) {
  if (!['idle', 'unknown', 'zero', 'complete', 'fraction', 'error', 'cancelled'].includes(value) || destroyed) return false;
  reset(); if (value === 'idle') return true; preferences({ animated: true });
  void run({ unit: value === 'fraction' || value === 'error' ? 'bytes' : 'records', prepareOnly: value === 'unknown', failFourth: value === 'error', delay: value === 'zero' || value === 'fraction' ? 400 : 120 });
  if (value === 'cancelled') fixtureTimer = window.setTimeout(() => { fixtureTimer = undefined; cancel(); }, 720);
  return true;
}
function tour(): Promise<boolean> {
  reset(); preferences({ animated: true }); const version = ++tourVersion; tourStep = 'unknown / no reported quantity'; void run({ unit: 'records', delay: 120 }); render();
  return new Promise(resolve => {
    tourFinish = resolve;
    const at = (delay: number, step: () => void) => { const timer = window.setTimeout(() => { tourTimers = tourTimers.filter(value => value !== timer); if (!destroyed && version === tourVersion) step(); }, delay); tourTimers.push(timer); };
    at(2400, () => { void run({ unit: 'bytes', failFourth: true, delay: 140 }); tourStep = 'real byte fractions / explicit rejection'; render(); });
    at(4300, () => { void run({ unit: 'records', failFourth: false, delay: 120 }); fixtureTimer = window.setTimeout(() => { fixtureTimer = undefined; cancel(); }, 720); tourStep = 'cancel / keep checked records'; render(); });
    at(6100, () => { void run({ prepareOnly: true, unit: 'records', failFourth: false }); tourStep = 'terminal unknown / no invented maximum'; render(); });
    at(7300, () => { preferences({ quiet: true, solid: true }); void run({ prepareOnly: false, unit: 'bytes', failFourth: false, delay: 140 }); tourStep = 'quiet / actual completed bytes'; render(); });
    at(10000, () => { tourStep = ''; tourFinish = undefined; render(); resolve(true); });
  });
}
query('#run').addEventListener('click', () => { cancelTour(); void run(); }); query('#retry').addEventListener('click', () => { cancelTour(); void run(); }); query('#cancel').addEventListener('click', () => { cancelTour(); cancel(); });
for (const field of [unitField, delayField, prepareField, failField]) field.addEventListener('change', () => { cancelTour(); cancel(); render(); });
collectionField.addEventListener('change', () => { cancelTour(); cancel(); selected = new Set(collections[collectionField.value as Collection].notes.map(note => note.id)); recordOptions(); render(); });
query('#select-all').addEventListener('click', () => { cancelTour(); cancel(); const notes = collections[collectionField.value as Collection].notes; selected = selected.size === notes.length ? new Set() : new Set(notes.map(note => note.id)); for (const input of query('#record-options').querySelectorAll<HTMLInputElement>('input')) input.checked = selected.has(input.value); render(); });
for (const key of ['animated', 'quiet', 'announce'] as const) query<HTMLInputElement>('#' + key).addEventListener('change', event => { cancelTour(); preferences({ [key]: (event.target as HTMLInputElement).checked }); });
query('#solid').addEventListener('click', () => { cancelTour(); preferences({ solid: !solid }); }); query('#tour').addEventListener('click', () => { void tour(); }); query('#reset').addEventListener('click', reset);
const visibilityChanged = () => { if (document.hidden) { cancelTour(); } render(); }; document.addEventListener('visibilitychange', visibilityChanged); motion.addEventListener('change', render);
const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => { for (const entry of entries) if (entry.target === frame) inView = entry.isIntersecting; render(); }) : undefined; observer?.observe(frame);
const readState = () => ({ state, mode, unit, value: mode === 'determinate' ? value : null, max: mode === 'determinate' ? max : null, results: results.map(result => ({ ...result })), checkedBytes, selected: [...selected], snapshot: snapshot ? { ...snapshot, ids: [...snapshot.ids] } : null, failedId, stage, status, generation, completedRuns, active: Boolean(current), pendingWaits: waits.size, pendingFixtureActions: fixtureTimer === undefined ? 0 : 1, native: { valueAttribute: bar.getAttribute('value'), maxAttribute: bar.getAttribute('max'), position: bar.position, hidden: bar.hidden, label: bar.labels?.[0]?.textContent, valueText: bar.getAttribute('aria-valuetext'), busy: region.getAttribute('aria-busy'), ringHidden: ring.hidden, motion: frame.getAttribute('data-lg-task-motion') }, preferences: { quiet, animated, announce, solid, systemReduced: motion.matches, inView }, tourStep, pendingTourSteps: tourTimers.length, focus: document.activeElement?.id || document.activeElement?.tagName || null });
const demo = { preset, run: (plan?: Plan) => { cancelTour(); return run(plan); }, cancel: () => { cancelTour(); return cancel(); }, retry: () => { cancelTour(); return run(); }, preferences, reset, state: readState, tour };
(window as Window & { __progressDemo?: typeof demo }).__progressDemo = demo;
recordOptions(); material(); render();
window.addEventListener('pagehide', () => { cancelTour(); cancel(); destroyed = true; for (const pending of [...waits]) pending.finish(false); observer?.disconnect(); motion.removeEventListener('change', render); document.removeEventListener('visibilitychange', visibilityChanged); }, { once: true });
