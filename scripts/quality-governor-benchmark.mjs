import { build } from 'vite';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFile, writeFile } from 'node:fs/promises';
import { createGlassQualityGovernor } from '../src/quality-governor.ts';
const core=await readFile(new URL('../src/quality-governor.ts',import.meta.url));
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:'oxc',lib:{entry:'src/quality-governor.ts',name:'GlassQuality',formats:['iife']}}});
const chunk=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk');
const code=Buffer.from(chunk.code);
const options={levels:['economy','balanced','full'],kind:'frame-cadence',targetMs:16.67};
function batch(count=2000){const g=createGlassQualityGovernor(options);const start=performance.now();for(let i=0;i<count;i++)g.sample({kind:'frame-cadence',milliseconds:i%300<150?28:7,time:i*17,visible:true,valid:true});return performance.now()-start;}
for(let i=0;i<20;i++)batch();
const times=Array.from({length:100},()=>batch()).sort((a,b)=>a-b);
const cadence=createGlassQualityGovernor(options), gpu=createGlassQualityGovernor({...options,kind:'gpu-elapsed'});
const sample={kind:'frame-cadence',milliseconds:16,time:0,visible:true,valid:true};
const contract={cadence:cadence.sample(sample),wrongKind:gpu.sample(sample),gpu:gpu.sample({...sample,kind:'gpu-elapsed',time:17}),independent:cadence.state};
const report={schema:1,sourceSha256:createHash('sha256').update(core).digest('hex'),environment:{node:process.version,platform:process.platform,arch:process.arch},payload:{standaloneMinifiedBytes:code.length,gzipBytes:gzipSync(code,{level:9}).length,sha256:createHash('sha256').update(code).digest('hex'),scope:'one optional zero-dependency IIFE entry, not npm package or a network/load-time measurement'},cpu:{batches:100,samplesPerBatch:2000,warmupBatches:20,medianBatchMs:times[50],p95BatchMs:times[95],medianMicrosecondsPerSample:times[50]*1000/2000,scope:'pure governor.sample synchronous CPU, including strict input copies/frozen decisions, excludes create/DOM/Canvas/RAF/layout/paint/GPU'},timingKindContract:contract,claims:'No GPU elapsed queries, FPS or automatic rendering speedup inferred'};
await writeFile('benchmarks/quality-governor-payload.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
