import { constants } from 'node:fs';
import { lstat, open, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { inspectGlassCSS, GLASS_CSS_CHARACTER_LIMIT, GLASS_CSS_DIAGNOSTIC_LIMIT } from './css-checker.js';
import type { GlassCSSDiagnostic } from './css-checker.js';
export const LINT_LIMITS = Object.freeze({ files:32,fileBytes:256000,sourceCharacters:GLASS_CSS_CHARACTER_LIMIT,aggregateBytes:2048000,aggregateCharacters:1024000,stdinBytes:256000,diagnosticsPerFile:GLASS_CSS_DIAGNOSTIC_LIMIT,diagnosticsTotal:120,outputBytes:131072,pathCharacters:2048 });
export const CONFIGURED_RULES = Object.freeze(['syntax','property-typo','explicit-transition']);
export type LintReason = 'unsupported-extension'|'outside-root'|'symlink'|'not-regular-file'|'file-unavailable'|'file-limit'|'source-limit'|'invalid-utf8'|'aggregate-limit'|'changed-file'|'invalid-path';
export interface LintFileResult { file:string;status:'checked'|'findings'|'skipped'|'error';reason?:LintReason;diagnostics:GlassCSSDiagnostic[];diagnosticLimitReached:boolean }
export interface LintReport { schemaVersion:1;rules:readonly string[];limits:typeof LINT_LIMITS;files:LintFileResult[];summary:{checked:number;findingsFiles:number;skipped:number;errors:number;diagnosticsDisplayed:number} }
export interface CanonicalLintRoot { configured:string;canonical:string }
export class LintInputError extends Error { constructor(readonly reason:string){super(reason);} }
export function safePath(value:unknown):string {
  if(typeof value!=='string'||!value||value.length>LINT_LIMITS.pathCharacters||/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028-\u202e\u2066-\u2069]/u.test(value)||sep!=='\\'&&value.includes('\\')||value.split(/[\\/]/u).includes('..'))throw new LintInputError('invalid-path');
  return value;
}
function within(root:string,path:string):boolean {const location=relative(root,path);return !isAbsolute(location)&&location!=='..'&&!location.startsWith('..'+sep);}
export async function canonicalLintRoot(path:string):Promise<CanonicalLintRoot>{
  const configured=resolve(safePath(path));
  try{const canonical=await realpath(configured);if(!(await stat(canonical)).isDirectory())throw new Error();return Object.freeze({configured,canonical});}catch{throw new LintInputError('root-unavailable');}
}
export function relativeLintPath(root:CanonicalLintRoot,path:string):{path:string;name:string}{
  const input=safePath(path),absolute=resolve(root.configured,input);
  const basis=within(root.configured,absolute)?root.configured:root.canonical;
  if(!within(basis,absolute))throw new LintInputError('outside-root');
  const name=relative(basis,absolute),parts=name.split(sep);
  if(!name||parts.length>64)throw new LintInputError('invalid-path');
  return {path:resolve(root.canonical,name),name:name.split(sep).join('/')};
}
function empty(file:string,status:LintFileResult['status'],reason?:LintReason):LintFileResult{return{file,status,...(reason?{reason}:{}),diagnostics:[],diagnosticLimitReached:false};}
export function decodeCSS(bytes:Uint8Array):string {try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new LintInputError('invalid-utf8');}}
export function lintSource(source:string,name='stdin.css'):LintFileResult{
  if(source.length>LINT_LIMITS.sourceCharacters)return empty(name,'error','source-limit');
  const diagnostics=inspectGlassCSS(source);return {file:name,status:diagnostics.length?'findings':'checked',diagnostics,diagnosticLimitReached:diagnostics.length>=LINT_LIMITS.diagnosticsPerFile};
}
export function lintReport(files:LintFileResult[]):LintReport{
  let displayed=0;
  const bounded=files.map(file=>{const remaining=LINT_LIMITS.diagnosticsTotal-displayed;const diagnostics=file.diagnostics.slice(0,remaining);displayed+=diagnostics.length;return {...file,diagnostics,diagnosticLimitReached:file.diagnosticLimitReached||diagnostics.length<file.diagnostics.length};});
  return {schemaVersion:1,rules:CONFIGURED_RULES,limits:LINT_LIMITS,files:bounded,summary:{checked:bounded.filter(file=>file.status==='checked'||file.status==='findings').length,findingsFiles:bounded.filter(file=>file.status==='findings').length,skipped:bounded.filter(file=>file.status==='skipped').length,errors:bounded.filter(file=>file.status==='error').length,diagnosticsDisplayed:displayed}};
}
export function lintExit(report:LintReport):0|1|2{return report.summary.errors?2:report.summary.findingsFiles?1:0;}
/** Read regular files only. Root itself is canonicalized explicitly; all interior symlinks are rejected.
 * Descriptor/path identity is rechecked before reading. This is not an adversarial-filesystem sandbox.
 */
export async function lintFiles(root:CanonicalLintRoot,paths:readonly string[]):Promise<LintReport>{
  if(!paths.length||paths.length>LINT_LIMITS.files)throw new LintInputError('file-count');
  const files:LintFileResult[]=[];let bytesRead=0,charactersRead=0;
  for(const [index,requested]of paths.entries()){
    let name=`argument-${index+1}`,handle:Awaited<ReturnType<typeof open>>|undefined;
    try{
      const selected=relativeLintPath(root,requested);name=selected.name;
      if(!/\.css$/iu.test(name)){files.push(empty(name,'skipped','unsupported-extension'));continue;}
      let cursor=root.canonical;const parts=relative(root.canonical,selected.path).split(sep);
      for(const [position,part]of parts.entries()){cursor=join(cursor,part);const information=await lstat(cursor);if(information.isSymbolicLink())throw new LintInputError('symlink');if(position<parts.length-1&&!information.isDirectory())throw new LintInputError('not-regular-file');if(position===parts.length-1&&!information.isFile())throw new LintInputError('not-regular-file');}
      const canonical=await realpath(selected.path);if(!within(root.canonical,canonical))throw new LintInputError('outside-root');
      handle=await open(canonical,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));
      const before=await handle.stat();if(!before.isFile())throw new LintInputError('not-regular-file');
      if(before.size>LINT_LIMITS.fileBytes)throw new LintInputError('file-limit');
      const remaining=LINT_LIMITS.aggregateBytes-bytesRead;if(before.size>remaining||remaining<=0)throw new LintInputError('aggregate-limit');
      const current=await realpath(selected.path);if(!within(root.canonical,current))throw new LintInputError('outside-root');const identity=await stat(current);if(before.dev!==identity.dev||before.ino!==identity.ino)throw new LintInputError('changed-file');
      const cap=Math.min(LINT_LIMITS.fileBytes,remaining),buffer=Buffer.alloc(cap+1);let length=0;
      while(length<buffer.length){const read=await handle.read(buffer,length,buffer.length-length,null);if(!read.bytesRead)break;length+=read.bytesRead;}
      bytesRead+=length;
      if(length>cap)throw new LintInputError(cap===LINT_LIMITS.fileBytes?'file-limit':'aggregate-limit');
      const after=await handle.stat();if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ino!==after.ino)throw new LintInputError('changed-file');
      const source=decodeCSS(buffer.subarray(0,length));charactersRead+=source.length;if(charactersRead>LINT_LIMITS.aggregateCharacters)throw new LintInputError('aggregate-limit');
      files.push(lintSource(source,name));
    }catch(error){const reason=error instanceof LintInputError?error.reason:'file-unavailable';files.push(empty(name,'error',reason as LintReason));}
    finally{await handle?.close().catch(()=>{});}
  }
  return lintReport(files);
}
export function formatLintText(report:LintReport,includePaths=true):string{
  const lines=['Liquid Glass configured CSS checks'];
  for(const [index,file]of report.files.entries()){
    const name=includePaths?file.file:`file-${index+1}`;
    lines.push(`${name}: ${file.status}${file.reason?' ('+file.reason+')':''}`);
    for(const diagnostic of file.diagnostics)lines.push(`  ${diagnostic.line}:${diagnostic.column} ${diagnostic.severity} ${diagnostic.rule}: ${diagnostic.message}`);
    if(file.diagnosticLimitReached)lines.push('  Diagnostic display limit reached; additional findings may be omitted.');
  }
  lines.push(`Checked ${report.summary.checked}; finding files ${report.summary.findingsFiles}; skipped ${report.summary.skipped}; read/check errors ${report.summary.errors}.`);
  return lines.join('\n')+'\n';
}
