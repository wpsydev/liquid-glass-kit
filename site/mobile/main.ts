import { attachGlass, attachGlassIndicator, attachGlassMotion } from '../../src/index.ts';
import type { GlassOptions } from '../../src/index.ts';
import '../../src/styles.css';
import './style.css';

const paths: Record<string, string> = {
  sparkle: '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z"/>',
  play: '<path d="m9 5 10 7-10 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  previous: '<path d="M5 5v14m14-14L8 12l11 7Z"/>',
  next: '<path d="M19 5v14M5 5l11 7-11 7Z"/>',
  sound: '<path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
};
const icon = (name: string, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.sparkle}</svg>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;

document.querySelector('#app')!.innerHTML = `
<div class="aurora" aria-hidden="true"><div class="aurora-orb peach"></div><div class="aurora-orb cyan"></div><div class="aurora-orb violet"></div><div class="aurora-grain"></div></div>
<div class="page lg-safe-area lg-mobile-viewport">
  <header class="mobile-header"><a class="brand" href="https://github.com/wpsydev/liquid-glass-kit">${icon('sparkle', 21)}<span>LIQUID GLASS KIT</span></a><span class="header-tag"><i></i> LIVE ON THE WEB</span></header>
  <main class="mobile-main">
    <section class="hero"><p class="eyebrow">A LITTLE FEELING. EVERYWHERE.</p><h1>Glass, <br><em>on the go.</em></h1><p class="hero-copy">Made for thumbs. <br>Built for your next idea.</p><div class="hero-tags"><span>Safe areas</span><span>44px targets</span><span>Spring motion</span></div></section>
    <div class="demo-column">
      <section class="app-shell" aria-label="Interactive mobile music interface">
        <div class="app-topline"><span><i></i> YOUR DAILY RESET</span><button id="mobile-mood" class="mood-button material lg-touch-target" aria-label="Choose a color mood" aria-haspopup="dialog">${icon('sparkle', 17)}<span>Color mood</span></button></div>
        <div class="cover-frame"><div class="cover-art" aria-hidden="true"><div class="cover-sun"></div><div class="cover-ring ring-one"></div><div class="cover-ring ring-two"></div><div class="cover-ring ring-three"></div><div class="cover-arc"></div><span class="cover-caption">SLOW<br>HORIZONS</span><span class="cover-number">VOL. 03</span></div></div>
        <div class="track-copy"><div><p id="mobile-track-kind">LISTEN / AFTER HOURS</p><h2 id="mobile-track-title">Slow horizons</h2><span id="mobile-track-artist">The Sunday Archive</span></div><button id="mobile-save" class="save-button lg-touch-target" aria-label="Save Slow horizons" aria-pressed="false">${icon('heart', 23)}</button></div>
        <div class="track-progress"><label class="visually-hidden" for="mobile-progress">Track position, percent</label><input id="mobile-progress" class="lg-touch-target" type="range" min="0" max="100" value="24" /><div><span id="elapsed">0:58</span><span>4:02</span></div></div>
        <div class="play-controls"><button id="mobile-previous" class="small-control material lg-touch-target" aria-label="Previous track">${icon('previous', 20)}</button><button id="mobile-play" class="play-control material lg-touch-target" aria-label="Play visual music demo" aria-pressed="false">${icon('play', 26)}</button><button id="mobile-next" class="small-control material lg-touch-target" aria-label="Next track">${icon('next', 20)}</button><span class="waveform" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="--bar:${i}"></i>`).join('')}</span></div>
        <nav id="mobile-nav" class="bottom-nav" aria-label="Music sections"><div id="mobile-backing" class="nav-backing"></div><button class="nav-item lg-touch-target" aria-pressed="true">${icon('sound', 20)}<span>Listen</span></button><button class="nav-item lg-touch-target" aria-pressed="false">${icon('compass', 20)}<span>Explore</span></button><button class="nav-item lg-touch-target" aria-pressed="false">${icon('heart', 20)}<span>Saved</span></button></nav>
        <span class="safe-area-note">A little space for every thumb.</span>
      </section>
      <div id="mobile-caption" class="promo-caption" aria-live="polite"><span class="chapter-number">01 / 04</span><h2>Touch that feels alive.</h2><p>Real controls. Spring feedback.</p></div>
    </div>
  </main>
  <div class="promo-toolbar"><button id="mobile-showcase" class="tour-button lg-touch-target">${icon('play', 15)} Play 12s demo</button><button id="mobile-quiet" class="quiet-button lg-touch-target" aria-pressed="false">Pause motion</button><button id="mobile-solid" class="quiet-button lg-touch-target" aria-pressed="false">Solid material</button><span class="audio-note">Visual music player · no audio playback</span></div>
  <footer class="mobile-footer"><span>MIT · OPEN SOURCE · ZERO CORE DEPENDENCIES</span><a href="https://github.com/wpsydev/liquid-glass-kit">wpsydev / liquid-glass-kit ↗</a></footer>
</div>
<dialog id="mobile-sheet" class="mood-sheet material" aria-labelledby="sheet-title"><form method="dialog"><div class="sheet-heading"><div><p>YOUR INTERFACE. YOUR ATMOSPHERE.</p><h2 id="sheet-title">Make it your mood.</h2></div><button class="sheet-close lg-touch-target" id="sheet-close" type="button" aria-label="Close color mood">${icon('close', 20)}</button></div><label class="playlist-field" for="mobile-playlist-name">Playlist name<input id="mobile-playlist-name" name="playlist" class="lg-touch-target" type="text" value="Slow horizons" maxlength="32" autocomplete="off" /></label><fieldset><legend class="visually-hidden">Color mood</legend><label class="mood-option lg-touch-target"><input type="radio" name="mood" value="peach" checked /><span class="swatch peach-swatch"></span><span><strong>Peach glow</strong><small>A warmer kind of calm.</small></span>${icon('check', 20)}</label><label class="mood-option lg-touch-target"><input type="radio" name="mood" value="cyan" /><span class="swatch cyan-swatch"></span><span><strong>Ocean air</strong><small>A little room to breathe.</small></span>${icon('check', 20)}</label><label class="mood-option lg-touch-target"><input type="radio" name="mood" value="violet" /><span class="swatch violet-swatch"></span><span><strong>Violet hour</strong><small>Stay a little longer.</small></span>${icon('check', 20)}</label></fieldset><button id="sheet-done" type="button" class="sheet-done lg-touch-target">Looks good ${icon('check', 18)}</button><p class="sheet-note">Native dialog. Familiar keyboard and touch controls.</p></form></dialog>
`;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let quiet = false;
let solid = false;
let playing = false;
let selected = 0;
let sheetGeneration = 0;
let showcaseTimers: number[] = [];
let running = false;
const spring = { stiffness: 270, damping: 21, pressScale: .90, stretch: .035 };
const materialEntries = [...document.querySelectorAll<HTMLElement>('.material')].map(element => {
  const options: GlassOptions = {
    appearance: 'light', variant: 'regular', corner: 'continuous', radius: element.id === 'mobile-sheet' ? 30 : element.id === 'mobile-play' ? 32 : 24,
    blur: 16, saturation: 1.6, interactive: true,
  };
  return { options, controller: attachGlass(element, options) };
});
const backingOptions: GlassOptions = { appearance: 'light', corner: 'continuous', radius: 20, blur: 18, saturation: 1.6 };
const backing = attachGlass($('mobile-backing'), backingOptions);
const playMotion = attachGlassMotion($('mobile-play'), spring);
const moodMotion = attachGlassMotion($('mobile-mood'), { ...spring, pressScale: .95, stretch: .02 });
const controlMotions = [$('mobile-previous'), $('mobile-next'), $('mobile-save')].map(element => attachGlassMotion(element, { ...spring, pressScale: .92, stretch: .025 }));
const sheetMotion = attachGlassMotion($('mobile-sheet'), { stiffness: 245, damping: 24, pressScale: 1, stretch: 0 });
const indicator = attachGlassIndicator($('mobile-nav'), $('mobile-backing'), { motion: 'spring', stiffness: 300, damping: 22, radius: 20 });
const navButtons = [...document.querySelectorAll<HTMLButtonElement>('.nav-item')];
const tracks = [
  { title: 'Slow horizons', artist: 'The Sunday Archive', kind: 'LISTEN / AFTER HOURS' },
  { title: 'Ocean air', artist: 'The Blue Hour Sessions', kind: 'EXPLORE / NEW HORIZONS' },
  { title: 'Golden things', artist: 'Your saved little moments', kind: 'SAVED / KEEP THE FEELING' },
];
function select(index: number) {
  selected = index;
  navButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
  indicator.moveTo(navButtons[index]);
  const track = tracks[index];
  $('mobile-track-title').textContent = track.title;
  $('mobile-track-artist').textContent = track.artist;
  $('mobile-track-kind').textContent = track.kind;
  $('mobile-save').setAttribute('aria-label', `Save ${track.title}`);
  $<HTMLInputElement>('mobile-playlist-name').value = track.title;
  $('mobile-save').setAttribute('aria-pressed', String(index === 2));
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
  moodMotion.update({ ...spring, pressScale: .95, stretch: .02, reducedMotion: off });
  controlMotions.forEach(controller => controller.update({ ...spring, pressScale: .92, stretch: .025, reducedMotion: off }));
  sheetMotion.update({ stiffness: 245, damping: 24, pressScale: 1, stretch: 0, reducedMotion: off });
  indicator.update({ motion: 'spring', stiffness: 300, damping: 22, radius: 20, reducedMotion: off });
  $('mobile-quiet').setAttribute('aria-pressed', String(off));
  $('mobile-quiet').textContent = off ? 'Resume motion' : 'Pause motion';
}
function humanInteraction() {
  if (!running && !document.body.classList.contains('recording')) return;
  stopShowcase(); document.body.classList.remove('recording');
  document.querySelector('.app-shell')!.classList.remove('compact-preview');
  caption(1, 'Your turn. Make it move.', 'Explore at your own pace.');
}
$('mobile-play').addEventListener('click', () => { humanInteraction(); setPlaying(!playing); });
$('mobile-save').addEventListener('click', () => { humanInteraction(); $('mobile-save').setAttribute('aria-pressed', String($('mobile-save').getAttribute('aria-pressed') !== 'true')); });
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
$('mobile-playlist-name').addEventListener('input', () => { humanInteraction(); const name = $<HTMLInputElement>('mobile-playlist-name').value.trim() || tracks[selected].title; $('mobile-track-title').textContent = name; $('mobile-save').setAttribute('aria-label', `Save ${name}`); });
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
  caption(1, 'Touch that feels alive.', 'Real controls. Spring feedback.');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function runMobileShowcase() {
  prepareMobileShowcase(); running = true;
  const step = (ms: number, action: () => void) => showcaseTimers.push(window.setTimeout(() => { if (!document.hidden) action(); }, ms));
  step(180, () => { playMotion.press(); setPlaying(true); });
  step(650, () => { playMotion.release(); });
  step(1600, () => { setProgress(34); });
  step(3000, () => { caption(2, 'Curves, made for mobile.', '44px targets. Safe-area layout.'); select(1); });
  step(3400, () => { select(2); });
  step(3850, () => { select(0); });
  step(4500, () => { select(1); setMood('cyan'); });
  step(6000, () => { caption(3, 'Sheets that spring to life.', 'A native dialog. A little motion.'); void openSheet(); });
  step(6600, () => { setMood('violet'); });
  step(7800, () => { setMood('peach'); });
  step(8250, () => { void closeSheet(); });
  step(9000, () => { caption(4, 'Mobile by design.', 'Safe areas. 44px targets. 320px reflow.'); document.querySelector('.app-shell')!.classList.add('compact-preview'); setMood('cyan'); select(0); setProgress(64); });
  step(9600, () => { playMotion.press(); });
  step(10100, () => { playMotion.release(); });
  step(10800, () => { document.querySelector('.app-shell')!.classList.remove('compact-preview'); caption(4, 'Your app. Your material.', 'React · Vue · Svelte · vanilla'); });
  step(12000, () => { running = false; showcaseTimers = []; caption(4, 'Make something that feels alive.', 'Open source. Start with Liquid Glass Kit.'); });
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
