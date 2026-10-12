import { attachGlassFollow } from '../../src/follow.js';
import type { GlassFollowState } from '../../src/follow.js';
import '../../src/material.css';
import './style.css';

type Kind = 'observation' | 'decision';
type ReviewRecord = { id: number; author: string; text: string; kind: Kind; extended: boolean };
type Preset = 'following' | 'older' | 'unread' | 'latest' | 'growth' | 'quiet';
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const scroller = get('scrollport'), content = get('log-content'), list = get('records');
const draft = get<HTMLInputElement>('draft'), composer = get<HTMLFormElement>('composer');
const quiet = get<HTMLInputElement>('quiet'), solid = get<HTMLInputElement>('solid');
const samples: { author: string; text: string; kind: Kind }[] = [
  { author: 'Mira', text: 'Start with the work. A review should make the next step easier to see.', kind: 'observation' },
  { author: 'Theo', text: 'Keep the labels close to the controls. There is no need to make someone remember them.', kind: 'decision' },
  { author: 'June', text: 'The narrow layout feels calmer when the transcript gets its own scrolling space.', kind: 'observation' },
  { author: 'Mira', text: 'Use a real button to return to the latest entry. It should say what it does.', kind: 'decision' },
  { author: 'Theo', text: 'When someone selects a sentence, they are telling us they are reading. Leave that sentence where it is.', kind: 'observation' },
  { author: 'June', text: 'New entries can wait. An unread count is more useful than pulling the reader away.', kind: 'decision' },
  { author: 'Mira', text: 'A growing paragraph is still one record. Let the host declare the actual new-record count.', kind: 'observation' },
  { author: 'Theo', text: 'Keep the glass around the controls, and keep the long-form text on a quiet surface.', kind: 'decision' },
  { author: 'June', text: 'For keyboard users, returning to the end should not steal focus from the button or the draft.', kind: 'observation' },
  { author: 'Mira', text: 'Give people a place to stop. A useful feed does not have to keep moving.', kind: 'decision' },
  { author: 'Theo', text: 'First new fixture: the current reader position remains part of the review.', kind: 'observation' },
  { author: 'June', text: 'Second new fixture: a small, explicit unread count can hold the next thought.', kind: 'observation' },
  { author: 'Mira', text: 'Third new fixture: the latest entry will still be here when you choose to return.', kind: 'decision' },
];
const extension = ' Addendum: this text was extended in place. Its existing node stays the same, and the host declared zero new records.';
let records: ReviewRecord[] = [], nextId = 0, touring = false, disposed = false;
let timers: number[] = [], declaredAppends = 0, growthUpdates = 0, stage = 'reading';
let controller: ReturnType<typeof attachGlassFollow>;
let replacingSession = false;
const status = (text: string) => { get('status').textContent = text; };
function updateState(state: GlassFollowState) {
  if (!state.visible && touring && !replacingSession) cancel();
  get('follow-state').dataset.following = String(state.following);
  get('follow-label').textContent = state.following ? 'Following latest' : 'Reader in control';
  get('reader-state').textContent = !state.visible ? 'Visibility paused' : state.following ? 'Following' : 'Paused';
  get('unread').textContent = `${state.unread} unread`; get('unread').hidden = state.unread === 0;
  get('unread-count').textContent = String(state.unread);
  get('pause').textContent = state.following ? 'Pause following' : 'Follow latest';
}
function updateRecords() {
  get('record-count').textContent = `${records.length} records`; get('actual-count').textContent = String(records.length);
  const full = records.length >= 32;
  get<HTMLButtonElement>('append').disabled = full; get<HTMLButtonElement>('append-three').disabled = records.length > 29; get<HTMLButtonElement>('send').disabled = full;
  get<HTMLButtonElement>('grow').disabled = !records.length || records[records.length - 1].extended;
}
function makeRow(record: ReviewRecord) {
  const item = document.createElement('li'); item.className = 'record'; item.dataset.recordId = String(record.id); item.dataset.kind = record.kind;
  const mark = document.createElement('span'); mark.className = 'record-mark'; mark.textContent = record.author[0]; mark.setAttribute('aria-hidden', 'true');
  const body = document.createElement('div'), head = document.createElement('div'); head.className = 'record-head';
  const author = document.createElement('strong'), time = document.createElement('time'), kind = document.createElement('span');
  author.textContent = record.author; time.textContent = `09:${String(10 + record.id).padStart(2, '0')}`;
  time.dateTime = `2026-10-12T09:${String(10 + record.id).padStart(2, '0')}:00Z`;
  kind.textContent = record.kind === 'decision' ? 'DECISION' : 'REVIEW';
  const copy = document.createElement('p'); copy.textContent = record.text; copy.dataset.recordText = String(record.id);
  head.append(author, time, kind); body.append(head, copy); item.append(mark, body); return item;
}
function fixture() { const sample = samples[nextId % samples.length]; return { id: nextId++, ...sample, extended: false }; }
function append(count: number, authoredText?: string) {
  if (disposed) return;
  if (records.length + count > 32) { status('This local review is bounded to 32 records. Reset before adding more.'); return; }
  const added = Array.from({ length: count }, () => authoredText === undefined ? fixture() : ({ id: nextId++, author: 'You', text: authoredText, kind: 'observation' as const, extended: false }));
  records.push(...added); list.append(...added.map(makeRow)); declaredAppends += count; updateRecords();
  controller.notifyAppend(count); updateState(controller.state);
  get('last-action').textContent = `${count} actual ${count === 1 ? 'record' : 'records'} appended`;
  status(controller.state.following ? `${count} real local ${count === 1 ? 'record' : 'records'} appended. Following keeps the latest visible.` : `${count} real local ${count === 1 ? 'record' : 'records'} appended. Your reading position is preserved; return when you choose.`);
}
function grow() {
  const latest = records[records.length - 1]; if (disposed || !latest || latest.extended) return;
  latest.text += extension; latest.extended = true;
  list.querySelector<HTMLElement>(`[data-record-text="${latest.id}"]`)!.textContent = latest.text;
  growthUpdates++; updateRecords(); controller.notifyAppend(0); updateState(controller.state);
  get('last-action').textContent = 'Latest text grew · 0 new records'; status('Existing text extended in place. The host declared zero new records; unread counts stay honest.');
}
function cancel() { for (const timer of timers) clearTimeout(timer); timers = []; touring = false; get('tour').textContent = 'Play 10s tour'; }
function readOlder() {
  controller.pause(); scroller.scrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight - 280); controller.refresh();
  stage = 'older'; document.body.dataset.stage = stage; get('last-action').textContent = 'Reader moved to older records';
  status('Reading older records. Appends can wait; text remains selectable and focus stays where you left it.');
}
function jump() {
  const returned = controller.jumpLatest({ smooth: !quiet.checked }); updateState(controller.state);
  if (!returned) { status('The log is not currently visible. Following stays paused; no hidden content replay.'); return; }
  stage = 'latest'; document.body.dataset.stage = stage; get('last-action').textContent = 'Explicit Jump latest';
  status('Explicit return to the latest record. Keyboard focus stays on your control. Reduced motion makes this immediate.');
}
function base() {
  // Reset explicitly starts a different local session. Unread belongs to the old
  // coordinator; replace that ownership without a follow/jump or idle replay.
  replacingSession = true;
  try {
    controller.destroy(); records = []; nextId = 0; declaredAppends = 0; growthUpdates = 0;
    records = Array.from({ length: 10 }, fixture); list.replaceChildren(...records.map(makeRow)); updateRecords();
    scroller.scrollTop = 0;
    controller = attachGlassFollow(scroller, { content, initiallyFollowing: false, onChange: updateState });
  } finally { replacingSession = false; }
  stage = 'reading'; document.body.dataset.stage = stage;
  get('last-action').textContent = 'Loaded local fixtures'; updateState(controller.state);
}
function applyPreset(name: Preset) {
  if (!['following', 'older', 'unread', 'latest', 'growth', 'quiet'].includes(name)) throw new TypeError('Unknown Relay preset');
  if (name === 'following') { base(); controller.follow(); stage = 'following'; document.body.dataset.stage = stage; append(1); return; }
  if (name === 'older') { readOlder(); return; }
  if (name === 'unread') { if (controller.state.following) readOlder(); stage = 'unread'; document.body.dataset.stage = stage; append(3); return; }
  if (name === 'latest') { jump(); return; }
  if (name === 'growth') { grow(); return; }
  quiet.checked = true; controller.pause(); controller.follow(); updateState(controller.state); status('Quiet jumps selected. Returning is immediate; the same records and draft remain.');
}
function preset(name: Preset) { cancel(); applyPreset(name); }
function reset() { cancel(); base(); quiet.checked = false; solid.checked = false; composer.dataset.lgSolid = 'false'; document.body.dataset.solid = 'false'; status('Read freely. Start following or append a real local record.'); }
function tour() {
  cancel();
  if (!controller.state.visible) { status('Bring the review log into view before starting the finite local tour.'); return; }
  touring = true; get('tour').textContent = 'Stop tour'; applyPreset('following');
  for (const [time, name] of [[2500, 'older'], [4800, 'unread'], [7300, 'latest'], [9000, 'growth']] as const) timers.push(window.setTimeout(() => { if (!disposed && !document.hidden && controller.state.visible) applyPreset(name); else cancel(); }, time));
  timers.push(window.setTimeout(() => { cancel(); status('Tour complete. Four real fixtures were appended; text growth added no new records. Nothing continues in the background.'); }, 10000));
}
records = Array.from({ length: 10 }, fixture); list.append(...records.map(makeRow)); updateRecords();
controller = attachGlassFollow(scroller, { content, onChange: updateState }); updateState(controller.state);
get('append').addEventListener('click', () => { cancel(); append(1); }); get('append-three').addEventListener('click', () => { cancel(); append(3); });
get('grow').addEventListener('click', () => { cancel(); grow(); }); get('read-older').addEventListener('click', () => { cancel(); readOlder(); });
get('jump').addEventListener('click', () => { cancel(); jump(); });
get('pause').addEventListener('click', () => { cancel(); if (controller.state.following) { controller.pause(); get('last-action').textContent = 'Explicit reader pause'; status('Following paused. New records will wait for an explicit return.'); } else jump(); updateState(controller.state); });
composer.addEventListener('submit', event => {
  event.preventDefault(); cancel(); if (!composer.reportValidity()) return;
  const text = draft.value.trim(); if (!text) { draft.setCustomValidity('Enter a meaningful note.'); draft.reportValidity(); return; }
  append(1, text);
});
draft.addEventListener('input', () => draft.setCustomValidity(''));
quiet.addEventListener('change', () => { cancel(); controller.pause(); updateState(controller.state); status(quiet.checked ? 'Quiet jumps selected. Following is paused; the next explicit jump is immediate.' : 'Native explicit jumps restored. Automatic following stays instant.'); });
solid.addEventListener('change', () => { document.body.dataset.solid = String(solid.checked); composer.dataset.lgSolid = String(solid.checked); });
get('tour').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
scroller.addEventListener('wheel', cancel, { passive: true });
scroller.addEventListener('pointerdown', cancel, { passive: true });
scroller.addEventListener('keydown', cancel);
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && ((selection.anchorNode && content.contains(selection.anchorNode)) || (selection.focusNode && content.contains(selection.focusNode)))) cancel();
});
window.addEventListener('pagehide', () => { disposed = true; cancel(); controller.destroy(); });
window.addEventListener('pageshow', () => { if (!disposed) return; disposed = false; controller = attachGlassFollow(scroller, { content, initiallyFollowing: false, onChange: updateState }); updateState(controller.state); });
declare global { interface Window { __followDemo: { tour: typeof tour; reset: typeof reset; cancel: typeof cancel; preset: typeof preset; state: () => object } } }
window.__followDemo = { tour, reset, cancel, preset, state: () => ({ ...controller.state, records: records.length, declaredAppends, growthUpdates, touring, stage, top: scroller.scrollTop, draft: draft.value, quiet: quiet.checked, solid: solid.checked, recordTexts: records.map(record => record.text) }) };
