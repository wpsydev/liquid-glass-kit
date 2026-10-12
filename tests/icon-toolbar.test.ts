import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { attachGlassIconToolbar, getGlassIconActionProps } from '../src/icon-toolbar.js';
import type { GlassIconToolbar, GlassIconToolbarOptions } from '../src/icon-toolbar.js';
const controllers: GlassIconToolbar[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); document.body.replaceChildren(); vi.restoreAllMocks(); });
function fixture(options: Partial<GlassIconToolbarOptions> = {}, setup?: (root: HTMLElement, items: HTMLButtonElement[]) => void) {
  const root = document.createElement('div'), items = ['Select', 'Rotate', 'Snap', 'Export'].map(name => { const button = document.createElement('button'); button.type = 'button'; button.textContent = name; root.append(button); return button; });
  setup?.(root, items); const outside = document.createElement('input'); document.body.append(root, outside);
  const controller = attachGlassIconToolbar(root, { label: 'Object actions', items, ...options }); controllers.push(controller); return { root, items, outside, controller };
}
function key(target: EventTarget, value: string, extras: KeyboardEventInit = {}) { const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...extras }); target.dispatchEvent(event); return event; }

describe('native icon action toolbar focus policy', () => {
  it('creates one keyboard entry and a named toolbar without changing native actions, content or toggle state', () => {
    const f = fixture({}, (_, items) => { items[1].setAttribute('aria-pressed', 'false'); items[2].setAttribute('aria-label', 'Snap to grid'); }); const nodes = [...f.root.childNodes];
    expect(f.root.getAttribute('role')).toBe('toolbar'); expect(f.root.getAttribute('aria-label')).toBe('Object actions'); expect(f.root.getAttribute('aria-orientation')).toBe('horizontal'); expect(f.items.map(item => item.tabIndex)).toEqual([0, -1, -1, -1]); expect(f.items[1].getAttribute('aria-pressed')).toBe('false'); expect(f.items[2].getAttribute('aria-label')).toBe('Snap to grid'); expect([...f.root.childNodes]).toEqual(nodes); expect(f.items.every(item => item.type === 'button')).toBe(true);
  });
  it('moves focus with arrows, wraps, supports Home/End and never activates or toggles a command', () => {
    const f = fixture(); const clicks = vi.fn(); f.root.addEventListener('click', clicks); f.items[0].focus(); expect(key(f.items[0], 'ArrowRight').defaultPrevented).toBe(true); expect(document.activeElement).toBe(f.items[1]);
    key(f.items[1], 'End'); expect(document.activeElement).toBe(f.items[3]); key(f.items[3], 'ArrowRight'); expect(document.activeElement).toBe(f.items[0]); key(f.items[0], 'ArrowLeft'); expect(document.activeElement).toBe(f.items[3]); key(f.items[3], 'Home'); expect(document.activeElement).toBe(f.items[0]); expect(clicks).not.toHaveBeenCalled(); expect(f.items[0].hasAttribute('aria-pressed')).toBe(false);
  });
  it('remembers the last focused action when ordinary Tab leaves and re-enters', () => {
    const f = fixture(); f.items[2].focus(); f.outside.focus(); expect(f.controller.activeItem).toBe(f.items[2]); expect(f.items.map(item => item.tabIndex)).toEqual([-1, -1, 0, -1]); expect(key(f.items[2], 'Tab').defaultPrevented).toBe(false); expect(key(f.items[2], 'Tab', { shiftKey: true }).defaultPrevented).toBe(false);
  });
  it('uses RTL horizontal order and vertical orientation without stealing perpendicular arrows', () => {
    const f = fixture({ direction: 'rtl' }); f.items[0].focus(); key(f.items[0], 'ArrowLeft'); expect(document.activeElement).toBe(f.items[1]); expect(key(f.items[1], 'ArrowDown').defaultPrevented).toBe(false);
    f.controller.update({ orientation: 'vertical' }); expect(f.root.getAttribute('aria-orientation')).toBe('vertical'); key(f.items[1], 'ArrowDown'); expect(document.activeElement).toBe(f.items[2]); key(f.items[2], 'ArrowUp'); expect(document.activeElement).toBe(f.items[1]); expect(key(f.items[1], 'ArrowRight').defaultPrevented).toBe(false);
  });
  it('resolves inherited CSS direction on refresh and bounds movement when wrap is false', () => {
    const f = fixture({ wrap: false }, root => { root.style.direction = 'rtl'; }); f.items[0].focus(); key(f.items[0], 'ArrowRight'); expect(document.activeElement).toBe(f.items[0]); key(f.items[0], 'ArrowLeft'); expect(document.activeElement).toBe(f.items[1]); f.root.style.direction = 'ltr'; f.controller.refresh(); key(f.items[1], 'ArrowRight'); expect(document.activeElement).toBe(f.items[2]); key(f.items[2], 'End'); key(f.items[3], 'ArrowRight'); expect(document.activeElement).toBe(f.items[3]);
  });
  it('leaves native Enter, Space, click, modified keys and default-prevented/composing events unchanged', () => {
    const f = fixture(); f.items[0].focus(); const action = vi.fn(() => f.items[0].setAttribute('aria-pressed', 'true')); f.items[0].addEventListener('click', action);
    for (const value of ['Enter', ' ', 'Escape']) expect(key(f.items[0], value).defaultPrevented).toBe(false);
    for (const extras of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }]) expect(key(f.items[0], 'ArrowRight', extras).defaultPrevented).toBe(false);
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }); event.preventDefault(); f.items[0].dispatchEvent(event); expect(document.activeElement).toBe(f.items[0]);
    f.items[0].click(); expect(action).toHaveBeenCalledOnce(); expect(f.items[0].getAttribute('aria-pressed')).toBe('true');
  });
  it('skips native/ARIA disabled, hidden, inert and CSS-hidden actions without observing or polling them', () => {
    const f = fixture(); f.items[1].disabled = true; f.items[2].setAttribute('aria-disabled', 'true'); f.controller.refresh(); f.items[0].focus(); key(f.items[0], 'ArrowRight'); expect(document.activeElement).toBe(f.items[3]);
    f.items[1].disabled = false; f.items[2].removeAttribute('aria-disabled'); f.items[1].hidden = true; f.items[2].style.display = 'none'; f.controller.refresh(); key(f.items[3], 'ArrowLeft'); expect(document.activeElement).toBe(f.items[0]); f.root.setAttribute('inert', ''); f.controller.refresh(); expect(f.controller.activeItem).toBeNull(); expect(f.items.every(item => item.tabIndex === -1)).toBe(true);
  });
  it('rescues an owned focused action after disabling it but never steals outside focus', () => {
    const f = fixture(); f.items[1].focus(); f.items[1].disabled = true; f.controller.refresh(); expect(document.activeElement).toBe(f.items[2]);
    f.outside.focus(); f.items[2].hidden = true; f.controller.refresh(); expect(document.activeElement).toBe(f.outside); expect(f.controller.activeItem).toBe(f.items[3]);
  });
  it('remembers stranded focus for removed actions and chooses a stable replacement on membership update', () => {
    const f = fixture(); f.items[1].focus(); f.items[1].remove(); f.controller.update({ items: [f.items[0], f.items[2], f.items[3]] }); expect(document.activeElement).toBe(f.items[2]); expect(f.controller.activeItem).toBe(f.items[2]); expect(f.items[1].hasAttribute('tabindex')).toBe(false);
  });
  it('does not rescue a deliberately blurred action after a later unrelated host edit', () => {
    const f = fixture(); f.items[1].focus(); f.items[1].blur(); f.items[1].disabled = true; f.controller.refresh(); expect(document.activeElement).toBe(document.body);
  });
  it('tracks pointer/native focus and host pressed state without a selection model or activation handler', () => {
    const f = fixture(); f.items[2].focus(); f.items[2].setAttribute('aria-pressed', 'true'); f.controller.refresh(); expect(f.controller.activeItem).toBe(f.items[2]); expect(f.items[2].getAttribute('aria-pressed')).toBe('true'); expect(f.items[0].hasAttribute('aria-selected')).toBe(false); expect(f.root.querySelector('[role=tab],[role=menuitem]')).toBeNull();
  });
  it('preserves a real form submitter and anchor activation even when ARIA disabled is excluded from roving', () => {
    const f = fixture(); const form = document.createElement('form'); document.body.append(form); form.append(f.root); f.items[3].type = 'submit'; f.items[3].name = 'intent'; f.items[3].value = 'export'; const submit = vi.fn((event: Event) => event.preventDefault()); form.addEventListener('submit', submit); f.items[3].click(); expect(submit).toHaveBeenCalledOnce(); expect((submit.mock.calls[0][0] as SubmitEvent).submitter).toBe(f.items[3]);
    f.controller.destroy(); const link = document.createElement('a'); link.href = '#docs'; link.textContent = 'Docs'; link.setAttribute('aria-disabled', 'true'); f.root.append(link); const click = vi.fn((event: Event) => event.preventDefault()); link.addEventListener('click', click); const next = attachGlassIconToolbar(f.root, { label: 'Object actions', items: [...f.items, link] }); controllers.push(next); expect(link.tabIndex).toBe(-1); link.click(); expect(click).toHaveBeenCalledOnce();
  });
  it('restores original role/name/orientation/tabindex while retaining external label and unrelated DOM changes', () => {
    const f = fixture({}, (root, items) => { root.setAttribute('role', 'group'); root.setAttribute('aria-label', 'Authored group'); root.setAttribute('aria-orientation', 'vertical'); root.classList.add('authored'); items[0].tabIndex = 5; items[1].tabIndex = -1; });
    f.root.setAttribute('aria-label', 'Host renamed actions'); f.items[1].style.color = 'red'; f.controller.update({ label: 'New helper label' }); expect(f.root.getAttribute('aria-label')).toBe('Host renamed actions'); f.controller.destroy(); expect(f.root.getAttribute('role')).toBe('group'); expect(f.root.getAttribute('aria-label')).toBe('Host renamed actions'); expect(f.root.getAttribute('aria-orientation')).toBe('vertical'); expect(f.items[0].tabIndex).toBe(5); expect(f.items[1].getAttribute('tabindex')).toBe('-1'); expect(f.items[2].hasAttribute('tabindex')).toBe(false); expect(f.items[1].style.color).toBe('red'); expect(f.root.classList.contains('authored')).toBe(true); expect(f.root.classList.contains('lg-icon-toolbar')).toBe(false);
  });
  it('preserves authored visible-name relationships, existing CSS class and later external tabindex ownership', () => {
    const f = fixture({}, root => { root.setAttribute('aria-labelledby', 'visible-name'); root.classList.add('lg-icon-toolbar'); }); f.items[2].tabIndex = 7; f.controller.refresh(); expect(f.controller.activeItem).toBeNull(); expect(f.items[2].tabIndex).toBe(7); expect(f.items[0].hasAttribute('tabindex')).toBe(false); f.controller.destroy(); expect(f.root.getAttribute('aria-labelledby')).toBe('visible-name'); expect(f.root.classList.contains('lg-icon-toolbar')).toBe(true); expect(f.items[2].tabIndex).toBe(7);
  });
  it('stops for an external role/orientation owner instead of fighting its keyboard policy', () => {
    const f = fixture(); f.items[0].focus(); f.root.setAttribute('role', 'group'); f.controller.refresh(); expect(key(f.items[0], 'ArrowRight').defaultPrevented).toBe(false); expect(f.controller.activeItem).toBeNull(); f.controller.destroy(); expect(f.root.getAttribute('role')).toBe('group');
  });
  it('copies updates, validates replacements atomically and preserves outside focus across orientation updates', () => {
    const f = fixture(); const items = [...f.items]; f.outside.focus(); f.controller.update({ items, label: 'Drawing tools', direction: 'rtl', orientation: 'vertical' }); items.pop(); expect(f.root.getAttribute('aria-label')).toBe('Drawing tools'); expect(f.items[3].tabIndex).toBe(-1); expect(document.activeElement).toBe(f.outside); expect(() => f.controller.update({ items: [f.items[0], f.items[0]] })).toThrow('unique'); expect(f.root.getAttribute('aria-label')).toBe('Drawing tools'); expect(f.items[0].tabIndex).toBe(0);
  });
  it('does not handle keys from nested modal/composite fields added by the host', () => {
    const f = fixture(); const input = document.createElement('input'); f.root.append(input); input.focus(); expect(key(input, 'ArrowRight').defaultPrevented).toBe(false); expect(document.activeElement).toBe(input);
    const nested = document.createElement('div'); nested.setAttribute('role', 'toolbar'); const button = document.createElement('button'); button.textContent = 'Nested'; nested.append(button); f.root.append(nested); button.focus(); expect(key(button, 'ArrowRight').defaultPrevented).toBe(false);
  });
  it('isolates an owned item moved into a new nested toolbar before explicit membership refresh', () => {
    const f = fixture(); const nested = document.createElement('div'); nested.setAttribute('role', 'toolbar'); f.root.append(nested); nested.append(f.items[1]); f.items[1].focus(); expect(key(f.items[1], 'ArrowRight').defaultPrevented).toBe(false); expect(document.activeElement).toBe(f.items[1]);
  });
  it('rejects reordered rosters and native controls assigned a conflicting composite role', () => {
    const f = fixture(); f.controller.destroy(); expect(() => attachGlassIconToolbar(f.root, { label: 'Wrong order', items: [f.items[1], f.items[0], f.items[2], f.items[3]] })).toThrow('DOM order'); f.items[1].setAttribute('role', 'slider'); expect(() => attachGlassIconToolbar(f.root, { label: 'Composite', items: f.items })).toThrow('composite');
  });
  it('tears down event handlers, stays inert after destroy, and permits reattachment', () => {
    const f = fixture(); const nodes = [...f.root.childNodes]; f.controller.destroy(); f.controller.destroy(); f.items[0].focus(); expect(key(f.items[0], 'ArrowRight').defaultPrevented).toBe(false); expect(f.controller.activeItem).toBeNull(); f.controller.refresh(); f.controller.update({ orientation: 'vertical' }); expect([...f.root.childNodes]).toEqual(nodes); const next = attachGlassIconToolbar(f.root, { label: 'New toolbar', items: f.items }); controllers.push(next); expect(next.activeItem).toBe(f.items[0]);
  });
  it('rejects shared scopes, unsupported/native nested controls and incomplete membership before mutation', () => {
    const f = fixture(); expect(() => attachGlassIconToolbar(f.root, { label: 'Other', items: f.items })).toThrow('unowned'); f.controller.destroy(); const input = document.createElement('input'); f.root.append(input); expect(() => attachGlassIconToolbar(f.root, { label: 'Fields', items: f.items })).toThrow('fields'); input.remove(); const nested = document.createElement('span'); nested.tabIndex = 0; f.items[0].append(nested); expect(() => attachGlassIconToolbar(f.root, { label: 'Nested', items: f.items })).toThrow('nested'); nested.remove(); expect(() => attachGlassIconToolbar(f.root, { label: 'Missing', items: f.items.slice(1) })).toThrow('explicitly own'); expect(f.root.hasAttribute('role')).toBe(false); expect(f.items.every(item => !item.hasAttribute('tabindex'))).toBe(true);
  });
  it('requires bounded native items, meaningful group label and valid options', () => {
    const f = fixture(); f.controller.destroy(); for (const options of [{ label: '' }, { label: 'a'.repeat(161) }, { direction: 'reverse' }, { orientation: 'diagonal' }, { wrap: 'yes' }, { items: [] }, { items: Array(33).fill(f.items[0]) }]) expect(() => attachGlassIconToolbar(f.root, { label: 'Tools', items: f.items, ...options } as never)).toThrow();
  });
  it('uses no geometry, observers, timer, pointer loop or animation frame machinery', () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect'), raf = vi.spyOn(window, 'requestAnimationFrame'), timer = vi.spyOn(window, 'setTimeout'); const f = fixture(); f.controller.refresh(); f.controller.update({ direction: 'rtl' }); expect(rect).not.toHaveBeenCalled(); expect(raf).not.toHaveBeenCalled(); expect(timer).not.toHaveBeenCalled(); expect(f.root.hasAttribute('data-lg-dock-item')).toBe(false);
  });
});
describe('native icon action props', () => {
  it('returns frozen native props and stable explicit toggle names without menu/grid roles', () => {
    const props = getGlassIconActionProps({ label: '  Snap   to grid ', pressed: true }); expect(props).toEqual({ className: 'lg-icon-action', type: 'button', 'aria-label': 'Snap to grid', disabled: false, 'aria-pressed': 'true' }); expect(Object.isFrozen(props)).toBe(true); expect(getGlassIconActionProps({ label: 'Export', disabled: true })).toEqual({ className: 'lg-icon-action', type: 'button', 'aria-label': 'Export', disabled: true });
  });
  it('rejects invalid booleans, control characters and empty/oversized labels', () => {
    for (const options of [{ label: ' ' }, { label: 'a'.repeat(161) }, { label: 'Name\0' }, { label: 'Save', disabled: 'yes' }, { label: 'Snap', pressed: 'mixed' }]) expect(() => getGlassIconActionProps(options as never)).toThrow();
  });
});
describe('connected authored hidden-action CSS cascade', () => {
  it('keeps hidden native actions out of flex layout until the host reveals and refreshes', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/icon-toolbar.css', 'utf8');
    document.head.append(style);
    try {
      const f = fixture();
      expect(getComputedStyle(f.items[1]).display).toBe('inline-flex');
      f.items[1].hidden = true;
      f.controller.refresh();
      expect(getComputedStyle(f.items[1]).display).toBe('none');
      expect(f.items[1].tabIndex).toBe(-1);
      f.items[1].setAttribute('hidden', 'until-found');
      f.controller.refresh();
      expect(getComputedStyle(f.items[1]).display).toBe('none');
      f.items[1].removeAttribute('hidden');
      f.controller.refresh();
      expect(getComputedStyle(f.items[1]).display).toBe('inline-flex');
      f.items[0].focus();
      key(f.items[0], 'ArrowRight');
      expect(document.activeElement).toBe(f.items[1]);
    } finally { style.remove(); }
  });
});
