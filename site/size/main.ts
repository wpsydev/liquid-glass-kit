import { attachGlassAutoSize } from '../../src/auto-size.js';
import type { GlassAutoSizeResult } from '../../src/auto-size.js';
import '../../src/material.css';
import './style.css';

type Kind = 'decision' | 'question';
type Filter = 'all' | Kind;
type Preset = 'compact' | 'expanded' | 'retarget' | 'narrow' | 'focused' | 'quiet';
type Note = { id: number; text: string; kind: Kind };
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const frame = get('note-frame'), content = get('note-content'), column = get('notebook-column');
const draft = get<HTMLInputElement>('draft'), editor = get<HTMLFormElement>('editor'), context = get<HTMLDetailsElement>('context');
const quiet = get<HTMLInputElement>('quiet'), solid = get<HTMLInputElement>('solid');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const samples: { text: string; kind: Kind }[] = [
  { text: 'Keep a little space between what you can read and what you can press.', kind: 'decision' },
  { text: 'What happens to the draft when the surrounding panel changes?', kind: 'question' },
  { text: 'Make the next action visible before adding another animation.', kind: 'decision' },
  { text: 'The reader’s position is part of the interface. Treat it with care.', kind: 'decision' },
  { text: 'Can the same idea still work on a narrow screen with larger text?', kind: 'question' },
  { text: 'Reduce motion without removing the actual information.', kind: 'decision' },
  { text: 'Label the control first. A placeholder is a hint, not its name.', kind: 'decision' },
  { text: 'Leave this open for the next review: what should remain unchanged?', kind: 'question' },
];
let notes: Note[] = [], nextId = 0, filter: Filter = 'all', narrow = false, updates = 0, touring = false, epoch = 0, session = 0, disposed = false;
let timers: number[] = [], outcomes: GlassAutoSizeResult[] = [], renderedKey = '';
let controller: ReturnType<typeof attachGlassAutoSize>;
const status = (message: string) => { get('status').textContent = message; };
function renderNotes() {
  const visible = notes.filter(note => filter === 'all' || note.kind === filter);
  const key = JSON.stringify(visible);
  if (key !== renderedKey) {
  const rows = visible.map(note => {
    const item = document.createElement('li'); item.className = 'note'; item.dataset.noteId = String(note.id);
    const number = document.createElement('span'); number.className = 'note-number'; number.textContent = String(note.id + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div'), text = document.createElement('p'), kind = document.createElement('span');
    text.textContent = note.text; kind.className = 'note-kind'; kind.textContent = note.kind === 'decision' ? 'DECISION' : 'OPEN QUESTION';
    copy.append(text, kind); item.append(number, copy); return item;
  });
  get('notes').replaceChildren(...rows); renderedKey = key;
  }
  get('empty').hidden = visible.length > 0;
  get('note-count').textContent = filter === 'all' ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : `${visible.length} shown / ${notes.length} notes`;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  get<HTMLButtonElement>('add').disabled = notes.length >= 8; get<HTMLButtonElement>('remove').disabled = notes.length === 0;
  column.dataset.narrow = String(narrow); get('width').setAttribute('aria-pressed', String(narrow));
  get('expand').setAttribute('aria-expanded', String(context.open)); get('expand').textContent = context.open ? 'Collapse context' : 'Expand context';
  get('edit').setAttribute('aria-expanded', String(!editor.hidden)); get('edit').textContent = editor.hidden ? 'Show draft' : 'Hide draft';
}
function settings() { controller.update({ duration: 320, reducedMotion: quiet.checked }); frame.dataset.lgSolid = String(solid.checked); }
function refresh(action: string) {
  const token = ++epoch, currentSession = session; updates++; get('last-action').textContent = action; get('update-count').textContent = String(updates);
  const pending = controller.refresh(); get('outcome').textContent = frame.hasAttribute('data-lg-auto-size-active') ? 'Finite size transition' : 'Natural sizing';
  void pending.then(result => {
    if (disposed || currentSession !== session) return;
    outcomes.push(result); if (outcomes.length > 24) outcomes.shift();
    if (token !== epoch) return;
    get('outcome').textContent = result.reason;
    status(result.reason === 'focus' ? `${action}. Focus inside snaps the frame; the same draft and caret remain in place.`
      : result.reason === 'reduced-motion' ? `${action}. Quiet sizing keeps the actual content, immediately.`
      : `${action}. ${result.completed ? 'Content is in natural flow.' : `Size transition ${result.reason}; host content stays committed.`}`);
  });
}
function addSample(action = 'Added a real note') {
  if (notes.length >= 8) { status('This local study is bounded to eight notes. Remove one before adding.'); return; }
  const sample = samples[nextId % samples.length]; notes.push({ id: nextId++, ...sample }); renderNotes(); refresh(action);
}
function moveFocusBeforeHiding() { if (editor.contains(document.activeElement)) get('edit').focus({ preventScroll: true }); }
function baseNotes(count: number) { notes = samples.slice(0, count).map((sample, id) => ({ id, ...sample })); nextId = count; filter = 'all'; }
function widthChanged() {
  renderNotes(); get('last-action').textContent = narrow ? 'Narrow column requested' : 'Full column restored';
  if (typeof window.ResizeObserver === 'function') status('Real width changed. The content observer snaps responsive reflow; no text scaling.');
  else {
    controller.update({ duration: 0, reducedMotion: true }); refresh('Immediate width fallback'); settings();
    status('Real width changed. Native content observation is unavailable; explicit refresh keeps sizing immediate.');
  }
}
function cancel() { for (const timer of timers) clearTimeout(timer); timers = []; touring = false; get('tour').textContent = 'Play 10s tour'; }
function applyPreset(name: Preset) {
  if (!['compact', 'expanded', 'retarget', 'narrow', 'focused', 'quiet'].includes(name)) throw new TypeError('Unknown Session Notes preset');
  if (name === 'narrow') {
    narrow = true; widthChanged(); return;
  }
  if (name === 'focused') {
    baseNotes(2); filter = 'all'; narrow = false; context.open = false; editor.hidden = false; renderNotes();
    draft.focus({ preventScroll: true }); draft.setSelectionRange(5, 10);
    addSample('Added a note beside the focused draft'); return;
  }
  moveFocusBeforeHiding(); editor.hidden = true; narrow = false; context.open = name === 'expanded' || name === 'quiet';
  baseNotes(name === 'expanded' || name === 'quiet' ? 4 : 2);
  if (name === 'quiet') { quiet.checked = true; settings(); }
  renderNotes(); refresh(name === 'compact' ? 'Compact notes restored' : name === 'retarget' ? 'Rapid update started' : 'Context and four notes committed');
  if (name === 'retarget') {
    timers.push(window.setTimeout(() => addSample('First rapid note committed'), 80));
    timers.push(window.setTimeout(() => addSample('Second rapid note committed'), 160));
  }
}
function preset(name: Preset) { cancel(); applyPreset(name); }
function reset() {
  cancel(); epoch++; session++; controller.cancel(); moveFocusBeforeHiding(); editor.hidden = true; context.open = false;
  baseNotes(2); narrow = false; quiet.checked = false; solid.checked = false; updates = 0; outcomes = []; settings(); renderNotes();
  controller.update({ duration: 0, reducedMotion: true }); void controller.refresh(); settings();
  get('last-action').textContent = 'Initial notebook'; get('outcome').textContent = 'Natural rest'; get('update-count').textContent = '0';
  status('Add a real note, change the filter, or open the context.');
}
function tour() {
  cancel(); touring = true; get('tour').textContent = 'Stop tour'; applyPreset('compact');
  for (const [time, name] of [[1800, 'expanded'], [3900, 'retarget'], [5700, 'narrow'], [7800, 'focused']] as const) timers.push(window.setTimeout(() => applyPreset(name), time));
  timers.push(window.setTimeout(() => { cancel(); status('Tour complete. The focused draft is still the original input, with its selection preserved.'); }, 10000));
}
baseNotes(2); renderNotes();
controller = attachGlassAutoSize(frame, content, { duration: 320 });
if (typeof window.ResizeObserver !== 'function') get('width').nextElementSibling!.textContent = 'Width changes use explicit immediate refresh here. Native content observation is unavailable.';
get('add').addEventListener('click', () => { cancel(); addSample(); });
get('remove').addEventListener('click', () => { cancel(); if (!notes.length) return; notes.pop(); renderNotes(); refresh('Removed the latest note'); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) button.addEventListener('click', () => { cancel(); filter = button.dataset.filter as Filter; renderNotes(); refresh(`Filter changed to ${filter === 'all' ? 'all notes' : filter === 'decision' ? 'decisions' : 'open questions'}`); });
get('expand').addEventListener('click', () => { cancel(); context.open = !context.open; renderNotes(); refresh(context.open ? 'Session context expanded' : 'Session context collapsed'); });
context.addEventListener('toggle', () => { if (disposed) return; renderNotes(); if (document.activeElement === context.querySelector('summary')) { cancel(); refresh(context.open ? 'Native context expanded' : 'Native context collapsed'); } });
get('edit').addEventListener('click', () => { cancel(); moveFocusBeforeHiding(); editor.hidden = !editor.hidden; renderNotes(); refresh(editor.hidden ? 'Draft hidden' : 'Draft shown'); });
editor.addEventListener('submit', event => {
  event.preventDefault(); cancel(); if (!editor.reportValidity()) return;
  if (notes.length >= 8) { status('This local study is bounded to eight notes. Remove one before adding.'); return; }
  const value = draft.value.trim(); if (!value) { draft.setCustomValidity('Enter a meaningful note.'); draft.reportValidity(); return; }
  notes.push({ id: nextId++, text: value, kind: 'decision' }); renderNotes(); refresh('Draft copied into the local notes');
});
draft.addEventListener('input', () => draft.setCustomValidity(''));
get('width').addEventListener('click', () => { cancel(); narrow = !narrow; widthChanged(); });
quiet.addEventListener('change', () => { cancel(); settings(); status(quiet.checked ? 'Quiet sizing selected. Actual notes remain visible.' : 'Finite content-size transitions restored.'); });
solid.addEventListener('change', () => settings());
get('tour').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
reduced.addEventListener('change', () => { if (reduced.matches) status('System reduced motion keeps size updates immediate.'); });
document.addEventListener('visibilitychange', () => { if (!disposed && document.hidden) cancel(); });
window.addEventListener('pagehide', () => { cancel(); disposed = true; epoch++; controller.destroy(); });
window.addEventListener('pageshow', () => { if (disposed && frame.isConnected && frame.ownerDocument.defaultView) { disposed = false; controller = attachGlassAutoSize(frame, content, { duration: 320, reducedMotion: quiet.checked }); } });
declare global {
  interface Window { __sizeDemo: { tour(): void; reset(): void; cancel(): void; preset(name: Preset): void; state(): { totalNotes: number; visibleNotes: number; filter: Filter; contextOpen: boolean; editorShown: boolean; draft: string; selectionStart: number | null; selectionEnd: number | null; focused: boolean; narrow: boolean; quiet: boolean; solid: boolean; touring: boolean; updates: number; outcomes: GlassAutoSizeResult[]; inlineHeight: string; inlineBlockSize: string; active: boolean; naturalContentHeight: number } } }
}
window.__sizeDemo = { tour, reset, cancel, preset, state: () => ({ totalNotes: notes.length, visibleNotes: notes.filter(note => filter === 'all' || note.kind === filter).length,
  filter, contextOpen: context.open, editorShown: !editor.hidden, draft: draft.value, selectionStart: draft.selectionStart, selectionEnd: draft.selectionEnd,
  focused: document.activeElement === draft, narrow, quiet: quiet.checked || reduced.matches, solid: solid.checked, touring, updates, outcomes: [...outcomes],
  inlineHeight: frame.style.height, inlineBlockSize: frame.style.blockSize, active: frame.hasAttribute('data-lg-auto-size-active'), naturalContentHeight: content.getBoundingClientRect().height,
}) };
