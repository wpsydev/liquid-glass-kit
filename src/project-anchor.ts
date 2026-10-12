/** Pure world-point projection; no renderer, camera, DOM, scheduling or occlusion lookup. */
export type GlassAnchorPoint = readonly [number, number, number];
export type GlassAnchorMatrix = readonly number[] | Float32Array | Float64Array;
export type GlassAnchorDepthRange = 'negative-one-to-one' | 'zero-to-one';
export interface GlassAnchorViewport {
  /** CSS-pixel dimensions, never the DPR-scaled canvas backing dimensions. */
  width: number;
  height: number;
  /** Optional CSS-pixel top-left origin in the host's chosen coordinate space. */
  x?: number;
  y?: number;
}
export interface GlassAnchorProjectionOptions {
  point: GlassAnchorPoint;
  /** Column-major projection × view matrix, mapping world [x,y,z,1] to clip space. */
  viewProjection: GlassAnchorMatrix;
  viewport: GlassAnchorViewport;
  /** WebGL-style clip z in [-w,w] by default; choose [0,w] for WebGPU-style depth. */
  depthRange?: GlassAnchorDepthRange;
}
export interface GlassAnchorProjection {
  /** Unclamped CSS-pixel coordinates; null when projection is numerically unsafe or W <= 0. */
  readonly x: number | null;
  readonly y: number | null;
  /** Unremapped normalized-device z (clip z / W), not physical distance or CSS z-index. */
  readonly depth: number | null;
  /** Clip-volume membership only. Does not test occlusion, DOM visibility or focus safety. */
  readonly inFrustum: boolean;
  readonly behindCamera: boolean;
  readonly projectable: boolean;
}

const typedArrayLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Float32Array.prototype), 'length')!.get!;
function own(object: unknown, key: string, fallback?: unknown): unknown {
  if (!object || typeof object !== 'object') throw new TypeError('Glass anchor inputs must be objects');
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor) return fallback;
  if (!('value' in descriptor)) throw new TypeError('Glass anchor inputs must use data properties');
  return descriptor.value === undefined ? fallback : descriptor.value;
}
function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`Glass anchor ${label} must be finite`);
  return value;
}
function vector(value: unknown, length: number, label: string, typed = false): number[] {
  const array = Array.isArray(value);
  const floats = typed && ArrayBuffer.isView(value) && (value instanceof Float32Array || value instanceof Float64Array);
  if (!array && !floats) throw new TypeError(`Glass anchor ${label} must be a ${length}-value array${typed ? ' or floating-point typed array' : ''}`);
  const size = array ? own(value, 'length') : typedArrayLength.call(value);
  if (size !== length) throw new RangeError(`Glass anchor ${label} must have exactly ${length} values`);
  return Array.from({ length }, (_, index) => finite(own(value, String(index)), `${label}[${index}]`));
}

/**
 * Multiply a column-major world-to-clip matrix by [x,y,z,1], then divide by positive W.
 * Handedness, camera pose, projection and clipping convention belong to the host.
 * Map NDC (-1,+1) to the CSS top-left and (+1,-1) to the bottom-right.
 * Near-zero W means W <= 1e-12 × max(abs(clip X/Y/Z/W)); this relative threshold
 * is invariant under positive homogeneous matrix scaling. Nonfinite intermediate
 * arithmetic or projected |CSS coordinate| > 1e9 also returns null coordinates.
 * Frustum edges are inclusive with a clip-space tolerance of W × 8 × Number.EPSILON
 * (eight machine epsilons in NDC). Returned coordinates/depth are never snapped.
 * Recompute only when host camera/point/viewport changes, and manage hidden/inert/focus
 * separately. In-frustum labels may still sit behind meshes or outside a clipped DOM parent.
 */
export function projectGlassAnchor(options: GlassAnchorProjectionOptions): GlassAnchorProjection {
  const [px, py, pz] = vector(own(options, 'point'), 3, 'point');
  const matrix = vector(own(options, 'viewProjection'), 16, 'viewProjection', true);
  const viewport = own(options, 'viewport');
  const width = finite(own(viewport, 'width'), 'viewport width'), height = finite(own(viewport, 'height'), 'viewport height');
  if (width <= 0 || height <= 0 || width > 1e6 || height > 1e6) throw new RangeError('Glass anchor CSS viewport dimensions must be positive and at most 1000000');
  const originX = finite(own(viewport, 'x', 0), 'viewport x'), originY = finite(own(viewport, 'y', 0), 'viewport y');
  const range = own(options, 'depthRange', 'negative-one-to-one');
  if (range !== 'negative-one-to-one' && range !== 'zero-to-one') throw new TypeError('Glass anchor depthRange is unsupported');
  const cx = matrix[0] * px + matrix[4] * py + matrix[8] * pz + matrix[12];
  const cy = matrix[1] * px + matrix[5] * py + matrix[9] * pz + matrix[13];
  const cz = matrix[2] * px + matrix[6] * py + matrix[10] * pz + matrix[14];
  const cw = matrix[3] * px + matrix[7] * py + matrix[11] * pz + matrix[15];
  const behindCamera = cw <= 0;
  const unavailable = (): GlassAnchorProjection => Object.freeze({ x: null, y: null, depth: null, inFrustum: false, behindCamera, projectable: false });
  if (![cx, cy, cz, cw].every(Number.isFinite) || behindCamera || cw <= Math.max(Math.abs(cx), Math.abs(cy), Math.abs(cz), Math.abs(cw)) * 1e-12) return unavailable();
  const nx = cx / cw, ny = cy / cw, depth = cz / cw;
  const x = originX + (nx + 1) * width / 2, y = originY + (1 - ny) * height / 2;
  if (![x, y, depth].every(Number.isFinite) || Math.abs(x) > 1e9 || Math.abs(y) > 1e9) return unavailable();
  const tolerance = cw * 8 * Number.EPSILON;
  const inFrustum = cx >= -cw - tolerance && cx <= cw + tolerance && cy >= -cw - tolerance && cy <= cw + tolerance && cz >= (range === 'zero-to-one' ? 0 : -cw) - tolerance && cz <= cw + tolerance;
  return Object.freeze({ x, y, depth, inFrustum, behindCamera, projectable: true });
}
