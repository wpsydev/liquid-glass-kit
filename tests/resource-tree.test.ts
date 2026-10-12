import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountGlassResourceTree } from '../src/resource-tree.js';
import type { GlassResourceNode, GlassResourceTreeOptions } from '../src/resource-tree.js';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const nodes = (): GlassResourceNode[] => [
  { id: 'src', label: 'src', children: [{ id: 'index', label: 'index.ts', status: 'Modified' }, { id: 'disabled', label: 'private.ts', disabled: true }, { id: 'nested', label: 'nested', children: [{ id: 'deep', label: 'deep.ts' }] }] },
  { id: 'readme', label: 'README.md' }, { id: 'ready', label: 'ready.txt' }, { id: 'root-disabled', label: 'Restricted', disabled: true },
];
function fixture(options: Partial<GlassResourceTreeOptions> = {}) {
  const host = document.createElement('div'); host.innerHTML = '<p>Host content</p>'; document.body.append(host);
  const onSelect = vi.fn(), onExpand = vi.fn(), controller = mountGlassResourceTree(host, { nodes: nodes(), onSelect, onExpand, ...options });
  const tree = host.querySelector<HTMLUListElement>('[role=tree]')!;
  const item = (id: string) => [...tree.querySelectorAll<HTMLLIElement>('[role=treeitem]')].find(node => node.dataset.resourceId === id)!;
  return { host, tree, item, controller, onSelect, onExpand };
}
function key(target: HTMLElement, key: string, modifiers: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }); target.dispatchEvent(event); return event;
}

describe('optional single-select resource tree', () => {
  it('appends an owned shell and preserves host DOM and global state during cleanup', () => {
    const { host, controller } = fixture(); const before = host.firstChild;
    controller.destroy(); controller.destroy(); controller.update({ nodes: [] }); expect(controller.select('src')).toBe(false);
    expect(host.childNodes).toHaveLength(1); expect(host.firstChild).toBe(before); expect(host.textContent).toBe('Host content');
  });
  it('labels a nested tree with branch/leaf semantics and one roving tab stop', () => {
    const { tree, item, controller } = fixture({ expandedIds: ['src'] });
    expect(tree.getAttribute('aria-multiselectable')).toBe('false'); expect(tree.getAttribute('aria-labelledby')).toBeTruthy();
    expect(item('src').getAttribute('aria-expanded')).toBe('true'); expect(item('index').hasAttribute('aria-expanded')).toBe(false);
    expect(item('index').getAttribute('aria-level')).toBe('2'); expect(item('index').getAttribute('aria-posinset')).toBe('1'); expect(item('index').getAttribute('aria-setsize')).toBe('3');
    expect(tree.querySelectorAll('[tabindex="0"]')).toHaveLength(1); expect([...tree.querySelectorAll('button')].every(button => button.tabIndex === -1)).toBe(true); controller.destroy();
  });
  it('keeps focus, selection and expansion independent and caret clicks never select', () => {
    const { item, controller, onSelect, onExpand } = fixture(); item('src').focus(); key(item('src'), 'ArrowRight');
    expect(item('src').getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(item('src')); expect(controller.selectedId).toBeNull();
    key(item('src'), 'ArrowDown'); expect(document.activeElement).toBe(item('index')); expect(onSelect).not.toHaveBeenCalled();
    key(item('index'), 'Enter'); expect(controller.selectedId).toBe('index'); expect(onSelect).toHaveBeenCalledOnce();
    item('src').querySelector<HTMLButtonElement>('button')!.click(); expect(controller.selectedId).toBe('index'); expect(onSelect).toHaveBeenCalledOnce(); expect(onExpand).toHaveBeenCalledWith('src', false); controller.destroy();
  });
  it('navigates cached visible order, skips disabled nodes and clamps at tree boundaries', () => {
    const { item, controller } = fixture({ expandedIds: ['src'] }); item('src').focus(); key(item('src'), 'ArrowDown'); expect(document.activeElement).toBe(item('index'));
    key(item('index'), 'ArrowDown'); expect(document.activeElement).toBe(item('nested'));
    key(item('nested'), 'End'); expect(document.activeElement).toBe(item('ready')); key(item('ready'), 'ArrowDown'); expect(document.activeElement).toBe(item('ready'));
    key(item('ready'), 'Home'); expect(document.activeElement).toBe(item('src')); key(item('src'), 'ArrowUp'); expect(document.activeElement).toBe(item('src')); controller.destroy();
  });
  it('expands before entering children and collapses before moving to a parent', () => {
    const { item, controller } = fixture(); item('src').focus(); key(item('src'), 'ArrowRight'); key(item('src'), 'ArrowRight'); expect(document.activeElement).toBe(item('index'));
    key(item('index'), 'ArrowLeft'); expect(document.activeElement).toBe(item('src')); key(item('src'), 'ArrowLeft'); expect(item('src').getAttribute('aria-expanded')).toBe('false');
    key(item('src'), 'ArrowLeft'); expect(document.activeElement).toBe(item('src')); controller.destroy();
  });
  it('rescues focus when a branch collapses while retaining selected-child context', () => {
    const { item, controller } = fixture({ expandedIds: ['src', 'nested'] }); controller.select('deep', true);
    expect(document.activeElement).toBe(item('deep')); controller.setExpanded('src', false);
    expect(document.activeElement).toBe(item('src')); expect(controller.selectedId).toBe('deep'); expect(item('src').getAttribute('aria-selected')).toBe('false');
    expect(item('src').querySelector<HTMLElement>('.lg-resource-context')!.hidden).toBe(false); expect(item('src').getAttribute('aria-describedby')).toContain('context');
    controller.setExpanded('src', true); expect(item('src').querySelector<HTMLElement>('.lg-resource-context')!.hidden).toBe(true); expect(item('src').getAttribute('aria-describedby') ?? '').not.toContain('context'); controller.destroy();
  });
  it('never gives unselected rows a hidden selected-child accessible description', () => {
    const { item, controller } = fixture(); expect(item('src').hasAttribute('aria-describedby')).toBe(false); expect(item('readme').hasAttribute('aria-describedby')).toBe(false);
    expect(item('index').getAttribute('aria-describedby')).toContain('status'); expect(item('index').getAttribute('aria-describedby')).not.toContain('context'); controller.destroy();
  });
  it('supports bounded prefix typeahead and repeated-character cycling without timers', () => {
    let now = 0; vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    const { item, controller } = fixture(); item('src').focus(); key(item('src'), 'r'); expect(document.activeElement).toBe(item('readme'));
    now += 50; key(item('readme'), 'r'); expect(document.activeElement).toBe(item('ready'));
    now += 800; key(item('ready'), 'r'); expect(document.activeElement).toBe(item('readme'));
    now += 50; key(item('readme'), 'e'); now += 50; key(item('readme'), 'a'); expect(document.activeElement).toBe(item('readme')); controller.destroy();
  });
  it('preserves host key handlers/IME and does not add shortcuts or filesystem behavior', () => {
    const { item, controller, onSelect } = fixture(); item('src').focus();
    expect(key(item('src'), 'Enter', { isComposing: true }).defaultPrevented).toBe(false); expect(key(item('src'), 'ArrowDown', { ctrlKey: true }).defaultPrevented).toBe(false);
    const handled = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); handled.preventDefault(); item('src').dispatchEvent(handled);
    expect(onSelect).not.toHaveBeenCalled(); controller.destroy();
  });
  it('does not select or expand disabled rows or navigate into disabled branches', () => {
    const { item, controller, onSelect } = fixture({ nodes: [{ id: 'disabled-folder', label: 'Disabled', disabled: true, children: [{ id: 'inside', label: 'Inside' }] }, { id: 'enabled', label: 'Enabled' }], expandedIds: ['disabled-folder'] });
    expect(item('disabled-folder').getAttribute('aria-expanded')).toBe('false'); expect(controller.setExpanded('disabled-folder', true)).toBe(false); expect(controller.select('disabled-folder')).toBe(false);
    item('disabled-folder').querySelector<HTMLButtonElement>('button')!.click(); expect(onSelect).not.toHaveBeenCalled(); item('enabled').focus(); key(item('enabled'), 'Home'); expect(document.activeElement).toBe(item('enabled')); controller.destroy();
  });
  it('synchronizes host snapshots without emitting selection callbacks or stealing external focus', () => {
    const external = document.createElement('input'); document.body.append(external); external.focus();
    const { controller, item, onSelect } = fixture(); controller.update({ nodes: nodes(), selectedId: 'readme', expandedIds: ['src'] });
    expect(controller.selectedId).toBe('readme'); expect(item('readme').getAttribute('aria-selected')).toBe('true'); expect(document.activeElement).toBe(external); expect(onSelect).not.toHaveBeenCalled(); controller.destroy();
  });
  it('rescues removed focus to a surviving ancestor and clears removed selection', () => {
    const { controller, item } = fixture({ expandedIds: ['src'] }); controller.select('index', true);
    controller.update({ nodes: [{ id: 'src', label: 'src', children: [] }, { id: 'readme', label: 'README.md' }] });
    expect(controller.selectedId).toBeNull(); expect(document.activeElement).toBe(item('src')); expect(item('src').tabIndex).toBe(0); controller.destroy();
  });
  it('handles empty or all-disabled trees with one container tab stop', () => {
    const { tree, controller } = fixture({ nodes: [] }); expect(tree.tabIndex).toBe(0); expect(tree.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
    tree.focus(); controller.update({ nodes: [{ id: 'disabled', label: 'Unavailable', disabled: true }] }); expect(document.activeElement).toBe(tree); expect(tree.tabIndex).toBe(0); controller.destroy();
  });
  it('treats host labels/statuses as text and returns copied callback node data', () => {
    const malicious = '<img src=x onerror=alert(1)>', onSelect = vi.fn((_id: string, node: GlassResourceNode) => { node.label = 'Changed callback'; (node.children as GlassResourceNode[])[0].label = 'Changed child'; });
    const { tree, controller, item } = fixture({ nodes: [{ id: 'parent', label: malicious, status: malicious, children: [{ id: 'child', label: 'Child' }] }], onSelect });
    controller.select('parent'); expect(tree.querySelector('img')).toBeNull(); expect(item('parent').querySelector('.lg-resource-name')?.textContent).toBe(malicious); expect(item('child').querySelector('.lg-resource-name')?.textContent).toBe('Child'); controller.destroy();
  });
  it('rejects oversized, deep, duplicate or malformed structures transactionally', () => {
    const { controller, item } = fixture();
    expect(() => controller.update({ nodes: [{ id: 'x', label: 'a' }, { id: 'x', label: 'b' }] })).toThrow('unique');
    expect(() => controller.update({ nodes: Array.from({ length: 2001 }, (_, index) => ({ id: String(index), label: 'Node' })) })).toThrow('2,000');
    let deep: GlassResourceNode = { id: '0', label: '0' }; for (let index = 1; index < 33; index++) deep = { id: String(index), label: String(index), children: [deep] };
    expect(() => controller.update({ nodes: [deep] })).toThrow('32'); expect(item('src').getAttribute('role')).toBe('treeitem'); controller.destroy();
  });
  it('does not append partial DOM after an invalid initial attachment', () => {
    const host = document.createElement('div'); host.innerHTML = '<p>Existing</p>';
    expect(() => mountGlassResourceTree(host, { nodes: [{ id: '', label: 'Invalid' }] })).toThrow(); expect(host.childNodes).toHaveLength(1);
  });
  it('does no idle RAF/geometry polling and changes only roving rows during ordinary navigation', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const { tree, item, controller } = fixture({ expandedIds: ['src'] }); const before = tree.firstChild; item('src').focus(); key(item('src'), 'ArrowDown');
    expect(tree.firstChild).toBe(before); expect(raf).not.toHaveBeenCalled(); expect(geometry).not.toHaveBeenCalled(); controller.destroy();
  });
  it('bounds deep indentation and handles depth-32 empty lazy branches', () => {
    let deep: GlassResourceNode = { id: '0', label: 'Leaf', children: [] }; for (let index = 1; index < 32; index++) deep = { id: String(index), label: String(index), children: [deep] };
    const { item, controller } = fixture({ nodes: [deep] }); expect(item('0').getAttribute('aria-level')).toBe('32'); expect(item('0').style.getPropertyValue('--lg-resource-indent')).toBe('72px'); controller.destroy();
  });
});
