import { getGlassCompositionProps } from '../../src/composition.js';
import type { GlassCompositionOptions } from '../../src/composition.js';
import '../../src/composition.css';
import '../../src/material.css';
import './style.css';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const composition = get('composition'), viewport = get('preview-viewport');
let saved = false;
function options(): GlassCompositionOptions {
  return {
    layout: get<HTMLSelectElement>('layout').value as GlassCompositionOptions['layout'],
    ratio: get<HTMLSelectElement>('ratio').value as GlassCompositionOptions['ratio'],
    density: get<HTMLSelectElement>('density').value as GlassCompositionOptions['density'],
    measure: Number(get<HTMLInputElement>('measure').value),
  };
}
function apply() {
  const configuration = options(), props = getGlassCompositionProps(configuration);
  composition.classList.add(props.className);
  composition.setAttribute('data-lg-layout', props['data-lg-layout']); composition.setAttribute('data-lg-ratio', props['data-lg-ratio']); composition.setAttribute('data-lg-density', props['data-lg-density']);
  for (const [name, value] of Object.entries(props.style)) composition.style.setProperty(name, value);
  get('measure-value').textContent = `${configuration.measure}ch`;
  get('arrangement-label').textContent = `${configuration.layout} / ${configuration.ratio} / ${configuration.density}`.toUpperCase();
  get('code').textContent = `import { getGlassCompositionProps } from '@wpsydev/liquid-glass/composition';\nimport '@wpsydev/liquid-glass/composition.css';\n\nconst composition = getGlassCompositionProps(${JSON.stringify(configuration, null, 2)});\n// Spread data attributes; className and style belong on the container.\n// Put lg-composition-heading / lg-composition-reading on descendants.`;
  get('status').textContent = `Applied ${configuration.layout}, ${configuration.ratio}, ${configuration.density}, ${configuration.measure}ch. The original elements stay in source order.`;
}
for (const name of ['layout', 'ratio', 'density']) get(name).addEventListener('change', apply);
get('measure').addEventListener('input', apply);
get('rtl').addEventListener('change', () => {
  const rtl = get<HTMLInputElement>('rtl').checked; viewport.dir = rtl ? 'rtl' : 'ltr';
  get('direction-label').textContent = rtl ? 'RIGHT TO LEFT / SOURCE ORDER KEPT' : 'LEFT TO RIGHT';
});
get('quiet').addEventListener('change', () => document.documentElement.classList.toggle('quiet', get<HTMLInputElement>('quiet').checked));
get('solid').addEventListener('change', () => get('solid').closest('.journal')!.classList.toggle('solid', get<HTMLInputElement>('solid').checked));
get('bookmark').addEventListener('click', () => { saved = !saved; get('bookmark').textContent = saved ? 'Study saved' : 'Save this study'; get('bookmark').setAttribute('aria-pressed', String(saved)); get('bookmark-state').textContent = saved ? 'Saved locally for this session' : 'Saved only in this browser session'; });
type Preset = 'split' | 'stack' | 'cluster' | 'grid' | 'narrow' | 'rtl';
function preset(name: Preset) {
  const modes: Record<Preset, GlassCompositionOptions> = {
    split: { layout: 'split', ratio: '2:1', density: 'comfortable', measure: 60 },
    stack: { layout: 'stack', ratio: '1:1', density: 'editorial', measure: 45 },
    cluster: { layout: 'cluster', ratio: '1:1', density: 'compact', measure: 38 },
    grid: { layout: 'grid', ratio: '1:1', density: 'comfortable', measure: 50 },
    narrow: { layout: 'split', ratio: '1:2', density: 'compact', measure: 35 },
    rtl: { layout: 'split', ratio: '2:1', density: 'comfortable', measure: 60 },
  };
  const configuration = modes[name]; if (!configuration) return;
  get<HTMLSelectElement>('layout').value = configuration.layout!; get<HTMLSelectElement>('ratio').value = configuration.ratio!; get<HTMLSelectElement>('density').value = configuration.density!; get<HTMLInputElement>('measure').value = String(configuration.measure);
  viewport.style.maxInlineSize = name === 'narrow' ? '480px' : '';
  get<HTMLInputElement>('rtl').checked = name === 'rtl'; get('rtl').dispatchEvent(new Event('change'));
  apply();
}
function reset() {
  saved = false; get('bookmark').textContent = 'Save this study'; get('bookmark').setAttribute('aria-pressed', 'false');
  get('bookmark-state').textContent = 'Saved only in this browser session';
  get<HTMLInputElement>('quiet').checked = get<HTMLInputElement>('solid').checked = false;
  document.documentElement.classList.remove('quiet'); document.querySelector('.journal')!.classList.remove('solid'); preset('split');
}
get('reset').addEventListener('click', reset);
declare global { interface Window { __compositionDemo: { reset(): void; preset(name: Preset): void; state(): GlassCompositionOptions & { rtl: boolean; sourceOrder: string[] } } } }
window.__compositionDemo = { reset, preset, state: () => ({ ...options(), rtl: viewport.dir === 'rtl', sourceOrder: [...composition.children].map(node => (node as HTMLElement).dataset.source ?? '') }) };
apply();
