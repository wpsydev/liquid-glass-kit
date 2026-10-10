import { defineComponent, h, onBeforeUnmount, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { getGlassProps } from './index.js';
import type { GlassMotionOptions, GlassOptions } from './index.js';
import { bindGlass } from './binding.js';
export const GlassSurface = defineComponent({
  name: 'GlassSurface', inheritAttrs: false,
  props: { as: { type: String, default: 'div' }, glass: { type: Object as PropType<GlassOptions>, default: () => ({}) }, motion: { type: Object as PropType<GlassMotionOptions>, default: undefined } },
  setup(props, { attrs, slots, expose }) {
    const element = ref<HTMLElement>();
    let binding: ReturnType<typeof bindGlass> | undefined;
    watch([element, () => props.glass, () => props.motion], ([value, glass, motion]) => {
      if (binding?.element !== value) {
        binding?.destroy(); binding = value ? bindGlass(value, glass, motion) : undefined;
      } else binding?.update(glass, motion);
    }, { deep: true, flush: 'post' });
    onBeforeUnmount(() => { binding?.destroy(); binding = undefined; });
    expose({ element });
    return () => { const material = getGlassProps(props.glass); const { className, style, ...data } = material;
      return h(props.as, { ...attrs, ...data, ref: element, class: [className, props.motion && 'lg-motion', attrs.class], style: [style, attrs.style] }, slots.default?.()); };
  },
});
