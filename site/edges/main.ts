import { attachGlassSceneTexture } from '../../src/scene-texture.js';
import type { GlassSceneOptions } from '../../src/scene.js';
import './style.css';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type Geometry = 'lenses' | 'field' | 'fusion';
type Quality = 'legacy' | 'pixel';
type Preset = 'legacy' | 'pixel' | 'budget' | 'field' | 'fusion' | 'quiet';
let quality: Quality = 'legacy', geometry: Geometry = 'lenses', budget = 262144, dpr = 1, phase = 0, touring = false, destroyed = false;
let timers: number[] = [], version = 0, inspection: { changed: number; pixels: number; meanRGBDelta: number; sampledPhase: number; glErrors: number[] } | null = null;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const quiet = () => get<HTMLInputElement>('quiet').checked || motion.matches;
const solid = () => get<HTMLInputElement>('solid').checked;
const source = document.createElement('canvas'); source.width = source.height = 800; source.hidden = true; source.setAttribute('aria-hidden', 'true'); document.body.append(source);
const art = source.getContext('2d')!;
function poster() {
  const gradient=art.createLinearGradient(0,0,800,800);gradient.addColorStop(0,'#8062df');gradient.addColorStop(.5,'#4e40ad');gradient.addColorStop(1,'#252b63');art.fillStyle=gradient;art.fillRect(0,0,800,800);
  art.save();art.translate(410,390);art.rotate(-.28);
  for(let i=0;i<12;i++){art.fillStyle=i%2?'#23b6b9':'#a3e2d3';art.fillRect(-500,-110+i*19,1000,12)}
  art.fillStyle='#d6f594';art.beginPath();art.arc(-60,-165,110,0,Math.PI*2);art.fill();art.strokeStyle='#f0e8e1';art.lineWidth=3;
  for(let i=0;i<7;i++){art.beginPath();art.arc(190,70,45+i*22,0,Math.PI*2);art.stroke()}
  art.restore();art.strokeStyle='#f4efd778';art.lineWidth=1;for(let x=25;x<800;x+=50){art.beginPath();art.moveTo(x,0);art.lineTo(x,800);art.stroke()}
  art.fillStyle='#f9efe5';art.font='600 150px Arial';art.fillText('SEAM',35,704);art.font='18px monospace';art.fillText('ORIGINAL POSTER / OPTICAL STUDY 33',43,749);
}
poster();
document.querySelectorAll<HTMLElement>('.fallback').forEach(element=>{element.style.backgroundImage='url('+source.toDataURL('image/png')+')'});
const outputs = [get<HTMLCanvasElement>('legacy'), get<HTMLCanvasElement>('chosen')];
const controllers = outputs.map(canvas => attachGlassSceneTexture(canvas, {source, scene:{animate:false,edgeQuality:'legacy'},maxSourcePixels:262144,maxSourceDimension:1024,fit:'cover'}));
const state = () => ({quality,geometry,budget,dpr,phase,quiet:quiet(),solid:solid(),touring,scheduled:timers.length,inspection,scenes:controllers.map((controller,index)=>({id:outputs[index].id,supported:controller.supported,scene:controller.stats,source:controller.sourceStats}))});
const status = (message: string) => { get('status').textContent=message; };
function settings(index: number): GlassSceneOptions {
  const stage=outputs[index].parentElement!, bounds=stage.getBoundingClientRect();
  const surfaces=[...stage.querySelectorAll<HTMLElement>('.lens')].map((element,i)=>({element,radius:i?8:24,refraction:i?18:32}));
  return {surfaces,animate:false,edgeQuality:index===0?'legacy':quality,maxPixels:budget,maxDpr:dpr,reducedMotion:quiet(),reducedTransparency:solid(),
    ...(geometry==='field'?{field:{count:40,size:28,speed:35,motion:'wave',seed:33}}:{}),
    ...(geometry==='fusion'?{fusion:{drops:[{x:bounds.width*.48,y:bounds.height*.43,radius:bounds.width*.1},{x:bounds.width*.61,y:bounds.height*.49,radius:bounds.width*.105}],smoothness:28,refraction:24,dispersion:0}}:{})};
}
function syncControls() { get<HTMLSelectElement>('quality').value=quality;get<HTMLSelectElement>('geometry').value=geometry;get<HTMLSelectElement>('budget').value=String(budget);get<HTMLInputElement>('dpr').value=String(dpr);get<HTMLInputElement>('phase').value=String(phase);get<HTMLOutputElement>('dpr-value').value=dpr.toFixed(2);get<HTMLOutputElement>('phase-value').value=phase.toFixed(2)+'s'; }
function diagnostics() {
  const s=state();
  controllers.forEach((controller,index)=>{const key=index?'chosen':'legacy',stats=controller.stats;get(key+'-backing').textContent=stats.width+'×'+stats.height+' / '+stats.pixels.toLocaleString('en-US')+' PX';get(key+'-policy').textContent=stats.edgeQuality+(stats.edgeQualityFallback?' / fallback':' / effective');outputs[index].parentElement!.querySelector<HTMLElement>('.fallback')!.hidden=controller.supported&&controller.sourceStats.status==='ready'});
  get('chosen-heading').textContent=quality==='pixel'?'Pixel':'Legacy';get('chosen-band').textContent=quality==='pixel'?'LOCAL DERIVATIVE / EXPLICIT OPT-IN':'FIXED CSS-DISTANCE BAND';get('diagnostics').textContent=JSON.stringify(s,null,2);get('tour').textContent=touring?'Stop tour':'Play 10s tour';
}
function draw(clearInspection = true) {
  if(destroyed)return;
  controllers.forEach((controller,index)=>{controller.update({scene:settings(index)});controller.render(phase)});syncControls();
  if(clearInspection){inspection=null;get('changed').textContent='—';get('delta').textContent='Inspect the current actual output.';for(const id of ['crop-legacy','crop-chosen'])get<HTMLCanvasElement>(id).getContext('2d')!.clearRect(0,0,17,17);}diagnostics();
}
function readPixels(index: number) {
  const controller=controllers[index],canvas=outputs[index]; if(!controller.supported||!controller.sourceStats.visible)return null;
  controller.render(phase);const gl=canvas.getContext('webgl2')!,pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return{pixels,width:canvas.width,height:canvas.height,error:gl.getError()};
}
function crop(index: number, data: NonNullable<ReturnType<typeof readPixels>>) {
  const canvas=get<HTMLCanvasElement>(index?'crop-chosen':'crop-legacy'),ctx=canvas.getContext('2d')!,image=ctx.createImageData(17,17);
  const bounds=outputs[index].getBoundingClientRect(),lens=outputs[index].parentElement!.querySelector<HTMLElement>('.primary')!.getBoundingClientRect();
  const sx=Math.round((lens.left-bounds.left)/bounds.width*data.width),sy=Math.round((1-(lens.top+lens.height/2-bounds.top)/bounds.height)*data.height);
  for(let y=0;y<17;y++)for(let x=0;x<17;x++){const ox=Math.max(0,Math.min(data.width-1,sx+x-8)),oy=Math.max(0,Math.min(data.height-1,sy+8-y)),from=(oy*data.width+ox)*4;image.data.set(data.pixels.subarray(from,from+4),(y*17+x)*4)}ctx.putImageData(image,0,0);
}
function inspect() {
  const a=readPixels(0),b=readPixels(1);
  if(!a||!b||a.width!==b.width||a.height!==b.height){inspection=null;for(const id of ['crop-legacy','crop-chosen'])get<HTMLCanvasElement>(id).getContext('2d')!.clearRect(0,0,17,17);get('changed').textContent='Unavailable';get('delta').textContent='Both stages must be visible with matching supported backing dimensions.';diagnostics();return null;}
  let changed=0,delta=0;for(let at=0;at<a.pixels.length;at+=4){let different=false;for(let c=0;c<4;c++)if(a.pixels[at+c]!==b.pixels[at+c])different=true;if(different)changed++;for(let c=0;c<3;c++)delta+=Math.abs(a.pixels[at+c]-b.pixels[at+c])}
  inspection={changed,pixels:a.width*a.height,meanRGBDelta:delta/(a.width*a.height*3),sampledPhase:phase,glErrors:[a.error,b.error]};crop(0,a);crop(1,b);get('changed').textContent=changed.toLocaleString('en-US');get('delta').textContent='Sampled at '+phase.toFixed(2)+'s / '+inspection.pixels.toLocaleString('en-US')+' pixels / mean RGB byte Δ '+inspection.meanRGBDelta.toFixed(3)+'. Difference is not a quality score.';diagnostics();return inspection;
}
async function inspectVisible() {
  cancel();
  if(innerWidth<=700){document.querySelector('.comparison')!.scrollIntoView({block:'center',behavior:'instant'});await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}
  inspect();status('Actual synchronous readback completed when both stages are visible. This is not GPU timing.');
}
function cancel() {version++;timers.forEach(clearTimeout);timers=[];touring=false;diagnostics();}
function reset() {cancel();quality='legacy';geometry='lenses';budget=262144;dpr=1;phase=0;get<HTMLInputElement>('quiet').checked=get<HTMLInputElement>('solid').checked=false;draw();inspect();status('Static legacy view. No scene clock is running.');}
function preset(id: Preset) {
  cancel();quality=id==='legacy'?'legacy':'pixel';geometry=id==='field'?'field':id==='fusion'?'fusion':'lenses';budget=id==='budget'?65536:262144;phase=0;get<HTMLInputElement>('quiet').checked=id==='quiet';draw();inspect();status(id==='quiet'?'Quiet, static optics. Intentional controls still work.':id==='legacy'?'Legacy fixed CSS coverage. Framework default unchanged.':'Explicit pixel coverage. Inspect actual differences; derivatives are not free GPU work.');
}
function tour() {
  const keepQuiet=get<HTMLInputElement>('quiet').checked,keepSolid=solid();reset();get<HTMLInputElement>('quiet').checked=keepQuiet;get<HTMLInputElement>('solid').checked=keepSolid;touring=true;const epoch=version;
  const at=(delay:number,action:()=>void)=>{const id=setTimeout(()=>{timers=timers.filter(t=>t!==id);if(epoch===version&&!destroyed)action()},delay);timers.push(id)};
  if(innerWidth<=700)document.querySelector('.comparison')!.scrollIntoView({block:'center',behavior:'instant'});
  at(700,()=>{quality='pixel';draw();inspect();status('Pixel is explicitly selected. The legacy comparison is unchanged.')});
  at(2300,()=>{budget=65536;draw();inspect();status('A smaller backing budget: actual pixels and scaled edge coverage.')});
  at(3800,()=>{geometry='field';draw();inspect();status('Forty decorative tiles plus two rounded lenses. No DOM widgets are multiplied.')});
  const poses=quiet()?1:24;for(let i=1;i<=poses;i++)at(4000+1400*i/poses,()=>{phase=3*i/poses;draw(false)});
  at(5600,()=>{geometry='fusion';phase=0;draw();inspect();status('Fused drops share local coverage. This is a bounded optical approximation.')});
  at(7400,()=>{budget=262144;draw();inspect();status('More backing pixels retain more detail. No universal speed or quality claim.')});
  at(8800,()=>{geometry='lenses';get<HTMLInputElement>('quiet').checked=true;phase=0;draw();inspect();status('Static finish. Quiet mode and native controls stay available.')});
  at(10000,()=>{touring=false;diagnostics();status('Finite tour complete. No scene clock or tour timer remains.')});diagnostics();
}
get('settings').addEventListener('submit',event=>event.preventDefault());
for(const id of ['quality','geometry','budget','dpr','phase'])get(id).addEventListener(id==='dpr'||id==='phase'?'input':'change',()=>{cancel();quality=get<HTMLSelectElement>('quality').value as Quality;geometry=get<HTMLSelectElement>('geometry').value as Geometry;budget=Number(get<HTMLSelectElement>('budget').value);dpr=Number(get<HTMLInputElement>('dpr').value);phase=Number(get<HTMLInputElement>('phase').value);draw();status('Intentional native control updated the actual scene. Inspect when ready.')});
get('compare').addEventListener('click',()=>{cancel();quality='pixel';draw();inspect();status('Explicit pixel coverage compared with the unchanged legacy view.')});get('inspect').addEventListener('click',()=>{void inspectVisible()});get('reset').addEventListener('click',reset);get('tour').addEventListener('click',()=>touring?cancel():tour());
for(const id of ['quiet','solid'])get(id).addEventListener('change',()=>{cancel();draw();status('Material preference applied. No automatic scene loop.')});
motion.addEventListener('change',()=>{cancel();draw()});
const observer=new ResizeObserver(()=>{if(!destroyed){draw();}});outputs.forEach(canvas=>observer.observe(canvas));
outputs.forEach(canvas=>{canvas.addEventListener('webglcontextlost',()=>{cancel();status('Actual WebGL context lost. Host fallback remains available.');diagnostics()});canvas.addEventListener('webglcontextrestored',()=>{draw();status('WebGL context restored. Owned source uploaded again; inspect the effective policy.')})});
window.addEventListener('pagehide',()=>{cancel();destroyed=true;observer.disconnect();controllers.forEach(controller=>controller.destroy());source.remove()},{once:true});
draw();inspect();
declare global{interface Window{__edgeDemo:{reset:typeof reset;preset:typeof preset;tour:typeof tour;cancel:typeof cancel;inspect:typeof inspect;draw:typeof draw;state:typeof state;readPixels:typeof readPixels}}}
window.__edgeDemo={reset,preset,tour,cancel,inspect,draw,state,readPixels};
