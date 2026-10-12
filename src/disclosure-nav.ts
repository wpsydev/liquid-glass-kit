export interface GlassDisclosureItem {
  /** An authored native button with type=button. Enter and Space remain native. */
  trigger: HTMLButtonElement;
  /** An ordinary authored group of links/forms; never a dialog or popover. */
  panel: HTMLElement;
  /** Stable callback identity. Defaults to panel.id or a generated document-unique ID. */
  id?: string;
}
export type GlassDisclosureReason = 'trigger' | 'api' | 'escape' | 'focus-leave' | 'outside' | 'responsive' | 'refresh' | 'update' | 'destroy';
export interface GlassDisclosureChange { openId: string | null; reason: GlassDisclosureReason }
export interface GlassDisclosureNavOptions {
  /** One to 32 disjoint pairs contained in the same connected host. */
  items: readonly GlassDisclosureItem[];
  closeOnFocusLeave?: boolean;
  closeOnOutside?: boolean;
  /** Explicit host breakpoint: matches => compact; otherwise expanded. Changes close panels. */
  responsiveQuery?: string;
  /** Authored external control to rescue focus when the whole host/trigger is hidden. */
  focusFallback?: HTMLElement;
  /** UI state notification only. Routing, permission checks and persistence belong to the host. */
  onChange?: (state: GlassDisclosureChange) => void;
}
export interface GlassDisclosureNav {
  readonly openId: string | null;
  open(id: string): boolean;
  close(): boolean;
  /** Call after host visibility, disabled state, content membership or layout changes. */
  refresh(): void;
  /** Replace the full configuration transactionally; content is never replaced/reparented. */
  update(options: GlassDisclosureNavOptions): void;
  destroy(): void;
}
type AttributeLease = { write(value: string | null): void; restore(): void };
type Pair = { id: string; panelId: string; trigger: HTMLButtonElement; panel: HTMLElement; leases: AttributeLease[]; expanded: AttributeLease; hidden: AttributeLease; click: (event: MouseEvent) => void };
const roots = new WeakSet<HTMLElement>(), ownedNodes = new WeakMap<HTMLElement, HTMLElement>();
let sequence = 0;
function attribute(element: HTMLElement, key: string): AttributeLease {
  const original = element.getAttribute(key); let owned: string | null = original;
  return { write(value) { owned = value; if (value === null) element.removeAttribute(key); else element.setAttribute(key, value); }, restore() {
    if (element.getAttribute(key) !== owned) return;
    if (original === null) element.removeAttribute(key); else element.setAttribute(key, original);
  } };
}
function identity(value: string) { if (typeof value !== 'string' || !value || value.length > 128 || /\s/.test(value)) throw new RangeError('Disclosure IDs must be nonempty, whitespace-free strings of at most 128 characters'); return value; }

/**
 * Enhance one authored navigation tree. No menu roles, router, roving tabindex,
 * hover dependency, focus trap, body lock, content copy or native-link interception.
 * Keep links visible before enhancement; the controller owns hidden/expanded/control
 * attributes while attached. Import /disclosure-nav.css for optional presentation.
 * Host responsive CSS should match responsiveQuery; call refresh after hiding a
 * host/trigger through other means. There is no visibility observer or idle loop.
 */
export function attachGlassDisclosureNav(nav: HTMLElement, initial: GlassDisclosureNavOptions): GlassDisclosureNav {
  const doc = nav?.ownerDocument, view = doc?.defaultView;
  if (!view || !nav.isConnected) throw new Error('Disclosure navigation requires a connected browser host');
  if (roots.has(nav)) throw new Error('Destroy the existing disclosure navigation before attaching another');
  const browser = view;
  const serial = ++sequence;
  function validate(input: GlassDisclosureNavOptions) {
    if (!input || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 32) throw new RangeError('Disclosure navigation requires one to 32 items');
    if (input.responsiveQuery !== undefined && (typeof input.responsiveQuery !== 'string' || !input.responsiveQuery.trim() || input.responsiveQuery.length > 240)) throw new RangeError('Use a nonempty responsive media query of at most 240 characters');
    if (input.responsiveQuery && typeof browser.matchMedia !== 'function') throw new Error('This browser does not support the requested responsive media query');
    if (input.focusFallback !== undefined && (!(input.focusFallback instanceof browser.HTMLElement) || input.focusFallback.ownerDocument !== doc)) throw new Error('Focus fallback must be an authored control in the same document');
    const media = input.responsiveQuery ? browser.matchMedia(input.responsiveQuery) : null;
    const idCounts = new Map<string, number>(); for (const element of doc.querySelectorAll('[id]')) { const value = element.id; idCounts.set(value, (idCounts.get(value) ?? 0) + 1); }
    const used = new Set<HTMLElement>(), ids = new Set<string>(), panelIds = new Set<string>();
    const items = input.items.map((item, index) => {
      const { trigger, panel } = item ?? {};
      if (!(trigger instanceof browser.HTMLButtonElement) || trigger.type !== 'button' || !(panel instanceof browser.HTMLElement) || panel.tagName === 'DIALOG' || panel.hasAttribute('popover') ||
        trigger.ownerDocument !== doc || panel.ownerDocument !== doc || trigger === panel || !nav.contains(trigger) || !nav.contains(panel) || !trigger.isConnected || !panel.isConnected || panel.contains(trigger)) throw new Error('Use separate contained type=button triggers and ordinary same-document panels');
      if (used.has(trigger) || used.has(panel) || [trigger, panel].some(node => ownedNodes.has(node) && ownedNodes.get(node) !== nav)) throw new Error('Disclosure trigger/panel pairs must be unique and unowned');
      used.add(trigger); used.add(panel);
      if (panel.hasAttribute('id')) { identity(panel.id); if ((idCounts.get(panel.id) ?? 0) !== 1) throw new Error('Panel IDs must be document-unique'); }
      let panelId = panel.id;
      if (!panelId) { let suffix = 0; panelId = `lg-nav-${serial}-${index}`; while (doc.getElementById(panelId) || panelIds.has(panelId)) panelId = `lg-nav-${serial}-${index}-${++suffix}`; }
      const id = item.id === undefined ? panelId : identity(item.id);
      if (ids.has(id) || panelIds.has(panelId)) throw new Error('Disclosure identities and panel IDs must be unique'); ids.add(id); panelIds.add(panelId);
      return { trigger, panel, id, panelId };
    });
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
      const first = items[a], second = items[b];
      if (first.panel.contains(second.panel) || second.panel.contains(first.panel) || first.panel.contains(second.trigger) || second.panel.contains(first.trigger)) throw new Error('Disclosure groups must be disjoint; nested disclosure controllers need separate hosts');
    }
    return { items, closeOnFocusLeave: input.closeOnFocusLeave ?? true, closeOnOutside: input.closeOnOutside ?? true, responsiveQuery: input.responsiveQuery, media, focusFallback: input.focusFallback, onChange: input.onChange };
  }
  let options = validate(initial), pairs: Pair[] = [], current: Pair | null = null, destroyed = false, globalListening = false, focusVersion = 0;
  let media: MediaQueryList | null = null;
  const hostMarker = attribute(nav, 'data-lg-disclosure-nav'), mode = attribute(nav, 'data-lg-nav-mode');
  const visible = (element: HTMLElement) => {
    if (!element.isConnected || element.closest('[hidden],[inert]') || element.matches(':disabled,[aria-disabled="true"]')) return false;
    for (let node: HTMLElement | null = element; node; node = node.parentElement) { const style = browser.getComputedStyle(node); if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false; }
    return true;
  };
  function emit(reason: GlassDisclosureReason) { try { options.onChange?.({ openId: current?.id ?? null, reason }); } catch (error) { nav.dispatchEvent(new browser.CustomEvent('lg-nav-error', { bubbles: true, detail: { error, phase: 'change' } })); } }
  const available = (pair: Pick<Pair, 'trigger' | 'panel'>) => nav.isConnected && nav.contains(pair.trigger) && nav.contains(pair.panel) && pair.panel.isConnected && visible(pair.trigger);
  function rescue(pair: Pair) {
    if (!pair.panel.contains(doc.activeElement)) return;
    const target = available(pair) ? pair.trigger : pairs.find(available)?.trigger ?? (options.focusFallback && visible(options.focusFallback) ? options.focusFallback : null);
    target?.focus({ preventScroll: true });
  }
  function globalEvents(value: boolean) {
    if (value === globalListening) return; globalListening = value;
    if (value) { doc.addEventListener('keydown', key); doc.addEventListener('click', outside); }
    else { doc.removeEventListener('keydown', key); doc.removeEventListener('click', outside); }
  }
  function close(reason: GlassDisclosureReason = 'api', returnFocus = true) {
    if (destroyed || !current) return false;
    const previous = current; current = null; focusVersion++;
    if (returnFocus) rescue(previous);
    previous.expanded.write('false'); previous.hidden.write(''); globalEvents(false); emit(reason); return true;
  }
  function open(id: string, reason: GlassDisclosureReason = 'api') {
    if (destroyed) return false;
    const pair = pairs.find(item => item.id === id);
    if (!pair || !available(pair)) return false;
    if (current === pair) return true;
    if (current) { rescue(current); current.expanded.write('false'); current.hidden.write(''); }
    current = pair; focusVersion++; pair.expanded.write('true'); pair.hidden.write(null); globalEvents(true); emit(reason); return true;
  }
  function insideNestedModal(target: Element) {
    const dialog = target.closest('dialog[open]'); if (dialog && !dialog.contains(nav)) return true;
    const popover = target.closest('[popover]'); if (popover && !popover.contains(nav)) { try { return popover.matches(':popover-open'); } catch { /* Unsupported native popovers cannot be open. */ } }
    return false;
  }
  function key(event: KeyboardEvent) {
    if (!current || event.defaultPrevented || event.isComposing || event.key !== 'Escape' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target; if (!(target instanceof browser.Element) || insideNestedModal(target) || (!current.panel.contains(target) && !current.trigger.contains(target))) return;
    event.preventDefault(); close('escape');
  }
  function outside(event: MouseEvent) {
    if (!current || !options.closeOnOutside || event.defaultPrevented) return;
    const path = event.composedPath(); if (pairs.some(pair => path.includes(pair.trigger) || path.includes(pair.panel))) return;
    // Preserve focus on the newly clicked control. A nonfocusable outside target
    // still needs rescue if focus would otherwise remain in the hidden panel.
    close('outside', current.panel.contains(doc.activeElement));
  }
  function leave(event: FocusEvent) {
    if (!current || !options.closeOnFocusLeave || event.defaultPrevented) return;
    const next = event.relatedTarget; if (next instanceof browser.Node && nav.contains(next)) return;
    const token = ++focusVersion;
    queueMicrotask(() => { if (!destroyed && token === focusVersion && current && !nav.contains(doc.activeElement)) close('focus-leave', false); });
  }
  function refresh() {
    if (destroyed) return;
    if (current && (!available(current) || current.panel.hidden)) close('refresh');
    for (const pair of pairs) { pair.expanded.write(String(current === pair)); pair.hidden.write(current === pair ? null : ''); }
  }
  const modeChanged = () => { if (destroyed) return; close('responsive'); if (!destroyed) mode.write(media?.matches ? 'compact' : 'expanded'); };
  function bindMedia() { media = options.media; media?.addEventListener('change', modeChanged); mode.write(media?.matches ? 'compact' : 'expanded'); }
  function attach() {
    pairs = options.items.map(item => {
      const panelId = attribute(item.panel, 'id'), panelMark = attribute(item.panel, 'data-lg-nav-panel'), triggerMark = attribute(item.trigger, 'data-lg-nav-trigger');
      const expanded = attribute(item.trigger, 'aria-expanded'), controls = attribute(item.trigger, 'aria-controls'), hidden = attribute(item.panel, 'hidden');
      const pair: Pair = { ...item, leases: [panelId, panelMark, triggerMark, expanded, controls, hidden], expanded, hidden, click(event) {
        if (event.defaultPrevented || !available(pair)) return;
        if (current === pair) close('trigger'); else open(pair.id, 'trigger');
      } };
      panelId.write(item.panelId); panelMark.write(''); triggerMark.write(''); expanded.write('false'); controls.write(item.panelId); hidden.write('');
      ownedNodes.set(item.trigger, nav); ownedNodes.set(item.panel, nav); item.trigger.addEventListener('click', pair.click); return pair;
    });
    bindMedia();
  }
  function detach() {
    media?.removeEventListener('change', modeChanged); media = null;
    for (const pair of pairs) { pair.trigger.removeEventListener('click', pair.click); ownedNodes.delete(pair.trigger); ownedNodes.delete(pair.panel); pair.leases.forEach(lease => lease.restore()); }
    pairs = [];
  }
  roots.add(nav); hostMarker.write(''); nav.addEventListener('focusout', leave); attach();
  return {
    get openId() { return current?.id ?? null; }, open, close: () => close(), refresh,
    update(next) {
      if (destroyed) return; const replacement = validate(next);
      // Preserve the original ID/visibility leases for unchanged pairs through
      // replacement by restoring before attaching the validated next catalogue.
      const previous = current; if (previous) rescue(previous); current = null; focusVersion++; globalEvents(false); detach(); options = replacement; attach(); if (previous) emit('update');
    },
    destroy() {
      if (destroyed) return;
      const previous = current; if (previous) rescue(previous); current = null; focusVersion++; globalEvents(false);
      destroyed = true; nav.removeEventListener('focusout', leave); detach(); hostMarker.restore(); mode.restore(); roots.delete(nav); if (previous) emit('destroy');
    },
  };
}
