import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachGlassBottomSheet } from '../src/bottom-sheet.js';
import type { GlassBottomSheetOptions } from '../src/bottom-sheet.js';

let showDescriptor: PropertyDescriptor | undefined, closeDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  showDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal'); closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); this.querySelector<HTMLElement>('[autofocus],input:not(:disabled),button:not(:disabled)')?.focus(); } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); } },
  });
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren();
  if (showDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showDescriptor); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
function fixture(options: GlassBottomSheetOptions = {}) {
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Edit a note'); dialog.innerHTML = '<h2>My note</h2><form><label>Note<input name="note" value="keep this"></label><button type="button">Save</button></form>'; document.body.append(dialog);
  const authored = [...dialog.childNodes], controller = attachGlassBottomSheet(dialog, options);
  const handle = dialog.querySelector<HTMLButtonElement>('.lg-sheet-grabber')!, input = dialog.querySelector('input')!;
  return { dialog, controller, handle, input, authored };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function pointer(target: EventTarget, type: string, y: number, id = 1) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: true }, pointerType: { value: 'touch' } }); target.dispatchEvent(event); return event;
}
function frames() {
  let count = 0; const queued = new Map<number, FrameRequestCallback>();
  const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { queued.set(++count, callback); return count; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queued.delete(id); });
  return { request, queued, step() { const values = [...queued.values()]; queued.clear(); values.forEach(callback => callback(0)); } };
}

describe('optional authored native bottom sheet', () => {
  it('preserves authored content/control identity and restores original declarations/attributes', () => {
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Named'); dialog.innerHTML = '<input value="original">'; dialog.style.setProperty('margin', '14px', 'important'); dialog.style.setProperty('height', '80px', 'important'); dialog.style.color = 'red'; document.body.append(dialog);
    const styleNames = [...dialog.style].sort(), input = dialog.firstChild, controller = attachGlassBottomSheet(dialog); controller.open(); (input as HTMLInputElement).value = 'unsaved'; controller.destroy(); controller.destroy();
    expect(dialog.firstChild).toBe(input); expect((input as HTMLInputElement).value).toBe('unsaved'); expect(dialog.innerHTML).toBe('<input value="original">'); expect(dialog.style.margin).toBe('14px'); expect(dialog.style.getPropertyPriority('margin')).toBe('important'); expect(dialog.style.height).toBe('80px'); expect(dialog.style.getPropertyPriority('height')).toBe('important'); expect(dialog.style.color).toBe('red'); expect([...dialog.style].sort()).toEqual(styleNames); expect(dialog.hasAttribute('class')).toBe(false); expect(dialog.open).toBe(false);
  });
  it('rejects unnamed, disconnected, already open, unsupported and duplicate attachments before mutation', () => {
    const disconnected = document.createElement('dialog'); disconnected.setAttribute('aria-label', 'Named'); expect(() => attachGlassBottomSheet(disconnected)).toThrow('connected');
    document.body.append(disconnected); disconnected.removeAttribute('aria-label'); expect(() => attachGlassBottomSheet(disconnected)).toThrow('aria-label'); expect(disconnected.childNodes).toHaveLength(0);
    disconnected.setAttribute('aria-label', 'Named'); disconnected.open = true; expect(() => attachGlassBottomSheet(disconnected)).toThrow('closed'); disconnected.open = false;
    const controller = attachGlassBottomSheet(disconnected); expect(() => attachGlassBottomSheet(disconnected)).toThrow('existing'); controller.destroy();
  });
  it('uses native authored input focus and adds keyboard alternatives without stealing autofocus', () => {
    const { dialog, controller, input } = fixture(); controller.open(); expect(document.activeElement).toBe(input);
    expect(dialog.querySelectorAll('.lg-sheet-controls button')).toHaveLength(3); expect(dialog.querySelector('[tabindex]')).toBeNull(); expect(dialog.hasAttribute('tabindex')).toBe(false); controller.destroy();
  });
  it('supports bounded sorted detents and native grabber activation as an alternative to dragging', () => {
    const onDetent = vi.fn(), { controller, handle, dialog } = fixture({ detents: [1.2, 'medium', .1, 'medium'], onDetent });
    controller.open(); expect(controller.detent).toBe(.25); handle.click(); expect(controller.detent).toBe(.5); handle.click(); expect(controller.detent).toBe(.95);
    expect(handle.getAttribute('aria-label')).toContain('95 percent'); expect(dialog.querySelector('.lg-sheet-resize')?.textContent).toBe('Collapse'); expect(onDetent).toHaveBeenCalledWith(.95); controller.destroy();
  });
  it('rejects malformed detents transactionally without rebuilding host content', () => {
    const { controller, dialog, input } = fixture();
    for (const detents of [[], Array(5).fill(.5), ['bad'], [NaN]]) expect(() => controller.update({ detents: detents as never })).toThrow();
    expect(dialog.querySelector('input')).toBe(input); expect(controller.detent).toBe(.5); controller.destroy();
  });
  it('uses visual viewport origin and size for keyboard geometry without changing focused content', () => {
    const viewport = new EventTarget() as EventTarget & { height: number; width: number; offsetTop: number; offsetLeft: number };
    Object.assign(viewport, { height: 400, width: 390, offsetTop: 200, offsetLeft: 12 }); vi.stubGlobal('visualViewport', viewport);
    const { controller, dialog, input } = fixture(); controller.open(); input.focus();
    expect(Number.parseFloat(dialog.style.top) + Number.parseFloat(dialog.style.height)).toBe(600); expect(Number.parseFloat(dialog.style.width)).toBe(374); expect(Number.parseFloat(dialog.style.left)).toBe(20);
    viewport.height = 300; viewport.offsetTop = 240; viewport.dispatchEvent(new Event('resize'));
    expect(Number.parseFloat(dialog.style.top) + Number.parseFloat(dialog.style.height)).toBe(540); expect(document.activeElement).toBe(input); controller.destroy();
  });
  it('coalesces handle movement to one frame, samples geometry once and stops at rest', () => {
    const time = frames(), { dialog, controller, handle } = fixture(); controller.open();
    const geometry = vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ height: 376 } as DOMRect);
    pointer(handle, 'pointerdown', 500); for (let index = 0; index < 100; index++) pointer(handle, 'pointermove', 450 - index);
    expect(time.queued.size).toBe(1); expect(geometry).toHaveBeenCalledOnce(); time.step(); expect(time.queued.size).toBe(0);
    pointer(document, 'pointerup', 350); expect(time.queued.size).toBe(0); expect(dialog.hasAttribute('data-lg-sheet-dragging')).toBe(false); controller.destroy();
  });
  it('never starts drag work from authored content and leaves native scrolling/selection alone', () => {
    const time = frames(), { controller, input, dialog } = fixture(); controller.open();
    const down = pointer(input, 'pointerdown', 400); pointer(input, 'pointermove', 200); expect(down.defaultPrevented).toBe(false); expect(time.request).not.toHaveBeenCalled(); expect(dialog.hasAttribute('data-lg-sheet-dragging')).toBe(false); controller.destroy();
  });
  it('cancels gestures and queued frames on pointercancel/lost capture without changing detent', () => {
    const time = frames(), { controller, handle, dialog } = fixture(); controller.open(); pointer(handle, 'pointerdown', 400); pointer(handle, 'pointermove', 200); expect(time.queued.size).toBe(1);
    pointer(handle, 'pointercancel', 200); expect(time.queued.size).toBe(0); expect(controller.detent).toBe(.5); expect(dialog.hasAttribute('data-lg-sheet-dragging')).toBe(false); controller.destroy();
  });
  it('consults a single dismissal guard and keeps denied forms/values open', async () => {
    const onDismissRequest = vi.fn(() => false), { controller, dialog, input } = fixture({ onDismissRequest }); controller.open(); input.value = 'important unsaved data';
    expect(await controller.close()).toBe(false); expect(dialog.open).toBe(true); expect(input.value).toBe('important unsaved data'); expect(onDismissRequest).toHaveBeenCalledWith('api'); controller.destroy();
  });
  it('shares in-flight guard results instead of submitting duplicate close requests', async () => {
    let finish!: (approved: boolean) => void; const onDismissRequest = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const { controller, dialog } = fixture({ onDismissRequest }); controller.open(); const first = controller.close(), second = controller.close(); expect(first).toBe(second); await flush(); expect(onDismissRequest).toHaveBeenCalledOnce();
    finish(true); expect(await first).toBe(true); expect(dialog.open).toBe(false); controller.destroy();
  });
  it('propagates guard failure without silently discarding a form', async () => {
    const error = new Error('<script>private guard failure</script>'), onDismissRequest = vi.fn(() => Promise.reject(error));
    const { controller, dialog, input } = fixture({ onDismissRequest }); const observed = vi.fn(); dialog.addEventListener('lg-sheet-error', observed); controller.open(); input.value = 'keep me';
    await expect(controller.close()).rejects.toBe(error); expect(dialog.open).toBe(true); expect(input.value).toBe('keep me'); expect(dialog.textContent).toContain('Could not close'); expect(dialog.textContent).not.toContain('private guard failure'); expect(observed).toHaveBeenCalledOnce(); controller.destroy();
  });
  it('never lets a stale async approval close a reopened or updated session', async () => {
    let finish!: (value: boolean) => void; const { controller, dialog } = fixture({ onDismissRequest: () => new Promise<boolean>(resolve => { finish = resolve; }) });
    controller.open(); const task = controller.close(); await flush(); controller.open('large'); finish(true); expect(await task).toBe(false); expect(dialog.open).toBe(true); expect(controller.detent).toBe(.9); controller.destroy();
  });
  it('invalidates an async approval when authored form content changes before it resolves', async () => {
    let finish!: (value: boolean) => void; const { controller, dialog, input } = fixture({ onDismissRequest: () => new Promise<boolean>(resolve => { finish = resolve; }) });
    controller.open(); const task = controller.close(); await flush(); input.value = 'a newer unsaved edit'; input.dispatchEvent(new Event('input', { bubbles: true })); finish(true);
    expect(await task).toBe(false); expect(dialog.open).toBe(true); expect(input.value).toBe('a newer unsaved edit'); controller.destroy();
  });
  it('does not invoke a newer guard when options change before the old guard microtask', async () => {
    const previous = vi.fn(() => true), next = vi.fn(() => true), { controller, dialog } = fixture({ onDismissRequest: previous }); controller.open(); const task = controller.close(); controller.update({ onDismissRequest: next });
    expect(await task).toBe(false); expect(previous).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled(); expect(dialog.open).toBe(true); controller.destroy();
  });
  it('prevents native Escape closure until its async guard approves', async () => {
    const onDismissRequest = vi.fn(() => false), { controller, dialog } = fixture({ onDismissRequest }); controller.open(); const cancel = new Event('cancel', { cancelable: true }); dialog.dispatchEvent(cancel); expect(cancel.defaultPrevented).toBe(true); await flush(); expect(dialog.open).toBe(true); expect(onDismissRequest).toHaveBeenCalledWith('escape'); controller.destroy();
  });
  it('guards swipe dismissal and snaps back when unsaved-change approval is denied', async () => {
    const time = frames(), guard = vi.fn(() => false), { controller, handle, dialog } = fixture({ onDismissRequest: guard }); controller.open();
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ height: 376 } as DOMRect); pointer(handle, 'pointerdown', 100); pointer(handle, 'pointermove', 600); time.step(); pointer(handle, 'pointerup', 600); await flush();
    expect(guard).toHaveBeenCalledWith('drag'); expect(dialog.open).toBe(true); expect(controller.detent).toBe(.5); controller.destroy();
  });
  it('treats authored direct close and explicit teardown as documented guard bypasses', async () => {
    const guard = vi.fn(() => false), { controller, dialog, input } = fixture({ onDismissRequest: guard }); controller.open(); input.value = 'retained'; dialog.close(); expect(guard).not.toHaveBeenCalled(); controller.open(); controller.destroy(); expect(dialog.open).toBe(false); expect(input.value).toBe('retained'); expect(guard).not.toHaveBeenCalled();
  });
  it('reports detent callback failures after gesture cleanup without breaking destruction', () => {
    const time = frames(), { controller, handle, dialog } = fixture({ onDetent: () => { throw new Error('notification failure'); } }); const observed = vi.fn(); dialog.addEventListener('lg-sheet-error', observed); controller.open();
    pointer(handle, 'pointerdown', 400); pointer(handle, 'pointermove', 50); pointer(handle, 'pointerup', 50); expect(time.queued.size).toBe(0); expect(dialog.hasAttribute('data-lg-sheet-dragging')).toBe(false); expect(observed).toHaveBeenCalled(); expect(() => controller.destroy()).not.toThrow();
  });
  it('preserves focus across queued close events, restores the invoker and has no idle RAF', async () => {
    const time = frames(), trigger = document.createElement('button'); document.body.append(trigger); trigger.focus(); const { controller, dialog, input } = fixture(); controller.open(); input.focus(); expect(await controller.close()).toBe(true); expect(document.activeElement).toBe(trigger);
    controller.open(); dialog.dispatchEvent(new Event('close')); expect(dialog.open).toBe(true); expect(document.activeElement).toBe(input); expect(time.request).not.toHaveBeenCalled(); controller.destroy();
  });
  it('honors live system motion and explicit preferences without adding permanent work', () => {
    let changed!: () => void, reduced = false; const remove = vi.fn(); vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, callback: () => void) => { changed = callback; }, removeEventListener: remove }));
    const { controller, dialog } = fixture(); expect(dialog.getAttribute('data-lg-sheet-reduced')).toBe('false'); reduced = true; changed(); expect(dialog.getAttribute('data-lg-sheet-reduced')).toBe('true'); controller.update({ reducedMotion: false }); expect(dialog.getAttribute('data-lg-sheet-reduced')).toBe('true'); controller.destroy(); expect(remove).toHaveBeenCalledOnce();
  });
});
