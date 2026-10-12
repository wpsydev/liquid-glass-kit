import { getGlassProps, resolveOptions } from './material.js';
import type { GlassOptions } from './material.js';
import { bounded } from './numeric.js';

export interface GlassReadabilityOptions {
  /** One to 64 host-supplied opaque #RGB/#RRGGBB samples, never sampled from the DOM. */
  backdrops: string[];
  material?: GlassOptions;
  /** Deterministic tone. Defaults to a material tone, then light; no OS/DOM inspection. */
  appearance?: 'light' | 'dark';
  /** One to eight opaque hex inks. Default black and white. */
  candidates?: string[];
  /** Advisory threshold, clamped to 1–21. Default 4.5. Comparisons are not rounded. */
  minimumRatio?: number;
}
type RGB = [number, number, number];
export interface GlassReadabilitySample {
  backdrop: string;
  /** Rounded hex preview of the simplified composition, not a captured pixel. */
  estimatedSurface: string;
  /** Unrounded nonlinear sRGB channels in 0–255 used for the ratio calculation. */
  estimatedRGB: RGB;
  ratio: number;
}
const materialKeys = ['variant', 'appearance', 'backdrop', 'radius', 'corner', 'blur', 'saturation', 'opacity', 'tint', 'tintOpacity', 'refraction', 'interactive', 'reducedTransparency'];
const fail = (path: string, reason: string): never => { throw new TypeError(`Invalid glass readability ${path}: ${reason}`); };
const record = (value: unknown, keys: readonly string[], path: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail(path, 'expected a plain object');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) return fail(path, 'unknown property');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return fail(path, 'accessors are not accepted');
    result[key] = descriptor.value;
  }
  return result;
};
const normalizeHex = (value: unknown, path: string) => {
  if (typeof value !== 'string' || !/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(value)) return fail(path, 'expected opaque #RGB or #RRGGBB');
  return (value.length === 4 ? `#${[...value.slice(1)].map(part => part + part).join('')}` : value).toLowerCase();
};
const colors = (value: unknown, maximum: number, path: string): string[] => {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum || Object.getPrototypeOf(value) !== Array.prototype) return fail(path, `expected one to ${maximum} colors`);
  for (const key of Reflect.ownKeys(value)) {
    if (key !== 'length' && (typeof key !== 'string' || !/^\d+$/.test(key))) return fail(path, 'unknown array property');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return fail(path, 'accessors are not accepted');
  }
  return Array.from({ length: value.length }, (_, index) => {
    if (!Object.hasOwn(value, index)) return fail(path, 'sparse arrays are not accepted');
    return normalizeHex(value[index], `${path}.${index}`);
  });
};
const rgb = (hex: string): RGB => [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16)) as RGB;
const hex = (channels: RGB) => `#${channels.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
const luminance = (channels: RGB) => channels.map(channel => {
  const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
const contrast = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

/**
 * Optional pure preflight over supplied opaque samples. Estimate only a uniform
 * source-over fill in nonlinear sRGB, then evaluate its WCAG luminance contrast.
 * This does not model blur, gradients, tint, saturation, shadows, refraction,
 * custom stylesheet overrides or unseen content, and cannot certify a rendered UI.
 * The returned props explicitly pin tone, ink and fill variables to this model.
 * An opaque recommendation disables the glass backdrop via actual core props.
 * Reevaluate when host state changes; there is no DOM, pixel readback or frame loop.
 */
export function resolveGlassReadability(input: GlassReadabilityOptions) {
  const config = record(input, ['backdrops', 'material', 'appearance', 'candidates', 'minimumRatio'], 'config');
  const backdrops = colors(config.backdrops, 64, 'backdrops');
  const candidates = config.candidates === undefined ? ['#000000', '#ffffff'] : colors(config.candidates, 8, 'candidates');
  if (config.minimumRatio !== undefined && (typeof config.minimumRatio !== 'number' || !Number.isFinite(config.minimumRatio))) fail('minimumRatio', 'expected a finite number');
  const minimumRatio = bounded(config.minimumRatio as number | undefined, 4.5, 1, 21);
  if (config.appearance !== undefined && config.appearance !== 'light' && config.appearance !== 'dark') fail('appearance', 'expected light or dark');
  const requested = config.material === undefined ? {} : record(config.material, materialKeys, 'material');
  for (const key of ['radius', 'blur', 'saturation', 'opacity', 'tintOpacity', 'refraction']) {
    if (requested[key] !== undefined && (typeof requested[key] !== 'number' || !Number.isFinite(requested[key]))) fail(`material.${key}`, 'expected a finite number');
  }
  for (const key of ['interactive', 'reducedTransparency']) if (requested[key] !== undefined && typeof requested[key] !== 'boolean') fail(`material.${key}`, 'expected a boolean');
  for (const [key, allowed] of Object.entries({ variant: ['regular', 'clear'], appearance: ['auto', 'light', 'dark'], backdrop: ['auto', 'light', 'dark'], corner: ['round', 'continuous'] })) {
    if (requested[key] !== undefined && !allowed.includes(requested[key] as string)) fail(`material.${key}`, 'unknown option');
  }
  if (requested.tint !== undefined) normalizeHex(requested.tint, 'material.tint');
  const material = resolveOptions(requested as GlassOptions);
  const appearance = config.appearance as 'light' | 'dark' | undefined
    ?? (material.appearance !== 'auto' ? material.appearance : material.backdrop !== 'auto' ? material.backdrop : 'light');
  // These are the base material.css tones; explicit variables below pin the
  // composition even when the application's stylesheet has different defaults.
  const fill: RGB = appearance === 'light' ? [245, 247, 252] : [22, 28, 43];
  const baseAlpha = material.variant === 'clear' ? .24 : .72;
  const alpha = baseAlpha * material.opacity;
  const cache = new Map<string, RGB>();
  const parsed = (value: string) => { let channels = cache.get(value); if (!channels) { channels = rgb(value); cache.set(value, channels); } return channels; };
  const surfaces = backdrops.map(backdrop => {
    const channels = parsed(backdrop).map((channel, index) => fill[index] * alpha + channel * (1 - alpha)) as RGB;
    return { backdrop, channels, surfaceLuminance: luminance(channels), preview: hex(channels) };
  });
  // Score candidates without allocating a sample object for every losing ink.
  // Strictly greater preserves the first candidate when scores tie.
  let bestInk = candidates[0], bestRatio = -Infinity, bestLuminance = 0;
  for (const ink of candidates) {
    const inkLuminance = luminance(parsed(ink));
    let worst = Infinity;
    for (const surface of surfaces) worst = Math.min(worst, contrast(inkLuminance, surface.surfaceLuminance));
    if (worst > bestRatio) { bestInk = ink; bestRatio = worst; bestLuminance = inkLuminance; }
  }
  const translucent = {
    chosenInk: bestInk, worstSampleRatio: bestRatio,
    samples: surfaces.map(({ backdrop, channels, surfaceLuminance, preview }): GlassReadabilitySample => ({
      backdrop, estimatedSurface: preview, estimatedRGB: channels, ratio: contrast(bestLuminance, surfaceLuminance),
    })),
  };
  const unsupported = material.tintOpacity > 0 || material.refraction > 0;
  const solid = material.reducedTransparency || unsupported || translucent.worstSampleRatio < minimumRatio;
  const chosenInk = solid ? appearance === 'light' ? '#000000' : '#ffffff' : translucent.chosenInk;
  let opaqueFill = appearance === 'light' ? '#f4f6fb' : '#192133';
  const chosenLuminance = luminance(parsed(chosenInk));
  let opaqueRatio = contrast(luminance(rgb(opaqueFill)), chosenLuminance);
  if (opaqueRatio < minimumRatio) {
    const onBlack = contrast(0, chosenLuminance), onWhite = contrast(1, chosenLuminance);
    opaqueFill = onWhite >= onBlack ? '#ffffff' : '#000000'; opaqueRatio = Math.max(onWhite, onBlack);
  }
  // Keep the selected ink readable even if CSS accessibility preferences switch
  // a translucent result to its opaque fallback without rerunning this utility.
  const opaqueFallback = { fill: opaqueFill, ink: chosenInk, ratio: opaqueRatio };
  const samples = solid ? backdrops.map((backdrop): GlassReadabilitySample => ({ backdrop, estimatedSurface: opaqueFill, estimatedRGB: rgb(opaqueFill), ratio: opaqueRatio })) : translucent.samples;
  const props = getGlassProps({ ...material, appearance, reducedTransparency: solid });
  Object.assign(props.style, {
    '--lg-ink': chosenInk, '--lg-fill-rgb': fill.join(' '), '--lg-fill-alpha': String(baseAlpha), '--lg-solid-fill': opaqueFill,
  });
  const reason = material.reducedTransparency ? 'The application explicitly requested an opaque material.'
    : unsupported ? 'Tint or experimental refraction is outside the simplified model; use the opaque recommendation.'
    : solid ? 'No supplied ink meets the threshold across every estimated sample; use the opaque recommendation.'
    : 'The selected ink meets the threshold across the supplied simplified estimates only; check the rendered interface separately.';
  const assumptions = [
    'Host-supplied opaque hex samples are evaluated once; no DOM or pixel sampling is performed.',
    'Uniform source-over composition in nonlinear sRGB uses the pinned base fill and alpha times normalized material opacity.',
    'Ratios use unrounded estimated RGB and WCAG sRGB luminance; estimatedSurface is only a rounded hex preview.',
    'Blur, gradients, tint, saturation, shadows, refraction, unseen content and stylesheet overrides are not predicted.',
    'Appearance is pinned deterministically; host applications must reevaluate when their tone or sample set changes.',
    'A sampled estimate is not a WCAG conformance claim, an image/video guarantee or a physical-device rendering test.',
  ];
  return { chosenInk, solid, worstSampleRatio: Math.min(...samples.map(sample => sample.ratio)), samples, props, assumptions, reason,
    minimumRatio, estimatedFill: { color: hex(fill), alpha }, translucent, opaqueFallback };
}
