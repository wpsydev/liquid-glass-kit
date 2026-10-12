import { projectGlassAnchor } from '../../src/project-anchor.js';
import type { GlassAnchorPoint, GlassAnchorProjection } from '../../src/project-anchor.js';
import '../../src/material.css';
import './style.css';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const scene = get('scene'), svg = get('geometry') as unknown as SVGSVGElement;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
type ObjectId = 'facet' | 'plate' | 'spire' | 'probe';
type Preset = 'scene' | 'parallax' | 'boundary' | 'behind';
const names: Record<ObjectId, string> = { facet: 'Cut facet', plate: 'Glass plane', spire: 'Open spire', probe: 'Reference anchor' };
const basePoints: Record<ObjectId, GlassAnchorPoint> = { facet: [-1.9, .85, -6], plate: [0, -.2, -5.5], spire: [1.9, .95, -6.4], probe: [3, -1.5, -6] };
let probe: GlassAnchorPoint = [...basePoints.probe], selected: ObjectId = 'facet', yaw = -16, fov = 52;
let width = 640, height = 360, matrix: number[] = [], projections: Record<ObjectId, GlassAnchorProjection>;
let timers: number[] = [], touring = false, renders = 0, destroyed = false;
const quiet = () => get<HTMLInputElement>('quiet').checked || motion.matches;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function multiply(a: readonly number[], b: readonly number[]): number[] { const result = Array(16).fill(0) as number[]; for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) result[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return result; }
const translation = (x: number, y: number, z: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
function cameraMatrix() {
  const radians = yaw * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
  const rotation = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  // Rigid world-to-camera transform orbits the camera about world pivot [0,0,-6].
  const view = multiply(translation(0, 0, -6), multiply(rotation, translation(0, 0, 6)));
  const focal = 1 / Math.tan(fov * Math.PI / 360), near = .5, far = 30;
  const perspective = [focal / (width / height), 0, 0, 0, 0, focal, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
  return multiply(perspective, view);
}
const project = (point: GlassAnchorPoint) => projectGlassAnchor({ point, viewProjection: matrix, viewport: { width, height } });
const node = (tag: string, attributes: Record<string, string | number>) => { const result = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attributes)) result.setAttribute(key, String(value)); return result; };
function line(group: SVGElement, from: GlassAnchorPoint, to: GlassAnchorPoint, color: string, opacity = 1) { const a = project(from), b = project(to); if (a.projectable && b.projectable) group.append(node('line', { x1: a.x!, y1: a.y!, x2: b.x!, y2: b.y!, stroke: color, 'stroke-width': 1, opacity })); }
type Face = { points: GlassAnchorPoint[]; color: string; opacity: number; object: ObjectId };
function cube(center: GlassAnchorPoint, size: GlassAnchorPoint, angle: number, colors: string[], id: ObjectId, opacity = 1): Face[] {
  const [cx, cy, cz] = center, [sx, sy, sz] = size, c = Math.cos(angle), s = Math.sin(angle);
  const vertices: GlassAnchorPoint[] = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => [cx + x * sx / 2 * c + z * sz / 2 * s, cy + y * sy / 2, cz - x * sx / 2 * s + z * sz / 2 * c]);
  return [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [1, 5, 6, 2], [0, 3, 7, 4]].map((indices, index) => ({ points: indices.map(i => vertices[i]), color: colors[index % colors.length], opacity, object: id }));
}
function faces(): Face[] {
  const center: GlassAnchorPoint = [-1.9, -.05, -6], vertices: GlassAnchorPoint[] = [[-.8, 0, 0], [.8, 0, 0], [0, 1.15, 0], [0, -.95, 0], [0, 0, .65], [0, 0, -.65]].map(([x, y, z]) => [center[0] + x, center[1] + y, center[2] + z]);
  const facet: Face[] = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]].map((indices, index) => ({ points: indices.map(i => vertices[i]), color: ['#76c7ad', '#b3edb3', '#319c81', '#448c73'][index % 4], opacity: .92, object: 'facet' }));
  const plate = cube([0, -.15, -5.5], [1.55, .75, .12], -.42, ['#cce9d0', '#a0d5bf', '#437865'], 'plate', .25);
  const spire = cube([1.9, -.05, -6.4], [.65, 1.8, .7], .62, ['#d3e898', '#b3c666', '#78944e'], 'spire', .84);
  return [...facet, ...plate, ...spire];
}
function render() {
  if (destroyed) return;
  matrix = cameraMatrix(); renders++;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const floor = node('g', {}); for (let x = -4; x <= 4; x++) line(floor, [x, -1.2, -4], [x, -1.2, -12], '#88b1a4', .18); for (let z = -4; z >= -12; z--) line(floor, [-4, -1.2, z], [4, -1.2, z], '#88b1a4', .18);
  const art = node('g', {});
  const polygons = faces().map(face => ({ face, points: face.points.map(project) })).filter(item => item.points.every(point => point.projectable));
  // Simple SVG painter ordering is decorative, not a geometry occlusion test for labels.
  polygons.sort((a, b) => b.points.reduce((sum, point) => sum + point.depth!, 0) / b.points.length - a.points.reduce((sum, point) => sum + point.depth!, 0) / a.points.length);
  for (const { face, points } of polygons) art.append(node('polygon', { points: points.map(point => `${point.x},${point.y}`).join(' '), fill: face.color, 'fill-opacity': face.opacity, stroke: face.object === selected ? '#e6f5b4' : '#bde2ca', 'stroke-opacity': face.object === selected ? .8 : .28, 'stroke-width': face.object === selected ? 1.6 : .7 }));
  const leaders = node('g', {}); projections = {} as Record<ObjectId, GlassAnchorProjection>;
  for (const id of Object.keys(names) as ObjectId[]) {
    const projection = project(id === 'probe' ? probe : basePoints[id]); projections[id] = projection;
    const label = get(`label-${id}`); label.hidden = !projection.inFrustum || !projection.projectable;
    label.dataset.selected = String(id === selected);
    if (!label.hidden) {
      // Host keeps the readable label box within gutters; the leader preserves its actual point.
      const half = width <= 400 ? 60 : 68, topOffset = id === 'plate' ? 95 : id === 'probe' ? -12 : -47;
      const x = clamp(projection.x!, half + 8, width - half - 8), y = clamp(projection.y! + topOffset, 68, height - 34);
      label.style.left = `${x}px`; label.style.top = `${y}px`;
      leaders.append(node('line', { x1: projection.x!, y1: projection.y!, x2: x, y2: y, stroke: '#cde9b8', 'stroke-opacity': .48, 'stroke-width': 1 }));
      leaders.append(node('circle', { cx: projection.x!, cy: projection.y!, r: id === selected ? 4 : 2.5, fill: '#e7f3aa' }));
    }
  }
  svg.replaceChildren(floor, art, leaders);
  document.querySelectorAll<HTMLButtonElement>('[data-object]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.object === selected)));
  const point = selected === 'probe' ? probe : basePoints[selected], result = projections[selected];
  get('world').textContent = point.map(value => value.toFixed(2)).join(' / '); get('pixels').textContent = result.projectable ? `${result.x!.toFixed(1)} / ${result.y!.toFixed(1)}` : 'Not projected'; get('depth').textContent = result.depth === null ? '—' : result.depth.toFixed(4);
  get('decision').dataset.kind = result.behindCamera ? 'behind' : result.inFrustum ? 'inside' : 'outside';
  get('decision-title').textContent = result.behindCamera ? 'Behind the camera' : result.inFrustum ? 'Inside the clip volume' : result.projectable ? 'Outside the clip volume' : 'Projection unavailable';
  get('decision-note').textContent = result.behindCamera ? 'W ≤ 0. The host hides this label. The inspector keeps the point.' : result.inFrustum ? 'Positive W, valid clip depth. The host shows an HTML label.' : result.projectable ? 'Positive W, finite CSS coordinates. The host hides the off-frustum label.' : 'No safe CSS coordinates. The host hides the label.';
  get('viewport').textContent = `${Math.round(width)} × ${Math.round(height)} CSS PX`; get('pose').textContent = `CAMERA ${yaw.toFixed(0)}° / FOV ${fov.toFixed(0)}°`;
  get<HTMLInputElement>('yaw').value = String(yaw); get<HTMLInputElement>('fov').value = String(fov); get<HTMLOutputElement>('yaw-value').value = `${yaw.toFixed(0)}°`; get<HTMLOutputElement>('fov-value').value = `${fov.toFixed(0)}°`;
  get('matrix').textContent = Array.from({ length: 4 }, (_, row) => [0, 1, 2, 3].map(column => matrix[column * 4 + row].toFixed(4).padStart(9)).join(' ')).join('\n');
}
function resize() { const rect = scene.getBoundingClientRect(); if (rect.width > 0 && rect.height > 0) { width = rect.width; height = rect.height; } render(); }
function status(message: string) { if (get('status').textContent !== message) get('status').textContent = message; }
function stopTour() { timers.forEach(window.clearTimeout); timers = []; touring = false; get('tour').textContent = 'Play 10s tour'; }
function cancel() { stopTour(); status('Camera tour stopped. The current scene is retained.'); }
function setCamera(nextYaw: number, nextFov = fov) { yaw = clamp(nextYaw, -35, 35); fov = clamp(nextFov, 35, 65); render(); }
function syncProbeFields() { ['x', 'y', 'z'].forEach((axis, index) => { get<HTMLInputElement>(`point-${axis}`).value = String(probe[index]); }); get('draft-note').textContent = 'Edit the real world point.'; }
function configure(id: Preset) {
  if (!['scene', 'parallax', 'boundary', 'behind'].includes(id)) return;
  selected = id === 'boundary' || id === 'behind' ? 'probe' : 'facet';
  probe = id === 'boundary' ? [10, .5, -6] : id === 'behind' ? [0, .5, 3] : [...basePoints.probe];
  yaw = id === 'parallax' ? 26 : id === 'scene' ? -16 : 0; fov = id === 'parallax' ? 43 : 52;
  syncProbeFields(); render(); status(id === 'behind' ? 'Reference point behind camera. No mirrored label is drawn.' : id === 'boundary' ? 'Reference point outside the frustum. Finite coordinates remain inspectable.' : 'Camera changed. HTML labels follow their world points.');
}
function presets(id: Preset) { stopTour(); configure(id); }
function reset() { stopTour(); get<HTMLInputElement>('quiet').checked = get<HTMLInputElement>('solid').checked = false; document.documentElement.classList.remove('solid'); document.documentElement.classList.toggle('quiet', quiet()); renders = 0; configure('scene'); status('Ready. No camera loop is running.'); }
function tour() {
  const keepQuiet = get<HTMLInputElement>('quiet').checked, keepSolid = get<HTMLInputElement>('solid').checked;
  reset();
  get<HTMLInputElement>('quiet').checked = keepQuiet; get<HTMLInputElement>('solid').checked = keepSolid;
  document.documentElement.classList.toggle('quiet', quiet()); document.documentElement.classList.toggle('solid', keepSolid);
  touring = true; get('tour').textContent = 'Stop tour';
  const schedule = (at: number, action: () => void) => timers.push(window.setTimeout(action, at));
  // A bounded user-triggered tour uses scheduled camera poses, never an idle RAF/interval.
  const poses = (at: number, duration: number, fromYaw: number, toYaw: number, fromFov: number, toFov: number) => {
    const count = quiet() ? 1 : 30;
    for (let i = 1; i <= count; i++) schedule(at + duration * i / count, () => { if (quiet() && i < count) return; const t = i / count, eased = t * t * (3 - 2 * t); setCamera(fromYaw + (toYaw - fromYaw) * eased, fromFov + (toFov - fromFov) * eased); });
  };
  poses(300, 1500, -16, 26, 52, 43);
  schedule(2600, () => { selected = 'plate'; render(); status('Glass plane selected in a stable HTML inspector.'); });
  schedule(3800, () => configure('boundary')); schedule(5100, () => configure('behind'));
  schedule(6500, () => configure('parallax')); poses(6700, 1500, 26, -24, 43, 52);
  schedule(8800, () => { get<HTMLInputElement>('quiet').checked = true; document.documentElement.classList.add('quiet'); configure('scene'); status('Quiet camera. Static scene, native labels and inspector retained.'); });
  schedule(10000, () => { stopTour(); status('Tour complete. No camera loop or tour timer remains.'); });
}
get('left').addEventListener('click', () => { cancel(); setCamera(yaw - 12); status('Camera moved left. Matrix and projected labels updated.'); });
get('right').addEventListener('click', () => { cancel(); setCamera(yaw + 12); status('Camera moved right. Matrix and projected labels updated.'); });
get('tour').addEventListener('click', () => touring ? cancel() : tour());
for (const id of ['yaw', 'fov']) get<HTMLInputElement>(id).addEventListener('input', () => { stopTour(); setCamera(Number(get<HTMLInputElement>('yaw').value), Number(get<HTMLInputElement>('fov').value)); });
document.querySelectorAll<HTMLButtonElement>('[data-object]').forEach(button => button.addEventListener('click', () => { stopTour(); selected = button.dataset.object as ObjectId; render(); status(`${names[selected]} selected. This inspector stays available outside the scene.`); }));
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => presets(button.dataset.preset as Preset)));
for (const axis of ['x', 'y', 'z']) get<HTMLInputElement>(`point-${axis}`).addEventListener('input', () => {
  stopTour(); const inputs = ['x', 'y', 'z'].map(key => get<HTMLInputElement>(`point-${key}`));
  if (inputs.some(input => !input.value || !input.validity.valid || !Number.isFinite(input.valueAsNumber))) { get('draft-note').textContent = 'Complete a valid coordinate. The last point is retained.'; return; }
  probe = inputs.map(input => input.valueAsNumber) as unknown as GlassAnchorPoint; selected = 'probe'; get('draft-note').textContent = 'World point changed. Projection recomputed.'; render();
});
get<HTMLInputElement>('quiet').addEventListener('change', () => { stopTour(); document.documentElement.classList.toggle('quiet', quiet()); status(quiet() ? 'Quiet camera. Intentional controls still update on demand.' : 'Camera controls ready. No default render loop.'); });
get<HTMLInputElement>('solid').addEventListener('change', () => document.documentElement.classList.toggle('solid', get<HTMLInputElement>('solid').checked));
motion.addEventListener('change', () => { stopTour(); document.documentElement.classList.toggle('quiet', quiet()); status(quiet() ? 'System motion reduction respected. Decorative camera tour stopped.' : 'Intentional camera controls remain available.'); });
const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : undefined; observer?.observe(scene); window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
window.addEventListener('pagehide', () => { stopTour(); destroyed = true; observer?.disconnect(); });
window.addEventListener('pageshow', () => { if (destroyed) { destroyed = false; observer?.observe(scene); resize(); } });
resize(); syncProbeFields(); document.documentElement.classList.toggle('quiet', quiet());
declare global { interface Window { __anchorDemo: { presets: typeof presets; preset: typeof presets; reset: typeof reset; tour: typeof tour; cancel: typeof cancel; state: () => { selected: ObjectId; yaw: number; fov: number; quiet: boolean; touring: boolean; renders: number; viewport: { width: number; height: number }; matrix: readonly number[]; points: Record<ObjectId, GlassAnchorProjection> } } } }
window.__anchorDemo = { presets, preset: presets, reset, tour, cancel, state: () => ({ selected, yaw, fov, quiet: quiet(), touring, renders, viewport: { width, height }, matrix: [...matrix], points: { ...projections } }) };
