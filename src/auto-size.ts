import { bounded } from './numeric.js';
import { listen } from './lifecycle.js';

export interface GlassAutoSizeOptions { duration?: number; reducedMotion?: boolean }
export type GlassAutoSizeReason = 'finished' | 'unchanged' | 'reduced-motion' | 'focus' | 'unsupported' | 'resize' | 'hidden' | 'cancelled' | 'retargeted' | 'detached' | 'invalid-layout' | 'destroyed' | 'external-owner' | 'native-failed';
export interface GlassAutoSizeResult { readonly completed: boolean; readonly reason: GlassAutoSizeReason; readonly error?: unknown }
export interface GlassAutoSize {
  /** Host commits actual DOM first; asynchronous renderers call this after their commit. */
  refresh(): Promise<GlassAutoSizeResult>;
  finish(): boolean;
  cancel(): boolean;
  update(options?: GlassAutoSizeOptions): void;
  destroy(): void;
}
type Size = { border: number; css: number; contentWidth: number; contentHeight: number };
type Lease = { value: string; priority: string; owns(): boolean; write(value: string, priority?: string): boolean; restore(): void };
function style(element: HTMLElement, key: string): Lease {
  const value = element.style.getPropertyValue(key), priority = element.style.getPropertyPriority(key); let current = value, importance = priority, lost = false;
  const owns = () => !lost && element.style.getPropertyValue(key) === current && element.style.getPropertyPriority(key) === importance;
  return { value, priority, owns, write(next, nextPriority = '') { if (!owns()) { lost = true; return false; } next ? element.style.setProperty(key, next, nextPriority) : element.style.removeProperty(key); current = element.style.getPropertyValue(key); importance = element.style.getPropertyPriority(key); return true; }, restore() { if (!owns()) { lost = true; return; } if (current !== value || importance !== priority) value ? element.style.setProperty(key, value, priority) : element.style.removeProperty(key); current = value; importance = priority; } };
}
const attached = new WeakSet<HTMLElement>();
const resolve = (input: GlassAutoSizeOptions) => ({ duration: bounded(input.duration, 220, 0, 600), reducedMotion: Boolean(input.reducedMotion) });
const result = (completed: boolean, reason: GlassAutoSizeReason, error?: unknown): GlassAutoSizeResult => Object.freeze({ completed, reason, ...(error === undefined ? {} : { error }) });

/**
 * Horizontal block-height transition on one untransformed natural frame/content
 * tree. Frame display must be flow-root; inner flow-root/grid/flex keeps child
 * margins/floats contained. Reserve height/block-size/transform timing on the frame;
 * inner must not percentage/stretch its height from the animated frame. Authored
 * min/max, padding, borders, box-sizing and overflow are retained. No content clone,
 * text scaling, business callback, disclosure/ARIA/focus management or clipping is
 * supplied. Focus within snaps. Observer-driven width/viewport resize snaps rather
 * than animating a keyboard/viewport reflow. At rest owned numeric sizes disappear.
 * Actual height animation incurs layout/paint; use a few panels, not huge streams.
 */
export function attachGlassAutoSize(frame: HTMLElement, content: HTMLElement, initial: GlassAutoSizeOptions = {}): GlassAutoSize {
  const doc = frame?.ownerDocument, view = doc?.defaultView;
  if (!view || !frame.isConnected || content?.ownerDocument !== doc || content.parentElement !== frame || frame.children.length !== 1 || attached.has(frame)) throw new Error('Use one connected natural frame and its sole direct content child');
  const browser = view, height = style(frame, 'height'), block = style(frame, 'block-size'), hadStyle = frame.hasAttribute('style');
  function validateLayout() {
    const shell = browser.getComputedStyle(frame), inner = browser.getComputedStyle(content);
    if (shell.display !== 'flow-root' || !['flow-root', 'grid', 'flex', 'inline-grid', 'inline-flex'].includes(inner.display) || (shell.writingMode && shell.writingMode !== 'horizontal-tb') || (inner.writingMode && inner.writingMode !== 'horizontal-tb')) throw new Error('Use horizontal flow-root frame and independent flow-root/grid/flex content');
    if ([height.value, block.value, content.style.height, content.style.blockSize].some(value => value && value !== 'auto')) throw new Error('Auto-size requires natural auto height/block-size, not authored fixed/percentage sizing');
    if ((shell.transform && shell.transform !== 'none') || (inner.transform && inner.transform !== 'none') || (shell.scale && shell.scale !== 'none' && shell.scale !== '1')) throw new Error('Auto-size requires untransformed dedicated frame/content geometry');
  }
  validateLayout();
  let options = resolve(initial), destroyed = false, abandoned = false, queued = false, observerWidthChange = false;
  let natural: Size | null = null, observedWidth = 0, observedHeight = 0;
  let active: { animation: Animation | null; endpoint: Size; resolve(value: GlassAutoSizeResult): void } | null = null;
  const media = browser.matchMedia?.('(prefers-reduced-motion: reduce)');
  const originalMarker = frame.getAttribute('data-lg-auto-size-active'); let ownedMarker = originalMarker;
  const marker = (value: string | null) => { ownedMarker = value; value === null ? frame.removeAttribute('data-lg-auto-size-active') : frame.setAttribute('data-lg-auto-size-active', value); };
  const restoreMarker = () => { if (frame.getAttribute('data-lg-auto-size-active') === ownedMarker) marker(originalMarker); };
  const connected = () => frame.isConnected && content.parentElement === frame && content.isConnected;
  const structure = () => frame.children.length === 1;
  const hidden = () => doc.hidden || Boolean(frame.closest('[hidden],[inert]'));
  const owns = () => height.owns() && block.owns();
  const reduced = () => options.reducedMotion || Boolean(media?.matches);
  const pixels = (value: string) => Number.parseFloat(value) || 0;
  function measure(): Size {
    const bounds = frame.getBoundingClientRect(), inner = content.getBoundingClientRect(), computed = browser.getComputedStyle(frame);
    const edges = computed.boxSizing === 'border-box' ? 0 : pixels(computed.paddingTop) + pixels(computed.paddingBottom) + pixels(computed.borderTopWidth) + pixels(computed.borderBottomWidth);
    return { border: Math.max(0, bounds.height), css: Math.max(0, bounds.height - edges), contentWidth: inner.width, contentHeight: inner.height };
  }
  function restore() { height.restore(); block.restore(); restoreMarker(); if (!hadStyle && !frame.getAttribute('style')) frame.removeAttribute('style'); }
  function stop(completed: boolean, reason: GlassAutoSizeReason, cache: Size | null = null, error?: unknown) {
    const task = active; active = null; mutation?.disconnect(); natural = cache ?? (completed ? task?.endpoint ?? null : null); restore(); try { task?.animation?.cancel(); } catch (failure) { error ??= failure; } task?.resolve(result(completed, reason, error)); return Boolean(task);
  }
  const Mutation = (browser as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
  const mutation = Mutation ? new Mutation(() => { if (!active) return; if (!connected()) stop(false, 'detached'); else if (hidden()) stop(false, 'hidden'); else if (!structure()) stop(false, 'invalid-layout'); else if (!owns()) { abandoned = true; stop(false, 'external-owner'); } }) : undefined;
  function refresh(snapReason?: GlassAutoSizeReason): Promise<GlassAutoSizeResult> {
    if (destroyed) return Promise.resolve(result(false, 'destroyed'));
    if (abandoned || !owns()) { abandoned = true; stop(false, 'external-owner'); return Promise.resolve(result(false, 'external-owner')); }
    if (!connected()) { stop(false, 'detached'); return Promise.resolve(result(false, 'detached')); }
    try { if (!structure()) throw new Error('Keep the sole direct natural content child'); validateLayout(); } catch (error) { stop(false, 'invalid-layout'); return Promise.resolve(result(false, 'invalid-layout', error)); }
    if (hidden()) { stop(false, 'hidden'); return Promise.resolve(result(false, 'hidden')); }
    const previous = active, before = previous ? measure() : natural;
    const previousEndpoint = previous?.endpoint;
    stop(false, previous ? 'retargeted' : 'unchanged');
    const endpoint = measure(); observedWidth = endpoint.contentWidth; observedHeight = endpoint.contentHeight;
    if (!before || Math.abs(before.border - endpoint.border) < .5 || (previousEndpoint && Math.abs(previousEndpoint.border - endpoint.border) < .5)) { natural = endpoint; return Promise.resolve(result(true, 'unchanged')); }
    const direct = snapReason ?? (reduced() || options.duration === 0 ? 'reduced-motion' : frame.contains(doc.activeElement) ? 'focus' : typeof frame.animate !== 'function' ? 'unsupported' : null);
    if (direct) { natural = endpoint; return Promise.resolve(result(true, direct)); }
    const fromCss = Math.max(0, before.border - endpoint.border + endpoint.css);
    block.write('auto'); height.write(`${fromCss}px`); marker('true');
    return new Promise<GlassAutoSizeResult>(resolve => {
      const task = { animation: null as Animation | null, endpoint, resolve }; active = task;
      try {
        task.animation = frame.animate([{ height: `${fromCss}px` }, { height: `${endpoint.css}px` }], { duration: options.duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
        mutation?.observe(doc, { childList: true, subtree: true }); mutation?.observe(frame, { attributes: true, attributeFilter: ['style', 'hidden', 'inert'] });
        for (let parent = frame.parentElement; parent; parent = parent.parentElement) mutation?.observe(parent, { attributes: true, attributeFilter: ['hidden', 'inert'] });
        void task.animation.finished.then(() => { if (active !== task) return; if (!connected()) stop(false, 'detached'); else if (!owns()) { abandoned = true; stop(false, 'external-owner'); } else stop(true, 'finished', endpoint); }, error => { if (active === task) stop(false, 'native-failed', null, error); });
      } catch (error) { if (active === task) stop(false, 'native-failed', null, error); }
    });
  }
  const Resize = (browser as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(entries => {
    if (destroyed || abandoned || !connected()) { if (active && !connected()) stop(false, 'detached'); return; }
    const entry = entries.find(value => value.target === content); if (!entry) return;
    const box = entry.borderBoxSize?.[0], width = box?.inlineSize ?? entry.contentRect.width, height = box?.blockSize ?? entry.contentRect.height;
    if (Math.abs(width - observedWidth) < .5 && Math.abs(height - observedHeight) < .5) return;
    observerWidthChange ||= Math.abs(width - observedWidth) >= .5; observedWidth = width; observedHeight = height;
    if (!queued) { queued = true; queueMicrotask(() => { queued = false; if (destroyed || abandoned) return; const widthChanged = observerWidthChange; observerWidthChange = false; void refresh(widthChanged ? 'resize' : undefined); }); }
  }) : undefined;
  const resized = () => { if (!destroyed && !abandoned) void refresh('resize'); };
  const focus = () => { if (active) stop(true, 'focus'); };
  const preference = () => { if (active && reduced()) stop(true, 'reduced-motion'); };
  const visibility = () => { if (doc.hidden) stop(false, 'hidden'); else if (!destroyed && !abandoned) void refresh('resize'); };
  const unlisten = listen([[frame, 'focusin', focus], [browser, 'resize', resized], [doc, 'visibilitychange', visibility]]);
  attached.add(frame); natural = measure(); observedWidth = natural.contentWidth; observedHeight = natural.contentHeight; observer?.observe(content, { box: 'border-box' }); media?.addEventListener('change', preference);
  return {
    refresh: () => refresh(), finish: () => !destroyed && Boolean(active) && stop(true, 'finished'), cancel: () => !destroyed && Boolean(active) && stop(false, 'cancelled'),
    update(next = {}) { if (destroyed || abandoned) return; options = resolve(next); if (active && (reduced() || options.duration === 0)) stop(true, 'reduced-motion'); },
    destroy() { if (destroyed) return; destroyed = true; stop(false, 'destroyed'); observer?.disconnect(); mutation?.disconnect(); unlisten(); media?.removeEventListener('change', preference); attached.delete(frame); },
  };
}
