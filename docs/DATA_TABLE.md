# Native data, deliberate views

Optional `/data-table` exports pure `createGlassDataTable`, `getGlassDataTableProps`, `getGlassDataTableHeaderProps` and `getGlassDataTableSortButtonProps`. `/data-table.css` is separate scoped styling. No grid engine, DOM controller, framework dependency or network runner is added; imports and models are SSR-safe.

```ts
import { createGlassDataTable } from '@wpsydev/liquid-glass/data-table';
const model = createGlassDataTable({
  caption: 'Local materials',
  columns: [{ id: 'name', label: 'Name' }],
  rows: [{ id: 'paper', values: { name: 'Uncoated paper' } }],
});
const view = model.getView({ filter: 'paper', page: 0, pageSize: 20 });
```

Supply ordinary arrays/objects with stable unique column/row IDs. Cells are strings, finite numbers, booleans or null; all required columns must have actual values. Getters and arbitrary property paths are rejected. Render strings as escaped text/textContent. Custom compare callbacks are explicitly trusted host code, must return finite numbers and own their complete ordering including nulls; proxies are unsupported rather than a security boundary.

Bounds:1–32columns,0–5000rows,100,000cells,2048characters per string cell and1,000,000aggregate authored text characters. Models clone/freeze data and cache normalized search/sort strings. Reuse the model for view changes; recreate explicitly when host data changes. Sorting/filtering do not mutate host data.

Columns default sortable/searchable true; explicitly disable either. getView accepts sort `{columnId,direction:'ascending'|'descending'}` or null, filter up to256characters, zero-based page default0, pageSize default20 capped200. Filtering collapses whitespace/lowercases and matches substrings across searchable cells. It uses locale-independent JS lowercase, not full Unicode casefold or Intl.Collator. Default sorting orders numbers, strings, booleans, with null last in both directions; stable ties retain authored order. Custom comparators replace this ordering.

The frozen view supplies all matching sorted rows, current pageRows, truthful total/filtered counts, page/pageSize/pageCount,1-based start/end range and previous/next availability. Empty ranges are0–0 with0pages; oversized requested pages clamp to the actual last page. Page size bounds rendered rows only. Filtering still scans the full local dataset and sorting remains O(n log n). These are local totals, not inferred remote counts or virtualization.

Render an actual table/caption/thead/tbody/th/td tree. getGlassDataTableProps supplies only a class; render model.caption in caption. Header props keep scope=col and put aria-sort only on the actual sorted th; remove stale aria-sort on other headers during updates. Sort-button props provide native button type,44px scoped class, disabled status and a next-direction label/data value. They do not install click handlers; the host requests a new view. Nonsortable columns should render a plain heading label. Keep sort icons decorative.

Use one authored overflow frame and preserve keyboard access to intentional table scrolling. The host owns row rendering/replacement, input/focus/selection, editing, events, empty-state recovery, storage, permissions and networking. CSS supplies no grid roles, cell filters, whole-app reset or layered glass on every cell. Material styling may enhance the outer frame separately.

[Index](https://wpsydev.github.io/liquid-glass-kit/table/) edits18 original local studio records. Actual native sorting preserves ties, filtering Print gives9matches, page two shows records7–9, Apply changes one local row by recreating its model, and Clear Search restores the same focused field after an empty result. At320px, native ArrowRight scrolls the table region while the page fits. No backend or save/upload service is connected.

23 focused tests and20 native desktop viewport/state cases across five320–1440px sizes retain44px targets,16px fields and no page overflow. Table identity, caption, column scopes, one current aria-sort, stable ties, null-last behavior, real typing/caret, local edit and empty recovery were verified separately. Select modes were fixture-driven; physical phones, Safari, native select popup delivery and assistive technology remain unverified.

Optional model/props2600bytesgzip, CSS777bytesgzip. Separate native5000-row probes: construction11.70ms median, cached filtering0.14ms, numeric sorting1.55ms; connected host construction/replacement of200rows1.10ms median. Exact warmups/batches and further scopes are recorded. DOM scope includes induced synchronous style/layout but excludes asynchronous painting; data scopes exclude DOM. No comparative speedup, FPS, all5000rendered rows or whole-app latency claim.

Original twelve-second disco120/keys film records actual sort/filter/page/local edit/empty recovery. Disclosed camera density keeps editor/control bottoms below853px and captions at882px. Full360-frame/audio decode and four reviewed frames passed; export30fps is not appFPS.

[Native evidence](../benchmarks/data-table-native.json) · [Benchmark](../benchmarks/data-table-benchmark-native.json) · [Research](resource-series/research/26-shadcnblocks.md)

Independent Shadcnblocks-inspired structured-data behavior, with no copied premium block or required TanStack/React runtime.
