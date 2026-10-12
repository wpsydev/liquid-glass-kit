import { createGlassReversibleAction } from '../../src/reversible-action.js';
import type { GlassReversibleAction, GlassReversibleContext, GlassReversibleState } from '../../src/reversible-action.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Fixture = 'none' | 'undo-error' | 'commit-error' | 'late-apply';
type Preset = 'persistent' | 'timed' | 'committed' | 'error' | 'stale';
interface Item { id: string; rank: number; title: string; note: string; tag: string; art: string }
interface Receipt { item: Item; position: number; operation: string }
interface Archived { receipt: Receipt; state: 'provisional' | 'committed' | 'needs recovery'; cause: 'explicit' | 'deadline' | null }
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const seed = (): Item[] => [
  { id: 'K01', rank: 0, title: 'A quieter first screen', note: 'One obvious next step and room for supporting detail.', tag: 'Interface note', art: 'coral' },
  { id: 'K02', rank: 1, title: 'Keep the original source', note: 'Let a reader inspect the reference beside the summary.', tag: 'Reading note', art: 'green' },
  { id: 'K03', rank: 2, title: 'Useful little shortcuts', note: 'A small set of actions that stay understandable without a pointer.', tag: 'Workspace note', art: 'blue' },
  { id: 'K04', rank: 3, title: 'An error you can recover from', note: 'Say what happened, keep the input, and offer a way forward.', tag: 'Interaction note', art: 'sand' },
  { id: 'K05', rank: 4, title: 'A note worth keeping', note: 'Record the specific choice you would use again.', tag: 'Writing note', art: 'plum' },
  { id: 'K06', rank: 5, title: 'Room for a longer thought', note: 'Leave enough space for translated labels and considered explanations.', tag: 'Layout note', art: 'olive' },
];
const notice = query('#notice'), undoButton = query<HTMLButtonElement>('#undo'), commitButton = query<HTMLButtonElement>('#commit');
const modeField = query<HTMLSelectElement>('#mode'), fixtureField = query<HTMLSelectElement>('#fixture'), motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let originals = new Map(seed().map(item => [item.id, item])), saved = [...originals.values()], archived = new Map<string, Archived>();
const savedCards = new Map<string, HTMLElement>(), historyCards = new Map<string, HTMLElement>();
interface Operation { key: string; item: Item; controller: GlassReversibleAction<Receipt>; timeout: number | null; fixture: Fixture; epoch: number; focusRescue: boolean; choiceFocus: boolean; hostSettled: boolean }
let current: Operation | undefined;
let quiet = false, solid = false, pointerInside = false, sessionEpoch = 0, operationCount = 0, staleOutcomes = 0, destroyed = false;
const audit: string[] = [];
type Wait = { timer: number; reject(): void }; const waits = new Set<Wait>();
let tourVersion = 0, tourTimers: number[] = [], fixtureTimer: number | undefined, tourFinish: ((complete: boolean) => void) | undefined, tourStep = '';
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, content = '', className = '') => { const element = document.createElement(tag); element.textContent = content; if (className) element.className = className; return element; };
const text = (element: HTMLElement, value: string) => { if (element.textContent !== value) element.textContent = value; };
const journal = (entry: string) => { audit.unshift(entry); if (audit.length > 12) audit.pop(); };
const terminal = (state: GlassReversibleState<Receipt>) => ['undone', 'committed', 'error', 'destroyed'].includes(state.status);
function canStart() {
  if (!current) return true;
  const state = current.controller.state;
  return current.hostSettled && (state.status === 'undone' || state.status === 'committed' || (['error', 'destroyed'].includes(state.status) && !archived.has(current.item.id)));
}
function material() {
  const props = getGlassProps({ appearance: 'light', radius: 18, blur: 12, corner: 'continuous', reducedTransparency: solid }); notice.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) notice.style.setProperty(key, String(value)); for (const [key, value] of Object.entries(props)) if (key.startsWith('data-')) notice.setAttribute(key, String(value));
  notice.style.setProperty('--lg-fill-rgb', '254 246 240'); notice.style.setProperty('--lg-solid-fill', '#fef6f0'); notice.style.setProperty('--lg-ink', '#47352f'); query('#solid').setAttribute('aria-pressed', String(solid));
}
function createSavedCards() {
  savedCards.clear(); query('#saved-items').replaceChildren();
  for (const item of originals.values()) {
    const card = node('article', '', 'saved-card'); card.dataset.item = item.id;
    const art = node('div', '', 'item-art'); art.dataset.art = item.art; art.setAttribute('aria-hidden', 'true'); art.append(node('span', '', 'art-paper'), node('span', '', 'art-mark'), node('span', item.id, 'art-code'));
    const body = node('div', '', 'item-body'); body.append(node('p', item.tag, 'eyebrow'), node('h3', item.title), node('p', item.note));
    const button = node('button', 'Archive', 'archive-button'); button.type = 'button'; button.id = 'archive-' + item.id; button.setAttribute('aria-label', 'Archive ' + item.title); button.addEventListener('click', () => { cancelTour(); void archive(item.id); });
    card.append(art, body, button); savedCards.set(item.id, card);
  }
}
function renderMembership() {
  const container = query('#saved-items');
  for (const [id, card] of savedCards) if (!saved.some(item => item.id === id)) card.remove();
  for (const [index, item] of saved.entries()) {
    const card = savedCards.get(item.id)!;
    if (card.parentElement !== container) { const following = saved.slice(index + 1).map(next => savedCards.get(next.id)!).find(next => next.parentElement === container); container.insertBefore(card, following ?? null); }
    card.querySelector('button')!.setAttribute('aria-disabled', String(!canStart()));
  }
  text(query('#saved-count'), saved.length + (saved.length === 1 ? ' reference' : ' references')); query('#empty-saved').hidden = saved.length !== 0;
  for (const [id, card] of historyCards) if (!archived.has(id)) { card.remove(); historyCards.delete(id); }
  for (const [id, entry] of archived) {
    let card = historyCards.get(id);
    if (!card) {
      card = node('article', '', 'history-card'); card.dataset.archived = id;
      const content = node('div'); content.append(node('span', id, 'history-id'), node('h3', entry.receipt.item.title), node('p', '', 'history-state'));
      const restore = node('button', 'Restore'); restore.type = 'button'; restore.id = 'restore-' + id; restore.setAttribute('aria-label', 'Restore ' + entry.receipt.item.title); restore.addEventListener('click', () => { cancelTour(); restoreItem(id, true); });
      card.append(content, restore); historyCards.set(id, card); query('#archived-items').append(card);
    }
    text(card.querySelector<HTMLElement>('.history-state')!, entry.state + (entry.cause ? ' / ' + entry.cause : ' / local object retained'));
    const model = current?.controller.state, pending = current?.item.id === id && model && !terminal(model);
    card.querySelector<HTMLButtonElement>('button')!.disabled = Boolean(pending || current?.item.id === id && !current.hostSettled);
  }
  text(query('#archived-count'), archived.size + ' archived'); query('#empty-history').hidden = archived.size !== 0;
}
function render() {
  if (destroyed) return; renderMembership(); const state = current?.controller.state, status = state?.status ?? 'idle';
  text(query('#state-pill'), status); query('#state-pill').dataset.state = status;
  text(query('#notice-item'), current ? current.item.id + ' / ' + current.item.title : 'Choose a saved reference.');
  let description = 'No archive operation has started.';
  if (state) {
    const entry = archived.get(current!.item.id), active = saved.includes(current!.item);
    if (status === 'applying') description = current!.fixture === 'late-apply' ? 'A delayed Apply runs for 650 ms. This deliberate fixture ignores abort and can change the local shelf after disposal.' : 'Waiting for the actual local Apply acknowledgment. Undo is not available yet.';
    else if (status === 'available') description = 'The original reference is provisionally archived. Choose Undo to restore it or Commit to finalize this local archive.';
    else if (status === 'undoing') description = 'Undo is performing real local compensation. The reference returns after that callback succeeds.';
    else if (status === 'committing') description = 'The host is finalizing the local archive. A deadline alone is not a successful commit.';
    else if (status === 'undone') description = 'Undo restored the same original reference to the saved shelf.';
    else if (status === 'committed') description = active ? 'This operation committed. Separate local history Restore has since returned the same original reference.' : 'The host confirmed this local archive. Persistent Restore remains in history.';
    else if (status === 'error') description = active ? 'The callback failed. Host state was checked: this reference is on the saved shelf. A new operation uses a fresh controller.' : 'The callback failed and the reference remains archived. Use separate local history Restore for explicit host recovery.';
    else if (status === 'destroyed') description = !current!.hostSettled ? 'The controller was disposed. Its host callback remains observable and may finish; no compensation was invented.' : entry ? 'The disposed controller cannot offer Undo. The actual archived object remains in history for Restore.' : 'The controller was disposed. The host settled without leaving this reference archived.';
  }
  text(query('#operation-status'), description);
  undoButton.disabled = status !== 'available'; commitButton.disabled = status !== 'available'; query<HTMLButtonElement>('#dispose').disabled = !state || status === 'destroyed';
  const timed = current?.timeout !== null && current?.timeout !== undefined;
  text(query('#window-policy'), !timed ? 'Persistent Undo. No deadline or background timer; choose when you are ready.' : 'This operation has an explicit 3-second window. Focus, pointer, manual, and hidden-page pauses compose. History Restore remains persistent.');
  query('#sampled-window').hidden = !timed;
  const remaining = state?.remainingMs; text(query('#sampled-time'), remaining === null || remaining === undefined ? 'No active deadline' : Math.ceil(remaining) + ' ms');
  query('#sample-share').style.inlineSize = remaining === null || remaining === undefined ? '0%' : Math.max(0, Math.min(100, remaining / current!.timeout! * 100)).toFixed(2) + '%';
  text(query('#pause-reasons'), state?.paused ? 'Paused: ' + state.pauseReasons.join(', ') : 'No pause reasons');
  const manual = state?.pauseReasons.includes('manual') ?? false; text(query('#pause'), manual ? 'Resume manual pause' : 'Pause window'); query('#pause').setAttribute('aria-pressed', String(manual)); query<HTMLButtonElement>('#pause').disabled = status !== 'available'; query<HTMLButtonElement>('#sample').disabled = status !== 'available';
  text(query('#operation-key'), state?.key ?? 'None'); text(query('#receipt-state'), state?.hasReceipt ? 'Yes / ' + state.receipt!.item.id : 'No');
  text(query('#object-state'), current ? String(originals.get(current.item.id) === current.item && (!state?.hasReceipt || state.receipt!.item === current.item)) : 'No operation'); text(query('#pending-host'), String(waits.size)); text(query('#stale-count'), String(staleOutcomes));
  query('#audit').replaceChildren(...audit.map(entry => node('li', entry))); document.body.dataset.quiet = String(quiet || motion.matches); text(query('#tour-status'), tourStep ? 'Finite tour / ' + tourStep : 'No automatic archiving');
}
function delay(milliseconds: number, context: GlassReversibleContext, ignoreAbort: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const done = (error?: Error) => { if (finished) return; finished = true; window.clearTimeout(wait.timer); waits.delete(wait); context.signal.removeEventListener('abort', aborted); render(); error ? reject(error) : resolve(); };
    const aborted = () => { if (!ignoreAbort) done(new DOMException('Local callback cancelled before mutation', 'AbortError')); };
    const wait: Wait = { timer: 0, reject() { done(new DOMException('The local demo was reset', 'AbortError')); } };
    if (context.signal.aborted && !ignoreAbort) { reject(new DOMException('Local callback cancelled before mutation', 'AbortError')); return; }
    waits.add(wait); context.signal.addEventListener('abort', aborted, { once: true }); wait.timer = window.setTimeout(() => done(), milliseconds); render();
  });
}
function compensate(receipt: Receipt) {
  const entry = archived.get(receipt.item.id); if (!entry || entry.receipt !== receipt || saved.includes(receipt.item)) throw new Error('The original local receipt is unavailable for compensation');
  archived.delete(receipt.item.id); saved.splice(Math.min(receipt.position, saved.length), 0, receipt.item); saved.sort((a, b) => a.rank - b.rank);
}
function syncPauses() {
  if (!current || current.timeout === null) return;
  const model = current.controller;
  for (const [reason, on] of [['focus', notice.contains(document.activeElement)], ['pointer', pointerInside], ['hidden', document.hidden]] as const) on ? model.pause(reason) : model.resume(reason);
}
function archive(id: string): Promise<boolean> {
  if (destroyed || !originals.has(id) || !saved.includes(originals.get(id)!) || !canStart()) { text(query('#host-feedback'), 'Finish the current choice or restore its host state through history before archiving another reference.'); return Promise.resolve(false); }
  current?.controller.destroy(); const item = originals.get(id)!, key = 'archive:' + id + ':' + ++operationCount, epoch = sessionEpoch, fixture = fixtureField.value as Fixture, timeout = modeField.value === 'timed' ? 3000 : null;
  const op: Operation = { key, item, controller: undefined as unknown as GlassReversibleAction<Receipt>, timeout, fixture, epoch, focusRescue: false, choiceFocus: false, hostSettled: false };
  op.controller = createGlassReversibleAction<Receipt>({
    key, timeout,
    async apply(context) {
      await delay(fixture === 'late-apply' ? 650 : 220, context, fixture === 'late-apply');
      if (epoch !== sessionEpoch || destroyed) throw new Error('The local demo changed before Apply could mutate it');
      const position = saved.indexOf(item); if (position < 0) throw new Error('This reference is not on the saved shelf');
      op.focusRescue = savedCards.get(item.id)!.contains(document.activeElement);
      const receipt: Receipt = { item, position, operation: key }; saved.splice(position, 1); archived.set(item.id, { receipt, state: 'provisional', cause: null }); journal(key + ' / actual Apply'); render(); return { receipt };
    },
    async undo(receipt, context) {
      await delay(180, context, false); if (epoch !== sessionEpoch || destroyed) throw new Error('The local demo changed before Undo');
      if (fixture === 'undo-error') { const entry = archived.get(item.id); if (entry) entry.state = 'needs recovery'; journal(key + ' / Undo fixture rejected before restoration'); throw new Error('Explicit local Undo rejection fixture'); }
      compensate(receipt); journal(key + ' / same original object restored by Undo'); render();
    },
    async commit(receipt, context) {
      await delay(180, context, false); if (epoch !== sessionEpoch || destroyed) throw new Error('The local demo changed before Commit');
      const entry = archived.get(item.id); if (!entry || entry.receipt !== receipt) throw new Error('The local archive receipt is no longer present');
      if (fixture === 'commit-error') { entry.state = 'needs recovery'; journal(key + ' / Commit fixture rejected before finalization'); throw new Error('Explicit local Commit rejection fixture'); }
      entry.state = 'committed'; entry.cause = context.cause; journal(key + ' / actual Commit / ' + context.cause); render();
    },
    onChange(state) {
      if (current !== op || epoch !== sessionEpoch || destroyed) return;
      if (state.status === 'committing') op.hostSettled = false;
      render();
      if (state.status === 'available') { syncPauses(); if (op.focusRescue) { op.focusRescue = false; if (document.activeElement === document.body) undoButton.focus(); } }
      if (state.status === 'committing') observe(op.controller.lastOperation!, op, 'commit');
    },
  });
  current = op; syncPauses(); text(query('#host-feedback'), ''); render();
  return observe(op.controller.start(), op, 'apply');
}
function observe(promise: ReturnType<GlassReversibleAction<Receipt>['start']>, op: Operation, phase: 'apply' | 'undo' | 'commit'): Promise<boolean> {
  return promise.then(outcome => {
    if (op.epoch !== sessionEpoch || destroyed) return false; op.hostSettled = true;
    if (outcome.stale) { staleOutcomes++; const entry = archived.get(op.item.id); if (entry) entry.state = 'needs recovery'; journal(op.key + ' / stale ' + phase + ' receipt observed / actual host state retained'); }
    if (current === op) {
      render();
      const choice = phase === 'undo' ? undoButton : commitButton;
      if (!outcome.stale && op.choiceFocus && (document.activeElement === document.body || document.activeElement === choice)) {
        const focus = phase === 'undo' ? savedCards.get(op.item.id)?.querySelector<HTMLButtonElement>('button') : historyCards.get(op.item.id)?.querySelector<HTMLButtonElement>('button'); focus?.focus();
      }
      op.choiceFocus = false;
    }
    return !outcome.stale;
  }, () => {
    if (op.epoch !== sessionEpoch || destroyed) return false; op.hostSettled = true;
    if (current === op) {
      render(); const choice = phase === 'undo' ? undoButton : commitButton;
      if (op.controller.state.status === 'error' && op.choiceFocus && (document.activeElement === document.body || document.activeElement === choice)) historyCards.get(op.item.id)?.querySelector<HTMLButtonElement>('button')?.focus();
      op.choiceFocus = false;
    }
    return false;
  });
}
function choose(phase: 'undo' | 'commit'): Promise<boolean> {
  if (!current || current.controller.state.status !== 'available') return Promise.resolve(false);
  const op = current; op.hostSettled = false; op.choiceFocus = document.activeElement === (phase === 'undo' ? undoButton : commitButton);
  const promise = phase === 'undo' ? op.controller.undo() : op.controller.commit();
  // Commit is observed by onChange for both explicit and deadline choices.
  return phase === 'undo' ? observe(promise, op, phase) : promise.then(outcome => !outcome.stale, () => false);
}
function restoreItem(id: string, moveFocus = false) {
  const entry = archived.get(id); if (!entry || destroyed || current?.item.id === id && (!current.hostSettled || !terminal(current.controller.state))) return false;
  const ownedFocus = moveFocus && document.activeElement === historyCards.get(id)?.querySelector('button');
  compensate(entry.receipt); journal(entry.receipt.operation + ' / persistent history Restore / same object ' + id); text(query('#host-feedback'), id + ' restored through local history. Its original object and stable ID are retained.'); render();
  if (ownedFocus && document.activeElement === document.body) savedCards.get(id)?.querySelector<HTMLButtonElement>('button')?.focus(); return true;
}
function dispose() { if (!current || current.controller.state.status === 'destroyed') return false; current.controller.destroy(); journal(current.key + ' / controller disposed / no silent compensation'); render(); return true; }
function mode(value: 'persistent' | 'timed') { if (!['persistent', 'timed'].includes(value)) return false; modeField.value = value; render(); return true; }
function fixture(value: Fixture) { if (!['none', 'undo-error', 'commit-error', 'late-apply'].includes(value)) return false; fixtureField.value = value; render(); return true; }
function cancelTour() { tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = []; if (fixtureTimer !== undefined) window.clearTimeout(fixtureTimer); fixtureTimer = undefined; const finish = tourFinish; tourFinish = undefined; tourStep = ''; finish?.(false); render(); }
function reset() {
  cancelTour(); sessionEpoch++; current?.controller.destroy(); for (const wait of [...waits]) wait.reject(); current = undefined;
  originals = new Map(seed().map(item => [item.id, item])); saved = [...originals.values()]; archived.clear(); historyCards.clear(); query('#archived-items').replaceChildren(); audit.length = 0; operationCount = staleOutcomes = 0;
  modeField.value = 'persistent'; fixtureField.value = 'none'; quiet = solid = false; query<HTMLInputElement>('#quiet').checked = false; text(query('#host-feedback'), ''); createSavedCards(); material(); render();
}
function preset(value: Preset) {
  if (!['persistent', 'timed', 'committed', 'error', 'stale'].includes(value) || destroyed) return false; reset();
  if (value === 'timed') mode('timed'); if (value === 'error') fixture('undo-error'); if (value === 'stale') fixture('late-apply');
  const epoch = sessionEpoch, applied = archive('K01');
  if (value === 'committed') void applied.then(ok => { if (ok && epoch === sessionEpoch) void choose('commit'); });
  if (value === 'error') void applied.then(ok => { if (ok && epoch === sessionEpoch) void choose('undo'); });
  if (value === 'stale') fixtureTimer = window.setTimeout(() => { fixtureTimer = undefined; dispose(); }, 180);
  return true;
}
function tour(): Promise<boolean> {
  reset(); const version = ++tourVersion; tourStep = 'persistent / actual Apply receipt'; void archive('K01'); render();
  return new Promise(resolve => {
    tourFinish = resolve;
    const at = (delay: number, step: () => void) => { const timer = window.setTimeout(() => { tourTimers = tourTimers.filter(value => value !== timer); if (!destroyed && version === tourVersion) step(); }, delay); tourTimers.push(timer); };
    at(1600, () => { void choose('undo'); tourStep = 'Undo / same original object'; render(); });
    at(3200, () => { void archive('K02'); tourStep = 'fresh controller / actual archive'; render(); });
    at(4900, () => { void choose('commit'); tourStep = 'host-confirmed Commit'; render(); });
    at(6500, () => { restoreItem('K02'); tourStep = 'persistent history Restore'; render(); });
    at(7900, () => { mode('timed'); void archive('K03'); tourStep = 'explicit timed alternative'; render(); });
    at(8500, () => { current?.controller.pause('manual'); tourStep = 'pause composes / no polling'; render(); });
    at(9000, () => { void choose('undo'); tourStep = 'native Undo while paused'; render(); });
    at(10000, () => { tourStep = ''; tourFinish = undefined; render(); resolve(true); });
  });
}
notice.addEventListener('focusin', syncPauses); notice.addEventListener('focusout', () => { queueMicrotask(syncPauses); });
notice.addEventListener('pointerenter', () => { pointerInside = true; syncPauses(); }); notice.addEventListener('pointerleave', () => { pointerInside = false; syncPauses(); });
const visibility = () => { if (document.hidden) cancelTour(); syncPauses(); render(); }; document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', render);
undoButton.addEventListener('click', () => { cancelTour(); void choose('undo'); }); commitButton.addEventListener('click', () => { cancelTour(); void choose('commit'); }); query('#dispose').addEventListener('click', () => { cancelTour(); dispose(); });
query('#pause').addEventListener('click', () => { cancelTour(); if (!current) return; current.controller.state.pauseReasons.includes('manual') ? current.controller.resume('manual') : current.controller.pause('manual'); render(); }); query('#sample').addEventListener('click', () => { cancelTour(); render(); });
modeField.addEventListener('change', cancelTour); fixtureField.addEventListener('change', cancelTour); query<HTMLInputElement>('#quiet').addEventListener('change', event => { cancelTour(); quiet = (event.target as HTMLInputElement).checked; render(); }); query('#solid').addEventListener('click', () => { cancelTour(); solid = !solid; material(); });
query('#tour').addEventListener('click', () => { void tour(); }); query('#reset').addEventListener('click', reset);
const state = () => {
  const model = current?.controller.state;
  return { saved: saved.map(item => ({ id: item.id, title: item.title, sameOriginalObject: originals.get(item.id) === item })), archived: [...archived].map(([id, entry]) => ({ id, title: entry.receipt.item.title, state: entry.state, cause: entry.cause, operation: entry.receipt.operation, sameOriginalObject: originals.get(id) === entry.receipt.item })), controller: model ? { ...model, receipt: model.hasReceipt ? { itemId: model.receipt!.item.id, position: model.receipt!.position, operation: model.receipt!.operation } : null, error: model.error instanceof Error ? model.error.message : null } : null, hostSettled: current?.hostSettled ?? true, nextMode: modeField.value, fixture: fixtureField.value, pendingHostCallbacks: waits.size, operationCount, staleOutcomes, audit: [...audit], quiet: quiet || motion.matches, solid, tourStep, pendingTourSteps: tourTimers.length, pendingFixtureActions: fixtureTimer === undefined ? 0 : 1, focus: document.activeElement?.id || document.activeElement?.tagName || null };
};
const demo = { archive: (id: string) => { cancelTour(); return archive(id); }, undo: () => { cancelTour(); return choose('undo'); }, commit: () => { cancelTour(); return choose('commit'); }, restore: (id: string) => { cancelTour(); return restoreItem(id); }, dispose: () => { cancelTour(); return dispose(); }, mode: (value: 'persistent' | 'timed') => { cancelTour(); return mode(value); }, fixture: (value: Fixture) => { cancelTour(); return fixture(value); }, pause: () => { cancelTour(); return current?.controller.pause('manual') ?? false; }, resume: () => { cancelTour(); return current?.controller.resume('manual') ?? false; }, sample: () => { render(); return state(); }, preset, reset, state, tour };
(window as Window & { __undoDemo?: typeof demo }).__undoDemo = demo;
createSavedCards(); material(); render();
window.addEventListener('pagehide', () => { cancelTour(); sessionEpoch++; current?.controller.destroy(); destroyed = true; for (const wait of [...waits]) wait.reject(); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', render); }, { once: true });
