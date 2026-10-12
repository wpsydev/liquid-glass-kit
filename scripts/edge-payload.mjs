/** Optional renderer payload only; no shader/GPU timing or core CSS growth claim. */
import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const entries={scene:'src/scene.ts',texture:'src/scene-texture.ts'},payload={scope:'Standalone optional experimental renderers, including their existing shader strings and trusted texture receiver; not the default CSS/core entry',modules:{}};
for(const [name,entry]of Object.entries(entries)){
 const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry,name:'EdgePayload',formats:['iife']}}});
 const js=(Array.isArray(result)?result[0]:result).output.find(item=>item.type==='chunk').code;
 payload.modules[name]={bytes:Buffer.byteLength(js),gzipBytes:gzipSync(js).length,sourceSHA256:createHash('sha256').update(await readFile(entry)).digest('hex')};
}
payload.shaderSHA256=createHash('sha256').update(await readFile('src/scene-shaders.ts')).digest('hex');
await writeFile('/tmp/lg-edge-payload.json',JSON.stringify(payload,null,2));console.log(JSON.stringify(payload));
