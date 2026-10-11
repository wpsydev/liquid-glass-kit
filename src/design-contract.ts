import { getGlassProps, resolveOptions } from './material.js';
import type { GlassOptions, ResolvedGlassOptions } from './material.js';

type Scale = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export interface GlassDesignContractOptions {
  name: string;
  description?: string;
  tokens: {
    /** This exporter deliberately accepts opaque hex colors only, not arbitrary CSS. */
    colors: { background: string; foreground: string; primary: string; accent?: string };
    /** Unquoted, comma-separated font families; no remote font is loaded. */
    fontFamily?: string;
    /** Pixel spacing, 0–256, using the bounded named scale. */
    spacing?: Partial<Record<Scale, number>>;
    /** Corner radius in pixels, 0–999. Takes precedence over material.radius. */
    radius?: number;
  };
  material?: GlassOptions;
  /** Up to twelve short, single-line instructions appended to the guardrails. */
  guidance?: string[];
}
export interface GlassDesignContractValidation {
  /** Whether the opaque foreground/background pair meets 4.5:1 normal-text contrast. */
  valid: boolean;
  warnings: string[];
  contrast: { foregroundOnBackground: number };
}
const scales: Scale[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const materialKeys = ['variant', 'appearance', 'backdrop', 'radius', 'corner', 'blur', 'saturation', 'opacity', 'tint', 'tintOpacity', 'refraction', 'interactive', 'reducedTransparency'];
const numericMaterial = ['radius', 'blur', 'saturation', 'opacity', 'tintOpacity', 'refraction'];
const defaultSpacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 };
const error = (path: string, reason: string): never => { throw new TypeError(`Invalid glass design contract ${path}: ${reason}`); };
const record = (value: unknown, keys: readonly string[], path: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return error(path, 'expected a plain object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return error(path, 'custom prototypes are not accepted');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) return error(path, `unknown key ${String(key)}`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (descriptor.get || descriptor.set) return error(path, 'accessors are not accepted');
    result[key] = descriptor.value;
  }
  return result;
};
const text = (value: unknown, path: string, maximum: number, empty = false) => {
  if (typeof value !== 'string' || value.length > maximum || /[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(value) || (!empty && !value.trim())) return error(path, `expected single-line text up to ${maximum} characters`);
  return value.trim();
};
const color = (value: unknown, path: string) => {
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return error(path, 'expected opaque #RGB or #RRGGBB');
  return (value.length === 4 ? `#${[...value.slice(1)].map(part => part + part).join('')}` : value).toLowerCase();
};
const dimension = (value: unknown, path: string, maximum: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum) return error(path, `expected a finite number between 0 and ${maximum}`);
  return value;
};
const markdown = (value: string) => value.replace(/[\\`*_{}\[\]()<>#!|]/g, '\\$&');
const quoted = (value: string) => JSON.stringify(value);
const rgb = (hex: string) => [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16));
const luminance = (hex: string) => rgb(hex).map(value => {
  const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
}).reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
const scopeID = (name: string) => {
  let hash = 2166136261;
  for (let index = 0; index < name.length; index++) hash = Math.imul(hash ^ name.charCodeAt(index), 16777619);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'theme';
  return `${slug}-${(hash >>> 0).toString(36)}`;
};

/**
 * Pure optional authoring utility: one bounded config exports normative DESIGN.md
 * tokens, matching scoped CSS and this library's versioned JSON manifest. This is
 * not a general YAML importer, a Google token implementation or a contrast test
 * of translucent pixels. Import/load the generated CSS after the base stylesheet;
 * apply getGlassProps(material) to retain variant, tone and accessibility attributes.
 */
export function createGlassDesignContract(input: GlassDesignContractOptions) {
  const config = record(input, ['name', 'description', 'tokens', 'material', 'guidance'], 'config');
  const name = text(config.name, 'name', 80);
  const description = config.description === undefined ? '' : text(config.description, 'description', 600, true);
  const tokens = record(config.tokens, ['colors', 'fontFamily', 'spacing', 'radius'], 'tokens');
  const values = record(tokens.colors, ['background', 'foreground', 'primary', 'accent'], 'tokens.colors');
  const colors = {
    background: color(values.background, 'colors.background'), foreground: color(values.foreground, 'colors.foreground'),
    primary: color(values.primary, 'colors.primary'),
    ...(values.accent === undefined ? {} : { accent: color(values.accent, 'colors.accent') }),
  };
  const fontFamily = tokens.fontFamily === undefined ? 'ui-sans-serif, system-ui, sans-serif' : text(tokens.fontFamily, 'fontFamily', 160);
  if (!/^[a-zA-Z][a-zA-Z0-9 -]*(?:,\s*[a-zA-Z][a-zA-Z0-9 -]*)*$/.test(fontFamily)) error('fontFamily', 'expected unquoted comma-separated font family names');
  const spacing = { ...defaultSpacing };
  if (tokens.spacing !== undefined) {
    const requested = record(tokens.spacing, scales, 'tokens.spacing');
    for (const key of scales) if (requested[key] !== undefined) spacing[key] = dimension(requested[key], `spacing.${key}`, 256);
  }
  const requestedMaterial = config.material === undefined ? {} : record(config.material, materialKeys, 'material');
  for (const key of numericMaterial) if (requestedMaterial[key] !== undefined && (typeof requestedMaterial[key] !== 'number' || !Number.isFinite(requestedMaterial[key]))) error(`material.${key}`, 'expected a finite number');
  for (const key of ['interactive', 'reducedTransparency']) if (requestedMaterial[key] !== undefined && typeof requestedMaterial[key] !== 'boolean') error(`material.${key}`, 'expected a boolean');
  for (const [key, allowed] of Object.entries({ variant: ['regular', 'clear'], appearance: ['auto', 'light', 'dark'], backdrop: ['auto', 'light', 'dark'], corner: ['round', 'continuous'] })) {
    if (requestedMaterial[key] !== undefined && !allowed.includes(requestedMaterial[key] as string)) error(`material.${key}`, 'unknown option');
  }
  if (requestedMaterial.tint !== undefined) color(requestedMaterial.tint, 'material.tint');
  const normalized = resolveOptions(requestedMaterial as GlassOptions);
  const radius = tokens.radius === undefined ? normalized.radius : dimension(tokens.radius, 'tokens.radius', 999);
  const material: ResolvedGlassOptions = Object.freeze(resolveOptions({ ...normalized, radius }));
  let guidance: string[] = [];
  if (config.guidance !== undefined) {
    const requestedGuidance = config.guidance;
    if (!Array.isArray(requestedGuidance) || requestedGuidance.length > 12) return error('guidance', 'expected up to twelve instructions');
    if (Object.getPrototypeOf(requestedGuidance) !== Array.prototype) error('guidance', 'custom prototypes are not accepted');
    for (let index = 0; index < requestedGuidance.length; index++) if (!Object.hasOwn(requestedGuidance, index)) error('guidance', 'sparse arrays are not accepted');
    for (const key of Reflect.ownKeys(requestedGuidance)) {
      if (key !== 'length' && (typeof key !== 'string' || !/^\d+$/.test(key))) error('guidance', 'unknown array property');
      const descriptor = Object.getOwnPropertyDescriptor(requestedGuidance, key)!;
      if (descriptor.get || descriptor.set) error('guidance', 'accessors are not accepted');
    }
    guidance = requestedGuidance.map((value, index) => text(value, `guidance.${index}`, 240));
  }
  const normalizedConfig = { name, description, tokens: { colors, fontFamily, spacing, radius }, material, guidance };
  const id = scopeID(name), selector = `[data-lg-design="${id}"]`;
  const validate = (): GlassDesignContractValidation => {
    const pair = [luminance(colors.foreground), luminance(colors.background)].sort((a, b) => a - b);
    const ratio = (pair[1] + .05) / (pair[0] + .05);
    const warnings: string[] = [];
    if (ratio < 4.5) warnings.push('Opaque foreground/background tokens do not meet 4.5:1 normal-text contrast. Choose a stronger pair.');
    if (material.refraction > 0) warnings.push('Refraction is an explicit experimental enhancement, not portable rendering. Keep a working CSS fallback.');
    if (material.blur > 32) warnings.push('Large blur areas can increase paint cost. Profile representative mobile devices before shipping.');
    return { valid: ratio >= 4.5, warnings, contrast: { foregroundOnBackground: Math.round(ratio * 1000) / 1000 } };
  };
  const toThemeCSS = () => {
    const theme = [
      ...Object.entries(colors).map(([key, value]) => `  --lg-design-${key}: ${value};`),
      `  --lg-design-font: ${fontFamily};`,
      ...scales.map(key => `  --lg-design-space-${key}: ${spacing[key]}px;`),
      `  --lg-design-radius: ${radius}px;`, '  color: var(--lg-design-foreground);',
      '  background-color: var(--lg-design-background);', '  font-family: var(--lg-design-font);',
    ];
    const surface = [
      ...Object.entries(getGlassProps(material).style).map(([key, value]) => `  ${key}: ${value};`),
      `  --lg-fill-rgb: ${rgb(colors.background).join(' ')};`,
      '  --lg-solid-fill: var(--lg-design-background);', '  --lg-ink: var(--lg-design-foreground);',
    ];
    return `/* Generated scoped theme. Load after Liquid Glass Kit styles. */\n${selector} {\n${theme.join('\n')}\n}\n${selector} .lg-glass, ${selector}.lg-glass {\n${surface.join('\n')}\n}\n@media (forced-colors: active) {\n  ${selector} { color: CanvasText; background-color: Canvas; }\n}\n`;
  };
  const toDesignMarkdown = () => {
    const yaml = [
      '---', 'version: alpha', `name: ${quoted(name)}`, ...(description ? [`description: ${quoted(description)}`] : []),
      'colors:', ...Object.entries(colors).map(([key, value]) => `  ${key}: ${quoted(value)}`),
      'typography:', '  body-md:', `    fontFamily: ${quoted(fontFamily)}`, '    fontSize: "16px"', '    fontWeight: 400', '    lineHeight: 1.5',
      '  headline-lg:', `    fontFamily: ${quoted(fontFamily)}`, '    fontSize: "32px"', '    fontWeight: 600', '    lineHeight: 1.15',
      'spacing:', ...scales.map(key => `  ${key}: "${spacing[key]}px"`), 'rounded:', `  md: "${radius}px"`,
      'components:', '  button-primary:', '    backgroundColor: "{colors.primary}"', '    rounded: "{rounded.md}"', '    padding: "{spacing.sm}"',
      '  surface:', '    backgroundColor: "{colors.background}"', '    textColor: "{colors.foreground}"', '    rounded: "{rounded.md}"', '---',
    ];
    const result = validate();
    const body = [
      `# ${markdown(name)}`, '', '## Overview', '',
      description ? markdown(description) : 'Build a focused interface with readable content, deliberate material placement and a consistent token system.',
      'Use glass to distinguish navigation and temporary controls. Keep sustained reading and data-heavy work on a stable, opaque foundation.', '',
      '## Colors', '', ...Object.entries(colors).map(([key, value]) => `- ${key}: ${value}; ${key === 'primary' ? 'reserve for the main action and selection cues' : key === 'foreground' ? 'use for readable content on the background token' : key === 'background' ? 'use as the opaque page foundation' : 'use sparingly for secondary emphasis'}.`),
      `Opaque foreground/background contrast: ${result.contrast.foregroundOnBackground}:1. This check does not measure translucent materials over changing content.`, '',
      '## Typography', '', `Use ${markdown(fontFamily)}. Body text starts at 16px with 1.5 line height; headings use 32px and weight 600.`,
      'Keep input text at least 16px on mobile. Preserve labels and native text selection; do not replace important text with animation.', '',
      '## Layout', '', `Use the pixel spacing scale ${scales.map(key => `${key}=${spacing[key]}`).join(', ')}.`,
      'Use fluid widths, wrap long content and respect safe-area insets. Preserve browser zoom and native scrolling. Test narrow screens, landscape and keyboard-open layouts.', '',
      '## Elevation & Depth', '',
      `Liquid Glass Kit material: ${material.variant}; appearance ${material.appearance}; blur ${material.blur}px; saturation ${material.saturation}; fill strength ${material.opacity}.`,
      `Tint ${material.tint} at ${material.tintOpacity} strength. Refraction ${material.refraction === 0 ? 'is off; the default is portable CSS' : `is explicitly experimental at ${material.refraction}; keep the portable CSS fallback`}.`,
      'Limit backdrop-filter coverage and overlapping glass. Animate only a small visual layer with opacity/translate when practical; avoid animating large blur radii.', '',
      '## Shapes', '', `Use ${radius}px primary corners. The requested corner mode is ${material.corner}; unsupported engines keep round corners.`,
      'Inset child corners rather than repeating a large radius at every level. These are web design choices, not pixel-identical Apple geometry.', '',
      '## Components', '',
      'Use semantic buttons, inputs, navigation and dialogs. Touch targets should be at least 44 by 44 CSS pixels; keep focus outlines unobscured.',
      `Theme scope: \`data-lg-design="${id}"\`. Load the exported theme CSS after the base stylesheet.`,
      'Apply getGlassProps(material) to glass surfaces so variant, appearance, corner and accessibility attributes agree with the generated variables.',
      `Material options for that call: \`${JSON.stringify(material)}\`.`, '',
      "## Do's and Don'ts", '',
      '- Do honor reduced motion, reduced transparency, increased contrast and forced colors. An opaque fallback must remain usable.',
      '- Do check the actual foreground/background composition and native focus, not only the exported opaque-token contrast.',
      '- Do keep motion brief and cancellable. Focused content must be visible immediately.',
      '- Do benchmark the real layout and representative devices. This authoring utility needs no client-side controller or frame loop.',
      '- Do keep clear glass on controlled backdrops; use the regular material for readable controls.',
      '- Do not imply universal refraction support or automatic accessibility compliance.',
      ...guidance.map(value => `- ${markdown(value)}`),
      ...result.warnings.map(value => `- Review: ${value}`), '',
    ];
    return [...yaml, '', ...body].join('\n');
  };
  return Object.freeze({ id, selector, material, toDesignMarkdown, toThemeCSS,
    toJSON: () => JSON.stringify({ kind: 'liquid-glass-design-contract', version: 1, config: normalizedConfig }, null, 2), validate });
}

/** Parse only this exporter's version 1 JSON manifest; arbitrary YAML is not supported. */
export function parseGlassDesignContract(json: string) {
  if (typeof json !== 'string' || json.length > 16384) error('manifest', 'expected a JSON string up to 16384 characters');
  let value: unknown;
  try { value = JSON.parse(json); } catch { return error('manifest', 'invalid JSON'); }
  const manifest = record(value, ['kind', 'version', 'config'], 'manifest');
  if (manifest.kind !== 'liquid-glass-design-contract' || manifest.version !== 1) error('manifest', 'unsupported kind or version');
  return createGlassDesignContract(manifest.config as GlassDesignContractOptions);
}
