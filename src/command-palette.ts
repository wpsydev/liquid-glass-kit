/** Optional host-owned commands. Import /command-palette.css separately. */
export interface GlassCommand {
  id: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: readonly string[];
  /** Display-only hint: the library does not bind individual command shortcuts. */
  shortcut?: string;
  /** Host identity metadata; change whenever the executable proposal changes. */
  revision?: string | number;
  disabled?: boolean;
  onSelect?: () => void | Promise<void>;
}
export interface GlassCommandPaletteOptions {
  commands: readonly GlassCommand[];
  label?: string;
  /** Explicit opt-in to Mod+K outside editable fields. Default false. */
  shortcut?: boolean;
  /** Maximum rendered matches, clamped to 1–100. Default 20. */
  maxResults?: number;
  reducedMotion?: boolean;
  /** Used only when the selected command has no individual onSelect handler. */
  onSelect?: (command: GlassCommand) => void | Promise<void>;
}
export interface GlassCommandPalette {
  open(): void;
  close(): void;
  /** Replaces the catalog, invalidating saved nodes and outdated async results. */
  updateCommands(commands: readonly GlassCommand[]): void;
  destroy(): void;
}
type Entry = { command: GlassCommand; search: string; enabled: boolean; row?: HTMLButtonElement };
const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
let sequence = 0;

/**
 * Native modal dialog + editable combobox, with no global shortcuts by default.
 * User selection is the only execution boundary; filtering never runs commands.
 * The host must revalidate command revisions/permissions before privileged work.
 * Requires a connected host and native HTMLDialogElement.showModal support.
 */
export function mountGlassCommandPalette(host: HTMLElement, options: GlassCommandPaletteOptions): GlassCommandPalette {
  const doc = host.ownerDocument, view = doc.defaultView;
  if (!view) throw new Error('Command palette requires a browser document');
  const browser = view;
  const maxResults = typeof options.maxResults === 'number' && Number.isFinite(options.maxResults) ? Math.max(1, Math.min(100, Math.floor(options.maxResults))) : 20;
  const globalSelect = options.onSelect;
  const bindShortcut = Boolean(options.shortcut);
  function catalog(commands: readonly GlassCommand[]) {
    const entries = new Map<string, Entry>();
    for (const supplied of commands) {
      if (!supplied.id || entries.has(supplied.id)) throw new RangeError('Command IDs must be nonempty and unique');
      const command = { ...supplied, keywords: supplied.keywords ? [...supplied.keywords] : undefined };
      entries.set(command.id, {
        command, enabled: !command.disabled && Boolean(command.onSelect || globalSelect),
        search: normalize([command.label, command.description, command.group, ...(command.keywords ?? [])].filter(Boolean).join(' ')),
      });
    }
    return entries;
  }
  let commands = catalog(options.commands), rendered: Entry[] = [], selectable: Entry[] = [], active: Entry | undefined;
  let destroyed = false, epoch = 0, previousFocus: HTMLElement | null = null;
  let resultSummary = '';
  let operation: { entry: Entry; epoch: number } | null = null;
  const dialog = doc.createElement('dialog'); dialog.className = 'lg-command-palette';
  dialog.dataset.reducedMotion = String(Boolean(options.reducedMotion));
  let id: string;
  do { id = `lg-palette-${++sequence}`; } while (doc.getElementById(`${id}-list`) || doc.getElementById(`${id}-label`));
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const surface = node('div', undefined, 'lg-command-surface');
  const header = node('div', undefined, 'lg-command-header');
  const label = node('label', options.label ?? 'Search commands', 'lg-command-label'); label.id = `${id}-label`; label.htmlFor = `${id}-input`;
  const input = node('input'); input.id = `${id}-input`; input.type = 'text'; input.placeholder = 'Search commands…'; input.autocomplete = 'off'; input.spellcheck = false;
  input.maxLength = 1000; input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', `${id}-list`); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-haspopup', 'listbox');
  const closeButton = node('button', 'Close'); closeButton.type = 'button'; closeButton.className = 'lg-command-close';
  const list = node('div', undefined, 'lg-command-list'); list.id = `${id}-list`; list.setAttribute('role', 'listbox');
  // Exclude Chrome's implicit scroll-container Tab stop; arrows stay on the combobox.
  list.tabIndex = -1; list.setAttribute('aria-labelledby', label.id);
  const empty = node('p', 'No matching commands.', 'lg-command-empty'); empty.hidden = true;
  const status = node('p', undefined, 'lg-command-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const footer = node('div', undefined, 'lg-command-footer');
  for (const [key, text] of [['↑ ↓', 'navigate'], ['Enter', 'run'], ['Esc', 'close']]) {
    const hint = node('span'); hint.append(node('kbd', key), doc.createTextNode(` ${text}`)); footer.append(hint);
  }
  header.append(label, input, closeButton); surface.append(header, list, empty, status, footer); dialog.append(surface);
  dialog.setAttribute('aria-labelledby', label.id); host.append(dialog);

  function setActive(next: Entry | undefined, scroll = false) {
    if (active !== next) {
      active?.row?.setAttribute('aria-selected', 'false'); active?.row?.classList.remove('lg-command-active');
      active = next;
      next?.row?.setAttribute('aria-selected', 'true'); next?.row?.classList.add('lg-command-active');
    }
    if (next?.row) {
      input.setAttribute('aria-activedescendant', next.row.id);
      // One native scroll operation per user navigation, never a geometry polling loop.
      if (scroll) next.row.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function applyBusy() {
    input.readOnly = Boolean(operation);
    list.setAttribute('aria-busy', String(Boolean(operation)));
    for (const entry of rendered) if (entry.row) {
      entry.row.disabled = !entry.enabled || Boolean(operation);
      entry.row.setAttribute('aria-disabled', String(entry.row.disabled));
    }
  }
  function filter() {
    if (destroyed) return;
    const terms = normalize(input.value.slice(0, 1000)).split(/\s+/).filter(Boolean);
    let matches = 0; rendered = [];
    for (const entry of commands.values()) if (terms.every(term => entry.search.includes(term))) {
      matches++; if (rendered.length < maxResults) rendered.push(entry);
    }
    list.replaceChildren(); active = undefined;
    const groups = new Map<string, HTMLElement>();
    rendered.forEach((entry, index) => {
      const groupName = entry.command.group ?? 'Commands';
      let group = groups.get(groupName);
      if (!group) {
        group = node('div', undefined, 'lg-command-group'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', groupName);
        const heading = node('div', groupName, 'lg-command-group-label'); heading.setAttribute('aria-hidden', 'true'); group.append(heading);
        groups.set(groupName, group); list.append(group);
      }
      const row = node('button', undefined, 'lg-command-option'); row.type = 'button'; row.id = `${id}-option-${epoch}-${index}`;
      row.tabIndex = -1; row.setAttribute('role', 'option'); row.setAttribute('aria-selected', 'false'); row.dataset.commandId = entry.command.id;
      const text = node('span', undefined, 'lg-command-text'), name = node('span', entry.command.label, 'lg-command-name');
      name.id = `${row.id}-name`; row.setAttribute('aria-labelledby', name.id); text.append(name);
      if (entry.command.description) {
        const description = node('span', entry.command.description, 'lg-command-description'); description.id = `${row.id}-description`;
        row.setAttribute('aria-describedby', description.id); text.append(description);
      }
      row.append(text); if (entry.command.shortcut) { const key = node('kbd', entry.command.shortcut); key.setAttribute('aria-hidden', 'true'); row.append(key); }
      entry.row = row;
      row.addEventListener('mousedown', event => { event.preventDefault(); });
      row.addEventListener('pointermove', event => {
        if (!operation && event.pointerType !== 'touch' && entry.row === row && commands.get(entry.command.id) === entry && entry.enabled && rendered.includes(entry)) setActive(entry);
      });
      row.addEventListener('click', () => { void select(entry, row); }); group.append(row);
    });
    rendered = [...list.querySelectorAll<HTMLButtonElement>('[role=option]')].map(row => commands.get(row.dataset.commandId!)!);
    selectable = rendered.filter(entry => entry.enabled);
    setActive(selectable[0]); applyBusy();
    empty.hidden = matches !== 0;
    resultSummary = matches > maxResults ? `Showing ${maxResults} of ${matches} matches. Refine your search.` : `${matches} ${matches === 1 ? 'match' : 'matches'}.`;
    status.textContent = operation ? 'Running the host command…' : resultSummary;
  }
  function closed() {
    // Native close events are queued. A prior event must not disrupt a palette
    // that was reopened synchronously after close().
    if (dialog.open) return;
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
    if (previousFocus?.isConnected && !dialog.contains(previousFocus) && !previousFocus.matches(':disabled') && !previousFocus.closest('[inert], [hidden]')) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function close() {
    if (destroyed || !dialog.open) return;
    ++epoch; dialog.close(); closed();
  }
  async function select(entry: Entry, expectedRow = entry.row) {
    if (destroyed || !dialog.open || operation || !entry.enabled || entry.row !== expectedRow || commands.get(entry.command.id) !== entry || !rendered.includes(entry)) return;
    const callback = entry.command.onSelect ?? (globalSelect ? () => globalSelect({ ...entry.command, keywords: entry.command.keywords ? [...entry.command.keywords] : undefined }) : undefined);
    if (!callback) return;
    setActive(entry);
    const selected = { entry, epoch }; operation = selected; applyBusy(); status.textContent = 'Running the host command…';
    try {
      await callback();
      if (!destroyed && epoch === selected.epoch && commands.get(entry.command.id) === entry) close();
    } catch {
      if (!destroyed && dialog.open && epoch === selected.epoch && commands.get(entry.command.id) === entry) status.textContent = 'Could not run the command. Try again.';
    } finally {
      if (operation === selected) operation = null;
      if (!destroyed) {
        applyBusy();
        if (status.textContent === 'Running the host command…') status.textContent = resultSummary;
      }
    }
  }
  const inputChanged = () => filter();
  const keys = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.metaKey || operation) return;
    const index = active ? selectable.indexOf(active) : -1;
    let next: Entry | undefined;
    if (event.key === 'ArrowDown' && !event.ctrlKey) next = selectable[(index + 1) % selectable.length];
    else if (event.key === 'ArrowUp' && !event.ctrlKey) next = selectable[(index - 1 + selectable.length) % selectable.length];
    else if (event.key === 'Home' && !event.shiftKey && (event.ctrlKey || input.value.length === 0)) next = selectable[0];
    else if (event.key === 'End' && !event.shiftKey && (event.ctrlKey || input.value.length === 0)) next = selectable.at(-1);
    else if (event.key === 'Enter' && !event.ctrlKey) { event.preventDefault(); if (active) void select(active); return; }
    else return;
    if (next) { event.preventDefault(); setActive(next, true); }
  };
  const tabCycle = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    // Keep the two owned controls in the modal cycle without intercepting browser shortcuts.
    if ((event.shiftKey && event.target === input) || (!event.shiftKey && event.target === closeButton)) {
      event.preventDefault(); (event.shiftKey ? closeButton : input).focus({ preventScroll: true });
    }
  };
  const cancel = (event: Event) => { event.preventDefault(); close(); };
  // The dialog covers the viewport. Its separate surface distinguishes backdrop
  // activation without reading geometry or mistaking panel whitespace for outside.
  let backdropDown = false;
  const pointerDown = (event: PointerEvent) => { backdropDown = event.target === dialog; };
  const backdrop = (event: MouseEvent) => { if (event.target === dialog && backdropDown) close(); backdropDown = false; };
  const externalShortcut = (event: KeyboardEvent) => {
    if (destroyed || event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.shiftKey ||
      event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
    const editable = event.composedPath().some(target => target instanceof browser.HTMLElement &&
      (target.matches('input, textarea, select') || target.isContentEditable || target.getAttribute('contenteditable') === 'true' || target.getAttribute('contenteditable') === ''));
    if (editable) return;
    event.preventDefault(); if (dialog.open) close(); else open();
  };
  function open() {
    if (destroyed) return;
    if (dialog.open) { input.focus({ preventScroll: true }); return; }
    if (typeof dialog.showModal !== 'function') throw new Error('Command palette requires native dialog.showModal support');
    if (!dialog.isConnected) throw new Error('Command palette host must be connected before opening');
    const before = doc.activeElement instanceof browser.HTMLElement ? doc.activeElement as HTMLElement : null;
    ++epoch; input.value = ''; filter(); dialog.showModal(); previousFocus = before;
    input.setAttribute('aria-expanded', 'true'); input.focus({ preventScroll: true });
  }
  input.addEventListener('input', inputChanged); input.addEventListener('keydown', keys);
  closeButton.addEventListener('click', close); dialog.addEventListener('cancel', cancel); dialog.addEventListener('close', closed); dialog.addEventListener('keydown', tabCycle);
  dialog.addEventListener('pointerdown', pointerDown); dialog.addEventListener('click', backdrop);
  if (bindShortcut) doc.addEventListener('keydown', externalShortcut);
  filter();
  return {
    open, close,
    updateCommands(next) {
      if (destroyed) return;
      const replacement = catalog(next); commands = replacement; ++epoch; filter();
    },
    destroy() {
      if (destroyed) return;
      close(); destroyed = true; ++epoch;
      input.removeEventListener('input', inputChanged); input.removeEventListener('keydown', keys);
      closeButton.removeEventListener('click', close); dialog.removeEventListener('cancel', cancel); dialog.removeEventListener('close', closed); dialog.removeEventListener('keydown', tabCycle);
      dialog.removeEventListener('pointerdown', pointerDown); dialog.removeEventListener('click', backdrop);
      if (bindShortcut) doc.removeEventListener('keydown', externalShortcut);
      dialog.remove(); commands.clear(); rendered = []; selectable = []; active = undefined; previousFocus = null;
    },
  };
}
