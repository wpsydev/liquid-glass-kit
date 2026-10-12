import { attachGlassShaderBackdrop } from '../../src/shader-backdrop.js';
import type { GlassShaderBackdropState } from '../../src/shader-backdrop.js';
import '../../src/material.css';
import './style.css';

type Study = 'ice' | 'solar' | 'tidal';
type Preset = Study | 'values' | 'failure' | 'quiet' | 'solid';
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('backdrop'), frame = get('art-frame'), glass = get('glass-note');
const gain = get<HTMLInputElement>('gain'), detail = get<HTMLInputElement>('detail'), warmth = get<HTMLInputElement>('warmth'), seek = get<HTMLInputElement>('seek');
const quiet = get<HTMLInputElement>('quiet'), solid = get<HTMLInputElement>('solid');
const provenance = { author: 'wpsydev · original Light Studies functions', license: 'MIT' };
const studies = {
  ice: { number: '01', title: 'The shape of quiet.', copy: 'A cold contour. A warm edge.\nLeave a little space for the light.', category: 'COOL / SCULPTED / STILL', fragment: `
vec4 glassBackdrop(vec2 pixel) {
  vec2 p = (pixel - uResolution * .5) / min(uResolution.x, uResolution.y);
  float t = uTime * .35;
  vec3 paper = mix(vec3(.92,.97,.96),vec3(.98,.96,.89),uWarmth);
  vec3 color = paper;
  float drift = .055 * sin(t);
  vec2 q = p - vec2(.06 + drift,.10);
  float angle = .34 + .12 * sin(t * .7);
  q = mat2(cos(angle),-sin(angle),sin(angle),cos(angle)) * q;
  float ellipse = length(q / vec2(.48,.32));
  float body = 1.0 - smoothstep(.88,1.03,ellipse);
  float rimDistance = (ellipse-.94)*28.0;
  float ring = exp(-rimDistance*rimDistance);
  vec3 ice = mix(vec3(.11,.57,.67),vec3(.70,.91,.92),clamp(q.y+.5,0.0,1.0));
  float contour = .5 + .5 * sin((q.x * 13.0 + q.y * 7.0 + sin(q.y * 5.0-t)) * uDetail);
  ice += vec3(.12,.18,.17) * contour;
  color = mix(color,ice,body*.76);
  color += vec3(.27,.25,.16) * ring * uGain;
  float lineDistance = (q.x + .10*sin(q.y*7.0-t) + .07)*45.0;
  float line = exp(-lineDistance*lineDistance);
  color += vec3(.24,.31,.29)*line*body*uGain;
  float halo = exp(-dot(p-vec2(-.28,.25),p-vec2(-.28,.25))*10.0);
  color += vec3(.07,.045,.02) * halo * uGain;
  return vec4(clamp(color,0.0,1.0),1.0);
}` },
  solar: { number: '02', title: 'Let the warmth in.', copy: 'A small sun, held in orbit.\nA brighter place to begin.', category: 'WARM / ORBITAL / CLEAR', fragment: `
vec4 glassBackdrop(vec2 pixel) {
  vec2 p = (pixel - uResolution*.5)/min(uResolution.x,uResolution.y);
  float t = uTime*.32;
  vec3 color = mix(vec3(.99,.95,.86),vec3(.98,.90,.78),uWarmth);
  vec2 q = p - vec2(.07,.12);
  float r = length(q);
  float sun = 1.0-smoothstep(.24,.25,r);
  vec3 gold = mix(vec3(.97,.63,.23),vec3(1.0,.83,.43),clamp(q.y*2.0+.5,0.0,1.0));
  float filaments = .5+.5*sin((q.x*25.0+sin(q.y*13.0+t)*2.0)*uDetail);
  gold += vec3(.10,.09,.04)*filaments*uGain;
  color = mix(color,gold,sun);
  float a = -.42 + .16*sin(t);
  vec2 orbit = mat2(cos(a),-sin(a),sin(a),cos(a))*q;
  float ring = abs(length(orbit/vec2(.52,.18))-1.0);
  float edge = 1.0-smoothstep(.022,.044,ring);
  vec3 brass = mix(vec3(.69,.39,.17),vec3(1.0,.92,.65),clamp(orbit.y*4.0+.5,0.0,1.0));
  color = mix(color,brass,edge*.83);
  float bloom = exp(-r*r*5.0)*(1.0-sun);
  color += vec3(.06,.035,.003)*bloom*uGain;
  float small = 1.0-smoothstep(.022,.029,length(p-vec2(-.39+.025*sin(t),.35)));
  color = mix(color,vec3(.97,.68,.28),small);
  return vec4(clamp(color,0.0,1.0),1.0);
}` },
  tidal: { number: '03', title: 'A softer horizon.', copy: 'Slow curves. Deep blue.\nA little room between the waves.', category: 'BLUE / FLOWING / OPEN', fragment: `
vec4 glassBackdrop(vec2 pixel) {
  vec2 p=(pixel-uResolution*.5)/min(uResolution.x,uResolution.y);
  float t=uTime*.3;
  vec3 color=mix(vec3(.89,.95,.98),vec3(.95,.96,.88),uWarmth);
  for(int i=0;i<4;i++) {
    float k=float(i);
    float center=.16*sin(p.x*(2.7+k*.3)*uDetail+t+k*.75)+(k-1.5)*.15+.14;
    float d=abs(p.y-center);
    float band=1.0-smoothstep(.054,.078,d);
    vec3 blue=mix(vec3(.03,.30,.54),vec3(.45,.77,.87),k/3.0);
    color=mix(color,blue,band*.57);
    float rimDistance=(p.y-center-.045)*72.0;
    float rim=exp(-rimDistance*rimDistance);
    color+=vec3(.17,.21,.19)*rim*uGain;
  }
  float orb=length((p-vec2(.24,.18))/vec2(.22,.22));
  float orbDistance=(orb-.98)*22.0;
  float rim=exp(-orbDistance*orbDistance);
  color+=vec3(.25,.26,.24)*rim*uGain;
  float glint=exp(-dot(p-vec2(.14,.31),p-vec2(.14,.31))*140.0);
  color+=vec3(.22)*glint*uGain;
  return vec4(clamp(color,0.0,1.0),1.0);
}` },
} satisfies Record<Study, { number: string; title: string; copy: string; category: string; fragment: string }>;
let active: Study = 'ice', touring = false, disposed = false, controller: ReturnType<typeof attachGlassShaderBackdrop>;
let timers: number[] = [], playTimer: number | null = null, latest: Readonly<GlassShaderBackdropState> | undefined;
let telemetryFrames = -20, telemetryMode = '', diagnosticsText = '', previewTime = 0, failedReplacement = false;
const saved = new Set<Study>();
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const solidQueries = ['(prefers-reduced-transparency: reduce)', '(forced-colors: active)', '(prefers-contrast: more)'].map(query => window.matchMedia(query));
const status = (text: string) => { get('status').textContent = text; };
const systemSolid = () => solidQueries.some(query => query.matches);
const values = () => ({ uGain: Number(gain.value), uDetail: Number(detail.value), uWarmth: Number(warmth.value) });
function showValues() { get('gain-value').textContent = Number(gain.value).toFixed(2); get('detail-value').textContent = Number(detail.value).toFixed(2); get('warmth-value').textContent = Number(warmth.value).toFixed(2); get('seek-value').textContent = `${Number(seek.value).toFixed(1)}s`; }
function showStudy() {
  const study = studies[active]; frame.dataset.study = active; get('art-number').textContent = study.number; get('study-title').textContent = study.title;
  get('study-copy').textContent = study.copy; get('card-category').textContent = study.category;
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-study]')) button.setAttribute('aria-pressed', String(button.dataset.study === active));
  get('save').setAttribute('aria-pressed', String(saved.has(active))); get('save').firstChild!.textContent = saved.has(active) ? 'Study kept locally ' : 'Keep this study ';
}
function stateChanged(state: Readonly<GlassShaderBackdropState>) {
  if (disposed) return; latest = state;
  const fallback = state.status !== 'ready' || solid.checked || systemSolid();
  const mode = `${state.status}/${state.playing}/${fallback}/${state.reason}/${state.width}/${state.height}`, changedMode = mode !== telemetryMode;
  if (!state.playing || mode !== telemetryMode || state.submittedFrames - telemetryFrames >= 20) {
    telemetryFrames = state.submittedFrames; telemetryMode = mode;
    get('dimensions').textContent = state.width && state.height ? `${state.width} × ${state.height}` : 'No active backing'; get('pixels').textContent = state.pixels.toLocaleString('en-US'); get('submissions').textContent = String(state.submittedFrames);
  }
  if (changedMode) {
    frame.dataset.fallback = String(fallback); canvas.hidden = fallback; glass.dataset.lgSolid = String(solid.checked || systemSolid());
    get('backend').textContent = fallback ? solid.checked || systemSolid() ? 'HOST SOLID / CSS FALLBACK' : 'HOST CSS / WEBGL UNAVAILABLE' : 'WEBGL2 / OWNED BACKDROP';
    get('motion-label').textContent = state.playing ? 'FINITE PLAY / ACTIVE CLOCK' : quiet.checked || reduced.matches ? 'QUIET / STATIC TIME ZERO' : 'STILL / EXPLICIT PLAY';
    get<HTMLButtonElement>('play').disabled = fallback || quiet.checked || reduced.matches || state.status !== 'ready';
    get<HTMLButtonElement>('broken').disabled = state.status !== 'ready' || fallback;
    get('play').textContent = state.playing ? 'Playing · 6s max' : 'Play 6s';
  }
  if (state.diagnostics !== diagnosticsText) { diagnosticsText = state.diagnostics; get('compiler-log').textContent = diagnosticsText || 'No compilation messages.'; }
  if ((touring || playTimer !== null) && ['hidden', 'offscreen', 'context'].includes(state.reason)) { cancel(); status('Playback stopped at the visibility or context boundary. Return stays still until you choose Play.'); }
}
function mount() {
  if (controller) controller.destroy(); canvas.hidden = false; frame.dataset.fallback = 'false'; telemetryFrames = -20; telemetryMode = ''; diagnosticsText = '';
  const uniformValues = values();
  controller = attachGlassShaderBackdrop(canvas, { fragment: studies[active].fragment, provenance, uniforms: { uGain: { type: 'float', value: uniformValues.uGain }, uDetail: { type: 'float', value: uniformValues.uDetail }, uWarmth: { type: 'float', value: uniformValues.uWarmth } }, maxDpr: 1.5, maxPixels: 786_432, maxDimension: 1536, reducedMotion: quiet.checked, enabled: !solid.checked, onStatus: stateChanged });
  if (previewTime !== 0 && !quiet.checked && !reduced.matches) controller.render(previewTime);
  stateChanged(controller.state);
}
function cancel() { for (const timer of timers) clearTimeout(timer); timers = []; if (playTimer !== null) clearTimeout(playTimer); playTimer = null; touring = false; controller?.pause(); get('tour').textContent = 'Play 10.5s tour'; }
function playFinite(duration = 6000) {
  if (playTimer !== null) clearTimeout(playTimer);
  if (!controller.play()) { playTimer = null; status('This policy or browser keeps the study still. Native controls and the host fallback remain usable.'); return; }
  playTimer = window.setTimeout(() => { playTimer = null; controller.pause(); stateChanged(controller.state); status('Finite playback complete. The study stays still; nothing restarts in the background.'); }, duration);
}
function choose(name: Study) {
  controller.pause(); const changed = active !== name;
  if (changed && controller.supported && !solid.checked) {
    if (!controller.replaceFragment(studies[name].fragment, provenance)) { failedReplacement = true; get('replacement-result').textContent = 'The new shader did not compile. The previous valid study remains.'; stateChanged(controller.state); return; }
    active = name;
  } else active = name;
  showStudy(); failedReplacement = false; get('replacement-result').textContent = 'A valid study stays in place if compilation fails.';
  if (!controller.supported || solid.checked) mount(); else controller.render(previewTime);
  stateChanged(controller.state); status(`${studies[active].number} ${active} selected. Original shader, static until explicit playback.`);
}
function tryFailure() {
  controller.pause(); if (!controller.supported) { status('WebGL is unavailable; the host fallback remains readable.'); return; }
  const before = active, accepted = controller.replaceFragment('vec4 glassBackdrop(vec2 pixel) { return vec4(1.0) BROKEN_TOKEN; }', provenance);
  failedReplacement = !accepted; get('replacement-result').textContent = accepted ? 'Unexpected compile result: inspect the diagnostics.' : `Replacement rejected. ${studies[before].number} ${before} remains the last valid study.`;
  get<HTMLDetailsElement>('diagnostics').open = true; controller.render(previewTime); stateChanged(controller.state);
  status(accepted ? 'The test fragment was unexpectedly accepted; inspect native compiler behavior.' : 'Actual invalid GLSL was rejected. The last valid shader and its original provenance remain in place.');
}
function applyPreset(name: Preset) {
  if (!['ice', 'solar', 'tidal', 'values', 'failure', 'quiet', 'solid'].includes(name)) throw new TypeError('Unknown Light Studies preset');
  if (name === 'ice' || name === 'solar' || name === 'tidal') { previewTime = name === 'ice' ? 0 : name === 'solar' ? 2.8 : 6.2; seek.value = String(previewTime); choose(name); showValues(); }
  else if (name === 'values') { gain.value = '1.45'; detail.value = '1.3'; warmth.value = '.65'; showValues(); controller.updateUniforms(values()); status('Real glow, detail and warmth uniforms changed. The existing program is reused.'); }
  else if (name === 'failure') tryFailure();
  else if (name === 'quiet') { quiet.checked = true; mount(); status('Quiet light selected. Animation uniforms use time zero and the study stays still.'); }
  else { solid.checked = true; controller.pause(); controller.setEnabled(false); stateChanged(controller.state); status('Host solid fallback selected. Shader playback stops; native text and controls stay readable.'); }
}
function preset(name: Preset) { cancel(); applyPreset(name); }
function reset() {
  cancel(); active = 'ice'; previewTime = 0; gain.value = '1'; detail.value = '1'; warmth.value = '.35'; seek.value = '0'; quiet.checked = false; solid.checked = false; failedReplacement = false;
  get<HTMLDetailsElement>('diagnostics').open = false; get('replacement-result').textContent = 'A valid study stays in place if compilation fails.'; showStudy(); showValues(); mount();
  status('Choose a study or adjust a real shader value. Nothing plays in the background.');
}
function tour() {
  reset(); touring = true; get('tour').textContent = 'Stop tour'; playFinite(2100);
  for (const [time, action] of [[2400, () => { applyPreset('solar'); playFinite(2000); }], [4500, () => applyPreset('values')], [5700, () => { applyPreset('tidal'); playFinite(2200); }], [8300, () => applyPreset('failure')]] as const) timers.push(window.setTimeout(() => { if (!disposed && !document.hidden) action(); else cancel(); }, time));
  timers.push(window.setTimeout(() => { cancel(); stateChanged(controller.state); status('Tour complete. Three original studies, real parameter changes and a retained valid shader. Playback has stopped.'); }, 10500));
}
showStudy(); showValues(); mount();
for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-study]')) button.addEventListener('click', () => { cancel(); choose(button.dataset.study as Study); });
for (const input of [gain, detail, warmth]) input.addEventListener('input', () => { cancel(); showValues(); controller.updateUniforms(values()); stateChanged(controller.state); status('Real shader values changed. One parameter update; no program recompilation.'); });
seek.addEventListener('input', () => { cancel(); previewTime = Number(seek.value); showValues(); controller.render(previewTime); stateChanged(controller.state); status(`Explicit study time ${previewTime.toFixed(1)}s. Seeking stays paused.`); });
get('play').addEventListener('click', () => { cancel(); playFinite(); }); get('pause').addEventListener('click', () => { cancel(); stateChanged(controller.state); status('Playback paused. The last frame remains, with no automatic restart.'); });
get('broken').addEventListener('click', () => { cancel(); tryFailure(); });
get('save').addEventListener('click', () => { if (saved.has(active)) saved.delete(active); else saved.add(active); showStudy(); status(saved.has(active) ? 'Study kept locally in this tab. No account or upload.' : 'Local study bookmark removed.'); });
quiet.addEventListener('change', () => { cancel(); mount(); status(quiet.checked ? 'Quiet time-zero study selected.' : 'Quiet override removed. Playback still requires an explicit choice.'); });
solid.addEventListener('change', () => { cancel(); if (solid.checked) { controller.setEnabled(false); stateChanged(controller.state); } else { canvas.hidden = false; controller.setEnabled(true); controller.render(previewTime); stateChanged(controller.state); } status(solid.checked ? 'Host CSS fallback selected. Native controls remain visible.' : 'Shader enabled again, still paused.'); });
get('tour').addEventListener('click', () => touring ? cancel() : tour()); get('reset').addEventListener('click', reset);
for (const query of [reduced, ...solidQueries]) query.addEventListener('change', () => { cancel(); if (!solid.checked && !systemSolid()) canvas.hidden = false; controller.render(previewTime); stateChanged(controller.state); });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
window.addEventListener('pagehide', () => { cancel(); disposed = true; controller.destroy(); }); window.addEventListener('pageshow', () => { if (!disposed) return; disposed = false; mount(); });
declare global { interface Window { __shaderDemo: { tour: typeof tour; reset: typeof reset; cancel: typeof cancel; preset: typeof preset; state: () => object } } }
window.__shaderDemo = { tour, reset, cancel, preset, state: () => ({ ...controller.state, study: active, values: values(), seek: previewTime, touring, quiet: quiet.checked, solid: solid.checked, failedReplacement, keptStudies: [...saved], fallback: frame.dataset.fallback === 'true', shaders: Object.keys(studies), latest: latest?.status }) };
