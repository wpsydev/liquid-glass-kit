// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { getGlassFieldProps } from '../src/field.js';
import type { GlassFieldOptions, GlassFieldProps } from '../src/field.js';

const base: GlassFieldOptions = { id: 'deploy-url', label: 'Deployment URL' };
const unsafe = (options: unknown) => getGlassFieldProps(options as GlassFieldOptions);
const css = readFileSync(new URL('../src/field.css', import.meta.url), 'utf8');
const render = (props: GlassFieldProps, tag: 'input' | 'textarea' | 'select' = 'input') => renderToStaticMarkup(createElement('div', props.field,
  createElement('label', props.label.props, props.label.text),
  createElement('div', props.group,
    createElement(tag, { ...props.control, name: 'deployment', required: true, ...(tag === 'input' ? { type: 'url', autoComplete: 'url', defaultValue: 'https://example.test' } : {}) },
      tag === 'select' ? createElement('option', { value: 'preview' }, 'Preview') : undefined),
    createElement('button', { type: 'button', 'data-lg-field-addon': 'inline-end' }, 'Check')),
  props.description ? createElement('p', props.description.props, props.description.text) : null,
  props.error ? createElement('p', props.error.props, props.error.text) : null));

describe('pure native field semantics', () => {
  it('is SSR-safe and deterministic without default invalid, busy or described-by state', () => {
    expect(typeof document).toBe('undefined'); expect(typeof window).toBe('undefined');
    const props = getGlassFieldProps(base);
    expect(props).toEqual({ field: { className: 'lg-form-field' }, group: { className: 'lg-form-input-group' },
      control: { id: 'deploy-url', className: 'lg-form-control' }, label: { props: { className: 'lg-form-label', htmlFor: 'deploy-url' }, text: 'Deployment URL' },
      description: null, error: null });
    expect(props).toEqual(getGlassFieldProps(base));
    expect(props.control).not.toHaveProperty('aria-invalid');
    expect(props.control).not.toHaveProperty('aria-busy');
  });

  it('connects native labels and rendered help/error IDs for input, textarea and select', () => {
    const props = getGlassFieldProps({ ...base, description: 'Use an HTTPS endpoint', error: 'That address is not available', errorAnnouncement: 'polite' });
    for (const tag of ['input', 'textarea', 'select'] as const) {
      const dom = new JSDOM(render(props, tag));
      const control = dom.window.document.querySelector(tag)! as HTMLInputElement;
      const label = dom.window.document.querySelector('label')!;
      expect(control.labels?.[0]).toBe(label); expect(label.control).toBe(control);
      expect(control.getAttribute('aria-invalid')).toBe('true');
      const references = control.getAttribute('aria-describedby')!.split(' ');
      expect(references.map(id => dom.window.document.getElementById(id)?.textContent)).toEqual(['Use an HTTPS endpoint', 'That address is not available']);
      expect(control.previousElementSibling).toBeNull();
      expect(control.nextElementSibling?.tagName).toBe('BUTTON');
      expect(dom.window.document.querySelector('[role=status]')?.textContent).toBe('That address is not available');
      expect(new Set([...dom.window.document.querySelectorAll('[id]')].map(node => node.id)).size).toBe(3);
      dom.window.close();
    }
  });

  it('merges external hints once and removes only its reserved stale references', () => {
    const first = getGlassFieldProps({ ...base, describedBy: 'format-hint format-hint\tpolicy-hint', description: 'HTTPS only', error: 'Check hostname' });
    expect(first.control['aria-describedby']).toBe('format-hint policy-hint deploy-url--description deploy-url--error');
    const cleared = getGlassFieldProps({ ...base, describedBy: first.control['aria-describedby'], description: 'HTTPS only', invalid: false });
    expect(cleared.control['aria-describedby']).toBe('format-hint policy-hint deploy-url--description');
    expect(cleared.control['aria-invalid']).toBe(false); expect(cleared.error).toBeNull();
    const noHelp = getGlassFieldProps({ ...base, describedBy: cleared.control['aria-describedby'] });
    expect(noHelp.control['aria-describedby']).toBe('format-hint policy-hint');
    expect(noHelp.control).not.toHaveProperty('aria-invalid');
    const noExternal = getGlassFieldProps({ ...base, describedBy: 'deploy-url--description deploy-url--error' });
    expect(noExternal.control).not.toHaveProperty('aria-describedby');
  });

  it('supports bounded round-trip merges including all 32 unrelated hints', () => {
    const unrelated = Array.from({ length: 32 }, (_, index) => `hint-${index}`).join(' ');
    const props = getGlassFieldProps({ ...base, describedBy: unrelated, description: 'Help', error: 'Error' });
    expect(props.control['aria-describedby']?.split(' ')).toHaveLength(34);
    expect(getGlassFieldProps({ ...base, describedBy: props.control['aria-describedby'], description: 'Help', error: 'Error' })).toEqual(props);
    expect(getGlassFieldProps({ ...base, describedBy: props.control['aria-describedby'] }).control['aria-describedby']).toBe(unrelated);
  });

  it('does not replace accessible names, values, validation rules or native constraint attributes', () => {
    const props = getGlassFieldProps({ ...base, invalid: true, busy: true });
    expect(props.control).toEqual({ id: base.id, className: 'lg-form-control', 'aria-invalid': true, 'aria-busy': true });
    const dom = new JSDOM(render(props));
    const input = dom.window.document.querySelector('input')!;
    expect(input.type).toBe('url'); expect(input.name).toBe('deployment'); expect(input.required).toBe(true);
    expect(input.autocomplete).toBe('url'); expect(input.value).toBe('https://example.test');
    expect(input.disabled).toBe(false); expect(input.readOnly).toBe(false);
    input.setCustomValidity('Host server rejected this domain');
    getGlassFieldProps({ ...base, invalid: false, busy: false });
    expect(input.validationMessage).toBe('Host server rejected this domain');
    for (const key of ['value', 'defaultValue', 'type', 'required', 'disabled', 'readOnly', 'aria-label', 'aria-labelledby', 'onInput', 'onBlur']) expect(props.control).not.toHaveProperty(key);
    expect(props.field).toMatchObject({ 'data-lg-field-invalid': 'true', 'data-lg-field-busy': 'true' });
    dom.window.close();
  });

  it('sets explicit false states, while omitted state leaves authored choices to the host', () => {
    const props = getGlassFieldProps({ ...base, invalid: false, busy: false });
    expect(props.control).toMatchObject({ 'aria-invalid': false, 'aria-busy': false });
    expect(props.group).toMatchObject({ 'data-lg-field-invalid': 'false', 'data-lg-field-busy': 'false' });
    expect(getGlassFieldProps({ ...base, error: 'Invalid address' }).control['aria-invalid']).toBe(true);
    expect(() => getGlassFieldProps({ ...base, error: 'Invalid address', invalid: false })).toThrow(/conflicts/);
  });

  it.each([['off', undefined], ['polite', 'status'], ['assertive', 'alert']] as const)('requires explicit %s announcement mode without duplicate live attributes', (errorAnnouncement, role) => {
    const props = getGlassFieldProps({ ...base, error: 'Enter a valid URL', errorAnnouncement });
    expect(props.error?.props.role).toBe(role);
    expect(props.error?.props['aria-atomic']).toBe(role ? true : undefined);
    expect(props.error?.props).not.toHaveProperty('aria-live');
    expect(props.control).not.toHaveProperty('aria-errormessage');
    expect(getGlassFieldProps({ ...base, errorAnnouncement }).error).toBeNull();
  });

  it('renders multiline host messages and literal hostile-looking text as escaped content', () => {
    const props = getGlassFieldProps({ ...base, label: '<script>label</script>', description: 'First line\nSecond line', error: '<img src=x onerror=alert(1)>\nTry again' });
    expect(props.error?.text).toBe('<img src=x onerror=alert(1)>\nTry again');
    const html = render(props);
    expect(html).toContain('&lt;script&gt;label&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img ');
    expect(props.error?.props).not.toHaveProperty('dangerouslySetInnerHTML');
  });

  it('uses stable host IDs across independent calls and adapters without document-global counters', () => {
    const first = getGlassFieldProps({ ...base, id: ':r0:', description: 'Helpful context' });
    getGlassFieldProps({ ...base, id: 'other-field', error: 'Other error' });
    expect(getGlassFieldProps({ ...base, id: ':r0:', description: 'Helpful context' })).toEqual(first);
    expect(first.label.props.htmlFor).toBe(':r0:');
    expect(first.description?.props.id).toBe(':r0:--description');
  });

  it('returns detached frozen snapshots without freezing host options', () => {
    const options = { ...base, description: 'Original help' }; const props = getGlassFieldProps(options);
    options.description = 'New help';
    expect(props.description?.text).toBe('Original help'); expect(Object.isFrozen(options)).toBe(false);
    for (const object of [props, props.control, props.field, props.group, props.label, props.label.props, props.description, props.description?.props]) expect(Object.isFrozen(object)).toBe(true);
    expect(() => { (props.control as { id: string }).id = 'replacement'; }).toThrow();
  });
});

describe('field bounds and explicit host responsibilities', () => {
  it.each(['', 'with space', 'quote"', 'angle<', 'é', 'x'.repeat(129), undefined, null, 10])('rejects invalid stable ID %s', id => {
    expect(() => unsafe({ ...base, id })).toThrow(/id/);
  });

  it.each(['', ' ', 'x'.repeat(241), 'two\nlines', '\x00', undefined, null])('requires an explicit bounded visible label %s', label => {
    expect(() => unsafe({ ...base, label })).toThrow(/label/);
  });

  it.each(['', ' ', 'x'.repeat(2001), 'null\x00byte', null, 1])('rejects invalid help/error content %s', content => {
    expect(() => unsafe({ ...base, description: content })).toThrow(/description/);
    expect(() => unsafe({ ...base, error: content })).toThrow(/error/);
  });

  it.each(['true', 1, null, NaN])('rejects nonboolean state %s', state => {
    expect(() => unsafe({ ...base, invalid: state })).toThrow(/invalid/);
    expect(() => unsafe({ ...base, busy: state })).toThrow(/busy/);
  });

  it('bounds description tokens and rejects a self-description or invalid announcement', () => {
    for (const describedBy of ['quote"', 'hint\x00other', 'x'.repeat(8193), Array(65).fill('hint').join(' '), Array.from({ length: 33 }, (_, i) => `h${i}`).join(' '), 'x'.repeat(148), base.id, null, []]) expect(() => unsafe({ ...base, describedBy })).toThrow(/describedBy/);
    expect(getGlassFieldProps({ ...base, describedBy: ' \t\n\r\f ' }).control).not.toHaveProperty('aria-describedby');
    expect(() => unsafe({ ...base, errorAnnouncement: 'always' })).toThrow(/errorAnnouncement/);
  });

  it('rejects accessors and unsupported native attribute bags without executing getters', () => {
    let reads = 0;
    const options = { ...base, get error() { reads++; return 'Error'; } };
    expect(() => getGlassFieldProps(options)).toThrow(/accessors/); expect(reads).toBe(0);
    expect(() => unsafe(Object.create(base))).toThrow(/plain object/);
    for (const options of [null, [], new Date(), { ...base, value: 'overwrite' }, { ...base, [Symbol('extra')]: true }]) expect(() => unsafe(options)).toThrow();
    expect(getGlassFieldProps(Object.assign(Object.create(null), base))).toEqual(getGlassFieldProps(base));
  });

  it('keeps direct native addon buttons at the touch minimum despite the generic addon rule', () => {
    const dom = new JSDOM('<!doctype html><style>' + css + '</style><div class="lg-form-input-group"><input class="lg-form-control"><button type="button" data-lg-field-addon="inline-end">Help</button></div>');
    const button = dom.window.document.querySelector('button')!;
    const style = dom.window.getComputedStyle(button);
    expect(style.minInlineSize).toBe('44px');
    expect(style.minBlockSize).toBe('44px');
    dom.window.close();
  });

  it('scopes mobile sizing, native focus, logical addons and fallbacks without a material/animation runtime', () => {
    expect(css).toContain('min-block-size: 44px'); expect(css).toContain('min-inline-size: 44px');
    expect(css).toContain('font-size: max(16px, 1em)'); expect(css).toContain('outline: 2px solid');
    expect(css).toContain(':focus-within'); expect(css).toContain("[data-lg-field-addon='inline-start']");
    expect(css).toContain('prefers-reduced-motion'); expect(css).toContain('prefers-reduced-transparency'); expect(css).toContain('forced-colors');
    expect(css).not.toMatch(/backdrop-filter\s*:|@import|url\(|\border\s*:|animation\s*:/);
  });
});
