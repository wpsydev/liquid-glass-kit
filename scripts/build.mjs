import { copyFile, mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await copyFile('src/styles.css', 'dist/styles.css');
await mkdir('site/public', { recursive: true });
await copyFile('llms.txt', 'site/public/llms.txt');
await copyFile('llms-full.txt', 'site/public/llms-full.txt');
await cp('docs', 'site/public/docs', { recursive: true });
