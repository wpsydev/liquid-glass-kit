import { auditGlassLayout } from '../../src/layout-audit.js';
import type { GlassLayoutAuditReport, GlassLayoutAuditTarget, GlassLayoutAuditMeasurement } from '../../src/layout-audit.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Preset = 'cramped' | 'fixed' | 'edges' | 'truncated' | 'quiet';
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const root = query('#sample-root'), field = query<HTMLInputElement>('#note-field'), originalField = field;
const fixedField = query<HTMLInputElement>('#fixed'), edgesField = query<HTMLInputElement>('#edges');
const limitField = query<HTMLSelectElement>('#limit'), quietField = query<HTMLInputElement>('#quiet');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let fixed = false, edges = false, quiet = false, solid = false, limit = 64, revision = 0, reportRevision = -1;
let report: GlassLayoutAuditReport | null = null, calls = 0, lastCostMs: number | null = null, notes: { note: string; includeContext: boolean }[] = [];
let identity: { node: boolean; value: boolean; focus: boolean; caret: boolean } | null = null;
let status = 'Ready for explicit sampling', destroyed = false;
let tourEpoch = 0, tourTimers: number[] = [], tourResolve: ((complete: boolean) => void) | undefined, tourStep = '';
const format = (value: number) => value.toFixed(2).replace(/\.?0+$/, '');
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element;
};
function targets(): GlassLayoutAuditTarget[] {
  const result: GlassLayoutAuditTarget[] = [
    { id: 'review-note', element: field, kind: 'field' },
    { id: 'add-review', element: query('#fixture-action'), kind: 'control' },
    { id: 'checkbox-label', element: query('#review-checkbox'), hitArea: query('#review-label'), kind: 'control' },
    { id: 'reference-shelf', element: query('#reference-deck'), kind: 'container', allowHorizontalOverflow: true },
  ];
  if (edges) result.push(
    { id: 'closed-panel', element: query('#hidden-control'), kind: 'control' },
    { id: 'clipped-action', element: query('#clipped-control'), kind: 'control' },
    { id: 'below-viewport', element: query('#offscreen-control'), kind: 'control' },
    { id: 'untyped-field', element: query('#unsupported-field'), kind: 'field' },
  );
  return result;
}
function material() {
  const props = getGlassProps({ appearance: 'dark', radius: 10, blur: 12, corner: 'continuous', reducedTransparency: solid });
  const toolbar = query('#audit-toolbar'); toolbar.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) toolbar.style.setProperty(key, String(value));
  for (const [key, value] of Object.entries(props)) if (key.startsWith('data-')) toolbar.setAttribute(key, String(value));
  toolbar.style.setProperty('--lg-fill-rgb', '43 61 69'); toolbar.style.setProperty('--lg-solid-fill', '#2b3d45'); toolbar.style.setProperty('--lg-ink', '#e8efed');
  query('#solid').setAttribute('aria-pressed', String(solid));
}
function measurement(item: GlassLayoutAuditMeasurement) {
  const row = node('article', '', 'measurement'), top = node('div');
  const advisory = report?.advisories.some(finding => finding.scope === 'target' && finding.id === item.id);
  const state = item.status === 'skipped' ? 'skipped' : advisory ? 'advisory' : item.sizeCheck === 'unknown' ? 'unknown' : 'measured';
  row.dataset.state = state;
  const heading = node('h3', item.id);
  const label = item.reason ? item.reason.replaceAll('-', ' ') : item.overflow?.check === 'exempt' ? 'declared scroll' : item.viewportOffscreen ? 'offscreen geometry' : state === 'advisory' ? 'advisory' : 'measured / scoped';
  top.append(heading, node('span', label)); row.append(top);
  const text = item.rect ? format(item.rect.width) + ' × ' + format(item.rect.height) + ' px' : 'No eligible visible geometry';
  const font = item.fontSize === null ? '' : ' · font ' + format(item.fontSize) + ' px';
  const overflow = item.overflow ? ' · overflow ' + format(item.overflow.excess) + ' px / ' + item.overflow.check : '';
  row.append(node('p', text + font + overflow));
  if (item.suppliedHitArea) row.append(node('p', 'Host-supplied label box; native association is a separate check.'));
  if (item.reason) row.append(node('p', 'Skipped / unknown policy checks. This is not a clean result.'));
  return row;
}
function render() {
  if (destroyed) return;
  document.body.dataset.quiet = String(quiet || motion.matches);
  fixedField.checked = fixed; edgesField.checked = edges; limitField.value = String(limit); quietField.checked = quiet;
  query('#layout-label').textContent = fixed ? 'Host-fixed / explicit CSS' : 'Cramped fixture';
  query('#viewport-label').textContent = window.innerWidth + ' × ' + window.innerHeight + ' CSS px';
  query('#advisory-count').textContent = report ? String(report.counts.advisories) : '—';
  query('#read-count').textContent = report ? String(report.reads.total) : '—';
  const stale = Boolean(report && reportRevision !== revision), freshness = query('#freshness');
  freshness.dataset.stale = String(stale); freshness.textContent = report ? stale ? 'Stale / rerun explicitly' : 'Current declared scope' : 'Not measured';
  query('#report-note').textContent = report ? report.incomplete
    ? 'Incomplete configured review. Skipped or unvisited targets remain unknown, even if other border boxes meet policy.'
    : 'Configured geometry sampled. This does not establish accessibility, keyboard behavior or physical-phone readiness.'
    : 'No automatic audit. Explicitly inspect the current declared scope.';
  query('#scope-counts').textContent = report ? report.counts.checked + ' / ' + report.counts.skipped + ' / ' + report.counts.unvisited : '—';
  query('#read-breakdown').textContent = report ? report.reads.rects + ' / ' + report.reads.styles + ' / ' + report.reads.dimensions : '—';
  query('#overflow-readback').textContent = report ? (report.viewport.overflow ? format(report.viewport.overflow.excess) + ' px' : 'unknown') + ' / ' + (report.root.overflow ? format(report.root.overflow.excess) + ' px' : 'unknown') : '—';
  query('#incomplete-readback').textContent = report ? String(report.truncated) + ' / ' + String(report.incomplete) : '—';
  query('#identity-readback').textContent = identity ? [identity.node, identity.value, identity.focus, identity.caret].map(value => value ? 'same' : 'changed').join(' / ') : 'Not sampled';
  query('#revision-readback').textContent = revision + ' / ' + (reportRevision < 0 ? '—' : reportRevision);
  query('#audit-calls').textContent = String(calls);
  query('#audit-status').textContent = status;
  query('#tour-status').textContent = tourStep || 'No automatic sampling';
  if (report) query('#measurement-list').replaceChildren(...report.targets.slice(0, 8).map(measurement));
  else query('#measurement-list').replaceChildren(node('p', 'Your first measurement will appear here.', 'empty-report'));
  query('#review-count').textContent = notes.length + (notes.length === 1 ? ' note' : ' notes');
  query('#review-list').replaceChildren(...(notes.length ? notes.map((entry, index) => node('li', String(index + 1).padStart(2, '0') + ' / ' + entry.note + (entry.includeContext ? ' · context included' : ''))) : [node('li', 'No note added yet.')]));
  query<HTMLButtonElement>('#fixture-action').disabled = notes.length >= 12;
}
function changed(message: string) { revision++; status = message; render(); }
function configure(next: { fixed?: boolean; edges?: boolean; limit?: number; quiet?: boolean; solid?: boolean }) {
  if (destroyed || !next || typeof next !== 'object' || Object.keys(next).some(key => !['fixed', 'edges', 'limit', 'quiet', 'solid'].includes(key))) return false;
  if (['fixed', 'edges', 'quiet', 'solid'].some(key => next[key as keyof typeof next] !== undefined && typeof next[key as keyof typeof next] !== 'boolean')
    || next.limit !== undefined && ![2, 64].includes(next.limit)) return false;
  fixed = next.fixed ?? fixed; edges = next.edges ?? edges; limit = next.limit ?? limit; quiet = next.quiet ?? quiet; solid = next.solid ?? solid;
  root.dataset.layout = fixed ? 'fixed' : 'cramped'; query('#edge-fixtures').hidden = !edges;
  material(); changed('Host state changed. The existing report stays labeled stale until an explicit audit.'); return true;
}
function audit(): GlassLayoutAuditReport | null {
  if (destroyed) return null;
  const before = { node: field, value: field.value, focus: document.activeElement, start: field.selectionStart, end: field.selectionEnd };
  const start = performance.now();
  try { report = auditGlassLayout(root, { targets: targets(), limit, maxReads: 512 }); }
  catch { status = 'Sampling unavailable. No repair or source change was performed.'; render(); return null; }
  lastCostMs = performance.now() - start; calls++; reportRevision = revision;
  render();
  identity = {
    node: before.node === originalField && query('#note-field') === originalField,
    value: before.value === field.value, focus: before.focus === document.activeElement,
    caret: before.start === field.selectionStart && before.end === field.selectionEnd,
  };
  status = report.counts.advisories + ' configured advisories; ' + report.counts.skipped + ' skipped; ' + report.counts.unvisited + ' unvisited. Synchronous sampling only.';
  render(); return report;
}
function cancelTour() {
  tourEpoch++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = [];
  const finish = tourResolve; tourResolve = undefined; tourStep = ''; finish?.(false); render();
}
function reset() {
  if (destroyed) return;
  cancelTour(); fixed = edges = quiet = solid = false; limit = 64; revision = 0; reportRevision = -1;
  report = null; calls = 0; lastCostMs = null; identity = null; notes = [];
  field.value = 'Make the setup screen easier to read'; query<HTMLInputElement>('#review-checkbox').checked = true;
  root.dataset.layout = 'cramped'; query('#edge-fixtures').hidden = true;
  status = 'Ready for explicit sampling'; query('#review-status').textContent = 'The native form stores local notes only. No server or source file is changed.';
  material(); render();
}
function preset(value: Preset): boolean {
  if (destroyed || !['cramped', 'fixed', 'edges', 'truncated', 'quiet'].includes(value)) return false;
  cancelTour();
  configure({
    fixed: value !== 'cramped', edges: value === 'edges' || value === 'truncated',
    limit: value === 'truncated' ? 2 : 64, quiet: value === 'quiet', solid: value === 'quiet',
  });
  audit(); return true;
}
function tour(): Promise<boolean> {
  if (destroyed) return Promise.resolve(false);
  reset(); const epoch = ++tourEpoch;
  field.focus({ preventScroll: true }); field.setSelectionRange(5, 15);
  audit(); tourStep = '01 / real cramped geometry'; render();
  return new Promise(resolve => {
    tourResolve = resolve;
    const at = (delay: number, action: () => void) => {
      const timer = window.setTimeout(() => {
        tourTimers = tourTimers.filter(value => value !== timer);
        if (!destroyed && epoch === tourEpoch) action();
      }, delay); tourTimers.push(timer);
    };
    at(1800, () => { configure({ fixed: true }); audit(); tourStep = '02 / explicit host CSS fix, same native draft'; render(); });
    at(3600, () => { configure({ edges: true }); audit(); tourStep = '03 / hidden, clipped and offscreen stay distinct'; render(); });
    at(5400, () => { configure({ limit: 2 }); audit(); tourStep = '04 / bounded scope, honest truncation'; render(); });
    at(6900, () => { configure({ edges: false, limit: 64, solid: true }); audit(); tourStep = '05 / declared shelf scrolling is intentional'; render(); });
    at(8400, () => { configure({ quiet: true }); audit(); tourStep = '06 / quiet, scoped measurements, preserved editing'; render(); });
    at(10500, () => { tourStep = ''; tourResolve = undefined; render(); resolve(true); });
  });
}
material(); render();
query('#audit').addEventListener('click', () => { cancelTour(); audit(); });
fixedField.addEventListener('change', () => { const value = fixedField.checked; cancelTour(); configure({ fixed: value }); });
edgesField.addEventListener('change', () => { const value = edgesField.checked; cancelTour(); configure({ edges: value }); });
limitField.addEventListener('change', () => { const value = Number(limitField.value); cancelTour(); configure({ limit: value }); });
quietField.addEventListener('change', () => { const value = quietField.checked; cancelTour(); configure({ quiet: value }); });
query('#solid').addEventListener('click', () => { cancelTour(); configure({ solid: !solid }); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.addEventListener('click', () => { preset(button.dataset.preset as Preset); });
query('#reset').addEventListener('click', reset); query('#tour').addEventListener('click', () => { void tour(); });
field.addEventListener('input', () => { cancelTour(); changed('Native draft edited. Rerun sampling when you want a current-view report.'); });
query<HTMLInputElement>('#review-checkbox').addEventListener('change', () => { cancelTour(); changed('Native checkbox changed. Its supplied label is a declared hit-area measurement.'); });
query<HTMLFormElement>('#review-form').addEventListener('submit', event => {
  event.preventDefault(); if (destroyed) return; cancelTour();
  const form = event.currentTarget as HTMLFormElement, data = new FormData(form, (event as SubmitEvent).submitter);
  const note = String(data.get('note') ?? '');
  if (notes.length >= 12 || note.length < 3 || note.length > 80) return;
  notes.push({ note, includeContext: data.has('includeContext') });
  query('#review-status').textContent = 'A real local note was added. No backend, repository or source file was changed.';
  changed('Local review updated. The audit report remains a separate explicit snapshot.');
});
query('#offscreen-control').addEventListener('click', () => { cancelTour(); field.focus({ preventScroll: false }); });
const resized = () => { cancelTour(); changed('Viewport changed. No automatic sampling; explicitly rerun to measure this layout.'); };
const motionChanged = () => render();
const interaction = (event: Event) => { if (event.isTrusted && tourResolve) cancelTour(); };
window.addEventListener('resize', resized); motion.addEventListener('change', motionChanged);
document.addEventListener('pointerdown', interaction); document.addEventListener('keydown', interaction);
const state = () => ({
  fixed, edges, quiet, systemReduced: motion.matches, solid, limit, revision, reportRevision,
  stale: Boolean(report && reportRevision !== revision), report, calls, lastSynchronousAuditMs: lastCostMs,
  field: { nodePreserved: query('#note-field') === originalField, value: field.value, selectionStart: field.selectionStart, selectionEnd: field.selectionEnd, focused: document.activeElement === field },
  identity: identity && { ...identity }, notes: notes.map(entry => ({ ...entry })),
  viewport: { width: window.innerWidth, height: window.innerHeight },
  tourStep, pendingTourSteps: tourTimers.length, focus: document.activeElement?.id || document.activeElement?.tagName || null,
});
const demo = {
  preset, reset, tour, cancel: cancelTour, state,
  audit() { cancelTour(); return audit(); },
  configure(options: Parameters<typeof configure>[0]) { cancelTour(); return configure(options); },
};
(window as Window & { __fitCheckDemo?: typeof demo }).__fitCheckDemo = demo;
window.addEventListener('pagehide', () => {
  cancelTour(); destroyed = true; window.removeEventListener('resize', resized); motion.removeEventListener('change', motionChanged);
  document.removeEventListener('pointerdown', interaction); document.removeEventListener('keydown', interaction);
}, { once: true });
