/** Build a native-browser fixture; run window.runDockBenchmark() in the T3 preview. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const result = await build({ configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/dock.ts'),name:'GlassDockBenchmark',formats:['iife']}} });
const code=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk').code;
const css=await readFile('src/dock.css','utf8');
const metadata={moduleBundle:{rawBytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).byteLength},helperCss:{rawBytes:Buffer.byteLength(css),gzipBytes:gzipSync(css).byteLength},sourceSha256:createHash('sha256').update(await readFile('src/dock.ts')).digest('hex'),scope:'Isolated optional controller, six semantic buttons. Submission cost excludes layout/paint/compositor and does not measure page FPS or an overall speedup.'};
const run = async function runDockBenchmark() {
  const samples=[];
  for(let run=0;run<5;run++) {
    const container=document.createElement('nav');container.style.cssText='display:flex;gap:16px;padding:60px;margin:20px';container.setAttribute('aria-label','Benchmark');
    container.innerHTML=Array.from({length:6},(_,i)=>`<button data-lg-dock-item style="width:56px;height:56px"><span data-lg-dock-visual>${i+1}</span></button>`).join('');document.body.append(container);
    const originals={raf:window.requestAnimationFrame,cancel:window.cancelAnimationFrame,rect:Element.prototype.getBoundingClientRect};
    let rectReads=0,requested=0;const pending=new Set();
    Element.prototype.getBoundingClientRect=function(){rectReads++;return originals.rect.call(this)};
    window.requestAnimationFrame=callback=>{requested++;let id;id=originals.raf.call(window,time=>{pending.delete(id);callback(time)});pending.add(id);return id};
    window.cancelAnimationFrame=id=>{pending.delete(id);return originals.cancel.call(window,id)};
    let dock;
    try {
      dock=GlassDockBenchmark.attachGlassDock(container);
      await new Promise(r=>setTimeout(r,100));
      const targets=[...container.children],bounds=targets.map(t=>originals.rect.call(t));
      const baselineReads=rectReads;requested=0;
      const start=performance.now();
      for(let i=0;i<1000;i++){const b=bounds[i%6];container.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',isPrimary:true,clientX:b.left+b.width/2,clientY:b.top+b.height/2}));}
      const submissionMs=performance.now()-start;
      const requestsBeforePaint=requested,readsDuringSubmission=rectReads-baselineReads;
      await new Promise(r=>setTimeout(r,2000));
      const readsDuringMotion=rectReads-baselineReads,scale=Number(targets[3].firstElementChild.style.getPropertyValue('--lg-dock-scale'));
      container.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));await new Promise(r=>setTimeout(r,2000));
      const settledPending=pending.size,beforeIdle=requested;await new Promise(r=>setTimeout(r,500));
      samples.push({run:run+1,submissionMs,requestsBeforePaint,readsDuringSubmission,readsDuringMotion,scaleAtLastTarget:scale,settledPending,idleFrameRequests:requested-beforeIdle});
    } finally {dock?.destroy();window.requestAnimationFrame=originals.raf;window.cancelAnimationFrame=originals.cancel;Element.prototype.getBoundingClientRect=originals.rect;container.remove();}
  }
  return {observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},samples};
};
const html=`<!doctype html><meta charset="utf-8"><title>Dock isolated benchmark</title><style>${css}</style><h1>Optional dock controller benchmark</h1><p>Five warm batches of 1,000 pointer events; separate from visual film.</p><script>${code.replaceAll('</script','<\\/script')}\nwindow.runDockBenchmark=${run.toString()};window.dockBenchmarkMetadata=${JSON.stringify(metadata)};</script>`;
await writeFile('/tmp/lg-dock-benchmark.html',html);await writeFile('benchmarks/dock-payload.json',JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify({fixture:'/tmp/lg-dock-benchmark.html',...metadata}));
