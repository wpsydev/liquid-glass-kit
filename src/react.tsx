'use client';
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { attachGlass, attachGlassMotion, getGlassProps } from './index.js';
import type { GlassMotionOptions, GlassOptions } from './index.js';
export interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> { as?: 'div' | 'section' | 'nav' | 'aside' | 'header' | 'footer'; glass?: GlassOptions; motion?: GlassMotionOptions; children?: ReactNode }
function useGlass(options: GlassOptions | undefined, tag: string, motion: GlassMotionOptions | undefined) {
  const ref = useRef<HTMLElement | null>(null);
  const controller = useRef<ReturnType<typeof attachGlass> | null>(null);
  const motionController = useRef<ReturnType<typeof attachGlassMotion> | null>(null);
  const o = options ?? {};
  useEffect(() => {
    if (!ref.current) return;
    const attached = attachGlass(ref.current, o);
    controller.current = attached;
    if (motion) motionController.current = attachGlassMotion(ref.current, motion);
    return () => {
      motionController.current?.destroy(); motionController.current = null;
      attached.destroy(); if (controller.current === attached) controller.current = null;
    };
  }, [tag]);
  useEffect(() => { controller.current?.update(o); }, [tag, o.variant, o.appearance, o.radius, o.blur, o.saturation, o.refraction, o.interactive, o.reducedTransparency, o.tint, o.tintOpacity, o.opacity, o.backdrop]);
  useEffect(() => {
    if (!motion) { motionController.current?.destroy(); motionController.current = null; }
    else if (motionController.current) motionController.current.update(motion);
    else if (ref.current && controller.current) motionController.current = attachGlassMotion(ref.current, motion);
  }, [tag, Boolean(motion), motion?.stiffness, motion?.damping, motion?.mass, motion?.pressScale, motion?.stretch, motion?.reducedMotion]);
  return ref;
}
export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(function GlassSurface({ as = 'div', glass, motion, className = '', style, ...props }, forwarded) {
  const ref = useGlass(glass, as, motion);
  useImperativeHandle(forwarded, () => ref.current!, [as]);
  const material = getGlassProps(glass);
  return createElement(as, { ...props, ...material, className: `lg-glass ${motion ? 'lg-motion ' : ''}${className}`.trim(), style: { ...material.style, ...style } as CSSProperties, ref });
});
export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { glass?: GlassOptions; motion?: GlassMotionOptions }
export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton({ glass, motion, className = '', style, type = 'button', ...props }, forwarded) {
  const ref = useGlass(glass, 'button', motion);
  useImperativeHandle(forwarded, () => ref.current as HTMLButtonElement, []);
  const material = getGlassProps(glass);
  return createElement('button', { ...props, ...material, type, className: `lg-glass lg-button ${motion ? 'lg-motion ' : ''}${className}`.trim(), style: { ...material.style, ...style } as CSSProperties, ref });
});
