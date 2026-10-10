export interface GlassOverlayOptions {
  /** Preferred vertical side; flips when the opposite side offers more room. */
  placement?: 'top' | 'bottom';
  /** Horizontal alignment; start/end respect the anchor's direction. */
  align?: 'start' | 'center' | 'end';
  /** Anchor separation in CSS pixels, clamped to 0–128. */
  gap?: number;
  /** Spacing inside the visible viewport, clamped to 0–128. Not a safe-area inset. */
  padding?: number;
  /** Match the anchor's measured width, constrained by the viewport. */
  matchWidth?: boolean;
}

const bounded = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(128, value!)) : fallback;
const resolve = (options: GlassOverlayOptions) => ({
  placement: options.placement === 'top' ? 'top' as const : 'bottom' as const,
  align: options.align === 'center' || options.align === 'end' ? options.align : 'start' as const,
  gap: bounded(options.gap, 8), padding: bounded(options.padding, 16), matchWidth: options.matchWidth ?? false,
});
const properties = ['position', 'inset', 'inset-block', 'inset-inline', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end', 'left', 'top', 'right', 'bottom',
  'margin', 'margin-block', 'margin-inline', 'margin-block-start', 'margin-block-end', 'margin-inline-start', 'margin-inline-end', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'box-sizing',
  'min-width', 'min-height', 'max-width', 'max-height', 'width', 'overflow', 'overflow-x', 'overflow-y', 'transform-origin',
  '--lg-overlay-origin', 'position-anchor', 'position-area', 'position-try-fallbacks'];

/**
 * Position a same-document, top-layer or ordinary fixed overlay beside an anchor.
 * Owns geometry only: native popover/dialog or a headless primitive owns visibility,
 * focus, keyboard behavior and dismissal. Horizontal writing modes and an unscaled
 * fixed coordinate system are required. Transformed fixed containing blocks,
 * arbitrary clipping boundaries and virtual anchors are outside this API's scope.
 * Attach after mount; one controller per overlay. Cleanup before unmount.
 */
export function attachGlassOverlay(anchor: HTMLElement, overlay: HTMLElement, initial: GlassOverlayOptions = {}) {
  if (anchor === overlay || anchor.ownerDocument !== overlay.ownerDocument || overlay.contains(anchor)) {
    throw new Error('Glass overlays require a separate anchor in the same document, outside the overlay');
  }
  const view = overlay.ownerDocument.defaultView;
  if (!view) throw new Error('Glass overlays require elements in a browser document');
  // Capture declarations, rather than expanded shorthand getters: replaying both
  // a shorthand and its inferred longhands changes priority/order and can lose
  // partially authored values. Other app styles remain untouched.
  const original = Array.from(overlay.style).filter(key => properties.includes(key))
    .map(key => [key, overlay.style.getPropertyValue(key), overlay.style.getPropertyPriority(key)] as const);
  const originalPlacement = overlay.getAttribute('data-lg-overlay-placement');
  const originalWidth = [overlay.style.getPropertyValue('width'), overlay.style.getPropertyPriority('width')] as const;
  let options = resolve(initial), frame = 0, destroyed = false;
  const viewport = view.visualViewport;
  const set = (key: string, value: string) => {
    if (overlay.style.getPropertyValue(key) !== value || overlay.style.getPropertyPriority(key)) overlay.style.setProperty(key, value);
  };
  const restoreWidth = () => {
    if (originalWidth[0]) overlay.style.setProperty('width', originalWidth[0], originalWidth[1]);
    else overlay.style.removeProperty('width');
  };
  const clamp = (value: number, low: number, high: number) => Math.min(Math.max(low, high), Math.max(low, value));
  const refresh = () => {
    if (destroyed || !anchor.isConnected || !overlay.isConnected || !anchor.getClientRects().length || !overlay.getClientRects().length) return;
    const width = viewport?.width ?? view.innerWidth, height = viewport?.height ?? view.innerHeight;
    const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
    const left = x + options.padding, top = y + options.padding;
    const right = x + width - options.padding, bottom = y + height - options.padding;
    const maxWidth = Math.max(0, right - left), maxHeight = Math.max(0, bottom - top);
    const rect = anchor.getBoundingClientRect();
    const room = { top: clamp(rect.top - options.gap - top, 0, maxHeight), bottom: clamp(bottom - rect.bottom - options.gap, 0, maxHeight) };
    // Native popovers use fit-content sizing. Measure against the full usable
    // width, rather than a previous edge placement's remaining inline space.
    set('left', `${left}px`); set('top', `${top}px`);
    set('max-width', `${maxWidth}px`);
    // Measure wrapped content in the larger candidate space. If the preferred side
    // fits, lowering this bound does not change the box; otherwise the larger side
    // remains selected. This avoids chasing transient spring scale or resize loops.
    set('max-height', `${Math.max(room.top, room.bottom)}px`);
    if (options.matchWidth) set('width', `${Math.min(maxWidth, Math.max(0, rect.width))}px`);
    else restoreWidth();
    let bounds = overlay.getBoundingClientRect();
    const layoutHeight = overlay.offsetHeight || bounds.height;
    const opposite = options.placement === 'top' ? 'bottom' : 'top';
    const placement = layoutHeight > room[options.placement] + .5 && room[opposite] > room[options.placement] ? opposite : options.placement;
    set('max-height', `${room[placement]}px`);
    bounds = overlay.getBoundingClientRect();
    const actualWidth = overlay.offsetWidth || bounds.width, actualHeight = overlay.offsetHeight || bounds.height;
    const rtl = view.getComputedStyle(anchor).direction === 'rtl';
    const align = options.align === 'center' ? 'center' : (options.align === 'start') !== rtl ? 'left' : 'right';
    const requestedLeft = align === 'center' ? rect.left + (rect.width - actualWidth) / 2 : align === 'left' ? rect.left : rect.right - actualWidth;
    const actualLeft = clamp(requestedLeft, left, right - actualWidth);
    const actualTop = clamp(placement === 'bottom' ? rect.bottom + options.gap : rect.top - options.gap - actualHeight, top, bottom - actualHeight);
    const origin = `${clamp(rect.left + rect.width / 2 - actualLeft, 0, actualWidth)}px ${placement === 'bottom' ? 0 : actualHeight}px`;
    set('left', `${actualLeft}px`); set('top', `${actualTop}px`);
    set('--lg-overlay-origin', origin); set('transform-origin', origin);
    overlay.setAttribute('data-lg-overlay-placement', placement);
  };
  const schedule = () => {
    if (!destroyed && !frame) frame = view.requestAnimationFrame(() => { frame = 0; refresh(); });
  };
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(schedule) : undefined;
  observer?.observe(anchor); observer?.observe(overlay);
  view.addEventListener('resize', schedule);
  view.addEventListener('scroll', schedule, { capture: true, passive: true });
  viewport?.addEventListener('resize', schedule); viewport?.addEventListener('scroll', schedule);
  overlay.addEventListener('toggle', schedule);
  const update = (next: GlassOverlayOptions = {}) => {
    if (destroyed) return;
    options = resolve(next);
    set('position', 'fixed'); set('inset', 'auto'); set('margin', '0px');
    set('inset-block', 'auto'); set('inset-inline', 'auto'); set('margin-block', '0px'); set('margin-inline', '0px');
    for (const key of ['left', 'top', 'right', 'bottom', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end']) set(key, 'auto');
    for (const key of ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-block-start', 'margin-block-end', 'margin-inline-start', 'margin-inline-end']) set(key, '0px');
    set('box-sizing', 'border-box'); set('min-width', '0px'); set('min-height', '0px');
    set('overflow', 'auto'); set('overflow-x', 'auto'); set('overflow-y', 'auto');
    set('position-anchor', 'auto'); set('position-area', 'none'); set('position-try-fallbacks', 'none');
    refresh();
  };
  update(initial);
  return {
    refresh, update,
    destroy() {
      if (destroyed) return;
      destroyed = true; view.cancelAnimationFrame(frame); observer?.disconnect();
      view.removeEventListener('resize', schedule); view.removeEventListener('scroll', schedule, true);
      viewport?.removeEventListener('resize', schedule); viewport?.removeEventListener('scroll', schedule);
      overlay.removeEventListener('toggle', schedule);
      for (const key of properties) overlay.style.removeProperty(key);
      for (const [key, value, priority] of original) overlay.style.setProperty(key, value, priority);
      originalPlacement === null ? overlay.removeAttribute('data-lg-overlay-placement') : overlay.setAttribute('data-lg-overlay-placement', originalPlacement);
    },
  };
}
