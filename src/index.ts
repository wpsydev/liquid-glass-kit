import { getGlassProps, getGlassInnerRadius, getResolvedGlassProps, resolveOptions } from './material.js';
import { attachGlassPressInput, isGlassPressTarget } from './input.js';
import type { GlassOptions } from './material.js';
import { createDisplacementMap } from './optics.js';
import { retainGlassEnvironment } from './environment.js';
import { captureState } from './lifecycle.js';
export { getGlassCapabilities } from './environment.js';
export { getGlassProps, getGlassInnerRadius, resolveOptions, createDisplacementMap };
export type { GlassOptions, ResolvedGlassOptions } from './material.js';

let serial = 0;
const properties = ['--lg-radius', '--lg-blur', '--lg-saturation', '--lg-filter', '--lg-pointer-x', '--lg-pointer-y', '--lg-opacity', '--lg-tint', '--lg-tint-opacity'];
const attributes = ['data-lg-variant', 'data-lg-appearance', 'data-lg-solid', 'data-lg-interactive', 'data-lg-renderer', 'data-lg-backdrop', 'data-lg-pressed', 'data-lg-corner'];
/** Enhance an existing semantic element. One controller per element; destroy before reattaching. */
export function attachGlass(element: HTMLElement, initial: GlassOptions = {}) {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error('Glass requires an element in a browser document');
  let options: ReturnType<typeof resolveOptions>;
  let destroyed = false;
  let frame: number | null = null;
  let observer: ResizeObserver | undefined;
  let input: ReturnType<typeof attachGlassPressInput> | undefined;
  let svg: SVGSVGElement | undefined;
  const restore = captureState(element, properties, attributes, 'lg-glass');
  const removeFilter = () => { svg?.remove(); svg = undefined; if (element.style.getPropertyValue('--lg-filter')) element.style.removeProperty('--lg-filter'); };
  const attr = (key: string, value: string) => { if (element.getAttribute(key) !== value) element.setAttribute(key, value); };
  const isSolid = () => options.reducedTransparency || (environment.media[1]?.matches || environment.media[2]?.matches || environment.media[3]?.matches) || !environment.capabilities.backdrop;
  const usesLens = () => options.refraction && !isSolid() && environment.capabilities.experimentalRefraction;
  const reportRenderer = () => attr('data-lg-renderer', isSolid() ? 'solid' : 'css');
  const renderLens = () => {
    removeFilter();
    reportRenderer();
    if (!usesLens()) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(1, 256 / Math.max(rect.width, rect.height));
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    const canvas = doc.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const data = ctx.createImageData(width, height);
    data.data.set(createDisplacementMap(width, height, options.radius * ratio)); ctx.putImageData(data, 0, 0);
    const node = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>) => {
      const result = doc.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attrs)) result.setAttribute(key, value);
      return result;
    };
    svg = node('svg', { width: '0', height: '0', 'aria-hidden': 'true' });
    svg.style.position = 'absolute'; svg.style.pointerEvents = 'none';
    const id = `lg-lens-${++serial}`;
    const filter = node('filter', { id, 'color-interpolation-filters': 'sRGB', x: '0', y: '0', width: '100%', height: '100%' });
    const map = node('feImage', { href: canvas.toDataURL(), width: '100%', height: '100%', preserveAspectRatio: 'none', result: 'lens' });
    const displacement = node('feDisplacementMap', { in: 'SourceGraphic', in2: 'lens', scale: String(options.refraction), xChannelSelector: 'R', yChannelSelector: 'G' });
    filter.append(map, displacement); svg.append(filter); doc.body.append(svg);
    element.style.setProperty('--lg-filter', `url("#${id}")`);
    attr('data-lg-renderer', 'svg-experimental');
  };
  const scheduleLens = () => { if (!destroyed && frame === null && usesLens()) frame = view.requestAnimationFrame(() => { frame = null; renderLens(); }); };
  const syncLens = () => {
    if (usesLens()) {
      const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
      if (!observer && Resize) { observer = new Resize(scheduleLens); observer.observe(element); }
      scheduleLens();
    } else {
      if (frame !== null) view.cancelAnimationFrame(frame); frame = null;
      observer?.disconnect(); observer = undefined; removeFilter();
    }
  };
  const resetPointer = () => { for (const key of ['--lg-pointer-x', '--lg-pointer-y']) if (element.style.getPropertyValue(key)) element.style.removeProperty(key); };
  const locatePointer = (event: PointerEvent) => {
    if (!options.interactive || environment.media[0]?.matches) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    element.style.setProperty('--lg-pointer-x', `${Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))}%`);
    element.style.setProperty('--lg-pointer-y', `${Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))}%`);
  };
  const move = (event: PointerEvent) => { if (event.pointerType !== 'touch' && isGlassPressTarget(element, event)) locatePointer(event); };
  const release = () => { input?.reset(); if (element.hasAttribute('data-lg-pressed')) element.removeAttribute('data-lg-pressed'); resetPointer(); };
  const press = (event?: PointerEvent) => {
    if (!options.interactive || environment.media[0]?.matches) return false;
    if (event) locatePointer(event);
    attr('data-lg-pressed', 'true'); return true;
  };
  const environment = retainGlassEnvironment(view, () => { release(); reportRenderer(); syncLens(); });
  const update = (next: GlassOptions = {}) => {
    if (destroyed) return;
    options = resolveOptions(next);
    const { className, style, ...attrs } = getResolvedGlassProps(options);
    if (!element.classList.contains(className)) element.classList.add(className);
    for (const [key, value] of Object.entries(style)) if (element.style.getPropertyValue(key) !== value || element.style.getPropertyPriority(key)) element.style.setProperty(key, value);
    for (const [key, value] of Object.entries(attrs)) attr(key, value);
    if (options.interactive && !input) input = attachGlassPressInput(element, view, press, release, move, resetPointer);
    else if (!options.interactive && input) { input.destroy(); input = undefined; }
    release(); reportRenderer(); syncLens();
  };
  update(initial);
  return {
    update,
    destroy() {
      if (destroyed) return; destroyed = true;
      if (frame !== null) view.cancelAnimationFrame(frame);
      observer?.disconnect(); removeFilter(); environment.release();
      input?.destroy();
      restore();
    },
  };
}
/** Svelte action and vanilla DOM API share the same lifecycle. */
export const glass = attachGlass;

export { attachGlassScrollEdge, type GlassScrollEdgeOptions } from './scroll-edge.js';
export { attachGlassIndicator, type GlassIndicatorOptions } from './indicator.js';
export { attachGlassMotion, type GlassMotionOptions } from './motion.js';
export { attachGlassOverlay, type GlassOverlayOptions } from './overlay.js';
export { attachGlassTransition, type GlassTransitionOptions } from './micro-motion.js';
