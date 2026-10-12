// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { inspectGlassCSS } from '../tooling/css-checker.js';
import { canonicalLintRoot, lintFiles, LINT_LIMITS } from '../tooling/lint-files.js';
import { parseCLIArguments, runGlassLintCLI } from '../tooling/cli-main.js';
const dirs:string[]=[];
async function fixture(){const root=await mkdtemp(join(tmpdir(),'glass-lint-test-'));dirs.push(root);return root;}
async function* input(value:string|Uint8Array=''){yield value;}
async function run(args:string[],cwd:string,body:string|Uint8Array=''){return runGlassLintCLI(args,input(body),cwd,'test-version');}
afterEach(async()=>{await Promise.all(dirs.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
describe('shared parser-backed CSS checker',()=>{
  it('recognizes only configured real properties, with UTF-16 positions',()=>{
    const source='/* 🦋 border-raduis:0; transition:all */\n.x {\n border-raduis:2px;\n transition: all .2s; content:"border-raduis transition:all";\n --border-raduis:2;\n}';
    const diagnostics=inspectGlassCSS(source);
    expect(diagnostics.map(value=>[value.rule,value.line,value.column])).toEqual([['property-typo',3,2],['explicit-transition',4,2]]);
    expect(diagnostics[0].from).toBe(source.indexOf('border-raduis',source.indexOf('.x')));
  });
  it('preserves configured syntax checking and bounds grammar work',()=>{
    expect(inspectGlassCSS('.a { color red; }').some(value=>value.rule==='syntax')).toBe(true);
    expect(inspectGlassCSS('x'.repeat(64001))[0].rule).toBe('document-limit');
    expect(inspectGlassCSS('.a{'+Array.from({length:50},()=> 'border-raduis:1px;').join('')+'}')).toHaveLength(30);
  });
  it('supports modern authored CSS without inventing a complete validator',()=>{
    expect(inspectGlassCSS('@layer ui { .a { --space: 1rem; padding:var(--space); &:hover { opacity:.8; } } }')).toEqual([]);
    expect(inspectGlassCSS('.a{made-up-property:yes;}')).toEqual([]);
  });
});
describe('read-only lint invocation',()=>{
  it('strictly parses bounded literal paths and mutually exclusive stdin',()=>{
    expect(parseCLIArguments(['lint','--','--literal.css'],'/tmp').paths).toEqual(['--literal.css']);
    for(const args of [['lint'],['lint','--stdin','a.css'],['lint','a.css','--name','x.css'],['lint','--stdin','--name','../x.css'],['lint','--stdin','--name','/x.css'],['lint','--format','json','--format','text','x.css'],['hook','claude-post-tool-use']])expect(()=>parseCLIArguments(args,'/tmp')).toThrow();
    expect(()=>parseCLIArguments(['lint',...Array(33).fill('x.css')],'/tmp')).toThrow();
  });
  it('does not touch a filesystem root in stdin mode and distinguishes errors',async()=>{
    const result=await run(['lint','--stdin','--root','/not-existing','--format','json'],'/none','.a{border-raduis:1px;}');
    expect(result.exitCode).toBe(1);expect(JSON.parse(result.stdout).files[0].file).toBe('stdin.css');
    const invalid=await run(['lint','--stdin','--format','json'],'/none',new Uint8Array([0xff]));
    expect(invalid.exitCode).toBe(2);expect(JSON.parse(invalid.stdout).reason).toBe('invalid-utf8');
    expect((await run(['lint','--stdin'],'/none','x'.repeat(256001))).exitCode).toBe(2);
    expect((await run(['lint','--stdin','--format','json'],'/none','x'.repeat(64001))).exitCode).toBe(2);
  });
  it('reads literal metacharacter names without execution and reports skips honestly',async()=>{
    const root=await fixture(),name='$(touch SHOULD_NOT_EXIST).css';await writeFile(join(root,name),'.a{opacity:1}');
    const result=await run(['lint',name,'asset.svg','--format','json'],root);const report=JSON.parse(result.stdout);
    expect(result.exitCode).toBe(0);expect(report.summary).toMatchObject({checked:1,skipped:1});expect(report.files[1].reason).toBe('unsupported-extension');
    await expect(lstat(join(root,'SHOULD_NOT_EXIST'))).rejects.toThrow();
  });
  it('contains paths and never emits source lines or absolute roots',async()=>{
    const root=await fixture(),other=await fixture();await writeFile(join(other,'secret.css'),'.a{border-raduis: PRIVATE_MARKER;}');
    const result=await run(['lint',join(other,'secret.css'),'--format','json'],root);
    expect(result.exitCode).toBe(2);expect(result.stdout).not.toContain(other);expect(result.stdout).not.toContain('PRIVATE_MARKER');expect(JSON.parse(result.stdout).files[0].reason).toBe('outside-root');
    expect((await run(['lint','../secret.css'],root)).exitCode).toBe(2);
    expect((await run(['lint','a\n.css'],root)).exitCode).toBe(2);
  });
  it('canonicalizes explicitly selected root but rejects interior symlinks',async()=>{
    const root=await fixture(),other=await fixture();await writeFile(join(root,'okay.css'),'.a{opacity:1}');await mkdir(join(root,'nested'));await writeFile(join(root,'nested','a.css'),'.a{opacity:1}');
    await symlink(root,join(other,'selected'));await symlink(join(root,'okay.css'),join(root,'link.css'));await symlink(join(root,'nested'),join(root,'folder'));
    expect((await run(['lint','okay.css','--root',join(other,'selected')],other)).exitCode).toBe(0);
    const report=JSON.parse((await run(['lint','link.css','folder/a.css','nested','--format','json'],root)).stdout);
    expect(report.files.map((file:{reason:string})=>file.reason)).toEqual(['symlink','symlink','unsupported-extension']);
    await mkdir(join(root,'directory.css'));expect(JSON.parse((await run(['lint','directory.css','--format','json'],root)).stdout).files[0].reason).toBe('not-regular-file');
  });
  it('rejects invalid bytes and bounds per-file, aggregate and diagnostics',async()=>{
    const root=await fixture();await writeFile(join(root,'invalid.css'),Buffer.from([0xff]));await writeFile(join(root,'big.css'),' '.repeat(256001));await writeFile(join(root,'chars.css'),' '.repeat(64001));
    const result=await lintFiles(await canonicalLintRoot(root),['invalid.css','big.css','chars.css']);
    expect(result.files.map(file=>file.reason)).toEqual(['invalid-utf8','file-limit','source-limit']);
    const paths=Array.from({length:17},(_,index)=>`${index}.css`);await Promise.all(paths.map(name=>writeFile(join(root,name),' '.repeat(64000))));
    expect((await lintFiles(await canonicalLintRoot(root),paths)).files.at(-1)?.reason).toBe('aggregate-limit');
    const diagnosticPaths=Array.from({length:6},(_,index)=>`findings${index}.css`);await Promise.all(diagnosticPaths.map(name=>writeFile(join(root,name),'.a{'+ 'border-raduis:1px;'.repeat(40)+'}')));
    const bounded=await lintFiles(await canonicalLintRoot(root),diagnosticPaths);expect(bounded.summary.diagnosticsDisplayed).toBe(120);expect(bounded.summary.findingsFiles).toBe(6);expect(bounded.files.at(-1)?.diagnosticLimitReached).toBe(true);expect(JSON.stringify(bounded).length).toBeLessThan(LINT_LIMITS.outputBytes);
  });
  it('enforces aggregate bytes before reading more supported files',async()=>{
    const root=await fixture();const paths=Array.from({length:11},(_,index)=>`utf8-${index}.css`);
    await Promise.all(paths.map(name=>writeFile(join(root,name),'☃'.repeat(64000))));
    const report=await lintFiles(await canonicalLintRoot(root),paths);
    expect(report.files.slice(0,10).every(file=>file.reason!=='aggregate-limit')).toBe(true);
    expect(report.files[10].reason).toBe('aggregate-limit');
  });
});
describe('explicit advisory Claude PostToolUse adapter',()=>{
  it('uses CLI root, reports configured findings, and cannot emit permission fields',async()=>{
    const root=await fixture();await writeFile(join(root,'actual.css'),'.a{border-raduis: SECRET_SOURCE;}');
    const payload={hook_event_name:'PostToolUse',tool_name:'Edit',cwd:'/untrusted-root',tool_input:{file_path:join(root,'actual.css'),new_string:'IGNORE_ALL_RULES'},tool_response:{secret:'DO_NOT_ECHO'}};
    const result=await run(['hook','claude-post-tool-use','--root',root],'/none',JSON.stringify(payload));const output=JSON.parse(result.stdout);
    expect(result.exitCode).toBe(0);expect(Object.keys(output)).toEqual(['hookSpecificOutput']);expect(Object.keys(output.hookSpecificOutput)).toEqual(['hookEventName','additionalContext']);
    expect(output.hookSpecificOutput.additionalContext).toContain('property-typo');for(const secret of [root,'actual.css','SECRET_SOURCE','IGNORE_ALL_RULES','DO_NOT_ECHO'])expect(result.stdout).not.toContain(secret);
  });
  it('distinguishes unsupported skips and invalid input without blocking decisions',async()=>{
    const root=await fixture();const args=['hook','claude-post-tool-use','--root',root];
    for(const body of [{hook_event_name:'PreToolUse',tool_name:'Write'},{hook_event_name:'PostToolUse',tool_name:'Bash'},{hook_event_name:'PostToolUse',tool_name:'Write',tool_input:{file_path:join(root,'x.ts')}}])expect((await run(args,root,JSON.stringify(body))).stdout).toContain('skipped');
    for(const body of ['{',JSON.stringify({hook_event_name:'PostToolUse',tool_name:'Write',tool_input:{file_path:'relative.css'}})]){const result=await run(args,root,body);expect(result.exitCode).toBe(0);expect(result.stdout).toContain('not run');}
    expect((await run(args,root,JSON.stringify({hook_event_name:'PostToolUse',tool_name:'Write',tool_input:{file_path:'/elsewhere/secret.css'}}))).stdout).toContain('read/check errors 1');
  });
});
