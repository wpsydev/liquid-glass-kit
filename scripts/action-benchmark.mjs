/** Standalone optional payload and connected native-controller lifecycle fixture.
 * Run with Node from repository root; native timings come from T3 separately.
 */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result = await build({ configFile:false, logLevel:'silent', build:{ write:false, minify:true, target:'es2022', lib:{ entry:resolve('src/action.ts'), name:'GlassActions', formats:['iife'] } } });
const js = (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk').code;
const payload = { observedAtUtc:new Date().toISOString(), jsRawBytes:Buffer.byteLength(js), jsGzipBytes:gzipSync(js).length, sourceSha256:createHash('sha256').update(await readFile('src/action.ts')).digest('hex'), scope:'Standalone optional native action helper; no required core growth. Payload only, not loading/FPS or comparative speedup.' };
await writeFile('benchmarks/action-payload.json', JSON.stringify(payload,null,2)+'\n');
const probe = await readFile('scripts/action-browser-probe.js','utf8');
const html = '<!doctype html><meta charset="utf-8"><title>Native action lifecycle fixture</title><button type="button" id="button-fixture"><span id="button-label">Run fixture</span></button><p id="button-status" role="status"></p><form id="form-fixture"><label>Title<input name="title" value="Original title" required></label><button type="submit" name="intent" value="queue"><span id="form-label">Queue fixture</span></button></form><p id="form-status" role="status"></p><script>'+js.replaceAll('</script','<\\/script')+'</script><script>'+probe.replaceAll('</script','<\\/script')+'</script>';
await writeFile('/tmp/lg-action-lifecycle.html',html); await writeFile('/tmp/lg-action-standalone.js',js);
console.log(JSON.stringify(payload));
