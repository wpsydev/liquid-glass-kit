/** Development-only artifact verification. Run after the FINAL ROOT package build/version bump. */
import { readFile,writeFile,realpath } from 'node:fs/promises';
import { resolve,relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const policies={
 './material':{runtime:'pure',guidance:['getGlassProps produces semantic data attributes and CSS custom properties; host owns DOM application and readable fallback.','Import material.css explicitly; portable CSS is the default material tier.']},
 './dom':{runtime:'dom',guidance:['Only attach DOM behavior in a client lifecycle; retain native control semantics and destroy owned resources when the host unmounts.']},
 './motion':{runtime:'dom',guidance:['Optional motion needs an explicit client lifecycle and effective reduced-motion policy; keep interactions finite and clean up owned effects.']},
 './material.css':{runtime:'css',guidance:['This checked stylesheet is explicitly selected, not inferred by the pack planner.']},
};
const entries=[],verified=[];
for(const [subpath,policy]of Object.entries(policies)){
 const declared=pkg.exports[subpath],target=typeof declared==='string'?declared:declared?.import;
 if(typeof target!=='string')throw Error('Missing actual declared import '+subpath);
 const file=await realpath(resolve(target));if(relative(process.cwd(),file).startsWith('..'))throw Error('Outside artifact');const bytes=await readFile(file);
 const stylesheet=subpath.endsWith('.css');const names=stylesheet?[]:Object.keys(await import(pathToFileURL(file).href)).sort();
 if(!stylesheet&&!names.length)throw Error('No actual Node value exports');
 entries.push({subpath,kind:stylesheet?'stylesheet':'module',runtime:policy.runtime,runtimeNames:names,guidance:policy.guidance});
 verified.push({subpath,declaredImport:target,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),runtimeNames:names,verification:stylesheet?'declared stylesheet exists/readable':'actual Node ESM namespace names, not declaration parsing'});
}
const catalog={packageName:pkg.name,version:pkg.version,verification:'host-checked',artifact:'Checked local '+pkg.version+' package build; declared export paths and actual Node value exports. Not publication or client delivery evidence.',exports:entries};
await writeFile('site/agent-studio/catalog.ts','/** Regenerated from declared exports + actual built Node namespaces. No type-only names inferred. */\nexport const catalog = '+JSON.stringify(catalog,null,2)+' as const;\n');
await writeFile('benchmarks/agent-studio-catalog.json',JSON.stringify({schema:1,version:pkg.version,packageName:pkg.name,environment:{node:process.version,platform:process.platform,arch:process.arch},verified,limits:['CSS checked as a readable declared artifact, not imported by Node','No registry/client delivery/discovery verification','Rebuild and regenerate after FINAL ROOT version integration'],catalog},null,2)+'\n');console.log(JSON.stringify({version:pkg.version,verified}));
