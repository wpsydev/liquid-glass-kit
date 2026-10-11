/** Native-preview mount/cleanup fixture. This is not a rendering/FPS benchmark. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/scroll-reveal.ts'),name:'GlassScrollBenchmark',formats:['iife']}}});
const code=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk').code;
const metadata={rawBytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).byteLength,sourceSha256:createHash('sha256').update(await readFile('src/scroll-reveal.ts')).digest('hex'),scope:'Five warm batches of 200 attach/destroy operations per renderer on connected plain presentation layers. Timings include synchronous style sampling/controller setup/cleanup, exclude browser animation progress, layout/paint/compositing, CSS glass blur and page FPS. No speedup comparison.'};
const run=async function runScrollRevealBenchmark(){
  const output=[];
  for(const native of [true,false]){
    const samples=[];
    for(let batch=0;batch<5;batch++){
      const node=document.createElement('div');node.textContent='Native benchmark presentation layer';document.body.append(node);
      let rectReads=0,raf=0,scrollListeners=0;
      const originals={rect:Element.prototype.getBoundingClientRect,raf:window.requestAnimationFrame,listen:EventTarget.prototype.addEventListener};
      Element.prototype.getBoundingClientRect=function(){rectReads++;return originals.rect.call(this)};
      window.requestAnimationFrame=function(callback){raf++;return originals.raf.call(this,callback)};
      EventTarget.prototype.addEventListener=function(type,...rest){if(type==='scroll')scrollListeners++;return originals.listen.call(this,type,...rest)};
      let renderer;
      const start=performance.now();
      try{for(let i=0;i<200;i++){const controller=GlassScrollBenchmark.attachGlassScrollReveal(node,{native,once:false});renderer=controller.renderer;controller.destroy();}}
      finally{Element.prototype.getBoundingClientRect=originals.rect;window.requestAnimationFrame=originals.raf;EventTarget.prototype.addEventListener=originals.listen;node.remove();}
      samples.push({batch:batch+1,mountDestroyMs:performance.now()-start,operations:200,renderer,rectReads,customRafRequests:raf,scrollListeners});
    }
    output.push({nativeRequested:native,samples});
  }
  return{observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},output};
};
const html=`<!doctype html><meta charset="utf-8"><title>Scroll reveal lifecycle benchmark</title><h1>Optional scroll reveal</h1><p>Scoped controller lifecycle cost, not page FPS.</p><script>${code.replaceAll('</script','<\\/script')}\nwindow.runScrollRevealBenchmark=${run.toString()};window.scrollRevealBenchmarkMetadata=${JSON.stringify(metadata)};</script>`;
await writeFile('/tmp/lg-scroll-benchmark.html',html);await writeFile('benchmarks/scroll-reveal-payload.json',JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify({fixture:'/tmp/lg-scroll-benchmark.html',...metadata}));
