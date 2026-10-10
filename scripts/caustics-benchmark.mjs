#!/usr/bin/env node
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'vite';
const files=(await readdir('src')).filter(f=>/\.(tsx?|css)$/.test(f)).sort(),digest=createHash('sha256');
for(const f of files)digest.update(f).update('\0').update(await readFile(join('src',f))).update('\0');
const source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:digest.digest('hex'),commitScope:'Parent at generation; source hash includes current working tree.',hashing:'Sorted src .ts/.tsx/.css filenames and bytes separated by NUL.'};
await writeFile('/tmp/lg-caustic-entry.ts',`export {attachGlassScene} from ${JSON.stringify(resolve('src/scene.ts'))};`);
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:'/tmp/lg-caustic-entry.ts',name:'CausticFixture',formats:['iife']}}});
const code=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk').code;
function runner(){
 const raf=()=>new Promise(r=>requestAnimationFrame(r)),round=n=>Math.round(n*10000)/10000;
 const summarize=a=>{if(!a.length)return null;const s=[...a].sort((a,b)=>a-b),m=Math.floor(s.length/2);return{count:s.length,median:round(s.length%2?s[m]:(s[m-1]+s[m])/2),p95:round(s[Math.ceil(s.length*.95)-1]),min:s[0],max:s.at(-1)};};
 
 function create(config){
  const host=document.createElement('div');host.style.cssText=`position:fixed;inset:0;width:${config.width}px;height:${config.height}px;pointer-events:none`;
  const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%';host.append(canvas);document.body.append(host);
  const surfaces=[];for(let i=0;i<6;i++){const e=document.createElement('div');e.style.cssText=`position:absolute;left:${config.width*(i%2?.54:.08)}px;top:${config.height*(.12+Math.floor(i/2)*.27)}px;width:${config.width*.35}px;height:${config.height*(i===1?.19:.10)}px`;host.append(e);surfaces.push({element:e,radius:i%2?40:28});}
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 unavailable');
  const debug=gl.getExtension('WEBGL_debug_renderer_info');const gpu=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'masked';
  // Controlled equal-topology ablation. Same shader math and triangle ordering;
  // baseline expands the identical float UV values instead of reusing an index.
  if(config.nonIndexed){
    const upload=gl.bufferData;
    gl.bufferData=function(target,data,usage){
      if(target===this.ARRAY_BUFFER && data instanceof Float32Array){
        const grid=Math.round(Math.sqrt(data.length/2)-1),stride=grid+1,expanded=new Float32Array(grid*grid*12);let cursor=0;
        for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
          const a=y*stride+x,b=a+1,c=a+stride,d=c+1;
          for(const index of [a,b,c,c,b,d]){expanded[cursor++]=data[index*2];expanded[cursor++]=data[index*2+1];}
        }
        return upload.call(this,target,expanded,usage);
      }
      return upload.call(this,target,data,usage);
    };
    gl.drawElementsInstanced=function(mode,count,type,offset,instances){return this.drawArraysInstanced(mode,0,count,instances);};
  }
  const scene=CausticFixture.attachGlassScene(canvas,{paused:true,reducedMotion:config.reducedMotion,reducedTransparency:config.solid,surfaces,backdrop:'mineral',maxDpr:1.5,maxPixels:900000,caustics:config.off?undefined:{resolution:config.grid,renderScale:config.scale,intensity:.14,depth:160,ripple:.72,speed:.85,light:[.65,.75]}});
  if(!scene.supported)throw Error('Shader/pipeline rejected');
  return{host,canvas,gl,gpu,scene,destroy(){scene.destroy();gl.getExtension('WEBGL_lose_context')?.loseContext();host.remove();}};
 }
 const configs=[
 {name:'non-indexed-40-half',grid:40,scale:.5,nonIndexed:true},
 {name:'indexed-40-half',grid:40,scale:.5},
 {name:'indexed-40-full',grid:40,scale:1},
 {name:'indexed-24-half',grid:24,scale:.5},
 {name:'indexed-64-half',grid:64,scale:.5},
 {name:'no-caustics',grid:40,scale:.5,off:true}
 ].map(c=>({...c,width:720,height:1280}));
 async function measure(config){const f=create(config),{scene,gl}=f,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending=[],raw={cpu:[],gpu:[],intervals:[]};let disjoint=0,skipped=0;
 function poll(){if(!ext||!pending.length)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint+=pending.length;pending.forEach(q=>gl.deleteQuery(q));pending.length=0;return;}while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=pending.shift();raw.gpu.push(round(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6));gl.deleteQuery(q);}}
 try{for(let i=0;i<16;i++){await raf();scene.render(i/60);}const start=await raf();let now=start,prev=start;while(now-start<1500){if(document.hidden)throw Error('Hidden preview');if(now>start)raw.intervals.push(round(now-prev));prev=now;poll();const q=ext&&pending.length<32?gl.createQuery():null;if(ext&&!q)skipped++;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const before=performance.now();scene.render((now-start)/1000);raw.cpu.push(round(performance.now()-before));if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}now=await raf();}for(let i=0;pending.length&&i<60;i++){await raf();poll();}const unanswered=pending.length;pending.forEach(q=>gl.deleteQuery(q));return{config,renderer:f.gpu,stats:scene.stats,queries:{disjoint,skipped,unanswered},timing:Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,summarize(v)])),raw};}finally{f.destroy();}
 }
 async function pixels(config,time=1.7){const f=create(config);try{f.scene.render(time);const a=new Uint8Array(f.canvas.width*f.canvas.height*4);f.gl.readPixels(0,0,f.canvas.width,f.canvas.height,f.gl.RGBA,f.gl.UNSIGNED_BYTE,a);return{bytes:a,stats:f.scene.stats,error:f.gl.getError()};}finally{f.destroy();}}

 window.causticResourcePass=()=>{
  const p=WebGL2RenderingContext.prototype, originals={},calls={},created={},deleted={};
  for(const key of ['drawArrays','drawArraysInstanced','drawElementsInstanced','bufferData','bufferSubData','texStorage2D','flush','getError','getParameter']){originals[key]=p[key];calls[key]=0;p[key]=function(...args){calls[key]++;return originals[key].apply(this,args);};}
  for(const kind of ['Program','Shader','Buffer','VertexArray','Texture','Framebuffer'])for(const operation of ['create','delete']){const key=operation+kind;originals[key]=p[key];const target=operation==='create'?created:deleted;target[kind]=0;p[key]=function(...args){if(operation==='create'||args[0])target[kind]++;return originals[key].apply(this,args);};}
  const bcr=Element.prototype.getBoundingClientRect;calls.layoutReads=0;Element.prototype.getBoundingClientRect=function(){calls.layoutReads++;return bcr.call(this);};
  const Float=window.Float32Array,Short=window.Uint16Array;calls.float32Bytes=0;calls.uint16Bytes=0;
  window.Float32Array=new Proxy(Float,{construct(target,args){const a=Reflect.construct(target,args);calls.float32Bytes+=a.byteLength;return a;}});
  window.Uint16Array=new Proxy(Short,{construct(target,args){const a=Reflect.construct(target,args);calls.uint16Bytes+=a.byteLength;return a;}});
  let f;
  try{f=create(configs[1]);const initialization={calls:{...calls},created:{...created},deleted:{...deleted}};for(const k in calls)calls[k]=0;f.scene.render(2);const steadyFrame={...calls},stats=f.scene.stats;f.destroy();f=null;const live=Object.fromEntries(Object.keys(created).map(k=>[k,created[k]-deleted[k]]));if(Object.values(live).some(n=>n!==0))throw Error('Owned GPU resources leaked');return{initialization,steadyFrame,stats,objects:{created,deleted,liveAfterDestroy:live},note:'Instrumented separate pass, excluded from timing. Explicit typed arrays and owned handles only; not all allocations or VRAM.'};}
  finally{f?.destroy();for(const [k,v]of Object.entries(originals))p[k]=v;Element.prototype.getBoundingClientRect=bcr;window.Float32Array=Float;window.Uint16Array=Short;}
 };
 window.validateCausticLifecycle=async()=>{
  const a=await pixels({...configs[1],reducedMotion:true},0),b=await pixels({...configs[1],reducedMotion:true},2),solid=await pixels({...configs[1],solid:true},2);let changed=0;for(let i=0;i<a.bytes.length;i++)if(a.bytes[i]!==b.bytes[i])changed++;
  const f=create(configs[1]),ext=f.gl.getExtension('WEBGL_lose_context');
  try{if(!ext)return{reducedMotionChangedBytes:changed,solid:solid.stats,contextRecovery:'extension unavailable'};
   const lost=new Promise(r=>f.canvas.addEventListener('webglcontextlost',()=>r(true),{once:true}));ext.loseContext();await lost;const lostStats=f.scene.stats,lostSupported=f.scene.supported;await new Promise(r=>setTimeout(r,200));const restored=new Promise(r=>f.canvas.addEventListener('webglcontextrestored',()=>r(true),{once:true}));ext.restoreContext();await restored;f.scene.render(1);return{reducedMotionChangedBytes:changed,solid:solid.stats,glErrors:[a.error,b.error,solid.error,f.gl.getError()],lostStats,lostSupported,restoredStats:f.scene.stats,restoredSupported:f.scene.supported};
  }finally{f.destroy();}
 };
 window.causticDebug={create,configs,pixels};
 window.runCausticBenchmark=async()=>{if(window.causticBenchmarkRunning)throw Error('Already running');window.causticBenchmarkRunning=true;const report=window.lastCausticBenchmark={source:window.causticBenchmarkSource,measuredAt:new Date().toISOString(),environment:{userAgent:navigator.userAgent,devicePixelRatio,viewport:[innerWidth,innerHeight],hardwareConcurrency:navigator.hardwareConcurrency},method:{repetitions:3,durationMs:1500,warmupFrames:16,surfaces:6,pixelBudget:900000,scope:'Native desktop-browser fixture. Six semantic-source rectangles; full-scene GPU queries, CPU render submission and callback intervals. Not physical phone or presented FPS. Half/full and grid variants alter quality; only indexed/non-indexed use identical optics, topology and resolution.'},samples:[]};
 try{for(let round=0;round<3;round++)for(const config of (round===1?[...configs].reverse():configs)){document.querySelector('#status').textContent=`${round+1}/3 ${config.name}`;report.samples.push(await measure(config));}report.aggregate=Object.fromEntries(configs.map(c=>[c.name,Object.fromEntries(['cpu','gpu','intervals'].map(k=>[k,summarize(report.samples.filter(s=>s.config.name===c.name).map(s=>s.timing[k]?.median).filter(v=>v!==undefined))]))]));
 const a=await pixels(configs[0]),b=await pixels(configs[1]);let changed=0,maxDifference=0;for(let i=0;i<a.bytes.length;i++){const delta=Math.abs(a.bytes[i]-b.bytes[i]);if(delta)changed++;maxDifference=Math.max(maxDifference,delta);}report.comparisonReadback={time:1.7,bytes:a.bytes.length,changedBytes:changed,maxChannelDifference:maxDifference,glErrors:[a.error,b.error],stats:[a.stats,b.stats]};document.querySelector('#status').textContent='Complete';return{aggregate:report.aggregate,comparisonReadback:report.comparisonReadback,queries:report.samples.map(s=>s.queries),source:report.source,environment:report.environment};}finally{window.causticBenchmarkRunning=false;}};
 window.validateCausticPixels=async()=>{const base=await pixels(configs[1],0),animated=await pixels(configs[1],2),off=await pixels(configs[5],0);const compare=(a,b)=>{let changed=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;return changed;};return{source:window.causticBenchmarkSource,base:base.stats,changedByAnimation:compare(base.bytes,animated.bytes),changedByCaustics:compare(base.bytes,off.bytes),errors:[base.error,animated.error,off.error]};};
}
await writeFile('/tmp/lg-caustics-benchmark.html',`<!doctype html><html><head><title>Caustic benchmark</title><style>body{margin:0;background:#073943;color:white;font:16px Arial}#status{position:fixed;z-index:3;top:0;left:0}</style></head><body><p id="status">Ready</p><script>${code}</script><script>window.causticBenchmarkSource=${JSON.stringify(source)};(${runner.toString()})();</script></body></html>`);
console.log(JSON.stringify(source));
