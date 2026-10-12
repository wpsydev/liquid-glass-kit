import { getGlassPictureProps } from './responsive-image.js';
import type { GlassImageOptions, GlassImageProps, GlassPictureSourceOptions, GlassPictureSourceProps } from './responsive-image.js';

export interface GlassIllustrationProvenance {
  /** Caller declaration, not verified ownership or legal permission. */
  readonly creator: string;
  readonly license: string;
  /** Attribution page only: absolute HTTP(S), no userinfo, query or fragment. */
  readonly sourceURL?: string;
}
export interface GlassIllustrationPlacement {
  /** Physical stage coordinates: x from left, y from top; finite percentages 0–100. */
  readonly x: number;
  readonly y: number;
  /** Percentage of stage width, 1–100; height follows the explicit image/crop ratio. */
  readonly width: number;
  /** Degrees, -45–45. Static geometry, no animation controller. */
  readonly rotation?: number;
  /** The selected point on this layer meets the x/y stage point. Default center. */
  readonly anchor?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
}
export interface GlassIllustrationLayer {
  readonly id: string;
  /** Existing native-image contract. Alt must deliberately be ''. */
  readonly image: GlassImageOptions;
  /** Optional native picture art direction; supplied resources and grammar are host-owned. */
  readonly sources?: readonly GlassPictureSourceOptions[];
  readonly placement: GlassIllustrationPlacement;
  readonly provenance: GlassIllustrationProvenance;
}
export interface GlassIllustrationOptions {
  /** Stable host ID. Derived stage/layer/image IDs stay local; host prevents page collisions. */
  readonly id: string;
  /** Integer terms 1–32768; resulting stage ratio stays within 1:8–8:1. */
  readonly aspectRatio: { readonly width: number; readonly height: number };
  readonly semantics: { readonly kind: 'informative'; readonly description: string } | { readonly kind: 'decorative' };
  /** One to eight layers. Array order is the explicit back-to-front paint order. */
  readonly layers: readonly GlassIllustrationLayer[];
  /** Default clip. Visible permits authored geometry to extend past the reserved stage. */
  readonly overflow?: 'clip' | 'visible';
}
type Style = Readonly<Record<string, string>>;
export interface GlassIllustrationLayerRecipe {
  readonly id: string;
  readonly layerProps: Readonly<{ id: string; className: 'lg-illustration-layer'; 'aria-hidden': 'true'; style: Style }>;
  readonly pictureProps: Readonly<{ className: 'lg-illustration-picture'; style: Style }>;
  readonly imageProps: Readonly<Omit<GlassImageProps, 'style'> & { id: string; draggable: false; style: Style }>;
  readonly sourceProps: readonly Readonly<GlassPictureSourceProps>[];
  readonly geometry: Readonly<{ x: number; y: number; width: number; height: number; rotation: number; anchor: NonNullable<GlassIllustrationPlacement['anchor']> }>;
  readonly provenance: Readonly<GlassIllustrationProvenance>;
}
export interface GlassIllustrationScene {
  readonly id: string;
  readonly description: string | null;
  readonly decorative: boolean;
  readonly figureProps: Readonly<{ id: string; className: 'lg-illustration'; role?: 'img'; 'aria-label'?: string; 'aria-hidden'?: 'true'; style: Style }>;
  readonly stageProps: Readonly<{ id: string; className: 'lg-illustration-stage'; style: Style }>;
  readonly layers: readonly GlassIllustrationLayerRecipe[];
}
const fail = (message: string): never => { throw new TypeError(`Invalid glass illustration: ${message}`); };
function object(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) return fail('use ordinary objects');
  const keys = Reflect.ownKeys(value); if (keys.length > allowed.length) return fail('unknown option');
  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) { if (typeof key !== 'string' || !allowed.includes(key)) return fail('unknown option'); const descriptor = Object.getOwnPropertyDescriptor(value, key)!; if (!('value' in descriptor) || !descriptor.enumerable) return fail('accessors are not accepted'); output[key] = descriptor.value; }
  return output;
}
function text(value: unknown, maximum: number, name: string) { if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\u0000-\u001f\u007f-\u009f]/.test(value)) return fail(`${name} requires nonempty bounded text`); return value; }
function id(value: unknown) { const name = text(value, 64, 'id'); if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name) || ['constructor', 'prototype', '__proto__'].includes(name.toLowerCase())) return fail('safe stable ID required'); return name; }
function number(value: unknown, minimum: number, maximum: number, name: string, integral = false) { if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integral && !Number.isSafeInteger(value))) return fail(`${name} outside bounds`); return Object.is(value, -0) ? 0 : value; }
function attributionURL(value: unknown) {
  const source = text(value, 2048, 'sourceURL'); if (!/^https?:\/\//i.test(source) || /[\s"'<>`\\]/.test(source)) return fail('sourceURL must be absolute HTTP(S)');
  let parsed: URL; try { parsed = new URL(source); } catch { return fail('invalid sourceURL'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) return fail('sourceURL must not contain credentials, query or fragment'); return parsed.href;
}
const anchors: Record<NonNullable<GlassIllustrationPlacement['anchor']>, readonly [number, number]> = {
  center: [50, 50], 'top-left': [0, 0], 'top-right': [100, 0], 'bottom-left': [0, 100], 'bottom-right': [100, 100], 'bottom-center': [50, 100],
};

/**
 * Pure, SSR-safe independent recipe for 1–8 host-owned image layers. Returns native
 * props and safe bounded static style values, never markup/SVG parsing, asset fetch,
 * catalog integration, rights verification, renderer or animation loop. Render a
 * figure, one stage child and each layer div/picture (sources before img) in order.
 * Camel-case image props follow the existing helper's React/DOM adapter contract.
 * Every alt is deliberately empty: one informative role=img gets its description,
 * or the entire scene is decorative. Keep headings, captions and controls outside
 * this noninteractive image group; no layer should contain interactive descendants.
 *
 * Width/x/y are stage percentages. Layer height is fixed by the fallback/crop ratio;
 * picture art direction fits inside that same frame. Stage reserves the supplied
 * ratio. Clip hides rotated/overflowing edges; visible may overlap surrounding UI.
 * It does not automatically keep artwork inside bounds or recompose for mobile.
 * The host can explicitly choose another authored recipe at its own breakpoint.
 * Native image validation, priority and source grammar delegate to responsive-image;
 * asset bytes, actual intrinsic dimensions, licenses and native decoding remain host
 * responsibilities. Provenance records caller declarations, not verified permission.
 */
export function getGlassIllustrationScene(input: GlassIllustrationOptions): Readonly<GlassIllustrationScene> {
  const options = object(input, ['id', 'aspectRatio', 'semantics', 'layers', 'overflow']), sceneId = id(options.id);
  const ratio = object(options.aspectRatio, ['width', 'height']);
  const width = number(ratio.width, 1, 32768, 'stage width', true), height = number(ratio.height, 1, 32768, 'stage height', true);
  if (width / height < .125 || width / height > 8) return fail('stage ratio must stay within 1:8–8:1');
  const semantic = object(options.semantics, ['kind', 'description']);
  if (!['informative', 'decorative'].includes(semantic.kind as string)) return fail('explicit semantic kind required');
  const decorative = semantic.kind === 'decorative';
  if (decorative && Object.hasOwn(semantic, 'description')) return fail('decorative scene must omit description');
  const description = decorative ? null : text(semantic.description, 1024, 'description');
  const overflow = options.overflow ?? 'clip'; if (overflow !== 'clip' && overflow !== 'visible') return fail('overflow must be clip or visible');
  const sourceLayers = options.layers;
  if (!Array.isArray(sourceLayers) || sourceLayers.length < 1 || sourceLayers.length > 8) return fail('use one to eight layers');
  if (Reflect.ownKeys(sourceLayers).some(key => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key)))) return fail('custom layer array fields');
  const derived = new Set([sceneId, `${sceneId}-stage`]), layerIds = new Set<string>();
  const layers: GlassIllustrationLayerRecipe[] = [];
  for (let index = 0; index < sourceLayers.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(sourceLayers, String(index)); if (!descriptor || !('value' in descriptor)) return fail('sparse/accessor layer arrays');
    const source = object(descriptor.value, ['id', 'image', 'sources', 'placement', 'provenance']), layerId = id(source.id);
    if (layerIds.has(layerId)) return fail('duplicate layer ID'); layerIds.add(layerId);
    const wrapperId = `${sceneId}-layer-${layerId}`, imageId = `${sceneId}-image-${layerId}`;
    for (const derivedId of [wrapperId, imageId]) { if (derived.has(derivedId)) return fail('derived ID collision'); derived.add(derivedId); }
    const placement = object(source.placement, ['x', 'y', 'width', 'rotation', 'anchor']);
    const x = number(placement.x, 0, 100, 'x'), y = number(placement.y, 0, 100, 'y'), layerWidth = number(placement.width, 1, 100, 'layer width'), rotation = placement.rotation === undefined ? 0 : number(placement.rotation, -45, 45, 'rotation');
    const anchor = (placement.anchor ?? 'center') as NonNullable<GlassIllustrationPlacement['anchor']>;
    if (!Object.hasOwn(anchors, anchor)) return fail('unknown anchor'); const [anchorX, anchorY] = anchors[anchor];
    const declared = object(source.provenance, ['creator', 'license', 'sourceURL']);
    const provenance = Object.freeze({ creator: text(declared.creator, 160, 'creator'), license: text(declared.license, 240, 'license'), ...(declared.sourceURL === undefined ? {} : { sourceURL: attributionURL(declared.sourceURL) }) });
    // Resource URLs, intrinsic dimensions, source groups, native sizes grammar,
    // crop and image hints stay authoritative in the existing image helper.
    const picture = getGlassPictureProps({ image: source.image as GlassImageOptions, ...(source.sources === undefined ? {} : { sources: source.sources as readonly GlassPictureSourceOptions[] }) });
    if (picture.image.alt !== '') return fail('all layer images must explicitly use empty alt');
    const frameRatio = picture.image.style['--lg-image-ratio'] ?? `${picture.image.width} / ${picture.image.height}`;
    const [ratioWidth, ratioHeight] = frameRatio.split(' / ').map(Number);
    const layerHeight = layerWidth * width / height * ratioHeight! / ratioWidth!;
    if (!Number.isFinite(layerHeight) || layerHeight > 200) return fail('derived layer height exceeds 200% of stage; choose a smaller width or explicit crop');
    const imageStyle = Object.freeze({ ...picture.image.style, display: 'block', inlineSize: '100%', blockSize: '100%', objectFit: picture.image.style['--lg-image-fit']!, objectPosition: picture.image.style['--lg-image-position']! });
    const style = Object.freeze({ position: 'absolute', left: `${x}%`, top: `${y}%`, inlineSize: `${layerWidth}%`, aspectRatio: frameRatio, transform: `translate(${-anchorX}%, ${-anchorY}%) rotate(${rotation}deg)`, transformOrigin: `${anchorX}% ${anchorY}%`, zIndex: String(index), pointerEvents: 'none', overflow: 'hidden' });
    layers.push(Object.freeze({ id: layerId, layerProps: Object.freeze({ id: wrapperId, className: 'lg-illustration-layer' as const, 'aria-hidden': 'true' as const, style }), pictureProps: Object.freeze({ className: 'lg-illustration-picture' as const, style: Object.freeze({ display: 'block', inlineSize: '100%', blockSize: '100%' }) }), imageProps: Object.freeze({ ...picture.image, id: imageId, draggable: false as const, style: imageStyle }), sourceProps: Object.freeze(picture.sources.map(props => Object.freeze({ ...props }))), geometry: Object.freeze({ x, y, width: layerWidth, height: layerHeight, rotation, anchor }), provenance }));
  }
  return Object.freeze({ id: sceneId, description, decorative,
    figureProps: Object.freeze({ id: sceneId, className: 'lg-illustration' as const, ...(decorative ? { 'aria-hidden': 'true' as const } : { role: 'img' as const, 'aria-label': description! }), style: Object.freeze({ margin: '0', maxInlineSize: '100%' }) }),
    stageProps: Object.freeze({ id: `${sceneId}-stage`, className: 'lg-illustration-stage' as const, style: Object.freeze({ position: 'relative', isolation: 'isolate', inlineSize: '100%', aspectRatio: `${width} / ${height}`, overflow: overflow === 'clip' ? 'hidden' : 'visible', pointerEvents: 'none' }) }),
    layers: Object.freeze(layers),
  });
}
