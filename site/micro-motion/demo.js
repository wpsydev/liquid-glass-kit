import './style.css';
import { attachGlass, attachGlassTransition } from '../../src/index.ts';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const directions=['up','down','left','right'];
const controllers=[],transitions=new Map();
let duration=180,reducedMotion=false,saved=false,checks=0,frame=0,filmTime=0,eventIndex=0;
for(const element of $$('.surface'))controllers.push(attachGlass(element,{variant:'regular',appearance:'light',radius:15,tint:'#fff7e8',tintOpacity:.32,interactive:false}));
function options(direction='up'){return{direction,distance:20,duration,reducedMotion:reducedMotion?true:undefined};}
for(const direction of directions){const element=$(`#${direction}-visual`);const transition=attachGlassTransition(element,options(direction));transitions.set(direction,transition);controllers.push(transition);$(`#${direction}-trigger`).addEventListener('click',()=>reveal(direction));}
for(const name of ['confirm','reject']){const transition=attachGlassTransition($(`#${name}-visual`),options());transitions.set(name,transition);controllers.push(transition);}
async function reveal(direction){const element=$(`#${direction}-visual`),trigger=$(`#${direction}-trigger`),controller=transitions.get(direction);if(!element.hidden){const complete=await controller.exit();if(!complete)return;controller.cancel();}element.hidden=false;trigger.firstElementChild.textContent=`Replay ${direction==='up'?'toast':direction==='down'?'tray':direction==='left'?'source':'drawer'}`;void controller.enter();$('#live-status').textContent=`${direction[0].toUpperCase()+direction.slice(1)} reveal shown. Direction describes the animation's movement.`;}
$('#save-trigger').addEventListener('click',()=>{saved=!saved;$('#save-trigger').setAttribute('aria-pressed',String(saved));$('#save-trigger').firstElementChild.textContent=saved?'Saved · undo':'Save note';$('#save-trigger').lastElementChild.textContent=saved?'✓':'+';$('#save-symbol').textContent=saved?'✓':'+';$('#save-title').textContent=saved?'Saved.':'A keeper.';$('#save-detail').textContent=saved?'Kept in this demo session.':'Save this sample note.';void transitions.get('confirm').feedback('confirm');$('#live-status').textContent=saved?'Sample note saved locally for this demo session.':'Sample note removed from demo saves.';});
$('#check-trigger').addEventListener('click',()=>{checks++;$('#check-symbol').textContent='!';$('#check-title').textContent='Add a title first.';$('#check-detail').textContent='Nothing lost. Try again.';$('#check-trigger').firstElementChild.textContent='Check again';void transitions.get('reject').feedback('reject');$('#live-status').textContent='Sample note needs a title. Nothing was submitted.';});
function updateOptions(){for(const[name,controller]of transitions)controller.update(options(directions.includes(name)?name:'up'));}
function setSpeed(next){duration=next;$('#fast').setAttribute('aria-pressed',String(next===180));$('#soft').setAttribute('aria-pressed',String(next===240));updateOptions();setCaption('DIRECTED MOTION / '+next+' MS','Give every small action a clear response.');}
$('#fast').addEventListener('click',()=>setSpeed(180));$('#soft').addEventListener('click',()=>setSpeed(240));$('#reduce').addEventListener('click',()=>{reducedMotion=!reducedMotion;$('#reduce').setAttribute('aria-pressed',String(reducedMotion));updateOptions();$('#live-status').textContent=reducedMotion?'Reduced motion enabled. Animation resolves immediately.':'Demo override removed. Your system motion preference is respected.';});
function setCaption(index,caption){$('#film-index').textContent=index;$('#film-caption').textContent=caption;}
function pause(){cancelAnimationFrame(frame);frame=0;}
function reset(){pause();for(const[name,controller]of transitions){controller.cancel();if(directions.includes(name)){const element=$(`#${name}-visual`);element.hidden=true;$(`#${name}-trigger`).firstElementChild.textContent=`Reveal ${name==='up'?'toast':name==='down'?'tray':name==='left'?'source':'drawer'}`;}}saved=false;checks=0;$('#save-trigger').setAttribute('aria-pressed','false');$('#save-trigger').firstElementChild.textContent='Save note';$('#save-trigger').lastElementChild.textContent='+';$('#save-symbol').textContent='+';$('#save-title').textContent='A keeper.';$('#save-detail').textContent='Save this sample note.';$('#check-symbol').textContent='—';$('#check-title').textContent='Missing a title.';$('#check-detail').textContent='A gentle nudge to fix it.';$('#check-trigger').firstElementChild.textContent='Check sample';filmTime=0;eventIndex=0;delete document.body.dataset.end;$('#film-progress').style.width='0%';setCaption('DIRECTED MOTION / '+duration+' MS','Give every small action a clear response.');$('#live-status').textContent='';}
const timeline=[
 [0,()=>setCaption('01—04 / DIRECTED REVEALS','A little motion. A clearer next step.')],
 [.65,()=>$('#up-trigger').click()],
 [1.5,()=>$('#down-trigger').click()],
 [2.3,()=>$('#left-trigger').click()],
 [3.1,()=>$('#right-trigger').click()],
 [4,()=>{setCaption('05 / CONFIRM','Save it. See it. Keep moving.');$('#save-trigger').click();}],
 [5,()=>{setCaption('06 / GENTLE VALIDATION','A useful nudge, without a distraction.');$('#check-trigger').click();}],
 [6.5,()=>{setCaption('FOUR DIRECTIONS / '+duration+' MS','Quick entries. Clean exits. One small helper.');for(const direction of directions)$(`#${direction}-trigger`).click();}],
 [8.3,()=>{transitions.get('confirm').feedback('confirm');transitions.get('reject').feedback('reject');}],
 [9.5,()=>{document.body.dataset.end='true';setCaption('OPEN SOURCE / LIQUID GLASS KIT','Small moves. Better feel.');}],
];
function applyTo(seconds){filmTime=Math.max(0,Math.min(12,seconds));while(eventIndex<timeline.length&&timeline[eventIndex][0]<=filmTime){timeline[eventIndex][1]();eventIndex++;}$('#film-progress').style.width=`${filmTime/12*100}%`;}
function seek(seconds){reset();document.body.dataset.film='true';applyTo(seconds);}
function start(){reset();document.body.dataset.film='true';window.scrollTo(0,0);const startTime=performance.now();applyTo(0);const tick=now=>{applyTo((now-startTime)/1000);if(filmTime<12)frame=requestAnimationFrame(tick);else frame=0;};frame=requestAnimationFrame(tick);}
window.microMotionFilm={start,reset,seek,get state(){return{time:filmTime,running:Boolean(frame),eventIndex,duration,reducedMotion,saved,checks,visible:directions.filter(name=>!$(`#${name}-visual`).hidden)};}};
$('#play-film').addEventListener('click',start);
if(new URLSearchParams(location.search).has('film'))document.body.dataset.film='true';
reset();
window.addEventListener('pagehide',()=>{pause();controllers.reverse().forEach(controller=>controller.destroy());},{once:true});
