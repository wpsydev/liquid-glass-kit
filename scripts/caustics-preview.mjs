import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'vite';
import {resolve} from 'node:path';
const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('site/caustics/main.ts'),name:'CausticShowcase',formats:['iife']}}});
const code=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk').code;
let html=await readFile('site/caustics/index.html','utf8');
html=html.replace('</head>',`<style>${await readFile('site/caustics/style.css','utf8')}</style></head>`).replace('<script type="module" src="./main.ts"></script>',`<script>${code.replaceAll('</script','<\\/script')}</script>`);
await writeFile('/tmp/lg-caustics-preview.html',html);console.log(html.length);
