import {build} from 'vite';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('src/tabs.ts'),name:'GlassTabBenchmark',formats:['iife']}}});
const code=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk').code;
const html=`<!doctype html><html><head><title>Glass tabs benchmark</title></head><body><h1>Static tabs benchmark fixture</h1><script>${code}</script><script>
window.runTabsBenchmark=()=>{
 const fixture=document.createElement('section');document.body.append(fixture);const list=document.createElement('div');list.role='tablist';list.setAttribute('aria-label','Benchmark tabs');fixture.append(list);
 for(let i=0;i<12;i++){const tab=document.createElement('button'),panel=document.createElement('section');tab.id='bench-tab-'+i;tab.role='tab';tab.setAttribute('aria-controls','bench-panel-'+i);tab.textContent='Tab '+i;panel.id='bench-panel-'+i;panel.textContent='Panel '+i;list.append(tab);fixture.append(panel);}
 const before=fixture.innerHTML,c=GlassTabBenchmark.attachGlassTabs(list);for(let i=0;i<100;i++)c.select('bench-tab-'+i%12);
 let frames=0,reads=0;const raf=window.requestAnimationFrame,rect=Element.prototype.getBoundingClientRect;
 window.requestAnimationFrame=function(fn){frames++;return raf.call(this,fn)};Element.prototype.getBoundingClientRect=function(){reads++;return rect.call(this)};
 const runs=[];try{for(let pass=0;pass<5;pass++){const start=performance.now();for(let i=0;i<1000;i++)c.select('bench-tab-'+i%12);runs.push(performance.now()-start);}}
 finally{window.requestAnimationFrame=raf;Element.prototype.getBoundingClientRect=rect;}
 const selection=c.selectedId,visible=fixture.querySelectorAll('[role=tabpanel]:not([hidden])').length;c.destroy();
 const restored=[...fixture.querySelectorAll('[role=tab]')].every(t=>!t.hasAttribute('aria-selected')&&!t.hasAttribute('tabindex'))&&[...fixture.querySelectorAll('section')].every(p=>!p.hasAttribute('hidden')&&!p.hasAttribute('role'));fixture.remove();
 return {userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,tabCount:12,iterationsPerRun:1000,runsMs:runs,medianMs:[...runs].sort((a,b)=>a-b)[2],scheduledAnimationFrames:frames,boundingRectReads:reads,selection,visiblePanels:visible,attributesRestored:restored,scope:'Warm synchronous selection submissions; excludes paint, compositor and focus/editor work. Clock and device specific. No baseline speedup claim.'};
};</script></body></html>`;
await writeFile('/tmp/lg-tabs-benchmark.html',html);
const hash=createHash('sha256');for(const name of (await readdir('src')).filter(x=>/\.(ts|tsx|css)$/.test(x)).sort()){hash.update(name+'\0');hash.update(await readFile('src/'+name));hash.update('\0');}
const sizes=[];for(const path of ['dist/tabs.js','dist/workbench.css']){const bytes=await readFile(path);sizes.push({path,bytes:bytes.length,gzipBytes:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const report={version:JSON.parse(await readFile('package.json')).version,sourceSha256:hash.digest('hex'),artifacts:sizes,dependencyScope:'New entrypoints have no runtime dependencies; CodeMirror and Lezer are site-only dev dependencies.',browser:null};
await writeFile('benchmarks/workbench.json',JSON.stringify(report,null,2)+'\n');console.log({fixtureChars:html.length,report});
