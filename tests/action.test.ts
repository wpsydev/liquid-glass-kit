import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassAction, attachGlassFormAction } from '../src/action.js';
import type { GlassAction, GlassActionContext, GlassActionOptions, GlassActionResult } from '../src/action.js';

const controllers: GlassAction[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); document.body.replaceChildren(); vi.restoreAllMocks(); });
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function buttonFixture(options: Partial<GlassActionOptions> = {}) {
  const button = document.createElement('button'); button.type = 'button'; button.innerHTML = '<span aria-hidden="true">↗</span><span id="label">Export note</span>'; const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = 'Ready'; document.body.append(button, status);
  const run = vi.fn(() => ({ status: 'success' as const, message: 'Local export prepared' })); const controller = attachGlassAction(button, { run, labelElement: button.lastElementChild as HTMLElement, statusElement: status, ...options }); controllers.push(controller); return { button, status, label: button.lastElementChild as HTMLElement, controller, run };
}
function formFixture(options: Partial<GlassActionOptions> = {}) {
  const form = document.createElement('form'); form.innerHTML = '<label>Title<input name="title" required value="A useful note"></label><input name="ignored" disabled value="omit"><button type="submit" name="intent" value="save"><span>Save note</span></button><button type="submit" name="intent" value="publish">Publish</button>';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); document.body.append(form, status); const buttons = [...form.querySelectorAll<HTMLButtonElement>('button')], field = form.querySelector('input')!;
  const run = vi.fn(() => ({ status: 'success' as const, message: 'Saved locally' })); const controller = attachGlassFormAction(form, { run, labelElement: buttons[0].firstElementChild as HTMLElement, statusElement: status, ...options }); controllers.push(controller); return { form, status, buttons, field, controller, run };
}

describe('optional host action lifecycle', () => {
  it('keeps authored button/icon/text-node identity, native disabled values and focus during pending', async () => {
    const gate = deferred<GlassActionResult>(), { button, label, controller, status } = buttonFixture({ run: () => gate.promise }); const nodes = [...button.childNodes], text = label.firstChild; button.focus();
    const task = controller.invoke(); expect(controller.state.status).toBe('pending'); expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.getAttribute('aria-busy')).toBe('true'); expect(document.activeElement).toBe(button); expect(status.textContent).toBe('Working…');
    gate.resolve({ status: 'success', message: 'Blob prepared' }); expect((await task).status).toBe('success'); expect([...button.childNodes]).toEqual(nodes); expect(label.firstChild).toBe(text); expect(document.activeElement).toBe(button); expect(button.hasAttribute('aria-busy')).toBe(false); expect(button.hasAttribute('aria-disabled')).toBe(false);
  });
  it('blocks rapid duplicate actual activation and shares one pending invocation promise', async () => {
    const gate = deferred<GlassActionResult>(), host = vi.fn(() => gate.promise), { button, controller } = buttonFixture({ run: host });
    button.click(); button.click(); const first = controller.invoke(), second = controller.invoke(); expect(first).toBe(second); await flush(); expect(host).toHaveBeenCalledOnce(); gate.resolve({ status: 'success' }); await first; expect(controller.state.status).toBe('success');
  });
  it('leaves keyboard Enter/Space native and honors default-prevented clicks', async () => {
    const { button, controller, run } = buttonFixture(); for (const key of ['Enter', ' ']) { const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); button.dispatchEvent(event); expect(event.defaultPrevented).toBe(false); }
    const click = new MouseEvent('click', { bubbles: true, cancelable: true }); click.preventDefault(); button.dispatchEvent(click); await flush(); expect(run).not.toHaveBeenCalled(); expect(controller.state.status).toBe('idle');
  });
  it('respects authored disabled/aria-disabled and restores authored busy/labels/status attributes', async () => {
    const { button, controller, run } = buttonFixture(); button.disabled = true; await controller.invoke(); expect(run).not.toHaveBeenCalled(); button.disabled = false; button.setAttribute('aria-disabled', 'true'); await controller.invoke(); expect(run).not.toHaveBeenCalled();
    controller.destroy(); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.disabled).toBe(false);
  });
  it('does not infer success from resolution without host confirmation and locks submitted until reset', async () => {
    const host = vi.fn(() => undefined), { controller, button } = buttonFixture({ run: host }); expect((await controller.invoke()).status).toBe('submitted'); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(controller.state.message).toContain('Confirmation'); expect((await controller.invoke()).status).toBe('submitted'); expect(host).toHaveBeenCalledOnce();
    controller.reset(); expect(controller.state.status).toBe('idle'); expect(button.hasAttribute('aria-disabled')).toBe(false);
  });
  it('accepts explicit submitted/success/error messages as plain text without pretending to validate receipts', async () => {
    const receipt = { local: true }; const { controller, status } = buttonFixture({ run: () => ({ status: 'success', message: '<script>not HTML</script>', receipt }) }); const state = await controller.invoke(); expect(state.status).toBe('success'); expect(status.textContent).toBe('<script>not HTML</script>'); expect(status.querySelector('script')).toBeNull(); expect(state.result && 'receipt' in state.result && state.result.receipt).toBe(receipt);
  });
  it('preserves rejected host errors and disables retries unless the host confirms retryability', async () => {
    const error = new Error('private server detail'), host = vi.fn(() => Promise.reject(error)); const { controller, status } = buttonFixture({ run: host }); const outcome = await controller.invoke(); expect(outcome.status).toBe('error'); expect(outcome.error).toBe(error); expect(outcome.retryable).toBe(false); expect(status.textContent).not.toContain('private');
    await controller.retry(); await controller.invoke(); expect(host).toHaveBeenCalledOnce(); controller.reset(); await controller.invoke(); expect(host).toHaveBeenCalledTimes(2);
  });
  it('retries only by explicit activation after an explicit retryable error', async () => {
    let calls = 0; const { controller } = buttonFixture({ run: () => ++calls === 1 ? { status: 'error', message: 'Try a local export again', retryable: true } : { status: 'success' } }); expect((await controller.invoke()).retryable).toBe(true); expect(calls).toBe(1); expect((await controller.retry()).status).toBe('success'); expect(calls).toBe(2);
  });
  it('uses host rejection retry policy and catches policy exceptions without losing original errors', async () => {
    const error = Error('Host work'), policyError = Error('Policy failure'); const { controller, button } = buttonFixture({ run: () => Promise.reject(error), isRetryable() { throw policyError; } }); const report = vi.fn(); button.addEventListener('lg-action-error', report);
    const state = await controller.invoke(); expect(state.error).toBe(error); expect(state.retryable).toBe(false); expect((report.mock.calls[0][0] as CustomEvent).detail.error).toBe(policyError);
  });
  it('settles cancellation immediately, signals cooperative work and ignores a late success', async () => {
    const gate = deferred<GlassActionResult>(); let signal!: AbortSignal; const { controller, button } = buttonFixture({ run(context) { signal = context.signal; return gate.promise; } }); const task = controller.invoke(); await flush(); expect(controller.cancel()).toBe(true); expect(signal.aborted).toBe(true); expect((await task).status).toBe('cancelled'); expect(controller.state.message).toContain('Remote work'); expect(button.hasAttribute('aria-busy')).toBe(false);
    gate.resolve({ status: 'success' }); await flush(); expect(controller.state.status).toBe('cancelled'); expect(controller.cancel()).toBe(false);
  });
  it('observes a late rejected host promise after cancellation without changing state', async () => {
    const gate = deferred<GlassActionResult>(), { controller } = buttonFixture({ run: () => gate.promise }); const task = controller.invoke(); await flush(); controller.cancel(); await task; gate.reject(Error('Late network failure')); await flush(); expect(controller.state.status).toBe('cancelled');
  });
  it('can cancel before the host callback starts and cannot let reset generations overwrite a newer action', async () => {
    const host = vi.fn(() => ({ status: 'success' as const })), first = buttonFixture({ run: host }); const unstarted = first.controller.invoke(); first.controller.cancel(); await unstarted; await flush(); expect(host).not.toHaveBeenCalled();
    const old = deferred<GlassActionResult>(); let calls = 0; const next = buttonFixture({ run: () => ++calls === 1 ? old.promise : { status: 'success', message: 'New request' } }); const previous = next.controller.invoke(); await flush(); next.controller.reset(); expect((await previous).status).toBe('cancelled'); expect((await next.controller.invoke()).message).toBe('New request'); old.resolve({ status: 'error', retryable: true }); await flush(); expect(next.controller.state.message).toBe('New request');
  });
  it('destroy aborts pending work, resolves callers, restores owned fields and leaves later host edits intact', async () => {
    const gate = deferred<GlassActionResult>(); let signal!: AbortSignal; const { button, label, status, controller } = buttonFixture({ run(context) { signal = context.signal; return gate.promise; } }); const task = controller.invoke(); await flush(); label.firstChild!.textContent = 'Host changed label'; status.textContent = 'Host status'; button.setAttribute('aria-busy', 'host-busy'); controller.destroy(); controller.destroy();
    expect(signal.aborted).toBe(true); expect((await task).status).toBe('cancelled'); expect(label.textContent).toBe('Host changed label'); expect(status.textContent).toBe('Host status'); expect(button.getAttribute('aria-busy')).toBe('host-busy'); expect(button.hasAttribute('data-lg-action-state')).toBe(false); expect(button.hasAttribute('aria-disabled')).toBe(false);
    gate.resolve({ status: 'success' }); await flush(); expect(label.textContent).toBe('Host changed label');
  });
  it('restores original text/attributes without replacing authored nodes and leaves destroyed methods inert', async () => {
    const { controller, button, label, status } = buttonFixture(); const node = label.firstChild; await controller.invoke(); controller.destroy(); expect(label.textContent).toBe('Export note'); expect(label.firstChild).toBe(node); expect(status.textContent).toBe('Ready'); const state = controller.state; await controller.invoke(); controller.reset(); expect(controller.state).toBe(state); expect(controller.cancel()).toBe(false); expect(button.hasAttribute('aria-disabled')).toBe(false);
  });
  it('does not overwrite a label/status after outside host ownership changes during pending', async () => {
    const gate = deferred<GlassActionResult>(), { controller, label, status } = buttonFixture({ run: () => gate.promise }); const task = controller.invoke(); await flush(); label.firstChild!.textContent = 'Host label'; status.textContent = 'Host notice'; gate.resolve({ status: 'success' }); await task; expect(label.textContent).toBe('Host label'); expect(status.textContent).toBe('Host notice'); controller.destroy(); expect(label.textContent).toBe('Host label');
  });
  it('reports throwing state observers without rejecting or interrupting host work', async () => {
    const { controller, button } = buttonFixture({ onState() { throw Error('Observer failure'); } }); const report = vi.fn(); button.addEventListener('lg-action-error', report); expect((await controller.invoke()).status).toBe('success'); expect(report).toHaveBeenCalled(); expect(() => controller.destroy()).not.toThrow();
  });
  it('allows a host pending observer to reset before work begins without leaking an unresolved caller', async () => {
    let action!: GlassAction; const host = vi.fn(() => ({ status: 'success' as const })); const fixture = buttonFixture({ run: host, onState(state) { if (state.status === 'pending') action.reset(); } }); action = fixture.controller;
    expect((await action.invoke()).status).toBe('cancelled'); await flush(); expect(host).not.toHaveBeenCalled(); expect(action.state.status).toBe('idle');
  });
  it('rejects invalid result contracts instead of showing guessed success', async () => {
    for (const value of [true, { status: 'complete' }, { status: 'success', message: 'x'.repeat(501) }, { status: 'error', retryable: 'yes' }]) { const { controller } = buttonFixture({ run: () => value as never }); const state = await controller.invoke(); expect(state.status).toBe('error'); expect(state.retryable).toBe(false); expect(state.error).toBeInstanceOf(Error); }
  });
  it('validates native-only targets, required callbacks and authored nonconflicting text regions', () => {
    const anchor = document.createElement('a'); anchor.href = '/real-route'; document.body.append(anchor); expect(() => attachGlassAction(anchor as never, { run() {} })).toThrow('type=button');
    const button = document.createElement('button'); document.body.append(button); expect(() => attachGlassAction(button, { run() {} })).toThrow('type=button'); button.type = 'button'; expect(() => attachGlassAction(button, {} as never)).toThrow('run');
    button.innerHTML = '<span><i>Icon</i></span>'; expect(() => attachGlassAction(button, { run() {}, labelElement: button.firstElementChild as HTMLElement })).toThrow('text-only');
    button.textContent = 'Native'; expect(() => attachGlassAction(button, { run() {}, statusElement: button })).toThrow('outside');
    const { controller, button: attachedButton, status } = buttonFixture(); expect(() => attachGlassAction(attachedButton, { run() {} })).toThrow('existing'); const second = document.createElement('button'); second.type = 'button'; document.body.append(second); expect(() => attachGlassAction(second, { run() {}, statusElement: status })).toThrow('unowned'); controller.destroy();
  });
  it('does no geometry/RAF polling and exposes frozen snapshots/context', async () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect'); let context!: GlassActionContext; const { controller } = buttonFixture({ run(value) { context = value; return { status: 'success' }; } }); await controller.invoke(); expect(Object.isFrozen(context)).toBe(true); expect(Object.isFrozen(controller.state)).toBe(true); expect(Reflect.set(controller.state, 'status', 'pending')).toBe(false); expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled();
  });
});

describe('explicit native form action integration', () => {
  it('serializes successful native controls with the actual submitter before pending changes', async () => {
    let context!: GlassActionContext; const { form, buttons, field, controller } = formFixture({ run(value) { context = value; return { status: 'success' }; } }); const fieldNode = field; buttons[1].focus(); const state = await controller.invoke(buttons[1]);
    expect(state.status).toBe('success'); expect(context.submitter).toBe(buttons[1]); expect(context.target).toBe(form); expect([...context.formData!.entries()]).toEqual([['title', 'A useful note'], ['intent', 'publish']]); expect(field).toBe(fieldNode); expect(field.value).toBe('A useful note'); expect(buttons.every(button => !button.disabled)).toBe(true); expect(document.activeElement).toBe(buttons[1]);
  });
  it('validates programmatic invocation and never recursively calls native submit/requestSubmit', async () => {
    const { form, field, controller, run, buttons } = formFixture(); const submit = vi.spyOn(form, 'submit'), requestSubmit = vi.spyOn(form, 'requestSubmit'); field.value = ''; expect((await controller.invoke(buttons[0])).status).toBe('idle'); expect(run).not.toHaveBeenCalled(); field.value = 'Valid title'; await controller.invoke(buttons[0]); expect(submit).not.toHaveBeenCalled(); expect(requestSubmit).not.toHaveBeenCalled();
  });
  it('honors native novalidate and submitter formnovalidate', async () => {
    const first = formFixture(); first.field.value = ''; first.buttons[0].formNoValidate = true; expect((await first.controller.invoke(first.buttons[0])).status).toBe('success'); const second = formFixture(); second.form.noValidate = true; second.field.value = ''; expect((await second.controller.invoke(second.buttons[0])).status).toBe('success');
  });
  it('accepts associated external submitters and rejects foreign/non-submit/disabled submitters', async () => {
    const { form, controller, run } = formFixture(); form.id = 'owned-form'; const external = document.createElement('input'); external.type = 'submit'; external.name = 'source'; external.value = 'external'; external.setAttribute('form', form.id); document.body.append(external);
    expect((await controller.invoke(external)).status).toBe('success'); const foreign = document.createElement('button'); foreign.type = 'submit'; document.body.append(foreign); expect(() => controller.invoke(foreign)).toThrow('associated'); external.type = 'button'; expect(() => controller.invoke(external)).toThrow('submit'); external.type = 'submit'; external.disabled = true; await controller.invoke(external); expect(run).toHaveBeenCalledOnce();
  });
  it('honors default-prevented submit events and preserves submitter on normal validated submit', async () => {
    const { form, controller, buttons, run } = formFixture(); const prevented = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: buttons[0] }); prevented.preventDefault(); form.dispatchEvent(prevented); await flush(); expect(run).not.toHaveBeenCalled();
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: buttons[1] }); form.dispatchEvent(event); expect(event.defaultPrevented).toBe(true); await flush(); expect(controller.state.status).toBe('success'); expect(run).toHaveBeenCalledOnce();
  });
  it('works through native requestSubmit validation rather than bypassing the submit event', async () => {
    const host = vi.fn((_context: GlassActionContext) => ({ status: 'success' as const })); const { form, buttons, field } = formFixture({ run: host }); field.value = ''; form.requestSubmit(buttons[1]); await flush(); expect(host).not.toHaveBeenCalled();
    field.value = 'Validated by native form'; form.requestSubmit(buttons[1]); await flush(); expect(host).toHaveBeenCalledOnce(); expect(host.mock.calls[0][0].submitter).toBe(buttons[1]); expect(host.mock.calls[0][0].formData?.get('intent')).toBe('publish');
  });
  it('does not let an invalid synthetic submitter replace a valid in-flight operation', async () => {
    const gate = deferred<GlassActionResult>(), { controller, form, buttons } = formFixture({ run: () => gate.promise }); const task = controller.invoke(buttons[0]); await flush();
    const bad = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: document.createElement('button') }); form.dispatchEvent(bad); expect(controller.state.status).toBe('pending'); gate.resolve({ status: 'success' }); expect((await task).status).toBe('success');
  });
  it('retries live revalidated form values, retaining the previous valid submitter identity', async () => {
    const observed: FormData[] = []; let count = 0; const { controller, buttons, field } = formFixture({ run(context) { observed.push(context.formData!); return ++count === 1 ? { status: 'error', retryable: true } : { status: 'success' }; } }); await controller.invoke(buttons[1]); field.value = ''; expect((await controller.retry()).status).toBe('error'); expect(observed).toHaveLength(1); field.value = 'A revised note'; await controller.retry(); expect(observed[1].get('title')).toBe('A revised note'); expect(observed[1].get('intent')).toBe('publish');
  });
});
