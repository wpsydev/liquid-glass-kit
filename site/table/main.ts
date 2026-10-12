import { createGlassDataTable, getGlassDataTableProps, getGlassDataTableHeaderProps, getGlassDataTableSortButtonProps } from '../../src/data-table.js';
import type { GlassDataRow, GlassDataColumn, GlassDataSort, GlassDataView } from '../../src/data-table.js';
import '../../src/material.css';
import '../../src/data-table.css';
import './style.css';

type Stage = 'Ready' | 'Review' | 'Hold';
type Preset = 'ties' | 'print' | 'page' | 'edit' | 'empty' | 'recovery';
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const query = get<HTMLInputElement>('query'), toolbar = get<HTMLFormElement>('search-form');
const editRow = get<HTMLSelectElement>('edit-row'), editStatus = get<HTMLSelectElement>('edit-status');
const pageSizeControl = get<HTMLSelectElement>('page-size'), solid = get<HTMLInputElement>('solid');
const stageRank: Record<Stage, number> = { Ready: 0, Review: 1, Hold: 2 };
const columns: GlassDataColumn[] = [
  { id: 'ref', label: 'Ref.', sortable: false }, { id: 'item', label: 'Object' }, { id: 'type', label: 'Category' },
  { id: 'stock', label: 'On hand' }, { id: 'stage', label: 'Stage', compare: (a, b) => stageRank[a as Stage] - stageRank[b as Stage] }, { id: 'owner', label: 'Owner' },
];
const fixtures: [string, string, number, Stage, string][] = [
  ['Field pad', 'Print', 4, 'Ready', 'Mira'], ['Ink proof', 'Print', 4, 'Review', 'Theo'], ['Ruler trace', 'Tool', 4, 'Hold', 'June'],
  ['Atlas sheet', 'Print', 12, 'Ready', 'June'], ['Colour cards', 'Sample', 8, 'Review', 'Mira'], ['Binding clips', 'Tool', 24, 'Ready', 'Theo'],
  ['Studio labels', 'Print', 18, 'Ready', 'Mira'], ['Margin study', 'Print', 9, 'Review', 'June'], ['Paper swatch', 'Sample', 16, 'Ready', 'Theo'],
  ['Letterpress test', 'Print', 7, 'Hold', 'Mira'], ['Cutting guide', 'Tool', 6, 'Ready', 'June'], ['Grid poster', 'Print', 11, 'Ready', 'Theo'],
  ['Thread sample', 'Sample', 8, 'Review', 'June'], ['Archive sleeve', 'Tool', 20, 'Ready', 'Mira'], ['Fold specimen', 'Print', 6, 'Hold', 'Theo'],
  ['Stencil set', 'Tool', 5, 'Ready', 'June'], ['Contrast proof', 'Print', 10, 'Review', 'Mira'], ['Texture study', 'Sample', 14, 'Ready', 'Theo'],
];
function initialRows(): GlassDataRow[] { return fixtures.map(([item, type, stock, stage, owner], index) => { const ref = `ST-${String(index + 1).padStart(3, '0')}`; return { id: ref, values: { ref, item, type, stock, stage, owner } }; }); }
let rows = initialRows(), model = createGlassDataTable({ caption: 'Original studio inventory · complete local dataset', columns, rows });
let sort: GlassDataSort | null = null, filter = '', page = 0, pageSize = 6, changes = 0, view: GlassDataView;
let touring = false, disposed = false, timers: number[] = [];
const status = (text: string) => { get('status').textContent = text; };
const heads = new Map<string, HTMLTableCellElement>(), sortButtons = new Map<string, HTMLButtonElement>();
for (const column of columns) {
  const th = document.createElement('th'); th.scope = 'col'; th.dataset.column = column.id;
  if (column.sortable !== false) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'lg-data-table-sort'; button.dataset.sort = column.id;
    const label = document.createElement('span'), arrow = document.createElement('span'); label.textContent = column.label; arrow.setAttribute('aria-hidden', 'true'); arrow.className = 'sort-arrow';
    button.append(label, arrow); th.append(button); sortButtons.set(column.id, button);
    button.addEventListener('click', () => { cancel(); sort = { columnId: column.id, direction: sort?.columnId === column.id && sort.direction === 'ascending' ? 'descending' : 'ascending' }; page = 0; render(); status(`Sorted the complete local dataset by ${column.label}, ${sort.direction}. Equal values retain original input order.`); });
  } else th.textContent = column.label;
  heads.set(column.id, th); get('headers').append(th);
}
get('inventory').className = getGlassDataTableProps().className;
for (const row of rows) { const option = document.createElement('option'); option.value = row.id; option.textContent = `${row.id} · ${row.values.item}`; editRow.append(option); }
function syncEditor() { const row = rows.find(row => row.id === editRow.value)!; editStatus.value = String(row.values.stage); }
function render() {
  view = model.getView({ sort, filter, page, pageSize }); page = view.page;
  for (const column of columns) {
    const th = heads.get(column.id)!, props = getGlassDataTableHeaderProps(column.id, view);
    th.scope = props.scope; th.removeAttribute('aria-sort'); if (props['aria-sort'] !== undefined) th.setAttribute('aria-sort', props['aria-sort']);
    const button = sortButtons.get(column.id); if (!button) continue;
    const buttonProps = getGlassDataTableSortButtonProps(column.id, view);
    button.setAttribute('aria-label', buttonProps['aria-label']); button.dataset.lgSortNext = buttonProps['data-lg-sort-next']; button.disabled = buttonProps.disabled;
    button.querySelector('.sort-arrow')!.textContent = sort?.columnId === column.id ? sort.direction === 'ascending' ? '↑' : '↓' : '↕';
  }
  const rendered = view.pageRows.map(row => {
    const tr = document.createElement('tr'); tr.dataset.rowId = row.id;
    for (const column of columns) {
      const td = document.createElement('td'); td.dataset.column = column.id;
      if (column.id === 'stage') { const badge = document.createElement('span'); badge.className = 'stage'; badge.dataset.stage = String(row.values.stage).toLowerCase(); badge.textContent = String(row.values.stage); td.append(badge); }
      else td.textContent = String(row.values[column.id] ?? 'Not provided'); tr.append(td);
    }
    return tr;
  });
  if (!rendered.length) {
    const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = columns.length; td.className = 'empty';
    const heading = document.createElement('strong'), text = document.createElement('p'), button = document.createElement('button');
    heading.textContent = 'Nothing in this view.'; text.textContent = `No local records match “${filter}”. The complete dataset still has ${view.totalCount} records.`;
    button.type = 'button'; button.textContent = 'Clear search'; button.id = 'empty-reset'; button.addEventListener('click', () => { cancel(); clearSearch(); query.focus({ preventScroll: true }); });
    td.append(heading, text, button); tr.append(td); rendered.push(tr);
  }
  get('rows').replaceChildren(...rendered);
  get('total-count').textContent = String(view.totalCount); get('filter-summary').textContent = filter.trim() ? `${view.filteredCount} matches / ${view.totalCount} records` : `All ${view.totalCount} records`;
  const sorted = sort && columns.find(column => column.id === sort!.columnId)!;
  get('sort-summary').textContent = sorted && sort ? `${sorted.label} · ${sort.direction}` : 'Original fixture order';
  get('range').textContent = `${view.range.start}–${view.range.end} of ${view.filteredCount} ${filter.trim() ? `matches · ${view.totalCount} local records` : 'local records'}`;
  get('page-count').textContent = view.pageCount ? `Page ${page + 1} of ${view.pageCount}` : '0 pages';
  get<HTMLButtonElement>('previous').disabled = !view.canPrevious; get<HTMLButtonElement>('next').disabled = !view.canNext;
  const ties = view.rows.filter(row => row.values.stock === 4).map(row => row.id);
  get('ties').textContent = ties.length ? ties.join(' → ') : 'No stock-04 records in this view';
  get('tie-title').textContent = sort?.columnId === 'stock' ? 'Stable ties, actual order.' : 'Current tie-group order.';
  get('tie-help').textContent = sort?.columnId === 'stock' ? 'Equal stock retains fixture order in ascending and descending sorts.' : 'Sort by On hand to observe stable ties in both directions.';
  query.value = filter; pageSizeControl.value = String(pageSize);
}
function setFilter(value: string) { filter = value; page = 0; render(); }
function clearSearch() { setFilter(''); status(`Search cleared. ${view.totalCount} real local records remain.`); }
function applyLocal(id: string, stage: Stage) {
  const current = rows.find(row => row.id === id)!;
  if (current.values.stage === stage) { get('edit-result').textContent = `${id} already has stage ${stage}. No local change was needed.`; status('The selected record already has that stage.'); return; }
  rows = rows.map(row => row.id === id ? { id: row.id, values: { ...row.values, stage } } : row);
  model = createGlassDataTable({ caption: model.caption, columns, rows }); changes++; render();
  get('edit-result').textContent = `${id}: ${current.values.stage} → ${stage}. Local model recreated; ${changes} ${changes === 1 ? 'change' : 'changes'}.`;
  status(`${id} changed locally from ${current.values.stage} to ${stage}. Counts and sorting reflect the complete recreated model; nothing was uploaded.`);
}
function cancel() { for (const timer of timers) clearTimeout(timer); timers = []; touring = false; get('tour').textContent = 'Play 10s tour'; }
function reset() {
  cancel(); rows = initialRows(); model = createGlassDataTable({ caption: model.caption, columns, rows }); sort = null; filter = ''; page = 0; pageSize = 6; changes = 0;
  editRow.value = rows[0].id; syncEditor(); solid.checked = false; toolbar.dataset.lgSolid = 'false'; render();
  get('edit-result').textContent = 'The immutable model is recreated only when these local rows change.'; status('Search, sort a column, page through records, or change a local stage.');
}
function applyPreset(name: Preset) {
  if (!['ties', 'print', 'page', 'edit', 'empty', 'recovery'].includes(name)) throw new TypeError('Unknown Index preset');
  if (name === 'ties') { sort = { columnId: 'stock', direction: 'ascending' }; filter = ''; page = 0; render(); status('On hand ascending. ST-001, ST-002 and ST-003 each have four; their original order is preserved.'); }
  else if (name === 'print') { setFilter('Print'); status(`${view.filteredCount} actual Print records match, out of ${view.totalCount} local records.`); }
  else if (name === 'page') { filter = 'Print'; page = 1; render(); status(`The next page shows the real range ${view.range.start}–${view.range.end}; no remote total is inferred.`); }
  else if (name === 'edit') { editRow.value = 'ST-008'; editStatus.value = 'Ready'; applyLocal(editRow.value, 'Ready'); }
  else if (name === 'empty') { setFilter('no matching specimen'); status('Zero matching records. The original 18 local records remain; clear the search to recover.'); }
  else clearSearch();
}
function preset(name: Preset) { cancel(); applyPreset(name); }
function tour() {
  reset(); touring = true; get('tour').textContent = 'Stop tour'; applyPreset('ties');
  for (const [time, name] of [[1800, 'print'], [3300, 'page'], [4900, 'edit'], [6300, 'empty'], [8000, 'recovery']] as const) timers.push(window.setTimeout(() => { if (!disposed && !document.hidden) applyPreset(name); else cancel(); }, time));
  timers.push(window.setTimeout(() => { cancel(); status('Tour complete. One local stage changed; all 18 records remain. No ongoing work or network requests.'); }, 10000));
}
toolbar.addEventListener('submit', event => { event.preventDefault(); cancel(); setFilter(query.value); });
query.addEventListener('input', () => { cancel(); setFilter(query.value); }); get('clear').addEventListener('click', () => { cancel(); clearSearch(); });
get('previous').addEventListener('click', () => { cancel(); if (view.canPrevious) { page--; render(); status(`Page ${page + 1} of ${view.pageCount}.`); } });
get('next').addEventListener('click', () => { cancel(); if (view.canNext) { page++; render(); status(`Page ${page + 1} of ${view.pageCount}.`); } });
pageSizeControl.addEventListener('change', () => { cancel(); pageSize = Number(pageSizeControl.value); page = 0; render(); status(`Showing up to ${pageSize} actual records per page.`); });
editRow.addEventListener('change', () => { cancel(); syncEditor(); }); editStatus.addEventListener('change', cancel);
get<HTMLFormElement>('edit-form').addEventListener('submit', event => { event.preventDefault(); cancel(); applyLocal(editRow.value, editStatus.value as Stage); });
solid.addEventListener('change', () => { toolbar.dataset.lgSolid = String(solid.checked); });
get('tour').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
get('table-frame').addEventListener('pointerdown', cancel, { passive: true }); get('table-frame').addEventListener('keydown', cancel);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
window.addEventListener('pagehide', () => { disposed = true; cancel(); }); window.addEventListener('pageshow', () => { disposed = false; });
syncEditor(); render();
declare global { interface Window { __tableDemo: { tour: typeof tour; reset: typeof reset; cancel: typeof cancel; preset: typeof preset; state: () => object } } }
window.__tableDemo = { tour, reset, cancel, preset, state: () => ({ total: view.totalCount, filtered: view.filteredCount, range: { ...view.range }, page: view.page, pages: view.pageCount, pageSize: view.pageSize, filter: view.filter, sort: view.sort, visibleIds: view.pageRows.map(row => row.id), orderedIds: view.rows.map(row => row.id), rows: rows.map(row => ({ id: row.id, values: { ...row.values } })), changes, touring, solid: solid.checked }) };
