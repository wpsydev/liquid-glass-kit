/** Reproduce optional-renderer payload deltas; never measures GPU or page loading. */
import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const root = process.cwd(), baselineRef = process.argv[2] ?? '583a8fd1a8ea3592efca450599030a7d1c668a38';
if (!/^[a-f0-9]{7,40}$/.test(baselineRef)) throw new Error('Provide a local hexadecimal baseline commit');
const baselineCommit = execFileSync('git', ['rev-parse', `${baselineRef}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
const output = process.argv[3] ?? 'benchmarks/scene-edge-payload-comparison.json';
const hash = value => createHash('sha256').update(value).digest('hex');
const cache = new Map();
const sourceAtBaseline = path => {
  if (!cache.has(path)) cache.set(path, execFileSync('git', ['show', `${baselineCommit}:${path}`], { cwd: root, encoding: 'utf8' }));
  return cache.get(path);
};
// Every loaded source module is read at the baseline, not just the entry file.
// Resolved paths stay local; this read-only fixture does not checkout/mutate Git.
const baselinePlugin = { name: 'edge-baseline-source', enforce: 'pre', load(id) {
  const path = relative(root, id.split('?')[0]).split(sep).join('/');
  if (path.startsWith('src/') && path.endsWith('.ts')) return sourceAtBaseline(path);
} };
const buildCode = async (entry, before, format = 'iife') => {
  const result = await build({ root, configFile: false, logLevel: 'silent', plugins: before ? [baselinePlugin] : [], build: {
    write: false, minify: true, target: 'es2022', lib: { entry: resolve(root, entry), name: 'EdgePayload', formats: [format] },
  } });
  const chunks = (Array.isArray(result) ? result[0] : result).output.filter(item => item.type === 'chunk');
  if (chunks.length !== 1) throw new Error('Fixture requires one standalone chunk');
  return chunks[0].code;
};
const measure = code => ({ bytes: Buffer.byteLength(code), gzipBytes: gzipSync(code).length, bundleSHA256: hash(code) });
const require = createRequire(import.meta.url);
const result = {
  baselineCommit, baselineVersion: JSON.parse(sourceAtBaseline('package.json')).version,
  scope: 'Identical standalone minified IIFE builds of optional modules. Legacy remains the default but ships optional pixel code. Not default core, loading time or GPU work.',
  configuration: { target: 'es2022', minify: true, format: 'iife', globalName: 'EdgePayload', gzipLevel: 'Node default', vite: require('vite/package.json').version, node: process.version },
  modules: {}, sources: {}, legacyShaderHashes: {}, ssr: {},
};
for (const [name, entry] of Object.entries({ scene: 'src/scene.ts', texture: 'src/scene-texture.ts' })) {
  const before = measure(await buildCode(entry, true)), after = measure(await buildCode(entry, false));
  result.modules[name] = { entry, before, after, delta: { bytes: after.bytes - before.bytes, gzipBytes: after.gzipBytes - before.gzipBytes,
    rawPercent: 100 * (after.bytes - before.bytes) / before.bytes, gzipPercent: 100 * (after.gzipBytes - before.gzipBytes) / before.gzipBytes } };
  // Node import with no browser document/window proves import safety, not mounting.
  const code = await buildCode(entry, false, 'es');
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  result.ssr[name] = { window: typeof globalThis.window, document: typeof globalThis.document, exportedController: typeof module[name === 'scene' ? 'attachGlassScene' : 'attachGlassSceneTexture'] };
}
for (const entry of ['src/scene.ts', 'src/scene-shaders.ts', 'src/scene-texture.ts']) result.sources[entry] = {
  beforeSHA256: hash(sourceAtBaseline(entry)), afterSHA256: hash(await readFile(entry)),
};
const shaders = [];
for (const before of [true, false]) {
  const code = await buildCode('src/scene-shaders.ts', before, 'es');
  shaders.push(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`));
}
for (const [name, value] of Object.entries(shaders[0])) if (typeof value === 'string') {
  const beforeSHA256 = hash(value), afterSHA256 = hash(shaders[1][name]);
  result.legacyShaderHashes[name] = { beforeSHA256, afterSHA256, equal: beforeSHA256 === afterSHA256 };
}
result.baselineLoadedModules = [...cache.keys()].filter(path => path.startsWith('src/')).sort();
result.costBoundary = 'Pixel optics add derivative/coverage instructions and conservative quad padding; extra covered fragments can be shaded. No completed GPU timing, render-time speedup or no-cost quality claim. Lazy source construction does not remove shipped bytes.';
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ output, baselineCommit, modules: result.modules, ssr: result.ssr, legacyShaderHashesEqual: Object.values(result.legacyShaderHashes).every(item => item.equal) }, null, 2));
