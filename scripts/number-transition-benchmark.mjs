/** Standalone optional-entry payload and connected, explicit native benchmark. */
import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const entry = resolve('src/number-transition.ts');
const result = await build({ configFile: false, build: { write: false, minify: 'oxc', target: 'es2022', lib: { entry, formats: ['iife'], name: 'GlassNumber', fileName: () => 'number-transition.js' } } });
const bundle = Array.isArray(result) ? result[0] : result, code = bundle.output.find(item => item.type === 'chunk').code;
const sha = text => createHash('sha256').update(text).digest('hex');
await mkdir('benchmarks', { recursive: true }); await mkdir('.validation', { recursive: true });
const metadata = { schemaVersion: 1, source: 'src/number-transition.ts', sourceSHA256: sha(await readFile(entry)), measuredAt: new Date().toISOString(), bytes: Buffer.byteLength(code), gzipBytes: gzipSync(code).byteLength, bundleSHA256: sha(code), format: 'Standalone optional-entry minified IIFE. Not final package aggregate, load-time, paint or speedup evidence.', runtimeDependencies: 0 };
await writeFile('benchmarks/number-transition-payload.json', JSON.stringify(metadata, null, 2) + '\n');
const fixture = Array.from({ length: 8 }, (_, i) => '<article><h2>Actual local value ' + i + '</h2><strong id="v' + i + '">0</strong><p>Actual: <span id="s' + i + '">0</span></p><p id="a' + i + '" role="status" aria-atomic="true"></p></article>').join('');
const probe = await readFile('scripts/number-transition-browser-probe.js', 'utf8');
await writeFile('.validation/number-transition-probe.html', '<!doctype html><html lang="en"><meta charset="utf-8"><title>Finite number controller / scoped native probe</title><style>html{font:16px Arial;background:#ebeae4;color:#2a2e29}body{margin:24px}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}article{padding:12px;background:#f7f6f1;border:1px solid #bbc3b3;border-radius:8px}h1{font-size:24px}h2,p{font-size:12px}strong{font-size:30px}p{overflow-wrap:anywhere}#control{height:44px;font-size:16px}</style><h1>Explicit number-controller probe</h1><p>8 connected values. Synchronous quiet sets are separate from finite active presentation. No paint, GPU or speedup inference.</p><label for="control">Native host draft <input id="control" value="keep my draft"></label><main>' + fixture + '</main><script>' + code + '</script><script>' + probe + '</script></html>');
console.log(JSON.stringify(metadata));
