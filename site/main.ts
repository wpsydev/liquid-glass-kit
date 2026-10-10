import '../src/styles.css';
import './style.css';
import { mountGitLabIcons } from './icons';
import { attachGlass, attachGlassIndicator, attachGlassMotion, getGlassCapabilities } from '../src/index';
import type { GlassOptions } from '../src/index';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
mountGitLabIcons();
let options: GlassOptions = { appearance: 'light', interactive: true, corner: 'continuous', radius: 28 };
const controllers = [...document.querySelectorAll<HTMLElement>('[data-preview]')].map(el => attachGlass(el, options));
const dialogGlass = attachGlass($('#demo-dialog'), { appearance: 'light', radius: 30, corner: 'continuous' });
const backingGlass = attachGlass($('#palette-backing'), { appearance: 'light', variant: 'regular', radius: 18 });
const indicator = attachGlassIndicator($('#palette-dock'), $('#palette-backing'), { motion: 'spring', radius: 18, stiffness: 280, damping: 24 });
const inspectMotion = attachGlassMotion($('#inspect'), { pressScale: .97 });
const motions = [...document.querySelectorAll<HTMLButtonElement>('button[data-palette], #open-dialog')].map(el => attachGlassMotion(el, { pressScale: .94 }));
let toastTimer = 0;
const toast = (message: string) => { window.clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 2400); };
async function copy(value: string) { try { await navigator.clipboard.writeText(value); toast('Recipe copied.'); } catch { toast('Clipboard unavailable. Select and copy the example below.'); } }
function update() {
  options = { ...options, variant: $<HTMLSelectElement>('#variant').value as GlassOptions['variant'], blur: +$<HTMLInputElement>('#blur').value, radius: +$<HTMLInputElement>('#radius').value, refraction: +$<HTMLInputElement>('#refraction').value, reducedTransparency: $<HTMLInputElement>('#solid').checked, interactive: $<HTMLInputElement>('#interactive').checked };
  controllers.forEach(c => c.update(options));
  for (const key of ['blur', 'radius', 'refraction']) $(`#${key}-output`).textContent = `${$<HTMLInputElement>(`#${key}`).value} px`;
  $('#renderer-status').textContent = options.refraction ? (getGlassCapabilities().experimentalRefraction ? 'SVG lens requested / verify visually' : 'CSS fallback / SVG lens unavailable') : 'Portable CSS material';
  $('#sample-material').textContent = options.reducedTransparency ? 'Opaque' : options.variant === 'clear' ? 'Clear' : 'Regular';
  const palette = $('#scene').dataset.palette ?? 'warm';
  $('#scene-state').textContent = `${palette[0].toUpperCase()}${palette.slice(1)} light / ${options.reducedTransparency ? 'opaque surface' : `${options.variant} glass`}`;
}
for (const input of document.querySelectorAll('.controls input, .controls select')) input.addEventListener('input', update);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-appearance]')) button.addEventListener('click', () => {
  options.appearance = button.dataset.appearance as GlassOptions['appearance'];
  document.querySelectorAll('[data-appearance]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); update();
});
function reset() {
  $<HTMLInputElement>('#blur').value = '18'; $<HTMLInputElement>('#radius').value = '28'; $<HTMLInputElement>('#refraction').value = '0';
  $<HTMLSelectElement>('#variant').value = 'regular'; $<HTMLInputElement>('#solid').checked = false; $<HTMLInputElement>('#interactive').checked = true;
  options.appearance = 'light'; document.querySelectorAll<HTMLButtonElement>('[data-appearance]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.appearance === 'light'))); setPalette('warm'); update();
}
$('#reset').addEventListener('click', () => { reset(); toast('Material reset.'); });
$('#copy-install').addEventListener('click', () => copy('npm i github:wpsydev/liquid-glass-kit'));
$('#copy-css').addEventListener('click', () => copy(`import '@wpsydev/liquid-glass/styles.css';\nimport { attachGlass } from '@wpsydev/liquid-glass';\n\n// Keep the host element semantic.\nconst surface = attachGlass(element, ${JSON.stringify(options, null, 2)});\n// surface.destroy() when the element unmounts.`));
function setPalette(palette: string) {
  $('#scene').dataset.palette = palette;
  document.querySelectorAll<HTMLButtonElement>('button[data-palette]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.palette === palette)); if (button.dataset.palette === palette) indicator.moveTo(button); });
  update();
}
document.querySelectorAll<HTMLButtonElement>('button[data-palette]').forEach(button => button.addEventListener('click', () => setPalette(button.dataset.palette!)));
$('#open-dialog').addEventListener('click', () => $<HTMLDialogElement>('#demo-dialog').showModal());
$('#inspect').addEventListener('click', () => $<HTMLDialogElement>('#demo-dialog').showModal());
const examples: Record<string, string> = {
  react: `import '@wpsydev/liquid-glass/styles.css';\nimport { GlassButton }\n  from '@wpsydev/liquid-glass/react';\n\nexport function SaveButton() {\n  return (\n    <GlassButton\n      glass={{ radius: 24, corner: 'continuous' }}\n      motion={{ pressScale: 0.96 }}\n      onClick={saveDocument}>\n      Save document\n    </GlassButton>\n  );\n}`,
  vue: `<script setup>\nimport '@wpsydev/liquid-glass/styles.css';\nimport { GlassSurface }\n  from '@wpsydev/liquid-glass/vue';\n</script>\n\n<template>\n  <GlassSurface as="button" type="button"\n    :glass="{ radius: 24, corner: 'continuous' }"\n    :motion="{ pressScale: 0.96 }"\n    @click="saveDocument">\n    Save document\n  </GlassSurface>\n</template>`,
  svelte: `<script>\nimport '@wpsydev/liquid-glass/styles.css';\nimport { glass } from '@wpsydev/liquid-glass';\n</script>\n\n<button\n  use:glass={{ radius: 24, interactive: true }}\n  onclick={saveDocument}>\n  Save document\n</button>`,
  html: `<!-- Load the distributed styles.css -->\n<button class="lg-glass lg-button"\n  data-lg-appearance="light"\n  data-lg-corner="continuous"\n  style="--lg-radius: 24px">\n  Save document\n</button>\n\n<!-- Connect your own native click handler. -->\n<!-- The material itself needs no JavaScript. -->`,
};
let activeCode = 'react';
$('#example-code').textContent = examples[activeCode];
document.querySelectorAll<HTMLButtonElement>('[data-code]').forEach(button => button.addEventListener('click', () => { activeCode = button.dataset.code!; document.querySelectorAll('[data-code]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); $('#example-code').textContent = examples[activeCode]; }));
$('#copy-code').addEventListener('click', () => copy(examples[activeCode]));
update(); indicator.moveTo($('button[data-palette="warm"]'));

let showcaseTimers: number[] = [];
function stopShowcase() { showcaseTimers.forEach(window.clearTimeout); showcaseTimers = []; }
function chapter(index: number, title: string, detail: string) {
  $('#showcase-count').textContent = `0${index} / 04`; $('#showcase-title').textContent = title; $('#showcase-detail').textContent = detail;
  $<HTMLElement>('.showcase-progress i').style.width = `${index * 25}%`;
}
function prepareRedesignShowcase() {
  stopShowcase(); $<HTMLDialogElement>('#demo-dialog').close(); document.body.dataset.showcase = 'ready'; reset(); window.scrollTo(0, 0);
  chapter(1, 'Light, made tangible.', 'A quieter interface. A richer material.');
}
function runRedesignShowcase() {
  prepareRedesignShowcase(); document.body.dataset.showcase = 'running';
  const later = (ms: number, callback: () => void) => showcaseTimers.push(window.setTimeout(callback, ms));
  later(1300, () => { $<HTMLInputElement>('#blur').value = '7'; $<HTMLSelectElement>('#variant').value = 'clear'; update(); });
  later(3000, () => { chapter(2, 'A considered palette.', 'Warm, cool and ink. One live material.'); setPalette('cool'); });
  later(4250, () => setPalette('ink'));
  later(5400, () => setPalette('warm'));
  later(6000, () => { chapter(3, 'Corners, in concert.', 'Continuous corner enhancement. Gentle spring motion.'); $<HTMLSelectElement>('#variant').value = 'regular'; $<HTMLInputElement>('#blur').value = '18'; $<HTMLInputElement>('#radius').value = '42'; update(); inspectMotion.press(); later(350, () => inspectMotion.release()); });
  later(7000, () => { $<HTMLInputElement>('#radius').value = '16'; update(); setPalette('cool'); });
  later(8250, () => { $<HTMLInputElement>('#radius').value = '28'; update(); setPalette('warm'); });
  later(9000, () => { chapter(4, 'Craft for the open web.', 'Native controls. Portable CSS. Open source.'); $('#inspect').click(); });
  later(10400, () => { $<HTMLDialogElement>('#demo-dialog').close(); chapter(4, 'Liquid Glass Kit', 'github.com/wpsydev/liquid-glass-kit'); setPalette('warm'); });
  later(12000, () => { document.body.dataset.showcase = 'complete'; });
}
Object.assign(window, { prepareRedesignShowcase, runRedesignShowcase });
window.addEventListener('pagehide', () => { stopShowcase(); window.clearTimeout(toastTimer); inspectMotion.destroy(); motions.forEach(m => m.destroy()); indicator.destroy(); backingGlass.destroy(); dialogGlass.destroy(); controllers.forEach(c => c.destroy()); }, { once: true });
