import { captureState, listen } from './lifecycle.js';

export interface GlassScrollEdgeOptions {
  /** Which boundary receives a decorative scroll edge. */
  edge?: 'top' | 'bottom' | 'both';
  /** A fading scrim or a sharply defined separator. */
  style?: 'soft' | 'hard';
  /** Depth of each edge in CSS pixels, clamped to 0–160. */
  size?: number;
  /** Replace translucency with a thin, opaque boundary. */
  reducedTransparency?: boolean;
}

const ownedAttributes = ['aria-hidden', 'inert', 'tabindex', 'data-lg-edge', 'data-lg-edge-style', 'data-lg-edge-top', 'data-lg-edge-bottom', 'data-lg-edge-solid', 'data-lg-edge-focus'] as const;
const sizeProperty = '--lg-scroll-edge-size';

/**
 * Decorate an empty overlay beside a vertical scrollport. Place both elements in
 * the same positioned wrapper. The layer must be outside the scrollable content;
 * this controller never masks content, changes its semantics, or steals input.
 * One controller per layer; destroy it before reattaching.
 */
export function attachGlassScrollEdge(scrollport: HTMLElement, edgeLayer: HTMLElement, initial: GlassScrollEdgeOptions = {}) {
  if (scrollport === edgeLayer || scrollport.contains(edgeLayer) || edgeLayer.contains(scrollport)) {
    throw new Error('Scroll edges require a separate overlay outside the scrollport');
  }
  if (edgeLayer.children.length || edgeLayer.textContent?.trim()) {
    throw new Error('The scroll edge overlay must be empty');
  }
  if (scrollport.ownerDocument !== edgeLayer.ownerDocument) {
    throw new Error('The scrollport and edge overlay must share a document');
  }
  const view = scrollport.ownerDocument.defaultView;
  if (!view) throw new Error('Scroll edges require elements in a browser document');

  const restore = captureState(edgeLayer, [sizeProperty], ownedAttributes, 'lg-scroll-edges');
  let edge: NonNullable<GlassScrollEdgeOptions['edge']> = 'both';
  let destroyed = false;
  let frame: number | null = null;
  const set = (key: string, value: string) => {
    if (edgeLayer.getAttribute(key) !== value) edgeLayer.setAttribute(key, value);
  };

  const render = () => {
    if (destroyed) return;
    // Clamp elastic overscroll at either end. One pixel avoids fractional-rounding
    // flicker when scrollHeight/clientHeight and scrollTop disagree slightly.
    const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    const position = Math.max(0, Math.min(maximum, scrollport.scrollTop));
    set('data-lg-edge-top', String(edge !== 'bottom' && position > 1));
    set('data-lg-edge-bottom', String(edge !== 'top' && maximum - position > 1));
    set('data-lg-edge-focus', String(scrollport.contains(scrollport.ownerDocument.activeElement)));
  };
  const schedule = () => {
    if (!destroyed && frame === null) frame = view.requestAnimationFrame(() => { frame = null; render(); });
  };

  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const resize = Resize ? new Resize(schedule) : undefined;
  const observeContent = () => {
    resize?.disconnect();
    resize?.observe(scrollport);
    for (const child of scrollport.children) resize?.observe(child);
  };
  const Mutation = (view as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
  const mutation = Mutation ? new Mutation(records => {
    // Attribute/text changes can resize content without changing observed children.
    if (records.some(record => record.type === 'childList' && record.target === scrollport)) observeContent();
    schedule();
  }) : undefined;
  observeContent();
  mutation?.observe(scrollport, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'src'] });
  const unlisten = listen([
    [scrollport, 'scroll', schedule, { passive: true }], [scrollport, 'focusin', render],
    [scrollport, 'focusout', schedule], [scrollport, 'load', schedule, true], [view, 'resize', schedule],
  ]);

  const update = (options: GlassScrollEdgeOptions = {}) => {
    if (destroyed) return;
    edge = options.edge === 'top' || options.edge === 'bottom' ? options.edge : 'both';
    const style = options.style === 'hard' ? 'hard' : 'soft';
    const size = options.size === undefined || !Number.isFinite(options.size) ? 32 : Math.max(0, Math.min(160, options.size));
    edgeLayer.classList.add('lg-scroll-edges');
    set('aria-hidden', 'true'); set('inert', ''); set('tabindex', '-1');
    set('data-lg-edge', edge); set('data-lg-edge-style', style);
    set('data-lg-edge-solid', String(options.reducedTransparency ?? false));
    if (edgeLayer.style.getPropertyValue(sizeProperty) !== `${size}px` || edgeLayer.style.getPropertyPriority(sizeProperty)) edgeLayer.style.setProperty(sizeProperty, `${size}px`);
    render();
  };
  update(initial);

  return {
    update,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame !== null) view.cancelAnimationFrame(frame);
      resize?.disconnect(); mutation?.disconnect();
      unlisten(); restore();
    },
  };
}
