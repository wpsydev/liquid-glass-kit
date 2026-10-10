export type GlassEventBinding = readonly [EventTarget, string, EventListener, (boolean | AddEventListenerOptions)?];
/** Install once; cleanup uses the same listener and capture configuration. */
export function listen(bindings: readonly GlassEventBinding[]) {
  for (const [target, type, listener, options] of bindings) target.addEventListener(type, listener, options);
  return () => { for (const [target, type, listener, options] of bindings) target.removeEventListener(type, listener, options); };
}
/** Preserve owned inline fields, priorities and the pre-existing class. */
export function captureState(element: HTMLElement, properties: readonly string[], attributes: readonly string[] = [], className?: string) {
  const styles = properties.map(key => [key, element.style.getPropertyValue(key), element.style.getPropertyPriority(key)] as const);
  const attrs = attributes.map(key => [key, element.getAttribute(key)] as const);
  const hadClass = className && element.classList.contains(className);
  return () => {
    for (const [key, value, priority] of styles) value ? element.style.setProperty(key, value, priority) : element.style.removeProperty(key);
    for (const [key, value] of attrs) value === null ? element.removeAttribute(key) : element.setAttribute(key, value);
    if (className && !hadClass) element.classList.remove(className);
  };
}
