import { createGlassIntegrationBrief, listGlassPatterns } from '../../src/integration-brief.js';
import type { GlassIntegrationBriefOptions, GlassIntegrationStack, GlassPatternId } from '../../src/integration-brief.js';
import './style.css';

const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const presets: Record<string, GlassIntegrationBriefOptions> = {
  reader: { task: 'Build a focused reading workspace with a compact navigation bar, a fluid article-and-notes split, and an opaque reading surface. Keep bookmarks as native buttons, preserve text selection and browser zoom, and make the layout useful at 320px.', stack: 'html', widgets: ['surface', 'composition'], motion: 'none', optics: 'css' },
  workspace: { task: 'Build an agent workspace where developers can review session activity and proposed changes before approving work. Add searchable host commands and an anchored detail popover. The server must recheck session IDs, request revisions and permissions before execution.', stack: 'nextjs', widgets: ['surface', 'overlay', 'activity-island', 'command-palette'], motion: 'subtle', optics: 'css' },
  launch: { task: 'Build a product story with readable editorial sections, a small proximity dock for section links and subtle scroll entry on decorative visual layers. Keep the story accessible as static HTML and make touch navigation stable on phones.', stack: 'astro', widgets: ['surface', 'dock', 'scroll-reveal', 'composition'], motion: 'subtle', optics: 'css' },
};
type View = 'plan' | 'imports' | 'checks' | 'markdown';
let view: View = 'plan', brief = createGlassIntegrationBrief(presets.reader), valid = true;
const patterns = listGlassPatterns();
const titles: Record<GlassPatternId, string> = { surface: 'Semantic material', dock: 'Proximity dock', overlay: 'Anchored overlay', 'scroll-reveal': 'Scroll entry', 'activity-island': 'Session activity', 'command-palette': 'Command search', composition: 'Intrinsic composition' };
const notes: Record<GlassPatternId, string> = { surface: 'portable foundation', dock: 'native buttons and links', overlay: 'geometry, not focus behavior', 'scroll-reveal': 'progressive visual motion', 'activity-island': 'host-confirmed session state', 'command-palette': 'native modal search', composition: 'responsive grouping and rhythm' };
const choices = query('#widget-choices');
for (const pattern of patterns.filter(item => item.id !== 'surface')) {
  const label = document.createElement('label'); label.className = 'widget-choice';
  const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = pattern.id; checkbox.name = 'widgets';
  const text = document.createElement('span'); text.append(document.createTextNode(titles[pattern.id]));
  const note = document.createElement('small'); note.textContent = notes[pattern.id]; text.append(note); label.append(checkbox, text); choices.append(label);
}
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = '') => {
  const result = document.createElement(tag); result.textContent = text; if (className) result.className = className; return result;
};
const list = (items: readonly string[], ordered = false) => {
  const element = document.createElement(ordered ? 'ol' : 'ul'); for (const text of items) element.append(node('li', text)); return element;
};
const sourceImports = () => brief.imports.map(item => item.kind === 'stylesheet' ? `import '${item.from}';` : `import { ${item.names.join(', ')} } from '${item.from}';`).join('\n');
const renderOutput = () => {
  const output = query('#output'); output.replaceChildren();
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  if (view === 'markdown') { output.classList.add('is-code'); output.append(node('pre', brief.markdown)); return; }
  output.classList.remove('is-code');
  if (view === 'imports') {
    output.append(node('p', 'EXACT SELECTED ENTRYPOINTS', 'section-kicker'), node('h2', 'Import only the pieces you use.'), node('pre', sourceImports(), 'import-code'));
    output.append(node('p', brief.installation.registry, 'boundary-note'));
    output.append(node('h3', 'Attach and clean up in your stack'), list(brief.lifecycle));
    return;
  }
  if (view === 'checks') {
    output.append(node('p', 'VERIFY THE REAL INTERFACE', 'section-kicker'), node('h2', 'States first. Then the happy path.'));
    output.append(node('h3', 'Required states'), list(brief.states), node('h3', 'Before shipping'), list(brief.validation));
    return;
  }
  output.append(node('p', 'ORIGINAL LOCAL INTEGRATION PLAN', 'section-kicker'), node('h2', 'A small plan with clear edges.'), node('p', brief.task, 'context-quote'));
  const sequence = document.createElement('ol'); sequence.className = 'sequence';
  for (const [index, pattern] of brief.patterns.entries()) {
    const item = document.createElement('li'); item.append(node('span', String(index + 1).padStart(2, '0'), 'step-number'));
    const content = document.createElement('div'); content.append(node('h3', pattern.title), node('p', pattern.purpose), node('p', pattern.setup, 'step-detail'), node('p', `Cleanup: ${pattern.cleanup}`, 'cleanup'));
    item.append(content); sequence.append(item);
  }
  output.append(sequence, node('h3', 'Your application remains responsible'), list(brief.hostBoundaries));
};
const update = () => {
  query('#status').textContent = '';
  const task = query<HTMLTextAreaElement>('#task').value; query('#count').textContent = String(task.length);
  try {
    const widgets = [...document.querySelectorAll<HTMLInputElement>('[name=widgets]:checked')].map(input => input.value as GlassPatternId);
    brief = createGlassIntegrationBrief({ task, stack: query<HTMLSelectElement>('#stack').value as GlassIntegrationStack, widgets,
      motion: query<HTMLSelectElement>('#motion').value as 'none' | 'subtle', optics: query<HTMLSelectElement>('#optics').value as 'css' | 'experimental-scene' });
    valid = true; query('#error').textContent = ''; query('#task').removeAttribute('aria-invalid');
    query('#stack-label').textContent = { html: 'HTML', react: 'React', vue: 'Vue', svelte: 'Svelte', nextjs: 'Next.js', astro: 'Astro' }[brief.stack];
    query('#recipe-count').textContent = `${brief.patterns.length} recipes`; query('#motion-label').textContent = `${brief.motion} motion`;
    query('#optics-label').textContent = brief.optics === 'css' ? 'portable CSS' : 'experimental scene';
    query('#optics-note').textContent = brief.optics === 'css' ? 'CSS first. Refraction stays at zero.' : 'Own-wallpaper WebGL only. Keep CSS fallback and explicit pixel budgets.';
    renderOutput();
  } catch (error) {
    valid = false; query('#error').textContent = error instanceof Error ? error.message : 'Check the project context and selected options';
    if (!task.trim()) query('#task').setAttribute('aria-invalid', 'true');
  }
  query<HTMLButtonElement>('#copy').disabled = !valid; query<HTMLButtonElement>('#download').disabled = !valid;
};
const preset = (id: string) => {
  if (!Object.hasOwn(presets, id)) throw new TypeError('Unknown integration example');
  const config = presets[id]; query<HTMLSelectElement>('#intent').value = id; query<HTMLTextAreaElement>('#task').value = config.task;
  query<HTMLSelectElement>('#stack').value = config.stack; query<HTMLSelectElement>('#motion').value = config.motion!; query<HTMLSelectElement>('#optics').value = config.optics!;
  document.querySelectorAll<HTMLInputElement>('[name=widgets]').forEach(input => { input.checked = config.widgets!.includes(input.value as GlassPatternId); });
  query('#status').textContent = ''; update();
};
query('#intent').addEventListener('change', () => preset(query<HTMLSelectElement>('#intent').value));
query('#task').addEventListener('input', update);
for (const id of ['stack', 'motion', 'optics']) query(`#${id}`).addEventListener('change', update);
choices.addEventListener('change', update);
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view as View; renderOutput(); }));
query('#copy').addEventListener('click', async () => {
  if (!valid) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
    await navigator.clipboard.writeText(brief.markdown); query('#status').textContent = 'Copied the current integration brief';
  } catch {
    view = 'markdown'; renderOutput(); query('#status').textContent = 'Clipboard unavailable. The Markdown view is selectable; you can also download the brief.';
  }
});
query('#download').addEventListener('click', () => {
  if (!valid) return;
  try {
    const url = URL.createObjectURL(new Blob([brief.markdown], { type: 'text/markdown;charset=utf-8' })), link = document.createElement('a');
    link.href = url; link.download = `liquid-glass-${brief.stack}-brief.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    query('#status').textContent = 'Download requested for the current Markdown brief';
  } catch { query('#status').textContent = 'Download unavailable. Open Markdown to select the brief text.'; }
});
Object.assign(window, { __briefDemo: { preset, setView(next: View) { if (!['plan', 'imports', 'checks', 'markdown'].includes(next)) throw new TypeError('Unknown brief view'); view = next; renderOutput(); }, get state() { return { valid, view, task: brief.task, stack: brief.stack, widgets: brief.widgets, motion: brief.motion, optics: brief.optics, imports: brief.imports, markdown: brief.markdown }; } } });
preset('reader');
