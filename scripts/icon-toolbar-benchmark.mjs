/** Development-only standalone bytes for the accepted optional toolbar + hidden-action CSS fix. */
import { build } from 'vite';
import { readFile,writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const result=await build({configFile:false,logLevel:'silent',build:{write:false,target:'es2022',minify:'oxc',lib:{entry:'src/icon-toolbar.ts',name:'GlassIconToolbar',formats:['iife']}}});
const code=(Array.isArray(result)?result[0]:result).output.find(item=>item.type==='chunk').code;
const source=await readFile('src/icon-toolbar.ts'),css=await readFile('src/icon-toolbar.css');
const module=await build({configFile:false,logLevel:'silent',build:{write:false,target:'es2022',minify:'oxc',lib:{entry:'src/icon-toolbar.ts',formats:['es']}}});
const esm=(Array.isArray(module)?module[0]:module).output.find(item=>item.type==='chunk').code;
const imported=await import('data:text/javascript;base64,'+Buffer.from(esm).toString('base64'));
const report={schema:1,observedAtUtc:new Date().toISOString(),environment:{node:process.version,vite:'8.3.4',platform:process.platform,arch:process.arch},sourceSha256:hash(source),cssSha256:hash(css),jsRawBytes:Buffer.byteLength(code),jsGzipBytes:gzipSync(code,{level:9}).length,jsSha256:hash(code),cssRawBytes:css.length,cssGzipBytes:gzipSync(css,{level:9}).length,acceptedHiddenActionFix:css.toString().includes(':where(button,a[href])[hidden]{display:none}'),ssrRuntimeExports:Object.keys(imported).sort(),scope:'Standalone optional IIFE helper plus its actual unminified CSS after the hidden-action fix. JS includes shared lifecycle cleanup. Payload bytes exclude material/theme styles, icons, framework peers and site. No network/load-time/CPU/paint/GPU/FPS/speedup inference.',reproduce:'node scripts/icon-toolbar-benchmark.mjs after integrating accepted core/hidden-action CSS fix'};
await writeFile('benchmarks/icon-toolbar-payload.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
