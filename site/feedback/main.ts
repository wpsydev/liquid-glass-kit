import { createGlassFeedbackEmitter } from '../../src/interaction-feedback.js';
import type { GlassFeedbackEffect, GlassFeedbackOptions } from '../../src/interaction-feedback.js';
import './style.css';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const playground = get('playground'), canvas = get<HTMLCanvasElement>('feedback-canvas');
const colors = { cobalt: '#254ae9', orange: '#f17636', rose: '#c93578' } as const;
let accent: keyof typeof colors = 'cobalt', savedNote = '', effort = 3, completed = false, width = 1, height = 1;
let points = new Map<HTMLElement, { x: number; y: number; left: number; width: number }>();
let statisticTimer: number | null = null;
const tourTimers = new Set<number>();
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const emitter = createGlassFeedbackEmitter(canvas, { width, height, duration: 620, maxPixels: 524288 });
function config(): GlassFeedbackOptions {
  return { width, height, effect: get<HTMLSelectElement>('effect').value as GlassFeedbackEffect, particles: Number(get<HTMLInputElement>('particles').value),
    maxDpr: Number(get<HTMLSelectElement>('density').value), maxPixels: 524288, duration: 620, maxBursts: 2, color: colors[accent], reducedMotion: get<HTMLInputElement>('quiet').checked };
}
function stats() {
  const value = emitter.stats;
  get('stats').textContent = `${value.activeBursts} active bursts · ${value.activeParticles} active particles · ${value.frames} canvas frames · ${value.pixels.toLocaleString()} backing pixels · ${value.dpr.toFixed(2)}× actual DPR`;
}
function resize() {
  const bounds = playground.getBoundingClientRect(); width = Math.max(1, Math.min(2048, playground.clientWidth)); height = Math.max(1, Math.min(2048, playground.clientHeight));
  points = new Map([...playground.querySelectorAll<HTMLElement>('[data-feedback-target]')].map(element => {
    const rect = element.getBoundingClientRect();
    return [element, { x: rect.left - bounds.left - playground.clientLeft + rect.width / 2, y: rect.top - bounds.top - playground.clientTop + rect.height / 2, left: rect.left - bounds.left - playground.clientLeft, width: rect.width }];
  }));
  emitter.update(config()); stats();
}
function visual(element: HTMLElement, label: string) {
  const point = points.get(element);
  const quiet = get<HTMLInputElement>('quiet').checked || systemMotion.matches;
  const emitted = Boolean(!quiet && point && emitter.emit({ x: element.id === 'effort' ? point.left + point.width * (effort - 1) / 4 : point.x, y: point.y, color: colors[accent] }));
  get('status').textContent = `${label}${quiet ? ' · quiet preference keeps the visual still' : emitted ? ' · finite feedback emitted' : ' · state kept; visual renderer unavailable'}`;
  stats();
  if (statisticTimer !== null) window.clearTimeout(statisticTimer);
  // One bounded receipt update after a burst; never a stats polling loop.
  if (emitted) statisticTimer = window.setTimeout(() => { statisticTimer = null; stats(); }, 760);
}
function save() {
  const value = get<HTMLTextAreaElement>('note').value.trim();
  if (!value) { get('status').textContent = 'Write a note before saving'; return; }
  savedNote = value; get('saved-note').textContent = `Saved: ${savedNote}`; get('note-state').textContent = 'SAVED LOCALLY';
  visual(get('save-note'), 'Note committed locally');
}
function commitEffort() {
  effort = Number(get<HTMLInputElement>('effort').value);
  get('effort-word').textContent = ['Very gently.', 'Keep it light.', 'Just enough.', 'A little more.', 'Full of energy.'][effort - 1];
  get('effort-number').textContent = `0${effort} / 05`; get('effort-state').textContent = `Effort ${effort} committed to the local model`;
  visual(get('effort'), `Effort ${effort} committed locally`);
}
function commitVibe(radio: HTMLInputElement) {
  accent = radio.value as keyof typeof colors;
  document.documentElement.style.setProperty('--accent', colors[accent]); get('vibe-state').textContent = `${accent[0].toUpperCase() + accent.slice(1)} is the current accent`;
  // Point color is supplied per burst; switching the host accent never starts a renderer.
  visual(radio.closest<HTMLElement>('[data-feedback-target]')!, `${accent} accent committed locally`);
}
function commitDone() {
  completed = get<HTMLInputElement>('done').checked;
  get('completion-glyph').textContent = completed ? '✓' : '↗'; get('done-state').textContent = completed ? 'Checklist complete locally. Nothing was published.' : 'One local checklist item. No publish action.';
  playground.dataset.complete = String(completed);
  visual(get('done').closest<HTMLElement>('[data-feedback-target]')!, completed ? 'Checklist completion committed locally' : 'Checklist reopened locally');
}
get('save-note').addEventListener('click', save);
get('effort').addEventListener('change', commitEffort);
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=vibe]')) radio.addEventListener('change', () => { if (radio.checked) commitVibe(radio); });
get('done').addEventListener('change', commitDone);
function settings() { emitter.update(config()); get('particle-value').textContent = get<HTMLInputElement>('particles').value; stats(); }
get('effect').addEventListener('change', settings); get('density').addEventListener('change', settings); get('quiet').addEventListener('change', settings); get('particles').addEventListener('input', settings);
systemMotion.addEventListener('change', settings);
const observer = new ResizeObserver(resize); observer.observe(playground);
for (const target of playground.querySelectorAll<HTMLElement>('[data-feedback-target]')) observer.observe(target);
resize();
function cancel() {
  for (const timer of tourTimers) window.clearTimeout(timer); tourTimers.clear();
  if (statisticTimer !== null) window.clearTimeout(statisticTimer); statisticTimer = null;
  emitter.cancel(); stats(); get('status').textContent = 'Local sequence stopped. Committed state kept.';
}
function reset() {
  cancel(); savedNote = ''; effort = 3; completed = false; accent = 'cobalt';
  get<HTMLTextAreaElement>('note').value = 'make the useful part feel good'; get('saved-note').textContent = 'Saved only for this page session'; get('note-state').textContent = 'NOT SAVED YET';
  get<HTMLInputElement>('effort').value = '3'; get('effort-word').textContent = 'Just enough.'; get('effort-number').textContent = '03 / 05'; get('effort-state').textContent = 'The native input commits your value on change';
  get<HTMLInputElement>('done').checked = false; get('completion-glyph').textContent = '↗'; get('done-state').textContent = 'One local checklist item. No publish action.'; playground.dataset.complete = 'false';
  document.querySelector<HTMLInputElement>('input[value=cobalt]')!.checked = true; document.documentElement.style.setProperty('--accent', colors.cobalt); get('vibe-state').textContent = 'Cobalt is the current accent';
  get<HTMLSelectElement>('effect').value = 'pixels'; get<HTMLInputElement>('particles').value = '24'; get<HTMLSelectElement>('density').value = '1.5';
  settings(); get('status').textContent = 'No feedback runs until a state is committed';
}
function emitPreset(index: number) {
  if (index === 0) { get<HTMLTextAreaElement>('note').value = savedNote ? 'keep the important part human' : 'make the useful part feel good'; save(); }
  else if (index === 1) { get<HTMLInputElement>('effort').value = effort > 3 ? '2' : '5'; commitEffort(); }
  else if (index === 2) { const next = accent === 'cobalt' ? 'orange' : accent === 'orange' ? 'rose' : 'cobalt'; const radio = document.querySelector<HTMLInputElement>(`input[value=${next}]`)!; radio.checked = true; commitVibe(radio); }
  else if (index === 3) { get<HTMLInputElement>('done').checked = !completed; commitDone(); }
}
function tour() {
  reset();
  const steps: [number, GlassFeedbackEffect][] = [[0, 'pixels'], [1, 'ripple'], [2, 'sparks'], [3, 'pixels'], [0, 'sparks'], [2, 'ripple']];
  steps.forEach(([index, effect], step) => {
    const timer = window.setTimeout(() => { tourTimers.delete(timer); get<HTMLSelectElement>('effect').value = effect; settings(); emitPreset(index); }, 350 + step * 1750);
    tourTimers.add(timer);
  });
}
get('tour').addEventListener('click', tour); get('cancel-tour').addEventListener('click', cancel);
declare global { interface Window { __feedbackDemo: { reset(): void; emitPreset(index: number): void; tour(): void; cancel(): void; state(): { savedNote: string; effort: number; accent: string; completed: boolean; stats: typeof emitter.stats; active: boolean } } } }
window.__feedbackDemo = { reset, emitPreset, tour, cancel, state: () => ({ savedNote, effort, accent, completed, stats: emitter.stats, active: emitter.active }) };
window.addEventListener('pagehide', () => { cancel(); if (statisticTimer !== null) window.clearTimeout(statisticTimer); observer.disconnect(); systemMotion.removeEventListener('change', settings); emitter.destroy(); }, { once: true });
