/* Native T3 probe after loading /tmp/lg-follow-probe.html.
 * Native geometry getters stay native; instrumentation only forwards and counts.
 * Synchronous connected measurements include native style/layout caused by metrics.
 * This is not a virtualized feed, throughput benchmark, GPU/paint/FPS measurement. */
(async()=>{
const host=document.getElementById('fixture'),attach=window.GlassFollow?.attachGlassFollow;if(!host?.isConnected||!attach)throw Error('Load native follow fixture first');
const scopes=Array.from({length:16},(_,i)=>{const scroller=document.createElement('section'),content=document.createElement('div');scroller.className='scope';content.className='content';for(let j=0;j<8;j++){const p=document.createElement('p');p.textContent='Actual host record '+i+'/'+j;content.append(p)}scroller.append(content);host.append(scroller);return {scroller,content}});
const raf0=window.requestAnimationFrame,cancel0=window.cancelAnimationFrame,add0=EventTarget.prototype.addEventListener,remove0=EventTarget.prototype.removeEventListener,rect0=Element.prototype.getBoundingClientRect;
let raf=0,cancel=0,added=0,removed=0,rect=0,notifications=0;const reads={scrollHeight:0,clientHeight:0,scrollTop:0},descriptors=[];
window.requestAnimationFrame=function(...a){raf++;return raf0.apply(this,a)};window.cancelAnimationFrame=function(...a){cancel++;return cancel0.apply(this,a)};
EventTarget.prototype.addEventListener=function(...a){added++;return add0.apply(this,a)};EventTarget.prototype.removeEventListener=function(...a){removed++;return remove0.apply(this,a)};
Element.prototype.getBoundingClientRect=function(...a){rect++;return rect0.apply(this,a)};
for(const name of Object.keys(reads)){const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,name);if(!descriptor?.get||!descriptor.configurable)throw Error('Native geometry instrumentation unavailable: '+name);descriptors.push([name,descriptor]);Object.defineProperty(Element.prototype,name,{...descriptor,get(){reads[name]++;return descriptor.get.call(this)}})}
const controllers=new Set();let lastController;
try{
const batches=[];for(let batch=0;batch<5;batch++){const started=performance.now();for(let cycle=0;cycle<10;cycle++)for(const n of scopes){n.scroller.scrollTop=0;const c=attach(n.scroller,{content:n.content,observeResize:false,onChange(){notifications++}});controllers.add(c);c.follow();const row=document.createElement('p');row.textContent='Actual appended fixture';n.content.append(row);c.notifyAppend(1);c.pause();row.textContent+=' longer text';c.notifyAppend(0);const second=document.createElement('p');second.textContent='Paused real append';n.content.append(second);c.notifyAppend(1);c.refresh();c.jumpLatest();c.destroy();controllers.delete(c);row.remove();second.remove();}batches.push(performance.now()-started)}
const synchronous={batchesMs:batches,medianBatchMs:[...batches].sort((a,b)=>a-b)[2],connectedSequences:800,sequencesPerBatch:160,scopes:16,notifications,geometryGetterReads:{...reads},explicitRectReads:rect,requestedFrames:raf,cancelledFrames:cancel,listenersAdded:added,listenersRemoved:removed};
const n=scopes[0];n.scroller.scrollTop=n.scroller.scrollHeight-n.scroller.clientHeight;const c=attach(n.scroller,{content:n.content,onChange(){notifications++}});controllers.add(c);lastController=c;await new Promise(r=>setTimeout(r,120));
const settledBefore=raf;await new Promise(r=>setTimeout(r,250));const idleFrames=raf-settledBefore;
const row=document.createElement('p');row.textContent='Native observer append';n.content.append(row);c.notifyAppend(1);await new Promise(r=>setTimeout(r,120));const afterActualAppend=c.state;
c.pause();const fixed=n.scroller.scrollTop;row.textContent+=' extended in place, count zero';c.notifyAppend(0);await new Promise(r=>setTimeout(r,120));const pausedGrowth={state:c.state,positionPreserved:n.scroller.scrollTop===fixed};
c.destroy();controllers.delete(c);const atDestroy=raf;await new Promise(r=>setTimeout(r,250));
return {observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,visibility:document.visibilityState,synchronous,nativeEventLifecycle:{idle250msRequestedFrames:idleFrames,afterActualAppend,pausedGrowth,postDestroy250msRequestedFrames:raf-atDestroy,destroyed:c.state.destroyed},allListenersAdded:added,allListenersRemoved:removed,scope:'800 actual connected attach/follow/append/notify/pause/text-growth/notify/append/refresh/jump/destroy sequences. Timings include synchronous native geometry style/layout. Separate native ResizeObserver/scroll event and idle observations. No paint/GPU/FPS/physical-device speed or comparative claim.'};
}finally{for(const c of controllers)c.destroy();window.requestAnimationFrame=raf0;window.cancelAnimationFrame=cancel0;EventTarget.prototype.addEventListener=add0;EventTarget.prototype.removeEventListener=remove0;Element.prototype.getBoundingClientRect=rect0;for(const [name,d] of descriptors)Object.defineProperty(Element.prototype,name,d);host.replaceChildren()}
})()

