/** Rebuild the isolated read-only native layout-audit benchmark payload. */
import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const entry = resolve('src/layout-audit.ts');
const result = await build({ configFile: false, build: { write: false, minify: 'oxc', target: 'es2022', lib: { entry, formats: ['iife'], name: 'GlassLayoutAudit', fileName: () => 'layout-audit.js' } } });
const bundle = Array.isArray(result) ? result[0] : result;
const code = bundle.output.find(item => item.type === 'chunk').code;
const sha256 = text => createHash('sha256').update(text).digest('hex');
const metadata = { schemaVersion: 1, measuredAt: new Date().toISOString(), source: 'src/layout-audit.ts', sourceSHA256: sha256(await readFile(entry)), bundleBytes: Buffer.byteLength(code), bundleGzipBytes: gzipSync(code).byteLength, bundleSHA256: sha256(code), format: 'standalone minified IIFE; not published package aggregate', runtimeDependencies: 0, claims: ['Payload only. Not a load-time, paint, frame-rate, GPU or speedup benchmark.'] };
await mkdir('benchmarks', { recursive: true }); await mkdir('.validation', { recursive: true });
await writeFile('benchmarks/layout-audit-payload.json', JSON.stringify(metadata, null, 2) + '\n');
const fields = Array.from({ length: 32 }, (_, i) => '<label for="f' + i + '">Local field ' + (i + 1) + '<input id="f' + i + '" value="page-session draft" type="text"></label>').join('');
const probe = await readFile('scripts/layout-audit-browser-probe.js', 'utf8');
const html = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Scoped native layout-audit cost</title><style>html{font:16px Arial;background:#edf0ec;color:#2b404a}body{margin:0;padding:24px}main{max-width:1000px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}label{font:12px Arial;min-width:0}input{box-sizing:border-box;display:block;width:100%;height:44px;font-size:16px;margin-top:6px;border:1px solid #607781;border-radius:4px}h1{font:24px Arial}p{max-width:70ch}#result{white-space:pre-wrap;font:12px monospace}</style><h1>Scoped native layout-audit cost</h1><p>32 connected native fields. Five batches of twenty explicit calls; synchronous sampling and report allocation only. Paint and display refresh are outside this timing.</p><main id="probe-root">' + fields + '</main><pre id="result">Run window.__layoutAuditProbe()</pre><script>' + code + '</script><script>' + probe + '</script></html>';
await writeFile('.validation/layout-audit-probe.html', html); console.log(JSON.stringify(metadata));
