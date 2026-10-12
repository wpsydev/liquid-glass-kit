import { describe, expect, it } from 'vitest';
import { createGlassRegistryItem, validateGlassRegistryItem } from '../src/registry.js';
import type { GlassRegistryItemInput, GlassRegistryPolicy, GlassRegistryJson } from '../src/registry.js';

const policy: GlassRegistryPolicy = { targetRoots: ['src/lib/liquid-glass', 'components/liquid-glass'], availableExports: ['@wpsydev/liquid-glass/material.css', '@wpsydev/liquid-glass/react'] };
function input(extra: Partial<GlassRegistryItemInput> = {}): GlassRegistryItemInput { return { name: 'glass-surface', type: 'registry:style', title: 'Original glass surface', author: 'wpsydev', description: 'A portable authored CSS surface.', files: [{ path: 'registry/glass-surface/surface.css', type: 'registry:style', target: 'components/liquid-glass/surface.css', content: '.glass-surface { border-radius: 20px; background: #f4f6fb; }' }], ...extra }; }
function raw(extra: Record<string, unknown> = {}) { return { $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...input(), ...extra }; }
function invalid(value: unknown, path?: string) { const result = validateGlassRegistryItem(value, policy); expect(result.valid).toBe(false); if (!result.valid && path) expect(result.issues[0].path).toContain(path); }

describe('pure original registry authoring subset', () => {
  it('creates canonical upstream-shaped inline file records without adding runtime dependencies', () => {
    const item = createGlassRegistryItem(input(), policy); expect(item.$schema).toBe('https://ui.shadcn.com/schema/registry-item.json'); expect(item.files[0].content).toContain('border-radius'); expect(item.files[0].target).toBe('components/liquid-glass/surface.css'); expect(item.dependencies).toBeUndefined(); expect(validateGlassRegistryItem(item, policy).valid).toBe(true);
  });
  it('keeps optional metadata optional and supports independent own lib/component/file recipes', () => {
    for (const [type, extension] of [['registry:lib', 'ts'], ['registry:ui', 'tsx'], ['registry:component', 'jsx'], ['registry:file', 'json']] as const) { const item = createGlassRegistryItem(input({ type, files: [{ path: `registry/own/source.${extension}`, target: `src/lib/liquid-glass/source.${extension}`, type, content: 'original caller-owned source' }] }), policy); expect(item.type).toBe(type); expect(item.meta).toBeUndefined(); }
  });
  it('produces deterministic ordering without mutating source arrays/objects', () => {
    const first = input({ dependencies: ['vue@3.5.0', 'react@19.0.0'], categories: ['ui', 'glass'], meta: { z: 1, a: { y: true, x: false } }, files: [input().files[0], { path: 'registry/own/alpha.css', target: 'components/liquid-glass/alpha.css', type: 'registry:style', content: '.alpha {}' }] });
    const before = JSON.stringify(first); const second = { ...first, dependencies: [...first.dependencies!].reverse(), categories: [...first.categories!].reverse(), files: [...first.files].reverse(), meta: { a: { x: false, y: true }, z: 1 } };
    expect(JSON.stringify(createGlassRegistryItem(first, policy))).toBe(JSON.stringify(createGlassRegistryItem(second, policy))); expect(JSON.stringify(first)).toBe(before);
  });
  it('returns frozen independent copies of files, arrays and recursive metadata', () => {
    const value = input({ meta: { preferences: { themes: ['light', 'dark'] } } }); const item = createGlassRegistryItem(value, policy); expect(Object.isFrozen(item)).toBe(true); expect(Object.isFrozen(item.files)).toBe(true); expect(Object.isFrozen(item.files[0])).toBe(true); expect(Object.isFrozen(item.meta?.preferences)).toBe(true); expect(Reflect.set(item.files[0], 'target', 'changed')).toBe(false); expect(value.files[0].target).toBe('components/liquid-glass/surface.css');
  });
  it('requires explicit authorized target roots and respects whole directory boundaries', () => {
    expect(() => createGlassRegistryItem(input(), { targetRoots: [] })).toThrow('targetRoots'); invalid(raw({ files: [{ ...input().files[0], target: 'components/liquid-glass-sibling/surface.css' }] }), 'target');
    const own = input({ files: [{ ...input().files[0], target: 'custom/my-ui/surface.css' }] }); expect(() => createGlassRegistryItem(own, policy)).toThrow('authorized'); expect(createGlassRegistryItem(own, { targetRoots: ['custom/my-ui'] }).files[0].target).toBe('custom/my-ui/surface.css');
  });
  it('rejects absolute, traversal, backslash, encoded, home, placeholder, empty and whitespace targets', () => {
    for (const target of ['/tmp/surface.css', 'C:/surface.css', 'components/liquid-glass/../surface.css', 'components\\liquid-glass\\surface.css', 'components/liquid-glass/%2e%2e/surface.css', '~/surface.css', '@ui/surface.css', 'components/liquid-glass//surface.css', 'components/liquid-glass/.hidden/surface.css', 'components/liquid-glass/sur face.css', 'components/liquid-glass/surface.css\n', 'components/liquid-glass/dir./surface.css']) invalid(raw({ files: [{ ...input().files[0], target }] }), 'target');
  });
  it('rejects secret/config/package/reserved destinations and unsafe source paths', () => {
    for (const target of ['components/liquid-glass/.env', 'components/liquid-glass/.npmrc', 'components/liquid-glass/package.json', 'components/liquid-glass/credentials.json', 'components/liquid-glass/vite.config.ts', 'components/liquid-glass/tsconfig.json', 'components/liquid-glass/NUL.css', 'components/liquid-glass/__proto__/surface.css', 'components/liquid-glass/node_modules/surface.css']) invalid(raw({ files: [{ ...input().files[0], target }] }));
    invalid(raw({ files: [{ ...input().files[0], path: '../secret.css' }] }), 'path');
  });
  it('rejects duplicate paths/targets including case-insensitive file collisions', () => {
    const file = input().files[0]; invalid(raw({ files: [file, { ...file, path: 'registry/other.css' }] }), 'files'); invalid(raw({ files: [file, { ...file, path: file.path.toUpperCase(), target: 'components/liquid-glass/other.css' }] }), 'files'); invalid(raw({ files: [file, { ...file, path: 'registry/other.css', target: file.target.toUpperCase() }] }), 'files');
  });
  it('requires inline nonempty content and compatible explicit file types/extensions', () => {
    for (const content of ['', ' \n\t ', undefined]) invalid(raw({ files: [{ ...input().files[0], content }] }), 'content');
    invalid(raw({ files: [{ ...input().files[0], target: 'components/liquid-glass/surface.ts' }] }), 'type'); invalid(raw({ files: [{ ...input().files[0], type: 'registry:ui' }] }), 'type'); invalid(raw({ files: [{ path: 'registry/own/script.exe', target: 'src/lib/liquid-glass/script.exe', content: 'binary', type: 'registry:file' }] }), 'type');
  });
  it('bounds file count, UTF-8 source size and aggregate source before producing a payload', () => {
    const file = input().files[0]; invalid(raw({ files: [] }), 'files'); invalid(raw({ files: Array(33).fill(file) }), 'files'); invalid(raw({ files: [{ ...file, content: 'x'.repeat(65537) }] }), 'content');
    expect(createGlassRegistryItem(input({ files: [{ ...file, content: '🌈'.repeat(16384) }] }), policy).files).toHaveLength(1); invalid(raw({ files: [{ ...file, content: '🌈'.repeat(16385) }] }), 'content');
    const files = Array.from({ length: 5 }, (_, index) => ({ ...file, path: `registry/own/file-${index}.css`, target: `components/liquid-glass/file-${index}.css`, content: 'x'.repeat(65536) })); invalid(raw({ files }), 'content');
  });
  it('rejects NUL/unpaired surrogate content and bounds escaped serialized payload independently', () => {
    const file = input().files[0]; for (const content of ['.x{}\0', '\ud800', '\udc00']) invalid(raw({ files: [{ ...file, content }] }), 'content');
    const files = Array.from({ length: 4 }, (_, index) => ({ ...file, path: `registry/own/file-${index}.css`, target: `components/liquid-glass/file-${index}.css`, content: '\u0001'.repeat(60000) })); invalid(raw({ files }), 'item');
  });
  it('requires exact npm versions with separate runtime/dev classification and rejects aliases/flags/URLs', () => {
    const item = createGlassRegistryItem(input({ dependencies: ['@wpsydev/liquid-glass@0.23.0-preview.1', 'react@19.0.0'], devDependencies: ['typescript@7.0.2'] }), policy); expect(item.dependencies).toHaveLength(2); expect(item.devDependencies).toEqual(['typescript@7.0.2']);
    for (const dependency of ['react', 'react@latest', 'react@^19.0.0', 'react@>=19.0.0', 'react@npm:other@1.0.0', 'https://example.com/package.tgz', 'react@git+https://example.com/x', '--ignore-scripts', 'react@01.0.0', 'react@1.0.0-01']) invalid(raw({ dependencies: [dependency] }), 'dependencies');
  });
  it('rejects duplicate conflicting package declarations within/across runtime and dev dependencies', () => { invalid(raw({ dependencies: ['react@19.0.0', 'react@18.0.0'] }), 'dependencies'); invalid(raw({ dependencies: ['react@19.0.0'], devDependencies: ['react@19.0.0'] }), 'devDependencies'); });
  it('supports explicit registry namespaces, pinned GitHub refs and credential-free HTTPS JSON addresses', () => {
    const values = ['@acme/original-widget', 'owner/repo/original-widget#v1.2.3', `owner/repo/original-widget#${'a'.repeat(40)}`, 'https://example.com/r/original-widget.json']; const item = createGlassRegistryItem(input({ registryDependencies: values }), policy); expect(item.registryDependencies).toHaveLength(4);
  });
  it('rejects implicit bare refs, unpinned GitHub/local refs, credentials, encoded/query/private tokens and traversal URLs', () => {
    for (const reference of ['button', 'owner/repo/widget', 'owner/repo/widget#main', 'owner/../widget#v1.0.0', './widget.json', 'http://example.com/r/widget.json', 'https://user:password@example.com/r/widget.json', 'https://example.com/r/widget.json?token=secret', 'https://example.com/r/widget.json#secret', 'https://example.com/r/%2e%2e/widget.json', 'https://example.com/r/../widget.json']) invalid(raw({ registryDependencies: [reference] }), 'registryDependencies');
  });
  it('validates optional library version/import metadata against only the host-declared export snapshot', () => {
    const meta = { glass: { version: '0.23.0-preview.1', imports: ['@wpsydev/liquid-glass/material.css'], provenance: 'repository-release' }, license: 'MIT', ownership: 'Original caller-owned source' }; const item = createGlassRegistryItem(input({ meta }), policy); expect(item.meta?.glass).toEqual(meta.glass);
    invalid(raw({ meta: { glass: { ...meta.glass, imports: ['@wpsydev/liquid-glass/planned-module'] } } }), 'imports'); invalid(raw({ meta: { glass: { ...meta.glass, version: 'latest' } } }), 'version'); invalid(raw({ meta: { glass: { ...meta.glass, provenance: 'guaranteed-published' } } }), 'provenance');
    const newerPolicy = { ...policy, availableExports: [...policy.availableExports!, '@wpsydev/liquid-glass/host-declared-future'] }; expect(createGlassRegistryItem(input({ meta: { glass: { ...meta.glass, imports: ['@wpsydev/liquid-glass/host-declared-future'] } } }), newerPolicy).meta).toBeDefined();
  });
  it('does not infer publication or permit unsafe package import paths in availableExports metadata', () => {
    expect(validateGlassRegistryItem(raw(), { ...policy, availableExports: ['@wpsydev/liquid-glass/../secret'] }).valid).toBe(false);
    expect(createGlassRegistryItem(input(), policy).meta).toBeUndefined(); expect(validateGlassRegistryItem(raw({ meta: { glass: { version: '1.0.0', imports: ['@wpsydev/liquid-glass/material.css'], provenance: 'npm-reference' } } }), { targetRoots: policy.targetRoots }).valid).toBe(false);
  });
  it('rejects unknown powerful upstream fields and a mismatched/missing schema in validation', () => { for (const field of ['envVars', 'tailwind', 'css', 'font', 'extends']) invalid(raw({ [field]: {} }), field); invalid({ ...input() }, '$schema'); invalid(raw({ $schema: 'https://example.com/custom-schema.json' }), '$schema'); });
  it('rejects prototype keys/accessors without invoking user getters/toJSON hooks', () => {
    let calls = 0; const dangerous = raw(); Object.defineProperty(dangerous, 'files', { enumerable: true, get() { calls++; return []; } }); invalid(dangerous, 'files'); expect(calls).toBe(0);
    const meta: Record<string, unknown> = {}; Object.defineProperty(meta, 'theme', { enumerable: true, get() { calls++; return 'dark'; } }); invalid(raw({ meta }), 'theme'); expect(calls).toBe(0);
    invalid(raw({ meta: JSON.parse('{"__proto__":{"polluted":true}}') })); invalid(raw({ meta: { constructor: {} } })); invalid(raw({ meta: { toJSON() { calls++; return {}; } } })); expect(calls).toBe(0); expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('rejects accessor array slots, sparse/custom arrays and exotic non-JSON metadata objects', () => {
    let calls = 0; const files = [input().files[0]]; Object.defineProperty(files, '0', { enumerable: true, get() { calls++; return input().files[0]; } }); invalid(raw({ files })); expect(calls).toBe(0); invalid(raw({ files: Array(1) }));
    const custom = [input().files[0]]; Object.assign(custom, { custom: true }); invalid(raw({ files: custom })); for (const meta of [new Date(), new Map(), { number: NaN }, { symbol: Symbol('x') }, { bigint: 1n }]) invalid(raw({ meta }));
  });
  it('bounds recursive metadata strings/depth/values/bytes and rejects cycles predictably', () => {
    invalid(raw({ meta: { text: 'x'.repeat(4001) } })); let deep: GlassRegistryJson = 'end'; for (let index = 0; index < 7; index++) deep = { next: deep }; invalid(raw({ meta: { deep } }));
    const cycle: Record<string, unknown> = {}; cycle.self = cycle; invalid(raw({ meta: cycle })); invalid(raw({ meta: { texts: Array(5).fill('x'.repeat(4000)) } })); invalid(raw({ meta: { fields: Array(65).fill(null) } }));
  });
  it('requires stable safe names, bounded descriptors/categories and a supported subset type', () => {
    for (const itemName of ['', 'Glass Surface', '../glass', '__proto__', 'glass--surface', 'x'.repeat(65)]) invalid(raw({ name: itemName }), 'name'); invalid(raw({ type: 'registry:font' }), 'type'); invalid(raw({ title: 'x'.repeat(121) }), 'title'); invalid(raw({ categories: ['glass', 'glass'] }), 'categories');
  });
  it('reports a frozen bounded first issue and builder errors without exposing source content', () => {
    const value = raw({ files: [{ ...input().files[0], target: '../private-secret.css', content: 'never print secret contents' }] }); const validation = validateGlassRegistryItem(value, policy); expect(validation.valid).toBe(false); if (!validation.valid) { expect(Object.isFrozen(validation.issues)).toBe(true); expect(validation.issues).toHaveLength(1); expect(JSON.stringify(validation)).not.toContain('never print secret contents'); }
    expect(() => createGlassRegistryItem(input({ name: 'bad name' }), policy)).toThrow(RangeError);
  });
});
