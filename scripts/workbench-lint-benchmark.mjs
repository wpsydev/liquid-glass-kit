import {build} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import os from 'node:os';
const path='site/workbench/.lint-baseline.ts';
await writeFile(path,execFileSync('git',['show','5ebeffa3f4a7d9a46c21000928fc61ee78af1730:site/workbench/model.ts'],{encoding:'utf8'}));
const load=async(entry)=>{const r=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve(entry),name:'LintFixture',formats:['iife']}}});const code=(Array.isArray(r)?r[0]:r).output.find(x=>x.type==='chunk').code;return {module:new Function(code+';return LintFixture;')(),sha256:createHash('sha256').update(await readFile(entry)).digest('hex')};};
const baseline=await load(path),current=await load('site/workbench/model.ts');
const source='}\n'.repeat(15000),runs={baseline:[],current:[]};
for(let i=0;i<5;i++)for(const name of i%2?['current','baseline']:['baseline','current']){const fixture=name==='baseline'?baseline:current;const start=performance.now();const result=fixture.module.inspect(source);runs[name].push({ms:performance.now()-start,diagnostics:result.length});}
const report={node:process.version,cpu:os.cpus()[0]?.model,input:{characters:source.length,shape:'15000 repeated close-braces/newlines',sha256:createHash('sha256').update(source).digest('hex')},baseline:{commit:'5ebeffa3f4a7d9a46c21000928fc61ee78af1730',sourceSha256:baseline.sha256,runs:runs.baseline},current:{sourceSha256:current.sha256,runs:runs.current},scope:'Synthetic Node synchronous lint calls, five alternating runs per implementation. Includes parse/diagnostic collection; excludes browser/editor/UI/paint and general page speed. Retains30 returned diagnostics. First run includes cold work.'};
await writeFile('benchmarks/workbench-lint.json',JSON.stringify(report,null,2)+'\n');
const {unlink}=await import('node:fs/promises');await unlink(path);console.log(report);
