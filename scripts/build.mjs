import { copyFile, mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { minify } from 'rolldown/utils';
await mkdir('dist', { recursive: true });
// Keep modules and directives intact so downstream bundlers can still tree-shake.
// Formatting only: no compression rewrites, renamed functions or properties.
for (const file of await readdir('dist')) if (file.endsWith('.js')) {
  const result = await minify(file, await readFile(`dist/${file}`, 'utf8'), { compress: false, mangle: false });
  if (result.errors.length) throw new Error(`Cannot minify ${file}: ${JSON.stringify(result.errors)}`);
  await writeFile(`dist/${file}`, result.code + '\n');
}
const material = await readFile('src/material.css', 'utf8');
for (const name of ['material', 'scroll-edge', 'indicator', 'motion']) await copyFile(`src/${name}.css`, `dist/${name}.css`);
// Preserve the previous aggregate stylesheet's exact rules and ordering.
await writeFile('dist/styles.css', material + '\n' + await readFile('src/scroll-edge.css', 'utf8') + '\n' + await readFile('src/indicator.css', 'utf8') + '\n' + await readFile('src/motion.css', 'utf8'));
await mkdir('site/public', { recursive: true });
await copyFile('CHANGELOG.md', 'site/public/CHANGELOG.md');
await copyFile('llms.txt', 'site/public/llms.txt');
await copyFile('llms-full.txt', 'site/public/llms-full.txt');
await cp('docs', 'site/public/docs', { recursive: true });
await cp('benchmarks', 'site/public/benchmarks', { recursive: true });
