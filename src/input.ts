import { listen, type GlassEventBinding } from './lifecycle.js';

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

/** Shared semantic input ownership; callbacks never cancel native activation. */
export function attachGlassPressInput(element: HTMLElement, view: Window,
  press: (event?: PointerEvent) => boolean, release: () => void,
  hover?: (event: PointerEvent) => void, leave?: () => void) {
  let pointer: number | null = null, key: string | null = null;
  const reset = () => { pointer = null; key = null; };
  const stop = () => { reset(); release(); };
  const disabled = () => element.matches(':disabled, [aria-disabled="true"]');
  const down = (event: PointerEvent) => {
    if (pointer !== null || key !== null || event.isPrimary === false || disabled() || !isGlassPressTarget(element, event) || (event.button !== undefined && event.button !== 0)) return;
    if (press(event)) pointer = glassPointerId(event);
  };
  const up = (event: PointerEvent) => { if (pointer !== null && (event.pointerId === undefined || glassPointerId(event) === pointer)) stop(); };
  const keyDown = (event: KeyboardEvent) => {
    if (pointer !== null || key !== null || event.target !== element || event.repeat || disabled()) return;
    if ((event.key === 'Enter' || event.key === ' ') && element.matches('button, a[href], [role="button"]') && press()) key = event.key;
  };
  const keyUp = (event: KeyboardEvent) => { if (event.target === element && event.key === key) stop(); };
  const bindings: GlassEventBinding[] = [
    [element, 'pointerdown', down as EventListener], [element, 'keydown', keyDown as EventListener], [element, 'keyup', keyUp as EventListener],
    [element, 'lostpointercapture', up as EventListener], [element, 'focusout', stop],
    [view, 'pointerup', up as EventListener], [view, 'pointercancel', up as EventListener], [view, 'blur', stop],
  ];
  if (hover) bindings.push([element, 'pointermove', hover as EventListener]);
  if (leave) bindings.push([element, 'pointerleave', leave]);
  const unlisten = listen(bindings);
  return { reset, destroy() { reset(); unlisten(); } };
}
