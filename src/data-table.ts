export type GlassDataValue = string | number | boolean | null;
export interface GlassDataColumn {
  readonly id: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly searchable?: boolean;
  /** Explicit host callback. Must return a finite number; thrown errors propagate. */
  readonly compare?: (left: GlassDataValue, right: GlassDataValue) => number;
}
export interface GlassDataRow { readonly id: string; readonly values: Readonly<Record<string, GlassDataValue>> }
export interface GlassDataTableOptions { readonly caption: string; readonly columns: readonly GlassDataColumn[]; readonly rows: readonly GlassDataRow[] }
export interface GlassDataSort { readonly columnId: string; readonly direction: 'ascending' | 'descending' }
export interface GlassDataViewOptions { readonly sort?: GlassDataSort | null; readonly filter?: string; readonly page?: number; readonly pageSize?: number }
export interface GlassDataView {
  readonly caption: string;
  readonly columns: readonly Readonly<GlassDataColumn>[];
  /** All matching rows in actual sorted order, not a claimed remote dataset. */
  readonly rows: readonly GlassDataRow[];
  readonly pageRows: readonly GlassDataRow[];
  readonly sort: GlassDataSort | null;
  readonly filter: string;
  readonly totalCount: number;
  readonly filteredCount: number;
  readonly page: number;
  readonly pageSize: number;
  /** Zero for an empty result. Empty ranges are 0–0. */
  readonly pageCount: number;
  readonly range: { readonly start: number; readonly end: number };
  readonly canPrevious: boolean;
  readonly canNext: boolean;
}
export interface GlassDataTable {
  readonly caption: string;
  readonly columns: readonly Readonly<GlassDataColumn>[];
  readonly rows: readonly GlassDataRow[];
  /** Reuse the model for view changes. Recreate it explicitly when data changes. */
  getView(options?: GlassDataViewOptions): GlassDataView;
}
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
function fail(path: string, reason: string): never { throw new TypeError(`Invalid glass data table ${path}: ${reason}`); }
function record(value: unknown, allowed: readonly string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) fail(path, 'use an ordinary object');
  const output: Record<string, unknown> = Object.create(null);
  const keys = Reflect.ownKeys(value); if (keys.length > allowed.length) fail(path, 'unsupported field count');
  for (const key of keys) {
    if (typeof key !== 'string' || forbidden.has(key) || !allowed.includes(key)) fail(path, 'unsupported field');
    const property = Object.getOwnPropertyDescriptor(value, key)!;
    if (!('value' in property) || !property.enumerable) fail(path, 'accessors/non-enumerable fields are not accepted');
    output[key] = property.value;
  }
  return output;
}
function array(value: unknown, maximum: number, path: string, minimum = 0): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < minimum || value.length > maximum) fail(path, `use ${minimum}–${maximum} items`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => key !== 'length' && (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/.test(key)))) fail(path, 'custom array fields are not accepted');
  const output: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = descriptors[String(index)]; if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail(path, 'sparse/accessor slots are not accepted'); output.push(descriptor.value);
  }
  return output;
}
function text(value: unknown, maximum: number, path: string, empty = false): string {
  if (typeof value !== 'string' || value.length > maximum || (!empty && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) fail(path, `use ${empty ? '' : 'nonempty '}text of at most ${maximum} characters`);
  return value;
}
function id(value: unknown, path: string, row = false): string {
  const result = text(value, row ? 128 : 64, path);
  if (!(row ? /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/ : /^[A-Za-z][A-Za-z0-9_-]*$/).test(result) || forbidden.has(result.toLowerCase())) fail(path, 'use a stable safe identifier'); return result;
}
function boolean(value: unknown, path: string) { if (value !== undefined && typeof value !== 'boolean') fail(path, 'use a boolean'); return value !== false; }
const fold = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const views = new WeakMap<object, ReadonlyMap<string, Readonly<GlassDataColumn>>>();
function columnFor(columnId: string, view: GlassDataView) {
  const column = view && typeof view === 'object' ? views.get(view)?.get(columnId) : undefined;
  if (!column) fail('view', 'use a getView() result and one of its known column IDs'); return column;
}
function defaultCompare(left: Exclude<GlassDataValue, null>, right: Exclude<GlassDataValue, null>) {
  const rank = (value: Exclude<GlassDataValue, null>) => typeof value === 'number' ? 0 : typeof value === 'string' ? 1 : 2;
  const order = rank(left) - rank(right); if (order) return order;
  if (typeof left === 'number' && typeof right === 'number') return left < right ? -1 : left > right ? 1 : 0;
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right);
  const a = left as string, b = right as string; return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Optional pure model for one complete, host-supplied local dataset. No rendering,
 * DOM, grid roles, selection/editing, fetch, server totals or virtualization.
 * Native hosts render caption/th/td and keep events/focus/network decisions.
 * Strings are inert data: render with escaped framework text or textContent.
 * Ordinary objects/arrays only; no getters/property paths are evaluated. Proxies
 * are not a supported input/security boundary. Compare functions are host code.
 * Bounds: 32 columns, 5,000 rows, 100,000 cells, 2,048 characters per string cell
 * and 1,000,000 aggregate authored text characters. Cached search/sort strings use
 * locale-independent JS lowercase and collapsed whitespace, not Unicode casefold
 * or a language collator. Default order: numbers, strings, booleans, with null last
 * in either direction. Stable ties preserve input order. Custom comparators own
 * their entire ordering, including nulls. Filtering O(n), sorting O(n log n);
 * page size only bounds the rendered slice, not model/processing cost.
 */
export function createGlassDataTable(input: GlassDataTableOptions): GlassDataTable {
  const config = record(input, ['caption', 'columns', 'rows'], 'config');
  const caption = text(config.caption, 240, 'caption'); let characters = caption.length;
  const columnIds = new Set<string>();
  const columns = Object.freeze(array(config.columns, 32, 'columns', 1).map((value, index) => {
    const at = `columns[${index}]`, source = record(value, ['id', 'label', 'sortable', 'searchable', 'compare'], at);
    const columnId = id(source.id, `${at}.id`); if (columnIds.has(columnId)) fail(at, 'column IDs must be unique'); columnIds.add(columnId);
    const label = text(source.label, 160, `${at}.label`), sortable = boolean(source.sortable, `${at}.sortable`), searchable = boolean(source.searchable, `${at}.searchable`);
    if (source.compare !== undefined && typeof source.compare !== 'function') fail(`${at}.compare`, 'use an explicit host function');
    if (!sortable && source.compare !== undefined) fail(`${at}.compare`, 'a disabled sort column cannot declare a comparator'); characters += columnId.length + label.length;
    return Object.freeze({ id: columnId, label, sortable, searchable, ...(source.compare === undefined ? {} : { compare: source.compare as GlassDataColumn['compare'] }) });
  }));
  const rawRows = array(config.rows, 5000, 'rows'); if (rawRows.length * columns.length > 100000) fail('rows', 'maximum 100,000 cells');
  const rowIds = new Set<string>(), allowed = [...columnIds];
  const entries = rawRows.map((value, index) => {
    const at = `rows[${index}]`, source = record(value, ['id', 'values'], at), rowId = id(source.id, `${at}.id`, true);
    if (rowIds.has(rowId)) fail(at, 'row IDs must be unique'); rowIds.add(rowId); characters += rowId.length;
    const cells = record(source.values, allowed, `${at}.values`), values: Record<string, GlassDataValue> = Object.create(null), search: string[] = [];
    let sortText: Record<string, string> | null = null;
    for (const column of columns) {
      if (!Object.hasOwn(cells, column.id)) fail(`${at}.values`, 'provide a primitive or null for every column');
      const cell = cells[column.id];
      if (typeof cell === 'string') { text(cell, 2048, `${at}.values.${column.id}`, true); characters += cell.length; }
      else if (!(cell === null || typeof cell === 'boolean' || (typeof cell === 'number' && Number.isFinite(cell)))) fail(`${at}.values.${column.id}`, 'use a string, finite number, boolean or null');
      if (characters > 1000000) fail('rows', 'maximum 1,000,000 aggregate text characters'); values[column.id] = cell as GlassDataValue;
      if (typeof cell === 'string' && column.sortable && !column.compare) (sortText ??= Object.create(null) as Record<string, string>)[column.id] = fold(cell);
      if (column.searchable) search.push(cell === null ? '' : String(cell));
    }
    return { row: Object.freeze({ id: rowId, values: Object.freeze(values) }), index, search: fold(search.join(' ')), sortText };
  });
  const rows = Object.freeze(entries.map(entry => entry.row)), knownColumns = new Map(columns.map(column => [column.id, column]));
  function getView(initial: GlassDataViewOptions = {}): GlassDataView {
    const options = record(initial, ['sort', 'filter', 'page', 'pageSize'], 'view');
    const filter = fold(options.filter === undefined ? '' : text(options.filter, 256, 'view.filter', true));
    const numeric = (value: unknown, fallback: number, minimum: number, path: string) => { if (value === undefined) return fallback; if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) fail(path, 'use a bounded nonnegative integer'); return value; };
    const requestedPage = numeric(options.page, 0, 0, 'view.page'), pageSize = Math.min(200, numeric(options.pageSize, 20, 1, 'view.pageSize'));
    let sort: GlassDataSort | null = null;
    if (options.sort !== undefined && options.sort !== null) {
      const requested = record(options.sort, ['columnId', 'direction'], 'view.sort'), columnId = id(requested.columnId, 'view.sort.columnId');
      if (!knownColumns.get(columnId)?.sortable) fail('view.sort.columnId', 'choose a known sortable column');
      if (requested.direction !== 'ascending' && requested.direction !== 'descending') fail('view.sort.direction', 'use ascending or descending'); sort = Object.freeze({ columnId, direction: requested.direction });
    }
    const matching = filter ? entries.filter(entry => entry.search.includes(filter)) : [...entries];
    if (sort) {
      const column = knownColumns.get(sort.columnId)!, direction = sort.direction === 'ascending' ? 1 : -1;
      matching.sort((a, b) => {
        const left = a.row.values[column.id], right = b.row.values[column.id]; let compared: number;
        if (column.compare) { compared = column.compare(left, right); if (typeof compared !== 'number' || !Number.isFinite(compared)) fail('comparator', 'host comparator must return a finite number'); compared = Math.sign(compared) * direction; }
        else if (left === null || right === null) compared = left === right ? 0 : left === null ? 1 : -1;
        else compared = defaultCompare(a.sortText?.[column.id] ?? left, b.sortText?.[column.id] ?? right) * direction;
        return compared || a.index - b.index;
      });
    }
    const ordered = Object.freeze(matching.map(entry => entry.row)), filteredCount = ordered.length, pageCount = Math.ceil(filteredCount / pageSize), page = Math.min(requestedPage, Math.max(0, pageCount - 1)), start = page * pageSize;
    const view = Object.freeze({ caption, columns, rows: ordered, pageRows: Object.freeze(ordered.slice(start, start + pageSize)), sort, filter, totalCount: rows.length, filteredCount, page, pageSize, pageCount, range: Object.freeze({ start: filteredCount ? start + 1 : 0, end: Math.min(start + pageSize, filteredCount) }), canPrevious: page > 0, canNext: page + 1 < pageCount });
    views.set(view, knownColumns); return view;
  }
  return Object.freeze({ caption, columns, rows, getView });
}

/** Native table class only: render model.caption in an actual caption element. */
export function getGlassDataTableProps() { return Object.freeze({ className: 'lg-data-table' }); }
/** Native th props. Remove old aria-sort when this returned property is absent. */
export function getGlassDataTableHeaderProps(columnId: string, view: GlassDataView) {
  columnFor(columnId, view); return Object.freeze({ scope: 'col' as const, ...(view.sort?.columnId === columnId ? { 'aria-sort': view.sort.direction } : {}) });
}
/** Render a plain label for nonsortable columns. Keep decorative icons aria-hidden. */
export function getGlassDataTableSortButtonProps(columnId: string, view: GlassDataView) {
  const column = columnFor(columnId, view), next = view.sort?.columnId === columnId && view.sort.direction === 'ascending' ? 'descending' : 'ascending';
  return Object.freeze({ type: 'button' as const, className: 'lg-data-table-sort', disabled: !column.sortable, 'aria-label': `${column.label}: sort ${next}`, 'data-lg-sort-next': next });
}
