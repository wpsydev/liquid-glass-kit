import { getGlassProps, getGlassInnerRadius, resolveOptions } from './material.js';
import { glassPointerId, isGlassPressTarget } from './input.js';
import type { GlassOptions } from './material.js';
import { createDisplacementMap } from './optics.js';
export { getGlassProps, getGlassInnerRadius, resolveOptions, createDisplacementMap };
export type { GlassOptions, ResolvedGlassOptions } from './material.js';

/** Conservative engine hint, not proof that an SVG filter rendered. */
export function getGlassCapabilities(view?: Window) {
  const w = view ?? (typeof window === 'undefined' ? undefined : window);
  const css = (w as (Window & { CSS?: typeof CSS }) | undefined)?.CSS;
  return {
    backdrop: Boolean(css?.supports('backdrop-filter', 'blur(1px)') || css?.supports('-webkit-backdrop-filter', 'blur(1px)')),
    experimentalRefraction: Boolean(w && /Chrome|Chromium|Edg\//.test(w.navigator.userAgent) && css?.supports('backdrop-filter', 'url("#lg-test")')),
    continuousCorners: Boolean(css?.supports('corner-shape', 'superellipse(1.5)')),
  };
}
let serial = 0;
const properties = ['--lg-radius', '--lg-blur', '--lg-saturation', '--lg-filter', '--lg-pointer-x', '--lg-pointer-y', '--lg-opacity', '--lg-tint', '--lg-tint-opacity'];
const attributes = ['data-lg-variant', 'data-lg-appearance', 'data-lg-solid', 'data-lg-interactive', 'data-lg-renderer', 'data-lg-backdrop', 'data-lg-pressed', 'data-lg-corner'];
/** Enhance an existing semantic element. One controller per element; destroy before reattaching. */
export function attachGlass(element: HTMLElement, initial: GlassOptions = {}) {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error('Glass requires an element in a browser document');
  let options = resolveOptions(initial);
  let destroyed = false;
  let frame = 0;
  let activePointer: number | null = null;
  let activeKey: string | null = null;
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
  const isSolid = () => options.reducedTransparency || transparency?.matches || contrast?.matches || forced?.matches || !getGlassCapabilities(view).backdrop;
  const reportRenderer = () => element.setAttribute('data-lg-renderer', isSolid() ? 'solid' : 'css');
  const renderLens = () => {
    removeFilter();
    reportRenderer();
    if (!options.refraction || isSolid() || !getGlassCapabilities(view).experimentalRefraction) return;
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
  const locatePointer = (event: PointerEvent) => {
    if (!options.interactive || reduced?.matches) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    element.style.setProperty('--lg-pointer-x', `${Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))}%`);
    element.style.setProperty('--lg-pointer-y', `${Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))}%`);
  };
  const move = (event: PointerEvent) => { if (event.pointerType !== 'touch' && isGlassPressTarget(element, event)) locatePointer(event); };
  const release = () => { activePointer = null; activeKey = null; element.removeAttribute('data-lg-pressed'); resetPointer(); };
  const pointerRelease = (event: PointerEvent) => { if (activePointer !== null && (event.pointerId === undefined || glassPointerId(event) === activePointer)) release(); };
  const press = (event: PointerEvent) => {
    if (!options.interactive || reduced?.matches || activePointer !== null || activeKey !== null || event.isPrimary === false || !isGlassPressTarget(element, event) || (event.button !== undefined && event.button !== 0) || element.matches(':disabled, [aria-disabled="true"]')) return;
    activePointer = glassPointerId(event);
    locatePointer(event); element.setAttribute('data-lg-pressed', 'true');
  };
  const keyPress = (event: KeyboardEvent) => {
    if (event.target !== element || event.repeat || activePointer !== null || activeKey !== null || !options.interactive || reduced?.matches || element.matches(':disabled, [aria-disabled="true"]')) return;
    if ((event.key === ' ' || event.key === 'Enter') && element.matches('button, [role="button"], a[href]')) { activeKey = event.key; element.setAttribute('data-lg-pressed', 'true'); }
  };
  const keyRelease = (event: KeyboardEvent) => { if (event.target === element && event.key === activeKey) release(); };
  const preferenceChanged = () => { resetPointer(); release(); reportRenderer(); scheduleLens(); };
  const media = [reduced, transparency, contrast, forced];
  for (const query of media) query?.addEventListener('change', preferenceChanged);
  element.addEventListener('pointermove', move); element.addEventListener('pointerleave', resetPointer);
  element.addEventListener('pointerdown', press); element.addEventListener('keydown', keyPress); element.addEventListener('keyup', keyRelease);
  element.addEventListener('lostpointercapture', pointerRelease); element.addEventListener('focusout', release); view.addEventListener('blur', release);
  view.addEventListener('pointerup', pointerRelease); view.addEventListener('pointercancel', pointerRelease);
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(scheduleLens) : undefined; observer?.observe(element);
  const update = (next: GlassOptions = {}) => {
    if (destroyed) return;
    options = resolveOptions(next);
    const { className, style, ...attrs } = getGlassProps(options);
    element.classList.add(className);
    for (const [key, value] of Object.entries(style)) element.style.setProperty(key, value);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    resetPointer(); release(); reportRenderer(); scheduleLens();
  };
  update(initial);
  return {
    update,
    destroy() {
      if (destroyed) return; destroyed = true;
      view.cancelAnimationFrame(frame); observer?.disconnect(); removeFilter();
      for (const query of media) query?.removeEventListener('change', preferenceChanged);
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', resetPointer);
      element.removeEventListener('pointerdown', press); element.removeEventListener('keydown', keyPress); element.removeEventListener('keyup', keyRelease);
      element.removeEventListener('lostpointercapture', pointerRelease); element.removeEventListener('focusout', release); view.removeEventListener('blur', release);
      view.removeEventListener('pointerup', pointerRelease); view.removeEventListener('pointercancel', pointerRelease);
      if (!hadClass) element.classList.remove('lg-glass');
      for (const [key, value, priority] of originalStyles) value ? element.style.setProperty(key, value, priority) : element.style.removeProperty(key);
      for (const [key, value] of originalAttrs) value === null ? element.removeAttribute(key!) : element.setAttribute(key!, value!);
    },
  };
}
/** Svelte action and vanilla DOM API share the same lifecycle. */
export const glass = attachGlass;

export { attachGlassScrollEdge } from './scroll-edge.js';
export type { GlassScrollEdgeOptions } from './scroll-edge.js';
export { attachGlassIndicator } from './indicator.js';
export type { GlassIndicatorOptions } from './indicator.js';

export { attachGlassMotion } from './motion.js';
export type { GlassMotionOptions } from './motion.js';

export { attachGlassOverlay } from './overlay.js';
export type { GlassOverlayOptions } from './overlay.js';
