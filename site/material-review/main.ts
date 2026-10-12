import '../../src/material.css';
import './style.css';
import { getGlassProps, resolveOptions } from '../../src/material.js';
import type { ResolvedGlassOptions } from '../../src/material.js';
import { createGlassMaterialDraft } from '../../src/material-draft.js';
import type { GlassMaterialDraftRequest } from '../../src/material-draft.js';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const buttons = ['before','after','undo','redo','prepare','apply','cancel','new-draft','conflict','cobalt','copper','clear'] as const;
const initial = () => resolveOptions({ appearance:'dark', backdrop:'dark', blur:18, radius:24, tint:'#7598ff', tintOpacity:.12, corner:'continuous', interactive:false });
let hostMaterial: ResolvedGlassOptions = initial(), hostVersion = 1;
const revision = () => 'local-r' + hostVersion;
let draft = createGlassMaterialDraft({ initial:hostMaterial,revision:revision(),historyLimit:24 });
let prepared: GlassMaterialDraftRequest | null = null;
let applied = 0, conflictCount = 0, message = 'Editing a local draft. Nothing has been applied.';
let timers: number[] = [], touring = false;
const changes: string[] = [];
function log(text: string) { changes.push(text); if(changes.length > 30) changes.shift(); message=text; }
function applyMaterial(target: HTMLElement, options: ResolvedGlassOptions) {
  const props=getGlassProps({ ...options, reducedTransparency:options.reducedTransparency || el<HTMLInputElement>('solid').checked });
  target.classList.add(props.className);
  for (const [key,value] of Object.entries(props)) {
    if(key==='style') for(const [name,v] of Object.entries(value as Record<string,string>)) target.style.setProperty(name,v);
    else if(key!=='className') target.setAttribute(key,String(value));
  }
}
function render(syncFields=true) {
  const s=draft.state; applyMaterial(el('preview-material'),s.previewMaterial);applyMaterial(el('applied-material'),hostMaterial);
  el('phase').textContent=s.status;
  el('base-revision').textContent=s.baseRevision;el('host-revision').textContent=revision();
  el('host-facts').textContent=revision()+' / '+hostMaterial.blur+'px';
  el('preview-label').textContent=s.previewMode==='before'?'Before · captured baseline':s.status==='prepared'?'After · prepared, not applied':'After · staged material';
  el('history-count').textContent=String(s.historyIndex+1).padStart(2,'0')+' / '+String(s.historyLength).padStart(2,'0');
  el('status').textContent=message;
  for(const id of ['before','after']) el(id).setAttribute('aria-pressed',String(s.previewMode===id));
  (el('fields') as HTMLFieldSetElement).disabled=s.status!=='editing';
  for(const id of ['before','after','cobalt','copper','clear','prepare','cancel']) el<HTMLButtonElement>(id).disabled=s.status!=='editing';
  el<HTMLButtonElement>('undo').disabled=!s.canUndo;el<HTMLButtonElement>('redo').disabled=!s.canRedo;
  el<HTMLButtonElement>('apply').disabled=!prepared || hostMaterial===prepared.material;
  if(syncFields) {
    for(const key of ['blur','radius','tintOpacity'] as const) el<HTMLInputElement>(key).value=String(s.after[key]);
    el<HTMLSelectElement>('corner').value=s.after.corner;
  }
  for(const key of ['blur','radius','tintOpacity'] as const) el(key+'-value').textContent=key==='tintOpacity'?s.after[key].toFixed(2):s.after[key]+' px';
  el('record').textContent=prepared?JSON.stringify({ kind:prepared.kind,baseRevision:prepared.baseRevision,draftVersion:prepared.draftVersion,material:{blur:prepared.material.blur,radius:prepared.material.radius,tint:prepared.material.tint,tintOpacity:prepared.material.tintOpacity,corner:prepared.material.corner},hostApplied:applied>0&&hostMaterial===prepared.material },null,2):s.status==='cancelled'?'Draft cancelled. Host material was not rolled back.':'No prepared request.\nEdit → compare → prepare → apply locally';
}
function newDraft() { prepared=null;draft=createGlassMaterialDraft({initial:hostMaterial,revision:revision(),historyLimit:24});log('New draft captures '+revision()+'. No material change applied.');render(); }
function preset(name: string) {
  if(draft.state.status!=='editing') newDraft();
  const options=name==='copper'?{blur:8,radius:12,tint:'#e9a17b',tintOpacity:.36,corner:'round' as const}:name==='clear'?{variant:'clear' as const,blur:3,radius:36,tint:'#9ad1ff',tintOpacity:.06,opacity:.65}: {variant:'regular' as const,blur:28,radius:38,tint:'#658bff',tintOpacity:.3,opacity:1,corner:'continuous' as const};
  draft.patch(options);log(name+' staged. Host material is unchanged.');render();
}
function prepare() { const result=draft.commit(revision());if(result.ok) {prepared=result.request;log('Review prepared. Apply locally is still a separate action.');}else {conflictCount++;log('Revision conflict: captured '+result.baseRevision+', host '+result.suppliedRevision+'. Draft preserved.');}render(); }
function apply() {
  if(!prepared)return;
  if(prepared.baseRevision!==revision()) {conflictCount++;log('Apply blocked: local host revision changed after preparation.');render();return;}
  // This synchronous local fixture owns its revision and DOM. No server transaction, storage or source write occurs.
  hostMaterial=prepared.material;hostVersion++;applied++;log('Prepared material applied locally as '+revision()+'. Nothing persisted to a server.');render();el<HTMLButtonElement>('apply').disabled=true;
}
function cancelTour() {timers.forEach(clearTimeout);timers=[];touring=false;}
function reset() {cancelTour();hostMaterial=initial();hostVersion=1;applied=0;conflictCount=0;prepared=null;changes.length=0;draft=createGlassMaterialDraft({initial:hostMaterial,revision:revision(),historyLimit:24});message='Editing a local draft. Nothing has been applied.';el<HTMLTextAreaElement>('note').value='More breathing room, quieter edges.';render();}
function tour() {
  reset();touring=true;
  const at=(ms:number,fn:()=>void)=>timers.push(window.setTimeout(fn,ms));
  at(300,()=>preset('cobalt'));at(1400,()=>{draft.preview('before');log('Before comparison preserves the pending edit.');render();});
  at(2500,()=>{draft.preview('after');render();});at(3600,()=>preset('copper'));
  at(4600,()=>{draft.undo();log('Undo restores the previous material intent.');render();});at(5500,()=>{draft.redo();log('Redo restores the copper material intent.');render();});
  at(6400,prepare);at(7400,apply);at(8200,()=>{newDraft();preset('clear');hostVersion++;log('Host revision changed locally; pending edit remains intact.');render();});at(9300,prepare);at(10500,()=>{touring=false;timers=[];});
}
for(const key of ['blur','radius','tintOpacity'] as const) el<HTMLInputElement>(key).addEventListener('input',()=>{cancelTour();draft.patch({[key]:Number(el<HTMLInputElement>(key).value)});log('Staged '+key+' edit. Nothing applied.');render(false);});
el<HTMLSelectElement>('corner').addEventListener('change',()=>{cancelTour();draft.patch({corner:el<HTMLSelectElement>('corner').value as 'round'|'continuous'});log('Corner preference staged; browser support determines continuous shape.');render(false);});
const actions:Record<(typeof buttons)[number],()=>void>={before:()=>{draft.preview('before');log('Showing the captured baseline, retaining the pending material.');render();},after:()=>{draft.preview('after');log('Showing the staged material.');render();},undo:()=>{draft.undo();log('Undo changes draft history only.');render();},redo:()=>{draft.redo();log('Redo changes draft history only.');render();},prepare,apply,cancel:()=>{draft.cancel();log('Draft cancelled. Host material remains unchanged.');render();},'new-draft':newDraft,conflict:()=>{hostVersion++;log('Host revision changed locally to '+revision()+'. Material preserved.');render();},cobalt:()=>preset('cobalt'),copper:()=>preset('copper'),clear:()=>preset('clear')};
for(const id of buttons)el(id).addEventListener('click',()=>{cancelTour();actions[id]();});
el('reset').addEventListener('click',reset);el('tour').addEventListener('click',tour);el('solid').addEventListener('change',()=>{cancelTour();render(false);});el('quiet').addEventListener('change',()=>{cancelTour();document.body.classList.toggle('quiet',el<HTMLInputElement>('quiet').checked);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelTour();});
render();
Object.assign(window,{__materialReviewDemo:{reset,cancel:cancelTour,preset,tour,state:()=>({draft:draft.state,prepared,hostMaterial,hostRevision:revision(),applied,conflicts:conflictCount,touring,note:el<HTMLTextAreaElement>('note').value,changes:[...changes],quiet:el<HTMLInputElement>('quiet').checked,solid:el<HTMLInputElement>('solid').checked})}});
