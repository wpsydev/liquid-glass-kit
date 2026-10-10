import { attachGlass, attachGlassIndicator, attachGlassMotion } from '../../src/index.ts';
import { attachGlassScene } from '../../src/scene.ts';
import '../../src/styles.css';
import './style.css';

const icon = (name: string, size = 20) => {
  const paths: Record<string, string> = {
    play: '<path d="m9 5 11 7-11 7Z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    arrow: '<path d="M5 19 19 5M5 5h14v14"/>', sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
    lens: '<rect x="4" y="4" width="16" height="16" rx="6"/><path d="M8 8h1M15 16h1"/>',
    wave: '<path d="M2 12c3-10 5 10 8 0s5 10 8 0 4 0 4 0"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 6-5 12 0 18 5-6 5-12 0-18Z"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.sparkle}</svg>`;
};
const $ = (id: string) => document.getElementById(id)!;
document.body.dataset.palette = 'neon';
$('app').innerHTML = `
  <canvas id="optics-canvas" aria-hidden="true"></canvas>
  <div class="css-wallpaper" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>
  <div class="page">
    <header class="site-header"><a class="brand" href="../">${icon('lens', 24)}<span>LIQUID GLASS <b>KIT</b></span></a><span class="edition">EXPERIMENT / 004</span><a class="source" href="https://github.com/wpsydev/liquid-glass-kit">Get the source ${icon('arrow', 15)}</a></header>
    <main>
      <section class="hero" aria-labelledby="headline"><div class="eyebrow"><span class="status-dot"></span><span>REAL-TIME SCENE OPTICS</span><span class="eyebrow-line"></span></div><h1 id="headline">BEND<br>THE <em>LIGHT.</em></h1><p class="hero-copy">The background moves.<br>The glass bends it.<br><strong>Your interface stays sharp.</strong></p><button id="showcase" class="showcase surface">${icon('play', 19)}<span>Play the light show</span><span class="duration">24s</span></button><p class="hero-note">Open source. Zero core dependencies.</p></section>
      <section class="experiment" aria-label="Interactive scene refraction experiment"><div class="experiment-label"><span>01 / A WINDOW INTO THE LIGHT</span><span class="live-dot">LIVE</span></div><div id="lens-stage" class="lens-stage"><div class="orbit orbit-one" aria-hidden="true"></div><div class="orbit orbit-two" aria-hidden="true"></div><div id="lens" class="lens surface"><button id="drag-handle" class="drag-handle" aria-label="Move the glass lens. Drag, or use arrow keys."><span class="grip" aria-hidden="true">⠿</span><span>DRAG THE GLASS</span><span class="drag-arrow">↗</span></button><div class="lens-mark" aria-hidden="true">✳</div><div class="lens-bottom"><span class="lens-title">Stay curious.</span><span class="lens-index">01<br><small>LIQUID / WEB</small></span></div></div><span class="axis axis-x" aria-hidden="true">X +</span><span class="axis axis-y" aria-hidden="true">Y +</span></div><div class="experiment-caption"><span id="chapter">Same screen coordinates. Bent at the edge.</span><span id="renderer-label">Preparing the scene…</span></div></section>
      <section class="lab-strip" aria-label="Experiment controls"><div class="strip-label"><span class="tiny-kicker">02 / SPRING SELECTION</span><strong>Pick your wavelength.</strong></div><nav id="dock" class="dock" aria-label="Wallpaper palette"><div id="dock-backing" class="dock-backing surface"></div><button data-palette="neon" aria-pressed="true">${icon('sparkle', 21)}<span>Neon</span></button><button data-palette="sunset" aria-pressed="false">${icon('wave', 21)}<span>Sunset</span></button><button data-palette="ocean" aria-pressed="false">${icon('globe', 21)}<span>Ocean</span></button></nav><div class="control-grid"><button id="lensing" aria-pressed="true">${icon('lens', 17)}<span>Lens on</span></button><button id="ambient" aria-pressed="false">${icon('pause', 16)}<span>Pause</span></button><button id="quiet" aria-pressed="false">${icon('wave', 17)}<span>Motion on</span></button><button id="solid" aria-pressed="false">${icon('grid', 16)}<span>Solid off</span></button></div></section>
    </main>
    <footer><p>EXPERIMENTAL WEBGL · OWNED SCENE ONLY<br><span>Refraction samples this generated wallpaper, not arbitrary DOM.</span></p><a href="https://x.com/okandogubudak/status/2108947960621146517">Screen-space idea inspired by @okandogubudak ${icon('arrow', 12)}</a></footer>
    <div class="sr-only" id="announcement" role="status" aria-live="polite"></div>
  </div>`;

type Palette = 'neon' | 'sunset' | 'ocean';
let palette: Palette = 'neon';
let paused = false, quiet = false, solid = false, lensing = true;
let selected = 0;
let timers: number[] = [];
let frame = 0, disposed = false;
let lensPosition = { x: 0, y: 0 };
let dragging: { id: number; x: number; y: number; originX: number; originY: number } | null = null;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const transparencyPreference = window.matchMedia('(prefers-reduced-transparency: reduce)');
const contrastPreference = window.matchMedia('(prefers-contrast: more)');
const forcedPreference = window.matchMedia('(forced-colors: active)');
const noMotion = () => quiet || motionPreference.matches;
const opaque = () => solid || transparencyPreference.matches || contrastPreference.matches || forcedPreference.matches;
const surfaces = [
  { element: $('lens'), radius: 48, refraction: 25 },
  { element: $('dock-backing'), radius: 24, refraction: 17 },
  { element: $('showcase'), radius: 26, refraction: 18 },
];
const material = surfaces.map(({ element, radius }) => attachGlass(element, { appearance: 'dark', variant: 'clear', radius, blur: 14, opacity: .85 }));
const lensMotion = attachGlassMotion($('lens'), { pressScale: .95, stretch: .035, damping: 22 });
const playMotion = attachGlassMotion($('showcase'), { pressScale: .95, damping: 22 });
const indicator = attachGlassIndicator($('dock'), $('dock-backing'), { motion: 'spring', stiffness: 280, damping: 21, radius: 24 });
const scene = attachGlassScene($('optics-canvas') as HTMLCanvasElement, sceneOptions());
const dockButtons = [...document.querySelectorAll<HTMLButtonElement>('#dock button')];
function sceneOptions() {
  return { surfaces: surfaces.map(surface => ({ ...surface, refraction: lensing ? surface.refraction : 0 })), palette, paused, reducedMotion: noMotion(), reducedTransparency: opaque(), maxDpr: 1 };
}
function sync() {
  document.body.dataset.palette = palette;
  document.body.dataset.renderer = scene.supported && !opaque() ? 'scene' : 'css';
  document.body.dataset.motion = noMotion() ? 'quiet' : 'on';
  document.body.dataset.paused = paused ? 'true' : 'false';
  document.body.dataset.solid = opaque() ? 'true' : 'false';
  scene.update(sceneOptions());
  material.forEach((controller, index) => controller.update({ appearance: 'dark', variant: 'clear', radius: surfaces[index].radius, blur: 14, opacity: .85, reducedTransparency: opaque() }));
  lensMotion.update({ pressScale: .95, stretch: .035, damping: 22, reducedMotion: noMotion() });
  playMotion.update({ pressScale: .95, damping: 22, reducedMotion: noMotion() });
  indicator.update({ motion: 'spring', stiffness: 280, damping: 21, radius: 24, reducedMotion: noMotion() });
  $('renderer-label').textContent = opaque() ? 'OPAQUE FALLBACK' : scene.supported ? 'WEBGL / LIVE' : 'CSS FALLBACK';
  ($('lensing') as HTMLButtonElement).disabled = !scene.supported;
  $('lensing').setAttribute('aria-pressed', String(lensing && scene.supported)); $('lensing').querySelector('span')!.textContent = scene.supported ? lensing ? 'Lens on' : 'Lens off' : 'CSS fallback';
  $('ambient').setAttribute('aria-pressed', String(paused)); $('ambient').querySelector('span')!.textContent = paused ? 'Resume' : 'Pause';
  $('quiet').setAttribute('aria-pressed', String(noMotion())); $('quiet').querySelector('span')!.textContent = noMotion() ? 'Motion quiet' : 'Motion on';
  $('solid').setAttribute('aria-pressed', String(opaque())); $('solid').querySelector('span')!.textContent = opaque() ? 'Solid on' : 'Solid off';
}
function select(index: number) {
  selected = index; palette = dockButtons[index].dataset.palette as Palette;
  dockButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  indicator.moveTo(dockButtons[index]); sync();
}
function announce(text: string) { $('chapter').textContent = text; $('announcement').textContent = text; }
function stopShowcase() { timers.forEach(window.clearTimeout); timers = []; if (frame) cancelAnimationFrame(frame); frame = 0; lensMotion.release(); document.body.classList.remove('showing'); $('showcase').querySelector('span')!.textContent = 'Play the light show'; }
function human() { if (timers.length || frame) { stopShowcase(); announce('Your turn. Drag the lens across the light.'); } }
function moveLens(x: number, y: number) {
  const stage = $('lens-stage').getBoundingClientRect();
  const lens = $('lens');
  const maxX = Math.max(0, (stage.width - lens.offsetWidth) / 2 - 9);
  const maxY = Math.max(0, (stage.height - lens.offsetHeight) / 2 - 9);
  lensPosition = { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  lens.style.translate = `${lensPosition.x}px ${lensPosition.y}px`;
  scene.render();
}
function glide(x: number, y: number, duration: number) {
  if (frame) cancelAnimationFrame(frame);
  if (noMotion()) { moveLens(x, y); return; }
  const origin = { ...lensPosition }, started = performance.now();
  const tick = (time: number) => { const progress = Math.min(1, (time - started) / duration); const eased = .5 - Math.cos(progress * Math.PI) / 2; moveLens(origin.x + (x - origin.x) * eased, origin.y + (y - origin.y) * eased); if (progress < 1) frame = requestAnimationFrame(tick); else frame = 0; };
  frame = requestAnimationFrame(tick);
}
dockButtons.forEach((button, index) => button.addEventListener('click', () => { human(); select(index); announce(`${button.textContent?.trim()} light. Try dragging the lens.`); }));
$('lensing').addEventListener('click', () => { human(); lensing = !lensing; sync(); announce(lensing ? 'Refraction on. Watch the grid bend at the edge.' : 'Refraction off. The same wallpaper, without displacement.'); });
$('ambient').addEventListener('click', () => { human(); paused = !paused; sync(); announce(paused ? 'Ambient animation paused. Controls still work.' : 'The wallpaper is moving again.'); });
$('quiet').addEventListener('click', () => { human(); quiet = !quiet; sync(); announce(noMotion() ? 'Motion reduced. Geometry changes immediately.' : 'Spring motion restored.'); });
$('solid').addEventListener('click', () => { human(); solid = !solid; sync(); announce(opaque() ? 'Opaque surfaces for a quieter, readable interface.' : 'Transparent surfaces restored.'); });
$('drag-handle').addEventListener('pointerdown', event => { if (event.button !== 0) return; human(); dragging = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: lensPosition.x, originY: lensPosition.y }; $('drag-handle').setPointerCapture(event.pointerId); $('lens').classList.add('dragging'); });
$('drag-handle').addEventListener('pointermove', event => { if (!dragging || dragging.id !== event.pointerId) return; moveLens(dragging.originX + event.clientX - dragging.x, dragging.originY + event.clientY - dragging.y); });
function endDrag() { dragging = null; $('lens').classList.remove('dragging'); lensMotion.release(); }
$('drag-handle').addEventListener('pointerup', endDrag); $('drag-handle').addEventListener('pointercancel', endDrag); $('drag-handle').addEventListener('lostpointercapture', endDrag);
$('drag-handle').addEventListener('keydown', event => { const directions: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }; const delta = directions[event.key]; if (!delta) return; event.preventDefault(); human(); moveLens(lensPosition.x + delta[0], lensPosition.y + delta[1]); });
$('showcase').addEventListener('click', runShowcase);
function runShowcase() {
  stopShowcase();
  if (motionPreference.matches) { announce('Your system requests reduced motion. Explore the static controls.'); return; }
  quiet = false; solid = false; paused = false; lensing = true; select(0); moveLens(0, 0);
  document.body.classList.add('showing'); $('showcase').querySelector('span')!.textContent = 'Light show playing';
  const later = (delay: number, action: () => void) => { timers.push(window.setTimeout(action, delay)); };
  announce('01 / Screen-space refraction. Follow the light.');
  later(600, () => glide(64, -22, 1900));
  later(2800, () => { lensMotion.press({ x: 240, y: 110 }); announce('02 / Tactile springs. Light follows the surface.'); });
  later(3500, () => lensMotion.release());
  later(4100, () => glide(-65, 28, 2000));
  later(5700, () => { announce('03 / One spring. New destination.'); select(1); });
  later(6100, () => select(2)); later(6400, () => select(0)); later(6800, () => select(1));
  later(7900, () => { glide(50, 28, 1700); announce('04 / Sunset. Same scene. Different wavelength.'); });
  later(10000, () => { lensing = false; sync(); announce('05 / Refraction OFF. A straight-through window.'); });
  later(12300, () => { lensing = true; sync(); announce('06 / Refraction ON. Watch the edge bend.'); });
  later(14000, () => { select(2); glide(-48, -20, 1900); announce('07 / Ocean light. An interface in its element.'); });
  later(17100, () => { quiet = true; solid = true; sync(); announce('08 / Less motion. Opaque surfaces. Same controls.'); });
  later(18100, () => select(0));
  later(19600, () => { quiet = false; solid = false; sync(); glide(0, 0, 1900); announce('09 / Built for the web. Yours to make.'); });
  later(21500, () => { lensMotion.press({ x: 150, y: 180 }); });
  later(22200, () => lensMotion.release());
  later(24000, () => { stopShowcase(); announce('Liquid Glass Kit. Independent. Open source.'); });
}
(window as unknown as { runOpticsShowcase: () => void }).runOpticsShowcase = runShowcase;
function preferenceChanged() { stopShowcase(); sync(); }
[motionPreference, transparencyPreference, contrastPreference, forcedPreference].forEach(query => query.addEventListener('change', preferenceChanged));
function contextChanged() { queueMicrotask(() => { if (!disposed) sync(); }); }
$('optics-canvas').addEventListener('webglcontextlost', contextChanged);
$('optics-canvas').addEventListener('webglcontextrestored', contextChanged);
window.addEventListener('resize', () => { moveLens(lensPosition.x, lensPosition.y); indicator.moveTo(dockButtons[selected]); });
window.addEventListener('pagehide', event => { stopShowcase(); if (event.persisted || disposed) return; disposed = true; scene.destroy(); indicator.destroy(); playMotion.destroy(); lensMotion.destroy(); material.forEach(controller => controller.destroy()); [motionPreference, transparencyPreference, contrastPreference, forcedPreference].forEach(query => query.removeEventListener('change', preferenceChanged)); });
select(0);
