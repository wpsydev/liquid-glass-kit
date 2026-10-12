(async()=>{
  const host=document.querySelector('#fixture');
  const originalRaf=window.requestAnimationFrame,originalRect=Element.prototype.getBoundingClientRect;
  let raf=0,rect=0,opened=0,closed=0;
  window.requestAnimationFrame=function(...args){raf++;return originalRaf.apply(this,args)};
  Element.prototype.getBoundingClientRect=function(...args){rect++;return originalRect.apply(this,args)};
  try{
    const pairs=Array.from({length:64},(_,i)=>{const trigger=document.createElement('button'),panel=document.createElement('div');trigger.textContent='Preview '+i;panel.textContent='Local description '+i;panel.setAttribute('role','tooltip');panel.hidden=true;host.append(trigger,panel);return{trigger,panel}});
    const batches=[];
    for(let batch=0;batch<5;batch++){
      const start=performance.now();
      for(let cycle=0;cycle<20;cycle++){
        const handles=pairs.map(({trigger,panel})=>GlassPreview.attachGlassPreview(trigger,panel,{semantics:'description',interaction:'manual',onOpen(){opened++},onClose(){closed++}}));
        handles.forEach(h=>{h.show();h.hide();h.update({semantics:'description',interaction:'manual'});h.destroy()});
      }
      batches.push(performance.now()-start);
      await Promise.resolve();
    }
    const sorted=[...batches].sort((a,b)=>a-b),idleRaf=raf;
    await new Promise(r=>setTimeout(r,250));
    return{observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,controllersPerCycle:64,cyclesPerBatch:20,batchesMs:batches,medianBatchMs:sorted[2],opened,closed,customRaf:raf,jsRectReads:rect,subsequent250msIdleRaf:raf-idleRaf,scope:'Connected DOM manual description attach/show/hide/update/destroy; excludes positioning, content fetch, animation, rendering and paint'};
  }finally{window.requestAnimationFrame=originalRaf;Element.prototype.getBoundingClientRect=originalRect;host.replaceChildren()}
})()
