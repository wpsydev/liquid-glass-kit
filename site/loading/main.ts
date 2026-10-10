import { attachGlassSceneLazy } from '../../src/lazy.js';
import type { GlassSceneOptions } from '../../src/scene.js';

const canvas = document.querySelector<HTMLCanvasElement>('#glass')!;
const state = document.querySelector<HTMLElement>('#state')!;
const stage = document.querySelector<HTMLElement>('#stage')!;
const load = document.querySelector<HTMLButtonElement>('#load')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
let paused = false;
const options = (): GlassSceneOptions => ({
  backdrop: 'studio', palette: 'ocean', maxDpr: 1.5, maxPixels: 600_000, paused,
  fusion: { drops: [{ x: 160, y: 220, radius: 100 }, { x: 290, y: 190, radius: 80 }], smoothness: 64, refraction: 60, dispersion: 2 },
});
const loader = attachGlassSceneLazy(canvas, options());
load.addEventListener('click', () => { state.textContent = 'Loading optional optics…'; load.disabled = true; loader.load(); });
loader.ready.then(scene => {
  load.disabled = true;
  if (!scene?.supported) { state.textContent = 'CSS fallback. Optional optics unavailable.'; return; }
  stage.dataset.ready = 'true'; pause.disabled = false;
  state.textContent = 'Scene ready. Three scene draws; controls stay HTML.';
});
for (const event of ['webglcontextlost', 'webglcontextrestored']) canvas.addEventListener(event, () => queueMicrotask(() => {
  const supported = loader.scene?.supported ?? false;
  stage.dataset.ready = String(supported); pause.disabled = !supported;
  state.textContent = supported ? 'Scene restored. Controls stay HTML.' : 'CSS fallback. Graphics context interrupted.';
}));
pause.addEventListener('click', () => { paused = !paused; loader.update(options()); pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? 'Resume scene' : 'Pause scene'; });
window.addEventListener('pagehide', () => loader.destroy(), { once: true });
(window as unknown as { loadingStudy: unknown }).loadingStudy = { loader, get state() { return { state: loader.state, supported: loader.scene?.supported ?? false, stats: loader.scene?.stats ?? null, paused }; } };
