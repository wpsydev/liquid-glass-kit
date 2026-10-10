import { getGlassProps, resolveOptions } from './material.js';
import type { GlassOptions } from './material.js';
import { createDisplacementMap } from './optics.js';
export { getGlassProps, resolveOptions, createDisplacementMap };
export type { GlassOptions, ResolvedGlassOptions } from './material.js';

/** Conservative engine hint, not proof that an SVG filter rendered. */
export function getGlassCapabilities(view?: Window) {
  const w = view ?? (typeof window === 'undefined' ? undefined : window);
  const css = (w as (Window & { CSS?: typeof CSS }) | undefined)?.CSS;
  return {
    backdrop: Boolean(css?.supports('backdrop-filter', 'blur(1px)') || css?.supports('-webkit-backdrop-filter', 'blur(1px)')),
    experimentalRefraction: Boolean(w && /Chrome|Chromium|Edg\//.test(w.navigator.userAgent) && css?.supports('backdrop-filter', 'url("#lg-test")')),
  };
}
let serial = 0;
const properties = ['--lg-radius', '--lg-blur', '--lg-saturation', '--lg-filter', '--lg-pointer-x', '--lg-pointer-y'];
const attributes = ['data-lg-variant', 'data-lg-appearance', 'data-lg-solid', 'data-lg-interactive', 'data-lg-renderer'];
/** Enhance an existing semantic element. One controller per element; destroy before reattaching. */
export function attachGlass(element: HTMLElement, initial: GlassOptions = {}) {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error('Glass requires an element in a browser document');
  let options = resolveOptions(initial);
  let destroyed = false;
  let frame = 0;
  let svg: SVGSVGElement | undefined;
  const hadClass = element.classList.contains('lg-glass');
  const originalStyles = properties.map(key => [key, element.style.getPropertyValue(key), element.style.getPropertyPriority(key)]);
  const originalAttrs = attributes.map(key => [key, element.getAttribute(key)]);
  const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const transparency = view.matchMedia?.('(prefers-reduced-transparency: reduce)');
  const contrast = view.matchMedia?.('(prefers-contrast: more)');
  const forced = view.matchMedia?.('(forced-colors: active)');
  const id = `lg-lens-${++serial}`;
  const removeFilter = () => { svg?.remove(); svg = undefined; element.style.removeProperty('--lg-filter'); };
  const renderLens = () => {
    removeFilter();
    element.setAttribute('data-lg-renderer', getGlassCapabilities(view).backdrop ? 'css' : 'solid');
    if (!options.refraction || options.reducedTransparency || transparency?.matches || contrast?.matches || forced?.matches || !getGlassCapabilities(view).experimentalRefraction) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(1, 256 / Math.max(rect.width, rect.height));
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    const canvas = doc.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const data = ctx.createImageData(width, height);
    data.data.set(createDisplacementMap(width, height, options.radius * ratio)); ctx.putImageData(data, 0, 0);
    const ns = 'http://www.w3.org/2000/svg';
    svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute'; svg.style.pointerEvents = 'none';
    const filter = doc.createElementNS(ns, 'filter'); filter.id = id;
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0'); filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
    const map = doc.createElementNS(ns, 'feImage');
    map.setAttribute('href', canvas.toDataURL()); map.setAttribute('width', '100%'); map.setAttribute('height', '100%'); map.setAttribute('preserveAspectRatio', 'none'); map.setAttribute('result', 'lens');
    const displacement = doc.createElementNS(ns, 'feDisplacementMap');
    displacement.setAttribute('in', 'SourceGraphic'); displacement.setAttribute('in2', 'lens');
    displacement.setAttribute('scale', String(options.refraction));
    displacement.setAttribute('xChannelSelector', 'R'); displacement.setAttribute('yChannelSelector', 'G');
    filter.append(map, displacement); svg.append(filter); doc.body.append(svg);
    element.style.setProperty('--lg-filter', `url("#${id}")`);
    element.setAttribute('data-lg-renderer', 'svg-experimental');
  };
  const scheduleLens = () => { if (!frame && !destroyed) frame = view.requestAnimationFrame(() => { frame = 0; renderLens(); }); };
  const resetPointer = () => { element.style.removeProperty('--lg-pointer-x'); element.style.removeProperty('--lg-pointer-y'); };
  const move = (event: PointerEvent) => {
    if (!options.interactive || reduced?.matches || event.pointerType === 'touch') return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    element.style.setProperty('--lg-pointer-x', `${Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))}%`);
    element.style.setProperty('--lg-pointer-y', `${Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))}%`);
  };
  const preferenceChanged = () => { resetPointer(); scheduleLens(); };
  const media = [reduced, transparency, contrast, forced];
  for (const query of media) query?.addEventListener('change', preferenceChanged);
  element.addEventListener('pointermove', move); element.addEventListener('pointerleave', resetPointer);
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(scheduleLens) : undefined; observer?.observe(element);
  const update = (next: GlassOptions = {}) => {
    if (destroyed) return;
    options = resolveOptions(next);
    const { className, style, ...attrs } = getGlassProps(options);
    element.classList.add(className);
    for (const [key, value] of Object.entries(style)) element.style.setProperty(key, value);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    resetPointer(); scheduleLens();
  };
  update(initial);
  return {
    update,
    destroy() {
      if (destroyed) return; destroyed = true;
      view.cancelAnimationFrame(frame); observer?.disconnect(); removeFilter();
      for (const query of media) query?.removeEventListener('change', preferenceChanged);
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', resetPointer);
      if (!hadClass) element.classList.remove('lg-glass');
      for (const [key, value, priority] of originalStyles) value ? element.style.setProperty(key, value, priority) : element.style.removeProperty(key);
      for (const [key, value] of originalAttrs) value === null ? element.removeAttribute(key!) : element.setAttribute(key!, value!);
    },
  };
}
/** Svelte action and vanilla DOM API share the same lifecycle. */
export const glass = attachGlass;
