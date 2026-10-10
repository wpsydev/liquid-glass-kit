'use client';
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { attachGlass, getGlassProps } from './index.js';
import type { GlassOptions } from './index.js';
export interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> { as?: 'div' | 'section' | 'nav' | 'aside' | 'header' | 'footer'; glass?: GlassOptions; children?: ReactNode }
function useGlass(options: GlassOptions | undefined) {
  const ref = useRef<HTMLElement | null>(null);
  const controller = useRef<ReturnType<typeof attachGlass> | null>(null);
  const o = options ?? {};
  useEffect(() => { if (ref.current) controller.current = attachGlass(ref.current, o); return () => { controller.current?.destroy(); controller.current = null; }; }, []);
  useEffect(() => { controller.current?.update(o); }, [o.variant, o.appearance, o.radius, o.blur, o.saturation, o.refraction, o.interactive, o.reducedTransparency]);
  return ref;
}
export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(function GlassSurface({ as = 'div', glass, className = '', style, ...props }, forwarded) {
  const ref = useGlass(glass);
  useImperativeHandle(forwarded, () => ref.current!, []);
  const material = getGlassProps(glass);
  return createElement(as, { ...props, ...material, className: `lg-glass ${className}`.trim(), style: { ...material.style, ...style } as CSSProperties, ref });
});
export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { glass?: GlassOptions }
export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton({ glass, className = '', style, type = 'button', ...props }, forwarded) {
  const ref = useGlass(glass);
  useImperativeHandle(forwarded, () => ref.current as HTMLButtonElement, []);
  const material = getGlassProps(glass);
  return createElement('button', { ...props, ...material, type, className: `lg-glass lg-button ${className}`.trim(), style: { ...material.style, ...style } as CSSProperties, ref });
});
