/** Compile declared public entrypoints and their dependencies, excluding queued prototypes. */
import { readFile, access, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const files = [];
for (const entry of Object.values(pkg.exports)) {
  if (typeof entry === 'string') continue;
  const match = /^\.\/dist\/([a-z][a-z0-9-]*)\.d\.ts$/.exec(entry.types);
  if (!match) throw new Error('Public entrypoint needs a local dist declaration');
  const stem = `src/${match[1]}`;
  let source;
  for (const extension of ['.ts', '.tsx']) {
    try { await access(stem + extension); source = resolve(stem + extension); break; } catch {}
  }
  if (!source) throw new Error(`Missing source for ${entry.types}`);
  if (!files.includes(source)) files.push(source);
}
const config = resolve(`.glass-build-${randomUUID()}.json`);
try {
  await writeFile(config, JSON.stringify({ extends: resolve('tsconfig.build.json'), files, include: [], exclude: [] }));
  const result = spawnSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', config], { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status || 1;
} finally { await rm(config, { force: true }); }
