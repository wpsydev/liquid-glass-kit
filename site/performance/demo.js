import './style.css';
import browserEvidence from '../../benchmarks/browser.json';
import packageEvidence from '../../benchmarks/package.json';
import { attachGlass, attachGlassTransition } from '../../src/index.ts';

const $ = selector => document.querySelector(selector);
const surfaces = [], controllers = [];
let interactive = false, frame = null, elapsed = 0, eventIndex = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const material = () => ({ appearance: 'light', radius: 9, blur: 8, tint: '#fff8eb', tintOpacity: .12, interactive });
for (let index = 0; index < 100; index++) {
  const surface = document.createElement('div');
  surface.className = 'glass-sample';
  $('#glass-grid').append(surface);
  surfaces.push(surface);
  controllers.push(attachGlass(surface, material()));
}
const reveal = attachGlassTransition($('#glass-grid'), { direction: 'up', distance: 12, duration: 240 });
function setMode(next) {
  interactive = next;
  controllers.forEach(controller => controller.update(material()));
  $('#static').setAttribute('aria-pressed', String(!next));
  $('#interactive').setAttribute('aria-pressed', String(next));
  $('#mode').textContent = next ? 'INTERACTIVE / POINTER TRACKING' : 'STATIC / NO INPUT TRACKING';
  $('#status').textContent = next ? 'All 100 surfaces now track pointer input. Saved resource counts still describe static mode.' : 'All 100 surfaces are static again. Input tracking is removed.';
}
$('#static').addEventListener('click', () => setMode(false));
$('#interactive').addEventListener('click', () => setMode(true));

const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
async function evidence() {
  const results = [{status: 'fulfilled', value: browserEvidence}];
  if (results[0].status === 'fulfilled') {
    const benchmark = results[0].value, summary = benchmark.scenarios?.static?.summary;
    $('#mount-before').textContent = number(summary?.baseline?.mount?.median);
    $('#mount-after').textContent = number(summary?.current?.mount?.median);
    $('#total-before').textContent = number(summary?.baseline?.total?.median);
    $('#total-after').textContent = number(summary?.current?.total?.median);
    const chrome = benchmark.environment?.userAgent?.match(/Chrome\/(\d+)/)?.[1];
    $('#benchmark-environment').textContent = `${chrome ? `CHROME ${chrome}` : 'DESKTOP BROWSER'} / SAVED TIMING RUN`;
    $('#benchmark-scope').textContent = `${benchmark.method?.count ?? 100} surfaces · ${benchmark.method?.repetitions ?? 'saved'} paired runs · median synchronous elapsed times, not FPS. Payload drops by removing unused maps; client JS grew slightly.`;
  } else $('#benchmark-scope').textContent = 'Saved timing evidence is unavailable. No speed estimate is shown. This demonstration does not measure FPS or phone performance.';
  for (const name of ['baseline', 'current']) {
    const value = packageEvidence.reports[name]?.libraryDistBytes;
    $(`#source-${name === 'baseline' ? 'before' : 'after'}`).textContent = typeof value === 'number' ? (value / 1000).toFixed(1) : '—';
  }
}
void evidence();

function pause() { if (frame !== null) cancelAnimationFrame(frame); frame = null; }
function reset() {
  pause(); reveal.cancel(); elapsed = 0; eventIndex = 0;
  delete document.body.dataset.end; delete document.body.dataset.focus; delete document.body.dataset.film;
  $('#progress').style.width = '0%';
  if (interactive) setMode(false);
}
const timeline = [
  [0, () => { document.body.dataset.focus = 'resources'; if (!reducedMotion.matches) void reveal.enter(); }],
  [4, () => { document.body.dataset.focus = 'measurements'; }],
  [8, () => { document.body.dataset.focus = 'recipe'; }],
  [9.3, () => { document.body.dataset.end = 'true'; }],
];
function advance(seconds) {
  elapsed = Math.min(12, Math.max(0, seconds));
  while (eventIndex < timeline.length && timeline[eventIndex][0] <= elapsed) timeline[eventIndex++][1]();
  $('#progress').style.width = `${elapsed / 12 * 100}%`;
}
function play() {
  reset(); void document.body.offsetWidth; document.body.dataset.film = 'true'; window.scrollTo(0, 0);
  const started = performance.now(); advance(0);
  const tick = now => { advance((now - started) / 1000); frame = elapsed < 12 ? requestAnimationFrame(tick) : null; };
  frame = requestAnimationFrame(tick);
}
window.performanceFilm = { play, reset, get state() { return { elapsed, running: frame !== null, interactive, surfaces: surfaces.length, reducedMotion: reducedMotion.matches, eventIndex }; } };
$('#replay').addEventListener('click', play);
window.addEventListener('pagehide', () => { pause(); reveal.destroy(); controllers.reverse().forEach(controller => controller.destroy()); }, { once: true });
