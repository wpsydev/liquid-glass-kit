import { attachGlass, attachGlassIndicator, attachGlassMotion } from '../../src/index.ts';
import type { GlassOptions } from '../../src/index.ts';
import '../../src/styles.css';
import './style.css';
import { gitlabIcon } from '../icons.ts';

const iconNames = {
  play: 'play', pause: 'pause', previous: 'chevron-left', next: 'chevron-right',
  sound: 'volume-up', compass: 'compass', heart: 'heart', close: 'close', check: 'check',
} as const;
const icon = (name: keyof typeof iconNames, size = 22) => gitlabIcon(iconNames[name], size);
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;

document.querySelector('#app')!.innerHTML = `
<div class="paper-ground" aria-hidden="true"></div>
<div class="page lg-safe-area lg-mobile-viewport">
  <header class="mobile-header"><a class="brand" href="https://github.com/wpsydev/liquid-glass-kit"><span class="brand-mark" aria-hidden="true">lg.</span><span>Liquid Glass Kit</span></a><span class="header-tag">EXAMPLE 02 / LISTENING ROOM</span></header>
  <main class="mobile-main">
    <section class="hero"><p class="eyebrow">THE LISTENING ROOM</p><h1>Good music.<br><em>Room to breathe.</em></h1><p class="hero-copy">A considered interface for a slower listen. Glass where it helps. Space where it matters.</p><p class="hero-detail"><span>01</span> A working example of touch controls, spring motion and a native appearance sheet.</p></section>
    <div class="demo-column">
      <section class="app-shell" aria-label="Interactive mobile music interface">
        <div class="app-topline"><span>ARCHIVE / SIDE A</span><button id="mobile-mood" class="mood-button material lg-touch-target" aria-label="Choose appearance" aria-haspopup="dialog">${icon('compass', 16)}<span>Appearance</span></button></div>
        <div class="cover-frame"><div class="cover-art" aria-hidden="true"><div class="cover-record"><div class="cover-sun"></div><div class="cover-ring ring-one"></div><div class="cover-ring ring-two"></div><div class="cover-ring ring-three"></div></div><span class="cover-caption">Slow<br>horizons.</span><span class="cover-number">SUNDAY ARCHIVE<br>STEREO — 33⅓ RPM</span><span class="cover-edition">003</span></div></div>
        <div class="track-copy"><div><p id="mobile-track-kind">LISTEN / AFTER HOURS</p><h2 id="mobile-track-title">Slow horizons</h2><span id="mobile-track-artist">The Sunday Archive</span></div><button id="mobile-save" class="save-button lg-touch-target" aria-label="Save Slow horizons" aria-pressed="false">${icon('heart', 23)}</button></div>
        <div class="track-progress"><label class="visually-hidden" for="mobile-progress">Track position, percent</label><input id="mobile-progress" class="lg-touch-target" type="range" min="0" max="100" value="24" /><div><span id="elapsed">0:58</span><span>4:02</span></div></div>
        <div class="play-controls"><button id="mobile-previous" class="small-control material lg-touch-target" aria-label="Previous track">${icon('previous', 20)}</button><button id="mobile-play" class="play-control material lg-touch-target" aria-label="Play visual music demo" aria-pressed="false">${icon('play', 26)}</button><button id="mobile-next" class="small-control material lg-touch-target" aria-label="Next track">${icon('next', 20)}</button><span class="waveform" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="--bar:${i}"></i>`).join('')}</span></div>
        <nav id="mobile-nav" class="bottom-nav" aria-label="Music sections"><div id="mobile-backing" class="nav-backing"></div><button class="nav-item lg-touch-target" aria-pressed="true">${icon('sound', 20)}<span>Listen</span></button><button class="nav-item lg-touch-target" aria-pressed="false">${icon('compass', 20)}<span>Explore</span></button><button class="nav-item lg-touch-target" aria-pressed="false">${icon('heart', 20)}<span>Saved</span></button></nav>
        <span id="mobile-status" class="safe-area-note" role="status">A visual player demo. No audio playback.</span>
      </section>
      <div id="mobile-caption" class="promo-caption" aria-live="polite"><span class="chapter-number">01 / 04</span><h2>Small details. Clear purpose.</h2><p>Responsive controls. Restrained spring motion.</p></div>
    </div>
  </main>
  <div class="promo-toolbar"><button id="mobile-showcase" class="tour-button lg-touch-target">${icon('play', 15)} Play 12s demo</button><button id="mobile-quiet" class="quiet-button lg-touch-target" aria-pressed="false">Pause motion</button><button id="mobile-solid" class="quiet-button lg-touch-target" aria-pressed="false">Solid material</button><span class="audio-note">Visual music player · no audio playback</span></div>
  <footer class="mobile-footer"><span>INDEPENDENT WEB MATERIAL / MIT LICENSE</span><a href="https://github.com/wpsydev/liquid-glass-kit">wpsydev / liquid-glass-kit ↗</a></footer>
</div>
<dialog id="mobile-sheet" class="mood-sheet material" aria-labelledby="sheet-title"><form method="dialog"><div class="sheet-heading"><div><p>LISTENING ROOM / PREFERENCES</p><h2 id="sheet-title">Appearance</h2></div><button class="sheet-close lg-touch-target" id="sheet-close" type="button" aria-label="Close appearance">${icon('close', 20)}</button></div><label class="playlist-field" for="mobile-playlist-name">Session title<input id="mobile-playlist-name" name="playlist" class="lg-touch-target" type="text" value="Slow horizons" maxlength="32" autocomplete="off" /></label><fieldset><legend class="visually-hidden">Appearance palette</legend><label class="mood-option lg-touch-target"><input type="radio" name="mood" value="peach" checked /><span class="swatch peach-swatch"></span><span><strong>Terracotta</strong><small>Warm paper, rust and ink.</small></span>${icon('check', 20)}</label><label class="mood-option lg-touch-target"><input type="radio" name="mood" value="cyan" /><span class="swatch cyan-swatch"></span><span><strong>Blue note</strong><small>Slate blue and warm paper.</small></span>${icon('check', 20)}</label><label class="mood-option lg-touch-target"><input type="radio" name="mood" value="violet" /><span class="swatch violet-swatch"></span><span><strong>Olive press</strong><small>Olive green and warm paper.</small></span>${icon('check', 20)}</label></fieldset><button id="sheet-done" type="button" class="sheet-done lg-touch-target">Done ${icon('check', 18)}</button><p class="sheet-note">Changes apply immediately.</p></form></dialog>
`;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let quiet = false;
let solid = false;
let playing = false;
let selected = 0;
const savedSessions = new Set([2]);
let sheetGeneration = 0;
let showcaseTimers: number[] = [];
let running = false;
const spring = { stiffness: 300, damping: 25, pressScale: .95, stretch: .012 };
const materialEntries = [...document.querySelectorAll<HTMLElement>('.material')].map(element => {
  const options: GlassOptions = {
    appearance: 'light', variant: 'regular', corner: 'continuous', radius: element.id === 'mobile-sheet' ? 18 : element.id === 'mobile-play' ? 32 : element.id === 'mobile-mood' ? 12 : 24,
    blur: 16, saturation: 1.05, interactive: true,
  };
  return { options, controller: attachGlass(element, options) };
});
const backingOptions: GlassOptions = { appearance: 'light', corner: 'continuous', radius: 14, blur: 18, saturation: 1.05 };
const backing = attachGlass($('mobile-backing'), backingOptions);
const playMotion = attachGlassMotion($('mobile-play'), spring);
const moodMotion = attachGlassMotion($('mobile-mood'), { ...spring, pressScale: .98, stretch: .008 });
const controlMotions = [$('mobile-previous'), $('mobile-next'), $('mobile-save')].map(element => attachGlassMotion(element, { ...spring, pressScale: .97, stretch: .01 }));
const sheetMotion = attachGlassMotion($('mobile-sheet'), { stiffness: 245, damping: 24, pressScale: 1, stretch: 0 });
const indicator = attachGlassIndicator($('mobile-nav'), $('mobile-backing'), { motion: 'spring', stiffness: 300, damping: 22, radius: 14 });
const navButtons = [...document.querySelectorAll<HTMLButtonElement>('.nav-item')];
const tracks = [
  { title: 'Slow horizons', artist: 'The Sunday Archive', kind: 'SESSION 003 / AFTER HOURS' },
  { title: 'Blue note', artist: 'The Blue Hour Sessions', kind: 'SESSION 004 / MORNING SIDE' },
  { title: 'Long way home', artist: 'The Sunday Archive', kind: 'SESSION 002 / SAVED' },
];
function select(index: number) {
  selected = index;
  navButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
  indicator.moveTo(navButtons[index]);
  const track = tracks[index];
  $('mobile-track-title').textContent = track.title;
  $('mobile-track-artist').textContent = track.artist;
  $('mobile-track-kind').textContent = track.kind;
  $('mobile-save').setAttribute('aria-label', `${savedSessions.has(index) ? 'Remove' : 'Save'} ${track.title}${savedSessions.has(index) ? ' from saved sessions' : ''}`);
  document.querySelector('.cover-caption')!.textContent = `${track.title}.`;
  document.querySelector('.cover-edition')!.textContent = ['003', '004', '002'][index];
  $('mobile-status').textContent = savedSessions.has(index) ? 'In your saved sessions.' : 'A visual player demo. No audio playback.';
  $<HTMLInputElement>('mobile-playlist-name').value = track.title;
  $('mobile-save').setAttribute('aria-pressed', String(savedSessions.has(index)));
}
function setPlaying(next: boolean) {
  playing = next;
  document.body.dataset.playing = String(next);
  $('mobile-play').setAttribute('aria-pressed', String(next));
  $('mobile-play').setAttribute('aria-label', next ? 'Pause visual music demo' : 'Play visual music demo');
  $('mobile-play').innerHTML = icon(next ? 'pause' : 'play', 26);
}
function setMood(mood: string) {
  document.body.dataset.mood = mood;
  document.querySelectorAll<HTMLInputElement>('input[name="mood"]').forEach(input => { input.checked = input.value === mood; });
}
function setProgress(value: number) {
  $('mobile-progress').style.setProperty('--progress', `${value}%`);
  $('mobile-progress').setAttribute('aria-valuetext', `${Math.round(value)} percent`);
  $('mobile-progress').setAttribute('value', String(value));
  $<HTMLInputElement>('mobile-progress').value = String(value);
  const seconds = Math.round(242 * value / 100);
  $('elapsed').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
function caption(chapter: number, title: string, copy: string) {
  $('mobile-caption').querySelector('.chapter-number')!.textContent = `0${chapter} / 04`;
  $('mobile-caption').querySelector('h2')!.textContent = title;
  $('mobile-caption').querySelector('p')!.textContent = copy;
  document.body.dataset.chapter = String(chapter);
}
function stopShowcase() {
  showcaseTimers.forEach(window.clearTimeout); showcaseTimers = []; running = false;
  playMotion.release();
}
async function openSheet() {
  ++sheetGeneration;
  const sheet = $<HTMLDialogElement>('mobile-sheet');
  updateSheetViewport();
  if (!sheet.open) sheet.showModal();
  $('mobile-mood').setAttribute('aria-expanded', 'true');
  await sheetMotion.enter();
}
async function closeSheet() {
  const generation = ++sheetGeneration;
  const sheet = $<HTMLDialogElement>('mobile-sheet');
  if (!sheet.open) return;
  if (await sheetMotion.exit() && generation === sheetGeneration && sheet.open) sheet.close();
}
function updateSheetViewport() {
  const viewport = window.visualViewport;
  const available = viewport?.height ?? window.innerHeight;
  const lowerEdge = (viewport?.offsetTop ?? 0) + available;
  const availableWidth = viewport?.width ?? window.innerWidth;
  const sheetWidth = Math.max(0, Math.min(400, availableWidth - 28));
  $('mobile-sheet').style.setProperty('--sheet-height', `${Math.max(0, available - 28)}px`);
  $('mobile-sheet').style.setProperty('--sheet-width', `${sheetWidth}px`);
  $('mobile-sheet').style.setProperty('--sheet-left', `${(viewport?.offsetLeft ?? 0) + (availableWidth - sheetWidth) / 2}px`);
  $('mobile-sheet').style.setProperty('--keyboard-lift', `${Math.max(0, window.innerHeight - lowerEdge)}px`);
}
function applySolid() {
  materialEntries.forEach(({ controller, options }) => controller.update({ ...options, reducedTransparency: solid }));
  backing.update({ ...backingOptions, reducedTransparency: solid });
  $('mobile-solid').setAttribute('aria-pressed', String(solid));
  $('mobile-solid').textContent = solid ? 'Glass material' : 'Solid material';
}
function applyPreferences() {
  const off = quiet || reduced.matches;
  document.body.dataset.quiet = String(off);
  playMotion.update({ ...spring, reducedMotion: off });
  moodMotion.update({ ...spring, pressScale: .98, stretch: .008, reducedMotion: off });
  controlMotions.forEach(controller => controller.update({ ...spring, pressScale: .97, stretch: .01, reducedMotion: off }));
  sheetMotion.update({ stiffness: 245, damping: 24, pressScale: 1, stretch: 0, reducedMotion: off });
  indicator.update({ motion: 'spring', stiffness: 300, damping: 22, radius: 14, reducedMotion: off });
  $('mobile-quiet').setAttribute('aria-pressed', String(off));
  $('mobile-quiet').textContent = off ? 'Resume motion' : 'Pause motion';
}
function humanInteraction() {
  if (!running && !document.body.classList.contains('recording')) return;
  stopShowcase(); document.body.classList.remove('recording');
  document.querySelector('.app-shell')!.classList.remove('compact-preview');
  caption(1, 'Take your time.', 'Explore the controls at your own pace.');
}
$('mobile-play').addEventListener('click', () => { humanInteraction(); setPlaying(!playing); });
$('mobile-save').addEventListener('click', () => {
  humanInteraction();
  const saved = !savedSessions.has(selected);
  if (saved) savedSessions.add(selected); else savedSessions.delete(selected);
  const title = $('mobile-track-title').textContent ?? tracks[selected].title;
  $('mobile-save').setAttribute('aria-pressed', String(saved));
  $('mobile-save').setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${title}${saved ? ' from saved sessions' : ''}`);
  $('mobile-status').textContent = saved ? 'Added to saved sessions.' : 'Removed from saved sessions.';
});
$('mobile-previous').addEventListener('click', () => { humanInteraction(); select((selected + 2) % 3); });
$('mobile-next').addEventListener('click', () => { humanInteraction(); select((selected + 1) % 3); });
navButtons.forEach((button, index) => button.addEventListener('click', () => { humanInteraction(); select(index); }));
$('mobile-progress').addEventListener('input', () => { humanInteraction(); setProgress(Number($<HTMLInputElement>('mobile-progress').value)); });
$('mobile-mood').addEventListener('click', () => { humanInteraction(); void openSheet(); });
$('sheet-close').addEventListener('click', () => { humanInteraction(); void closeSheet(); });
$('sheet-done').addEventListener('click', () => { humanInteraction(); void closeSheet(); });
$('mobile-sheet').addEventListener('close', () => { $('mobile-mood').setAttribute('aria-expanded', 'false'); });
$('mobile-sheet').addEventListener('cancel', () => { humanInteraction(); });
$('mobile-sheet').addEventListener('click', event => { if (event.target === $('mobile-sheet')) { const rect = $('mobile-sheet').getBoundingClientRect(); const pointer = event as MouseEvent; if (pointer.clientX < rect.left || pointer.clientX > rect.right || pointer.clientY < rect.top || pointer.clientY > rect.bottom) void closeSheet(); } });
document.querySelectorAll<HTMLInputElement>('input[name="mood"]').forEach(input => input.addEventListener('change', () => { humanInteraction(); setMood(input.value); }));
$('mobile-solid').addEventListener('click', () => { humanInteraction(); solid = !solid; applySolid(); });
$('mobile-playlist-name').addEventListener('input', () => { humanInteraction(); const name = $<HTMLInputElement>('mobile-playlist-name').value.trim() || tracks[selected].title; $('mobile-track-title').textContent = name; $('mobile-save').setAttribute('aria-label', `${savedSessions.has(selected) ? 'Remove' : 'Save'} ${name}${savedSessions.has(selected) ? ' from saved sessions' : ''}`); document.querySelector('.cover-caption')!.textContent = `${name}.`; });
window.visualViewport?.addEventListener('resize', updateSheetViewport);
window.visualViewport?.addEventListener('scroll', updateSheetViewport);
window.addEventListener('resize', updateSheetViewport);
$('mobile-quiet').addEventListener('click', () => { humanInteraction(); quiet = !quiet; applyPreferences(); });
reduced.addEventListener('change', () => { stopShowcase(); document.body.classList.remove('recording'); document.querySelector('.app-shell')!.classList.remove('compact-preview'); applyPreferences(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopShowcase(); });

function prepareMobileShowcase() {
  stopShowcase(); ++sheetGeneration;
  const sheet = $<HTMLDialogElement>('mobile-sheet');
  if (sheet.open) sheet.close();
  quiet = false; solid = false; applySolid(); applyPreferences();
  document.querySelector('.app-shell')!.classList.remove('compact-preview'); setMood('peach'); setPlaying(false); select(0); setProgress(24);
  document.body.classList.add('recording');
  caption(1, 'Small details. Clear purpose.', 'Responsive controls. Restrained spring motion.');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function runMobileShowcase() {
  prepareMobileShowcase(); running = true;
  const step = (ms: number, action: () => void) => showcaseTimers.push(window.setTimeout(() => { if (!document.hidden) action(); }, ms));
  step(180, () => { playMotion.press(); setPlaying(true); });
  step(650, () => { playMotion.release(); });
  step(1600, () => { setProgress(34); });
  step(3000, () => { caption(2, 'A considered rhythm.', 'Readable type. Generous touch targets.'); select(1); });
  step(3400, () => { select(2); });
  step(3850, () => { select(0); });
  step(4500, () => { select(1); setMood('cyan'); });
  step(6000, () => { caption(3, 'Make room for preference.', 'A native sheet with clear, familiar controls.'); void openSheet(); });
  step(6600, () => { setMood('violet'); });
  step(7800, () => { setMood('peach'); });
  step(8250, () => { void closeSheet(); });
  step(9000, () => { caption(4, 'Every size. Same care.', 'Safe-area layout. Responsive controls.'); document.querySelector('.app-shell')!.classList.add('compact-preview'); setMood('cyan'); select(0); setProgress(64); });
  step(9600, () => { playMotion.press(); });
  step(10100, () => { playMotion.release(); });
  step(10800, () => { document.querySelector('.app-shell')!.classList.remove('compact-preview'); caption(4, 'The details make the difference.', 'Liquid Glass Kit · Open source'); });
  step(12000, () => { running = false; showcaseTimers = []; caption(4, 'Make something worth using.', 'Liquid Glass Kit · Open source'); });
}
$('mobile-showcase').addEventListener('click', runMobileShowcase);
Object.assign(window, { prepareMobileShowcase, runMobileShowcase });
setMood('peach'); setPlaying(false); setProgress(24); select(0); applyPreferences(); applySolid(); updateSheetViewport();
window.addEventListener('pagehide', event => {
  stopShowcase(); document.body.dataset.quiet = 'true';
  if (event.persisted) return;
  sheetMotion.destroy(); moodMotion.destroy(); playMotion.destroy(); controlMotions.forEach(controller => controller.destroy());
  indicator.destroy(); backing.destroy(); materialEntries.forEach(({ controller }) => controller.destroy());
  window.visualViewport?.removeEventListener('resize', updateSheetViewport);
  window.visualViewport?.removeEventListener('scroll', updateSheetViewport);
  window.removeEventListener('resize', updateSheetViewport);
});
window.addEventListener('pageshow', event => { if (event.persisted) applyPreferences(); });
