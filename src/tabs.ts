import { listen } from './lifecycle.js';

export interface GlassTabsOptions {
  /** Automatic selection on focus; manual waits for Enter, Space or click. */
  activation?: 'automatic' | 'manual';
  orientation?: 'horizontal' | 'vertical';
  /** Wrap arrow navigation at the ends. Default true. */
  loop?: boolean;
}

/** Static, same-document tabs. Author unique tab ids and aria-controls first.
 * Owns selection, roving focus, panel visibility and ARIA links, not styling.
 * Pair with /indicator for animated selection. Reattach when adding/removing tabs.
 */
export function attachGlassTabs(list: HTMLElement, initial: GlassTabsOptions = {}) {
  const view = list.ownerDocument.defaultView;
  if (!view || list.getAttribute('role') !== 'tablist') throw new Error('Glass tabs require a browser tablist');
  const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]')).filter(tab => tab.closest('[role="tablist"]') === list);
  const panels = tabs.map(tab => list.ownerDocument.getElementById(tab.getAttribute('aria-controls') ?? ''));
  if (!tabs.length || tabs.some(tab => !tab.id || list.ownerDocument.getElementById(tab.id) !== tab) ||
    panels.some(panel => !panel || panel.contains(list) || list.contains(panel)) || new Set(panels).size !== panels.length) {
    throw new Error('Glass tabs require unique tab ids and separate, unique aria-controls panels');
  }
  const owned: [HTMLElement, string[]][] = [[list, ['aria-orientation']],
    ...tabs.map(tab => [tab, ['aria-selected', 'tabindex']] as [HTMLElement, string[]]),
    ...panels.map(panel => [panel!, ['role', 'aria-labelledby', 'hidden']] as [HTMLElement, string[]])];
  const restore = owned.map(([node, names]) => [node, names.map(name => [name, node.getAttribute(name)] as const)] as const);
  let destroyed = false, options = initial;
  const enabled = (tab: HTMLElement) => !tab.matches(':disabled, [aria-disabled="true"]');
  let selected = tabs.find(tab => enabled(tab) && tab.getAttribute('aria-selected') === 'true') ?? tabs.find(enabled);
  let roving = selected;
  const paint = () => {
    list.setAttribute('aria-orientation', options.orientation === 'vertical' ? 'vertical' : 'horizontal');
    tabs.forEach((tab, index) => {
      tab.setAttribute('aria-selected', String(tab === selected));
      tab.tabIndex = tab === roving && enabled(tab) ? 0 : -1;
      const panel = panels[index]!;
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id);
      panel.hidden = tab !== selected;
    });
  };
  const announceSelection = (previousId: string | null) => {
    const id = selected?.id ?? null;
    if (previousId !== id) list.dispatchEvent(new view.CustomEvent('lg-tab-change', { bubbles: true, detail: { id, previousId } }));
  };
  const select = (id: string, focus = false) => {
    const tab = tabs.find(tab => tab.id === id);
    if (destroyed || !tab || !enabled(tab)) return false;
    const previousId = selected?.id ?? null;
    selected = roving = tab; paint();
    if (focus) tab.focus();
    announceSelection(previousId);
    return true;
  };
  const target = (event: Event) => tabs.find(tab => tab === event.target);
  const click = (event: Event) => { const tab = tabs.find(tab => tab.contains(event.target as Node)); if (tab) select(tab.id); };
  const focus = (event: Event) => {
    const tab = target(event); if (!tab || !enabled(tab)) return;
    roving = tab;
    if (options.activation !== 'manual') select(tab.id); else paint();
  };
  const blur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next?.nodeType && list.contains(next)) return;
    // Return the single Tab stop to the active panel when manual navigation exits.
    roving = selected; paint();
  };
  const key = (event: KeyboardEvent) => {
    const tab = target(event); if (!tab || !enabled(tab) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(tab.id); return; }
    const vertical = options.orientation === 'vertical';
    const forward = vertical ? 'ArrowDown' : 'ArrowRight', backward = vertical ? 'ArrowUp' : 'ArrowLeft';
    if (![forward, backward, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const available = tabs.filter(enabled);
    if (!available.length) return;
    let index = available.indexOf(tab);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = available.length - 1;
    else {
      const rtl = !vertical && view.getComputedStyle(list).direction === 'rtl';
      index += (event.key === forward ? 1 : -1) * (rtl ? -1 : 1);
      index = options.loop === false ? Math.max(0, Math.min(available.length - 1, index)) : (index + available.length) % available.length;
    }
    available[index].focus();
  };
  const unlisten = listen([[list, 'click', click], [list, 'focusin', focus], [list, 'focusout', blur as EventListener], [list, 'keydown', key as EventListener]]);
  paint();
  return {
    select,
    get selectedId() { return selected?.id ?? null; },
    update(next: GlassTabsOptions = {}) {
      if (destroyed) return;
      const previousId = selected?.id ?? null;
      options = next;
      if (!selected || !enabled(selected)) selected = tabs.find(enabled);
      if (!roving || !enabled(roving)) roving = selected;
      paint();
      announceSelection(previousId);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; unlisten();
      for (const [node, attributes] of restore) for (const [name, value] of attributes) {
        if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
      }
    },
  };
}
