import '../../src/styles.css';
import './style.css';
import { attachGlass, attachGlassIndicator, attachGlassScrollEdge } from '../../src/index';
import type { GlassOptions } from '../../src/index';

declare global { interface Window { runBehaviorShowcase: () => Promise<void>; } }

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const density = $<HTMLInputElement>('#density');
const solid = $<HTMLInputElement>('#solid');
const pressButton = $<HTMLButtonElement>('#press-button');
const scrollport = $('#scrollport');
const backing = $('#selection-backing');
const nav = $('#moving-nav');
const navButtons = [...nav.querySelectorAll<HTMLButtonElement>('button')];
let backdrop: 'light' | 'dark' = 'light';
let tint = '#9ceacb';
let variant: 'regular' | 'clear' = 'regular';
let edgeStyle: 'soft' | 'hard' = 'soft';
let run = 0;
const timers = new Map<number, (continued: boolean) => void>();

const glassElements = [$('#material-card'), pressButton, backing, $('#protected-toolbar')];
const materials = glassElements.map(element => attachGlass(element));
const indicator = attachGlassIndicator(nav, backing, { duration: 280, radius: 20 });
const edge = attachGlassScrollEdge(scrollport, $('#scroll-edge'), { edge: 'both', style: edgeStyle, size: 32 });

const items = [
  ['✳', 'Soft systems', 'A study in shape and light', '#b9d3a8'],
  ['◈', 'Everyday magic', 'Small details, good defaults', '#c2b8e5'],
  ['◌', 'The quiet interface', 'Space for what matters', '#e0c19a'],
  ['⌘', 'A place for ideas', 'Build something thoughtful', '#a8d3cb'],
  ['▤', 'Layers of meaning', 'Depth with a clear purpose', '#d2dc8c'],
  ['✦', 'Better by design', 'Controls that feel considered', '#bbbae3'],
  ['◎', 'In good company', 'Materials for the open web', '#a4cbb4'],
  ['⌁', 'Room to move', 'Motion with restraint', '#dec2b6'],
  ['♡', 'Made to keep', 'Your next favorite detail', '#c5d883'],
];
for (const [symbol, title, description, color] of items) {
  const row = document.createElement('article'); row.className = 'collection-item';
  const art = document.createElement('span'); art.className = 'item-art'; art.setAttribute('aria-hidden', 'true'); art.textContent = symbol; art.style.setProperty('--art', color);
  const text = document.createElement('div');
  const heading = document.createElement('strong'); heading.textContent = title;
  const descriptionElement = document.createElement('p'); descriptionElement.textContent = description;
  text.append(heading, descriptionElement);
  const link = document.createElement('a'); link.href = 'https://github.com/wpsydev/liquid-glass-kit'; link.setAttribute('aria-label', `Explore ${title} in the repository`); link.textContent = '↗';
  row.append(art, text, link); $('#collection-list').append(row);
}

function applyMaterial() {
  const options: GlassOptions = { appearance: 'auto', backdrop, variant, opacity: Number(density.value) / 100, tint, tintOpacity: tint === '#ffffff' ? 0 : .2, interactive: true, reducedTransparency: solid.checked };
  materials.forEach((material, i) => material.update({ ...options, radius: i === 0 ? 25 : 20, variant: i === 0 ? variant : 'regular', opacity: i === 0 ? options.opacity : .78 }));
  document.querySelectorAll<HTMLElement>('.stage').forEach(stage => { stage.dataset.tone = backdrop; });
  $('#density-value').textContent = `${density.value}%`;
  $('#material-state').textContent = `${solid.checked ? 'SOLID MODE' : variant === 'clear' ? 'CLEAR MATERIAL' : 'READABLE MATERIAL'} / ${backdrop.toUpperCase()} BACKDROP`;
  document.querySelectorAll<HTMLButtonElement>('[data-tone]').forEach(button => { if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.tone === backdrop)); });
  document.querySelectorAll<HTMLButtonElement>('[data-tint]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tint === tint)));
  applyEdge();
}

function selectSection(button: HTMLButtonElement) {
  navButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  indicator.moveTo(button);
  const copy: Record<string, [string, string, string]> = {
    explore: ['YOUR SPACE TO THINK', 'Ideas, in orbit.', 'Explore what comes next.'],
    library: ['A LITTLE MORE POSSIBILITY', 'Collect the good.', 'The things worth coming back to.'],
    saved: ['MADE TO COME BACK TO', 'Keep your sparks.', 'A home for your next favorite idea.'],
  };
  const [eyebrow, title, description] = copy[button.dataset.section!];
  $('#nav-eyebrow').textContent = eyebrow; $('#nav-heading').textContent = title; $('#nav-copy').textContent = description;
}

function applyEdge() {
  edge.update({ edge: 'both', style: edgeStyle, size: 32, reducedTransparency: solid.checked });
  document.querySelectorAll<HTMLButtonElement>('[data-edge-style]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.edgeStyle === edgeStyle)));
}

function updateScrollState() {
  const max = scrollport.scrollHeight - scrollport.clientHeight;
  $('#scroll-state').textContent = max <= 1 ? 'NO OVERFLOW' : scrollport.scrollTop <= 1 ? 'AT THE TOP' : scrollport.scrollTop >= max - 1 ? 'AT THE END' : 'IN THE FLOW';
}

function caption(step: string, text: string, index: number) {
  $('#showcase-step').textContent = step; $('#showcase-caption').textContent = text;
  $('#showcase-progress').textContent = Array.from({ length: 6 }, (_, i) => i === index ? '●' : '○').join(' ');
}

function stopShowcase() {
  run++;
  for (const [timer, resolve] of timers) { window.clearTimeout(timer); resolve(false); }
  timers.clear();
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  pressButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  $('#play-showcase').innerHTML = 'Play 24s showcase <span aria-hidden="true">↗</span>';
}

function pause(ms: number, currentRun: number) {
  return new Promise<boolean>(resolve => {
    const timer = window.setTimeout(() => { timers.delete(timer); resolve(currentRun === run); }, ms);
    timers.set(timer, resolve);
  });
}

const manual = (action: () => void) => () => { stopShowcase(); action(); caption('TRY IT LIVE', 'Your controls. Your material. The demo is interactive.', 0); };
density.addEventListener('input', manual(() => { variant = 'regular'; applyMaterial(); }));
solid.addEventListener('change', manual(applyMaterial));
document.querySelectorAll<HTMLButtonElement>('button[data-tone]').forEach(button => button.addEventListener('click', manual(() => { backdrop = button.dataset.tone as 'light' | 'dark'; applyMaterial(); })));
document.querySelectorAll<HTMLButtonElement>('button[data-tint]').forEach(button => button.addEventListener('click', manual(() => { tint = button.dataset.tint!; variant = 'regular'; applyMaterial(); })));
navButtons.forEach(button => button.addEventListener('click', manual(() => selectSection(button))));
document.querySelectorAll<HTMLButtonElement>('[data-edge-style]').forEach(button => button.addEventListener('click', manual(() => { edgeStyle = button.dataset.edgeStyle as 'soft' | 'hard'; applyEdge(); })));
pressButton.addEventListener('click', () => { $('#press-status').textContent = 'Focus session ready · demo control'; });
scrollport.addEventListener('scroll', updateScrollState, { passive: true });

window.runBehaviorShowcase = async () => {
  stopShowcase(); const currentRun = run;
  density.value = '15'; variant = 'clear'; backdrop = 'light'; tint = '#ffffff'; solid.checked = false; edgeStyle = 'soft';
  $('#press-status').textContent = 'Touch or press Enter'; scrollport.scrollTop = 0;
  applyMaterial(); applyEdge(); selectSection(navButtons[0]); updateScrollState();
  $('#play-showcase').textContent = 'Replay showcase ↻';
  caption('01 / DENSITY', 'From clear to considered. Material fill is a dial.', 0);
  if (!await pause(2200, currentRun)) return;
  density.value = '82'; variant = 'regular'; applyMaterial();
  if (!await pause(2800, currentRun)) return;
  tint = '#b59dff'; applyMaterial(); caption('02 / TINT', 'A semantic color layer. Foreground text stays sharp.', 1);
  if (!await pause(3000, currentRun)) return;
  backdrop = 'dark'; applyMaterial(); caption('03 / TONE', 'The app supplies backdrop tone. The material follows.', 2);
  if (!await pause(2500, currentRun)) return;
  caption('04 / TOUCH', 'Native controls. Press feedback. Keyboard focus.', 3);
  const rect = pressButton.getBoundingClientRect();
  pressButton.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, bubbles: true }));
  if (!await pause(1000, currentRun)) return;
  window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
  pressButton.focus({ preventScroll: true }); pressButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  if (!await pause(800, currentRun)) return;
  pressButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })); $('#press-status').textContent = 'Touch + keyboard feedback'; pressButton.blur();
  if (!await pause(800, currentRun)) return;
  caption('05 / GEOMETRY', 'One backing moves. Native buttons keep their semantics.', 4); selectSection(navButtons[1]);
  if (!await pause(1400, currentRun)) return;
  selectSection(navButtons[2]);
  if (!await pause(1400, currentRun)) return;
  selectSection(navButtons[0]);
  if (!await pause(1400, currentRun)) return;
  caption('06 / SCROLL', 'Soft and hard edges protect the toolbar. Content stays intact.', 5);
  scrollport.scrollTo({ top: scrollport.scrollHeight * .45, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (!await pause(2000, currentRun)) return;
  edgeStyle = 'hard'; applyEdge(); scrollport.scrollTo({ top: scrollport.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (!await pause(2000, currentRun)) return;
  solid.checked = true; applyMaterial(); caption('SOLID / STILL USEFUL', 'Reduced transparency is a first-class material choice.', 5);
  if (!await pause(2700, currentRun)) return;
  $('#play-showcase').innerHTML = 'Replay 24s showcase <span aria-hidden="true">↻</span>';
  caption('OPEN SOURCE / OPEN WEB', 'Liquid Glass Kit. Try the live controls. Build your next layer.', 5);
};

$('#play-showcase').addEventListener('click', () => { void window.runBehaviorShowcase(); });
window.addEventListener('pagehide', () => { stopShowcase(); indicator.destroy(); edge.destroy(); materials.forEach(material => material.destroy()); });
applyMaterial(); selectSection(navButtons[0]); updateScrollState();
