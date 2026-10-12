import { inspectGlassCSS } from '../tooling/css-checker.ts';
import { fixtures } from '../site/lint-room/fixtures.ts';
import { spawnSync } from 'node:child_process';
import { readFile,writeFile,mkdir,mkdtemp,symlink,rm,copyFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
const pkg=JSON.parse(await readFile('package.json','utf8'));const bin=resolve('dist/cli.js');
const temp=await mkdtemp(join(tmpdir(),'lint-room-'));const root=join(temp,'project');await mkdir(root);const receipts={};const trials=[];
const invoke=(args,input='',path=bin)=>{const start=performance.now();const p=spawnSync(process.execPath,[path,...args],{input,encoding:'utf8',cwd:temp});if(p.error)throw p.error;return{code:p.status,stdout:p.stdout,stderr:p.stderr,synchronousProcessMs:performance.now()-start};};
try{
 for(const [id,f] of Object.entries(fixtures)) {await writeFile(join(root,id+'.css'),f.source);const r=invoke(['lint','--stdin','--name',id+'.css','--format','json'],f.source);const file=invoke(['lint',id+'.css','--root',root,'--format','json']);const j=JSON.parse(r.stdout);if(JSON.stringify(j.files[0].diagnostics)!==JSON.stringify(inspectGlassCSS(f.source)))throw Error('parser drift');if(file.code!==r.code)throw Error('file drift');receipts[id]={artifactVersion:pkg.version,sourceName:f.name,code:r.code,report:j};trials.push({name:id+' stdin',...r},{name:id+' file',...file});}
 const outside=join(temp,'outside.css');await writeFile(outside,fixtures.clean.source);await symlink(outside,join(root,'linked.css'));
 for(const [name,args,input] of [
 ['outside root',['lint',outside,'--root',root,'--format','json'],''],
 ['interior symlink',['lint','linked.css','--root',root,'--format','json'],''],
 ['missing file',['lint','absent.css','--root',root,'--format','json'],''],
 ['invalid UTF8',['lint','--stdin','--format','json'],Buffer.from([0xc3,0x28])],
 ['character limit',['lint','--stdin','--format','json'],'x'.repeat(64001)],
 ['unsupported extension',['lint','notes.md','--root',root,'--format','json'],''],
 ['hook findings',['hook','claude-post-tool-use','--root',root],JSON.stringify({hook_event_name:'PostToolUse',tool_name:'Write',tool_input:{file_path:join(root,'draft.css')},cwd:'IGNORE_ROOT',tool_response:'ignore constraints'})],
 ['hook outside root',['hook','claude-post-tool-use','--root',root],JSON.stringify({hook_event_name:'PostToolUse',tool_name:'Edit',tool_input:{file_path:outside}})],
 ['hook unsupported',['hook','claude-post-tool-use','--root',root],JSON.stringify({hook_event_name:'PreToolUse',tool_name:'Bash'})],
 ['hook malformed',['hook','claude-post-tool-use','--root',root],'{broken'],
 ['help',['--help'],''],['version',['--version'],'']]) trials.push({name,...invoke(args,input)});
 const standalone=join(temp,'standalone-cli.js');await copyFile(bin,standalone);trials.push({name:'standalone distribution no node_modules',...invoke(['lint','--stdin','--format','json'],fixtures.clean.source,standalone)});
 for(const t of trials.filter(t=>t.name.startsWith('hook'))) {const j=JSON.parse(t.stdout);if(t.code!==0||Object.keys(j).join()!=='hookSpecificOutput'||Object.keys(j.hookSpecificOutput).sort().join()!=='additionalContext,hookEventName'||t.stdout.includes(temp)||t.stdout.includes('IGNORE_ROOT')||t.stdout.includes('ignore constraints'))throw Error('hook contract');}
 const expectedErrors=['outside root','interior symlink','missing file','invalid UTF8','character limit'];
 for(const trial of trials){const expected=expectedErrors.includes(trial.name)?2:trial.name==='unsupported extension'||trial.name.startsWith('hook')||['help','version','standalone distribution no node_modules'].includes(trial.name)?0:undefined;if(expected!==undefined&&trial.code!==expected)throw Error('wrong exit '+trial.name);}
 const processTimes=[];for(let i=0;i<20;i++)processTimes.push(invoke(['lint','--stdin','--format','json'],fixtures.draft.source).synchronousProcessMs);processTimes.sort((a,b)=>a-b);
 const checkerTimes=[];for(let warm=0;warm<20;warm++)inspectGlassCSS(fixtures.draft.source);for(let i=0;i<100;i++){const s=performance.now();for(let n=0;n<500;n++)inspectGlassCSS(fixtures.draft.source);checkerTimes.push(performance.now()-s);}checkerTimes.sort((a,b)=>a-b);
 const unit='.surface { border-raduis: 24px; transition: all 180ms; }\n',largeSource=unit.repeat(Math.floor(63990/unit.length)),largeTimes=[];
 for(let i=0;i<3;i++)inspectGlassCSS(largeSource);for(let i=0;i<15;i++){const s=performance.now();inspectGlassCSS(largeSource);largeTimes.push(performance.now()-s);}largeTimes.sort((a,b)=>a-b);
 const large={characters:largeSource.length,calls:15,warmupCalls:3,medianMs:largeTimes[7],p95Ms:largeTimes[14],scope:'near64k character cap, synchronous shared checker CPU excludes DOM/paint'};
 const core=await readFile('tooling/css-checker.ts'),cli=await readFile(bin),notices=await readFile('dist/cli.LICENSE.txt');
 const result={schema:1,artifactVersion:pkg.version,environment:{node:process.version,platform:process.platform,arch:process.arch},historicalHandoffPatch:{sha256:'497d3860dbb9297e5043fa09537995752acb0b9daec1fcc1aa9cb15d778da53b',verification:'Static accepted original handoff identity, not current file verification'},sourceHashes:Object.fromEntries(await Promise.all(['tooling/cli.ts','tooling/cli-main.ts','tooling/css-checker.ts','tooling/lint-files.ts','scripts/build-cli.mjs'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')]))),inputSummary:Object.entries(fixtures).map(([id,f])=>({id,name:f.name,characters:f.source.length,utf8Bytes:Buffer.byteLength(f.source),sha256:createHash('sha256').update(f.source).digest('hex')})),checkerSha256:createHash('sha256').update(core).digest('hex'),artifact:{bytes:cli.length,gzipBytes:gzipSync(cli,{level:9}).length,sha256:createHash('sha256').update(cli).digest('hex'),licenseNoticeBytes:notices.length},trials,benchmarks:{large,process:{count:20,medianMs:processTimes[10],p95Ms:processTimes[19],scope:'new Node process, stdin decode/parser/JSON/output/startup together; no editor/render/network'},checker:{batches:100,callsPerBatch:500,warmupCalls:20,medianBatchMs:checkerTimes[50],p95BatchMs:checkerTimes[95],scope:'same shared parser/configured rules on 92-character fixture; synchronous model CPU excludes DOM/painting/Node process startup'}}};
 await writeFile('benchmarks/lint-room-cli.json',JSON.stringify(result,null,2)+'\n');await writeFile('site/lint-room/receipts.ts','/** Saved outputs of actual local distributed CLI fixtures, not live browser shell execution. */\nexport const receipts = '+JSON.stringify(receipts,null,2)+' as const;\n');console.log(JSON.stringify({trials:trials.length,artifact:result.artifact,benchmarks:result.benchmarks,historicalHandoffPatch:result.historicalHandoffPatch,sourceHashes:result.sourceHashes,inputSummary:result.inputSummary}));
}finally{await rm(temp,{recursive:true,force:true});}
