/** Build a connected native-browser probe and report optional helper delivery bytes. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const result = await build({
  configFile: false, logLevel: 'silent',
  build: { write: false, minify: true, target: 'es2022', lib: { entry: resolve('src/snap-deck.ts'), name: 'GlassSnapDeck', formats: ['iife'] } },
});
const output = (Array.isArray(result) ? result[0] : result).output;
const js = output.find(entry => entry.type === 'chunk').code;
const css = await readFile('src/snap-deck.css');
const source = await readFile('src/snap-deck.ts');
const evidence = {
  observedAtUtc: new Date().toISOString(),
  jsRawBytes: Buffer.byteLength(js), jsGzipBytes: gzipSync(js).length,
  cssRawBytes: css.length, cssGzipBytes: gzipSync(css).length,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  scope: 'Optional standalone helper and CSS payload. No runtime dependencies. Delivery bytes are not native scroll/paint timings or a comparative speedup.',
  reproduce: 'node scripts/snap-deck-benchmark.mjs, write the resulting /tmp/lg-snap-deck-probe.html into a dedicated native T3 preview tab, then evaluate scripts/snap-deck-browser-probe.js with recording active for native paint-dependent events.',
};
await writeFile('benchmarks/snap-deck-payload.json', JSON.stringify(evidence, null, 2) + '\n');
await writeFile('/tmp/lg-snap-deck-probe.html', '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Snap deck connected lifecycle</title><style>'
  + css + '\nbody{font-family:Arial,sans-serif;margin:20px}#fixture{width:360px;height:170px;max-width:100%;box-sizing:border-box;--lg-deck-size:240px;--lg-deck-gap:12px;--lg-deck-padding:14px;scroll-padding-inline:14px}article{padding:12px;box-sizing:border-box;scroll-margin-inline:5px;background:#eef2e7;border:1px solid #304838}button{min-width:44px;min-height:44px;font:16px Arial}button:focus-visible{outline:3px solid #2859f1}#result{white-space:pre-wrap}</style><body><h1>Connected native snap-deck probe</h1><p>Cached JavaScript requests are measured separately from actual smooth scrolling and browser paint.</p><section id="fixture" tabindex="0" aria-label="32 ordinary authored test cards"></section><pre id="result"></pre><script>'
  + js.replaceAll('</script', '<\\/script') + '</script></body></html>');
console.log(JSON.stringify(evidence));
