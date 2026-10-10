import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlass, attachGlassMotion, getGlassInnerRadius, getGlassProps } from '../src/index.js';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });
function pointer(type: string, id: number, primary = true) {
  const event = new MouseEvent(type, { button: 0, bubbles: true, cancelable: true, clientX: 25, clientY: 25 });
  Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' }, isPrimary: { value: primary } });
  return event;
}
function surface(tag = 'button') {
  const element = document.createElement(tag); document.body.append(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 60 } as DOMRect);
  return element;
}

describe.each([
  { name: 'material', attach: (element: HTMLElement) => attachGlass(element, { interactive: true }), attribute: 'data-lg-pressed' },
  { name: 'spring motion', attach: (element: HTMLElement) => attachGlassMotion(element), attribute: 'data-lg-motion-pressed' },
])('$name mobile input ownership', ({ attach, attribute }) => {
  it('ignores a second finger and unrelated release, and cancels the owning pointer without blocking native input', () => {
    const element = surface(); const controller = attach(element);
    const initial = pointer('pointerdown', 7); expect(element.dispatchEvent(initial)).toBe(true);
    expect(initial.defaultPrevented).toBe(false); expect(element.getAttribute(attribute)).toBe('true');
    element.dispatchEvent(pointer('pointerdown', 8, false));
    window.dispatchEvent(pointer('pointerup', 8, false));
    expect(element.getAttribute(attribute)).toBe('true');
    // A keyboard release must not cancel another input modality's press.
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    expect(element.getAttribute(attribute)).toBe('true');
    const cancellation = pointer('pointercancel', 7); window.dispatchEvent(cancellation);
    expect(cancellation.defaultPrevented).toBe(false); expect(element.hasAttribute(attribute)).toBe(false);
    element.dispatchEvent(pointer('pointerdown', 9, false)); expect(element.hasAttribute(attribute)).toBe(false);
    element.dispatchEvent(pointer('pointerdown', 10)); expect(element.getAttribute(attribute)).toBe('true');
    element.dispatchEvent(pointer('lostpointercapture', 10)); expect(element.hasAttribute(attribute)).toBe(false);
    controller.destroy(); element.dispatchEvent(pointer('pointerdown', 11)); expect(element.hasAttribute(attribute)).toBe(false);
  });
  it('animates a control when its icon is tapped, but never deforms the containing surface', () => {
    const card = surface('div'); const button = document.createElement('button'); const icon = document.createElement('span');
    button.append(icon); card.append(button); const parent = attach(card); const child = attach(button);
    const click = vi.fn(); button.addEventListener('click', click);
    icon.dispatchEvent(pointer('pointerdown', 3));
    expect(button.getAttribute(attribute)).toBe('true'); expect(card.hasAttribute(attribute)).toBe(false);
    window.dispatchEvent(pointer('pointerup', 3)); button.click(); expect(click).toHaveBeenCalledOnce();
    const slider = document.createElement('input'); slider.type = 'range'; card.append(slider);
    const move = pointer('pointerdown', 4); expect(slider.dispatchEvent(move)).toBe(true);
    expect(card.hasAttribute(attribute)).toBe(false); expect(move.defaultPrevented).toBe(false);
    parent.destroy(); child.destroy();
  });
  it('keeps matching keyboard ownership and clears on window blur', () => {
    const element = surface(); const controller = attach(element);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    expect(element.getAttribute(attribute)).toBe('true');
    window.dispatchEvent(pointer('pointerup', 99)); expect(element.getAttribute(attribute)).toBe('true');
    window.dispatchEvent(new Event('blur')); expect(element.hasAttribute(attribute)).toBe(false);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })); expect(element.hasAttribute(attribute)).toBe(false);
    controller.destroy();
  });
});

describe('corner configuration', () => {
  it('keeps SSR output deterministic and restores authored corner attributes', () => {
    expect(getGlassProps()['data-lg-corner']).toBe('round');
    expect(getGlassProps({ corner: 'continuous' })['data-lg-corner']).toBe('continuous');
    const element = surface('div'); element.setAttribute('data-lg-corner', 'authored');
    const controller = attachGlass(element, { corner: 'continuous' });
    expect(element.getAttribute('data-lg-corner')).toBe('continuous');
    controller.update({}); expect(element.getAttribute('data-lg-corner')).toBe('round');
    controller.destroy(); expect(element.getAttribute('data-lg-corner')).toBe('authored');
  });
  it('calculates a non-negative inner circular radius and bounds invalid inputs', () => {
    expect(getGlassInnerRadius(28, 8)).toBe(20);
    expect(getGlassInnerRadius(8, 28)).toBe(0);
    expect(getGlassInnerRadius(NaN, Infinity)).toBe(0);
    expect(getGlassInnerRadius(-2, -8)).toBe(0);
    expect(getGlassInnerRadius(2000, 1)).toBe(998);
  });
});
