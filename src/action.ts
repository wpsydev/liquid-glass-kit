export type GlassActionStatus = 'idle' | 'pending' | 'submitted' | 'success' | 'error' | 'cancelled';
export type GlassActionResult = { status: 'success' | 'submitted'; message?: string; receipt?: unknown } | { status: 'error'; message?: string; retryable?: boolean };
export interface GlassActionState {
  readonly status: GlassActionStatus;
  readonly message: string;
  readonly retryable: boolean;
  readonly error?: unknown;
  readonly result?: Readonly<GlassActionResult>;
}
export interface GlassActionContext {
  readonly signal: AbortSignal;
  readonly generation: number;
  readonly target: HTMLButtonElement | HTMLFormElement;
  readonly submitter: HTMLButtonElement | HTMLInputElement | null;
  readonly formData: FormData | null;
}
export interface GlassActionOptions {
  /** void means submitted without confirmation. Success requires an explicit host result. */
  run: (context: GlassActionContext) => void | GlassActionResult | Promise<void | GlassActionResult>;
  /** Optional authored text-only span, preserving the button/icon node identities. */
  labelElement?: HTMLElement;
  labels?: Partial<Record<GlassActionStatus, string>>;
  /** Authored text-only live region OUTSIDE the changing target. Host supplies its role/label. */
  statusElement?: HTMLElement;
  onState?: (state: GlassActionState) => void;
  /** Rejected work is nonretryable unless the host explicitly confirms this policy. */
  isRetryable?: (error: unknown) => boolean;
}
export interface GlassAction {
  readonly state: GlassActionState;
  /** Form invokes validate live values and include the permitted, associated submitter. */
  invoke(submitter?: HTMLButtonElement | HTMLInputElement | null): Promise<GlassActionState>;
  /** Explicit retry of current live form values, only after a host-confirmed retryable error. */
  retry(): Promise<GlassActionState>;
  /** Local outcome plus cooperative AbortSignal intent; never promises backend rollback. */
  cancel(): boolean;
  reset(): void;
  destroy(): void;
}
const statuses: readonly GlassActionStatus[] = ['idle', 'pending', 'submitted', 'success', 'error', 'cancelled'];
const messages: Record<GlassActionStatus, string> = { idle: '', pending: 'Working…', submitted: 'Submitted to host. Confirmation is pending.', success: 'Host confirmed completion.', error: 'The action failed.', cancelled: 'Cancelled locally. Remote work may still continue.' };
const defaultLabels: Partial<Record<GlassActionStatus, string>> = { pending: 'Working…', submitted: 'Submitted', success: 'Done', error: 'Action failed', cancelled: 'Cancelled' };
const attached = new WeakSet<HTMLElement>(), texts = new WeakSet<HTMLElement>();
type Lease = { write(value: string | null): void; restore(): void };
function text(value: unknown, maximum: number, field: string): string { if (typeof value !== 'string' || value.length > maximum) throw new RangeError(`${field} must be text of at most ${maximum} characters`); return value; }
function attribute(element: HTMLElement, key: string): Lease {
  const original = element.getAttribute(key); let owned = original, lost = false;
  return { write(value) { if (lost || element.getAttribute(key) !== owned) { lost = true; return; } owned = value; value === null ? element.removeAttribute(key) : element.setAttribute(key, value); }, restore() {
    if (lost || element.getAttribute(key) !== owned) return; original === null ? element.removeAttribute(key) : element.setAttribute(key, original);
  } };
}
function textLease(element?: HTMLElement): Lease | undefined {
  if (!element) return;
  const original = element.textContent ?? '', existing = element.firstChild as Text | null;
  let node = existing, owned = original, lost = false;
  return { write(value) {
    if (lost || element.textContent !== owned || (node && (node.parentNode !== element || element.childNodes.length !== 1))) { lost = true; return; }
    owned = value ?? ''; if (!node) { if (!owned) return; node = element.ownerDocument.createTextNode(owned); element.append(node); } else node.data = owned;
  }, restore() {
    if (lost || element.textContent !== owned || (node && node.parentNode !== element)) return;
    if (existing) existing.data = original; else node?.remove();
  } };
}
function frozen(status: GlassActionStatus, details: Partial<Omit<GlassActionState, 'status'>> = {}): GlassActionState { return Object.freeze({ status, message: messages[status], retryable: false, ...details }); }

/** Enhance an authored type=button; navigation anchors remain ordinary anchors. */
export function attachGlassAction(button: HTMLButtonElement, options: GlassActionOptions): GlassAction {
  const browser = button?.ownerDocument.defaultView;
  if (!browser || !(button instanceof browser.HTMLButtonElement) || button.type !== 'button') throw new Error('Glass actions require an authored native type=button');
  return attach(button, options, false);
}
/**
 * Explicitly replace this form's native submission with one host action path.
 * Host owns any other submit listeners: this cannot deduplicate unrelated handlers.
 * Normal browser submission validates first; invoke also validates unless native
 * novalidate/formnovalidate applies. No submit()/requestSubmit() recursion, anchor
 * interception, form reset, value replacement, or native disabled mutation occurs.
 * FormData(form, submitter) uses native successful-control serialization; image
 * submitter coordinates follow that constructor, not a captured pointer location.
 */
export function attachGlassFormAction(form: HTMLFormElement, options: GlassActionOptions): GlassAction {
  const browser = form?.ownerDocument.defaultView;
  if (!browser || !(form instanceof browser.HTMLFormElement)) throw new Error('Glass form actions require an authored native form');
  return attach(form, options, true);
}
function attach(target: HTMLButtonElement | HTMLFormElement, input: GlassActionOptions, isForm: boolean): GlassAction {
  const doc = target.ownerDocument, browser = doc.defaultView!;
  if (!target.isConnected || attached.has(target)) throw new Error('Use a connected action target with no existing action controller');
  if (!input || typeof input.run !== 'function') throw new TypeError('Glass actions require a host run callback');
  const { run, onState, isRetryable, labelElement, statusElement } = input;
  for (const element of [labelElement, statusElement]) if (element && (!(element instanceof browser.HTMLElement) || element.ownerDocument !== doc || !element.isConnected || element.childNodes.length > 1 || (element.firstChild && element.firstChild.nodeType !== 3) || texts.has(element))) throw new Error('Use unowned connected text-only label/status elements in the same document');
  if (labelElement && !target.contains(labelElement)) throw new Error('The label element must be inside the action target');
  if (statusElement && (target.contains(statusElement) || statusElement.contains(target))) throw new Error('The authored status region must be outside the changing action target');
  const labels = { ...defaultLabels, ...input.labels }; for (const key of statuses) if (labels[key] !== undefined) text(labels[key], 120, 'Action label');
  const originalLabel = labelElement?.textContent ?? '';
  const label = textLease(labelElement), status = textLease(statusElement), stateAttribute = attribute(target, 'data-lg-action-state'), busy = attribute(target, 'aria-busy'), disabled = attribute(target, 'aria-disabled');
  const originalBusy = target.getAttribute('aria-busy'), originalDisabled = target.getAttribute('aria-disabled');
  let state = frozen('idle'), destroyed = false, generation = 0;
  let current: { controller: AbortController; promise: Promise<GlassActionState>; resolve(state: GlassActionState): void; generation: number } | null = null;
  let lastSubmitter: HTMLButtonElement | HTMLInputElement | null = null;
  const report = (error: unknown, phase: 'state' | 'retry-policy') => target.dispatchEvent(new browser.CustomEvent('lg-action-error', { bubbles: true, detail: { error, phase } }));
  function render(next: GlassActionState, notify = true) {
    state = next; stateAttribute.write(next.status); busy.write(next.status === 'pending' ? 'true' : originalBusy);
    disabled.write(next.status === 'pending' || next.status === 'submitted' ? 'true' : originalDisabled);
    label?.write(labels[next.status] ?? originalLabel); status?.write(next.message);
    if (notify) { try { onState?.(next); } catch (error) { report(error, 'state'); } }
  }
  function outcome(value: void | GlassActionResult): GlassActionState {
    if (value === undefined) return frozen('submitted');
    if (!value || typeof value !== 'object' || !['success', 'submitted', 'error'].includes(value.status)) throw new TypeError('Host action must return an explicit success/submitted/error result or void');
    if (value.message !== undefined) text(value.message, 500, 'Action message');
    if (value.status === 'error' && value.retryable !== undefined && typeof value.retryable !== 'boolean') throw new TypeError('Host retryability must be explicit boolean');
    const result = Object.freeze({ ...value }); return frozen(value.status, { message: value.message ?? messages[value.status], retryable: value.status === 'error' && value.retryable === true, result });
  }
  function rejected(error: unknown, retryPolicy = true): GlassActionState {
    let retryable = false;
    if (retryPolicy) { try { retryable = isRetryable?.(error) === true; } catch (policyError) { report(policyError, 'retry-policy'); } }
    return frozen('error', { error, retryable });
  }
  function permitted(submitter: HTMLButtonElement | HTMLInputElement | null) {
    if (!isForm) { if (submitter) throw new Error('Standalone button actions do not accept a form submitter'); return; }
    if (submitter && (!(submitter instanceof browser.HTMLButtonElement || submitter instanceof browser.HTMLInputElement) || submitter.form !== target || !['submit', 'image'].includes(submitter.type))) throw new Error('Use an associated native submit button/input as the form submitter');
  }
  function invoke(submitter: HTMLButtonElement | HTMLInputElement | null = null): Promise<GlassActionState> {
    if (destroyed) return Promise.resolve(state); permitted(submitter);
    if (current) return current.promise;
    if (!target.isConnected || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true' || submitter?.matches(':disabled,[aria-disabled="true"]') || state.status === 'submitted' || (state.status === 'error' && !state.retryable)) return Promise.resolve(state);
    const form = isForm ? target as HTMLFormElement : null;
    if (form && !form.noValidate && !submitter?.formNoValidate && !form.reportValidity()) return Promise.resolve(state);
    let formData: FormData | null = null;
    try { if (form) formData = submitter ? new browser.FormData(form, submitter) : new browser.FormData(form); } catch (error) { const next = rejected(error, false); render(next); return Promise.resolve(next); }
    let resolve!: (state: GlassActionState) => void; const promise = new Promise<GlassActionState>(yes => { resolve = yes; });
    const operation = { controller: new browser.AbortController(), promise, resolve, generation: ++generation }; current = operation; lastSubmitter = submitter;
    const context = Object.freeze({ signal: operation.controller.signal, generation: operation.generation, target, submitter, formData });
    render(frozen('pending'));
    function finish(next: GlassActionState) { if (destroyed || current !== operation) return; current = null; render(next); operation.resolve(next); }
    void Promise.resolve().then(() => current === operation && !destroyed ? run(context) : undefined).then(value => {
      if (destroyed || current !== operation) return;
      try { finish(outcome(value)); } catch (error) { finish(rejected(error, false)); }
    }, error => { if (!destroyed && current === operation) finish(rejected(error)); });
    return promise;
  }
  function cancel() {
    if (destroyed || !current) return false;
    const previous = current; current = null; generation++; const next = frozen('cancelled'); render(next); previous.controller.abort(); previous.resolve(next); return true;
  }
  function reset() {
    if (destroyed) return; const previous = current; current = null; generation++; lastSubmitter = null; render(frozen('idle')); if (previous) { previous.controller.abort(); previous.resolve(frozen('cancelled')); }
  }
  const click = (event: MouseEvent) => { if (!event.defaultPrevented) void invoke(); };
  const submit = (event: SubmitEvent) => { if (event.defaultPrevented) return; event.preventDefault(); try { void invoke(event.submitter as HTMLButtonElement | HTMLInputElement | null); } catch (error) { if (!current) render(rejected(error, false)); else report(error, 'state'); } };
  attached.add(target); if (labelElement) texts.add(labelElement); if (statusElement) texts.add(statusElement);
  if (isForm) target.addEventListener('submit', submit as EventListener); else target.addEventListener('click', click as EventListener);
  render(state);
  return {
    get state() { return state; }, invoke, retry: () => state.status === 'error' && state.retryable ? invoke(lastSubmitter) : Promise.resolve(state), cancel, reset,
    destroy() {
      if (destroyed) return; destroyed = true; const previous = current; current = null; generation++;
      if (isForm) target.removeEventListener('submit', submit as EventListener); else target.removeEventListener('click', click as EventListener);
      if (previous) { state = frozen('cancelled'); previous.controller.abort(); previous.resolve(state); }
      label?.restore(); status?.restore(); stateAttribute.restore(); busy.restore(); disabled.restore(); attached.delete(target); if (labelElement) texts.delete(labelElement); if (statusElement) texts.delete(statusElement);
    },
  };
}
