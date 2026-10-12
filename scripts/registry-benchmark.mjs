import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: true, target: 'es2022', lib: { entry: resolve('src/registry.ts'), formats: ['es'] } } });
const code = (Array.isArray(result) ? result[0] : result).output.find(entry => entry.type === 'chunk').code;
const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const source = '.example { padding: 20px; border-radius: 22px; }\n/* ' + 'original benchmark fixture '.repeat(40) + ' */\n';
const policy = { targetRoots: ['components/liquid-glass'], availableExports: ['@wpsydev/liquid-glass/material.css'] };
function input(count) { return { name: 'benchmark-surface', type: 'registry:style', title: 'Original fixture', files: Array.from({ length: count }, (_, i) => ({ path: `registry/styles/surface-${i}.css`, target: `components/liquid-glass/surface-${i}.css`, type: 'registry:style', content: source })), meta: { glass: { version: '0.25.0-preview.1', imports: ['@wpsydev/liquid-glass/material.css'], provenance: 'repository-release' } } }; }
const records = [];
for (const count of [1, 32]) {
  const draft = input(count); let characters = 0;
  function cycle() { const item = api.createGlassRegistryItem(draft, policy); const json = JSON.stringify(item); const checked = api.validateGlassRegistryItem(JSON.parse(json), policy); if (!checked.valid || checked.item.files.length !== count) throw Error('Invalid benchmark result'); characters += json.length; }
  for (let i = 0; i < 100; i++) cycle();
  const batches = [];
  for (let i = 0; i < 25; i++) { const start = performance.now(); for (let j = 0; j < 200; j++) cycle(); batches.push(performance.now() - start); }
  const sorted = [...batches].sort((a,b) => a-b);
  records.push({ files: count, contentBytesPerFile: Buffer.byteLength(source), warmup: 100, batches: 25, operationsPerBatch: 200, batchTimesMs: batches, medianNormalizedBatchMs: sorted[12]/200, p95NormalizedBatchMs: sorted[23]/200, serializedCharactersIncludingWarmup: characters });
}
const report = { observedAtUtc: new Date().toISOString(), runtime: process.version, workload: 'Create item, serialize, parse and validate against explicit host policy', measurements: records, payload: { jsRawBytes: Buffer.byteLength(code), jsGzipBytes: gzipSync(code).length, sourceSha256: createHash('sha256').update(await readFile('src/registry.ts')).digest('hex') }, scope: 'Warmed Node pure-data workload. Normalized batch percentiles are not individual-call tails. Excludes browser rendering, filesystem, install, network and source review; no comparative speedup or source-code safety claim.' };
await writeFile('benchmarks/registry.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ payload: report.payload, measurements: records.map(({ files, medianNormalizedBatchMs, p95NormalizedBatchMs }) => ({ files, medianNormalizedBatchMs, p95NormalizedBatchMs })) }));
