window.__runTiltBenchmark = async function () {
  const root=document.querySelector('#fixture'),view=window,raf=view.requestAnimationFrame,read=Element.prototype.getBoundingClientRect;
  let customRaf=0,rectReads=0; const hosts=Array.from({length:32},()=>{const h=document.createElement('button');h.type='button';h.setAttribute('aria-label','Original fixture');const v=document.createElement('span');v.textContent='Original visual';h.append(v);root.append(h);return{h,v}});
  view.requestAnimationFrame=function(cb){customRaf++;return raf.call(this,cb)};Element.prototype.getBoundingClientRect=function(){rectReads++;return read.call(this)};
  const times=[],live=[];let cleaned=false;
  try {
    for(let batch=0;batch<5;batch++){const start=performance.now();for(let cycle=0;cycle<20;cycle++)for(const {h,v} of hosts){const controller=GlassTilt.attachGlassTilt(h,v,{reducedMotion:true});live.push(controller);controller.refresh();controller.destroy();live.pop()}times.push(performance.now()-start)}
    cleaned=hosts.every(({h,v})=>!v.hasAttribute('style')&&h.getAttribute('aria-label')==='Original fixture');
    const idleStart=customRaf;await new Promise(r=>setTimeout(r,250));const sorted=[...times].sort((a,b)=>a-b);
    const result={observedAtUtc:new Date().toISOString(),batchesMs:times,medianBatchMs:sorted[2],cyclesPerBatch:20,hosts:32,sequences:3200,rectReads,customRaf,idleRaf:customRaf-idleStart,cleaned,userAgent:navigator.userAgent,scope:'Connected attach/explicit refresh/destroy, reduced mode without hover or spring animation. Setup excluded. Actual refresh geometry/style reads included; style/layout/paint, spring work and user interaction excluded. Five un-warmed batches are reported individually; no comparative speedup or FPS claim.'};
    document.querySelector('#result').textContent=JSON.stringify(result,null,2);return result;
  } finally {for(const controller of live)controller.destroy();view.requestAnimationFrame=raf;Element.prototype.getBoundingClientRect=read;root.replaceChildren()}
};
