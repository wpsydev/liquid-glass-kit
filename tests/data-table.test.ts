import { describe, expect, it, vi } from 'vitest';
import { createGlassDataTable, getGlassDataTableProps, getGlassDataTableHeaderProps, getGlassDataTableSortButtonProps } from '../src/data-table.js';
import type { GlassDataTableOptions, GlassDataView, GlassDataValue } from '../src/data-table.js';

function input(extra: Partial<GlassDataTableOptions> = {}): GlassDataTableOptions {
  return { caption: 'Original studio materials', columns: [{ id: 'name', label: 'Material' }, { id: 'stock', label: 'Stock' }, { id: 'private', label: 'Internal note', sortable: false, searchable: false }], rows: [{ id: 'oak', values: { name: 'Oak', stock: 12, private: 'restricted-keyword' } }, { id: 'ash', values: { name: 'Ash', stock: 4, private: '' } }, { id: 'elm', values: { name: 'Elm', stock: 4, private: null } }, { id: 'unknown', values: { name: 'Unknown', stock: null, private: false } }], ...extra };
}
const ids = (view: GlassDataView) => view.rows.map(row => row.id);
function cells(values: GlassDataValue[]) { return values.map((value, index) => ({ id: `r${index}`, values: { value } })); }
const column = { id: 'value', label: 'Value' };

describe('pure native data-table model', () => {
  it('copies canonical rows/columns and preserves source order without sort or fake totals', () => {
    const authored = input(), before = JSON.stringify(authored), model = createGlassDataTable(authored), view = model.getView(); expect(ids(view)).toEqual(['oak', 'ash', 'elm', 'unknown']); expect(view.totalCount).toBe(4); expect(view.filteredCount).toBe(4); expect(view.pageRows).toEqual(view.rows); expect(view.range).toEqual({ start: 1, end: 4 }); expect(view.sort).toBeNull(); expect(JSON.stringify(authored)).toBe(before); expect(model.rows[0]).not.toBe(authored.rows[0]); expect(model.columns[0]).toEqual({ id: 'name', label: 'Material', sortable: true, searchable: true });
  });
  it('returns independent frozen model snapshots while explicitly retaining only host comparator references', () => {
    const authored = input(), model = createGlassDataTable(authored), view = model.getView({ sort: { columnId: 'stock', direction: 'ascending' } });
    for (const value of [model, model.columns, model.columns[0], model.rows, model.rows[0], model.rows[0].values, view, view.rows, view.pageRows, view.range, view.sort]) expect(Object.isFrozen(value)).toBe(true);
    expect(Reflect.set(model.rows[0].values, 'name', 'Changed')).toBe(false); expect(Reflect.set(view.range, 'start', 99)).toBe(false); (authored.rows[0].values as Record<string, GlassDataValue>).name = 'Outside change'; expect(model.rows[0].values.name).toBe('Oak'); expect(model.getView({ filter: 'outside' }).filteredCount).toBe(0);
  });
  it('sorts stably in both directions and keeps nulls last without reversing equal rows', () => {
    const model = createGlassDataTable(input()); expect(ids(model.getView({ sort: { columnId: 'stock', direction: 'ascending' } }))).toEqual(['ash', 'elm', 'oak', 'unknown']); expect(ids(model.getView({ sort: { columnId: 'stock', direction: 'descending' } }))).toEqual(['oak', 'ash', 'elm', 'unknown']); expect(ids(model.getView())).toEqual(['oak', 'ash', 'elm', 'unknown']);
  });
  it('orders primitive types deterministically and avoids numeric subtraction overflow or locale dependence', () => {
    const model = createGlassDataTable({ caption: 'Primitive order', columns: [column], rows: cells([true, 'z', 1e308, null, false, 'A', -1e308, 0]) });
    expect(model.getView({ sort: { columnId: 'value', direction: 'ascending' } }).rows.map(row => row.values.value)).toEqual([-1e308, 0, 1e308, 'A', 'z', false, true, null]); expect(model.getView({ sort: { columnId: 'value', direction: 'descending' } }).rows.map(row => row.values.value)).toEqual([true, false, 'z', 'A', 1e308, 0, -1e308, null]);
  });
  it('uses collapsed whitespace/lowercase string ties with original order and no full Unicode-casefold claim', () => {
    const model = createGlassDataTable({ caption: 'String order', columns: [column], rows: cells([' Beta ', 'alpha', 'ALPHA', 'alpha\n ', 'straße']) }); expect(ids(model.getView({ sort: { columnId: 'value', direction: 'ascending' } }))).toEqual(['r1', 'r2', 'r3', 'r0', 'r4']); expect(model.getView({ filter: 'STRASSE' }).filteredCount).toBe(0); expect(model.getView({ filter: 'STRAßE' }).filteredCount).toBe(1);
  });
  it('calls an explicit host comparator only for requested sorting and permits its documented null ordering', () => {
    const compare = vi.fn((left: GlassDataValue, right: GlassDataValue) => left === null ? right === null ? 0 : -1 : right === null ? 1 : Number(left) - Number(right));
    const model = createGlassDataTable({ caption: 'Custom order', columns: [{ ...column, compare }], rows: cells([4, null, 2, 2]) }); model.getView(); model.getView({ filter: '2' }); expect(compare).not.toHaveBeenCalled(); expect(ids(model.getView({ sort: { columnId: 'value', direction: 'ascending' } }))).toEqual(['r1', 'r2', 'r3', 'r0']); expect(compare).toHaveBeenCalled(); expect(model.columns[0].compare).toBe(compare);
  });
  it('propagates the original host comparator error and rejects nonfinite/non-numeric comparator outcomes', () => {
    const error = new Error('Host comparison failed'), make = (compare: (a: GlassDataValue, b: GlassDataValue) => number) => createGlassDataTable({ caption: 'Comparison failure', columns: [{ ...column, compare }], rows: cells([1, 2]) });
    try { make(() => { throw error; }).getView({ sort: { columnId: 'value', direction: 'ascending' } }); throw new Error('Expected host error'); } catch (caught) { expect(caught).toBe(error); }
    for (const value of [NaN, Infinity, -Infinity, '1', null]) expect(() => make(() => value as number).getView({ sort: { columnId: 'value', direction: 'ascending' } })).toThrow('finite number');
  });
  it('filters actual cached searchable values, including booleans/numbers and across collapsed field spaces', () => {
    const model = createGlassDataTable(input()); expect(ids(model.getView({ filter: '  OAK\n12 ' }))).toEqual(['oak']); expect(ids(model.getView({ filter: '4' }))).toEqual(['ash', 'elm']); expect(model.getView({ filter: 'restricted-keyword' }).filteredCount).toBe(0); expect(model.getView({ filter: 'false' }).filteredCount).toBe(0); expect(model.getView({ filter: '  ' }).filteredCount).toBe(4);
    const booleans = createGlassDataTable({ caption: 'Boolean search', columns: [column], rows: cells([false, true, null]) }); expect(ids(booleans.getView({ filter: 'FALSE' }))).toEqual(['r0']); expect(booleans.getView({ filter: 'null' }).filteredCount).toBe(0);
  });
  it('performs filter then sort then pagination with honest full/filtered/range counts', () => {
    const model = createGlassDataTable({ caption: 'Pagination', columns: [column], rows: cells(['b match', 'outside', 'a match', 'c match']) }); const view = model.getView({ filter: 'MATCH', sort: { columnId: 'value', direction: 'ascending' }, pageSize: 2, page: 1 }); expect(ids(view)).toEqual(['r2', 'r0', 'r3']); expect(view.pageRows.map(row => row.id)).toEqual(['r3']); expect(view.totalCount).toBe(4); expect(view.filteredCount).toBe(3); expect(view.pageCount).toBe(2); expect(view.page).toBe(1); expect(view.range).toEqual({ start: 3, end: 3 }); expect(view.canPrevious).toBe(true); expect(view.canNext).toBe(false);
  });
  it('clamps stale large page requests and a large page size without overflowing arithmetic', () => {
    const model = createGlassDataTable(input()); const last = model.getView({ page: Number.MAX_SAFE_INTEGER, pageSize: 2 }); expect(last.page).toBe(1); expect(last.range).toEqual({ start: 3, end: 4 }); const large = model.getView({ pageSize: 9999 }); expect(large.pageSize).toBe(200); expect(large.pageCount).toBe(1); expect(large.canPrevious).toBe(false); expect(large.canNext).toBe(false);
  });
  it('reports empty datasets and empty filtered results as 0–0 with zero pages', () => {
    for (const model of [createGlassDataTable(input({ rows: [] })), createGlassDataTable(input())]) { const view = model.getView({ filter: 'no-match', page: 88 }); expect(view.rows).toEqual([]); expect(view.pageRows).toEqual([]); expect(view.range).toEqual({ start: 0, end: 0 }); expect(view.pageCount).toBe(0); expect(view.page).toBe(0); expect(view.canPrevious).toBe(false); expect(view.canNext).toBe(false); }
  });
  it('copies view state inputs and rejects invalid pagination/filter/sort rather than coercing them', () => {
    const model = createGlassDataTable(input()), options = { filter: 'oak', sort: { columnId: 'stock', direction: 'ascending' as const } }; const view = model.getView(options); options.filter = 'ash'; options.sort.columnId = 'name'; expect(view.filter).toBe('oak'); expect(view.sort?.columnId).toBe('stock');
    for (const options of [{ page: -1 }, { page: .5 }, { page: Infinity }, { page: '1' }, { pageSize: 0 }, { pageSize: -2 }, { pageSize: 2.5 }, { pageSize: NaN }, { filter: 'x'.repeat(257) }, { filter: true }, { sort: { columnId: 'missing', direction: 'ascending' } }, { sort: { columnId: 'private', direction: 'ascending' } }, { sort: { columnId: 'name', direction: 'sideways' } }, { totalCount: 999 }]) expect(() => model.getView(options as never)).toThrow(TypeError);
  });
  it('accepts only primitive finite cells without calling toString/valueOf/toJSON hooks', () => {
    let calls = 0; const object = { toString() { calls++; return 'secret'; }, valueOf() { calls++; return 1; }, toJSON() { calls++; return 1; } };
    for (const value of [object, undefined, NaN, Infinity, -Infinity, 1n, Symbol('x'), new Date(), [], () => 1]) expect(() => createGlassDataTable({ caption: 'Invalid cell', columns: [column], rows: [{ id: 'r', values: { value } }] } as never)).toThrow('finite number'); expect(calls).toBe(0);
  });
  it('requires stable unique bounded column and row identities plus exact authored cell keys', () => {
    for (const bad of [input({ columns: [{ id: 'name', label: 'A' }, { id: 'name', label: 'B' }] }), input({ rows: [input().rows[0], input().rows[0]] }), input({ rows: [{ id: '', values: { name: 'x', stock: 1, private: null } }] }), input({ rows: [{ id: 'x'.repeat(129), values: { name: 'x', stock: 1, private: null } }] }), input({ rows: [{ id: 'r', values: { name: 'x', stock: 1 } }] }), input({ rows: [{ id: 'r', values: { name: 'x', stock: 1, private: null, extra: 3 } }] })]) expect(() => createGlassDataTable(bad)).toThrow(TypeError);
    for (const id of ['__proto__', 'constructor', 'prototype', 'name.path', '../name', '1bad']) expect(() => createGlassDataTable({ caption: 'Unsafe column', columns: [{ id, label: 'Column' }], rows: [] })).toThrow('identifier');
  });
  it('validates captions, labels, boolean options and explicit comparator declarations', () => {
    for (const bad of [input({ caption: '' }), input({ caption: 'x'.repeat(241) }), input({ columns: [{ id: 'name', label: '' }] }), input({ columns: [{ id: 'name', label: 'x'.repeat(161) }] }), input({ columns: [{ id: 'name', label: 'Name', sortable: 'yes' as never }] }), input({ columns: [{ id: 'name', label: 'Name', searchable: 1 as never }] }), input({ columns: [{ id: 'name', label: 'Name', compare: 'a-b' as never }] }), input({ columns: [{ id: 'name', label: 'Name', sortable: false, compare: () => 0 }] })]) expect(() => createGlassDataTable(bad)).toThrow(TypeError);
  });
  it('bounds rows, columns, aggregate cells, cell strings and total authored text', () => {
    expect(() => createGlassDataTable(input({ columns: [] }))).toThrow('columns'); expect(() => createGlassDataTable(input({ columns: Array.from({ length: 33 }, (_, index) => ({ id: `c${index}`, label: 'Column' })) }))).toThrow('columns'); expect(() => createGlassDataTable({ caption: 'Rows', columns: [column], rows: cells(Array(5001).fill(1)) })).toThrow('rows');
    const columns = Array.from({ length: 32 }, (_, index) => ({ id: `c${index}`, label: 'Column' })); const values = Object.fromEntries(columns.map(column => [column.id, 1])); expect(() => createGlassDataTable({ caption: 'Cells', columns, rows: Array.from({ length: 3126 }, (_, index) => ({ id: `r${index}`, values })) })).toThrow('100,000 cells');
    expect(() => createGlassDataTable({ caption: 'Long text', columns: [column], rows: cells(['x'.repeat(2049)]) })).toThrow('2048'); expect(() => createGlassDataTable({ caption: 'Text budget', columns: [column], rows: cells(Array(489).fill('x'.repeat(2048))) })).toThrow('1,000,000'); expect(createGlassDataTable({ caption: 'Maximum cell', columns: [column], rows: cells(['x'.repeat(2048)]) }).rows).toHaveLength(1);
  });
  it('rejects prototypes, dangerous keys, symbols and accessor properties without evaluating getters', () => {
    let calls = 0; const getter = () => { calls++; return input().rows; }; const config = { ...input() }; Object.defineProperty(config, 'rows', { enumerable: true, get: getter }); expect(() => createGlassDataTable(config)).toThrow('accessors');
    const values = { name: 'x', stock: 1, private: null }; Object.defineProperty(values, 'stock', { enumerable: true, get: () => { calls++; return 1; } }); expect(() => createGlassDataTable(input({ rows: [{ id: 'r', values }] }))).toThrow('accessors');
    const dangerous = JSON.parse('{"id":"r","values":{"name":"x","stock":1,"private":null,"__proto__":{"polluted":true}}}'); expect(() => createGlassDataTable(input({ rows: [dangerous] }))).toThrow('unsupported'); const inherited = Object.create({ id: 'r', values: input().rows[0].values }); expect(() => createGlassDataTable(input({ rows: [inherited] }))).toThrow('ordinary');
    const symbol = { ...input(), [Symbol('extra')]: true }; expect(() => createGlassDataTable(symbol)).toThrow('unsupported'); expect(calls).toBe(0); expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
  it('rejects sparse/accessor/custom array slots without invoking array getters', () => {
    let calls = 0; const rows = [input().rows[0]]; Object.defineProperty(rows, '0', { enumerable: true, get() { calls++; return input().rows[0]; } }); expect(() => createGlassDataTable(input({ rows }))).toThrow('accessor'); expect(calls).toBe(0); expect(() => createGlassDataTable(input({ rows: Array(1) }))).toThrow('sparse'); const custom = [input().rows[0]]; Object.assign(custom, { extra: 1 }); expect(() => createGlassDataTable(input({ rows: custom }))).toThrow('custom');
  });
  it('does not invoke column or row-identity getters and keeps malformed-cell diagnostics free of cell contents', () => {
    let calls = 0;
    for (const key of ['id', 'label', 'compare']) { const declared = { ...column }; Object.defineProperty(declared, key, { enumerable: true, get() { calls++; return () => 0; } }); expect(() => createGlassDataTable({ caption: 'Column accessor', columns: [declared], rows: [] })).toThrow('accessors'); }
    const row = { id: 'r', values: { value: 1 } }; Object.defineProperty(row, 'id', { enumerable: true, get() { calls++; return 'r'; } }); expect(() => createGlassDataTable({ caption: 'Row accessor', columns: [column], rows: [row] })).toThrow('accessors'); expect(calls).toBe(0);
    try { createGlassDataTable({ caption: 'Sensitive data', columns: [column], rows: [{ id: 'r', values: { value: { private: 'do-not-print-this-cell' } } }] } as never); throw new Error('Expected failure'); } catch (error) { expect(String(error)).not.toContain('do-not-print-this-cell'); }
  });
  it('never reads view option accessors or foreign snapshot getters in semantic prop helpers', () => {
    let calls = 0; const options = {}; Object.defineProperty(options, 'filter', { enumerable: true, get() { calls++; return 'secret'; } }); const model = createGlassDataTable(input()); expect(() => model.getView(options)).toThrow('accessors'); const foreign = {}; Object.defineProperty(foreign, 'sort', { get() { calls++; return null; } }); expect(() => getGlassDataTableHeaderProps('name', foreign as GlassDataView)).toThrow('getView'); expect(() => getGlassDataTableSortButtonProps('name', foreign as GlassDataView)).toThrow('getView'); expect(calls).toBe(0);
  });
  it('reports semantic aria-sort only on the real active header and labels the actual next sort action', () => {
    const model = createGlassDataTable(input()), view = model.getView({ sort: { columnId: 'stock', direction: 'ascending' } }); expect(getGlassDataTableProps()).toEqual({ className: 'lg-data-table' }); expect(getGlassDataTableHeaderProps('stock', view)).toEqual({ scope: 'col', 'aria-sort': 'ascending' }); expect(getGlassDataTableHeaderProps('name', view)).toEqual({ scope: 'col' }); expect(getGlassDataTableSortButtonProps('stock', view)).toMatchObject({ type: 'button', disabled: false, 'aria-label': 'Stock: sort descending', 'data-lg-sort-next': 'descending' }); expect(getGlassDataTableSortButtonProps('name', view)).toMatchObject({ 'aria-label': 'Material: sort ascending' }); expect(getGlassDataTableSortButtonProps('private', view).disabled).toBe(true);
    const descending = model.getView({ sort: { columnId: 'stock', direction: 'descending' } }); expect(getGlassDataTableSortButtonProps('stock', descending)['data-lg-sort-next']).toBe('ascending'); expect(() => getGlassDataTableHeaderProps('missing', view)).toThrow('known column');
  });
  it('supports host-rendered native caption, column associations and escaped text without a grid role or event hijack', () => {
    const model = createGlassDataTable({ caption: 'Native local inventory', columns: [column], rows: cells(['<img onerror="bad()">']) }), view = model.getView(), table = document.createElement('table'); table.className = getGlassDataTableProps().className; const caption = table.createCaption(); caption.textContent = model.caption; const head = table.createTHead().insertRow(), th = document.createElement('th'); for (const [key, value] of Object.entries(getGlassDataTableHeaderProps('value', view))) th.setAttribute(key, value); head.append(th); const button = document.createElement('button'); button.type = getGlassDataTableSortButtonProps('value', view).type; button.textContent = model.columns[0].label; th.append(button); const td = table.createTBody().insertRow().insertCell(); td.textContent = String(view.pageRows[0].values.value);
    expect(table.caption?.textContent).toBe('Native local inventory'); expect(th.scope).toBe('col'); expect(table.getAttribute('role')).toBeNull(); expect(table.querySelector('img')).toBeNull(); expect(td.textContent).toContain('<img'); const key = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }); button.dispatchEvent(key); expect(key.defaultPrevented).toBe(false);
  });
  it('does no browser work and repeated views do not call comparators or schedule frames unless sorting requested', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), timers = vi.spyOn(window, 'setTimeout'), compare = vi.fn(() => 0); const model = createGlassDataTable({ caption: 'Pure model', columns: [{ ...column, compare }], rows: cells([1, 2]) }); for (let index = 0; index < 30; index++) model.getView({ filter: String(index), page: index }); expect(compare).not.toHaveBeenCalled(); expect(raf).not.toHaveBeenCalled(); expect(timers).not.toHaveBeenCalled(); raf.mockRestore(); timers.mockRestore();
  });
});
