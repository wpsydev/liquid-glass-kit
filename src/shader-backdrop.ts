import { listen } from './lifecycle.js';

export type GlassShaderUniform =
  | { readonly type: 'float' | 'int'; readonly value: number }
  | { readonly type: 'vec2'; readonly value: readonly [number, number] }
  | { readonly type: 'vec3'; readonly value: readonly [number, number, number] }
  | { readonly type: 'vec4'; readonly value: readonly [number, number, number, number] };
export interface GlassShaderProvenance { readonly author: string; readonly license: string }
export interface GlassShaderBackdropOptions {
  /** Trusted GLSL ES function `vec4 glassBackdrop(vec2 pixel)`, not a URL or sandbox. */
  readonly fragment: string;
  /** Caller declaration only; this controller cannot verify ownership/license. */
  readonly provenance: GlassShaderProvenance;
  readonly uniforms?: Readonly<Record<string, GlassShaderUniform>>;
  readonly maxDpr?: number;
  readonly maxPixels?: number;
  readonly maxDimension?: number;
  readonly play?: boolean;
  readonly enabled?: boolean;
  readonly reducedMotion?: boolean;
  readonly reducedTransparency?: boolean;
  readonly onStatus?: (state: Readonly<GlassShaderBackdropState>) => void;
}
export interface GlassShaderBackdropState {
  readonly status: 'ready' | 'unsupported' | 'error' | 'context-lost' | 'destroyed';
  readonly playing: boolean;
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly reason: 'none' | 'paused' | 'hidden' | 'offscreen' | 'motion' | 'transparency' | 'disabled' | 'context' | 'webgl' | 'compile' | 'link' | 'draw';
  /** Submission counters/dimensions, not completed GPU work or frame rate. */
  readonly submittedFrames: number;
  readonly width: number;
  readonly height: number;
  readonly pixels: number;
  readonly time: number;
  readonly diagnostics: string;
  readonly provenance: Readonly<GlassShaderProvenance>;
}
type Uniform = { type: GlassShaderUniform['type']; value: number | number[] };
const reserved = new Set(['uResolution', 'uCssResolution', 'uTime', 'uDelta', 'uFrame', 'constructor', 'prototype', '__proto__']);
const owners = new WeakSet<HTMLCanvasElement>();
const fail = (message: string): never => { throw new TypeError(`Invalid glass shader backdrop: ${message}`); };
function object(input: unknown, allowed?: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![null, Object.prototype].includes(Object.getPrototypeOf(input))) return fail('use ordinary objects');
  const output: Record<string, unknown> = Object.create(null);
  const keys = Reflect.ownKeys(input); if (keys.length > (allowed?.length ?? 16)) return fail('bounded object required');
  for (const key of keys) { if (typeof key !== 'string' || (allowed && !allowed.includes(key))) return fail('unknown option'); const prop = Object.getOwnPropertyDescriptor(input, key)!; if (!('value' in prop) || !prop.enumerable) return fail('accessors are not accepted'); output[key] = prop.value; }
  return output;
}
function text(value: unknown, maximum: number, name: string) { if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return fail(`${name} must be nonempty bounded text`); return value; }
function provenance(value: unknown) { const props = object(value, ['author', 'license']); return Object.freeze({ author: text(props.author, 160, 'author'), license: text(props.license, 240, 'license') }); }
function number(value: unknown, fallback: number, minimum: number, maximum: number, integral = false) { if (value === undefined) return fallback; if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integral && !Number.isSafeInteger(value))) return fail('number outside bounds'); return value; }
function boolean(value: unknown, fallback: boolean) { if (value !== undefined && typeof value !== 'boolean') return fail('expected boolean'); return value === undefined ? fallback : value as boolean; }
function uniformValue(type: Uniform['type'], value: unknown): Uniform['value'] {
  if (type === 'float' || type === 'int') { if (typeof value !== 'number') return fail('numeric uniform required'); return number(value, NaN, -1_000_000, 1_000_000, type === 'int'); }
  const length = Number(type.slice(-1)); if (!Array.isArray(value) || value.length !== length) return fail('uniform vector length');
  const result: number[] = [];
  for (let index = 0; index < length; index++) { const descriptor = Object.getOwnPropertyDescriptor(value, String(index)); if (!descriptor || !('value' in descriptor)) return fail('uniform vector accessors/sparse slots'); result.push(number(descriptor.value, NaN, -1_000_000, 1_000_000)); }
  if (!result.every(Number.isFinite)) return fail('finite uniform components required'); return result;
}
const vertex = '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';

/**
 * Independent trusted-host, single-pass procedural canvas. No Shadertoy shaders,
 * channels, sound, API, eval, fetch, DOM capture or runtime dependency. Source and
 * pixel limits do not certify GPU instruction cost or protect against watchdogs.
 * Host owns source rights and visible fallback siblings; no DOM is hidden here.
 *
 * Fragment defines `vec4 glassBackdrop(vec2 pixel)`. Pixels and uResolution use
 * bottom-left backing-pixel coordinates; uCssResolution uses CSS pixels. uTime
 * is active playback seconds, uDelta is capped at .1 seconds, uFrame counts draw
 * submissions. Quiet policy zeros these animation uniforms; diagnostics still
 * count actual submissions. No pointer state is fabricated; use a custom uniform.
 * Default is static; initial observer/resize settling can submit additional still
 * frames without advancing the clock. play() explicitly starts it. Hidden/offscreen,
 * motion/solid policy, context loss or disabling stops it; return never replays.
 * Static resizing/parameter updates draw at the same time. Context restoration
 * rebuilds once and stays paused. Give this controller its own canvas/context;
 * don't attach another renderer to it. Sources are at most 32,768 code units.
 * Diagnostics are bounded plain text; successful warnings are retained.
 */
export function attachGlassShaderBackdrop(canvas: HTMLCanvasElement, initial: GlassShaderBackdropOptions) {
  const props = object(initial, ['fragment', 'provenance', 'uniforms', 'maxDpr', 'maxPixels', 'maxDimension', 'play', 'enabled', 'reducedMotion', 'reducedTransparency', 'onStatus']);
  let fragment = text(props.fragment, 32_768, 'fragment'), rights = provenance(props.provenance);
  const maxDpr = number(props.maxDpr, 1.5, .25, 2), maxPixels = number(props.maxPixels, 1_048_576, 4096, 4_194_304, true), maxDimension = number(props.maxDimension, 2048, 64, 4096, true);
  const motion = boolean(props.reducedMotion, false), transparency = boolean(props.reducedTransparency, false), initialPlay = boolean(props.play, false);
  let enabled = boolean(props.enabled, true);
  if (props.onStatus !== undefined && typeof props.onStatus !== 'function') fail('onStatus must be a function');
  const onStatus = props.onStatus as GlassShaderBackdropOptions['onStatus'];
  const uniforms = new Map<string, Uniform>(), declared = object(props.uniforms ?? {});
  if (Object.keys(declared).length > 16) fail('at most 16 uniforms');
  for (const [name, value] of Object.entries(declared)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) || name.startsWith('gl_') || reserved.has(name)) fail('safe nonreserved uniform name required');
    const entry = object(value, ['type', 'value']); if (!['float', 'int', 'vec2', 'vec3', 'vec4'].includes(entry.type as string)) fail('unsupported uniform type');
    const type = entry.type as Uniform['type'], valueCopy = uniformValue(type, entry.value); if (typeof valueCopy === 'number' && !Number.isFinite(valueCopy)) fail('finite uniform required'); uniforms.set(name, { type, value: valueCopy });
  }
  const doc = canvas?.ownerDocument, browser = doc?.defaultView;
  if (!browser || canvas.localName !== 'canvas' || canvas.namespaceURI !== 'http://www.w3.org/1999/xhtml') fail('browser canvas required');
  if (owners.has(canvas)) fail('one controller per canvas');
  const view = browser!;
  const original = { width: canvas.getAttribute('width'), height: canvas.getAttribute('height') }; let ownedWidth: string | null = null, ownedHeight: string | null = null;
  let gl: WebGL2RenderingContext | null = null; try { gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false }); } catch { /* safe unsupported controller */ }
  const context = gl;
  let status: GlassShaderBackdropState['status'] = context ? 'error' : 'unsupported', cause: GlassShaderBackdropState['reason'] = context ? 'compile' : 'webgl';
  let diagnostics = '', playing = false, destroyed = false, inViewport = true, time = 0, submittedFrames = 0, width = 0, height = 0, hardwareCap = 4096;
  const initialBounds = canvas.getBoundingClientRect();
  const initialStyle = view.getComputedStyle(canvas);
  let styleVisible = initialStyle.display !== 'none' && !['hidden', 'collapse'].includes(initialStyle.visibility);
  let hasArea = Number.isFinite(initialBounds.width) && Number.isFinite(initialBounds.height) && initialBounds.width > 0 && initialBounds.height > 0, notifying = false;
  let frame: number | null = null, lastTimestamp: number | null = null, program: WebGLProgram | null = null, vao: WebGLVertexArrayObject | null = null;
  let locations: Record<string, WebGLUniformLocation | null> = Object.create(null), validateDraw = true;
  const media = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(forced-colors: active)'].map(query => view.matchMedia?.(query));
  const quiet = () => motion || Boolean(media[0]?.matches);
  const solid = () => transparency || media.slice(1).some(query => query?.matches);
  // aria-hidden only excludes this decorative canvas from the accessibility
  // tree. It is not a visual visibility or playback policy.
  const inDocument = () => !destroyed && canvas.isConnected && !doc.hidden && inViewport && !canvas.closest('[hidden],[inert]');
  const visible = () => inDocument() && hasArea && styleVisible;
  function geometry() { const bounds = canvas.getBoundingClientRect(), style = view.getComputedStyle(canvas); hasArea = Number.isFinite(bounds.width) && Number.isFinite(bounds.height) && bounds.width > 0 && bounds.height > 0; styleVisible = style.display !== 'none' && !['hidden', 'collapse'].includes(style.visibility); return bounds; }
  const snapshot = () => Object.freeze({ status, playing, visible: visible(), enabled, reason: cause, submittedFrames, width, height, pixels: width * height, time: quiet() ? 0 : time, diagnostics, provenance: rights });
  let previous: Readonly<GlassShaderBackdropState> | undefined;
  function emit() { const state = snapshot(); if (previous && Object.keys(state).every(key => state[key as keyof GlassShaderBackdropState] === previous![key as keyof GlassShaderBackdropState])) return; previous = state; if (notifying) return; notifying = true; try { onStatus?.(state); } catch { canvas.dispatchEvent(new view.CustomEvent('lg-shader-backdrop-error', { detail: 'Host status callback failed' })); } finally { notifying = false; } }
  function stop(reason: GlassShaderBackdropState['reason'] = 'paused') { if (frame !== null) view.cancelAnimationFrame(frame); frame = null; lastTimestamp = null; playing = false; if (status === 'ready') cause = reason; }
  function gate(): GlassShaderBackdropState['reason'] { if (!enabled) return 'disabled'; if (doc.hidden) return 'hidden'; if (!visible()) return 'offscreen'; if (quiet()) return 'motion'; if (solid()) return 'transparency'; return 'none'; }
  function release() { if (context && program) context.deleteProgram(program); if (context && vao) context.deleteVertexArray(vao); program = null; vao = null; locations = Object.create(null); width = height = 0; }
  function compile(source: string): { program: WebGLProgram; locations: Record<string, WebGLUniformLocation | null>; diagnostics: string } | null {
    if (!context) return null;
    const shaders: WebGLShader[] = []; let candidate: WebGLProgram | null = null; const logs: string[] = [];
    try {
      const declarations = [...uniforms].map(([name, uniform]) => `uniform ${uniform.type} ${name};`).join('\n');
      const assembled = `#version 300 es\nprecision highp float;\nprecision highp int;\nout vec4 glassOutput;\nuniform vec2 uResolution;\nuniform vec2 uCssResolution;\nuniform float uTime;\nuniform float uDelta;\nuniform int uFrame;\n${declarations}\n${source}\nvoid main(){glassOutput=glassBackdrop(gl_FragCoord.xy);}`;
      for (const [type, code] of [[context.VERTEX_SHADER, vertex], [context.FRAGMENT_SHADER, assembled]] as const) {
        const shader = context.createShader(type); if (!shader) throw new Error('Shader allocation failed'); shaders.push(shader); context.shaderSource(shader, code); context.compileShader(shader);
        const log = context.getShaderInfoLog(shader); if (log) logs.push(log.slice(0, 1200));
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) { cause = 'compile'; diagnostics = logs.join('\n').slice(0, 2400) || 'Shader compilation failed'; return null; }
      }
      candidate = context.createProgram(); if (!candidate) throw new Error('Program allocation failed'); shaders.forEach(shader => context.attachShader(candidate!, shader)); context.linkProgram(candidate);
      const log = context.getProgramInfoLog(candidate); if (log) logs.push(log.slice(0, 1200));
      if (!context.getProgramParameter(candidate, context.LINK_STATUS)) { cause = 'link'; diagnostics = logs.join('\n').slice(0, 2400) || 'Shader link failed'; context.deleteProgram(candidate); candidate = null; return null; }
      const cached: Record<string, WebGLUniformLocation | null> = Object.create(null);
      for (const name of ['uResolution', 'uCssResolution', 'uTime', 'uDelta', 'uFrame', ...uniforms.keys()]) cached[name] = context.getUniformLocation(candidate, name);
      return { program: candidate, locations: cached, diagnostics: logs.join('\n').slice(0, 2400) };
    } catch { if (candidate) context.deleteProgram(candidate); diagnostics = logs.join('\n').slice(0, 2400) || 'Shader setup unavailable'; return null; }
    finally { shaders.forEach(shader => context.deleteShader(shader)); }
  }
  function allocateResources() {
    if (!context) return false;
    try { vao = context.createVertexArray(); const limit = context.getParameter(context.MAX_TEXTURE_SIZE); if (!vao || typeof limit !== 'number' || !Number.isFinite(limit) || limit < 1) throw new Error(); hardwareCap = Math.min(4096, Math.floor(limit)); return true; }
    catch { release(); status = 'error'; cause = 'webgl'; diagnostics = 'Backdrop resources unavailable'; return false; }
  }
  function initialize() {
    if (!context) return false;
    const built = compile(fragment); if (!built) { status = 'error'; return false; }
    program = built.program; locations = built.locations; diagnostics = built.diagnostics;
    if (!allocateResources()) return false;
    status = 'ready'; cause = 'paused'; validateDraw = true; return true;
  }
  function draw(delta = 0) {
    if (!context || !program || !vao || status !== 'ready' || destroyed || !inDocument() || !enabled || solid()) return false;
    const bounds = geometry();
    if (!hasArea || !styleVisible) { stop('offscreen'); emit(); return false; }
    const dpr = Math.min(maxDpr, Number.isFinite(view.devicePixelRatio) ? Math.max(.25, view.devicePixelRatio) : 1, Math.sqrt(maxPixels / (bounds.width * bounds.height)), Math.min(maxDimension, hardwareCap) / Math.max(bounds.width, bounds.height));
    width = Math.max(1, Math.floor(bounds.width * dpr)); height = Math.max(1, Math.floor(bounds.height * dpr));
    try {
      if (canvas.width !== width) canvas.width = width; if (canvas.height !== height) canvas.height = height; ownedWidth = canvas.getAttribute('width'); ownedHeight = canvas.getAttribute('height');
      context.viewport(0, 0, width, height); context.bindVertexArray(vao); context.useProgram(program);
      context.uniform2f(locations.uResolution, width, height); context.uniform2f(locations.uCssResolution, bounds.width, bounds.height);
      context.uniform1f(locations.uTime, quiet() ? 0 : time); context.uniform1f(locations.uDelta, quiet() ? 0 : delta); context.uniform1i(locations.uFrame, quiet() ? 0 : submittedFrames % 2_147_483_647);
      for (const [name, uniform] of uniforms) { const location = locations[name]; if (uniform.type === 'float') context.uniform1f(location, uniform.value as number); else if (uniform.type === 'int') context.uniform1i(location, uniform.value as number); else if (uniform.type === 'vec2') context.uniform2fv(location, uniform.value as number[]); else if (uniform.type === 'vec3') context.uniform3fv(location, uniform.value as number[]); else context.uniform4fv(location, uniform.value as number[]); }
      context.disable(context.BLEND); context.drawArrays(context.TRIANGLES, 0, 3); context.bindVertexArray(null);
      submittedFrames = Math.min(Number.MAX_SAFE_INTEGER, submittedFrames + 1);
      if (validateDraw) { validateDraw = false; if (context.getError() !== context.NO_ERROR) throw new Error(); }
      emit(); return true;
    } catch { status = 'error'; cause = 'draw'; diagnostics = 'Backdrop draw unavailable'; stop(); release(); emit(); return false; }
  }
  function tick(timestamp: number) { frame = null; const reason = gate(); if (!playing || status !== 'ready' || reason !== 'none') { stop(reason); emit(); return; } const delta = lastTimestamp === null ? 0 : Math.max(0, Math.min(.1, (timestamp - lastTimestamp) / 1000)); lastTimestamp = timestamp; time = Math.min(1_000_000, time + delta); draw(delta); if (playing && status === 'ready') frame = view.requestAnimationFrame(tick); }
  function play() { if (destroyed || status !== 'ready') return false; geometry(); const reason = gate(); if (reason !== 'none') { stop(reason); emit(); return false; } if (!playing) { playing = true; cause = 'none'; lastTimestamp = null; frame = view.requestAnimationFrame(tick); } emit(); return true; }
  function refresh() { if (destroyed) return; geometry(); const reason = gate(); if (reason !== 'none') stop(reason); else if (!playing && status === 'ready') cause = 'paused'; draw(); emit(); }
  const Intersection = (view as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  const intersection = context && Intersection ? new Intersection(entries => { const entry = entries.find(entry => entry.target === canvas); if (entry) { inViewport = entry.isIntersecting; refresh(); } }) : undefined;
  const Resize = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const resize = context && Resize ? new Resize(refresh) : undefined;
  const lost = (event: Event) => { event.preventDefault(); stop(); status = 'context-lost'; cause = 'context'; release(); emit(); };
  const restored = () => { if (destroyed || !context || status !== 'context-lost') return; stop(); if (initialize()) refresh(); emit(); };
  const unlisten = context ? listen([[canvas, 'webglcontextlost', lost], [canvas, 'webglcontextrestored', restored], [doc, 'visibilitychange', refresh], [view, 'resize', refresh], ...media.flatMap(query => query ? [[query, 'change', refresh] as const] : [])]) : () => {};
  owners.add(canvas); if (initialize()) { draw(); if (initialPlay) play(); } intersection?.observe(canvas); resize?.observe(canvas); emit();
  return {
    get supported() { return status === 'ready' && !destroyed; }, get state() { return snapshot(); },
    render(timeSeconds?: number) { if (destroyed) return false; if (timeSeconds !== undefined) time = number(timeSeconds, time, 0, 1_000_000); lastTimestamp = null; return draw(); },
    updateUniforms(values: Readonly<Record<string, number | readonly number[]>>) { if (destroyed) return; const patch = object(values); const validated = new Map<string, Uniform['value']>(); for (const [name, value] of Object.entries(patch)) { const uniform = uniforms.get(name); if (!uniform) return fail('unknown declared uniform'); validated.set(name, uniformValue(uniform.type, value)); } let changed = false; for (const [name, value] of validated) { const current = uniforms.get(name)!; if (typeof value === 'number' ? current.value !== value : !Array.isArray(current.value) || value.some((component, index) => (current.value as number[])[index] !== component)) { current.value = value; changed = true; } } if (changed) draw(); },
    replaceFragment(source: string, declaration: GlassShaderProvenance) { if (destroyed || !context || status === 'context-lost') return false; const candidateSource = text(source, 32_768, 'fragment'), candidateRights = provenance(declaration), oldCause = cause; const built = compile(candidateSource); if (!built) { if (program) { status = 'ready'; cause = oldCause; } else status = 'error'; emit(); return false; } if (program) context.deleteProgram(program); program = built.program; locations = built.locations; fragment = candidateSource; rights = candidateRights; diagnostics = built.diagnostics; validateDraw = true; if (!vao && !allocateResources()) { emit(); return false; } status = 'ready'; cause = playing ? 'none' : 'paused'; draw(); emit(); return status === 'ready'; },
    pause() { if (!destroyed) { stop(); emit(); } }, play,
    setEnabled(value: boolean) { if (destroyed) return; enabled = boolean(value, true); if (!enabled) stop('disabled'); else { cause = 'paused'; refresh(); } emit(); },
    destroy() { if (destroyed) return; destroyed = true; stop(); unlisten(); intersection?.disconnect(); resize?.disconnect(); release(); owners.delete(canvas); for (const [name, authored, owned] of [['width', original.width, ownedWidth], ['height', original.height, ownedHeight]] as const) if (owned !== null && canvas.getAttribute(name) === owned) { if (authored === null) canvas.removeAttribute(name); else canvas.setAttribute(name, authored); } status = 'destroyed'; cause = 'none'; emit(); },
  };
}
