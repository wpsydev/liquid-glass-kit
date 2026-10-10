import { attachGlass } from './index.js';
import type { GlassOptions } from './index.js';
/** Explicit registration keeps importing this module safe during SSR. */
export function registerGlassElement(name = 'liquid-glass', view?: Window) {
  const w = view ?? (typeof window === 'undefined' ? undefined : window);
  if (!w) return;
  const registry = w.customElements;
  if (registry.get(name)) return;
  const Base = (w as Window & { HTMLElement: typeof HTMLElement }).HTMLElement;
  class LiquidGlassElement extends Base {
    static observedAttributes = ['variant', 'appearance', 'radius', 'blur', 'saturation', 'refraction', 'interactive', 'reduced-transparency', 'tint', 'tint-opacity', 'opacity', 'backdrop'];
    private controller?: ReturnType<typeof attachGlass>;
    private options(): GlassOptions {
      const numeric = (key: string) => this.hasAttribute(key) ? Number(this.getAttribute(key)) : undefined;
      return {
        variant: this.getAttribute('variant') as GlassOptions['variant'],
        appearance: this.getAttribute('appearance') as GlassOptions['appearance'],
        backdrop: this.getAttribute('backdrop') as GlassOptions['backdrop'],
        radius: numeric('radius'), blur: numeric('blur'), saturation: numeric('saturation'), refraction: numeric('refraction'),
        tint: this.getAttribute('tint') ?? undefined, tintOpacity: numeric('tint-opacity'), opacity: numeric('opacity'),
        interactive: this.hasAttribute('interactive'), reducedTransparency: this.hasAttribute('reduced-transparency'),
      };
    }
    connectedCallback() { this.controller?.destroy(); this.controller = attachGlass(this, this.options()); }
    disconnectedCallback() { this.controller?.destroy(); this.controller = undefined; }
    attributeChangedCallback() { this.controller?.update(this.options()); }
  }
  registry.define(name, LiquidGlassElement);
}
