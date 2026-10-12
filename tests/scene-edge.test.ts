import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as shaders from '../src/scene-shaders.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Baseline shader-byte hashes from 556b5d5 + source29 dependency commit30055b7.
// These checks cover source bytes/placement only, NOT native compilation/pixels.
const legacy = {
  fieldFragmentSource: 'fc9ec1ac54b62b368cc819b498f4afb61eee85a9aab5167a5e1a894ed9046c0a',
  fieldVertexSource: '4f8b57e3cdc5d1c05204549539370fe9c2987c5524af4762a0adbbd8f7016040',
  fragmentSource: 'dc812ea0eabefd4f4e9bfcc928fc17d4f2a36605254df86a62d2ff0b7b4297fa',
  fusionFragmentSource: '149b1c570ffa11305782be227602de8fdcb6fcff9e67ec0cf5778de84969ebb3',
  fusionVertexSource: '853d2c618d257f73f52c60cd4634bd46d663ef9e83dab254ecdb1c14da83ea9b',
  lensFragmentSource: '63dba9ebb70475cf43edb145369f89e592d58b6fe96119e2acc7c017886540a1',
  lensVertexSource: '62cf96f04a3f07716d63336913e330bc6da801aa289a3312feaae8e325075f84',
  vertexSource: 'a3af2b77724813de81b9e97a919a922d9f5943deb6afda0d700c1f4f77ff092b',
  wallpaperSource: '3ea06514e6e6c3ac4a275f7a7c4bf0c627f923c611719408a951e3cf2cdf88e1',
} as const;

describe('original optional pixel-edge shader source contract', () => {
  it('retains every legacy shader string byte-for-byte', () => {
    for (const [name, hash] of Object.entries(legacy)) expect(createHash('sha256').update(shaders[name as keyof typeof legacy]).digest('hex')).toBe(hash);
  });

  it('caches immutable optional variants without changing shared legacy constants', () => {
    const first = shaders.scenePixelEdgeSources(), next = shaders.scenePixelEdgeSources();
    expect(first).toBe(next); expect(Object.isFrozen(first)).toBe(true);
    expect(shaders.lensFragmentSource).not.toContain('fwidth');
    expect(shaders.fieldFragmentSource).not.toContain('fwidth');
    expect(shaders.fusionFragmentSource).not.toContain('fwidth');
  });

  it.each(['lensFragment', 'fieldFragment', 'fusionFragment'] as const)('evaluates one derivative in uniform main flow before all coverage divergence: %s', key => {
    const source = shaders.scenePixelEdgeSources()[key], main = source.slice(source.indexOf('void main()'));
    expect(source.slice(0, source.indexOf('void main()'))).not.toContain('fwidth(');
    expect(source.match(/fwidth\(/g)).toHaveLength(1);
    const derivative = main.indexOf('float edgeFootprint = fwidth(d);');
    expect(derivative).toBeGreaterThan(0);
    const firstCoverageBranch = main.search(/if \(coverage/);
    expect(derivative).toBeLessThan(firstCoverageBranch);
    if (key === 'fieldFragment') expect(derivative).toBeLessThan(main.indexOf('discard;'));
    const distanceCall = key === 'fusionFragment' ? 'fusedDistance(point, d, normal);' : key === 'fieldFragment' ? 'roundedBox(local, vec4(0.0, 0.0, vRect.zw), vOptics.x, d, localNormal);' : 'roundedBox(point, vLensRect, vLensOptics.x, d, normal);';
    expect(derivative).toBeGreaterThan(main.indexOf(distanceCall));
    expect(main).toContain('max(.0001, 1.0 / uDpr.x + 1.0 / uDpr.y)');
    expect(main).toContain('clamp(.5 * edgeFootprint, .0001, edgePixelCap)');
    expect(main).toContain('smoothstep(-edgeHalfBand, edgeHalfBand, d)');
  });

  it('changes only coverage in each fragment, preserving interior shading and blending math', () => {
    const variants = shaders.scenePixelEdgeSources();
    for (const [variant, original] of [[variants.lensFragment, shaders.lensFragmentSource], [variants.fieldFragment, shaders.fieldFragmentSource], [variants.fusionFragment, shaders.fusionFragmentSource]]) {
      const restored = variant.replace(/  \/\/ Evaluate once in uniform control flow, before coverage branches\/discard\.\n  float edgeFootprint = fwidth\(d\);\n  float edgePixelCap = max\(\.0001, 1\.0 \/ uDpr\.x \+ 1\.0 \/ uDpr\.y\);\n  float edgeHalfBand = clamp\(\.5 \* edgeFootprint, \.0001, edgePixelCap\);\n  float coverage = 1\.0 - smoothstep\(-edgeHalfBand, edgeHalfBand, d\);/, '  float coverage = 1.0 - smoothstep(-.65, .65, d);');
      expect(restored).toBe(original);
    }
  });

  it('adds conservative backing-aware extent without taking derivatives in any vertex shader', () => {
    const variants = shaders.scenePixelEdgeSources();
    for (const source of [variants.lensVertex, variants.fieldVertex, variants.fusionVertex]) {
      expect(source.match(/uniform vec2 uDpr;/g)).toHaveLength(1);
      expect(source).not.toMatch(/fwidth|dFdx|dFdy/);
      expect(source).toContain('2.0 * (1.0 / uDpr.x + 1.0 / uDpr.y)');
    }
    expect(variants.lensVertex).toContain('max(96.0, max(1.0,');
    expect(variants.fieldVertex).toContain('halfSize + max(1.0,');
    expect(variants.fieldVertex).toContain('vRect = vec4(center, halfSize);');
    expect(variants.fusionVertex).toContain('uFusionBounds.zw + vec2(max(1.0,');
    expect(shaders.fieldVertexSource).toContain('halfSize + 1.0');
  });

  it('keeps the source builder SSR/import-safe and requires no graphics extension or browser object', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    const module = await import('../src/scene-shaders.js');
    expect(module.scenePixelEdgeSources().fieldFragment.startsWith('#version 300 es')).toBe(true);
    expect(module.scenePixelEdgeSources().fieldFragment).not.toContain('#extension');
  });
});
