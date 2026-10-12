/** Invoke only on the generated connected native fixture. No autonomous loop. */
window.__layoutAuditProbe = async function () {
  const root = document.getElementById('probe-root');
  const fields = Array.from(root.querySelectorAll('input'));
  const targets = fields.map((element, i) => ({ id: 'field-' + i, element, kind: 'field' }));
  const options = { targets, limit: 64, maxReads: 512 };
  const originalRect = Element.prototype.getBoundingClientRect, originalStyle = window.getComputedStyle, originalRAF = window.requestAnimationFrame;
  let rectCalls = 0, styleCalls = 0, rafCalls = 0, mutationCount = 0;
  const observer = new MutationObserver(records => { mutationCount += records.length; }); observer.observe(root, { subtree: true, attributes: true, childList: true, characterData: true });
  Element.prototype.getBoundingClientRect = function () { rectCalls++; return originalRect.call(this); };
  window.getComputedStyle = function (...args) { styleCalls++; return originalStyle.apply(this, args); };
  window.requestAnimationFrame = function (...args) { rafCalls++; return originalRAF.apply(this, args); };
  const field = fields[0]; field.focus({ preventScroll: true }); field.setSelectionRange(2, 8);
  const before = { field, value: field.value, start: field.selectionStart, end: field.selectionEnd, active: document.activeElement };
  const batches = []; let report, thrown = null;
  try {
    // One explicit warm-up is recorded separately; no warmed geometry cache persists across calls.
    const warmStart = performance.now(); report = GlassLayoutAudit.auditGlassLayout(root, options); const warmupMs = performance.now() - warmStart;
    const warmReads = { rectCalls, styleCalls, rafCalls };
    for (let batch = 0; batch < 5; batch++) {
      const samples = [];
      for (let i = 0; i < 20; i++) { const start = performance.now(); report = GlassLayoutAudit.auditGlassLayout(root, options); samples.push(performance.now() - start); }
      batches.push({ batch: batch + 1, samplesMs: samples, meanMs: samples.reduce((sum, n) => sum + n, 0) / samples.length });
    }
    const afterCalls = { rectCalls, styleCalls, rafCalls };
    await Promise.resolve(); mutationCount += observer.takeRecords().length;
    // Finite probe wait only. Instrumentation proves no follow-on geometry/style/RAF requests from this helper.
    await new Promise(resolve => setTimeout(resolve, 250));
    const afterIdle = { rectCalls, styleCalls, rafCalls };
    const values = batches.flatMap(batch => batch.samplesMs).sort((a, b) => a - b);
    const result = { schemaVersion: 1, measuredAt: new Date().toISOString(), ua: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight }, devicePixelRatio, documentHidden: document.hidden, targets: 32, explicitCalls: 101, warmupMs, warmReads, batches, distribution: { minimumMs: values[0], medianMs: values[50], p95Ms: values[94], maximumMs: values[99] }, afterCalls, afterIdle, idleMs: 250, mutationCount, report: { counts: report.counts, reads: report.reads, incomplete: report.incomplete, truncated: report.truncated }, preserved: { node: fields[0] === before.field, value: field.value === before.value, caret: field.selectionStart === before.start && field.selectionEnd === before.end, focus: document.activeElement === before.active }, scope: 'Synchronous explicit helper calls on connected native DOM, including style/layout queries and report allocation. Excludes paint, network, display/GPU/frame rate, interaction latency and speedup comparisons.' };
    window.__layoutAuditProbeResult = result; return result;
  } catch (error) { thrown = String(error); throw error; }
  finally { Element.prototype.getBoundingClientRect = originalRect; window.getComputedStyle = originalStyle; window.requestAnimationFrame = originalRAF; observer.disconnect(); if (thrown) window.__layoutAuditProbeError = thrown; }
};
