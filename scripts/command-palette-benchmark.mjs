/** Actual native dialog/controller fixture; synchronous work, not rendering FPS. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const r=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/command-palette.ts'),name:'GlassPaletteBenchmark',formats:['iife']}}});
const code=(Array.isArray(r)?r[0]:r).output.find(x=>x.type==='chunk').code,css=await readFile('src/command-palette.css','utf8');
const metadata={js:{rawBytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).byteLength,sourceSha256:createHash('sha256').update(await readFile('src/command-palette.ts')).digest('hex')},css:{rawBytes:Buffer.byteLength(css),gzipBytes:gzipSync(css).byteLength},scope:'Five 30-cycle mount/open/query/update/destroy batches with 1000 commands and maxResults20. Native modal/focus and any synchronous browser work forced by these APIs are included. Excludes frame progression/paint/compositing/FPS, network and host execution. No comparative speedup.'};
const run=function(){
 const commands=Array.from({length:1000},(_,i)=>({id:`command-${i}`,label:`Command ${i}`,description:'A local host action',group:`Group ${i%5}`}));
 const batches=[];for(let b=0;b<5;b++){
  const host=document.createElement('div');document.body.append(host);let raf=0,rect=0,maxRows=0;
  const originals={raf:window.requestAnimationFrame,rect:Element.prototype.getBoundingClientRect};
  window.requestAnimationFrame=function(cb){raf++;return originals.raf.call(this,cb)};Element.prototype.getBoundingClientRect=function(){rect++;return originals.rect.call(this)};
  const start=performance.now();try{for(let i=0;i<30;i++){const c=GlassPaletteBenchmark.mountGlassCommandPalette(host,{commands,maxResults:20,onSelect:()=>{}});c.open();maxRows=Math.max(maxRows,host.querySelectorAll('[role=option]').length);const input=host.querySelector('input');input.value='command 99';input.dispatchEvent(new Event('input'));maxRows=Math.max(maxRows,host.querySelectorAll('[role=option]').length);c.updateCommands(commands);maxRows=Math.max(maxRows,host.querySelectorAll('[role=option]').length);c.destroy()}}
  finally{window.requestAnimationFrame=originals.raf;Element.prototype.getBoundingClientRect=originals.rect;host.remove()}
  batches.push({operations:30,commands:1000,maxResults:20,maxRenderedRows:maxRows,mountQueryUpdateDestroyMs:performance.now()-start,customRafRequests:raf,rectangleReads:rect});
 }
 return{observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},batches};
};
await writeFile('/tmp/lg-palette-benchmark.html',`<!doctype html><meta charset="utf-8"><title>Command palette lifecycle benchmark</title><style>${css}</style><h1>Scoped lifecycle work</h1><script>${code}\nwindow.runPaletteBenchmark=${run.toString()};</script>`);await writeFile('benchmarks/command-palette-payload.json',JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata));
