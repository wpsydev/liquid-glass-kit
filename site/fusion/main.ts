import './style.css';
import { attachGlassScene, type GlassSceneDrop, type GlassSceneOptions } from '../../src/scene.js';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('glass');
const art = get('art');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
type Mode = 'merge' | 'orbit' | 'split';
type Tone = 'cobalt' | 'citrus' | 'rose';
let mode: Mode = 'merge', tone: Tone = 'cobalt', tension = 64, paused = false;
let width = 1, height = 1, time = 0, frame: number | null = null, previous: number | null = null;
let filmStart: number | null = null, filmEvent = 0, filmElapsed = 0, destroyed = false;
let dragIndex = -1, dragX = 0, dragY = 0, captureId: number | null = null;
const drops: GlassSceneDrop[] = Array.from({ length: 3 }, () => ({ x: 0, y: 0, radius: 80 }));
const palettes = { cobalt: 'neon', citrus: 'sunset', rose: 'ocean' } as const;
const names: Record<Mode, [string, string, string]> = {
  merge: ['01', 'ATTRACTION', 'Separate forms. A shared silhouette.'],
  orbit: ['02', 'IN ORBIT', 'Follow the edge. Feel the connection.'],
  split: ['03', 'RELEASE', 'Three forms. Finding their own space.'],
};
const options = (): GlassSceneOptions => ({ paused: true, backdrop: 'studio', palette: palettes[tone], maxDpr: 1.5, maxPixels: 900_000,
  fusion: { drops, smoothness: tension, refraction: 62, dispersion: 3 } });
const scene = attachGlassScene(canvas, options());
function label(id: string, text: string) { const e = get(id); if (e.textContent !== text) e.textContent = text; }
function ui() {
  for (const id of ['merge', 'orbit', 'split'] as const) get(id).setAttribute('aria-pressed', String(mode === id));
  for (const id of ['cobalt', 'citrus', 'rose'] as const) get(id).setAttribute('aria-pressed', String(tone === id));
  get('pause').setAttribute('aria-pressed', String(paused || reduced.matches));
  get('pause').setAttribute('aria-label', paused || reduced.matches ? 'Resume sculpture' : 'Pause sculpture');
  get<HTMLInputElement>('tension').value = String(tension);
  const name = names[mode]; label('chapter-number', name[0]);
  if (document.body.dataset.end !== 'true') { label('chapter-name', name[1]); label('chapter-note', name[2]); }
  label('status', `${name[1]}. ${tone} light. Three decorative glass droplets. ${paused || reduced.matches ? 'Motion paused.' : 'Motion running.'}`);
  get('unsupported').hidden = scene.supported;
}
function geometry(seconds: number, immediate = false, dt = .016) {
  const portrait = width < 950;
  const radius = Math.min(width * (portrait ? .26 : .17), height * (portrait ? .24 : .27));
  const cx = width * (portrait ? .55 : .65), cy = height * (portrait ? .60 : .53);
  const t = seconds * .8;
  const ease = immediate ? 1 : 1 - Math.exp(-dt * 14);
  for (let i = 0; i < 3; i++) {
    let x = cx, y = cy;
    const r = radius * (i === 0 ? 1.04 : i === 1 ? .72 : .52);
    if (mode === 'merge') {
      const separation = .9 + .6 * Math.sin(t);
      x += radius * (i === 0 ? -.2 : i === 1 ? separation : -separation * 1.1);
      y += radius * (i === 0 ? .1 : i === 1 ? -.6 * Math.sin(t * .65 + 1) : .62 * Math.cos(t * .7));
    } else if (mode === 'orbit') {
      const angle = t * .7 + i * 2.094;
      const distance = radius * (i === 0 ? .28 : i === 1 ? 1.08 : 1.38);
      x += Math.cos(angle) * distance;
      y += Math.sin(angle) * distance * .82;
    } else {
      x += radius * (i - 1) * 1.65;
      y += radius * (i === 0 ? -.54 : i === 1 ? .28 : -.28) + Math.sin(t + i * 1.5) * radius * .13;
    }
    if (i === dragIndex) { x = dragX; y = dragY; }
    const drop = drops[i];
    drop.x += (x - drop.x) * ease; drop.y += (y - drop.y) * ease;
    drop.radius += (r - drop.radius) * ease;
  }
  scene.setDrops(drops);
}
function paint(dt = .016, immediate = false) { geometry(time, immediate, dt); scene.render(time); }
function stop() { if (frame !== null) cancelAnimationFrame(frame); frame = null; previous = null; }
function finishFilm() { filmStart = null; paused = true; delete document.body.dataset.film; ui(); }
function schedule() {
  if (frame !== null || destroyed || document.hidden || !scene.supported || (reduced.matches && dragIndex < 0) || (paused && dragIndex < 0 && filmStart === null)) return;
  frame = requestAnimationFrame(tick);
}
function tick(now: number) {
  frame = null;
  if (destroyed || document.hidden) { previous = null; return; }
  const dt = previous === null ? 1 / 60 : Math.min(.06, Math.max(0, (now - previous) / 1000));
  previous = now;
  if (filmStart !== null) {
    filmElapsed = Math.min(12, (now - filmStart) / 1000); time = filmElapsed;
    while (filmEvent < film.length && film[filmEvent][0] <= filmElapsed) film[filmEvent++][1]();
    get('progress').style.width = `${filmElapsed / 12 * 100}%`;
  } else if (!paused && !reduced.matches) time += dt;
  paint(dt);
  if (filmStart !== null && filmElapsed >= 12) { finishFilm(); return; }
  schedule();
}
function measure() { const r = art.getBoundingClientRect(); width = r.width; height = r.height; paint(.016, true); }
function apply() { scene.update(options()); ui(); paint(.016, paused || reduced.matches); schedule(); }
function interrupt() { filmStart = null; filmEvent = 0; delete document.body.dataset.film; delete document.body.dataset.end; label('title-first', 'Soft'); label('title-second', 'matter.'); }
for (const id of ['merge', 'orbit', 'split'] as const) get(id).addEventListener('click', () => { interrupt(); mode = id; apply(); });
for (const id of ['cobalt', 'citrus', 'rose'] as const) get(id).addEventListener('click', () => { interrupt(); tone = id; apply(); });
get('pause').addEventListener('click', () => { interrupt(); paused = !paused; if (paused) stop(); ui(); schedule(); });
get<HTMLInputElement>('tension').addEventListener('input', event => { interrupt(); tension = Number((event.currentTarget as HTMLInputElement).value); apply(); });
function reset() { stop(); interrupt(); mode = 'merge'; tone = 'cobalt'; tension = 64; paused = false; time = 0; dragIndex = -1; filmElapsed = 0; get('progress').style.width = '0%'; apply(); measure(); }
get('reset').addEventListener('click', reset);
const film: Array<[number, () => void]> = [
  [0, () => { mode = 'merge'; tone = 'cobalt'; label('title-first', 'Soft'); label('title-second', 'matter.'); apply(); }],
  [3, () => { mode = 'orbit'; label('title-first', 'In'); label('title-second', 'orbit.'); apply(); }],
  [6, () => { mode = 'split'; tone = 'citrus'; label('title-first', 'Let'); label('title-second', 'go.'); apply(); }],
  [8.8, () => { mode = 'merge'; tone = 'rose'; label('title-first', 'Come'); label('title-second', 'together.'); apply(); }],
  [10.5, () => { document.body.dataset.end = 'true'; label('title-first', 'Make'); label('title-second', 'it melt.'); label('chapter-name', 'LIQUID GLASS KIT / OPEN SOURCE'); label('chapter-note', 'Build your own material experiment.'); }],
];
function play() { reset(); stop(); paused = false; document.body.dataset.film = 'true'; filmEvent = 0; filmStart = performance.now(); window.scrollTo(0, 0);
  if (reduced.matches) { for (const [,event] of film) event(); filmElapsed = time = 12; paint(.016,true); finishFilm(); label('status','Reduced motion enabled. Static final composition.'); return; }
  schedule();
}
get('film').addEventListener('click', play);
art.addEventListener('pointerdown', event => {
  if (event.button !== 0 || captureId !== null || !scene.supported) return;
  const r = art.getBoundingClientRect(), x = event.clientX - r.left, y = event.clientY - r.top;
  let closest = -1, distance = Infinity;
  for (let i = 0; i < drops.length; i++) { const d = Math.hypot(x-drops[i].x,y-drops[i].y)/drops[i].radius; if (d < distance && d <= 1.2) { closest=i;distance=d; } }
  if (closest < 0) return;
  interrupt(); dragIndex = closest; dragX = x; dragY = y; captureId = event.pointerId; art.setPointerCapture(event.pointerId); schedule();
});
art.addEventListener('pointermove', event => { if (event.pointerId !== captureId) return; const r=art.getBoundingClientRect(); dragX=Math.max(0,Math.min(width,event.clientX-r.left));dragY=Math.max(0,Math.min(height,event.clientY-r.top));schedule(); });
function release() { if(captureId!==null&&art.hasPointerCapture(captureId))art.releasePointerCapture(captureId);captureId=null;dragIndex=-1;if(paused||reduced.matches){stop();paint(.016,true);}else schedule(); }
art.addEventListener('pointerup',release);art.addEventListener('pointercancel',release);art.addEventListener('lostpointercapture',()=>{captureId=null;dragIndex=-1;});
get('copy').addEventListener('click', async () => {
  const recipe = `import { attachGlassScene } from '@wpsydev/liquid-glass/scene';\n\nconst scene = attachGlassScene(canvas, {\n  backdrop: 'studio', maxPixels: 900_000,\n  fusion: {\n    drops: [{ x: 220, y: 200, radius: 100 }, { x: 350, y: 220, radius: 70 }],\n    smoothness: 64, refraction: 62, dispersion: 3\n  }\n});\n// Animate positions without replacing options or observers:\nscene.setDrops(nextDrops);\n// In a paused scene, call scene.render(timeSeconds) after staging drops.\n// Keep canvas decorative, controls in HTML. Call scene.destroy() on teardown.`;
  try { await navigator.clipboard.writeText(recipe); label('status','Fusion recipe copied.'); label('copy','Recipe copied'); }
  catch { label('status','Clipboard unavailable. The complete recipe is in the material guide.'); }
});
const observer = new ResizeObserver(measure); observer.observe(art);
reduced.addEventListener('change',()=>{stop();if(reduced.matches&&filmStart!==null)finishFilm();paint(.016,true);ui();schedule();});
document.addEventListener('visibilitychange',()=>{stop();if(document.hidden&&filmStart!==null)finishFilm();if(!document.hidden){paint();schedule();}});
canvas.addEventListener('webglcontextlost',()=>{stop();ui();label('status','Rendering interrupted. The sculpture will resume when its graphics context returns.');});
canvas.addEventListener('webglcontextrestored',()=>{if(destroyed)return;ui();paint();schedule();});
window.addEventListener('pagehide',()=>{destroyed=true;stop();observer.disconnect();scene.destroy();},{once:true});
(window as unknown as { fusionFilm: unknown }).fusionFilm={play,reset,pause(){paused=true;stop();ui();},get state(){return{mode,tone,time,paused,filmElapsed,filmEvent,running:frame!==null,reducedMotion:reduced.matches,supported:scene.supported,dragIndex,drops:drops.map(d=>({...d})),stats:scene.stats};}};
measure();ui();schedule();
