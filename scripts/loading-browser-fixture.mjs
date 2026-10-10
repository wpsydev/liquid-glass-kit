/** Native T3 fixture of actual distributed modules; not an HTTP-load benchmark. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { transformSync } from 'rolldown/utils';
const modules = {};
for (const file of await readdir('dist')) if (file.endsWith('.js')) modules[file] = await readFile(`dist/${file}`, 'utf8');
const main = transformSync('main.ts', await readFile('site/loading/main.ts', 'utf8')).code.replace(/import\s*\{\s*attachGlassSceneLazy\s*\}\s*from\s*['"][^'"]+['"];?/, 'const {attachGlassSceneLazy} = await import(moduleUrl("lazy.js"));');
let html = await readFile('site/loading/index.html', 'utf8');
html = html.replace(/<link rel="stylesheet" href="[^"\n]+">/g, '');
const css = await readFile('dist/material.css', 'utf8') + '\n' + await readFile('site/loading/style.css', 'utf8');
const setup = `
const modules=${JSON.stringify(modules).replaceAll('<', '\\u003c')};
const urls={}; window.loadingNative={evaluated:[],contextRequests:0};
const originalContext=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(...args){if(args[0]==='webgl2')loadingNative.contextRequests++;return originalContext.apply(this,args)};
function moduleUrl(name){
 if(urls[name])return urls[name];
 const code=modules[name].replace(/(['"\\x60])(\\.\\/[^'"\\x60]+\\.js)\\1/g,(_,quote,path)=>JSON.stringify(moduleUrl(path.slice(2))));
 urls[name]=URL.createObjectURL(new Blob(['window.loadingNative.evaluated.push('+JSON.stringify(name)+');\\n'+code],{type:'text/javascript'}));return urls[name];
}
${main}
`;
html = html.replace('</head>', `<style>${css}</style></head>`).replace(/<script type="module" src="\.\/main.ts"><\/script>/, `<script type="module">${setup}</script>`);
await writeFile('/tmp/lg-loading-gallery.html', html); console.log(`Wrote /tmp/lg-loading-gallery.html (${Buffer.byteLength(html)} bytes). Module strings are embedded up front; evaluation/GPU mounting is deferred. Verify real HTTP requests separately on the deployed route.`);
