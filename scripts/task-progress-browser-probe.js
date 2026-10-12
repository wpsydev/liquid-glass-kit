/* Evaluate this async expression in a native T3 tab after loading the standalone fixture.
 * Pure construction, connected host adapter work and explicit forced style/layout are separate.
 * The library is a pure props function, not a controller. No cost here measures paint/GPU work. */
(async()=>{
const host=document.getElementById('fixture'),get=window.GlassTaskProgress?.getGlassTaskProgressProps;
if(!host?.isConnected||!get)throw Error('Load standalone task-progress fixture first');
const base={id:'probe-progress',label:'Inspect actual host records',statusId:'probe-status',statusText:'Host reports this explicit outcome',state:'busy',mode:'determinate',value:0,max:8};
const scenarios=[{state:'idle',mode:'indeterminate'},{state:'busy',mode:'indeterminate',animated:false},{state:'busy',mode:'determinate',value:0,max:8},{state:'busy',mode:'determinate',value:3,max:8},{state:'complete',mode:'determinate',value:8,max:8},{state:'error',mode:'determinate',value:3,max:8},{state:'cancelled',mode:'determinate',value:3,max:8},{state:'complete',mode:'indeterminate'}];
const options=scenarios.map(s=>{const o={...base,...s};if(s.mode==='indeterminate'){delete o.value;delete o.max;}return o;});
const make=index=>{const section=document.createElement('section'),frame=document.createElement('div'),label=document.createElement('label'),progress=document.createElement('progress'),ring=document.createElement('span'),status=document.createElement('p'),region=document.createElement('div');frame.append(label,progress,ring);region.textContent='Connected host results '+index;section.append(frame,status,region);host.append(section);return {section,frame,label,progress,ring,status,region,index};};
const nodes=Array.from({length:32},(_,i)=>make(i));
const set=(node,props,keys)=>{for(const key of keys){if(props[key]===undefined)node.removeAttribute(key);else node.setAttribute(key,String(props[key]));}};
const apply=(n,v)=>{n.frame.className=v.frame.className;set(n.frame,v.frame,['data-lg-task-state','data-lg-task-mode','data-lg-task-motion']);n.progress.className=v.progress.className;n.progress.id=v.progress.id;set(n.progress,v.progress,['value','max','aria-describedby','aria-valuetext']);n.progress.hidden=v.progress.hidden;n.label.className=v.label.props.className;n.label.htmlFor=v.label.props.htmlFor;n.label.textContent=v.label.text;n.status.className=v.status.props.className;n.status.id=v.status.props.id;set(n.status,v.status.props,['role','aria-atomic']);n.status.textContent=v.status.text;n.region.setAttribute('aria-busy',String(v.region['aria-busy']));n.ring.className=v.decorative.className;n.ring.setAttribute('aria-hidden','true');n.ring.hidden=v.decorative.hidden;};
const rafOriginal=window.requestAnimationFrame,rectOriginal=Element.prototype.getBoundingClientRect;let raf=0,rect=0;
window.requestAnimationFrame=function(...a){raf++;return rafOriginal.apply(this,a)};Element.prototype.getBoundingClientRect=function(...a){rect++;return rectOriginal.apply(this,a)};
try{
const pure=[];let checksum=0;for(let batch=0;batch<5;batch++){const t=performance.now();for(let i=0;i<10000;i++){const v=get(options[i%options.length]);checksum+=v.progress.value??0;}pure.push(performance.now()-t);}
const connected=[];for(let batch=0;batch<5;batch++){const t=performance.now();for(let cycle=0;cycle<10;cycle++)for(const n of nodes)for(const o of options){apply(n,get({...o,id:'probe-progress-'+n.index,statusId:'probe-status-'+n.index}));}connected.push(performance.now()-t);}
const noRects=rect,noRaf=raf;const forced=[];for(let batch=0;batch<5;batch++){const t=performance.now();for(let i=0;i<100;i++){apply(nodes[0],get({...options[i%8],id:'forced-progress',statusId:'forced-status'}));getComputedStyle(nodes[0].progress).display;nodes[0].progress.getBoundingClientRect();}forced.push(performance.now()-t);}
const forcedRects=rect-noRects;
const native={uniqueIds:document.querySelectorAll('#forced-progress').length===1,terminalUnknownHidden:nodes.slice(1).every(n=>n.progress.hidden&&n.progress.position===-1&&!n.progress.hasAttribute('value')&&!n.progress.hasAttribute('max')),statusOutsideBusy:nodes.every(n=>!n.region.contains(n.status)),idleAnimations:document.getAnimations().length};
const before=raf;await new Promise(r=>setTimeout(r,250));
const median=a=>[...a].sort((a,b)=>a-b)[2];
return {observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,visibility:document.visibilityState,pure:{calls:50000,callsPerBatch:10000,batchesMs:pure,medianBatchMs:median(pure),checksum},hostConnected:{propsPlusDOMApplies:12800,scopes:32,batches:5,cyclesPerBatch:10,statesPerCycle:8,batchesMs:connected,medianBatchMs:median(connected),requestAnimationFrameCalls:noRaf,rectReads:noRects},forcedStyleAndLayout:{updatesAndExplicitRectReads:500,batchesMs:forced,medianBatchMs:median(forced),rectReads:forcedRects},native,subsequent250msIdleRaf:raf-before,scope:'Standalone synchronous pure props and connected host adapter work. Forced computed-style/rect pass includes browser style/layout. None measures paint, GPU, backend, real-task processing, throttled physical devices or comparative speedup.'};
}finally{window.requestAnimationFrame=rafOriginal;Element.prototype.getBoundingClientRect=rectOriginal;host.replaceChildren();}
})()

