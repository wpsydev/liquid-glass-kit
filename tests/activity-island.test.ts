import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountGlassActivityIsland } from '../src/activity-island.js';
import type { GlassActivityIslandOptions, GlassActivityRequest, GlassActivitySession } from '../src/activity-island.js';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const permission = (revision = 1): GlassActivityRequest => ({ id: 'request', revision, kind: 'permission', title: 'Run a command?', command: 'npm test' });
const session = (request?: GlassActivityRequest): GlassActivitySession => ({ id: 'session', title: 'Kit', status: 'attention', request });
function fixture(options: GlassActivityIslandOptions = {}) {
  const host = document.createElement('div'); host.innerHTML = '<p>Host-owned content</p>'; document.body.append(host);
  const controller = mountGlassActivityIsland(host, { snapshot: { sessions: [session(permission())] }, ...options });
  controller.open();
  return { host, controller, root: host.querySelector<HTMLElement>('.lg-activity-island')! };
}
const button = (root: HTMLElement, text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent === text)!;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('host-owned activity island', () => {
  it('preserves host content, is initially collapsed and owns only its appended DOM', () => {
    const host = document.createElement('div'); host.innerHTML = '<button>Existing</button>'; document.body.append(host);
    const before = host.firstChild, controller = mountGlassActivityIsland(host);
    expect(host.querySelector('.lg-activity-panel')?.hasAttribute('hidden')).toBe(true);
    expect(host.querySelector('.lg-activity-toggle')?.getAttribute('aria-expanded')).toBe('false');
    controller.destroy(); controller.destroy(); controller.open(); controller.update({ sessions: [] });
    expect(host.childNodes).toHaveLength(1); expect(host.firstChild).toBe(before);
  });
  it('renders all host strings as text instead of executable markup', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const { root, controller } = fixture({ snapshot: { sessions: [{ ...session({ ...permission(), command: malicious }), title: malicious, model: malicious }] } });
    expect(root.querySelector('img')).toBeNull(); expect(root.textContent).toContain(malicious);
    expect(root.querySelector('pre')?.textContent).toBe(malicious); controller.destroy();
  });
  it('never simulates execution or authorizes without a host action callback', () => {
    const { root, controller } = fixture();
    expect(button(root, 'Allow once').disabled).toBe(true); expect(button(root, 'Deny').disabled).toBe(true);
    expect(root.textContent).toContain('Connect a host action handler'); controller.destroy();
  });
  it('passes exact request identity/revision and guards repeated async submission', async () => {
    let finish!: () => void; const onAction = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { root, controller } = fixture({ onAction });
    const old = button(root, 'Allow once'); old.click(); old.click(); button(root, 'Deny').click();
    expect(onAction).toHaveBeenCalledOnce(); expect(onAction.mock.calls[0][0]).toEqual({ sessionId: 'session', requestId: 'request', revision: 1, action: 'approve' });
    finish(); await flush(); expect(root.textContent).toContain('Awaiting host update');
    expect(button(root, 'Allow once').disabled).toBe(true); old.click(); expect(onAction).toHaveBeenCalledOnce(); controller.destroy();
  });
  it('rejects detached stale request controls and unlocks a changed revision', async () => {
    const onAction = vi.fn(); const { root, controller } = fixture({ onAction });
    const stale = button(root, 'Allow once'); controller.update({ sessions: [session(permission(2))] });
    stale.click(); expect(onAction).not.toHaveBeenCalled(); button(root, 'Allow once').click(); await flush();
    expect(onAction).toHaveBeenCalledWith({ sessionId: 'session', requestId: 'request', revision: 2, action: 'approve' }); controller.destroy();
  });
  it('cannot revive old controls when a removed session/request ID is reused', () => {
    const onAction = vi.fn(); const { root, controller } = fixture({ onAction });
    const stale = button(root, 'Allow once'); controller.update({ sessions: [] }); controller.update({ sessions: [session(permission())] });
    stale.click(); expect(onAction).not.toHaveBeenCalled(); button(root, 'Allow once').click(); expect(onAction).toHaveBeenCalledOnce(); controller.destroy();
  });
  it('invalidates stale controls even if a host mistakenly changes proposal content without changing its revision', () => {
    const onAction = vi.fn(), { root, controller } = fixture({ onAction }); const stale = button(root, 'Allow once');
    controller.update({ sessions: [session({ ...permission(), command: 'different command' })] });
    stale.click(); expect(onAction).not.toHaveBeenCalled(); button(root, 'Allow once').click(); expect(onAction).toHaveBeenCalledOnce(); controller.destroy();
  });
  it('does not let a stale asynchronous result lock a replacement request', async () => {
    let finish!: () => void; const onAction = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { root, controller } = fixture({ onAction }); button(root, 'Allow once').click();
    controller.update({ sessions: [session(permission(2))] }); finish(); await flush();
    expect(button(root, 'Allow once').disabled).toBe(false); expect(root.querySelector('[role=status]')?.textContent).not.toContain('Submitted'); controller.destroy();
  });
  it('allows retry after a rejected callback without exposing arbitrary error markup', async () => {
    const onAction = vi.fn().mockRejectedValueOnce(new Error('<script>private error</script>')).mockResolvedValue(undefined);
    const { root, controller } = fixture({ onAction }); button(root, 'Allow once').click(); await flush();
    expect(root.textContent).toContain('Could not submit'); expect(root.textContent).not.toContain('private error');
    button(root, 'Allow once').click(); await flush(); expect(onAction).toHaveBeenCalledTimes(2); controller.destroy();
  });
  it('preserves the focused composer node and native selection on unrelated metadata ticks', () => {
    const { root, controller } = fixture({ onPrompt: vi.fn() });
    const prompt = root.querySelector<HTMLTextAreaElement>('[data-lg-focus=prompt]')!;
    prompt.value = 'make it useful'; prompt.dispatchEvent(new Event('input')); prompt.focus(); prompt.setSelectionRange(3, 7);
    controller.update({ sessions: [{ ...session(permission()), model: 'host model', usage: 'host cost', progress: { value: 2, max: 3 } }] });
    expect(root.querySelector('[data-lg-focus=prompt]')).toBe(prompt); expect(document.activeElement).toBe(prompt);
    expect(prompt.selectionStart).toBe(3); expect(prompt.selectionEnd).toBe(7); expect(root.querySelector('progress')?.value).toBe(2); controller.destroy();
  });
  it('does not steal focus on an externally arriving request and Escape only collapses', () => {
    const external = document.createElement('input'); document.body.append(external); external.focus();
    const onAction = vi.fn(), { root, controller } = fixture({ onAction });
    controller.update({ sessions: [session(permission(2))] }); expect(document.activeElement).toBe(external);
    button(root, 'Allow once').focus(); button(root, 'Allow once').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('.lg-activity-panel')?.hasAttribute('hidden')).toBe(true);
    expect(document.activeElement).toBe(external); expect(onAction).not.toHaveBeenCalled(); controller.destroy();
  });
  it('uses native choices/free text and sends the answer with its request token', async () => {
    const onAction = vi.fn(), request: GlassActivityRequest = { id: 'question', revision: 'r2', kind: 'question', title: 'Which renderer?', choices: [{ id: 'css', label: 'Portable CSS' }], allowText: true };
    const { root, controller } = fixture({ onAction, snapshot: { sessions: [session(request)] } });
    const radio = root.querySelector<HTMLInputElement>('input[type=radio]')!; radio.checked = true; radio.dispatchEvent(new Event('change'));
    const answer = root.querySelector<HTMLTextAreaElement>('[data-lg-focus=answer]')!; answer.value = 'keep it portable'; answer.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flush();
    expect(onAction).toHaveBeenCalledWith({ sessionId: 'session', requestId: 'question', revision: 'r2', action: 'answer', answer: { choiceId: 'css', text: 'keep it portable' } }); controller.destroy();
  });
  it('shows readable native diff disclosures and supports plan revision notes', async () => {
    const onAction = vi.fn(), { root, controller } = fixture({ onAction, snapshot: { sessions: [session({ id: 'edit', revision: 1, kind: 'diff', title: 'Review edit', files: [{ path: '<unsafe>.ts', before: 'old', after: 'new' }] })] } });
    expect(root.querySelector('summary')?.textContent).toBe('<unsafe>.ts'); expect([...root.querySelectorAll('pre')].map(pre => pre.textContent)).toEqual(['old', 'new']);
    controller.update({ sessions: [session({ id: 'plan', revision: 2, kind: 'plan', title: 'Review plan', steps: ['measure first', 'ship after checks'] })] });
    const notes = root.querySelector<HTMLTextAreaElement>('[data-lg-focus=plan-notes]')!; notes.value = 'include mobile'; notes.dispatchEvent(new Event('input'));
    button(root, 'Request revision').click(); await flush();
    expect(onAction).toHaveBeenCalledWith({ sessionId: 'session', requestId: 'plan', revision: 2, action: 'revise', answer: { text: 'include mobile' } }); controller.destroy();
  });
  it('preserves separate session drafts and clears sent text only after host success', async () => {
    const onPrompt = vi.fn(), first = session(), second = { ...session(), id: 'second', title: 'Docs' };
    const { root, controller } = fixture({ onPrompt, snapshot: { sessions: [first, second] } });
    let prompt = root.querySelector<HTMLTextAreaElement>('[data-lg-focus=prompt]')!; prompt.value = 'implement this'; prompt.dispatchEvent(new Event('input'));
    button(root, 'Docs').click(); expect(root.querySelector<HTMLTextAreaElement>('[data-lg-focus=prompt]')!.value).toBe('');
    button(root, 'Kit').click(); prompt = root.querySelector<HTMLTextAreaElement>('[data-lg-focus=prompt]')!; expect(prompt.value).toBe('implement this');
    root.querySelector('.lg-activity-composer')!.dispatchEvent(new Event('submit', { cancelable: true })); await flush();
    expect(onPrompt).toHaveBeenCalledWith({ sessionId: 'session', text: 'implement this', files: [] });
    expect(root.querySelector<HTMLTextAreaElement>('[data-lg-focus=prompt]')!.value).toBe(''); controller.destroy();
  });
  it('validates image metadata/count/size without uploading or accepting SVG', async () => {
    const onPrompt = vi.fn(), { root, controller } = fixture({ onPrompt, attachments: { maxFiles: 1, maxBytes: 8 } });
    function pick(files: File[]) {
      const input = root.querySelector<HTMLInputElement>('input[type=file]')!; Object.defineProperty(input, 'files', { value: files }); input.dispatchEvent(new Event('change'));
    }
    pick([new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' })]); expect(root.textContent).toContain('Choose up to');
    pick([new File(['123456789'], 'large.png', { type: 'image/png' })]); expect(root.textContent).toContain('Choose up to');
    pick([new File(['1'], 'a.png', { type: 'image/png' }), new File(['2'], 'b.png', { type: 'image/png' })]); expect(root.textContent).toContain('Choose up to');
    const valid = new File(['12'], 'valid.png', { type: 'image/png' }); pick([valid]);
    expect(root.textContent).toContain('valid.png'); root.querySelector('.lg-activity-composer')!.dispatchEvent(new Event('submit', { cancelable: true })); await flush();
    expect(onPrompt).toHaveBeenCalledWith({ sessionId: 'session', text: '', files: [valid] }); controller.destroy();
  });
  it('rechecks attachments at submission when host limits change', () => {
    const onPrompt = vi.fn(), { root, controller } = fixture({ onPrompt, attachments: {} });
    const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [new File(['1234'], 'local.png', { type: 'image/png' })] }); input.dispatchEvent(new Event('change'));
    controller.update({ attachments: { maxBytes: 2 } });
    root.querySelector('.lg-activity-composer')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(onPrompt).not.toHaveBeenCalled(); expect(root.textContent).toContain('Attachment limits changed'); controller.destroy();
  });
  it('does not revive a removed composer or let its async response clear a replacement draft', async () => {
    let finish!: () => void; const onPrompt = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { root, controller } = fixture({ onPrompt });
    const oldForm = root.querySelector('.lg-activity-composer')!, oldPrompt = root.querySelector<HTMLTextAreaElement>('[data-lg-focus=prompt]')!;
    oldPrompt.value = 'old draft'; oldPrompt.dispatchEvent(new Event('input')); oldForm.dispatchEvent(new Event('submit', { cancelable: true }));
    controller.update({ sessions: [] }); controller.update({ sessions: [session()] });
    const replacement = root.querySelector<HTMLTextAreaElement>('[data-lg-focus=prompt]')!; replacement.value = 'new draft'; replacement.dispatchEvent(new Event('input'));
    finish(); await flush(); expect(replacement.value).toBe('new draft'); oldForm.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(onPrompt).toHaveBeenCalledOnce(); controller.destroy();
  });
  it('rejects duplicate IDs transactionally and has no idle frames or geometry reads', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const { root, controller } = fixture({ reducedMotion: true });
    expect(() => controller.update({ sessions: [session(), session()] })).toThrow('unique'); expect(root.textContent).toContain('Run a command?');
    expect(root.dataset.reducedMotion).toBe('true'); expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled(); controller.destroy();
  });
  it('neutralizes saved controls after destruction, including unresolved host actions', async () => {
    let finish!: () => void; const onAction = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { root, controller, host } = fixture({ onAction }); const old = button(root, 'Allow once'); old.click(); controller.destroy(); finish(); await flush(); old.click();
    expect(onAction).toHaveBeenCalledOnce(); expect(host.textContent).toBe('Host-owned content'); expect(host.querySelector('.lg-activity-island')).toBeNull();
  });
});
