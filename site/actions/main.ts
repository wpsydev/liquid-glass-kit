import { attachGlassAction, attachGlassFormAction } from '../../src/action.js';
import type { GlassActionContext, GlassActionResult, GlassActionState } from '../../src/action.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Lane = 'interface' | 'writing' | 'prototype';
type Preset = 'success' | 'rejected' | 'submitted' | 'cancelled';
type Brief = { id: string; title: string; summary: string; lane: Lane; source: string; status: 'queued' | 'reviewed'; origin: 'sample' | 'local commit'; afterCancel: boolean };
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const form = query<HTMLFormElement>('#brief-form'), primary = query<HTMLButtonElement>('#queue-submit'), recordButton = query<HTMLButtonElement>('#intent-submit');
const seed = (): Brief[] => [
  { id: 'B01', title: 'Simplify the first-run screen', summary: 'Keep one obvious first action and move supporting detail into context that can be reached without a mouse.', lane: 'interface', source: '', status: 'queued', origin: 'sample', afterCancel: false },
  { id: 'B02', title: 'Keep the source visible', summary: 'Let the reader inspect the original source before committing to a generated summary or a new direction.', lane: 'writing', source: '', status: 'queued', origin: 'sample', afterCancel: false },
];
let queue = seed(), nextId = 3, intents: { id: string; title: string; lane: Lane; afterCancel: boolean }[] = [];
let quiet = false, destroyed = false, hostEpoch = 0, runCalls = 0, lateCommits = 0, formState: GlassActionState | undefined, reviewState: GlassActionState | undefined;
let lastSubmission: { generation: number; submitter: string | null; controls: [string, string][] } | null = null;
let formAction: ReturnType<typeof attachGlassFormAction>, reviewAction: ReturnType<typeof attachGlassAction>;
const tasks = new Set<{ timer: number; finish(): void }>(), fixtureTimers = new Set<number>();
let tourVersion = 0, tourStep = '', tourTimers: number[] = [], tourFinish: ((complete: boolean) => void) | undefined;
const logs: string[] = [];
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; };
class DuplicateBrief extends Error {}
class SourceNeeded extends Error {}
class ContentNeeded extends Error {}
const ruleNotice = node('p', '', 'rule-notice'); ruleNotice.setAttribute('role', 'status'); query('#form-status').after(ruleNotice);
const log = (text: string) => { logs.unshift(text); if (logs.length > 10) logs.pop(); };
const render = () => {
  if (destroyed) return;
  const formStatus = formState?.status ?? 'idle', reviewerStatus = reviewState?.status ?? 'idle';
  query('#form-state').textContent = formStatus; query('#form-state').dataset.state = formStatus;
  query('#client-state').textContent = formStatus; query('#review-state').textContent = reviewerStatus;
  query('#submitter').textContent = lastSubmission?.submitter ?? 'no submitter yet'; query('#invocations').textContent = String(runCalls);
  query('#host-pending').textContent = tasks.size + ' pending'; query('#late-count').textContent = String(lateCommits);
  query('#queue-count').textContent = queue.length + ' briefs'; query('#intent-count').textContent = String(intents.length);
  query('#serialized').textContent = lastSubmission ? lastSubmission.controls.map(([name, value]) => name + ': ' + value).join('\n') : 'A native submission will appear here.';
  const blocked = formStatus === 'pending' || formStatus === 'submitted';
  // ARIA flags communicate the form's current policy. Native disabled is not
  // changed, so focus and successful-control participation remain intact.
  for (const button of [primary, recordButton]) blocked ? button.setAttribute('aria-disabled', 'true') : button.removeAttribute('aria-disabled');
  query<HTMLButtonElement>('#retry').disabled = !(formStatus === 'error' && formState?.retryable);
  query<HTMLButtonElement>('#cancel').disabled = formStatus !== 'pending' && reviewerStatus !== 'pending';
  ruleNotice.textContent = formState?.error instanceof DuplicateBrief ? 'That title already exists in this local queue. Rename it, then explicitly retry with the current fields.' : formState?.error instanceof SourceNeeded ? 'This local prototype lane requires source context. Add a valid source URL, then explicitly retry.' : formState?.error instanceof ContentNeeded ? 'Use at least eight meaningful title characters and twenty summary characters. Whitespace alone is not a brief.' : '';
  query('#quiet').setAttribute('aria-pressed', String(quiet)); document.body.dataset.quiet = String(quiet);
  const cards = queue.map(brief => {
    const card = node('article', '', 'brief-entry'); card.dataset.brief = brief.id; card.dataset.status = brief.status;
    const top = node('div', '', 'entry-top'); top.append(node('span', brief.id + ' / ' + brief.origin), node('span', brief.status));
    const metadata = node('div', '', 'entry-meta'); metadata.append(node('span', brief.lane + ' lane'), node('span', brief.afterCancel ? 'committed after client cancellation' : 'local state'));
    if (brief.source) metadata.append(node('span', 'source stored as text'));
    card.append(top, node('h3', brief.title), node('p', brief.summary), metadata); return card;
  });
  // Queue cards carry no controls; rebuilding this read-only list never replaces
  // the form's native inputs, submitters, icons, labels or focused elements.
  query('#queue').replaceChildren(...cards);
  query('#intents').replaceChildren(...(intents.length ? intents.map(intent => {
    const entry = node('article', intent.title, 'intent-entry'); entry.append(node('span', intent.id + ' / recorded intent / not queued' + (intent.afterCancel ? ' / after client cancellation' : ''))); return entry;
  }) : [node('p', 'Record intent only adds a local unconfirmed record. Resolution without a receipt is submitted, not success.', 'empty-state')]));
};
const finiteDecision = (context: GlassActionContext, duration: number, cooperative: boolean, decide: () => void | GlassActionResult) => {
  if (tasks.size >= 4) return Promise.resolve<GlassActionResult>({ status: 'error', message: 'This local fixture already has four finite decisions. Wait for them to settle, then retry.', retryable: true });
  const epoch = hostEpoch;
  return new Promise<void | GlassActionResult>((resolve, reject) => {
    let settled = false;
    const task = { timer: 0, finish() {
      if (settled) return; settled = true; window.clearTimeout(task.timer); tasks.delete(task); resolve(); render();
    } };
    task.timer = window.setTimeout(() => {
      if (settled) return;
      settled = true; tasks.delete(task);
      if (destroyed || epoch !== hostEpoch || cooperative && context.signal.aborted) { resolve(); render(); return; }
      try { resolve(decide()); } catch (error) { reject(error); }
      render();
    }, duration);
    tasks.add(task);
    context.signal.addEventListener('abort', () => {
      if (cooperative) { log('host / cooperative local decision stopped'); task.finish(); }
      else { log('host / noncooperative local decision can still finish'); render(); }
    }, { once: true });
    if (context.signal.aborted && cooperative) task.finish();
    render();
  });
};
const runForm = (context: GlassActionContext) => {
  runCalls++;
  const data = context.formData!;
  lastSubmission = { generation: context.generation, submitter: context.submitter?.id ?? null, controls: [...data.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : value.name]) };
  const title = String(data.get('title') ?? '').trim(), summary = String(data.get('summary') ?? '').trim(), lane = String(data.get('lane')) as Lane, source = String(data.get('source') ?? '').trim();
  const intent = data.get('intent') === 'record' ? 'record' : 'queue', cooperative = data.get('late') !== 'continue';
  const duration = lane === 'writing' ? 400 : lane === 'prototype' ? 800 : 600;
  log('host / native ' + intent + ' submission captured once');
  return finiteDecision(context, duration, cooperative, () => {
    if (title.length < 8 || summary.length < 20) throw new ContentNeeded('Local content rule');
    if (lane === 'prototype' && !source) throw new SourceNeeded('Local source rule');
    if (intent === 'record') {
      if (intents.length >= 16) return { status: 'error', message: 'This local fixture contains sixteen intents. Reset the demo to start a new session.', retryable: false };
      intents.push({ id: 'I' + String(intents.length + 1).padStart(2, '0'), title, lane, afterCancel: context.signal.aborted });
      log('host / intent recorded without queue confirmation');
      // Deliberately no receipt/result: the controller must report submitted.
      return;
    }
    if (queue.some(brief => brief.title.toLocaleLowerCase() === title.toLocaleLowerCase())) throw new DuplicateBrief('Local duplicate rule');
    if (queue.length >= 24) return { status: 'error', message: 'This local fixture contains twenty-four briefs. Reset the demo to start a new session.', retryable: false };
    const brief: Brief = { id: 'B' + String(nextId++).padStart(2, '0'), title, summary, lane, source, status: 'queued', origin: 'local commit', afterCancel: context.signal.aborted };
    queue.push(brief); if (brief.afterCancel) lateCommits++;
    log('host / ' + brief.id + ' committed' + (brief.afterCancel ? ' after client cancellation' : ''));
    return { status: 'success', message: brief.id + ' was added to this session’s local queue.', receipt: { id: brief.id, storage: 'page memory', status: brief.status } };
  });
};
formAction = attachGlassFormAction(form, {
  run: runForm, labelElement: query('#queue-label'), statusElement: query('#form-status'),
  labels: { idle: 'Add to local queue', pending: 'Working on this brief…', success: 'Added to local queue', submitted: 'Intent recorded', error: 'Check the brief', cancelled: 'Action cancelled' },
  isRetryable: error => error instanceof DuplicateBrief || error instanceof SourceNeeded || error instanceof ContentNeeded,
  onState(state) { formState = state; log('client / form ' + state.status); render(); },
});
reviewAction = attachGlassAction(query<HTMLButtonElement>('#review-next'), {
  labelElement: query('#review-label'), statusElement: query('#review-status'),
  labels: { idle: 'Mark next brief reviewed', pending: 'Reviewing local brief…', success: 'Next brief reviewed', error: 'Reset the reviewer', cancelled: 'Review cancelled' },
  run(context) {
    const candidate = queue.find(brief => brief.status === 'queued');
    return finiteDecision(context, 400, true, () => {
      if (!candidate || !queue.includes(candidate) || candidate.status !== 'queued') return { status: 'error', message: 'No queued local brief is available. Add one, then reset the action.', retryable: false };
      candidate.status = 'reviewed'; log('host / ' + candidate.id + ' marked reviewed locally');
      return { status: 'success', message: candidate.id + ' is marked reviewed in this session.', receipt: { id: candidate.id, status: candidate.status, scope: 'local only' } };
    });
  },
  onState(state) { reviewState = state; log('client / reviewer ' + state.status); render(); },
});
const material = getGlassProps({ appearance: 'light', radius: 16, blur: 12, corner: 'continuous' }), surface = query('#brief-surface');
surface.classList.add(material.className);
for (const [key, value] of Object.entries(material.style)) surface.style.setProperty(key, value);
for (const [key, value] of Object.entries(material)) if (key !== 'style' && key !== 'className') surface.setAttribute(key, String(value));
surface.style.setProperty('--lg-fill-rgb', '246 248 240'); surface.style.setProperty('--lg-solid-fill', '#f6f8f0'); surface.style.setProperty('--lg-ink', '#2d4132');
const cancelTour = () => {
  tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = [];
  for (const timer of fixtureTimers) window.clearTimeout(timer); fixtureTimers.clear();
  tourStep = ''; tourFinish?.(false); tourFinish = undefined; query('#tour').textContent = 'Short tour ↗';
};
const submit = (intent: 'queue' | 'record' = 'queue') => {
  if (intent !== 'queue' && intent !== 'record') throw new TypeError('Unknown native submit intent');
  return formAction.invoke(intent === 'queue' ? primary : recordButton);
};
const load = (id: Preset) => {
  if (!['success', 'rejected', 'submitted', 'cancelled'].includes(id)) throw new TypeError('Unknown local action fixture');
  formAction.reset();
  const title = id === 'rejected' ? 'Keep the source visible' : id === 'submitted' ? 'A small review intent' : id === 'cancelled' ? 'An honest cancellation' : 'Make the first step calmer';
  query<HTMLInputElement>('#brief-title').value = title;
  query<HTMLTextAreaElement>('#brief-summary').value = id === 'submitted' ? 'Record this local intake without claiming that a queue entry or remote review has been confirmed.' : 'Keep the first action clear, remove competing decoration and make the useful detail easy to find.';
  query<HTMLSelectElement>('#brief-lane').value = id === 'submitted' ? 'writing' : id === 'cancelled' ? 'prototype' : 'interface';
  query<HTMLInputElement>('#brief-source').value = id === 'cancelled' ? 'https://example.com/original-context' : '';
  query<HTMLInputElement>('#late-work').checked = id === 'cancelled'; render();
};
const preset = (id: Preset) => {
  load(id); const operation = submit(id === 'submitted' ? 'record' : 'queue');
  if (id === 'cancelled') {
    const timer = window.setTimeout(() => { fixtureTimers.delete(timer); formAction.cancel(); render(); }, 220); fixtureTimers.add(timer);
  }
  return operation;
};
query('#retry').addEventListener('click', () => { cancelTour(); void formAction.retry(); });
query('#cancel').addEventListener('click', () => { cancelTour(); formAction.cancel(); reviewAction.cancel(); render(); });
query('#reset-action').addEventListener('click', () => { cancelTour(); formAction.reset(); reviewAction.reset(); render(); });
query('#quiet').addEventListener('click', () => { cancelTour(); quiet = !quiet; render(); });
query('#load-duplicate').addEventListener('click', () => { cancelTour(); load('rejected'); query('#tour-note').textContent = 'A real duplicate title is loaded. Submit it, then rename it and explicitly retry.'; });
form.addEventListener('input', cancelTour); form.addEventListener('pointerdown', cancelTour); query('#review-next').addEventListener('pointerdown', cancelTour);
const reset = () => {
  cancelTour(); hostEpoch++; formAction.reset(); reviewAction.reset();
  for (const task of [...tasks]) task.finish();
  queue = seed(); nextId = 3; intents = []; runCalls = 0; lateCommits = 0; lastSubmission = null; quiet = false; logs.length = 0;
  form.reset(); query('#tour-note').textContent = 'Try the native form, or inspect a short original local workflow.'; render();
};
query('#reset-demo').addEventListener('click', reset);
const tour = () => {
  reset(); const version = tourVersion;
  const step = (name: string, action: () => void) => {
    if (version !== tourVersion) return; tourStep = name; query('#tour').textContent = 'Tour / ' + name; action();
  };
  step('confirmed', () => { void preset('success'); });
  return new Promise<boolean>(resolve => {
    tourFinish = resolve;
    tourTimers.push(window.setTimeout(() => step('rejected', () => { void preset('rejected'); }), 2500),
      window.setTimeout(() => step('retry', () => { query<HTMLInputElement>('#brief-title').value = 'Source context, with a clear handoff'; void formAction.retry(); }), 3800),
      window.setTimeout(() => step('submitted', () => { void preset('submitted'); }), 5500),
      window.setTimeout(() => step('cancelled', () => { void preset('cancelled'); }), 7300),
      window.setTimeout(() => step('reviewed', () => { void reviewAction.invoke(); }), 9000),
      window.setTimeout(() => { if (version !== tourVersion) return; tourStep = ''; tourTimers = []; tourFinish = undefined; query('#tour').textContent = 'Short tour ↗'; resolve(true); render(); }, 11000));
  });
};
query('#tour').addEventListener('click', () => { void tour(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelTour(); formAction.cancel(); reviewAction.cancel(); } });
window.addEventListener('pagehide', () => {
  cancelTour(); hostEpoch++; destroyed = true; formAction.destroy(); reviewAction.destroy(); for (const task of [...tasks]) task.finish();
}, { once: true });
Object.assign(window, { __actionDemo: {
  reset, tour, load(id: Preset) { cancelTour(); load(id); },
  preset(id: Preset) { cancelTour(); return preset(id); },
  submit(intent: 'queue' | 'record' = 'queue') { cancelTour(); return submit(intent); },
  retry() { cancelTour(); return formAction.retry(); },
  review() { cancelTour(); return reviewAction.invoke(); },
  cancel() { cancelTour(); const formCancelled = formAction.cancel(), reviewCancelled = reviewAction.cancel(); render(); return formCancelled || reviewCancelled; },
  resetAction() { cancelTour(); formAction.reset(); reviewAction.reset(); render(); },
  get state() { return { form: formAction.state, reviewer: reviewAction.state, queue: queue.map(item => ({ ...item })), intents: intents.map(item => ({ ...item })), pendingHostDecisions: tasks.size, runCalls, lateCommits, lastSubmission, quiet, tourStep, focus: (document.activeElement as HTMLElement | null)?.id ?? '', logs: [...logs] }; },
} });
render();
