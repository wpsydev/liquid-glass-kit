import { attachGlassPreview } from '../../src/preview-intent.js';
import type { GlassPreviewOptions } from '../../src/preview-intent.js';
import { attachGlassOverlay } from '../../src/overlay.js';
import { getGlassProps } from '../../src/material.js';
import './style.css';

type Study = 'tooltip' | 'disclosure' | 'lazy';
type Tier = 'hidden' | 'native';
type Controller = ReturnType<typeof attachGlassPreview>;
type Overlay = ReturnType<typeof attachGlassOverlay>;
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const studies: Study[] = ['tooltip', 'disclosure', 'lazy'];
const records = new Map<Study, { trigger: HTMLElement; panel: HTMLElement; controller?: Controller; overlay?: Overlay }>(
  studies.map(id => [id, { trigger: query('#' + id + '-trigger'), panel: query('#' + id + '-panel') }]),
);
let solid = false, quiet = false, selected = false, localGeneration = 0, ready = 0, cancelled = 0, stale = 0;
let tier: Tier = 'hidden', delay = 120, detail = 'shape', tornDown = false;
let tourVersion = 0, tourStep: Study | null = null, tourTimers: number[] = [], finishTour: ((complete: boolean) => void) | undefined;
const events: string[] = [];
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element;
};
const log = (text: string) => {
  if (tornDown) return;
  events.unshift(text); if (events.length > 5) events.pop();
  query('#ledger').replaceChildren(...events.map(event => node('li', event)));
  refresh();
};
const refresh = () => {
  if (tornDown) return;
  let opened = 0;
  for (const [id, record] of records) {
    const open = record.controller?.open ?? false;
    if (open) opened++;
    query('[data-study="' + id + '"]').dataset.open = String(open);
  }
  query('#open-count').textContent = String(opened); query('#active-dot').dataset.active = String(opened > 0);
  query('#local-ready').textContent = String(ready); query('#local-cancel').textContent = String(cancelled); query('#local-stale').textContent = String(stale);
  query('#lazy-manual').setAttribute('aria-expanded', String(records.get('lazy')?.controller?.open ?? false));
  query('#lazy-manual').setAttribute('aria-controls', 'lazy-panel');
  query('#tooltip-manual').setAttribute('aria-describedby', 'tooltip-panel');
  const actual = [...records.values()].map(record => record.controller?.renderer).filter(Boolean);
  query('#tier-note').textContent = tier === 'native' ? actual.every(value => value === 'native-popover') ? 'Native manual popovers. No focus is moved on hover.' : 'Native tier requested; this browser/content uses a hidden fallback.' : 'Portable hidden panels. Placement activates only while open.';
  query('#solid').setAttribute('aria-pressed', String(solid)); query('#quiet').setAttribute('aria-pressed', String(quiet)); document.body.dataset.quiet = String(quiet);
};
const material = () => {
  const props = getGlassProps({ appearance: 'dark', radius: 15, blur: 14, corner: 'continuous', reducedTransparency: solid });
  for (const record of records.values()) {
    record.panel.classList.add(props.className);
    for (const [key, value] of Object.entries(props.style)) record.panel.style.setProperty(key, value);
    for (const [key, value] of Object.entries(props)) if (key !== 'style' && key !== 'className') record.panel.setAttribute(key, String(value));
  }
};
const hideOthers = (id: Study) => {
  for (const [other, record] of records) if (other !== id && (record.controller?.open || record.controller?.pending)) record.controller.hide();
};
const close = (id?: Study, returnFocus = false) => {
  if (id) {
    const record = records.get(id)!; record.controller?.hide();
    // Focus return belongs to this explicit host Close/Use action, never hover.
    if (returnFocus) record.trigger.focus({ preventScroll: true });
  } else for (const record of records.values()) record.controller?.hide();
  refresh();
};
const localDetails = ({ signal }: { signal: AbortSignal }) => {
  const generation = ++localGeneration, variant = detail, container = query('#lazy-content');
  container.replaceChildren(node('div', 'Resolving local ' + variant + ' details…', 'local-pending'));
  log('lazy / deliberate intent → local 350 ms fixture');
  return new Promise<void>(resolve => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (signal.aborted || generation !== localGeneration || tornDown) {
        if (!tornDown) { stale++; log('lazy / stale content write skipped'); }
        settled = true; resolve(); return;
      }
      const description = variant === 'shape' ? 'A compact, legible symbol uses one dark silhouette and a single bright counterpoint. The background grid supplies scale without competing for attention.' : 'Keep this mark in a generous media frame. Put the useful description beside it and use one explicit action; a preview should help someone choose, rather than become another navigation layer.';
      const metadata = node('dl', '', 'asset-metadata');
      for (const [label, value] of [['Source', 'Original inline SVG'], ['Detail', variant === 'shape' ? 'Shape rationale' : 'Layout rationale'], ['Resolution', 'Locally authored metadata']]) {
        const row = node('div'); row.append(node('dt', label), node('dd', value)); metadata.append(row);
      }
      container.replaceChildren(node('p', description), metadata, node('div', 'Host checked the AbortSignal and request generation before writing this content.', 'lazy-note'));
      settled = true; ready++; log('lazy / current local details committed');
      records.get('lazy')!.overlay?.refresh(); resolve();
    }, 350);
    signal.addEventListener('abort', () => {
      if (settled) return;
      window.clearTimeout(timer); settled = true;
      if (!tornDown) { cancelled++; log('lazy / local fixture cancelled before commit'); }
      resolve();
    }, { once: true });
    if (signal.aborted) { window.clearTimeout(timer); settled = true; resolve(); }
  });
};
const optionsFor = (id: Study): GlassPreviewOptions => ({
  native: tier === 'native', openDelay: delay, closeDelay: 220,
  interaction: id === 'disclosure' ? 'manual' : 'hover-focus',
  semantics: id === 'tooltip' ? 'description' : id === 'disclosure' ? 'disclosure' : 'none',
  onOpen(context) {
    hideOthers(id);
    const record = records.get(id)!;
    record.overlay?.destroy();
    try { record.overlay = attachGlassOverlay(record.trigger, record.panel, { placement: 'bottom', align: 'start', gap: 9, padding: 12 }); }
    catch { record.overlay = undefined; log(id + ' / placement unavailable in this browser'); }
    log(id + ' / open from ' + context.reason);
    queueMicrotask(refresh);
    if (id === 'lazy') return localDetails(context);
  },
  onClose({ reason }) {
    const record = records.get(id)!; record.overlay?.destroy(); record.overlay = undefined;
    log(id + ' / closed from ' + reason); queueMicrotask(refresh);
  },
  onError() { log(id + ' / host preview error; content remains host-owned'); },
});
const dispose = () => {
  localGeneration++;
  for (const record of records.values()) {
    record.overlay?.destroy(); record.overlay = undefined;
    record.controller?.destroy(); record.controller = undefined;
  }
};
const mount = () => {
  dispose();
  material();
  for (const [id, record] of records) {
    record.panel.hidden = true;
    if (tier === 'native') record.panel.setAttribute('popover', 'manual'); else record.panel.removeAttribute('popover');
    record.controller = attachGlassPreview(record.trigger, record.panel, optionsFor(id));
  }
  refresh();
};
const cancelTour = () => {
  tourVersion++; for (const timer of tourTimers) window.clearTimeout(timer); tourTimers = [];
  tourStep = null; finishTour?.(false); finishTour = undefined; query('#tour').textContent = 'Short tour ↗';
};
const show = (id: Study) => {
  if (!studies.includes(id)) throw new TypeError('Unknown original preview study');
  records.get(id)!.controller?.show(); refresh();
};
query('#tooltip-trigger').addEventListener('click', () => { cancelTour(); show('tooltip'); });
query('#tooltip-manual').addEventListener('click', () => { cancelTour(); show('tooltip'); });
query('#disclosure-trigger').addEventListener('click', () => { cancelTour(); records.get('disclosure')!.controller?.toggle(); refresh(); });
query('#lazy-manual').addEventListener('click', () => { cancelTour(); records.get('lazy')!.controller?.toggle(); refresh(); });
query('#close-disclosure').addEventListener('click', () => { cancelTour(); close('disclosure', true); });
query('#close-lazy').addEventListener('click', () => { cancelTour(); close('lazy', true); });
query('#clear').addEventListener('click', () => { cancelTour(); close(); });
query('#use-direction').addEventListener('click', () => {
  cancelTour(); selected = true; query('#selection-title').textContent = 'The folded direction.';
  query('#selection-note').textContent = 'Selected through a native button. Violet, ink and periwinkle are now the host’s chosen direction.';
  log('host / folded direction explicitly selected'); close('disclosure', true);
});
query<HTMLSelectElement>('#renderer').addEventListener('change', event => {
  cancelTour(); tier = (event.target as HTMLSelectElement).value as Tier; mount(); log('host / visibility tier changed to ' + tier);
});
query<HTMLSelectElement>('#delay').addEventListener('change', event => {
  cancelTour(); delay = Number((event.target as HTMLSelectElement).value); mount(); log('host / pointer intent delay changed to ' + delay + ' ms');
});
query('#solid').addEventListener('click', () => { cancelTour(); solid = !solid; material(); refresh(); });
query('#quiet').addEventListener('click', () => { cancelTour(); quiet = !quiet; refresh(); });
query<HTMLSelectElement>('#detail-version').addEventListener('change', event => {
  cancelTour(); detail = (event.target as HTMLSelectElement).value;
  records.get('lazy')!.controller?.update(optionsFor('lazy'));
  query('#lazy-content').replaceChildren(node('p', 'Local ' + detail + ' details are ready for the next deliberate preview.'));
  log('host / detail changed; previous intent cancelled');
});
const reset = () => {
  cancelTour(); dispose(); solid = false; quiet = false; selected = false; tier = 'hidden'; delay = 120; detail = 'shape';
  ready = 0; cancelled = 0; stale = 0; events.length = 0;
  query<HTMLSelectElement>('#renderer').value = 'hidden'; query<HTMLSelectElement>('#delay').value = '120'; query<HTMLSelectElement>('#detail-version').value = 'shape';
  query('#selection-title').textContent = 'Nothing selected yet.'; query('#selection-note').textContent = 'Previewing is attention. Choosing is a separate native action.';
  query('#lazy-content').replaceChildren(node('p', 'Local details appear only after deliberate intent.'));
  query('#ledger').replaceChildren(); mount();
};
query('#reset').addEventListener('click', reset);
const tour = () => {
  cancelTour(); close(); const version = tourVersion;
  const step = (id: Study) => {
    if (version !== tourVersion) return;
    close(); tourStep = id; show(id); query('#tour').textContent = 'Tour / ' + (id === 'tooltip' ? '01' : id === 'disclosure' ? '02' : '03');
  };
  step('tooltip');
  return new Promise<boolean>(resolve => {
    finishTour = resolve;
    tourTimers.push(window.setTimeout(() => step('disclosure'), 3200), window.setTimeout(() => step('lazy'), 6400), window.setTimeout(() => {
      if (version !== tourVersion) return;
      close(); tourStep = null; tourTimers = []; finishTour = undefined; query('#tour').textContent = 'Short tour ↗'; resolve(true);
    }, 10100));
  });
};
query('#tour').addEventListener('click', () => { void tour(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelTour(); });
window.addEventListener('pagehide', () => { tornDown = true; cancelTour(); dispose(); }, { once: true });
Object.assign(window, { __previewDemo: {
  preset(id: Study) { cancelTour(); close(); show(id); },
  open(id: Study) { cancelTour(); show(id); },
  close(id?: Study) { if (id !== undefined && !studies.includes(id)) throw new TypeError('Unknown original preview study'); cancelTour(); close(id); },
  focus(id: Study) { if (!studies.includes(id)) throw new TypeError('Unknown original preview study'); cancelTour(); records.get(id)!.trigger.focus({ preventScroll: true }); },
  renderer(value: Tier) { if (value !== 'hidden' && value !== 'native') throw new TypeError('Unknown visibility tier'); cancelTour(); tier = value; query<HTMLSelectElement>('#renderer').value = value; mount(); },
  preferences(value: { solid?: boolean; quiet?: boolean }) {
    if (value.solid !== undefined && typeof value.solid !== 'boolean' || value.quiet !== undefined && typeof value.quiet !== 'boolean') throw new TypeError('Preferences must be booleans');
    cancelTour(); solid = value.solid ?? solid; quiet = value.quiet ?? quiet; material(); refresh();
  },
  local(value: 'shape' | 'layout') {
    if (value !== 'shape' && value !== 'layout') throw new TypeError('Unknown local detail');
    query<HTMLSelectElement>('#detail-version').value = value; query('#detail-version').dispatchEvent(new Event('change'));
  },
  tour, reset, refresh,
  get state() { return { tier, delay, detail, solid, quiet, selected, tourStep, local: { generation: localGeneration, ready, cancelled, staleWritesPrevented: stale }, focus: document.activeElement?.id ?? '', events: [...events], previews: studies.map(id => {
    const record = records.get(id)!;
    return { id, open: record.controller?.open ?? false, pending: record.controller?.pending ?? false, renderer: record.controller?.renderer, positioned: !!record.overlay, triggerExpanded: record.trigger.getAttribute('aria-expanded'), triggerDescription: record.trigger.getAttribute('aria-describedby') };
  }) }; },
} });
mount();
