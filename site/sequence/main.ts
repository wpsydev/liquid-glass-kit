import { attachGlassSequence } from '../../src/sequence.js';
import type { GlassSequence, GlassSequenceTrack } from '../../src/sequence.js';
import '../../src/material.css';
import './style.css';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const board = get('art-board'), motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const visuals = ['halo', 'slab', 'lens', 'disc', 'blade', 'arc'].map(id => get(id));
const studies = {
  assembly: { number: '01', title: 'A meeting of materials', label: 'ASSEMBLY', note: 'STONE / CHROME / LIGHT', duration: 1900 },
  counterpoint: { number: '02', title: 'The pleasure of opposition', label: 'COUNTERPOINT', note: 'TWO DIRECTIONS / ONE MOMENT', duration: 1800 },
  restoration: { number: '03', title: 'The shape remembers', label: 'RETURN TO REST', note: 'AN AUTHORED TILT / A CLEAN RETURN', duration: 1600 },
} as const;
type Preset = keyof typeof studies;
let selected: Preset = 'assembly', controller: GlassSequence, epoch = 0, timers: number[] = [], touring = false;
let outcome = 'At authored rest. Nothing is playing.';
const quiet = () => get<HTMLInputElement>('quiet').checked || motion.matches;
function tracks(id: Preset): GlassSequenceTrack[] {
  if (id === 'assembly') {
    const from = [{ x: -65, scale: .7, opacity: 0 }, { y: 100, scale: .8, opacity: 0 }, { x: 125, scale: .65, opacity: 0 }, { y: -80, scale: .6, opacity: 0 }, { x: -90, y: 50, scale: .75, opacity: 0 }, { x: 65, y: 75, scale: .8, opacity: 0 }];
    return visuals.map((element, index) => ({ element, from: from[index], to: { x: 0, y: 0, scale: 1, opacity: 1 }, at: index * 160, duration: 1100, easing: 'ease-out' }));
  }
  if (id === 'counterpoint') {
    return visuals.map((element, index) => ({ element, from: { x: index % 2 ? -95 : 95, y: index % 2 ? 30 : -30, scale: .75, opacity: .3 }, to: { x: index % 2 ? 22 : -22, y: index % 2 ? -12 : 12, scale: 1, opacity: 1 }, at: index * 100, duration: 1300, easing: 'ease-in-out' }));
  }
  return visuals.map((element, index) => ({ element, from: { x: index % 2 ? 60 : -60, scale: .85, opacity: .6 }, to: { x: index % 2 ? -22 : 22, y: index % 2 ? -22 : 22, scale: 1.12, opacity: 1 }, at: index * 80, duration: 1200, easing: 'ease-in-out' }));
}
function updateUI() {
  const state = controller.state;
  get<HTMLInputElement>('seek').max = String(state.duration); get<HTMLInputElement>('seek').value = String(Math.round(state.time));
  get<HTMLOutputElement>('time').value = `sampled ${(state.time / 1000).toFixed(2)} / ${(state.duration / 1000).toFixed(2)}s`;
  get<HTMLButtonElement>('pause').disabled = state.status !== 'playing';
  get('play').textContent = state.status === 'paused' ? '▶ Resume sequence' : state.status === 'playing' ? '▶ Playing' : '▶ Play sequence';
  get('play').setAttribute('aria-label', state.status === 'paused' ? 'Resume sequence' : 'Play sequence');
  if (get('result').textContent !== outcome) get('result').textContent = outcome;
  const restored = get('blade').style.transform === 'rotate(-14deg)' && get('blade').style.getPropertyPriority('transform') === 'important';
  get('rest-check').textContent = restored ? '−14° · preserved' : '−14° · retained in pose';
  get('support').textContent = motion.matches ? 'System reduced motion is active. Playback uses the stable endpoint.' : typeof visuals[0].animate === 'function' && typeof document.timeline?.currentTime === 'number' ? 'Native document-timeline playback. No JavaScript frame loop.' : 'Native timeline unavailable. Every study uses its stable endpoint.';
}
function configure(id: Preset) {
  if (!Object.hasOwn(studies, id)) return;
  epoch++; controller?.destroy(); selected = id;
  controller = attachGlassSequence(board, { tracks: tracks(id), reducedMotion: quiet() });
  const study = studies[id]; get('study-title').textContent = study.title; get('study-number').textContent = `${study.number} / ${study.label}`; get('composition-note').textContent = study.note;
  board.dataset.study = id;
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === id)));
  document.documentElement.classList.toggle('quiet', quiet()); outcome = 'At authored rest. Nothing is playing.'; updateUI();
}
async function play() {
  const ticket = epoch;
  const pending = controller.play(); outcome = controller.state.status === 'playing' ? 'Playing coordinated visual tracks.' : quiet() ? 'Quiet endpoint. No staggered waiting.' : 'Stable endpoint.'; updateUI();
  const result = await pending;
  if (ticket !== epoch) return result;
  outcome = result.completed ? result.reason === 'finished' ? 'Finite sequence complete. Endpoints held.' : `Stable endpoint · ${result.reason}` : `Presentation stopped · ${result.reason}`;
  updateUI(); return result;
}
function pause() { const changed = controller.pause(); if (changed) outcome = 'Paused. Seek or resume this shared clock.'; updateUI(); return changed; }
function seek(milliseconds: number) { controller.seek(milliseconds); outcome = quiet() ? 'Quiet endpoint. Seeking never runs app actions.' : 'Paused presentation. No app action was replayed.'; updateUI(); }
function restore() { epoch++; controller.cancel(); outcome = 'Cancelled. Authored tilt and priorities restored.'; updateUI(); }
function stopTour() { timers.forEach(window.clearTimeout); timers = []; touring = false; get('tour').textContent = 'Play 10.5s tour'; }
function cancel() { stopTour(); restore(); }
function preset(id: Preset) { stopTour(); configure(id); }
function setQuiet(value: boolean) { get<HTMLInputElement>('quiet').checked = Boolean(value); configure(selected); }
function reset() { stopTour(); get<HTMLInputElement>('quiet').checked = get<HTMLInputElement>('solid').checked = false; document.documentElement.classList.remove('solid'); configure('assembly'); }
function tour() {
  reset(); touring = true; get('tour').textContent = 'Stop tour';
  const steps: [number, () => void][] = [
    [250, () => { void play(); }], [1050, pause], [1550, () => seek(1150)], [2150, () => { void play(); }],
    [3350, () => { configure('counterpoint'); void play(); }], [5550, () => { configure('restoration'); void play(); }],
    [7750, restore], [8750, () => { setQuiet(true); void play(); }], [10500, () => { stopTour(); outcome = 'Tour complete. Every sequence is finite.'; updateUI(); }],
  ];
  timers = steps.map(([delay, action]) => window.setTimeout(action, delay));
}
get('play').addEventListener('click', () => { stopTour(); void play(); });
get('pause').addEventListener('click', () => { stopTour(); pause(); });
get('restore').addEventListener('click', cancel);
get('tour').addEventListener('click', () => touring ? cancel() : tour());
get<HTMLInputElement>('seek').addEventListener('input', event => { stopTour(); seek(Number((event.currentTarget as HTMLInputElement).value)); });
get<HTMLInputElement>('quiet').addEventListener('change', () => { stopTour(); setQuiet(get<HTMLInputElement>('quiet').checked); void play(); });
get<HTMLInputElement>('solid').addEventListener('change', () => document.documentElement.classList.toggle('solid', get<HTMLInputElement>('solid').checked));
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => preset(button.dataset.preset as Preset)));
motion.addEventListener('change', () => { configure(selected); if (quiet()) void play(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopTour(); epoch++; controller.cancel(); outcome = 'Page hidden. Playback stopped without automatic restart.'; updateUI(); } });
window.addEventListener('pagehide', () => { stopTour(); epoch++; controller.destroy(); });
window.addEventListener('pageshow', () => { if (controller.state.status === 'destroyed') configure(selected); });
configure('assembly');
declare global { interface Window { __sequenceDemo: { preset: typeof preset; reset: typeof reset; tour: typeof tour; cancel: typeof cancel; play: typeof play; pause: typeof pause; seek: typeof seek; state: () => { selected: Preset; quiet: boolean; touring: boolean; sequence: ReturnType<typeof state>; outcome: string } } } }
function state() { return controller.state; }
window.__sequenceDemo = { preset, reset, tour, cancel, play, pause, seek, state: () => ({ selected, quiet: quiet(), touring, sequence: state(), outcome }) };
