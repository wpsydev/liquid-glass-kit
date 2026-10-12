/** Optional task props payload; outputs a standalone native browser fixture, never shared dist. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/task-progress.ts'),name:'GlassTaskProgress',formats:['iife']}}});
const js=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk').code,css=await readFile('src/task-progress.css');
const evidence={observedAtUtc:new Date().toISOString(),target:'es2022',format:'standalone minified IIFE',jsRawBytes:Buffer.byteLength(js),jsGzipBytes:gzipSync(js).length,cssRawBytes:css.length,cssGzipBytes:gzipSync(css).length,sourceSha256:createHash('sha256').update(await readFile('src/task-progress.ts')).digest('hex'),cssSha256:createHash('sha256').update(css).digest('hex'),scope:'Optional pure props helper only. CSS excludes prerequisite material.css. Not a comparative speedup, task executor, progress controller or CSS/GPU paint measurement.'};
await mkdir('benchmarks',{recursive:true});await writeFile('benchmarks/task-progress-payload.json',JSON.stringify(evidence,null,2)+'\n');
await writeFile('/tmp/lg-task-progress-probe.html','<!doctype html><html><head><meta charset="utf-8"><style>'+css.toString()+'</style></head><body><main id="fixture"></main><script>'+js.replaceAll('</script','<\\/script')+'</script></body></html>');
console.log(JSON.stringify(evidence));

