import { mountGlassCommandPalette } from '../../src/command-palette.js';
import type { GlassCommand } from '../../src/command-palette.js';
import '../../src/command-palette.css';
import './style.css';

type View = 'storyboard' | 'sound' | 'delivery';
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let view: View = 'storyboard', theme: 'paper' | 'dusk' = 'paper', reviewed = false, localPending = false, revision = 0;
const guide = get<HTMLDialogElement>('guide');
const status = (text: string) => { get('status').textContent = text; };
function setView(next: View) {
  view = next;
  for (const value of ['storyboard', 'sound', 'delivery'] as const) get(`view-${value}`).hidden = value !== next;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === next));
  status(`${next === 'storyboard' ? 'Storyboard' : next === 'sound' ? 'Sound notes' : 'Delivery notes'} opened locally`);
}
function setTheme(next: 'paper' | 'dusk') { theme = next; document.documentElement.dataset.theme = theme; status(`${theme === 'paper' ? 'Paper' : 'Dusk'} theme applied`); }
function setReviewed(next: boolean) {
  reviewed = next; get('review-mark').textContent = reviewed ? 'REVIEW / READY FOR THE NEXT PASS' : 'REVIEW / STILL OPEN';
  get('review-button').textContent = reviewed ? 'Reopen review' : 'Mark reviewed'; status(reviewed ? 'Scene review marked complete locally' : 'Scene review reopened');
}
async function handoff(reject = false) {
  if (localPending) return;
  const activeRevision = revision; localPending = true; setView('delivery'); get<HTMLButtonElement>('preview-button').disabled = true;
  get('delivery-status').textContent = 'Local rehearsal pending · no upload requested'; status('Running one local handoff callback');
  try {
    await new Promise<void>(resolve => window.setTimeout(resolve, 1000));
    if (activeRevision !== revision) return;
    if (reject) { get('delivery-status').textContent = 'Demo rejection · no file was sent. Retry the successful preview.'; status('Explicit local rejection rehearsal'); throw new Error('Local rehearsal rejection'); }
    get('delivery-status').textContent = 'Local preview prepared · nothing was uploaded'; status('Local handoff preview prepared');
  } finally { if (activeRevision === revision) { localPending = false; get<HTMLButtonElement>('preview-button').disabled = false; } }
}
function help() { palette.close(); guide.showModal(); }
const commands = (): GlassCommand[] => [
  { id: 'storyboard', label: 'Open storyboard', description: 'Early light, shot notes and scene review', group: 'Go somewhere', keywords: ['scene', 'window', 'film'], onSelect: () => setView('storyboard') },
  { id: 'sound', label: 'Open sound notes', description: 'Rail rhythm, window air and one small detail', group: 'Go somewhere', keywords: ['audio', 'music', 'waveform'], onSelect: () => setView('sound') },
  { id: 'delivery', label: 'Open delivery notes', description: 'Prepare a clear local handoff', group: 'Go somewhere', keywords: ['export', 'handoff'], onSelect: () => setView('delivery') },
  { id: 'theme', label: 'Switch paper / dusk theme', description: 'Change the working atmosphere', group: 'Make a change', keywords: ['color', 'appearance'], onSelect: () => setTheme(theme === 'paper' ? 'dusk' : 'paper') },
  { id: 'review', label: 'Toggle scene review', description: 'Mark reviewed or reopen the first scene', group: 'Make a change', keywords: ['complete', 'approved'], onSelect: () => { setView('storyboard'); setReviewed(!reviewed); } },
  { id: 'handoff', label: 'Prepare local handoff preview', description: 'A one-second local callback, no upload', group: 'Rehearse safely', keywords: ['preview', 'pending'], onSelect: () => handoff() },
  { id: 'rejection', label: 'Test a rejected handoff', description: 'Explicit error rehearsal; retry stays available', group: 'Rehearse safely', keywords: ['error', 'failure', 'rejection'], onSelect: () => handoff(true) },
  { id: 'publish', label: 'Publish the film', description: 'Unavailable: this demo has no production service', group: 'Rehearse safely', disabled: true },
  { id: 'help', label: 'Open keyboard guide', description: 'Native help dialog, keys and boundaries', group: 'A little help', keywords: ['help', 'shortcuts'], onSelect: help },
];
const palette = mountGlassCommandPalette(get('palette-host'), { commands: commands(), label: 'Cutroom commands', shortcut: true, maxResults: 20 });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => setView(button.dataset.view as View));
get('open-commands').addEventListener('click', () => palette.open()); get('keyboard-guide').addEventListener('click', help);
get('close-guide').addEventListener('click', () => guide.close());
get('review-button').addEventListener('click', () => setReviewed(!reviewed));
get('preview-button').addEventListener('click', () => { void handoff().catch(() => status('Local handoff rehearsal failed')); });
get('quiet').addEventListener('change', () => document.documentElement.classList.toggle('quiet', get<HTMLInputElement>('quiet').checked));
get('solid').addEventListener('change', () => document.documentElement.classList.toggle('solid', get<HTMLInputElement>('solid').checked));

// Original deterministic waveform, not an audio asset or a claimed recording.
const waveform = get('wave-bars');
for (let index = 0; index < 110; index++) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const x = 24 + index * 6.1, envelope = .2 + .8 * Math.abs(Math.sin(index * .083));
  const height = 6 + Math.abs(Math.sin(index * 1.37) * Math.cos(index * .39)) * 85 * envelope;
  line.setAttribute('d', `M${x.toFixed(1)} ${(116 - height).toFixed(1)}v${(height * 2).toFixed(1)}`); waveform.append(line);
}
declare global { interface Window { __commandsDemo: { reset(): void; open(): void; close(): void; query(text: string): void; select(id: string): boolean; setView(view: View): void; state(): { view: View; theme: string; reviewed: boolean; pending: boolean } } } }
window.__commandsDemo = {
  reset() {
    revision++; localPending = false; palette.close(); if (guide.open) guide.close(); palette.updateCommands(commands());
    setTheme('paper'); setView('storyboard'); setReviewed(false);
    document.documentElement.classList.remove('quiet', 'solid'); get<HTMLInputElement>('quiet').checked = get<HTMLInputElement>('solid').checked = false;
    get<HTMLButtonElement>('preview-button').disabled = false; get('delivery-status').textContent = 'Nothing has been sent'; status('Local notebook · no account or upload');
  },
  open: () => palette.open(), close: () => palette.close(),
  query(text) { const input = document.querySelector<HTMLInputElement>('.lg-command-palette input')!; input.value = text.slice(0, 1000); input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); },
  select(id) { const row = [...document.querySelectorAll<HTMLButtonElement>('.lg-command-palette [role=option]')].find(row => row.dataset.commandId === id); if (!row || row.disabled) return false; row.click(); return true; },
  setView, state: () => ({ view, theme, reviewed, pending: localPending }),
};
window.addEventListener('pagehide', () => { revision++; palette.destroy(); }, { once: true });
