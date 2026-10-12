import './style.css';
import { attachGlassIconToolbar, getGlassIconActionProps } from '../../src/icon-toolbar.js';
import type { GlassIconToolbarItem } from '../../src/icon-toolbar.js';
import { getGlassProps } from '../../src/material.js';
import { attachGlassTransition } from '../../src/micro-motion.js';

const query = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const app = query('#app'), tools = query('#tool-actions'), boardWrap = query('#board-wrap');
const poster = query('#poster'), heading = query('#poster-heading'), caption = query('#poster-caption');
const titleInput = query<HTMLTextAreaElement>('#title-input'), captionInput = query<HTMLInputElement>('#caption-input');
const original = { title: 'room\nto make.', caption: 'A small space for a good next idea.' };
const state = { title: original.title, caption: original.caption, align: 'left' as 'left' | 'center', bold: false, guides: false,
  palette: 'warm' as 'warm' | 'cool', stamp: false, rtl: false, vertical: false, wrap: true, quiet: false,
  solid: false, dark: false, hideGuides: false, disableRestore: false, extraAction: false };
type Configuration = Pick<typeof state, 'rtl' | 'vertical' | 'wrap' | 'quiet' | 'solid' | 'dark' | 'hideGuides' | 'disableRestore' | 'extraAction'>;
type LocalChange = { revision: number; message: string; kind: 'action' | 'edit' | 'configuration' };
const history: LocalChange[] = [];
const focusRepairs: { from: string; to: string; reason: string }[] = [];
let revision = 0, destroyed = false, tourVersion = 0, tourPhase: string | null = null;
let tourResolve: ((value: boolean) => void) | undefined, tourPromise: Promise<boolean> | null = null;
const timers = new Set<number>();
const motion = attachGlassTransition(heading, { duration: 180, distance: 7 });
let motionRequests = 0, motionSettled = 0, motionCancelled = 0;
let motionGeneration = 0;
const names: Record<string, { label: string; toggle?: boolean }> = {
  'align-left': { label: 'Left align', toggle: true }, 'align-center': { label: 'Center align', toggle: true },
  bold: { label: 'Bold title', toggle: true }, guides: { label: 'Show guides', toggle: true },
  palette: { label: 'Warm palette', toggle: true }, restore: { label: 'Restore original poster' },
};
for (const [id, options] of Object.entries(names)) {
  const item = query<HTMLButtonElement>('#' + id);
  const props = getGlassIconActionProps({ label: options.label, ...(options.toggle ? { pressed: false } : {}) });
  item.classList.add(props.className); item.type = props.type; item.disabled = props.disabled;
  item.setAttribute('aria-label', props['aria-label']);
  if (props['aria-pressed'] !== undefined) item.setAttribute('aria-pressed', props['aria-pressed']);
}
query<HTMLAnchorElement>('#details').setAttribute('aria-label', 'Read composition notes');
const stampButton = document.createElement('button');
stampButton.id = 'stamp-action'; stampButton.type = 'button'; stampButton.className = 'lg-icon-action';
stampButton.setAttribute('aria-label', 'Add local stamp'); stampButton.setAttribute('aria-pressed', 'false');
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
for (const [key, value] of Object.entries({ width: '22', height: '22', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', class: 'lg-icon-action-icon' })) svg.setAttribute(key, value);
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', 'm12 3 2 3 4-1 1 4 3 3-3 3-1 4-4-1-2 3-2-3-4 1-1-4-3-3 3-3 1-4 4 1Z'); svg.append(path);
const stampLabel = document.createElement('span'); stampLabel.className = 'lg-icon-action-label'; stampLabel.textContent = 'Stamp';
stampButton.append(svg, stampLabel);
const roster = () => [...tools.querySelectorAll<GlassIconToolbarItem>('button,a[href]')];
const controller = attachGlassIconToolbar(tools, { label: 'Poster actions', items: roster(), direction: 'auto', wrap: true });

function shell() {
  const props = getGlassProps({ appearance: state.dark ? 'dark' : 'light', radius: 13, blur: 14, corner: 'continuous', reducedTransparency: state.solid });
  tools.classList.add(props.className);
  for (const [key, value] of Object.entries(props)) if (key !== 'style' && key !== 'className') tools.setAttribute(key, String(value));
  for (const [key, value] of Object.entries(props.style)) tools.style.setProperty(key, value);
  app.dataset.theme = state.dark ? 'dark' : 'light'; app.dataset.quiet = String(state.quiet);
  motion.update({ duration: 180, distance: 7, reducedMotion: state.quiet });
}
function paint() {
  heading.textContent = state.title; caption.textContent = state.caption;
  poster.dataset.align = state.align; poster.dataset.weight = state.bold ? 'bold' : 'regular';
  app.dataset.palette = state.palette;
  query('#poster-guides').hidden = !state.guides; query('#poster-stamp').hidden = !state.stamp;
  for (const [id, pressed] of Object.entries({ 'align-left': state.align === 'left', 'align-center': state.align === 'center', bold: state.bold, guides: state.guides, palette: state.palette === 'warm' })) query('#' + id).setAttribute('aria-pressed', String(pressed));
  stampButton.setAttribute('aria-pressed', String(state.stamp));
  query('#revision').textContent = 'REVISION ' + String(revision).padStart(2, '0');
  query('#change-count').textContent = revision + ' local edits';
}
function record(message: string, kind: LocalChange['kind']) {
  revision++; history.unshift({ revision, message, kind }); history.splice(6);
  const nodes = history.map(change => { const li = document.createElement('li'), number = document.createElement('span'), text = document.createElement('span'); number.textContent = String(change.revision).padStart(2, '0'); text.textContent = change.message; li.append(number, text); return li; });
  query('#change-log').replaceChildren(...nodes); query('#status').textContent = message + ' This local page only; nothing uploaded.';
  paint();
}
async function feedback() {
  const generation = motionGeneration;
  motionRequests++;
  const result = await motion.feedback('confirm');
  if (destroyed || generation !== motionGeneration) return;
  if (result) motionSettled++; else motionCancelled++;
}
function cancel() {
  tourVersion++; for (const id of timers) window.clearTimeout(id); timers.clear();
  tourPhase = null; const resolve = tourResolve; tourResolve = undefined; resolve?.(false);
  query('#tour').textContent = 'Short tour ↗';
}
function action(id: string, scripted = false) {
  if (!scripted) cancel();
  switch (id) {
    case 'align-left': state.align = 'left'; record('Heading aligned left', 'action'); break;
    case 'align-center': state.align = 'center'; record('Heading centered', 'action'); break;
    case 'bold': state.bold = !state.bold; record(state.bold ? 'Title weight set to bold' : 'Title weight set to regular', 'action'); break;
    case 'guides': state.guides = !state.guides; record(state.guides ? 'Composition guides shown' : 'Composition guides hidden', 'action'); break;
    case 'palette': state.palette = state.palette === 'warm' ? 'cool' : 'warm'; record('Poster palette set to ' + state.palette, 'action'); break;
    case 'stamp-action': state.stamp = !state.stamp; record(state.stamp ? 'Original local stamp added' : 'Local stamp removed', 'action'); break;
    case 'restore': Object.assign(state, { ...original, align: 'left', bold: false, guides: false, palette: 'warm', stamp: false }); titleInput.value = state.title; captionInput.value = state.caption; record('Original local composition restored', 'action'); break;
    default: return;
  }
  void feedback();
}
tools.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLElement>('button,a[href]');
  if (!target || target.parentElement !== tools) return;
  if (target instanceof HTMLButtonElement && target.disabled) return;
  if (target.id === 'details') { cancel(); query('#status').textContent = 'Native link opened the composition notes below. No action was executed.'; return; }
  action(target.id, !event.isTrusted && tourPhase !== null);
});
tools.addEventListener('focusin', () => {
  const active = controller.activeItem;
  query('#keyboard-receipt').textContent = 'FOCUS / ' + (active?.getAttribute('aria-label') ?? 'none') + ' · ' + (state.vertical ? 'Up/Down' : state.rtl ? 'RTL Left/Right' : 'Left/Right') + ' · Home/End · ' + (state.wrap ? 'wrap' : 'bounded');
});
function configure(next: Partial<Configuration>, announce = true) {
  for (const [key, value] of Object.entries(next)) if (!['rtl', 'vertical', 'wrap', 'quiet', 'solid', 'dark', 'hideGuides', 'disableRestore', 'extraAction'].includes(key) || typeof value !== 'boolean') throw new TypeError('Invalid demo configuration');
  // The host knows the mutation BEFORE native blur can discard a focus hint.
  const focusedBefore = roster().find(item => item === document.activeElement) ?? null;
  const hadStamp = state.extraAction; Object.assign(state, next);
  tools.dir = state.rtl ? 'rtl' : 'ltr'; boardWrap.dataset.orientation = state.vertical ? 'vertical' : 'horizontal';
  query<HTMLButtonElement>('#guides').hidden = state.hideGuides;
  query<HTMLButtonElement>('#restore').disabled = state.disableRestore;
  if (hadStamp !== state.extraAction) {
    if (state.extraAction) tools.insertBefore(stampButton, query('#details'));
    else { stampButton.remove(); state.stamp = false; }
  }
  controller.update({ items: roster(), orientation: state.vertical ? 'vertical' : 'horizontal', direction: 'auto', wrap: state.wrap });
  controller.refresh();
  if (focusedBefore && (!focusedBefore.isConnected || !tools.contains(focusedBefore) || focusedBefore.hidden || focusedBefore.matches(':disabled,[aria-disabled=true]'))) {
    const destination = controller.activeItem ?? titleInput;
    destination.focus({ preventScroll: true });
    focusRepairs.unshift({ from: focusedBefore.id, to: destination.id, reason: 'Host captured an owned action before an unavailable DOM edit' });
    focusRepairs.splice(6);
  }
  const ids: Record<keyof Configuration, string> = { rtl: 'rtl', vertical: 'vertical', wrap: 'wrap', quiet: 'quiet', solid: 'solid', dark: 'dark', hideGuides: 'hide-guides', disableRestore: 'disable-restore', extraAction: 'extra-action' };
  for (const [key, id] of Object.entries(ids)) query<HTMLInputElement>('#' + id).checked = state[key as keyof Configuration];
  shell(); paint();
  if (announce) record('Toolbar policy updated: ' + (state.vertical ? 'vertical' : state.rtl ? 'RTL horizontal' : 'LTR horizontal') + ', ' + (state.wrap ? 'wrap' : 'bounded'), 'configuration');
}
for (const [id, key] of Object.entries({ rtl: 'rtl', vertical: 'vertical', wrap: 'wrap', quiet: 'quiet', solid: 'solid', dark: 'dark', 'hide-guides': 'hideGuides', 'disable-restore': 'disableRestore', 'extra-action': 'extraAction' })) query<HTMLInputElement>('#' + id).addEventListener('change', event => { cancel(); configure({ [key]: (event.target as HTMLInputElement).checked }); });
titleInput.addEventListener('input', () => { cancel(); state.title = titleInput.value.slice(0, 48); record('Poster heading edited locally', 'edit'); });
captionInput.addEventListener('input', () => { cancel(); state.caption = captionInput.value.slice(0, 80); record('Poster caption edited locally', 'edit'); });
query('#focus-tools').addEventListener('click', () => { cancel(); controller.activeItem?.focus(); });

function reset() {
  cancel(); motionGeneration++; motion.cancel();
  Object.assign(state, { ...original, align: 'left', bold: false, guides: false, palette: 'warm', stamp: false });
  configure({ rtl: false, vertical: false, wrap: true, quiet: false, solid: false, dark: false, hideGuides: false, disableRestore: false, extraAction: false }, false);
  revision = 0; history.length = 0; focusRepairs.length = 0; motionRequests = motionSettled = motionCancelled = 0;
  titleInput.value = state.title; captionInput.value = state.caption;
  const item = document.createElement('li'); item.textContent = 'No changes yet. The artwork is original.'; query('#change-log').replaceChildren(item);
  query('#status').textContent = 'Choose a tool or edit the heading. All actions affect this local artboard only.';
  query('#keyboard-receipt').textContent = 'Tab enters once. Arrow keys move between available actions.';
  paint(); window.scrollTo(0, 0);
}
const scriptedKey = (key: string) => controller.activeItem?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
function tour() {
  reset(); const version = tourVersion;
  const at = (ms: number, callback: () => void) => { const id = window.setTimeout(() => { timers.delete(id); if (!destroyed && version === tourVersion) callback(); }, ms); timers.add(id); };
  tourPhase = 'local-actions'; query('#tour').textContent = 'Tour / local actions'; query('#align-left').focus({ preventScroll: true });
  tourPromise = new Promise(resolve => { tourResolve = resolve; });
  at(650, () => query<HTMLButtonElement>('#align-center').click());
  at(1450, () => query<HTMLButtonElement>('#bold').click());
  at(2300, () => query<HTMLButtonElement>('#palette').click());
  at(3500, () => { tourPhase = 'rtl-keys'; configure({ rtl: true, dark: true }); query<HTMLButtonElement>('#align-center').focus({ preventScroll: true }); scriptedKey('ArrowLeft'); query('#tour').textContent = 'Tour / RTL keys'; });
  at(4400, () => { scriptedKey('End'); scriptedKey('Home'); });
  at(5200, () => query<HTMLButtonElement>('#guides').click());
  at(6300, () => { tourPhase = 'vertical-membership'; configure({ rtl: false, vertical: true, hideGuides: true, disableRestore: true, extraAction: true }); query<HTMLButtonElement>('#align-center').focus({ preventScroll: true }); scriptedKey('ArrowDown'); query('#tour').textContent = 'Tour / vertical'; });
  at(7300, () => { scriptedKey('End'); scriptedKey('ArrowUp'); stampButton.click(); });
  at(8600, () => { tourPhase = 'quiet'; configure({ quiet: true, solid: true }); query('#tour').textContent = 'Tour / quiet'; });
  at(10500, () => { tourPhase = null; tourResolve?.(true); tourResolve = undefined; query('#tour').textContent = 'Short tour ↗'; });
  return tourPromise;
}
query('#tour').addEventListener('click', () => { void tour(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancel(); motion.cancel(); } });
window.addEventListener('pagehide', () => { cancel(); destroyed = true; controller.destroy(); motion.destroy(); }, { once: true });
Object.assign(window, { __toolbarDemo: {
  reset, cancel, tour, configure(next: Partial<Configuration>) { cancel(); configure(next); },
  preset(id: 'horizontal' | 'rtl' | 'vertical' | 'quiet') {
    cancel(); if (!['horizontal', 'rtl', 'vertical', 'quiet'].includes(id)) throw new RangeError('Unknown original toolbar fixture');
    configure({ rtl: id === 'rtl', vertical: id === 'vertical', quiet: id === 'quiet', solid: id === 'quiet' });
  }, refresh() { controller.refresh(); },
  get tourPromise() { return tourPromise; },
  get state() { return { ...state, revision, changes: history.map(value => ({ ...value })), focusRepairs: focusRepairs.map(value => ({ ...value })), phase: tourPhase, timers: timers.size,
    activeItem: controller.activeItem?.id ?? null, focused: document.activeElement?.id ?? null,
    items: roster().map(item => ({ id: item.id, label: item.getAttribute('aria-label'), tabIndex: item.tabIndex, hidden: item.hidden, disabled: item.matches(':disabled,[aria-disabled=true]'), pressed: item.getAttribute('aria-pressed'), tag: item.tagName })),
    motion: { requests: motionRequests, settled: motionSettled, cancelled: motionCancelled, documentAnimations: document.getAnimations?.().length ?? null },
    systemReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? null,
    boundary: 'Original local poster and scripted finite tour; no backend, external art or model service',
  }; },
} });
shell(); paint();
