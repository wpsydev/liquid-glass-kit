/** A supplied, real image resource and its intrinsic pixel width. Width descriptors only. */
export interface GlassImageCandidate {
  src: string;
  width: number;
}

export interface GlassImageOptions {
  src: string;
  /** Required. Use '' deliberately for decoration; the helper cannot author meaningful text. */
  alt: string;
  /** Actual intrinsic dimensions, not the desired CSS display size. Integers 1–32768. */
  width: number;
  height: number;
  /** 1–16 supplied resources. Duplicate widths are invalid. Never generates image URLs. */
  candidates?: readonly GlassImageCandidate[];
  /** Authored native sizes expression; required with width candidates. No CSS syntax parser. */
  sizes?: string;
  /** No automatic viewport inference. Normal uses browser-default priority/decoding hints. */
  priority?: 'normal' | 'critical' | 'below-fold';
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Percentages from 0–100, not normalized 0–1 coordinates. Default center. */
  focalPoint?: { x: number; y: number };
  /** Explicit display crop only. Without it, native image/source dimensions reserve the ratio. */
  aspectRatio?: { width: number; height: number };
}

export interface GlassImageProps {
  className: 'lg-image';
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
  sizes?: string;
  loading: 'eager' | 'lazy';
  fetchPriority: 'auto' | 'high' | 'low';
  decoding: 'auto' | 'async';
  'data-lg-image-crop'?: 'true';
  style: Record<string, string>;
}

export interface GlassPictureSourceOptions {
  /** Declare dimensions for this crop. They need not match the fallback image's ratio. */
  width: number;
  height: number;
  candidates: readonly GlassImageCandidate[];
  sizes: string;
  /** Native media expression. First matching supported source wins; order is preserved. */
  media?: string;
  /** A simple image MIME type, such as image/avif. The helper does not verify its bytes/support. */
  type?: string;
}

export interface GlassPictureOptions {
  /** Required semantic fallback, even when sources are supplied. */
  image: GlassImageOptions;
  /** At most eight art-direction/format groups, in native selection order. */
  sources?: readonly GlassPictureSourceOptions[];
}

export interface GlassPictureSourceProps {
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
  media?: string;
  type?: string;
}

const maxDimension = 32768;
const controls = /[\u0000-\u001f\u007f-\u009f]/;

function object(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function dimension(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > maxDimension) {
    throw new RangeError(`${name} must be an integer from 1 to ${maxDimension}`);
  }
  return value;
}

function resourceURL(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 8192 ||
    /[\s\u0000-\u001f\u007f-\u009f"'<>`\\]/.test(value) || value.endsWith(',')) {
    throw new TypeError('Image URLs must be nonempty, at most 8192 characters and contain no whitespace or unsafe delimiters');
  }
  if (/^data:/i.test(value)) {
    // Small raster fixtures are allowed. No SVG/HTML, percent-encoded markup or unbounded data blobs.
    if (!/^data:image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon);base64,[a-z\d+/]+={0,2}$/i.test(value)) {
      throw new TypeError('Image data URLs must use a supported raster MIME type and base64 payload');
    }
    return value;
  }
  if (/^blob:/i.test(value)) {
    if (!/^blob:(?:https?:\/\/[^/]+\/|null\/).+/i.test(value)) throw new TypeError('Invalid image blob URL');
    return value;
  }
  let parsed: URL;
  try { parsed = new URL(value, 'https://liquid-glass.invalid/'); }
  catch { throw new TypeError('Invalid image URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol) ||
    (/^https?:/i.test(value) && !/^https?:\/\//i.test(value))) {
    throw new TypeError('Image URLs must be relative, HTTP(S), blob or bounded raster data URLs');
  }
  return value;
}

/** Attribute text only, never inserted into style/HTML. Native grammar is the host's responsibility. */
function expression(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048 || controls.test(value) || /["'`]/.test(value)) {
    throw new TypeError(`${name} must be nonempty bounded attribute text without control characters or quotes`);
  }
  // Bound expression complexity without attempting an incomplete CSS/media grammar.
  if (value.split(/[\s(),]+/).filter(Boolean).length > 128) throw new RangeError(`${name} has too many tokens`);
  return value.trim();
}

function sourceSet(value: unknown): string {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) throw new RangeError('Image candidates must contain 1–16 resources');
  const widths = new Set<number>();
  const candidates = Array.from(value, candidate => {
    object(candidate, 'Image candidate');
    const width = dimension(candidate.width, 'Candidate width');
    if (widths.has(width)) throw new RangeError('Image candidate widths must be unique');
    widths.add(width);
    return { src: resourceURL(candidate.src), width };
  });
  return candidates.sort((a, b) => a.width - b.width).map(candidate => `${candidate.src} ${candidate.width}w`).join(', ');
}

function coordinate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new RangeError('Focal coordinates must be finite percentages from 0 to 100');
  return Object.is(value, -0) ? 0 : value;
}

/**
 * Pure, SSR-safe native image props. Camel-case srcSet/fetchPriority/className
 * match React conventions. DOM adapters use srcset/fetchpriority/class attributes
 * (or native properties) and assign returned CSS custom properties to style.
 * Spread these props, never interpolate them into raw HTML. Import the optional
 * responsive-image.css. Host owns licensing, actual dimensions, URL lifetime,
 * candidate bytes, delivery, authored sizes grammar and alternative descriptions.
 * A renderer may add its own hints (React 19 SSR preloads eager images); this
 * helper itself emits no preload, request or browser-side controller.
 */
export function getGlassImageProps(options: GlassImageOptions): GlassImageProps {
  object(options, 'Image options');
  const src = resourceURL(options.src);
  if (typeof options.alt !== 'string' || options.alt.length > 8192 || controls.test(options.alt) || (options.alt !== '' && !options.alt.trim())) {
    throw new TypeError('Image alt is required: supply descriptive text or deliberately use an empty string');
  }
  const width = dimension(options.width, 'Image width'), height = dimension(options.height, 'Image height');
  const priority = options.priority === undefined ? 'normal' : options.priority;
  if (!['normal', 'critical', 'below-fold'].includes(priority)) throw new TypeError('Invalid image priority');
  const fit = options.fit === undefined ? 'contain' : options.fit;
  if (!['contain', 'cover', 'fill', 'none', 'scale-down'].includes(fit)) throw new TypeError('Invalid image fit');
  let position = '50% 50%';
  if (options.focalPoint !== undefined) {
    object(options.focalPoint, 'Image focal point');
    position = `${coordinate(options.focalPoint.x)}% ${coordinate(options.focalPoint.y)}%`;
  }
  const props: GlassImageProps = {
    className: 'lg-image', src, alt: options.alt, width, height,
    loading: priority === 'below-fold' ? 'lazy' : 'eager',
    fetchPriority: priority === 'critical' ? 'high' : priority === 'below-fold' ? 'low' : 'auto',
    decoding: priority === 'below-fold' ? 'async' : 'auto',
    style: { '--lg-image-fit': fit, '--lg-image-position': position },
  };
  if (options.candidates !== undefined) {
    props.srcSet = sourceSet(options.candidates);
    props.sizes = expression(options.sizes, 'Image sizes');
  } else if (options.sizes !== undefined) {
    throw new TypeError('Image sizes requires width-descriptor candidates');
  }
  if (options.aspectRatio !== undefined) {
    object(options.aspectRatio, 'Image crop ratio');
    const cropWidth = dimension(options.aspectRatio.width, 'Crop width'), cropHeight = dimension(options.aspectRatio.height, 'Crop height');
    props['data-lg-image-crop'] = 'true';
    props.style['--lg-image-ratio'] = `${cropWidth} / ${cropHeight}`;
  }
  return props;
}

/**
 * Ordered native picture sources plus a semantic fallback img. Render sources
 * before the image. Source width/height hints are browser-dependent; fallback
 * dimensions remain important. An explicit display crop intentionally overrides
 * selected intrinsic ratios. This helper performs no fetching, decoding or preloading.
 */
export function getGlassPictureProps(options: GlassPictureOptions): { image: GlassImageProps; sources: GlassPictureSourceProps[] } {
  object(options, 'Picture options');
  const image = getGlassImageProps(options.image);
  const groups = options.sources === undefined ? [] : options.sources;
  if (!Array.isArray(groups) || groups.length > 8) throw new RangeError('Picture sources must be an array of at most eight groups');
  const sources = Array.from(groups, group => {
    object(group, 'Picture source');
    const source: GlassPictureSourceProps = {
      srcSet: sourceSet(group.candidates), sizes: expression(group.sizes, 'Source sizes'),
      width: dimension(group.width, 'Source width'), height: dimension(group.height, 'Source height'),
    };
    if (group.media !== undefined) source.media = expression(group.media, 'Source media');
    if (group.type !== undefined) {
      if (typeof group.type !== 'string' || group.type.length > 64 || !/^image\/[a-z\d][a-z\d.+-]*$/i.test(group.type)) throw new TypeError('Source type must be a simple image MIME type');
      source.type = group.type.toLowerCase();
    }
    return source;
  });
  return { image, sources };
}
