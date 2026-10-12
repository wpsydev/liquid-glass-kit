/** Optional follow payload and native fixture, never shared dist. */
import {build} from 'vite';
import {resolve} from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const r=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/follow.ts'),name:'GlassFollow',formats:['iife']}}});
const js=(Array.isArray(r)?r[0]:r).output.find(x=>x.type==='chunk').code;
const evidence={observedAtUtc:new Date().toISOString(),target:'es2022',format:'standalone minified IIFE',jsRawBytes:Buffer.byteLength(js),jsGzipBytes:gzipSync(js).length,sourceSha256:createHash('sha256').update(await readFile('src/follow.ts')).digest('hex'),scope:'Optional follow controller including numeric/lifecycle helper code, no CSS. Payload only, not real-task/GPU/paint or comparative speedup measurement.'};
await mkdir('benchmarks',{recursive:true});await writeFile('benchmarks/follow-payload.json',JSON.stringify(evidence,null,2)+'\n');
await writeFile('/tmp/lg-follow-probe.html','<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}#fixture{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:8px}.scope{height:100px;overflow:auto;border:1px solid #999;overflow-anchor:none}.content{display:flow-root}.content p{height:30px;margin:0;font:12px/30px sans-serif}</style></head><body><main id="fixture"></main><script>'+js.replaceAll('</script','<\\/script')+'</script></body></html>');console.log(JSON.stringify(evidence));

