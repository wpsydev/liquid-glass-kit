import { defineComponent, h, onBeforeUnmount, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { attachGlass, getGlassProps } from './index.js';
import type { GlassOptions } from './index.js';
export const GlassSurface = defineComponent({
  name: 'GlassSurface', inheritAttrs: false,
  props: { as: { type: String, default: 'div' }, glass: { type: Object as PropType<GlassOptions>, default: () => ({}) } },
  setup(props, { attrs, slots, expose }) {
    const element = ref<HTMLElement>();
    let controller: ReturnType<typeof attachGlass> | undefined;
    watch(element, value => {
      controller?.destroy();
      controller = value ? attachGlass(value, props.glass) : undefined;
    }, { flush: 'post' });
    onBeforeUnmount(() => { controller?.destroy(); controller = undefined; });
    watch(() => props.glass, value => controller?.update(value), { deep: true });
    expose({ element });
    return () => { const material = getGlassProps(props.glass); const { className, style, ...data } = material;
      return h(props.as, { ...attrs, ...data, ref: element, class: [className, attrs.class], style: [style, attrs.style] }, slots.default?.()); };
  },
});
