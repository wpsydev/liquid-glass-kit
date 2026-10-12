import { createGlassRegistryItem, validateGlassRegistryItem } from '../../src/registry.js';
import type { GlassRegistryItem, GlassRegistryItemInput, GlassRegistryPolicy, GlassRegistryType } from '../../src/registry.js';
import './style.css';

type Preset = 'surface' | 'continuity' | 'boundary';
type ResultView = 'manifest' | 'json';
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => get<HTMLInputElement>(id);
const prefix = '@wpsydev/liquid-glass/';
// A declared repository-source snapshot. This list never performs a registry or
// package query, and deliberately excludes unfinished optional modules.
const exportsSnapshot = ['material.css', 'material', 'view-transition', 'view-transition.css'] as const;
const exportControls = Array.from(document.querySelectorAll<HTMLInputElement>('[data-export]'));
const presetControls = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-preset]'));
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const encoder = new TextEncoder();
const license = `MIT License
Copyright (c) 2026 wpsydev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
const surface = `.artifact-surface.lg-glass {
  --lg-radius: 22px;
  --lg-blur: 12px;
  --lg-fill-rgb: 255 254 245;
  --lg-fill-alpha: .76;
  --lg-solid-fill: #fffef5;
  --lg-ink: #24251f;
  padding: 20px;
}

/* Pair with your separately reviewed material.css source.
   Native content, contrast and focus remain host responsibilities. */`;
const continuity = `import { runGlassViewTransition }
  from '@wpsydev/liquid-glass/view-transition';

export function commitArtifactView(
  commit: () => void | Promise<void>,
  reducedMotion = false,
) {
  const transition = runGlassViewTransition(commit, {
    duration: 220,
    reducedMotion,
  });
  return transition.finished;
}

// Supply reviewed library source and view-transition.css separately.
// The host owns navigation, meaningful state and focus.`;
const seeds: Record<Preset, { name: string; title: string; type: GlassRegistryType; path: string; target: string; source: string; entry: typeof exportsSnapshot[number]; badge: string }> = {
  surface: { name: 'artifact-surface', title: 'Artifact surface', type: 'registry:style', path: 'registry/artifacts/surface.css', target: 'components/liquid-glass/surface.css', source: surface, entry: 'material.css', badge: 'CSS' },
  continuity: { name: 'artifact-continuity', title: 'Artifact continuity', type: 'registry:lib', path: 'registry/artifacts/continuity.ts', target: 'components/liquid-glass/continuity.ts', source: continuity, entry: 'view-transition', badge: 'TS' },
  boundary: { name: 'artifact-boundary', title: 'Artifact boundary test', type: 'registry:style', path: 'registry/artifacts/surface.css', target: 'components/liquid-glass/../surface.css', source: surface, entry: 'material.css', badge: 'CSS' },
};
let selected: Preset = 'surface', resultView: ResultView = 'manifest', item: GlassRegistryItem | null = null;
let issue: { path: string; message: string } | null = null, previousValid: boolean | undefined;
let touring = false, timers: number[] = [], pulseTimer = 0, downloads = 0;
const blobUrls = new Map<string, number>();
const quiet = () => motion.matches || field('quiet').checked;
const bytes = (value: string) => encoder.encode(value).byteLength;
const formatBytes = (value: number) => value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value} B`;
function policy(): GlassRegistryPolicy {
  return { targetRoots: [field('target-root').value], availableExports: exportControls.filter(control => control.checked).map(control => prefix + control.dataset.export!) };
}
function input(): GlassRegistryItemInput {
  const seed = seeds[selected], metadata = field('include-metadata').checked;
  return {
    name: field('item-name').value, title: field('item-title').value, type: seed.type, author: 'wpsydev',
    description: 'Original local Artifact Desk recipe. Review the file and supply referenced library source separately.',
    files: [{ path: field('file-path').value, target: field('file-target').value, type: seed.type, content: get<HTMLTextAreaElement>('source').value }],
    docs: 'This is an authored-file registry subset, not an installed project. Library source and CSS references must be supplied separately from a verified source. No package install, source execution, marketplace listing or code audit is performed by this export.',
    categories: ['original', 'liquid-glass'],
    meta: { license: 'MIT', seedOwnership: 'Original wpsydev demo seed. Edited source remains the editor’s responsibility.', ...(metadata ? { glass: { version: field('source-version').value, imports: [prefix + get<HTMLSelectElement>('referenced-export').value], provenance: 'repository-release' } } : {}) },
  };
}
function status(value: string) { get('status').textContent = value; }
function validate(announce = false) {
  const authored = input(), declared = policy(), candidate = { $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...authored };
  const checked = validateGlassRegistryItem(candidate, declared);
  item = null; issue = checked.valid ? null : { ...checked.issues[0] };
  if (checked.valid) {
    // Authoring and validation are separate API paths. Download later rechecks
    // the actual serialized bytes, rather than trusting a stale UI stamp.
    try { item = createGlassRegistryItem(authored, declared); } catch { issue = { path: 'item', message: 'Authoring failed. Review the current fields.' }; }
  }
  const valid = item !== null;
  get('validation').dataset.valid = String(valid); get('validation-symbol').textContent = valid ? '✓' : '!'; get('validation-label').textContent = valid ? 'VALID' : 'REJECTED';
  get('validation-title').textContent = valid ? 'Within your declared boundaries' : 'One boundary needs attention';
  get('validation-note').textContent = valid ? 'Local subset validation. No installation is performed.' : `${issue?.path}: ${issue?.message}`;
  const isTargetIssue = Boolean(issue?.path.includes('files[0].target'));
  get<HTMLButtonElement>('repair').hidden = !isTargetIssue;
  for (const [id, path] of [['item-name', 'item.name'], ['item-title', 'item.title'], ['file-path', 'item.files[0].path'], ['file-target', 'item.files[0].target'], ['source', 'item.files[0].content'], ['target-root', 'policy.targetRoots'], ['source-version', 'item.meta.glass.version']] as const) get(id).setAttribute('aria-invalid', String(Boolean(issue?.path.startsWith(path))));
  get('referenced-export').setAttribute('aria-invalid', String(issue?.path === 'item.meta.glass.imports'));
  get<HTMLButtonElement>('download').disabled = !valid; get('export-note').textContent = valid ? 'READY FOR LOCAL JSON REVIEW' : 'EXPORT BLOCKED / FIX THE DECLARATION';
  const output = JSON.stringify(item ?? candidate, null, 2); get('json-output').textContent = output; get('json-count').textContent = formatBytes(bytes(output)); get('source-count').textContent = formatBytes(bytes(authored.files[0].content));
  get('manifest-name').textContent = authored.files[0].path.split('/').at(-1) || 'Untitled file'; get('manifest-target').textContent = authored.files[0].target || 'No destination';
  get('dependencies').textContent = String((authored.dependencies?.length ?? 0) + (authored.devDependencies?.length ?? 0));
  get('import-reference').textContent = field('include-metadata').checked ? get<HTMLSelectElement>('referenced-export').value : 'Not declared';
  get('policy-summary').textContent = `1 root · ${declared.availableExports?.length ?? 0} declared exports`;
  if (announce || valid !== previousValid) status(valid ? 'Current item passes local subset validation' : `${issue?.path}: ${issue?.message}`); previousValid = valid;
}
function setView(next: ResultView) {
  if (next !== 'manifest' && next !== 'json') return; resultView = next; get('manifest').hidden = next !== 'manifest'; get('json-panel').hidden = next !== 'json'; get('manifest-view').setAttribute('aria-pressed', String(next === 'manifest')); get('json-view').setAttribute('aria-pressed', String(next === 'json'));
}
function pulse() {
  window.clearTimeout(pulseTimer); get('artifact-visual').classList.remove('pulse'); if (quiet()) return;
  // Separate state-boundary task, not an animation or geometry polling loop.
  pulseTimer = window.setTimeout(() => { get('artifact-visual').classList.add('pulse'); pulseTimer = window.setTimeout(() => get('artifact-visual').classList.remove('pulse'), 300); }, 0);
}
function preset(next: Preset) {
  if (!Object.hasOwn(seeds, next)) return; selected = next; const seed = seeds[next];
  field('item-name').value = seed.name; field('item-title').value = seed.title; field('file-path').value = seed.path; field('file-target').value = seed.target;
  get<HTMLTextAreaElement>('source').value = `${seed.source}\n\n/*\n${license}\n*/\n`; get<HTMLTextAreaElement>('source').scrollTop = 0;
  get<HTMLSelectElement>('referenced-export').value = seed.entry; get('language').textContent = get('file-badge').textContent = seed.badge;
  get('artifact-visual').dataset.kind = next; document.querySelector('.specimen-glyph')!.textContent = next === 'continuity' ? 'v.' : next === 'boundary' ? '?' : 'a.';
  presetControls.forEach(control => control.setAttribute('aria-pressed', String(control.dataset.preset === next))); validate(); pulse();
}
function repair() {
  const basename = seeds[selected].type === 'registry:lib' ? 'continuity.ts' : 'surface.css'; field('file-target').value = `${field('target-root').value}/${basename}`; validate(true); pulse();
}
function download(): boolean {
  validate(); if (!item) { status('Download blocked until the current item passes'); return false; }
  const output = JSON.stringify(item, null, 2) + '\n'; const checked = validateGlassRegistryItem(JSON.parse(output) as unknown, policy());
  if (!checked.valid) { status('Serialized JSON failed validation. No download was created'); return false; }
  let url: string | null = null;
  try {
    url = URL.createObjectURL(new Blob([output], { type: 'application/json;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${checked.item.name}.registry.json`; anchor.hidden = true; document.body.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
    const owned = url; blobUrls.set(owned, window.setTimeout(() => { URL.revokeObjectURL(owned); blobUrls.delete(owned); }, 1000)); downloads++; status('Validated JSON handed to your browser for download'); return true;
  } catch { if (url) URL.revokeObjectURL(url); status('This browser could not create a local download'); return false; }
}
function cancel() { timers.forEach(window.clearTimeout); timers = []; touring = false; get('play').textContent = 'Play 10s tour'; }
function setQuiet(value: boolean) { field('quiet').checked = value; document.documentElement.classList.toggle('quiet', quiet()); if (quiet()) { window.clearTimeout(pulseTimer); get('artifact-visual').classList.remove('pulse'); } }
function reset() {
  cancel(); window.clearTimeout(pulseTimer); downloads = 0; field('target-root').value = 'components/liquid-glass'; field('source-version').value = '0.25.0-preview.1'; field('include-metadata').checked = true; exportControls.forEach(control => { control.checked = true; }); field('solid').checked = false; document.documentElement.classList.remove('solid'); setQuiet(false); get<HTMLDetailsElement>('policy').open = false; setView('manifest'); previousValid = undefined; preset('surface'); status('Everything stays in this page');
}
function tour() {
  reset(); touring = true; get('play').textContent = 'Stop tour';
  const steps: [number, () => void][] = [[300, () => preset('surface')], [2200, () => preset('continuity')], [4300, () => setView('json')], [6100, () => { setView('manifest'); preset('boundary'); }], [8200, repair], [10000, cancel]];
  timers = steps.map(([delay, action]) => window.setTimeout(action, delay));
}
presetControls.forEach(control => control.addEventListener('click', () => { cancel(); setView('manifest'); preset(control.dataset.preset as Preset); }));
get<HTMLFormElement>('author-form').addEventListener('submit', event => { event.preventDefault(); cancel(); validate(true); });
for (const id of ['item-name', 'item-title', 'file-path', 'file-target', 'source', 'target-root', 'source-version']) get(id).addEventListener('input', () => { cancel(); validate(); });
for (const control of [...exportControls, field('include-metadata'), get<HTMLSelectElement>('referenced-export')]) control.addEventListener('change', () => { cancel(); validate(true); });
get('manifest-view').addEventListener('click', () => { cancel(); setView('manifest'); }); get('json-view').addEventListener('click', () => { cancel(); setView('json'); }); get('repair').addEventListener('click', () => { cancel(); repair(); }); get('download').addEventListener('click', () => { cancel(); download(); });
get('play').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset); field('quiet').addEventListener('change', () => { cancel(); setQuiet(field('quiet').checked); }); field('solid').addEventListener('change', () => document.documentElement.classList.toggle('solid', field('solid').checked));
const preference = () => setQuiet(field('quiet').checked); motion.addEventListener('change', preference);
window.addEventListener('pagehide', event => { cancel(); window.clearTimeout(pulseTimer); for (const [url, timer] of blobUrls) { window.clearTimeout(timer); URL.revokeObjectURL(url); } blobUrls.clear(); if (!event.persisted) motion.removeEventListener('change', preference); });
declare global { interface Window { __registryDemo: { reset(): void; preset(value: Preset): void; setView(value: ResultView): void; repair(): void; validate(): void; download(): boolean; tour(): void; cancel(): void; state(): { preset: Preset; view: ResultView; valid: boolean; issue: { path: string; message: string } | null; files: number; sourceBytes: number; payloadBytes: number; target: string; targetRoot: string; declaredExports: string[]; referencedExport: string | null; versionDeclaration: string; quiet: boolean; touring: boolean; downloadsRequested: number } } } }
window.__registryDemo = { reset, preset, setView, repair, validate: () => validate(true), download, tour, cancel, state: () => ({ preset: selected, view: resultView, valid: item !== null, issue: issue ? { ...issue } : null, files: item?.files.length ?? 0, sourceBytes: bytes(get<HTMLTextAreaElement>('source').value), payloadBytes: item ? bytes(JSON.stringify(item, null, 2) + '\n') : 0, target: field('file-target').value, targetRoot: field('target-root').value, declaredExports: [...policy().availableExports!], referencedExport: field('include-metadata').checked ? prefix + get<HTMLSelectElement>('referenced-export').value : null, versionDeclaration: field('source-version').value, quiet: quiet(), touring, downloadsRequested: downloads }) };
reset();
