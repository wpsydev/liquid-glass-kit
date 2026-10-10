import '../../src/styles.css';
import './design.css';
import { attachGlass, attachGlassIndicator, attachGlassMotion } from '../../src/index.ts';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const initialDraft = 'We believe that good tools should help people in order to make their work feel more clear and more considered.\n\nAn assistant can offer a suggestion. The writer decides what stays.';
const sources = {
  1: ['SELECTED / INTERVIEW', '“A summary is helpful, but I still want to look at the note before I use the claim.”', 'Illustrative participant P04. This source text was written for the demo.'],
  2: ['SELECTED / OBSERVATION', '“The researcher compared the answer with the raw note, then marked one sentence as an inference.”', 'Authored sample observation. This is an interface study, not a research finding.'],
  3: ['SELECTED / ASSUMPTION', '“A confidence label needs an explanation. A number alone can imply more certainty than we have.”', 'Authored product assumption. It remains unvalidated in this sample.'],
};
const toolbarGlass = attachGlass($('#workflow-toolbar'), { appearance:'light', radius:14, blur:12 });
const backingGlass = attachGlass($('#workflow-backing'), { appearance:'light', radius:10, blur:8 });
const indicator = attachGlassIndicator($('#workflow-toolbar'), $('#workflow-backing'), { motion:'spring', radius:10, stiffness:300, damping:26 });
const motionControllers = $$('.workflow-toolbar button, .primary-button').map(button => attachGlassMotion(button,{pressScale:.97}));
const sample = { workflow:'research', source:1, selection:[0,0], before:'', after:'', status:'original', snapshotBefore:'', snapshotAfter:'', run:'idle', attempt:0, approved:false };
let runTimers = [];
function clearRunTimers(){runTimers.forEach(clearTimeout);runTimers=[];}
function switchWorkflow(name){
  sample.workflow=name;
  $$('.workflow').forEach(pane => { pane.hidden=pane.id!==name; pane.classList.toggle('is-entering',pane.id===name); });
  $$('.workflow-toolbar button').forEach(button => {button.setAttribute('aria-pressed',String(button.dataset.workflow===name)); if(button.dataset.workflow===name)indicator.moveTo(button);});
  const labels={research:['QUESTION / ANSWER / EVIDENCE','01 / RESEARCH','Put evidence beside the answer.','Keep the source and the uncertainty within reach.'],writing:['SELECT / SUGGEST / DECIDE','02 / WRITING','Keep the original within reach.','Small, scoped suggestions. A choice to keep or undo.'],agent:['PLAN / PROGRESS / PERMISSION','03 / AGENT','Let the agent show its work.','A bounded plan, a recoverable failure, a human decision.']};
  $('#workspace-meta').textContent=labels[name][0];$('#film-index').textContent=labels[name][1];$('#film-caption').textContent=labels[name][2];$('#film-detail').textContent=labels[name][3];
}
function selectSource(id){
  sample.source=+id;
  $$('.source-list button').forEach(button=>button.setAttribute('aria-pressed',String(+button.dataset.source===sample.source)));
  $$('.citation').forEach(button=>button.setAttribute('aria-current',String(+button.dataset.source===sample.source)));
  const data=sources[id];$('#source-type').textContent=data[0];$('#source-quote').textContent=data[1];$('#source-detail').textContent=data[2];
}
function selectionChanged(){
  const draft=$('#draft');sample.selection=[draft.selectionStart,draft.selectionEnd];
  const selected=sample.selection[1]>sample.selection[0];$('#suggest-edit').disabled=!selected;
  $('#selection-status').textContent=selected?'Passage selected / ready to suggest.':'Select a passage to start.';
}
function selectOpening(){const draft=$('#draft');draft.focus({preventScroll:true});draft.setSelectionRange(0,draft.value.indexOf('.')+1);selectionChanged();}
function suggestEdit(){
  if(sample.selection[1]<=sample.selection[0])return;
  const draft=$('#draft');sample.snapshotBefore=draft.value;sample.snapshotAfter='';sample.before=draft.value.slice(...sample.selection);
  sample.after=sample.before.replace(/^We believe that good tools should help people in order to make their work feel more clear and more considered\.$/,'Good tools help people do clear, considered work.');
  if(sample.after===sample.before)sample.after=sample.before.replace(/\b(in order to)\b/gi,'to').replace(/\b(really|very|basically|actually)\s+/gi,'').replace(/\s{2,}/g,' ').trim();
  $('#diff-old').textContent=sample.before;$('#diff-new').textContent=sample.after;
  $('#diff-empty').hidden=true;$('#diff-view').hidden=false;$('#keep-edit').disabled=sample.after===sample.before;$('#keep-edit').hidden=false;$('#revert-edit').disabled=false;$('#revert-edit').textContent='Dismiss';sample.status='suggested';
  $('#edit-status').textContent=sample.after===sample.before?'This passage is already concise. The sample rule made no changes.':'Deterministic sample suggestion. You choose what stays.';
}
function keepEdit(){
  if(sample.status!=='suggested'||sample.after===sample.before)return;
  const draft=$('#draft');if(draft.value!==sample.snapshotBefore){invalidateProposal();return;}draft.value=draft.value.slice(0,sample.selection[0])+sample.after+draft.value.slice(sample.selection[1]);
  sample.snapshotAfter=draft.value;sample.selection=[sample.selection[0],sample.selection[0]+sample.after.length];sample.status='kept';$('#draft-state').textContent='EDIT KEPT / UNDO AVAILABLE';$('#keep-edit').disabled=true;$('#revert-edit').textContent='Undo this edit';$('#edit-status').textContent='Applied to the selected passage only. You can undo it.';
}
function revertEdit(){
  if(sample.status==='kept'){if($('#draft').value!==sample.snapshotAfter){invalidateProposal();return;}$('#draft').value=$('#draft').value.slice(0,sample.selection[0])+sample.before+$('#draft').value.slice(sample.selection[1]);$('#draft-state').textContent='ORIGINAL RESTORED';}
  sample.status='original';$('#diff-empty').hidden=false;$('#diff-view').hidden=true;$('#suggest-edit').disabled=true;$('#selection-status').textContent='Original within reach. Select another passage.';
}
function resetWriting(){ $('#draft').value=initialDraft;$('#diff-empty h4').textContent='Start with a selection.';$('#diff-empty p').textContent='The rest of your draft stays untouched.';sample.selection=[0,0];sample.before='';sample.after='';sample.snapshotBefore='';sample.snapshotAfter='';sample.status='original';$('#revert-edit').disabled=false;$('#draft-state').textContent='YOUR ORIGINAL';$('#diff-empty').hidden=false;$('#diff-view').hidden=true;$('#suggest-edit').disabled=true;$('#selection-status').textContent='Select a passage to start.'; }
function step(id,state,label){const element=$(`[data-step="${id}"]`);element.dataset.state=state;element.querySelector('.step-state').textContent=label;}
function runProgress(percent,label){$('#run-percent').textContent=`${percent}%`;$('#run-progress-bar').style.width=`${percent}%`;$('#run-progress-label').textContent=label;}
function log(time,message){const p=document.createElement('p'),span=document.createElement('span');span.textContent=time;p.append(span,document.createTextNode(message));$('#run-log').append(p);$('#run-log').scrollTop=$('#run-log').scrollHeight;}
function resetRun(){clearRunTimers();sample.run='idle';sample.attempt=0;sample.approved=false;$('#run-state').textContent='NOT STARTED';[1,2,3].forEach(id=>step(id,'pending','Pending'));runProgress(0,'Waiting to start');$('#run-log').replaceChildren();log('00:00','Nothing has been changed.');$('#run-notice').hidden=true;$('#start-run').hidden=false;$('#retry-run').hidden=true;$('#review-run').hidden=true;$('#approval-dialog').close();}
function beginRun(){sample.run='running';sample.attempt++;$('#run-state').textContent='RUNNING';$('#start-run').hidden=true;$('#retry-run').hidden=true;$('#run-notice').hidden=true;step(1,'active','Running');runProgress(15,'Inspecting the sample package');log('00:01','Reading version and release notes.');}
function inspectComplete(){step(1,'complete','Done');step(2,'active','Running');runProgress(40,'Running the sample checks');log('00:02','Package inspected. Starting build checks.');}
function failRun(){sample.run='failed';$('#run-state').textContent='RECOVERABLE FAILURE';step(2,'failed','Interrupted');runProgress(40,'Build check interrupted');$('#run-notice').hidden=false;$('#run-notice').dataset.kind='error';$('#run-notice').textContent='The sample build check was interrupted. Nothing was published. Retry this step.';$('#retry-run').hidden=false;log('00:03','Build check interrupted. Waiting for retry.');}
function retryRun(){sample.run='running';sample.attempt++;$('#run-state').textContent='RETRYING CHECK';step(2,'active','Retrying');$('#run-notice').hidden=true;$('#retry-run').hidden=true;runProgress(55,'Retrying the failed check');log('00:04','Retrying the check. Completed steps are preserved.');}
function checksPass(){sample.run='approval';$('#run-state').textContent='WAITING FOR YOU';step(2,'complete','Passed');step(3,'active','Your decision');runProgress(80,'Checks passed / awaiting approval');$('#review-run').hidden=false;$('#run-notice').hidden=false;$('#run-notice').dataset.kind='success';$('#run-notice').textContent='Sample checks passed. The agent stopped before publishing. Review the preview.';log('00:05','Stopped at the publishing boundary. Approval required.');}
function approveRun(){if(sample.run!=='approval')return;sample.approved=true;sample.run='complete';$('#approval-dialog').close();$('#review-run').hidden=true;$('#run-state').textContent='SIMULATION COMPLETE';step(3,'complete','Approved');runProgress(100,'Sample preview approved');$('#run-notice').hidden=false;$('#run-notice').dataset.kind='success';$('#run-notice').textContent='You approved the sample preview. Simulation complete; no network action occurred.';log('00:06','Human approval received. Simulation finished.');}
function actualRun(){clearRunTimers();beginRun();runTimers.push(setTimeout(inspectComplete,650),setTimeout(failRun,1400));}
function actualRetry(){clearRunTimers();retryRun();runTimers.push(setTimeout(checksPass,850));}
$$('[data-workflow]').forEach(button=>button.addEventListener('click',()=>{pauseFilm();switchWorkflow(button.dataset.workflow);}));
$$('[data-source]').forEach(button=>button.addEventListener('click',()=>selectSource(button.dataset.source)));
$('#draft').addEventListener('select',selectionChanged);$('#draft').addEventListener('keyup',selectionChanged);$('#draft').addEventListener('pointerup',selectionChanged);
function invalidateProposal(){sample.status='edited';sample.snapshotBefore='';sample.snapshotAfter='';$('#diff-view').hidden=true;$('#diff-empty').hidden=false;$('#draft-state').textContent='MANUAL EDIT PRESERVED';$('#diff-empty h4').textContent='Your new draft is safe.';$('#diff-empty p').textContent='Select a passage to create a fresh suggestion.';$('#suggest-edit').disabled=true;$('#selection-status').textContent='Previous suggestion invalidated. Your draft is unchanged.';}
$('#draft').addEventListener('input',()=>{if(sample.status==='kept'||sample.status==='suggested')invalidateProposal();selectionChanged();});
$('#select-passage').addEventListener('click',selectOpening);$('#suggest-edit').addEventListener('click',suggestEdit);$('#keep-edit').addEventListener('click',keepEdit);$('#revert-edit').addEventListener('click',revertEdit);
$('#start-run').addEventListener('click',actualRun);$('#retry-run').addEventListener('click',actualRetry);$('#reset-run').addEventListener('click',resetRun);$('#review-run').addEventListener('click',()=>$('#approval-dialog').showModal());$('#approve-run').addEventListener('click',approveRun);

let frame=0,started=0,filmTime=0,eventIndex=0;
const timeline=[
 [0,()=>switchWorkflow('research')],[1.1,()=>selectSource(2)],[2.2,()=>selectSource(3)],
 [3.5,()=>{switchWorkflow('writing');selectOpening();}],[4.1,suggestEdit],[5.0,keepEdit],[6.2,revertEdit],
 [7.0,()=>{switchWorkflow('agent');beginRun();}],[7.45,inspectComplete],[7.95,failRun],[8.5,retryRun],[9.05,checksPass],
 [9.7,()=>$('#approval-dialog').showModal()],[10.5,approveRun],
 [11.0,()=>{document.body.dataset.end='true';$('#film-index').textContent='THREE WORKFLOWS / ONE MATERIAL KIT';$('#film-caption').textContent='Design the work with care.';$('#film-detail').textContent='Resources + agent brief below. Open source.';}] ];
function pauseFilm(){cancelAnimationFrame(frame);frame=0;}
function resetFilm(){pauseFilm();clearRunTimers();filmTime=0;eventIndex=0;delete document.body.dataset.end;resetWriting();resetRun();selectSource(1);switchWorkflow('research');$('#film-progress').style.width='0%';}
function applyTo(seconds){filmTime=Math.max(0,Math.min(12,seconds));while(eventIndex<timeline.length&&timeline[eventIndex][0]<=filmTime){timeline[eventIndex][1]();eventIndex++;}$('#film-progress').style.width=`${filmTime/12*100}%`;}
function seek(seconds){resetFilm();applyTo(seconds);}
function startFilm(){resetFilm();document.body.dataset.film='true';window.scrollTo(0,0);started=performance.now();applyTo(0);const tick=now=>{applyTo((now-started)/1000);if(filmTime<12)frame=requestAnimationFrame(tick);else frame=0;};frame=requestAnimationFrame(tick);}
window.aiDesignFilm={start:startFilm,seek,reset:resetFilm,get state(){return{...sample,time:filmTime,running:Boolean(frame),eventIndex};}};
$('#play-film').addEventListener('click',startFilm);
if(new URLSearchParams(location.search).has('film'))document.body.dataset.film='true';
resetFilm();
window.addEventListener('pagehide',()=>{pauseFilm();clearRunTimers();motionControllers.reverse().forEach(controller=>controller.destroy());indicator.destroy();backingGlass.destroy();toolbarGlass.destroy();},{once:true});
