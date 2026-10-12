/** Rebuild the optional scene texture native fixture and payload evidence. */
import { build } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const result = await build({configFile:false,build:{write:false,minify:'oxc',target:'es2022',lib:{entry:resolve('src/scene-texture.ts'),formats:['iife'],name:'GlassTexture',fileName:()=> 'scene-texture.js'}}});
const bundle = Array.isArray(result)?result[0]:result, code=bundle.output.find(i=>i.type==='chunk').code;
const sha=x=>createHash('sha256').update(x).digest('hex');
await mkdir('benchmarks',{recursive:true});await mkdir('.validation',{recursive:true});
const metadata={schemaVersion:1,measuredAt:new Date().toISOString(),sourceSHA256:sha(await readFile('src/scene-texture.ts')),sceneSHA256:sha(await readFile('src/scene.ts')),shaderSHA256:sha(await readFile('src/scene-texture-shader.ts')),bundleBytes:Buffer.byteLength(code),gzipBytes:gzipSync(code).byteLength,bundleSHA256:sha(code),scope:'Standalone optional entry includes existing scene renderer; payload only, not load-time or GPU speed evidence',runtimeDependencies:0};
await writeFile('benchmarks/scene-texture-payload.json',JSON.stringify(metadata,null,2)+'\n');
const probe=await readFile('scripts/scene-texture-browser-probe.js','utf8');
await writeFile('.validation/scene-texture-probe.html','<!doctype html><html lang="en"><meta charset="utf-8"><title>Owned texture / native WebGL proof</title><style>body{font:16px Arial;background:#eeefec;color:#171c26;margin:24px}canvas{display:block;width:320px;height:240px;max-width:100%;border:0}p{max-width:70ch}input{height:44px;font-size:16px}</style><h1>Owned texture / native WebGL proof</h1><p>Original source pixels. Explicit diagnostic readPixels occurs outside timed submission batches. No GPU elapsed or FPS inference.</p><label>Host native draft <input id="draft" value="retain this draft"></label><canvas id="out" aria-hidden="true"></canvas><script>'+code+'</script><script>'+probe+'</script></html>');console.log(JSON.stringify(metadata));
