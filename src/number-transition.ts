import { bounded } from './numeric.js';
import { listen } from './lifecycle.js';

export interface GlassNumberFormatOptions {
  readonly locale: string;
  /** Decimal display places, 0–6. Default zero; rounding is half-expand. */
  readonly precision?: number;
  readonly useGrouping?: boolean;
}
export interface GlassNumberSettings extends GlassNumberFormatOptions {
  /** Default replace: animate two actual formatted values, not fabricated intermediates. */
  readonly mode?: 'replace' | 'interpolate';
  /** Finite milliseconds, clamped to 0–600. Default 280. */
  readonly duration?: number;
  readonly reducedMotion?: boolean;
  /** Opt-in final announcement, once per changed displayed value. Default false. */
  readonly announce?: boolean;
  /** Optional host-authored context for the live region, e.g. "Queue updated: ". */
  readonly announcementPrefix?: string;
}
export interface GlassNumberOptions extends GlassNumberSettings {
  readonly value: number;
  /** Dedicated, non-live semantic current-value node; updated immediately on set. */
  readonly semantic: HTMLElement;
  /** Optional separate host-authored role=status/alert or aria-live region. */
  readonly status?: HTMLElement;
}
export type GlassNumberUpdate = Partial<GlassNumberSettings>;
export interface GlassNumberSnapshot {
  readonly value: number;
  readonly displayValue: number;
  readonly active: boolean;
  readonly destroyed: boolean;
}
export interface GlassNumberController {
  /** Latest completes true; superseded, canceled, hidden or detached work resolves false. */
  set(value: number): Promise<boolean>;
  /** Snap to the current actual value quietly; an active caller resolves false. */
  cancel(): void;
  /** Patch formatting/motion options; quietly snap active work without restarting. */
  update(settings: GlassNumberUpdate): void;
  snapshot(): GlassNumberSnapshot;
  destroy(): void;
}
interface Format { locale: string; precision: number; useGrouping: boolean; formatter: Intl.NumberFormat }
interface Settings extends Format { mode: 'replace' | 'interpolate'; duration: number; reducedMotion: boolean; announce: boolean; announcementPrefix: string }
interface Task { from: number; fromText: string; toText: string; started: number; duration: number; mode: 'replace' | 'interpolate'; promise: Promise<boolean>; resolve: (completed: boolean) => void }
const formatCache = new Map<string, Intl.NumberFormat>();
const reserved = new WeakSet<HTMLElement>();
const formatKeys = ['locale', 'precision', 'useGrouping'];
const settingKeys = [...formatKeys, 'mode', 'duration', 'reducedMotion', 'announce', 'announcementPrefix'];
const fail = (reason: string): never => { throw new TypeError(`Invalid glass number: ${reason}`); };

function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail('expected plain options');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail('unknown option');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return fail('accessors are not accepted');
    result[key] = descriptor.value;
  }
  return result;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e9) return fail('value must be finite within ±1e9');
  return value === 0 ? 0 : value;
}
function boolean(value: unknown, fallback: boolean, name: string): boolean {
  if (value !== undefined && typeof value !== 'boolean') return fail(`${name} must be a boolean`);
  return value === undefined ? fallback : value as boolean;
}
function formatOptions(config: Record<string, unknown>): Format {
  if (typeof config.locale !== 'string' || !config.locale || config.locale.length > 128) return fail('an explicit supported locale is required');
  let locale: string;
  try {
    locale = Intl.getCanonicalLocales(config.locale)[0];
    if (Intl.NumberFormat.supportedLocalesOf(locale).length !== 1) return fail('an explicit supported locale is required');
  } catch { return fail('an explicit supported locale is required'); }
  const precision = config.precision === undefined ? 0 : config.precision;
  if (typeof precision !== 'number' || !Number.isInteger(precision) || precision < 0 || precision > 6) return fail('precision must be an integer from 0 to 6');
  const useGrouping = boolean(config.useGrouping, true, 'useGrouping'), key = `${locale}|${precision}|${useGrouping}`;
  let formatter = formatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: precision, maximumFractionDigits: precision, useGrouping });
    if (formatCache.size === 32) formatCache.delete(formatCache.keys().next().value!);
    formatCache.set(key, formatter);
  }
  return { locale, precision, useGrouping, formatter };
}
function settings(config: Record<string, unknown>): Settings {
  const format = formatOptions(config), mode = config.mode === undefined ? 'replace' : config.mode;
  if (mode !== 'replace' && mode !== 'interpolate') return fail('mode must be replace or interpolate');
  if (config.duration !== undefined && (typeof config.duration !== 'number' || !Number.isFinite(config.duration))) return fail('duration must be finite');
  const prefix = config.announcementPrefix === undefined ? '' : config.announcementPrefix;
  if (typeof prefix !== 'string' || prefix.length > 240 || /[\x00-\x1f\x7f-\x9f]/.test(prefix)) return fail('announcementPrefix must be bounded single-line text');
  return { ...format, mode, duration: bounded(config.duration as number | undefined, 280, 0, 600),
    reducedMotion: boolean(config.reducedMotion, false, 'reducedMotion'), announce: boolean(config.announce, false, 'announce'), announcementPrefix: prefix };
}

/** Pure SSR-safe decimal presentation, not exact financial arithmetic or a price API.
 * Half-expand display rounding follows Intl; binary floating-point values are inputs.
 * Explicit locale/precision are deterministic only with matching runtime ICU data. */
export function formatGlassNumber(value: number, options: GlassNumberFormatOptions): string {
  const actual = number(value), format = formatOptions(record(options, formatKeys));
  return format.formatter.format(actual);
}

function textElement(node: HTMLElement | undefined, doc?: Document): node is HTMLElement {
  return Boolean(node && node.nodeType === 1 && node.namespaceURI === 'http://www.w3.org/1999/xhtml' && node.ownerDocument.defaultView
    && (!doc || node.ownerDocument === doc) && node.isConnected && node.childNodes.length <= 32 && (node.textContent?.length ?? 0) <= 4096
    && !node.matches('input,select,textarea,button,output,a[href],[tabindex],[contenteditable]:not([contenteditable="false"])')
    && !node.querySelector('input,select,textarea,button,a[href],[tabindex],[contenteditable]:not([contenteditable="false"])'));
}
const liveSelector = '[role="status"],[role="alert"],[role="log"],[aria-live="polite"],[aria-live="assertive"]';
function sameChildren(node: HTMLElement, children: readonly Node[]): boolean {
  return node.childNodes.length === children.length && children.every((child, index) => node.childNodes[index] === child);
}

/**
 * A finite, dependency-free presentation controller for actual host values. Default
 * replace animates a bounded pair of actual strings; interpolate explicitly opts in
 * to decorative, nonfinancial intermediate numbers. No measurements, subscriptions,
 * progress inference or fabricated metrics. Native RAF runs only while active.
 * Author a dedicated visual plus a separately readable non-live semantic value.
 * The helper hides only the visual from assistive technology and updates the actual
 * semantic value immediately. Optional status must be a distinct authored live node;
 * only opted-in settled updates announce. Initial/reduced/hidden/config snaps are quiet.
 * Host owns labels, styling/visibility of the semantic value, real data and live-region
 * context/timing. The controller does not certify AT output or provide currency math.
 * Original child nodes restore only while content/attribute leases remain owned;
 * new host content is never overwritten. Visibility cancellation never auto-replays.
 */
export function attachGlassNumber(visual: HTMLElement, input: GlassNumberOptions): GlassNumberController {
  const config = record(input, [...settingKeys, 'value', 'semantic', 'status']);
  let value = number(config.value), displayValue = value, options = settings(config);
  const semantic = config.semantic as HTMLElement, status = config.status as HTMLElement | undefined;
  if (!textElement(visual) || !textElement(semantic, visual.ownerDocument) || (status !== undefined && !textElement(status, visual.ownerDocument))) return fail('connected dedicated text elements in one browser document are required');
  const nodes = status ? [visual, semantic, status] : [visual, semantic];
  if (nodes.some((node, index) => reserved.has(node) || nodes.some((other, otherIndex) => index !== otherIndex && (node === other || node.contains(other))))) return fail('visual, semantic and status require distinct unleased elements');
  if (semantic.closest(liveSelector) || semantic.closest('[hidden],[inert],[aria-hidden="true"]')) return fail('semantic must remain readable outside a live region');
  if (status && (!status.matches(liveSelector) || status.closest('[hidden],[inert],[aria-hidden="true"],[aria-live="off"]'))) return fail('status requires an authored readable live region');
  if (options.announce && !status) return fail('announce requires a separate status element');
  const doc = visual.ownerDocument, view = doc.defaultView!;
  const originals = [...visual.childNodes], semanticOriginals = [...semantic.childNodes], statusOriginals = status ? [...status.childNodes] : [];
  const originalStatusText = status?.textContent, originalHidden = visual.getAttribute('aria-hidden');
  const root = doc.createElement('span'), from = doc.createElement('span'), to = doc.createElement('span');
  root.style.display = 'inline-grid'; root.style.fontVariantNumeric = 'tabular-nums';
  from.style.gridArea = to.style.gridArea = '1 / 1';
  const fromText = doc.createTextNode(''), toText = doc.createTextNode(options.formatter.format(value));
  const semanticText = doc.createTextNode(toText.data);
  from.append(fromText); to.append(toText); root.append(from, to);
  let fromStyle = '', toStyle = '', fromWritten = '', toWritten = toText.data, semanticWritten = semanticText.data;
  const rootStyle = root.style.cssText;
  let statusText: Text | undefined, statusWritten: string | undefined, statusRelinquished = false;
  let lastAnnounced = toText.data, destroyed = false, frame: number | null = null, active: Task | undefined;
  for (const node of nodes) reserved.add(node);
  visual.replaceChildren(root); visual.setAttribute('aria-hidden', 'true'); semantic.replaceChildren(semanticText);
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => options.reducedMotion || Boolean(media?.matches);
  const ownsVisual = () => sameChildren(visual, [root]) && sameChildren(root, [from, to]) && sameChildren(from, [fromText]) && sameChildren(to, [toText])
    && fromText.data === fromWritten && toText.data === toWritten && root.style.cssText === rootStyle && from.style.cssText === fromStyle && to.style.cssText === toStyle
    && visual.getAttribute('aria-hidden') === 'true';
  const ownsSemantic = () => sameChildren(semantic, [semanticText]) && semanticText.data === semanticWritten
    && !semantic.closest(liveSelector) && !semantic.closest('[hidden],[inert],[aria-hidden="true"]');
  const connected = () => visual.isConnected && semantic.isConnected && visual.ownerDocument === doc && semantic.ownerDocument === doc;
  const writeVisual = (oldText: string, nextText: string, progress: number) => {
    if (fromText.data !== oldText) fromText.data = oldText;
    if (toText.data !== nextText) toText.data = nextText;
    fromWritten = oldText; toWritten = nextText;
    from.style.opacity = String(1 - progress); to.style.opacity = String(progress);
    from.style.translate = `0 ${-6 * progress}px`; to.style.translate = `0 ${6 * (1 - progress)}px`;
    fromStyle = from.style.cssText; toStyle = to.style.cssText;
  };
  const writeSemantic = (formatted: string) => { if (semanticText.data !== formatted) semanticText.data = formatted; semanticWritten = formatted; };
  writeVisual('', toWritten, 1);
  const Mutation = (view as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
  const Intersection = (view as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  const mutation = Mutation ? new Mutation(() => { if (active && (!connected() || !ownsVisual() || !ownsSemantic())) destroy(); }) : undefined;
  const intersection = Intersection ? new Intersection(entries => { if (active && entries.some(entry => entry.target === visual && !entry.isIntersecting)) stop(false, true); }) : undefined;
  const cancelFrame = () => { if (frame !== null) view.cancelAnimationFrame(frame); frame = null; };
  const announce = (formatted: string) => {
    if (!status || !options.announce || statusRelinquished || lastAnnounced === formatted) return;
    const owns = statusText ? sameChildren(status, [statusText]) && statusText.data === statusWritten
      : sameChildren(status, statusOriginals) && status.textContent === originalStatusText;
    if (!status.isConnected || status.ownerDocument !== doc || !owns || !status.matches(liveSelector)
      || status.closest('[hidden],[inert],[aria-hidden="true"],[aria-live="off"]')) { statusRelinquished = true; return; }
    const text = `${options.announcementPrefix}${formatted}`;
    if (!statusText) { statusText = doc.createTextNode(text); status.replaceChildren(statusText); } else statusText.data = text;
    statusWritten = text; lastAnnounced = formatted;
  };
  function stop(completed: boolean, quiet: boolean) {
    const task = active; active = undefined; cancelFrame(); mutation?.disconnect(); intersection?.disconnect();
    if (!destroyed && ownsVisual() && ownsSemantic()) {
      displayValue = value; const formatted = options.formatter.format(value);
      writeVisual('', formatted, 1); writeSemantic(formatted);
      if (completed && !quiet) announce(formatted);
    }
    task?.resolve(completed);
  }
  function destroy() {
    if (destroyed) return;
    const restoreVisual = ownsVisual(), restoreSemantic = ownsSemantic();
    destroyed = true; stop(false, true); unlisten();
    if (restoreVisual && originals.every(node => node.parentNode === null)) visual.replaceChildren(...originals);
    if (restoreSemantic && semanticOriginals.every(node => node.parentNode === null)) semantic.replaceChildren(...semanticOriginals);
    if (status && statusText && sameChildren(status, [statusText]) && statusText.data === statusWritten && statusOriginals.every(node => node.parentNode === null)) status.replaceChildren(...statusOriginals);
    if (visual.getAttribute('aria-hidden') === 'true') originalHidden === null ? visual.removeAttribute('aria-hidden') : visual.setAttribute('aria-hidden', originalHidden);
    for (const node of nodes) reserved.delete(node);
  }
  const preference = () => { if (!connected() || !ownsVisual() || !ownsSemantic()) destroy(); else if (active && reduced()) stop(true, true); };
  const visibility = () => { if (doc.hidden && active) stop(false, true); };
  const bindings: Parameters<typeof listen>[0][number][] = [[doc, 'visibilitychange', visibility]];
  if (media) bindings.push([media, 'change', preference]);
  const unlisten = listen(bindings);
  const valid = () => {
    if (destroyed) return false;
    if (!connected() || !ownsVisual() || !ownsSemantic()) { destroy(); return false; }
    return true;
  };
  const tick = (time: number) => {
    frame = null;
    const task = active;
    if (!task || !valid()) return;
    if (doc.hidden) { stop(false, true); return; }
    if (reduced()) { stop(true, true); return; }
    const progress = Math.min(1, Math.max(0, (time - task.started) / task.duration)), eased = 1 - (1 - progress) ** 3;
    if (progress === 1) { stop(true, false); return; }
    if (task.mode === 'replace') writeVisual(task.fromText, task.toText, eased);
    else {
      displayValue = task.from + (value - task.from) * eased;
      // Quantize display work so duplicate rounded frames need no formatting or text writes.
      const scale = 10 ** options.precision, quantized = Math.sign(displayValue) * Math.round(Math.abs(displayValue) * scale);
      if (quantized !== lastQuantized) { lastQuantized = quantized; writeVisual('', options.formatter.format(quantized === 0 ? 0 : quantized / scale), 1); }
    }
    if (active === task) frame = view.requestAnimationFrame(tick);
  };
  let lastQuantized = NaN;
  const set = (next: number): Promise<boolean> => {
    const actual = number(next);
    if (!valid()) return Promise.resolve(false);
    if (actual === value) return active?.promise ?? Promise.resolve(true);
    const previous = displayValue, previousText = toWritten, formatted = options.formatter.format(actual);
    const replaced = active; active = undefined; cancelFrame(); mutation?.disconnect(); intersection?.disconnect(); replaced?.resolve(false);
    value = actual; writeSemantic(formatted);
    if (reduced() || doc.hidden || options.duration === 0 || typeof view.requestAnimationFrame !== 'function' || previousText === formatted) {
      displayValue = value; writeVisual('', formatted, 1);
      if (!reduced() && !doc.hidden && previousText !== formatted) announce(formatted);
      return Promise.resolve(true);
    }
    let resolve!: (completed: boolean) => void;
    const promise = new Promise<boolean>(done => { resolve = done; });
    active = { from: previous, fromText: previousText, toText: formatted, started: view.performance.now(), duration: options.duration, mode: options.mode, promise, resolve };
    if (options.mode === 'replace') { displayValue = value; writeVisual(previousText, formatted, 0); }
    else { displayValue = previous; lastQuantized = NaN; writeVisual('', previousText, 1); }
    mutation?.observe(doc, { childList: true, subtree: true, characterData: true }); intersection?.observe(visual);
    frame = view.requestAnimationFrame(tick); return promise;
  };
  return {
    set, cancel() { if (valid() && active) stop(false, true); },
    update(patch: GlassNumberUpdate) {
      const changes = record(patch, settingKeys);
      const next = settings({ ...options, ...changes });
      if (next.announce && !status) return fail('announce requires a separate status element');
      if (!valid()) return;
      options = next; stop(false, true);
    },
    snapshot: () => Object.freeze({ value, displayValue, active: Boolean(active), destroyed }), destroy,
  };
}
