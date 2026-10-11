import '../../src/material.css';
import './style.css';
import { attachGlassScrollReveal } from '../../src/scroll-reveal';

const nodes = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
const effects = nodes.map(node => attachGlassScrollReveal(node, { direction: node.dataset.direction as 'up' | 'left' | 'right', startOpacity: .35, distance: 32, once: false }));
const select = document.querySelector<HTMLSelectElement>('#mechanism')!;
const quiet = document.querySelector<HTMLInputElement>('#quiet')!;
const output = document.querySelector<HTMLElement>('#renderer')!;
function refresh() {
  effects.forEach((effect, index) => effect.update({ direction: nodes[index].dataset.direction as 'up' | 'left' | 'right', startOpacity: .35, distance: 32, once: false, native: select.value === 'auto', reducedMotion: quiet.checked }));
  output.textContent = `Selected renderer: ${[...new Set(effects.map(effect => effect.renderer))].join(', ')} · no custom scroll frame loop`;
}
select.addEventListener('change', refresh); quiet.addEventListener('change', refresh);
document.querySelector<HTMLInputElement>('#solid')!.addEventListener('change', event => {
  const enabled = (event.currentTarget as HTMLInputElement).checked;
  document.querySelectorAll('.lg-glass').forEach(node => node.setAttribute('data-lg-solid', String(enabled)));
});
document.querySelector('#restart')!.addEventListener('click', () => { refresh(); scrollTo({ top: 0, behavior: quiet.checked ? 'instant' : 'smooth' }); });
const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
const notes: Record<string, [string, string]> = {
  light: ['A clear moment.', 'This is a sample reading note. The material decorates a native article and button. Opening this native dialog transfers focus; Escape closes it and returns focus to the trigger.'],
  space: ['A place to pause.', 'Supported browsers own the ViewTimeline and its entry range. The optional helper does not install a scroll handler or poll requestAnimationFrame. This is an architecture observation, not an FPS guarantee.'],
  detail: ['A considered entrance.', 'Choose a dedicated presentation layer when another animation controller owns translate or opacity. Focus exposes content immediately. Destroy restores author inline values and removes owned observers and listeners.'],
};
document.querySelectorAll<HTMLElement>('[data-note]').forEach(button => button.addEventListener('click', () => {
  const [title, copy] = notes[button.dataset.note!]!;
  document.querySelector('#note-title')!.textContent = title;
  document.querySelector('#note-copy')!.textContent = copy;
  dialog.showModal();
}));
window.addEventListener('pagehide', () => effects.forEach(effect => effect.destroy()), { once: true });
refresh();
