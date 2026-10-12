/** No autonomous workload. Invoke on the generated connected fixture. */
window.__numberProbe = async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const originalRAF = window.requestAnimationFrame, originalRect = Element.prototype.getBoundingClientRect;
  let rafRequests = 0, rectReads = 0;
  window.requestAnimationFrame = function (...args) { rafRequests++; return originalRAF.apply(this, args); };
  Element.prototype.getBoundingClientRect = function () { rectReads++; return originalRect.call(this); };
  const controllers = [], fields = [], results = [];
  const field = document.getElementById('control'); field.focus(); field.setSelectionRange(2, 6); const originalValue = field.value;
  try {
    for (let i = 0; i < 8; i++) {
      const visual = document.getElementById('v' + i), semantic = document.getElementById('s' + i), status = document.getElementById('a' + i);
      fields.push({ visual, semantic, status }); controllers.push(GlassNumber.attachGlassNumber(visual, { value: 0, locale: 'en-US', precision: 2, duration: 0, semantic, status }));
    }
    const batches = []; const synchronousRAFBefore = rafRequests;
    for (let batch = 0; batch < 5; batch++) {
      const samples = [];
      for (let i = 0; i < 100; i++) { const start = performance.now(); for (let j = 0; j < 8; j++) controllers[j].set(batch * 100 + i + j / 8); samples.push(performance.now() - start); }
      batches.push({ batch: batch + 1, samplesMs: samples, meanMs: samples.reduce((a, b) => a + b, 0) / samples.length });
    }
    await Promise.resolve(); const synchronous = { controllers: 8, sets: 4000, batches, rafRequests: rafRequests - synchronousRAFBefore, rectReads };
    const values = batches.flatMap(b => b.samplesMs).sort((a, b) => a - b); synchronous.distributionPerEightSetsMs = { minimum: values[0], median: values[250], p95: values[474], maximum: values[499] };
    const controller = controllers[0], item = fields[0]; controller.update({ duration: 400, announce: true, announcementPrefix: 'Actual decision value: ' });
    const start = performance.now(), promise = controller.set(1534.5); const immediate = { semantic: item.semantic.textContent, pair: [...item.visual.firstElementChild.children].map(e => e.textContent), snapshot: controller.snapshot(), status: item.status.textContent };
    await wait(110); const replacementIntermediate = { pair: [...item.visual.firstElementChild.children].map(e => e.textContent), snapshot: controller.snapshot() }; const replacementResult = await promise; const replacementElapsedMs = performance.now() - start;
    results.push({ name: 'default-decision-value-replaces-only-real-strings', immediate, intermediate: replacementIntermediate, result: replacementResult, elapsedMs: replacementElapsedMs, settled: { semantic: item.semantic.textContent, status: item.status.textContent, snapshot: controller.snapshot() } });
    controller.update({ mode: 'interpolate', duration: 400, announcementPrefix: 'Local nonfinancial parameter: ' });
    const blend = controller.set(-12.125), blendImmediate = { semantic: item.semantic.textContent, snapshot: controller.snapshot() }; await wait(100); const blendIntermediate = { semantic: item.semantic.textContent, snapshot: controller.snapshot() }; const blendResult = await blend;
    results.push({ name: 'explicit-nonfinancial-blend', immediate: blendImmediate, intermediate: blendIntermediate, result: blendResult, settled: controller.snapshot() });
    controller.update({ mode: 'replace', duration: 200 }); let statusWrites = 0; const observer = new MutationObserver(records => { statusWrites += records.length; }); observer.observe(item.status, { subtree: true, childList: true, characterData: true });
    const old = controller.set(40), latest = controller.set(45); const overlap = await Promise.all([old, latest]); await Promise.resolve(); observer.disconnect(); results.push({ name: 'overlap-latest-only-announcement', results: overlap, statusWrites, text: item.status.textContent, snapshot: controller.snapshot() });
    const beforeIdle = { rafRequests, rectReads }; await wait(250); const afterIdle = { rafRequests, rectReads };
    const result = { schemaVersion: 1, measuredAt: new Date().toISOString(), ua: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight }, devicePixelRatio, documentHidden: document.hidden, synchronous, finiteAnimations: results, beforeIdle, afterIdle, finiteIdleWaitMs: 250, nativeHostControl: { sameValue: field.value === originalValue, sameFocus: document.activeElement === field, selection: [field.selectionStart, field.selectionEnd] }, scope: 'Synchronous quiet set invocation/formatting/native text/style writes and Promise allocation over eight connected controllers. Async animation elapsed wall time and semantic/status callbacks reported separately. No paint, GPU, frame rate, exact finance arithmetic or speedup claim; timer resolution and instrumentation apply.' };
    window.__numberProbeResult = result; return result;
  } finally {
    for (const c of controllers) c.destroy();
    if (window.__numberProbeResult) window.__numberProbeResult.cleanup = { allDestroyed: controllers.every(c => c.snapshot().destroyed), authorVisualRestored: fields.every(f => f.visual.textContent === '0' && f.visual.getAttribute('aria-hidden') === null), authorSemanticRestored: fields.every(f => f.semantic.textContent === '0'), authorStatusRestored: fields.every(f => f.status.textContent === '') };
    window.requestAnimationFrame = originalRAF; Element.prototype.getBoundingClientRect = originalRect;
  }
};
