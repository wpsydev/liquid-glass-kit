export type GlassLayoutAuditKind = 'control' | 'field' | 'container';
export type GlassLayoutAuditCheck = 'within-policy' | 'advisory' | 'exempt' | 'unknown' | 'not-requested';
export type GlassLayoutAuditSkip =
  | 'detached' | 'outside-root' | 'foreign-document' | 'unsupported-target' | 'unsupported-field'
  | 'hidden' | 'clipped' | 'unmeasurable' | 'measurement-unavailable' | 'shadow-boundary' | 'ancestor-limit' | 'read-budget';
export interface GlassLayoutAuditTarget {
  /** Host-provided metadata, 1–64 printable ASCII characters without whitespace. No DOM name is collected. */
  id: string;
  element: HTMLElement;
  kind?: GlassLayoutAuditKind;
  /** Explicit label/compound border box. Native click association remains a manual host check. */
  hitArea?: HTMLElement;
  /** Explicit host exemption from this library's size policy, not a WCAG exception verdict. */
  sizeExempt?: boolean;
  /** Declared container's horizontal scrolling is intentional. Width is still reported. */
  allowHorizontalOverflow?: boolean;
}
export interface GlassLayoutAuditOptions {
  /** At most 512 supplied records. Only the first configured limit is inspected. */
  targets: readonly GlassLayoutAuditTarget[];
  limit?: number;
  /** Counts explicit style snapshot/rect calls and numeric dimension reads, not browser internal work. */
  maxReads?: number;
  minTarget?: number;
  minInputFont?: number;
  overflowTolerance?: number;
  allowRootHorizontalOverflow?: boolean;
}
export interface GlassLayoutAuditRect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface GlassLayoutAuditOverflow {
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly excess: number;
  readonly check: GlassLayoutAuditCheck;
}
export interface GlassLayoutAuditMeasurement {
  readonly id: string;
  readonly kind: GlassLayoutAuditKind;
  /** Measured means geometry sampled, not passed accessibility or interaction checks. */
  readonly status: 'measured' | 'skipped';
  readonly reason: GlassLayoutAuditSkip | null;
  readonly rect: GlassLayoutAuditRect | null;
  readonly sizeCheck: GlassLayoutAuditCheck;
  readonly fontSize: number | null;
  readonly fontCheck: GlassLayoutAuditCheck;
  readonly overflow: GlassLayoutAuditOverflow | null;
  readonly suppliedHitArea: boolean;
  readonly viewportOffscreen: boolean | null;
  readonly partialClipping: boolean;
}
export interface GlassLayoutAuditAdvisory {
  readonly scope: 'viewport' | 'root' | 'target';
  readonly id: string | null;
  readonly code: 'target-size' | 'field-font' | 'horizontal-overflow' | 'partial-clipping';
}
export interface GlassLayoutAuditReport {
  readonly policy: Readonly<{
    kind: 'configured-library-layout-policy';
    minTarget: number; minInputFont: number; overflowTolerance: number;
    targetLimit: number; readLimit: number; ancestorLimit: number; advisoryLimit: number;
  }>;
  readonly viewport: Readonly<{ width: number | null; height: number | null; overflow: GlassLayoutAuditOverflow | null }>;
  readonly root: Readonly<{ rect: GlassLayoutAuditRect | null; reason: GlassLayoutAuditSkip | null; overflow: GlassLayoutAuditOverflow | null }>;
  readonly targets: readonly GlassLayoutAuditMeasurement[];
  readonly advisories: readonly GlassLayoutAuditAdvisory[];
  readonly counts: Readonly<{ supplied: number; considered: number; checked: number; skipped: number; unvisited: number; advisories: number }>;
  readonly reads: Readonly<{ total: number; styles: number; rects: number; dimensions: number }>;
  readonly truncation: Readonly<{ targetLimit: boolean; readBudget: boolean; ancestorLimit: boolean; advisories: boolean }>;
  readonly truncated: boolean;
  readonly incomplete: boolean;
  readonly limitations: readonly string[];
}

const MAX_SUPPLIED = 512, MAX_ANCESTORS = 16, MAX_ADVISORIES = 256, MAX_DIMENSION = 1_000_000_000;
const OPTION_KEYS = ['targets', 'limit', 'maxReads', 'minTarget', 'minInputFont', 'overflowTolerance', 'allowRootHorizontalOverflow'];
const TARGET_KEYS = ['id', 'element', 'kind', 'hitArea', 'sizeExempt', 'allowHorizontalOverflow'];
const READ_BUDGET = Symbol('layout-audit-read-budget');
const CLIPPING = new Set(['hidden', 'clip', 'auto', 'scroll', 'overlay']);
const NON_TEXT_INPUTS = new Set(['hidden', 'checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'color', 'range']);
const LIMITATIONS = Object.freeze([
  '44px targets and 16px fields are configurable library policies, not WCAG certification. WCAG 2.2 target-size minimum uses 24px plus exceptions that are not evaluated here.',
  'Border boxes and ancestor-border-box clipping are conservative geometry, not complete transformed, pseudo-element, irregular or overlapping hit-test shapes.',
  'Supplied hit areas and exemptions require host review. Native label association, keyboard, screen reader, contrast, zoom, virtual keyboard and physical devices are not tested.',
  'Viewport-offscreen content is distinct from ancestor clipping and is not automatically inaccessible. aria-hidden and inert alone are not visual invisibility.',
  'Shadow/slotted composed-tree visibility is not inferred. A reached shadow boundary is unknown rather than a clean geometry verdict.',
  'Synchronous style/layout reads may force browser work. Counters describe explicit sampler operations, not paint, GPU time, network or application frame rate.',
  'Results apply only to this explicit scope/current view. No content, form values, names, HTML, screenshots or automatic repair are collected or performed.',
]);
function fail(path: string, message: string): never { throw new TypeError('Invalid glass layout audit ' + path + ': ' + message); }
function data(input: unknown, allowed: readonly string[], path: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) return fail(path, 'expected a plain data object');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return fail(path, 'unknown property');
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (!('value' in descriptor) || !descriptor.enumerable) return fail(path, 'accessors/non-enumerable properties are unsupported');
    result[key] = descriptor.value;
  }
  return result;
}
function number(value: unknown, fallback: number, min: number, max: number, path: string, integer = false): number {
  const resolved = value === undefined ? fallback : value;
  if (typeof resolved !== 'number' || !Number.isFinite(resolved) || resolved < min || resolved > max || integer && !Number.isInteger(resolved)) return fail(path, 'expected a bounded ' + (integer ? 'integer' : 'number'));
  return resolved;
}
function boolean(value: unknown, path: string): boolean {
  if (value !== undefined && typeof value !== 'boolean') return fail(path, 'expected boolean');
  return value ?? false;
}
function configuration(input: GlassLayoutAuditOptions) {
  const config = data(input, OPTION_KEYS, 'options'), supplied = config.targets;
  if (!Array.isArray(supplied) || supplied.length > MAX_SUPPLIED) return fail('targets', 'supply an array of at most 512 explicit records');
  const limit = number(config.limit, 64, 1, 128, 'limit', true), targets: GlassLayoutAuditTarget[] = [], ids = new Set<string>();
  for (let index = 0; index < Math.min(limit, supplied.length); index++) {
    const descriptor = Object.getOwnPropertyDescriptor(supplied, String(index));
    if (!descriptor || !('value' in descriptor)) return fail('targets', 'use dense data records');
    const target = data(descriptor.value, TARGET_KEYS, 'target');
    if (typeof target.id !== 'string' || !/^[!-~]{1,64}$/.test(target.id) || ids.has(target.id)) return fail('target.id', 'use distinct printable ASCII identifiers of 1–64 characters without whitespace');
    const kind = target.kind === undefined ? 'control' : target.kind;
    if (kind !== 'control' && kind !== 'field' && kind !== 'container') return fail('target.kind', 'expected control, field or container');
    ids.add(target.id);
    targets.push({
      id: target.id, element: target.element as HTMLElement, kind,
      hitArea: target.hitArea as HTMLElement | undefined,
      sizeExempt: boolean(target.sizeExempt, 'target.sizeExempt'),
      allowHorizontalOverflow: boolean(target.allowHorizontalOverflow, 'target.allowHorizontalOverflow'),
    });
  }
  return {
    targets, supplied: supplied.length, limit,
    maxReads: number(config.maxReads, 512, 16, 4096, 'maxReads', true),
    minTarget: number(config.minTarget, 44, 24, 128, 'minTarget'),
    minInputFont: number(config.minInputFont, 16, 12, 32, 'minInputFont'),
    overflowTolerance: number(config.overflowTolerance, 1, 0, 16, 'overflowTolerance'),
    allowRootHorizontalOverflow: boolean(config.allowRootHorizontalOverflow, 'allowRootHorizontalOverflow'),
  };
}
type Style = { display: string; visibility: string; opacity: number; contentVisibility: string; overflowX: string; overflowY: string; fontSize: string };
type Visibility = { reason: GlassLayoutAuditSkip | null; clips: { element: HTMLElement; x: boolean; y: boolean }[] };
const finite = (value: unknown, nonnegative = false): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_DIMENSION && (!nonnegative || value >= 0);

/**
 * Explicit read-only browser sampling. Import is SSR-safe; calling requires a
 * connected HTMLElement root and its own document/window. No selectors, DOM
 * writes, focus, clicks, listeners, observers, RAF, timers, network or repair.
 * Only consumed host records are validated; unvisited records remain truncated.
 * maxReads counts style-snapshot/rect calls and numeric dimension reads, with
 * caches lasting this call only. Connectivity/containment metadata is separately
 * bounded by target count; native browser internal costs are not measured.
 * Ancestor inspection is capped at 16 inclusive nodes, including outside root.
 * Hidden/clipped/unsupported/unavailable is skipped/unknown, never a clean pass.
 */
export function auditGlassLayout(root: HTMLElement, options: GlassLayoutAuditOptions): GlassLayoutAuditReport {
  const browser = root?.ownerDocument?.defaultView, doc = root?.ownerDocument;
  if (!browser || !doc || !(root instanceof browser.HTMLElement) || !root.isConnected) return fail('root', 'use a connected native HTMLElement');
  const config = configuration(options), reads = { total: 0, styles: 0, rects: 0, dimensions: 0 };
  const truncation = { targetLimit: config.supplied > config.targets.length, readBudget: false, ancestorLimit: false, advisories: false };
  const styles = new Map<HTMLElement, Style | null>(), rects = new Map<HTMLElement, GlassLayoutAuditRect | null>();
  const advisories: GlassLayoutAuditAdvisory[] = [], targets: GlassLayoutAuditMeasurement[] = [];
  let totalAdvisories = 0, missing = false;
  function consume(kind: 'styles' | 'rects' | 'dimensions') {
    if (reads.total >= config.maxReads) { truncation.readBudget = true; throw READ_BUDGET; }
    reads.total++; reads[kind]++;
  }
  function style(element: HTMLElement): Style | null {
    if (styles.has(element)) return styles.get(element)!;
    consume('styles');
    let result: Style | null = null;
    try {
      const computed = browser!.getComputedStyle(element), opacity = Number.parseFloat(computed.opacity);
      if (finite(opacity, true) && opacity <= 1) result = {
        display: computed.display, visibility: computed.visibility, opacity, contentVisibility: computed.contentVisibility,
        overflowX: computed.overflowX, overflowY: computed.overflowY, fontSize: computed.fontSize,
      };
    } catch { /* Browser measurement failure is unknown, not a passed target. */ }
    styles.set(element, result); return result;
  }
  function rect(element: HTMLElement): GlassLayoutAuditRect | null {
    if (rects.has(element)) return rects.get(element)!;
    consume('rects');
    let result: GlassLayoutAuditRect | null = null;
    try {
      const value = element.getBoundingClientRect();
      if (finite(value.x) && finite(value.y) && finite(value.width, true) && finite(value.height, true)) result = Object.freeze({ x: value.x, y: value.y, width: value.width, height: value.height });
    } catch { /* Do not retain private error messages. */ }
    rects.set(element, result); return result;
  }
  function dimension(read: () => unknown): number | null {
    consume('dimensions');
    try { const value = read(); return finite(value, true) ? value : null; } catch { return null; }
  }
  function overflow(element: HTMLElement, allowed: boolean): GlassLayoutAuditOverflow | null {
    const scrollWidth = dimension(() => element.scrollWidth), clientWidth = dimension(() => element.clientWidth);
    if (scrollWidth === null || clientWidth === null || clientWidth <= 0) { missing = true; return null; }
    const excess = Math.max(0, scrollWidth - clientWidth);
    return Object.freeze({ scrollWidth, clientWidth, excess, check: allowed ? 'exempt' : excess > config.overflowTolerance ? 'advisory' : 'within-policy' });
  }
  function visibility(element: HTMLElement): Visibility {
    const clips: Visibility['clips'] = [];
    let current: HTMLElement | null = element, count = 0;
    while (current) {
      if (count === MAX_ANCESTORS) { truncation.ancestorLimit = true; return { reason: 'ancestor-limit', clips }; }
      if (current.assignedSlot) return { reason: 'shadow-boundary', clips };
      const computed = style(current);
      if (!computed) return { reason: 'measurement-unavailable', clips };
      if (computed.display === 'none' || computed.opacity === 0 || computed.contentVisibility === 'hidden'
        || current === element && (computed.visibility === 'hidden' || computed.visibility === 'collapse')) return { reason: 'hidden', clips };
      if (current === element && computed.visibility !== 'visible') return { reason: 'measurement-unavailable', clips };
      if (current !== element) {
        const x = CLIPPING.has(computed.overflowX), y = CLIPPING.has(computed.overflowY);
        if (x || y) clips.push({ element: current, x, y });
      }
      const parent: HTMLElement | null = current.parentElement;
      if (!parent && current.getRootNode() !== doc) return { reason: 'shadow-boundary', clips };
      current = parent; count++;
    }
    return { reason: null, clips };
  }
  function clipping(box: GlassLayoutAuditRect, clips: Visibility['clips']) {
    let left = box.x, right = box.x + box.width, top = box.y, bottom = box.y + box.height;
    for (const clip of clips) {
      const bounds = rect(clip.element);
      if (!bounds) return null;
      if (clip.x) { left = Math.max(left, bounds.x); right = Math.min(right, bounds.x + bounds.width); }
      if (clip.y) { top = Math.max(top, bounds.y); bottom = Math.min(bottom, bounds.y + bounds.height); }
    }
    return { full: right <= left || bottom <= top, partial: right - left < box.width - .0001 || bottom - top < box.height - .0001 };
  }
  function advise(scope: GlassLayoutAuditAdvisory['scope'], id: string | null, code: GlassLayoutAuditAdvisory['code']) {
    totalAdvisories++;
    if (advisories.length === MAX_ADVISORIES) { truncation.advisories = true; return; }
    advisories.push(Object.freeze({ scope, id, code }));
  }
  let viewportWidth: number | null = null, viewportHeight: number | null = null, viewportOverflow: GlassLayoutAuditOverflow | null = null;
  let rootRect: GlassLayoutAuditRect | null = null, rootReason: GlassLayoutAuditSkip | null = null, rootOverflow: GlassLayoutAuditOverflow | null = null;
  try {
    viewportWidth = dimension(() => browser.innerWidth); viewportHeight = dimension(() => browser.innerHeight);
    viewportOverflow = overflow(doc.documentElement, false);
    rootRect = rect(root); rootOverflow = overflow(root, config.allowRootHorizontalOverflow);
    rootReason = visibility(root).reason;
  } catch (error) { rootReason = error === READ_BUDGET ? 'read-budget' : 'measurement-unavailable'; }
  if (viewportOverflow?.check === 'advisory') advise('viewport', null, 'horizontal-overflow');
  if (rootOverflow?.check === 'advisory') advise('root', null, 'horizontal-overflow');
  if (viewportWidth === null || viewportHeight === null || viewportWidth <= 0 || viewportHeight <= 0 || !rootRect || !rootOverflow || rootReason) missing = true;
  for (const target of config.targets) {
    const kind = target.kind!, hit = target.hitArea ?? target.element;
    let reason: GlassLayoutAuditSkip | null = null, box: GlassLayoutAuditRect | null = null, fontSize: number | null = null;
    let sizeCheck: GlassLayoutAuditCheck = kind === 'container' ? 'not-requested' : 'unknown';
    let fontCheck: GlassLayoutAuditCheck = kind === 'field' ? 'unknown' : 'not-requested';
    let targetOverflow: GlassLayoutAuditOverflow | null = null, viewportOffscreen: boolean | null = null, partialClipping = false;
    for (const element of [target.element, hit]) {
      if (!(element instanceof browser.HTMLElement)) { reason = 'unsupported-target'; break; }
      if (element.ownerDocument !== doc) { reason = 'foreign-document'; break; }
      if (!element.isConnected) { reason = 'detached'; break; }
      if (!root.contains(element)) { reason = 'outside-root'; break; }
    }
    if (!reason) try {
      const visible = visibility(hit); reason = visible.reason;
      if (!reason) {
        box = rect(hit);
        if (!box) reason = 'measurement-unavailable';
        else if (box.width <= 0 || box.height <= 0) reason = 'unmeasurable';
        else {
          const clip = clipping(box, visible.clips);
          if (!clip) reason = 'measurement-unavailable';
          else if (clip.full) reason = 'clipped';
          else partialClipping = clip.partial;
          if (viewportWidth !== null && viewportHeight !== null) viewportOffscreen = box.x + box.width <= 0 || box.y + box.height <= 0 || box.x >= viewportWidth || box.y >= viewportHeight;
        }
      }
      if (!reason && box) {
        if (kind !== 'container') {
          sizeCheck = target.sizeExempt ? 'exempt' : box.width < config.minTarget || box.height < config.minTarget ? 'advisory' : partialClipping ? 'unknown' : 'within-policy';
          if (sizeCheck === 'advisory') advise('target', target.id, 'target-size');
        }
        if (partialClipping) { missing = true; advise('target', target.id, 'partial-clipping'); }
        if (kind === 'field') {
          const element = target.element, tag = element.tagName;
          if (tag !== 'TEXTAREA' && tag !== 'SELECT' && (tag !== 'INPUT' || NON_TEXT_INPUTS.has((element as HTMLInputElement).type))) reason = 'unsupported-field';
          else {
            const fieldStyle = style(element), value = fieldStyle && /^\d+(?:\.\d+)?px$/.test(fieldStyle.fontSize) ? Number.parseFloat(fieldStyle.fontSize) : NaN;
            if (!finite(value, true)) reason = 'measurement-unavailable';
            else { fontSize = value; fontCheck = value < config.minInputFont ? 'advisory' : 'within-policy'; if (fontCheck === 'advisory') advise('target', target.id, 'field-font'); }
          }
        }
        if (kind === 'container') {
          targetOverflow = overflow(target.element, Boolean(target.allowHorizontalOverflow));
          if (!targetOverflow) reason = 'measurement-unavailable';
          else if (targetOverflow.check === 'advisory') advise('target', target.id, 'horizontal-overflow');
        }
      }
    } catch (error) { reason = error === READ_BUDGET ? 'read-budget' : 'measurement-unavailable'; }
    if (reason) { missing = true; sizeCheck = kind === 'container' ? 'not-requested' : 'unknown'; fontCheck = kind === 'field' ? 'unknown' : 'not-requested'; }
    targets.push(Object.freeze({
      id: target.id, kind, status: reason ? 'skipped' : 'measured', reason, rect: box,
      sizeCheck, fontSize, fontCheck, overflow: targetOverflow, suppliedHitArea: Boolean(target.hitArea),
      viewportOffscreen, partialClipping,
    }));
  }
  const truncated = Object.values(truncation).some(Boolean), checked = targets.filter(target => target.status === 'measured').length;
  return Object.freeze({
    policy: Object.freeze({ kind: 'configured-library-layout-policy', minTarget: config.minTarget, minInputFont: config.minInputFont,
      overflowTolerance: config.overflowTolerance, targetLimit: config.limit, readLimit: config.maxReads, ancestorLimit: MAX_ANCESTORS, advisoryLimit: MAX_ADVISORIES }),
    viewport: Object.freeze({ width: viewportWidth, height: viewportHeight, overflow: viewportOverflow }),
    root: Object.freeze({ rect: rootRect, reason: rootReason, overflow: rootOverflow }),
    targets: Object.freeze(targets), advisories: Object.freeze(advisories),
    counts: Object.freeze({ supplied: config.supplied, considered: targets.length, checked, skipped: targets.length - checked, unvisited: config.supplied - targets.length, advisories: totalAdvisories }),
    reads: Object.freeze({ ...reads }), truncation: Object.freeze({ ...truncation }), truncated, incomplete: missing || truncated,
    limitations: LIMITATIONS,
  });
}
