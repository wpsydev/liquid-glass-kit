/** Bundle a repository-native study for inspection in the T3 collaborative preview. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { build } from 'vite';
const { values } = parseArgs({ options: { study: { type:'string' }, output:{type:'string'} } });
if (!values.study || !/^[a-z][a-z0-9-]+$/.test(values.study) || !values.output) throw Error('Use --study <site-directory> --output <absolute-html-path>');
const result = await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve(`site/${values.study}/main.ts`),name:'GlassStudy',formats:['iife']}}});
const assets=(Array.isArray(result)?result[0]:result).output;
const js=assets.find(x=>x.type==='chunk').code;
const css=assets.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
let html=await readFile(`site/${values.study}/index.html`,'utf8');
html=html.replace('<script type="module" src="./main.ts"></script>','')
  .replace('</body>',`<script>${js.replaceAll('</script','<\\/script')}</script></body>`)
  .replace('</head>',`<style>${css}</style></head>`).replace(/<link rel="icon"[^>]*>/g,'');
await writeFile(values.output,html);
console.log(JSON.stringify({path:values.output,bytes:Buffer.byteLength(html)}));
