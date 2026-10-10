import './style.css';
import { attachGlass, attachGlassMotion, attachGlassOverlay } from '../../src/index.ts';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const controllers=[];
const sampleSources=[['The sheltered inlet','A calm morning visit, bounded to its time and place.','FIELD NOTE / 08:42'],['The tidal marker','A reference point beside the northern footpath.','PHOTO NOTE / 09:07'],['Open water','A wider view beyond the sheltered bay.','FIELD NOTE / 09:31'],['The old jetty','Weathered timber and the edge of the working harbour.','OBSERVATION / 10:04'],['The stone steps','A route down to the water, recorded on foot.','WALK LOG / 10:22'],['Reed beds','A small habitat at the quiet eastern margin.','FIELD NOTE / 11:18'],['The return path','The shoreline route reconnects with the hill road.','WALK LOG / 11:46'],['What remains uncertain','These authored records illustrate evidence handling only.','LIMITS / DEMO DATA']];
let selectedSource=-1,saved=false,filmTime=0,frame=0,eventIndex=0;
for(let index=0;index<sampleSources.length;index++){const [title,description,meta]=sampleSources[index];const button=document.createElement('button');button.type='button';button.dataset.note=String(index);button.setAttribute('aria-pressed','false');const number=document.createElement('span');number.className='library-number';number.textContent=`${String(index+1).padStart(2,'0')} / AUTHORED SAMPLE`;const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=description;const em=document.createElement('em');em.textContent=meta;button.append(number,strong,small,em);button.addEventListener('click',()=>chooseSource(index));$('#library-list').append(button);}
function chooseSource(index){selectedSource=index;$$('[data-note]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.note)===index)));$('#library-status').textContent=`Selected: ${sampleSources[index][0]}`;$('#selection-status').textContent=`Selected sample note ${String(index+1).padStart(2,'0')}`;}
function chooseModel(name,close=true){$('#model-current').textContent=name;$$('[data-model]').forEach(button=>{const selected=button.dataset.model===name;button.setAttribute('aria-pressed',String(selected));button.querySelector('.option-check').textContent=selected?'✓':'';});$('#selection-status').textContent=`Sample display mode: ${name}`;if(close&&$('#model-panel').matches(':popover-open'))$('#model-panel').hidePopover();}
$$('[data-model]').forEach(button=>button.addEventListener('click',()=>chooseModel(button.dataset.model)));
$('#save-source').addEventListener('click',()=>{saved=!saved;$('#save-source').firstChild.textContent=saved?'Sample source saved ':'Save sample source ';$('#save-source').lastElementChild.textContent=saved?'✓':'+';$('#source-save-status').textContent=saved?'Saved locally for this demo session.':'Source context stays beside the claim.';});
const hasPopover='showPopover' in HTMLElement.prototype;
const overlays=new Map();
controllers.push(attachGlass($('#toolbar'),{appearance:'dark',variant:'regular',radius:16,tint:'#9acabb',tintOpacity:.1}));
if(hasPopover){for(const [anchorId,panelId,placement,align] of [['source-trigger','source-panel','bottom','end'],['model-trigger','model-panel','bottom','end'],['library-trigger','library-panel','bottom','end']]){const anchor=$(`#${anchorId}`),panel=$(`#${panelId}`);const glass=attachGlass(panel,{variant:'regular',appearance:'light',radius:22,tint:'#e4f1e8',tintOpacity:.85});const overlay=attachGlassOverlay(anchor,panel,{placement,align,gap:10,padding:16});const motion=attachGlassMotion(panel,{stiffness:300,damping:26,stretch:0});overlays.set(panelId,{overlay,motion});controllers.push(glass,overlay,motion);panel.addEventListener('toggle',event=>{if(event.newState==='open'){overlay.refresh();void motion.enter();}});}}
else{const note=document.createElement('p');note.className='unsupported-note';note.textContent='This browser does not support native popovers. The authored research note remains readable.';$('#desk').append(note);$$('[popovertarget]').forEach(button=>button.disabled=true);}
$$('.toolbar button,.citation,.action-button,.model-options button').forEach(button=>controllers.push(attachGlassMotion(button,{pressScale:.97,stretch:.015})));
function open(id){if(!hasPopover)return;const panel=$(`#${id}`);if(!panel.matches(':popover-open'))document.querySelector(`button[popovertarget="${id}"]:not([popovertargetaction])`).click();}
function closeAll(){if(hasPopover)$$('[popover]').forEach(panel=>{if(panel.matches(':popover-open'))panel.hidePopover();});}
function setScene(index,title,detail){$('#film-index').textContent=index;$('#film-caption').textContent=title;$('#film-detail').textContent=detail;}
const timeline=[
 [0,()=>{setScene('01 / EDGE-AWARE PLACEMENT','A source, right where you need it.','Near the bottom? The panel opens above.');}],
 [.65,()=>open('source-panel')],
 [2.5,()=>$('#save-source').click()],
 [3.8,()=>{closeAll();setScene('02 / NATIVE CONTROLS','Choose without leaving the note.','A spring entry. An ordinary button.');open('model-panel');}],
 [5.1,()=>document.querySelector('[data-model="Deep"]').click()],
 [6.6,()=>{closeAll();setScene('03 / SCROLL WITHIN THE PANEL','Long lists, small screens.','Viewport fit keeps every source reachable.');open('library-panel');}],
 [7.25,()=>document.querySelector('[data-note="1"]').click()],
 [10.1,()=>document.querySelector('[data-note="7"]').click()],
 [11.0,()=>{closeAll();document.body.dataset.end='true';setScene('OPEN SOURCE / LIQUID GLASS KIT','Keep the details in reach.','Native popovers + viewport fit + spring entry.');}]
];
function pause(){cancelAnimationFrame(frame);frame=0;}
function reset(){pause();closeAll();filmTime=0;eventIndex=0;selectedSource=-1;delete document.body.dataset.end;chooseModel('Balanced',false);$$('[data-note]').forEach(button=>button.setAttribute('aria-pressed','false'));$('#library-list').scrollTop=0;$('#library-status').textContent='Choose a note to inspect it.';$('#selection-status').textContent='8 authored source notes';if(saved)$('#save-source').click();$('#film-progress').style.width='0%';setScene('01 / NATIVE POPOVERS','A source, right where you need it.','Open any control. Escape and outside click close it.');}
function applyTo(seconds){filmTime=Math.max(0,Math.min(12,seconds));while(eventIndex<timeline.length&&timeline[eventIndex][0]<=filmTime){timeline[eventIndex][1]();eventIndex++;}if(filmTime>=7.6&&filmTime<11){const list=$('#library-list');const fraction=Math.min(1,(filmTime-7.6)/2.3);list.scrollTop=(list.scrollHeight-list.clientHeight)*fraction;}$('#film-progress').style.width=`${filmTime/12*100}%`;}
function seek(seconds){reset();document.body.dataset.film='true';applyTo(seconds);}
function start(){reset();document.body.dataset.film='true';window.scrollTo(0,0);const started=performance.now();applyTo(0);const tick=now=>{applyTo((now-started)/1000);if(filmTime<12)frame=requestAnimationFrame(tick);else frame=0;};frame=requestAnimationFrame(tick);}
window.overlayFilm={start,seek,reset,get state(){return{time:filmTime,running:Boolean(frame),eventIndex,selectedSource,model:$('#model-current').textContent,saved};}};
$('#play-film').addEventListener('click',start);
if(new URLSearchParams(location.search).has('film'))document.body.dataset.film='true';
reset();
window.addEventListener('pagehide',()=>{pause();controllers.reverse().forEach(controller=>controller.destroy());},{once:true});
