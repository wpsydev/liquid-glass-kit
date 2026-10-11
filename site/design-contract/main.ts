import { createGlassDesignContract, parseGlassDesignContract } from '../../src/design-contract.js';
import type { GlassDesignContractOptions } from '../../src/design-contract.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const presets: Record<string, { config: GlassDesignContractOptions; kicker: string; heading: string; description: string; meta: string }> = {
  field: { config: { name: 'Field Notes', description: 'A warm reading workspace with restrained terracotta signals', tokens: { colors: { background: '#f5f1e9', foreground: '#262922', primary: '#a34024', accent: '#68755b' }, fontFamily: 'Georgia, serif', radius: 14 }, material: { blur: 16, appearance: 'light' } }, kicker: 'THOUGHTFUL TOOLS, QUIETLY MADE', heading: 'A place for\nclear thinking.', description: 'Notes, references and the useful things in between.', meta: 'FIELD JOURNAL' },
  command: { config: { name: 'Command Room', description: 'A focused night workspace with clear operational hierarchy', tokens: { colors: { background: '#151e2b', foreground: '#eef3f8', primary: '#8ac7ff', accent: '#ffb567' }, radius: 22 }, material: { blur: 18, appearance: 'dark' } }, kicker: 'LESS NOISE. MORE SIGNAL.', heading: 'Everything\nin its place.', description: 'Your working context, arranged with purpose.', meta: 'COMMAND ROOM' },
  mono: { config: { name: 'Mono Atelier', description: 'A precise studio for notes and code, with a quiet green signal', tokens: { colors: { background: '#f7f7f2', foreground: '#101116', primary: '#53635c', accent: '#846958' }, fontFamily: 'ui-monospace, SFMono-Regular, monospace', radius: 4, spacing: { sm: 6, md: 12, lg: 20 } }, material: { blur: 8, appearance: 'light' } }, kicker: 'A LITTLE SPACE TO MAKE THINGS', heading: 'Ideas become\nuseful things.', description: 'A clean surface for the next small breakthrough.', meta: 'ATELIER / NOTE 04' },
};
type View = 'preview' | 'markdown' | 'css' | 'json';
let selected = 'field', view: View = 'preview', solid = false, contract = createGlassDesignContract(presets.field.config);
const theme = document.createElement('style'); theme.dataset.contractTheme = 'true'; document.head.append(theme);
const controls = ['name', 'background', 'foreground', 'primary', 'radius', 'blur'];
const input = (id: string) => query<HTMLInputElement>(`#${id}`);
const artifact = (type: Exclude<View, 'preview'>) => type === 'markdown' ? contract.toDesignMarkdown() : type === 'css' ? contract.toThemeCSS() : contract.toJSON();
const showView = (next: View) => {
  view = next;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === next)));
  query('#preview').hidden = next !== 'preview'; query('#raw').hidden = next === 'preview';
  if (next !== 'preview') { query('#raw-title').textContent = next === 'markdown' ? 'DESIGN.md' : next === 'css' ? 'theme.css' : 'liquid-glass.design.json'; query('#raw-code').textContent = artifact(next); }
};
const render = () => {
  try {
    for (const id of ['name', 'radius']) if (!input(id).checkValidity()) throw new Error(id === 'name' ? 'Give your project a name' : 'Choose corners between 0 and 64 pixels');
    const base = presets[selected].config;
    contract = createGlassDesignContract({ ...base, name: input('name').value,
      tokens: { ...base.tokens, radius: Number(input('radius').value), colors: { ...base.tokens.colors, background: input('background').value, foreground: input('foreground').value, primary: input('primary').value } },
      material: { ...base.material, variant: query<HTMLSelectElement>('#variant').value as 'regular' | 'clear', blur: Number(input('blur').value), reducedTransparency: solid } });
    const css = contract.toThemeCSS(), json = contract.toJSON(), markdown = contract.toDesignMarkdown();
    theme.textContent = css; query('#preview').dataset.lgDesign = contract.id; query('#preview').dataset.direction = selected;
    query('#project-name').textContent = input('name').value;
    document.querySelectorAll<HTMLElement>('.preview-glass').forEach(element => {
      const { className, style, ...attributes } = getGlassProps(contract.material); element.classList.add(className);
      for (const [key, value] of Object.entries(style)) element.style.setProperty(key, value);
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    });
    const validation = contract.validate(), roundtrip = parseGlassDesignContract(json);
    const match = roundtrip.toJSON() === json && roundtrip.toThemeCSS() === css && roundtrip.toDesignMarkdown() === markdown;
    query('#contrast').replaceChildren(document.createTextNode(`${validation.contrast.foregroundOnBackground.toFixed(1)}:1 `));
    const label = document.createElement('small'); label.textContent = 'opaque token contrast'; query('#contrast').append(label);
    query('#roundtrip').textContent = match ? 'JSON roundtrip ✓' : 'Roundtrip mismatch';
    query('#errors').textContent = validation.warnings.join(' '); controls.forEach(id => input(id).removeAttribute('aria-invalid'));
    for (const picker of document.querySelectorAll<HTMLInputElement>('[data-color]')) if (/^#[\da-f]{6}$/i.test(input(picker.dataset.color!).value)) picker.value = input(picker.dataset.color!).value;
    query('#blur-value').textContent = `${contract.material.blur}px`; showView(view);
    document.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(button => { button.disabled = false; });
  } catch (error) {
    query('#errors').textContent = error instanceof Error ? error.message : 'Check the design values';
    for (const id of ['background', 'foreground', 'primary']) if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(input(id).value)) input(id).setAttribute('aria-invalid', 'true');
    document.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(button => { button.disabled = true; });
  }
};
const selectPreset = (id: string) => {
  if (!Object.hasOwn(presets, id)) throw new TypeError('Unknown original studio preset');
  selected = id; solid = false; const preset = presets[id], config = preset.config;
  input('name').value = config.name; input('radius').value = String(config.tokens.radius); input('blur').value = String(config.material?.blur);
  for (const key of ['background', 'foreground', 'primary'] as const) input(key).value = config.tokens.colors[key];
  query<HTMLSelectElement>('#variant').value = 'regular'; query('#solid').setAttribute('aria-pressed', 'false'); query('#solid span').textContent = 'off';
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === id)));
  query('#project-kicker').textContent = preset.kicker; query('#project-heading').replaceChildren(...preset.heading.split('\n').flatMap((text, index) => index ? [document.createElement('br'), document.createTextNode(text)] : [document.createTextNode(text)]));
  query('#project-description').textContent = preset.description; query('#project-meta').textContent = preset.meta; query('#status').textContent = ''; render();
};
query('#contract-form').addEventListener('submit', event => event.preventDefault());
query('#contract-form').addEventListener('input', event => { if (!(event.target instanceof HTMLInputElement && event.target.dataset.color)) render(); }); query('#variant').addEventListener('change', render);
document.querySelectorAll<HTMLInputElement>('[data-color]').forEach(picker => picker.addEventListener('input', () => { input(picker.dataset.color!).value = picker.value; render(); }));
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => selectPreset(button.dataset.preset!)));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view as View)));
query('#solid').addEventListener('click', () => { solid = !solid; query('#solid').setAttribute('aria-pressed', String(solid)); query('#solid span').textContent = solid ? 'on' : 'off'; render(); });
query('#preview-action').addEventListener('click', () => { query('#preview-confirmation').textContent = 'Example note saved'; });
document.querySelectorAll<HTMLButtonElement>('.preview-nav button[aria-pressed]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll<HTMLButtonElement>('.preview-nav button[aria-pressed]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  query('#preview-confirmation').textContent = `${button.textContent} selected`;
}));
document.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(button => button.addEventListener('click', () => {
  const type = button.dataset.download as Exclude<View, 'preview'>, filename = type === 'markdown' ? 'DESIGN.md' : type === 'css' ? 'theme.css' : 'liquid-glass.design.json';
  const mime = type === 'markdown' ? 'text/markdown' : type === 'css' ? 'text/css' : 'application/json';
  const url = URL.createObjectURL(new Blob([artifact(type)], { type: `${mime};charset=utf-8` })), link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  query('#status').textContent = `Download requested: ${filename} from the current typed contract`;
}));
Object.assign(window, { __contractDemo: { selectPreset, setView: showView, get state() { return { preset: selected, view, id: contract.id, validation: contract.validate(), json: contract.toJSON() }; } } });
selectPreset('field');
