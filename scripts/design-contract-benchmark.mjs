/** Pure authoring generation cost; no browser rendering or network claim. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile,writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { createGlassDesignContract,parseGlassDesignContract } from '../dist/design-contract.js';
const r=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/design-contract.ts'),name:'GlassContract',formats:['iife']}}});const code=(Array.isArray(r)?r[0]:r).output.find(x=>x.type==='chunk').code;
const config={name:'Original studio',tokens:{colors:{background:'#f5f1e9',foreground:'#262922',primary:'#a34024'},fontFamily:'Georgia, serif',radius:14},material:{blur:16,appearance:'light'}};
let checksum=0;
function run(){const c=createGlassDesignContract(config);const md=c.toDesignMarkdown(),css=c.toThemeCSS(),json=c.toJSON();const p=parseGlassDesignContract(json);if(p.toDesignMarkdown()!==md||p.toThemeCSS()!==css)throw Error('roundtrip mismatch');checksum+=md.length+css.length+json.length;}
for(let i=0;i<100;i++)run();const samples=[];for(let round=0;round<25;round++){const start=performance.now();for(let i=0;i<500;i++)run();samples.push((performance.now()-start)/500)}const sorted=[...samples].sort((a,b)=>a-b);
const result={observedAtUtc:new Date().toISOString(),runtime:process.version,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model,config,operation:'Create typed contract, export DESIGN.md/CSS/JSON, parse own JSON, compare Markdown/CSS roundtrip',warmupOperations:100,rounds:25,operationsPerRound:500,msPerOperation:samples,medianMs:sorted[12],p95Ms:sorted[23],checksum,payload:{rawBytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).byteLength,sourceSha256:createHash('sha256').update(await readFile('src/design-contract.ts')).digest('hex')},scope:'Node authoring/generation only. Standalone optional bundle including shared material helpers. No rendering/FPS/network or comparison claim; generated artifacts can be produced before client load.'};await writeFile('benchmarks/design-contract.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({medianMs:result.medianMs,p95Ms:result.p95Ms,payload:result.payload}));
