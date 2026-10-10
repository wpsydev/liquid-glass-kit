export interface GlassOptions {
  /** Regular is the readable default; clear needs a controlled media backdrop. */
  variant?: 'regular' | 'clear';
  appearance?: 'auto' | 'light' | 'dark';
  radius?: number;
  blur?: number;
  saturation?: number;
  /** Experimental live-backdrop displacement, Chromium only. Zero is portable. */
  refraction?: number;
  interactive?: boolean;
  /** Explicit app preference, including browsers without the media query. */
  reducedTransparency?: boolean;
}
export type ResolvedGlassOptions = Required<GlassOptions>;
const finite = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback;
export function resolveOptions(options: GlassOptions = {}): ResolvedGlassOptions {
  return {
    variant: options.variant === 'clear' ? 'clear' : 'regular',
    appearance: options.appearance === 'light' || options.appearance === 'dark' ? options.appearance : 'auto',
    radius: finite(options.radius, 24, 0, 999),
    blur: finite(options.blur, 18, 0, 64),
    saturation: finite(options.saturation, 1.35, 0, 3),
    refraction: finite(options.refraction, 0, 0, 60),
    interactive: options.interactive ?? false,
    reducedTransparency: options.reducedTransparency ?? false,
  };
}
/** Pure and SSR-safe. Spread attributes; CSS variables belong on style. */
export function getGlassProps(options: GlassOptions = {}) {
  const o = resolveOptions(options);
  return {
    className: 'lg-glass',
    'data-lg-variant': o.variant,
    'data-lg-appearance': o.appearance,
    'data-lg-solid': String(o.reducedTransparency),
    'data-lg-interactive': String(o.interactive),
    style: {
      '--lg-radius': `${o.radius}px`, '--lg-blur': `${o.blur}px`, '--lg-saturation': String(o.saturation),
    } as Record<string, string>,
  };
}
