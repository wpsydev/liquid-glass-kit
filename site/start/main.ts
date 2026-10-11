import materialCss from '../../src/material.css?raw';
import license from '../../LICENSE?raw';
import './style.css';
import { install, snippet, standalone, type Recipe, type Stack } from './recipes';

const query = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const recipe = query<HTMLSelectElement>('#recipe'), stack = query<HTMLSelectElement>('#stack'), solid = query<HTMLInputElement>('#solid');
const status = query('#status');
const brief = 'Read https://wpsydev.github.io/liquid-glass-kit/llms-full.txt. Add one CSS glass surface to my app. Preserve native controls and my design system. Keep long reading content solid, make touch targets at least 44px, respect reduced motion and leave experimental refraction off. Import only the material CSS unless an interaction is needed.';
query('#install').textContent = install;
query('#agent-brief').textContent = brief;
const selectedRecipe = () => recipe.value as Recipe;
const update = () => {
  query('#code').textContent = snippet(selectedRecipe(), stack.value as Stack, solid.checked);
  query('#code-title').textContent = `${stack.selectedOptions[0].text} recipe`;
  query('#stack-note').textContent = stack.value === 'html' ? 'CSS is enough for the material. Wire controls to your own application.' : 'CSS-only component recipe. Optional React/Vue adapters are available when you need enhancement.';
  query<HTMLIFrameElement>('#preview').srcdoc = standalone(selectedRecipe(), solid.checked, materialCss, license);
  status.textContent = '';
};
for (const input of [recipe, stack, solid]) input.addEventListener('change', update);
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); status.textContent = 'Copied. Ready for your project.'; }
  catch { status.textContent = 'Clipboard unavailable. Select and copy the recipe text above.'; }
}
query('#copy').addEventListener('click', () => void copy(snippet(selectedRecipe(), stack.value as Stack, solid.checked)));
query('#copy-agent').addEventListener('click', () => void copy(brief));
query('#download').addEventListener('click', () => {
  const blob = new Blob([standalone(selectedRecipe(), solid.checked, materialCss, license)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `liquid-glass-${selectedRecipe()}.html`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Downloaded. Open the HTML file in a browser to try it.';
});
update();
