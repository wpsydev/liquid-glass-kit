import { attachGlassSceneTexture } from '../../src/scene-texture.js';
import type { GlassSceneTextureStats } from '../../src/scene-texture.js';
import type { GlassSceneOptions, GlassSceneDrop } from '../../src/scene.js';
import './style.css';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const source = get<HTMLCanvasElement>('source'), output = get<HTMLCanvasElement>('output'), frame = get('frame');
const context = source.getContext('2d');
const media = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(forced-colors: active)'].map(query => window.matchMedia(query));
const surfaces = ['lens-one', 'lens-two', 'lens-three'].map(id => get(id));
type Artwork = 'poster' | 'stripes' | 'orbit';
type Preset = Artwork | 'contain' | 'crop' | 'caustics';
const titles: Record<Artwork, string> = { poster: '01 / TYPOGRAPHIC FIELD', stripes: '02 / SIGNAL STRIPES', orbit: '03 / ORBITAL PRINT' };
let art: Artwork = 'poster', revision = 0, width = 900, height = 360, phase = 0;
let controller: ReturnType<typeof attachGlassSceneTexture> | undefined;
let timers: number[] = [], touring = false, gone = false;
const quiet = () => get<HTMLInputElement>('quiet').checked || media[0].matches;
const solid = () => get<HTMLInputElement>('solid').checked || media.slice(1).some(query => query.matches);
function status(message: string) { if (get('status').textContent !== message) get('status').textContent = message; }
function drawSource() {
  if (!context) { status('Canvas2D unavailable. Controls remain available; no source is fabricated.'); return; }
  const c = context, w = source.width, h = source.height;
  c.save(); c.clearRect(0, 0, w, h);
  if (art === 'poster') {
    c.fillStyle = '#e9eeeb'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#172eaa'; c.fillRect(0, 0, w * .17, h);
    c.fillStyle = '#dcef29'; c.fillRect(w * .71, 0, w * .29, h);
    c.save(); c.translate(w * .54, h * .66); c.rotate(-.12 + revision % 3 * .025);
    for (let x = -550; x < 700; x += 54) { c.fillStyle = '#0c1320'; c.fillRect(x, -190, 24, 510); } c.restore();
    c.fillStyle = '#101826'; c.font = '900 200px Arial, sans-serif'; c.textAlign = 'center'; c.fillText('REFRACT', w * .5, h * .43);
    c.fillStyle = '#d7e52c'; c.beginPath(); c.arc(w * .35, h * .73, 146, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#1b2fa6'; c.lineWidth = 37; c.beginPath(); c.ellipse(w * .69, h * .68, 143, 220, -.6, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#e9eeeb'; c.font = 'bold 27px Arial, sans-serif'; c.textAlign = 'left'; c.fillText('REAL / SOURCE', 42, 73);
    c.fillStyle = '#18232d'; c.font = 'bold 24px Arial, sans-serif'; c.fillText(`ORIGINAL FIELD / ${String(revision + 1).padStart(2, '0')}`, w * .21, h * .93);
  } else if (art === 'stripes') {
    c.fillStyle = '#101728'; c.fillRect(0, 0, w, h); c.save(); c.translate(w * .5, h * .5); c.rotate(-.27 + revision % 3 * .05);
    for (let x = -1500; x <= 1500; x += 73) { c.fillStyle = x % 146 === 0 ? '#dced2a' : '#8ba5dc'; c.fillRect(x, -1200, 36, 2400); } c.restore();
    c.fillStyle = '#192daf'; c.beginPath(); c.arc(w * .6, h * .58, 230, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f5f5e7'; c.lineWidth = 4; for (let radius = 34; radius < 220; radius += 27) { c.beginPath(); c.arc(w * .6, h * .58, radius, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#eeeee7'; c.font = '900 220px Arial, sans-serif'; c.textAlign = 'center'; c.fillText('SIGNAL', w * .5, h * .42);
  } else {
    c.fillStyle = '#131c82'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w * .5, h * .5); c.rotate(.08 * (revision % 3));
    for (let radius = 55; radius < 890; radius += 42) { c.strokeStyle = radius % 84 === 55 ? '#a5c8f7' : '#dee827'; c.lineWidth = radius < 300 ? 5 : 2; c.beginPath(); c.ellipse(0, 0, radius, radius * .6, -.32, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#edf02d'; c.beginPath(); c.arc(-160, 0, 154, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0e163b'; c.beginPath(); c.arc(150, 96, 84, 0, Math.PI * 2); c.fill(); c.restore();
    c.fillStyle = '#e8f0f1'; c.font = 'bold 30px Arial, sans-serif'; c.textAlign = 'left'; c.fillText('ORBITAL PRINT', w * .23, h * .21); c.font = 'bold 24px Arial, sans-serif'; c.fillText('OWNED CANVAS / STATIC PIXELS', w * .23, h * .86);
  }
  c.restore(); get('art-label').textContent = titles[art];
  document.querySelectorAll<HTMLButtonElement>('[data-art]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.art === art)));
}
function drops(time = phase): GlassSceneDrop[] {
  const radius = Math.min(width, height) * .13;
  return [
    { x: width * (.62 + Math.sin(time) * .04), y: height * (.6 + Math.cos(time) * .045), radius },
    { x: width * (.69 + Math.cos(time) * .025), y: height * (.6 + Math.sin(time) * .05), radius: radius * .78 },
    { x: width * (.75 + Math.sin(time + 1) * .025), y: height * .6, radius: radius * .6 },
  ];
}
function sceneSettings(): GlassSceneOptions {
  const refraction = Number(get<HTMLInputElement>('refraction').value);
  return {
    animate: false, paused: false, reducedMotion: quiet(), reducedTransparency: solid(), maxDpr: 1.5, maxPixels: 1_048_576,
    surfaces: surfaces.map((element, index) => ({ element, radius: index === 2 ? 200 : 48, refraction: index === 1 ? refraction * .75 : refraction })),
    fusion: { drops: drops(), smoothness: 22, refraction, dispersion: .35 },
    ...(get<HTMLInputElement>('caustics').checked ? { caustics: { intensity: .18, resolution: 24, renderScale: .35, ripple: .65, speed: 0, depth: 42 } } : {}),
  };
}
function updateStats(stats = controller?.sourceStats) {
  if (!stats) return;
  const renderer = controller?.stats;
  get('uploads').textContent = String(stats.uploads); get('texture-size').textContent = stats.width ? `${stats.width} × ${stats.height}` : '—';
  get('downscale').textContent = stats.width ? stats.downscaled ? `${stats.pixels.toLocaleString('en-US')} px · downscaled to the cap` : `${stats.pixels.toLocaleString('en-US')} px · original dimensions` : 'No texture upload completed.';
  get('backing').textContent = String(renderer?.pixels ?? 0); get('draws').textContent = renderer?.drawCalls ? `${renderer.drawCalls} passes in the last draw · ${renderer.fusionCount} drops` : 'No WebGL draw submitted.';
  get('source-state').textContent = solid() ? 'Host canvas' : stats.status;
  get('source-reason').textContent = solid() ? 'Plain artwork. No source sampling.' : stats.reason === 'source-access' ? 'Source access denied. Host owns CORS.' : `${stats.kind} / ${stats.reason}`;
  output.dataset.ready = String(!solid() && !!controller?.supported && stats.status === 'ready');
  get('receiver-note').textContent = solid() ? 'PLAIN HOST CANVAS' : stats.status === 'ready' ? 'OWNED TEXTURE / STATIC RECEIVER' : 'ORIGINAL CANVAS FALLBACK';
  if (!solid() && stats.status === 'unsupported') status('WebGL2 unavailable. Original Canvas2D artwork stays visible.');
  else if (!solid() && stats.status === 'error') status(stats.reason === 'source-access' ? 'Source access failed. Supply origin-clean host media; the canvas fallback is retained.' : `Experimental source failed (${stats.reason}). The original canvas is retained.`);
  else if (stats.status === 'context-lost') status('WebGL context lost. Original artwork remains available.');
}
function options() { const fit = get<HTMLSelectElement>('fit').value as 'cover' | 'contain', position = Number(get<HTMLInputElement>('position').value) / 100; source.style.objectFit = fit; source.style.objectPosition = `${position * 100}% 50%`; return { source, fit, position: [position, .5] as const, matte: [.045, .06, .09] as const, maxSourcePixels: Number(get<HTMLSelectElement>('budget').value), maxSourceDimension: 2048, videoFrames: false, scene: sceneSettings(), onChange: (stats: GlassSceneTextureStats) => updateStats(stats) }; }
function render(time = phase) { controller?.render(time); updateStats(); }
function update() { if (gone) return; controller?.update(options()); render(); }
function redraw() { revision++; drawSource(); controller?.invalidateSource(); render(); status('Host canvas redrawn and explicitly invalidated. A new source upload is requested.'); updateStats(); }
function changeArt(next: Artwork) { if (!Object.hasOwn(titles, next)) return; art = next; revision = 0; drawSource(); controller?.invalidateSource(); render(); status('Original host artwork changed. The source was explicitly invalidated.'); updateStats(); }
function stopTour() { timers.forEach(window.clearTimeout); timers = []; touring = false; get('tour').textContent = 'Play 10.5s tour'; }
function cancel() { stopTour(); controller?.update({ scene: { ...sceneSettings(), paused: true } }); render(); status('Tour stopped. Optics and artwork are static; host controls still work.'); updateStats(); }
function preset(id: Preset) {
  stopTour();
  if (id === 'poster' || id === 'stripes' || id === 'orbit') changeArt(id);
  else if (id === 'contain') { get<HTMLSelectElement>('fit').value = 'contain'; update(); }
  else if (id === 'crop') { get<HTMLSelectElement>('fit').value = 'cover'; get<HTMLInputElement>('position').value = '12'; update(); }
  else if (id === 'caustics') { get<HTMLInputElement>('caustics').checked = true; update(); }
}
function restoreMarkers() { surfaces[0].style.left = ''; surfaces[0].style.top = ''; surfaces[1].style.left = ''; surfaces[1].style.top = ''; }
function reset() {
  stopTour(); restoreMarkers(); revision = phase = 0; art = 'poster';
  get<HTMLSelectElement>('fit').value = 'cover'; get<HTMLInputElement>('position').value = '50'; get<HTMLInputElement>('refraction').value = '48'; get<HTMLSelectElement>('budget').value = '262144';
  ['caustics', 'quiet', 'solid'].forEach(id => { get<HTMLInputElement>(id).checked = false; }); drawSource(); controller?.invalidateSource(); update(); status('Static original artwork. No scene clock or video loop is running.'); updateStats();
}
function tour() {
  reset(); touring = true; get('tour').textContent = 'Stop tour';
  const schedule = (delay: number, action: () => void) => timers.push(window.setTimeout(action, delay));
  const move = (at: number, duration: number, offset: number) => { const count = quiet() ? 1 : 30; for (let i = 1; i <= count; i++) schedule(at + duration * i / count, () => { if (quiet() && i < count) return; phase = offset + i / count * Math.PI; surfaces[0].style.left = `${25 + Math.sin(phase) * 8}%`; surfaces[0].style.top = `${24 + Math.cos(phase) * 9}%`; controller?.setDrops(drops()); render(phase); }); };
  move(200, 1500, 0);
  schedule(2200, () => { changeArt('stripes'); get<HTMLSelectElement>('fit').value = 'contain'; update(); status('Contain uses an opaque matte. The artwork is still host-owned.'); });
  schedule(3700, () => { get<HTMLSelectElement>('fit').value = 'cover'; get<HTMLInputElement>('position').value = '12'; update(); status('Cover / crop changed. Unchanged source pixels can be reused.'); });
  schedule(4800, () => { changeArt('orbit'); get<HTMLInputElement>('caustics').checked = true; update(); });
  move(5100, 1700, Math.PI);
  schedule(7600, redraw);
  schedule(8800, () => { get<HTMLInputElement>('quiet').checked = true; controller?.update({ scene: { ...sceneSettings(), paused: true } }); render(); status('Quiet final frame. No automatic scene clock or upload loop.'); });
  schedule(10500, () => { stopTour(); status('Finite tour complete. Artwork and optics remain static.'); updateStats(); });
}
get('redraw').addEventListener('click', () => { stopTour(); redraw(); }); get('retry').addEventListener('click', () => { stopTour(); controller?.invalidateSource(); render(); status('Owned source access retried. No URL was loaded.'); updateStats(); });
get('tour').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
document.querySelectorAll<HTMLButtonElement>('[data-art]').forEach(button => button.addEventListener('click', () => preset(button.dataset.art as Artwork)));
for (const id of ['fit', 'position', 'refraction', 'budget', 'caustics', 'quiet', 'solid']) get(id).addEventListener(id === 'position' || id === 'refraction' ? 'input' : 'change', () => { stopTour(); update(); status(solid() ? 'Plain host canvas selected. Native controls and original artwork remain available.' : quiet() ? 'Quiet optics. Intentional source changes still render on demand.' : 'Parameters changed. The static owned source can be reused.'); updateStats(); });
function resize() { const rect = frame.getBoundingClientRect(); if (rect.width > 0 && rect.height > 0) { width = rect.width; height = rect.height; } controller?.setDrops(drops()); render(); }
const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : undefined; observer?.observe(frame); window.addEventListener('resize', resize);
media.forEach(query => query.addEventListener('change', () => { stopTour(); update(); status(quiet() ? 'System reduced motion respected. Decorative tour stopped.' : solid() ? 'System contrast/transparency preference uses the original canvas fallback.' : 'Preference changed. Static rendering retained.'); updateStats(); }));
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
window.addEventListener('pagehide', () => { stopTour(); gone = true; controller?.destroy(); observer?.disconnect(); });
window.addEventListener('pageshow', () => { if (gone) { gone = false; mount(); observer?.observe(frame); } });
function mount() { drawSource(); const rect = frame.getBoundingClientRect(); if (rect.width > 0 && rect.height > 0) { width = rect.width; height = rect.height; } controller = attachGlassSceneTexture(output, options()); render(); updateStats(); }
mount();
declare global { interface Window { __textureDemo: { preset: typeof preset; reset: typeof reset; tour: typeof tour; cancel: typeof cancel; state: () => { artwork: Artwork; revision: number; touring: boolean; quiet: boolean; solid: boolean; fit: string; source: ReturnType<typeof sourceState>; renderer: ReturnType<typeof rendererState> } } } }
function sourceState() { return controller?.sourceStats; } function rendererState() { return controller?.stats; }
window.__textureDemo = { preset, reset, tour, cancel, state: () => ({ artwork: art, revision, touring, quiet: quiet(), solid: solid(), fit: get<HTMLSelectElement>('fit').value, source: sourceState(), renderer: rendererState() }) };
