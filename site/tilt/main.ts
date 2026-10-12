import { attachGlassTilt } from '../../src/tilt.js';
import '../../src/material.css';
import './style.css';

type ObjectName = 'orbit' | 'atlas' | 'wave';
type Preset = ObjectName | 'neutral' | 'quiet' | 'light' | 'dark' | 'solid';
const names: ObjectName[] = ['orbit', 'atlas', 'wave'];
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const hosts = names.map(name => get(name)), visuals = names.map(name => get(`${name}-visual`));
const fine = window.matchMedia('(any-hover: hover) and (any-pointer: fine)'), reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const quiet = get<HTMLInputElement>('quiet'), solid = get<HTMLInputElement>('solid'), marker = get('camera-marker');
const controllers = hosts.map((host, index) => attachGlassTilt(host, visuals[index], { maxAngle: 12, maxDepth: 24, perspective: 1000, damping: 25 }));
let current: ObjectName = 'orbit', saved = false, theme: 'light' | 'dark' = 'light', touring = false, demoCamera = false;
let timers: number[] = [];
const copy: Record<ObjectName, { title: string; description: string; mark: string }> = {
  orbit: { title: 'Orbit, a focus-space concept.', description: 'A brass ring and violet core, drawn here as original SVG. Selecting a study updates these notes locally.', mark: 'LOCAL SELECTION' },
  atlas: { title: 'Atlas, a notebook concept.', description: 'Folded field-green pages and one glass label. This is a real anchor to these authored study notes.', mark: 'NATIVE LINK / LOCAL NOTES' },
  wave: { title: 'Wave, a sound-sketch concept.', description: 'An original copper ribbon. Save toggles a bookmark in this tab only; no account, audio player or remote upload.', mark: 'SESSION BOOKMARK' },
};
const status = (message: string) => { get('status').textContent = message; };
function options() { return { maxAngle: 12, maxDepth: 24, perspective: 1000, damping: 25, reducedMotion: quiet.checked }; }
function settings() {
  document.body.dataset.theme = theme; get('theme').textContent = theme === 'light' ? 'Dark view' : 'Light view'; get('theme').setAttribute('aria-pressed', String(theme === 'dark'));
  for (const surface of document.querySelectorAll<HTMLElement>('.lg-glass')) {
    surface.dataset.lgSolid = String(solid.checked);
    surface.dataset.lgAppearance = surface.classList.contains('wave-swatch') ? 'dark' : theme;
  }
  for (const controller of controllers) controller.update(options());
  capability();
}
function capability() { get('capability').textContent = quiet.checked || reduced.matches ? 'Quiet view / every control stays flat' : fine.matches ? 'Fine-pointer hover / optional perspective' : 'Touch or coarse pointer / stable flat controls'; }
function select(name: ObjectName) {
  current = name;
  names.forEach((item, index) => {
    hosts[index].dataset.selected = String(current === item);
    if (hosts[index].tagName === 'BUTTON') hosts[index].setAttribute('aria-pressed', String(item === 'wave' ? saved : current === item));
    else if (current === item) hosts[index].setAttribute('aria-current', 'true'); else hosts[index].removeAttribute('aria-current');
  });
  get('detail-index').textContent = `${String(names.indexOf(name) + 1).padStart(2, '0')} / SELECTED STUDY`;
  get('detail-title').textContent = copy[name].title; get('detail-copy').textContent = copy[name].description;
  get('local-mark').textContent = name === 'wave' && saved ? 'SAVED IN THIS TAB' : copy[name].mark;
  get('wave-mark').textContent = saved ? '✓' : '+';
}
function pointer(host: HTMLElement, type: 'pointerenter' | 'pointermove' | 'pointerleave', x = 0, y = 0) {
  let event: Event;
  if (typeof window.PointerEvent === 'function') event = new PointerEvent(type, { pointerType: 'mouse', isPrimary: true, pointerId: 41, clientX: x, clientY: y, buttons: 0 });
  else { event = new MouseEvent(type, { clientX: x, clientY: y, buttons: 0 }); Object.defineProperties(event, { pointerType: { value: 'mouse' }, isPrimary: { value: true } }); }
  host.dispatchEvent(event);
}
function neutral(immediate = false) {
  marker.hidden = true; demoCamera = false;
  for (const host of hosts) pointer(host, 'pointerleave');
  if (immediate) for (const controller of controllers) { controller.update({ ...options(), reducedMotion: true }); controller.update(options()); }
}
function cancel(settle = true) { for (const timer of timers) clearTimeout(timer); timers = []; touring = false; get('tour').textContent = 'Play 10s camera'; if (settle) neutral(); else { marker.hidden = true; demoCamera = false; } }
function camera(name: ObjectName, x: number, y: number, entering = false) {
  const index = names.indexOf(name), host = hosts[index]; select(name);
  if (!fine.matches || quiet.checked || reduced.matches) { neutral(true); status('Camera example stays flat under the actual coarse/quiet gate. No sensor input is used.'); return; }
  const rect = host.getBoundingClientRect(), gallery = get('camera-marker').parentElement!.getBoundingClientRect();
  const clientX = rect.left + rect.width * x, clientY = rect.top + rect.height * y;
  if (entering) { for (const other of hosts) if (other !== host) pointer(other, 'pointerleave'); pointer(host, 'pointerenter', clientX, clientY); }
  else pointer(host, 'pointermove', clientX, clientY);
  marker.hidden = false; marker.style.translate = `${clientX - gallery.left}px ${clientY - gallery.top}px`;
  marker.dataset.flip = String(clientX - gallery.left > gallery.width - 120); demoCamera = true;
  status(`Demo mouse / ${name}. Simulated positions use the real fine-pointer controller; no gyroscope.`);
}
function preset(name: Preset) {
  if (![...names, 'neutral', 'quiet', 'light', 'dark', 'solid'].includes(name)) throw new TypeError('Unknown depth study preset');
  cancel();
  if (names.includes(name as ObjectName)) { select(name as ObjectName); camera(name as ObjectName, .83, .17, true); return; }
  if (name === 'neutral') { neutral(true); status('Neutral controls. No projected hit area or idle animation.'); }
  else if (name === 'quiet') { quiet.checked = true; settings(); neutral(true); status('Quiet view: the native controls and all labels remain available.'); }
  else if (name === 'solid') { solid.checked = true; settings(); status('Solid material surfaces. Fine-pointer projection remains optional.'); }
  else { theme = name as 'light' | 'dark'; settings(); status(`${theme === 'light' ? 'Light' : 'Dark'} collection view.`); }
}
function reset() { cancel(); quiet.checked = false; solid.checked = false; theme = 'light'; saved = false; settings(); neutral(true); select('orbit'); status('Hover a study. Its visual plane moves; its native control stays still.'); }
function tour() {
  cancel(); touring = true; get('tour').textContent = 'Stop camera';
  const steps: [number, ObjectName, number, number, boolean][] = [
    [0, 'orbit', .15, .16, true], [550, 'orbit', .84, .14, false], [1100, 'orbit', .87, .74, false], [1700, 'orbit', .18, .7, false],
    [2700, 'atlas', .12, .17, true], [3300, 'atlas', .88, .2, false], [3900, 'atlas', .84, .72, false], [4500, 'atlas', .2, .72, false],
    [5700, 'wave', .12, .16, true], [6300, 'wave', .88, .18, false], [6900, 'wave', .84, .7, false], [7500, 'wave', .2, .72, false],
  ];
  camera(steps[0][1], steps[0][2], steps[0][3], true);
  for (const [time, name, x, y, entering] of steps.slice(1)) timers.push(window.setTimeout(() => camera(name, x, y, entering), time));
  timers.push(window.setTimeout(() => { neutral(); status('Returning to neutral. The shared springs settle, then stop.'); }, 8700));
  timers.push(window.setTimeout(() => { cancel(); status('Camera complete. Hover, focus or tap the real native controls.'); }, 10000));
}
get('orbit').addEventListener('click', () => { cancel(); select('orbit'); status('Orbit selected locally. Native press/focus neutralizes its visual plane.'); });
get('atlas').addEventListener('click', () => { cancel(); select('atlas'); status('Atlas notes selected. The native anchor keeps its fragment destination.'); });
get('wave').addEventListener('click', () => { cancel(); saved = !saved; select('wave'); status(saved ? 'Wave saved in this tab only.' : 'Wave removed from this tab’s saved studies.'); });
for (const host of hosts) {
  host.addEventListener('pointerenter', event => { if (event.isTrusted) { cancel(false); capability(); } });
  host.addEventListener('pointerdown', event => { if (event.isTrusted) cancel(false); });
}
get('theme').addEventListener('click', () => { cancel(); theme = theme === 'light' ? 'dark' : 'light'; settings(); status(`${theme === 'light' ? 'Light' : 'Dark'} collection view.`); });
quiet.addEventListener('change', () => { cancel(); settings(); neutral(true); status(quiet.checked ? 'Quiet view, with every control and label still available.' : 'Optional fine-pointer hover restored. Reenter a study to activate it.'); });
solid.addEventListener('change', () => { cancel(); settings(); });
get('tour').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
fine.addEventListener('change', () => { cancel(); capability(); }); reduced.addEventListener('change', () => { cancel(); capability(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
window.addEventListener('scroll', () => { if (touring || demoCamera) cancel(); }, { passive: true });
window.addEventListener('pagehide', () => { cancel(); for (const controller of controllers) controller.destroy(); });
settings(); select('orbit');
declare global {
  interface Window { __tiltDemo: { tour(): void; reset(): void; cancel(): void; preset(name: Preset): void; state(): { selected: ObjectName; saved: boolean; theme: 'light' | 'dark'; solid: boolean; quiet: boolean; fine: boolean; touring: boolean; camera: 'simulated-mouse' | 'none'; transforms: string[]; maxAngle: number; maxDepth: number; perspective: number } } }
}
window.__tiltDemo = { tour, reset, cancel, preset, state: () => ({ selected: current, saved, theme, solid: solid.checked, quiet: quiet.checked || reduced.matches, fine: fine.matches, touring, camera: demoCamera ? 'simulated-mouse' : 'none', transforms: visuals.map(visual => visual.style.transform), maxAngle: 12, maxDepth: 24, perspective: 1000 }) };
