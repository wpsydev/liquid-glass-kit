import { nameGlassView, runGlassViewTransition } from '../../src/view-transition.js';
import type { GlassViewTransitionHandle, GlassViewTransitionResult } from '../../src/view-transition.js';
import '../../src/view-transition.css';
import '../../src/material.css';
import './style.css';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = get('stage');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const studies = [
  { title: 'Orbital balance', kind: 'LIGHT / VOLUME', color: 'blue', description: 'A suspended ring, a pale sphere and the space between them. An original composition about balance, weight and a little room to breathe.', note: 'Porcelain / electric blue', number: '01' },
  { title: 'A softer monument', kind: 'MATTER / SHADOW', color: 'stone', description: 'Three stepped planes build a small, impossible monument. Warm stone and a sharp vermilion edge turn a simple block into an object worth looking at twice.', note: 'Limestone / vermilion', number: '02' },
  { title: 'Folded daylight', kind: 'RHYTHM / SURFACE', color: 'ink', description: 'A single line becomes a folded surface. Four overlapping ribbons catch the light, offering a quiet study in movement without anything running in the background.', note: 'Ink / acid green', number: '03' },
] as const;
let selected: number | null = null, returnIndex = 0, layout: 'grid' | 'list' = 'grid', openProfile = false, saved = new Set<number>();
let updates = 0, nativeCalls = 0, last: GlassViewTransitionResult | null = null, generation = 0, resetEpoch = 0;
let active: GlassViewTransitionHandle | null = null;
let names: ReturnType<typeof nameGlassView>[] = [];
let timers: number[] = [], touring = false;
const profileName = nameGlassView(get('profile'), 'archive-profile');
const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string) => { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; };
const svgNode = (tag: string, attrs: Record<string, string | number>) => { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); return node; };
function art(index: number) {
  const surface = element('div', `art-surface ${studies[index].color}`);
  const svg = svgNode('svg', { viewBox: '0 0 400 400', role: 'img', 'aria-label': `Original geometric sculpture: ${studies[index].title}` });
  const add = (tag: string, attrs: Record<string, string | number>) => svg.append(svgNode(tag, attrs));
  if (index === 0) {
    add('ellipse', { cx: 203, cy: 332, rx: 93, ry: 14, fill: '#0c1b8d', opacity: .26 });
    add('path', { d: 'M132 296 203 255 272 296 202 337Z', fill: '#dce2ff' });
    add('path', { d: 'M132 296V314L202 355V337Z', fill: '#9badf3' });
    add('path', { d: 'M202 337 272 296V314L202 355Z', fill: '#b7c4ff' });
    add('ellipse', { cx: 205, cy: 178, rx: 99, ry: 132, transform: 'rotate(-24 205 178)', fill: 'none', stroke: '#b8c8ff', 'stroke-width': 24 });
    add('ellipse', { cx: 205, cy: 178, rx: 99, ry: 132, transform: 'rotate(-24 205 178)', fill: 'none', stroke: '#e4eaff', 'stroke-width': 3 });
    add('circle', { cx: 193, cy: 205, r: 56, fill: '#f2f4ff' });
    add('path', { d: 'M153 245A56 56 0 0 0 248 213A56 56 0 0 1 153 245', fill: '#cad3f6' });
    add('circle', { cx: 175, cy: 185, r: 16, fill: '#fff', opacity: .5 });
  } else if (index === 1) {
    add('ellipse', { cx: 208, cy: 326, rx: 120, ry: 16, fill: '#645b51', opacity: .13 });
    for (const [x, y, width, h] of [[104, 212, 150, 98], [144, 148, 113, 101], [179, 89, 78, 103]]) {
      add('path', { d: `M${x} ${y}l${width / 2} -43 ${width / 2} 43 -${width / 2} 43Z`, fill: '#faf4e9' });
      add('path', { d: `M${x} ${y}v${h}l${width / 2} 43v-${h}Z`, fill: '#d9cbb5' });
      add('path', { d: `M${x + width / 2} ${y + 43}l${width / 2} -43v${h}l-${width / 2} 43Z`, fill: '#a69a85' });
    }
    add('path', { d: 'M144 148 200.5 105 257 148 200.5 191Z', fill: '#ed532b' });
    add('path', { d: 'M144 148v16l56.5 43v-16Z', fill: '#b7331b' });
    add('path', { d: 'M200.5 191 257 148v16l-56.5 43Z', fill: '#d63e20' });
  } else {
    add('ellipse', { cx: 205, cy: 324, rx: 111, ry: 17, fill: '#000', opacity: .28 });
    for (let n = 0; n < 4; n++) {
      const y = 76 + n * 52;
      add('path', { d: `M85 ${y + 47}Q148 ${y - 19} 205 ${y + 22}T315 ${y + 8}V${y + 41}Q266 ${y + 87} 205 ${y + 59}T85 ${y + 83}Z`, fill: ['#d3f7ae', '#b4e981', '#99cf63', '#79aa4b'][n] });
      add('path', { d: `M85 ${y + 47}Q148 ${y - 19} 205 ${y + 22}T315 ${y + 8}`, fill: 'none', stroke: '#eeffd5', 'stroke-width': 2, opacity: .8 });
    }
  }
  surface.append(svg, element('span', 'art-number', `F / ${studies[index].number}`));
  names.push(nameGlassView(surface, `archive-art-${index}`));
  return surface;
}
function render(focus = false) {
  for (const name of names) name.destroy(); names = [];
  const nodes: HTMLElement[] = [];
  get('back').hidden = selected === null; stage.dataset.layout = layout; stage.dataset.view = selected === null ? 'gallery' : 'detail';
  get('view-label').textContent = selected === null ? 'THE COLLECTION / 03 STUDIES' : `A CLOSER LOOK / STUDY ${studies[selected].number}`;
  get('view-note').textContent = selected === null ? 'SELECT A FORM TO EXPLORE' : 'SAME SURFACE / NEW CONTEXT';
  if (selected === null) {
    studies.forEach((study, index) => {
      const button = element('button', 'study-card'); button.type = 'button'; button.dataset.index = String(index); button.setAttribute('aria-label', `Explore ${study.title}`);
      const caption = element('span', 'card-caption'); caption.append(element('span', 'card-kind', study.kind), element('strong', '', study.title), element('span', 'card-arrow', '↗'));
      button.append(art(index), caption); button.addEventListener('click', () => { cancel(); void select(index, true); }); nodes.push(button);
    });
  } else {
    const study = studies[selected], index = selected;
    const visual = element('div', 'detail-art'); visual.append(art(index));
    const copy = element('article', 'detail-copy'); copy.append(element('span', 'eyebrow', `OBJECT ${study.number} / ${study.kind}`));
    const heading = element('h2', '', study.title); heading.tabIndex = -1; copy.append(heading, element('p', 'detail-description', study.description));
    const specs = element('dl', 'specs'); for (const [key, value] of [['Material palette', study.note], ['Made of', 'Original SVG geometry'], ['Motion', 'Short native snapshots']]) { specs.append(element('dt', '', key), element('dd', '', value)); }
    const save = element('button', 'save-button', saved.has(index) ? 'Saved to this session ✓' : 'Save this study +'); save.type = 'button'; save.setAttribute('aria-pressed', String(saved.has(index)));
    save.addEventListener('click', () => { saved.has(index) ? saved.delete(index) : saved.add(index); save.textContent = saved.has(index) ? 'Saved to this session ✓' : 'Save this study +'; save.setAttribute('aria-pressed', String(saved.has(index))); });
    copy.append(specs, save, element('p', 'save-note', 'A local session bookmark. No upload or account.')); nodes.push(visual, copy);
  }
  stage.replaceChildren(...nodes);
  if (focus) { if (selected === null) stage.querySelector<HTMLButtonElement>(`[data-index="${returnIndex}"]`)?.focus({ preventScroll: true }); else stage.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }); }
  get<HTMLButtonElement>('layout').setAttribute('aria-pressed', String(layout === 'list')); get('layout').textContent = layout === 'grid' ? 'List arrangement' : 'Grid arrangement';
  get('profile-title').textContent = openProfile ? 'Open collection' : 'Studio archive'; get('profile-note').textContent = openProfile ? 'A different point of view' : 'Objects worth a closer look'; get('profile').classList.toggle('alternate', openProfile);
}
function quiet() { return get<HTMLInputElement>('quiet').checked || motion.matches; }
function support() { get('support').textContent = motion.matches ? 'System reduced motion: every view updates directly.' : typeof document.startViewTransition === 'function' ? 'Native same-document transitions available in this browser.' : 'Native snapshots unavailable here. Every action still updates the real view.'; }
async function change(update: () => void, focus = false) {
  const token = ++generation, currentEpoch = resetEpoch;
  // A reset starts a new demo session. Old native callbacks still run once, but
  // their expired host state cannot repaint or increment the new session.
  const handle = runGlassViewTransition(() => { if (currentEpoch !== resetEpoch) return; updates++; update(); render(focus); get('updates').textContent = String(updates); }, { reducedMotion: quiet(), duration: 300 });
  active = handle; if (handle.native) nativeCalls++;
  get('result').textContent = handle.native ? 'Capturing continuity…' : 'Updating directly…';
  try { const result = await handle.finished; if (token === generation) { last = result; active = null; get('result').textContent = result.animated ? 'Shared snapshots · 300ms' : `Direct view · ${result.reason}`; } }
  catch { if (token === generation) { active = null; get('result').textContent = 'Host update failed. No update was replayed.'; } }
}
function cancel() { timers.forEach(window.clearTimeout); timers = []; touring = false; get('play').textContent = 'Play 10s tour'; }
function select(index: number, focus = false) { if (!Number.isInteger(index) || index < 0 || index >= studies.length) return Promise.resolve(); return change(() => { selected = returnIndex = index; }, focus); }
function back(focus = false) { return change(() => { selected = null; }, focus); }
function setLayout(next: 'grid' | 'list') { if (next !== 'grid' && next !== 'list') return Promise.resolve(); return change(() => { selected = null; layout = next; }); }
function setQuiet(value: boolean) { get<HTMLInputElement>('quiet').checked = Boolean(value); if (quiet()) active?.skip(); document.documentElement.classList.toggle('quiet', quiet()); support(); }
function reset() { cancel(); active?.skip(); generation++; resetEpoch++; active = null; selected = null; returnIndex = 0; layout = 'grid'; openProfile = false; saved.clear(); updates = nativeCalls = 0; last = null; get<HTMLInputElement>('quiet').checked = get<HTMLInputElement>('solid').checked = false; document.documentElement.classList.toggle('quiet', quiet()); document.documentElement.classList.remove('solid'); render(); get('updates').textContent = '0'; get('result').textContent = 'Ready to explore'; support(); }
function tour() {
  reset(); touring = true; get('play').textContent = 'Stop tour';
  const steps: [number, () => void][] = [[400, () => { void select(0); }], [1900, () => { void back(); }], [3200, () => { void select(2); }], [4700, () => { void back(); }], [5900, () => { void change(() => { openProfile = true; layout = 'list'; }); }], [7300, () => { void select(1); }], [8800, () => { setQuiet(true); void back(); }], [10000, cancel]];
  timers = steps.map(([delay, update]) => window.setTimeout(update, delay));
}
get('back').addEventListener('click', () => { cancel(); void back(true); });
get('layout').addEventListener('click', () => { cancel(); void setLayout(layout === 'grid' ? 'list' : 'grid'); });
get('change-profile').addEventListener('click', () => { cancel(); void change(() => { openProfile = !openProfile; }); });
get('play').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
get('quiet').addEventListener('change', () => { cancel(); setQuiet(get<HTMLInputElement>('quiet').checked); });
get('solid').addEventListener('change', () => document.documentElement.classList.toggle('solid', get<HTMLInputElement>('solid').checked));
const preference = () => { if (motion.matches) active?.skip(); document.documentElement.classList.toggle('quiet', quiet()); support(); }; motion.addEventListener('change', preference);
window.addEventListener('pagehide', event => { cancel(); active?.skip(); if (!event.persisted) { names.forEach(name => name.destroy()); profileName.destroy(); motion.removeEventListener('change', preference); } });
declare global { interface Window { __transitionDemo: { reset(): void; select(index: number): Promise<void>; back(): Promise<void>; setLayout(layout: 'grid' | 'list'): Promise<void>; setQuiet(value: boolean): void; tour(): void; cancel(): void; state(): { selected: number | null; layout: string; quiet: boolean; openProfile: boolean; updates: number; nativeCalls: number; result: GlassViewTransitionResult | null; namedSurfaces: number; touring: boolean } } } }
window.__transitionDemo = { reset, select, back, setLayout, setQuiet, tour, cancel, state: () => ({ selected, layout, quiet: quiet(), openProfile, updates, nativeCalls, result: last, namedSurfaces: names.length + 1, touring }) };
render(); support(); document.documentElement.classList.toggle('quiet', quiet());
