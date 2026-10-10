#!/usr/bin/env node
/** Native-browser rendering harness. No Node/jsdom frame-rate measurements. */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'vite';

const option = flag => { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; };
if (process.argv.includes('--help')) {
  console.log('Usage: node scripts/render-benchmark.mjs --baseline /tmp/liquid-glass-0.9-render-baseline [--out benchmarks] [--fixture /tmp/lg-render-preview.html]\nOpen the generated fixture in the native T3 preview. Run window.runRenderBenchmark(), then read window.lastRenderBenchmark in JSON chunks. Keep the preview visible/actively rendering; discard interrupted runs.');
  process.exit(0);
}
const current = resolve('.');
const baseline = resolve(option('--baseline') || '/tmp/liquid-glass-0.9-render-baseline');
const out = resolve(option('--out') || 'benchmarks');
const fixture = resolve(option('--fixture') || '/tmp/lg-render-preview.html');
if (baseline === current) throw new Error('Use a separate frozen baseline checkout.');
if (execFileSync('git', ['status', '--porcelain', '--', 'src'], { cwd: baseline, encoding: 'utf8' }).trim()) throw new Error('Baseline source has modifications.');
async function source(root, relative = '') {
  const files = [];
  for (const entry of await readdir(join(root, 'src', relative), { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await source(root, path));
    else if (/\.(tsx?|css)$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}
async function metadata(root) {
  const hash = createHash('sha256');
  for (const file of await source(root)) hash.update(file).update('\0').update(await readFile(join(root, 'src', file))).update('\0');
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceSha256: hash.digest('hex'), sourceChanges: execFileSync('git', ['status', '--porcelain', '--', 'src'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean) };
}
async function bundle(root, name) {
  const entry = `/tmp/lg-render-${name}.ts`;
  await writeFile(entry, `export { attachGlassScene } from ${JSON.stringify(join(root, 'src/scene.ts'))};\nexport { createDisplacementMap } from ${JSON.stringify(join(root, 'src/optics.ts'))};\n`);
  const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: true, sourcemap: false, target: 'es2022', lib: { entry, name: 'GlassRenderFixture', formats: ['iife'] } } });
  return (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk').code;
}

function browserRunner() {
  const apis = { baseline: LG_render_baseline, current: LG_render_current };
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const rounded = value => Math.round(value * 10000) / 10000;
  const summary = values => {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    const mid = Math.floor(ordered.length / 2);
    return { count: ordered.length, median: rounded(ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2), p95: rounded(ordered[Math.ceil(ordered.length * .95) - 1]), mean: rounded(values.reduce((a, b) => a + b, 0) / values.length), min: rounded(ordered[0]), max: rounded(ordered.at(-1)) };
  };
  const contextOptions = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false };
  window.runOpticsBenchmark = async ({ count = 8, repetitions = 31, warmups = 5, width = 256, height = 160, radius = 28, seed = 407111 } = {}) => {
    if (window.renderBenchmarkRunning) throw new Error('Another benchmark is running.');
    if (document.hidden) throw new Error('Keep preview active.');
    let state = seed >>> 0, retained;
    const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    const samples = { baseline: [], current: [] }, orders = [];
    const generate = name => {
      const before = performance.now();
      for (let index = 0; index < count; index++) retained = apis[name].createDisplacementMap(width, height, radius);
      return rounded(performance.now() - before);
    };
    const equality = [];
    for (const [w, h, r] of [[1, 1, 0], [7, 9, 0], [16, 16, 8], [47, 31, 7], [256, 160, 28], [512, 512, 256], [128, 77, 13.5]]) {
      const a = apis.baseline.createDisplacementMap(w, h, r), b = apis.current.createDisplacementMap(w, h, r);
      let differentBytes = 0;
      for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) differentBytes++;
      equality.push({ width: w, height: h, radius: r, bytes: a.length, differentBytes });
      if (differentBytes) throw new Error('Optics output changed; performance comparison is not equivalent.');
    }
    window.renderBenchmarkRunning = true;
    try {
      for (let iteration = -warmups; iteration < repetitions; iteration++) {
        await nextFrame(); if (document.hidden) throw new Error('Preview hidden; discard this run.');
        const first = random() < .5 ? 'baseline' : 'current'; const order = [first, first === 'baseline' ? 'current' : 'baseline'];
        for (const name of order) { const result = generate(name); if (iteration >= 0) samples[name].push(result); }
        if (iteration >= 0) orders.push(order);
      }
      const report = { schema: 1, measuredAt: new Date().toISOString(), source: window.renderBenchmarkMetadata, environment: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency, documentHidden: document.hidden }, method: { count, repetitions, warmups, width, height, radius, seed, units: 'milliseconds per synchronous batch of eight displacement maps', scope: 'Pure CPU pixel generation; output allocation included, CSS/SVG filter composition and GPU rendering excluded. Seeded paired order after warmups. Last output retained.' }, byteEquality: equality, orders, samples, summary: { baseline: summary(samples.baseline), current: summary(samples.current) }, outputBytes: retained.byteLength };
      window.lastOpticsBenchmark = report; document.querySelector('#results').textContent = JSON.stringify(report, null, 2); return report;
    } finally { window.renderBenchmarkRunning = false; }
  };
  function createFixture(name, scenario, settings) {
    const host = document.createElement('div'); host.className = 'scene';
    host.style.width = `${settings.width}px`; host.style.height = `${settings.height}px`;
    const canvas = document.createElement('canvas'); host.append(canvas);
    const count = scenario.startsWith('scene') ? 8 : 0;
    const nodes = Array.from({ length: count }, (_, index) => {
      const node = document.createElement('div'); node.className = 'lens';
      node.style.left = `${.12 * settings.width + index % 4 * .205 * settings.width}px`;
      node.style.top = `${.21 * settings.height + Math.floor(index / 4) * .42 * settings.height}px`;
      node.style.width = `${settings.width * .14}px`; node.style.height = `${settings.height * .21}px`;
      host.append(node); return node;
    });
    document.body.append(host);
    const gl = canvas.getContext('webgl2', contextOptions);
    if (!gl) { host.remove(); throw new Error('WebGL 2 unavailable.'); }
    const options = { paused: true, reducedMotion: false, reducedTransparency: false, maxDpr: settings.maxDpr, palette: 'neon', surfaces: nodes.map(element => ({ element, radius: 24, refraction: 22 })) };
    if (scenario.startsWith('field')) options.field = { count: Number(scenario.slice(5)), size: settings.fieldSize, speed: 60, direction: 'right', motion: 'wave', seed: 731 };
    const controller = apis[name].attachGlassScene(canvas, options);
    if (!controller.supported) { controller.destroy(); host.remove(); throw new Error(`Renderer unsupported in ${name}/${scenario}.`); }
    const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const environment = { contextAttributes: gl.getContextAttributes(), vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER), unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null, unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null, gpuTimerSupported: Boolean(timer) };
    function position(time) {
      if (scenario === 'scene8-moving') nodes.forEach((node, index) => { node.style.transform = `translate(${Math.sin(time * .8 + index) * 13}px,${Math.cos(time * .55 + index) * 10}px)`; });
    }
    return { host, canvas, nodes, gl, controller, timer, environment, position, dispose() { controller.destroy(); gl.getExtension('WEBGL_lose_context')?.loseContext(); host.remove(); } };
  }
  async function measure(name, scenario, settings) {
    const fixture = createFixture(name, scenario, settings);
    const { gl, timer, controller } = fixture;
    const intervals = [], submission = [], gpu = [], pending = [];
    let disjointSamples = 0, disjointEvents = 0, skippedQueries = 0;
    try {
      for (let index = 0; index < settings.warmupFrames; index++) { await nextFrame(); fixture.position(index / 60); controller.render(index / 60); }
      const poll = () => {
        if (!timer || !pending.length) return;
        if (gl.getParameter(timer.GPU_DISJOINT_EXT)) {
          disjointEvents++;
          for (const item of pending) gl.deleteQuery(item.query);
          disjointSamples += pending.length; pending.length = 0;
          return;
        }
        while (pending.length && gl.getQueryParameter(pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
          const item = pending.shift(); gpu.push(rounded(gl.getQueryParameter(item.query, gl.QUERY_RESULT) / 1e6)); gl.deleteQuery(item.query);
        }
      };
      const started = await nextFrame(); let previous = started, timestamp = started;
      while (timestamp - started < settings.durationMs) {
        if (document.hidden) throw new Error('Preview became hidden; discard this run.');
        if (timestamp !== started) intervals.push(rounded(timestamp - previous));
        previous = timestamp;
        fixture.position((timestamp - started) / 1000);
        poll();
        const query = timer && pending.length < 32 ? gl.createQuery() : null;
        if (timer && !query) skippedQueries++;
        if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        const before = performance.now(); controller.render((timestamp - started) / 1000); submission.push(rounded(performance.now() - before));
        if (!controller.supported) throw new Error(`Renderer stopped during ${name}/${scenario}; discard this run.`);
        if (query) { gl.endQuery(timer.TIME_ELAPSED_EXT); pending.push({ query }); }
        timestamp = await nextFrame();
      }
      const elapsedMs = timestamp - started;
      for (let index = 0; pending.length && index < 60; index++) { await nextFrame(); poll(); }
      const unansweredQueries = pending.length;
      for (const item of pending) gl.deleteQuery(item.query);
      const completion = [];
      // This is a separate, intentionally serialized diagnostic, never normal production behavior.
      for (let index = 0; index < settings.completionFrames; index++) {
        await nextFrame(); fixture.position(index / 60); gl.finish();
        const before = performance.now(); controller.render(index / 60); gl.finish(); completion.push(rounded(performance.now() - before));
      }
      return { version: name, scenario, elapsedMs: rounded(elapsedMs), frames: submission.length, frameCadenceHz: rounded(intervals.length * 1000 / intervals.reduce((a, b) => a + b, 0)), backingPixels: fixture.canvas.width * fixture.canvas.height, canvasSize: [fixture.canvas.width, fixture.canvas.height], cssSize: [settings.width, settings.height], environment: fixture.environment, stats: controller.stats ?? null, timing: { submissionMs: summary(submission), rafIntervalMs: summary(intervals), gpuMs: summary(gpu), serializedCompletionMs: summary(completion) }, raw: { submissionMs: submission, rafIntervalMs: intervals, gpuMs: gpu, serializedCompletionMs: completion }, gpuQueries: { disjointSamples, disjointEvents, skippedQueries, unansweredQueries } };
    } finally { fixture.dispose(); }
  }
  function resources(name, scenario, settings) {
    const calls = { layoutReads: 0, drawArrays: 0, drawArraysInstanced: 0, instances: 0, bufferData: 0, bufferSubData: 0, texImage2D: 0, texStorage2D: 0, float32Allocations: 0, float32AllocatedBytes: 0, flush: 0, getError: 0, getParameter: 0 };
    const prototype = WebGL2RenderingContext.prototype;
    const original = {}, created = {}, deleted = {};
    const objectKinds = ['Program', 'Shader', 'VertexArray', 'Buffer', 'Texture', 'Framebuffer', 'Renderbuffer'];
    const wrap = (key, callback) => { original[key] = prototype[key]; prototype[key] = function(...args) { callback(args); return original[key].apply(this, args); }; };
    for (const key of ['drawArrays', 'drawArraysInstanced', 'bufferData', 'bufferSubData', 'texImage2D', 'texStorage2D', 'flush', 'getError', 'getParameter']) wrap(key, args => { calls[key]++; if (key === 'drawArraysInstanced') calls.instances += args[3]; });
    for (const kind of objectKinds) {
      created[kind] = 0; deleted[kind] = 0;
      wrap(`create${kind}`, () => created[kind]++); wrap(`delete${kind}`, args => { if (args[0]) deleted[kind]++; });
    }
    const bcr = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function() { calls.layoutReads++; return bcr.call(this); };
    const Float = window.Float32Array;
    window.Float32Array = new Proxy(Float, { construct(target, args) { const array = Reflect.construct(target, args); calls.float32Allocations++; calls.float32AllocatedBytes += array.byteLength; return array; } });
    let fixture;
    try {
      fixture = createFixture(name, scenario, settings);
      const mounted = { calls: { ...calls }, created: { ...created }, deleted: { ...deleted } };
      for (const key in calls) calls[key] = 0;
      fixture.position(2); fixture.controller.render(2);
      const frame = { ...calls }; const stats = fixture.controller.stats ?? null;
      fixture.dispose(); fixture = null;
      return { mounted, steadyFrame: frame, stats, objects: { created, deleted, liveAfterDestroy: Object.fromEntries(objectKinds.map(kind => [kind, created[kind] - deleted[kind]])) }, note: 'Instrumented separate pass; overhead excluded from timing. JS array literals, browser/driver/internal allocations and total VRAM are not measured. getParameter at mount includes harness environment inspection.' };
    } finally {
      fixture?.dispose(); window.Float32Array = Float; Element.prototype.getBoundingClientRect = bcr;
      for (const [key, method] of Object.entries(original)) prototype[key] = method;
    }
  }
  function fidelity(scenario, settings, time = 2) {
    const images = {};
    for (const name of ['baseline', 'current']) {
      const fixture = createFixture(name, scenario, settings);
      try {
        fixture.position(time); fixture.controller.render(time); fixture.gl.finish();
        const pixels = new Uint8Array(fixture.canvas.width * fixture.canvas.height * 4);
        fixture.gl.readPixels(0, 0, fixture.canvas.width, fixture.canvas.height, fixture.gl.RGBA, fixture.gl.UNSIGNED_BYTE, pixels);
        images[name] = { pixels, width: fixture.canvas.width, height: fixture.canvas.height };
      } finally { fixture.dispose(); }
    }
    if (images.baseline.width !== images.current.width || images.baseline.height !== images.current.height) throw new Error('Fidelity canvas resolutions differ.');
    const histogram = new Array(256).fill(0); let total = 0, max = 0, changed = 0;
    for (let index = 0; index < images.baseline.pixels.length; index++) {
      if (index % 4 === 3) continue;
      const delta = Math.abs(images.baseline.pixels[index] - images.current.pixels[index]);
      histogram[delta]++; total += delta; max = Math.max(max, delta); if (delta > 8) changed++;
    }
    const channels = images.baseline.width * images.baseline.height * 3;
    let cumulative = 0, p95 = 0;
    for (let index = 0; index < histogram.length; index++) { cumulative += histogram[index]; if (cumulative >= channels * .95) { p95 = index; break; } }
    return { cssSize: [settings.width, settings.height], canvasSize: [images.baseline.width, images.baseline.height], time, rgbMeanAbsoluteDifference: rounded(total / channels), rgbP95AbsoluteDifference: p95, rgbMaxAbsoluteDifference: max, rgbChannelsDifferenceOver8Percent: rounded(changed * 100 / channels), note: '8-bit RGB comparison of fixed-time render, equal DPR/surfaces/palette. Texture interpolation may differ from analytical baseline; this is not pixel-identical rendering.' };
  }
  window.runRenderBenchmark = async ({ scenarios = ['scene8-static', 'scene8-moving', 'field1000', 'field3000'], repetitions = 5, width = 640, height = 400, maxDpr = 1, durationMs = 2000, warmupFrames = 12, completionFrames = 12, seed = 971301, fieldSize = 12 } = {}) => {
    if (window.renderBenchmarkRunning) throw new Error('Benchmark already running.');
    if (document.hidden) throw new Error('Keep the native preview actively rendering.');
    if (repetitions < 3 || durationMs < 1000) throw new Error('Use at least 3 runs and one second per run.');
    const settings = { repetitions, width, height, maxDpr, durationMs, warmupFrames, completionFrames, seed, fieldSize };
    let state = seed >>> 0;
    const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    const report = { schema: 1, measuredAt: new Date().toISOString(), source: window.renderBenchmarkMetadata, environment: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency, documentHidden: document.hidden }, method: { ...settings, frameSubmission: 'performance.now around render(time); includes geometry reads and command submission, not GPU completion', frameCadence: 'requestAnimationFrame timestamp intervals during active scene; preview/display/recording can constrain cadence', gpuTiming: 'optional asynchronous EXT_disjoint_timer_query_webgl2 nanoseconds converted to ms; disjoint samples rejected, polling outside submission timing', serializedCompletion: 'separate render(time)+gl.finish wall time after prior GPU drain; benchmark-only synchronization; includes JS, IPC, driver and GPU, not pure GPU time or FPS', resourceCounters: 'separate instrumented steady-frame pass, not included in timings', workload: '640x400 CSS pixels by default, maxDpr1, same eight lenses/palette/optics for baseline/current. Fields are current-only decorative instances; not thousands of DOM widgets.', shaderQuality: 'No lowered DPR or wallpaper resolution for before/after. New texture interpolation is assessed separately by fixed-time RGB comparison.' }, scenarios: {} };
    window.renderBenchmarkRunning = true; window.lastRenderBenchmark = report;
    try {
      for (const scenario of scenarios) {
        if (!['scene8-static', 'scene8-moving', 'field1000', 'field3000'].includes(scenario)) throw new Error(`Unknown scenario ${scenario}`);
        const paired = scenario.startsWith('scene'); const samples = paired ? { baseline: [], current: [] } : { current: [] }; const orders = [];
        for (let iteration = 0; iteration < repetitions; iteration++) {
          const first = random() < .5 ? 'baseline' : 'current';
          const order = paired ? [first, first === 'baseline' ? 'current' : 'baseline'] : ['current']; orders.push(order);
          for (const name of order) {
            document.querySelector('#status').textContent = `${scenario} · ${name} · run ${iteration + 1}/${repetitions}`;
            samples[name].push(await measure(name, scenario, settings));
          }
        }
        const aggregate = {};
        for (const [name, rows] of Object.entries(samples)) aggregate[name] = { submissionMs: summary(rows.map(row => row.timing.submissionMs.median)), rafIntervalMs: summary(rows.map(row => row.timing.rafIntervalMs.median)), serializedCompletionMs: summary(rows.map(row => row.timing.serializedCompletionMs.median)), gpuMs: summary(rows.flatMap(row => row.timing.gpuMs ? [row.timing.gpuMs.median] : [])), frameCadenceHz: summary(rows.map(row => row.frameCadenceHz)) };
        report.scenarios[scenario] = { orders, samples, aggregate, resources: Object.fromEntries(Object.keys(samples).map(name => [name, resources(name, scenario, settings)])), fidelity: paired ? fidelity(scenario, settings) : null };
      }
      document.querySelector('#status').textContent = 'Complete. Raw report is window.lastRenderBenchmark.';
      const brief = { measuredAt: report.measuredAt, source: report.source, environment: report.environment, scenarios: Object.fromEntries(Object.entries(report.scenarios).map(([key, value]) => [key, { aggregate: value.aggregate, resources: value.resources, fidelity: value.fidelity }])) };
      document.querySelector('#results').textContent = JSON.stringify(brief, null, 2);
      return brief;
    } finally { window.renderBenchmarkRunning = false; }
  };
  window.runSceneValidation = () => (async()=>{const reports=[];for(const palette of ['neon','sunset','ocean'])for(const refraction of [0,22]){const images={};for(const name of ['baseline','current']){const h=document.createElement('div');h.style.cssText='position:fixed;left:0;top:0;width:320px;height:240px';const c=document.createElement('canvas');c.style.cssText='position:absolute;width:100%;height:100%';h.append(c);const nodes=Array.from({length:8},(_,i)=>{const e=document.createElement('div');e.style.cssText='position:absolute;left:'+ (50+i*4)+'px;top:'+(45+i*3)+'px;width:210px;height:140px';h.append(e);return e});document.body.append(h);const s=(name==='baseline'?LG_render_baseline:LG_render_current).attachGlassScene(c,{paused:true,maxDpr:1,palette,surfaces:nodes.map(element=>({element,radius:28,refraction}))});if(!s.supported)throw Error('Unsupported overlap '+name);s.render(2);const gl=c.getContext('webgl2');gl.finish();const pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);images[name]=pixels;s.destroy();gl.getExtension('WEBGL_lose_context')?.loseContext();h.remove()}let sum=0,max=0,over8=0;const hist=new Array(256).fill(0);for(let i=0;i<images.baseline.length;i++){if(i%4===3)continue;const d=Math.abs(images.baseline[i]-images.current[i]);sum+=d;max=Math.max(max,d);if(d>8)over8++;hist[d]++}let accum=0,p95=0;for(let d=0;d<256;d++){accum+=hist[d];if(accum>=320*240*3*.95){p95=d;break}}reports.push({palette,refraction,overlappingLenses:8,cssSize:[320,240],radius:28,time:2,positions:'left50+4i,top45+3i,width210,height140',rgbMAE:sum/(320*240*3),rgbP95:p95,rgbMax:max,rgbPercentOver8:over8/(320*240*3)*100})}const h=document.createElement('div');h.style.cssText='position:fixed;left:0;top:0;width:320px;height:240px';const c=document.createElement('canvas');c.style.cssText='width:100%;height:100%';h.append(c);const e=document.createElement('div');e.style.cssText='position:absolute;left:50px;top:45px;width:210px;height:140px';h.append(e);document.body.append(h);const s=LG_render_current.attachGlassScene(c,{paused:true,maxDpr:1,field:{count:3000},surfaces:[{element:e,radius:28,refraction:22}]});const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_lose_context');const before={supported:s.supported,stats:s.stats};if(!s.supported)throw Error('Native combined pipeline unsupported');let restoration;if(ext){const lost=new Promise(r=>c.addEventListener('webglcontextlost',()=>r(true),{once:true}));ext.loseContext();await lost;const loss={supported:s.supported,stats:s.stats};const restored=new Promise(r=>c.addEventListener('webglcontextrestored',()=>setTimeout(()=>r({supported:s.supported,stats:s.stats,error:gl.getError()}),100),{once:true}));await new Promise(r=>setTimeout(r,100));ext.restoreContext();restoration={before,loss,restored:await restored}}else restoration={before,extensionUnavailable:true};s.destroy();h.remove();const result={source:renderBenchmarkMetadata,scope:'Native fixed-time readback, overlap and actual context restoration; separate from timing and mocked tests.',overlaps:reports,restoration};window.lastSceneValidation=result;return result})();
  document.querySelector('#run').onclick = () => window.runRenderBenchmark().catch(error => { document.querySelector('#status').textContent = error.message; });
}

await mkdir(out, { recursive: true });
const metadataReport = { schema: 1, generatedAt: new Date().toISOString(), node: process.version, bundler: 'Vite IIFE / es2022 / minified / no source maps / same global name', baseline: await metadata(baseline), current: await metadata(current) };
const baselineCode = await bundle(baseline, 'baseline');
const currentCode = await bundle(current, 'current');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Liquid Glass rendering benchmark</title><style>body{margin:0;background:#0c111c;color:#e2e9ff;font:14px system-ui}header{padding:16px}button{min-height:44px;padding:10px 20px}pre{font:11px ui-monospace;white-space:pre-wrap;padding:16px}.scene{position:fixed;left:0;top:120px;overflow:hidden;background:#0b0e1a}.scene canvas{position:absolute;width:100%;height:100%;inset:0}.lens{position:absolute;pointer-events:none}</style></head><body><header><b>Native browser rendering benchmark</b><p>Controlled WebGL workload · paired versions · separate submission / completion / cadence</p><button id="run">Run rendering benchmark</button><span id="status">Ready. Keep preview active.</span></header><pre id="results"></pre><script>${baselineCode}\nvar LG_render_baseline=GlassRenderFixture;\n${currentCode}\nvar LG_render_current=GlassRenderFixture;\nwindow.renderBenchmarkMetadata=${JSON.stringify(metadataReport)};\n(${browserRunner.toString()})();</script></body></html>`;
await writeFile(fixture, html);
await writeFile(join(out, 'render-source.json'), JSON.stringify(metadataReport, null, 2) + '\n');
console.log(JSON.stringify({ fixture, fixtureBytes: Buffer.byteLength(html), baseline: metadataReport.baseline, current: metadataReport.current }, null, 2));
