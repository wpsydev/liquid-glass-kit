'use client';
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { getGlassProps } from './material.js';
import type { GlassOptions } from './material.js';
import type { GlassMotionOptions } from './motion.js';
import { bindGlass } from './binding.js';
export interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> { as?: 'div' | 'section' | 'nav' | 'aside' | 'header' | 'footer'; glass?: GlassOptions; motion?: GlassMotionOptions; children?: ReactNode }
function useGlass(options: GlassOptions | undefined, motion: GlassMotionOptions | undefined) {
  const ref = useRef<HTMLElement | null>(null);
  const binding = useRef<ReturnType<typeof bindGlass> | undefined>(undefined);
  useEffect(() => {
    if (binding.current?.element !== ref.current) {
      binding.current?.destroy();
      binding.current = ref.current ? bindGlass(ref.current, options, motion) : undefined;
    } else binding.current?.update(options, motion);
  });
  useEffect(() => () => { binding.current?.destroy(); binding.current = undefined; }, []);
  return ref;
}
export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(function GlassSurface({ as = 'div', glass, motion, className = '', style, ...props }, forwarded) {
  const ref = useGlass(glass, motion);
  useImperativeHandle(forwarded, () => ref.current!, [as]);
  const material = getGlassProps(glass);
  return createElement(as, { ...props, ...material, className: `lg-glass ${motion ? 'lg-motion ' : ''}${className}`.trim(), style: { ...material.style, ...style } as CSSProperties, ref });
});
export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { glass?: GlassOptions; motion?: GlassMotionOptions }
export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton({ glass, motion, className = '', style, type = 'button', ...props }, forwarded) {
  const ref = useGlass(glass, motion);
  useImperativeHandle(forwarded, () => ref.current as HTMLButtonElement, []);
  const material = getGlassProps(glass);
  return createElement('button', { ...props, ...material, type, className: `lg-glass lg-button ${motion ? 'lg-motion ' : ''}${className}`.trim(), style: { ...material.style, ...style } as CSSProperties, ref });
});
