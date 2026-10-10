import { bounded } from './numeric.js';
import { captureState, listen } from './lifecycle.js';

/** A surface in an owned WebGL scene. Coordinates and optics use CSS pixels. */
export interface GlassSceneSurface {
  element: HTMLElement;
  radius?: number;
  refraction?: number;
}

/** Experimental optics for a wallpaper rendered by this controller, never arbitrary DOM. */
export interface GlassSceneOptions {
  surfaces?: GlassSceneSurface[];
  palette?: 'neon' | 'sunset' | 'ocean';
  paused?: boolean;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  maxDpr?: number;
}

const MAX_SURFACES = 8;
const vertexSource = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const fragmentSource = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform vec2 uDpr;
uniform float uTime;
uniform int uPalette;
uniform int uCount;
uniform int uSolid;
uniform vec4 uRects[8];
uniform vec2 uOptics[8];

vec3 palette(float phase) {
  if (uPalette == 1) return .55 + .45 * cos(6.2831853 * (phase + vec3(.04, .18, .44)));
  if (uPalette == 2) return .52 + .48 * cos(6.2831853 * (phase + vec3(.49, .32, .20)));
  return .52 + .48 * cos(6.2831853 * (phase + vec3(.18, .47, .72)));
}

// All wallpaper samples use this same global screen coordinate system.
vec3 wallpaper(vec2 point) {
  float unit = max(1.0, min(uResolution.x, uResolution.y));
  vec2 p = (point - uResolution * .5) / unit;
  float t = uTime * .15;
  vec3 col = vec3(.016, .020, .052);
  float ambient = exp(-2.8 * dot(p - vec2(.12, -.05), p - vec2(.12, -.05)));
  col += palette(.56) * ambient * .055;
  // Continuous ribbons: luminous cores and broad halos make edge bending visible.
  for (int j = 0; j < 4; j++) {
    float k = float(j);
    float center = .36 * sin(p.x * 2.7 + k * 1.42 + t)
                 + .13 * sin(p.x * 5.1 - t * .74 + k) + (k - 1.5) * .23;
    float distance = abs(p.y - center);
    float width = .026 + .013 * sin(k * 1.7 + 1.0);
    float c = distance / width;
    float s = distance / (width * 2.4);
    float h = distance / .12;
    float core = exp(-c * c);
    float shoulder = exp(-s * s);
    float halo = exp(-h * h);
    vec3 color = palette(k * .24 + p.x * .07 + t * .04);
    col += color * (core * .80 + shoulder * .17 + halo * .11);
    col += vec3(.77, .87, 1.0) * core * .12;
  }
  // Fine, moving contour lines are deliberately screen anchored, including under lenses.
  float gridX = abs(sin((p.x + .035 * sin(p.y * 4.0 + t)) * 38.0));
  float gridY = abs(sin((p.y + .025 * cos(p.x * 4.0 - t)) * 38.0));
  float line = 1.0 - smoothstep(.012, .055, min(gridX, gridY));
  col += vec3(.13, .16, .28) * line * .38;
  float vignette = 1.0 - smoothstep(.25, 1.25, length(p * vec2(.80, 1.0)));
  return col * (.68 + .32 * vignette);
}

// Rounded-box signed distance and its analytic outward normal: no mask tap stencil.
void roundedBox(vec2 point, vec4 rect, float radius, out float distance, out vec2 normal) {
  vec2 local = point - rect.xy;
  vec2 q = abs(local) - rect.zw + vec2(radius);
  vec2 corner = max(q, vec2(0.0));
  float cornerLength = length(corner);
  distance = min(max(q.x, q.y), 0.0) + cornerLength - radius;
  vec2 direction = vec2(local.x < 0.0 ? -1.0 : 1.0, local.y < 0.0 ? -1.0 : 1.0);
  if (cornerLength > .0001) normal = corner / cornerLength * direction;
  else normal = q.x > q.y ? vec2(direction.x, 0.0) : vec2(0.0, direction.y);
}

void main() {
  vec2 point = vec2(gl_FragCoord.x / uDpr.x, uResolution.y - gl_FragCoord.y / uDpr.y);
  vec3 color = wallpaper(point);
  for (int i = 0; i < 8; i++) {
    if (i >= uCount) break;
    float d;
    vec2 normal;
    roundedBox(point, uRects[i], uOptics[i].x, d, normal);
    float coverage = 1.0 - smoothstep(-.65, .65, d);
    if (d > 0.0) {
      color *= 1.0 - exp(-d / 11.0) * .12;
    }
    if (coverage > .0) {
      vec3 glass;
      if (uSolid == 1) {
        glass = vec3(.050, .059, .105);
      } else {
        float depth = max(0.0, -d);
        float edgeWidth = min(35.0, min(uRects[i].z, uRects[i].w) * .42);
        float edge = 1.0 - smoothstep(0.0, max(1.0, edgeWidth), depth);
        // Edge-only displacement is exactly zero in the neutral central region.
        vec2 warp = normal * uOptics[i].y * edge * edge;
        vec2 samplePoint = point - warp;
        glass = wallpaper(samplePoint);
        glass = mix(glass, vec3(.17, .20, .30), .13);
        float incidence = max(0.0, dot(normal, vec2(-.65, -.76)));
        float reflection = incidence * incidence;
        float rim = exp(-depth / 1.45);
        float rimPosition = (depth - 3.5) / 2.7;
        float innerRim = exp(-rimPosition * rimPosition);
        // Rim lighting is separate from refraction; highlights cannot translate the wallpaper.
        glass += vec3(.67, .82, 1.0) * rim * (.17 + reflection * .63);
        glass += palette(.14) * innerRim * .075;
        glass *= 1.0 - edge * (1.0 - reflection) * .08;
      }
      color = mix(color, glass, coverage);
    }
  }
  // Sub-LSB dither avoids banding in the dark gradients without temporal noise.
  float grain = fract(sin(dot(floor(point * uDpr), vec2(12.9898, 78.233))) * 43758.5453) - .5;
  outColor = vec4(clamp(color + grain / 255.0, 0.0, 1.0), 1.0);
}`;

/**
 * Render an experimental analytical wallpaper and matching glass lenses into a canvas.
 * Keep the canvas behind semantic HTML. It samples its own scene, never DOM content.
 * One controller per canvas; destroy before attaching another.
 */
export function attachGlassScene(canvas: HTMLCanvasElement, initial: GlassSceneOptions = {}) {
  const doc = canvas.ownerDocument;
  const view = doc?.defaultView;
  let destroyed = false;
  let supported = false;
  const noop = {
    get supported() { return false; },
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
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let vertex: WebGLShader | null = null;
  let fragment: WebGLShader | null = null;
  let locations: Record<string, WebGLUniformLocation | null> = {};
  let firstDraw = true;
  let frame: number | null = null;
  let time = 0;
  let lastTimestamp: number | null = null;
  let options: GlassSceneOptions = {};
  let surfaces: GlassSceneSurface[] = [];
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
    if (program) context.deleteProgram(program);
    if (vao) context.deleteVertexArray(vao);
    if (vertex) context.deleteShader(vertex);
    if (fragment) context.deleteShader(fragment);
    program = null; vao = null; vertex = null; fragment = null;
    locations = {};
  };
  const initialize = () => {
    firstDraw = true;
    releaseGpu();
    try {
      const compile = (kind: number, source: string) => {
        const shader = context.createShader(kind);
        if (!shader) return null;
        context.shaderSource(shader, source); context.compileShader(shader);
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) { context.deleteShader(shader); return null; }
        return shader;
      };
      vertex = compile(context.VERTEX_SHADER, vertexSource);
      fragment = compile(context.FRAGMENT_SHADER, fragmentSource);
      if (!vertex || !fragment) { releaseGpu(); return false; }
      program = context.createProgram();
      if (!program) { releaseGpu(); return false; }
      context.attachShader(program, vertex); context.attachShader(program, fragment); context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) { releaseGpu(); return false; }
      vao = context.createVertexArray();
      if (!vao) { releaseGpu(); return false; }
      for (const name of ['uResolution', 'uDpr', 'uTime', 'uPalette', 'uCount', 'uSolid', 'uRects[0]', 'uOptics[0]']) {
        locations[name] = context.getUniformLocation(program, name);
      }
      return true;
    } catch { releaseGpu(); return false; }
  };
  supported = initialize();
  if (!supported) return noop;

  const rectData = new Float32Array(MAX_SURFACES * 4);
  const opticData = new Float32Array(MAX_SURFACES * 2);
  const draw = (flush = false) => {
    if (destroyed || !supported || !program || !canvas.isConnected || doc.hidden) return;
    const bounds = canvas.getBoundingClientRect();
    if (!(bounds.width > 0 && bounds.height > 0)) return;
    const dpr = Math.min(bounded(view.devicePixelRatio, 1, 1, 4), bounded(options.maxDpr, 2, 1, 2));
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    // Rounding backing pixels must not move the screen coordinate origin.
    const scaleX = width / bounds.width;
    const scaleY = height / bounds.height;
    let count = 0;
    for (const surface of surfaces) {
      if (count >= MAX_SURFACES) break;
      if (!surface.element.isConnected || surface.element.ownerDocument !== doc) continue;
      const rect = surface.element.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      if (rect.right < bounds.left || rect.left > bounds.right || rect.bottom < bounds.top || rect.top > bounds.bottom) continue;
      rectData.set([rect.left - bounds.left + rect.width / 2, rect.top - bounds.top + rect.height / 2, rect.width / 2, rect.height / 2], count * 4);
      opticData.set([Math.min(bounded(surface.radius, 28, 0, 256), rect.width / 2, rect.height / 2), bounded(surface.refraction, 22, 0, 80)], count * 2);
      count++;
    }
    context.viewport(0, 0, width, height);
    context.useProgram(program); context.bindVertexArray(vao);
    // Independent pixel scales preserve screen alignment despite DPR rounding.
    context.uniform2f(locations.uResolution ?? null, bounds.width, bounds.height);
    context.uniform2f(locations.uDpr ?? null, scaleX, scaleY);
    context.uniform1f(locations.uTime ?? null, time);
    context.uniform1i(locations.uPalette ?? null, options.palette === 'sunset' ? 1 : options.palette === 'ocean' ? 2 : 0);
    context.uniform1i(locations.uCount ?? null, count);
    context.uniform1i(locations.uSolid ?? null, options.reducedTransparency || transparency?.matches || contrast?.matches || forced?.matches ? 1 : 0);
    context.uniform4fv(locations['uRects[0]'] ?? null, rectData);
    context.uniform2fv(locations['uOptics[0]'] ?? null, opticData);
    context.drawArrays(context.TRIANGLES, 0, 3);
    context.bindVertexArray(null);
    if (flush) context.flush();
    // Some backends link successfully but fail when constructing the first draw pipeline.
    // Check once per initialization rather than blocking the GPU on every animation frame.
    if (firstDraw) {
      firstDraw = false;
      if (context.getError() !== context.NO_ERROR) {
        supported = false;
        stop();
        releaseGpu();
      }
    }
  };
  const tick = (timestamp: number) => {
    frame = null;
    if (!canAnimate()) { lastTimestamp = null; return; }
    if (lastTimestamp !== null) time += Math.max(0, Math.min(.1, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp;
    draw();
    if (canAnimate()) frame = view.requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (canAnimate() && frame === null) frame = view.requestAnimationFrame(tick);
  };
  const refresh = () => { stop(); draw(true); schedule(); };
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Resize ? new Resize(refresh) : undefined;
  const update = (next: GlassSceneOptions = {}) => {
    if (destroyed) return;
    options = { ...next };
    surfaces = (Array.isArray(next.surfaces) ? next.surfaces : [])
      .filter(surface => surface?.element && surface.element.ownerDocument === doc && surface.element.isConnected).slice(0, MAX_SURFACES)
      .map(surface => ({ element: surface.element, radius: surface.radius, refraction: surface.refraction }));
    observer?.disconnect(); observer?.observe(canvas);
    for (const surface of surfaces) observer?.observe(surface.element);
    refresh();
  };
  const lost = (event: Event) => { event.preventDefault(); supported = false; stop(); };
  const restored = () => { if (destroyed) return; supported = initialize(); refresh(); };
  const unlisten = listen([
    [canvas, 'webglcontextlost', lost], [canvas, 'webglcontextrestored', restored],
    [doc, 'visibilitychange', refresh], [view, 'resize', refresh], [view, 'scroll', refresh, true],
    ...media.flatMap(query => query ? [[query, 'change', refresh] as const] : []),
  ]);
  update(initial);
  return {
    get supported() { return supported && !destroyed; },
    update,
    render(timeSeconds?: number) {
      if (destroyed) return;
      if (typeof timeSeconds === 'number' && Number.isFinite(timeSeconds)) time = Math.min(1_000_000, Math.max(0, timeSeconds));
      draw(true); schedule();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; supported = false; stop(); observer?.disconnect();
      unlisten();
      releaseGpu();
      restore();
    },
  };
}
