import { bounded } from './numeric.js';
import { captureState, listen } from './lifecycle.js';
import { fieldFragmentSource, fieldVertexSource, fragmentSource, lensFragmentSource, lensVertexSource, vertexSource, wallpaperSource } from './scene-shaders.js';

/** A surface in an owned WebGL scene. Coordinates and optics use CSS pixels. */
export interface GlassSceneSurface {
  element: HTMLElement;
  radius?: number;
  refraction?: number;
}

/** Decorative GPU instances, not DOM elements or interactive controls. */
export interface GlassSceneFieldOptions {
  /** Instance count, bounded to 0–20,000; default 1,000 when a field is supplied. */
  count?: number;
  /** Nominal width in CSS pixels; individual instances vary in size. Default 24. */
  size?: number;
  /** CSS pixels per second, bounded to 0–600. Default 60. */
  speed?: number;
  direction?: 'right' | 'left' | 'up' | 'down';
  /** Default stream; wave adds transverse motion, orbit rotates around the scene. */
  motion?: 'stream' | 'wave' | 'orbit';
  seed?: number;
}

/** Experimental optics for a wallpaper rendered by this controller, never arbitrary DOM. */
export interface GlassSceneOptions {
  surfaces?: GlassSceneSurface[];
  field?: GlassSceneFieldOptions;
  palette?: 'neon' | 'sunset' | 'ocean';
  paused?: boolean;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  maxDpr?: number;
  /** Optional explicit backing-pixel budget; trades resolution for speed. */
  maxPixels?: number;
}

/** Submission counts and backing dimensions, not timing or a hardware speed guarantee. */
export interface GlassSceneStats {
  readonly renderer: 'webgl2';
  readonly fieldCount: number;
  readonly drawCalls: number;
  readonly wallpaperPasses: number;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly pixels: number;
}

const MAX_SURFACES = 8;
type Pipeline = { program: WebGLProgram; locations: Record<string, WebGLUniformLocation | null> };
const uniformNames = ['uResolution', 'uDpr', 'uTime', 'uPalette', 'uCount', 'uSolid', 'uRects[0]', 'uOptics[0]', 'uWallpaper', 'uField', 'uDirection', 'uMotion'];
const emptyStats = (): GlassSceneStats => ({ renderer: 'webgl2', fieldCount: 0, drawCalls: 0, wallpaperPasses: 0, width: 0, height: 0, dpr: 0, pixels: 0 });

/**
 * Render an experimental owned wallpaper, optional lenses and decorative instances.
 * Keep the canvas behind semantic HTML. It samples its own scene, never DOM content.
 * One controller per canvas; destroy before attaching another.
 */
export function attachGlassScene(canvas: HTMLCanvasElement, initial: GlassSceneOptions = {}) {
  const doc = canvas.ownerDocument;
  const view = doc?.defaultView;
  let destroyed = false;
  let supported = false;
  let stats = emptyStats();
  const noop = {
    get supported() { return false; },
    get stats() { return { ...stats }; },
    update(_options: GlassSceneOptions = {}) {},
    render(_timeSeconds?: number) {},
    destroy() { destroyed = true; },
  };
  if (!view) return noop;
  let gl: WebGL2RenderingContext | null;
  try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false }); }
  catch { return noop; }
  if (!gl) return noop;
  const context = gl;
  let background: Pipeline | null = null;
  let composite: Pipeline | null = null;
  let field: Pipeline | null = null;
  let lenses: Pipeline | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let texture: WebGLTexture | null = null;
  let framebuffer: WebGLFramebuffer | null = null;
  let textureWidth = 0, textureHeight = 0;
  let firstDraw = true;
  let frame: number | null = null;
  let time = 0;
  let lastTimestamp: number | null = null;
  let options: GlassSceneOptions = {};
  let surfaces: GlassSceneSurface[] = [];
  let fieldCount = 0;
  const restore = captureState(canvas, [], ['width', 'height']);
  const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const transparency = view.matchMedia?.('(prefers-reduced-transparency: reduce)');
  const contrast = view.matchMedia?.('(prefers-contrast: more)');
  const forced = view.matchMedia?.('(forced-colors: active)');
  const media = [reduced, transparency, contrast, forced];
  const stop = () => {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    lastTimestamp = null;
  };
  const canAnimate = () => !destroyed && supported && canvas.isConnected && !doc.hidden
    && !options.paused && !options.reducedMotion && !reduced?.matches;
  const releaseGpu = () => {
    for (const pipeline of [background, composite, lenses, field]) if (pipeline) context.deleteProgram(pipeline.program);
    if (vao) context.deleteVertexArray(vao);
    if (texture) context.deleteTexture(texture);
    if (framebuffer) context.deleteFramebuffer(framebuffer);
    background = null; composite = null; lenses = null; field = null; vao = null; texture = null; framebuffer = null;
    textureWidth = textureHeight = 0;
  };
  const createPipeline = (vertexSource: string, fragmentSource: string): Pipeline | null => {
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    try {
      for (const [kind, source] of [[context.VERTEX_SHADER, vertexSource], [context.FRAGMENT_SHADER, fragmentSource]] as const) {
        const shader = context.createShader(kind);
        if (!shader) return null;
        shaders.push(shader);
        context.shaderSource(shader, source); context.compileShader(shader);
      }
      program = context.createProgram();
      if (!program) return null;
      shaders.forEach(shader => context.attachShader(program!, shader));
      context.linkProgram(program);
      // Link status includes shader compilation; avoid separate synchronous status queries.
      if (!context.getProgramParameter(program, context.LINK_STATUS)) { context.deleteProgram(program); return null; }
      const locations: Pipeline['locations'] = {};
      for (const name of uniformNames) locations[name] = context.getUniformLocation(program, name);
      return { program, locations };
    } catch { if (program) context.deleteProgram(program); return null; }
    finally { shaders.forEach(shader => context.deleteShader(shader)); }
  };
  const initialize = () => {
    firstDraw = true; releaseGpu();
    try {
      background = createPipeline(vertexSource, wallpaperSource);
      if (!background) return false;
      composite = createPipeline(vertexSource, fragmentSource);
      vao = context.createVertexArray();
      framebuffer = context.createFramebuffer();
      if (!background || !composite || !vao || !framebuffer) { releaseGpu(); return false; }
      return true;
    } catch { releaseGpu(); return false; }
  };
  supported = initialize();
  if (!supported) return noop;

  const rectData = new Float32Array(MAX_SURFACES * 4);
  const opticData = new Float32Array(MAX_SURFACES * 2);
  const draw = (flush = false) => {
    if (destroyed || !supported || !background || !composite || !canvas.isConnected || doc.hidden) return;
    const bounds = canvas.getBoundingClientRect();
    if (!(bounds.width > 0 && bounds.height > 0)) return;
    let dpr = Math.min(bounded(view.devicePixelRatio, 1, 1, 4), bounded(options.maxDpr, 2, 1, 2));
    let budgeted = false;
    if (typeof options.maxPixels === 'number' && Number.isFinite(options.maxPixels)) {
      const budget = bounded(options.maxPixels, 1_000_000, 65_536, 16_777_216);
      dpr = Math.min(dpr, Math.sqrt(budget / (bounds.width * bounds.height)));
      budgeted = true;
    }
    const width = Math.max(1, (budgeted ? Math.floor : Math.round)(bounds.width * dpr));
    const height = Math.max(1, (budgeted ? Math.floor : Math.round)(bounds.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const scaleX = width / bounds.width, scaleY = height / bounds.height;
    let count = 0;
    for (const surface of surfaces) {
      if (!surface.element.isConnected || surface.element.ownerDocument !== doc) continue;
      const rect = surface.element.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      if (rect.right < bounds.left || rect.left > bounds.right || rect.bottom < bounds.top || rect.top > bounds.bottom) continue;
      const offset = count * 4;
      rectData[offset] = rect.left - bounds.left + rect.width / 2;
      rectData[offset + 1] = rect.top - bounds.top + rect.height / 2;
      rectData[offset + 2] = rect.width / 2; rectData[offset + 3] = rect.height / 2;
      opticData[count * 2] = Math.min(bounded(surface.radius, 28, 0, 256), rect.width / 2, rect.height / 2);
      opticData[count * 2 + 1] = bounded(surface.refraction, 22, 0, 80);
      count++;
    }
    try {
      if (textureWidth !== width || textureHeight !== height) {
        if (texture) context.deleteTexture(texture);
        texture = context.createTexture();
        if (!texture) throw new Error('Texture unavailable');
        context.bindTexture(context.TEXTURE_2D, texture);
        context.texStorage2D(context.TEXTURE_2D, 1, context.RGBA8, width, height);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.bindFramebuffer(context.FRAMEBUFFER, framebuffer);
        context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, texture, 0);
        if (context.checkFramebufferStatus(context.FRAMEBUFFER) !== context.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer unavailable');
        textureWidth = width; textureHeight = height;
        firstDraw = true;
      }
      if (count && !lenses) {
        lenses = createPipeline(lensVertexSource, lensFragmentSource);
        if (!lenses) throw new Error('Lens pipeline unavailable');
        firstDraw = true;
      }
      if (fieldCount && !field) {
        field = createPipeline(fieldVertexSource, fieldFragmentSource);
        if (!field) throw new Error('Field pipeline unavailable');
        firstDraw = true;
      }
      context.viewport(0, 0, width, height); context.bindVertexArray(vao);
      context.disable(context.BLEND);
      const palette = options.palette === 'sunset' ? 1 : options.palette === 'ocean' ? 2 : 0;
      const solid = options.reducedTransparency || transparency?.matches || contrast?.matches || forced?.matches ? 1 : 0;
      const use = (pipeline: Pipeline) => {
        const { locations } = pipeline;
        context.useProgram(pipeline.program);
        context.uniform2f(locations.uResolution ?? null, bounds.width, bounds.height);
        context.uniform2f(locations.uDpr ?? null, scaleX, scaleY);
        context.uniform1f(locations.uTime ?? null, time);
        context.uniform1i(locations.uPalette ?? null, palette);
        context.uniform1i(locations.uSolid ?? null, solid);
      };
      // Compute the procedural wallpaper once. Every lens samples the same full-resolution image.
      context.bindFramebuffer(context.FRAMEBUFFER, framebuffer);
      use(background); context.drawArrays(context.TRIANGLES, 0, 3);
      context.bindFramebuffer(context.FRAMEBUFFER, null);
      context.activeTexture(context.TEXTURE0); context.bindTexture(context.TEXTURE_2D, texture);
      use(composite);
      context.uniform1i(composite.locations.uWallpaper ?? null, 0);
      context.drawArrays(context.TRIANGLES, 0, 3);
      if (count && lenses) {
        use(lenses);
        context.uniform1i(lenses.locations.uWallpaper ?? null, 0);
        context.uniform1i(lenses.locations.uCount ?? null, count);
        context.uniform4fv(lenses.locations['uRects[0]'] ?? null, rectData);
        context.uniform2fv(lenses.locations['uOptics[0]'] ?? null, opticData);
        context.enable(context.BLEND);
        context.blendFuncSeparate(context.ONE, context.SRC_ALPHA, context.ZERO, context.ONE);
        context.drawArraysInstanced(context.TRIANGLES, 0, 6, count);
        context.disable(context.BLEND);
      } else context.uniform1i(composite.locations.uCount ?? null, 0);
      if (fieldCount && field) {
        use(field);
        const settings = options.field;
        const direction = settings?.direction;
        context.uniform1i(field.locations.uWallpaper ?? null, 0);
        context.uniform4f(field.locations.uField ?? null, fieldCount, bounded(settings?.size, 24, 4, 180), bounded(settings?.speed, 60, 0, 600), bounded(settings?.seed, 1, 0, 65_535));
        context.uniform2f(field.locations.uDirection ?? null, direction === 'left' ? -1 : direction === 'up' || direction === 'down' ? 0 : 1, direction === 'up' ? -1 : direction === 'down' ? 1 : 0);
        context.uniform1i(field.locations.uMotion ?? null, settings?.motion === 'wave' ? 1 : settings?.motion === 'orbit' ? 2 : 0);
        context.enable(context.BLEND); context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        context.drawArraysInstanced(context.TRIANGLES, 0, 6, fieldCount);
        context.disable(context.BLEND);
      }
      context.bindVertexArray(null);
      stats = { renderer: 'webgl2', fieldCount, drawCalls: 2 + (count ? 1 : 0) + (fieldCount ? 1 : 0), wallpaperPasses: 1, width, height, dpr, pixels: width * height };
      if (flush) context.flush();
      if (firstDraw) {
        firstDraw = false;
        if (context.getError() !== context.NO_ERROR) throw new Error('Draw pipeline unavailable');
      }
    } catch {
      context.bindFramebuffer(context.FRAMEBUFFER, null);
      supported = false; stats = emptyStats(); stop(); releaseGpu();
    }
  };
  const tick = (timestamp: number) => {
    frame = null;
    if (!canAnimate()) { lastTimestamp = null; return; }
    if (lastTimestamp !== null) time += Math.max(0, Math.min(.1, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp; draw();
    if (canAnimate()) frame = view.requestAnimationFrame(tick);
  };
  const schedule = () => { if (canAnimate() && frame === null) frame = view.requestAnimationFrame(tick); };
  const refresh = () => { stop(); draw(true); schedule(); };
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(refresh) : undefined;
  const update = (next: GlassSceneOptions = {}) => {
    if (destroyed) return;
    options = { ...next, field: next.field ? { ...next.field } : undefined };
    fieldCount = next.field ? Math.round(bounded(next.field.count, 1000, 0, 20_000)) : 0;
    surfaces = (Array.isArray(next.surfaces) ? next.surfaces : [])
      .filter(surface => surface?.element && surface.element.ownerDocument === doc && surface.element.isConnected).slice(0, MAX_SURFACES)
      .map(surface => ({ element: surface.element, radius: surface.radius, refraction: surface.refraction }));
    observer?.disconnect(); observer?.observe(canvas);
    for (const surface of surfaces) observer?.observe(surface.element);
    refresh();
  };
  const lost = (event: Event) => {
    event.preventDefault(); supported = false; stats = emptyStats(); stop();
    // A restored context invalidates old handles. Clear them while lost so
    // initialization never deletes stale objects against the replacement context.
    releaseGpu();
  };
  const restored = () => { if (destroyed) return; supported = initialize(); refresh(); };
  const unlisten = listen([
    [canvas, 'webglcontextlost', lost], [canvas, 'webglcontextrestored', restored],
    [doc, 'visibilitychange', refresh], [view, 'resize', refresh], [view, 'scroll', refresh, true],
    ...media.flatMap(query => query ? [[query, 'change', refresh] as const] : []),
  ]);
  update(initial);
  return {
    get supported() { return supported && !destroyed; },
    get stats() { return { ...stats }; },
    update,
    render(timeSeconds?: number) {
      if (destroyed) return;
      if (typeof timeSeconds === 'number' && Number.isFinite(timeSeconds)) time = Math.min(1_000_000, Math.max(0, timeSeconds));
      draw(true); schedule();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; supported = false; stats = emptyStats(); stop(); observer?.disconnect();
      unlisten(); releaseGpu(); restore();
    },
  };
}
