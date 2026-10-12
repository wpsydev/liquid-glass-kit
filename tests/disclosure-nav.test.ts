import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassDisclosureNav } from '../src/disclosure-nav.js';
import type { GlassDisclosureNavOptions } from '../src/disclosure-nav.js';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function fixture(extra: Partial<GlassDisclosureNavOptions> = {}) {
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Study navigation');
  nav.innerHTML = '<button type="button" id="products">Products</button><section id="products-panel"><h2>Products</h2><a href="/materials">Materials</a><form><label>Search<input name="search" value="preserve"></label><button>Find</button></form></section><button type="button" id="resources">Resources</button><section id="resources-panel"><a href="/docs">Documentation</a></section><a href="/pricing">Pricing</a>';
  const outside = document.createElement('button'); outside.type = 'button'; outside.textContent = 'Outside'; document.body.append(nav, outside);
  const triggers = [...nav.querySelectorAll<HTMLButtonElement>('button[type=button]')], panels = [...nav.querySelectorAll<HTMLElement>('section')];
  const items = triggers.map((trigger, index) => ({ trigger, panel: panels[index], id: index === 0 ? 'products' : 'resources' }));
  const onChange = vi.fn(); const controller = attachGlassDisclosureNav(nav, { items, onChange, ...extra });
  return { nav, outside, triggers, panels, items, controller, onChange, link: panels[0].querySelector('a')!, input: panels[0].querySelector('input')! };
}
function key(target: EventTarget, value = 'Escape', extra: KeyboardEventInit = {}) { const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...extra }); target.dispatchEvent(event); return event; }
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('optional ordinary navigation disclosures', () => {
  it('preserves authored links, native forms, source order and roles; creates no menu roles', () => {
    const { nav, items, controller, panels, triggers, input } = fixture();
    const order = [...nav.childNodes]; expect(nav.querySelector('[role=menu],[role=menubar],[role=menuitem]')).toBeNull();
    expect(triggers[0].getAttribute('aria-controls')).toBe(panels[0].id); expect(triggers[0].getAttribute('aria-expanded')).toBe('false'); expect(panels.every(panel => panel.hidden)).toBe(true);
    controller.open('products'); input.value = 'new local query'; controller.destroy();
    expect([...nav.childNodes]).toEqual(order); expect(input.value).toBe('new local query'); expect(panels.every(panel => !panel.hidden)).toBe(true);
    expect(nav.getAttribute('aria-label')).toBe('Study navigation'); expect(items[0].trigger.type).toBe('button'); expect(panels[0].querySelector('form button')?.getAttribute('type')).toBeNull();
    expect(nav.hasAttribute('data-lg-disclosure-nav')).toBe(false); expect(triggers[0].hasAttribute('aria-expanded')).toBe(false);
  });
  it('uses native clicks including coarse touch activation and coordinates one open panel', () => {
    const { triggers, panels, controller, onChange } = fixture();
    triggers[0].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); expect(controller.openId).toBe('products'); expect(panels[0].hidden).toBe(false);
    triggers[1].click(); expect(controller.openId).toBe('resources'); expect(panels[0].hidden).toBe(true); expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    triggers[1].click(); expect(controller.openId).toBeNull(); expect(panels[1].hidden).toBe(true); expect(onChange.mock.calls.map(args => args[0].reason)).toEqual(['trigger', 'trigger', 'trigger']);
  });
  it('leaves Enter, Space, Tab and arrows to native controls and normal link navigation', () => {
    const { triggers, controller, link } = fixture();
    for (const value of ['Enter', ' ', 'ArrowDown', 'ArrowLeft', 'Tab']) expect(key(triggers[0], value).defaultPrevented).toBe(false);
    expect(controller.openId).toBeNull(); controller.open('products'); link.focus(); expect(key(link, 'ArrowDown').defaultPrevented).toBe(false); expect(document.activeElement).toBe(link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true }); link.addEventListener('click', event => event.preventDefault(), { once: true }); link.dispatchEvent(click); expect(controller.openId).toBe('products');
  });
  it('honors default-prevented clicks and disabled/aria-disabled native triggers', () => {
    const { triggers, controller } = fixture();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true }); event.preventDefault(); triggers[0].dispatchEvent(event); expect(controller.openId).toBeNull();
    triggers[0].disabled = true; expect(controller.open('products')).toBe(false); triggers[0].disabled = false; triggers[0].setAttribute('aria-disabled', 'true'); triggers[0].click(); expect(controller.openId).toBeNull();
  });
  it('rescues focused panel content on Escape and does not steal unrelated header/outside focus', () => {
    const { triggers, panels, controller, link, outside, nav } = fixture(); controller.open('products'); link.focus();
    expect(key(link).defaultPrevented).toBe(true); expect(controller.openId).toBeNull(); expect(document.activeElement).toBe(triggers[0]); expect(panels[0].hidden).toBe(true);
    controller.open('products'); const pricing = nav.querySelector<HTMLAnchorElement>('a[href="/pricing"]')!; pricing.focus(); expect(key(pricing).defaultPrevented).toBe(false); expect(controller.openId).toBe('products');
    outside.focus(); expect(key(outside).defaultPrevented).toBe(false); expect(document.activeElement).toBe(outside);
  });
  it('ignores composing, modified and already prevented Escape', () => {
    const { controller, link } = fixture(); controller.open('products'); link.focus();
    expect(key(link, 'Escape', { isComposing: true }).defaultPrevented).toBe(false); expect(key(link, 'Escape', { ctrlKey: true }).defaultPrevented).toBe(false);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); event.preventDefault(); link.dispatchEvent(event); expect(controller.openId).toBe('products');
  });
  it('does not consume a nested native modal Escape or close that modal', () => {
    const { panels, controller } = fixture(); const modal = document.createElement('dialog'); modal.open = true; modal.innerHTML = '<input>'; panels[0].append(modal); controller.open('products');
    const input = modal.querySelector('input')!; input.focus(); expect(key(input).defaultPrevented).toBe(false); expect(controller.openId).toBe('products'); expect(modal.open).toBe(true);
  });
  it('allows disclosure Escape when the navigation itself is inside an authored modal', () => {
    const { nav, link, controller, triggers } = fixture(); const modal = document.createElement('dialog'); modal.open = true; document.body.append(modal); modal.append(nav); controller.open('products'); link.focus();
    expect(key(link).defaultPrevented).toBe(true); expect(controller.openId).toBeNull(); expect(modal.open).toBe(true); expect(document.activeElement).toBe(triggers[0]);
  });
  it('closes after native focus leaves the host without changing the new focus', async () => {
    const { controller, link, input, outside, onChange } = fixture(); controller.open('products'); link.focus(); input.focus(); await flush(); expect(controller.openId).toBe('products');
    outside.focus(); await flush(); expect(controller.openId).toBeNull(); expect(document.activeElement).toBe(outside); expect(onChange).toHaveBeenLastCalledWith({ openId: null, reason: 'focus-leave' });
  });
  it('can retain focus-leave/outside state by explicit host configuration', async () => {
    const { controller, link, outside } = fixture({ closeOnFocusLeave: false, closeOnOutside: false }); controller.open('products'); link.focus(); outside.focus(); outside.click(); await flush(); expect(controller.openId).toBe('products');
  });
  it('closes on outside clicks, preserving outside focus or rescuing a stranded panel focus', () => {
    const { controller, link, triggers, outside } = fixture({ closeOnFocusLeave: false }); controller.open('products'); link.focus(); outside.focus(); outside.click(); expect(controller.openId).toBeNull(); expect(document.activeElement).toBe(outside);
    controller.open('products'); link.focus(); document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })); expect(document.activeElement).toBe(triggers[0]); expect(controller.openId).toBeNull();
  });
  it('honors default-prevented outside clicks and removes global listeners when closed', () => {
    const add = vi.spyOn(document, 'addEventListener'), remove = vi.spyOn(document, 'removeEventListener'); const { controller, outside } = fixture();
    expect(add.mock.calls.some(args => args[0] === 'keydown')).toBe(false); controller.open('products'); const event = new MouseEvent('click', { bubbles: true, cancelable: true }); event.preventDefault(); outside.dispatchEvent(event); expect(controller.openId).toBe('products');
    controller.close(); expect(remove.mock.calls.some(args => args[0] === 'keydown')).toBe(true); expect(key(outside).defaultPrevented).toBe(false);
  });
  it('uses explicit matchMedia matches=compact, closes on change and cleans listeners', () => {
    const media = Object.assign(new EventTarget(), { matches: false, media: '(max-width: 640px)' }); const remove = vi.spyOn(media, 'removeEventListener'); vi.stubGlobal('matchMedia', vi.fn(() => media));
    const { controller, nav, link, triggers } = fixture({ responsiveQuery: '(max-width: 640px)' }); expect(nav.dataset.lgNavMode).toBe('expanded'); controller.open('products'); link.focus();
    media.matches = true; media.dispatchEvent(new Event('change')); expect(nav.dataset.lgNavMode).toBe('compact'); expect(controller.openId).toBeNull(); expect(document.activeElement).toBe(triggers[0]); controller.destroy(); expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  });
  it('refresh rescues to another visible trigger after a trigger hides or disables', () => {
    const { controller, link, triggers } = fixture(); controller.open('products'); link.focus(); triggers[0].hidden = true; controller.refresh(); expect(controller.openId).toBeNull(); expect(document.activeElement).toBe(triggers[1]);
    triggers[0].hidden = false; controller.open('products'); link.focus(); triggers[0].disabled = true; controller.refresh(); expect(document.activeElement).toBe(triggers[1]); expect(controller.open('products')).toBe(false);
  });
  it('uses an explicit visible host fallback when the whole navigation hides', () => {
    const fallback = document.createElement('button'); document.body.append(fallback); const { controller, nav, link } = fixture({ focusFallback: fallback }); controller.open('products'); link.focus(); nav.hidden = true; controller.refresh(); expect(controller.openId).toBeNull(); expect(document.activeElement).toBe(fallback);
  });
  it('refresh closes disconnected panels and does not poll geometry or animation frames', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect'); const { controller, panels, triggers } = fixture();
    controller.open('products'); panels[0].remove(); controller.refresh(); expect(controller.openId).toBeNull(); expect(controller.open('products')).toBe(false); triggers[1].click(); controller.close(); controller.destroy(); expect(raf).not.toHaveBeenCalled(); expect(rect).not.toHaveBeenCalled();
  });
  it('generates stable document-unique panel IDs and restores their absent authored attributes', () => {
    const { controller, items, panels } = fixture(); controller.destroy(); panels[0].removeAttribute('id'); panels[1].removeAttribute('id'); const next = attachGlassDisclosureNav(items[0].trigger.closest('nav')!, { items: items.map(({ trigger, panel }) => ({ trigger, panel })) });
    const id = panels[0].id; expect(id).toMatch(/^lg-nav-/); expect(panels[1].id).not.toBe(id); expect(next.open(id)).toBe(true); next.update({ items: items.map(({ trigger, panel }) => ({ trigger, panel })) }); expect(panels[0].id).toBe(id); next.destroy(); expect(panels[0].hasAttribute('id')).toBe(false);
  });
  it('rejects malformed, duplicate, nested, foreign, shared and wrong button type pairs before mutation', () => {
    const { controller, nav, items, panels, triggers } = fixture(); controller.destroy(); const before = nav.outerHTML;
    for (const replacement of [{ items: [] }, { items: Array(33).fill(items[0]) }, { items: [items[0], items[0]] }, { items: [{ ...items[0], id: '' }] }, { items: [{ ...items[0], id: 'two ids' }] }]) expect(() => attachGlassDisclosureNav(nav, replacement)).toThrow();
    expect(nav.outerHTML).toBe(before); triggers[0].type = 'submit'; expect(() => attachGlassDisclosureNav(nav, { items })).toThrow('type=button'); triggers[0].type = 'button';
    panels[0].append(triggers[1], panels[1]); expect(() => attachGlassDisclosureNav(nav, { items })).toThrow('disjoint');
  });
  it('rejects duplicate authored DOM IDs, empty media queries and multiple host attachments', () => {
    const { controller, nav, items } = fixture(); expect(() => attachGlassDisclosureNav(nav, { items })).toThrow('existing'); controller.destroy();
    const duplicate = document.createElement('div'); duplicate.id = items[0].panel.id; document.body.append(duplicate); expect(() => attachGlassDisclosureNav(nav, { items })).toThrow('document-unique'); duplicate.remove();
    expect(() => attachGlassDisclosureNav(nav, { items, responsiveQuery: '' })).toThrow('nonempty');
  });
  it('keeps update validation transactional and ignores mutation of the source item array', () => {
    const { controller, items, nav, panels } = fixture(); controller.open('products'); expect(() => controller.update({ items: [] })).toThrow(); expect(controller.openId).toBe('products'); expect(panels[0].hidden).toBe(false);
    const copy = [...items]; controller.update({ items: copy }); copy.length = 0; expect(controller.open('products')).toBe(true); expect(nav.querySelectorAll('[data-lg-nav-trigger]')).toHaveLength(2);
  });
  it('restores only attributes still owned, leaving later host edits intact', () => {
    const { controller, nav, triggers, panels } = fixture(); controller.open('products'); triggers[0].setAttribute('aria-expanded', 'host-state'); triggers[0].setAttribute('aria-controls', 'host-controls'); panels[0].setAttribute('hidden', 'until-found'); nav.setAttribute('data-lg-nav-mode', 'host-mode');
    controller.destroy(); expect(triggers[0].getAttribute('aria-expanded')).toBe('host-state'); expect(triggers[0].getAttribute('aria-controls')).toBe('host-controls'); expect(panels[0].getAttribute('hidden')).toBe('until-found'); expect(nav.dataset.lgNavMode).toBe('host-mode');
  });
  it('reports callback errors without breaking state, update or teardown', () => {
    const error = new Error('host callback'); const { controller, nav } = fixture({ onChange() { throw error; } }); const report = vi.fn(); nav.addEventListener('lg-nav-error', report);
    expect(() => controller.open('products')).not.toThrow(); expect(controller.openId).toBe('products'); expect(report).toHaveBeenCalledOnce(); expect((report.mock.calls[0][0] as CustomEvent).detail.error).toBe(error); expect(() => controller.destroy()).not.toThrow(); expect(nav.hasAttribute('data-lg-disclosure-nav')).toBe(false);
  });
  it('does not leak responsive attributes when a host callback tears down during a mode change', () => {
    const media = Object.assign(new EventTarget(), { matches: false }); vi.stubGlobal('matchMedia', vi.fn(() => media));
    const { controller, items, nav } = fixture(); controller.update({ items, responsiveQuery: '(max-width: 640px)', onChange(state) { if (state.reason === 'responsive') controller.destroy(); } });
    controller.open('products'); media.matches = true; media.dispatchEvent(new Event('change'));
    expect(nav.hasAttribute('data-lg-nav-mode')).toBe(false); expect(nav.hasAttribute('data-lg-disclosure-nav')).toBe(false);
  });
  it('cancels queued focus-leave work on close/reopen/destroy and makes teardown idempotent', async () => {
    const { controller, link, outside, triggers, items } = fixture(); controller.open('products'); link.focus(); outside.focus(); controller.close(); controller.open('resources'); await flush(); expect(controller.openId).toBe('resources');
    controller.destroy(); controller.destroy(); controller.update({ items }); expect(controller.open('products')).toBe(false); expect(controller.close()).toBe(false); triggers[0].click(); expect(triggers[0].hasAttribute('aria-expanded')).toBe(false);
  });
});
