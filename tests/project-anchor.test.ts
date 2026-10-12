import { afterEach, describe, expect, it, vi } from 'vitest';
import { projectGlassAnchor } from '../src/project-anchor.js';
import type { GlassAnchorProjectionOptions } from '../src/project-anchor.js';

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const viewport = { width: 800, height: 400 };
const project = (point: readonly [number, number, number], extras: Partial<GlassAnchorProjectionOptions> = {}) => projectGlassAnchor({ point, viewProjection: identity, viewport, ...extras });
// Right-handed camera looking down -Z: vertical FOV 90°, aspect 2, near 1, far 11.
const perspectiveGL = [0.5, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1.2, -1, 0, 0, -2.2, 0];
// Same camera/projection with clip depth [0,W].
const perspectiveGPU = [0.5, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1.1, -1, 0, 0, -1.1, 0];

describe('world-space HTML anchor projection', () => {
  it('maps identity NDC center and all corner edges into non-square CSS viewport pixels', () => {
    expect(project([0, 0, 0])).toEqual({ x: 400, y: 200, depth: 0, inFrustum: true, behindCamera: false, projectable: true });
    expect(project([-1, 1, -1])).toEqual({ x: 0, y: 0, depth: -1, inFrustum: true, behindCamera: false, projectable: true });
    expect(project([1, -1, 1])).toEqual({ x: 800, y: 400, depth: 1, inFrustum: true, behindCamera: false, projectable: true });
  });
  it('uses optional CSS viewport origin and positive top-to-bottom screen Y', () => {
    expect(project([0.5, 0.5, 0], { viewport: { width: 320, height: 640, x: 12, y: 48 } })).toMatchObject({ x: 252, y: 208, inFrustum: true });
    expect(project([0, -0.5, 0], { viewport: { width: 320, height: 640 } }).y).toBe(480);
  });
  it('correctly applies a translated, asymmetric orthographic column-major world-to-clip matrix', () => {
    // Orthographic world box X[2,10], Y[-3,1], camera near1/far11 looking down -Z.
    const ortho = [0.25, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, -0.2, 0, -1.5, 0.5, -1.2, 1];
    expect(project([6, -1, -6], { viewProjection: ortho })).toMatchObject({ x: 400, y: 200, inFrustum: true });
    const nearCorner = project([2, 1, -1], { viewProjection: ortho }); expect(nearCorner).toMatchObject({ x: 0, y: 0, depth: -1, inFrustum: true });
    const farCorner = project([10, -3, -11], { viewProjection: ortho }); expect(farCorner.x).toBe(800); expect(farCorner.y).toBe(400); expect(farCorner.depth).toBeCloseTo(1); expect(farCorner.inFrustum).toBe(true);
  });
  it('perspective-divides actual camera coordinates and retains the unremapped NDC depth', () => {
    const result = project([2, 1, -4], { viewProjection: perspectiveGL }); expect(result.x).toBe(500); expect(result.y).toBe(150); expect(result.depth).toBeCloseTo(0.65); expect(result.inFrustum).toBe(true);
    expect(project([0, 0, -1], { viewProjection: perspectiveGL }).depth).toBeCloseTo(-1); expect(project([0, 0, -11], { viewProjection: perspectiveGL }).depth).toBeCloseTo(1);
  });
  it('accepts a rotated/translated view projection rather than assuming matrix diagonals', () => {
    // World X maps to clip Y, world Y to clip -X, translated by (+.25,-.5).
    const transformed = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0.25, -0.5, 0, 1];
    expect(project([0.75, -0.25, 0.2], { viewProjection: transformed })).toEqual({ x: 600, y: 150, depth: 0.2, inFrustum: true, behindCamera: false, projectable: true });
  });
  it('distinguishes WebGL and WebGPU depth conventions without remapping values', () => {
    expect(project([0, 0, -0.25]).inFrustum).toBe(true); expect(project([0, 0, -0.25], { depthRange: 'zero-to-one' }).inFrustum).toBe(false);
    const near = project([0, 0, -1], { viewProjection: perspectiveGPU, depthRange: 'zero-to-one' }); expect(near.depth).toBe(0); expect(near.inFrustum).toBe(true);
    const middle = project([2, 1, -4], { viewProjection: perspectiveGPU, depthRange: 'zero-to-one' }); expect(middle.depth).toBeCloseTo(0.825); expect(middle).toMatchObject({ x: 500, y: 150, inFrustum: true });
    const far = project([0, 0, -11], { viewProjection: perspectiveGPU, depthRange: 'zero-to-one' }); expect(far.depth).toBeCloseTo(1); expect(far.inFrustum).toBe(true);
  });
  it('allows only documented floating-point clip-boundary tolerance without snapping coordinates', () => {
    const rounded = project([1 + 4 * Number.EPSILON, 0, 0]); expect(rounded.inFrustum).toBe(true); expect(rounded.x).toBeGreaterThan(800);
    expect(project([1 + 16 * Number.EPSILON, 0, 0]).inFrustum).toBe(false);
    expect(project([0, 0, -16 * Number.EPSILON], { depthRange: 'zero-to-one' }).inFrustum).toBe(false);
  });
  it('reports out-of-frustum positive-W coordinates without clamping them to the canvas', () => {
    expect(project([2, -2, 3])).toEqual({ x: 1200, y: 600, depth: 3, inFrustum: false, behindCamera: false, projectable: true });
    expect(project([0, 0, -0.5], { viewProjection: perspectiveGL })).toMatchObject({ inFrustum: false, projectable: true, behindCamera: false });
    expect(project([0, 0, -12], { viewProjection: perspectiveGL })).toMatchObject({ inFrustum: false, projectable: true, behindCamera: false });
  });
  it('does not mirror labels behind the perspective camera or divide a point on the camera plane', () => {
    expect(project([2, 1, 4], { viewProjection: perspectiveGL })).toEqual({ x: null, y: null, depth: null, inFrustum: false, behindCamera: true, projectable: false });
    expect(project([0, 0, 0], { viewProjection: perspectiveGL })).toEqual({ x: null, y: null, depth: null, inFrustum: false, behindCamera: true, projectable: false });
  });
  it('handles near-zero positive W with a documented relative threshold', () => {
    const matrix = [...identity]; matrix[15] = 1e-13;
    expect(project([1, 0, 0], { viewProjection: matrix })).toEqual({ x: null, y: null, depth: null, inFrustum: false, behindCamera: false, projectable: false });
    // A uniformly tiny homogeneous transform is safe: only ratios matter.
    expect(project([0.5, 0.5, 0], { viewProjection: identity.map(value => value * 1e-100) })).toEqual({ x: 600, y: 100, depth: 0, inFrustum: true, behindCamera: false, projectable: true });
    const ordinary = project([2, 1, -4], { viewProjection: perspectiveGL }); const rescaled = project([2, 1, -4], { viewProjection: perspectiveGL.map(value => value * 1e-30) }); expect(rescaled.x).toBeCloseTo(ordinary.x!); expect(rescaled.y).toBeCloseTo(ordinary.y!); expect(rescaled.depth).toBeCloseTo(ordinary.depth!); expect(rescaled.inFrustum).toBe(ordinary.inFrustum);
  });
  it('accepts finite large scene units without an arbitrary world-coordinate cap', () => {
    const astronomical = [1e-20, 0, 0, 0, 0, 1e-20, 0, 0, 0, 0, 1e-20, 0, 0, 0, 0, 1];
    expect(project([5e19, 5e19, 0], { viewProjection: astronomical })).toEqual({ x: 600, y: 100, depth: 0, inFrustum: true, behindCamera: false, projectable: true });
  });
  it('never returns infinite or NaN coordinates when finite multiplication overflows or CSS output is too large', () => {
    const huge = [...identity]; huge[0] = 1e308;
    expect(project([1e308, 0, 0], { viewProjection: huge })).toMatchObject({ x: null, y: null, depth: null, projectable: false });
    expect(project([1e8, 0, 0])).toMatchObject({ x: null, y: null, depth: null, projectable: false, behindCamera: false });
    expect(project([0, 0, 0], { viewport: { ...viewport, x: 1e12 } }).projectable).toBe(false);
  });
  it('supports actual host matrix buffers and does not mutate inputs', () => {
    const point = Object.freeze([2, 1, -4] as const), values = Object.freeze([...perspectiveGL]), dimensions = Object.freeze({ ...viewport });
    const a = projectGlassAnchor({ point, viewProjection: values, viewport: dimensions }); const b = project(point, { viewProjection: new Float64Array(perspectiveGL) }); const c = project(point, { viewProjection: new Float32Array(perspectiveGL) }); expect(a).toEqual(b); expect(c.depth).toBeCloseTo(a.depth!, 6); expect(Object.isFrozen(a)).toBe(true); expect(values).toEqual(perspectiveGL); expect(point).toEqual([2, 1, -4]);
  });
  it('rejects malformed or nonfinite points, matrices, viewport dimensions and depth conventions', () => {
    for (const point of [[1, 2], [1, 2, 3, 4], [NaN, 0, 0], [0, Infinity, 0], ['1', 0, 0]]) expect(() => project(point as never)).toThrow();
    for (const viewProjection of [identity.slice(1), [...identity, 0], identity.map((value, index) => index === 5 ? Infinity : value), new Int32Array(identity)]) expect(() => project([0, 0, 0], { viewProjection: viewProjection as never })).toThrow();
    for (const dimensions of [{ width: 0, height: 100 }, { width: 100, height: -1 }, { width: NaN, height: 1 }, { width: 1e6 + 1, height: 1 }, { width: 1, height: 1, y: Infinity }]) expect(() => project([0, 0, 0], { viewport: dimensions })).toThrow();
    expect(() => project([0, 0, 0], { depthRange: 'reverse' as never })).toThrow('depthRange');
  });
  it('validates indexed data without invoking getters or unrelated conversion hooks', () => {
    const read = vi.fn(() => 0), hook = vi.fn(() => 0); const matrix = [...identity]; Object.defineProperty(matrix, '0', { get: read }); expect(() => project([0, 0, 0], { viewProjection: matrix })).toThrow('data properties'); expect(read).not.toHaveBeenCalled();
    const dimensions = Object.defineProperty({ width: 800 }, 'height', { get: read }); expect(() => project([0, 0, 0], { viewport: dimensions as never })).toThrow('data properties'); expect(read).not.toHaveBeenCalled();
    const result = project([0, 0, 0], { viewport: { ...viewport, valueOf: hook } as never }); expect(result.inFrustum).toBe(true); expect(hook).not.toHaveBeenCalled();
  });
  it('contains no visibility, semantic interaction, rendering, or scheduling side effects', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame'), timer = vi.spyOn(window, 'setTimeout'), lookup = vi.spyOn(document, 'querySelector'); const button = document.createElement('button'); button.textContent = 'Stable inspector'; document.body.append(button); button.focus(); timer.mockClear(); lookup.mockClear();
    project([0, 0, 0]); expect(document.activeElement).toBe(button); expect(button.hidden).toBe(false); expect(raf).not.toHaveBeenCalled(); expect(timer).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled(); button.remove();
  });
});
