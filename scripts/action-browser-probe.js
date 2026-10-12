/** Browser-only native evidence helpers; explicitly invoked, no startup timer/observer. */
(() => {
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const read = () => {
    const s = window.__actionDemo.state;
    return { client:s.form.status, reviewer:s.reviewer.status, retryable:s.form.retryable, error:s.form.error?.constructor?.name ?? null, errorMessage:s.form.error?.message ?? null, callbacks:s.runCalls, queue:s.queue.length, intents:s.intents.length, lateCommits:s.lateCommits, hostPending:s.pendingHostDecisions, submission:s.lastSubmission, afterCancel:s.queue.filter(item=>item.afterCancel).map(item=>item.id), focus:s.focus };
  };
  async function behavior() {
    const demo = window.__actionDemo, form = document.querySelector('#brief-form'), title = document.querySelector('#brief-title'), source = document.querySelector('#brief-source'), summary = document.querySelector('#brief-summary'), primary = document.querySelector('#queue-submit');
    const fields = [...form.querySelectorAll('input,select,textarea')], buttons = [...form.querySelectorAll('button')], icon = primary.querySelector('svg');
    const results = {}; demo.reset(); title.value = ''; primary.click(); results.nativeInvalid = { ...read(), formValid:form.checkValidity(), valueMissing:title.validity.valueMissing };
    demo.reset(); source.value = 'invalid source'; primary.click(); results.nativeURL = { ...read(), formValid:form.checkValidity(), typeMismatch:source.validity.typeMismatch };
    demo.reset(); title.value = 'A real connected browser brief'; primary.focus(); const completion = demo.submit(); const duplicate = demo.submit();
    results.pending = { ...read(), busy:form.getAttribute('aria-busy'), buttonNativeDisabled:primary.disabled, buttonAriaDisabled:primary.getAttribute('aria-disabled'), fieldEnabled:!title.disabled };
    title.value = 'A dirty next draft, still mine'; await completion; await duplicate;
    results.confirmed = { ...read(), fieldValue:title.value, serializedTitle:window.__actionDemo.state.lastSubmission.controls.find(([name])=>name==='title')?.[1], busy:form.getAttribute('aria-busy') };
    demo.reset(); await demo.preset('rejected'); results.rejected = read(); title.value = 'Live fields for the explicit retry'; summary.value = 'This changed draft is checked again when the user deliberately retries the local host decision.'; await demo.retry(); results.retry = read();
    demo.reset(); await demo.preset('submitted'); results.submitted = read(); await demo.submit('record'); results.submittedBlocked = read(); demo.resetAction(); results.resetKeepsIntent = { ...read(), title:title.value };
    demo.reset(); document.querySelector('#brief-lane').value = 'prototype'; source.value = ''; await demo.submit(); results.localRule = { ...read(), formValid:form.checkValidity() };
    demo.reset(); const cooperative = demo.submit(); await sleep(30); results.cooperativeCancel = { cancelled:demo.cancel(), ...read() }; await cooperative; await sleep(700); results.cooperativeSettled = read();
    demo.reset(); await demo.preset('cancelled'); results.noncooperativeCancel = read(); await sleep(850); results.noncooperativeLate = read();
    demo.reset(); demo.load('cancelled'); const stale = demo.submit(); await sleep(30); demo.resetAction(); await stale; await sleep(850); results.staleHost = read();
    demo.reset(); await demo.review(); results.reviewCommitted = { ...read(), firstQueueStatus:demo.state.queue[0].status };
    results.identity = { fields:fields.every(node=>node.isConnected&&node===document.getElementById(node.id)), buttons:buttons.every(node=>node.isConnected&&node===document.getElementById(node.id)), icon:icon===primary.querySelector('svg') };
    demo.reset(); return { observedAtUtc:new Date().toISOString(), userAgent:navigator.userAgent, scope:'Actual T3 native browser APIs and connected demo controllers. Programmatic native click/invoke plus separately recorded T3 pointer/keyboard checks; not unit DOM or physical-phone/AT/Safari evidence.', cases:results };
  }
  function layout(name) {
    const bounds = element => { const r=element.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
    const controls = [...document.querySelectorAll('button,a')].filter(element=>element.getClientRects().length).map(element=>({id:element.id||element.textContent.trim(),...bounds(element)}));
    const checkboxes = [...document.querySelectorAll('input[type=checkbox]')].map(element=>({id:element.id,...bounds(element.closest('label'))}));
    const fields = [...document.querySelectorAll('input:not([type=checkbox]),textarea,select')].map(element=>({id:element.id,fontSize:getComputedStyle(element).fontSize,...bounds(element)}));
    return { name, requestedState:read().client, viewport:{width:innerWidth,height:innerHeight,clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight}, document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}, horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth, smallActions:[...controls,...checkboxes].filter(element=>element.height<43.75||element.width<43.75), smallFields:fields.filter(element=>parseFloat(element.fontSize)<16||element.height<43.75), controls,checkboxes,fields };
  }
  function lifecycle(samples=300) {
    if (!window.GlassActions || !Number.isInteger(samples)||samples<100||samples>1000) throw Error('Use the standalone native lifecycle fixture and 100–1000 samples');
    const module = window.GlassActions, button = document.querySelector('#button-fixture'), form = document.querySelector('#form-fixture'), input=form.querySelector('input');
    const fixtureIdentity = input, originalValue=input.value;
    const callback = () => ({status:'success'}), batchSize = 20;
    const buttonOptions={run:callback,labelElement:document.querySelector('#button-label'),statusElement:document.querySelector('#button-status')};
    const formOptions={run:callback,labelElement:document.querySelector('#form-label'),statusElement:document.querySelector('#form-status')};
    const summary = values => { const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],minMs:sorted[0],maxMs:sorted.at(-1)}; };
    const measure = mount => { for(let index=0;index<50;index++)mount().destroy();const values=[];for(let index=0;index<samples;index++){const start=performance.now();for(let cycle=0;cycle<batchSize;cycle++)mount().destroy();values.push((performance.now()-start)/batchSize)}return summary(values); };
    const buttonTiming=measure(()=>module.attachGlassAction(button,buttonOptions));
    const formTiming=measure(()=>module.attachGlassFormAction(form,formOptions));
    return {observedAtUtc:new Date().toISOString(),userAgent:navigator.userAgent,batchSize,measuredCyclesPerVariant:samples*batchSize,precisionNote:'Values are per-cycle averages of20 connected mount/destroy cycles; batch percentiles do not characterize individual callback latency.',button:buttonTiming,form:formTiming,fieldIdentity:fixtureIdentity===form.querySelector('input'),fieldValuePreserved:input.value===originalValue,scope:'Connected native helper attach+destroy with authored text/status ownership, 50 warmup cycles per variant and20 cycles per timed batch. Fixture/options creation, action invocation/async fixture, network, style/paint and comparative speedup excluded.'};
  }
  window.__actionBrowserProbe = { behavior, layout, lifecycle };
})();
