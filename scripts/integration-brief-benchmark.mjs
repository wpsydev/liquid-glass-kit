/** Original recipe generation, not agent execution/rendering. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile,writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { createGlassIntegrationBrief,listGlassPatterns } from '../dist/integration-brief.js';
const r=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/integration-brief.ts'),name:'GlassBrief',formats:['iife']}}});const code=(Array.isArray(r)?r[0]:r).output.find(x=>x.type==='chunk').code;
const cases=[{task:'Build a focused reading workspace',stack:'html'},{task:'Build a host-owned creative workspace with semantic native controls',stack:'nextjs',widgets:listGlassPatterns().map(p=>p.id),motion:'subtle',optics:'experimental-scene'}];
let checksum=0;const results=[];
for(const config of cases){const run=()=>{const brief=createGlassIntegrationBrief(config);checksum+=brief.markdown.length+JSON.stringify(brief.imports).length};for(let i=0;i<100;i++)run();const samples=[];for(let round=0;round<25;round++){const t=performance.now();for(let i=0;i<500;i++)run();samples.push((performance.now()-t)/500)}const sorted=[...samples].sort((a,b)=>a-b);results.push({config,msPerOperation:samples,medianMs:sorted[12],p95BatchMeanMs:sorted[23]})}
const result={observedAtUtc:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,operation:'Generate brief Markdown and serialize exact imports',warmupPerCase:100,roundsPerCase:25,operationsPerRound:500,results,checksum,payload:{rawBytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).length,sourceSha256:createHash('sha256').update(await readFile('src/integration-brief.ts')).digest('hex')},scope:'Node generation only, not agent implementation, indexing/discovery, renderer/FPS/network or comparative speedup. p95 is normalized batch mean; author briefs before client load.'};await writeFile('benchmarks/integration-brief.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({results:results.map(r=>({medianMs:r.medianMs,p95BatchMeanMs:r.p95BatchMeanMs})),payload:result.payload}));
