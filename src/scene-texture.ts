import { attachGlassScene } from './scene.js';
import type { GlassSceneOptions, GlassSceneBackdropDriver, GlassSceneDrop } from './scene.js';
import { ownedTextureFragmentSource } from './scene-texture-shader.js';
import { listen } from './lifecycle.js';

export type GlassSceneTextureSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap;
export type GlassSceneTextureStatus = 'empty' | 'loading' | 'ready' | 'error' | 'context-lost' | 'unsupported' | 'destroyed';
export interface GlassSceneTextureStats {
  readonly status: GlassSceneTextureStatus;
  readonly reason: 'none' | 'decode' | 'source-access' | 'upload' | 'shader' | 'webgl' | 'context';
  readonly kind: 'image' | 'video' | 'canvas' | 'bitmap' | 'none';
  /** Successful uploads in this attachment, not frames per second. */
  readonly uploads: number;
  readonly uploadPixels: number;
  readonly width: number;
  readonly height: number;
  readonly pixels: number;
  readonly downscaled: boolean;
  readonly videoFrameCallback: boolean;
  readonly visible: boolean;
}
export interface GlassSceneTextureOptions {
  /** Decoded host media only. No URLs, fetch, DOM capture, play, pause or source close. */
  readonly source?: GlassSceneTextureSource | null;
  readonly scene?: GlassSceneOptions;
  readonly fit?: 'cover' | 'contain';
  /** Crop/alignment position, each component 0–1. Default [.5,.5]. */
  readonly position?: readonly [number, number];
  /** Opaque matte for contain letterboxing and source alpha. Default [.02,.03,.05]. */
  readonly matte?: readonly [number, number, number];
  /** Downscaled before GPU upload. 65,536–4,194,304; default 1,048,576. */
  readonly maxSourcePixels?: number;
  /** Per-axis cap, 64–4096 and hardware MAX_TEXTURE_SIZE; default 2048. */
  readonly maxSourceDimension?: number;
  /** Explicit real presented-frame policy. Default false/frozen, no polling fallback. */
  readonly videoFrames?: boolean;
  readonly onChange?: (stats: Readonly<GlassSceneTextureStats>) => void;
}
type Kind = GlassSceneTextureStats['kind'];
type Video = HTMLVideoElement & { requestVideoFrameCallback?: (callback: (now: number, metadata: VideoFrameCallbackMetadata) => void) => number; cancelVideoFrameCallback?: (handle: number) => void };
const optionKeys = ['source', 'scene', 'fit', 'position', 'matte', 'maxSourcePixels', 'maxSourceDimension', 'videoFrames', 'onChange'];
function fail(reason: string): never { throw new TypeError(`Invalid glass scene texture: ${reason}`); }
function config(value: GlassSceneTextureOptions) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) fail('use plain options');
  const output: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !optionKeys.includes(key)) fail('unknown option');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!; if (!('value' in descriptor) || !descriptor.enumerable) fail('accessors are not accepted'); output[key] = descriptor.value;
  }
  return output as GlassSceneTextureOptions;
}
function integer(value: number | undefined, fallback: number, minimum: number, maximum: number, name: string) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(`${name} must be an integer from ${minimum} to ${maximum}`); return value;
}
function tuple(value: readonly number[] | undefined, fallback: readonly number[], length: number, name: string): number[] {
  if (value === undefined) return [...fallback];
  if (!Array.isArray(value) || value.length !== length) fail(`${name} requires ${length} components`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: number[] = [];
  for (let index = 0; index < length; index++) { const descriptor = descriptors[String(index)]; const number = descriptor && 'value' in descriptor ? descriptor.value : undefined;
    if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 1) fail(`${name} components must be finite 0–1 values`); result.push(number); }
  return result;
}

/**
 * Opt-in owned image/video/canvas/ImageBitmap receiver for experimental scenes.
 * Static media upload once; canvas changes require invalidateSource(). Real video
 * callbacks are explicit, visible/playing/preference gated, with no timer/RAF
 * polling fallback. Host owns CORS, decode, playback, licensing and native fallback
 * media/CSS. Errors use the scene's procedural receiver; unsupported WebGL leaves
 * the host fallback in charge. No arbitrary DOM capture or GPU speed promise.
 *
 * Scene-clock animate defaults false, except explicitly moving field/caustics;
 * animate:true is honored, animate:false disables that clock. videoFrames is an
 * independent explicit frame policy; paused/reduced motion also gate real video.
 * update() merges texture options; scene replaces scene settings when supplied.
 * invalidateSource() retries actual source access and schedules only a visible
 * draw. It never loads a URL. Bitmap orientation is the host's decoded orientation.
 */
export function attachGlassSceneTexture(canvas: HTMLCanvasElement, initial: GlassSceneTextureOptions = {}) {
  const doc = canvas?.ownerDocument, browserView = doc?.defaultView;
  if (!browserView || canvas.namespaceURI !== 'http://www.w3.org/1999/xhtml' || canvas.localName !== 'canvas') return fail('browser canvas is required at attachment');
  const view = browserView;
  let settings: GlassSceneTextureOptions = {}, sceneSettings: GlassSceneOptions = {};
  let source: GlassSceneTextureSource | null = null, kind: Kind = 'none', fit: 'cover' | 'contain' = 'cover';
  let position = [.5, .5], matte = [.02, .03, .05], pixelCap = 1_048_576, dimensionCap = 2048;
  let destroyed = false, lost = false, inViewport = true, dirty = true, blocked = false;
  const initialBounds = canvas.getBoundingClientRect();
  let hasArea = initialBounds.width > 0 && initialBounds.height > 0;
  let texture: WebGLTexture | null = null, sourceContext: WebGL2RenderingContext | null = null, hardwareCap = 0;
  let uploadValidated = false;
  let staging: HTMLCanvasElement | null = null, stageContext: CanvasRenderingContext2D | null = null;
  let uploadedSourceWidth = 0, uploadedSourceHeight = 0, videoHandle: number | null = null, videoGeneration = 0;
  let renderFrame: number | null = null, unlistenSource = () => {};
  let stats: GlassSceneTextureStats = { status: 'empty', reason: 'none', kind: 'none', uploads: 0, uploadPixels: 0, width: 0, height: 0, pixels: 0, downscaled: false, videoFrameCallback: false, visible: true };
  let scene: ReturnType<typeof attachGlassScene> | undefined;
  const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const transparency = view.matchMedia?.('(prefers-reduced-transparency: reduce)');
  const contrast = view.matchMedia?.('(prefers-contrast: more)');
  const forced = view.matchMedia?.('(forced-colors: active)');
  // Semantic aria-hidden is appropriate for decorative output; it does not
  // suppress a visually present owned source or its explicit video policy.
  const visible = () => !destroyed && !lost && canvas.isConnected && !doc.hidden && inViewport && hasArea && !canvas.closest('[hidden],[inert]');
  const snapshot = () => Object.freeze({ ...stats, videoFrameCallback: videoHandle !== null, visible: visible() });
  let previous = snapshot();
  function emit() {
    const current = snapshot(); if (Object.keys(current).every(key => current[key as keyof GlassSceneTextureStats] === previous[key as keyof GlassSceneTextureStats])) return;
    previous = current;
    try { settings.onChange?.(current); } catch { canvas.dispatchEvent(new view.CustomEvent('lg-scene-texture-error', { detail: 'Host source-state callback failed' })); }
  }
  function stopVideo() {
    videoGeneration++;
    if (videoHandle !== null && kind === 'video') { try { (source as Video)?.cancelVideoFrameCallback?.(videoHandle); } catch { /* host source may have changed */ } }
    videoHandle = null;
  }
  function stopRender() { if (renderFrame !== null) view.cancelAnimationFrame(renderFrame); renderFrame = null; }
  function sourceFailed(reason: GlassSceneTextureStats['reason']) {
    // clearRect cannot restore an origin-tainted staging canvas. Discard only
    // owned staging on that failure boundary so an explicit clean retry can
    // reuse the same bounded dimensions without inheriting the failed source.
    if (reason === 'source-access' && staging) { staging.width = staging.height = 1; staging = null; stageContext = null; }
    blocked = true; dirty = false; stats = { ...stats, status: 'error', reason }; stopVideo(); emit();
  }
  const mediaAllowed = () => visible() && scene?.supported && !sceneSettings.paused && !sceneSettings.reducedMotion && !reduced?.matches
    && !sceneSettings.reducedTransparency && !transparency?.matches && !contrast?.matches && !forced?.matches;
  function scheduleDraw() {
    if (!visible() || !scene?.supported || renderFrame !== null) return;
    renderFrame = view.requestAnimationFrame(() => { renderFrame = null; if (visible() && scene?.supported) { scene.render(); syncVideo(); emit(); } });
  }
  function syncVideo() {
    const video = kind === 'video' ? source as Video : null;
    if (!video || !settings.videoFrames || blocked || !mediaAllowed() || video.paused || video.ended || video.readyState < 2 || !video.requestVideoFrameCallback || !video.cancelVideoFrameCallback) { stopVideo(); return; }
    if (videoHandle !== null) return;
    try {
      const generation = videoGeneration;
      videoHandle = video.requestVideoFrameCallback(() => {
        if (generation !== videoGeneration) return;
        videoHandle = null;
        if (destroyed || source !== video || !mediaAllowed() || video.paused || video.ended || blocked) { emit(); return; }
        dirty = true;
        if (scene?.supported) scene.render();
        syncVideo(); emit();
      });
    } catch { stopVideo(); }
  }
  function classify(value: GlassSceneTextureSource | null | undefined): Kind {
    if (value == null) return 'none';
    if (value === canvas) return fail('the output canvas cannot be its own source');
    const node = value as HTMLElement;
    if (node.nodeType === 1 && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
      const realm = node.ownerDocument?.defaultView;
      if (realm && value instanceof realm.HTMLImageElement) return 'image';
      if (realm && value instanceof realm.HTMLVideoElement) return 'video';
      if (realm && value instanceof realm.HTMLCanvasElement) return 'canvas';
    }
    const Bitmap = (view as Window & { ImageBitmap?: typeof ImageBitmap }).ImageBitmap;
    if (Bitmap && value instanceof Bitmap) return 'bitmap';
    return fail('supply a native image, video, source canvas or ImageBitmap');
  }
  function dimensions() {
    if (!source) return null;
    let width: number, height: number;
    if (kind === 'image') { const image = source as HTMLImageElement; if (!image.complete) return null; width = image.naturalWidth; height = image.naturalHeight; }
    else if (kind === 'video') { const video = source as HTMLVideoElement; if (video.readyState < 2) return null; width = video.videoWidth; height = video.videoHeight; }
    else { width = (source as HTMLCanvasElement | ImageBitmap).width; height = (source as HTMLCanvasElement | ImageBitmap).height; }
    if (![width, height].every(value => Number.isSafeInteger(value) && value > 0 && value <= 16_777_216)) { sourceFailed('decode'); return null; }
    return { width, height };
  }
  const driver: GlassSceneBackdropDriver = {
    fragmentSource: ownedTextureFragmentSource,
    uniforms: ['uOwnedSource', 'uSourceMapping', 'uSourceMatte'],
    canRender: visible,
    canAnimate: () => sceneSettings.animate === true && visible(),
    fail: () => sourceFailed('shader'),
    release(context) {
      if (texture) context.deleteTexture(texture);
      texture = null; sourceContext = null; hardwareCap = 0; uploadedSourceWidth = uploadedSourceHeight = 0; dirty = true;
      uploadValidated = false;
      stats = { ...stats, width: 0, height: 0, pixels: 0, downscaled: false }; stopVideo();
      if (scene && !scene.supported && !destroyed && !lost) {
        stats = { ...stats, status: 'unsupported', reason: 'webgl' }; emit();
      }
    },
    bind(context, locations, frame) {
      if (!source || blocked || frame.solid || !visible()) return false;
      const size = dimensions(); if (!size) { if (!blocked) stats = { ...stats, status: 'loading', reason: 'none' }; emit(); return false; }
      if (size.width !== uploadedSourceWidth || size.height !== uploadedSourceHeight) { dirty = true; uploadValidated = false; }
      if (dirty) {
        try {
          if (sourceContext !== context || !hardwareCap) {
            const hardware = context.getParameter(context.MAX_TEXTURE_SIZE);
            if (typeof hardware !== 'number' || !Number.isSafeInteger(hardware) || hardware < 1) { sourceFailed('upload'); return false; }
            hardwareCap = Math.min(hardware, 4096); sourceContext = context;
          }
          const cap = Math.min(dimensionCap, hardwareCap), scale = Math.min(1, cap / size.width, cap / size.height, Math.sqrt(pixelCap / (size.width * size.height)));
          const width = Math.max(1, Math.floor(size.width * scale)), height = Math.max(1, Math.floor(size.height * scale));
          let upload: TexImageSource = source;
          // Canvas drawing normalizes ImageBitmap alpha/orientation semantics;
          // WebGL ignores several UNPACK flags for a direct bitmap upload.
          if (width !== size.width || height !== size.height || kind === 'bitmap') {
            staging ??= doc.createElement('canvas'); if (staging.width !== width) staging.width = width; if (staging.height !== height) staging.height = height;
            stageContext ??= staging.getContext('2d', { alpha: true }); if (!stageContext) { sourceFailed('upload'); return false; }
            stageContext.clearRect(0, 0, width, height); stageContext.drawImage(source, 0, 0, width, height); upload = staging;
          }
          const newTexture = !texture;
          texture ??= context.createTexture(); if (!texture) { sourceFailed('upload'); return false; }
          context.activeTexture(context.TEXTURE2); context.bindTexture(context.TEXTURE_2D, texture);
          context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false); context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          if (newTexture) {
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR); context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE); context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
          }
          if (newTexture || stats.width !== width || stats.height !== height) context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, upload);
          else context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, context.RGBA, context.UNSIGNED_BYTE, upload);
          // Check initialization/explicit invalidation boundaries, not every
          // ordinary presented video frame. Security exceptions and native
          // context-loss events still cover late source/context access failures.
          if (!uploadValidated && context.getError() !== context.NO_ERROR) { sourceFailed('upload'); return false; }
          uploadValidated = true;
          dirty = false; uploadedSourceWidth = size.width; uploadedSourceHeight = size.height;
          stats = { ...stats, status: 'ready', reason: 'none', kind, uploads: stats.uploads + 1, uploadPixels: stats.uploadPixels + width * height, width, height, pixels: width * height, downscaled: width !== size.width || height !== size.height };
        } catch (error) { sourceFailed(error && typeof error === 'object' && 'name' in error && error.name === 'SecurityError' ? 'source-access' : 'upload'); return false; }
      }
      if (!texture) return false;
      context.activeTexture(context.TEXTURE2); context.bindTexture(context.TEXTURE_2D, texture); context.uniform1i(locations.uOwnedSource ?? null, 2);
      const scale = (fit === 'cover' ? Math.max : Math.min)(frame.cssWidth / size.width, frame.cssHeight / size.height);
      const width = size.width * scale, height = size.height * scale;
      context.uniform4f(locations.uSourceMapping ?? null, (frame.cssWidth - width) * position[0]!, (frame.cssHeight - height) * position[1]!, width, height);
      context.uniform3f(locations.uSourceMatte ?? null, matte[0]!, matte[1]!, matte[2]!); emit(); return true;
    },
  };
  function movingEffects(value: GlassSceneOptions) {
    const field = value.field, caustics = value.caustics;
    return Boolean(field && (field.count ?? 1000) > 0 && (field.speed ?? 60) > 0)
      || Boolean(caustics && (caustics.intensity ?? .16) > 0 && (caustics.speed ?? .6) > 0 && (caustics.ripple ?? .5) > 0 && ((value.surfaces?.length ?? 0) + (caustics.emitters?.length ?? 0)) > 0);
  }
  function configure(input: GlassSceneTextureOptions) {
    const next = config(input), merged = { ...settings, ...next };
    if (merged.fit !== undefined && !['cover', 'contain'].includes(merged.fit)) fail('fit must be cover or contain');
    if (merged.videoFrames !== undefined && typeof merged.videoFrames !== 'boolean') fail('videoFrames must be boolean');
    if (merged.onChange !== undefined && typeof merged.onChange !== 'function') fail('onChange must be a function');
    if (merged.scene !== undefined && (!merged.scene || typeof merged.scene !== 'object' || Array.isArray(merged.scene))) fail('scene must be options');
    if (merged.scene?.animate !== undefined && typeof merged.scene.animate !== 'boolean') fail('scene.animate must be boolean');
    const nextKind = classify(merged.source), nextPosition = tuple(merged.position, [.5, .5], 2, 'position'), nextMatte = tuple(merged.matte, [.02, .03, .05], 3, 'matte');
    const nextPixels = integer(merged.maxSourcePixels, 1_048_576, 65_536, 4_194_304, 'maxSourcePixels');
    const nextDimension = integer(merged.maxSourceDimension, 2048, 64, 4096, 'maxSourceDimension');
    const changed = source !== (merged.source ?? null), budgetChanged = pixelCap !== nextPixels || dimensionCap !== nextDimension;
    if (changed) { stopVideo(); unlistenSource(); source = merged.source ?? null; kind = nextKind; blocked = false; dirty = true; uploadValidated = false;
      if (texture && sourceContext) sourceContext.deleteTexture(texture); texture = null; uploadedSourceWidth = uploadedSourceHeight = 0;
      stats = { ...stats, status: source ? 'loading' : 'empty', reason: 'none', kind, width: 0, height: 0, pixels: 0, downscaled: false };
      if (kind === 'image' || kind === 'video') {
        const element = source as HTMLImageElement | HTMLVideoElement;
        const ready = () => { if (destroyed) return; dirty = true; blocked = false; uploadValidated = false; scheduleDraw(); syncVideo(); };
        const bindings: Parameters<typeof listen>[0][number][] = [[element, 'error', () => { sourceFailed('decode'); scheduleDraw(); }]];
        for (const name of kind === 'image' ? ['load'] : ['loadeddata', 'loadedmetadata', 'seeked', 'resize']) bindings.push([element, name, ready]);
        if (kind === 'video') bindings.push([element, 'playing', ready], [element, 'pause', () => { stopVideo(); dirty = true; scheduleDraw(); emit(); }], [element, 'ended', () => { stopVideo(); dirty = true; scheduleDraw(); emit(); }], [element, 'emptied', () => { stopVideo(); dirty = true; blocked = false; stats = { ...stats, status: 'loading', reason: 'none' }; scheduleDraw(); emit(); }]);
        unlistenSource = listen(bindings);
      } else unlistenSource = () => {};
    }
    if (budgetChanged) { dirty = true; blocked = false; uploadValidated = false; }
    settings = { ...merged, position: nextPosition as [number, number], matte: nextMatte as [number, number, number] };
    fit = merged.fit ?? 'cover'; position = nextPosition; matte = nextMatte; pixelCap = nextPixels; dimensionCap = nextDimension;
    const hostScene = merged.scene ?? {}; sceneSettings = { ...hostScene, animate: hostScene.animate ?? movingEffects(hostScene) };
  }
  configure(initial);
  scene = attachGlassScene(canvas, sceneSettings, driver);
  if (!scene.supported) stats = { ...stats, status: 'unsupported', reason: 'webgl' };
  const refresh = () => {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect(); hasArea = bounds.width > 0 && bounds.height > 0;
    if (!visible()) { stopVideo(); stopRender(); } else { scheduleDraw(); syncVideo(); } emit();
  };
  const Intersection = (view as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  const observer = Intersection ? new Intersection(entries => { const entry = entries.find(entry => entry.target === canvas); if (!entry) return; inViewport = entry.isIntersecting; refresh(); scene?.render(); }) : undefined;
  observer?.observe(canvas);
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const sizeObserver = Resize ? new Resize(refresh) : undefined; sizeObserver?.observe(canvas);
  const unlisten = listen([
    [canvas, 'webglcontextlost', () => { lost = true; stopVideo(); stopRender(); stats = { ...stats, status: 'context-lost', reason: 'context' }; emit(); }],
    [canvas, 'webglcontextrestored', () => { lost = false; blocked = false; dirty = true; stats = { ...stats, status: source ? 'loading' : 'empty', reason: 'none' }; refresh(); }],
    [doc, 'visibilitychange', refresh],
    [view, 'resize', refresh],
    ...[reduced, transparency, contrast, forced].flatMap(query => query ? [[query, 'change', refresh] as const] : []),
  ]);
  syncVideo(); emit();
  return {
    get supported() { return Boolean(scene?.supported && !destroyed); },
    get stats() { return scene!.stats; },
    get sourceStats() { return snapshot(); },
    update(next: GlassSceneTextureOptions = {}) { if (destroyed) return; configure(next); stopRender(); scene!.update(sceneSettings); syncVideo(); emit(); },
    setDrops(drops: readonly GlassSceneDrop[]) { if (!destroyed) scene!.setDrops(drops); },
    render(timeSeconds?: number) { if (destroyed) return; stopRender(); scene!.render(timeSeconds); syncVideo(); emit(); },
    invalidateSource() { if (destroyed) return; dirty = true; blocked = false; uploadValidated = false; refresh(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; stopVideo(); stopRender(); observer?.disconnect(); sizeObserver?.disconnect(); unlistenSource(); unlisten(); scene!.destroy();
      if (staging) { staging.width = staging.height = 1; } staging = null; stageContext = null; source = null;
      stats = { ...stats, status: 'destroyed', reason: 'none', width: 0, height: 0, pixels: 0, downscaled: false }; emit();
    },
  };
}
