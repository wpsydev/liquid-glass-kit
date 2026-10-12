export type GlassSheetDetent = 'medium' | 'large' | number;
export type GlassSheetDismissReason = 'api' | 'close' | 'escape' | 'drag' | 'backdrop';
export interface GlassBottomSheetOptions {
  /** One to four resting viewport fractions, clamped to .25–.95. Defaults .5/.9. */
  detents?: readonly GlassSheetDetent[];
  initialDetent?: GlassSheetDetent;
  label?: string;
  reducedMotion?: boolean;
  dismissOnDrag?: boolean;
  onDetent?: (fraction: number) => void;
  /** Only helper-owned dismissal is guarded. false keeps the authored form open. */
  onDismissRequest?: (reason: GlassSheetDismissReason) => boolean | Promise<boolean>;
}
export interface GlassBottomSheet {
  /** Nominal usable-viewport fraction; very small viewports retain up to 120px height. */
  readonly detent: number;
  open(detent?: GlassSheetDetent): void;
  /** Guard rejection propagates unchanged; a stale approval never closes a new opening. */
  close(): Promise<boolean>;
  snapTo(detent: GlassSheetDetent): boolean;
  update(options: GlassBottomSheetOptions): void;
  /** Explicit host teardown closes without consulting the dismissal guard. */
  destroy(): void;
}
const attached = new WeakSet<HTMLDialogElement>();
const fields = ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'max-width', 'max-height', 'min-height', 'margin', 'box-sizing'];
function fraction(value: GlassSheetDetent): number {
  if (value === 'medium') return .5;
  if (value === 'large') return .9;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError('Sheet detents must be medium, large or finite fractions');
  return Math.max(.25, Math.min(.95, value));
}
function resolve(input: GlassBottomSheetOptions) {
  const values = input.detents ?? ['medium', 'large'];
  if (!Array.isArray(values) || !values.length || values.length > 4) throw new RangeError('Sheets require one to four detents');
  const detents = [...new Set(values.map(fraction))].sort((a, b) => a - b);
  if (input.initialDetent !== undefined) fraction(input.initialDetent);
  return { ...input, detents, reducedMotion: Boolean(input.reducedMotion), dismissOnDrag: input.dismissOnDrag ?? true };
}

/**
 * Attach to a connected, closed and accessibly named native dialog. The host owns
 * authored content, autofocus, form validation, persistence and unsaved data.
 * Native dialog.close(), method=dialog forms and explicit destroy bypass guards.
 * Reserve fixed geometry on this dialog; do not attach another positioning engine.
 * Only the owned grabber suppresses touch scrolling; content remains native.
 * Actual height changes can incur layout/paint; this is not a translated large mask.
 */
export function attachGlassBottomSheet(dialog: HTMLDialogElement, initial: GlassBottomSheetOptions = {}): GlassBottomSheet {
  const doc = dialog?.ownerDocument, view = doc?.defaultView;
  if (!view || dialog.tagName !== 'DIALOG' || !dialog.isConnected || dialog.open || typeof dialog.showModal !== 'function' || typeof dialog.close !== 'function') throw new Error('Attach a connected, closed native dialog with showModal/close support');
  const named = dialog.getAttribute('aria-label')?.trim() || dialog.getAttribute('aria-labelledby')?.split(/\s+/).some(id => Boolean(doc.getElementById(id)?.textContent?.trim()));
  if (!named) throw new Error('Bottom sheets require an authored aria-label or aria-labelledby');
  if (attached.has(dialog)) throw new Error('Destroy the existing bottom sheet before attaching another');
  const browser = view;
  let options = resolve(initial), detent = nearest(options.initialDetent === undefined ? options.detents[0] : fraction(options.initialDetent));
  let destroyed = false, epoch = 0, pending: Promise<boolean> | null = null, previousFocus: HTMLElement | null = null;
  let availableHeight = 1, originTop = 0, sheetLeft = 0, sheetWidth = 1, height = 1, frame: number | null = null;
  let settleTimer: number | null = null;
  let drag: { id: number; startY: number; startHeight: number; height: number; moved: boolean } | null = null;
  let suppressClick = false, backdropDown = false;
  let fallbackListening = false;
  const hadClass = dialog.classList.contains('lg-bottom-sheet'), hadClassAttribute = dialog.hasAttribute('class'), hadStyle = dialog.hasAttribute('style');
  const original = Array.from(dialog.style).filter(field => fields.includes(field)).map(field => [field, dialog.style.getPropertyValue(field), dialog.style.getPropertyPriority(field)] as const);
  const attributes = ['data-lg-sheet-dragging', 'data-lg-sheet-reduced', 'data-lg-sheet-settling'];
  const originalAttributes = attributes.map(name => [name, dialog.getAttribute(name)] as const);
  const viewport = browser.visualViewport, media = browser.matchMedia?.('(prefers-reduced-motion: reduce)');
  const toolbar = doc.createElement('div'); toolbar.className = 'lg-sheet-controls'; toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', options.label ?? 'Sheet controls');
  const button = (className: string, text: string) => { const value = doc.createElement('button'); value.type = 'button'; value.className = className; value.textContent = text; return value; };
  const handle = button('lg-sheet-grabber', ''); const mark = doc.createElement('span'); mark.setAttribute('aria-hidden', 'true'); handle.append(mark);
  const resizeButton = button('lg-sheet-resize', 'Expand'); const closeButton = button('lg-sheet-close', 'Close');
  const status = doc.createElement('span'); status.className = 'lg-sheet-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  toolbar.append(handle, resizeButton, closeButton, status); dialog.prepend(toolbar); dialog.classList.add('lg-bottom-sheet'); attached.add(dialog);
  function nearest(value: number) { return options.detents.reduce((best, candidate) => Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best); }
  const reduced = () => options.reducedMotion || Boolean(media?.matches);
  function announce(message: string) { if (!destroyed) status.textContent = message; }
  function report(error: unknown, phase: 'dismiss' | 'detent') { dialog.dispatchEvent(new browser.CustomEvent('lg-sheet-error', { bubbles: true, detail: { error, phase } })); }
  function controls() {
    toolbar.setAttribute('aria-label', options.label ?? 'Sheet controls');
    const larger = detent < options.detents.at(-1)!;
    resizeButton.textContent = larger ? 'Expand' : 'Collapse'; resizeButton.disabled = Boolean(pending) || options.detents.length < 2;
    handle.disabled = closeButton.disabled = Boolean(pending);
    handle.setAttribute('aria-label', `Resize sheet, ${Math.round(detent * 100)} percent detent. Activate to cycle resting heights.`);
    dialog.setAttribute('data-lg-sheet-reduced', String(reduced()));
  }
  function writeHeight(value: number) {
    height = Math.max(Math.min(120, availableHeight), Math.min(availableHeight, value));
    dialog.style.setProperty('height', `${height}px`); dialog.style.setProperty('top', `${originTop + availableHeight + 8 - height}px`);
  }
  function geometry() {
    clearSettling();
    const viewportHeight = viewport?.height ?? browser.innerHeight, viewportWidth = viewport?.width ?? browser.innerWidth;
    originTop = (viewport?.offsetTop ?? 0) + 8; availableHeight = Math.max(1, viewportHeight - 16);
    sheetWidth = Math.max(1, Math.min(640, viewportWidth - 16)); sheetLeft = (viewport?.offsetLeft ?? 0) + Math.max(0, (viewportWidth - sheetWidth) / 2);
    dialog.style.setProperty('position', 'fixed'); dialog.style.setProperty('left', `${sheetLeft}px`); dialog.style.setProperty('right', 'auto'); dialog.style.setProperty('bottom', 'auto');
    dialog.style.setProperty('width', `${sheetWidth}px`); dialog.style.setProperty('max-width', `${sheetWidth}px`); dialog.style.setProperty('max-height', `${availableHeight}px`); dialog.style.setProperty('min-height', '0px'); dialog.style.setProperty('margin', '0px'); dialog.style.setProperty('box-sizing', 'border-box');
    writeHeight(availableHeight * detent); controls();
  }
  function cancelFrame() { if (frame !== null) browser.cancelAnimationFrame(frame); frame = null; }
  function clearSettling() { if (settleTimer !== null) browser.clearTimeout(settleTimer); settleTimer = null; dialog.removeAttribute('data-lg-sheet-settling'); }
  function endDrag() {
    cancelFrame(); clearSettling(); const current = drag; drag = null; dialog.removeAttribute('data-lg-sheet-dragging');
    if (fallbackListening) { fallbackListening = false; doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', up); doc.removeEventListener('pointercancel', cancelled); }
    if (current) { try { if (handle.hasPointerCapture?.(current.id)) handle.releasePointerCapture(current.id); } catch { /* Capture can already have been released. */ } }
    return current;
  }
  function snapTo(value: GlassSheetDetent) {
    if (destroyed) return false;
    const next = nearest(fraction(value)); const changed = detent !== next; endDrag(); detent = next;
    if (dialog.open && !reduced()) { dialog.setAttribute('data-lg-sheet-settling', 'true'); settleTimer = browser.setTimeout(clearSettling, 200); }
    writeHeight(availableHeight * detent); controls();
    if (changed) { announce(`Sheet resized to ${Math.round(detent * 100)} percent.`); try { options.onDetent?.(detent); } catch (error) { report(error, 'detent'); } }
    return true;
  }
  function closed() {
    // A queued native close event from an old opening must not affect a new one.
    if (dialog.open) return;
    epoch++; pending = null; endDrag(); controls();
    if (previousFocus?.isConnected && !previousFocus.matches(':disabled') && !previousFocus.closest('[inert], [hidden]') &&
      (doc.activeElement === doc.body || dialog.contains(doc.activeElement))) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function requestClose(reason: GlassSheetDismissReason): Promise<boolean> {
    if (destroyed || !dialog.open) return Promise.resolve(false);
    if (pending) return pending;
    endDrag(); const token = epoch, guard = options.onDismissRequest;
    let task!: Promise<boolean>;
    task = Promise.resolve().then(() => destroyed || epoch !== token || !dialog.open ? false : guard ? guard(reason) : true).then(approved => {
      if (destroyed || epoch !== token || !dialog.open) return false;
      if (approved !== true) { writeHeight(availableHeight * detent); announce('Sheet kept open. Your changes remain here.'); return false; }
      dialog.close(); closed(); return true;
    }, error => {
      if (!destroyed && epoch === token && dialog.open) { writeHeight(availableHeight * detent); announce('Could not close. Your changes remain here.'); report(error, 'dismiss'); }
      throw error;
    }).finally(() => { if (pending === task) { pending = null; controls(); } });
    pending = task; controls(); announce('Checking whether this sheet can close…'); return task;
  }
  const dismiss = (reason: GlassSheetDismissReason) => { void requestClose(reason).catch(() => {}); };
  function open(value?: GlassSheetDetent) {
    if (destroyed) return;
    if (!dialog.isConnected) throw new Error('Reconnect the authored dialog before opening');
    if (value !== undefined) fraction(value);
    epoch++; pending = null; endDrag(); suppressClick = false; status.textContent = '';
    if (value !== undefined) detent = nearest(fraction(value));
    geometry();
    if (!dialog.open) {
      previousFocus = doc.activeElement instanceof browser.HTMLElement ? doc.activeElement as HTMLElement : null;
      // Native focusing steps must see the authored controls first, not the
      // prepended toolbar. Reenable keyboard alternatives after showModal().
      handle.disabled = resizeButton.disabled = closeButton.disabled = true;
      try { dialog.showModal(); } finally { controls(); }
    }
  }
  const cycle = (event?: MouseEvent) => {
    if (event?.detail && suppressClick) { suppressClick = false; return; }
    if (pending || destroyed) return;
    const index = options.detents.indexOf(detent); snapTo(options.detents[(index + 1) % options.detents.length]);
  };
  const down = (event: PointerEvent) => {
    if (destroyed || pending || !dialog.open || event.isPrimary === false || event.button !== 0 || !Number.isFinite(event.clientY)) return;
    suppressClick = false; endDrag();
    // One geometry sample at gesture start. Move events reuse this cached height.
    const actualHeight = dialog.getBoundingClientRect().height || height;
    drag = { id: event.pointerId, startY: event.clientY, startHeight: actualHeight, height: actualHeight, moved: false };
    dialog.setAttribute('data-lg-sheet-dragging', 'true');
    let captured = false; try { if (handle.setPointerCapture) { handle.setPointerCapture(event.pointerId); captured = true; } } catch { /* bounded document-listener fallback */ }
    if (!captured) { fallbackListening = true; doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', up); doc.addEventListener('pointercancel', cancelled); }
  };
  const move = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId || !Number.isFinite(event.clientY)) return;
    if (!dialog.isConnected || doc.hidden) { endDrag(); return; }
    const offset = drag.startY - event.clientY; drag.height = Math.max(44, Math.min(availableHeight, drag.startHeight + offset)); drag.moved ||= Math.abs(offset) > 6;
    if (frame === null) frame = browser.requestAnimationFrame(() => { frame = null; if (!dialog.isConnected || doc.hidden) { endDrag(); return; } if (drag && !destroyed) writeHeight(drag.height); });
  };
  const up = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const finished = endDrag()!; suppressClick = finished.moved;
    if (Number.isFinite(event.clientY)) { const offset = finished.startY - event.clientY; finished.height = Math.max(44, Math.min(availableHeight, finished.startHeight + offset)); finished.moved ||= Math.abs(offset) > 6; suppressClick = finished.moved; }
    if (!finished.moved) { writeHeight(availableHeight * detent); return; }
    if (options.dismissOnDrag && finished.height < availableHeight * options.detents[0] * .65) dismiss('drag'); else snapTo(finished.height / availableHeight);
  };
  const cancelled = (event: PointerEvent) => { if (drag?.id === event.pointerId) { endDrag(); suppressClick = false; writeHeight(availableHeight * detent); } };
  const viewportChanged = () => { if (destroyed) return; endDrag(); geometry(); };
  const preference = () => { endDrag(); writeHeight(availableHeight * detent); controls(); };
  const visibility = () => { if (doc.hidden) { endDrag(); writeHeight(availableHeight * detent); } };
  const escape = (event: Event) => { event.preventDefault(); dismiss('escape'); };
  const outsideDown = (event: PointerEvent) => { backdropDown = event.target === dialog && (event.clientX < sheetLeft || event.clientX > sheetLeft + sheetWidth || event.clientY < originTop + availableHeight + 8 - height || event.clientY > originTop + availableHeight + 8); };
  const outsideClick = (event: MouseEvent) => { if (event.target === dialog && backdropDown) dismiss('backdrop'); backdropDown = false; };
  const closeClick = () => dismiss('close');
  const edited = (event: Event) => {
    if (!pending || toolbar.contains(event.target as Node)) return;
    // An async approval describes an earlier form state. A new native edit must
    // not be discarded by that approval; the next dismissal rechecks the host.
    epoch++; pending = null; controls(); announce('Changes updated. Close again when you are ready.');
  };
  handle.addEventListener('click', cycle); resizeButton.addEventListener('click', cycle); closeButton.addEventListener('click', closeClick);
  handle.addEventListener('pointerdown', down); handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', cancelled); handle.addEventListener('lostpointercapture', cancelled);
  dialog.addEventListener('cancel', escape); dialog.addEventListener('close', closed); dialog.addEventListener('pointerdown', outsideDown); dialog.addEventListener('click', outsideClick);
  dialog.addEventListener('input', edited, true); dialog.addEventListener('change', edited, true);
  browser.addEventListener('resize', viewportChanged); viewport?.addEventListener('resize', viewportChanged); viewport?.addEventListener('scroll', viewportChanged); media?.addEventListener?.('change', preference);
  doc.addEventListener('visibilitychange', visibility);
  geometry();
  return {
    get detent() { return detent; }, open, close: () => requestClose('api'), snapTo,
    update(next) { if (destroyed) return; const replacement = resolve(next); epoch++; pending = null; endDrag(); options = replacement; detent = nearest(next.initialDetent === undefined ? detent : fraction(next.initialDetent)); geometry(); },
    destroy() {
      if (destroyed) return; epoch++; pending = null; endDrag();
      if (dialog.open) { dialog.close(); closed(); }
      destroyed = true; attached.delete(dialog);
      handle.removeEventListener('click', cycle); resizeButton.removeEventListener('click', cycle); closeButton.removeEventListener('click', closeClick);
      handle.removeEventListener('pointerdown', down); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', cancelled); handle.removeEventListener('lostpointercapture', cancelled);
      dialog.removeEventListener('cancel', escape); dialog.removeEventListener('close', closed); dialog.removeEventListener('pointerdown', outsideDown); dialog.removeEventListener('click', outsideClick);
      dialog.removeEventListener('input', edited, true); dialog.removeEventListener('change', edited, true);
      browser.removeEventListener('resize', viewportChanged); viewport?.removeEventListener('resize', viewportChanged); viewport?.removeEventListener('scroll', viewportChanged); media?.removeEventListener?.('change', preference);
      doc.removeEventListener('visibilitychange', visibility);
      toolbar.remove(); if (!hadClass) dialog.classList.remove('lg-bottom-sheet');
      if (!hadClassAttribute && !dialog.getAttribute('class')) dialog.removeAttribute('class');
      for (const field of fields) dialog.style.removeProperty(field); for (const [field, value, priority] of original) dialog.style.setProperty(field, value, priority);
      for (const [name, value] of originalAttributes) value === null ? dialog.removeAttribute(name) : dialog.setAttribute(name, value);
      if (!hadStyle && !dialog.getAttribute('style')) dialog.removeAttribute('style');
    },
  };
}
