import { attachGlass, attachGlassMotion } from './index.js';
import type { GlassMotionOptions, GlassOptions } from './index.js';
/** Explicit registration keeps importing this module safe during SSR. */
export function registerGlassElement(name = 'liquid-glass', view?: Window) {
  const w = view ?? (typeof window === 'undefined' ? undefined : window);
  if (!w) return;
  const registry = w.customElements;
  if (registry.get(name)) return;
  const Base = (w as Window & { HTMLElement: typeof HTMLElement }).HTMLElement;
  class LiquidGlassElement extends Base {
    static observedAttributes = ['variant', 'appearance', 'radius', 'corner', 'blur', 'saturation', 'refraction', 'interactive', 'reduced-transparency', 'tint', 'tint-opacity', 'opacity', 'backdrop', 'motion', 'motion-stiffness', 'motion-damping', 'motion-mass', 'motion-press-scale', 'motion-stretch', 'reduced-motion'];
    private controller?: ReturnType<typeof attachGlass>;
    private motionController?: ReturnType<typeof attachGlassMotion>;
    private options(): GlassOptions {
      const numeric = (key: string) => this.hasAttribute(key) ? Number(this.getAttribute(key)) : undefined;
      return {
        variant: this.getAttribute('variant') as GlassOptions['variant'],
        appearance: this.getAttribute('appearance') as GlassOptions['appearance'],
        backdrop: this.getAttribute('backdrop') as GlassOptions['backdrop'],
        corner: this.getAttribute('corner') as GlassOptions['corner'],
        radius: numeric('radius'), blur: numeric('blur'), saturation: numeric('saturation'), refraction: numeric('refraction'),
        tint: this.getAttribute('tint') ?? undefined, tintOpacity: numeric('tint-opacity'), opacity: numeric('opacity'),
        interactive: this.hasAttribute('interactive'), reducedTransparency: this.hasAttribute('reduced-transparency'),
      };
    }
    private motionOptions(): GlassMotionOptions {
      const numeric = (key: string) => this.hasAttribute(key) ? Number(this.getAttribute(key)) : undefined;
      return { stiffness: numeric('motion-stiffness'), damping: numeric('motion-damping'), mass: numeric('motion-mass'), pressScale: numeric('motion-press-scale'), stretch: numeric('motion-stretch'), reducedMotion: this.hasAttribute('reduced-motion') };
    }
    private syncMotion() {
      if (!this.hasAttribute('motion')) { this.motionController?.destroy(); this.motionController = undefined; }
      else if (this.motionController) this.motionController.update(this.motionOptions());
      else if (this.controller) this.motionController = attachGlassMotion(this, this.motionOptions());
    }
    connectedCallback() {
      this.motionController?.destroy(); this.motionController = undefined;
      this.controller?.destroy(); this.controller = attachGlass(this, this.options()); this.syncMotion();
    }
    disconnectedCallback() { this.motionController?.destroy(); this.motionController = undefined; this.controller?.destroy(); this.controller = undefined; }
    attributeChangedCallback(name: string) {
      if (name === 'motion' || name.startsWith('motion-') || name === 'reduced-motion') this.syncMotion();
      else this.controller?.update(this.options());
    }
  }
  registry.define(name, LiquidGlassElement);
}
