/* Evaluate this async IIFE in the native T3 tab after loading the standalone
 * fixture emitted by material-preferences-benchmark.mjs. No browser emulation,
 * DOM mock, animation engine or automated physical-device claim. */
(async () => {
  const host = document.getElementById('fixture');
  if (!host?.isConnected || !window.GlassPreferences) throw Error('Load the connected standalone fixture first');
  const originalRaf = window.requestAnimationFrame;
  const originalRect = Element.prototype.getBoundingClientRect;
  const originalAdd = MediaQueryList.prototype.addEventListener;
  const originalRemove = MediaQueryList.prototype.removeEventListener;
  let raf = 0, rect = 0, notifications = 0, mediaAdds = 0, mediaRemoves = 0;
  window.requestAnimationFrame = function (...args) { raf++; return originalRaf.apply(this, args); };
  Element.prototype.getBoundingClientRect = function (...args) { rect++; return originalRect.apply(this, args); };
  MediaQueryList.prototype.addEventListener = function (...args) { if (args[0] === 'change') mediaAdds++; return originalAdd.apply(this, args); };
  MediaQueryList.prototype.removeEventListener = function (...args) { if (args[0] === 'change') mediaRemoves++; return originalRemove.apply(this, args); };
  const scopes = Array.from({ length: 32 }, (_, index) => {
    const scope = document.createElement('section');
    scope.textContent = 'Connected ordinary scope ' + index;
    scope.setAttribute('data-lg-pref-theme', 'authored');
    host.append(scope);
    return scope;
  });
  const controllers = new Set();
  try {
    const batchesMs = [];
    for (let batch = 0; batch < 5; batch++) {
      const started = performance.now();
      for (let cycle = 0; cycle < 20; cycle++) {
        for (const scope of scopes) {
          const controller = GlassPreferences.attachGlassMaterialPreferences(scope, { onChange() { notifications++; } });
          controllers.add(controller);
          controller.set({ theme: 'light', motion: 'system', transparency: 'system' });
          controller.set({ theme: 'dark', motion: 'reduce', transparency: 'solid' });
          controller.set({ theme: 'dark', motion: 'reduce', transparency: 'solid' }); // duplicate state stays quiet
          controller.refresh();
          controller.reset();
          controller.destroy();
          controllers.delete(controller);
        }
      }
      batchesMs.push(performance.now() - started);
      await Promise.resolve();
    }
    const attrsRestored = scopes.every(scope => scope.getAttribute('data-lg-pref-theme') === 'authored' && !scope.hasAttribute('data-lg-material-preferences'));
    const sorted = [...batchesMs].sort((a, b) => a - b);
    const idleBefore = raf;
    await new Promise(resolve => setTimeout(resolve, 250));
    const lifecycle = { batchesMs, medianBatchMs: sorted[2], scopes: 32, cyclesPerBatch: 20, batches: 5,
      attachSetRefreshResetDestroySequences: 3200, notifications, customRaf: raf, jsRectReads: rect,
      subsequent250msIdleRaf: raf - idleBefore, mediaChangeListenersAdded: mediaAdds,
      mediaChangeListenersRemoved: mediaRemoves, authoredAttributesRestored: attrsRestored };

    // The supplied port is a real Map-backed host object, not browser storage.
    const map = new Map([['unrelated', 'retained']]);
    const calls = [];
    const port = {
      getItem(key) { calls.push(['get', key]); return map.get(key) ?? null; },
      setItem(key, value) { calls.push(['set', key]); map.set(key, value); },
      removeItem(key) { calls.push(['remove', key]); map.delete(key); },
    };
    const a = GlassPreferences.attachGlassMaterialPreferences(scopes[0], { persistence: { key: 'fixture.preferences', storage: port } });
    const b = GlassPreferences.attachGlassMaterialPreferences(scopes[1], { persistence: { key: 'fixture.preferences', storage: port } });
    controllers.add(a); controllers.add(b);
    a.set({ theme: 'light', motion: 'reduce', transparency: 'solid' });
    const samePortSync = b.state;
    const clearResult = a.clearPersistence();
    const samePortClearSync = b.state;
    a.destroy(); b.destroy(); controllers.delete(a); controllers.delete(b);
    const errors = [];
    const denied = GlassPreferences.attachGlassMaterialPreferences(scopes[2], {
      persistence: { key: 'denied.fixture', storage: {
        getItem() { throw Error('host read denial'); }, setItem() { throw Error('host write denial'); }, removeItem() { throw Error('host remove denial'); },
      } }, onError(_error, phase) { errors.push(phase); },
    });
    controllers.add(denied);
    denied.set({ theme: 'dark', motion: 'reduce' });
    const denialClear = denied.clearPersistence(), denialState = denied.state;
    denied.destroy(); controllers.delete(denied);
    return {
      observedAtUtc: new Date().toISOString(), userAgent: navigator.userAgent, nativeBrowser: 'T3 collaborative preview',
      visibility: document.visibilityState, lifecycle,
      suppliedPort: { samePortSync, clearResult, samePortClearSync, remainingKeys: [...map.keys()], calls,
        boundary: 'Explicit host Map storage object; same-object mounted scope propagation, not physical browser reload or cross-tab persistence' },
      denial: { phases: errors, clearResult: denialClear, state: denialState },
      scope: 'Synchronous connected-scope controller work with real MQL listeners. Excludes demo motion adapter, CSS layout/paint, GPU rendering, storage-network cost and any before/after speedup claim.',
    };
  } finally {
    for (const controller of controllers) controller.destroy();
    window.requestAnimationFrame = originalRaf;
    Element.prototype.getBoundingClientRect = originalRect;
    MediaQueryList.prototype.addEventListener = originalAdd;
    MediaQueryList.prototype.removeEventListener = originalRemove;
    host.replaceChildren();
  }
})()
