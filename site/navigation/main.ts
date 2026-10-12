import { attachGlassDisclosureNav } from '../../src/disclosure-nav.js';
import type { GlassDisclosureChange } from '../../src/disclosure-nav.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Group = 'routes' | 'guides' | 'planner';
const groups: Group[] = ['routes', 'guides', 'planner'];
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const nav = query('#site-navigation'), toggle = query<HTMLButtonElement>('#navigation-toggle');
const dialog = query<HTMLDialogElement>('#planning-dialog'), form = query<HTMLFormElement>('#plan-form');
const breakpoint = '(max-width: 760px)';
let media: MediaQueryList | undefined;
try { media = matchMedia(breakpoint); } catch { /* visible expanded tree is the conservative fallback */ }
let compact = media?.matches ?? false, solid = false, destroyed = false, localPlans = 0;
let lastChange: GlassDisclosureChange = { openId: null, reason: 'api' }, lastHostAction = 'initial', tourStep: Group | 'rescue' | null = null;
let tourVersion = 0, tourTimers: number[] = [], finishTour: ((complete: boolean) => void) | undefined;
const history: GlassDisclosureChange[] = [];
const formStatus = document.createElement('p'); formStatus.id = 'plan-form-status'; formStatus.setAttribute('role', 'status'); formStatus.className = 'form-status'; form.append(formStatus);
let controller: ReturnType<typeof attachGlassDisclosureNav>;
const render = () => {
  if (destroyed) return;
  toggle.setAttribute('aria-expanded', String(!nav.hidden));
  query('#toggle-label').textContent = nav.hidden ? 'Open navigation' : 'Close navigation';
  query('#toggle-glyph').textContent = nav.hidden ? '+' : '−';
  query('#mode-chip').textContent = !media ? 'expanded fallback / matchMedia unavailable' : compact ? 'compact / actual viewport ≤ 760 px' : 'expanded / actual viewport > 760 px';
  query('#change-note').textContent = controller?.openId ? controller.openId + ' open · ' + lastChange.reason : 'All groups closed · ' + lastChange.reason;
  const active = document.activeElement as HTMLElement | null;
  query('#focus-note').textContent = 'Native focus: ' + (active?.id || active?.tagName.toLowerCase() || 'document') + ' · host action: ' + lastHostAction;
  query('#solid').setAttribute('aria-pressed', String(solid));
};
const material = () => {
  const header = query('#glass-header'), props = getGlassProps({ appearance: 'light', blur: 14, radius: 17, corner: 'continuous', reducedTransparency: solid });
  header.classList.add(props.className);
  for (const [key, value] of Object.entries(props.style)) header.style.setProperty(key, value);
  for (const [key, value] of Object.entries(props)) if (key !== 'style' && key !== 'className') header.setAttribute(key, String(value));
  header.style.setProperty('--lg-fill-rgb', '244 247 240'); header.style.setProperty('--lg-solid-fill', '#f4f7f0'); header.style.setProperty('--lg-ink', '#2b474e');
};
const setHidden = (value: boolean) => {
  const wasInside = nav.contains(document.activeElement);
  nav.hidden = value;
  controller.refresh();
  // The controller rescues focus from an open panel. The host also owns hiding
  // a closed tree with focus on one of its triggers/ordinary links.
  if (value && wasInside && nav.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  render();
};
const closeDialog = () => {
  if (!dialog.open) return;
  if (typeof dialog.close === 'function') { try { dialog.close(); } catch { /* no synthetic modal ownership */ } }
};
const cancelTour = () => {
  tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = [];
  tourStep = null; finishTour?.(false); finishTour = undefined; query('#tour').textContent = 'Short tour ↗';
};
const show = (id: Group) => {
  if (!groups.includes(id)) throw new TypeError('Unknown local navigation group');
  if (nav.hidden) setHidden(false);
  const opened = controller.open(id); render(); return opened;
};
const hide = () => { const closed = controller.close(); render(); return closed; };
const rescue = () => {
  closeDialog(); if (nav.hidden) setHidden(false);
  controller.open('planner'); query<HTMLInputElement>('#departure-date').focus({ preventScroll: true });
  lastHostAction = 'hide host while a real form field owns focus';
  setHidden(true); render();
};
const openDialog = () => {
  if (controller.openId !== 'planner') show('planner');
  query('#dialog-status').textContent = '';
  try {
    if (typeof dialog.showModal !== 'function') throw new Error('Native dialogs unavailable');
    dialog.showModal(); lastHostAction = 'native dialog opened inside the planner';
  } catch {
    query('#dialog-status').textContent = 'This browser did not open a native modal. Read the same planning notes below.';
    const fallback = query<HTMLDetailsElement>('#inline-notes'); fallback.hidden = false; fallback.open = true;
    lastHostAction = 'native dialog unavailable; ordinary details shown';
  }
  render();
};
controller = attachGlassDisclosureNav(nav, {
  items: groups.map(id => ({ id, trigger: query<HTMLButtonElement>('#' + id + '-trigger'), panel: query('#' + id + '-panel') })),
  responsiveQuery: media ? breakpoint : undefined, focusFallback: toggle,
  onChange(state) { lastChange = state; history.unshift({ ...state }); if (history.length > 10) history.pop(); render(); },
});
const modeChanged = () => {
  compact = media?.matches ?? false;
  cancelTour(); closeDialog(); lastHostAction = 'responsive presentation changed';
  // The fallback is always a visible authored button. This works regardless of
  // ordering between the host and controller's separate matchMedia instances.
  setHidden(compact);
  const active = document.activeElement as HTMLElement | null;
  if (active && nav.contains(active) && active.closest('[hidden]')) toggle.focus({ preventScroll: true });
  controller.refresh(); render();
};
media?.addEventListener?.('change', modeChanged);
if (media && !media.addEventListener) media.addListener?.(modeChanged);
toggle.addEventListener('click', () => { cancelTour(); closeDialog(); lastHostAction = nav.hidden ? 'native button revealed the host' : 'native button hid the host'; setHidden(!nav.hidden); });
query('#solid').addEventListener('click', () => { cancelTour(); solid = !solid; material(); render(); });
query('#planning-notes').addEventListener('click', () => { cancelTour(); openDialog(); });
dialog.addEventListener('close', () => { lastHostAction = 'native dialog closed; navigation still owns its group'; render(); });
// Do not prevent the native cancel event: Escape belongs to the dialog.
dialog.addEventListener('cancel', () => { lastHostAction = 'native dialog received Escape'; });
form.addEventListener('submit', event => {
  // This authored form is a local UI fixture, not a booking/search endpoint.
  event.preventDefault(); cancelTour();
  const names = { coast: 'Bergen / coastline', city: 'Kyoto / city', slow: 'Porto / afternoon' };
  const destination = query<HTMLSelectElement>('#destination').value as keyof typeof names;
  const date = query<HTMLInputElement>('#departure-date').value, pace = query<HTMLSelectElement>('#pace').value;
  const output = names[destination] + ' · ' + date + ' · ' + pace + ' · local preview only';
  query('#plan-output').textContent = output; formStatus.textContent = output;
  localPlans++; lastHostAction = 'native form submitted to a local host preview'; render();
});
query('#rescue').addEventListener('click', () => { cancelTour(); rescue(); });
const reset = () => {
  cancelTour(); closeDialog(); controller.close();
  solid = false; localPlans = 0; lastHostAction = 'reset'; lastChange = { openId: null, reason: 'api' }; history.length = 0;
  form.reset(); formStatus.textContent = ''; query('#plan-output').textContent = 'Open “Your next page” to make a small plan. These are interface studies, not bookings.';
  query('#dialog-status').textContent = ''; query<HTMLDetailsElement>('#inline-notes').hidden = true;
  material(); setHidden(compact); render();
};
query('#reset').addEventListener('click', reset);
const tour = () => {
  cancelTour(); closeDialog(); controller.close(); const version = tourVersion;
  const step = (id: Group | 'rescue') => {
    if (version !== tourVersion) return;
    tourStep = id; lastHostAction = 'finite tour / ' + id;
    if (id === 'rescue') rescue(); else show(id);
    query('#tour').textContent = 'Tour / ' + id;
  };
  step('routes');
  return new Promise<boolean>(resolve => {
    finishTour = resolve;
    tourTimers.push(window.setTimeout(() => step('guides'), 2600), window.setTimeout(() => step('planner'), 5200), window.setTimeout(() => step('rescue'), 7800), window.setTimeout(() => {
      if (version !== tourVersion) return;
      tourStep = null; tourTimers = []; finishTour = undefined; query('#tour').textContent = 'Short tour ↗'; resolve(true); render();
    }, 10400));
  });
};
query('#tour').addEventListener('click', () => {
  // Let the original outside click finish before opening a new API-driven group.
  // Native link/button defaults are never intercepted to simulate menu routing.
  queueMicrotask(() => { if (!destroyed) void tour(); });
});
nav.addEventListener('focusin', render); toggle.addEventListener('focus', render);
window.addEventListener('hashchange', () => { lastHostAction = 'ordinary browser anchor navigation'; render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelTour(); closeDialog(); controller.close(); render(); } });
window.addEventListener('pagehide', () => {
  cancelTour(); closeDialog(); destroyed = true; controller.destroy();
  media?.removeEventListener?.('change', modeChanged); if (media && !media.removeEventListener) media.removeListener?.(modeChanged);
}, { once: true });
Object.assign(window, { __navigationDemo: {
  reset, tour,
  preset(id: Group | 'rescue') { if (![...groups, 'rescue'].includes(id)) throw new TypeError('Unknown local navigation fixture'); cancelTour(); closeDialog(); if (id === 'rescue') rescue(); else show(id); },
  open(id: Group) { cancelTour(); return show(id); }, close() { cancelTour(); return hide(); },
  host(value: boolean) { if (typeof value !== 'boolean') throw new TypeError('Host visibility must be boolean'); cancelTour(); lastHostAction = value ? 'host revealed' : 'host hidden'; setHidden(!value); },
  modal() { cancelTour(); openDialog(); },
  solid(value: boolean) { if (typeof value !== 'boolean') throw new TypeError('Solid preference must be boolean'); cancelTour(); solid = value; material(); render(); },
  refresh() { controller.refresh(); render(); },
  get state() { return { openId: controller.openId, compact, responsiveQuery: breakpoint, hostHidden: nav.hidden, solid, focus: (document.activeElement as HTMLElement | null)?.id ?? '', hash: location.hash, tourStep, localPlans, lastChange: { ...lastChange }, lastHostAction, history: [...history], dialog: { open: dialog.open, nativeModal: (() => { try { return dialog.matches(':modal'); } catch { return false; } })() }, groups: groups.map(id => ({ id, expanded: query('#' + id + '-trigger').getAttribute('aria-expanded'), hidden: query('#' + id + '-panel').hidden, links: Array.from(query('#' + id + '-panel').querySelectorAll('a')).map(link => link.getAttribute('href')) })) }; },
} });
material(); setHidden(compact); render();
