/** Host-owned activity UI. This module performs no execution, authorization or uploads. */
export interface GlassActivityRequestBase {
  id: string;
  /** Change whenever a server proposal changes. Revalidate this token on the server. */
  revision: string | number;
  title: string;
  description?: string;
}
export type GlassActivityRequest = GlassActivityRequestBase & (
  | { kind: 'permission'; command: string }
  | { kind: 'diff'; files: readonly { path: string; before: string; after: string }[] }
  | { kind: 'question'; choices?: readonly { id: string; label: string }[]; allowText?: boolean }
  | { kind: 'plan'; steps: readonly string[] }
);
export interface GlassActivitySession {
  id: string;
  title: string;
  status: 'working' | 'attention' | 'idle' | 'complete' | 'error';
  model?: string;
  context?: string;
  /** Display-only text supplied by the host; the library never infers usage. */
  usage?: string;
  summary?: string;
  progress?: { value: number; max: number; label?: string };
  request?: GlassActivityRequest;
}
export interface GlassActivitySnapshot {
  sessions: readonly GlassActivitySession[];
  activeSessionId?: string;
}
export interface GlassActivityAction {
  sessionId: string;
  requestId?: string;
  revision?: string | number;
  action: 'approve' | 'deny' | 'answer' | 'revise' | 'select-session' | 'dismiss';
  answer?: { choiceId?: string; text?: string };
}
export interface GlassActivityPrompt {
  sessionId: string;
  text: string;
  /** Validated local images only. The host decides whether/how to upload them. */
  files: readonly File[];
}
export interface GlassActivityIslandOptions {
  snapshot?: GlassActivitySnapshot;
  label?: string;
  reducedMotion?: boolean;
  onAction?: (action: GlassActivityAction) => void | Promise<void>;
  onPrompt?: (prompt: GlassActivityPrompt) => void | Promise<void>;
  /** Explicit opt-in. Defaults: 3 files, 5 MiB per image, 15 MiB total. */
  attachments?: { maxFiles?: number; maxBytes?: number; maxTotalBytes?: number };
}
export interface GlassActivityIsland {
  /** Snapshots replace the session list; options merge with the existing options. */
  update(next: GlassActivitySnapshot | GlassActivityIslandOptions): void;
  open(): void;
  close(): void;
  destroy(): void;
}

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
let sequence = 0;
const bounded = (value: number | undefined, fallback: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(1, Math.floor(value))) : fallback;
const token = (session: GlassActivitySession) => session.request ?
  JSON.stringify([session.id, session.request.id, session.request.revision, session.request.kind]) : null;
function sameRequest(a?: GlassActivityRequest, b?: GlassActivityRequest): boolean {
  if (!a || !b) return a === b;
  if (a.id !== b.id || a.revision !== b.revision || a.kind !== b.kind || a.title !== b.title || a.description !== b.description) return false;
  if (a.kind === 'permission' && b.kind === 'permission') return a.command === b.command;
  if (a.kind === 'plan' && b.kind === 'plan') return a.steps.length === b.steps.length && a.steps.every((step, index) => step === b.steps[index]);
  if (a.kind === 'diff' && b.kind === 'diff') return a.files.length === b.files.length && a.files.every((file, index) => {
    const other = b.files[index]; return file.path === other.path && file.before === other.before && file.after === other.after;
  });
  if (a.kind === 'question' && b.kind === 'question') {
    const first = a.choices ?? [], second = b.choices ?? [];
    return a.allowText === b.allowText && first.length === second.length && first.every((choice, index) => choice.id === second[index].id && choice.label === second[index].label);
  }
  return false;
}
function copySnapshot(input: GlassActivitySnapshot): GlassActivitySnapshot {
  const seen = new Set<string>();
  return { activeSessionId: input.activeSessionId, sessions: input.sessions.map(session => {
    if (!session.id || seen.has(session.id)) throw new RangeError('Activity session IDs must be nonempty and unique');
    seen.add(session.id);
    let request = session.request;
    if (request) {
      if (!request.id || (typeof request.revision !== 'string' && typeof request.revision !== 'number') ||
        (typeof request.revision === 'number' && !Number.isFinite(request.revision))) {
        throw new RangeError('Activity requests require an ID and a finite revision');
      }
      if (!['permission', 'diff', 'question', 'plan'].includes(request.kind)) throw new RangeError('Unknown activity request kind');
      request = { ...request };
      if (request.kind === 'diff') request.files = request.files.map(file => ({ ...file }));
      if (request.kind === 'plan') request.steps = [...request.steps];
      if (request.kind === 'question') {
        const choices = new Set<string>();
        request.choices = request.choices?.map(choice => {
          if (!choice.id || choices.has(choice.id)) throw new RangeError('Question choice IDs must be nonempty and unique');
          choices.add(choice.id); return { ...choice };
        });
      }
    }
    return { ...session, progress: session.progress ? { ...session.progress } : undefined, request };
  }) };
}

/**
 * Append one owned disclosure to a host; import /activity-island.css separately.
 * No global keyboard shortcuts, animation loop or focus stealing on host updates.
 * Request callbacks carry identity/revision for authoritative host revalidation.
 * A resolved callback means submitted, never proof that an action was executed.
 */
export function mountGlassActivityIsland(host: HTMLElement, initial: GlassActivityIslandOptions = {}): GlassActivityIsland {
  const doc = host.ownerDocument;
  if (!doc.defaultView) throw new Error('Activity island requires a browser document');
  let options = { ...initial, attachments: initial.attachments ? { ...initial.attachments } : undefined }, snapshot = copySnapshot(initial.snapshot ?? { sessions: [] });
  let destroyed = false, expanded = false, activeId = snapshot.activeSessionId ?? snapshot.sessions[0]?.id;
  let previousFocus: HTMLElement | null = null;
  const drafts = new Map<string, { id: number; text: string; files: File[] }>();
  let draftSequence = 0;
  const answers = new Map<string, { choiceId?: string; text?: string }>();
  const pending = new Set<string>(), submitted = new Set<string>();
  const failures = new Map<string, string>();
  const generations = new Map<string, number>(), sessionGenerations = new WeakMap<GlassActivitySession, number>();
  let generation = 0;
  function register(next: GlassActivitySnapshot, previous?: GlassActivitySnapshot) {
    const beforeById = new Map(previous?.sessions.map(session => [session.id, session]));
    const live = new Set(next.sessions.map(session => session.id));
    for (const session of next.sessions) {
      const before = beforeById.get(session.id);
      if (!before || !sameRequest(before.request, session.request)) generations.set(session.id, ++generation);
      sessionGenerations.set(session, generations.get(session.id)!);
    }
    for (const sessionId of generations.keys()) if (!live.has(sessionId)) generations.delete(sessionId);
  }
  register(snapshot);
  const requestKey = (session: GlassActivitySession) => session.request ? JSON.stringify([token(session), sessionGenerations.get(session)]) : null;
  const auxiliaryKey = (session: GlassActivitySession, kind: string) => JSON.stringify([session.id, kind, sessionGenerations.get(session)]);
  const promptKey = (sessionId: string) => JSON.stringify([sessionId, 'prompt', drafts.get(sessionId)?.id]);
  function validImages(files: readonly File[]) {
    if (!options.attachments) return files.length === 0;
    const limits = options.attachments;
    return files.length <= bounded(limits.maxFiles, 3, 10) &&
      files.every(file => imageTypes.has(file.type) && file.size > 0 && file.size <= bounded(limits.maxBytes, 5 * 1024 * 1024, 20 * 1024 * 1024)) &&
      files.reduce((sum, file) => sum + file.size, 0) <= bounded(limits.maxTotalBytes, 15 * 1024 * 1024, 50 * 1024 * 1024);
  }
  const root = doc.createElement('section'); root.className = 'lg-activity-island';
  const toggle = doc.createElement('button'); toggle.type = 'button'; toggle.className = 'lg-activity-toggle';
  const panel = doc.createElement('div'); panel.className = 'lg-activity-panel';
  let id: string;
  do { id = `lg-activity-${++sequence}`; } while (doc.getElementById(`${id}-panel`) || doc.getElementById(`${id}-title`));
  panel.id = `${id}-panel`; panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', `${id}-title`);
  toggle.setAttribute('aria-controls', panel.id); toggle.setAttribute('aria-expanded', 'false');
  const status = doc.createElement('span'); status.className = 'lg-activity-live';
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  root.append(toggle, panel, status); host.append(root);

  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (text: string, key: string, callback: () => void) => {
    const element = node('button', text); element.type = 'button'; element.dataset.lgFocus = key;
    element.addEventListener('click', callback); return element;
  };
  const currentSession = () => snapshot.sessions.find(session => session.id === activeId);
  const current = (sessionId: string, expected: string | null, expectedGeneration?: number) => !destroyed &&
    snapshot.sessions.some(session => session.id === sessionId && token(session) === expected &&
      (expectedGeneration === undefined || sessionGenerations.get(session) === expectedGeneration));
  const announce = (message: string) => { if (!destroyed) status.textContent = message; };
  const focusedKey = () => {
    const focused = doc.activeElement as HTMLInputElement | null;
    return focused && panel.contains(focused) ? { key: focused.dataset.lgFocus, start: focused.selectionStart, end: focused.selectionEnd } : null;
  };
  function restore(key: ReturnType<typeof focusedKey>) {
    if (!key?.key) return;
    const candidate = [...panel.querySelectorAll<HTMLElement>('[data-lg-focus]')].find(element => element.dataset.lgFocus === key.key);
    if (candidate && !candidate.matches(':disabled')) {
      candidate.focus({ preventScroll: true });
      if (candidate.tagName === 'TEXTAREA' || candidate.tagName === 'INPUT') {
        try { (candidate as HTMLInputElement).setSelectionRange(key.start, key.end); } catch { /* Non-text inputs. */ }
      }
    } else if (expanded) toggle.focus({ preventScroll: true });
  }
  function setExpanded(value: boolean) {
    if (destroyed || expanded === value) return;
    if (value) previousFocus = doc.activeElement instanceof doc.defaultView!.HTMLElement ? doc.activeElement as HTMLElement : null;
    const focusInside = panel.contains(doc.activeElement);
    expanded = value; panel.hidden = !value; toggle.setAttribute('aria-expanded', String(value));
    root.dataset.expanded = String(value);
    if (!value && focusInside) {
      const target = previousFocus?.isConnected && !panel.contains(previousFocus) ? previousFocus : toggle;
      target.focus({ preventScroll: true });
    }
  }
  async function action(session: GlassActivitySession, kind: GlassActivityAction['action'], answer?: GlassActivityAction['answer']) {
    const expected = token(session), expectedGeneration = sessionGenerations.get(session);
    const key = kind === 'select-session' || kind === 'dismiss' ? auxiliaryKey(session, kind) : requestKey(session)!;
    if (!options.onAction || !current(session.id, expected, expectedGeneration) || pending.has(key) || submitted.has(key)) return;
    pending.add(key); failures.delete(key); render();
    const payload: GlassActivityAction = { sessionId: session.id, action: kind };
    if (session.request && kind !== 'select-session' && kind !== 'dismiss') {
      payload.requestId = session.request.id; payload.revision = session.request.revision;
      if (answer) payload.answer = { ...answer };
    }
    try {
      await options.onAction(payload);
      if (current(session.id, expected, expectedGeneration) && kind !== 'select-session') { submitted.add(key); announce('Submitted to the host. Awaiting its update.'); }
    } catch {
      if (current(session.id, expected, expectedGeneration)) { failures.set(key, 'Could not submit. Try again.'); announce('Could not submit. Try again.'); }
    } finally { pending.delete(key); if (!destroyed) render(); }
  }
  function requestView(session: GlassActivitySession, request: GlassActivityRequest) {
    const expected = requestKey(session)!;
    const card = node('section', undefined, 'lg-activity-request');
    card.dataset.kind = request.kind;
    card.append(node('span', request.kind, 'lg-activity-kind'), node('h3', request.title));
    if (request.description) card.append(node('p', request.description));
    if (request.kind === 'permission') card.append(node('pre', request.command, 'lg-activity-code'));
    if (request.kind === 'plan') {
      const steps = node('ol'); request.steps.forEach(step => steps.append(node('li', step))); card.append(steps);
    }
    if (request.kind === 'diff') for (const file of request.files) {
      const details = node('details'); details.append(node('summary', file.path));
      const pair = node('div', undefined, 'lg-activity-diff');
      for (const [label, value] of [['Before', file.before], ['After', file.after]]) {
        const section = node('section'); section.append(node('h4', label), node('pre', value, 'lg-activity-code')); pair.append(section);
      }
      details.append(pair); card.append(details);
    }
    const locked = pending.has(expected) || submitted.has(expected) || !options.onAction;
    if (request.kind === 'question') {
      const answer = answers.get(expected) ?? {}; answers.set(expected, answer);
      const form = node('form'); const choices = node('fieldset'); choices.append(node('legend', 'Choose an answer'));
      request.choices?.forEach(choice => {
        const label = node('label', undefined, 'lg-activity-choice'), input = node('input');
        input.type = 'radio'; input.name = `${id}-choice`; input.value = choice.id;
        input.checked = answer.choiceId === choice.id; input.disabled = locked; input.dataset.lgFocus = `choice:${choice.id}`;
        input.addEventListener('change', () => { if (current(session.id, token(session), sessionGenerations.get(session))) answer.choiceId = choice.id; });
        label.append(input, node('span', choice.label)); choices.append(label);
      });
      if (request.choices?.length) form.append(choices);
      if (request.allowText || !request.choices?.length) {
        const label = node('label', 'Your answer'), input = node('textarea'); input.rows = 2; input.maxLength = 8000;
        input.value = answer.text ?? ''; input.disabled = locked; input.dataset.lgFocus = 'answer';
        input.addEventListener('input', () => { if (current(session.id, token(session), sessionGenerations.get(session))) answer.text = input.value; });
        label.append(input); form.append(label);
      }
      const submit = node('button', pending.has(expected) ? 'Submitting…' : submitted.has(expected) ? 'Submitted' : 'Send answer');
      submit.type = 'submit'; submit.disabled = locked; submit.dataset.lgFocus = 'answer-submit'; form.append(submit);
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!answer.choiceId && !answer.text?.trim()) { announce('Choose an answer or enter text.'); return; }
        void action(session, 'answer', { choiceId: answer.choiceId, text: answer.text?.trim() || undefined });
      }); card.append(form);
    } else {
      if (request.kind === 'plan') {
        const answer = answers.get(expected) ?? {}; answers.set(expected, answer);
        const label = node('label', 'Revision notes (optional)'), input = node('textarea');
        input.rows = 2; input.maxLength = 8000; input.value = answer.text ?? ''; input.disabled = locked; input.dataset.lgFocus = 'plan-notes';
        input.addEventListener('input', () => { if (current(session.id, token(session), sessionGenerations.get(session))) answer.text = input.value; });
        label.append(input); card.append(label);
        const revise = button('Request revision', 'revise', () => { void action(session, 'revise', { text: answer.text?.trim() || undefined }); });
        revise.disabled = locked; card.append(revise);
      }
      const actions = node('div', undefined, 'lg-activity-actions');
      const deny = button('Deny', 'deny', () => { void action(session, 'deny'); });
      const approve = button(request.kind === 'permission' ? 'Allow once' : 'Approve', 'approve', () => { void action(session, 'approve'); });
      deny.disabled = approve.disabled = locked; approve.className = 'lg-activity-primary'; actions.append(deny, approve); card.append(actions);
    }
    if (!options.onAction) card.append(node('p', 'Connect a host action handler to respond.', 'lg-activity-note'));
    else if (pending.has(expected) || submitted.has(expected)) card.append(node('p', pending.has(expected) ? 'Submitting to host…' : 'Submitted. Awaiting host update.', 'lg-activity-note'));
    if (failures.has(expected)) card.append(node('p', failures.get(expected), 'lg-activity-error'));
    return card;
  }
  function composer(session: GlassActivitySession) {
    const draft = drafts.get(session.id) ?? { id: ++draftSequence, text: '', files: [] }; drafts.set(session.id, draft);
    const key = promptKey(session.id);
    const form = node('form', undefined, 'lg-activity-composer');
    const label = node('label', 'Message this session'), input = node('textarea');
    input.rows = 2; input.maxLength = 8000; input.value = draft.text; input.dataset.lgFocus = 'prompt';
    input.disabled = pending.has(key) || !options.onPrompt;
    input.addEventListener('input', () => { draft.text = input.value.slice(0, 8000); }); label.append(input); form.append(label);
    if (options.attachments) {
      const attachmentLabel = node('label', 'Attach images'), upload = node('input'); upload.type = 'file'; upload.multiple = true;
      upload.accept = [...imageTypes].join(','); upload.dataset.lgFocus = 'attachments'; upload.disabled = input.disabled;
      upload.addEventListener('change', () => {
        if (destroyed || !options.attachments || drafts.get(session.id) !== draft || !snapshot.sessions.some(value => value.id === session.id) || pending.has(key)) return;
        const files = Array.from(upload.files ?? []), limits = options.attachments!;
        const maxFiles = bounded(limits.maxFiles, 3, 10);
        if (!validImages(files)) {
          failures.set(key, `Choose up to ${maxFiles} PNG, JPEG, WebP, GIF or AVIF images within the size limits.`);
          announce('Images rejected. Check the attachment limits.'); upload.value = '';
        } else { draft.files = files; failures.delete(key); }
        render();
      }); attachmentLabel.append(upload); form.append(attachmentLabel);
      if (draft.files.length) {
        const files = node('ul'); draft.files.forEach(file => files.append(node('li', file.name))); form.append(files);
        form.append(button('Remove images', 'remove-images', () => { if (!pending.has(key)) { draft.files = []; render(); } }));
      }
    }
    const submit = node('button', pending.has(key) ? 'Sending…' : 'Send prompt'); submit.type = 'submit';
    submit.disabled = input.disabled; submit.dataset.lgFocus = 'prompt-submit'; form.append(submit);
    if (!options.onPrompt) form.append(node('p', 'Connect a host prompt handler to send messages.', 'lg-activity-note'));
    if (failures.has(key)) form.append(node('p', failures.get(key), 'lg-activity-error'));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!options.onPrompt || destroyed || drafts.get(session.id) !== draft || pending.has(key) || !snapshot.sessions.some(value => value.id === session.id)) return;
      if (!validImages(draft.files)) { failures.set(key, 'Attachment limits changed. Remove the images and choose valid files.'); render(); return; }
      const text = draft.text.trim(); if (!text && !draft.files.length) { announce('Enter a prompt or attach an image.'); return; }
      pending.add(key); failures.delete(key); render();
      try {
        await options.onPrompt({ sessionId: session.id, text, files: [...draft.files] });
        if (!destroyed && drafts.get(session.id) === draft) { draft.text = ''; draft.files = []; announce('Prompt submitted to the host.'); }
      } catch { if (!destroyed && drafts.get(session.id) === draft) { failures.set(key, 'Could not send. Try again.'); announce('Could not send. Try again.'); } }
      finally { pending.delete(key); if (!destroyed) render(); }
    }); return form;
  }
  function metadata(session: GlassActivitySession) {
    const details = node('div', undefined, 'lg-activity-meta');
    details.append(node('span', session.status));
    for (const value of [session.model, session.context, session.usage]) if (value) details.append(node('span', value));
    if (session.progress && Number.isFinite(session.progress.max) && session.progress.max > 0 && Number.isFinite(session.progress.value)) {
      const progress = node('progress'); progress.max = session.progress.max; progress.value = Math.max(0, Math.min(progress.max, session.progress.value));
      progress.setAttribute('aria-label', session.progress.label ?? 'Session progress'); details.append(progress);
    }
    return details;
  }
  function render(compactOnly = false) {
    if (destroyed) return;
    const focus = focusedKey(), session = currentSession();
    root.dataset.reducedMotion = String(Boolean(options.reducedMotion));
    const attention = snapshot.sessions.filter(value => value.request).length;
    toggle.replaceChildren(node('span', undefined, 'lg-activity-dot'), node('span', session?.title ?? options.label ?? 'Activity'),
      node('span', `${attention || snapshot.sessions.length}`, 'lg-activity-count'));
    toggle.setAttribute('aria-label', `${options.label ?? 'Activity island'}: ${snapshot.sessions.length} sessions, ${attention} requests`);
    if (compactOnly && session) {
      panel.querySelector('.lg-activity-meta')?.replaceWith(metadata(session));
      return;
    }
    panel.replaceChildren(); panel.hidden = !expanded;
    const header = node('div', undefined, 'lg-activity-header'), title = node('h2', options.label ?? 'Activity island'); title.id = `${id}-title`;
    header.append(title, button('Close', 'close', () => setExpanded(false))); panel.append(header);
    if (!snapshot.sessions.length) { panel.append(node('p', 'No active sessions.')); restore(focus); return; }
    const sessions = node('nav', undefined, 'lg-activity-sessions'); sessions.setAttribute('aria-label', 'Sessions');
    snapshot.sessions.forEach(value => {
      const select = button(value.title, `session:${value.id}`, () => {
        if (!current(value.id, token(value), sessionGenerations.get(value))) return;
        activeId = value.id; render(); void action(value, 'select-session');
      }); select.setAttribute('aria-pressed', String(value.id === activeId)); sessions.append(select);
    }); panel.append(sessions);
    if (session) {
      panel.append(metadata(session));
      if (session.request) panel.append(requestView(session, session.request));
      else panel.append(node('p', session.summary ?? (session.status === 'working' ? 'The host reports this session is working.' : 'No pending request.'), 'lg-activity-note'));
      panel.append(composer(session));
      if (session.status === 'complete' || session.status === 'idle' || session.status === 'error') {
        const dismiss = button('Dismiss session', 'dismiss', () => { void action(session, 'dismiss'); });
        const key = auxiliaryKey(session, 'dismiss'); dismiss.disabled = !options.onAction || pending.has(key) || submitted.has(key); panel.append(dismiss);
      }
    } restore(focus);
  }
  const toggleClick = () => setExpanded(!expanded);
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && expanded && root.contains(event.target as Node)) { event.preventDefault(); setExpanded(false); }
  };
  toggle.addEventListener('click', toggleClick); root.addEventListener('keydown', escape);
  render(); root.dataset.expanded = 'false';
  return {
    open() { setExpanded(true); }, close() { setExpanded(false); },
    update(next) {
      if (destroyed) return;
      const replacement = 'sessions' in next ? copySnapshot(next) : next.snapshot ? copySnapshot(next.snapshot) : snapshot;
      const before = currentSession(), beforeActive = activeId;
      const compactOnly = 'sessions' in next && snapshot.sessions.length === replacement.sessions.length && snapshot.sessions.every((session, index) => {
        const other = replacement.sessions[index];
        return session.id === other.id && session.title === other.title && session.status === other.status && session.summary === other.summary && sameRequest(session.request, other.request);
      });
      if (!('sessions' in next)) {
        options = { ...options, ...next };
        if (next.attachments) options.attachments = { ...next.attachments };
        if ('attachments' in next && !next.attachments) for (const draft of drafts.values()) draft.files = [];
      }
      register(replacement, snapshot);
      snapshot = replacement;
      activeId = snapshot.activeSessionId && snapshot.sessions.some(session => session.id === snapshot.activeSessionId) ? snapshot.activeSessionId :
        snapshot.sessions.some(session => session.id === activeId) ? activeId : snapshot.sessions[0]?.id;
      const live = new Set(snapshot.sessions.map(session => session.id)), requests = new Set(snapshot.sessions.map(requestKey).filter((value): value is string => value !== null));
      for (const key of drafts.keys()) if (!live.has(key)) drafts.delete(key);
      for (const key of answers.keys()) if (!requests.has(key)) answers.delete(key);
      const valid = new Set([...requests, ...snapshot.sessions.flatMap(session => [auxiliaryKey(session, 'dismiss'), auxiliaryKey(session, 'select-session'), promptKey(session.id)])]);
      for (const key of submitted) if (!valid.has(key)) submitted.delete(key);
      for (const key of failures.keys()) if (!valid.has(key)) failures.delete(key);
      for (const key of pending) if (!valid.has(key)) pending.delete(key);
      render(compactOnly && beforeActive === activeId && Boolean(before));
    },
    destroy() {
      if (destroyed) return;
      setExpanded(false); destroyed = true;
      toggle.removeEventListener('click', toggleClick); root.removeEventListener('keydown', escape); root.remove();
      drafts.clear(); answers.clear(); pending.clear(); submitted.clear(); failures.clear();
    },
  };
}
