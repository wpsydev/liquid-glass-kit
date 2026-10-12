import {
  createGlassQualityGovernor,
  type GlassQualityDecision,
  type GlassQualityGovernor,
  type GlassQualityGovernorOptions,
} from '../../src/quality-governor.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Level = 'economy' | 'balanced' | 'full';
type Preset = 'baseline' | 'spike' | 'overload' | 'cooldown' | 'recovery' | 'manual' | 'gap';
type TraceKind = 'pressure' | 'headroom' | 'neutral';
interface EventRecord { time: number; milliseconds: number; accepted: boolean; action: string; reason: string }
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const canvas = query<HTMLCanvasElement>('#art');
const target = query<HTMLInputElement>('#target'), lockField = query<HTMLSelectElement>('#lock');
const applyField = query<HTMLInputElement>('#apply'), quietField = query<HTMLInputElement>('#quiet');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const levels: Level[] = ['economy', 'balanced', 'full'];
const budgets = {
  economy: { strands: 8, segments: 48, maxDpr: 1, maxPixels: 180_000 },
  balanced: { strands: 12, segments: 72, maxDpr: 1.25, maxPixels: 360_000 },
  full: { strands: 16, segments: 96, maxDpr: 1.5, maxPixels: 600_000 },
} as const;
const fixtureConfig = (): GlassQualityGovernorOptions => ({
  levels, kind: 'frame-cadence', targetMs: 16.67, windowSize: 4,
  downgradeWindows: 2, recoveryWindows: 6, cooldownMs: 120, maxGapMs: 250,
});
const nativeConfig = (targetMs: number): GlassQualityGovernorOptions => ({
  levels, kind: 'frame-cadence', targetMs, windowSize: 30,
  downgradeWindows: 2, recoveryWindows: 8, cooldownMs: 2500, maxGapMs: 1000,
});
let context: CanvasRenderingContext2D | null = null;
try { context = canvas.getContext('2d', { alpha: false }); } catch { /* Textual policy stays usable. */ }
let config = fixtureConfig(), governor: GlassQualityGovernor = createGlassQualityGovernor(config);
let source: 'fixture' | 'native' = 'fixture', selected: Preset = 'baseline';
let decision: GlassQualityDecision | null = null, events: EventRecord[] = [], observed = 0, rejected = 0;
let traceTime = -40, applied: Level = 'full', cssWidth = 620, cssHeight = 420, draws = 0, applications = 0;
let quiet = false, solid = false, apply = true, destroyed = false, phase = 0;
let live = false, frame: number | null = null, stopTimer: number | null = null;
let liveGeneration = 0, liveResolve: ((result: boolean) => void) | undefined;
let liveStart = 0, lastFrame: number | null = null, lastReadback = 0, liveElapsed = 0;
let runNote = 'Static by default. No automatic timing collection.';
let fixtureNote = 'No trace replayed yet. The default artwork is static.';
let tourGeneration = 0, tourTimers: number[] = [], tourResolve: ((result: boolean) => void) | undefined, tourStep = '';
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const label = (value: string) => value.replaceAll('-', ' ');
const reduced = () => quiet || motion.matches;
const format = (value: number) => value.toFixed(2).replace(/\.?0+$/, '');

function buffer() {
  const tier = budgets[applied], dpr = Math.min(tier.maxDpr, Math.max(1, window.devicePixelRatio || 1));
  const scale = Math.min(dpr, Math.sqrt(tier.maxPixels / (cssWidth * cssHeight)));
  const width = Math.max(1, Math.floor(cssWidth * scale)), height = Math.max(1, Math.floor(cssHeight * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}
function draw(value = phase) {
  if (!context || destroyed) return;
  phase = reduced() ? 0 : value;
  const ctx = context, tier = budgets[applied], width = cssWidth, height = cssHeight;
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  ctx.fillStyle = '#0b222b'; ctx.fillRect(0, 0, width, height);
  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, '#123d48'); wash.addColorStop(.5, '#113238'); wash.addColorStop(1, '#101d29');
  ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = 1; ctx.strokeStyle = '#2a4750';
  for (let index = 1; index < 8; index++) {
    ctx.beginPath(); ctx.moveTo(index * width / 8, 0); ctx.lineTo(index * width / 8, height); ctx.stroke();
  }
  for (let index = 1; index < 6; index++) {
    ctx.beginPath(); ctx.moveTo(0, index * height / 6); ctx.lineTo(width, index * height / 6); ctx.stroke();
  }
  const colors = ['#d4ef78', '#58c9c2', '#e5a3a0', '#b2dbe5'];
  for (let strand = 0; strand < tier.strands; strand++) {
    const relative = strand / Math.max(1, tier.strands - 1);
    ctx.beginPath();
    for (let segment = 0; segment <= tier.segments; segment++) {
      const progress = segment / tier.segments;
      const envelope = Math.sin(progress * Math.PI);
      const x = width * (.035 + progress * .94);
      const y = height * (.14 + relative * .55)
        + Math.sin(progress * Math.PI * 2.1 + relative * 2.1 + phase) * height * .16 * envelope
        + Math.cos(progress * Math.PI * 5.2 - relative * 1.6 - phase * .7) * height * .035 * envelope;
      if (segment === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = colors[strand % colors.length]; ctx.globalAlpha = .45 + relative * .5;
    ctx.lineWidth = 1.8 + relative * 2.4; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#d4ef78'; ctx.beginPath(); ctx.arc(width * .86, height * .18, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b0c8c4'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.arc(width * .86, height * .18, 13, 0, Math.PI * 2); ctx.stroke();
  draws++;
}
function resize() {
  if (destroyed) return;
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width > 0 ? Math.min(bounds.width, 1600) : 620;
  const height = bounds.height > 0 ? Math.min(bounds.height, 900) : 420;
  if (width === cssWidth && height === cssHeight) return;
  // A changed host workload starts fresh timing evidence, without releasing a manual hold.
  if (live) {
    decision = governor.reset(); events = []; observed = rejected = 0; lastFrame = null;
    runNote = 'Artwork geometry changed. Native cadence evidence restarted; manual quality holds remain intact.';
  }
  cssWidth = width; cssHeight = height; buffer(); draw(); render();
}
function applyRequested() {
  if (!apply || governor.state.level === applied) return;
  applied = governor.state.level as Level; applications++; buffer();
  if (!live) draw();
}
function material() {
  const props = getGlassProps({ appearance: 'dark', radius: 12, blur: 12, corner: 'continuous', reducedTransparency: solid });
  const plate = query('#quality-plate'); plate.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) plate.style.setProperty(key, String(value));
  for (const [key, value] of Object.entries(props)) if (key.startsWith('data-')) plate.setAttribute(key, String(value));
  plate.style.setProperty('--lg-fill-rgb', '14 31 35'); plate.style.setProperty('--lg-solid-fill', '#162a2f'); plate.style.setProperty('--lg-ink', '#e8eee9');
  query('#solid').setAttribute('aria-pressed', String(solid));
}
function chart() {
  const svg = query('#trace-line').parentElement as unknown as SVGSVGElement;
  const maximum = Math.max(40, ...events.map(event => event.milliseconds));
  const y = (milliseconds: number) => 90 - Math.min(1, milliseconds / maximum) * 84;
  const x = (index: number) => events.length < 2 ? 180 : index / (events.length - 1) * 360;
  query('#target-line').setAttribute('d', 'M0 ' + y(config.targetMs).toFixed(2) + 'h360');
  query('#trace-line').setAttribute('d', events.map((event, index) => (index ? 'L' : 'M') + x(index).toFixed(2) + ' ' + y(event.milliseconds).toFixed(2)).join(' '));
  let marks = svg.querySelector<SVGGElement>('#trace-rejections');
  if (!marks) { marks = document.createElementNS('http://www.w3.org/2000/svg', 'g'); marks.id = 'trace-rejections'; svg.append(marks); }
  marks.replaceChildren(...events.flatMap((event, index) => {
    if (event.accepted) return [];
    const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    point.setAttribute('cx', x(index).toFixed(2)); point.setAttribute('cy', y(event.milliseconds).toFixed(2)); point.setAttribute('r', '3'); point.setAttribute('class', 'reject-dot');
    return [point];
  }));
  query('#trace-description').textContent = (source === 'fixture' ? 'Deterministic synthetic' : 'Native frame-cadence')
    + ' inputs, last ' + events.length + ' samples. Dashed budget ' + format(config.targetMs) + ' milliseconds. '
    + rejected + ' rejected samples in this context. Cadence is not GPU elapsed time.';
}
function render() {
  if (destroyed) return;
  const state = governor.state, tier = budgets[applied], evidence = state.evidence, last = events.at(-1);
  document.body.dataset.quiet = String(reduced());
  query('#source-label').textContent = source === 'fixture' ? 'DETERMINISTIC FIXTURE' : 'NATIVE FRAME CADENCE';
  query('#requested-name').textContent = title(state.level);
  query('#applied-name').textContent = context ? title(applied) : 'Unavailable';
  query('#applied-recipe').textContent = context ? tier.strands + ' strands / ' + tier.segments + ' segments' : 'Canvas2D unavailable / policy only';
  query('#pixel-readout').textContent = canvas.width + ' × ' + canvas.height + ' actual pixels';
  query('#lock-label').textContent = state.locked ? 'Explicit manual lock' : 'Automatic policy';
  lockField.value = state.locked ? state.level : 'auto';
  applyField.checked = apply; quietField.checked = quiet;
  for (const item of document.querySelectorAll<HTMLElement>('[data-level]')) {
    item.dataset.requested = String(item.dataset.level === state.level);
    item.dataset.applied = String(item.dataset.level === applied);
  }
  query('#decision').textContent = decision ? decision.action + ' / ' + label(decision.reason) : 'No samples';
  query('#last-action').textContent = state.lastAction ? state.lastAction.action + ' → ' + title(state.lastAction.level) : 'None';
  query('#cooldown').textContent = format(state.cooldownRemainingMs) + ' ms / sampled';
  query('#streaks').textContent = state.pendingSamples + ' / ' + state.overloadWindows + ' / ' + state.recoveryWindows;
  query('#last-interval').textContent = last ? format(last.milliseconds) + ' ms / ' + (last.accepted ? 'accepted' : 'rejected') : 'None';
  query('#motion').textContent = motion.matches ? 'OS reduce / static' : quiet ? 'Explicit quiet / static' : 'Finite animation allowed';
  query('#evidence-kind').textContent = state.kind;
  query('#evidence-label').textContent = evidence ? evidence.count + ' samples / ' + format(evidence.meanMs) + ' ms mean / '
    + evidence.classification + '. Pressure ' + evidence.pressureSamples + '; headroom ' + evidence.headroomSamples + '.'
    : 'No complete eligible sample window. Cooldown / rejected evidence is discarded.';
  query('#policy-config').textContent = (source === 'fixture' ? 'Condensed fixture' : 'Native run / production defaults')
    + ': target ' + format(config.targetMs) + 'ms · window ' + config.windowSize + ' · down ' + config.downgradeWindows
    + ' · recover ' + config.recoveryWindows + ' · cooldown ' + config.cooldownMs + 'ms · gap ' + config.maxGapMs + 'ms';
  query('#host-readback').textContent = applied + ' / ' + canvas.width * canvas.height + ' pixels / '
    + (context ? tier.strands * (tier.segments + 1) + ' ribbon vertices' : 'no artwork rendered');
  query('#sample-counts').textContent = observed + ' / ' + rejected;
  query('#runner-readback').textContent = live ? 'Native finite run / ' + format(liveElapsed / 1000) + ' s' : 'Stopped / no scheduled frame';
  query<HTMLButtonElement>('#live').disabled = live || reduced() || !context;
  query<HTMLButtonElement>('#stop').disabled = !live;
  const nextNote = reduced() && !live ? 'Static: ' + (motion.matches ? 'OS reduced motion' : 'explicit quiet') + '. Fixture controls remain available.' : runNote;
  if (query('#run-status').textContent !== nextNote) query('#run-status').textContent = nextNote;
  query('#fixture-note').textContent = fixtureNote;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.setAttribute('aria-pressed', String(source === 'fixture' && button.dataset.preset === selected));
  query('#tour-status').textContent = tourStep || 'No automatic replay';
  const history = events.slice(-8).reverse();
  const entries = history.map(event => {
    const item = document.createElement('li');
    item.dataset.rejected = String(!event.accepted);
    item.textContent = format(event.time) + ' ms / ' + format(event.milliseconds) + ' interval / ' + event.action + ' / ' + label(event.reason);
    return item;
  });
  if (!entries.length) { const empty = document.createElement('li'); empty.textContent = 'No timing samples supplied'; entries.push(empty); }
  query('#event-list').replaceChildren(...entries); chart();
}
function ingest(milliseconds: number, time: number, visible = true, valid = true, interrupted = false) {
  const result = governor.sample({ kind: 'frame-cadence', milliseconds, time, visible, valid, interrupted });
  decision = result; observed++; if (!result.accepted) rejected++;
  events.push({ milliseconds, time, accepted: result.accepted, action: result.action, reason: result.reason });
  if (events.length > 72) events.shift();
  applyRequested(); return result;
}
function install(next: GlassQualityGovernorOptions, provenance: 'fixture' | 'native') {
  config = next; governor = createGlassQualityGovernor(config); source = provenance;
  decision = null; events = []; observed = rejected = 0; traceTime = -40; selected = 'baseline';
  applyRequested();
}
function trace(values: readonly number[]) {
  for (const milliseconds of values) { traceTime += 40; ingest(milliseconds, traceTime); }
}
function runPreset(value: Preset) {
  install({ ...fixtureConfig(), initialLevel: value === 'recovery' ? 'economy' : 'full' }, 'fixture'); selected = value;
  if (value === 'spike') { trace([16, 16, 16, 240, 16, 16, 16, 240]); fixtureNote = 'Two isolated synthetic spikes. The means rise, but too few samples sustain pressure. Full remains requested.'; }
  else if (value === 'overload') { trace(Array(8).fill(28)); fixtureNote = 'Two complete synthetic pressure windows request exactly one lower level. Requested and actually applied host budgets remain separate.'; }
  else if (value === 'cooldown') { trace(Array(8).fill(28)); trace([7, 7]); fixtureNote = 'The requested level just changed. Two subsequent synthetic samples advance cooldown but are not stored as recovery evidence.'; }
  else if (value === 'recovery') { trace(Array(24).fill(7)); fixtureNote = 'Six consecutive synthetic headroom windows request one upgrade from economy to balanced. Recovery takes longer than a downgrade.'; }
  else if (value === 'manual') { decision = governor.lock('balanced'); applyRequested(); trace(Array(12).fill(28)); fixtureNote = 'A real manual policy lock. Synthetic pressure still produces bounded diagnostic windows, while the requested level remains balanced.'; }
  else if (value === 'gap') {
    trace(Array(6).fill(28)); traceTime += 1000; ingest(28, traceTime); trace(Array(4).fill(28));
    fixtureNote = 'A synthetic resumed gap is rejected after advancing the timestamp. Old pressure is cleared; the following four samples start a fresh window.';
  } else fixtureNote = 'No trace replayed yet. The default artwork is static.';
  runNote = 'Fixture context / synthetic durations. No native timing collection is running.'; render();
}
function cancelLive(note = 'Native run stopped. Its collected cadence remains labeled native.', complete = false) {
  liveGeneration++; if (frame !== null) window.cancelAnimationFrame(frame);
  if (stopTimer !== null) window.clearTimeout(stopTimer);
  frame = stopTimer = null; const finish = liveResolve; liveResolve = undefined;
  const wasLive = live; live = false; lastFrame = null; if (wasLive) runNote = note;
  finish?.(complete); render();
}
function runLive(): Promise<boolean> {
  cancelTour();
  if (destroyed || reduced() || !context || document.hidden) return Promise.resolve(false);
  if (!target.checkValidity()) { target.reportValidity(); return Promise.resolve(false); }
  const targetMs = target.valueAsNumber;
  if (!Number.isFinite(targetMs) || targetMs < 4 || targetMs > 50) return Promise.resolve(false);
  cancelLive(); install(nativeConfig(targetMs), 'native');
  fixtureNote = 'Native frame-cadence context. No fixture duration is included in these measurements.';
  live = true; liveElapsed = 0; lastFrame = null; liveStart = performance.now(); lastReadback = liveStart;
  const generation = ++liveGeneration;
  runNote = 'Collecting actual native frame cadence for at most six seconds. Readback refreshes at most four times per second.';
  render();
  return new Promise(resolve => {
    liveResolve = resolve;
    const tick = (time: number) => {
      frame = null;
      if (destroyed || !live || generation !== liveGeneration) return;
      if (document.hidden || reduced()) { cancelLive('Native run ended on a visibility or motion boundary.'); draw(0); return; }
      liveElapsed = Math.max(0, time - liveStart);
      if (liveElapsed >= 6000) { cancelLive('Six-second native run complete. Cadence alone establishes no GPU cost or speedup.', true); return; }
      if (lastFrame !== null) ingest(time - lastFrame, time);
      lastFrame = time;
      draw(liveElapsed / 1000 * .8);
      if (time - lastReadback >= 250) { lastReadback = time; render(); }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    stopTimer = window.setTimeout(() => cancelLive('Six-second native run complete. Cadence alone establishes no GPU cost or speedup.', true), 6000);
  });
}
function cancelTour() {
  tourGeneration++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = [];
  const finish = tourResolve; tourResolve = undefined; tourStep = ''; finish?.(false); render();
}
function cancel() { cancelTour(); cancelLive(); }
function reset() {
  if (destroyed) return;
  cancel(); quiet = solid = false; apply = true; target.value = '16.67';
  phase = 0; liveElapsed = 0; runNote = 'Static by default. No automatic timing collection.';
  applications = 0; install(fixtureConfig(), 'fixture'); fixtureNote = 'No trace replayed yet. The default artwork is static.';
  material(); buffer(); draw(0); render();
}
function preset(value: Preset): boolean {
  if (destroyed || !['baseline', 'spike', 'overload', 'cooldown', 'recovery', 'manual', 'gap'].includes(value)) return false;
  cancel(); if (value === 'baseline') reset(); else runPreset(value); return true;
}
function manual(value: Level | 'auto'): boolean {
  if (destroyed || !['auto', ...levels].includes(value)) return false;
  cancelTour(); decision = value === 'auto' ? governor.unlock() : governor.lock(value);
  applyRequested(); render(); return true;
}
function mapping(value: boolean): boolean {
  if (destroyed || typeof value !== 'boolean') return false;
  cancelTour(); apply = value; applyRequested(); render(); return true;
}
function preferences(patch: { quiet?: boolean; solid?: boolean }): boolean {
  if (destroyed || !patch || typeof patch !== 'object' || Object.keys(patch).some(key => !['quiet', 'solid'].includes(key))
    || patch.quiet !== undefined && typeof patch.quiet !== 'boolean' || patch.solid !== undefined && typeof patch.solid !== 'boolean') return false;
  cancelTour(); quiet = patch.quiet ?? quiet; solid = patch.solid ?? solid;
  if (reduced() && live) cancelLive('Native run ended: motion preference requires static artwork.');
  material(); if (reduced()) draw(0); render(); return true;
}
function feed(kind: TraceKind): boolean {
  if (destroyed || !['pressure', 'headroom', 'neutral'].includes(kind)) return false;
  cancel(); if (source !== 'fixture') install(fixtureConfig(), 'fixture');
  selected = 'baseline'; trace(Array(4).fill(kind === 'pressure' ? 28 : kind === 'headroom' ? 7 : 16));
  fixtureNote = 'One additional synthetic ' + kind + ' window supplied to the fixture context.'; render(); return true;
}
function tour(): Promise<boolean> {
  if (destroyed) return Promise.resolve(false);
  reset(); const generation = ++tourGeneration; runPreset('spike'); tourStep = '01 / isolated spikes are not sustained load'; render();
  return new Promise(resolve => {
    tourResolve = resolve;
    const at = (delay: number, action: () => void) => {
      const timer = window.setTimeout(() => {
        tourTimers = tourTimers.filter(value => value !== timer);
        if (!destroyed && generation === tourGeneration) action();
      }, delay); tourTimers.push(timer);
    };
    at(1600, () => { runPreset('overload'); tourStep = '02 / a one-level decision, actually host-applied'; render(); });
    at(3200, () => { runPreset('cooldown'); tourStep = '03 / cooldown discards adaptation evidence'; render(); });
    at(4800, () => { runPreset('recovery'); tourStep = '04 / deliberately slower recovery'; render(); });
    at(6400, () => { runPreset('manual'); tourStep = '05 / pressure cannot override a manual hold'; render(); });
    at(8000, () => { runPreset('gap'); tourStep = '06 / resumed gaps clear stale pressure'; render(); });
    at(9300, () => {
      apply = false; decision = governor.lock('economy');
      fixtureNote = 'The host temporarily declines mapping: economy is requested while the actual artwork remains full.';
      tourStep = 'Host owns rendering / requested is distinct from applied'; render();
    });
    at(10500, () => { apply = true; applyRequested(); tourStep = ''; tourResolve = undefined; render(); resolve(true); });
  });
}
material(); buffer(); draw(0); resize(); render();
const resized = () => resize();
const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : null;
if (observer) observer.observe(canvas); else window.addEventListener('resize', resized);
query('#live').addEventListener('click', () => { void runLive(); });
query('#stop').addEventListener('click', cancel);
query('#reset').addEventListener('click', reset);
query('#tour').addEventListener('click', () => { void tour(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.addEventListener('click', () => { preset(button.dataset.preset as Preset); });
lockField.addEventListener('change', () => { manual(lockField.value as Level | 'auto'); });
applyField.addEventListener('change', () => { mapping(applyField.checked); });
quietField.addEventListener('change', () => { preferences({ quiet: quietField.checked }); });
query('#solid').addEventListener('click', () => { preferences({ solid: !solid }); });
target.addEventListener('input', cancelTour);
const motionChanged = () => {
  if (reduced() && live) cancelLive('Native run ended: OS reduced motion is authoritative.');
  if (reduced()) draw(0); render();
};
const visibilityChanged = () => {
  if (document.hidden) { cancelTour(); if (live) cancelLive('Native run ended: page hidden. A new run starts a fresh context.'); }
};
motion.addEventListener('change', motionChanged); document.addEventListener('visibilitychange', visibilityChanged);
const interaction = (event: Event) => { if (event.isTrusted && tourResolve) cancelTour(); };
document.addEventListener('pointerdown', interaction); document.addEventListener('keydown', interaction);
const state = () => ({
  source: source === 'fixture' ? 'deterministic synthetic fixture' : 'native frame-cadence',
  config: { ...config, levels: [...config.levels] }, governor: governor.state, decision,
  selected, observed, rejected, events: events.map(event => ({ ...event })),
  host: { apply, applied, budget: { ...budgets[applied] }, width: canvas.width, height: canvas.height,
    pixels: canvas.width * canvas.height, cssWidth, cssHeight, canvasAvailable: Boolean(context), draws, applications },
  live, liveElapsed, pendingFrame: frame !== null, pendingStopTimer: stopTimer !== null,
  quiet, systemReduced: motion.matches, solid, tourStep, pendingTourSteps: tourTimers.length,
  focus: document.activeElement?.id || document.activeElement?.tagName || null,
});
const demo = { preset, reset, tour, cancel, state, run: runLive, manual, mapping, preferences, feed };
(window as Window & { __qualityDemo?: typeof demo }).__qualityDemo = demo;
window.addEventListener('pagehide', () => {
  cancel(); destroyed = true; observer?.disconnect(); window.removeEventListener('resize', resized);
  motion.removeEventListener('change', motionChanged); document.removeEventListener('visibilitychange', visibilityChanged);
  document.removeEventListener('pointerdown', interaction); document.removeEventListener('keydown', interaction);
}, { once: true });
