export interface GlassOptions {
  /** Regular is the readable default; clear needs a controlled media backdrop. */
  variant?: 'regular' | 'clear';
  appearance?: 'auto' | 'light' | 'dark';
  /** App-provided backdrop tone. Used only when appearance is auto; no DOM sampling. */
  backdrop?: 'auto' | 'light' | 'dark';
  radius?: number;
  /** Optional web superellipse enhancement; unsupported engines retain round corners. */
  corner?: 'round' | 'continuous';
  blur?: number;
  saturation?: number;
  /** Material fill strength, 0–1. Accessibility can still force an opaque material. */
  opacity?: number;
  /** Semantic tint hue: a #RGB or #RRGGBB color. */
  tint?: string;
  /** Independent tint layer alpha, 0–1. */
  tintOpacity?: number;
  /** Experimental live-backdrop displacement, Chromium only. Zero is portable. */
  refraction?: number;
  /** Pointer lighting and touch/keyboard press feedback; respects reduced motion. */
  interactive?: boolean;
  /** Explicit app preference, including browsers without the media query. */
  reducedTransparency?: boolean;
}
export type ResolvedGlassOptions = Required<GlassOptions>;
const finite = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback;
const tone = (value: unknown) => value === 'light' || value === 'dark' ? value : 'auto';
export function resolveOptions(options: GlassOptions = {}): ResolvedGlassOptions {
  const variant = options.variant === 'clear' ? 'clear' : 'regular';
  return {
    variant,
    appearance: tone(options.appearance),
    backdrop: tone(options.backdrop),
    radius: finite(options.radius, 24, 0, 999),
    corner: options.corner === 'continuous' ? 'continuous' : 'round',
    blur: finite(options.blur, variant === 'clear' ? 6 : 18, 0, 64),
    saturation: finite(options.saturation, 1.35, 0, 3),
    opacity: finite(options.opacity, 1, 0, 1),
    tint: typeof options.tint === 'string' && /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(options.tint) ? options.tint.toLowerCase() : '#ffffff',
    tintOpacity: finite(options.tintOpacity, 0, 0, 1),
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
    'data-lg-backdrop': o.backdrop,
    'data-lg-solid': String(o.reducedTransparency),
    'data-lg-interactive': String(o.interactive),
    'data-lg-corner': o.corner,
    style: {
      '--lg-radius': `${o.radius}px`, '--lg-blur': `${o.blur}px`, '--lg-saturation': String(o.saturation),
      '--lg-opacity': String(o.opacity), '--lg-tint': o.tint, '--lg-tint-opacity': String(o.tintOpacity),
    } as Record<string, string>,
  };
}
/** Concentric circular-corner approximation, in CSS pixels; also useful as a nesting token. */
export function getGlassInnerRadius(outerRadius: number, inset: number): number {
  return Math.max(0, finite(outerRadius, 0, 0, 999) - finite(inset, 0, 0, 999));
}
