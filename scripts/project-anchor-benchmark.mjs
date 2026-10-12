/** Build only the optional pure projection helper for native browser evidence. */
import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:'src/project-anchor.ts',name:'AnchorBenchmark',formats:['iife']}}});
const js=(Array.isArray(result)?result[0]:result).output.find(item=>item.type==='chunk').code;
await writeFile('/tmp/lg-anchor-helper.iife.js',js);
const payload={scope:'Optional standalone projection math only, no renderer/DOM/CSS/default import growth',bytes:Buffer.byteLength(js),gzipBytes:gzipSync(js).length,sourceSHA256:createHash('sha256').update(await readFile('src/project-anchor.ts')).digest('hex')};
await writeFile('/tmp/lg-anchor-payload.json',JSON.stringify(payload,null,2));
console.log(JSON.stringify(payload));
