import './style.css';
import { attachGlassDock } from '../../src/dock.js';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Tool = 'notes' | 'color' | 'timeline' | 'files' | 'export';
type Palette = 'copper' | 'lunar' | 'moss';
const tools: Tool[] = ['notes', 'color', 'timeline', 'files', 'export'];
const titles: Record<Tool, string> = { notes: 'Field notes', color: 'Color & light', timeline: 'Motion study', files: 'Working files', export: 'The finished study' };
const studio = document.querySelector<HTMLElement>('.studio')!;
const nav = get('dock');
const workspace = document.querySelector<HTMLElement>('.workspace')!;
const canvas = get('canvas');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const dock = attachGlassDock(nav, { maxScale: 1.65, radius: 120, lift: 18 });
let selected: Tool = 'notes', palette: Palette = 'copper', speed = 1, angle = 0, paused = false;
let tourFrame: number | null = null, tourStart = 0, tourStep = -1, tourElapsed = 0, destroyed = false;
let tourGeometry: { items: Array<{ x: number; y: number }>; left: number; top: number } | null = null;

function status(text: string) { get('status').textContent = text; }
function syncDescription() {
  const light = palette === 'copper' ? 'Copper dusk' : palette === 'lunar' ? 'Lunar blue' : 'Soft moss';
  const title = get<HTMLInputElement>('study-name').value || 'Untitled study';
  const note = get<HTMLTextAreaElement>('study-note').value;
  canvas.setAttribute('aria-label', `${light} solar poster, with fine orbital rings. ${title}${note ? ` ${note}` : ''}`);
}
function selectTool(tool: Tool, announce = true) {
  if (!tools.includes(tool)) return;
  selected = tool;
  for (const current of tools) {
    get(`panel-${current}`).hidden = current !== tool;
    nav.querySelector(`[data-tool="${current}"]`)!.setAttribute('aria-pressed', String(current === tool));
  }
  get('panel-title').textContent = titles[tool];
  get('panel-index').textContent = `0${tools.indexOf(tool) + 1} / 05`;
  if (announce) status(`${titles[tool]} opened.`);
}
for (const button of nav.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
  button.addEventListener('click', () => { stopTour(); selectTool(button.dataset.tool as Tool); });
}
function syncNotes() {
  get('poster-title').textContent = get<HTMLInputElement>('study-name').value || 'Untitled study';
  get('poster-subtitle').textContent = get<HTMLTextAreaElement>('study-note').value;
  get('save-state').textContent = 'EDITED LOCALLY';
  syncDescription();
}
for (const id of ['study-name', 'study-note']) get(id).addEventListener('input', syncNotes);
const colors: Record<Palette, string[]> = {
  copper: ['#ffe4ba', '#ffb565', '#d45f35', '#612e28', '#151b1d'],
  lunar: ['#e9f9fc', '#a8d4e7', '#4c8bad', '#294255', '#151b1d'],
  moss: ['#f1efcc', '#c8d69b', '#8b9e62', '#3f513e', '#151b1d'],
};
function setPalette(next: Palette, announce = true) {
  palette = next;
  const stops = document.querySelectorAll<SVGStopElement>('#sun stop');
  colors[next].forEach((color, i) => stops[i].setAttribute('stop-color', color));
  studio.style.setProperty('--art-hue', next === 'lunar' ? '140deg' : next === 'moss' ? '58deg' : '0deg');
  // The original SVG itself uses its palette; the hue variable is only for the small export thumbnail.
  document.querySelector<SVGElement>('.solar-art')!.style.filter = 'none';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-palette]')) button.setAttribute('aria-pressed', String(button.dataset.palette === next));
  canvas.style.background = next === 'lunar' ? 'radial-gradient(ellipse at 45% 60%,#30434a,#202e34 45%,#18272d)' : next === 'moss' ? 'radial-gradient(ellipse at 45% 60%,#414737,#2b352b 45%,#222c24)' : '';
  syncDescription();
  if (announce) status(`${next === 'copper' ? 'Copper dusk' : next === 'lunar' ? 'Lunar blue' : 'Soft moss'} palette applied.`);
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-palette]')) button.addEventListener('click', () => { stopTour(); setPalette(button.dataset.palette as Palette); });
function syncMotion() {
  speed = Number(get<HTMLInputElement>('orbit-speed').value);
  angle = Number(get<HTMLInputElement>('orbit-angle').value);
  studio.style.setProperty('--orbit-speed', String(speed));
  studio.style.setProperty('--art-angle', `${angle}deg`);
  get('speed-value').textContent = `${speed.toFixed(1)}×`;
  get('angle-value').textContent = `${angle}°`;
}
for (const id of ['orbit-speed', 'orbit-angle']) get(id).addEventListener('input', syncMotion);
get('reset-motion').addEventListener('click', () => {
  get<HTMLInputElement>('orbit-speed').value = '1';
  get<HTMLInputElement>('orbit-angle').value = '0';
  syncMotion(); status('Motion controls reset.');
});
function syncPaused() {
  studio.dataset.paused = String(paused || motionQuery.matches || document.hidden);
  get('motion').setAttribute('aria-pressed', String(paused || motionQuery.matches));
  get('motion').innerHTML = paused || motionQuery.matches ? 'Motion paused <span aria-hidden="true">▷</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
  get('motion').toggleAttribute('disabled', motionQuery.matches);
}
get('motion').addEventListener('click', () => { stopTour(); paused = !paused; syncPaused(); });

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  // Give the browser time to claim the object URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const noteText = () => `${get<HTMLInputElement>('study-name').value}\n\n${get<HTMLTextAreaElement>('study-note').value}\n`;
get('download-notes').addEventListener('click', () => { download(noteText(), 'text/plain;charset=utf-8', 'orbit-field-notes.txt'); status('Your field notes download was requested.'); });
const escapeXml = (text: string) => text.replace(/[<>&"']/g, value => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[value]!));
function exportSvg() {
  const artwork = document.querySelector<SVGSVGElement>('.solar-art')!.cloneNode(true) as SVGSVGElement;
  artwork.removeAttribute('class'); artwork.removeAttribute('aria-hidden'); artwork.removeAttribute('style');
  const name = escapeXml(get<HTMLInputElement>('study-name').value || 'Untitled study');
  const note = get<HTMLTextAreaElement>('study-note').value;
  const lines = note.match(/.{1,85}(?:\s|$)|.{1,85}/g)?.map(line => line.trim()) ?? [];
  const noteMarkup = lines.slice(0, 3).map((line, i) => `<tspan x="45" dy="${i ? 17 : 0}">${escapeXml(line)}</tspan>`).join('');
  const background = palette === 'lunar' ? '#203038' : palette === 'moss' ? '#2b352b' : '#202e2b';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="760" viewBox="0 0 700 760"><title>${name}</title><rect width="700" height="760" fill="${background}"/><g transform="rotate(${angle} 350 322)">${artwork.innerHTML}</g><text x="45" y="673" fill="#e8e5db" font-family="Georgia,serif" font-size="24">${name}</text><text x="45" y="703" fill="#b7c2ab" font-family="sans-serif" font-size="12">${noteMarkup}</text></svg>`;
}
get('export').addEventListener('click', () => {
  const format = get<HTMLSelectElement>('export-format').value;
  if (format === 'svg') download(exportSvg(), 'image/svg+xml;charset=utf-8', 'orbit-study.svg');
  else download(JSON.stringify({ title: get<HTMLInputElement>('study-name').value, note: get<HTMLTextAreaElement>('study-note').value, palette, speed, angle }, null, 2), 'application/json;charset=utf-8', 'orbit-study.json');
  get('export-status').textContent = `${format.toUpperCase()} download requested. Your study is ready to keep.`;
  status(`${format.toUpperCase()} study download requested.`);
});

const tourTitles = ['Meet your next idea.', 'Change the atmosphere.', 'A little motion. A lot of feeling.', 'The details, within reach.', 'Make something worth keeping.', 'Bring your tools closer.'];
const tourTools: Tool[] = ['notes', 'color', 'timeline', 'files', 'export', 'notes'];
function dispatchProximity(index: number, next: number, progress: number) {
  const items = [...nav.querySelectorAll<HTMLElement>('[data-lg-dock-item]')];
  if (!tourGeometry) return;
  const first = tourGeometry.items[index], last = tourGeometry.items[next];
  const ease = progress * progress * (3 - 2 * progress);
  const x = first.x + (last.x - first.x) * ease;
  const y = first.y;
  const closest = tourGeometry.items.reduce((best, item, i) => Math.abs(item.x - x) < Math.abs(tourGeometry!.items[best].x - x) ? i : best, 0);
  items.forEach((item, i) => item.toggleAttribute('data-tour-focus', i === closest));
  nav.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y }));
  get('tour-pointer').style.transform = `translate(${x - tourGeometry.left + 5}px, ${y - tourGeometry.top + 3}px)`;
}
function stopTour(announce = false) {
  if (tourFrame !== null) cancelAnimationFrame(tourFrame);
  tourFrame = null; studio.dataset.tour = 'false';
  tourGeometry = null;
  for (const item of nav.querySelectorAll('[data-tour-focus]')) item.removeAttribute('data-tour-focus');
  nav.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', isPrimary: true }));
  get('tour').innerHTML = '<span aria-hidden="true">▷</span> Play 12s tour';
  if (announce) status('Tour stopped. Explore the tools yourself.');
}
function tick(now: number) {
  tourFrame = null;
  if (destroyed || document.hidden || motionQuery.matches) { stopTour(); return; }
  tourElapsed = Math.min(12, (now - tourStart) / 1000);
  const step = Math.min(5, Math.floor(tourElapsed / 2));
  if (step !== tourStep) {
    tourStep = step; selectTool(tourTools[step], false);
    get('film-title').textContent = tourTitles[step];
    get('film-kicker').textContent = step === 5 ? 'LIQUID GLASS KIT / OPEN SOURCE' : `0${step + 1} / SPRING-DRIVEN GLASS DOCK`;
    if (step === 1) setPalette('lunar', false);
    if (step === 2) { get<HTMLInputElement>('orbit-speed').value = '1.6'; get<HTMLInputElement>('orbit-angle').value = '12'; syncMotion(); }
    if (step === 5) { setPalette('copper', false); get<HTMLInputElement>('orbit-speed').value = '1'; get<HTMLInputElement>('orbit-angle').value = '0'; syncMotion(); }
  }
  const current = tools.indexOf(tourTools[step]);
  const next = step === 5 ? current : tools.indexOf(tourTools[step + 1]);
  // The first part holds the selected tool, then travels through its spatial neighbors.
  const progress = Math.max(0, Math.min(1, (tourElapsed % 2 - .7) / 1.3));
  dispatchProximity(current, next, progress);
  get('film-progress').style.width = `${tourElapsed / 12 * 100}%`;
  if (tourElapsed >= 12) { stopTour(); status('Tour complete. Explore all five tools with the dock.'); return; }
  tourFrame = requestAnimationFrame(tick);
}
function startTour() {
  stopTour();
  if (motionQuery.matches || document.hidden || destroyed) { status('Tour motion is paused by your system preference. Every tool remains available.'); return; }
  paused = false; syncPaused(); tourElapsed = 0; tourStep = -1; tourStart = performance.now();
  const bounds = workspace.getBoundingClientRect();
  tourGeometry = { left: bounds.left, top: bounds.top, items: [...nav.querySelectorAll<HTMLElement>('[data-lg-dock-item]')].map(item => { const r = item.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .65 }; }) };
  studio.dataset.tour = 'true';
  get('tour').innerHTML = '<span aria-hidden="true">Ⅱ</span> Stop tour';
  tourFrame = requestAnimationFrame(tick);
}
get('tour').addEventListener('click', () => studio.dataset.tour === 'true' ? stopTour(true) : startTour());
workspace.addEventListener('pointerdown', event => { if (event.isTrusted && studio.dataset.tour === 'true') stopTour(); });
workspace.addEventListener('keydown', event => { if (event.isTrusted && studio.dataset.tour === 'true') stopTour(); });
motionQuery.addEventListener('change', () => { if (motionQuery.matches) stopTour(); syncPaused(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopTour(); syncPaused(); });
window.addEventListener('resize', () => { if (studio.dataset.tour === 'true') stopTour(); });
window.addEventListener('scroll', () => { if (studio.dataset.tour === 'true') stopTour(); }, { passive: true });
window.addEventListener('pagehide', event => { stopTour(); if (!event.persisted) { destroyed = true; dock.destroy(); } });

const demo = { dock, startTour, stopTour, selectTool, setPalette, exportSvg,
  get state() { return { selected, palette, speed, angle, paused: paused || motionQuery.matches, reducedMotion: motionQuery.matches, tourRunning: tourFrame !== null, tourElapsed, tourStep }; },
};
(window as unknown as { dockDemo: typeof demo; orbitDemo: typeof demo }).dockDemo = demo;
(window as unknown as { orbitDemo: typeof demo }).orbitDemo = demo;
selectTool('notes', false); syncPaused(); syncDescription();
if (new URLSearchParams(location.search).get('film') === '1') startTour();
