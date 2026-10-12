/** Build the optional auto-size helper and its native connected lifecycle probe. */
import { build } from 'vite';
import { writeFile, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result = await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:'src/auto-size.ts',name:'AutoSizeBenchmark',formats:['iife']}}});
const js = (Array.isArray(result)?result[0]:result).output.find(file=>file.type==='chunk').code;
await writeFile('/tmp/lg-auto-size-helper.iife.js',js);
const payload={scope:'Optional standalone controller including numeric/lifecycle helpers; no required CSS or default runtime growth',bytes:Buffer.byteLength(js),gzipBytes:gzipSync(js).length,sourceSHA256:createHash('sha256').update(await readFile('src/auto-size.ts')).digest('hex'),defaultRuntimeUntouched:true};
await writeFile('/tmp/lg-auto-size-payload.json',JSON.stringify(payload,null,2));console.log(JSON.stringify(payload));
