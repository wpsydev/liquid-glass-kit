import { getGlassImageProps, getGlassPictureProps } from '../../src/responsive-image.js';
import type { GlassImageOptions, GlassImageProps } from '../../src/responsive-image.js';
import { getGlassProps } from '../../src/material.js';
import { artwork } from './artwork.js';
import './style.css';

type Direction = 'hero' | 'art' | 'editorial';
type Crop = 'native' | 'wide' | 'portrait';
type Priority = NonNullable<GlassImageOptions['priority']>;
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element;
};
const files = [...artwork.hero, ...artwork.portrait, ...artwork.paper, ...artwork.orbit];
const layoutSizes = '(min-width: 1440px) 1008px, (min-width: 900px) calc(100vw - 432px), calc(100vw - 40px)';
const editorialSizes = '(min-width: 1440px) 444px, (min-width: 900px) calc((100vw - 106px) / 3), (min-width: 601px) calc((100vw - 70px) / 3), calc(100vw - 40px)';
const portraitSizes = '(min-width: 460px) 420px, calc(100vw - 40px)';
const gallery = query('#editorial-gallery'), frame = query('#hero-frame');
let direction: Direction = 'hero', crop: Crop = 'native', priority: Priority = 'critical', focal = 65, forcePortrait = false;
let hero: HTMLImageElement, selectedEditorial = 'paper', revision = 0;
let decodeRevision = 0, tourRevision = 0, tourStep: Direction | null = null, tourTimers: number[] = [], tourFinish: ((complete: boolean) => void) | undefined;
let shiftStart = performance.now(), shiftTotal = 0, shiftSupported = false;
const shifts: { value: number; startTime: number; hadRecentInput: boolean }[] = [];
const editors = new Map<string, { image: HTMLImageElement; card: HTMLElement }>();
const active = () => direction === 'editorial' ? editors.get(selectedEditorial)!.image : hero;
const kb = (bytes: number) => (bytes / 1024).toFixed(1) + ' KiB';
const filename = (src: string) => { try { return new URL(src).pathname.split('/').at(-1)!; } catch { return 'not selected'; } };
const record = (image: HTMLImageElement) => {
  const src = image.currentSrc, supplied = files.find(file => file.src === src);
  const entries = src ? performance.getEntriesByName(src, 'resource') as PerformanceResourceTiming[] : [];
  const resource = entries.at(-1);
  const bounds = image.getBoundingClientRect();
  return {
    currentSrc: src, filename: src ? filename(src) : 'not selected', supplied: supplied ? { width: supplied.width, height: supplied.height, bytes: supplied.bytes } : null,
    natural: { width: image.naturalWidth, height: image.naturalHeight }, rendered: { width: Math.round(bounds.width), height: Math.round(bounds.height) },
    status: !image.complete ? 'loading' : image.naturalWidth > 0 ? 'loaded' : 'not loaded / error',
    hints: { loading: image.getAttribute('loading'), fetchPriority: image.getAttribute('fetchpriority'), decoding: image.getAttribute('decoding') },
    resource: resource ? { transferSize: resource.transferSize, encodedBodySize: resource.encodedBodySize, decodedBodySize: resource.decodedBodySize, duration: resource.duration } : null,
  };
};
const refresh = () => {
  if (!hero) return;
  const image = active(), value = record(image);
  query('#selected-source').textContent = value.filename;
  query('#selected-source').title = value.currentSrc || 'Browser has not selected a resource';
  query('#source-dimensions').textContent = value.supplied ? value.supplied.width + ' × ' + value.supplied.height : 'manifest match unavailable';
  query('#file-bytes').textContent = value.supplied ? kb(value.supplied.bytes) : 'not supplied';
  query('#natural-size').textContent = value.natural.width + ' × ' + value.natural.height;
  query('#rendered-size').textContent = value.rendered.width + ' × ' + value.rendered.height + ' CSS px';
  query('#viewport').textContent = innerWidth + ' px / ' + devicePixelRatio.toFixed(2);
  query('#hints').textContent = value.hints.loading + ' / ' + value.hints.fetchPriority + ' / ' + value.hints.decoding;
  query('#transfer').textContent = value.resource ? kb(value.resource.transferSize) + ' reported' : 'not exposed';
  query('#duration').textContent = value.resource ? value.resource.duration.toFixed(1) + ' ms' : 'not exposed';
  query('#load-state').textContent = value.status;
  query('#load-dot').dataset.state = value.status === 'loaded' ? 'loaded' : value.status.includes('error') ? 'error' : 'pending';
  query('#shift-total').textContent = shiftSupported ? shiftTotal.toFixed(4) + ' observed' : 'not supported';
  const properties = ['width', 'height', 'alt', 'loading', 'fetchpriority', 'decoding', 'sizes', 'srcset', 'src'];
  const lines = ['<img', ...properties.filter(key => image.hasAttribute(key)).map(key => '  ' + key + '="' + image.getAttribute(key) + '"'), '>'];
  if (image.parentElement?.tagName === 'PICTURE') {
    const sources = Array.from(image.parentElement.querySelectorAll('source')).map(source => '<source ' + Array.from(source.attributes).map(attribute => attribute.name + '="' + attribute.value + '"').join(' ') + '>');
    lines.unshift(...sources);
  }
  query('#attributes').textContent = lines.join('\n');
  for (const [id, editor] of editors) editor.card.dataset.selected = String(direction === 'editorial' && id === selectedEditorial);
};
const applyImage = (image: HTMLImageElement, props: GlassImageProps) => {
  // Native selection hints and sizes precede source URLs. Never interpolate props
  // into HTML; picture sources are authored before the image is given a URL.
  const attributes: Record<string, string> = {
    class: props.className, alt: props.alt, width: String(props.width), height: String(props.height),
    loading: props.loading, fetchpriority: props.fetchPriority, decoding: props.decoding,
  };
  if (props['data-lg-image-crop']) attributes['data-lg-image-crop'] = props['data-lg-image-crop'];
  else image.removeAttribute('data-lg-image-crop');
  for (const [key, value] of Object.entries(attributes)) if (image.getAttribute(key) !== value) image.setAttribute(key, value);
  for (const key of ['--lg-image-fit', '--lg-image-position', '--lg-image-ratio']) image.style.removeProperty(key);
  for (const [key, value] of Object.entries(props.style)) image.style.setProperty(key, value);
  if (props.sizes) image.setAttribute('sizes', props.sizes); else image.removeAttribute('sizes');
  if (props.srcSet) image.setAttribute('srcset', props.srcSet); else image.removeAttribute('srcset');
  if (image.getAttribute('src') !== props.src) image.setAttribute('src', props.src);
};
const listenImage = (image: HTMLImageElement) => {
  image.addEventListener('load', refresh); image.addEventListener('error', refresh);
};
const heroOptions = (): GlassImageOptions => ({
  src: artwork.hero[2].src, width: 1440, height: 960,
  alt: 'Original terracotta arch, ivory cylindrical plinth and blue sphere against a pale studio backdrop.',
  candidates: artwork.hero, sizes: layoutSizes, priority, fit: 'cover', focalPoint: { x: focal, y: 52 },
  ...(crop === 'native' ? {} : { aspectRatio: crop === 'wide' ? { width: 2, height: 1 } : { width: 4, height: 5 } }),
});
const buildHero = () => {
  revision++;
  if (hero) resize?.unobserve(hero);
  const picture = document.createElement('picture'); picture.id = 'hero-picture';
  let props: GlassImageProps;
  if (direction === 'art') {
    const result = getGlassPictureProps({ image: heroOptions(), sources: [{
      candidates: artwork.portrait, width: 960, height: 1200, sizes: forcePortrait ? portraitSizes : 'calc(100vw - 40px)',
      media: forcePortrait ? 'all' : '(max-width: 600px)', type: 'image/webp',
    }] });
    props = result.image;
    for (const sourceProps of result.sources) {
      const source = document.createElement('source');
      for (const [key, value] of Object.entries(sourceProps)) source.setAttribute(key === 'srcSet' ? 'srcset' : key, String(value));
      picture.append(source);
    }
  } else props = getGlassImageProps(heroOptions());
  hero = document.createElement('img'); hero.dataset.study = direction; listenImage(hero);
  picture.append(hero); applyImage(hero, props); query('#hero-picture').replaceWith(picture);
  frame.dataset.portrait = String(direction === 'art' && forcePortrait);
  resize?.observe(hero); refresh();
};
const editorial = [
  { id: 'paper', title: 'Paper, with a little weight.', category: 'COLOUR / COMPOSITION', candidates: artwork.paper, alt: 'Original orange paper sheet above an ivory layered stack, with a blue and orange ring on a cobalt backdrop.' },
  { id: 'orbit', title: 'One thing, off-centre.', category: 'BALANCE / LIGHT', candidates: artwork.orbit, alt: 'Original folded ivory ribbon and a golden sphere on a charcoal studio backdrop.' },
  { id: 'form', title: 'Room around the subject.', category: 'SPACE / FORM', candidates: artwork.hero, alt: 'Original terracotta arch beside an ivory plinth and a blue sphere, with generous space around the forms.' },
] as const;
for (const item of editorial) {
  const card = node('article', '', 'editorial-card'); card.dataset.editorial = item.id;
  const figure = node('figure', '', 'lg-image-frame'), image = document.createElement('img'); image.dataset.study = item.id; listenImage(image); figure.append(image);
  const fallback = item.candidates.at(-1)!;
  applyImage(image, getGlassImageProps({ src: fallback.src, width: fallback.width, height: fallback.height, candidates: item.candidates, sizes: editorialSizes, alt: item.alt, priority: 'below-fold', fit: 'cover' }));
  const inspect = node('button', 'Inspect this frame ↗'); inspect.type = 'button'; inspect.addEventListener('click', () => {
    cancelTour(); selectedEditorial = item.id; select('editorial', false); refresh();
  });
  card.append(figure, node('h3', item.title), node('p', item.category), inspect); editors.set(item.id, { image, card }); gallery.append(card);
}
// Install layout-shift observation before the leading image is authored. It is
// evidence about this session, not the windowed CLS metric or field performance.
let shiftsObserver: PerformanceObserver | undefined;
try {
  if (PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
    shiftsObserver = new PerformanceObserver(list => {
      for (const item of list.getEntries()) {
        const shift = item as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (shift.startTime < shiftStart) continue;
        shifts.push({ value: shift.value, startTime: shift.startTime, hadRecentInput: shift.hadRecentInput });
        if (!shift.hadRecentInput) shiftTotal += shift.value;
        if (shifts.length > 100) shifts.shift();
      }
      refresh();
    });
    shiftsObserver.observe({ type: 'layout-shift', buffered: true }); shiftSupported = true;
  }
} catch { /* unsupported browser leaves an honest unavailable measurement */ }
let resize: ResizeObserver | undefined;
try { resize = new ResizeObserver(refresh); resize.observe(query('#stage')); } catch { /* load/resize/explicit refresh remain */ }
const cancelTour = () => {
  tourRevision++; for (const timer of tourTimers) clearTimeout(timer); tourTimers = [];
  tourStep = null; tourFinish?.(false); tourFinish = undefined; query('#tour').textContent = 'Take a short tour ↗';
};
const select = (next: Direction, defaults = true) => {
  if (!['hero', 'art', 'editorial'].includes(next)) throw new TypeError('Unknown original image study');
  decodeRevision++; query<HTMLButtonElement>('#decode').disabled = false;
  query('#decode-result').textContent = 'A deliberate measurement of the current image, including warm-cache results.';
  direction = next; document.body.dataset.direction = direction;
  if (defaults) {
    priority = direction === 'hero' ? 'critical' : direction === 'art' ? 'normal' : 'below-fold';
    crop = 'native'; focal = 65; forcePortrait = false;
  }
  query<HTMLSelectElement>('#crop').value = crop; query<HTMLSelectElement>('#priority').value = priority; query<HTMLInputElement>('#focal').value = String(focal); query('#focal-value').textContent = focal + '%';
  query<HTMLInputElement>('#force-portrait').checked = forcePortrait; query<HTMLInputElement>('#force-portrait').disabled = direction !== 'art';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) button.setAttribute('aria-pressed', String(button.dataset.direction === direction));
  frame.hidden = direction === 'editorial'; query('#stage-gallery').hidden = direction !== 'editorial';
  if (direction === 'editorial') {
    query('#stage-gallery').append(gallery);
    // Moving the existing gallery for inspection may reuse previously loaded
    // resources. The initial default page is the below-fold loading fixture.
    for (const [index, item] of editorial.entries()) {
      const image = editors.get(item.id)!.image;
      image.setAttribute('sizes', index === 0 ? layoutSizes : '(min-width: 1440px) 495px, (min-width: 900px) calc((100vw - 450px) / 2), (min-width: 601px) calc((100vw - 58px) / 2), calc(100vw - 40px)');
    }
  } else {
    query('#editorial-slot').append(gallery);
    for (const editor of editors.values()) editor.image.setAttribute('sizes', editorialSizes);
    buildHero();
  }
  const labels: Record<Direction, string> = { hero: '01 / FIRST IMPRESSION', art: '02 / A DIFFERENT COMPOSITION', editorial: '03 / RESERVED SPACE' };
  query('#study-label').textContent = labels[direction];
  query('#source-mode').textContent = direction === 'art' ? forcePortrait ? 'portrait source forced for inspection' : 'portrait source at viewport ≤ 600px' : direction === 'editorial' ? 'native lazy images · promoted for inspection' : 'native responsive image';
  query('#frame-title').textContent = direction === 'art' ? 'Same subject. Another story.' : 'A little space, a lot of shape.';
  query('#frame-note').textContent = direction === 'art' ? 'A separate portrait source, not a CSS-only crop.' : 'Original ceramic forms, framed for this page.';
  query('#direction-note').textContent = direction === 'hero' ? 'The leading image is eager with a high-priority hint. Real width candidates let the browser choose.' : direction === 'art' ? 'The phone receives a separately authored portrait composition. Sources precede the semantic fallback image.' : 'These lazy frames begin below the fold on the default page. Moving them here can reuse the browser cache; reload to measure cold loading.';
  query('#framing-hint').textContent = direction === 'editorial' ? 'Gallery images keep below-fold / lazy / low / async hints. Their inspection view does not prove requests were deferred.' : 'A display crop changes framing. It does not download a different source or optimize its bytes.';
  for (const selector of ['#crop', '#priority', '#focal']) query<HTMLInputElement | HTMLSelectElement>(selector).disabled = direction === 'editorial';
  refresh();
};
const material = getGlassProps({ appearance: 'light', radius: 13, blur: 12, corner: 'continuous' });
const caption = query('#glass-caption'); caption.classList.add(material.className);
for (const [key, value] of Object.entries(material.style)) caption.style.setProperty(key, value);
for (const [key, value] of Object.entries(material)) if (key !== 'style' && key !== 'className') caption.setAttribute(key, String(value));
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) button.addEventListener('click', () => { cancelTour(); select(button.dataset.direction as Direction); });
query<HTMLSelectElement>('#crop').addEventListener('change', event => { cancelTour(); crop = (event.target as HTMLSelectElement).value as Crop; select(direction, false); });
query<HTMLSelectElement>('#priority').addEventListener('change', event => { cancelTour(); priority = (event.target as HTMLSelectElement).value as Priority; select(direction, false); });
query<HTMLInputElement>('#focal').addEventListener('input', event => {
  cancelTour(); focal = Number((event.target as HTMLInputElement).value); query('#focal-value').textContent = focal + '%';
  // The framing helper remains the source of truth; adjust styling without
  // assigning source URLs again during a slider interaction.
  const props = getGlassImageProps(heroOptions()); for (const [key, value] of Object.entries(props.style)) hero.style.setProperty(key, value);
});
query<HTMLInputElement>('#force-portrait').addEventListener('change', event => { cancelTour(); forcePortrait = (event.target as HTMLInputElement).checked; select(direction, false); });
query('#refresh').addEventListener('click', refresh);
query('#decode').addEventListener('click', async () => {
  const image = active(), currentSrc = image.currentSrc, attempt = ++decodeRevision, button = query<HTMLButtonElement>('#decode');
  if (!currentSrc || typeof image.decode !== 'function') { query('#decode-result').textContent = 'No selected source or decode() is unsupported. Native loading remains available.'; return; }
  button.disabled = true; const start = performance.now();
  try {
    await image.decode();
    if (attempt !== decodeRevision) return;
    query('#decode-result').textContent = currentSrc === image.currentSrc ? 'decode() fulfilled in ' + (performance.now() - start).toFixed(2) + ' ms for this request. Cache state is not inferred.' : 'The source changed during decode(). Measure the selected image again.';
  } catch {
    if (attempt === decodeRevision) query('#decode-result').textContent = 'decode() rejected. The native load/error state remains visible; no success is assumed.';
  } finally { if (attempt === decodeRevision) { button.disabled = false; refresh(); } }
});
const reset = () => {
  cancelTour(); decodeRevision++; shiftStart = performance.now(); shiftTotal = 0; shifts.length = 0; selectedEditorial = 'paper';
  select('hero'); query('#decode-result').textContent = 'Session evidence reset. This does not clear the browser cache or cancel native image requests.';
};
query('#reset').addEventListener('click', reset);
const tour = () => {
  cancelTour(); const attempt = tourRevision;
  const step = (value: Direction) => {
    if (attempt !== tourRevision) return;
    tourStep = value;
    if (value === 'art') {
      priority = 'normal'; crop = 'native'; focal = 65; forcePortrait = true; select(value, false);
    } else select(value);
    query('#tour').textContent = 'Tour / ' + (value === 'hero' ? '01' : value === 'art' ? '02' : '03');
  };
  step('hero');
  return new Promise<boolean>(resolve => {
    tourFinish = resolve;
    tourTimers.push(window.setTimeout(() => step('art'), 3200), window.setTimeout(() => step('editorial'), 6400), window.setTimeout(() => {
      if (attempt !== tourRevision) return;
      tourStep = null; tourTimers = []; tourFinish = undefined; query('#tour').textContent = 'Take a short tour ↗'; resolve(true);
    }, 9600));
  });
};
query('#tour').addEventListener('click', () => { void tour(); });
window.addEventListener('resize', refresh, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelTour(); });
window.addEventListener('pagehide', () => { cancelTour(); decodeRevision++; shiftsObserver?.disconnect(); resize?.disconnect(); }, { once: true });
Object.assign(window, { __imageDemo: {
  preset(id: Direction) { cancelTour(); select(id); }, tour, reset, refresh,
  portrait(value: boolean) { if (typeof value !== 'boolean') throw new TypeError('Portrait override must be boolean'); cancelTour(); direction = 'art'; forcePortrait = value; select('art', false); },
  inspect(id: string) { if (!editors.has(id)) throw new TypeError('Unknown original editorial study'); cancelTour(); selectedEditorial = id; select('editorial'); },
  get state() { return { direction, crop, priority, focal, forcePortrait, tourStep, revision, viewport: innerWidth, dpr: devicePixelRatio, active: record(active()), shifts: { supported: shiftSupported, observedSum: shiftTotal, records: [...shifts] }, editorial: [...editors].map(([id, editor]) => ({ id, ...record(editor.image) })) }; },
} });
select('hero');
