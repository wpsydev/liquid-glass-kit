import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'vite';
import {resolve} from 'node:path';
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('site/workbench/main.ts'),name:'GlassWorkbench',formats:['iife']},rollupOptions:{output:{inlineDynamicImports:true}}}});
const out=(Array.isArray(result)?result[0]:result).output;
const code=out.find(x=>x.type==='chunk').code,css=out.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
let html=await readFile('site/workbench/index.html','utf8');
html=html.replace('</head>',`<style>${css}</style></head>`).replace('<script type="module" src="./main.ts"></script>',()=>`<script>${code.replaceAll('</script','<\\/script')}</script>`);
await writeFile('/tmp/lg-workbench-preview.html',html);console.log(html.length);
