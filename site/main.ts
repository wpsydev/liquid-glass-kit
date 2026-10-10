import '../src/styles.css';
import './style.css';
import { attachGlass, getGlassCapabilities } from '../src/index';
import type { GlassOptions } from '../src/index';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let options: GlassOptions = { appearance: 'light', interactive: true };
const controllers = [...document.querySelectorAll<HTMLElement>('[data-preview]')].map(el => attachGlass(el, options));
const toast = (message: string) => { $('#toast').textContent = message; $('#toast').classList.add('visible'); window.setTimeout(() => $('#toast').classList.remove('visible'), 2400); };
async function copy(value: string) { try { await navigator.clipboard.writeText(value); toast('Copied. Go make something lovely.'); } catch { toast('Clipboard unavailable. Select and copy the example below.'); } }
function update() {
  options = { ...options, variant: $<HTMLSelectElement>('#variant').value as GlassOptions['variant'], blur: +$<HTMLInputElement>('#blur').value, radius: +$<HTMLInputElement>('#radius').value, refraction: +$<HTMLInputElement>('#refraction').value, reducedTransparency: $<HTMLInputElement>('#solid').checked, interactive: $<HTMLInputElement>('#interactive').checked };
  controllers.forEach(c => c.update(options));
  for (const key of ['blur', 'radius', 'refraction']) $(`#${key}-output`).textContent = `${$<HTMLInputElement>(`#${key}`).value} px`;
  $('#renderer-status').textContent = options.refraction ? (getGlassCapabilities().experimentalRefraction ? 'SVG lens requested · verify visually' : 'CSS fallback · SVG lens unavailable') : 'Portable CSS material';
}
for (const input of document.querySelectorAll('.controls input, .controls select')) input.addEventListener('input', update);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-appearance]')) button.addEventListener('click', () => {
  options.appearance = button.dataset.appearance as GlassOptions['appearance'];
  document.querySelectorAll('[data-appearance]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); update();
});
$('#reset').addEventListener('click', () => {
  $<HTMLInputElement>('#blur').value = '18'; $<HTMLInputElement>('#radius').value = '24'; $<HTMLInputElement>('#refraction').value = '0';
  $<HTMLSelectElement>('#variant').value = 'regular'; $<HTMLInputElement>('#solid').checked = false; $<HTMLInputElement>('#interactive').checked = true;
  options.appearance = 'light'; document.querySelectorAll<HTMLButtonElement>('[data-appearance]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.appearance === 'light'))); update(); toast('Material reset.');
});
$('#copy-install').addEventListener('click', () => copy('npm i github:wpsydev/liquid-glass-kit'));
$('#copy-css').addEventListener('click', () => copy(`/* Import @wpsydev/liquid-glass/styles.css first. */\n/* Apply these attributes to a semantic element: */\n/* class="lg-glass" data-lg-appearance="${options.appearance}" data-lg-variant="${options.variant}" data-lg-solid="${options.reducedTransparency}" */\n.my-glass {\n  --lg-radius: ${options.radius ?? 24}px;\n  --lg-blur: ${options.blur ?? 18}px;\n}\n/* Refraction requires attachGlass(el, { refraction: ${options.refraction ?? 0} }); */`));
$('#play').addEventListener('click', () => { const playing = $('#play').getAttribute('aria-pressed') !== 'true'; $('#play').setAttribute('aria-pressed', String(playing)); $('#play').setAttribute('aria-label', playing ? 'Pause Weightless' : 'Play Weightless'); $('#play').textContent = playing ? 'Ⅱ' : '▶'; toast(playing ? 'Playback UI preview — no audio loaded.' : 'Paused.'); });
document.querySelectorAll<HTMLButtonElement>('[data-dock]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-dock]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); $('#scene-state').textContent = `${button.dataset.dock} your next idea.`; }));
$('#open-dialog').addEventListener('click', () => $<HTMLDialogElement>('#demo-dialog').showModal());
const examples: Record<string, string> = {
  react: `import '@wpsydev/liquid-glass/styles.css';\nimport { GlassSurface, GlassButton }\n  from '@wpsydev/liquid-glass/react';\n\nexport function App() {\n  return (\n    <GlassSurface as="nav" glass={{ radius: 28 }}>\n      <a href="/">Home</a>\n    </GlassSurface>\n  );\n}`,
  vue: `<script setup>\nimport '@wpsydev/liquid-glass/styles.css';\nimport { GlassSurface }\n  from '@wpsydev/liquid-glass/vue';\n</script>\n\n<template>\n  <GlassSurface as="nav" :glass="{ radius: 28 }">\n    <a href="/">Home</a>\n  </GlassSurface>\n</template>`,
  svelte: `<script>\nimport '@wpsydev/liquid-glass/styles.css';\nimport { glass } from '@wpsydev/liquid-glass';\n</script>\n\n<nav class="lg-glass"\n  use:glass={{ radius: 28, interactive: true }}>\n  <a href="/">Home</a>\n</nav>`,
  html: `<!-- Load the distributed styles.css -->\n<nav class="lg-glass"\n  data-lg-appearance="light"\n  style="--lg-radius: 28px; padding: 16px">\n  <a href="/">Home</a>\n</nav>\n\n<!-- No JavaScript needed for the material. -->`,
};
let activeCode = 'react';
$('#example-code').textContent = examples[activeCode];
document.querySelectorAll<HTMLButtonElement>('[data-code]').forEach(button => button.addEventListener('click', () => { activeCode = button.dataset.code!; document.querySelectorAll('[data-code]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); $('#example-code').textContent = examples[activeCode]; }));
$('#copy-code').addEventListener('click', () => copy(examples[activeCode]));
update();
