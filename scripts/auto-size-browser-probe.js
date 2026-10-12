/** Actual native browser benchmark. Build/inject AutoSizeBenchmark before this file.
 * Only connected attach/destroy on unchanged, preflushed native flow-root fixtures
 * is timed. Native geometry/style reads and any synchronous style/layout work they
 * induce are included; active animations, authoring, async waits and paint are not.
 */
(() => {
  const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b);return{samples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],minMs:sorted[0],maxMs:sorted.at(-1)}};
  window.__runAutoSizeBenchmark=()=>{
    const area=document.createElement('div');area.setAttribute('aria-hidden','true');area.style.cssText='position:fixed;left:-9999px;top:0;width:300px;pointer-events:none';
    const fixtures=Array.from({length:20},()=>{const frame=document.createElement('div'),content=document.createElement('div'),input=document.createElement('input');frame.style.cssText='display:flow-root;width:270.75px;padding:7.125px 0;border:1px solid;box-sizing:content-box';content.style.cssText='display:flow-root';input.value='Original draft';input.setAttribute('aria-label','Original draft');content.append(input);frame.append(content);area.append(frame);return{frame,content,input,styles:frame.getAttribute('style')}});
    document.body.append(area);
    for(const{frame,content}of fixtures){frame.getBoundingClientRect();content.getBoundingClientRect();getComputedStyle(frame);getComputedStyle(content)}
    const values=[],options=Object.freeze({duration:220});
    try{
      for(let batch=0;batch<450;batch++){
        const start=performance.now();
        for(const{frame,content}of fixtures){const controller=AutoSizeBenchmark.attachGlassAutoSize(frame,content,options);controller.destroy()}
        if(batch>=50)values.push((performance.now()-start)/fixtures.length);
      }
      const identityAndCleanup=fixtures.every(({frame,content,input,styles})=>frame.isConnected&&content.parentElement===frame&&content.contains(input)&&input.value==='Original draft'&&frame.getAttribute('style')===styles&&!frame.hasAttribute('data-lg-auto-size-active')&&frame.getAnimations().length===0);
      if(!identityAndCleanup)throw Error('Connected lifecycle postconditions failed');
      return{browser:navigator.userAgent,fixtures:20,warmupBatches:50,recordedBatches:400,cyclesPerBatch:20,connectedAttachDestroyPerCycle:summarize(values),identityAndCleanup,
        includes:'Native layout preconditions, computed styles/rectangles and any synchronous style/layout processing they induce, observer/listener lifetime, WeakSet ownership, natural-size cache and teardown on existing connected nodes',
        excludes:'Fixture authoring and initial preparation, DOM content updates, active native animation, retarget/focus/resize paths, async waits, asynchronous paint/compositor/network; not a comparative speed-up or FPS measurement',timerCaveat:'Quantized performance.now batch averages; not individual action latency'};
    }finally{area.remove()}
  };
})();
