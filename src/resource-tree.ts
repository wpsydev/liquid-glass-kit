/** A single-select presentation tree, never filesystem or route access. */
export interface GlassResourceNode {
  id: string;
  label: string;
  /** Presence marks a branch; an empty array can represent host-owned lazy data. */
  children?: readonly GlassResourceNode[];
  disabled?: boolean;
  /** Visible textual status, such as Modified, Loading or Error. */
  status?: string;
}
export interface GlassResourceTreeOptions {
  nodes: readonly GlassResourceNode[];
  label?: string;
  /** Supplied IDs synchronize host snapshots; later user interaction is local UI state. */
  selectedId?: string | null;
  expandedIds?: readonly string[];
  onSelect?: (id: string, node: GlassResourceNode) => void;
  onExpand?: (id: string, expanded: boolean) => void;
}
export interface GlassResourceTree {
  readonly selectedId: string | null;
  select(id: string, focus?: boolean): boolean;
  setExpanded(id: string, expanded: boolean): boolean;
  /** Replaces options/nodes. Omitted selection/expansion preserve valid local UI state. */
  update(options: GlassResourceTreeOptions): void;
  destroy(): void;
}
type Entry = {
  node: GlassResourceNode; parent?: Entry; children: Entry[]; search: string;
  item: HTMLLIElement; row: HTMLDivElement; group?: HTMLUListElement; caret?: HTMLButtonElement; context: HTMLSpanElement;
};
const normalized = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
let sequence = 0;

/**
 * Append one owned tree shell. Import /resource-tree.css separately.
 * Selection is separate from focus and expansion; callbacks report UI intent.
 * All bounded nodes are rendered (at most 2,000, depth 32), not virtualized.
 * Visible navigation order is cached until structure/expansion changes. No RAF.
 */
export function mountGlassResourceTree(host: HTMLElement, initial: GlassResourceTreeOptions): GlassResourceTree {
  const doc = host.ownerDocument, view = doc.defaultView;
  if (!view) throw new Error('Resource tree requires a browser document');
  const browser = view;
  const root = doc.createElement('section'); root.className = 'lg-resource-tree';
  const heading = doc.createElement('h2'); heading.className = 'lg-resource-heading';
  const tree = doc.createElement('ul'); tree.setAttribute('role', 'tree'); tree.setAttribute('aria-multiselectable', 'false'); tree.className = 'lg-resource-list';
  let id: string; do { id = `lg-resource-${++sequence}`; } while (doc.getElementById(`${id}-label`));
  heading.id = `${id}-label`; tree.setAttribute('aria-labelledby', heading.id);
  const empty = doc.createElement('p'); empty.className = 'lg-resource-empty'; empty.textContent = 'No resources.';
  root.append(heading, tree, empty);
  let options: GlassResourceTreeOptions, entries = new Map<string, Entry>(), roots: Entry[] = [], visible: Entry[] = [], enabled: Entry[] = [];
  let enabledIndex = new Map<Entry, number>();
  let expanded = new Set<string>(), selected: Entry | undefined, roving: Entry | undefined, destroyed = false;
  let ancestorMarks = new Set<Entry>(), typeBuffer = '', lastType = -Infinity;
  const snapshotNode = (node: GlassResourceNode): GlassResourceNode => ({ ...node, children: node.children?.map(snapshotNode) });

  function compile(input: GlassResourceTreeOptions) {
    if (!input || !Array.isArray(input.nodes)) throw new TypeError('Resource tree nodes must be an array');
    if (input.expandedIds !== undefined && (!Array.isArray(input.expandedIds) || input.expandedIds.length > 2000)) throw new RangeError('Invalid resource expansion snapshot');
    const nextEntries = new Map<string, Entry>();
    function walk(nodes: readonly GlassResourceNode[], depth: number, parent?: Entry): Entry[] {
      if (nodes.length && depth > 32) throw new RangeError('Resource tree depth is limited to 32');
      if (nodes.length > 2000 - nextEntries.size) throw new RangeError('Resource tree is limited to 2,000 nodes');
      return nodes.map((supplied, index) => {
        if (!supplied || typeof supplied.id !== 'string' || !supplied.id || supplied.id.length > 256 || nextEntries.has(supplied.id)) throw new RangeError('Resource IDs must be unique nonempty strings, at most 256 characters');
        if (typeof supplied.label !== 'string' || !supplied.label.trim() || supplied.label.length > 500 || (supplied.status !== undefined && (typeof supplied.status !== 'string' || supplied.status.length > 500))) throw new RangeError('Resource labels/status must be bounded text');
        if (supplied.children !== undefined && !Array.isArray(supplied.children)) throw new TypeError('Resource children must be an array');
        if (nextEntries.size >= 2000) throw new RangeError('Resource tree is limited to 2,000 nodes');
        const node = { ...supplied, children: supplied.children === undefined ? undefined : [] } as GlassResourceNode;
        const item = doc.createElement('li'); item.setAttribute('role', 'treeitem'); item.tabIndex = -1;
        item.dataset.resourceId = node.id; item.setAttribute('aria-level', String(depth)); item.setAttribute('aria-posinset', String(index + 1)); item.setAttribute('aria-setsize', String(nodes.length));
        item.style.setProperty('--lg-resource-indent', `${Math.min(72, (depth - 1) * 12)}px`);
        item.setAttribute('aria-disabled', String(Boolean(node.disabled))); item.setAttribute('aria-selected', 'false');
        const row = doc.createElement('div'); row.className = 'lg-resource-row'; row.dataset.resourceRow = node.id;
        const label = doc.createElement('span'); label.className = 'lg-resource-name'; label.textContent = node.label;
        const itemId = `${id}-item-${nextEntries.size}`, labelId = `${itemId}-label`; item.id = itemId; label.id = labelId; item.setAttribute('aria-labelledby', labelId);
        const content = doc.createElement('span'); content.className = 'lg-resource-content'; content.append(label);
        const context = doc.createElement('span'); context.className = 'lg-resource-context'; context.id = `${itemId}-context`; context.textContent = 'Selected resource inside'; context.hidden = true;
        const described: string[] = [];
        if (node.status) { const status = doc.createElement('span'); status.className = 'lg-resource-status'; status.textContent = node.status; status.id = `${itemId}-status`; described.push(status.id); content.append(status); }
        if (described.length) item.setAttribute('aria-describedby', described.join(' ')); content.append(context);
        const entry: Entry = { node, parent, children: [], search: normalized(node.label), item, row, context };
        nextEntries.set(node.id, entry);
        if (supplied.children !== undefined) {
          const caret = doc.createElement('button'); caret.type = 'button'; caret.tabIndex = -1; caret.className = 'lg-resource-caret'; caret.dataset.resourceExpand = node.id; caret.disabled = Boolean(node.disabled);
          const icon = doc.createElement('span'); icon.textContent = '›'; icon.setAttribute('aria-hidden', 'true'); caret.append(icon); row.append(caret); entry.caret = caret;
          const group = doc.createElement('ul'); group.setAttribute('role', 'group'); group.className = 'lg-resource-group'; group.id = `${itemId}-group`; entry.group = group; caret.setAttribute('aria-controls', group.id);
          entry.children = walk(supplied.children, depth + 1, entry); node.children = entry.children.map(child => child.node);
          entry.children.forEach(child => group.append(child.item)); item.append(row, group);
        } else { const spacer = doc.createElement('span'); spacer.className = 'lg-resource-spacer'; spacer.setAttribute('aria-hidden', 'true'); row.append(spacer); item.append(row); }
        row.append(content); return entry;
      });
    }
    const nextRoots = walk(input.nodes, 1);
    return { nextEntries, nextRoots };
  }
  function paintBranch(entry: Entry) {
    if (!entry.group || !entry.caret) return;
    const open = expanded.has(entry.node.id) && !entry.node.disabled;
    entry.item.setAttribute('aria-expanded', String(open)); entry.group.hidden = !open;
    entry.caret.setAttribute('aria-expanded', String(open)); entry.caret.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${entry.node.label}`);
    paintContext(entry);
  }
  function paintContext(entry: Entry) {
    const show = ancestorMarks.has(entry) && !expanded.has(entry.node.id);
    entry.context.hidden = !show;
    const described = (entry.item.getAttribute('aria-describedby') ?? '').split(' ').filter(value => value && value !== entry.context.id);
    if (show) described.push(entry.context.id);
    if (described.length) entry.item.setAttribute('aria-describedby', described.join(' ')); else entry.item.removeAttribute('aria-describedby');
  }
  function cacheVisible() {
    visible = []; enabled = []; enabledIndex = new Map();
    const visit = (list: readonly Entry[]) => { for (const entry of list) {
      visible.push(entry); if (!entry.node.disabled) { enabledIndex.set(entry, enabled.length); enabled.push(entry); }
      if (entry.group && expanded.has(entry.node.id) && !entry.node.disabled) visit(entry.children);
    } }; visit(roots);
    tree.tabIndex = enabled.length ? -1 : 0;
  }
  function setRoving(next: Entry | undefined, focus = false) {
    if (roving !== next) { if (roving) roving.item.tabIndex = -1; roving = next; if (next) next.item.tabIndex = 0; }
    // Native focus scrolling keeps keyboard destinations visible inside long
    // authored scrollers without a controller-owned geometry/frame loop.
    if (focus) { if (next) next.item.focus(); else tree.focus(); }
  }
  function paintSelection(next: Entry | undefined) {
    selected?.item.setAttribute('aria-selected', 'false'); selected = next; selected?.item.setAttribute('aria-selected', 'true');
    const oldMarks = ancestorMarks;
    ancestorMarks = new Set();
    let ancestor = next?.parent;
    while (ancestor) { ancestorMarks.add(ancestor); ancestor.item.setAttribute('data-lg-selected-inside', 'true'); ancestor = ancestor.parent; }
    for (const entry of oldMarks) { if (!ancestorMarks.has(entry)) entry.item.removeAttribute('data-lg-selected-inside'); paintContext(entry); }
    for (const entry of ancestorMarks) paintContext(entry);
  }
  function setExpanded(resourceId: string, value: boolean) {
    const entry = entries.get(resourceId);
    if (destroyed || !entry?.group || entry.node.disabled) return false;
    if (expanded.has(resourceId) === value) return true;
    value ? expanded.add(resourceId) : expanded.delete(resourceId); paintBranch(entry); cacheVisible();
    if (!roving || !enabledIndex.has(roving)) {
      const rescueFocus = Boolean(roving?.item.contains(doc.activeElement));
      setRoving(entry, rescueFocus);
    }
    options.onExpand?.(resourceId, value); return true;
  }
  function select(resourceId: string, focus = false) {
    const entry = entries.get(resourceId);
    if (destroyed || !entry || entry.node.disabled) return false;
    const changed = selected !== entry; paintSelection(entry);
    if (enabledIndex.has(entry)) setRoving(entry, focus);
    if (changed) options.onSelect?.(resourceId, snapshotNode(entry.node));
    return true;
  }
  function update(next: GlassResourceTreeOptions) {
    if (destroyed) return;
    const compiled = compile(next);
    const focusWasInside = tree.contains(doc.activeElement), oldRovingId = roving?.node.id;
    const ancestors: string[] = []; let parent = roving?.parent; while (parent) { ancestors.push(parent.node.id); parent = parent.parent; }
    const selectedId = next.selectedId === undefined ? selected?.node.id : next.selectedId;
    const nextExpanded = new Set(next.expandedIds ?? expanded);
    entries = compiled.nextEntries; roots = compiled.nextRoots; options = { ...next };
    expanded = new Set([...nextExpanded].filter(resourceId => entries.get(resourceId)?.group && !entries.get(resourceId)!.node.disabled));
    roving = undefined; selected = undefined; ancestorMarks = new Set(); typeBuffer = ''; lastType = -Infinity;
    heading.textContent = next.label ?? 'Resources'; tree.replaceChildren(...roots.map(entry => entry.item)); empty.hidden = roots.length > 0;
    for (const entry of entries.values()) paintBranch(entry); cacheVisible();
    const selection = selectedId ? entries.get(selectedId) : undefined; paintSelection(selection?.node.disabled ? undefined : selection);
    const candidate = oldRovingId ? entries.get(oldRovingId) : undefined;
    const rescue = candidate && enabledIndex.has(candidate) ? candidate : ancestors.map(resourceId => entries.get(resourceId)).find(entry => entry && enabledIndex.has(entry));
    setRoving(rescue ?? (selected && enabledIndex.has(selected) ? selected : enabled[0]), focusWasInside);
  }
  const eventEntry = (event: Event) => {
    const target = event.target instanceof browser.Element ? event.target : null;
    const item = target?.closest<HTMLLIElement>('[role=treeitem]');
    const entry = item?.dataset.resourceId ? entries.get(item.dataset.resourceId) : undefined;
    return entry?.item === item ? entry : undefined;
  };
  const clicked = (event: MouseEvent) => {
    const entry = eventEntry(event); if (!entry || entry.node.disabled || !(event.target instanceof browser.Element)) return;
    const row = event.target.closest('[data-resource-row]'); if (row !== entry.row) return;
    if (event.target.closest('[data-resource-expand]') === entry.caret) { setRoving(entry, true); setExpanded(entry.node.id, !expanded.has(entry.node.id)); }
    else select(entry.node.id, true);
  };
  const down = (event: MouseEvent) => { if (event.target instanceof browser.Element && event.target.closest('[data-resource-expand]')) event.preventDefault(); };
  const focused = (event: FocusEvent) => { const entry = eventEntry(event); if (entry && !entry.node.disabled && enabledIndex.has(entry)) setRoving(entry); };
  const unfocused = (event: FocusEvent) => {
    if (event.relatedTarget instanceof browser.Node && tree.contains(event.relatedTarget)) return;
    let target = selected;
    while (target && !enabledIndex.has(target)) target = target.parent;
    setRoving(target ?? enabled[0]);
  };
  const keys = (event: KeyboardEvent) => {
    const entry = eventEntry(event);
    if (!entry || entry.node.disabled || event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.target !== entry.item) return;
    const index = enabledIndex.get(entry) ?? -1; let destination: Entry | undefined;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); typeBuffer = ''; select(entry.node.id); return; }
    if (event.key === 'ArrowDown') destination = enabled[Math.min(enabled.length - 1, index + 1)];
    else if (event.key === 'ArrowUp') destination = enabled[Math.max(0, index - 1)];
    else if (event.key === 'Home') destination = enabled[0];
    else if (event.key === 'End') destination = enabled.at(-1);
    else if (event.key === 'ArrowRight') {
      if (entry.group && !expanded.has(entry.node.id)) { event.preventDefault(); setExpanded(entry.node.id, true); return; }
      destination = entry.children.find(child => !child.node.disabled);
    } else if (event.key === 'ArrowLeft') {
      if (entry.group && expanded.has(entry.node.id)) { event.preventDefault(); setExpanded(entry.node.id, false); return; }
      destination = entry.parent;
      while (destination?.node.disabled) destination = destination.parent;
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      const now = browser.performance.now(); typeBuffer = (now - lastType < 700 ? typeBuffer : '') + normalized(event.key); lastType = now;
      typeBuffer = typeBuffer.slice(-64);
      const repeated = [...typeBuffer].every(char => char === typeBuffer[0]); const prefix = repeated ? typeBuffer[0] : typeBuffer;
      const start = repeated ? index + 1 : index;
      for (let offset = 0; offset < enabled.length; offset++) { const candidate = enabled[(start + offset) % enabled.length]; if (candidate.search.startsWith(prefix)) { destination = candidate; break; } }
    } else return;
    if (destination) { event.preventDefault(); setRoving(destination, true); }
  };
  // Initial validation is transactional and leaves no appended DOM on failure.
  update(initial); host.append(root);
  tree.addEventListener('click', clicked); tree.addEventListener('mousedown', down); tree.addEventListener('focusin', focused); tree.addEventListener('focusout', unfocused); tree.addEventListener('keydown', keys);
  return {
    get selectedId() { return selected?.node.id ?? null; }, select, setExpanded, update,
    destroy() {
      if (destroyed) return; destroyed = true;
      tree.removeEventListener('click', clicked); tree.removeEventListener('mousedown', down); tree.removeEventListener('focusin', focused); tree.removeEventListener('focusout', unfocused); tree.removeEventListener('keydown', keys);
      root.remove(); entries.clear(); roots = []; visible = []; enabled = []; enabledIndex.clear(); expanded.clear(); selected = roving = undefined; ancestorMarks.clear();
    },
  };
}
