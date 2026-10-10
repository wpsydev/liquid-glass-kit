/** Ignore nested controls so their taps never deform a containing card or toolbar. */
export function isGlassPressTarget(element: HTMLElement, event: Event): boolean {
  const controls = 'button, input, select, textarea, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="slider"], [role="combobox"], [role="menuitem"]';
  const path = event.composedPath();
  for (const target of path.length ? path : [event.target]) {
    if (target === element) return true;
    const node = target as Element | null;
    if (typeof node?.matches === 'function' && node.matches(controls)) return false;
  }
  return event.target === element;
}
/** Real PointerEvents carry an id; zero preserves synthetic mouse-event compatibility. */
export const glassPointerId = (event: PointerEvent) => event.pointerId ?? 0;
