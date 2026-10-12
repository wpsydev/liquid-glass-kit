import './style.css';
import { getGlassIllustrationScene } from '../../src/illustration.js';
import type { GlassIllustrationLayer, GlassIllustrationPlacement, GlassIllustrationScene } from '../../src/illustration.js';
import land from './art/land.svg?raw';
import pine from './art/pine.svg?raw';
import house from './art/house.svg?raw';
import portraitHouse from './art/house-portrait.svg?raw';
import sun from './art/sun.svg?raw';
import shrub from './art/shrub.svg?raw';
import bird from './art/bird.svg?raw';
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const authored = { land, pine, house, 'house-portrait': portraitHouse, sun, shrub, bird };
const resources = Object.fromEntries(Object.entries(authored).map(([key, source]) => [key, URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }))]));
const dimensions: Record<string, [number, number]> = { land: [900, 300], pine: [300, 520], house: [500, 430], sun: [300, 300], shrub: [450, 250], bird: [240, 120] };
const labels: Record<string, string> = { land: 'Ground', sun: 'Sun', pine: 'Pine', house: 'House', shrub: 'Shrub', bird: 'Bird' };
const colors: Record<string, string> = { land: '#a7ad97', sun: '#edb25f', pine: '#344338', house: '#e8644b', shrub: '#748269', bird: '#313d36' };
type Mode = 'auto' | 'landscape' | 'portrait';
type Semantic = 'informative' | 'decorative';
const mobile = matchMedia('(max-width: 560px)'), systemQuiet = matchMedia('(prefers-reduced-motion: reduce)');
let mode: Mode = 'auto', semantic: Semantic = 'informative', selected = 'house';
let order = ['land', 'sun', 'pine', 'house', 'shrub', 'bird'];
let edits: Record<string, Partial<GlassIllustrationPlacement>> = {};
let quiet = false, solid = false, tourActive = false, updates = 0;
const placements: Record<'landscape' | 'portrait', Record<string, GlassIllustrationPlacement>> = {
  landscape: { land: { x: 50, y: 85, width: 99 }, sun: { x: 72, y: 24, width: 20 }, pine: { x: 31, y: 47, width: 23 }, house: { x: 59, y: 60, width: 33 }, shrub: { x: 80, y: 78, width: 28 }, bird: { x: 43, y: 24, width: 13, rotation: -8 } },
  portrait: { land: { x: 50, y: 86, width: 100 }, sun: { x: 78, y: 17, width: 30 }, pine: { x: 27, y: 51, width: 38 }, house: { x: 58, y: 70, width: 53 }, shrub: { x: 78, y: 85, width: 39 }, bird: { x: 37, y: 20, width: 21, rotation: -8 } },
};
const description = 'A small red-roofed house in a pine grove, beneath a golden sun. A bird crosses the quiet landscape.';
const figure = document.createElement('figure'), stage = document.createElement('div');
figure.append(stage); $('#scene-mount').append(figure);
const elements = new Map<string, { layer: HTMLDivElement; picture: HTMLPictureElement; image: HTMLImageElement; source?: HTMLSourceElement }>();
let scene: Readonly<GlassIllustrationScene>;
const renderedMode = () => mode === 'auto' ? mobile.matches ? 'portrait' : 'landscape' : mode;
function styles(element: HTMLElement, values: Readonly<Record<string, string>>) {
  for (const [key, value] of Object.entries(values)) if (key.startsWith('--')) element.style.setProperty(key, value); else (element.style as unknown as Record<string, string>)[key] = value;
}
function applyProps(element: HTMLElement, props: Readonly<Record<string, unknown>>) {
  for (const [key, value] of Object.entries(props)) {
    if (key === 'style') styles(element, value as Record<string, string>);
    else if (key === 'className') element.className = String(value);
    else element.setAttribute(key === 'srcSet' ? 'srcset' : key === 'fetchPriority' ? 'fetchpriority' : key, String(value));
  }
}
function layerDefinition(id: string): GlassIllustrationLayer {
  const [width, height] = dimensions[id];
  return { id, image: { src: resources[id], alt: '', width, height, fit: 'contain' }, placement: { ...placements[renderedMode()][id], ...edits[id] }, provenance: { creator: 'wpsydev · original Fieldnotes vectors', license: 'MIT' },
    ...(id === 'house' ? { sources: [{ width: 500, height: 430, candidates: [{ src: resources['house-portrait'], width: 500 }], sizes: '(max-width: 560px) 53vw, 250px', media: '(max-width: 560px)', type: 'image/svg+xml' }] } : {}) };
}
function announce(message: string) { $('#announcement').textContent = message; }
function render() {
  updates++;
  const layout = renderedMode();
  scene = getGlassIllustrationScene({ id: 'fieldnotes-art', aspectRatio: layout === 'portrait' ? { width: 4, height: 5 } : { width: 3, height: 2 }, semantics: semantic === 'informative' ? { kind: 'informative', description } : { kind: 'decorative' }, layers: order.map(layerDefinition) });
  for (const attr of ['role', 'aria-label', 'aria-hidden']) figure.removeAttribute(attr);
  applyProps(figure, scene.figureProps); applyProps(stage, scene.stageProps);
  for (const recipe of scene.layers) {
    let entry = elements.get(recipe.id);
    if (!entry) {
      const layer = document.createElement('div'), picture = document.createElement('picture'), image = document.createElement('img');
      const source = recipe.sourceProps.length ? document.createElement('source') : undefined;
      if (source) picture.append(source);
      picture.append(image); layer.append(picture); entry = { layer, picture, image, source }; elements.set(recipe.id, entry);
      image.addEventListener('load', updateSourceDetail); image.addEventListener('error', () => announce('An original image could not decode; native controls remain available.'));
    }
    applyProps(entry.layer, recipe.layerProps); applyProps(entry.picture, recipe.pictureProps); applyProps(entry.image, recipe.imageProps);
    if (entry.source) applyProps(entry.source, recipe.sourceProps[0]);
    entry.layer.classList.toggle('is-selected', recipe.id === selected); stage.append(entry.layer);
  }
  $('#paper').dataset.layout = layout;
  $('#composition-label').textContent = layout === 'portrait' ? '02 / Portrait' : '01 / Landscape';
  $('#stage-ratio').textContent = layout === 'portrait' ? '4 : 5' : '3 : 2';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  $('#semantics-detail').textContent = semantic === 'informative' ? 'role=img + authored description' : 'aria-hidden scene · ordinary HTML stays readable';
  $('#meaning-hint').textContent = semantic === 'informative' ? 'One named image; empty layer alt text.' : 'Artwork hidden from AT; controls stay semantic.';
  const recipe = scene.layers.find(value => value.id === selected)!;
  $<HTMLInputElement>('#position-x').value = String(recipe.geometry.x); $('#x-output').textContent = recipe.geometry.x + '%';
  $<HTMLInputElement>('#rotation').value = String(recipe.geometry.rotation); $('#rotation-output').textContent = recipe.geometry.rotation + '°';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-layer]')) {
    button.setAttribute('aria-pressed', String(button.dataset.layer === selected));
    button.querySelector('span')!.textContent = String(order.indexOf(button.dataset.layer!) + 1).padStart(2, '0');
  }
  $<HTMLButtonElement>('#front').disabled = order.at(-1) === selected;
  $<HTMLSelectElement>('#semantics').value = semantic;
  document.documentElement.classList.toggle('quiet', quiet || systemQuiet.matches);
  document.documentElement.classList.toggle('solid', solid);
  $<HTMLInputElement>('#quiet').checked = quiet; $<HTMLInputElement>('#solid').checked = solid;
  updateSourceDetail();
}
function updateSourceDetail() {
  const img = elements.get('house')?.image;
  $('#source-detail').textContent = img?.currentSrc === resources['house-portrait'] ? 'Portrait SVG selected by native picture.' : 'Wide SVG + a native mobile source.';
}
for (const id of order) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.layer = id; button.style.setProperty('--swatch', colors[id]);
  button.append(document.createTextNode(labels[id]), document.createElement('span')); button.setAttribute('aria-pressed', String(id === selected));
  button.addEventListener('click', () => { cancel(); selected = id; render(); announce(`${labels[id]} layer selected. Placement controls edit this original image.`); });
  $('#layer-list').append(button);
}
function changeMode(value: Mode) { mode = value; render(); }
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.addEventListener('click', () => { cancel(); changeMode(button.dataset.mode as Mode); announce(`${renderedMode()} composition. Geometry is authored by the host.`); });
$<HTMLSelectElement>('#semantics').addEventListener('change', event => { cancel(); semantic = (event.target as HTMLSelectElement).value as Semantic; render(); announce(semantic === 'informative' ? 'One authored description names the complete image.' : 'The complete artwork is decorative. Editing controls stay accessible.'); });
for (const [selector, field] of [['#position-x', 'x'], ['#rotation', 'rotation']] as const) $<HTMLInputElement>(selector).addEventListener('input', event => { cancel(); edits[selected] = { ...edits[selected], [field]: Number((event.target as HTMLInputElement).value) }; render(); });
$('#front').addEventListener('click', () => { cancel(); order = [...order.filter(id => id !== selected), selected]; render(); announce(`${labels[selected]} moved to the last, front-most authored layer.`); });
$('#reset').addEventListener('click', () => { reset(); announce('The original composition is restored.'); });
$<HTMLInputElement>('#quiet').addEventListener('change', event => { cancel(); quiet = (event.target as HTMLInputElement).checked; render(); });
$<HTMLInputElement>('#solid').addEventListener('change', event => { solid = (event.target as HTMLInputElement).checked; render(); });
mobile.addEventListener('change', () => { if (mode === 'auto') render(); });
systemQuiet.addEventListener('change', () => { cancel(); render(); });
const timers = new Set<number>();
let resolver: ((value: ReturnType<typeof state>) => void) | undefined;
let lastTour: Promise<ReturnType<typeof state>> = Promise.resolve(undefined as never);
function cancel() {
  for (const timer of timers) clearTimeout(timer); timers.clear(); tourActive = false;
  const finish = resolver; resolver = undefined; finish?.(state());
}
function reset() { cancel(); mode = 'auto'; semantic = 'informative'; selected = 'house'; order = ['land', 'sun', 'pine', 'house', 'shrub', 'bird']; edits = {}; render(); }
function preset(id: 'landscape' | 'portrait' | 'decorative' | 'edit') {
  cancel(); edits = {}; selected = 'house'; mode = id === 'portrait' ? 'portrait' : 'landscape'; semantic = id === 'decorative' ? 'decorative' : 'informative';
  if (id === 'edit') { selected = 'bird'; edits.bird = { x: 64, rotation: 18 }; }
  render(); return state();
}
function state() {
  return { mode, layout: renderedMode(), semantic, selected, order: [...order], edits: structuredClone(edits), quiet: quiet || systemQuiet.matches, solid, tourActive, updates,
    figure: { role: figure.getAttribute('role'), label: figure.getAttribute('aria-label'), hidden: figure.getAttribute('aria-hidden') },
    stageRatio: scene.stageProps.style.aspectRatio, sources: scene.layers.reduce((count, layer) => count + layer.sourceProps.length, 0),
    images: [...elements].map(([id, value]) => ({ id, complete: value.image.complete, decoded: value.image.naturalWidth > 0, alt: value.image.alt, current: Object.keys(resources).find(key => resources[key] === value.image.currentSrc) ?? null, width: value.image.width, height: value.image.height })),
    nativeActionsOutsideFigure: figure.querySelector('button,input,select') === null, liveLayerCount: stage.children.length, geometry: scene.layers.map(layer => ({ id: layer.id, ...layer.geometry })), originalAssets: Object.keys(authored), pendingTimers: timers.size };
}
function tour() {
  reset(); const originalSolid = solid; mode = 'landscape'; render(); tourActive = true; announce('A finite study: wide, tall, edit, meaning.');
  lastTour = new Promise(resolve => { resolver = resolve; });
  const steps: [number, () => void][] = [
    [900, () => { selected = 'bird'; edits.bird = { x: 55, rotation: 8 }; render(); }],
    [2100, () => { edits.bird = { x: 70, rotation: -3 }; render(); }],
    [3200, () => { edits = {}; mode = 'portrait'; selected = 'house'; render(); }],
    [4800, () => { selected = 'sun'; edits.sun = { x: 63, rotation: 12 }; render(); }],
    [6400, () => { mode = 'landscape'; edits = {}; selected = 'house'; render(); }],
    [7700, () => { edits.house = { x: 64, rotation: 4 }; render(); }],
    [8900, () => { semantic = 'decorative'; solid = true; render(); }],
    [10200, () => { semantic = 'informative'; edits = {}; solid = originalSolid; selected = 'house'; render(); announce('One original scene. Two authored compositions. Native image semantics.'); }],
    [10500, () => cancel()],
  ];
  for (const [at, callback] of steps) { const id = window.setTimeout(() => { timers.delete(id); callback(); }, at); timers.add(id); }
  return lastTour;
}
$('#tour').addEventListener('click', () => void tour());
window.addEventListener('pagehide', () => cancel());
render();
lastTour = Promise.resolve(state());
const api = { preset, reset, tour, cancel, get state() { return state(); }, get tourPromise() { return lastTour; } };
(window as unknown as { __illustrationDemo: typeof api }).__illustrationDemo = api;
