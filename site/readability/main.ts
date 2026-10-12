import { resolveGlassReadability } from '../../src/readability.js';
import type { GlassReadabilityOptions } from '../../src/readability.js';
import '../../src/material.css';
import './style.css';

type Preset = 'quiet' | 'dynamic' | 'strict';
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const inks: Record<string, string[]> = { neutral: ['#000000', '#ffffff'], charcoal: ['#18251c', '#fbf9ed'], brand: ['#81676d', '#7c796d'] };
let current: Preset = 'quiet', moving = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function input(): GlassReadabilityOptions {
  return {
    backdrops: Array.from({ length: 4 }, (_, index) => get<HTMLInputElement>(`color-${index}`).value),
    appearance: get<HTMLSelectElement>('appearance').value as 'light' | 'dark',
    material: { variant: get<HTMLSelectElement>('variant').value as 'regular' | 'clear', opacity: Number(get<HTMLInputElement>('opacity').value), blur: 0, saturation: 1, radius: 20 },
    candidates: inks[get<HTMLSelectElement>('candidates').value], minimumRatio: Number(get<HTMLInputElement>('target').value),
  };
}
function apply() {
  const configuration = input(), result = resolveGlassReadability(configuration);
  for (const [index, cell] of [...document.querySelectorAll<HTMLElement>('.sample-cell')].entries()) {
    cell.style.setProperty('--sample-color', configuration.backdrops[index]);
    const field = cell.querySelector<HTMLElement>('.color-field')!; field.style.setProperty('--moving-color', configuration.backdrops[(index + 1) % 4]);
    const glass = cell.querySelector<HTMLElement>('.sample-glass')!;
    glass.classList.add(result.props.className);
    for (const [name, value] of Object.entries(result.props)) {
      if (name.startsWith('data-')) glass.setAttribute(name, String(value));
    }
    for (const [name, value] of Object.entries(result.props.style)) glass.style.setProperty(name, value);
    cell.querySelector('.sample-ratio')!.textContent = `${result.samples[index].ratio.toFixed(2)} : 1 ESTIMATED`;
    cell.querySelector('.sample-hex')!.textContent = configuration.backdrops[index].toUpperCase();
  }
  const animated = moving && !get<HTMLInputElement>('quiet-motion').checked && !reducedMotion.matches;
  get('sample-grid').dataset.motion = String(animated);
  get('mode-label').textContent = animated ? 'FINITE MOVING COLOR / NOT PIXEL-SAMPLED' : 'STILL / FOUR OPAQUE COLORS';
  get('motion-note').textContent = animated
    ? 'One finite color-field movement. Intermediate overlaps and frames are not sampled or predicted by these estimates.'
    : 'Uniform declared colors. Actual blur, highlights and stylesheet effects are outside the model.';
  get('recommendation').textContent = result.solid ? 'OPAQUE RECOMMENDED' : 'GLASS ESTIMATE MEETS TARGET';
  get('recommendation').dataset.solid = String(result.solid);
  get('chosen-ink').textContent = result.chosenInk.toUpperCase(); get('ink-swatch').style.background = result.chosenInk;
  get('glass-ratio').textContent = `${result.translucent.worstSampleRatio.toFixed(2)} : 1`;
  get('applied-ratio').textContent = `${result.worstSampleRatio.toFixed(2)} : 1`;
  get('target-ratio').textContent = `${result.minimumRatio.toFixed(1)} : 1`;
  get('fill-alpha').textContent = `${(result.estimatedFill.alpha * 100).toFixed(1)}%`;
  get('reason').textContent = result.reason;
  get('model-foot').textContent = result.solid
    ? 'Opaque recommendations pin a fill and black/white ink; this can differ from the supplied candidates. No DOM readback or inference about unseen content.'
    : 'No DOM readback. No inference about unseen content. Reevaluate when the host’s samples or tone change.';
  get('target-value').textContent = result.minimumRatio.toFixed(1); get('opacity-value').textContent = `${Math.round(configuration.material!.opacity! * 100)}%`;
  const assumptions = get('assumptions'); assumptions.replaceChildren();
  for (const assumption of result.assumptions) { const li = document.createElement('li'); li.textContent = assumption; assumptions.append(li); }
  get('code').textContent = `import { resolveGlassReadability } from '@wpsydev/liquid-glass/readability';\n\nconst advisory = resolveGlassReadability(${JSON.stringify(configuration, null, 2)});\n// Apply the actual advisory.props attributes and CSS custom properties.\n// Supplied estimates do not replace a rendered-interface contrast audit.\n\n${JSON.stringify({ chosenInk: result.chosenInk, solid: result.solid, worstSampleRatio: result.worstSampleRatio, props: result.props }, null, 2)}`;
  get('status').textContent = `${result.solid ? 'Opaque recommendation' : 'Translucent estimate'} applied. Chosen ink ${result.chosenInk}. This is an advisory model, not a captured-pixel check.`;
}
function preset(id: Preset) {
  const settings = {
    quiet: { backdrops: ['#f3aabf', '#d7ed8b', '#89c5e1', '#e9e3d5'], variant: 'regular', appearance: 'light', opacity: .9, target: 4.5, candidates: 'neutral' },
    dynamic: { backdrops: ['#0f1724', '#faf7ef', '#ff447f', '#bfd948'], variant: 'clear', appearance: 'light', opacity: .3, target: 4.5, candidates: 'neutral' },
    strict: { backdrops: ['#f3aabf', '#d7ed8b', '#89c5e1', '#e9e3d5'], variant: 'regular', appearance: 'dark', opacity: .72, target: 7, candidates: 'neutral' },
  }[id];
  if (!settings) return;
  current = id; moving = id === 'dynamic';
  settings.backdrops.forEach((color, index) => { get<HTMLInputElement>(`color-${index}`).value = color; });
  get<HTMLSelectElement>('variant').value = settings.variant; get<HTMLSelectElement>('appearance').value = settings.appearance; get<HTMLSelectElement>('candidates').value = settings.candidates;
  get<HTMLInputElement>('opacity').value = String(settings.opacity); get<HTMLInputElement>('target').value = String(settings.target);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.setAttribute('aria-pressed', String(button.dataset.preset === id));
  apply();
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.addEventListener('click', () => preset(button.dataset.preset as Preset));
for (const id of ['variant', 'appearance', 'candidates']) get(id).addEventListener('change', apply);
for (const id of ['target', 'opacity', 'color-0', 'color-1', 'color-2', 'color-3']) get(id).addEventListener('input', apply);
get('quiet-motion').addEventListener('change', apply);
reducedMotion.addEventListener('change', apply);
declare global { interface Window { __readabilityDemo: { preset(id: Preset): void; state(): { preset: Preset; moving: boolean; input: GlassReadabilityOptions; result: ReturnType<typeof resolveGlassReadability> } } } }
window.__readabilityDemo = { preset, state: () => ({ preset: current, moving: moving && !get<HTMLInputElement>('quiet-motion').checked && !reducedMotion.matches, input: input(), result: resolveGlassReadability(input()) }) };
window.addEventListener('pagehide', () => reducedMotion.removeEventListener('change', apply), { once: true });
preset('quiet');
