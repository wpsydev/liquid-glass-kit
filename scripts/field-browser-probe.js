/** Run in the actual T3 page after injecting the standalone FieldBenchmark IIFE.
 * Fixtures/options are prepared before timing. No geometry read occurs in timed loops.
 */
(() => {
  function statistics(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return { samples: sorted.length, medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * .95)], minMs: sorted[0], maxMs: sorted.at(-1) };
  }
  window.__runFieldBenchmark = () => {
    const getProps = window.FieldBenchmark.getGlassFieldProps;
    const stage = document.createElement('div'); stage.setAttribute('aria-hidden', 'true'); stage.style.cssText = 'position:fixed;left:-99999px;top:0;width:320px;pointer-events:none';
    const fixtures = Array.from({ length: 20 }, (_, index) => {
      const field = document.createElement('div'), group = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input'), description = document.createElement('p'), error = document.createElement('p');
      input.type = 'url'; input.name = 'source'; input.value = 'https://example.test/meaning'; input.required = true;
      group.append(input); field.append(label, group, description); stage.append(field);
      const base = { id: 'benchmark-source-' + index, label: 'Source URL', description: 'Keep the original source beside this note.', describedBy: 'benchmark-external', errorAnnouncement: 'off' };
      return { field, group, label, input, description, error, base, invalid: { ...base, error: 'Use a complete HTTPS source.', busy: true } };
    });
    const external = document.createElement('p'); external.id = 'benchmark-external'; external.textContent = 'Host hint.'; stage.append(external); document.body.append(stage);
    function apply(fixture, props) {
      const { field, group, label, input, description, error } = fixture;
      field.className = props.field.className; group.className = props.group.className; input.className = props.control.className; input.id = props.control.id;
      label.className = props.label.props.className; label.htmlFor = props.label.props.htmlFor; label.textContent = props.label.text;
      for (const [element, values, names] of [[input, props.control, ['aria-describedby', 'aria-invalid', 'aria-busy']], [field, props.field, ['data-lg-field-invalid', 'data-lg-field-busy']], [group, props.group, ['data-lg-field-invalid', 'data-lg-field-busy']]]) for (const name of names) if (values[name] === undefined) element.removeAttribute(name); else element.setAttribute(name, String(values[name]));
      description.id = props.description.props.id; description.className = props.description.props.className; description.textContent = props.description.text;
      if (props.error) { error.id = props.error.props.id; error.className = props.error.props.className; error.textContent = props.error.text; if (!error.parentNode) field.append(error); } else error.remove();
    }
    const baseProps = fixtures.map(fixture => getProps(fixture.base)), invalidProps = fixtures.map(fixture => getProps(fixture.invalid));
    fixtures.forEach((fixture, index) => apply(fixture, baseProps[index]));
    const construction = [], mutation = [], combined = [];
    try {
      for (let sample = 0; sample < 450; sample++) {
        const start = performance.now();
        for (let index = 0; index < 100; index++) getProps(fixtures[index % fixtures.length].invalid);
        const elapsed = (performance.now() - start) / 100;
        if (sample >= 50) construction.push(elapsed);
      }
      for (let sample = 0; sample < 450; sample++) {
        const start = performance.now();
        for (let index = 0; index < fixtures.length; index++) { apply(fixtures[index], invalidProps[index]); apply(fixtures[index], baseProps[index]); }
        const elapsed = (performance.now() - start) / fixtures.length;
        if (sample >= 50) mutation.push(elapsed);
      }
      for (let sample = 0; sample < 450; sample++) {
        const start = performance.now();
        for (const fixture of fixtures) { apply(fixture, getProps(fixture.invalid)); apply(fixture, getProps(fixture.base)); }
        const elapsed = (performance.now() - start) / fixtures.length;
        if (sample >= 50) combined.push(elapsed);
      }
      const identityAndSemantics = fixtures.every(({ input, label, description, error }) => input.isConnected && label.control === input && input.value === 'https://example.test/meaning' && input.required && input.getAttribute('aria-describedby').includes(description.id) && !input.hasAttribute('aria-invalid') && !input.hasAttribute('aria-busy') && !error.parentNode);
      if (!identityAndSemantics) throw new Error('Connected field postconditions failed');
      return { browser: navigator.userAgent, fixtures: fixtures.length, warmupBatches: 50, recordedBatches: 400, operationsPerConstructionBatch: 100, operationsPerApplyClearBatch: 20,
        constructionPerCall: statistics(construction), connectedHostApplyAndClearPerCycle: statistics(mutation), combinedPropsAndConnectedHostApplyAndClearPerCycle: statistics(combined), identityAndSemantics,
        includes: { construction: 'Pure validation, allocation and freezing only', connected: 'Precomputed props applied then cleared on existing connected native nodes', combined: 'Two prop calls plus host adapter apply/clear on existing connected native nodes' },
        excludes: 'Fixture/options preparation, native constraint validation, async600ms fixture, forced layout, paint, compositor, network and comparative optimization claim', timerCaveat: 'Batch-average durations from performance.now; quantization and shared-machine noise limit interpretation; not per-event latency or FPS', controllerExists: false };
    } finally { stage.remove(); }
  };
})();
