/** Recording-only density and finite camera movement; normal geometry matrix excludes this CSS. */
(() => {
  const demo = window.__fitCheckDemo;
  if (!demo) throw new Error('FitCheck demo unavailable');
  let style = document.getElementById('capture-density');
  if (!style) { style = document.createElement('style'); style.id = 'capture-density'; document.head.append(style); }
  style.textContent = ".page{padding-inline:28px}header{min-block-size:54px}.intro{padding-block:17px 18px;gap:35px}.intro h1{font-size:46px;letter-spacing:-1.8px;margin-top:6px}.intro>p{font-size:13px}.toolbar{padding-block:10px;gap:9px 13px}#toolbar-note{margin-block:7px 14px;font-size:10px}.section-heading{padding-block:11px 13px}.section-heading h2{font-size:22px;margin-top:5px}.workspace{gap:24px}.sample-root{padding:14px 16px}.original-art{margin-block:9px 11px}.original-art svg{block-size:75px}.field-label{font-size:14px;margin-bottom:7px}.review-label{margin-top:7px;font-size:12px}.constraint-strip{margin-block:8px 11px;padding-block:7px}.reference-deck article{inline-size:150px;padding:10px 12px}.reference-deck h4{font-size:14px;margin-top:7px}.reference-deck p{font-size:10px;margin-top:6px}.report-summary{padding:14px 16px}.report-summary strong{font-size:49px}.report-summary p{font-size:9px}.report-summary svg{inline-size:55px;block-size:55px}.report-note{font-size:11px;line-height:1.6;margin-block:10px 7px}.report-facts dl>div{padding-block:6px}.report-facts dt{font-size:11px}.report-facts dd{font-size:10px}.measurement-list{max-block-size:284px;overflow-y:auto;scrollbar-width:thin;margin-top:11px;padding-inline:12px}.measurement{padding-block:8px}.measurement h3{font-size:12px}.measurement>div>span{font-size:9px}.measurement>p{font-size:10px;line-height:1.6;margin-top:3px}.identity{padding-top:9px;margin-top:7px}.identity dl>div{padding-block:5px}.identity dt{font-size:10px}.identity dd{font-size:9px}.identity h3{font-size:12px}#audit-status{font-size:10px;margin-top:9px;min-block-size:27px}.local-review{margin-top:12px;padding-block:11px}.edge-fixtures{padding-top:9px;margin-top:9px}.edge-grid{gap:10px;margin-top:9px}.edge-grid p{font-size:9px}.offscreen-note{font-size:9px;margin-top:9px}";
  window.__fitCheckCapture = () => {
    window.scrollTo(0, 0); document.getElementById('measurement-list').scrollTop = 0;
    const timers = [];
    const at = (ms, action) => { timers.push(setTimeout(action, ms)); };
    const trace = [];
    const snapshot = stage => { const s = demo.state(); trace.push({ stage, capturedAt: performance.now(), calls: s.calls, counts: s.report && s.report.counts, reads: s.report && s.report.reads, incomplete: s.report && s.report.incomplete, truncated: s.report && s.report.truncated, identity: s.identity, field: s.field }); };
    const tour = demo.tour(); snapshot('cramped');
    at(2000, () => snapshot('host-css-fixed'));
    at(4100, () => { document.getElementById('measurement-list').scrollTop = 1000; window.scrollTo(0, 170); snapshot('unknown-edge-scope'); });
    at(5700, () => { document.getElementById('measurement-list').scrollTop = 0; window.scrollTo(0, 0); snapshot('bounded-truncation'); });
    at(7200, () => snapshot('solid-declared-shelf'));
    at(8750, () => { window.scrollTo(0, 170); snapshot('quiet-native-editing'); });
    const result = tour.then(complete => { for (const timer of timers) clearTimeout(timer); const s = demo.state(); return { complete, trace, final: s, camera: '960 CSS px square, explicit capture-density CSS and two finite native scroll positions; normal five-size geometry evidence excludes this override' }; });
    window.__fitCheckCapturePromise = result; return true;
  };
  return true;
})();
