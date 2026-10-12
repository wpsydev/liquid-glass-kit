// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { getGlassTaskProgressProps } from '../src/task-progress.js';
import type { GlassTaskProgressOptions, GlassTaskProgressProps, GlassTaskState } from '../src/task-progress.js';

const base = { id: 'asset-progress', label: 'Prepare assets', statusId: 'asset-status', statusText: 'Reading source assets', state: 'busy' as const };
const unsafe = (value: unknown) => getGlassTaskProgressProps(value as GlassTaskProgressOptions);
const css = readFileSync(new URL('../src/task-progress.css', import.meta.url), 'utf8');
const render = (props: GlassTaskProgressProps) => renderToStaticMarkup(createElement('section', {},
  createElement('div', props.frame, createElement('label', props.label.props, props.label.text), createElement('progress', props.progress), createElement('span', props.decorative)),
  createElement('div', { ...props.region, id: 'updating-content' }, 'Host content being prepared'),
  createElement('p', props.status.props, props.status.text),
  createElement('button', { type: 'button' }, 'Cancel')));

describe('actual native task amounts', () => {
  it('is SSR-safe, native and deterministic without defaults for business quantities or state', () => {
    expect(typeof document).toBe('undefined'); expect(typeof window).toBe('undefined');
    const props = getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 3, max: 8, valueText: '3 of 8 files processed' });
    expect(props.progress).toEqual({ id: base.id, className: 'lg-task-bar', value: 3, max: 8, hidden: false,
      'aria-describedby': base.statusId, 'aria-valuetext': '3 of 8 files processed' });
    expect(props.label).toEqual({ props: { className: 'lg-task-label', htmlFor: base.id }, text: 'Prepare assets' });
    expect(props.region).toEqual({ 'aria-busy': true });
    expect(props.status.props).toEqual({ className: 'lg-task-status', id: base.statusId });
    expect(props.progress).not.toHaveProperty('role'); expect(props.progress).not.toHaveProperty('aria-valuenow'); expect(props.progress).not.toHaveProperty('aria-busy');
    expect(props.status.props).not.toHaveProperty('aria-busy'); expect(props.frame['data-lg-task-motion']).toBe('static'); expect(props.decorative.hidden).toBe(true);
    expect(props).toEqual(getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 3, max: 8, valueText: '3 of 8 files processed' }));
    expect(() => unsafe({ ...base, mode: 'determinate', value: 3 })).toThrow(/max/);
    expect(() => unsafe({ ...base, mode: 'determinate', max: 8 })).toThrow(/value/);
    expect(() => unsafe({ ...base, state: undefined, mode: 'indeterminate' })).toThrow(/state/);
  });

  it('associates the native progress label/status without nesting status or buttons inside the bar', () => {
    const props = getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 3, max: 8, statusAnnouncement: 'polite' });
    const dom = new JSDOM(render(props)); const progress = dom.window.document.querySelector('progress')!;
    expect(progress.labels?.[0].textContent).toBe(base.label); expect(progress.value).toBe(3); expect(progress.max).toBe(8); expect(progress.position).toBe(.375);
    expect(progress.childNodes).toHaveLength(0); expect(progress.querySelector('button')).toBeNull();
    const status = dom.window.document.getElementById(progress.getAttribute('aria-describedby')!)!;
    expect(status.textContent).toBe(base.statusText); expect(status.getAttribute('role')).toBe('status');
    expect(status.closest('[aria-busy]')).toBeNull();
    expect(dom.window.document.querySelector('#updating-content')?.getAttribute('aria-busy')).toBe('true');
    expect(dom.window.document.querySelector('button')?.type).toBe('button'); dom.window.close();
  });

  it('preserves actual zero, fractional amounts and total units rather than assuming a percentage', () => {
    const zero = getGlassTaskProgressProps({ ...base, mode: 'determinate', value: -0, max: 32 });
    expect(zero.progress.value).toBe(0); expect(Object.is(zero.progress.value, -0)).toBe(false);
    expect(zero.progress.max).toBe(32); expect(zero.progress).not.toHaveProperty('aria-valuetext');
    const fraction = getGlassTaskProgressProps({ ...base, mode: 'determinate', value: .125, max: .5 });
    expect(fraction.progress).toMatchObject({ value: .125, max: .5 });
    expect(getGlassTaskProgressProps({ ...base, mode: 'determinate', value: Number.MAX_VALUE, max: Number.MAX_VALUE }).progress.value).toBe(Number.MAX_VALUE);
  });

  it.each(['idle', 'busy', 'complete', 'error', 'cancelled'] as const)('keeps reported incomplete quantities in explicit %s state without inventing100', state => {
    const props = getGlassTaskProgressProps({ ...base, state, mode: 'determinate', value: 3, max: 8, animated: true });
    expect(props.progress).toMatchObject({ value: 3, max: 8, hidden: false });
    expect(props.region['aria-busy']).toBe(state === 'busy');
    expect(props.frame['data-lg-task-state']).toBe(state); expect(props.frame['data-lg-task-motion']).toBe('static');
    expect(props.decorative.hidden).toBe(true); expect(props.status.text).toBe(base.statusText);
  });

  it.each([NaN, Infinity, -Infinity, -1, 9, '3', null, undefined])('rejects invalid or over-max amount %s rather than clamping', value => {
    expect(() => unsafe({ ...base, mode: 'determinate', value, max: 8 })).toThrow(/value/);
  });

  it.each([NaN, Infinity, -Infinity, -1, 0, -0, '8', null, undefined])('rejects invalid total %s', max => {
    expect(() => unsafe({ ...base, mode: 'determinate', value: 0, max })).toThrow(/max/);
  });
});

describe('explicit indeterminate waiting and terminal states', () => {
  it('omits native value/max rather than treating unknown progress as zero', () => {
    const props = getGlassTaskProgressProps({ ...base, mode: 'indeterminate' });
    expect(props.progress).not.toHaveProperty('value'); expect(props.progress).not.toHaveProperty('max'); expect(props.progress.hidden).toBe(false);
    expect(props.decorative).toEqual({ className: 'lg-task-indicator', 'aria-hidden': true, hidden: false });
    expect(props.frame['data-lg-task-motion']).toBe('static');
    const dom = new JSDOM(render(props)); const progress = dom.window.document.querySelector('progress')!;
    expect(progress.hasAttribute('value')).toBe(false); expect(progress.position).toBe(-1);
    expect(progress.hasAttribute('aria-valuenow')).toBe(false); dom.window.close();
    for (const extra of [{ value: 0 }, { max: 1 }, { value: undefined }, { max: undefined }]) expect(() => unsafe({ ...base, mode: 'indeterminate', ...extra })).toThrow(/omit/);
  });

  it.each(['idle', 'complete', 'error', 'cancelled'] as const)('hides unknown bars/rings in %s while retaining required label and outcome text', state => {
    const props = getGlassTaskProgressProps({ ...base, state, mode: 'indeterminate', animated: true, statusText: 'Host outcome, with no known quantity' });
    expect(props.progress.hidden).toBe(true); expect(props.decorative.hidden).toBe(true);
    expect(props.progress).not.toHaveProperty('value'); expect(props.frame['data-lg-task-motion']).toBe('static');
    expect(props.region['aria-busy']).toBe(false); expect(props.label.text).toBe(base.label); expect(props.status.text).toBe('Host outcome, with no known quantity');
    expect(render(props)).toContain('<progress'); expect(render(props)).toContain('hidden=""');
  });

  it('enables only opted-in busy unknown decoration and respects explicit reduced motion', () => {
    const active = getGlassTaskProgressProps({ ...base, mode: 'indeterminate', animated: true });
    expect(active.frame['data-lg-task-motion']).toBe('animate');
    expect(getGlassTaskProgressProps({ ...base, mode: 'indeterminate', animated: true, reducedMotion: true }).frame['data-lg-task-motion']).toBe('static');
    expect(getGlassTaskProgressProps({ ...base, mode: 'indeterminate', animated: false }).frame['data-lg-task-motion']).toBe('static');
    const host = { ...base, mode: 'indeterminate' as const, animated: true };
    const initial = getGlassTaskProgressProps(host); host.animated = false;
    expect(initial.frame['data-lg-task-motion']).toBe('animate'); expect(getGlassTaskProgressProps(host).frame['data-lg-task-motion']).toBe('static');
  });

  it('supports a real native determinate-to-unknown transition with attribute removal by the host adapter', () => {
    const first = getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 3, max: 8 });
    const dom = new JSDOM(render(first)); const progress = dom.window.document.querySelector('progress')!;
    const next = getGlassTaskProgressProps({ ...base, mode: 'indeterminate' });
    for (const attribute of ['value', 'max'] as const) if (!(attribute in next.progress)) progress.removeAttribute(attribute);
    expect(progress.position).toBe(-1); expect(progress.labels?.[0].textContent).toBe(base.label);
    const resumed = getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 4, max: 8 });
    progress.value = resumed.progress.value!; progress.max = resumed.progress.max!;
    expect(progress.position).toBe(.5); dom.window.close();
  });
});

describe('bounded task anatomy and host-owned announcements', () => {
  it('deduplicates external description IDs and requires a separate status association', () => {
    const props = getGlassTaskProgressProps({ ...base, mode: 'indeterminate', describedBy: 'hint hint\tpolicy asset-status' });
    expect(props.progress['aria-describedby']).toBe('hint policy asset-status');
    expect(getGlassTaskProgressProps({ ...base, mode: 'indeterminate', describedBy: props.progress['aria-describedby'] })).toEqual(props);
    const unrelated = Array.from({ length: 32 }, (_, i) => `hint-${i}`).join(' ');
    const full = getGlassTaskProgressProps({ ...base, mode: 'indeterminate', describedBy: unrelated });
    expect(full.progress['aria-describedby'].split(' ')).toHaveLength(33);
    expect(getGlassTaskProgressProps({ ...base, mode: 'indeterminate', describedBy: full.progress['aria-describedby'] })).toEqual(full);
  });

  it.each([['off', undefined], ['polite', 'status'], ['assertive', 'alert']] as const)('returns only requested %s status semantics, with no per-value announcement loop', (statusAnnouncement, role) => {
    const props = getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 1, max: 8, statusAnnouncement });
    expect(props.status.props.role).toBe(role); expect(props.status.props['aria-atomic']).toBe(role ? true : undefined);
    expect(props.status.props).not.toHaveProperty('aria-live');
    expect(getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 2, max: 8, statusAnnouncement }).status).toEqual(props.status);
    const dom = new JSDOM('<p role="status">Host authored status</p>');
    getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 3, max: 8, statusAnnouncement });
    expect(dom.window.document.querySelector('p')?.textContent).toBe('Host authored status'); dom.window.close();
  });

  it('returns escaped-text ingredients for localized labels, unit context and multiline outcomes', () => {
    const props = getGlassTaskProgressProps({ ...base, label: 'Préparer les fichiers', statusText: '<script>failure</script>\nPlease retry',
      mode: 'determinate', value: 1, max: 8, valueText: '1 fichier sur 8' });
    expect(props.status.text).toBe('<script>failure</script>\nPlease retry');
    expect(props.progress['aria-valuetext']).toBe('1 fichier sur 8');
    expect(render(props)).toContain('&lt;script&gt;failure&lt;/script&gt;'); expect(render(props)).not.toContain('<script>');
  });

  it('returns detached frozen props with stable host IDs without changing input', () => {
    const input = { ...base, mode: 'determinate' as const, value: 1, max: 8 }; const props = getGlassTaskProgressProps(input); input.value = 3;
    expect(props.progress.value).toBe(1); expect(Object.isFrozen(input)).toBe(false);
    for (const part of [props, props.progress, props.frame, props.region, props.decorative, props.label, props.label.props, props.status, props.status.props]) expect(Object.isFrozen(part)).toBe(true);
    getGlassTaskProgressProps({ ...base, id: ':r0:', statusId: ':r0:status', mode: 'indeterminate' });
    expect(getGlassTaskProgressProps({ ...base, mode: 'determinate', value: 1, max: 8 })).toEqual(props);
  });

  it('requires distinct safe IDs, a visible label, actual host status and a valid mode/state', () => {
    for (const id of ['', 'has spaces', '"', 'x'.repeat(129), undefined]) expect(() => unsafe({ ...base, id, mode: 'indeterminate' })).toThrow(/id/);
    expect(() => unsafe({ ...base, statusId: base.id, mode: 'indeterminate' })).toThrow(/distinct/);
    for (const label of ['', ' ', 'x'.repeat(241), 'line\nline', undefined]) expect(() => unsafe({ ...base, label, mode: 'indeterminate' })).toThrow(/label/);
    for (const statusText of ['', ' ', 'x'.repeat(2001), '\x00', undefined]) expect(() => unsafe({ ...base, statusText, mode: 'indeterminate' })).toThrow(/statusText/);
    expect(() => unsafe({ ...base, state: 'submitted', mode: 'indeterminate' })).toThrow(/state/);
    expect(() => unsafe({ ...base, mode: 'meter' })).toThrow(/mode/);
    for (const valueText of ['', 'x'.repeat(321), 'line\nline', null]) expect(() => unsafe({ ...base, mode: 'indeterminate', valueText })).toThrow(/valueText/);
  });

  it('bounds additional tokens and rejects inappropriate flags/options without executing getters', () => {
    for (const describedBy of [base.id, 'bad"id', 'x'.repeat(129), 'x'.repeat(8193), Array(65).fill('hint').join(' '), Array.from({ length: 33 }, (_, i) => `h${i}`).join(' '), null]) expect(() => unsafe({ ...base, mode: 'indeterminate', describedBy })).toThrow(/describedBy/);
    for (const animated of ['true', 1, null]) expect(() => unsafe({ ...base, mode: 'indeterminate', animated })).toThrow(/animated/);
    expect(() => unsafe({ ...base, mode: 'indeterminate', reducedMotion: 'true' })).toThrow(/reducedMotion/);
    expect(() => unsafe({ ...base, mode: 'indeterminate', statusAnnouncement: 'always' })).toThrow(/statusAnnouncement/);
    expect(() => unsafe({ ...base, mode: 'indeterminate', elapsedSeconds: 20 })).toThrow(/unknown/);
    let reads = 0; expect(() => unsafe({ ...base, mode: 'indeterminate', get valueText() { reads++; return 'Fake'; } })).toThrow(/accessors/); expect(reads).toBe(0);
    for (const input of [null, [], new Date(), Object.create(base), { ...base, mode: 'indeterminate', [Symbol('extra')]: true }]) expect(() => unsafe(input)).toThrow();
  });

  it('limits original CSS decoration to an explicit busy guard with reduced-motion/forced-color fallbacks', () => {
    expect(css).toContain("[data-lg-task-state='busy'][data-lg-task-mode='indeterminate'][data-lg-task-motion='animate']");
    expect(css).toContain('transform: rotate(1turn)'); expect(css).toContain('prefers-reduced-motion'); expect(css).toContain('forced-colors');
    expect(css).toContain('appearance: auto'); expect(css).toContain('.lg-task-bar[hidden], .lg-task-indicator[hidden] { display: none; }');
    expect(css).not.toMatch(/backdrop-filter\s*:|@import|url\(|transition\s*:|\bleft\s*:|\btop\s*:/);
  });
});
