#!/usr/bin/env node
/** Absolute fusion-scene cost, measured by a native-browser fixture. */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'vite';

const argument = flag => { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; };
if (process.argv.includes('--help')) {
  console.log('Usage: node scripts/fusion-benchmark.mjs [--out benchmarks] [--fixture /tmp/lg-fusion-preview.html]\nOpen generated HTML in the native T3 preview; await window.runFusionBenchmark(). Raw: window.lastFusionBenchmark. Separate readback/recovery: await window.runFusionValidation().');
  process.exit(0);
}
const root = resolve('.'), out = resolve(argument('--out') || 'benchmarks');
const fixturePath = resolve(argument('--fixture') || '/tmp/lg-fusion-preview.html');
async function sourceFiles(relative = '') {
  const files = [];
  for (const entry of await readdir(join(root, 'src', relative), { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(tsx?|css)$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}
const digest = createHash('sha256');
for (const file of await sourceFiles()) digest.update(file).update('\0').update(await readFile(join(root, 'src', file))).update('\0');
const source = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceSha256: digest.digest('hex'), sourceChanges: execFileSync('git', ['status', '--porcelain', '--', 'src'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean), hashing: 'Sorted src .ts/.tsx/.css file names and contents, each followed by NUL; source bundled directly, not dist.' };
const entry = '/tmp/lg-fusion-entry.ts';
await writeFile(entry, `export { attachGlassScene } from ${JSON.stringify(join(root, 'src/scene.ts'))};\n`);
const buildResult = await build({ configFile: false, logLevel: 'silent', build: { write: false, sourcemap: false, minify: true, target: 'es2022', lib: { entry, name: 'GlassFusionFixture', formats: ['iife'] } } });
const code = (Array.isArray(buildResult) ? buildResult[0] : buildResult).output.find(item => item.type === 'chunk').code;

function browserRunner() {
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const round = value => Math.round(value * 10000) / 10000;
  function summary(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
    return { count: values.length, median: round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2), p95: round(sorted[Math.ceil(sorted.length * .95) - 1]), mean: round(values.reduce((a, b) => a + b, 0) / values.length), min: round(sorted[0]), max: round(sorted.at(-1)) };
  }
  const environment = () => ({ userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency, documentHidden: document.hidden });
  const contextOptions = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false };
  function geometry(drops, time, width, height) {
    // Gallery merge target geometry; the harness excludes UI easing, captions and interaction work.
    const portrait = width < 950;
    const radius = Math.min(width * (portrait ? .26 : .17), height * (portrait ? .24 : .27));
    const cx = width * (portrait ? .55 : .65), cy = height * (portrait ? .60 : .53), t = time * .8;
    const separation = .9 + .6 * Math.sin(t);
    for (let index = 0; index < drops.length; index++) {
      drops[index].radius = radius * (index === 0 ? 1.04 : index === 1 ? .72 : .52);
      drops[index].x = cx + radius * (index === 0 ? -.2 : index === 1 ? separation : -separation * 1.1);
      drops[index].y = cy + radius * (index === 0 ? .1 : index === 1 ? -.6 * Math.sin(t * .65 + 1) : .62 * Math.cos(t * .7));
    }
  }
  function create(settings) {
    const host = document.createElement('section'); host.className = 'fixture';
    host.style.width = `${settings.width}px`; host.style.height = `${settings.height}px`;
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'display:block;width:100%;height:100%'; host.append(canvas); document.body.append(host);
    const gl = canvas.getContext('webgl2', contextOptions);
    if (!gl) { host.remove(); throw new Error('WebGL 2 unavailable.'); }
    const drops = Array.from({ length: 3 }, () => ({ x: 0, y: 0, radius: 1 }));
    geometry(drops, 0, settings.width, settings.height);
    const controller = GlassFusionFixture.attachGlassScene(canvas, { paused: true, reducedMotion: false, reducedTransparency: false, backdrop: 'studio', palette: 'neon', maxDpr: settings.maxDpr, maxPixels: settings.maxPixels, fusion: { drops, smoothness: settings.smoothness, refraction: settings.refraction, dispersion: settings.dispersion } });
    if (!controller.supported || typeof controller.setDrops !== 'function' || controller.stats.fusionCount !== 3) {
      controller.destroy(); gl.getExtension('WEBGL_lose_context')?.loseContext(); host.remove(); throw new Error('Fusion API/pipeline unavailable; build only after source is ready.');
    }
    return { host, canvas, gl, drops, controller, dispose() { controller.destroy(); gl.getExtension('WEBGL_lose_context')?.loseContext(); host.remove(); } };
  }
  async function measure(settings, index) {
    const fixture = create(settings), { controller, gl, drops } = fixture;
    const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuEnvironment = { contextAttributes: gl.getContextAttributes(), vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER), unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null, unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null, gpuTimerSupported: Boolean(timer) };
    const raw = { setDropsMs: [], renderSubmissionMs: [], stageAndRenderMs: [], rafIntervalMs: [], gpuMs: [] };
    const pending = []; let disjointEvents = 0, disjointSamples = 0, skippedQueries = 0;
    function poll() {
      if (!timer || !pending.length) return;
      if (gl.getParameter(timer.GPU_DISJOINT_EXT)) {
        disjointEvents++; disjointSamples += pending.length;
        for (const query of pending) gl.deleteQuery(query); pending.length = 0; return;
      }
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
        const query = pending.shift(); raw.gpuMs.push(round(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6)); gl.deleteQuery(query);
      }
    }
    try {
      for (let warm = 0; warm < settings.warmupFrames; warm++) { await frame(); geometry(drops, warm / 60, settings.width, settings.height); controller.setDrops(drops); controller.render(warm / 60); }
      const started = await frame(); let timestamp = started, previous = started;
      while (timestamp - started < settings.durationMs) {
        if (document.hidden) throw new Error('Preview hidden; discard this run.');
        if (timestamp !== started) raw.rafIntervalMs.push(round(timestamp - previous)); previous = timestamp;
        const time = (timestamp - started) / 1000;
        geometry(drops, time, settings.width, settings.height); poll();
        const query = timer && pending.length < 32 ? gl.createQuery() : null;
        if (timer && !query) skippedQueries++;
        if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        const before = performance.now(); controller.setDrops(drops); const staged = performance.now(); controller.render(time); const submitted = performance.now();
        raw.setDropsMs.push(round(staged - before)); raw.renderSubmissionMs.push(round(submitted - staged)); raw.stageAndRenderMs.push(round(submitted - before));
        if (query) { gl.endQuery(timer.TIME_ELAPSED_EXT); pending.push(query); }
        if (!controller.supported) throw new Error('Fusion renderer stopped; discard this run.');
        timestamp = await frame();
      }
      for (let attempt = 0; pending.length && attempt < 60; attempt++) { await frame(); poll(); }
      const unansweredQueries = pending.length;
      for (const query of pending) gl.deleteQuery(query);
      return { run: index + 1, elapsedMs: round(timestamp - started), frames: raw.stageAndRenderMs.length, stats: controller.stats, canvasSize: [fixture.canvas.width, fixture.canvas.height], environment: gpuEnvironment, timing: Object.fromEntries(Object.entries(raw).map(([key, values]) => [key, summary(values)])), callbackCadenceHz: round(raw.rafIntervalMs.length * 1000 / raw.rafIntervalMs.reduce((a, b) => a + b, 0)), gpuQueries: { disjointEvents, disjointSamples, skippedQueries, unansweredQueries }, raw };
    } finally { fixture.dispose(); }
  }
  function resourcePass(settings) {
    const calls = { layoutReads: 0, drawArrays: 0, drawArraysInstanced: 0, instances: 0, bufferData: 0, bufferSubData: 0, texStorage2D: 0, texImage2D: 0, float32Allocations: 0, float32AllocatedBytes: 0, flush: 0, getError: 0, getParameter: 0, resizeObserverCreates: 0, resizeObserve: 0, resizeDisconnect: 0, requestAnimationFrame: 0, cancelAnimationFrame: 0 };
    const kinds = ['Program', 'Shader', 'VertexArray', 'Buffer', 'Texture', 'Framebuffer', 'Renderbuffer'];
    const created = Object.fromEntries(kinds.map(kind => [kind, 0])), deleted = { ...created };
    const prototype = WebGL2RenderingContext.prototype, originals = {};
    function wrap(key, callback) { originals[key] = prototype[key]; prototype[key] = function(...args) { callback(args); return originals[key].apply(this, args); }; }
    for (const key of ['drawArrays', 'drawArraysInstanced', 'bufferData', 'bufferSubData', 'texStorage2D', 'texImage2D', 'flush', 'getError', 'getParameter']) wrap(key, args => { calls[key]++; if (key === 'drawArraysInstanced') calls.instances += args[3]; });
    for (const kind of kinds) { wrap(`create${kind}`, () => created[kind]++); wrap(`delete${kind}`, args => { if (args[0]) deleted[kind]++; }); }
    const Float = window.Float32Array, Resize = window.ResizeObserver, bcr = Element.prototype.getBoundingClientRect;
    const raf = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
    window.Float32Array = new Proxy(Float, { construct(target, args) { const array = Reflect.construct(target, args); calls.float32Allocations++; calls.float32AllocatedBytes += array.byteLength; return array; } });
    if (Resize) window.ResizeObserver = class extends Resize { constructor(callback) { super(callback); calls.resizeObserverCreates++; } observe(...args) { calls.resizeObserve++; return super.observe(...args); } disconnect() { calls.resizeDisconnect++; return super.disconnect(); } };
    Element.prototype.getBoundingClientRect = function() { calls.layoutReads++; return bcr.call(this); };
    window.requestAnimationFrame = function(callback) { calls.requestAnimationFrame++; return raf.call(window, callback); };
    window.cancelAnimationFrame = function(id) { calls.cancelAnimationFrame++; return cancel.call(window, id); };
    let fixture;
    try {
      fixture = create(settings);
      const initialization = { calls: { ...calls }, created: { ...created }, deleted: { ...deleted } };
      for (const key in calls) calls[key] = 0;
      geometry(fixture.drops, 1.5, settings.width, settings.height); fixture.controller.setDrops(fixture.drops);
      const stagedOnly = { ...calls };
      if (calls.drawArrays || calls.drawArraysInstanced || calls.resizeDisconnect || calls.resizeObserve || calls.requestAnimationFrame) throw new Error('setDrops did not only stage paused geometry.');
      for (const key in calls) calls[key] = 0;
      fixture.controller.render(1.5); const steadyFrame = { ...calls }, stats = fixture.controller.stats;
      fixture.dispose(); fixture = null;
      const liveAfterDestroy = Object.fromEntries(kinds.map(kind => [kind, created[kind] - deleted[kind]]));
      if (Object.values(liveAfterDestroy).some(value => value !== 0)) throw new Error('Owned WebGL handle count remains after destruction.');
      return { initialization, stagedOnly, steadyFrame, stats, objects: { created, deleted, liveAfterDestroy }, note: 'Separate instrumented pass excluded from timing. Counts explicit typed arrays and owned WebGL handles, not all JS arrays, browser/driver allocations, VRAM, or presented frames.' };
    } finally {
      fixture?.dispose(); window.Float32Array = Float; window.ResizeObserver = Resize; Element.prototype.getBoundingClientRect = bcr; window.requestAnimationFrame = raf; window.cancelAnimationFrame = cancel;
      for (const [key, original] of Object.entries(originals)) prototype[key] = original;
    }
  }
  window.runFusionBenchmark = async ({ repetitions = 5, durationMs = 2000, warmupFrames = 12, width = 720, height = 1280, maxDpr = 1.5, maxPixels = 900000, smoothness = 64, refraction = 62, dispersion = 3 } = {}) => {
    if (window.fusionBenchmarkRunning) throw new Error('Fusion benchmark already running.');
    if (document.hidden) throw new Error('Keep native preview actively rendering.');
    if (![3, 5].includes(repetitions) || durationMs < 1000) throw new Error('Use three or five runs of at least one second.');
    const settings = { repetitions, durationMs, warmupFrames, width, height, maxDpr, maxPixels, smoothness, refraction, dispersion };
    const report = { schema: 1, measuredAt: new Date().toISOString(), source: window.fusionBenchmarkSource, environment: environment(), method: { ...settings, backdrop: 'studio', drops: 3, motion: 'Gallery merge target geometry: time*.8, radius min(width*.26,height*.24) for portrait, radii ratios1.04/.72/.52, separation .9+.6*sin(time*.8); reusable drop objects. UI easing and gallery layout excluded.', scope: 'Absolute cost of a new scene API; no previous-version fusion speedup, whole-app FPS or physical-device claim.', submission: 'performance.now around staged setDrops and render, excluding the benchmark motion calculation and asynchronous GPU polling.', gpu: 'Optional asynchronous EXT_disjoint_timer_query_webgl2, nanoseconds converted to ms; available non-disjoint samples only. Queries/polling are not inside CPU submission timing.', cadence: 'rAF intervals; shared preview/capture/display may constrain callbacks. Callback cadence is not proof of presented FPS.', budget: 'Explicit maxPixels trades backing resolution for speed. Report actual canvas dimensions and pixel count; do not describe this as equal-quality baseline optimization.', resources: 'Separate instrumented initialization/staging/steady-frame/destruction pass; no instrumentation in timing runs.' }, samples: [] };
    window.fusionBenchmarkRunning = true; window.lastFusionBenchmark = report;
    try {
      for (let index = 0; index < repetitions; index++) { document.querySelector('#status').textContent = `Fusion run ${index + 1}/${repetitions}`; report.samples.push(await measure(settings, index)); }
      report.aggregate = Object.fromEntries(['setDropsMs', 'renderSubmissionMs', 'stageAndRenderMs', 'rafIntervalMs', 'gpuMs'].map(key => [key, summary(report.samples.flatMap(sample => sample.timing[key] ? [sample.timing[key].median] : []))]));
      report.aggregate.callbackCadenceHz = summary(report.samples.map(sample => sample.callbackCadenceHz));
      report.resources = resourcePass(settings);
      document.querySelector('#status').textContent = 'Complete. Raw report: window.lastFusionBenchmark.';
      const brief = { measuredAt: report.measuredAt, source: report.source, environment: report.environment, method: report.method, aggregate: report.aggregate, resources: report.resources, gpuQueries: report.samples.map(sample => sample.gpuQueries) };
      document.querySelector('#results').textContent = JSON.stringify(brief, null, 2); return brief;
    } finally { window.fusionBenchmarkRunning = false; }
  };
  window.runFusionValidation = async () => {
    if (window.fusionBenchmarkRunning) throw new Error('Wait for timing to finish.');
    const settings = { width: 320, height: 240, maxDpr: 1, maxPixels: 900000, smoothness: 64, refraction: 62, dispersion: 3 };
    const fixture = create(settings), { controller, gl, drops, canvas } = fixture;
    const samples = [];
    try {
      for (const time of [0, 1.5, 3]) {
        geometry(drops, time, settings.width, settings.height); controller.setDrops(drops); controller.render(time); gl.finish();
        const pixels = new Uint8Array(canvas.width * canvas.height * 4); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let sum = 0, minimum = 255, maximum = 0, hash = 2166136261;
        for (let index = 0; index < pixels.length; index++) { hash = Math.imul(hash ^ pixels[index], 16777619); if (index % 4 !== 3) { sum += pixels[index]; minimum = Math.min(minimum, pixels[index]); maximum = Math.max(maximum, pixels[index]); } }
        samples.push({ time, stats: controller.stats, meanRgb: round(sum / (canvas.width * canvas.height * 3)), minRgb: minimum, maxRgb: maximum, pixelFnv1a32: (hash >>> 0).toString(16).padStart(8, '0'), error: gl.getError() });
      }
      const extension = gl.getExtension('WEBGL_lose_context'); const before = { supported: controller.supported, stats: controller.stats }; let recovery;
      if (extension) {
        const event = type => new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 8000); canvas.addEventListener(type, () => { clearTimeout(timeout); resolve(); }, { once: true }); });
        const lost = event('webglcontextlost'); extension.loseContext(); await lost;
        const loss = { supported: controller.supported, stats: controller.stats };
        const restored = event('webglcontextrestored'); await new Promise(resolve => setTimeout(resolve, 100)); extension.restoreContext(); await restored; await new Promise(resolve => setTimeout(resolve, 100));
        controller.render(1.5); recovery = { before, loss, restored: { supported: controller.supported, stats: controller.stats, error: gl.getError() } };
      } else recovery = { before, extensionUnavailable: true };
      const report = { source: window.fusionBenchmarkSource, environment: environment(), scope: 'Separate native fixed-time shader readback and actual context restoration; not timing or image-equivalence evidence.', samples, changedReadback: new Set(samples.map(sample => sample.pixelFnv1a32)).size > 1, recovery };
      window.lastFusionValidation = report; return report;
    } finally { fixture.dispose(); }
  };
  document.querySelector('#run').onclick = () => window.runFusionBenchmark().catch(error => { document.querySelector('#status').textContent = error.message; });
}

await mkdir(out, { recursive: true });
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Liquid Glass fusion benchmark</title><style>body{margin:0;font:14px system-ui;background:#171d26;color:#eff4ff}header{padding:12px;position:relative;z-index:2}button{min-height:44px;padding:10px 18px}pre{font:11px ui-monospace;white-space:pre-wrap;padding:12px}.fixture{position:fixed;left:0;top:0;overflow:hidden}</style></head><body><header><b>Fusion scene · absolute rendering cost</b><p>Three animated drops · studio background · explicit backing-pixel budget</p><button id="run">Run fusion benchmark</button><span id="status">Ready. Keep native preview active.</span></header><pre id="results"></pre><script>${code}\nwindow.fusionBenchmarkSource=${JSON.stringify(source)};\n(${browserRunner.toString()})();</script></body></html>`;
await writeFile(fixturePath, html); await writeFile(join(out, 'fusion-source.json'), JSON.stringify(source, null, 2) + '\n');
console.log(JSON.stringify({ fixture: fixturePath, fixtureBytes: Buffer.byteLength(html), source }, null, 2));
