/* Evaluate only in the connected /tmp/lg-snap-deck-probe.html native T3 tab.
 * Timed lifecycle/cached requests exclude paint. The finite smooth check below
 * observes native scrollend separately, with recording active, not via RAF polling.
 */
(async () => {
  const host = document.querySelector('#fixture');
  if (!host || !window.GlassSnapDeck) throw Error('Load the generated snap-deck probe first');
  const originalRaf = window.requestAnimationFrame, originalRect = Element.prototype.getBoundingClientRect;
  let raf = 0, rect = 0, notifications = 0, controller;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  window.requestAnimationFrame = function(...args) { raf++; return originalRaf.apply(this, args); };
  Element.prototype.getBoundingClientRect = function(...args) { rect++; return originalRect.apply(this, args); };
  const items = Array.from({ length: 32 }, (_, index) => {
    const item = document.createElement('article'), heading = document.createElement('h2'), button = document.createElement('button');
    heading.textContent = 'Authored card ' + index; button.type = 'button'; button.textContent = 'Keep ' + index;
    item.append(heading, button); host.append(item); return item;
  });
  const options = reducedMotion => ({ items, reducedMotion, onChange() { notifications++; } });
  const snapshot = () => ({ index: controller.index, canPrevious: controller.canPrevious, canNext: controller.canNext, scrollLeft: host.scrollLeft, scrollWidth: host.scrollWidth, clientWidth: host.clientWidth });
  try {
    const lifecycleBatchesMs = [], lifecycleReads = rect;
    for (let batch = 0; batch < 5; batch++) {
      const start = performance.now();
      for (let cycle = 0; cycle < 20; cycle++) {
        controller = GlassSnapDeck.attachGlassSnapDeck(host, options(true));
        controller.refresh(); controller.destroy();
      }
      lifecycleBatchesMs.push(performance.now() - start);
    }
    const lifecycleRectReads = rect - lifecycleReads;
    controller = GlassSnapDeck.attachGlassSnapDeck(host, options(true));
    await delay(100);
    const cachedReads = rect, cachedRequestsBatchesMs = [];
    const focus = items[0].querySelector('button'); focus.focus({ preventScroll: true });
    for (let batch = 0; batch < 5; batch++) {
      const start = performance.now();
      for (let cycle = 0; cycle < 20; cycle++) {
        controller.goTo(0); controller.goTo(16); controller.goTo(31); controller.goTo(0);
      }
      cachedRequestsBatchesMs.push(performance.now() - start);
    }
    const cachedGoToRectReads = rect - cachedReads;
    const preservedFocus = document.activeElement === focus;
    const ltr = { initial: snapshot() };
    controller.goTo(16); ltr.middle = snapshot();
    controller.goTo(31); ltr.end = snapshot();
    host.dir = 'rtl'; controller.refresh(); controller.goTo(0);
    const rtl = { initial: snapshot(), scrollPaddingRight: getComputedStyle(host).scrollPaddingRight, marginRight: getComputedStyle(items[16]).scrollMarginRight };
    controller.goTo(16); rtl.middle = snapshot();
    controller.goTo(31); rtl.end = snapshot();
    host.dir = 'ltr'; controller.refresh(); controller.goTo(0);
    controller.update(options(false));
    const before = snapshot(), actualNativeEvents = [];
    const nativeScrolled = () => actualNativeEvents.push({ event: 'scroll', at: performance.now(), scrollLeft: host.scrollLeft });
    const nativeEnded = () => actualNativeEvents.push({ event: 'scrollend', at: performance.now(), scrollLeft: host.scrollLeft });
    host.addEventListener('scroll', nativeScrolled); host.addEventListener('scrollend', nativeEnded);
    const requestedAt = performance.now(), requestAccepted = controller.goTo(1), immediate = snapshot();
    await delay(1000);
    const after = snapshot(), elapsed = performance.now() - requestedAt;
    host.removeEventListener('scroll', nativeScrolled); host.removeEventListener('scrollend', nativeEnded);
    const nativeSmooth = { requestAccepted, before, immediate, after, observedWallMs: elapsed, events: actualNativeEvents, scope: 'Finite native smooth request and event observation; wall wait is not animation duration, frame rate, GPU time or a paint benchmark.' };
    controller.destroy(); controller.destroy();
    const restored = {
      rootMarker: host.getAttribute('data-lg-snap-deck'),
      motionMarker: host.getAttribute('data-lg-snap-reduced'),
      itemMarkers: items.filter(item => item.hasAttribute('data-lg-snap-item') || item.hasAttribute('data-lg-snap-active')).length,
      children: host.children.length, focusedSame: document.activeElement === focus,
    };
    const idleRaf = raf, idleReads = rect;
    await delay(250);
    const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const result = {
      observedAtUtc: new Date().toISOString(), userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight },
      items: 32, lifecycleCyclesPerBatch: 20, lifecycleBatchesMs, lifecycleMedianBatchMs: median(lifecycleBatchesMs), lifecycleRectReads,
      cachedRequestCyclesPerBatch: 20, requestsPerCycle: 4, cachedRequestsBatchesMs, cachedMedianBatchMs: median(cachedRequestsBatchesMs),
      cachedGoToRectReads, preservedFocus, customRaf: raf, subsequent250msIdleRaf: raf - idleRaf, subsequent250msIdleRectReads: rect - idleReads,
      ltr, rtl, nativeSmooth, restored, notifications,
      checks: {
        cachedRequestsDoNotRemeasure: cachedGoToRectReads === 0,
        noCustomAnimationFrames: raf === 0,
        ltrMiddle: ltr.middle.index === 16 && ltr.middle.scrollLeft > 0,
        rtlMiddle: rtl.middle.index === 16 && rtl.middle.scrollLeft < 0,
        logicalPadding: rtl.scrollPaddingRight === '14px' && rtl.marginRight === '5px',
        smoothRequestNotOptimistic: immediate.index === before.index,
        smoothActuallySettled: after.index === 1 && actualNativeEvents.some(event => event.event === 'scrollend' && event.scrollLeft > 0),
        focusPreserved: preservedFocus && restored.focusedSame,
        cleanMarkers: restored.rootMarker === null && restored.motionMarker === null && restored.itemMarkers === 0,
      },
      scope: 'Connected native Chromium 32-card attach/refresh/destroy and cached instant goTo calls. Lifecycle includes synchronous geometry/style work; cached calls may incur browser synchronization but perform no JS bounding-rect remeasurement. Timed batches exclude native smooth/paint. Separate native event evidence is not comparative performance or physical-device verification.',
    };
    document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
    return result;
  } finally {
    controller?.destroy(); window.requestAnimationFrame = originalRaf; Element.prototype.getBoundingClientRect = originalRect;
    host.replaceChildren();
  }
})()
