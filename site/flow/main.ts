import '../../src/styles.css';
import './style.css';
import { attachGlassScene, type GlassSceneOptions } from '../../src/scene.js';
import evidence from './evidence.json';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('field');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const modes = ['stream', 'vortex', 'wave'] as const;
type Mode = typeof modes[number];
type Direction = 'right' | 'left' | 'up' | 'down';
let mode: Mode = 'stream', count = 3000, reversed = false, paused = false;
let palette: GlassSceneOptions['palette'] = 'sunset';
let fieldDirection: Direction = 'right', speed = 100;
let frame: number | null = null, elapsed = 0, eventIndex = 0, destroyed = false;
const format = new Intl.NumberFormat('en');
get('gpu-before').textContent = evidence.staticGpu.baseline.toFixed(2);
get('gpu-after').textContent = evidence.staticGpu.current.toFixed(2);
get('gpu-reduction').textContent = `${Math.round(evidence.staticGpu.lessPercent)}% less GPU time`;
const options = (): GlassSceneOptions => ({
  palette, paused: paused || frame !== null, maxDpr: 1.5,
  field: { count, size: 22, speed, seed: 7, motion: mode === 'vortex' ? 'orbit' : mode,
    direction: reversed ? ({ right: 'left', left: 'right', up: 'down', down: 'up' } as const)[fieldDirection] : fieldDirection },
});
const scene = attachGlassScene(canvas, options());
const setText = (id: string, value: string) => { const node = get(id); if (node.textContent !== value) node.textContent = value; };
function statistics() {
  const stats = scene.stats;
  setText('instance-count', format.format(stats.fieldCount));
  setText('draw-calls', String(stats.drawCalls));
  setText('buffer-size', `${stats.width} × ${stats.height}`);
  setText('scope', scene.supported
    ? 'Decorative WebGL2 scene; its own background. Native website controls keep the portable CSS material.'
    : 'WebGL2 is unavailable here. The static background remains; the portable CSS material and semantic controls stay independent.');
}
const names: Record<Mode, [string, string]> = { stream: ['01', 'THE WIND STREAM'], vortex: ['02', 'A TURN IN THE CURRENT'], wave: ['03', 'THE RISING TIDE'] };
function interfaceState() {
  for (const key of modes) get(key).setAttribute('aria-pressed', String(mode === key));
  get('pause').setAttribute('aria-pressed', String(paused));
  get('pause').setAttribute('aria-label', paused ? 'Resume the glass animation' : 'Pause the glass animation');
  get('reverse').setAttribute('aria-pressed', String(reversed));
  get<HTMLSelectElement>('density').value = String(count);
  setText('scene-number', names[mode][0]); setText('scene-label', names[mode][1]);
  get('status').textContent = `${format.format(count)} decorative glass instances. ${mode} animation. ${paused || reduced.matches ? 'Motion paused.' : reversed ? 'Direction reversed.' : 'Motion running.'}`;
}
function update() { scene.update(options()); interfaceState(); statistics(); }
function stopFilm() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  delete document.body.dataset.film;
}
function interaction() { stopFilm(); delete document.body.dataset.end; }
for (const key of modes) get(key).addEventListener('click', () => {
  interaction(); mode = key; palette = key === 'stream' ? 'sunset' : key === 'wave' ? 'ocean' : 'neon';
  fieldDirection = key === 'wave' ? 'up' : 'right'; speed = key === 'vortex' ? 90 : 100; update();
});
get('pause').addEventListener('click', () => { interaction(); paused = !paused; update(); });
get('reverse').addEventListener('click', () => { interaction(); reversed = !reversed; update(); });
get<HTMLSelectElement>('density').addEventListener('change', event => { interaction(); count = Number((event.currentTarget as HTMLSelectElement).value); update(); });

const timeline: Array<[number, () => void]> = [
  [0, () => { mode = 'stream'; palette = 'sunset'; speed = 115; fieldDirection = 'right'; reversed = false; setText('headline', 'Three thousand.'); setText('subhead', 'One field.'); setText('lede', 'A river of light. Rendered together.'); update(); }],
  [3, () => { mode = 'wave'; palette = 'ocean'; speed = 135; fieldDirection = 'up'; setText('headline', 'Change the wind.'); setText('subhead', 'Keep the glass.'); setText('lede', 'New direction. Same instanced field.'); update(); }],
  [5.8, () => { mode = 'vortex'; palette = 'neon'; speed = 95; fieldDirection = 'right'; setText('headline', 'Around we go.'); setText('subhead', 'One field draw.'); setText('lede', 'One instanced particle draw. An owned scene.'); update(); }],
  [8.5, () => { mode = 'stream'; palette = 'sunset'; speed = 140; fieldDirection = 'right'; reversed = true; setText('headline', 'Turn the tide.'); setText('subhead', 'Let it flow.'); setText('lede', 'Three thousand instances. Zero particle DOM.'); update(); }],
  [10.4, () => { document.body.dataset.end = 'true'; setText('headline', 'Glass in full flow.'); setText('subhead', 'Build with it.'); setText('lede', 'Liquid Glass Kit. Open source.'); }],
];
function advance(seconds: number) {
  elapsed = Math.max(0, Math.min(12, seconds));
  while (eventIndex < timeline.length && timeline[eventIndex][0] <= elapsed) timeline[eventIndex++][1]();
  get('film-progress').style.width = `${elapsed / 12 * 100}%`;
  scene.render(elapsed);
}
function reset() {
  stopFilm(); elapsed = 0; eventIndex = 0; paused = true; count = 3000; reversed = false; mode = 'stream'; palette = 'sunset'; fieldDirection = 'right'; speed = 115;
  delete document.body.dataset.end;
  get('film-progress').style.width = '0%';
  setText('headline', 'Three thousand.'); setText('subhead', 'One field.'); setText('lede', 'A river of light. Rendered together.');
  update(); scene.render(0);
}
function play() {
  reset(); if (destroyed) return;
  if (reduced.matches) { advance(12); get('status').textContent = 'Reduced motion is enabled. The film is shown as a static final scene.'; return; }
  paused = false;
  document.body.dataset.film = 'true'; window.scrollTo(0, 0);
  const started = performance.now();
  const tick = (now: number) => {
    advance((now - started) / 1000);
    if (elapsed < 12 && !destroyed) frame = requestAnimationFrame(tick);
    else { frame = null; paused = true; scene.update(options()); interfaceState(); statistics(); delete document.body.dataset.film; }
  };
  frame = requestAnimationFrame(tick);
}
get('replay').addEventListener('click', play);
reduced.addEventListener('change', () => { if (reduced.matches && frame !== null) { stopFilm(); paused = true; update(); } });
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
function refreshStatistics() { if (refreshTimer !== null) clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { refreshTimer = null; if (!destroyed) statistics(); }, 60); }
window.addEventListener('resize', refreshStatistics);
document.addEventListener('visibilitychange', () => { if (document.hidden && frame !== null) { stopFilm(); paused = true; update(); } else refreshStatistics(); });
window.addEventListener('pagehide', () => { destroyed = true; stopFilm(); if (refreshTimer !== null) clearTimeout(refreshTimer); scene.destroy(); }, { once: true });
(window as unknown as { flowFilm: unknown }).flowFilm = {
  play, reset,
  get state() { return { elapsed, running: frame !== null, eventIndex, paused, reversed, mode, reducedMotion: reduced.matches, supported: scene.supported, stats: scene.stats }; },
};
interfaceState(); statistics(); refreshStatistics();
