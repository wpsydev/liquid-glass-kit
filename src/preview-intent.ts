import { bounded } from './numeric.js';
import { listen } from './lifecycle.js';

export type GlassPreviewOpenReason = 'hover' | 'focus' | 'manual' | 'native';
export type GlassPreviewCloseReason = 'leave' | 'escape' | 'manual' | 'update' | 'native' | 'hidden' | 'detached';
export interface GlassPreviewOptions {
  /** Manual mode never opens on hover/focus. Bind a native Preview button to toggle(). */
  interaction?: 'hover-focus' | 'manual';
  /** Host declares semantics. Description requires an authored noninteractive tooltip;
   * disclosure requires a native button and an authored non-tooltip, nonmodal panel. */
  semantics?: 'none' | 'description' | 'disclosure';
  /** Opt in to an authored popover="manual"; otherwise use the hidden attribute. */
  native?: boolean;
  /** Fine-pointer intent delay and crossing grace, each clamped to 0–1000 ms. */
  openDelay?: number;
  closeDelay?: number;
  /** Host owns loading/content. Check signal.aborted before applying asynchronous
   * content. The controller aborts intent; it cannot undo host DOM writes or fetches. */
  onOpen?: (context: { reason: GlassPreviewOpenReason; signal: AbortSignal }) => void | Promise<void>;
  onClose?: (context: { reason: GlassPreviewCloseReason }) => void;
  onError?: (error: unknown) => void;
}

const keys = ['interaction', 'semantics', 'native', 'openDelay', 'closeDelay', 'onOpen', 'onClose', 'onError'];
function resolve(input: GlassPreviewOptions) {
  if (!input || typeof input !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new TypeError('Glass preview options must be a plain object');
  for (const key of Reflect.ownKeys(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (typeof key !== 'string' || !keys.includes(key) || descriptor.get || descriptor.set) throw new TypeError('Unknown glass preview option or accessor');
  }
  if (input.interaction !== undefined && input.interaction !== 'hover-focus' && input.interaction !== 'manual') throw new TypeError('Invalid preview interaction');
  if (input.semantics !== undefined && !['none', 'description', 'disclosure'].includes(input.semantics)) throw new TypeError('Invalid preview semantics');
  if (input.native !== undefined && typeof input.native !== 'boolean') throw new TypeError('Invalid native preview option');
  for (const key of ['openDelay', 'closeDelay'] as const) if (input[key] !== undefined && (typeof input[key] !== 'number' || !Number.isFinite(input[key]))) throw new TypeError('Preview delays must be finite numbers');
  for (const key of ['onOpen', 'onClose', 'onError'] as const) if (input[key] !== undefined && typeof input[key] !== 'function') throw new TypeError('Preview callbacks must be functions');
  return { ...input, interaction: input.interaction ?? 'hover-focus', semantics: input.semantics ?? 'none', native: input.native ?? false,
    openDelay: bounded(input.openDelay, 120, 0, 1000), closeDelay: bounded(input.closeDelay, 120, 0, 1000) };
}
const interactive = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"]),[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"]';
let sequence = 0;
const owners = new WeakSet<HTMLElement>();

/**
 * Finite intent and visibility only; host owns panel content, placement, labeling,
 * and any animation. Pair with attachGlassOverlay or authored CSS if needed.
 * Does not bind clicks, move focus, create roles, fetch, or read layout. Native
 * links keep navigation; offer a separate manual Preview button for touch.
 * Use one controller per separate, same-document trigger/panel; destroy on unmount.
 */
export function attachGlassPreview(trigger: HTMLElement, panel: HTMLElement, initial: GlassPreviewOptions = {}) {
  if (trigger === panel || trigger.ownerDocument !== panel.ownerDocument || panel.contains(trigger) || trigger.contains(panel)) throw new Error('Glass previews require separate, nonnested elements in the same document');
  const doc = panel.ownerDocument, view = doc.defaultView;
  if (!view) throw new Error('Glass previews require a browser document');
  if (owners.has(trigger) || owners.has(panel)) throw new Error('Glass preview element already attached');
  let options = resolve(initial);
  const validateSemantics = (next: ReturnType<typeof resolve>) => {
    if (panel.tagName === 'DIALOG' || panel.getAttribute('aria-modal') === 'true') throw new Error('Glass previews require a nonmodal host panel');
    if (next.semantics !== 'none' && panel.id && /\s/.test(panel.id)) throw new Error('Preview panel ID must be one ARIA reference token');
    if (next.semantics === 'description' && (panel.getAttribute('role') !== 'tooltip' || panel.matches(interactive) || panel.querySelector(interactive))) throw new Error('Description previews require an authored noninteractive tooltip');
    if (next.semantics === 'disclosure' && (trigger.tagName !== 'BUTTON' || panel.getAttribute('role') === 'tooltip')) throw new Error('Disclosure previews require a native button and a non-tooltip panel');
  };
  validateSemantics(options);
  const nativeOpen = () => { try { return panel.matches(':popover-open'); } catch { return false; } };
  if (nativeOpen()) throw new Error('Close a host-owned popover before attaching its preview');
  owners.add(trigger); owners.add(panel);

  // Restore only declarations still carrying our last write; later host edits win.
  const attrs = new Map<HTMLElement, Map<string, { original: string | null; owned: string | null }>>();
  const set = (element: HTMLElement, key: string, value: string | null) => {
    let map = attrs.get(element); if (!map) { map = new Map(); attrs.set(element, map); }
    let entry = map.get(key); if (!entry) { entry = { original: element.getAttribute(key), owned: value }; map.set(key, entry); }
    else if (element.getAttribute(key) !== entry.owned) entry.original = element.getAttribute(key);
    entry.owned = value;
    if (value === null) element.removeAttribute(key); else element.setAttribute(key, value);
  };
  const restore = (element: HTMLElement, names?: readonly string[]) => {
    const map = attrs.get(element); if (!map) return;
    for (const [key, entry] of [...map]) {
      if (names && !names.includes(key)) continue;
      if (element.getAttribute(key) === entry.owned) entry.original === null ? element.removeAttribute(key) : element.setAttribute(key, entry.original);
      map.delete(key);
    }
  };
  let renderer: 'native-popover' | 'hidden' = 'hidden';
  let opened = false, destroyed = false, configuring = false, closing = false, dismissed = false, pinned = false;
  let triggerHover = false, panelHover = false, openTimer = 0, closeTimer = 0, generation = 0;
  let request: AbortController | undefined, loading = false;
  let stopActive: (() => void) | undefined, mutation: MutationObserver | undefined;
  let fine: MediaQueryList | undefined;
  try { fine = view.matchMedia?.('(hover: hover) and (pointer: fine)'); } catch { /* manual/focus remain available */ }
  const within = (target: EventTarget | null): boolean => target instanceof view.Node && (trigger.contains(target) || panel.contains(target));
  const focused = () => within(doc.activeElement);
  const connected = () => trigger.isConnected && panel.isConnected && !doc.hidden;
  const clearOpen = () => { view.clearTimeout(openTimer); openTimer = 0; };
  const clearClose = () => { view.clearTimeout(closeTimer); closeTimer = 0; };
  const stop = () => { stopActive?.(); stopActive = undefined; mutation?.disconnect(); mutation = undefined; };
  const expanded = () => { if (options.semantics === 'disclosure') set(trigger, 'aria-expanded', String(opened)); };
  const report = (error: unknown, revision = generation) => {
    if (destroyed || configuring || revision !== generation) return;
    try {
      const result: unknown = options.onError?.(error);
      if (result && typeof (result as PromiseLike<void>).then === 'function') Promise.resolve(result).catch(() => {});
    } catch { /* host error reporting must not strand cleanup */ }
  };
  const chooseRenderer = () => {
    restore(panel, ['popover']);
    // Native popover focusing steps honor autofocus. Reject that tier rather than
    // silently moving focus on hover; author content must remain autofocus-free.
    renderer = options.native && panel.getAttribute('popover') === 'manual' && typeof panel.showPopover === 'function' && typeof panel.hidePopover === 'function' && !panel.hasAttribute('autofocus') && !panel.querySelector('[autofocus]') ? 'native-popover' : 'hidden';
    if (renderer === 'hidden' && panel.hasAttribute('popover')) set(panel, 'popover', null);
    set(panel, 'hidden', renderer === 'hidden' ? '' : null);
  };
  const semantics = () => {
    restore(trigger, ['aria-controls', 'aria-expanded', 'aria-describedby']);
    if (options.semantics === 'none') return;
    if (!panel.id) {
      let id: string; do { id = 'lg-preview-' + ++sequence; } while (doc.getElementById(id));
      set(panel, 'id', id);
    }
    if (options.semantics === 'disclosure') { set(trigger, 'aria-controls', panel.id); expanded(); }
    else {
      const existing = trigger.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];
      if (!existing.includes(panel.id)) existing.push(panel.id);
      set(trigger, 'aria-describedby', existing.join(' '));
    }
  };
  const cancelRequest = () => { generation++; const previous = request; request = undefined; loading = false; return previous; };
  const close = (reason: GlassPreviewCloseReason, suppress: boolean, hideNative = true, notify = true) => {
    if (closing) return;
    closing = true;
    const destroying = destroyed;
    clearOpen(); clearClose(); dismissed ||= suppress; pinned = false;
    const wasOpen = opened;
    opened = false; const previous = cancelRequest(); stop(); expanded();
    if (renderer === 'native-popover') {
      if (hideNative && nativeOpen()) {
        try { panel.hidePopover(); } catch {
          if (!destroyed || destroying) {
            // Removing the owned popover attribute also removes it from the top
            // layer; a hidden attribute alone would leave native state out of sync.
            renderer = 'hidden'; set(panel, 'popover', null); set(panel, 'hidden', '');
          }
        }
      }
    } else set(panel, 'hidden', '');
    // Abort handlers run synchronously. Finish owned state before notifying them,
    // and refuse reentrant reopening/configuration during cancellation.
    previous?.abort(); closing = false;
    const revision = generation;
    if (wasOpen && notify && !destroyed) {
      try {
        const result: unknown = options.onClose?.({ reason });
        if (result && typeof (result as PromiseLike<void>).then === 'function') Promise.resolve(result).catch(error => report(error, revision));
      } catch (error) { report(error, revision); }
    }
  };
  const nestedEscape = (event: KeyboardEvent) => {
    const target = event.target instanceof view.Element ? event.target : doc.activeElement;
    for (const element of [target, doc.activeElement]) {
      let context = element?.closest('dialog[open],[aria-modal="true"],[popover]');
      while (context) {
        if (context !== panel && (context.matches('dialog[open],[aria-modal="true"]') || (() => { try { return context!.matches(':popover-open'); } catch { return false; } })())) return true;
        context = context.parentElement?.closest('dialog[open],[aria-modal="true"],[popover]');
      }
    }
    return false;
  };
  const escape = (event: Event) => {
    const key = event as KeyboardEvent;
    if (!opened || key.key !== 'Escape' || key.defaultPrevented || key.isComposing || nestedEscape(key)) return;
    key.preventDefault(); close('escape', true);
  };
  const observeActive = (keyboard: boolean) => {
    stop();
    stopActive = listen([
      ...(keyboard ? [[doc, 'keydown', escape] as const] : []),
      [doc, 'visibilitychange', () => { if (doc.hidden) close('hidden', true); }],
    ]);
    const Observer = (view as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
    if (Observer) { try { mutation = new Observer(() => { if (!trigger.isConnected || !panel.isConnected) close('detached', true); }); mutation.observe(doc, { childList: true, subtree: true }); } catch { mutation?.disconnect(); mutation = undefined; } }
  };
  const begin = (reason: GlassPreviewOpenReason, external = false) => {
    if (destroyed || configuring || closing) return;
    if (!connected()) { if (!opened) stop(); return; }
    clearOpen(); clearClose();
    if (opened) return;
    if (reason !== 'manual' && reason !== 'native' && dismissed) return;
    if (reason === 'manual') { dismissed = false; pinned = true; }
    try { validateSemantics(options); } catch (error) { stop(); report(error); return; }
    const attempt = generation;
    if (!external) {
      if (renderer === 'native-popover' && (panel.hasAttribute('autofocus') || panel.querySelector('[autofocus]'))) {
        renderer = 'hidden'; set(panel, 'popover', null);
      }
      set(panel, 'hidden', null);
      if (renderer === 'native-popover') {
        try {
          panel.showPopover({ source: trigger });
          // A host beforetoggle handler may cancel showing or destroy/update us.
          if (destroyed || configuring || attempt !== generation || !nativeOpen()) { if (!opened) stop(); return; }
        } catch {
          if (destroyed || attempt !== generation) return;
          renderer = 'hidden'; set(panel, 'popover', null);
        }
      }
    }
    opened = true; dismissed = false; expanded(); observeActive(true);
    const revision = ++generation, controller = new view.AbortController();
    request = controller;
    try {
      const result = options.onOpen?.({ reason, signal: controller.signal });
      if (result && typeof result.then === 'function') {
        if (revision === generation && !destroyed) loading = true;
        Promise.resolve(result).then(() => {
          if (revision === generation && !destroyed) loading = false;
        }, error => {
          if (revision === generation && !destroyed) { loading = false; report(error, revision); }
        });
      }
    } catch (error) { if (revision === generation) { loading = false; report(error, revision); } }
  };
  const scheduleClose = () => {
    clearOpen();
    if (pinned || triggerHover || panelHover || focused()) return;
    clearClose();
    if (!opened) { stop(); dismissed = false; return; }
    closeTimer = view.setTimeout(() => { closeTimer = 0; if (!pinned && !triggerHover && !panelHover && !focused()) close('leave', false); }, options.closeDelay);
  };
  const pointer = (isPanel: boolean, entering: boolean) => (event: Event) => {
    if (destroyed || options.interaction === 'manual') return;
    const key = event as PointerEvent;
    if (key.defaultPrevented || key.pointerType === 'touch' || !fine?.matches) return;
    const previouslyHovering = triggerHover || panelHover;
    if (isPanel) panelHover = entering; else triggerHover = entering;
    if (entering) {
      clearClose();
      if (!previouslyHovering) dismissed = false;
      if (!opened && !isPanel && !openTimer) {
        observeActive(false);
        openTimer = view.setTimeout(() => { openTimer = 0; if (triggerHover && fine?.matches) begin('hover'); else stop(); }, options.openDelay);
      }
    } else {
      if (!triggerHover && !panelHover && !focused()) dismissed = false;
      scheduleClose();
    }
  };
  const focusIn = (event: Event) => {
    clearClose();
    if (options.interaction !== 'manual' && !event.defaultPrevented) begin('focus');
  };
  const focusOut = (event: Event) => {
    if (within((event as FocusEvent).relatedTarget)) return;
    // Focusout occurs before activeElement settles; the finite close timer checks
    // current focus again. Do not poll or read layout.
    if (!triggerHover && !panelHover) dismissed = false;
    clearOpen(); clearClose();
    if (!opened) { stop(); return; }
    if (pinned) return;
    closeTimer = view.setTimeout(() => { closeTimer = 0; if (!focused() && !triggerHover && !panelHover && !pinned) close('leave', false); }, options.closeDelay);
  };
  const beforeToggle = (event: Event) => {
    if (renderer !== 'native-popover' || destroyed) return;
    if ((event as ToggleEvent).newState === 'open') clearOpen();
    else if ((event as ToggleEvent).newState === 'closed' && opened) close('native', true, false);
  };
  const toggleEvent = () => {
    if (renderer !== 'native-popover' || destroyed || configuring) return;
    // Native toggle events are coalesced/delayed. Current visibility, rather than
    // a stale event's newState, is authoritative.
    if (nativeOpen()) { if (!opened) begin('native', true); }
    else if (opened) close('native', true, false);
  };
  const fineChange = () => {
    if (fine?.matches) return;
    triggerHover = false; panelHover = false; clearOpen();
    if (!focused() && !pinned) close('leave', false);
  };
  const unlisten = listen([
    [trigger, 'pointerenter', pointer(false, true)], [trigger, 'pointerleave', pointer(false, false)],
    [panel, 'pointerenter', pointer(true, true)], [panel, 'pointerleave', pointer(true, false)],
    [trigger, 'focusin', focusIn], [trigger, 'focusout', focusOut], [panel, 'focusin', focusIn], [panel, 'focusout', focusOut],
    [panel, 'beforetoggle', beforeToggle], [panel, 'toggle', toggleEvent],
  ]);
  fine?.addEventListener?.('change', fineChange);
  if (fine && !fine.addEventListener) fine.addListener?.(fineChange);
  chooseRenderer(); semantics();
  return {
    get open() { return opened; },
    /** Pending host onOpen promise, not an animation/loading/network measurement. */
    get pending() { return loading; },
    get renderer() { return renderer; },
    show() { begin('manual'); if (opened) { pinned = true; dismissed = false; } },
    hide() { if (!destroyed) close('manual', true); },
    toggle() { if (destroyed) return; if (opened) close('manual', true); else begin('manual'); },
    /** Replaces options, closes/cancels old intent, and waits for a fresh action. */
    update(next: GlassPreviewOptions = {}) {
      if (destroyed || closing || configuring) return;
      const resolved = resolve(next); validateSemantics(resolved);
      configuring = true;
      try {
        close('update', true);
        if (destroyed) return;
        options = resolved;
        triggerHover = false; panelHover = false; chooseRenderer(); semantics();
      } finally { configuring = false; }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; close('manual', true, true, false); unlisten();
      fine?.removeEventListener?.('change', fineChange);
      if (fine && !fine.removeEventListener) fine.removeListener?.(fineChange);
      restore(trigger); restore(panel); owners.delete(trigger); owners.delete(panel);
    },
  };
}
