/** Evaluate in FIELDNOTES after native viewport/paint settling; no timers or edits. */
window.__probeIllustrationDemo = () => {
  if (!window.__illustrationDemo) throw new Error('Load the actual illustration demo first');
  const visible = element => {
    const r = element.getBoundingClientRect(), s = getComputedStyle(element);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const controls = [...document.querySelectorAll('button,a,input,select,textarea')].filter(visible).map(element => {
    const r = element.getBoundingClientRect();
    return { id: element.id || element.textContent.trim().slice(0, 80), width: r.width, height: r.height,
      fontSize: parseFloat(getComputedStyle(element).fontSize), disabled: Boolean(element.disabled),
      field: element.matches('input,select,textarea'), clipped: r.left < -1 || r.right > document.documentElement.clientWidth + 1 };
  });
  const figure = document.querySelector('figure');
  const images = [...document.querySelectorAll('figure img')].map(image => ({ id: image.id, decoded: image.complete && image.naturalWidth > 0,
    alt: image.getAttribute('alt'), currentSource: image.currentSrc, nativePicture: image.parentElement.tagName === 'PICTURE' }));
  return { viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    controls, smallTargets: controls.filter(control => !control.disabled && (control.width < 43.9 || control.height < 43.9)),
    smallFields: controls.filter(control => control.field && control.fontSize < 16), clippedControls: controls.filter(control => control.clipped), images,
    semantics: { role: figure?.getAttribute('role'), hidden: figure?.getAttribute('aria-hidden'), label: figure?.getAttribute('aria-label'),
      controlsOutside: !figure?.querySelector('button,a,input,select,textarea') }, state: window.__illustrationDemo.state };
};
