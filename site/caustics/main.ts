import './style.css';
import { attachGlassScene, type GlassSceneOptions } from '../../src/scene.js';
const get = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const ids = ['search','player','dock','slider','toast','checkout'];
const titles = ['A brighter<br>way to search.','A soundtrack<br>for slow mornings.','Somewhere<br>worth going.','Set the mood.<br>Find your level.','Small moments.<br>Worth keeping.','The next chapter<br>starts here.'];
const labels = ['COMMAND SEARCH','MUSIC PLAYER','NAVIGATION DOCK','RANGE CONTROL','STATUS TOAST','PRIMARY ACTION'];
const radii = [40,36,44,35,30,44];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let selected=0, paused=false, enabled=true, destroyed=false, film=false, elapsed=0, origin:number|null=null;
const settings = ():GlassSceneOptions => ({surfaces:[{element:get(ids[selected]),radius:radii[selected],refraction:32}], backdrop:'mineral',maxDpr:1.5,maxPixels:900000,paused,caustics:enabled?{intensity:.20,depth:160,ripple:.65,resolution:64,speed:.85,light:[.65,.75]}:undefined});
const scene=attachGlassScene(get<HTMLCanvasElement>('glass'),settings());
let frame:number|null=null;
function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
function ui(){document.body.dataset.gpu=String(scene.supported);document.querySelectorAll<HTMLButtonElement>('[data-study]').forEach((b)=>b.setAttribute('aria-pressed',String(Number(b.dataset.study)===selected)));get('pause').textContent=paused||reduced.matches?'Resume light':'Pause light';get('pause').setAttribute('aria-pressed',String(paused||reduced.matches));get('toggle').textContent=enabled?'Caustics on':'Caustics off';get('toggle').setAttribute('aria-pressed',String(enabled));get('status').textContent=`${labels[selected]}. ${scene.supported?'WebGL scene active.':'Static CSS fallback.'} ${paused||reduced.matches?'Motion paused.':'Light moving.'}`;}
function choose(index:number){selected=index;get('stage').dataset.study=String(index);ids.forEach((id,i)=>get(id).hidden=i!==index);get('headline').innerHTML=titles[index];get('caption').textContent=labels[index];get('chapter').textContent=`0${index+1} / LIGHT STUDY`;get('fraction').textContent=`0${index+1} — 06`;scene.update(settings());ui();}
function finish(){document.body.dataset.finished='true';stop();origin=null;paused=true;scene.update(settings());ui();}
function filmGesture(){
 const local=elapsed-selected*1.7;
 if(selected===0&&local>.45)get<HTMLInputElement>('query').value='A place to slow down';
 if(selected===1){get('listen').textContent='Ⅱ';get('listen').setAttribute('aria-pressed','true');}
 if(selected===2){const i=local>.9?1:0;get('dock').querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));}
 if(selected===3){const value=Math.round(35+45*Math.min(1,local/1.3));get<HTMLInputElement>('volume').value=String(value);get('level').textContent=`${value}%`;}
 if(selected===5&&local>.8)get('checkout').querySelector('span')!.textContent='You’re on the list.';
}
function tick(now:number){frame=null;if(destroyed||document.hidden||!film||origin===null)return;elapsed=Math.min(12,(now-origin)/1000);const next=Math.min(5,Math.floor(elapsed/1.7));if(next!==selected)choose(next);filmGesture();get('progress').style.width=`${elapsed/12*100}%`;get('end').hidden=elapsed<10.35;if(elapsed>=12){finish();return;}frame=requestAnimationFrame(tick);}
function exitFilm(){stop();film=false;origin=null;get('end').hidden=true;delete document.body.dataset.film;delete document.body.dataset.finished;get('close-film').hidden=true;}
function play(){exitFilm();get('toast').querySelector('strong')!.textContent='A moment, saved.';get<HTMLInputElement>('query').value='';get('checkout').querySelector('span')!.textContent='Reserve your escape';film=true;paused=false;elapsed=0;get('progress').style.width='0%';document.body.dataset.film='true';get('close-film').hidden=false;choose(0);scene.render(0);window.scrollTo(0,0);if(reduced.matches){choose(5);get('end').hidden=false;elapsed=12;finish();return;}origin=performance.now();frame=requestAnimationFrame(tick);}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-study]'))b.addEventListener('click',()=>{exitFilm();choose(Number(b.dataset.study));});
get('pause').addEventListener('click',()=>{exitFilm();paused=!paused;scene.update(settings());ui();});
function returnToStudies(){exitFilm();paused=false;choose(selected);}
get('back').addEventListener('click',returnToStudies);get('close-film').addEventListener('click',returnToStudies);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&film)returnToStudies();});
get('toggle').addEventListener('click',()=>{enabled=!enabled;scene.update(settings());ui();});get('film').addEventListener('click',play);
get('find').addEventListener('click',()=>{get('status').textContent=`Demo search: ${get<HTMLInputElement>('query').value||'somewhere beautiful'}. No network request sent.`;get<HTMLInputElement>('query').focus();});
get('listen').addEventListener('click',()=>{const b=get('listen'),active=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(active));b.textContent=active?'Ⅱ':'▶';get('status').textContent=active?'Player UI active. This is a visual demo.':'Player UI paused.';});
get('dock').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{get('dock').querySelectorAll('button').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));get('status').textContent=`${b.getAttribute('aria-label')} selected in demo.`;}));
get<HTMLInputElement>('volume').addEventListener('input',e=>{const value=(e.currentTarget as HTMLInputElement).value;get('level').textContent=`${value}%`;get('status').textContent=`Light level demo ${value} percent.`;});
get('dismiss').addEventListener('click',()=>{get('toast').querySelector('strong')!.textContent='All caught up.';get('status').textContent='Notification acknowledged.';});get('checkout').addEventListener('click',()=>{get('checkout').querySelector('span')!.textContent='You’re on the list.';get('status').textContent='Booking UI confirmed. No actual reservation made.';});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&film&&origin!==null)finish();});
reduced.addEventListener('change',()=>{if(reduced.matches&&origin!==null)finish();ui();});
get('glass').addEventListener('webglcontextlost',()=>{finish();ui();});get('glass').addEventListener('webglcontextrestored',ui);
window.addEventListener('pagehide',()=>{destroyed=true;stop();scene.destroy();},{once:true});
(window as unknown as {causticFilm:unknown}).causticFilm={play,choose(index:number){exitFilm();choose(Math.max(0,Math.min(5,index)));},reset(){exitFilm();paused=false;choose(0);},pause(){paused=true;finish();},get state(){return{selected,paused,enabled,film,elapsed,running:frame!==null,supported:scene.supported,reducedMotion:reduced.matches,stats:scene.stats};}};
ui();
