/** Bundle the optional pure reversible model only; no demo delay/render costs. */
import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result = await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:'src/reversible-action.ts',name:'ReversibleBenchmark',formats:['iife']}}});
const js = (Array.isArray(result) ? result[0] : result).output.find(file => file.type === 'chunk').code;
await writeFile('/tmp/lg-reversible-helper.iife.js', js);
const payload = {scope:'Optional pure model only; no DOM/controller CSS/default runtime growth',bytes:Buffer.byteLength(js),gzipBytes:gzipSync(js).length,sourceSHA256:createHash('sha256').update(await readFile('src/reversible-action.ts')).digest('hex')};
await writeFile('/tmp/lg-reversible-payload.json', JSON.stringify(payload,null,2));
console.log(JSON.stringify(payload));
