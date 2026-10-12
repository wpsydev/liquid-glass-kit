import { attachGlassBottomSheet } from '../../src/bottom-sheet.js';
import type { GlassBottomSheetOptions, GlassSheetDetent, GlassSheetDismissReason } from '../../src/bottom-sheet.js';
import '../../src/bottom-sheet.css';
import './style.css';

type Brief = { title: string; body: string; priority: 'explore' | 'next' | 'hold' };
const seeds: readonly Brief[] = [
  { title: 'A calmer first five minutes', body: 'Make the first visit feel considered. One clear next step, a useful empty state, and enough space for the person on the other side of the screen.', priority: 'next' },
  { title: 'A place for unfinished thoughts', body: 'Keep drafts close, but leave room to change your mind. Let a small editor grow with the task. Never throw away a thought without asking.', priority: 'explore' },
];
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const dialog = get<HTMLDialogElement>('editor'), form = get<HTMLFormElement>('brief-form'), title = get<HTMLInputElement>('note-title'), body = get<HTMLTextAreaElement>('note-body'), priority = get<HTMLSelectElement>('note-priority');
const decision = get('dismiss-decision'), motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let briefs = seeds.map(value => ({ ...value })), selected = 0, saves = 0, guardRequests = 0;
let guard: { resolve(value: boolean): void; reason: GlassSheetDismissReason } | null = null;
let timers: number[] = [], touring = false;
const read = (): Brief => ({ title: title.value, body: body.value, priority: priority.value as Brief['priority'] });
const dirty = () => { const value = read(), saved = briefs[selected]; return value.title !== saved.title || value.body !== saved.body || value.priority !== saved.priority; };
function fill(value: Brief) { title.value = value.title; body.value = value.body; priority.value = value.priority; updateForm(); }
function updateForm() { get('character-count').textContent = `${body.value.length} / 600 characters`; get('draft-state').textContent = dirty() ? 'Unsaved edits' : 'No unsaved edits'; get('draft-state').classList.toggle('dirty', dirty()); }
function dismissDecision(value: boolean) { const current = guard; guard = null; decision.hidden = true; current?.resolve(value); }
function ask(reason: GlassSheetDismissReason): Promise<boolean> | boolean {
  if (!dirty()) return true;
  guardRequests++; dismissDecision(false); decision.hidden = false;
  get('sheet-status').textContent = 'Your last saved note remains safe. Choose whether to keep editing or discard.';
  // The host decides focus once when its new decision appears. Viewport sizing
  // and detent changes never move focus or replace the authored form controls.
  get('keep-editing').focus({ preventScroll: true }); decision.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  return new Promise<boolean>(resolve => { guard = { resolve, reason }; });
}
function showHeight(value: number) {
  const name = Math.abs(value - .5) < .001 ? 'MEDIUM' : Math.abs(value - .68) < .001 ? 'WRITING' : 'LARGE';
  get('sheet-height').textContent = `${name} / ${Math.round(value * 100)}%`; get('detent-status').textContent = `${name} / ${Math.round(value * 100)}% DETENT`;
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-detent]')) button.setAttribute('aria-pressed', String(Math.abs(Number(button.dataset.detent) - value) < .001));
}
function options(): GlassBottomSheetOptions { return { detents: ['medium', .68, 'large'], label: 'Resize or close the local note editor', reducedMotion: get<HTMLInputElement>('quiet').checked, onDetent: showHeight, onDismissRequest: ask }; }
const sheet = attachGlassBottomSheet(dialog, options());
function renderNotes() {
  const rows = briefs.map((brief, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'note-card'; button.dataset.note = String(index); button.setAttribute('aria-label', `Edit ${brief.title}`);
    const number = document.createElement('span'); number.className = 'note-number'; number.textContent = `0${index + 1}`;
    const content = document.createElement('span'); content.className = 'note-copy';
    const tag = document.createElement('span'); tag.className = 'note-tag'; tag.textContent = brief.priority === 'next' ? 'UP NEXT' : brief.priority === 'hold' ? 'ON HOLD' : 'EXPLORE';
    const heading = document.createElement('strong'); heading.textContent = brief.title;
    const excerpt = document.createElement('span'); excerpt.className = 'note-excerpt'; excerpt.textContent = brief.body;
    const arrow = document.createElement('span'); arrow.className = 'note-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    content.append(tag, heading, excerpt); button.append(number, content, arrow); button.addEventListener('click', () => { cancel(); open(index); }); return button;
  });
  get('notes').replaceChildren(...rows);
}
function open(index = selected, detent: GlassSheetDetent = 'medium') {
  if (!Number.isInteger(index) || index < 0 || index >= briefs.length) return;
  if (dialog.open) { sheet.snapTo(detent); return; } // Never silently replace an open edited brief.
  dismissDecision(false); selected = index; fill(briefs[selected]);
  get('sheet-status').textContent = 'Tap or drag the grabber to change the resting height.';
  sheet.open(detent); showHeight(sheet.detent); dialog.scrollTop = 0;
}
function snap(detent: GlassSheetDetent) { sheet.snapTo(detent); showHeight(sheet.detent); }
function edit(text: string) { if (!dialog.open) return; body.value = String(text).slice(0, 600); body.dispatchEvent(new Event('input', { bubbles: true })); }
function requestClose() { return sheet.close(); }
function discard() {
  if (!guard) return;
  fill(briefs[selected]); get('status').textContent = 'Unsaved edits discarded by your choice. The last local save remains.';
  dismissDecision(true);
}
function keepEditing() { dismissDecision(false); get('sheet-status').textContent = 'Kept open. Your edits are still here.'; body.focus({ preventScroll: true }); }
function save(event: SubmitEvent) {
  event.preventDefault(); cancel(); if (!form.reportValidity()) return;
  briefs[selected] = read(); saves++; dismissDecision(false); updateForm();
  get('sheet-status').textContent = 'Saved in this page session. Nothing was uploaded.'; get('status').textContent = `“${briefs[selected].title}” saved in this session. No upload.`;
  // The invoking card remains connected for native dialog focus restoration.
  const row = get('notes').querySelector<HTMLElement>(`[data-note="${selected}"]`)!;
  row.querySelector('strong')!.textContent = briefs[selected].title; row.querySelector('.note-excerpt')!.textContent = briefs[selected].body;
  row.querySelector('.note-tag')!.textContent = briefs[selected].priority === 'next' ? 'UP NEXT' : briefs[selected].priority === 'hold' ? 'ON HOLD' : 'EXPLORE'; row.setAttribute('aria-label', `Edit ${briefs[selected].title}`);
}
function cancel() { timers.forEach(window.clearTimeout); timers = []; touring = false; get('tour').textContent = 'Play 11s study ↗'; }
function reset() {
  cancel(); dismissDecision(false); if (dialog.open) dialog.close(); // Explicit host reset, intentionally outside unsaved guards.
  briefs = seeds.map(value => ({ ...value })); selected = saves = guardRequests = 0;
  get<HTMLInputElement>('quiet').checked = get<HTMLInputElement>('solid').checked = false; document.documentElement.classList.remove('solid');
  sheet.update(options()); fill(briefs[0]); renderNotes(); showHeight(sheet.detent); get('detent-status').textContent = 'READY / THREE HEIGHTS'; get('status').textContent = 'Two starter briefs. Nothing leaves this page.';
}
function tour() {
  reset(); touring = true; get('tour').textContent = 'Stop study';
  const steps: [number, () => void][] = [[400, () => open(0, 'medium')], [1900, () => snap(.68)], [3200, () => snap('large')], [4400, () => edit('A clearer first five minutes. Lead with a useful next step, leave space around the important detail, and make the exit feel as thoughtful as the entrance.')], [6000, () => { void requestClose(); }], [9000, discard], [11200, cancel]];
  timers = steps.map(([delay, callback]) => window.setTimeout(callback, delay));
}
form.addEventListener('submit', save);
form.addEventListener('input', event => { if (event.isTrusted) cancel(); if (guard) dismissDecision(false); updateForm(); }); form.addEventListener('change', event => { if (event.isTrusted) cancel(); if (guard) dismissDecision(false); updateForm(); });
dialog.addEventListener('pointerdown', event => { if (event.isTrusted) cancel(); }); dialog.addEventListener('keydown', event => { if (event.isTrusted) cancel(); });
get('keep-editing').addEventListener('click', keepEditing); get('discard').addEventListener('click', discard);
for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-detent]')) button.addEventListener('click', () => { cancel(); snap(Number(button.dataset.detent)); });
get('quiet').addEventListener('change', () => { cancel(); dismissDecision(false); const value = sheet.detent; sheet.update(options()); snap(value); });
get('solid').addEventListener('change', () => document.documentElement.classList.toggle('solid', get<HTMLInputElement>('solid').checked));
get('reset').addEventListener('click', reset); get('tour').addEventListener('click', () => touring ? cancel() : tour());
dialog.addEventListener('close', () => { if (dialog.open) return; dismissDecision(false); get('detent-status').textContent = 'CLOSED / BACK TO YOUR NOTES'; });
dialog.addEventListener('lg-sheet-error', () => { get('sheet-status').textContent = 'The editor could not complete that action. Your local edits remain.'; });
window.addEventListener('pagehide', event => { cancel(); dismissDecision(false); if (!event.persisted) sheet.destroy(); });
declare global { interface Window { __sheetDemo: { reset(): void; open(index?: number, detent?: GlassSheetDetent): void; snap(detent: GlassSheetDetent): void; edit(text: string): void; requestClose(): Promise<boolean>; discard(): void; tour(): void; cancel(): void; state(): { open: boolean; selected: number; detent: number; dirty: boolean; awaitingDecision: boolean; guardRequests: number; saves: number; touring: boolean; systemReducedMotion: boolean; briefs: Brief[]; draft: Brief } } } }
window.__sheetDemo = { reset, open, snap, edit, requestClose, discard, tour, cancel, state: () => ({ open: dialog.open, selected, detent: sheet.detent, dirty: dirty(), awaitingDecision: Boolean(guard), guardRequests, saves, touring, systemReducedMotion: motion.matches, briefs: briefs.map(value => ({ ...value })), draft: read() }) };
renderNotes(); fill(briefs[0]); showHeight(sheet.detent); get('detent-status').textContent = 'READY / THREE HEIGHTS';
