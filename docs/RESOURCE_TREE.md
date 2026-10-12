# Resource tree

Optional `/resource-tree` exports `mountGlassResourceTree(host, options)` and typed `GlassResourceNode`, `GlassResourceTreeOptions`, `GlassResourceTree`. Import `/resource-tree.css` separately. Mount after hydration and call destroy on cleanup; imports are SSR-safe but mounting requires a browser document.

```ts
import { mountGlassResourceTree } from '@wpsydev/liquid-glass/resource-tree';
import '@wpsydev/liquid-glass/resource-tree.css';
const tree = mountGlassResourceTree(host, {
  label: 'Project resources',
  nodes: [{ id: 'docs', label: 'Documentation', children: [
    { id: 'intro', label: 'Introduction', status: 'Reviewed' },
  ] }],
  expandedIds: ['docs'], selectedId: 'intro',
  onSelect(id, node) { showYourOwnPreview(id, node); },
  onExpand(id, expanded) { recordYourOwnExpansion(id, expanded); },
});
```

Each node has unique nonempty id/label; optional children/disabled/status. Presence of children marks a branch, including an empty branch for host-owned loading. Labels/status are bounded500characters. At most2,000nodes and32levels; all nodes render once, including collapsed descendants. This is a bounded presentation tree, not virtualized filesystem access or a general navigation replacement.

Single selection and focus are separate. Up/Down move visible enabled focus; Right expands a branch or enters it; Left collapses or returns to a parent. Home/End visit visible boundaries. Enter/Space selects; printable type-ahead uses normalized labels. Modified/IME events remain with their owners. Native caret buttons are44px and expand independently of row selection; disabled entries are skipped for keyboard navigation and cannot activate.

`selectedId` reports selection. `select(id, focus=false)` returnsfalse for missing/disabled nodes; a valid hidden node can be selected without expanding ancestors, while focus changes only for visible nodes. `setExpanded(id, boolean)` handles branches and rescues focused descendants when they collapse. Collapsed ancestors identify selected descendants with a textual cue. Programmatic focus and keyboard traversal use native focus scrolling so destinations stay visible in long host panels.

`update(replacementOptions)` replaces the node snapshot/callbacks. Omitted selectedId/expandedIds preserve still-valid local state; explicit null clears selection. Invalid replacement data throws before the current tree changes. Removed focus is rescued to a surviving visible node or the empty tree; focus already outside is not stolen. `destroy()` removes only the owned appended shell/listeners and leaves host siblings alone. There is no polling/RAF or JavaScript geometry loop; native focus may still trigger ordinary browser layout/scroll work.

The host owns filtering, lazy data, content previews, routes, permissions and mutations. Callbacks report intent and copied node metadata. Do not equate a status label with filesystem/model authorization. The optional stylesheet creates one glass shell with ordinary rows; system motion/transparency/forced-color fallbacks are scoped. Keep actual text contrast and assistive-technology checks separate from roles/unit tests.

[Resource Room](https://wpsydev.github.io/liquid-glass-kit/tree/) supplies two original twenty-node inventories, actual host filtering, selectable sample text and presentation preferences. It reads no filesystem/Git data. [Research](resource-series/research/07-component-gallery.md) · [Browser lifecycle scope](../benchmarks/resource-tree-browser.json) · [Optional payload](../benchmarks/resource-tree-payload.json).
