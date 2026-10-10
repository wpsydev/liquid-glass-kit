import { causticFragmentSource, causticVertexSource } from './scene-caustics.js';
import { bounded } from './numeric.js';
import { captureState, listen } from './lifecycle.js';
import { fieldFragmentSource, fieldVertexSource, fragmentSource, fusionFragmentSource, fusionVertexSource, lensFragmentSource, lensVertexSource, vertexSource, wallpaperSource } from './scene-shaders.js';

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

/** A circular droplet in canvas-local CSS pixels; no DOM element is created. */
export interface GlassSceneDrop {
  x: number;
  y: number;
  radius: number;
}

/** Experimental smooth union of up to eight owned-scene circular droplets. */
export interface GlassSceneFusionOptions {
  drops: readonly GlassSceneDrop[];
  smoothness?: number;
  refraction?: number;
  dispersion?: number;
}

/** Single-interface refracted mesh onto an owned planar receiver, not full light transport. */
export interface GlassSceneCausticEmitter {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}
export interface GlassSceneCausticsOptions {
  /** Additional canvas-local emitters; visible surfaces take priority. Eight total. */
  emitters?: readonly GlassSceneCausticEmitter[];
  /** Bounded 0–1; default .16. Zero skips the pass. */
  intensity?: number;
  /** Refractive index, 1–2.4; default 1.45. */
  ior?: number;
  /** Receiver separation in CSS pixels, 0–240; default 100. */
  depth?: number;
  /** Analytic wave slope amount, 0–1; default .5. */
  ripple?: number;
  /** Phase speed, 0–3; default .6. Respects scene motion preferences. */
  speed?: number;
  /** Source mesh cells per axis, 16–96; default 40. Quality/cost tradeoff. */
  resolution?: number;
  /** Caustic texture scale relative to scene backing size, .25–1; default .5. */
  renderScale?: number;
  /** Incoming light XY slope; each component -1–1. Default [.45, .65]. */
  light?: readonly [number, number];
}

/** Experimental optics for a wallpaper rendered by this controller, never arbitrary DOM. */
export interface GlassSceneOptions {
  surfaces?: GlassSceneSurface[];
  field?: GlassSceneFieldOptions;
  fusion?: GlassSceneFusionOptions;
  caustics?: GlassSceneCausticsOptions;
  backdrop?: 'ribbons' | 'studio' | 'mineral';
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
  readonly fusionCount: number;
  readonly causticCount: number;
  readonly causticTriangles: number;
  readonly causticPixels: number;
  readonly drawCalls: number;
  readonly wallpaperPasses: number;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly pixels: number;
}

const MAX_SURFACES = 8;
type Pipeline = { program: WebGLProgram; locations: Record<string, WebGLUniformLocation | null> };
const uniformNames = ['uResolution', 'uDpr', 'uTime', 'uPalette', 'uCount', 'uSolid', 'uRects[0]', 'uOptics[0]', 'uWallpaper', 'uField', 'uDirection', 'uMotion', 'uBackdrop', 'uDrops[0]', 'uFusionCount', 'uFusion', 'uFusionBounds', 'uCausticRects[0]', 'uCausticRadii[0]', 'uCaustics', 'uCausticLight', 'uCausticGrid', 'uCausticMap', 'uCausticActive'];
type MutableStats = { -readonly [Key in keyof GlassSceneStats]: GlassSceneStats[Key] };
const emptyStats = (): MutableStats => ({ renderer: 'webgl2', fieldCount: 0, fusionCount: 0, causticCount: 0, causticTriangles: 0, causticPixels: 0, drawCalls: 0, wallpaperPasses: 0, width: 0, height: 0, dpr: 0, pixels: 0 });

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
    setDrops(_drops: readonly GlassSceneDrop[]) {},
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
  let fusion: Pipeline | null = null;
  let caustics: Pipeline | null = null;
  let causticIndices: WebGLBuffer | null = null, causticVertices: WebGLBuffer | null = null;
  let causticTexture: WebGLTexture | null = null, causticFramebuffer: WebGLFramebuffer | null = null;
  let causticWidth = 0, causticHeight = 0;
  let causticGrid = 0;
  let causticRects: Float32Array | null = null, causticRadii: Float32Array | null = null;
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
  let fusionEnabled = false, fusionCount = 0;
  let fusionSmoothness = 32, fusionRefraction = 36, fusionDispersion = 0, fusionEdgeWidth = 44;
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
    for (const pipeline of [background, composite, fusion, lenses, field, caustics]) if (pipeline) context.deleteProgram(pipeline.program);
    if (causticTexture) context.deleteTexture(causticTexture);
    if (causticFramebuffer) context.deleteFramebuffer(causticFramebuffer);
    causticTexture = null; causticFramebuffer = null; causticWidth = causticHeight = 0;
    if (causticIndices) context.deleteBuffer(causticIndices);
    if (causticVertices) context.deleteBuffer(causticVertices);
    causticVertices = null;
    causticIndices = null; causticGrid = 0; caustics = null;
    if (vao) context.deleteVertexArray(vao);
    if (texture) context.deleteTexture(texture);
    if (framebuffer) context.deleteFramebuffer(framebuffer);
    background = null; composite = null; lenses = null; fusion = null; field = null; vao = null; texture = null; framebuffer = null;
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
  const dropData = new Float32Array(MAX_SURFACES * 3);
  const fusionBounds = new Float32Array(4);
  const writeDrops = (drops: readonly GlassSceneDrop[]) => {
    fusionCount = 0;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, minimumRadius = 1024;
    if (Array.isArray(drops)) for (let index = 0; index < drops.length && fusionCount < MAX_SURFACES; index++) {
      const drop = drops[index];
      if (!drop || typeof drop !== 'object') continue;
      const offset = fusionCount * 3;
      dropData[offset] = bounded(drop.x, 0, -100_000, 100_000);
      dropData[offset + 1] = bounded(drop.y, 0, -100_000, 100_000);
      dropData[offset + 2] = bounded(drop.radius, 80, 1, 1024);
      const x = dropData[offset]!, y = dropData[offset + 1]!, radius = dropData[offset + 2]!;
      left = Math.min(left, x - radius); right = Math.max(right, x + radius);
      top = Math.min(top, y - radius); bottom = Math.max(bottom, y + radius);
      minimumRadius = Math.min(minimumRadius, radius);
      fusionCount++;
    }
    if (!fusionCount) { fusionBounds.fill(0); return; }
    // Each polynomial union can grow its contour by at most smoothness / 4.
    const margin = 96 + fusionSmoothness * (fusionCount - 1) * .25;
    fusionBounds[0] = (left + right) * .5; fusionBounds[1] = (top + bottom) * .5;
    fusionBounds[2] = (right - left) * .5 + margin; fusionBounds[3] = (bottom - top) * .5 + margin;
    fusionEdgeWidth = Math.max(8, Math.min(70, minimumRadius * .55));
  };
  const use = (pipeline: Pipeline, cssWidth: number, cssHeight: number, scaleX: number, scaleY: number, palette: number, solid: number) => {
    const { locations } = pipeline;
    context.useProgram(pipeline.program);
    context.uniform2f(locations.uResolution ?? null, cssWidth, cssHeight);
    context.uniform2f(locations.uDpr ?? null, scaleX, scaleY);
    context.uniform1f(locations.uTime ?? null, time);
    context.uniform1i(locations.uPalette ?? null, palette);
    context.uniform1i(locations.uBackdrop ?? null, options.backdrop === 'studio' ? 1 : options.backdrop === 'mineral' ? 2 : 0);
    context.uniform1i(locations.uSolid ?? null, solid);
  };
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
    const causticOptions = options.caustics;
    const intensity = causticOptions ? bounded(causticOptions.intensity, .16, 0, 1) : 0;
    const solid = options.reducedTransparency || transparency?.matches || contrast?.matches || forced?.matches ? 1 : 0;
    let causticCount = 0;
    if (intensity > 0 && !solid) {
      causticRects ??= new Float32Array(MAX_SURFACES * 4);
      causticRadii ??= new Float32Array(MAX_SURFACES);
      for (let i = 0; i < count; i++) {
        for (let k = 0; k < 4; k++) causticRects[i * 4 + k] = rectData[i * 4 + k]!;
        causticRadii[i] = opticData[i * 2]!;
      }
      causticCount = count;
      for (const emitter of causticOptions?.emitters ?? []) {
        if (causticCount >= MAX_SURFACES) break;
        if (!emitter || !(emitter.width > 0 && emitter.height > 0)) continue;
        const x = bounded(emitter.x, 0, -100_000, 100_000), y = bounded(emitter.y, 0, -100_000, 100_000);
        const w = bounded(emitter.width, 80, 1, 2048) * .5, h = bounded(emitter.height, 80, 1, 2048) * .5;
        if (x + w < -480 || y + h < -480 || x - w > bounds.width + 480 || y - h > bounds.height + 480) continue;
        const offset = causticCount * 4;
        causticRects[offset] = x; causticRects[offset + 1] = y; causticRects[offset + 2] = w; causticRects[offset + 3] = h;
        causticRadii[causticCount++] = Math.min(w, h, bounded(emitter.radius, 28, 0, 1024));
      }
    }
    const drawFusion = fusionEnabled && fusionCount > 0
      && fusionBounds[0]! + fusionBounds[2]! >= 0 && fusionBounds[0]! - fusionBounds[2]! <= bounds.width
      && fusionBounds[1]! + fusionBounds[3]! >= 0 && fusionBounds[1]! - fusionBounds[3]! <= bounds.height;
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
      if (drawFusion && !fusion) {
        fusion = createPipeline(fusionVertexSource, fusionFragmentSource);
        if (!fusion) throw new Error('Fusion pipeline unavailable');
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
      if (causticCount && !caustics) {
        caustics = createPipeline(causticVertexSource, causticFragmentSource);
        if (!caustics) throw new Error('Caustic pipeline unavailable');
        firstDraw = true;
      }
      if (causticCount) {
        const scale = bounded(causticOptions?.renderScale, .5, .25, 1);
        const cw = Math.max(1, Math.floor(width * scale)), ch = Math.max(1, Math.floor(height * scale));
        if (cw !== causticWidth || ch !== causticHeight) {
          if (causticTexture) context.deleteTexture(causticTexture);
          causticTexture = context.createTexture();
          causticFramebuffer ??= context.createFramebuffer();
          if (!causticTexture || !causticFramebuffer) throw new Error('Caustic target unavailable');
          context.bindTexture(context.TEXTURE_2D, causticTexture);
          context.texStorage2D(context.TEXTURE_2D, 1, context.RGBA8, cw, ch);
          context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
          context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
          context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
          context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
          context.bindFramebuffer(context.FRAMEBUFFER, causticFramebuffer);
          context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, causticTexture, 0);
          if (context.checkFramebufferStatus(context.FRAMEBUFFER) !== context.FRAMEBUFFER_COMPLETE) throw new Error('Caustic framebuffer unavailable');
          causticWidth = cw; causticHeight = ch; firstDraw = true;
        }
      }
      context.bindVertexArray(vao);
      if (causticCount) {
        const grid = Math.round(bounded(causticOptions?.resolution, 40, 16, 96));
        if (grid !== causticGrid) {
          const indices = new Uint16Array(grid * grid * 6);
          const stride = grid + 1;
          const vertices = new Float32Array(stride * stride * 2);
          for (let y = 0; y <= grid; y++) for (let x = 0; x <= grid; x++) {
            const offset = (y * stride + x) * 2;
            vertices[offset] = x / grid; vertices[offset + 1] = y / grid;
          }
          causticVertices ??= context.createBuffer();
          if (!causticVertices) throw new Error('Caustic vertex buffer unavailable');
          context.bindBuffer(context.ARRAY_BUFFER, causticVertices);
          context.bufferData(context.ARRAY_BUFFER, vertices, context.STATIC_DRAW);
          context.enableVertexAttribArray(0); context.vertexAttribPointer(0, 2, context.FLOAT, false, 0, 0);
          let index = 0;
          for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
            const a = y * stride + x, b = a + 1, c = a + stride, d = c + 1;
            indices[index++] = a; indices[index++] = b; indices[index++] = c;
            indices[index++] = c; indices[index++] = b; indices[index++] = d;
          }
          causticIndices ??= context.createBuffer();
          if (!causticIndices) throw new Error('Caustic index buffer unavailable');
          context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, causticIndices);
          context.bufferData(context.ELEMENT_ARRAY_BUFFER, indices, context.STATIC_DRAW);
          causticGrid = grid;
        }
      }
      context.viewport(0, 0, width, height); context.bindVertexArray(vao);
      context.disable(context.BLEND);
      const palette = options.palette === 'sunset' ? 1 : options.palette === 'ocean' ? 2 : 0;
      if (causticCount && caustics) {
        context.bindFramebuffer(context.FRAMEBUFFER, causticFramebuffer);
        context.viewport(0, 0, causticWidth, causticHeight);
        context.clearColor(0, 0, 0, 0); context.clear(context.COLOR_BUFFER_BIT);
        use(caustics, bounds.width, bounds.height, scaleX, scaleY, palette, solid);
        context.uniform4fv(caustics.locations['uCausticRects[0]'] ?? null, causticRects!);
        context.uniform1fv(caustics.locations['uCausticRadii[0]'] ?? null, causticRadii!);
        context.uniform4f(caustics.locations.uCaustics ?? null, intensity, bounded(causticOptions?.ior, 1.45, 1, 2.4), bounded(causticOptions?.depth, 100, 0, 240), bounded(causticOptions?.ripple, .5, 0, 1));
        context.uniform3f(caustics.locations.uCausticLight ?? null, bounded(causticOptions?.light?.[0], .45, -1, 1), bounded(causticOptions?.light?.[1], .65, -1, 1), bounded(causticOptions?.speed, .6, 0, 3));
        context.uniform1i(caustics.locations.uCausticGrid ?? null, causticGrid);
        context.enable(context.BLEND); context.blendFunc(context.ONE, context.ONE);
        context.drawElementsInstanced(context.TRIANGLES, causticGrid * causticGrid * 6, context.UNSIGNED_SHORT, 0, causticCount);
        context.disable(context.BLEND);
      }
      // Light receiver is lower resolution, then sampled during the existing wallpaper pass.
      context.bindFramebuffer(context.FRAMEBUFFER, framebuffer);
      context.viewport(0, 0, width, height);
      context.activeTexture(context.TEXTURE1); context.bindTexture(context.TEXTURE_2D, causticTexture);
      use(background, bounds.width, bounds.height, scaleX, scaleY, palette, solid);
      context.uniform1i(background.locations.uCausticMap ?? null, 1);
      context.uniform1i(background.locations.uCausticActive ?? null, causticCount ? 1 : 0);
      context.drawArrays(context.TRIANGLES, 0, 3);
      context.bindFramebuffer(context.FRAMEBUFFER, null);
      context.activeTexture(context.TEXTURE0); context.bindTexture(context.TEXTURE_2D, texture);
      use(composite, bounds.width, bounds.height, scaleX, scaleY, palette, solid);
      context.uniform1i(composite.locations.uWallpaper ?? null, 0);
      context.drawArrays(context.TRIANGLES, 0, 3);
      if (drawFusion && fusion) {
        use(fusion, bounds.width, bounds.height, scaleX, scaleY, palette, solid);
        context.uniform1i(fusion.locations.uWallpaper ?? null, 0);
        context.uniform1i(fusion.locations.uFusionCount ?? null, fusionCount);
        context.uniform3fv(fusion.locations['uDrops[0]'] ?? null, dropData);
        context.uniform4fv(fusion.locations.uFusionBounds ?? null, fusionBounds);
        context.uniform4f(fusion.locations.uFusion ?? null, fusionSmoothness, fusionRefraction, fusionDispersion, fusionEdgeWidth);
        context.enable(context.BLEND);
        context.blendFuncSeparate(context.ONE, context.SRC_ALPHA, context.ZERO, context.ONE);
        context.drawArrays(context.TRIANGLES, 0, 6);
        context.disable(context.BLEND);
      }
      if (count && lenses) {
        use(lenses, bounds.width, bounds.height, scaleX, scaleY, palette, solid);
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
        use(field, bounds.width, bounds.height, scaleX, scaleY, palette, solid);
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
      stats.fieldCount = fieldCount; stats.fusionCount = drawFusion ? fusionCount : 0;
      stats.causticPixels = causticCount ? causticWidth * causticHeight : 0;
      stats.causticCount = causticCount; stats.causticTriangles = causticCount * causticGrid * causticGrid * 2;
      stats.drawCalls = 2 + (causticCount ? 1 : 0) + (drawFusion ? 1 : 0) + (count ? 1 : 0) + (fieldCount ? 1 : 0);
      stats.wallpaperPasses = 1; stats.width = width; stats.height = height; stats.dpr = dpr; stats.pixels = width * height;
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
    options = { ...next, caustics: next.caustics ? { ...next.caustics, light: next.caustics.light ? [...next.caustics.light] as [number, number] : undefined,
      emitters: (Array.isArray(next.caustics.emitters) ? next.caustics.emitters : []).slice(0, MAX_SURFACES).map(e => ({ ...e })) } : undefined, field: next.field ? { ...next.field } : undefined, fusion: next.fusion ? { ...next.fusion, drops: [] } : undefined };
    fusionEnabled = Boolean(next.fusion);
    fusionSmoothness = bounded(next.fusion?.smoothness, 32, 0, 120);
    fusionRefraction = bounded(next.fusion?.refraction, 36, 0, 100);
    fusionDispersion = bounded(next.fusion?.dispersion, 0, 0, 8);
    writeDrops(next.fusion?.drops ?? []);
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
    /** Stage owned droplet geometry; call render() explicitly while paused. */
    setDrops(drops: readonly GlassSceneDrop[]) {
      if (destroyed || !fusionEnabled) return;
      writeDrops(drops); schedule();
    },
    render(timeSeconds?: number) {
      if (destroyed) return;
      if (typeof timeSeconds === 'number' && Number.isFinite(timeSeconds)) time = options.reducedMotion || reduced?.matches ? 0 : Math.min(1_000_000, Math.max(0, timeSeconds));
      draw(true); schedule();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; supported = false; stats = emptyStats(); stop(); observer?.disconnect();
      unlisten(); releaseGpu(); restore();
    },
  };
}
