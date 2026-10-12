export type GlassSnapDeckReason = 'initial' | 'api' | 'scroll' | 'refresh' | 'resize' | 'update' | 'motion' | 'visibility';
export interface GlassSnapDeckChange { readonly index: number; readonly item: HTMLElement | null; readonly canNext: boolean; readonly canPrevious: boolean; readonly reason: GlassSnapDeckReason }
export interface GlassSnapDeckOptions {
  /** One to 128 authored direct children, in their existing DOM/source order. */
  items: readonly HTMLElement[];
  axis?: 'x' | 'y';
  reducedMotion?: boolean;
  /** Scroll debounce when native scrollend is unavailable. Clamped 80–250ms, default120. */
  settleDelay?: number;
  /** Settled actual view, not a requested target. -1/null means no measurable item. */
  onChange?: (state: GlassSnapDeckChange) => void;
}
export interface GlassSnapDeck {
  readonly index: number;
  readonly canNext: boolean;
  readonly canPrevious: boolean;
  goTo(index: number): boolean;
  next(): boolean;
  previous(): boolean;
  refresh(): void;
  update(options: GlassSnapDeckOptions): void;
  destroy(): void;
}
type Lease = { write(value: string): void; restore(): void };
type Card = { item: HTMLElement; index: number; anchor: number; low: number; high: number; center: number };
const roots = new WeakSet<HTMLElement>(), owned = new WeakMap<HTMLElement, HTMLElement>();
function attribute(element: HTMLElement, key: string): Lease {
  const original = element.getAttribute(key); let value = original;
  return { write(next) { value = next; if (element.getAttribute(key) !== next) element.setAttribute(key, next); }, restore() { if (element.getAttribute(key) !== value) return; original === null ? element.removeAttribute(key) : element.setAttribute(key, original); } };
}

/**
 * Native CSS scroll-snap enhancement, not a carousel/router/drag engine. Import
 * /snap-deck.css and author semantic cards plus separate labeled native buttons.
 * No autoplay, clones, hidden links, ARIA roles, tabindex or key interception.
 * goTo scrolls only this container and never transfers focus. Source order must
 * match options.items; horizontal writing modes and native signed RTL scrollLeft
 * coordinates are supported. CSS owns sizes/gaps/snap alignment; active markers
 * must not resize cards. Refresh after direction/visibility changes; update when
 * replacing items. Native instantaneous scroll interruption is requested for owned
 * smooth scrolling on reduce/hidden/destroy; this is not a portable momentum abort.
 */
export function attachGlassSnapDeck(scroller: HTMLElement, initial: GlassSnapDeckOptions): GlassSnapDeck {
  const doc = scroller?.ownerDocument, view = doc?.defaultView;
  if (!view || !scroller.isConnected || roots.has(scroller)) throw new Error('Use a connected snap scroller with no existing deck controller');
  const browser = view;
  function resolve(input: GlassSnapDeckOptions) {
    if (!input || !Array.isArray(input.items) || !input.items.length || input.items.length > 128) throw new RangeError('Snap decks require one to 128 authored items');
    const items = [...input.items];
    if (new Set(items).size !== items.length || items.some(item => !(item instanceof browser.HTMLElement) || item.ownerDocument !== doc || item.parentElement !== scroller || !item.isConnected || (owned.has(item) && owned.get(item) !== scroller))) throw new Error('Use unique unowned same-document direct child items');
    const order = [...scroller.children].filter(child => items.includes(child as HTMLElement)); if (items.some((item, index) => order[index] !== item)) throw new Error('Deck items must remain in authored DOM/source order');
    if (input.axis !== undefined && input.axis !== 'x' && input.axis !== 'y') throw new RangeError('Snap axis must be x or y');
    return { items, axis: input.axis ?? 'x', reducedMotion: Boolean(input.reducedMotion), settleDelay: typeof input.settleDelay === 'number' && Number.isFinite(input.settleDelay) ? Math.max(80, Math.min(250, input.settleDelay)) : 120, onChange: input.onChange };
  }
  let options = resolve(initial), destroyed = false, index = -1, currentItem: HTMLElement | null = null, requested: number | null = null;
  let cards: Card[] = [], minimum = 0, maximum = 0, clientSize = 0, rtl = false;
  let timer: number | null = null, movement = false;
  let canNext = false, canPrevious = false;
  const nativeEnd = 'onscrollend' in scroller, media = browser.matchMedia?.('(prefers-reduced-motion: reduce)');
  const marker = attribute(scroller, 'data-lg-snap-deck'), reduction = attribute(scroller, 'data-lg-snap-reduced');
  let leases: { item: HTMLElement; marker: Lease; active: Lease }[] = [];
  const reduced = () => options.reducedMotion || Boolean(media?.matches);
  const position = () => Math.max(minimum, Math.min(maximum, options.axis === 'x' ? scroller.scrollLeft : scroller.scrollTop));
  function clearTimer() { if (timer !== null) browser.clearTimeout(timer); timer = null; }
  function notify(reason: GlassSnapDeckReason, force = false) {
    const value = position(); let card: Card | undefined;
    if (cards.length) {
      const start = rtl ? maximum : minimum, end = rtl ? minimum : maximum;
      if (Math.abs(value - start) <= .5 || maximum - minimum <= .5) card = cards[0];
      else if (Math.abs(value - end) <= .5) card = cards.at(-1);
      else { const center = value + clientSize / 2; card = cards.find(item => center >= item.low && center <= item.high) ?? cards.reduce((best, next) => Math.abs(next.center - center) < Math.abs(best.center - center) ? next : best); }
    }
    const next = card?.index ?? -1, item = card?.item ?? null;
    const at = cards.findIndex(candidate => candidate.index === next), forward = Boolean(candidate(1, at, value)), backward = Boolean(candidate(-1, at, value));
    const changed = next !== index || item !== currentItem || forward !== canNext || backward !== canPrevious;
    canNext = forward; canPrevious = backward;
    index = next; currentItem = item;
    for (const lease of leases) lease.active.write(String(lease.item === item));
    if (changed || force) { try { options.onChange?.(Object.freeze({ index, item, canNext, canPrevious, reason })); } catch (error) { scroller.dispatchEvent(new browser.CustomEvent('lg-deck-error', { bubbles: true, detail: { error, phase: 'change' } })); } }
  }
  function settled(reason: GlassSnapDeckReason = 'scroll') { if (destroyed) return; clearTimer(); movement = false; requested = null; notify(reason); }
  function writePosition(value: number, behavior: ScrollBehavior) {
    if (typeof scroller.scrollTo === 'function') scroller.scrollTo(options.axis === 'x' ? { left: value, behavior } : { top: value, behavior });
    else { if (options.axis === 'x') scroller.scrollLeft = value; else scroller.scrollTop = value; }
  }
  function interruptOwned() {
    const wasOwned = requested !== null; requested = null;
    if (wasOwned && scroller.isConnected) writePosition(position(), 'instant');
    clearTimer(); movement = false;
  }
  const pixels = (value: string, size: number) => { const number = Number.parseFloat(value); return Number.isFinite(number) ? value.endsWith('%') ? number * size / 100 : number : 0; };
  function measure(reason: GlassSnapDeckReason, force = false, interruptIfChanged = false) {
    if (destroyed) return;
    marker.write(options.axis); reduction.write(String(reduced()));
    const bounds = scroller.getBoundingClientRect(), style = browser.getComputedStyle(scroller);
    const nextClientSize = options.axis === 'x' ? scroller.clientWidth : scroller.clientHeight;
    const extent = Math.max(0, (options.axis === 'x' ? scroller.scrollWidth : scroller.scrollHeight) - nextClientSize);
    const nextRtl = options.axis === 'x' && style.direction === 'rtl', nextMinimum = nextRtl ? -extent : 0, nextMaximum = nextRtl ? 0 : extent;
    const value = options.axis === 'x' ? scroller.scrollLeft : scroller.scrollTop, edge = options.axis === 'x' ? bounds.left + scroller.clientLeft : bounds.top + scroller.clientTop;
    const padding = pixels(options.axis === 'y' ? style.scrollPaddingTop : nextRtl ? style.scrollPaddingRight : style.scrollPaddingLeft, nextClientSize);
    const nextCards: Card[] = [];
    if (scroller.isConnected && !scroller.closest('[hidden],[inert]') && style.display !== 'none' && style.visibility !== 'hidden' && nextClientSize > 0) for (const [index, item] of options.items.entries()) {
      if (item.parentElement !== scroller || !item.isConnected || item.closest('[hidden],[inert]')) continue;
      const itemStyle = browser.getComputedStyle(item), rect = item.getBoundingClientRect();
      const low = value + (options.axis === 'x' ? rect.left : rect.top) - edge, high = low + (options.axis === 'x' ? rect.width : rect.height);
      if (high <= low || itemStyle.display === 'none' || itemStyle.visibility === 'hidden') continue;
      const margin = pixels(options.axis === 'y' ? itemStyle.scrollMarginTop : nextRtl ? itemStyle.scrollMarginRight : itemStyle.scrollMarginLeft, nextClientSize);
      const anchor = nextRtl ? high - nextClientSize + padding + margin : low - padding - margin;
      nextCards.push({ item, index, anchor: Math.max(nextMinimum, Math.min(nextMaximum, anchor)), low, high, center: (low + high) / 2 });
    }
    // Initial/re-observe deliveries can arrive after a new smooth request. They
    // are not a resize unless the actual cached snap geometry changed. Compare
    // scroll-independent positions with a small floating-point tolerance; a real
    // size, direction, visibility, membership, padding or margin change still
    // interrupts. An unchanged delivery must not publish a moving view as settled.
    const samePixel = (left: number, right: number) => Math.abs(left - right) <= .0001;
    const changed = clientSize !== nextClientSize || rtl !== nextRtl || minimum !== nextMinimum || maximum !== nextMaximum
      || cards.length !== nextCards.length || cards.some((card, index) => {
        const next = nextCards[index];
        return card.item !== next.item || card.index !== next.index || !samePixel(card.anchor, next.anchor)
          || !samePixel(card.low, next.low) || !samePixel(card.high, next.high);
      });
    if (interruptIfChanged && !changed) return;
    clientSize = nextClientSize; rtl = nextRtl; minimum = nextMinimum; maximum = nextMaximum; cards = nextCards;
    if (interruptIfChanged) interruptOwned();
    notify(reason, force);
  }
  function goTo(next: number) {
    if (destroyed || doc.hidden || !scroller.isConnected || scroller.closest('[hidden],[inert]') || !Number.isInteger(next)) return false;
    const card = cards.find(item => item.index === next); if (!card || card.item.parentElement !== scroller || !card.item.isConnected) return false;
    const instant = reduced() || typeof scroller.scrollTo !== 'function';
    if (Math.abs(position() - card.anchor) <= .5) { settled('api'); return true; }
    requested = next; movement = true; writePosition(card.anchor, instant ? 'instant' : 'smooth');
    if (instant) settled('api');
    // A native smooth request is not a settled index change. Native scrollend or
    // the fallback following actual scroll events supplies its final position.
    return true;
  }
  function candidate(delta: number, from: number, value: number) {
    for (let next = from + delta; next >= 0 && next < cards.length; next += delta) if (Math.abs(cards[next].anchor - value) > .5) return cards[next];
    return undefined;
  }
  function step(delta: number) {
    const from = cards.findIndex(card => card.index === (requested ?? index));
    const reference = requested === null || from < 0 ? position() : cards[from].anchor;
    const next = candidate(delta, from, reference); return next ? goTo(next.index) : false;
  }
  function scrolled() {
    if (destroyed) return; movement = true;
    if (!nativeEnd) { clearTimer(); timer = browser.setTimeout(() => settled(), options.settleDelay); }
  }
  const scrollEnded = () => { if (movement || requested !== null) settled(); };
  const userInput = () => { requested = null; };
  const resized = () => { if (!destroyed) measure('resize', false, true); };
  const preference = () => {
    if (destroyed) return;
    if (reduced() && requested !== null) interruptOwned();
    reduction.write(String(reduced()));
    // The OS change does not make a user's still-moving scroll suddenly settled.
    if (!movement) notify('motion');
  };
  const visibility = () => { if (destroyed) return; if (doc.hidden) { interruptOwned(); notify('visibility'); } else measure('visibility'); };
  const Resize = (browser as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(resized) : undefined;
  function bindItems() { leases = options.items.map(item => { owned.set(item, scroller); const marker = attribute(item, 'data-lg-snap-item'), active = attribute(item, 'data-lg-snap-active'); marker.write(''); observer?.observe(item); return { item, marker, active }; }); observer?.observe(scroller); }
  function releaseItems() { observer?.disconnect(); for (const lease of leases) { owned.delete(lease.item); lease.marker.restore(); lease.active.restore(); } leases = []; }
  roots.add(scroller); bindItems(); scroller.addEventListener('scroll', scrolled, { passive: true }); scroller.addEventListener('scrollend', scrollEnded); scroller.addEventListener('wheel', userInput, { passive: true }); scroller.addEventListener('pointerdown', userInput, { passive: true }); scroller.addEventListener('touchstart', userInput, { passive: true });
  browser.addEventListener('resize', resized); media?.addEventListener('change', preference); doc.addEventListener('visibilitychange', visibility); measure('initial', true);
  return {
    get index() { return index; }, get canNext() { return canNext; }, get canPrevious() { return canPrevious; }, goTo, next: () => step(1), previous: () => step(-1), refresh() { if (!destroyed) { interruptOwned(); measure('refresh'); } },
    update(next) { if (destroyed) return; const replacement = resolve(next); interruptOwned(); releaseItems(); options = replacement; bindItems(); measure('update'); },
    destroy() {
      if (destroyed) return; interruptOwned(); destroyed = true; roots.delete(scroller); releaseItems(); marker.restore(); reduction.restore();
      scroller.removeEventListener('scroll', scrolled); scroller.removeEventListener('scrollend', scrollEnded); scroller.removeEventListener('wheel', userInput); scroller.removeEventListener('pointerdown', userInput); scroller.removeEventListener('touchstart', userInput);
      browser.removeEventListener('resize', resized); media?.removeEventListener('change', preference); doc.removeEventListener('visibilitychange', visibility);
    },
  };
}
