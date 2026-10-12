/** Build only the optional field helper and an inspectable native-browser benchmark probe. */
import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, target: 'es2022', minify: true, lib: { entry: 'src/field.ts', name: 'FieldBenchmark', formats: ['iife'] } } });
const outputs = (Array.isArray(result) ? result[0] : result).output;
const js = outputs.find(file => file.type === 'chunk').code;
const css = await readFile('src/field.css', 'utf8');
const payload = { scope: 'Optional standalone field factory, not the full demo or default material runtime', helper: { bytes: Buffer.byteLength(js), gzipBytes: gzipSync(js).length, sourceSHA256: createHash('sha256').update(await readFile('src/field.ts')).digest('hex') }, css: { bytes: Buffer.byteLength(css), gzipBytes: gzipSync(css).length, sourceSHA256: createHash('sha256').update(css).digest('hex') }, includes: 'Pure validation, frozen props and text relationships; no DOM, network, renderer, runtime dependencies or controller' };
await writeFile('/tmp/lg-field-helper.iife.js', js);
await writeFile('/tmp/lg-field-payload.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload));
