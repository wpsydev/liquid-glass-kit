import './style.css';
import {attachGlassTabs} from '../../src/tabs.js';
import {attachGlassMotion} from '../../src/motion.js';
import {attachGlassOverlay} from '../../src/overlay.js';
import {attachGlassTransition} from '../../src/micro-motion.js';
import {createWorkspace, starter} from './state.js';
import type {Problem} from './model.js';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const workspace = createWorkspace();
const textarea = $<HTMLTextAreaElement>('source');textarea.value = workspace.source;
const tabs = attachGlassTabs($('file-tabs'));
const palette = $('palette'), toast = $('toast');
const overlay = attachGlassOverlay($('palette-trigger'), palette, {align:'end',gap:8,padding:12});
const feedback = attachGlassTransition($('live-card'),{duration:180,distance:4});
const motion = attachGlassMotion($('preview-action'),{pressScale:.97,stretch:.012});
let editor: ReturnType<typeof import('./editor.js')['mountEditor']> | undefined;
let model: typeof import('./model.js') | undefined;
let pending: Promise<void> | undefined, closed = false, toastTimer = 0, renderTimer = 0;
let lastIssues: Problem[] = [];
const timings = {editorLoadMs:0,lintMs:0,lintRuns:0};
const announce = (message: string) => { $('announcement').textContent = message; };
function notify(message: string) {
  $('toast-text').textContent = message; announce(message);
  if ('showPopover' in toast) toast.showPopover();
  window.clearTimeout(toastTimer);toastTimer = window.setTimeout(()=>toast.hidePopover?.(),3200);
}
function paint() {
  if (!model || closed) return;
  const start = performance.now();lastIssues = model.inspect(workspace.source);timings.lintMs = performance.now()-start;timings.lintRuns++;
  const values = model.tokens(workspace.source), card = $('live-card');
  card.style.borderRadius = `${values.corner}px`;card.style.padding = `${values.padding}px`;
  card.style.setProperty('--preview-accent',values.accent);$('preview-action').style.backgroundColor = values.accent;
  $('preview-radius').textContent = `${values.corner}px corners`;
  $('lint-status').textContent = lastIssues.length ? `${lastIssues.filter(p=>p.severity==='error').length} error · ${lastIssues.filter(p=>p.severity==='warning').length} warning` : '✓ Configured lint rules pass';
  $('problem-count').textContent = String(lastIssues.length);
  const list = $('problems');list.replaceChildren();
  if (!lastIssues.length) {const li=document.createElement('li');li.className='clean';li.textContent='✓ No diagnostics. Keep creating.';list.append(li);}
  for (const issue of lastIssues) {
    const li=document.createElement('li'),button=document.createElement('button'),icon=document.createElement('span'),text=document.createElement('span'),small=document.createElement('small');
    button.className='problem-button';icon.textContent=issue.severity==='error'?'×':'△';text.textContent=issue.message;small.textContent=`surface.css:${issue.line} · ${issue.rule}`;
    text.append(small);button.append(icon,text);button.addEventListener('click',()=>{tabs.select('css-tab');editor?.go(issue.from);});li.append(button);list.append(li);
  }
  $('branch-label').textContent = `⑂ ${workspace.branch}`;
  $('terminal-branch').textContent = workspace.branch;
  document.body.classList.toggle('light-preview',workspace.light);
  $('theme').setAttribute('aria-pressed',String(workspace.light));
  $('terminals').classList.toggle('single',!workspace.split);$('session-two').hidden=!workspace.split;
  $('split').setAttribute('aria-pressed',String(workspace.split));
  $('dirty-dot').hidden=workspace.source===starter;
}
function changed(value: string) { workspace.source=value;window.clearTimeout(renderTimer);renderTimer=window.setTimeout(paint,120); }
async function ensureTools() {
  if (model || closed) return;
  if (pending) return pending;
  const start=performance.now();
  pending=Promise.all([import('./model.js'),import('./editor.js')]).then(([loaded,editing])=>{
    if(closed)return;model=loaded;workspace.source=textarea.value;
    const hadFocus=document.activeElement===textarea,selection=textarea.selectionStart;
    editor=editing.mountEditor($('editor-host'),workspace.source,changed,(line,column)=>{$('cursor').textContent=`Ln ${line}, Col ${column} · CSS`;});
    editor.set(workspace.source);if(hadFocus)editor.go(selection);
    timings.editorLoadMs=performance.now()-start;paint();
  }).catch(()=>{pending=undefined;announce('Editor could not load. Plain text editing remains available; retry by focusing it.');$('lint-status').textContent='Editor unavailable · retry on focus';});
  return pending;
}
textarea.addEventListener('input',()=>{workspace.source=textarea.value;});
textarea.addEventListener('focus',()=>void ensureTools());
const output = (session: 'one'|'two', text: string, command?: string) => {
  const el=$('output-'+session);
  const addition=(command ? `❯ ${command}\n` : '')+text+'\n';
  el.textContent=((el.textContent ?? '')+addition).split('\n').slice(-100).join('\n').slice(-12000);el.scrollTop=el.scrollHeight;
};
output('one','GLASS STUDIO / local workspace\nTwo diagnostics await your attention.\nType lint or help to begin.');
output('two','⑂ main\nChanges live in memory.\nTry tokens or branch experiment.');
async function execute(command: string,session: 'one'|'two'='one') {
  await ensureTools();if(!model)return;
  const previous=workspace.source,result=model.runCommand(workspace,command);
  if(command.trim()==='clear')$('output-'+session).textContent='';else output(session,result,command);
  if(previous!==workspace.source)editor?.set(workspace.source);
  paint();announce(command.trim()==='lint'?`${lastIssues.length} CSS diagnostics.`:'Command completed in the local workspace.');
  return result;
}
for (const session of ['one','two'] as const) {
  const form=$('form-'+session),input=$<HTMLInputElement>('command-'+session);const history:string[]=[];let cursor=0,draft='';
  form.addEventListener('submit',event=>{event.preventDefault();const command=input.value.trim();if(!command)return;input.value='';history.push(command);if(history.length>50)history.shift();cursor=history.length;draft='';void execute(command,session);});
  input.addEventListener('keydown',event=>{if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;event.preventDefault();if(cursor===history.length)draft=input.value;cursor=Math.max(0,Math.min(history.length,cursor+(event.key==='ArrowUp'?-1:1)));input.value=history[cursor]??draft;});
}
$('fix').addEventListener('click',async()=>{await execute('fix');notify(lastIssues.length?'Known fixes applied; remaining diagnostics need an edit.':'Known fixes applied. Configured rules pass.');void feedback.feedback('confirm');});
$('theme').addEventListener('click',()=>void execute('theme'));
$('split').addEventListener('click',()=>void execute('split'));
$('preview-action').addEventListener('click',()=>{tabs.select('css-tab');void ensureTools().then(()=>editor?.go(0));notify('Workspace ready. Edit the surface to make it yours.');});
$('toast-close').addEventListener('click',()=>toast.hidePopover?.());
function reset() {workspace.source=starter;workspace.branch='main';workspace.branches=new Map([['main',starter]]);workspace.light=false;workspace.split=true;textarea.value=starter;editor?.set(starter);tabs.select('css-tab');$('output-one').textContent='';$('output-two').textContent='';output('one','GLASS STUDIO / local workspace\nTry lint or help.');output('two','⑂ main\nIndependent terminal history.');paint();announce('Workspace reset. Changes stay in this tab.');}
$('reset').addEventListener('click',reset);
const actions=[['Fix known diagnostics','fix'],['Run CSS lint','lint'],['Inspect surface tokens','tokens'],['Toggle preview theme','theme'],['Toggle split terminals','split'],['Create experiment branch','branch experiment']] as const;
function filterActions() {const filter=$<HTMLInputElement>('palette-filter').value.toLowerCase();$('palette-actions').replaceChildren();for(const [label,command] of actions.filter(([label])=>label.toLowerCase().includes(filter))){const button=document.createElement('button');button.textContent=label;const small=document.createElement('small');small.textContent=command;button.append(small);button.addEventListener('click',()=>{palette.hidePopover?.();void execute(command).then(()=>notify(label+'.'));});$('palette-actions').append(button);}}
filterActions();$('palette-filter').addEventListener('input',filterActions);
palette.addEventListener('toggle',event=>{if((event as ToggleEvent).newState==='open'){filterActions();$<HTMLInputElement>('palette-filter').focus();overlay.refresh();}});
palette.addEventListener('keydown',event=>{const e=event as KeyboardEvent;const buttons=[...palette.querySelectorAll<HTMLButtonElement>('button')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}else if(e.key==='Enter'&&event.target===$('palette-filter')){e.preventDefault();buttons[0]?.click();}});
const key = (event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if('togglePopover'in palette)palette.togglePopover();}};document.addEventListener('keydown',key);
let tourTimers:number[]=[];
const stopTour=()=>{tourTimers.forEach(clearTimeout);tourTimers=[];$('tour').textContent='Play 12s tour';};
async function tour(){if(tourTimers.length){stopTour();return;}await ensureTools();if(!model)return;reset();if(matchMedia('(prefers-reduced-motion: reduce)').matches){await execute('fix');announce('Tour skipped for reduced motion. Explore the workspace at your own pace.');return;}$('tour').textContent='Stop tour';const steps:[number,()=>void][]=[[400,()=>void execute('lint')],[2200,()=>{$('fix').click();}],[4000,()=>{workspace.source=workspace.source.replace('24px','38px');editor?.set(workspace.source);paint();}],[5700,()=>void execute('tokens','two')],[7400,()=>{void execute('branch experiment','two');}],[9000,()=>void execute('theme')],[10500,()=>notify('Built for the work. Glass around the edges.')],[12000,stopTour]];tourTimers=steps.map(([delay,fn])=>window.setTimeout(fn,delay));}
$('tour').addEventListener('click',()=>void tour());
const visibility=()=>{if(document.hidden)stopTour();};document.addEventListener('visibilitychange',visibility);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');const preference=()=>{if(reduced.matches)stopTour();};reduced.addEventListener('change',preference);
const idle=window.setTimeout(()=>void ensureTools(),250);
window.addEventListener('pagehide',()=>{closed=true;stopTour();clearTimeout(idle);clearTimeout(renderTimer);clearTimeout(toastTimer);editor?.destroy();tabs.destroy();overlay.destroy();feedback.destroy();motion.destroy();document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preference);},{once:true});
Object.assign(window,{glassWorkbench:{execute,reset,tour,stopTour,ensureTools,setSource:async(value:string)=>{await ensureTools();workspace.source=value;textarea.value=value;editor?.set(value);paint();},get state(){return {source:workspace.source,branch:workspace.branch,branches:[...workspace.branches.keys()],split:workspace.split,light:workspace.light,issues:lastIssues,editorReady:!!editor,timings:{...timings}};}}});
