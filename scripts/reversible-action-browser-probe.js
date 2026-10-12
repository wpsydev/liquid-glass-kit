/** Explicit native-browser pure-model workloads with truthful synchronous hosts.
 * Host callbacks really mutate local arrays. Native Promise completion is checked
 * after each batch; asynchronous microtask/paint/network costs are excluded. */
(() => {
  const summary = values => {
    const sorted = [...values].sort((a,b) => a-b);
    return {samples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],minMs:sorted[0],maxMs:sorted.at(-1)};
  };
  window.__runReversibleBenchmark = async () => {
    const create = window.ReversibleBenchmark.createGlassReversibleAction;
    const fixture = {id:'ORIGINAL-ONE'};
    const records = {};
    let totalApply = 0, totalUndo = 0, totalCommit = 0;
    for (const mode of ['constructDestroy','applyUndo','applyCommit']) {
      const values = [], count = 100, warmup = 20, calls = 50;
      for (let batch = 0; batch < count+warmup; batch++) {
        const outcomes = [];
        const at = performance.now();
        for (let i = 0; i < calls; i++) {
          const saved = [fixture], history = [];
          const model = create({key:'bench:'+batch+':'+i,timeout:null,
            apply() { const item=saved.pop();history.push(item);totalApply++;return {receipt:{item}}; },
            undo(receipt) { if(history.pop()!==receipt.item)throw Error('Receipt identity lost');saved.push(receipt.item);totalUndo++; },
            commit(receipt) { if(history[0]!==receipt.item)throw Error('Commit identity lost');totalCommit++; },
          });
          if (mode !== 'constructDestroy') {
            outcomes.push(model.start());
            if (model.state.status !== 'available') throw Error('Sync host not acknowledged');
            outcomes.push(mode === 'applyUndo' ? model.undo() : model.commit());
            if(model.state.status !== (mode==='applyUndo'?'undone':'committed'))throw Error('Sync host not settled');
            if((mode==='applyUndo' && saved[0]!==fixture)||(mode==='applyCommit' && history[0]!==fixture))throw Error('Actual host membership failed');
          }
          model.destroy();
        }
        const elapsed = (performance.now()-at)/calls;
        // Do not leave rejected or unsettled host operations outside evidence.
        const completed = await Promise.all(outcomes);
        if(completed.some(outcome => outcome.stale))throw Error('Unexpected stale completed host');
        if(batch>=warmup)values.push(elapsed);
      }
      records[mode] = {...summary(values),callsPerBatch:calls,warmupBatches:warmup};
    }
    return {browser:navigator.userAgent,records,totalHostCalls:{apply:totalApply,undo:totalUndo,commit:totalCommit},persistent:true,
      includes:'Controller validation/allocation, AbortController and frozen snapshots, local fixture arrays and authored synchronous callbacks, phase Promise creation, observable snapshots, destroy/abort cleanup; callbacks actually mutate host membership',
      excludes:'Async Promise/microtask completion (verified after timing), demo 220/180ms waits, DOM rendering/focus, style/layout/paint, network, demo card/art authoring',
      caveat:'Batch averages and shared-machine timer quantization, not an app interaction, async backend duration or before/after speed-up; pure model has no DOM or connected-controller lifecycle'};
  };
})();
