import './style.css';
import {
  mountGlassActivityIsland,
  type GlassActivityAction,
  type GlassActivityPrompt,
  type GlassActivitySession,
  type GlassActivitySnapshot,
} from '../../src/activity-island.js';

type Scenario = 'permission' | 'diff' | 'question' | 'plan' | 'completion' | 'multisession';
type EventEntry = { sequence: number; text: string };
const scenarios: Scenario[] = ['permission', 'diff', 'question', 'plan', 'completion', 'multisession'];
const labels: Record<Scenario, string> = { permission: 'Permission review', diff: 'A readable change', question: 'A useful question', plan: 'A plan to inspect', completion: 'Done, with a next step', multisession: 'Three sessions, one view' };
const notes: Record<Scenario, string> = { permission: 'A decision, with context.', diff: 'See the change. Keep control.', question: 'Choose the direction.', plan: 'Approve it, or reshape it.', completion: 'The conversation continues.', multisession: 'Attention, without the noise.' };
const get = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const relay = get('relay');
const host = get('island-host');
const motion = get<HTMLInputElement>('reduced-motion');
const solid = get<HTMLInputElement>('solid-surfaces');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const transparencyPreference = matchMedia('(prefers-reduced-transparency: reduce)');
const timers = new Set<ReturnType<typeof setTimeout>>();
let currentScenario: Scenario = 'permission';
let revision = 0;
let tourRunning = false;
let destroyed = false;
let events: EventEntry[] = [];
let eventSequence = 0;
let snapshot: GlassActivitySnapshot = { sessions: [] };

motion.checked = motionPreference.matches;
solid.checked = transparencyPreference.matches;

function later(callback: () => void, milliseconds: number): void {
  const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) callback(); }, milliseconds);
  timers.add(timer);
}
function announce(text: string): void { get('demo-announcement').textContent = text; }
function log(text: string): void {
  events = [...events, { sequence: ++eventSequence, text }].slice(-4);
  const fragment = document.createDocumentFragment();
  for (const event of [...events].reverse()) {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = `LOCAL EVENT ${String(event.sequence).padStart(2, '0')}`;
    item.append(time, document.createTextNode(event.text));
    fragment.append(item);
  }
  get('event-log').replaceChildren(fragment);
}
function syncState(status?: string): void {
  const active = snapshot.sessions.find(session => session.id === snapshot.activeSessionId) ?? snapshot.sessions[0];
  const requests = snapshot.sessions.filter(session => session.request).length;
  get('host-summary').textContent = `${snapshot.sessions.length} session${snapshot.sessions.length === 1 ? '' : 's'} · ${requests} pending request${requests === 1 ? '' : 's'}`;
  get('stage-status').textContent = status ?? (active?.request ? 'Waiting for your decision' : active?.status === 'complete' ? 'Complete · ready for the next prompt' : active ? `Host state: ${active.status}` : 'All local sessions dismissed');
  island.update(snapshot);
}
function replaceSession(id: string, update: (session: GlassActivitySession) => GlassActivitySession): void {
  snapshot = { ...snapshot, sessions: snapshot.sessions.map(session => session.id === id ? update(session) : session) };
}
function onAction(action: GlassActivityAction): void {
  const session = snapshot.sessions.find(value => value.id === action.sessionId);
  if (!session) return;
  if (action.requestId && (session.request?.id !== action.requestId || session.request?.revision !== action.revision)) {
    log('Ignored a stale demo proposal. The current host revision wins.');
    return;
  }
  if (action.action === 'select-session') {
    snapshot = { ...snapshot, activeSessionId: session.id };
    log(`Selected ${session.title.toLowerCase()}. Its local state is now in view.`);
    syncState();
    return;
  }
  if (action.action === 'dismiss') {
    const remaining = snapshot.sessions.filter(value => value.id !== session.id);
    snapshot = { sessions: remaining, activeSessionId: remaining[0]?.id };
    log(`Dismissed ${session.title.toLowerCase()} from this demo.`);
    syncState();
    return;
  }
  if (action.action === 'revise') {
    const text = action.answer?.text?.trim() || 'Make the plan smaller and easier to review';
    if (session.request?.kind !== 'plan') return;
    const request = session.request;
    replaceSession(session.id, value => ({ ...value, summary: 'The local host revised the proposal.', request: { ...request, revision: ++revision, title: 'A smaller, clearer plan', description: `Your revision: ${text}`, steps: ['Keep the existing semantic controls.', 'Add the activity island as an optional surface.', 'Review keyboard and mobile behavior before release.'] } }));
    log(`Revision captured locally: ${text}`);
    syncState('Revised plan · awaiting a fresh decision');
    announce('The local host has supplied a revised plan.');
    return;
  }
  let summary: string;
  if (action.action === 'deny') {
    summary = 'You declined this local proposal. No command ran and no files changed.';
    log('Proposal declined. The demo host cleared the request.');
  } else if (action.action === 'answer') {
    const choice = session.request?.kind === 'question' ? session.request.choices?.find(value => value.id === action.answer?.choiceId)?.label : undefined;
    const text = [choice, action.answer?.text?.trim()].filter(Boolean).join(' · ');
    summary = `Your direction is saved in this demo: ${text}`;
    log(`Answer received locally: ${text}`);
  } else {
    summary = session.request?.kind === 'permission' ? 'Permission recorded by the demo host. This preview does not execute the command.' : session.request?.kind === 'diff' ? 'Change accepted in the local preview. No file was written.' : 'Plan accepted in the local preview. No tasks were executed.';
    log(session.request?.kind === 'permission' ? 'Allow-once decision recorded. Command execution is not connected.' : session.request?.kind === 'diff' ? 'Diff accepted. The local host cleared the review request.' : 'Plan accepted. The local host cleared the review request.');
  }
  replaceSession(session.id, value => ({ ...value, status: 'complete', request: undefined, progress: undefined, summary }));
  syncState(action.action === 'deny' ? 'Declined · nothing executed' : 'Decision recorded · local preview only');
  announce(summary);
}
function onPrompt(prompt: GlassActivityPrompt): void {
  if (!snapshot.sessions.some(session => session.id === prompt.sessionId)) return;
  const attachments = prompt.files.length ? ` (${prompt.files.length} local image${prompt.files.length === 1 ? '' : 's'}; not uploaded)` : '';
  log(`Prompt received: “${prompt.text}”${attachments}`);
  replaceSession(prompt.sessionId, session => ({ ...session, status: 'idle', summary: `Your prompt was received by this local demo host: “${prompt.text}”. No AI service is connected.` }));
  syncState('Prompt received · no AI service connected');
  announce('The local host received your prompt. Nothing was sent to a service.');
}
const island = mountGlassActivityIsland(host, { label: 'RELAY / ACTIVITY', snapshot, reducedMotion: motion.checked, onAction, onPrompt });

function makeSnapshot(scenario: Scenario): GlassActivitySnapshot {
  const base: GlassActivitySession = { id: 'interface', title: 'Interface study', status: 'attention', model: 'Demo host', context: 'Local state', summary: 'This is a simulated session.' };
  const request = { id: `${scenario}-${revision}`, revision };
  if (scenario === 'permission') return { sessions: [{ ...base, request: { ...request, kind: 'permission', title: 'Run the review checks?', description: 'Inspect the proposed command before allowing it once. This demo records your decision only.', command: 'npm run check\nnpm pack --dry-run' } }], activeSessionId: base.id };
  if (scenario === 'diff') return { sessions: [{ ...base, request: { ...request, kind: 'diff', title: 'A calmer focus state', description: 'A tiny proposal. Open the file to compare both sides.', files: [{ path: 'styles/controls.css', before: '.control:focus {\n  outline: none;\n}', after: '.control:focus-visible {\n  outline: 2px solid #a9e6bd;\n  outline-offset: 3px;\n}' }] } }], activeSessionId: base.id };
  if (scenario === 'question') return { sessions: [{ ...base, request: { ...request, kind: 'question', title: 'Which direction feels right?', description: 'Choose a surface treatment, or describe your own direction.', choices: [{ id: 'quiet', label: 'Quiet glass · soft edges, low noise' }, { id: 'solid', label: 'Solid surfaces · crisp and readable' }], allowText: true } }], activeSessionId: base.id };
  if (scenario === 'plan') return { sessions: [{ ...base, request: { ...request, kind: 'plan', title: 'Make room for attention', description: 'Review the scope before the host starts any real work.', steps: ['Add a single activity surface to the existing layout.', 'Keep decisions explicit and controls semantic.', 'Check small screens, focus, and reduced motion.'] } }], activeSessionId: base.id };
  if (scenario === 'completion') return { sessions: [{ ...base, status: 'complete', title: 'Study complete', summary: 'The sample interface study is complete. Send a follow-up to the local demo host, or dismiss this session.', progress: { value: 3, max: 3, label: 'Sample checklist complete' } }], activeSessionId: base.id };
  return { sessions: [{ ...base, title: 'Interface', request: { ...request, kind: 'permission', title: 'Review needs a decision', description: 'This session is waiting. The other two keep their own host state.', command: 'npm run check' } }, { id: 'motion', title: 'Motion', status: 'working', model: 'Demo host', summary: 'Sample motion study in progress. No work is actually running.', progress: { value: 2, max: 3, label: 'Sample progress: 2 of 3' } }, { id: 'docs', title: 'Notes', status: 'complete', model: 'Demo host', summary: 'Sample handoff notes are ready. Send a local prompt or dismiss this session.' }], activeSessionId: base.id };
}
function cancel(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  tourRunning = false;
  get<HTMLButtonElement>('tour').textContent = 'Play 12s tour ▷';
  get<HTMLButtonElement>('tour').setAttribute('aria-pressed', 'false');
}
function select(scenario: Scenario, stop = true): void {
  if (!scenarios.includes(scenario)) throw new RangeError(`Unknown demo scenario: ${scenario}`);
  if (stop) cancel();
  currentScenario = scenario;
  revision++;
  snapshot = makeSnapshot(scenario);
  events = []; eventSequence = 0;
  relay.dataset.scenario = scenario;
  get('scene-label').textContent = labels[scenario];
  get('scene-number').textContent = `${String(scenarios.indexOf(scenario) + 1).padStart(2, '0')} / 06`;
  get('scene-note').textContent = notes[scenario];
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-scenario]')) button.setAttribute('aria-pressed', String(button.dataset.scenario === scenario));
  island.update({ snapshot, attachments: scenario === 'completion' ? { maxFiles: 2, maxBytes: 2 * 1024 * 1024, maxTotalBytes: 4 * 1024 * 1024 } : undefined });
  syncState();
  island.open();
  if (scenario === 'diff') host.querySelectorAll<HTMLDetailsElement>('details').forEach(details => { details.open = true; });
  log(`${labels[scenario]} loaded. The host supplies the state.`);
  announce(`${labels[scenario]}. This is a local simulation.`);
}
function setScenario(scenario: Scenario): void { select(scenario); }
function applyPreferences(): void {
  relay.dataset.motion = motion.checked ? 'reduced' : 'standard';
  relay.dataset.solid = String(solid.checked);
  island.update({ reducedMotion: motion.checked });
}
function clickAction(text: string): void {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(value => value.textContent?.trim() === text);
  button?.click();
}
function tour(): void {
  cancel();
  tourRunning = true;
  get<HTMLButtonElement>('tour').textContent = 'Stop tour Ⅱ';
  get<HTMLButtonElement>('tour').setAttribute('aria-pressed', 'true');
  select('permission', false);
  later(() => clickAction('Allow once'), 2200);
  later(() => select('diff', false), 4000);
  later(() => clickAction('Approve'), 6400);
  later(() => {
    select('completion', false);
    // Attachments remain available in the interactive Complete scenario. This
    // short tour opts out through the public API to keep its prompt in view.
    island.update({ attachments: undefined });
    // The film uses the same real composer and callback as a user, not a fake response.
    const input = host.querySelector<HTMLTextAreaElement>('.lg-activity-composer textarea');
    if (input) { input.value = 'Explore a quieter mobile layout'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  }, 8000);
  later(() => {
    const form = host.querySelector<HTMLFormElement>('.lg-activity-composer');
    const panel = host.querySelector<HTMLElement>('.lg-activity-panel');
    if (form && panel) {
      const bottom = form.offsetTop + form.offsetHeight;
      panel.scrollTop = Math.max(0, bottom - panel.clientHeight + 14);
    }
    form?.requestSubmit();
  }, 10400);
  later(() => { cancel(); announce('The twelve-second tour is complete. All work shown was simulated locally.'); }, 12000);
}
function reset(): void { select('permission'); }
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-scenario]')) button.addEventListener('click', () => setScenario(button.dataset.scenario as Scenario));
motion.addEventListener('change', () => { cancel(); applyPreferences(); });
solid.addEventListener('change', () => { cancel(); applyPreferences(); });
get('tour').addEventListener('click', () => tourRunning ? cancel() : tour());
get('reset').addEventListener('click', reset);
// An intentional interaction takes over from the finite film; no unattended loop resumes.
host.addEventListener('pointerdown', () => { if (tourRunning) cancel(); });
host.addEventListener('keydown', () => { if (tourRunning) cancel(); });
const syncMotionPreference = () => { motion.checked = motionPreference.matches; cancel(); applyPreferences(); };
const syncTransparencyPreference = () => { solid.checked = transparencyPreference.matches; cancel(); applyPreferences(); };
motionPreference.addEventListener('change', syncMotionPreference);
transparencyPreference.addEventListener('change', syncTransparencyPreference);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
window.addEventListener('pagehide', () => { destroyed = true; cancel(); island.destroy(); motionPreference.removeEventListener('change', syncMotionPreference); transparencyPreference.removeEventListener('change', syncTransparencyPreference); });

declare global {
  interface Window {
    __islandDemo: { setScenario: (scenario: Scenario) => void; tour: () => void; reset: () => void; cancel: () => void; readonly scenario: Scenario };
  }
}
window.__islandDemo = { setScenario, tour, reset, cancel, get scenario() { return currentScenario; } };
applyPreferences();
reset();
