/** Standalone illustration helper bytes, separate from the demo/artwork/rendering. */
import { build } from 'vite';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const hash = value => createHash('sha256').update(value).digest('hex');
const require = createRequire(import.meta.url);
const config = { target: 'es2022', minify: true, format: 'iife', globalName: 'IllustrationPayload', vite: require('vite/package.json').version, node: process.version };
async function code(format) {
  const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: true, target: config.target,
    lib: { entry: 'src/illustration.ts', name: config.globalName, formats: [format] },
  } });
  const chunks = (Array.isArray(result) ? result[0] : result).output.filter(item => item.type === 'chunk');
  if (chunks.length !== 1) throw new Error('Expected one standalone optional helper chunk');
  return chunks[0].code;
}
const js = await code('iife'), esm = await code('es');
const module = await import(`data:text/javascript;base64,${Buffer.from(esm).toString('base64')}`);
const source = await readFile('src/illustration.ts');
const images = await readFile('src/responsive-image.ts');
const assets = [];
for (const name of (await readdir('site/illustrations/art')).filter(name => name.endsWith('.svg')).sort()) {
  const data = await readFile(`site/illustrations/art/${name}`); assets.push({ path: `site/illustrations/art/${name}`, bytes: data.length, sha256: hash(data) });
}
const output = {
  scope: 'Standalone optional pure illustration helper including native picture validation. Excludes demo, SVG bytes, CSS, image fetching/decoding/layout/painting. No comparative performance claim.',
  configuration: config,
  core: { entry: 'src/illustration.ts', bytes: Buffer.byteLength(js), gzipBytes: gzipSync(js).length, bundleSHA256: hash(js), sourceSHA256: hash(source), responsiveImageSourceSHA256: hash(images) },
  ssr: { window: typeof globalThis.window, document: typeof globalThis.document, helper: typeof module.getGlassIllustrationScene },
  authoredDemoAssets: { count: assets.length, totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0), files: assets, excludedFromCore: true },
  boundary: 'Frozen recipe construction is not image-rendering time. The helper installs no DOM/listeners/timers; host composition, native decoding and finite demo transitions have separate costs.',
};
await mkdir('benchmarks', { recursive: true });
await writeFile('benchmarks/illustration-payload.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
