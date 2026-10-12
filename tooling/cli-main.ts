import { isAbsolute, normalize, sep } from 'node:path';
import { canonicalLintRoot, decodeCSS, formatLintText, lintExit, lintFiles, lintReport, lintSource, LINT_LIMITS, LintInputError, safePath } from './lint-files.js';
import type { LintReport } from './lint-files.js';
export interface CLIOptions { mode:'lint'|'hook'|'help'|'version';root:string;format:'text'|'json';paths:string[];stdin:boolean;name:string }
export interface CLIResult { exitCode:0|1|2;stdout:string;stderr:string }
export const CLI_HELP = 'Liquid Glass read-only CSS checks\n\nliquid-glass lint <paths...> [--root project] [--format text|json]\nliquid-glass lint --stdin [--name relative.css] [--format text|json]\nliquid-glass hook claude-post-tool-use --root project\n\nUse literal CSS file paths; no scanning, glob expansion, fixes or commands.\nConfigured rules: parser syntax, border-raduis typo, transition:all warning.\nLimits: 32 files, 256000 bytes/64000 UTF-16 code units per file, 2048000 aggregate bytes, 1024000 aggregate code units, 30 diagnostics/file, 120 displayed total.\nInterior symlinks and non-regular files are rejected; UTF-8 decoding is strict.\nLint exits:0 clean configured checks or reported skips;1 findings;2 invalid invocation/read/limit errors. Skipped does not mean checked.\nHook output is advisory context, never a permission or approval decision.\n';
export function parseCLIArguments(args:readonly string[],cwd:string):CLIOptions{
  if(args.length>80||args.some(value=>typeof value!=='string'||value.length>LINT_LIMITS.pathCharacters))throw new LintInputError('invocation');
  if(args.length===1&&args[0]==='--help'||args.length===0)return{mode:'help',root:cwd,format:'text',paths:[],stdin:false,name:'stdin.css'};
  if(args.length===1&&args[0]==='--version')return{mode:'version',root:cwd,format:'text',paths:[],stdin:false,name:'stdin.css'};
  let position=1,mode:CLIOptions['mode'];
  if(args[0]==='lint')mode='lint';else if(args[0]==='hook'&&args[1]==='claude-post-tool-use'){mode='hook';position=2;}else throw new LintInputError('invocation');
  const options:CLIOptions={mode,root:cwd,format:'text',paths:[],stdin:false,name:'stdin.css'},seen=new Set<string>();let literal=false;
  for(;position<args.length;position++){
    const value=args[position];if(value==='--'&&!literal){literal=true;continue;}
    if(!literal&&value.startsWith('--')){
      if(seen.has(value))throw new LintInputError('invocation');seen.add(value);
      if(value==='--stdin'){options.stdin=true;continue;}
      if(!['--root','--format','--name'].includes(value)||position+1>=args.length)throw new LintInputError('invocation');
      const next=args[++position];if(value==='--root')options.root=safePath(next);else if(value==='--format'){if(!['text','json'].includes(next))throw new LintInputError('invocation');options.format=next as 'text'|'json';}else options.name=safePath(next);
    }else options.paths.push(safePath(value));
  }
  if(mode==='hook'&&(!seen.has('--root')||options.paths.length||options.stdin||seen.has('--format')||seen.has('--name')))throw new LintInputError('invocation');
  if(mode==='lint'&&(options.stdin?options.paths.length>0:!options.paths.length||options.paths.length>LINT_LIMITS.files)||!options.stdin&&seen.has('--name'))throw new LintInputError('invocation');
  if(options.stdin&&(isAbsolute(options.name)||!options.name.toLowerCase().endsWith('.css')))throw new LintInputError('invocation');
  options.name=normalize(options.name).split(sep).join('/');return options;
}
async function stdinBytes(input:AsyncIterable<Uint8Array|string>):Promise<Uint8Array>{
  const chunks:Uint8Array[]=[];let bytes=0;
  for await(const chunk of input){const value=typeof chunk==='string'?Buffer.from(chunk,'utf8'):chunk;bytes+=value.byteLength;if(bytes>LINT_LIMITS.stdinBytes)throw new LintInputError('stdin-limit');chunks.push(value);}
  return Buffer.concat(chunks,bytes);
}
function ordinary(report:LintReport,format:'text'|'json'):CLIResult{const stdout=format==='json'?JSON.stringify(report)+'\n':formatLintText(report);if(Buffer.byteLength(stdout)>LINT_LIMITS.outputBytes)throw new LintInputError('output-limit');return{exitCode:lintExit(report),stdout,stderr:''};}
function context(message:string):CLIResult{return{exitCode:0,stdout:JSON.stringify({hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:message.slice(0,16000)}})+'\n',stderr:''};}
function object(value:unknown):value is Record<string,unknown>{return!!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}
async function hook(options:CLIOptions,input:AsyncIterable<Uint8Array|string>):Promise<CLIResult>{
  try{
    const bytes=await stdinBytes(input);let payload:unknown;try{payload=JSON.parse(decodeCSS(bytes));}catch{throw new LintInputError('invalid-hook-input');}
    if(!object(payload))throw new LintInputError('invalid-hook-input');
    if(payload.hook_event_name!=='PostToolUse'||typeof payload.tool_name!=='string'||!['Write','Edit'].includes(payload.tool_name))return context('Liquid Glass CSS check skipped: unsupported event or tool. Nothing was checked.');
    if(!object(payload.tool_input)||typeof payload.tool_input.file_path!=='string'||!isAbsolute(payload.tool_input.file_path))throw new LintInputError('invalid-hook-input');
    const path=safePath(payload.tool_input.file_path);
    if(!/\.css$/iu.test(path))return context('Liquid Glass CSS check skipped: unsupported file extension. Nothing was checked.');
    const root=await canonicalLintRoot(options.root),report=await lintFiles(root,[path]);
    // Never inject the untrusted path/content/tool response into a system-reminder context.
    return context(formatLintText(report,false)+'Advisory configured checks only; no edit was undone and no permission decision was made.');
  }catch(error){const reason=error instanceof LintInputError?error.reason:'check-unavailable';return context(`Liquid Glass CSS check not run (${reason}). No clean result or permission decision is implied.`);}
}
export async function runGlassLintCLI(args:readonly string[],input:AsyncIterable<Uint8Array|string>,cwd:string,version:string):Promise<CLIResult>{
  let format:'text'|'json'=args[args.indexOf('--format')+1]==='json'?'json':'text';
  try{
    const options=parseCLIArguments(args,cwd);format=options.format;
    if(options.mode==='help')return{exitCode:0,stdout:CLI_HELP,stderr:''};
    if(options.mode==='version')return{exitCode:0,stdout:version+'\n',stderr:''};
    if(options.mode==='hook')return hook(options,input);
    if(options.stdin){const source=decodeCSS(await stdinBytes(input));return ordinary(lintReport([lintSource(source,options.name)]),format);}
    return ordinary(await lintFiles(await canonicalLintRoot(options.root),options.paths),format);
  }catch(error){const reason=error instanceof LintInputError?error.reason:'check-unavailable';return format==='json'?{exitCode:2,stdout:JSON.stringify({schemaVersion:1,status:'error',reason,message:'CSS check did not complete. Run liquid-glass --help for limits and usage.'})+'\n',stderr:''}:{exitCode:2,stdout:'',stderr:`Liquid Glass CSS check did not complete (${reason}). Run liquid-glass --help.\n`};}
}
