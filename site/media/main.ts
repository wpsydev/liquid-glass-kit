import { createGlassMediaCoordinator } from '../../src/ambient-media.js';
import type { GlassMediaState } from '../../src/ambient-media.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const films = [
  { id: 'dock', title: 'Orbit / magnetic dock', note: 'Small controls, generous movement.', file: 'dock-showcase.mp4', cover: 'dock-showcase.png', group: 'INTERACTION / 01' },
  { id: 'scroll', title: 'A quieter entrance', note: 'Native scroll progress, with fallbacks.', file: 'scroll-reveal-showcase.mp4', cover: 'scroll-reveal-showcase.png', group: 'STORY / 02' },
  { id: 'contract', title: 'Give the agent some taste', note: 'One contract, three original directions.', file: 'design-contract-showcase.mp4', cover: 'design-contract-showcase.png', group: 'AUTHORING / 03' },
  { id: 'activity', title: 'A place for session context', note: 'Host-confirmed state, kept in view.', file: 'activity-island-showcase.mp4', cover: 'activity-island-showcase.png', group: 'WORKSPACE / 04' },
  { id: 'caustics', title: 'A study in moving light', note: 'An experimental owned-scene effect.', file: 'caustics-showcase.mp4', cover: 'media-glass.webp', group: 'LIGHT / 05' },
  { id: 'micro', title: 'The small things', note: 'Finite interaction transitions.', file: 'micro-motion-showcase.mp4', cover: 'composer-reading-surface.webp', group: 'DETAIL / 06' },
] as const;
type FilmId = typeof films[number]['id'];
type Trigger = 'manual' | 'visible' | 'hover';
type Handle = ReturnType<ReturnType<typeof createGlassMediaCoordinator>['attach']>;
type Card = { video: HTMLVideoElement; element: HTMLElement; handle?: Handle; state: GlassMediaState; reason: string };
const asset = (file: string) => '../docs/campaign/assets/' + file;
const cards = new Map<FilmId, Card>();
let quiet = false, saving = false, controller = createGlassMediaCoordinator(), released: FilmId | null = null, fullRevision = 0, sceneEpoch = 0;
let tourTimers: number[] = [], touring = false;
const cancelTour = () => { tourTimers.forEach(window.clearTimeout); tourTimers = []; touring = false; query('#tour').textContent = 'Play 11s tour'; };
const full = query<HTMLVideoElement>('#full-player'), dialog = query<HTMLDialogElement>('#player-dialog');
const trigger = () => query<HTMLSelectElement>('#policy').value as Trigger;
const maxActive = () => Number(query<HTMLSelectElement>('#budget').value);
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = '') => { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; };
const quality = (video: HTMLVideoElement) => {
  if (typeof video.getVideoPlaybackQuality !== 'function') return 'frame counters unavailable';
  try { const value = video.getVideoPlaybackQuality(); return value.totalVideoFrames + ' total / ' + value.droppedVideoFrames + ' dropped frames'; }
  catch { return 'frame counters unavailable'; }
};
const refresh = () => {
  const stats = controller.stats;
  query('#active').textContent = stats.ownedActive + ' / ' + stats.maxActive; query('#pending').textContent = String(stats.pending); query('#playing').textContent = String(stats.playing);
  query('#activity-dot').dataset.active = String(stats.ownedActive > 0);
  for (const [id, card] of cards) {
    card.element.dataset.state = card.state; card.element.querySelector('[data-state]')!.textContent = card.state === 'user-owned' ? 'viewer owned' : card.state;
    const selected = card.video.currentSrc ? card.video.currentSrc.split('/').at(-1)! : 'not selected';
    card.element.querySelector('[data-source]')!.textContent = 'source: ' + selected;
    card.element.querySelector('[data-quality]')!.textContent = quality(card.video);
    const duration = Number.isFinite(card.video.duration) ? card.video.duration.toFixed(1) + 's' : 'original film';
    card.element.querySelector('[data-duration]')!.textContent = duration;
    card.element.querySelector<HTMLButtonElement>('[data-request]')!.textContent = card.state === 'playing' || card.state === 'requesting' ? 'Pause preview' : 'Play preview';
    card.element.querySelector('[data-reason]')!.textContent = card.state === 'blocked' || card.state === 'unsupported' ? card.reason : '';
    if (released === id) card.element.querySelector<HTMLButtonElement>('[data-request]')!.disabled = dialog.open;
  }
};
const attach = (id: FilmId) => {
  const card = cards.get(id)!;
  card.state = 'idle'; card.reason = '';
  card.handle = controller.attach(card.video, { trigger: trigger(), onState(state, detail) { card.state = state; card.reason = detail.reason; queueMicrotask(refresh); } });
  card.state = card.handle.state;
};
const request = async (id: FilmId) => {
  const epoch = sceneEpoch;
  const card = cards.get(id); if (!card?.handle) throw new TypeError('Unknown original film');
  const started = await card.handle.request(); if (epoch !== sceneEpoch) return false; refresh();
  if (!started) query('#message').textContent = quiet || saving ? 'Ambient playback is paused by the selected saving preference. Native full playback remains available.' : card.reason || 'Preview was not started. A full player is available through Watch film.';
  else query('#message').textContent = '';
  return started;
};
const release = (id: FilmId) => {
  const card = cards.get(id); if (!card?.handle) throw new TypeError('Unknown original film');
  card.handle.release();
  // The host owns this thumbnail now and stops it before opening a separate
  // full player. The coordinator never claims that player.
  card.video.pause(); refresh();
};
const watch = (id: FilmId) => {
  const film = films.find(item => item.id === id); if (!film) throw new TypeError('Unknown original film');
  release(id); released = id; query('#player-title').textContent = film.title; full.src = asset(film.file); full.poster = asset(film.cover);
  query('#player-note').textContent = 'Native controls remain yours. This player is outside the ambient preview budget.';
  try { dialog.showModal(); }
  catch { dialog.setAttribute('open', ''); query('#player-note').textContent = 'This browser did not open a native modal. Use the visible native media controls; preview ownership remains released.'; }
  const revision = ++fullRevision;
  const rejected = () => { if (revision === fullRevision) query('#player-note').textContent = 'Playback was not started. Use the native play control to try again; the player remains user-owned.'; };
  try { void Promise.resolve(full.play()).catch(rejected); } catch { rejected(); }
  refresh();
};
for (const film of films) {
  const element = document.createElement('article'); element.className = 'film-card'; element.dataset.film = film.id;
  const frame = document.createElement('div'); frame.className = 'film-frame';
  const video = document.createElement('video'); video.src = asset(film.file); video.poster = asset(film.cover); video.preload = 'none'; video.muted = true; video.playsInline = true; video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
  const cover = document.createElement('img'); cover.alt = ''; cover.loading = 'lazy'; cover.decoding = 'async'; cover.className = 'cover'; cover.src = asset(film.cover);
  const label = node('span', 'idle', 'state-label'); label.dataset.state = ''; const duration = node('span', 'original film', 'duration'); duration.dataset.duration = '';
  frame.append(video, cover, label, duration);
  const caption = document.createElement('div'); caption.className = 'film-caption';
  const material = getGlassProps({ appearance: 'dark', radius: 12, blur: 12 });
  caption.classList.add(material.className);
  for (const [key, value] of Object.entries(material.style)) caption.style.setProperty(key, value);
  for (const [key, value] of Object.entries(material)) if (key !== 'style' && key !== 'className') caption.setAttribute(key, value as string);
  caption.style.setProperty('--lg-fill-rgb', '28 33 25'); caption.style.setProperty('--lg-solid-fill', '#1c2119'); caption.style.setProperty('--lg-ink', '#d7ddc8');
  caption.append(node('p', film.group, 'film-group'), node('h2', film.title), node('p', film.note, 'film-note'));
  const actions = document.createElement('div'); actions.className = 'film-actions';
  const preview = node('button', 'Play preview'); preview.type = 'button'; preview.dataset.request = ''; preview.addEventListener('click', () => { const card = cards.get(film.id)!; if (card.state === 'playing' || card.state === 'requesting') { card.handle!.pause(); refresh(); } else void request(film.id); });
  const watchButton = node('button', 'Watch film ↗'); watchButton.type = 'button'; watchButton.addEventListener('click', () => watch(film.id)); actions.append(preview, watchButton);
  const evidence = document.createElement('div'); evidence.className = 'media-evidence'; const source = node('span', 'source: not selected'); source.dataset.source = ''; const frames = node('span', 'frame counters unavailable'); frames.dataset.quality = ''; evidence.append(source, frames);
  const reason = node('p', '', 'card-reason'); reason.dataset.reason = ''; caption.append(actions, evidence, reason); element.append(frame, caption);
  cards.set(film.id, { video, element, state: 'idle', reason: '' }); query('#gallery').append(element);
  for (const event of ['loadedmetadata', 'timeupdate', 'pause', 'playing', 'error']) video.addEventListener(event, refresh);
}
const rebuild = () => {
  sceneEpoch++;
  controller.destroy();
  for (const card of cards.values()) { card.video.pause(); card.element.querySelector<HTMLButtonElement>('[data-request]')!.disabled = false; }
  controller = createGlassMediaCoordinator({ maxActive: maxActive(), reducedMotion: quiet, saveData: saving });
  for (const film of films) attach(film.id);
  query('#policy-note').textContent = trigger() === 'manual' ? 'Manual requests only. No policy starts a preview.' : trigger() === 'visible' ? 'Visible previews explicitly opted in; slots include pending requests.' : 'Hover explicitly opted in. Touch users can request a preview.';
  query('#message').textContent = ''; refresh();
};
const preferences = () => {
  query('#quiet').setAttribute('aria-pressed', String(quiet)); query('#saving').setAttribute('aria-pressed', String(saving));
  controller.update({ maxActive: maxActive(), reducedMotion: quiet, saveData: saving }); refresh();
};
query('#policy').addEventListener('change', rebuild); query('#budget').addEventListener('change', preferences);
query('#quiet').addEventListener('click', () => { quiet = !quiet; preferences(); });
query('#saving').addEventListener('click', () => { saving = !saving; preferences(); });
const finishClose = () => {
  fullRevision++; full.pause();
  if (released) { const id = released; released = null; cards.get(id)!.handle?.destroy(); attach(id); cards.get(id)!.element.querySelector<HTMLButtonElement>('[data-request]')!.disabled = false; refresh(); }
};
const closePlayer = () => {
  try { if (typeof dialog.close === 'function') { dialog.close(); return; } } catch { /* native-dialog fallback */ }
  dialog.removeAttribute('open'); finishClose();
};
const reset = () => {
  cancelTour();
  if (dialog.open) closePlayer(); query<HTMLSelectElement>('#policy').value = 'manual'; query<HTMLSelectElement>('#budget').value = '1'; quiet = false; saving = false; preferences(); rebuild();
};
query('#reset').addEventListener('click', reset);
const tour = () => {
  reset(); touring = true; query('#tour').textContent = 'Stop tour';
  const steps: [number, () => void][] = [
    [350, () => { void request('dock'); }],
    [2200, () => { void request('scroll'); }],
    [3600, () => { query<HTMLSelectElement>('#budget').value = '2'; preferences(); void request('scroll'); }],
    [5500, () => { saving = true; preferences(); }],
    [6900, () => { saving = false; preferences(); void request('activity'); }],
    [8400, () => { watch('contract'); }],
    [10200, closePlayer], [11200, cancelTour],
  ];
  tourTimers = steps.map(([delay, action]) => window.setTimeout(action, delay));
};
query('#tour').addEventListener('click', () => touring ? cancelTour() : tour());
for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, e => { if (!(e.target as HTMLElement)?.closest('#tour')) cancelTour(); }, { capture: true });
query('#close-player').addEventListener('click', closePlayer);
dialog.addEventListener('close', finishClose);
window.addEventListener('pagehide', () => { controller.destroy(); full.pause(); }, { once: true });
Object.assign(window, { __mediaDemo: { preset(id: 'manual' | 'visible' | 'hover' | 'quiet' | 'saving') {
  if (!['manual', 'visible', 'hover', 'quiet', 'saving'].includes(id)) throw new TypeError('Unknown media policy fixture');
  query<HTMLSelectElement>('#policy').value = id === 'quiet' || id === 'saving' ? 'visible' : id; quiet = id === 'quiet'; saving = id === 'saving'; preferences(); rebuild();
}, request, release, reset, watch, refresh, tour, cancel: cancelTour, get state() { return { policy: trigger(), quiet, saving, touring, stats: controller.stats,
  cards: films.map(film => { const card = cards.get(film.id)!; return { id: film.id, state: card.state, paused: card.video.paused, currentSrc: card.video.currentSrc, quality: quality(card.video), reason: card.reason }; }), fullPlayer: { open: dialog.open, paused: full.paused, controls: full.controls } }; } } });
for (const film of films) attach(film.id); refresh();
