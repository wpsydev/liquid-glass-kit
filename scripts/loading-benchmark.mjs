#!/usr/bin/env node
/** Package payload audit, not a network, LCP, INP or page-load-time benchmark. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve, relative, join } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';
import { parseSync } from 'rolldown/utils';
import { build } from 'vite';

const flag = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
if (process.argv.includes('--help')) {
  console.log('Usage: node scripts/loading-benchmark.mjs --baseline /path/to/0.11-package [--out benchmarks/loading-package.json]\nBaseline contains package.json and dist/ from the verified 0.11 release archive. Build current package first. Reports static ESM graphs, per-file compressed byte sums and identical tree-shaken consumers; no simulated network timings.');
  process.exit(0);
}
const baseline = resolve(flag('--baseline') || '/tmp/lg-loading-baseline'), current = resolve('.');
const bytes = data => ({ raw: Buffer.byteLength(data), gzip: gzipSync(data, { level: 9 }).length, brotli: brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length });
async function graph(root, entry) {
  const files = new Map(), external = new Set();
  async function walk(path) {
    if (files.has(path)) return;
    const code = await readFile(path, 'utf8'); files.set(path, bytes(code));
    const parsed = parseSync(path, code); if (parsed.errors.length) throw new Error(`Invalid module ${path}`);
    for (const node of parsed.program.body) {
      const specifier = node.source?.value;
      if (!specifier) continue;
      if (specifier.startsWith('.')) await walk(resolve(dirname(path), specifier));
      else external.add(specifier);
    }
  }
  await walk(resolve(root, 'dist', `${entry}.js`));
  const sums = { raw: 0, gzip: 0, brotli: 0 };
  for (const value of files.values()) for (const key of Object.keys(sums)) sums[key] += value[key];
  return { modules: files.size, ...sums, external: [...external].sort(), files: [...files].map(([path, sizes]) => ({ path: relative(root, path), ...sizes })) };
}
async function consumer(root, entry, symbol, name) {
  const path = `/tmp/lg-loading-consumer-${name}.js`;
  await writeFile(path, `export { ${symbol} } from ${JSON.stringify(resolve(root, 'dist', `${entry}.js`))};\n`);
  const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: true, sourcemap: false, target: 'es2022', lib: { entry: path, name: 'LoadingConsumer', formats: ['iife'] } } });
  const code = (Array.isArray(result) ? result[0] : result).output.find(value => value.type === 'chunk').code;
  return { ...bytes(code), sha256: createHash('sha256').update(code).digest('hex') };
}
async function sourceHash(path = 'src', prefix = '') {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await sourceHash(join(path, entry.name), `${name}/`));
    else if (/\.(tsx?|css)$/.test(name)) files.push(name);
  }
  return files.sort();
}
const hash = createHash('sha256');
for (const name of await sourceHash()) hash.update(name).update('\0').update(await readFile(join('src', name))).update('\0');
const report = {
  schema: 1,
  scope: 'Static reachable library ESM files without consumer tree shaking. Compression is the sum of each file compressed independently (gzip level 9 / Brotli quality 11), excluding HTTP headers, app code and optional peer frameworks. Dynamic imports excluded until invoked. Byte changes are not measured network or page-load-time changes.',
  environment: { node: process.version, platform: process.platform, rolldown: JSON.parse(await readFile('node_modules/rolldown/package.json')).version },
  currentSourceSha256: hash.digest('hex'),
  baselineVersion: JSON.parse(await readFile(join(baseline, 'package.json'))).version,
  currentVersion: JSON.parse(await readFile('package.json')).version,
  baseline: {}, current: {}, consumers: {}, css: {},
};
if (report.baselineVersion !== '0.11.0-preview.1') throw new Error('Expected the frozen 0.11 release package');
for (const entry of ['index', 'react', 'vue', 'element', 'scene']) report.baseline[entry] = await graph(baseline, entry);
for (const entry of ['index', 'react', 'vue', 'element', 'scene', 'material', 'dom', 'capabilities', 'motion', 'indicator', 'scroll-edge', 'overlay', 'micro-motion', 'optics', 'lazy']) report.current[entry] = await graph(current, entry);
for (const [entry, symbol] of [['index', 'getGlassProps'], ['index', 'attachGlass'], ['index', 'attachGlassTransition'], ['scene', 'attachGlassScene']]) {
  const before = await consumer(baseline, entry, symbol, `baseline-${symbol}`), after = await consumer(current, entry, symbol, `current-${symbol}`);
  report.consumers[symbol] = { before, after, identical: before.sha256 === after.sha256 };
}
for (const entry of ['styles', 'material', 'motion', 'indicator', 'scroll-edge']) report.css[entry] = bytes(await readFile(`dist/${entry}.css`));
report.css.baselineStyles = bytes(await readFile(join(baseline, 'dist/styles.css')));
report.css.aggregateByteIdentical = (await readFile('dist/styles.css')).equals(await readFile(join(baseline, 'dist/styles.css')));
const output = resolve(flag('--out') || 'benchmarks/loading-package.json');
await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ baseline: report.baseline.index, narrowMaterial: report.current.material, beforeReact: report.baseline.react, afterReact: report.current.react, lazy: report.current.lazy, css: report.css, consumers: report.consumers }, null, 2));
