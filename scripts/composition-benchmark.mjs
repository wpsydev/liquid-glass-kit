/** Pure props generation and optional payload; not browser rendering speed. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { getGlassCompositionProps } from '../dist/composition.js';
const buildResult = await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/composition.ts'),name:'GlassComposition',formats:['iife']}}});
const js=(Array.isArray(buildResult)?buildResult[0]:buildResult).output.find(x=>x.type==='chunk').code;
const css=await readFile('dist/composition.css');
let checksum=0;
const layouts=['split','stack','cluster','grid'];
function run(i){const p=getGlassCompositionProps({layout:layouts[i%4],ratio:i%2?'2:1':'1:2',density:i%2?'compact':'editorial',measure:30+i%61});checksum+=JSON.stringify(p).length;}
for(let i=0;i<1000;i++)run(i);
const samples=[];for(let r=0;r<25;r++){const start=performance.now();for(let i=0;i<10000;i++)run(i);samples.push((performance.now()-start)/10000);}
const sorted=[...samples].sort((a,b)=>a-b);
const result={observedAtUtc:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,operation:'Generate and serialize all intrinsic composition props with rotating layouts/ratios/densities/measures',warmup:1000,rounds:25,operationsPerRound:10000,msPerOperation:samples,medianMs:sorted[12],p95BatchMeanMs:sorted[23],checksum,payload:{jsRawBytes:Buffer.byteLength(js),jsGzipBytes:gzipSync(js).length,cssRawBytes:css.length,cssGzipBytes:gzipSync(css).length,sourceSha256:createHash('sha256').update(await readFile('src/composition.ts')).digest('hex')},scope:'Node pure props generation/serialization only; p95 is normalized batch mean, not single-call tail. No browser paint/layout/FPS/network or comparative speedup claim. Generate props before client load for zero helper client JS. CSS layout/reflow still costs browser work.'};
await writeFile('benchmarks/composition.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({medianMs:result.medianMs,payload:result.payload}));
