import { describe, expect, it, vi } from 'vitest';
import { getGlassIllustrationScene } from '../src/illustration.js';
import { getGlassPictureProps } from '../src/responsive-image.js';
import type { GlassIllustrationOptions, GlassIllustrationLayer } from '../src/illustration.js';

function layer(overrides: Partial<GlassIllustrationLayer> = {}): GlassIllustrationLayer {
  return { id: 'tree', image: { src: './own-tree.svg', alt: '', width: 400, height: 600 }, placement: { x: 50, y: 75, width: 30 }, provenance: { creator: 'Original test artist', license: 'MIT', sourceURL: 'https://example.com/originals/tree' }, ...overrides };
}
function input(overrides: Partial<GlassIllustrationOptions> = {}): GlassIllustrationOptions {
  return { id: 'onboarding-art', aspectRatio: { width: 3, height: 2 }, semantics: { kind: 'informative', description: 'A tree beside a small desk: room for a new project.' }, layers: [layer()], ...overrides };
}

describe('independent pure illustration scene recipe', () => {
  it('imports and runs with browser globals absent and without renderer work', async () => {
    vi.resetModules(); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try { expect((await import('../src/illustration.js')).getGlassIllustrationScene(input()).layers).toHaveLength(1); }
    finally { vi.unstubAllGlobals(); }
  });
  it('returns a named informative group with deliberately decorative image descendants', () => {
    const scene = getGlassIllustrationScene(input());
    expect(scene.decorative).toBe(false); expect(scene.figureProps).toMatchObject({ id: 'onboarding-art', role: 'img', 'aria-label': 'A tree beside a small desk: room for a new project.' });
    expect(scene.figureProps).not.toHaveProperty('aria-hidden'); expect(scene.layers[0].layerProps['aria-hidden']).toBe('true'); expect(scene.layers[0].imageProps.alt).toBe(''); expect(scene.layers[0].imageProps.draggable).toBe(false);
  });
  it('marks an entire decorative scene without introducing an accessible label', () => {
    const scene = getGlassIllustrationScene(input({ semantics: { kind: 'decorative' } })); expect(scene.decorative).toBe(true); expect(scene.description).toBeNull(); expect(scene.figureProps['aria-hidden']).toBe('true'); expect(scene.figureProps).not.toHaveProperty('role'); expect(scene.figureProps).not.toHaveProperty('aria-label');
  });
  it('reserves a stable ratio and uses documented percentage anchors and intrinsic layer geometry', () => {
    const scene = getGlassIllustrationScene(input()), recipe = scene.layers[0];
    expect(scene.stageProps.style).toMatchObject({ position: 'relative', inlineSize: '100%', aspectRatio: '3 / 2', overflow: 'hidden' });
    expect(recipe.layerProps.style).toMatchObject({ left: '50%', top: '75%', inlineSize: '30%', aspectRatio: '400 / 600', transform: 'translate(-50%, -50%) rotate(0deg)', transformOrigin: '50% 50%', pointerEvents: 'none' }); expect(recipe.geometry.height).toBe(67.5);
  });
  it('supports bounded static rotation/corner anchor and explicit overflow without silent repositioning', () => {
    const scene = getGlassIllustrationScene(input({ overflow: 'visible', layers: [layer({ placement: { x: 0, y: 100, width: 40, rotation: -45, anchor: 'bottom-left' } })] }));
    expect(scene.stageProps.style.overflow).toBe('visible'); expect(scene.layers[0].layerProps.style.transform).toBe('translate(0%, -100%) rotate(-45deg)'); expect(scene.layers[0].geometry).toMatchObject({ x: 0, y: 100, width: 40, rotation: -45, anchor: 'bottom-left' });
  });
  it('preserves explicit back-to-front input order and local unique derived IDs', () => {
    const scene = getGlassIllustrationScene(input({ layers: [layer({ id: 'tree' }), layer({ id: 'desk' }), layer({ id: 'lamp' })] }));
    expect(scene.layers.map(recipe => recipe.id)).toEqual(['tree', 'desk', 'lamp']); expect(scene.layers.map(recipe => recipe.layerProps.style.zIndex)).toEqual(['0', '1', '2']); const ids = [scene.figureProps.id, scene.stageProps.id, ...scene.layers.flatMap(recipe => [recipe.layerProps.id, recipe.imageProps.id])]; expect(new Set(ids).size).toBe(ids.length); expect(ids).toContain('onboarding-art-image-tree');
  });
  it('delegates actual native picture art direction/candidates and image hints to the existing image helper', () => {
    const authored = layer({ image: { src: './tree-400.webp', alt: '', width: 400, height: 600, candidates: [{ src: './tree-800.webp', width: 800 }, { src: './tree-400.webp', width: 400 }], sizes: '(max-width: 600px) 30vw, 180px', priority: 'below-fold', fit: 'contain' }, sources: [{ width: 300, height: 400, candidates: [{ src: './mobile-tree.avif', width: 300 }], sizes: '30vw', media: '(max-width: 600px)', type: 'image/avif' }] });
    const expected = getGlassPictureProps({ image: authored.image, sources: authored.sources }), recipe = getGlassIllustrationScene(input({ layers: [authored] })).layers[0];
    expect(recipe.sourceProps).toEqual(expected.sources); expect(recipe.imageProps).toMatchObject({ src: expected.image.src, srcSet: expected.image.srcSet, sizes: expected.image.sizes, width: 400, height: 600, loading: 'lazy', fetchPriority: 'low', decoding: 'async' }); expect(recipe.layerProps.style.aspectRatio).toBe('400 / 600');
  });
  it('reserves explicit crop geometry and applies the native helper fit/focal point without a duplicate parser', () => {
    const recipe = getGlassIllustrationScene(input({ layers: [layer({ image: { src: './own-art.png', alt: '', width: 900, height: 300, aspectRatio: { width: 1, height: 1 }, fit: 'cover', focalPoint: { x: 20, y: 70 } } })] })).layers[0];
    expect(recipe.layerProps.style.aspectRatio).toBe('1 / 1'); expect(recipe.geometry.height).toBe(45); expect(recipe.imageProps.style.objectFit).toBe('cover'); expect(recipe.imageProps.style.objectPosition).toBe('20% 70%'); expect(recipe.imageProps['data-lg-image-crop']).toBe('true');
  });
  it('keeps ordinary priority by default, rather than inferring a critical/preload scene', () => {
    const recipe = getGlassIllustrationScene(input()).layers[0]; expect(recipe.imageProps.loading).toBe('eager'); expect(recipe.imageProps.fetchPriority).toBe('auto'); expect(recipe.imageProps.decoding).toBe('auto'); expect(recipe).not.toHaveProperty('preload');
  });
  it('freezes every returned recipe map while leaving host objects mutable and detached', () => {
    const authored = input(), before = JSON.stringify(authored), scene = getGlassIllustrationScene(authored), recipe = scene.layers[0];
    for (const output of [scene, scene.figureProps, scene.figureProps.style, scene.stageProps, scene.stageProps.style, scene.layers, recipe, recipe.layerProps, recipe.layerProps.style, recipe.pictureProps, recipe.pictureProps.style, recipe.imageProps, recipe.imageProps.style, recipe.sourceProps, recipe.geometry, recipe.provenance]) expect(Object.isFrozen(output)).toBe(true);
    expect(JSON.stringify(authored)).toBe(before); expect(Object.isFrozen(authored.layers[0].image)).toBe(false); authored.layers[0].image.src = './changed.svg'; (authored.layers[0].placement as { x: number }).x = 10; expect(recipe.imageProps.src).toBe('./own-tree.svg'); expect(recipe.geometry.x).toBe(50); expect(Reflect.set(recipe.imageProps, 'src', './external.svg')).toBe(false);
  });
  it('freezes each returned native source group without freezing supplied candidates', () => {
    const candidate = { src: './art.avif', width: 400 }, source = { width: 400, height: 600, candidates: [candidate], sizes: '30vw' }, scene = getGlassIllustrationScene(input({ layers: [layer({ sources: [source] })] })); expect(Object.isFrozen(scene.layers[0].sourceProps[0])).toBe(true); expect(Object.isFrozen(source)).toBe(false); expect(Object.isFrozen(candidate)).toBe(false); candidate.src = './changed.avif'; expect(scene.layers[0].sourceProps[0].srcSet).toBe('./art.avif 400w');
  });
  it('is deterministic and performs no timers, frame scheduling, fetch or DOM changes', () => {
    const timer = vi.spyOn(window, 'setTimeout'), raf = vi.spyOn(window, 'requestAnimationFrame'), before = document.body.innerHTML; const first = getGlassIllustrationScene(input()), second = getGlassIllustrationScene(input()); expect(first).toEqual(second); expect(timer).not.toHaveBeenCalled(); expect(raf).not.toHaveBeenCalled(); expect(document.body.innerHTML).toBe(before); timer.mockRestore(); raf.mockRestore();
  });
  it('rejects mismatched group/image semantics and missing description or alt', () => {
    for (const authored of [input({ semantics: { kind: 'informative', description: '' } }), input({ semantics: { kind: 'decorative', description: 'wrong' } as never }), input({ semantics: { kind: 'unknown' } as never }), input({ layers: [layer({ image: { ...layer().image, alt: 'A tree' } })] }), input({ layers: [layer({ image: { src: './tree.svg', width: 400, height: 600 } as never })] })]) expect(() => getGlassIllustrationScene(authored)).toThrow(TypeError);
  });
  it('rejects zero/too many layers, duplicate IDs, unsafe IDs and missing provenance', () => {
    for (const authored of [input({ layers: [] }), input({ layers: Array.from({ length: 9 }, (_, index) => layer({ id: `l${index}` })) }), input({ layers: [layer(), layer()] }), input({ id: 'bad id' }), input({ id: 'x'.repeat(65) }), input({ layers: [layer({ id: '../tree' })] }), input({ layers: [layer({ provenance: { creator: '', license: 'MIT' } })] }), input({ layers: [layer({ provenance: { creator: 'Artist', license: '' } })] })]) expect(() => getGlassIllustrationScene(authored)).toThrow(TypeError);
  });
  it('bounds geometry and derived height without CSS interpolation or extreme aspect boxes', () => {
    for (const placement of [{ x: NaN, y: 0, width: 20 }, { x: 101, y: 0, width: 20 }, { x: 0, y: -1, width: 20 }, { x: 0, y: 0, width: 0 }, { x: 0, y: 0, width: 101 }, { x: 0, y: 0, width: 20, rotation: 46 }, { x: 0, y: 0, width: 20, rotation: '0);evil' }, { x: 0, y: 0, width: 20, anchor: 'constructor' }]) expect(() => getGlassIllustrationScene(input({ layers: [layer({ placement: placement as never })] }))).toThrow(TypeError);
    for (const ratio of [{ width: 0, height: 1 }, { width: 1.5, height: 1 }, { width: 32769, height: 1 }, { width: 1, height: 9 }]) expect(() => getGlassIllustrationScene(input({ aspectRatio: ratio }))).toThrow(TypeError);
    expect(() => getGlassIllustrationScene(input({ layers: [layer({ image: { src: './tree.svg', alt: '', width: 1, height: 32768 }, placement: { x: 50, y: 50, width: 100 } })] }))).toThrow('derived layer height'); expect(() => getGlassIllustrationScene(input({ overflow: 'auto' as never }))).toThrow(TypeError);
  });
  it('delegates unsafe resource/candidate/dimension/native-expression rejection to responsive-image', () => {
    for (const image of [{ ...layer().image, src: 'javascript:alert(1)' }, { ...layer().image, src: 'data:image/svg+xml;base64,PHN2Zz4=' }, { ...layer().image, width: 0 }, { ...layer().image, height: Infinity }, { ...layer().image, candidates: [{ src: './a.png', width: 100 }, { src: './b.png', width: 100 }], sizes: '30vw' }, { ...layer().image, candidates: [{ src: './a.png', width: 100 }], sizes: '30vw"evil' }]) expect(() => getGlassIllustrationScene(input({ layers: [layer({ image })] }))).toThrow();
  });
  it('keeps provenance declarations bounded and absolute credential-free attribution URLs inert', () => {
    for (const sourceURL of ['javascript:alert(1)', './asset.svg', 'https://user:password@example.com/asset', 'https://example.com/?token=private', 'https://example.com/#token', 'https://example.com/has space', 'https://example.com/<bad>']) expect(() => getGlassIllustrationScene(input({ layers: [layer({ provenance: { creator: 'Artist', license: 'MIT', sourceURL } })] }))).toThrow(TypeError);
    expect(getGlassIllustrationScene(input({ layers: [layer({ provenance: { creator: 'Caller artist', license: 'Caller permission declaration' } })] })).layers[0].provenance).toEqual({ creator: 'Caller artist', license: 'Caller permission declaration' });
  });
  it('rejects own recipe getters, sparse/accessor arrays and custom fields without evaluating them', () => {
    let reads = 0; const authored = input(); Object.defineProperty(authored, 'layers', { enumerable: true, get() { reads++; return [layer()]; } }); expect(() => getGlassIllustrationScene(authored)).toThrow('accessors');
    const items = [layer()]; Object.defineProperty(items, '0', { enumerable: true, get() { reads++; return layer(); } }); expect(() => getGlassIllustrationScene(input({ layers: items }))).toThrow('accessor'); expect(() => getGlassIllustrationScene(input({ layers: Array(1) }))).toThrow('sparse'); const custom = [layer()]; Object.assign(custom, { extra: true }); expect(() => getGlassIllustrationScene(input({ layers: custom }))).toThrow('custom'); expect(reads).toBe(0);
  });
  it('provides safe escaped native DOM attributes without parsing raw SVG/HTML or making layer controls', () => {
    const scene = getGlassIllustrationScene(input({ semantics: { kind: 'informative', description: '<b>Original scene description</b>' } })), figure = document.createElement('figure'); figure.setAttribute('role', scene.figureProps.role!); figure.setAttribute('aria-label', scene.figureProps['aria-label']!); const img = document.createElement('img'); img.src = scene.layers[0].imageProps.src; img.alt = scene.layers[0].imageProps.alt; figure.append(img); expect(figure.querySelector('b')).toBeNull(); expect(figure.querySelector('button')).toBeNull(); expect(figure.getAttribute('aria-label')).toBe('<b>Original scene description</b>');
  });
});
