import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditGlassLayout } from '../src/layout-audit.js';
import type { GlassLayoutAuditOptions, GlassLayoutAuditTarget } from '../src/layout-audit.js';

const descriptors: { object: object; key: string; previous: PropertyDescriptor | undefined }[] = [];
function property(object: object, key: string, value: unknown) {
  descriptors.push({ object, key, previous: Object.getOwnPropertyDescriptor(object, key) });
  Object.defineProperty(object, key, { configurable: true, value });
}
afterEach(() => {
  document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const { object, key, previous } of descriptors.splice(0).reverse()) {
    if (previous) Object.defineProperty(object, key, previous); else Reflect.deleteProperty(object, key);
  }
});
function fixture() {
  property(window, 'innerWidth', 320); property(window, 'innerHeight', 700);
  property(document.documentElement, 'clientWidth', 320); property(document.documentElement, 'scrollWidth', 320);
  const root = document.createElement('main'); document.body.append(root);
  property(root, 'clientWidth', 280); property(root, 'scrollWidth', 280);
  const css = vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
    const style = (element as HTMLElement).style;
    return {
      display: style.display || 'block', visibility: style.visibility || 'visible', opacity: style.opacity || '1',
      contentVisibility: style.contentVisibility || 'visible', overflowX: style.overflowX || 'visible',
      overflowY: style.overflowY || 'visible', fontSize: style.fontSize || '16px',
    } as CSSStyleDeclaration;
  });
  const rootRect = geometry(root, 20, 20, 280, 300);
  function add(tag: 'button' | 'input' | 'textarea' | 'select' | 'div' | 'label' | 'a' = 'button', box: number[] = [30, 30, 44, 44]) {
    const element = document.createElement(tag); root.append(element);
    const rect = geometry(element, ...box as [number, number, number, number]);
    return { element, rect };
  }
  return { root, add, css, rootRect };
}
function geometry(element: HTMLElement, x: number, y: number, width: number, height: number) {
  return vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ x, y, width, height, top: y, right: x + width, bottom: y + height, left: x, toJSON() { return {}; } } as DOMRect);
}
const target = (element: HTMLElement, id = 'action', extra: Partial<GlassLayoutAuditTarget> = {}): GlassLayoutAuditTarget => ({ id, element, ...extra });

describe('explicit read-only rendered layout audit', () => {
  it('reports configured library policies without an overall accessibility/mobile pass or private content', () => {
    const { root, add } = fixture(), button = add().element;
    button.textContent = 'Private application content'; button.id = 'private-id'; button.className = 'private-css';
    const report = auditGlassLayout(root, { targets: [target(button, 'host-action')] });
    expect(report.policy).toMatchObject({ kind: 'configured-library-layout-policy', minTarget: 44, minInputFont: 16, overflowTolerance: 1, targetLimit: 64, readLimit: 512 });
    expect(report.targets[0]).toMatchObject({ id: 'host-action', status: 'measured', sizeCheck: 'within-policy', fontCheck: 'not-requested' });
    expect(report.counts).toMatchObject({ supplied: 1, considered: 1, checked: 1, skipped: 0, unvisited: 0 });
    expect(report.incomplete).toBe(false);
    expect(report).not.toHaveProperty('passed');
    expect(report).not.toHaveProperty('accessible');
    expect(JSON.stringify(report)).not.toContain('Private application content');
    expect(JSON.stringify(report)).not.toContain('private-id');
    expect(JSON.stringify(report)).not.toContain('private-css');
    expect(report.limitations.join(' ')).toContain('24px plus exceptions');
    expect(report.limitations.join(' ')).toContain('not WCAG certification');
  });

  it('flags either target dimension below policy, with exact and fractional boundary behavior', () => {
    const { root, add } = fixture();
    const widths = [44, 43.99, 60], heights = [44, 60, 43.99];
    const targets = widths.map((width, index) => target(add('button', [30, 30, width, heights[index]]).element, 'action' + index));
    const report = auditGlassLayout(root, { targets });
    expect(report.targets.map(item => item.sizeCheck)).toEqual(['within-policy', 'advisory', 'advisory']);
    expect(report.advisories.map(item => item.id)).toEqual(['action1', 'action2']);
    expect(report.targets[1].rect?.width).toBe(43.99);
    expect(report.reads.total).toBe(report.reads.styles + report.reads.rects + report.reads.dimensions);
  });

  it('supports an explicitly different target policy while continuing to disclaim WCAG exception evaluation', () => {
    const { root, add } = fixture(), element = add('button', [30, 30, 24, 24]).element;
    const ordinary = auditGlassLayout(root, { targets: [target(element)] });
    const custom = auditGlassLayout(root, { targets: [target(element)], minTarget: 24 });
    expect(ordinary.targets[0].sizeCheck).toBe('advisory');
    expect(custom.targets[0].sizeCheck).toBe('within-policy');
    expect(custom.policy.minTarget).toBe(24);
    expect(custom.limitations.join(' ')).toContain('exceptions that are not evaluated');
  });

  it('reads native field font separately from a supplied large label/compound hit rectangle', () => {
    const { root, add } = fixture(), field = add('input', [30, 30, 18, 18]).element;
    const label = add('label', [30, 30, 120, 44]).element;
    field.style.fontSize = '14px'; label.style.fontSize = '22px';
    const report = auditGlassLayout(root, { targets: [target(field, 'native-field', { kind: 'field', hitArea: label })] });
    expect(report.targets[0]).toMatchObject({ suppliedHitArea: true, rect: { width: 120, height: 44 }, sizeCheck: 'within-policy', fontSize: 14, fontCheck: 'advisory' });
    expect(report.advisories.map(item => item.code)).toEqual(['field-font']);
    expect(report.limitations.join(' ')).toContain('Native label association');
  });

  it('checks text input/select/textarea font boundaries without sampling their values or internal text overflow', () => {
    const { root, add } = fixture();
    const targets = (['input', 'select', 'textarea'] as const).map((tag, index) => {
      const element = add(tag, [30, 30, 100, 44]).element;
      element.style.fontSize = index === 0 ? '15.5px' : '16px';
      property(element, 'scrollWidth', 2000);
      Object.defineProperty(element, 'value', { configurable: true, get() { throw Error('Private value must not be read'); } });
      return target(element, tag, { kind: 'field' });
    });
    const report = auditGlassLayout(root, { targets });
    expect(report.targets.map(item => item.fontCheck)).toEqual(['advisory', 'within-policy', 'within-policy']);
    expect(report.targets.every(item => item.overflow === null)).toBe(true);
    expect(report.advisories.map(item => item.code)).toEqual(['field-font']);
  });

  it('does not treat aria-hidden or inert alone as visual invisibility', () => {
    const { root, add } = fixture(), first = add('button', [30, 30, 32, 32]).element;
    first.setAttribute('aria-hidden', 'true'); first.inert = true;
    const report = auditGlassLayout(root, { targets: [target(first)] });
    expect(report.targets[0]).toMatchObject({ status: 'measured', reason: null, sizeCheck: 'advisory' });
    expect(report.counts.skipped).toBe(0);
  });

  it.each(['display', 'visibility', 'opacity', 'contentVisibility'] as const)('skips actual CSS-hidden target via %s, never labeling it clean', key => {
    const { root, add } = fixture(), element = add().element;
    element.style[key] = key === 'display' ? 'none' : key === 'opacity' ? '0' : 'hidden';
    const report = auditGlassLayout(root, { targets: [target(element)] });
    expect(report.targets[0]).toMatchObject({ status: 'skipped', reason: 'hidden', sizeCheck: 'unknown' });
    expect(report.incomplete).toBe(true);
    expect(report.counts).toMatchObject({ checked: 0, skipped: 1 });
  });

  it('honors ancestor display/opacity/content visibility, while allowing a real child visibility override', () => {
    const { root, add } = fixture(), parent = document.createElement('div'), element = add().element;
    root.append(parent); parent.append(element);
    parent.style.visibility = 'hidden'; element.style.visibility = 'visible';
    expect(auditGlassLayout(root, { targets: [target(element)] }).targets[0].status).toBe('measured');
    parent.style.opacity = '0';
    expect(auditGlassLayout(root, { targets: [target(element)] }).targets[0].reason).toBe('hidden');
    parent.style.opacity = '1'; parent.style.display = 'none';
    expect(auditGlassLayout(root, { targets: [target(element)] }).targets[0].reason).toBe('hidden');
    parent.style.display = 'block'; parent.style.contentVisibility = 'hidden';
    expect(auditGlassLayout(root, { targets: [target(element)] }).targets[0].reason).toBe('hidden');
  });

  it('inspects ancestors outside the root, within the same finite depth cap', () => {
    const { root, add } = fixture(), element = add().element, outer = document.createElement('div');
    document.body.append(outer); outer.append(root); outer.style.opacity = '0';
    const report = auditGlassLayout(root, { targets: [target(element)] });
    expect(report.root.reason).toBe('hidden');
    expect(report.targets[0].reason).toBe('hidden');
    expect(report.incomplete).toBe(true);
  });

  it('measures a host-declared visible label instead of inventing a checkbox hit area from its small hidden native box', () => {
    const { root, add } = fixture(), checkbox = add('input', [30, 30, 1, 1]).element as HTMLInputElement;
    checkbox.type = 'checkbox'; checkbox.style.opacity = '0';
    const label = add('label', [30, 30, 120, 44]).element;
    const report = auditGlassLayout(root, { targets: [target(checkbox, 'checkbox'), target(checkbox, 'compound', { hitArea: label })] });
    expect(report.targets[0]).toMatchObject({ status: 'skipped', reason: 'hidden' });
    expect(report.targets[1]).toMatchObject({ status: 'measured', suppliedHitArea: true, sizeCheck: 'within-policy', rect: { width: 120 } });
    expect(report.incomplete).toBe(true);
  });

  it('reports explicit size exemptions without certifying inline-link/essential/equivalent-control exceptions', () => {
    const { root, add } = fixture(), link = add('a', [30, 30, 30, 18]).element;
    const report = auditGlassLayout(root, { targets: [target(link, 'inline-link', { sizeExempt: true })] });
    expect(report.targets[0].sizeCheck).toBe('exempt');
    expect(report.advisories).toHaveLength(0);
    expect(report.limitations.join(' ')).toContain('exemptions require host review');
  });

  it('distinguishes viewport-offscreen content from ancestor clipping', () => {
    const { root, add } = fixture(), below = add('button', [30, 1100, 44, 44]).element;
    const report = auditGlassLayout(root, { targets: [target(below)] });
    expect(report.targets[0]).toMatchObject({ status: 'measured', reason: null, viewportOffscreen: true, sizeCheck: 'within-policy' });
    root.style.overflowY = 'auto';
    const clipped = auditGlassLayout(root, { targets: [target(below)] });
    expect(clipped.targets[0]).toMatchObject({ status: 'skipped', reason: 'clipped', viewportOffscreen: true, sizeCheck: 'unknown' });
    expect(clipped.incomplete).toBe(true);
  });

  it('marks partial ancestor clipping as incomplete geometry rather than a clean 44px hit test', () => {
    const { root, add } = fixture(), element = add('button', [290, 30, 44, 44]).element;
    root.style.overflowX = 'hidden';
    const report = auditGlassLayout(root, { targets: [target(element)] });
    expect(report.targets[0]).toMatchObject({ status: 'measured', partialClipping: true, sizeCheck: 'unknown', rect: { width: 44 } });
    expect(report.advisories.map(item => item.code)).toEqual(['partial-clipping']);
    expect(report.incomplete).toBe(true);
    root.style.overflowX = 'visible';
    expect(auditGlassLayout(root, { targets: [target(element)] }).targets[0].partialClipping).toBe(false);
  });

  it('reports viewport/root/declared-container overflow separately, with tolerance and explicit intentional scrolling', () => {
    const { root, add } = fixture(), container = add('div', [30, 30, 100, 80]).element;
    property(root, 'scrollWidth', 282); property(document.documentElement, 'scrollWidth', 327);
    property(container, 'clientWidth', 100); property(container, 'scrollWidth', 180);
    const report = auditGlassLayout(root, { targets: [target(container, 'row', { kind: 'container', allowHorizontalOverflow: true })] });
    expect(report.viewport.overflow).toMatchObject({ excess: 7, check: 'advisory' });
    expect(report.root.overflow).toMatchObject({ excess: 2, check: 'advisory' });
    expect(report.targets[0].overflow).toMatchObject({ excess: 80, check: 'exempt' });
    expect(report.targets[0].sizeCheck).toBe('not-requested');
    expect(report.advisories.map(item => item.scope)).toEqual(['viewport', 'root']);
    const permitted = auditGlassLayout(root, { targets: [target(container, 'row', { kind: 'container' })], allowRootHorizontalOverflow: true, overflowTolerance: 2 });
    expect(permitted.root.overflow?.check).toBe('exempt');
    expect(permitted.targets[0].overflow?.check).toBe('advisory');
    expect(permitted.viewport.overflow?.check).toBe('advisory');
  });

  it('accepts overflow exactly at tolerance and explicitly reruns fresh geometry after host changes', () => {
    const { root, add } = fixture(), { element, rect } = add();
    property(root, 'scrollWidth', 281);
    const first = auditGlassLayout(root, { targets: [target(element)] });
    expect(first.root.overflow?.check).toBe('within-policy');
    rect.mockReturnValue({ x: 30, y: 30, width: 30, height: 30 } as DOMRect);
    const second = auditGlassLayout(root, { targets: [target(element)] });
    expect(second.targets[0].sizeCheck).toBe('advisory');
    expect(first.targets[0].rect?.width).toBe(44);
    expect(second.targets[0].rect?.width).toBe(30);
  });

  it('skips detached/out-of-scope/unsupported/foreign targets without reading their geometry or copying private errors', () => {
    const { root, add } = fixture(), detached = add(), outside = document.createElement('button'), wrong = {} as HTMLElement;
    detached.element.remove(); document.body.append(outside); const outsideRect = geometry(outside, 0, 0, 44, 44);
    const foreignDoc = document.implementation.createHTMLDocument('Private foreign title'), foreign = foreignDoc.createElement('button');
    foreignDoc.body.append(foreign);
    const report = auditGlassLayout(root, { targets: [target(detached.element, 'detached'), target(outside, 'outside'), target(wrong, 'unsupported'), target(foreign, 'foreign')] });
    expect(report.targets.map(item => item.reason)).toEqual(['detached', 'outside-root', 'unsupported-target', 'foreign-document']);
    expect(detached.rect).not.toHaveBeenCalled(); expect(outsideRect).not.toHaveBeenCalled();
    expect(report.counts.skipped).toBe(4); expect(report.incomplete).toBe(true);
    expect(JSON.stringify(report)).not.toContain('Private foreign title');
  });

  it('never silently treats unsupported field types, failed style/rect reads or invalid dimensions as successful measurements', () => {
    const { root, add, css } = fixture(), button = add().element, input = add('input');
    const unsupported = auditGlassLayout(root, { targets: [target(button, 'wrong-field', { kind: 'field' })] });
    expect(unsupported.targets[0].reason).toBe('unsupported-field');
    input.rect.mockImplementation(() => { throw Error('private token'); });
    const failed = auditGlassLayout(root, { targets: [target(input.element, 'failed')] });
    expect(failed.targets[0].reason).toBe('measurement-unavailable');
    expect(JSON.stringify(failed)).not.toContain('private token');
    input.rect.mockReturnValue({ x: 0, y: 0, width: NaN, height: 44 } as DOMRect);
    expect(auditGlassLayout(root, { targets: [target(input.element)] }).targets[0].reason).toBe('measurement-unavailable');
    css.mockImplementation(() => { throw Error('private CSS'); });
    const unavailable = auditGlassLayout(root, { targets: [target(button)] });
    expect(unavailable.incomplete).toBe(true); expect(unavailable.targets[0].reason).toBe('measurement-unavailable');
  });

  it('distinguishes a zero-sized box and an unresolvable native font from a clean measurement', () => {
    const { root, add } = fixture(), empty = add('button', [30, 30, 0, 0]).element, field = add('input').element;
    field.style.fontSize = 'medium';
    const report = auditGlassLayout(root, { targets: [target(empty, 'zero'), target(field, 'font', { kind: 'field' })] });
    expect(report.targets.map(item => item.reason)).toEqual(['unmeasurable', 'measurement-unavailable']);
    expect(report.targets[1].fontCheck).toBe('unknown');
    property(window, 'innerWidth', 0);
    expect(auditGlassLayout(root, { targets: [] }).incomplete).toBe(true);
  });

  it('bounds consumed target records without evaluating the truncated tail', () => {
    const { root, add } = fixture(), getter = vi.fn(() => { throw Error('Unvisited private target'); });
    const records = [target(add().element)] as GlassLayoutAuditTarget[];
    Object.defineProperty(records, '1', { get: getter, enumerable: true, configurable: true });
    const report = auditGlassLayout(root, { targets: records, limit: 1 });
    expect(report.counts).toMatchObject({ supplied: 2, considered: 1, checked: 1, unvisited: 1 });
    expect(report.truncation.targetLimit).toBe(true); expect(report.truncated).toBe(true); expect(report.incomplete).toBe(true);
    expect(getter).not.toHaveBeenCalled();
  });

  it('strictly bounds read attempts and exposes exhausted records without idle retries or extra reads', () => {
    const { root, add, css, rootRect } = fixture(), records = Array.from({ length: 20 }, (_, index) => {
      const fixture = add(); return { ...fixture, target: target(fixture.element, 't' + index) };
    });
    const report = auditGlassLayout(root, { targets: records.map(item => item.target), maxReads: 16 });
    expect(report.reads.total).toBe(16);
    expect(report.truncation.readBudget).toBe(true);
    expect(report.counts.considered).toBe(20);
    expect(report.targets.some(item => item.reason === 'read-budget')).toBe(true);
    expect(css.mock.calls.length).toBe(report.reads.styles);
    expect(rootRect.mock.calls.length + records.reduce((sum, item) => sum + item.rect.mock.calls.length, 0)).toBe(report.reads.rects);
    expect(report.incomplete).toBe(true);
  });

  it('bounds ancestor traversal instead of ignoring an unmeasured deep hiding ancestor', () => {
    const { root } = fixture(); let parent = root;
    for (let index = 0; index < 20; index++) { const next = document.createElement('div'); parent.append(next); parent = next; }
    const control = document.createElement('button'); parent.append(control); geometry(control, 30, 30, 44, 44);
    const report = auditGlassLayout(root, { targets: [target(control)] });
    expect(report.targets[0].reason).toBe('ancestor-limit');
    expect(report.truncation.ancestorLimit).toBe(true);
    expect(report.incomplete).toBe(true);
    expect(report.reads.total).toBeLessThanOrEqual(report.policy.readLimit);
  });

  it('does not call a shadow-root child clean when it cannot inspect the composed host ancestry', () => {
    const { root, add } = fixture(), control = add().element, host = document.createElement('div');
    document.body.append(host); host.style.opacity = '0';
    host.attachShadow({ mode: 'open' }).append(root);
    const report = auditGlassLayout(root, { targets: [target(control)] });
    expect(report.root.reason).toBe('shadow-boundary');
    expect(report.targets[0]).toMatchObject({ status: 'skipped', reason: 'shadow-boundary', sizeCheck: 'unknown' });
    expect(report.incomplete).toBe(true);
  });

  it('reports slotted controls as unknown instead of ignoring the slot’s composed clipping and hiding', () => {
    const { root, add } = fixture(), control = add().element, host = document.createElement('div');
    root.append(host); host.append(control);
    const shadow = host.attachShadow({ mode: 'open' }), slot = document.createElement('slot');
    slot.style.opacity = '0'; shadow.append(slot);
    expect(control.assignedSlot).toBe(slot);
    const report = auditGlassLayout(root, { targets: [target(control)] });
    expect(report.targets[0]).toMatchObject({ status: 'skipped', reason: 'shadow-boundary' });
    expect(report.incomplete).toBe(true);
  });

  it('caps advisory metadata while preserving the actual finding count and incompleteness', () => {
    const { root, add } = fixture(); root.style.overflowX = 'hidden';
    const records = Array.from({ length: 128 }, (_, index) => {
      const field = add('input', [10, 30, 20, 20]).element; field.style.fontSize = '12px';
      return target(field, 'f' + index, { kind: 'field' });
    });
    const report = auditGlassLayout(root, { targets: records, limit: 128, maxReads: 4096 });
    expect(report.targets).toHaveLength(128);
    expect(report.advisories).toHaveLength(256);
    expect(report.counts.advisories).toBe(384);
    expect(report.truncation.advisories).toBe(true);
    expect(report.incomplete).toBe(true);
  });

  it('freezes only owned numeric/report copies and never edits DOM, focus, labels, values or caller arrays', () => {
    const { root, add } = fixture(), element = add('input').element as HTMLInputElement;
    element.value = 'private draft'; element.focus();
    const descriptor = target(element, 'field', { kind: 'field' }), records = [descriptor], options = { targets: records };
    const focus = vi.spyOn(element, 'focus'), setAttribute = vi.spyOn(element, 'setAttribute'), query = vi.spyOn(root, 'querySelectorAll');
    const raf = vi.spyOn(window, 'requestAnimationFrame'), timeout = vi.spyOn(window, 'setTimeout'), before = root.outerHTML;
    const report = auditGlassLayout(root, options);
    expect(root.outerHTML).toBe(before); expect(document.activeElement).toBe(element); expect(element.value).toBe('private draft');
    expect(focus).not.toHaveBeenCalled(); expect(setAttribute).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled(); expect(timeout).not.toHaveBeenCalled();
    expect(JSON.stringify(report)).not.toContain('private draft');
    for (const owned of [report, report.policy, report.root, report.root.rect, report.viewport, report.targets, report.targets[0], report.targets[0].rect, report.counts, report.reads, report.truncation, report.limitations, report.advisories]) expect(Object.isFrozen(owned)).toBe(true);
    for (const host of [element, descriptor, records, options]) expect(Object.isFrozen(host)).toBe(false);
    descriptor.id = 'changed'; records.length = 0;
    expect(report.targets[0].id).toBe('field'); expect(report.targets).toHaveLength(1);
  });
});

describe('layout audit input guards', () => {
  it.each([
    { limit: 0 }, { limit: 129 }, { limit: 1.5 },
    { maxReads: 15 }, { maxReads: 4097 }, { maxReads: 16.5 },
    { minTarget: 23 }, { minTarget: 129 }, { minTarget: NaN },
    { minInputFont: 11 }, { minInputFont: 33 }, { minInputFont: Infinity },
    { overflowTolerance: -1 }, { overflowTolerance: 17 }, { allowRootHorizontalOverflow: 1 },
    { targets: null }, { targets: Array(513).fill({}) }, { unknown: true },
  ])('rejects malformed configuration %j before sampling', patch => {
    const { root, rootRect, css } = fixture();
    expect(() => auditGlassLayout(root, { targets: [], ...patch } as unknown as GlassLayoutAuditOptions)).toThrow(TypeError);
    expect(rootRect).not.toHaveBeenCalled(); expect(css).not.toHaveBeenCalled();
  });
  it.each([
    { id: '' }, { id: 'two words' }, { id: 'x'.repeat(65) }, { id: 'é' }, { id: null },
    { kind: 'all' }, { sizeExempt: 'yes' }, { allowHorizontalOverflow: 1 }, { private: true },
  ])('rejects malformed consumed target metadata %j', patch => {
    const { root, add, rootRect } = fixture(), element = add().element;
    expect(() => auditGlassLayout(root, { targets: [{ id: 'action', element, ...patch }] as unknown as GlassLayoutAuditTarget[] })).toThrow(TypeError);
    expect(rootRect).not.toHaveBeenCalled();
  });
  it('rejects unknown symbols, accessors, sparse records, duplicate IDs and inherited config without evaluating getters', () => {
    const { root, add } = fixture(), element = add().element, getter = vi.fn(() => 'id');
    const badTarget = { element }; Object.defineProperty(badTarget, 'id', { get: getter, enumerable: true });
    const badOptions = {}; Object.defineProperty(badOptions, 'targets', { get: getter, enumerable: true });
    for (const options of [
      badOptions, { targets: [], [Symbol('unknown')]: true }, Object.create({ targets: [] }),
      { targets: [badTarget] }, { targets: [target(element, 'same'), target(element, 'same')] }, { targets: Array(2) },
    ]) expect(() => auditGlassLayout(root, options as GlassLayoutAuditOptions)).toThrow(TypeError);
    expect(getter).not.toHaveBeenCalled();
  });
  it('requires a connected actual root and accepts exact bounds/null-prototype data', () => {
    const { root } = fixture();
    expect(() => auditGlassLayout(document.createElement('main'), { targets: [] })).toThrow(TypeError);
    expect(() => auditGlassLayout(null as unknown as HTMLElement, { targets: [] })).toThrow(TypeError);
    expect(() => auditGlassLayout({} as HTMLElement, { targets: [] })).toThrow(TypeError);
    const options = Object.assign(Object.create(null), { targets: [], limit: 128, maxReads: 4096, minTarget: 128, minInputFont: 32, overflowTolerance: 16 });
    expect(auditGlassLayout(root, options).policy).toMatchObject({ targetLimit: 128, readLimit: 4096, minTarget: 128, minInputFont: 32, overflowTolerance: 16 });
  });
});
