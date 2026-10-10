import type { GlassMotionOptions, GlassOptions } from './index.js';
import { bindGlass } from './binding.js';
/** Explicit registration keeps importing this module safe during SSR. */
export function registerGlassElement(name = 'liquid-glass', view?: Window) {
  const w = view ?? (typeof window === 'undefined' ? undefined : window);
  if (!w) return;
  const registry = w.customElements;
  if (registry.get(name)) return;
  const Base = (w as Window & { HTMLElement: typeof HTMLElement }).HTMLElement;
  class LiquidGlassElement extends Base {
    static observedAttributes = ['variant', 'appearance', 'radius', 'corner', 'blur', 'saturation', 'refraction', 'interactive', 'reduced-transparency', 'tint', 'tint-opacity', 'opacity', 'backdrop', 'motion', 'motion-stiffness', 'motion-damping', 'motion-mass', 'motion-press-scale', 'motion-stretch', 'reduced-motion'];
    private binding?: ReturnType<typeof bindGlass>;
    private numeric(key: string) { return this.hasAttribute(key) ? Number(this.getAttribute(key)) : undefined; }
    private options(): GlassOptions {
      return {
        variant: this.getAttribute('variant') as GlassOptions['variant'],
        appearance: this.getAttribute('appearance') as GlassOptions['appearance'],
        backdrop: this.getAttribute('backdrop') as GlassOptions['backdrop'],
        corner: this.getAttribute('corner') as GlassOptions['corner'],
        radius: this.numeric('radius'), blur: this.numeric('blur'), saturation: this.numeric('saturation'), refraction: this.numeric('refraction'),
        tint: this.getAttribute('tint') ?? undefined, tintOpacity: this.numeric('tint-opacity'), opacity: this.numeric('opacity'),
        interactive: this.hasAttribute('interactive'), reducedTransparency: this.hasAttribute('reduced-transparency'),
      };
    }
    private motionOptions(): GlassMotionOptions {
      return { stiffness: this.numeric('motion-stiffness'), damping: this.numeric('motion-damping'), mass: this.numeric('motion-mass'), pressScale: this.numeric('motion-press-scale'), stretch: this.numeric('motion-stretch'), reducedMotion: this.hasAttribute('reduced-motion') };
    }
    private motion() { return this.hasAttribute('motion') ? this.motionOptions() : undefined; }
    connectedCallback() {
      this.binding?.destroy(); this.binding = bindGlass(this, this.options(), this.motion());
    }
    disconnectedCallback() { this.binding?.destroy(); this.binding = undefined; }
    attributeChangedCallback() { this.binding?.update(this.options(), this.motion()); }
  }
  registry.define(name, LiquidGlassElement);
}
