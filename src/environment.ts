/** Conservative engine hints, not proof that an SVG filter rendered. */
export function getGlassCapabilities(view?: Window) {
  const w = view ?? (typeof window === 'undefined' ? undefined : window);
  const css = (w as (Window & { CSS?: typeof CSS }) | undefined)?.CSS;
  return {
    backdrop: Boolean(css?.supports('backdrop-filter', 'blur(1px)') || css?.supports('-webkit-backdrop-filter', 'blur(1px)')),
    experimentalRefraction: Boolean(w && /Chrome|Chromium|Edg\//.test(w.navigator.userAgent) && css?.supports('backdrop-filter', 'url("#lg-test")')),
    continuousCorners: Boolean(css?.supports('corner-shape', 'superellipse(1.5)')),
  };
}
const queries = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(forced-colors: active)'];
type Environment = { media: (MediaQueryList | undefined)[]; capabilities: ReturnType<typeof getGlassCapabilities>; listeners: Set<() => void>; changed: () => void };
const environments = new WeakMap<Window, Environment>();
/** Shared while mounted; the last controller releases every media listener. */
export function retainGlassEnvironment(view: Window, listener: () => void) {
  let environment = environments.get(view);
  if (!environment) {
    const listeners = new Set<() => void>();
    environment = { media: queries.map(query => view.matchMedia?.(query)), capabilities: getGlassCapabilities(view), listeners, changed: () => { for (const notify of listeners) notify(); } };
    for (const query of environment.media) query?.addEventListener('change', environment.changed);
    environments.set(view, environment);
  }
  const retained = environment;
  retained.listeners.add(listener);
  return {
    ...retained,
    release() {
      retained.listeners.delete(listener);
      if (retained.listeners.size) return;
      for (const query of retained.media) query?.removeEventListener('change', retained.changed);
      environments.delete(view);
    },
  };
}
