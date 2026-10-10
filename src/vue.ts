import { defineComponent, h, onBeforeUnmount, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { attachGlass, attachGlassMotion, getGlassProps } from './index.js';
import type { GlassMotionOptions, GlassOptions } from './index.js';
export const GlassSurface = defineComponent({
  name: 'GlassSurface', inheritAttrs: false,
  props: { as: { type: String, default: 'div' }, glass: { type: Object as PropType<GlassOptions>, default: () => ({}) }, motion: { type: Object as PropType<GlassMotionOptions>, default: undefined } },
  setup(props, { attrs, slots, expose }) {
    const element = ref<HTMLElement>();
    let controller: ReturnType<typeof attachGlass> | undefined;
    let motionController: ReturnType<typeof attachGlassMotion> | undefined;
    watch(element, value => {
      motionController?.destroy(); motionController = undefined;
      controller?.destroy();
      controller = value ? attachGlass(value, props.glass) : undefined;
      if (value && props.motion) motionController = attachGlassMotion(value, props.motion);
    }, { flush: 'post' });
    onBeforeUnmount(() => { motionController?.destroy(); motionController = undefined; controller?.destroy(); controller = undefined; });
    watch(() => props.glass, value => controller?.update(value), { deep: true });
    watch(() => props.motion, value => {
      if (!value) { motionController?.destroy(); motionController = undefined; }
      else if (motionController) motionController.update(value);
      else if (element.value && controller) motionController = attachGlassMotion(element.value, value);
    }, { deep: true, flush: 'post' });
    expose({ element });
    return () => { const material = getGlassProps(props.glass); const { className, style, ...data } = material;
      return h(props.as, { ...attrs, ...data, ref: element, class: [className, props.motion && 'lg-motion', attrs.class], style: [style, attrs.style] }, slots.default?.()); };
  },
});
