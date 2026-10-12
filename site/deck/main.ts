import { attachGlassSnapDeck } from '../../src/snap-deck.js';
import type { GlassSnapDeckChange } from '../../src/snap-deck.js';
import { getGlassProps } from '../../src/material.js';
import '../../src/snap-deck.css';
import './style.css';

type Direction = 'form' | 'colour' | 'motion';
type Preset = 'story' | 'compact' | 'rtl' | 'quiet';
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const scroller = query('#direction-deck'), cards = [...scroller.children] as HTMLElement[];
const previous = query<HTMLButtonElement>('#previous'), next = query<HTMLButtonElement>('#next');
const directionField = query<HTMLSelectElement>('#direction'), compactField = query<HTMLInputElement>('#compact'), quietField = query<HTMLInputElement>('#quiet');
const pages = [...document.querySelectorAll<HTMLButtonElement>('[data-page]')];
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let settled: GlassSnapDeckChange | undefined, selected: Direction = 'form', changes = 0, picks = 0, destroyed = false;
let tourVersion = 0, tourTimers: number[] = [], tourFinish: ((complete: boolean) => void) | undefined, tourStep = '';
const concepts: Record<Direction, { code: string; heading: string; description: string; palette: [string, string, string]; names: [string, string, string] }> = {
  form: { code: 'F / 01', heading: 'Start with useful space.', description: 'Keep the main task obvious and give supporting detail room to breathe.', palette: ['#f3f2e7', '#282b29', '#ff8d78'], names: ['Paper', 'Ink', 'Coral'] },
  colour: { code: 'C / 02', heading: 'Give colour a clear job.', description: 'Use cobalt for one intentional accent, balanced by quiet paper and legible ink.', palette: ['#f3f2e7', '#282b29', '#2859f1'], names: ['Paper', 'Ink', 'Cobalt'] },
  motion: { code: 'M / 03', heading: 'Respond, then settle.', description: 'Keep feedback short and purposeful. This board is static; deck scrolling follows your motion preference.', palette: ['#f3f2e7', '#282b29', '#dce875'], names: ['Paper', 'Ink', 'Citron'] },
};
function render() {
  if (destroyed) return;
  const index = settled?.index ?? -1;
  previous.disabled = !settled?.canPrevious; next.disabled = !settled?.canNext;
  for (const [page, button] of pages.entries()) {
    if (page === index) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    // An all-fit deck has one visible settled view: redundant scroll actions are
    // unavailable rather than pretending a different card became selected.
    button.disabled = index < 0 || page === index || (!settled?.canPrevious && !settled?.canNext);
  }
  const title = index >= 0 ? ['Form', 'Colour', 'Motion'][index] : null;
  query('#settled-status').textContent = title ? String(index + 1).padStart(2, '0') + ' / 03 · ' + title + ' in view' : 'No measurable card yet';
  query('#readback-index').textContent = title ? String(index + 1) + ' / ' + title : 'No measurable card';
  query('#readback-controls').textContent = (settled?.canPrevious ? 'available' : 'disabled') + ' / ' + (settled?.canNext ? 'available' : 'disabled');
  query('#readback-reason').textContent = settled?.reason ?? 'waiting';
  query('#readback-scrollend').textContent = 'onscrollend' in scroller ? 'Event detected' : 'Bounded scroll debounce';
  query('#readback-motion').textContent = systemMotion.matches ? 'OS reduce (authoritative)' : quietField.checked ? 'Explicit quiet / instant' : 'Native smooth requests';
  query('#layout-note').textContent = compactField.checked ? 'Compact cards fit where there is room. Readable narrow-screen overflow keeps native navigation available.' : 'Wide story cards. Selection follows the actual settled view, including native swipes.';
  document.body.dataset.direction = directionField.value;
  document.body.dataset.quiet = String(quietField.checked || systemMotion.matches);
  query('#tour-status').textContent = tourStep ? 'Finite tour / ' + tourStep : 'No automatic rotation';
}
function applyMaterial() {
  const props = getGlassProps({ appearance: 'light', radius: 0, blur: 12, reducedTransparency: false });
  for (const panel of document.querySelectorAll<HTMLElement>('.card-info')) {
    panel.classList.add(props.className);
    for (const [key, value] of Object.entries(props.style)) panel.style.setProperty(key, String(value));
    for (const [key, value] of Object.entries(props)) if (key.startsWith('data-')) panel.setAttribute(key, String(value));
    panel.style.setProperty('--lg-fill-rgb', '243 242 231'); panel.style.setProperty('--lg-ink', '#282b29'); panel.style.setProperty('--lg-solid-fill', '#f3f2e7');
  }
}
applyMaterial();
const options = () => ({ items: cards, reducedMotion: quietField.checked, onChange: (change: GlassSnapDeckChange) => { settled = change; changes++; render(); } });
const controller = attachGlassSnapDeck(scroller, options());
function select(value: Direction) {
  if (!Object.hasOwn(concepts, value) || destroyed) return false;
  selected = value; picks++;
  const concept = concepts[value], board = query('.board-preview'); board.dataset.direction = value;
  query('#board-code').textContent = concept.code; query('#preview-heading').textContent = concept.heading; query('#preview-description').textContent = concept.description;
  for (const [index, suffix] of ['one', 'two', 'three'].entries()) {
    query('#swatch-' + suffix).style.backgroundColor = concept.palette[index];
    query('#colour-' + suffix).textContent = concept.names[index] + ' ' + concept.palette[index].toUpperCase();
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('.choose-direction')) button.setAttribute('aria-pressed', String(button.dataset.direction === value));
  query('#selection-receipt').textContent = value[0].toUpperCase() + value.slice(1) + ' is selected. The board is stored in this page session.';
  return true;
}
function cancelTour() {
  tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = [];
  const complete = tourFinish; tourFinish = undefined; tourStep = ''; complete?.(false); render();
}
function configure(preset: Preset) {
  if (!['story', 'compact', 'rtl', 'quiet'].includes(preset) || destroyed) return false;
  directionField.value = preset === 'rtl' ? 'rtl' : 'ltr'; compactField.checked = preset === 'compact'; quietField.checked = preset === 'quiet';
  scroller.dir = directionField.value; scroller.dataset.layout = compactField.checked ? 'compact' : 'story';
  // Direction and authored card sizing changed: explicitly refresh geometry.
  // update replaces options and synchronizes live reduction in one operation.
  controller.update(options()); render(); return true;
}
function instantStart() {
  // Reset is an explicit host action; temporarily use the controller's reduced
  // policy to return to the first actual view without native smooth carryover.
  controller.update({ ...options(), reducedMotion: true }); controller.goTo(0); controller.update(options());
}
function preset(value: Preset) { cancelTour(); if (!configure(value)) return false; instantStart(); return true; }
function reset() { cancelTour(); configure('story'); instantStart(); select('form'); picks = 0; render(); }
function tour(): Promise<boolean> {
  reset(); const epoch = ++tourVersion; tourStep = '01 / useful space'; render();
  return new Promise(resolve => {
    tourFinish = resolve;
    const at = (delay: number, step: () => void) => { const timer = window.setTimeout(() => { tourTimers = tourTimers.filter(value => value !== timer); if (!destroyed && epoch === tourVersion) step(); }, delay); tourTimers.push(timer); };
    at(1700, () => { controller.goTo(1); select('colour'); tourStep = '02 / purposeful colour'; render(); });
    at(3700, () => { controller.goTo(2); select('motion'); tourStep = '03 / brief feedback'; render(); });
    at(5700, () => { configure('compact'); instantStart(); tourStep = 'compact / actual overflow'; render(); });
    at(7400, () => { configure('rtl'); instantStart(); controller.next(); tourStep = 'RTL / native signed scrolling'; render(); });
    at(10000, () => { tourStep = ''; tourFinish = undefined; render(); resolve(true); });
  });
}
previous.addEventListener('click', () => { cancelTour(); controller.previous(); }); next.addEventListener('click', () => { cancelTour(); controller.next(); });
for (const button of pages) button.addEventListener('click', () => { cancelTour(); controller.goTo(Number(button.dataset.page)); });
for (const button of document.querySelectorAll<HTMLButtonElement>('.choose-direction')) button.addEventListener('click', () => { cancelTour(); select(button.dataset.direction as Direction); });
directionField.addEventListener('change', () => { cancelTour(); scroller.dir = directionField.value; controller.refresh(); render(); });
compactField.addEventListener('change', () => { cancelTour(); scroller.dataset.layout = compactField.checked ? 'compact' : 'story'; controller.refresh(); render(); });
quietField.addEventListener('change', () => { cancelTour(); controller.update(options()); render(); });
systemMotion.addEventListener('change', render);
query('#tour').addEventListener('click', () => { void tour(); }); query('#reset').addEventListener('click', reset);
// An explicit finite recording tour yields immediately to real interaction.
scroller.addEventListener('pointerdown', cancelTour, { passive: true }); scroller.addEventListener('wheel', cancelTour, { passive: true });
scroller.addEventListener('keydown', cancelTour);
const state = () => ({ index: controller.index, canPrevious: controller.canPrevious, canNext: controller.canNext, selected, picks, direction: scroller.dir || 'ltr', compact: compactField.checked, reduced: quietField.checked || systemMotion.matches, systemReduced: systemMotion.matches, reason: settled?.reason ?? null, changes, nativeScrollend: 'onscrollend' in scroller, scrollLeft: scroller.scrollLeft, clientWidth: scroller.clientWidth, scrollWidth: scroller.scrollWidth, authoredCards: cards.map(card => card.id), tourStep, pendingTourSteps: tourTimers.length, focus: document.activeElement?.id || document.activeElement?.tagName || null });
const demo = {
  preset, reset, tour, select,
  goTo(index: number) { cancelTour(); return controller.goTo(index); },
  refresh() { controller.refresh(); render(); }, state,
};
(window as Window & { __deckDemo?: typeof demo }).__deckDemo = demo;
select('form'); picks = 0; render();
window.addEventListener('pagehide', () => { cancelTour(); destroyed = true; controller.destroy(); systemMotion.removeEventListener('change', render); }, { once: true });
