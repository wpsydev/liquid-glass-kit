#!/usr/bin/env node
/** Synchronous lifecycle/resource benchmark; no browser/GPU/frame-rate claims. */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

if (process.argv.includes('--help')) {
  console.log('Usage: node scripts/benchmark.mjs [--baseline /path/to/frozen/checkout] [--out benchmarks]\n\nBuilds reproducible resource/source/bundle reports and /tmp/lg-perf-preview.html.\nOpen that fixture in the T3 collaborative preview and run await window.runGlassBenchmark().\nSave the returned native-browser report separately as benchmarks/browser.json.\nBaseline defaults to /tmp/liquid-glass-0.8-benchmark; current source is the working directory.');
  process.exit(0);
}
const dependencyVersion = name => createRequire(import.meta.url)(`${name}/package.json`).version;
const current = resolve('.');
const option = flag => { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; };
const baseline = resolve(option('--baseline') || '/tmp/liquid-glass-0.8-benchmark');
const out = resolve(option('--out') || 'benchmarks');
const count = 100;
async function sourceFiles(root, relative = '') {
  const files = [];
  for (const entry of await readdir(join(root, 'src', relative), { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await sourceFiles(root, path));
    else if (/\.(?:tsx?|css)$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}
async function inlineStyles(path) {
  let css = await readFile(path, 'utf8');
  for (const match of css.matchAll(/@import\s+['"]([^'"]+)['"];?/g)) {
    css = css.replace(match[0], await inlineStyles(resolve(path, '..', match[1])));
  }
  return css;
}
async function sourceMetrics(root) {
  const files = await sourceFiles(root);
  const digest = createHash('sha256');
  const lines = {};
  for (const file of files) {
    const text = await readFile(join(root, 'src', file), 'utf8');
    digest.update(file).update('\0').update(text).update('\0');
    lines[file] = text.split(/\r?\n/).filter(line => line.trim()).length;
  }
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceSha256: digest.digest('hex'), workingTreeChanges: execFileSync('git', ['status', '--porcelain', '--', 'src'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean), nonblankSourceLines: Object.values(lines).reduce((a, b) => a + b, 0), files: lines };
}
async function bundle(root, name, symbol) {
  const entry = join('/tmp', `lg-benchmark-${name}-${symbol}.ts`);
  const imported = join(root, 'src/index.ts').replaceAll('\\', '/');
  await writeFile(entry, `export { ${symbol} } from ${JSON.stringify(imported)};\n`);
  const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, sourcemap: false, minify: true, target: 'es2022', lib: { entry, name: 'LiquidGlassBenchmark', formats: ['iife'] } } });
  const chunk = (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk');
  return { code: chunk.code, bytes: Buffer.byteLength(chunk.code), gzipBytes: gzipSync(chunk.code, { level: 9 }).length };
}

function resourceReport(code, name, interactive) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const counters = { listenerAdds: 0, listenerRemoves: 0, mediaQueries: 0, mediaListenerAdds: 0, mediaListenerRemoves: 0, resizeObservers: 0, resizeObserves: 0, resizeDisconnects: 0, animationFrames: 0, canceledFrames: 0, styleSets: 0, styleRemoves: 0, attributeSets: 0, attributeRemoves: 0 };
  const active = { listeners: 0, mediaListeners: 0, observers: 0, frames: 0 };
  const surfaces = new Set();
  const listenerState = new WeakMap();
  const add = w.EventTarget.prototype.addEventListener;
  const remove = w.EventTarget.prototype.removeEventListener;
  const keyFor = (type, options) => `${type}/${typeof options === 'boolean' ? options : Boolean(options?.capture)}`;
  w.EventTarget.prototype.addEventListener = function(type, callback, options) {
    if (this === w || surfaces.has(this)) {
      counters.listenerAdds++;
      let listeners = listenerState.get(this); if (!listeners) listenerState.set(this, listeners = new Map());
      const key = keyFor(type, options); let callbacks = listeners.get(key); if (!callbacks) listeners.set(key, callbacks = new Set());
      if (!callbacks.has(callback)) { callbacks.add(callback); active.listeners++; }
    }
    return add.call(this, type, callback, options);
  };
  w.EventTarget.prototype.removeEventListener = function(type, callback, options) {
    if (this === w || surfaces.has(this)) {
      counters.listenerRemoves++;
      if (listenerState.get(this)?.get(keyFor(type, options))?.delete(callback)) active.listeners--;
    }
    return remove.call(this, type, callback, options);
  };
  w.matchMedia = media => {
    counters.mediaQueries++;
    const listeners = new Set();
    return { media, matches: false, addEventListener(_type, callback) { counters.mediaListenerAdds++; if (!listeners.has(callback)) { listeners.add(callback); active.mediaListeners++; } }, removeEventListener(_type, callback) { counters.mediaListenerRemoves++; if (listeners.delete(callback)) active.mediaListeners--; } };
  };
  w.CSS = { supports: (property, value) => property.includes('backdrop-filter') && value === 'blur(1px)' };
  w.ResizeObserver = class {
    constructor() { counters.resizeObservers++; active.observers++; this.live = true; }
    observe() { counters.resizeObserves++; }
    unobserve() {}
    disconnect() { counters.resizeDisconnects++; if (this.live) { active.observers--; this.live = false; } }
  };
  let frameSerial = 0;
  const frames = new Set();
  w.requestAnimationFrame = () => { counters.animationFrames++; frames.add(++frameSerial); active.frames++; return frameSerial; };
  w.cancelAnimationFrame = id => { counters.canceledFrames++; if (frames.delete(id)) active.frames--; };
  for (const [prototype, method, counter] of [
    [w.CSSStyleDeclaration.prototype, 'setProperty', 'styleSets'], [w.CSSStyleDeclaration.prototype, 'removeProperty', 'styleRemoves'],
    [w.Element.prototype, 'setAttribute', 'attributeSets'], [w.Element.prototype, 'removeAttribute', 'attributeRemoves'],
  ]) {
    const original = prototype[method];
    prototype[method] = function(...args) { counters[counter]++; return original.apply(this, args); };
  }
  w.eval(code);
  const attachGlass = w.LiquidGlassBenchmark.attachGlass;
  const nodes = Array.from({ length: count }, () => { const element = w.document.createElement(interactive ? 'button' : 'div'); element.textContent = 'Preview surface'; surfaces.add(element); w.document.body.append(element); return element; });
  const observer = new w.MutationObserver(() => {});
  observer.observe(w.document.body, { subtree: true, attributes: true });
  let controllers;
  const stages = {};
  function measure(stage, fn) {
    const before = { ...counters }; observer.takeRecords(); fn();
    const records = observer.takeRecords();
    stages[stage] = { calls: Object.fromEntries(Object.entries(counters).map(([key, value]) => [key, value - before[key]])), mutations: { style: records.filter(record => record.attributeName === 'style').length, attributes: records.filter(record => record.attributeName !== 'style').length }, active: { ...active } };
  }
  measure('mount', () => { controllers = nodes.map(element => attachGlass(element, interactive ? { interactive: true } : {})); });
  measure('sameOptionsUpdate', () => controllers.forEach(controller => controller.update(interactive ? { interactive: true } : {})));
  measure('changedOptionsUpdate', () => controllers.forEach(controller => controller.update({ interactive, radius: 32, blur: 20 })));
  measure('destroy', () => controllers.forEach(controller => controller.destroy()));
  observer.disconnect(); dom.window.close();
  if (Object.values(active).some(value => value !== 0)) throw new Error(`Resource leak in ${name}/${interactive ? 'interactive' : 'static'}: ${JSON.stringify(active)}`);
  return stages;
}

const browserRunner = function() {
  const apis = { baseline: LG_baseline_attachGlass, current: LG_current_attachGlass };
  const median = values => { const sorted = [...values].sort((a, b) => a - b); const half = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2; };
  const p95 = values => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1];
  function batch(api, interactive, count) {
    const host = document.createElement('section'); host.className = 'fixture';
    const nodes = Array.from({ length: count }, (_, index) => { const node = document.createElement(interactive ? 'button' : 'div'); node.textContent = `Surface ${index + 1}`; host.append(node); return node; });
    document.body.append(host);
    const initial = interactive ? { interactive: true } : {};
    const started = performance.now();
    const controllers = nodes.map(node => api.attachGlass(node, initial));
    const mounted = performance.now();
    controllers.forEach(controller => controller.update(initial));
    const sameUpdated = performance.now();
    controllers.forEach(controller => controller.update({ interactive, radius: 32, blur: 20 }));
    const changedUpdated = performance.now();
    controllers.forEach(controller => controller.destroy());
    const destroyed = performance.now();
    host.remove();
    return { mount: mounted - started, sameOptionsUpdate: sameUpdated - mounted, changedOptionsUpdate: changedUpdated - sameUpdated, destroy: destroyed - changedUpdated, total: destroyed - started };
  }
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  window.runGlassBenchmark = async ({ count = 100, repetitions = 31, warmups = 5, seed = 91206 } = {}) => {
    if (document.hidden) throw new Error('Keep this preview foregrounded while measuring.');
    let state = seed >>> 0;
    const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    const report = { schema: 1, measuredAt: new Date().toISOString(), environment: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency, documentHidden: document.hidden }, method: { count, repetitions, warmups, seed, units: 'milliseconds per complete synchronous batch', timing: 'DOM controller mount, one same-options update, one changed-options update, destroy; fixture DOM creation/removal excluded; no animation frames rendered inside measured batches' }, source: window.benchmarkMetadata, scenarios: {} };
    for (const [scenario, interactive] of [['static', false], ['interactive', true]]) {
      const samples = { baseline: [], current: [] }; const order = [];
      for (let iteration = -warmups; iteration < repetitions; iteration++) {
        const first = random() < .5 ? 'baseline' : 'current'; const pair = [first, first === 'baseline' ? 'current' : 'baseline'];
        await nextFrame();
        if (document.hidden) throw new Error('Preview became hidden; discard this run.');
        for (const name of pair) {
          const sample = batch(apis[name], interactive, count);
          if (iteration >= 0) samples[name].push(sample);
        }
        if (iteration >= 0) order.push(pair);
      }
      const summary = {};
      for (const name of ['baseline', 'current']) summary[name] = Object.fromEntries(Object.keys(samples[name][0]).map(stage => [stage, { median: median(samples[name].map(sample => sample[stage])), p95: p95(samples[name].map(sample => sample[stage])) }]));
      report.scenarios[scenario] = { order, samples, summary };
      document.querySelector('#status').textContent = `Measured ${scenario}; ${repetitions} paired batches.`;
    }
    window.lastGlassBenchmark = report;
    document.querySelector('#results').textContent = JSON.stringify(report, null, 2);
    return report;
  };
  document.querySelector('#run').onclick = async () => { document.querySelector('#status').textContent = 'Running paired lifecycle batches…'; try { await window.runGlassBenchmark(); } catch (error) { document.querySelector('#status').textContent = error.message; } };
};

if (baseline === current) throw new Error('Baseline must be an independent checkout.');
const dirty = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'src'], { cwd: baseline, encoding: 'utf8' }).trim();
if (dirty) throw new Error('Baseline source has modifications; recreate the frozen checkout.');
await mkdir(out, { recursive: true });
const bundles = {};
const metadata = { schema: 1, generatedAt: new Date().toISOString(), node: process.version, bundler: { vite: dependencyVersion('vite') }, sourceScope: 'All nonblank lines under src ending .ts, .tsx or .css, including comments; tests, docs, demos and generated dist excluded.', baseline: await sourceMetrics(baseline), current: await sourceMetrics(current) };
for (const [name, root] of [['baseline', baseline], ['current', current]]) {
  bundles[name] = {};
  for (const symbol of ['attachGlass', 'getGlassProps']) {
    const bundled = await bundle(root, name, symbol); bundles[name][symbol] = bundled;
    (metadata[name].bundles ??= {})[symbol] = { minifiedBytes: bundled.bytes, gzipBytes: bundled.gzipBytes, target: 'es2022', format: 'iife', gzipLevel: 9, cssIncluded: false };
  }
}
const resources = { schema: 1, count, environment: { node: process.version, jsdom: dependencyVersion('jsdom'), backdrop: true, experimentalRefraction: false, mediaPreferences: false, resizeObserver: 'instrumented', requestAnimationFrame: 'queued until cancellation; no frames dispatched' }, method: 'Counts intercepted DOM-method calls and MutationObserver records, plus live owned resources. Separate from native-browser timing. Fresh browser-like Window per scenario/version.', source: metadata, scenarios: {} };
for (const [scenario, interactive] of [['static', false], ['interactive', true]]) resources.scenarios[scenario] = Object.fromEntries(['baseline', 'current'].map(name => [name, resourceReport(bundles[name].attachGlass.code, name, interactive)]));
await writeFile(join(out, 'source-and-size.json'), JSON.stringify(metadata, null, 2) + '\n');
await writeFile(join(out, 'resources.json'), JSON.stringify(resources, null, 2) + '\n');
const styles = await inlineStyles(join(current, 'src/styles.css'));
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Liquid Glass lifecycle benchmark</title><style>${styles}\nbody{font:16px system-ui;background:#171a24;color:#f2f5ff;margin:24px}button#run{padding:12px 18px;cursor:pointer}pre{white-space:pre-wrap;font:11px ui-monospace}.fixture{position:fixed;left:0;top:0;display:grid;grid-template-columns:repeat(10,70px);gap:4px;pointer-events:none;z-index:-1}.fixture>*{width:70px;height:36px;box-sizing:border-box}</style></head><body><h1>Controller lifecycle benchmark</h1><p>100 surfaces · 31 randomized paired batches · elapsed lifecycle time only</p><button id="run">Run benchmark</button><p id="status">Ready. Keep this preview foregrounded.</p><pre id="results"></pre><script>${bundles.baseline.attachGlass.code}\nvar LG_baseline_attachGlass=LiquidGlassBenchmark;\n${bundles.current.attachGlass.code}\nvar LG_current_attachGlass=LiquidGlassBenchmark;\nwindow.benchmarkMetadata=${JSON.stringify(metadata)};\n(${browserRunner.toString()})();\n</script></body></html>`;
await writeFile('/tmp/lg-perf-preview.html', html);
console.log(JSON.stringify({ baseline: metadata.baseline.commit, currentSource: metadata.current.sourceSha256, nonblankLines: { baseline: metadata.baseline.nonblankSourceLines, current: metadata.current.nonblankSourceLines }, output: out, browserFixture: '/tmp/lg-perf-preview.html', resources: { static: { baseline: resources.scenarios.static.baseline.mount.active, current: resources.scenarios.static.current.mount.active }, interactive: { baseline: resources.scenarios.interactive.baseline.mount.active, current: resources.scenarios.interactive.current.mount.active } } }, null, 2));
