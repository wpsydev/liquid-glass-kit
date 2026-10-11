/** Synchronous UI lifecycle fixture, not rendering/FPS. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const r=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/activity-island.ts'),name:'GlassIslandBenchmark',formats:['iife']}}});
const code=(Array.isArray(r)?r[0]:r).output.find(x=>x.type==='chunk').code;
const css=await readFile('src/activity-island.css','utf8');
const metadata={js:{rawBytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).byteLength,sourceSha256:createHash('sha256').update(await readFile('src/activity-island.ts')).digest('hex')},css:{rawBytes:Buffer.byteLength(css),gzipBytes:gzipSync(css).byteLength},scope:'Five batches of 100 mount/update/destroy operations over three host-supplied sessions. Plain connected host; actual widget CSS present. Timings cover synchronous DOM/controller work, not browser layout/paint/compositing, network, execution or page FPS. No comparative speedup claim.'};
const run=function(){
 const snapshot={activeSessionId:'app',sessions:[{id:'app',title:'Atlas',status:'attention',request:{kind:'permission',id:'p1',revision:1,title:'Run checks?',command:'npm run check'}},{id:'docs',title:'Docs',status:'working',summary:'Reviewing recipes'},{id:'art',title:'Art',status:'complete',summary:'Ready'}]};
 const batches=[];
 for(let b=0;b<5;b++){
  const host=document.createElement('div');document.body.append(host);
  const orig={raf:window.requestAnimationFrame,rect:Element.prototype.getBoundingClientRect};let raf=0,rect=0;
  window.requestAnimationFrame=function(c){raf++;return orig.raf.call(this,c)};Element.prototype.getBoundingClientRect=function(){rect++;return orig.rect.call(this)};
  const start=performance.now();
  try{for(let i=0;i<100;i++){const c=GlassIslandBenchmark.mountGlassActivityIsland(host,{snapshot,onAction:()=>{},onPrompt:()=>{}});c.open();c.update({sessions:snapshot.sessions.map(x=>({...x,usage:'42 tokens'})),activeSessionId:'app'});c.close();c.destroy()}}
  finally{window.requestAnimationFrame=orig.raf;Element.prototype.getBoundingClientRect=orig.rect;host.remove()}
  batches.push({operations:100,mountUpdateDestroyMs:performance.now()-start,customRafRequests:raf,rectangleReads:rect});
 }
 return{observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},batches};
};
await writeFile('/tmp/lg-island-benchmark.html',`<!doctype html><meta charset="utf-8"><title>Activity island lifecycle benchmark</title><style>${css}</style><h1>Scoped lifecycle work</h1><script>${code}\nwindow.runIslandBenchmark=${run.toString()};</script>`);
await writeFile('benchmarks/activity-island-payload.json',JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata));
