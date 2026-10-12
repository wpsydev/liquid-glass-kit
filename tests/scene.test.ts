import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachGlassScene } from '../src/scene.js';
import * as shaderSources from '../src/scene-shaders.js';
import type { GlassSceneBackdropDriver, GlassSceneOptions } from '../src/scene.js';

const scenes: Array<{ destroy(): void }> = [];
afterEach(() => {
  scenes.forEach(scene => scene.destroy()); scenes.length = 0;
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('optional backing-pixel-aware optics quality lifecycle', () => {
  const settings = (surface: HTMLElement, edgeQuality?: 'legacy' | 'pixel'): GlassSceneOptions => ({
    paused: true, edgeQuality, surfaces: [{ element: surface }], field: { count: 12 },
    fusion: { drops: [{ x: 130, y: 90, radius: 30 }, { x: 170, y: 90, radius: 30 }] }, caustics: {},
  });
  const sources = (gl: ReturnType<typeof gpu>, kind: number) => gl.shaderSource.mock.calls.map((call, index) => ({ source: call[1], kind: gl.createShader.mock.calls[index]?.[0] })).filter(item => item.kind === kind).map(item => item.source);

  it('uses byte-identical legacy optics shaders by default without preparing optional variants', () => {
    clock(); preferences(); const f = fixture();
    const optional = vi.spyOn(shaderSources, 'scenePixelEdgeSources');
    const scene = track(attachGlassScene(f.canvas, settings(f.surface)));
    expect(scene.stats).toMatchObject({ requestedEdgeQuality: 'legacy', edgeQuality: 'legacy', edgeQualityFallback: false });
    expect(optional).not.toHaveBeenCalled();
    const fragments = sources(f.gl, f.gl.FRAGMENT_SHADER);
    expect(fragments).toContain(shaderSources.fusionFragmentSource); expect(fragments).toContain(shaderSources.lensFragmentSource); expect(fragments).toContain(shaderSources.fieldFragmentSource);
    expect(fragments.every(source => !source.includes('fwidth('))).toBe(true);
    expect(scene.stats).toMatchObject({ fieldCount: 12, fusionCount: 2, causticCount: 1, drawCalls: 6 });
  });

  it('selects all three pixel optics without changing independent receiver/caustic shaders or pass counts', () => {
    clock(); preferences(); const f = fixture(), scene = track(attachGlassScene(f.canvas, settings(f.surface, 'pixel')));
    const pixel = shaderSources.scenePixelEdgeSources(), fragments = sources(f.gl, f.gl.FRAGMENT_SHADER);
    expect(fragments).toContain(pixel.fusionFragment); expect(fragments).toContain(pixel.lensFragment); expect(fragments).toContain(pixel.fieldFragment);
    expect(fragments.filter(source => source.includes('fwidth(d)'))).toHaveLength(3);
    expect(fragments).toContain(shaderSources.wallpaperSource); expect(fragments).toContain(shaderSources.fragmentSource);
    expect(scene.stats).toMatchObject({ requestedEdgeQuality: 'pixel', edgeQuality: 'pixel', edgeQualityFallback: false, fieldCount: 12, fusionCount: 2, causticCount: 1, drawCalls: 6 });
    expect(f.gl.texStorage2D).toHaveBeenCalledTimes(2); // existing wallpaper + caustic textures only
  });

  it('switches only optics resources, retaining backing textures, receiver programs and caustic buffers', () => {
    const time = clock(); preferences(); const f = fixture(), scene = track(attachGlassScene(f.canvas, settings(f.surface)));
    const create = f.gl.createProgram.mock.calls.length, textures = f.gl.createTexture.mock.calls.length;
    const vertexArrays = f.gl.createVertexArray.mock.calls.length, framebuffers = f.gl.createFramebuffer.mock.calls.length, buffers = f.gl.createBuffer.mock.calls.length;
    scene.update(settings(f.surface, 'pixel'));
    expect(f.gl.deleteProgram).toHaveBeenCalledTimes(3); expect(f.gl.createProgram).toHaveBeenCalledTimes(create + 3);
    expect(f.gl.createTexture).toHaveBeenCalledTimes(textures); expect(f.gl.deleteTexture).not.toHaveBeenCalled();
    expect(f.gl.createVertexArray).toHaveBeenCalledTimes(vertexArrays); expect(f.gl.createFramebuffer).toHaveBeenCalledTimes(framebuffers); expect(f.gl.createBuffer).toHaveBeenCalledTimes(buffers);
    const compiled = f.gl.compileShader.mock.calls.length, queried = f.gl.getProgramParameter.mock.calls.length;
    for (let index = 0; index < 8; index++) scene.render(index);
    scene.update(settings(f.surface, 'pixel'));
    expect(f.gl.compileShader).toHaveBeenCalledTimes(compiled); expect(f.gl.getProgramParameter).toHaveBeenCalledTimes(queried);
    expect(time.frames.size).toBe(0);
    scene.update(settings(f.surface)); // existing replace-options semantics
    expect(scene.stats.edgeQuality).toBe('legacy'); expect(f.gl.deleteProgram).toHaveBeenCalledTimes(6); expect(f.gl.createProgram).toHaveBeenCalledTimes(create + 6);
    scene.destroy(); expect(f.gl.deleteProgram).toHaveBeenCalledTimes(create + 6);
  });

  it('does not compile an optional optics variant when no decorative geometry is present', () => {
    clock(); preferences(); const f = fixture(), optional = vi.spyOn(shaderSources, 'scenePixelEdgeSources');
    const scene = track(attachGlassScene(f.canvas, { paused: true, edgeQuality: 'pixel' }));
    expect(optional).not.toHaveBeenCalled(); expect(f.gl.createProgram).toHaveBeenCalledTimes(2);
    expect(scene.stats).toMatchObject({ requestedEdgeQuality: 'pixel', edgeQuality: 'pixel', drawCalls: 2 });
    scene.update({ paused: true, edgeQuality: 'pixel', field: { count: 1 } });
    expect(optional).toHaveBeenCalledOnce(); expect(f.gl.createProgram).toHaveBeenCalledTimes(3);
  });

  it('restarts the complete needed optics group in legacy when a later optional pixel program fails', () => {
    clock(); preferences(); const f = fixture();
    // Wallpaper, copy, pixel fusion succeed; pixel lens fails before field is built.
    f.gl.getProgramParameter.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false);
    const scene = track(attachGlassScene(f.canvas, settings(f.surface, 'pixel')));
    expect(scene.supported).toBe(true); expect(scene.stats).toMatchObject({ requestedEdgeQuality: 'pixel', edgeQuality: 'legacy', edgeQualityFallback: true, drawCalls: 6 });
    expect(f.gl.deleteProgram).toHaveBeenCalledTimes(2); // rejected pixel lens + previously accepted pixel fusion
    const fragments = sources(f.gl, f.gl.FRAGMENT_SHADER);
    expect(fragments).toContain(shaderSources.fusionFragmentSource); expect(fragments).toContain(shaderSources.lensFragmentSource); expect(fragments).toContain(shaderSources.fieldFragmentSource);
    const programs = f.gl.createProgram.mock.calls.length, queries = f.gl.getProgramParameter.mock.calls.length;
    for (let index = 0; index < 10; index++) scene.render(index);
    scene.update(settings(f.surface, 'pixel'));
    expect(f.gl.createProgram).toHaveBeenCalledTimes(programs); expect(f.gl.getProgramParameter).toHaveBeenCalledTimes(queries);
    scene.update(settings(f.surface, 'legacy')); scene.update(settings(f.surface, 'pixel'));
    expect(scene.stats).toMatchObject({ edgeQuality: 'pixel', edgeQualityFallback: false });
  });

  it('fails safely when both optional and legacy optics are unavailable', () => {
    const time = clock(); preferences(); const f = fixture();
    f.gl.getProgramParameter.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValue(false);
    const scene = track(attachGlassScene(f.canvas, settings(f.surface, 'pixel')));
    expect(scene.supported).toBe(false); expect(scene.stats).toMatchObject({ requestedEdgeQuality: 'pixel', edgeQuality: 'legacy', drawCalls: 0 });
    expect(time.frames.size).toBe(0); expect(f.gl.deleteTexture).toHaveBeenCalledOnce();
    const created = f.gl.createProgram.mock.calls.length; scene.render(); expect(f.gl.createProgram).toHaveBeenCalledTimes(created);
  });

  it('retains the trusted owned-backdrop resource through quality switches and link fallback', () => {
    clock(); preferences(); const f = fixture(), release = vi.fn(), bind = vi.fn(() => true);
    const driver: GlassSceneBackdropDriver = { fragmentSource: shaderSources.wallpaperSource, uniforms: [], bind, release };
    const scene = track(attachGlassScene(f.canvas, settings(f.surface), driver));
    const released = release.mock.calls.length, textures = f.gl.createTexture.mock.calls.length;
    f.gl.getProgramParameter.mockReturnValueOnce(false);
    scene.update(settings(f.surface, 'pixel'));
    expect(scene.supported).toBe(true); expect(scene.stats.edgeQualityFallback).toBe(true);
    expect(release).toHaveBeenCalledTimes(released); expect(f.gl.createTexture).toHaveBeenCalledTimes(textures); expect(bind.mock.calls.length).toBeGreaterThan(1);
    scene.destroy(); expect(release).toHaveBeenCalledTimes(released + 1);
  });

  it('retries requested pixel quality after context restoration with bounded fresh resources', () => {
    const time = clock(); preferences(); const f = fixture();
    f.gl.getProgramParameter.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false);
    const scene = track(attachGlassScene(f.canvas, settings(f.surface, 'pixel')));
    expect(scene.stats.edgeQualityFallback).toBe(true);
    f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(scene.supported).toBe(false); expect(scene.stats.edgeQuality).toBe('legacy'); expect(time.frames.size).toBe(0);
    f.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(scene.supported).toBe(true); expect(scene.stats).toMatchObject({ requestedEdgeQuality: 'pixel', edgeQuality: 'pixel', edgeQualityFallback: false, fieldCount: 12, fusionCount: 2 });
    const programs = f.gl.createProgram.mock.calls.length; scene.render(); expect(f.gl.createProgram).toHaveBeenCalledTimes(programs);
    scene.destroy(); expect(f.gl.deleteProgram).toHaveBeenCalledTimes(programs);
  });

  it('keeps pixel cap/anisotropic scales authoritative and honors solid/reduced motion policy', () => {
    const time = clock(), prefs = preferences(), f = fixture();
    vi.spyOn(f.canvas, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 1800.25, height: 900.8 } as DOMRect);
    const scene = track(attachGlassScene(f.canvas, { ...settings(f.surface, 'pixel'), maxPixels: 65536, reducedMotion: true, reducedTransparency: true }));
    expect(scene.stats.pixels).toBeLessThanOrEqual(65536); expect(scene.stats.dpr).toBeLessThan(1); expect(time.frames.size).toBe(0);
    expect(intUniform(f.gl, 'uSolid')).toBe(1); expect(floatUniform(f.gl, 'uTime')).toBe(0);
    const dpr = f.gl.uniform2f.mock.calls.filter(call => (call[0] as { name: string }).name === 'uDpr').at(-1)!.slice(1);
    expect(dpr).toEqual([f.canvas.width / 1800.25, f.canvas.height / 900.8]);
    scene.render(20); expect(floatUniform(f.gl, 'uTime')).toBe(0);
    prefs.set('(prefers-reduced-motion: reduce)', true); scene.update({ ...settings(f.surface, 'pixel'), paused: false }); expect(time.frames.size).toBe(0);
    expect(scene.stats.edgeQuality).toBe('pixel'); // coverage policy does not override reductions
  });

  it('reports unsupported/noop requests without pretending pixel optics rendered', () => {
    const time = clock(), canvas = document.createElement('canvas'); document.body.append(canvas);
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    const scene = track(attachGlassScene(canvas, { edgeQuality: 'pixel' }));
    expect(scene.supported).toBe(false); expect(scene.stats).toMatchObject({ requestedEdgeQuality: 'pixel', edgeQuality: 'legacy', edgeQualityFallback: false, drawCalls: 0 });
    expect(time.frames.size).toBe(0);
  });

  it('normalizes untyped invalid values to legacy and returns isolated diagnostics', () => {
    clock(); preferences(); const f = fixture(), scene = track(attachGlassScene(f.canvas, { ...settings(f.surface), edgeQuality: 'automatic' as 'pixel' }));
    expect(scene.stats.requestedEdgeQuality).toBe('legacy');
    const snapshot = scene.stats; (snapshot as { edgeQuality: string }).edgeQuality = 'pixel';
    expect(scene.stats.edgeQuality).toBe('legacy');
  });
});

function clock() {
  let now = 0, next = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    const id = next++; frames.set(id, callback); return id;
  });
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  return {
    frames, cancel,
    step(milliseconds = 16) {
      now += milliseconds; const pending = [...frames.values()]; frames.clear();
      pending.forEach(callback => callback(now));
    },
  };
}

function preferences() {
  const values = new Map<string, boolean>();
  const listeners = new Map<string, Set<() => void>>();
  const remove = vi.fn((query: string, listener: () => void) => listeners.get(query)?.delete(listener));
  vi.stubGlobal('matchMedia', (query: string) => {
    const callbacks = listeners.get(query) ?? new Set<() => void>(); listeners.set(query, callbacks);
    return {
      media: query, get matches() { return values.get(query) ?? false; }, onchange: null,
      addEventListener: (_type: string, listener: () => void) => { callbacks.add(listener); },
      removeEventListener: (_type: string, listener: () => void) => { remove(query, listener); },
      addListener: (listener: () => void) => { callbacks.add(listener); },
      removeListener: (listener: () => void) => { remove(query, listener); }, dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  });
  return {
    listeners, remove,
    set(query: string, value: boolean) { values.set(query, value); listeners.get(query)?.forEach(callback => callback()); },
  };
}

// This mock verifies controller calls and resource ownership; it does not compile
// GLSL or render pixels. The real shader must also be verified in a live browser.
function gpu() {
  const gl = {
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COMPILE_STATUS: 35713, LINK_STATUS: 35714,
    TEXTURE_2D: 3553, TEXTURE0: 33984, RGBA8: 32856, FRAMEBUFFER: 36160, COLOR_ATTACHMENT0: 36064,
    FRAMEBUFFER_COMPLETE: 36053, TEXTURE_MIN_FILTER: 10241, TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242, TEXTURE_WRAP_T: 10243, LINEAR: 9729, CLAMP_TO_EDGE: 33071,
    ARRAY_BUFFER:34962, FLOAT:5126, enableVertexAttribArray:vi.fn(), vertexAttribPointer:vi.fn(), TEXTURE1: 33985, ELEMENT_ARRAY_BUFFER: 34963, STATIC_DRAW: 35044, UNSIGNED_SHORT: 5123,
    createBuffer: vi.fn(() => ({})), deleteBuffer: vi.fn(), bindBuffer: vi.fn(), bufferData: vi.fn(), drawElementsInstanced: vi.fn(),
    SRC_ALPHA: 770, ONE_MINUS_SRC_ALPHA: 771, ONE: 1, ZERO: 0,
    createTexture: vi.fn(() => ({})), deleteTexture: vi.fn(), bindTexture: vi.fn(), activeTexture: vi.fn(),
    texStorage2D: vi.fn(), texParameteri: vi.fn(),
    createFramebuffer: vi.fn(() => ({})), deleteFramebuffer: vi.fn(), bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(), checkFramebufferStatus: vi.fn(() => 36053),
    enable: vi.fn(), blendFunc: vi.fn(), blendFuncSeparate: vi.fn(), drawArraysInstanced: vi.fn(),
    TRIANGLES: 4, COLOR_BUFFER_BIT: 16384, BLEND: 3042, DEPTH_TEST: 2929, NO_ERROR: 0,
    createShader: vi.fn((_kind: number) => ({})), shaderSource: vi.fn(), compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true), getShaderInfoLog: vi.fn(() => ''), deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})), attachShader: vi.fn(), linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true), getProgramInfoLog: vi.fn(() => ''), deleteProgram: vi.fn(),
    createVertexArray: vi.fn(() => ({})), bindVertexArray: vi.fn(), deleteVertexArray: vi.fn(),
    getUniformLocation: vi.fn((_program: unknown, name: string) => ({ name })),
    uniform1f: vi.fn(), uniform1i: vi.fn(), uniform2f: vi.fn(), uniform3f: vi.fn(), uniform4f: vi.fn(),
    uniform1fv: vi.fn(), uniform2fv: vi.fn(), uniform3fv: vi.fn(), uniform4fv: vi.fn(),
    useProgram: vi.fn(), viewport: vi.fn(), drawArrays: vi.fn(),
    clearColor: vi.fn(), clear: vi.fn(), disable: vi.fn(), flush: vi.fn(), isContextLost: vi.fn(() => false),
    getError: vi.fn(() => 0),
  };
  return gl;
}

function fixture() {
  const gl = gpu(); const canvas = document.createElement('canvas'); document.body.append(canvas);
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl as unknown as WebGL2RenderingContext);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 400, height: 300 } as DOMRect);
  const surface = document.createElement('button'); surface.textContent = 'Save'; document.body.append(surface);
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ left: 30, top: 40, width: 100, height: 60 } as DOMRect);
  return { gl, canvas, surface };
}

function track<T extends { destroy(): void }>(scene: T): T { scenes.push(scene); return scene; }
function intUniform(gl: ReturnType<typeof gpu>, name: string) {
  return gl.uniform1i.mock.calls.filter(call => (call[0] as { name: string }).name === name).at(-1)?.[1];
}
function floatUniform(gl: ReturnType<typeof gpu>, name: string) {
  return gl.uniform1f.mock.calls.filter(call => (call[0] as { name: string }).name === name).at(-1)?.[1];
}

describe('experimental owned-scene renderer lifecycle', () => {
  it('imports without browser globals', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { expect(typeof (await import('../src/scene.js')).attachGlassScene).toBe('function'); }
    finally { vi.unstubAllGlobals(); }
  });

  it.each(['missing', 'throws'] as const)('leaves the canvas unchanged when WebGL2 %s', kind => {
    const time = clock(); const canvas = document.createElement('canvas'); document.body.append(canvas);
    canvas.setAttribute('width', '123'); canvas.setAttribute('height', '77');
    const get = vi.spyOn(canvas, 'getContext');
    if (kind === 'missing') get.mockReturnValue(null); else get.mockImplementation(() => { throw new Error('GPU denied'); });
    const addCanvas = vi.spyOn(canvas, 'addEventListener'); const addDocument = vi.spyOn(document, 'addEventListener');
    const scene = track(attachGlassScene(canvas));
    expect(scene.supported).toBe(false); expect(time.frames.size).toBe(0);
    expect(canvas.getAttribute('width')).toBe('123'); expect(canvas.getAttribute('height')).toBe('77');
    expect(addCanvas).not.toHaveBeenCalled(); expect(addDocument).not.toHaveBeenCalled();
    expect(() => { scene.update({ paused: false }); scene.render(2); scene.destroy(); scene.destroy(); }).not.toThrow();
    expect(time.frames.size).toBe(0);
  });

  it('draws a static paused scene and schedules only while connected and active', () => {
    const time = clock(); preferences(); const { gl, canvas, surface } = fixture();
    const scene = track(attachGlassScene(canvas, { surfaces: [{ element: surface }], paused: true }));
    expect(scene.supported).toBe(true); expect(gl.drawArrays).toHaveBeenCalled(); expect(time.frames.size).toBe(0);
    const before = gl.drawArrays.mock.calls.length; scene.render(3); expect(gl.drawArrays.mock.calls.length).toBe(before + 2);
    expect(time.frames.size).toBe(0);
    scene.update({ surfaces: [{ element: surface }] }); expect(time.frames.size).toBe(1);
    time.step(); expect(time.frames.size).toBe(1);
    scene.update({ paused: true }); expect(time.frames.size).toBe(0);
    scene.update(); expect(time.frames.size).toBe(1);
    canvas.remove(); time.step(); expect(time.frames.size).toBe(0);
  });

  it('stops and resumes for system motion preferences and document visibility', () => {
    const time = clock(); const prefs = preferences(); const { canvas } = fixture();
    let hidden = false; vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    const scene = track(attachGlassScene(canvas)); expect(time.frames.size).toBe(1);
    prefs.set('(prefers-reduced-motion: reduce)', true); expect(time.frames.size).toBe(0);
    scene.update({ reducedMotion: false }); expect(time.frames.size).toBe(0);
    prefs.set('(prefers-reduced-motion: reduce)', false); expect(time.frames.size).toBe(1);
    hidden = true; document.dispatchEvent(new Event('visibilitychange')); expect(time.frames.size).toBe(0);
    hidden = false; document.dispatchEvent(new Event('visibilitychange')); expect(time.frames.size).toBe(1);
    scene.update({ reducedMotion: true }); expect(time.frames.size).toBe(0);
  });

  it('cancels RAF handle zero, releases resources, removes listeners, and restores dimensions exactly', () => {
    const time = clock(); const prefs = preferences(); const { gl, canvas } = fixture();
    canvas.setAttribute('width', '0123'); canvas.removeAttribute('height');
    const disconnect = vi.fn(); const observe = vi.fn();
    vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; });
    const removeCanvas = vi.spyOn(canvas, 'removeEventListener'); const removeDocument = vi.spyOn(document, 'removeEventListener');
    const scene = track(attachGlassScene(canvas)); expect(time.frames.has(0)).toBe(true);
    expect(observe).toHaveBeenCalledWith(canvas);
    disconnect.mockClear();
    scene.destroy(); const drawCount = gl.drawArrays.mock.calls.length;
    expect(time.cancel).toHaveBeenCalledWith(0); expect(time.frames.size).toBe(0);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(2); expect(gl.deleteVertexArray).toHaveBeenCalledOnce();
    expect(gl.deleteShader).toHaveBeenCalledTimes(4); expect(disconnect).toHaveBeenCalledOnce();
    expect(removeCanvas.mock.calls.map(call => call[0])).toContain('webglcontextlost');
    expect(removeCanvas.mock.calls.map(call => call[0])).toContain('webglcontextrestored');
    expect(removeDocument.mock.calls.map(call => call[0])).toContain('visibilitychange');
    expect([...prefs.listeners.values()].every(listeners => listeners.size === 0)).toBe(true);
    expect(canvas.getAttribute('width')).toBe('0123'); expect(canvas.hasAttribute('height')).toBe(false);
    scene.destroy(); scene.render(20); scene.update(); time.step();
    expect(gl.drawArrays).toHaveBeenCalledTimes(drawCount); expect(gl.deleteProgram).toHaveBeenCalledTimes(2);
    expect(time.frames.size).toBe(0);
  });

  it('stops on context loss and recreates resources after restoration', () => {
    const time = clock(); preferences(); const { gl, canvas } = fixture();
    const scene = track(attachGlassScene(canvas));
    expect(gl.getError).toHaveBeenCalledOnce();
    const lost = new Event('webglcontextlost', { cancelable: true }); canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true); expect(scene.supported).toBe(false); expect(time.frames.size).toBe(0);
    const drawCount = gl.drawArrays.mock.calls.length; scene.render(1); expect(gl.drawArrays).toHaveBeenCalledTimes(drawCount);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(scene.supported).toBe(true); expect(gl.createProgram).toHaveBeenCalledTimes(4);
    expect(gl.createVertexArray).toHaveBeenCalledTimes(2); expect(time.frames.size).toBe(1);
    expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(drawCount);
    expect(gl.getError).toHaveBeenCalledTimes(2);
  });

  it('disables a backend that links but fails its first draw and immediately releases GPU resources', () => {
    const time = clock(); preferences(); const { gl, canvas } = fixture();
    gl.getError.mockReturnValue(1282);
    const scene = track(attachGlassScene(canvas));
    expect(gl.getProgramParameter).toHaveReturnedWith(true);
    expect(gl.drawArrays).toHaveBeenCalledTimes(2); expect(gl.getError).toHaveBeenCalledOnce();
    expect(scene.supported).toBe(false); expect(time.frames.size).toBe(0);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(2); expect(gl.deleteVertexArray).toHaveBeenCalledOnce();
    expect(gl.deleteShader).toHaveBeenCalledTimes(4);
    scene.render(1); scene.update(); time.step();
    expect(gl.drawArrays).toHaveBeenCalledTimes(2); expect(time.frames.size).toBe(0);
    scene.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(2);
  });

  it('checks the backend once after initialization without querying errors every frame', () => {
    const time = clock(); preferences(); const { gl, canvas } = fixture();
    const scene = track(attachGlassScene(canvas)); expect(gl.getError).toHaveBeenCalledOnce();
    for (let i = 0; i < 10; i++) time.step();
    scene.render(2); scene.update({ paused: true }); scene.render(3);
    expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(10);
    expect(gl.getError).toHaveBeenCalledOnce(); expect(scene.supported).toBe(true);
  });

  it.each(['compile', 'link'] as const)('releases partially initialized GPU resources after %s failure', failure => {
    const time = clock(); preferences(); const { gl, canvas } = fixture();
    gl.getProgramParameter.mockReturnValue(false); // A failed shader also fails linking.
    const add = vi.spyOn(canvas, 'addEventListener'); const width = canvas.getAttribute('width');
    const scene = track(attachGlassScene(canvas));
    expect(scene.supported).toBe(false); expect(time.frames.size).toBe(0);
    expect(gl.deleteShader).toHaveBeenCalledTimes(2); expect(add).not.toHaveBeenCalled();
    expect(canvas.getAttribute('width')).toBe(width); expect(gl.drawArrays).not.toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalledOnce();
    scene.destroy(); expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  });

  it('bounds GPU inputs, replaces options, and aligns CSS geometry at fractional backing scales', () => {
    clock(); preferences(); const { gl, canvas, surface } = fixture();
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 400.25, height: 300.4 } as DOMRect);
    const scene = track(attachGlassScene(canvas, {
      paused: true, palette: 'ocean', maxDpr: 100,
      surfaces: [{ element: surface, radius: -10, refraction: 1000 }],
    }));
    expect(canvas.width).toBe(801); expect(canvas.height).toBe(601);
    const uniforms = gl.uniform2f.mock.calls;
    expect(uniforms.find(call => (call[0] as { name: string }).name === 'uResolution')?.slice(1)).toEqual([400.25, 300.4]);
    expect(uniforms.find(call => (call[0] as { name: string }).name === 'uDpr')?.slice(1)).toEqual([801 / 400.25, 601 / 300.4]);
    expect([...gl.uniform4fv.mock.calls.at(-1)![1] as Float32Array].slice(0, 4)).toEqual([70, 50, 50, 30]);
    expect([...gl.uniform2fv.mock.calls.at(-1)![1] as Float32Array].slice(0, 2)).toEqual([0, 80]);
    expect(intUniform(gl, 'uPalette')).toBe(2); expect(intUniform(gl, 'uCount')).toBe(1);
    scene.render(-3); expect(floatUniform(gl, 'uTime')).toBe(0);
    scene.render(7); scene.render(Infinity); expect(floatUniform(gl, 'uTime')).toBe(7);
    scene.update({ paused: true, maxDpr: -10, surfaces: [{ element: surface, radius: NaN, refraction: Infinity }] });
    expect(canvas.width).toBe(400); expect(canvas.height).toBe(300);
    expect([...gl.uniform2fv.mock.calls.at(-1)![1] as Float32Array].slice(0, 2)).toEqual([28, 22]);
    expect(intUniform(gl, 'uPalette')).toBe(0);
    scene.update({ paused: true }); expect(intUniform(gl, 'uCount')).toBe(0);
  });

  it('bounds stored surfaces and observers to eight mounted entries and leaves native controls unchanged', () => {
    clock(); preferences(); const { gl, canvas, surface } = fixture();
    const disconnected = document.createElement('button');
    const wrongDocument = document.implementation.createHTMLDocument().createElement('button');
    const zeroSize = document.createElement('div'); document.body.append(zeroSize);
    const candidates = Array.from({ length: 10 }, () => {
      const element = document.createElement('button'); document.body.append(element);
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ left: 30, top: 40, width: 100, height: 60 } as DOMRect);
      return { element };
    });
    surface.setAttribute('aria-label', 'Save project'); surface.className = 'existing'; surface.style.color = 'red';
    const clicked = vi.fn(); surface.addEventListener('click', clicked); surface.focus(); const before = surface.outerHTML;
    const observe = vi.fn(); vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect() {} });
    track(attachGlassScene(canvas, { paused: true, surfaces: [{ element: disconnected }, { element: wrongDocument }, { element: zeroSize }, { element: surface }, ...candidates] }));
    // A mounted zero-size surface keeps a reserved slot so it can become visible.
    expect(intUniform(gl, 'uCount')).toBe(7); expect(observe).toHaveBeenCalledTimes(9);
    expect(surface.outerHTML).toBe(before);
    expect(document.activeElement).toBe(surface); surface.click(); expect(clicked).toHaveBeenCalledOnce();
  });

  it('honors explicit and system solid-material preferences without altering host semantics', () => {
    clock(); const prefs = preferences(); const { gl, canvas, surface } = fixture();
    const scene = track(attachGlassScene(canvas, { paused: true, surfaces: [{ element: surface }] }));
    expect(intUniform(gl, 'uSolid')).toBe(0);
    scene.update({ paused: true, reducedTransparency: true }); expect(intUniform(gl, 'uSolid')).toBe(1);
    scene.update({ paused: true, reducedTransparency: false }); expect(intUniform(gl, 'uSolid')).toBe(0);
    for (const query of ['(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(forced-colors: active)']) {
      prefs.set(query, true); expect(intUniform(gl, 'uSolid')).toBe(1);
      scene.update({ paused: true, reducedTransparency: false }); expect(intUniform(gl, 'uSolid')).toBe(1);
      prefs.set(query, false); expect(intUniform(gl, 'uSolid')).toBe(0);
    }
    expect(surface.hidden).toBe(false); expect(surface.hasAttribute('aria-hidden')).toBe(false);
  });

  it('submits thousands of procedural instances in one draw without per-instance DOM work or texture uploads', () => {
    const time = clock(); preferences(); const { gl, canvas } = fixture();
    const bounds = vi.mocked(canvas.getBoundingClientRect);
    const scene = track(attachGlassScene(canvas, { paused: true, field: { count: 3000, size: 22, speed: 100, seed: 7 } }));
    expect(scene.supported).toBe(true);
    expect(gl.drawArraysInstanced).toHaveBeenLastCalledWith(gl.TRIANGLES, 0, 6, 3000);
    expect(scene.stats).toMatchObject({ fieldCount: 3000, drawCalls: 3, wallpaperPasses: 1, width: 400, height: 300, pixels: 120000 });
    expect(gl.createProgram).toHaveBeenCalledTimes(3);
    expect(gl.texStorage2D).toHaveBeenCalledOnce(); expect(gl.framebufferTexture2D).toHaveBeenCalledOnce();
    bounds.mockClear();
    for (let i = 0; i < 5; i++) scene.render(i);
    expect(bounds).toHaveBeenCalledTimes(5);
    expect(gl.texStorage2D).toHaveBeenCalledOnce(); expect(gl.checkFramebufferStatus).toHaveBeenCalledOnce();
    expect(gl.createProgram).toHaveBeenCalledTimes(3); expect(gl.getError).toHaveBeenCalledOnce();
    expect(time.frames.size).toBe(0);
    scene.update({ paused: true });
    expect(scene.stats.fieldCount).toBe(0); expect(scene.stats.drawCalls).toBe(2);
    expect(gl.drawArraysInstanced).toHaveBeenCalledTimes(6);
    scene.destroy();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(3); expect(gl.deleteTexture).toHaveBeenCalledOnce();
    expect(gl.deleteFramebuffer).toHaveBeenCalledOnce();
  });

  it('bounds field parameters, snapshots options, and preserves the optional explicit pixel budget', () => {
    clock(); preferences(); const { gl, canvas } = fixture();
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3);
    vi.mocked(canvas.getBoundingClientRect).mockReturnValue({ left: 0, top: 0, width: 400.25, height: 300.4 } as DOMRect);
    const field = { count: 99999, size: -2, speed: Infinity, seed: 99999, direction: 'up' as const, motion: 'orbit' as const };
    const scene = track(attachGlassScene(canvas, { paused: true, field, maxPixels: 100000 }));
    expect(scene.stats.pixels).toBeLessThanOrEqual(100000); expect(scene.stats.dpr).toBeLessThan(1);
    expect(gl.uniform4f.mock.calls.at(-1)?.slice(1)).toEqual([20000, 4, 60, 65535]);
    expect(intUniform(gl, 'uMotion')).toBe(2);
    const direction = gl.uniform2f.mock.calls.filter(call => (call[0] as { name: string }).name === 'uDirection').at(-1);
    expect(direction?.slice(1)).toEqual([0, -1]);
    field.count = 4; field.size = 40; scene.render(1);
    expect(scene.stats.fieldCount).toBe(20000); expect(gl.uniform4f.mock.calls.at(-1)?.slice(1)).toEqual([20000, 4, 60, 65535]);
    scene.update({ paused: true, field: { count: NaN, size: 999, speed: -1, seed: NaN }, maxPixels: NaN });
    expect(scene.stats.fieldCount).toBe(1000); expect(scene.stats.width).toBe(801);
    expect(gl.uniform4f.mock.calls.at(-1)?.slice(1)).toEqual([1000, 180, 0, 1]);
    const copiedStats = scene.stats as { fieldCount: number }; copiedStats.fieldCount = 1;
    expect(scene.stats.fieldCount).toBe(1000);
  });

  it('recreates texture storage only after backing dimensions change, including context restoration', () => {
    clock(); preferences(); const { gl, canvas } = fixture();
    const scene = track(attachGlassScene(canvas, { paused: true, field: { count: 3000 } }));
    scene.render(1); scene.render(2); expect(gl.texStorage2D).toHaveBeenCalledOnce();
    vi.mocked(canvas.getBoundingClientRect).mockReturnValue({ left: 0, top: 0, width: 500, height: 300 } as DOMRect);
    scene.render(3); expect(gl.texStorage2D).toHaveBeenCalledTimes(2); expect(gl.deleteTexture).toHaveBeenCalledOnce();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(scene.stats.fieldCount).toBe(0); expect(scene.supported).toBe(false);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(3); expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(scene.supported).toBe(true); expect(scene.stats.fieldCount).toBe(3000);
    expect(gl.texStorage2D).toHaveBeenCalledTimes(3); expect(gl.createProgram).toHaveBeenCalledTimes(6);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(3); // No stale-handle deletion after restoration.
    scene.destroy(); expect(gl.deleteTexture).toHaveBeenCalledTimes(3); expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(2);
  });

  it.each(['texture', 'framebuffer', 'incomplete', 'field'] as const)('cleans up after %s allocation failure', failure => {
    const time = clock(); preferences(); const { gl, canvas } = fixture();
    canvas.setAttribute('width', '0123'); canvas.removeAttribute('height');
    if (failure === 'texture') gl.createTexture.mockReturnValue(null as never);
    if (failure === 'framebuffer') gl.createFramebuffer.mockReturnValue(null as never);
    if (failure === 'incomplete') gl.checkFramebufferStatus.mockReturnValue(0);
    if (failure === 'field') gl.getProgramParameter.mockImplementationOnce(() => true).mockImplementationOnce(() => true).mockImplementationOnce(() => false);
    const scene = track(attachGlassScene(canvas, { field: { count: 3000 } }));
    expect(scene.supported).toBe(false); expect(scene.stats.drawCalls).toBe(0); expect(time.frames.size).toBe(0);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(failure === 'field' ? 3 : 2);
    expect(gl.deleteVertexArray).toHaveBeenCalledOnce();
    expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(failure === 'framebuffer' ? 0 : 1);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(failure === 'framebuffer' || failure === 'texture' ? 0 : 1);
    scene.destroy();
    expect(canvas.getAttribute('width')).toBe('0123'); expect(canvas.hasAttribute('height')).toBe(false);
  });


  it('batches ordered HTML lens geometry into one bounded instanced pass', () => {
    clock(); preferences(); const { gl, canvas } = fixture();
    const elements = Array.from({ length: 8 }, (_, index) => {
      const element = document.createElement('button'); document.body.append(element);
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ left: 20 + index * 12, top: 30, width: 100, height: 60 } as DOMRect);
      return element;
    });
    const scene = track(attachGlassScene(canvas, { paused: true, surfaces: elements.map(element => ({ element })) }));
    expect(gl.drawArraysInstanced).toHaveBeenLastCalledWith(gl.TRIANGLES, 0, 6, 8);
    expect(gl.blendFuncSeparate).toHaveBeenLastCalledWith(gl.ONE, gl.SRC_ALPHA, gl.ZERO, gl.ONE);
    expect(scene.stats).toMatchObject({ fieldCount: 0, drawCalls: 3 });
    const rects = gl.uniform4fv.mock.calls.at(-1)![1] as Float32Array;
    expect(Array.from({ length: 8 }, (_, index) => rects[index * 4])).toEqual([60, 72, 84, 96, 108, 120, 132, 144]);
    scene.update({ paused: true, surfaces: elements.map(element => ({ element })), field: { count: 3000 } });
    expect(gl.drawArraysInstanced.mock.calls.slice(-2).map(call => call[3])).toEqual([8, 3000]);
    expect(scene.stats).toMatchObject({ fieldCount: 3000, drawCalls: 4 });
    scene.update({ paused: true });
    expect(scene.stats.drawCalls).toBe(2);
    scene.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(4);
  });

  it('releases all owned resources when the optional lens pipeline fails to link', () => {
    const time = clock(); preferences(); const { gl, canvas, surface } = fixture();
    gl.getProgramParameter.mockImplementationOnce(() => true).mockImplementationOnce(() => true).mockImplementationOnce(() => false);
    const scene = track(attachGlassScene(canvas, { surfaces: [{ element: surface }] }));
    expect(scene.supported).toBe(false); expect(scene.stats.drawCalls).toBe(0); expect(time.frames.size).toBe(0);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(3); expect(gl.deleteShader).toHaveBeenCalledTimes(6);
    expect(gl.deleteTexture).toHaveBeenCalledOnce(); expect(gl.deleteFramebuffer).toHaveBeenCalledOnce();
    scene.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
  });


  it('renders optional fusion once between the wallpaper and other layers, using one bounded rectangle', () => {
    clock(); preferences(); const { gl, canvas, surface } = fixture();
    const scene = track(attachGlassScene(canvas, { paused: true, backdrop: 'studio',
      fusion: { drops: [{ x: 100, y: 100, radius: 80 }, { x: 190, y: 100, radius: 80 }] },
      surfaces: [{ element: surface }], field: { count: 3000 },
    }));
    expect(scene.supported).toBe(true); expect(scene.stats).toMatchObject({ fusionCount: 2, fieldCount: 3000, drawCalls: 5 });
    expect(gl.createProgram).toHaveBeenCalledTimes(5);
    expect(gl.drawArrays.mock.calls.map(call => call[2])).toEqual([3, 3, 6]);
    expect(gl.drawArraysInstanced.mock.calls.map(call => call[3])).toEqual([1, 3000]);
    expect(gl.drawArrays.mock.invocationCallOrder.at(-1)).toBeLessThan(gl.drawArraysInstanced.mock.invocationCallOrder[0]!);
    expect(intUniform(gl, 'uBackdrop')).toBe(1); expect(intUniform(gl, 'uFusionCount')).toBe(2);
    expect(gl.uniform4f.mock.calls.find(call => (call[0] as { name: string }).name === 'uFusion')?.slice(1)).toEqual([32, 36, 0, 44]);
    scene.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(5);
  });

  it('bounds and snapshots authored fusion inputs and grows bounds for every smooth union', () => {
    clock(); preferences(); const { gl, canvas } = fixture();
    const drops = [null, 7, { x: Infinity, y: NaN, radius: NaN }, { x: 999999, y: -999999, radius: -3 }, ...Array.from({ length: 9 }, () => ({ x: 100, y: 100, radius: 2000 }))];
    const fusion = { drops: drops as never, smoothness: 999, refraction: Infinity, dispersion: 999 };
    const scene = track(attachGlassScene(canvas, { paused: true, fusion }));
    expect(scene.stats.fusionCount).toBe(8);
    const data = gl.uniform3fv.mock.calls.at(-1)![1] as Float32Array;
    expect([...data].slice(0, 9)).toEqual([0, 0, 80, 100000, -100000, 1, 100, 100, 1024]);
    const controls = gl.uniform4f.mock.calls.filter(call => (call[0] as { name: string }).name === 'uFusion').at(-1)!;
    expect(controls.slice(1)).toEqual([120, 36, 8, 8]);
    const bounds = gl.uniform4fv.mock.calls.at(-1)![1] as Float32Array;
    expect([...bounds]).toEqual([49538.5, -49438.5, 50768.5, 50868.5]);
    fusion.smoothness = 0; (drops[2] as { x: number }).x = 50;
    scene.render(1);
    expect(data[0]).toBe(0);
    expect(gl.uniform4f.mock.calls.filter(call => (call[0] as { name: string }).name === 'uFusion').at(-1)?.[1]).toBe(120);
  });

  it('stages fast droplet updates without drawing, reallocating arrays or reconnecting observers', () => {
    const time = clock(); preferences(); const { gl, canvas } = fixture();
    const observe = vi.fn(), disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; });
    const scene = track(attachGlassScene(canvas, { paused: true, fusion: { drops: [{ x: 80, y: 90, radius: 30 }] } }));
    const data = gl.uniform3fv.mock.calls.at(-1)![1];
    const nativeFloat = globalThis.Float32Array;
    const construct = vi.fn();
    vi.stubGlobal('Float32Array', new Proxy(nativeFloat, { construct(target, args) { construct(); return Reflect.construct(target, args); } }));
    observe.mockClear(); disconnect.mockClear(); gl.drawArrays.mockClear(); gl.uniform3fv.mockClear();
    const drops = [{ x: 150, y: 170, radius: 60 }];
    scene.setDrops(drops); drops[0]!.x = 999;
    expect((data as Float32Array)[0]).toBe(150); // Authored arrays are copied during staging.
    scene.setDrops([{ x: 160, y: 180, radius: 70 }, { x: 220, y: 180, radius: 50 }]);
    expect(construct).not.toHaveBeenCalled(); expect(observe).not.toHaveBeenCalled(); expect(disconnect).not.toHaveBeenCalled();
    expect(gl.drawArrays).not.toHaveBeenCalled(); expect(gl.uniform3fv).not.toHaveBeenCalled(); expect(time.frames.size).toBe(0);
    scene.render(3);
    expect(gl.uniform3fv.mock.calls.at(-1)![1]).toBe(data);
    expect([...data as Float32Array].slice(0, 6)).toEqual([160, 180, 70, 220, 180, 50]);
    expect(scene.stats.fusionCount).toBe(2); expect(construct).not.toHaveBeenCalled();
    scene.setDrops([]); scene.render(4); expect(scene.stats.fusionCount).toBe(0); expect(scene.stats.drawCalls).toBe(2);
  });

  it('keeps disabled fusion disabled, lazily compiles staged enabled drops, and draws zero for offscreen fusion', () => {
    clock(); preferences(); const { gl, canvas } = fixture();
    const scene = track(attachGlassScene(canvas, { paused: true }));
    scene.setDrops([{ x: 100, y: 100, radius: 80 }]); scene.render(1);
    expect(scene.stats.fusionCount).toBe(0); expect(gl.createProgram).toHaveBeenCalledTimes(2);
    scene.update({ paused: true, fusion: { drops: [] } });
    scene.setDrops([{ x: 100, y: 100, radius: 80 }]);
    expect(gl.createProgram).toHaveBeenCalledTimes(2);
    scene.render(2); expect(scene.stats.fusionCount).toBe(1); expect(gl.createProgram).toHaveBeenCalledTimes(3);
    scene.setDrops([{ x: -100000, y: -100000, radius: 1 }]); scene.render(3);
    expect(scene.stats.fusionCount).toBe(0); expect(scene.stats.drawCalls).toBe(2);
    scene.update({ paused: true }); scene.setDrops([{ x: 100, y: 100, radius: 80 }]); scene.render(4);
    expect(scene.stats.fusionCount).toBe(0); expect(intUniform(gl, 'uBackdrop')).toBe(0);
    scene.destroy(); scene.setDrops([{ x: 100, y: 100, radius: 80 }]); expect(scene.stats.fusionCount).toBe(0);
  });

  it('consumes staged fusion geometry on the next active frame and restores fusion after context loss', () => {
    const time = clock(); const prefs = preferences(); const { gl, canvas } = fixture();
    const scene = track(attachGlassScene(canvas, { fusion: { drops: [{ x: 100, y: 100, radius: 80 }] } }));
    const draws = gl.drawArrays.mock.calls.length;
    scene.setDrops([{ x: 140, y: 130, radius: 90 }, { x: 240, y: 130, radius: 90 }]);
    expect(gl.drawArrays).toHaveBeenCalledTimes(draws); expect(time.frames.size).toBe(1);
    time.step(); expect(scene.stats.fusionCount).toBe(2);
    for (const query of ['(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(forced-colors: active)']) {
      prefs.set(query, true); expect(intUniform(gl, 'uSolid')).toBe(1); prefs.set(query, false);
    }
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(scene.supported).toBe(false); expect(scene.stats.fusionCount).toBe(0); expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(scene.supported).toBe(true); expect(scene.stats.fusionCount).toBe(2); expect(gl.createProgram).toHaveBeenCalledTimes(6);
    scene.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(6); expect(time.frames.size).toBe(0);
  });

  it('cleans up a failed lazy fusion pipeline and exposes a safe setter without WebGL2', () => {
    clock(); preferences(); const { gl, canvas } = fixture();
    gl.getProgramParameter.mockImplementationOnce(() => true).mockImplementationOnce(() => true).mockImplementationOnce(() => false);
    const scene = track(attachGlassScene(canvas, { fusion: { drops: [{ x: 100, y: 100, radius: 80 }] } }));
    expect(scene.supported).toBe(false); expect(scene.stats.fusionCount).toBe(0); expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
    scene.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
    const other = document.createElement('canvas'); document.body.append(other);
    vi.spyOn(other, 'getContext').mockReturnValue(null);
    const unsupported = track(attachGlassScene(other));
    expect(() => unsupported.setDrops([{ x: 100, y: 100, radius: 80 }])).not.toThrow(); expect(unsupported.stats.fusionCount).toBe(0);
  });

});


describe('planar caustic receivers', () => {
  it('adds one instanced pass and a quarter-area receiver, reuses resources on steady frames', () => {
    clock(); preferences(); const {gl,canvas,surface}=fixture();
    const scene=track(attachGlassScene(canvas,{paused:true,surfaces:[{element:surface}],caustics:{resolution:40}}));
    expect(scene.supported).toBe(true);
    expect(scene.stats).toMatchObject({causticCount:1,causticTriangles:3200,causticPixels:30000,drawCalls:4,pixels:120000});
    expect(gl.drawElementsInstanced).toHaveBeenLastCalledWith(gl.TRIANGLES,9600,gl.UNSIGNED_SHORT,0,1);
    expect(gl.createBuffer).toHaveBeenCalledTimes(2);expect(gl.bufferData).toHaveBeenCalledTimes(2);
    const targetAllocations=gl.texStorage2D.mock.calls.length,programs=gl.createProgram.mock.calls.length;
    scene.render(2);scene.render(3);
    expect(gl.bufferData).toHaveBeenCalledTimes(2);expect(gl.texStorage2D).toHaveBeenCalledTimes(targetAllocations);expect(gl.createProgram).toHaveBeenCalledTimes(programs);
    scene.destroy();expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);expect(gl.deleteTexture).toHaveBeenCalledTimes(2);expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(2);
  });
  it('allocates no caustic buffer or target for default scenes or intensity zero', () => {
    clock();preferences();const {gl,canvas,surface}=fixture();
    const scene=track(attachGlassScene(canvas,{paused:true,surfaces:[{element:surface}]}));
    scene.update({paused:true,surfaces:[{element:surface}],caustics:{intensity:0}});
    expect(gl.createBuffer).not.toHaveBeenCalled();expect(gl.drawElementsInstanced).not.toHaveBeenCalled();expect(gl.createTexture).toHaveBeenCalledTimes(1);
    expect(scene.stats.causticCount).toBe(0);expect(scene.stats.drawCalls).toBe(3);
  });
  it('stops caustic submissions for opacity accessibility preferences and resumes afterwards', () => {
    clock();const prefs=preferences(),{gl,canvas,surface}=fixture();
    const scene=track(attachGlassScene(canvas,{paused:true,surfaces:[{element:surface}],caustics:{}}));
    for(const query of ['(prefers-reduced-transparency: reduce)','(prefers-contrast: more)','(forced-colors: active)']) {
      const submitted=gl.drawElementsInstanced.mock.calls.length;prefs.set(query,true);
      expect(scene.stats.causticCount).toBe(0);expect(scene.stats.causticPixels).toBe(0);expect(gl.drawElementsInstanced).toHaveBeenCalledTimes(submitted);
      prefs.set(query,false);expect(scene.stats.causticCount).toBe(1);
    }
  });
  it('bounds grid and receiver settings, rebuilds the index only when topology changes', () => {
    clock();preferences();const {gl,canvas,surface}=fixture();
    const options={paused:true,surfaces:[{element:surface}],caustics:{resolution:Infinity,renderScale:NaN,ior:NaN,depth:Infinity,ripple:NaN,speed:NaN}};
    const scene=track(attachGlassScene(canvas,options));expect(scene.stats.causticTriangles).toBe(3200);
    scene.update({...options,caustics:{resolution:999,renderScale:10,ior:4,depth:999,ripple:4}});
    expect(scene.stats.causticTriangles).toBe(18432);expect(scene.stats.causticPixels).toBe(120000);expect(gl.bufferData).toHaveBeenCalledTimes(4);
    const uniforms=gl.uniform4f.mock.calls.filter(c=>(c[0] as {name:string}).name==='uCaustics').at(-1);
    expect(uniforms?.slice(1)).toEqual([.16,2.4,240,1]);
    scene.update({...options,caustics:{resolution:96}});expect(gl.bufferData).toHaveBeenCalledTimes(4);
  });
  it('copies emitter geometry and light, prioritizes visible surfaces and skips far-off emitters', () => {
    clock();preferences();const {gl,canvas,surface}=fixture();
    const light:[number,number]=[.2,.4];const emitters=Array.from({length:12},(_,i)=>({x:50+i,y:60,width:50,height:60,radius:200}));
    const scene=track(attachGlassScene(canvas,{paused:true,surfaces:[{element:surface}],caustics:{emitters,light}}));
    expect(scene.stats.causticCount).toBe(8);emitters[0].x=9999;light[0]=1;scene.render(2);
    const uploaded=gl.uniform4fv.mock.calls.filter(c=>(c[0] as {name:string}).name==='uCausticRects[0]').at(-1)?.[1] as Float32Array;
    expect(uploaded[4]).toBe(50);
    expect(gl.uniform3f.mock.calls.filter(c=>(c[0] as {name:string}).name==='uCausticLight').at(-1)?.slice(1)).toEqual([.2,.4,.6]);
    scene.update({paused:true,caustics:{emitters:[{x:10000,y:10000,width:80,height:80}]}});expect(scene.stats.causticCount).toBe(0);
  });
  it('rebuilds caustic resources after context loss, and disables an unavailable target safely', () => {
    clock();preferences();const {gl,canvas,surface}=fixture();
    const scene=track(attachGlassScene(canvas,{paused:true,surfaces:[{element:surface}],caustics:{}}));
    canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));expect(scene.stats.causticCount).toBe(0);
    canvas.dispatchEvent(new Event('webglcontextrestored'));expect(scene.supported).toBe(true);expect(scene.stats.causticCount).toBe(1);expect(gl.createBuffer).toHaveBeenCalledTimes(4);
    gl.checkFramebufferStatus.mockReturnValue(0);scene.update({paused:true,surfaces:[{element:surface}],caustics:{renderScale:1}});
    expect(scene.supported).toBe(false);expect(scene.stats.drawCalls).toBe(0);
  });
});
