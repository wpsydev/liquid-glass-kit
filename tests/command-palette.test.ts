import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountGlassCommandPalette } from '../src/command-palette.js';
import type { GlassCommand, GlassCommandPaletteOptions } from '../src/command-palette.js';

let showDescriptor: PropertyDescriptor | undefined, closeDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  const prototype = HTMLDialogElement.prototype;
  showDescriptor = Object.getOwnPropertyDescriptor(prototype, 'showModal'); closeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'close');
  // jsdom lacks the native top layer. This only models open/close state for
  // behavior tests; browser modality, focus containment and layout need live QA.
  Object.defineProperties(prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); } },
  });
});
afterEach(() => {
  vi.restoreAllMocks(); document.body.replaceChildren();
  if (showDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showDescriptor); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
const baseCommands = (): GlassCommand[] => [
  { id: 'open', label: 'Open file', group: 'Navigation', keywords: ['jump', 'document'] },
  { id: 'disabled', label: 'Delete project', group: 'Danger', disabled: true },
  { id: 'theme', label: 'Toggle theme', description: 'Switch appearance', group: 'Appearance' },
];
function fixture(options: Partial<GlassCommandPaletteOptions> = {}) {
  const host = document.createElement('div'); host.innerHTML = '<p>Host content</p>'; document.body.append(host);
  const onSelect = vi.fn();
  const controller = mountGlassCommandPalette(host, { commands: baseCommands(), onSelect, ...options });
  const dialog = host.querySelector('dialog')!, input = dialog.querySelector('input')!;
  return { host, controller, dialog, input, onSelect };
}
const options = (dialog: HTMLDialogElement) => [...dialog.querySelectorAll<HTMLButtonElement>('[role=option]')];
const active = (dialog: HTMLDialogElement) => dialog.querySelector<HTMLButtonElement>('[aria-selected=true]');
function key(target: HTMLElement, key: string, modifiers: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }); target.dispatchEvent(event); return event;
}
function query(input: HTMLInputElement, text: string) { input.value = text; input.dispatchEvent(new Event('input')); }
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('optional native command palette', () => {
  it('cycles the owned modal controls without extra result-list stops or browser shortcut interception', () => {
    const { dialog, input, controller } = fixture(); controller.open();
    const close = dialog.querySelector<HTMLButtonElement>('.lg-command-close')!;
    expect(dialog.querySelector<HTMLElement>('[role=listbox]')!.tabIndex).toBe(-1);
    expect(key(input, 'Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    expect(key(close, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(key(input, 'Tab', { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    controller.destroy(); expect(key(close, 'Tab').defaultPrevented).toBe(false);
  });
  it('owns only appended DOM, is initially closed and does not bind shortcuts by default', () => {
    const { host, dialog, controller } = fixture(); const before = host.firstChild;
    expect(dialog.open).toBe(false); expect(key(document.body, 'k', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(dialog.open).toBe(false); controller.destroy(); controller.destroy(); controller.open(); controller.updateCommands([]);
    expect(host.childNodes).toHaveLength(1); expect(host.firstChild).toBe(before);
  });
  it('uses labeled combobox, listbox, named groups and one active descendant without moving DOM focus', () => {
    const { dialog, input, controller } = fixture(); controller.open();
    expect(document.activeElement).toBe(input); expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.querySelector(`[id="${input.getAttribute('aria-controls')}"]`)?.getAttribute('role')).toBe('listbox');
    expect(input.getAttribute('aria-activedescendant')).toBe(active(dialog)?.id);
    expect(dialog.querySelector('[role=group]')?.getAttribute('aria-label')).toBe('Navigation'); controller.destroy();
  });
  it('matches accent-insensitive keywords/descriptions and removes empty group headings', () => {
    const { dialog, input, controller } = fixture({ commands: [{ id: 'cafe', label: 'Café workspace', group: 'Projects', keywords: ['résumé'] }, { id: 'theme', label: 'Theme', description: 'Soft contrast', group: 'Appearance' }] });
    controller.open(); query(input, 'cafe resume'); expect(options(dialog).map(row => row.dataset.commandId)).toEqual(['cafe']);
    expect(dialog.querySelectorAll('[role=group]')).toHaveLength(1); expect(dialog.querySelector('[role=group]')?.getAttribute('aria-label')).toBe('Projects');
    query(input, 'soft contrast'); expect(active(dialog)?.dataset.commandId).toBe('theme');
    query(input, 'nothing matches'); expect(options(dialog)).toHaveLength(0); expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(dialog.querySelector<HTMLElement>('.lg-command-empty')!.hidden).toBe(false); controller.destroy();
  });
  it('wraps enabled commands, skips disabled options and supports boundary navigation', () => {
    const { dialog, input, controller } = fixture(); controller.open();
    key(input, 'ArrowDown'); expect(active(dialog)?.dataset.commandId).toBe('theme');
    key(input, 'ArrowDown'); expect(active(dialog)?.dataset.commandId).toBe('open');
    key(input, 'ArrowUp'); expect(active(dialog)?.dataset.commandId).toBe('theme');
    key(input, 'Home'); expect(active(dialog)?.dataset.commandId).toBe('open');
    key(input, 'End'); expect(active(dialog)?.dataset.commandId).toBe('theme'); expect(document.activeElement).toBe(input); controller.destroy();
  });
  it('keeps keyboard order aligned with the visible grouped order', () => {
    const { dialog, input, controller } = fixture({ commands: [{ id: 'a', label: 'A', group: 'First' }, { id: 'b', label: 'B', group: 'Second' }, { id: 'c', label: 'C', group: 'First' }] });
    controller.open(); expect(options(dialog).map(row => row.dataset.commandId)).toEqual(['a', 'c', 'b']);
    key(input, 'ArrowDown'); expect(active(dialog)?.dataset.commandId).toBe('c'); controller.destroy();
  });
  it('preserves text editing and IME/default-prevented interactions', () => {
    const { dialog, input, controller, onSelect } = fixture(); controller.open(); query(input, 'theme');
    expect(key(input, 'Home').defaultPrevented).toBe(false); expect(key(input, 'End').defaultPrevented).toBe(false);
    expect(key(input, 'Home', { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    expect(key(input, 'Home', { ctrlKey: true }).defaultPrevented).toBe(true);
    key(input, 'Enter', { isComposing: true }); expect(onSelect).not.toHaveBeenCalled();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); event.preventDefault(); input.dispatchEvent(event);
    expect(onSelect).not.toHaveBeenCalled(); expect(dialog.open).toBe(true); controller.destroy();
  });
  it('calls the host only on activation, then closes and restores the invoking control', async () => {
    const external = document.createElement('button'); document.body.append(external); external.focus();
    const { dialog, input, controller, onSelect } = fixture(); controller.open(); query(input, 'theme');
    expect(onSelect).not.toHaveBeenCalled(); key(input, 'Enter'); await flush();
    expect(onSelect).toHaveBeenCalledOnce(); expect(onSelect.mock.calls[0][0].id).toBe('theme'); expect(dialog.open).toBe(false); expect(document.activeElement).toBe(external); controller.destroy();
  });
  it('prefers an individual handler and makes absent/disabled handlers unavailable', async () => {
    const individual = vi.fn(), { dialog, input, controller, onSelect } = fixture({ commands: [{ id: 'individual', label: 'Individual', onSelect: individual }] });
    controller.open(); key(input, 'Enter'); await flush(); expect(individual).toHaveBeenCalledOnce(); expect(onSelect).not.toHaveBeenCalled(); controller.destroy();
    const unavailable = fixture({ onSelect: undefined }); unavailable.controller.open(); expect(options(unavailable.dialog).every(row => row.disabled)).toBe(true);
    expect(active(unavailable.dialog)).toBeNull(); unavailable.controller.destroy();
  });
  it('guards repeated async commands and allows explicit retry after rejection', async () => {
    let reject!: (error: unknown) => void; const onSelect = vi.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
    const { dialog, input, controller } = fixture({ onSelect }); controller.open(); const row = active(dialog)!; row.click(); row.click(); key(input, 'Enter');
    expect(onSelect).toHaveBeenCalledOnce(); expect(input.readOnly).toBe(true); expect(options(dialog).every(value => value.disabled)).toBe(true);
    reject(new Error('private details')); await flush(); expect(dialog.textContent).toContain('Could not run the command'); expect(dialog.textContent).not.toContain('private details');
    expect(input.readOnly).toBe(false); row.click(); expect(onSelect).toHaveBeenCalledTimes(2); controller.destroy();
  });
  it('invalidates detached controls on catalog changes and on filtered row replacement', () => {
    const { dialog, input, controller, onSelect } = fixture(); controller.open(); const old = active(dialog)!;
    query(input, 'open'); old.click(); expect(onSelect).not.toHaveBeenCalled(); const filtered = active(dialog)!;
    controller.updateCommands([{ id: 'open', label: 'Open replacement', revision: 2 }]); filtered.click(); expect(onSelect).not.toHaveBeenCalled();
    active(dialog)!.click(); expect(onSelect).toHaveBeenCalledOnce(); expect(onSelect.mock.calls[0][0].revision).toBe(2); controller.destroy();
  });
  it('does not let an old asynchronous success close a newly updated or reopened palette', async () => {
    let finish!: () => void; const onSelect = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { dialog, input, controller } = fixture({ onSelect }); controller.open(); key(input, 'Enter');
    controller.updateCommands([{ id: 'open', label: 'Revised command', revision: 2 }]); controller.close(); controller.open(); finish(); await flush();
    expect(dialog.open).toBe(true); expect(input.readOnly).toBe(false); expect(active(dialog)?.textContent).toContain('Revised command'); controller.destroy();
  });
  it('closes on cancel/backdrop but not surface clicks, restoring focus safely', () => {
    const external = document.createElement('button'); document.body.append(external); external.focus();
    const { dialog, controller } = fixture(); controller.open(); dialog.querySelector('.lg-command-surface')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); expect(dialog.open).toBe(true);
    dialog.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); dialog.dispatchEvent(new MouseEvent('click', { bubbles: true })); expect(dialog.open).toBe(false); expect(document.activeElement).toBe(external);
    controller.open(); const cancel = new Event('cancel', { cancelable: true }); dialog.dispatchEvent(cancel); expect(cancel.defaultPrevented).toBe(true); expect(dialog.open).toBe(false); controller.destroy();
  });
  it('ignores an asynchronously queued close event from a prior opening', () => {
    const { dialog, input, controller } = fixture(); controller.open(); controller.close(); controller.open();
    dialog.dispatchEvent(new Event('close'));
    expect(dialog.open).toBe(true); expect(input.getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(input); controller.destroy();
  });
  it('enables Mod+K only by opt-in and leaves text fields, composition and handled events alone', () => {
    const { dialog, controller } = fixture({ shortcut: true });
    expect(key(document.body, 'k', { ctrlKey: true }).defaultPrevented).toBe(true); expect(dialog.open).toBe(true); controller.close();
    const text = document.createElement('input'); document.body.append(text); expect(key(text, 'k', { metaKey: true }).defaultPrevented).toBe(false); expect(dialog.open).toBe(false);
    const editable = document.createElement('div'); editable.contentEditable = 'true'; editable.setAttribute('contenteditable', 'true'); document.body.append(editable);
    expect(key(editable, 'k', { ctrlKey: true }).defaultPrevented).toBe(false); expect(key(document.body, 'k', { ctrlKey: true, isComposing: true }).defaultPrevented).toBe(false);
    const handled = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }); handled.preventDefault(); document.body.dispatchEvent(handled); expect(dialog.open).toBe(false);
    controller.destroy(); expect(key(document.body, 'k', { ctrlKey: true }).defaultPrevented).toBe(false);
  });
  it('renders bounded results and searches cached catalog text rather than normalizing every command per keystroke', () => {
    const commands = Array.from({ length: 500 }, (_, index) => ({ id: `command-${index}`, label: `Command ${index}`, keywords: ['cached'] }));
    const { dialog, input, controller } = fixture({ commands, maxResults: 999 }); controller.open(); expect(options(dialog)).toHaveLength(100);
    const normalize = vi.spyOn(String.prototype, 'normalize'); query(input, 'cached'); expect(normalize).toHaveBeenCalledOnce(); normalize.mockRestore();
    expect(dialog.textContent).toContain('Showing 100 of 500'); controller.destroy();
  });
  it('removes an opted-in shortcut even if the caller later mutates its options object', () => {
    const host = document.createElement('div'); document.body.append(host);
    const configuration = { commands: baseCommands(), onSelect: vi.fn(), shortcut: true };
    const controller = mountGlassCommandPalette(host, configuration); configuration.shortcut = false;
    controller.destroy(); expect(key(document.body, 'k', { ctrlKey: true }).defaultPrevented).toBe(false);
  });
  it('does not execute host strings as HTML and updates catalogs transactionally', () => {
    const malicious = '<img src=x onerror=alert(1)>', { dialog, controller } = fixture({ commands: [{ id: malicious, label: malicious, description: malicious, group: malicious }] });
    controller.open(); expect(dialog.querySelector('img')).toBeNull(); expect(dialog.textContent).toContain(malicious);
    expect(() => controller.updateCommands([{ id: 'duplicate', label: 'a' }, { id: 'duplicate', label: 'b' }])).toThrow('unique');
    expect(options(dialog)[0].dataset.commandId).toBe(malicious); controller.destroy();
  });
  it('keeps host-provided objects and global callback descriptors separate from internal state', async () => {
    const supplied = { id: 'original', label: 'Original', keywords: ['safe'] };
    const onSelect = vi.fn((command: GlassCommand) => { command.id = 'mutated'; (command.keywords as string[]).push('other'); });
    const { input, controller } = fixture({ commands: [supplied], onSelect }); supplied.label = 'Host mutated without update'; controller.open(); query(input, 'original'); key(input, 'Enter'); await flush();
    expect(onSelect).toHaveBeenCalledOnce(); expect(supplied.id).toBe('original'); expect(supplied.keywords).toEqual(['safe']); controller.destroy();
  });
  it('does no idle RAF/geometry work and neutralizes saved rows after destruction', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const { dialog, controller, onSelect } = fixture({ reducedMotion: true }); controller.open(); const old = active(dialog)!;
    expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled(); expect(dialog.dataset.reducedMotion).toBe('true');
    controller.destroy(); old.click(); expect(onSelect).not.toHaveBeenCalled();
  });
  it('reports unsupported native modality explicitly rather than presenting a broken modal', () => {
    const { dialog, controller } = fixture(); Object.defineProperty(dialog, 'showModal', { value: undefined });
    expect(() => controller.open()).toThrow('native dialog.showModal'); expect(dialog.open).toBe(false); controller.destroy();
  });
});
