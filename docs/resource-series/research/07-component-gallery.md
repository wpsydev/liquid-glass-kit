# Resource 07: The Component Gallery

Reviewed 2026-10-11 using Exa and native T3 preview. This is a cross-system pattern reference, not an endorsement or ready-made portable component package.

## Evidence and concrete examples

- https://component.gallery/ exposes component categories and technology/accessibility/open-source filters. Counts are a directory snapshot, not proof of quality or adoption.
- https://component.gallery/about/ explicitly warns against treating popular techniques as automatically correct and recommends context and research.
- https://component.gallery/components/tree-view/ links fourteen tree examples and explains nested hierarchy, branch/leaf roles, separate selection/expansion hit areas, keyboard navigation and clear expansion indicators.
- https://carbondesignsystem.com/components/tree-view/usage/ distinguishes branches from leaves and caret activation from selection. It documents selected-child context when a branch collapses and cautions against using a tree as general product navigation or a one-level accordion.
- https://primer.style/product/components/tree-view/ documents unique item IDs, current-path expansion, labeled leading/trailing visuals and subtree loading states. Known child counts and unknown counts have different loading presentations.
- https://www.w3.org/WAI/ARIA/apg/patterns/treeview/ distinguishes focus from selection and specifies vertical-tree arrows, Home/End, activation and recommended type-ahead. Multi-selection is a distinct interaction contract, not a Boolean styling tweak.

## Independent useful feature

Add an optional `mountGlassResourceTree(host, { nodes, selectedId, expandedIds, onSelect, onExpand })` controller with matching scoped CSS. Begin with a documented single-select mode: nested semantic markup, stable IDs, roving tabindex, visible-order navigation, branch expansion, focus rescue when an ancestor collapses, separate selected and focused states, Home/End and bounded type-ahead. Preserve author text and status labels; return destroy/update methods with listener and attribute cleanup.

Host applications own file access, remote loading, routes and mutation. Loading/empty/error branch presentations may be supplied as original recipes. Do not imply actual filesystem or Git integration. Avoid adding partial multi-select behavior until its complete keyboard/touch contract is implemented and tested.

Original demo: keyboard-navigate a file outline, expand a folder, select a modified file and show a read-only preview. Use labeled status marks instead of color alone. Mobile rows and caret hit areas should be at least 44px even though some referenced desktop systems intentionally offer denser rows.

## Performance

Use one glass surface around the tree; ordinary rows should not each create backdrop-filter layers. Cache visible node order and ID/parent relationships until structure or expansion changes. Update only affected row state, delegate events and avoid geometry reads on ordinary key navigation. No idle RAF, polling or mandatory React runtime. Collapsed branches are excluded from focus traversal. Large-tree benchmarks must state total nodes, visible nodes, depth, rendered rows and update type; bounded rendering is not full virtualization unless actually implemented.

## Rights and validation boundaries

Public gallery and primary documentation were accessible without purchases. No gallery screenshots or component implementation source were copied. Each linked project has its own license; check the exact source license before any reuse. This proposal uses original code and standards behavior. Browser, mobile layout, keyboard, assistive-technology and unit validation should be recorded separately; ARIA attributes alone do not prove accessibility.

Public GitHub metadata checked during this audit: https://github.com/carbon-design-system/carbon declares Apache-2.0; https://github.com/primer/react declares MIT; https://github.com/inbn/component-gallery has no detected license. These are repository snapshots, not permission to reuse third-party screenshot assets.
