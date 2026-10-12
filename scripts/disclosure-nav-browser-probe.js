(async()=>{
  const host=document.querySelector('#fixture');
  const originalRaf=window.requestAnimationFrame,originalRect=Element.prototype.getBoundingClientRect;
  let raf=0,rect=0,notifications=0;
  window.requestAnimationFrame=function(...args){raf++;return originalRaf.apply(this,args)};
  Element.prototype.getBoundingClientRect=function(...args){rect++;return originalRect.apply(this,args)};
  try{
    const items=Array.from({length:32},(_,i)=>{const trigger=document.createElement('button'),panel=document.createElement('div');trigger.type='button';trigger.textContent='Section '+i;panel.textContent='Ordinary content '+i;host.append(trigger,panel);return{id:'item'+i,trigger,panel}});
    const batches=[];
    for(let batch=0;batch<5;batch++){
      const start=performance.now();
      for(let cycle=0;cycle<20;cycle++){
        const controller=GlassNavigation.attachGlassDisclosureNav(host,{items,onChange(){notifications++}});
        for(const item of items){controller.open(item.id);controller.close()}
        controller.refresh();controller.destroy();
      }
      batches.push(performance.now()-start);await Promise.resolve();
    }
    const sorted=[...batches].sort((a,b)=>a-b),idle=raf;
    await new Promise(r=>setTimeout(r,250));
    return{observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,pairs:32,cyclesPerBatch:20,batchesMs:batches,medianBatchMs:sorted[2],notifications,customRaf:raf,jsRectReads:rect,subsequent250msIdleRaf:raf-idle,scope:'Connected32-group attach/open-close-all/refresh/destroy; includes visible-control computed style checks, excludes menu animation/layout/paint/user navigation'};
  }finally{window.requestAnimationFrame=originalRaf;Element.prototype.getBoundingClientRect=originalRect;host.replaceChildren()}
})()
