import { attachGlass, attachGlassIndicator, attachGlassMotion } from '../../src/index.ts';
import '../../src/styles.css';
import '../../src/indicator.css';
import '../../src/motion.css';
import './style.css';

const paths: Record<string, string> = {
  star: '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z"/>',
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-5v-7h-4v7H5a2 2 0 0 1-2-2Z"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  wave: '<path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  moon: '<path d="M20 13.2A8.3 8.3 0 0 1 10.8 4a8.5 8.5 0 1 0 9.2 9.2Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = (name: string, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.star}</svg>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="world" aria-hidden="true"><div class="haze haze-lilac"></div><div class="haze haze-peach"></div><div class="haze haze-blue"></div><div class="ribbon ribbon-one"></div><div class="ribbon ribbon-two"></div><div class="ribbon ribbon-three"></div><div class="world-stars"></div><div class="texture"></div></div>
  <header><a href="https://github.com/wpsydev/liquid-glass-kit" class="brand">${icon('star', 25)}<span>LIQUID GLASS <b>KIT</b></span></a><div class="header-controls"><button id="ambient" aria-pressed="false" aria-label="Pause ambient animation">${icon('pause', 15)}<span>Pause ambient</span></button><button id="motion-toggle" aria-pressed="true"><i class="live-dot"></i><span>Motion on</span></button><a class="source" href="https://github.com/wpsydev/liquid-glass-kit">Source ↗</a></div></header>
  <main>
    <section class="story"><p class="eyebrow"><span></span> A MATERIAL WITH A LITTLE FEELING</p><h1>Glass.<br> <em>In motion.</em></h1><p class="description">Light that follows.<br> Shapes that settle.<br> Controls you almost want to touch.</p><button id="walkthrough" class="walkthrough material">${icon('play', 18)}<span>Play the walkthrough</span><span class="walkthrough-duration">26s</span></button><div class="story-footnote"><span>Independent. Open source.</span><span>Made for the web.</span></div></section>
    <section class="stage" aria-label="Interactive glass motion demo">
      <div class="stage-topline"><span>THE MOTION STUDIO</span><span class="studio-line"></span><span>LIVE INTERFACE</span></div>
      <div class="planet" aria-hidden="true"><div class="planet-shine"></div><div class="planet-rings"></div><div class="planet-core"></div></div>
      <div class="orbit-mark mark-one" aria-hidden="true">✦</div><div class="orbit-mark mark-two" aria-hidden="true">✧</div>
      <div class="studio-window">
        <div class="studio-header"><div class="window-dots" aria-hidden="true"><i></i><i></i><i></i></div><span>A little space to play</span><button id="palette-trigger" class="palette-trigger material" aria-expanded="false" aria-controls="palette-menu"><span>Color mood</span>${icon('plus', 17)}</button></div>
        <div class="workspace"><div class="workspace-kicker">01 / A TACTILE CONTROL</div><button id="tactile" class="tactile material" aria-label="Press and release the glass control"><span class="tactile-halo" aria-hidden="true"></span><span class="tactile-symbol">${icon('star', 37)}</span><span class="tactile-word">Press &amp; release</span><span class="tactile-note">A spring under your fingertips.</span></button><div class="press-caption" id="press-caption" aria-live="polite">Try a gentle press.</div></div>
        <div class="selection-copy"><div><span class="selection-kicker">02 / A MOVING BACKING</span><h2 id="selection-title">A place for your ideas.</h2></div><span class="selection-counter" id="selection-counter">01 — 04</span></div>
        <nav id="dock" class="dock" aria-label="Studio sections"><div id="dock-backing" class="dock-backing"></div><button class="dock-item" data-scene="home" aria-label="Home" aria-pressed="true">${icon('home', 21)}<span>Home</span></button><button class="dock-item" data-scene="layers" aria-label="Layers" aria-pressed="false">${icon('layers', 21)}<span>Layers</span></button><button class="dock-item" data-scene="sound" aria-label="Sound" aria-pressed="false">${icon('wave', 21)}<span>Sound</span></button><button class="dock-item" data-scene="saved" aria-label="Saved" aria-pressed="false">${icon('heart', 21)}<span>Saved</span></button></nav>
      </div>
      <div class="floating-note material"><span class="note-icon">${icon('layers', 19)}</span><div><strong>One material. Many moments.</strong><span>Press · select · appear</span></div><span class="note-spark">${icon('star', 16)}</span></div>
      <div class="stage-caption" id="stage-caption" aria-live="polite"><span class="caption-dot"></span><span>Try the dock. Find your color mood.</span></div>
    </section>
  </main>
  <footer><div class="footer-features"><span>Spring motion</span><i></i><span>Semantic controls</span><i></i><span>Reduced motion</span></div><a href="https://github.com/wpsydev/liquid-glass-kit">wpsydev / liquid-glass-kit ${icon('arrow', 16)}</a></footer>
  <section id="palette-menu" class="palette-menu material" popover="auto" aria-label="Choose a color mood"><div class="palette-heading"><div><span>03 / A FLOATING MENU</span><h2>Set the atmosphere.</h2></div><button id="palette-close" class="close-button" aria-label="Close color mood menu">${icon('close', 19)}</button></div><div class="palette-options"><button data-palette="lilac" aria-pressed="true"><span class="swatch swatch-lilac"></span><div><strong>Lavender haze</strong><small>Soft light, clear thoughts.</small></div><span class="palette-check">✓</span></button><button data-palette="gold" aria-pressed="false"><span class="swatch swatch-gold"></span><div><strong>Golden hour</strong><small>A little warmth goes a long way.</small></div><span class="palette-check">✓</span></button><button data-palette="ocean" aria-pressed="false"><span class="swatch swatch-ocean"></span><div><strong>Ocean bloom</strong><small>Room to breathe.</small></div><span class="palette-check">✓</span></button></div><p class="palette-footnote">A real popover, with a spring entrance.</p></section>
`;

const materialControllers = [...document.querySelectorAll<HTMLElement>('.material')].map(el => attachGlass(el, {
  appearance: 'light', variant: 'regular', blur: el.id === 'tactile' ? 9 : 22, saturation: 1.5,
  radius: el.id === 'tactile' ? 40 : el.id === 'palette-trigger' ? 18 : el.id === 'walkthrough' ? 24 : 29,
  interactive: true,
}));
const backingMaterial = attachGlass($('dock-backing'), { appearance: 'light', variant: 'regular', blur: 18, radius: 23, saturation: 1.8, interactive: false });
const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let userMotionOff = false;
let ambientPaused = false;
let walking = false;
let activeIndex = 0;
let hover = false;
let quietUntil = 0;
let menuGeneration = 0;
let walkthroughTimers: number[] = [];
let ambientTimer = 0;
const springOptions = { stiffness: 260, damping: 22, mass: 1, pressScale: .91, stretch: .04 };
const pressMotion = attachGlassMotion($('tactile'), springOptions);
const triggerMotion = attachGlassMotion($('palette-trigger'), { ...springOptions, pressScale: .95, stretch: .02 });
const menuMotion = attachGlassMotion($('palette-menu'), { ...springOptions, stiffness: 235, damping: 23, pressScale: 1, stretch: 0 });
const indicator = attachGlassIndicator($('dock'), $('dock-backing'), { motion: 'spring', stiffness: 260, damping: 20, mass: 1, radius: 23 });
const dockButtons = [...document.querySelectorAll<HTMLButtonElement>('.dock-item')];
const titles = ['A place for your ideas.', 'Make room for every layer.', 'Find a rhythm that feels right.', 'Keep what moves you.'];
const reducedMotion = () => userMotionOff || mediaQuery.matches;
const interrupted = () => hover || $('stage-caption').closest('.stage')!.contains(document.activeElement) || performance.now() < quietUntil;

function select(index: number) {
  activeIndex = index;
  dockButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  indicator.moveTo(dockButtons[index]);
  $('selection-title').textContent = titles[index];
  $('selection-counter').textContent = `${String(index + 1).padStart(2, '0')} — 04`;
}
function announce(text: string) { $('stage-caption').querySelector('span:last-child')!.textContent = text; }
function setPalette(palette: string) {
  document.body.dataset.palette = palette;
  document.querySelectorAll<HTMLElement>('.palette-options [data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === palette)));
}
function positionMenu() {
  const bounds = $('palette-trigger').getBoundingClientRect();
  const menuWidth = Math.min(310, window.innerWidth - 32);
  const left = Math.max(16, Math.min(window.innerWidth - menuWidth - 16, bounds.right - menuWidth));
  const top = Math.min(bounds.bottom + 13, Math.max(16, window.innerHeight - 350));
  $('palette-menu').style.width = `${menuWidth}px`;
  $('palette-menu').style.left = `${left}px`;
  $('palette-menu').style.top = `${top}px`;
  $('palette-menu').style.transformOrigin = `${Math.min(menuWidth, Math.max(0, bounds.right - left - 21))}px 0px`;
}
const menuOpen = () => $('palette-menu').matches(':popover-open');
async function openMenu() {
  ++menuGeneration;
  positionMenu();
  if (!menuOpen()) $('palette-menu').showPopover();
  $('palette-trigger').setAttribute('aria-expanded', 'true');
  await menuMotion.enter();
}
async function closeMenu() {
  const generation = ++menuGeneration;
  if (!menuOpen()) return;
  const completed = await menuMotion.exit();
  if (completed && generation === menuGeneration && menuOpen()) $('palette-menu').hidePopover();
}
function clearWalkthrough(release = true) {
  walkthroughTimers.forEach(window.clearTimeout);
  walkthroughTimers = [];
  walking = false;
  if (release) pressMotion.release();
  $('walkthrough').querySelector('span')!.textContent = 'Play the walkthrough';
  document.body.classList.remove('walking');
}
function applyMotionPreference() {
  const off = reducedMotion();
  document.body.dataset.motion = off ? 'off' : 'on';
  pressMotion.update({ ...springOptions, reducedMotion: off });
  triggerMotion.update({ ...springOptions, pressScale: .95, stretch: .02, reducedMotion: off });
  menuMotion.update({ ...springOptions, stiffness: 235, damping: 23, pressScale: 1, stretch: 0, reducedMotion: off });
  indicator.update({ motion: 'spring', stiffness: 260, damping: 20, mass: 1, radius: 23, reducedMotion: off });
  $('motion-toggle').setAttribute('aria-pressed', String(!off));
  $('motion-toggle').querySelector('span')!.textContent = off ? 'Motion quiet' : 'Motion on';
  document.body.dataset.ambient = ambientPaused || off ? 'paused' : 'playing';
  scheduleAmbient();
  if (off) announce('The same interface. A quieter pace.');
}
function humanInteraction(release = true) {
  quietUntil = performance.now() + 12000;
  if (walking) { clearWalkthrough(release); announce('Your turn. Explore at your own pace.'); }
}
dockButtons.forEach((button, index) => button.addEventListener('click', () => { humanInteraction(); select(index); }));
$('palette-trigger').addEventListener('click', () => { humanInteraction(); if (menuOpen()) void closeMenu(); else void openMenu(); });
$('palette-close').addEventListener('click', () => { humanInteraction(); void closeMenu(); });
document.querySelectorAll<HTMLButtonElement>('.palette-options button').forEach(button => button.addEventListener('click', () => { humanInteraction(); setPalette(button.dataset.palette!); void closeMenu(); }));
$('palette-menu').addEventListener('toggle', () => { $('palette-trigger').setAttribute('aria-expanded', String(menuOpen())); });
$('tactile').addEventListener('pointerdown', () => { humanInteraction(false); $('press-caption').textContent = 'A little give. A little glow.'; });
$('tactile').addEventListener('pointerup', () => { $('press-caption').textContent = 'And a spring back into place.'; });
$('tactile').addEventListener('blur', () => { $('press-caption').textContent = 'Try a gentle press.'; });
$('tactile').addEventListener('click', () => { humanInteraction(); if (reducedMotion()) $('press-caption').textContent = 'Ready, with less movement.'; });
$('ambient').addEventListener('click', () => {
  ambientPaused = !ambientPaused;
  $('ambient').setAttribute('aria-pressed', String(ambientPaused));
  $('ambient').setAttribute('aria-label', ambientPaused ? 'Resume ambient animation' : 'Pause ambient animation');
  $('ambient').querySelector('span')!.textContent = ambientPaused ? 'Resume ambient' : 'Pause ambient';
  $('ambient').querySelector('svg')!.outerHTML = icon(ambientPaused ? 'play' : 'pause', 15);
  applyMotionPreference();
  if (ambientPaused && walking) clearWalkthrough();
});
$('motion-toggle').addEventListener('click', () => {
  humanInteraction();
  userMotionOff = !userMotionOff;
  applyMotionPreference();
  if (!reducedMotion()) announce('Press, select, and find your color mood.');
});
const stage = document.querySelector<HTMLElement>('.stage')!;
stage.addEventListener('pointerenter', () => { hover = true; });
stage.addEventListener('pointerleave', () => { hover = false; });
window.addEventListener('resize', () => { if (menuOpen()) positionMenu(); });
window.addEventListener('scroll', () => { if (menuOpen()) positionMenu(); }, { passive: true });
mediaQuery.addEventListener('change', () => { clearWalkthrough(); applyMotionPreference(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) clearWalkthrough(); scheduleAmbient(); });
document.addEventListener('pointerdown', event => {
  if (walking && event.target instanceof Node && !$('walkthrough').contains(event.target)) humanInteraction();
}, { capture: true });
$('palette-menu').addEventListener('keydown', event => { if (event.key === 'Escape') humanInteraction(); });

// A small ambient tour pauses whenever the visitor is using the controls.
function scheduleAmbient() {
  window.clearTimeout(ambientTimer);
  ambientTimer = 0;
  if (document.hidden || reducedMotion() || ambientPaused) return;
  ambientTimer = window.setTimeout(() => {
    if (!walking && !interrupted() && !menuOpen()) select((activeIndex + 1) % dockButtons.length);
    scheduleAmbient();
  }, 3800);
}

function runMotionShowcase() {
  clearWalkthrough();
  window.clearTimeout(ambientTimer);
  userMotionOff = false;
  ambientPaused = false;
  $('ambient').setAttribute('aria-pressed', 'false');
  $('ambient').setAttribute('aria-label', 'Pause ambient animation');
  $('ambient').querySelector('span')!.textContent = 'Pause ambient';
  applyMotionPreference();
  if (mediaQuery.matches) { announce('Your device asks for less motion. Explore the controls at your own pace.'); return; }
  walking = true;
  document.body.classList.add('walking');
  $('walkthrough').querySelector('span')!.textContent = 'Walkthrough playing';
  setPalette('lilac'); select(0);
  announce('A real interface, with a little feeling.');
  const step = (ms: number, action: () => void) => walkthroughTimers.push(window.setTimeout(() => { if (!document.hidden) action(); }, ms));
  step(1600, () => { const rect = $('tactile').getBoundingClientRect(); pressMotion.press({ x: rect.width * .75, y: rect.height * .42 }); $('press-caption').textContent = 'A little give. A little glow.'; announce('Press. Feel the shape give a little.'); });
  step(2450, () => { pressMotion.release(); $('press-caption').textContent = 'And a spring back into place.'; });
  step(4100, () => { select(1); announce('One glass backing, following your selection.'); });
  step(5000, () => { select(3); });
  step(5350, () => { select(0); });
  step(5750, () => { select(2); });
  step(7600, () => { announce('A floating menu. A spring entrance.'); void openMenu(); });
  step(11000, () => { setPalette('gold'); announce('Change the atmosphere. Keep the interface.'); });
  step(12900, () => { void closeMenu(); });
  step(14900, () => { select(3); announce('Motion can settle. It can also be quiet.'); });
  step(17500, () => { userMotionOff = true; applyMotionPreference(); select(1); });
  step(18500, () => { const rect = $('tactile').getBoundingClientRect(); pressMotion.press({ x: rect.width / 2, y: rect.height / 2 }); $('press-caption').textContent = 'Same control. Less movement.'; });
  step(19100, () => { pressMotion.release(); select(0); });
  step(20500, () => { userMotionOff = false; applyMotionPreference(); setPalette('ocean'); select(2); announce('Made for the web. Ready for your interface.'); });
  step(22000, () => { void openMenu(); });
  step(23900, () => { void closeMenu(); });
  step(26000, () => { clearWalkthrough(); announce('Open source. Make something that feels alive.'); quietUntil = performance.now() + 8000; });
}
$('walkthrough').addEventListener('click', runMotionShowcase);
(window as unknown as { runMotionShowcase: () => void }).runMotionShowcase = runMotionShowcase;
setPalette('lilac');
select(0);
applyMotionPreference();

// Keep lifecycle teardown correct when a host removes this demo.
window.addEventListener('pagehide', event => {
  clearWalkthrough();
  window.clearTimeout(ambientTimer);
  document.body.dataset.ambient = 'paused';
  if (event.persisted) return;
  menuMotion.destroy(); triggerMotion.destroy(); pressMotion.destroy(); indicator.destroy(); backingMaterial.destroy();
  materialControllers.forEach(controller => controller.destroy());
});
window.addEventListener('pageshow', event => { if (event.persisted) applyMotionPreference(); });
