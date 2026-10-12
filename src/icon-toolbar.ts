import { listen } from './lifecycle.js';

export type GlassIconToolbarItem = HTMLButtonElement | HTMLAnchorElement;
export interface GlassIconToolbarOptions {
  /** All related native actions in authored DOM order; 1–32 unique items. Three or more are recommended. */
  readonly items: readonly GlassIconToolbarItem[];
  /** Fallback group name. An authored aria-labelledby relationship retains precedence. */
  readonly label: string;
  readonly orientation?: 'horizontal' | 'vertical';
  /** Auto reads inherited CSS direction only when refreshing, never during animation. */
  readonly direction?: 'auto' | 'ltr' | 'rtl';
  readonly wrap?: boolean;
}
export interface GlassIconToolbar {
  readonly activeItem: GlassIconToolbarItem | null;
  /** Host calls after disabled/hidden/inert/layout changes; no observer or polling is installed. */
  refresh(): void;
  /** Merge a copied/frozen partial configuration. New items are validated before current state changes. */
  update(options: Partial<GlassIconToolbarOptions>): void;
  destroy(): void;
}
export interface GlassIconActionOptions { readonly label: string; readonly pressed?: boolean; readonly disabled?: boolean }
const roots = new WeakSet<HTMLElement>(), claimedItems = new WeakSet<HTMLElement>();
const interactive = 'button,a[href],input,select,textarea,summary,[tabindex],[contenteditable]:not([contenteditable="false"]),audio[controls],video[controls],[role=toolbar],[role=menu],[role=menubar],[role=tablist],[role=listbox],[role=tree],[role=slider],[role=combobox],[role=button],[role=link],[role=checkbox],[role=radio],[role=switch]';
type Attribute = { element: HTMLElement; name: string; original: string | null; value: string | null; lost: boolean };
function label(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Glass icon action/toolbar requires a label');
  const normalized = value.trim().replace(/\s+/gu, ' ');
  if (!normalized || normalized.length > 160 || /[\u0000-\u001f\u007f]/u.test(normalized)) throw new RangeError('Glass icon action/toolbar label must contain 1–160 readable characters');
  return normalized;
}
/** Native button props only. Keep toggle labels stable and let the host update pressed state.
 * Artwork inside the named button is decorative: img alt="" with explicit dimensions or SVG aria-hidden.
 * Keep readable .lg-icon-action-label text available for forced colors or artwork failure.
 */
export function getGlassIconActionProps(options: GlassIconActionOptions) {
  if (options.pressed !== undefined && typeof options.pressed !== 'boolean' || options.disabled !== undefined && typeof options.disabled !== 'boolean') throw new TypeError('Glass icon action pressed/disabled must be booleans');
  return Object.freeze({ className: 'lg-icon-action', type: 'button' as const, 'aria-label': label(options.label), disabled: options.disabled ?? false, ...(options.pressed === undefined ? {} : { 'aria-pressed': options.pressed ? 'true' as const : 'false' as const }) });
}

/**
 * A single remembered keyboard entry for existing native editor/map/canvas actions.
 * Owns group role/name/orientation and item tabindex only; never presses, routes,
 * selects, submits, changes aria-pressed, or adds an icon/tooltip/motion engine.
 * Native disabled and aria-disabled items are excluded from roving focus. Excluding
 * an aria-disabled anchor does NOT disable its native activation; the host owns that.
 * Explicitly supply every native action in the group. Fields, nested composites,
 * nested toolbars and interactive descendants need their own keyboard policy.
 * Refresh after host visibility/disabled/membership changes; no mutation observer is used.
 * Focus rescue is best-effort for detectable owned/stranded focus. A browser can
 * blur a node before its hide/removal is observable, clearing that hint. For
 * host DOM edits, capture an owned activeElement BEFORE mutation, then update/
 * refresh and restore an available action or explicit outside fallback only if
 * that captured action became unavailable. Do not move already-external focus.
 * If no usable action remains, the host owns any outside fallback focus destination.
 * Conditional attribute leases preserve outside edits. A new tabindex/role/orientation
 * owner makes the controller inert until destroy, avoiding competing focus managers.
 */
export function attachGlassIconToolbar(root: HTMLElement, initial: GlassIconToolbarOptions): GlassIconToolbar {
  const doc = root.ownerDocument, browserView = doc.defaultView;
  if (!browserView || !root.isConnected || roots.has(root) || root.matches('button,a[href],input,select,textarea,summary,[contenteditable]') || root.hasAttribute('tabindex') && root.tabIndex >= 0) throw new TypeError('Glass icon toolbar requires an unowned connected browser container');
  const view: Window = browserView;
  const normalize = (input: GlassIconToolbarOptions) => {
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > 32) throw new RangeError('Glass icon toolbar requires 1–32 native actions');
    const items = [...input.items], unique = new Set(items);
    if (unique.size !== items.length) throw new TypeError('Glass icon toolbar actions must be unique');
    for (const [index, item] of items.entries()) {
      if (index && !(items[index - 1].compareDocumentPosition(item) & 4)) throw new TypeError('Glass icon toolbar actions must follow authored DOM order');
      if (!item || item.ownerDocument !== doc || item === root || !root.contains(item) || !item.isConnected || !item.matches('button,a[href]') || item.hasAttribute('role') && item.getAttribute('role') !== (item.localName === 'button' ? 'button' : 'link') || item.querySelector(interactive) || item.closest('[role=toolbar]') && item.closest('[role=toolbar]') !== root || claimedItems.has(item) && !currentItems.has(item)) throw new TypeError('Glass icon toolbar requires unowned native actions without nested interactive/composite descendants');
    }
    if (root.querySelector('[role=toolbar]') || [...root.querySelectorAll<HTMLElement>(interactive)].some(element => !unique.has(element as GlassIconToolbarItem))) throw new TypeError('Glass icon toolbar must explicitly own all its native actions; fields and nested composites are unsupported');
    const orientation = input.orientation ?? 'horizontal', direction = input.direction ?? 'auto', wrap = input.wrap ?? true;
    if (!['horizontal', 'vertical'].includes(orientation) || !['auto', 'ltr', 'rtl'].includes(direction) || typeof wrap !== 'boolean') throw new TypeError('Glass icon toolbar orientation/direction/wrap is invalid');
    return Object.freeze({ items: Object.freeze(items), label: label(input.label), orientation, direction, wrap });
  };
  let currentItems = new Set<GlassIconToolbarItem>();
  let options = normalize(initial), active: GlassIconToolbarItem | null = null, focused: GlassIconToolbarItem | null = null;
  let destroyed = false, lost = false, direction: 'ltr' | 'rtl' = 'ltr';
  const rootClass = root.classList.contains('lg-icon-toolbar');
  const rootAttrs: Attribute[] = ['role', 'aria-label', 'aria-orientation'].map(name => ({ element: root, name, original: root.getAttribute(name), value: root.getAttribute(name), lost: false }));
  const itemAttrs = new Map<GlassIconToolbarItem, Attribute>();
  const put = (attribute: Attribute, value: string) => {
    if (attribute.lost) return;
    if (attribute.element.getAttribute(attribute.name) !== attribute.value) { attribute.lost = true; return; }
    if (attribute.value !== value) attribute.element.setAttribute(attribute.name, value); attribute.value = value;
  };
  const restore = (attribute: Attribute) => {
    if (attribute.lost || attribute.element.getAttribute(attribute.name) !== attribute.value) return;
    if (attribute.original === null) attribute.element.removeAttribute(attribute.name); else attribute.element.setAttribute(attribute.name, attribute.original);
    attribute.value = attribute.original;
  };
  const owned = () => rootAttrs.filter(attribute => attribute.name !== 'aria-label').every(attribute => !attribute.lost && attribute.element.getAttribute(attribute.name) === attribute.value) && [...itemAttrs.values()].every(attribute => !attribute.lost && attribute.element.getAttribute(attribute.name) === attribute.value);
  const abandon = () => { lost = true; active = focused = null; rootAttrs.forEach(restore); itemAttrs.forEach(restore); };
  const unavailable = (item: HTMLElement, cache: Map<HTMLElement, boolean>) => {
    if (root.ownerDocument !== doc || !root.isConnected || item.ownerDocument !== doc || !item.isConnected || !root.contains(item) || !item.matches('button,a[href]') || item.matches(':disabled,[aria-disabled="true"]') || item.closest('[role=toolbar]') !== root || item.querySelector(interactive)) return true;
    for (let element: HTMLElement | null = item; element; element = element.parentElement) {
      if (cache.has(element)) { if (cache.get(element)) return true; continue; }
      const computed = view.getComputedStyle(element), hidden = Boolean(element.hidden) || element.hasAttribute('inert') || computed.display === 'none' || computed.visibility === 'hidden' || computed.visibility === 'collapse'; cache.set(element, hidden); if (hidden) return true;
    }
    return false;
  };
  const available = () => { const cache = new Map<HTMLElement, boolean>(); return options.items.filter(item => !unavailable(item, cache)); };
  const paint = () => {
    put(rootAttrs[0], 'toolbar'); put(rootAttrs[1], options.label); put(rootAttrs[2], options.orientation);
    for (const item of options.items) put(itemAttrs.get(item)!, item === active ? '0' : '-1');
  };
  function refresh() {
    if (destroyed || lost) return;
    if (!owned()) { abandon(); return; }
    put(rootAttrs[0], 'toolbar');
    const usable = available(), old = active;
    const current = options.items.find(item => item === doc.activeElement && item.closest('[role=toolbar]') === root) ?? null;
    if (current && usable.includes(current)) active = current;
    else if (!active || !usable.includes(active)) active = usable.find(item => options.items.indexOf(item) >= (old ? options.items.indexOf(old) : 0)) ?? usable[0] ?? null;
    direction = options.direction === 'auto' ? view.getComputedStyle(root).direction === 'rtl' ? 'rtl' : 'ltr' : options.direction;
    paint();
    const stranded = current && !usable.includes(current) || focused && !usable.includes(focused) && (doc.activeElement === doc.body || doc.activeElement === doc.documentElement);
    if (stranded && active) active.focus({ preventScroll: true });
  }
  function claim(next: readonly GlassIconToolbarItem[]) {
    const wanted = new Set(next);
    for (const [item, attribute] of itemAttrs) if (!wanted.has(item)) { restore(attribute); itemAttrs.delete(item); claimedItems.delete(item); }
    for (const item of next) if (!itemAttrs.has(item)) { const original = item.getAttribute('tabindex'); itemAttrs.set(item, { element: item, name: 'tabindex', original, value: original, lost: false }); claimedItems.add(item); }
    currentItems = wanted;
  }
  roots.add(root); root.classList.add('lg-icon-toolbar'); claim(options.items);
  const onFocus = (event: FocusEvent) => {
    const item = options.items.find(item => item === event.target);
    if (!item || event.target !== doc.activeElement || item.closest('[role=toolbar]') !== root) return;
    focused = item; refresh();
  };
  const onBlur = (event: FocusEvent) => {
    if (!focused || event.target !== focused) return;
    // A native blur may precede observable removal/hiding. This hint covers only
    // detectable stranded cases; the host owns capture-before-edit focus repair.
    // Deliberate blur of a usable action clears the focus owner.
    if (event.relatedTarget !== null || available().includes(focused)) focused = null;
  };
  const onKey = (event: KeyboardEvent) => {
    if (destroyed || lost || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !options.items.some(item => item === event.target && item.closest('[role=toolbar]') === root)) return;
    const vertical = options.orientation === 'vertical', forward = vertical ? 'ArrowDown' : 'ArrowRight', backward = vertical ? 'ArrowUp' : 'ArrowLeft';
    if (![forward, backward, 'Home', 'End'].includes(event.key)) return;
    refresh(); if (lost) return;
    const usable = available(), item = event.target as GlassIconToolbarItem, index = usable.indexOf(item); if (index < 0 || !usable.length) return;
    const step = (event.key === forward ? 1 : -1) * (!vertical && direction === 'rtl' ? -1 : 1);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? usable.length - 1 : options.wrap ? (index + step + usable.length) % usable.length : Math.max(0, Math.min(usable.length - 1, index + step));
    event.preventDefault(); const target = usable[next]; active = target; paint(); target.focus({ preventScroll: true });
  };
  const unlisten = listen([[root, 'focusin', onFocus as EventListener], [root, 'focusout', onBlur as EventListener], [root, 'keydown', onKey as EventListener]]);
  refresh();
  return {
    get activeItem() { return destroyed || lost ? null : active; },
    refresh,
    update(next) {
      if (destroyed || lost) return;
      const replacement = normalize({ ...options, ...next });
      if (!owned()) { abandon(); return; }
      const previous = active, previousIndex = previous ? options.items.indexOf(previous) : 0;
      options = replacement; claim(options.items);
      if (previous && !options.items.includes(previous)) active = options.items[Math.max(0, Math.min(options.items.length - 1, previousIndex))];
      refresh();
    },
    destroy() {
      if (destroyed) return; destroyed = true; unlisten(); rootAttrs.forEach(restore); itemAttrs.forEach(restore);
      currentItems.forEach(item => claimedItems.delete(item)); roots.delete(root); itemAttrs.clear(); active = focused = null;
      if (!rootClass && root.classList.contains('lg-icon-toolbar')) root.classList.remove('lg-icon-toolbar');
    },
  };
}
