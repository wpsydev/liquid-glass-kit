/** Standalone optional payload + connected-browser fixture; never writes shared dist. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const result = await build({ configFile: false, logLevel: 'silent', build: {
  write: false, minify: true, target: 'es2022',
  lib: { entry: resolve('src/material-preferences.ts'), name: 'GlassPreferences', formats: ['iife'] },
} });
const js = (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk').code;
const css = await readFile('src/material-preferences.css');
const evidence = {
  observedAtUtc: new Date().toISOString(), target: 'es2022', format: 'standalone minified IIFE',
  jsRawBytes: Buffer.byteLength(js), jsGzipBytes: gzipSync(js).length,
  cssRawBytes: css.length, cssGzipBytes: gzipSync(css).length,
  sourceSha256: createHash('sha256').update(await readFile('src/material-preferences.ts')).digest('hex'),
  cssSha256: createHash('sha256').update(css).digest('hex'),
  scope: 'Optional preference controller including its environment helper; CSS excludes prerequisite material.css. Payload only, not a comparative speedup or rendering measurement.',
};
await writeFile('benchmarks/material-preferences-payload.json', JSON.stringify(evidence, null, 2) + '\n');
await writeFile('/tmp/lg-material-preferences-probe.html', '<!doctype html><html lang="en"><meta charset="utf-8"><title>Preferences lifecycle fixture</title><body><main id="fixture"></main><script>' + js.replaceAll('</script', '<\\/script') + '</script></body></html>');
console.log(JSON.stringify(evidence));
