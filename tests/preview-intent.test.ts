import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachGlassPreview } from '../src/preview-intent.js';
import type { GlassPreviewOptions } from '../src/preview-intent.js';

const cleanup: (() => void)[] = [];
let fine = true;
const changes = new Set<() => void>();
const mount = (trigger = document.createElement('button'), panel = document.createElement('section'), options: GlassPreviewOptions = {}) => {
  document.body.append(trigger, panel);
  const controller = attachGlassPreview(trigger, panel, options);
  cleanup.push(controller.destroy); return { trigger, panel, controller };
};
const pointer = (element: HTMLElement, type: string, pointerType = 'mouse', prevented = false) => {
  const event = new Event(type, { cancelable: true }); Object.defineProperty(event, 'pointerType', { value: pointerType });
  if (prevented) event.preventDefault(); element.dispatchEvent(event); return event;
};
const escape = (element: HTMLElement = document.body, prevented = false) => {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  if (prevented) event.preventDefault(); element.dispatchEvent(event); return event;
};
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
const popover = (panel = document.createElement('section')) => {
  panel.setAttribute('popover', 'manual');
  let opened = false;
  const matches = panel.matches.bind(panel);
  vi.spyOn(panel, 'matches').mockImplementation(selector => selector === ':popover-open' ? opened : matches(selector));
  const transition = (next: boolean) => {
    const event = new Event('beforetoggle', { cancelable: next });
    Object.defineProperty(event, 'newState', { value: next ? 'open' : 'closed' });
    panel.dispatchEvent(event);
    if (event.defaultPrevented) return;
    opened = next;
    const toggle = new Event('toggle'); Object.defineProperty(toggle, 'newState', { value: next ? 'open' : 'closed' }); panel.dispatchEvent(toggle);
  };
  panel.showPopover = vi.fn(() => transition(true)); panel.hidePopover = vi.fn(() => transition(false));
  return { panel, transition, get visible() { return opened; } };
};
beforeEach(() => {
  vi.useFakeTimers(); fine = true; changes.clear();
  vi.stubGlobal('matchMedia', () => ({ get matches() { return fine; }, addEventListener: (_type: string, fn: () => void) => changes.add(fn), removeEventListener: (_type: string, fn: () => void) => changes.delete(fn) }));
});
afterEach(() => {
  cleanup.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('finite hover/focus preview intent', () => {
  it('starts closed with no document shortcut, RAF, geometry reads or DOM role invention', () => {
    const keys = vi.spyOn(document, 'addEventListener'), raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const { trigger, panel, controller } = mount();
    expect(controller.open).toBe(false); expect(panel.hidden).toBe(true); expect(controller.renderer).toBe('hidden'); expect(controller.pending).toBe(false);
    expect(keys.mock.calls.some(([type]) => type === 'keydown')).toBe(false);
    expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled(); expect(trigger.hasAttribute('aria-expanded')).toBe(false); expect(panel.hasAttribute('role')).toBe(false);
  });
  it('opens only after fine pointer intent and cancels quick flybys', () => {
    const onOpen = vi.fn(), { trigger, panel, controller } = mount(undefined, undefined, { onOpen });
    pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(119); expect(controller.open).toBe(false);
    pointer(trigger, 'pointerleave'); vi.advanceTimersByTime(500); expect(onOpen).not.toHaveBeenCalled();
    pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(120);
    expect(controller.open).toBe(true); expect(panel.hidden).toBe(false); expect(onOpen.mock.calls[0][0].reason).toBe('hover');
  });
  it('keeps content hoverable across a finite bridge and closes after both targets are left', () => {
    const { trigger, panel, controller } = mount();
    pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(120); pointer(trigger, 'pointerleave'); vi.advanceTimersByTime(100);
    pointer(panel, 'pointerenter'); vi.advanceTimersByTime(2000); expect(controller.open).toBe(true);
    pointer(panel, 'pointerleave'); vi.advanceTimersByTime(119); expect(controller.open).toBe(true);
    vi.advanceTimersByTime(1); expect(controller.open).toBe(false); expect(panel.hidden).toBe(true);
  });
  it('opens immediately on focus, preserves focus, and persists within interactive content', () => {
    const { trigger, panel, controller } = mount(); const link = document.createElement('a'); link.href = '/detail'; link.textContent = 'Read'; panel.append(link);
    trigger.focus(); expect(controller.open).toBe(true); expect(document.activeElement).toBe(trigger);
    link.focus(); vi.advanceTimersByTime(2000); expect(controller.open).toBe(true); expect(document.activeElement).toBe(link);
    link.blur(); vi.advanceTimersByTime(120); expect(controller.open).toBe(false);
  });
  it('dismisses on Escape without moving focus or reopening on unchanged focus', () => {
    const { trigger, controller } = mount(); trigger.focus(); const event = escape(trigger);
    expect(event.defaultPrevented).toBe(true); expect(controller.open).toBe(false); expect(document.activeElement).toBe(trigger);
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); vi.advanceTimersByTime(2000); expect(controller.open).toBe(false);
    trigger.blur(); trigger.focus(); expect(controller.open).toBe(true);
  });
  it('suppresses unchanged hover after dismissal but permits a fresh pointer entry', () => {
    const { trigger, controller } = mount(); pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(120); escape();
    vi.advanceTimersByTime(2000); expect(controller.open).toBe(false);
    pointer(trigger, 'pointerleave'); pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(120); expect(controller.open).toBe(true);
  });
  it('respects prevented input and nested host Escape handling', () => {
    const { trigger, panel, controller } = mount(); pointer(trigger, 'pointerenter', 'mouse', true); vi.advanceTimersByTime(120); expect(controller.open).toBe(false);
    controller.show(); escape(trigger, true); expect(controller.open).toBe(true);
    const field = document.createElement('input'); panel.append(field);
    field.addEventListener('keydown', event => event.preventDefault()); escape(field); expect(controller.open).toBe(true);
  });
  it('leaves Escape to unrelated and nested modal contexts', () => {
    const { panel, controller } = mount(); controller.show(); const dialog = document.createElement('dialog'), field = document.createElement('input'); dialog.open = true; dialog.append(field); document.body.append(dialog); field.focus();
    expect(escape(field).defaultPrevented).toBe(false); expect(controller.open).toBe(true);
    panel.append(dialog); expect(escape(field).defaultPrevented).toBe(false); expect(controller.open).toBe(true);
  });
  it('does not consume links or touch clicks and keeps keyboard access on coarse devices', () => {
    fine = false; const link = document.createElement('a'); link.href = '#detail'; const { trigger, controller } = mount(link);
    pointer(trigger, 'pointerenter', 'touch'); vi.advanceTimersByTime(2000); expect(controller.open).toBe(false);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true }); trigger.dispatchEvent(click); expect(click.defaultPrevented).toBe(false); expect(controller.open).toBe(false);
    trigger.focus(); expect(controller.open).toBe(true);
  });
  it('requires actual hover capability, not just a synthetic mouse event', () => {
    fine = false; const { trigger, controller } = mount(); pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(120); expect(controller.open).toBe(false);
    fine = true; pointer(trigger, 'pointerenter', 'touch'); vi.advanceTimersByTime(120); expect(controller.open).toBe(false);
  });
  it('provides a native manual button path without any intercepted clicks or automatic focus opening', () => {
    fine = false; const { trigger, panel, controller } = mount(undefined, undefined, { interaction: 'manual', semantics: 'disclosure' });
    trigger.type = 'button'; trigger.addEventListener('click', () => controller.toggle()); trigger.focus(); expect(controller.open).toBe(false);
    trigger.click(); expect(controller.open).toBe(true); expect(trigger.getAttribute('aria-expanded')).toBe('true'); expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    trigger.blur(); pointer(trigger, 'pointerleave', 'touch'); vi.advanceTimersByTime(2000); expect(controller.open).toBe(true);
    trigger.click(); expect(controller.open).toBe(false); expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
  it('composes authored tooltip descriptions without replacing accessible names and restores them', () => {
    const trigger = document.createElement('button'), panel = document.createElement('div'); trigger.setAttribute('aria-describedby', 'help'); trigger.setAttribute('aria-label', 'Open case'); panel.setAttribute('role', 'tooltip');
    const { controller } = mount(trigger, panel, { semantics: 'description' }); const generated = panel.id;
    expect(trigger.getAttribute('aria-describedby')).toBe('help ' + generated); expect(trigger.hasAttribute('aria-expanded')).toBe(false);
    controller.show(); expect(trigger.getAttribute('aria-label')).toBe('Open case'); controller.destroy();
    expect(panel.hasAttribute('id')).toBe(false); expect(trigger.getAttribute('aria-describedby')).toBe('help'); expect(panel.getAttribute('role')).toBe('tooltip');
  });
  it('rejects invented tooltip semantics for rich content and disclosure semantics on links', () => {
    const tooltip = document.createElement('div'); tooltip.setAttribute('role', 'tooltip'); tooltip.innerHTML = '<button>Action</button>';
    expect(() => mount(undefined, tooltip, { semantics: 'description' })).toThrow(/noninteractive/);
    expect(() => mount(document.createElement('a'), undefined, { semantics: 'disclosure' })).toThrow(/native button/);
    expect(() => mount(undefined, tooltip, { semantics: 'disclosure' })).toThrow(/non-tooltip/);
    expect(() => mount(undefined, document.createElement('dialog'))).toThrow(/nonmodal/);
  });
  it('keeps tooltip eligibility explicit when lazy authored content changes', () => {
    const panel = document.createElement('div'); panel.setAttribute('role', 'tooltip'); const onError = vi.fn(), { controller } = mount(undefined, panel, { semantics: 'description', onError });
    panel.append(document.createElement('button')); controller.show(); expect(controller.open).toBe(false); expect(onError).toHaveBeenCalledOnce();
  });
  it('aborts lazy intent promptly and ignores stale fulfillment, rejection and destruction', async () => {
    const tasks: { resolve: () => void; reject: (error: Error) => void; signal: AbortSignal }[] = [];
    const onError = vi.fn(), { controller } = mount(undefined, undefined, { onError, onOpen: ({ signal }) => new Promise<void>((resolve, reject) => tasks.push({ resolve, reject, signal })) });
    controller.show(); expect(controller.pending).toBe(true); controller.hide(); expect(tasks[0].signal.aborted).toBe(true); expect(controller.pending).toBe(false);
    controller.show(); tasks[0].resolve(); await settle(); expect(controller.pending).toBe(true);
    controller.update({}); expect(tasks[1].signal.aborted).toBe(true); tasks[1].reject(new Error('Late')); await settle(); expect(onError).not.toHaveBeenCalled(); expect(controller.open).toBe(false);
    controller.show(); controller.destroy(); await settle(); expect(controller.open).toBe(false);
  });
  it('reports current lazy failures honestly while leaving host error content visible', async () => {
    const onError = vi.fn(), onOpen = vi.fn(() => Promise.reject(new Error('Host loader failed'))), { panel, controller } = mount(undefined, undefined, { onError, onOpen });
    controller.show(); await settle(); expect(controller.pending).toBe(false); expect(controller.open).toBe(true); expect(panel.hidden).toBe(false); expect(onError).toHaveBeenCalledOnce();
  });
  it('handles reentrant callbacks and consumes rejected stale promises without subsequent callbacks', async () => {
    let controller!: ReturnType<typeof attachGlassPreview>; const onError = vi.fn();
    ({ controller } = mount(undefined, undefined, { onError, onOpen() { controller.hide(); return Promise.reject(new Error('Late')); } }));
    controller.show(); await settle(); expect(controller.open).toBe(false); expect(controller.pending).toBe(false); expect(onError).not.toHaveBeenCalled();
    controller.update({ onOpen() { throw new Error('Host'); }, onError() { throw new Error('Reporter'); }, onClose() { throw new Error('Close'); } });
    expect(() => { controller.show(); controller.hide(); controller.destroy(); }).not.toThrow();
  });
  it('finishes owned state before synchronous abort listeners and tolerates destroy during cancellation', () => {
    let controller!: ReturnType<typeof attachGlassPreview>;
    const trigger = document.createElement('button'), panel = document.createElement('section');
    ({ controller } = mount(trigger, panel, { semantics: 'disclosure', onOpen({ signal }) { signal.addEventListener('abort', () => { controller.show(); controller.update({ interaction: 'manual' }); }); } }));
    controller.show(); controller.hide(); expect(controller.open).toBe(false); expect(panel.hidden).toBe(true); expect(trigger.getAttribute('aria-expanded')).toBe('false');
    controller.update({ onOpen({ signal }) { signal.addEventListener('abort', () => controller.destroy()); } });
    controller.show(); controller.hide(); expect(controller.open).toBe(false); expect(panel.hasAttribute('hidden')).toBe(false); expect(panel.hasAttribute('id')).toBe(false); expect(trigger.hasAttribute('aria-expanded')).toBe(false); expect(changes.size).toBe(0);
  });
  it('does not let an update callback recreate attributes after destroying the controller', () => {
    let controller!: ReturnType<typeof attachGlassPreview>;
    const trigger = document.createElement('button'), panel = document.createElement('section');
    ({ controller } = mount(trigger, panel, { semantics: 'disclosure', onClose() { controller.destroy(); } }));
    controller.show(); controller.update({ semantics: 'disclosure', native: true });
    expect(controller.open).toBe(false); expect(panel.hasAttribute('hidden')).toBe(false); expect(panel.hasAttribute('id')).toBe(false); expect(trigger.hasAttribute('aria-expanded')).toBe(false);
  });
  it('bounds both delays and replacement updates cancel old timers and callbacks', () => {
    const old = vi.fn(), { trigger, controller } = mount(undefined, undefined, { openDelay: 99999, closeDelay: 99999, onOpen: old });
    pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(999); expect(controller.open).toBe(false); vi.advanceTimersByTime(1); expect(controller.open).toBe(true);
    pointer(trigger, 'pointerleave'); vi.advanceTimersByTime(999); expect(controller.open).toBe(true); vi.advanceTimersByTime(1); expect(controller.open).toBe(false);
    pointer(trigger, 'pointerenter'); controller.update({ interaction: 'manual' }); vi.advanceTimersByTime(2000); expect(old).toHaveBeenCalledOnce(); expect(controller.open).toBe(false);
    controller.update({ openDelay: -1 }); pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(0); expect(controller.open).toBe(true); expect(old).toHaveBeenCalledOnce();
  });
  it('cancels on page hidden and host detachment with no idle mutation observer or RAF', async () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), observe = vi.spyOn(MutationObserver.prototype, 'observe'), disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const { trigger, controller } = mount(); expect(observe).not.toHaveBeenCalled(); controller.show(); expect(observe).toHaveBeenCalledOnce();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); expect(controller.open).toBe(false); expect(disconnect).toHaveBeenCalled();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); controller.show(); trigger.remove(); await settle(); expect(controller.open).toBe(false); expect(raf).not.toHaveBeenCalled();
  });
  it('re-evaluates live pointer capability without disabling focus or explicit manual requests', () => {
    const { trigger, controller } = mount(); pointer(trigger, 'pointerenter'); fine = false; for (const fn of changes) fn(); vi.advanceTimersByTime(2000); expect(controller.open).toBe(false);
    trigger.focus(); expect(controller.open).toBe(true); for (const fn of changes) fn(); expect(controller.open).toBe(true);
    controller.hide(); controller.show(); expect(controller.open).toBe(true);
  });
  it('restores authored visibility/ARIA/id/styles exactly and preserves later host attribute edits', () => {
    const trigger = document.createElement('button'), panel = document.createElement('section'); trigger.setAttribute('aria-controls', 'old'); trigger.setAttribute('aria-expanded', 'mixed'); panel.setAttribute('hidden', 'until-found'); panel.id = 'authored'; panel.style.setProperty('position', 'absolute', 'important');
    const { controller } = mount(trigger, panel, { semantics: 'disclosure' }); controller.show(); controller.destroy();
    expect(trigger.getAttribute('aria-expanded')).toBe('mixed'); expect(trigger.getAttribute('aria-controls')).toBe('old'); expect(panel.getAttribute('hidden')).toBe('until-found'); expect(panel.id).toBe('authored'); expect(panel.style.getPropertyPriority('position')).toBe('important');
    const another = mount(undefined, undefined, { semantics: 'disclosure' }); another.trigger.setAttribute('aria-controls', 'host-change'); another.panel.setAttribute('hidden', 'host-hidden'); another.controller.destroy();
    expect(another.trigger.getAttribute('aria-controls')).toBe('host-change'); expect(another.panel.getAttribute('hidden')).toBe('host-hidden');
  });
  it('removes document Escape listeners on close, all input listeners on idempotent destroy, and permits reattachment', () => {
    const docRemove = vi.spyOn(document, 'removeEventListener'), { trigger, panel, controller } = mount(), remove = vi.spyOn(trigger, 'removeEventListener');
    controller.show(); controller.hide(); expect(docRemove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    controller.destroy(); controller.destroy(); controller.show(); controller.hide(); controller.toggle(); controller.update({}); expect(remove).toHaveBeenCalledTimes(4); expect(changes.size).toBe(0);
    expect(() => attachGlassPreview(trigger, panel).destroy()).not.toThrow();
  });
  it('rejects duplicate ownership, cross-document/nested hosts, invalid options and unsafe accessors transactionally', () => {
    const { trigger, panel, controller } = mount(); expect(() => attachGlassPreview(trigger, panel)).toThrow(/already/);
    for (const options of [{ openDelay: NaN }, { closeDelay: '1' }, { native: 1 }, { semantics: 'menu' }, { interaction: 'click' }, { onOpen: true }, { url: '/fetch' }, JSON.parse('{"__proto__":{}}')]) expect(() => controller.update(options as GlassPreviewOptions)).toThrow();
    let invoked = false; const accessor = {}; Object.defineProperty(accessor, 'openDelay', { get() { invoked = true; return 2; } }); expect(() => controller.update(accessor)).toThrow(/accessor/); expect(invoked).toBe(false);
    expect(() => attachGlassPreview(trigger, document.implementation.createHTMLDocument().createElement('div'))).toThrow(/same document/);
    trigger.append(document.createElement('div')); expect(() => attachGlassPreview(trigger, trigger.firstElementChild as HTMLElement)).toThrow(/nonnested/);
    controller.show(); expect(controller.open).toBe(true);
  });
});

describe('explicit native popover tier', () => {
  it('uses authored manual popovers without moving focus and synchronizes external show/hide', () => {
    const native = popover(), onOpen = vi.fn(), onClose = vi.fn(), { trigger, controller } = mount(undefined, native.panel, { native: true, onOpen, onClose, semantics: 'disclosure' });
    expect(controller.renderer).toBe('native-popover'); expect(native.panel.hidden).toBe(false);
    trigger.focus(); expect(native.visible).toBe(true); expect(controller.open).toBe(true); expect(document.activeElement).toBe(trigger); expect(onOpen).toHaveBeenCalledOnce();
    native.transition(false); expect(controller.open).toBe(false); expect(trigger.getAttribute('aria-expanded')).toBe('false'); expect(onClose).toHaveBeenCalledOnce();
    native.transition(true); expect(controller.open).toBe(true); expect(onOpen.mock.calls.at(-1)?.[0].reason).toBe('native');
  });
  it('uses current native state rather than a coalesced stale toggle event', () => {
    const native = popover(), { controller } = mount(undefined, native.panel, { native: true });
    controller.show(); controller.hide(); controller.show(); const stale = new Event('toggle'); Object.defineProperty(stale, 'newState', { value: 'closed' }); native.panel.dispatchEvent(stale);
    expect(controller.open).toBe(true); expect(native.visible).toBe(true);
  });
  it('removes incompatible popover attributes in hidden mode and restores lexical author values', () => {
    const native = popover(); native.panel.setAttribute('popover', 'auto'); const { controller } = mount(undefined, native.panel, { native: true });
    expect(controller.renderer).toBe('hidden'); expect(native.panel.hasAttribute('popover')).toBe(false); controller.show(); expect(native.panel.hidden).toBe(false); controller.destroy(); expect(native.panel.getAttribute('popover')).toBe('auto');
    const next = popover(), mounted = mount(undefined, next.panel); next.panel.setAttribute('popover', 'hint'); mounted.controller.destroy(); expect(next.panel.getAttribute('popover')).toBe('hint');
  });
  it('falls back when methods are unsupported or native showing throws', () => {
    const panel = document.createElement('div'); panel.setAttribute('popover', 'manual'); const fallback = mount(undefined, panel, { native: true }); expect(fallback.controller.renderer).toBe('hidden');
    const native = popover(); native.panel.showPopover = vi.fn(() => { throw new DOMException('Unavailable'); }); const mounted = mount(undefined, native.panel, { native: true });
    mounted.controller.show(); expect(mounted.controller.renderer).toBe('hidden'); expect(mounted.controller.open).toBe(true); expect(native.panel.hasAttribute('popover')).toBe(false);
    mounted.controller.destroy(); expect(native.panel.getAttribute('popover')).toBe('manual');
  });
  it('honors canceled beforetoggle and does not load hidden content', () => {
    const native = popover(), onOpen = vi.fn(); native.panel.addEventListener('beforetoggle', event => { if ((event as ToggleEvent).newState === 'open') event.preventDefault(); });
    const { trigger, controller } = mount(undefined, native.panel, { native: true, onOpen }); pointer(trigger, 'pointerenter'); vi.advanceTimersByTime(120);
    expect(controller.open).toBe(false); expect(onOpen).not.toHaveBeenCalled(); expect(native.panel.hasAttribute('popover')).toBe(true);
  });
  it('guards beforetoggle reentrant update and rejects already host-owned native popovers', () => {
    const native = popover(), onOpen = vi.fn(); const { controller } = mount(undefined, native.panel, { native: true, onOpen });
    native.panel.addEventListener('beforetoggle', event => { if ((event as ToggleEvent).newState === 'open') { event.preventDefault(); controller.update({ interaction: 'manual' }); } });
    controller.show(); expect(controller.open).toBe(false); expect(onOpen).not.toHaveBeenCalled();
    const owned = popover(); document.body.append(owned.panel); owned.transition(true); expect(() => attachGlassPreview(document.createElement('button'), owned.panel, { native: true })).toThrow(/host-owned/);
  });
  it('avoids native autofocus in initial or lazy host content', () => {
    const native = popover(); const field = document.createElement('input'); field.autofocus = true; native.panel.append(field);
    const mounted = mount(undefined, native.panel, { native: true }); expect(mounted.controller.renderer).toBe('hidden'); mounted.controller.show(); expect(native.panel.showPopover).not.toHaveBeenCalled();
    const later = popover(), next = mount(undefined, later.panel, { native: true }); later.panel.append(field); next.controller.show(); expect(next.controller.renderer).toBe('hidden'); expect(later.panel.showPopover).not.toHaveBeenCalled();
  });
  it('uses a coherent hidden fallback when native hiding throws and restores owned attributes on destroy', () => {
    const native = popover(), { controller } = mount(undefined, native.panel, { native: true });
    controller.show(); native.panel.hidePopover = vi.fn(() => { throw new Error('Native state failure'); }); controller.hide();
    expect(controller.open).toBe(false); expect(controller.renderer).toBe('hidden'); expect(native.panel.hidden).toBe(true); expect(native.panel.hasAttribute('popover')).toBe(false);
    controller.destroy(); expect(native.panel.getAttribute('popover')).toBe('manual'); expect(native.panel.hasAttribute('hidden')).toBe(false);
  });
  it('is import-safe during SSR and performs no global browser reads at module evaluation', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { const module = await import('../src/preview-intent.js'); expect(typeof module.attachGlassPreview).toBe('function'); }
    finally { vi.unstubAllGlobals(); }
  });
});
