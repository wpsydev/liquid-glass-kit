import { attachGlass } from '../src/index.ts';
import '../src/styles.css';
import './style.css';

const icon = (name: string, size = 20) => {
  const paths: Record<string, string> = {
    spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/>',
    arrow: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    wave: '<path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    chat: '<path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    play: '<path d="m9 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    next: '<path d="m5 5 10 7-10 7ZM19 5v14"/>',
    prev: '<path d="m19 5-10 7 10 7ZM5 5v14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="aurora" aria-hidden="true"><div class="orb orb-a"></div><div class="orb orb-b"></div><div class="orb orb-c"></div><div class="ridge"></div><div class="grain"></div></div>
  <header>
    <a class="brand" href="https://github.com/wpsydev/liquid-glass-kit">${icon('spark', 27)}<span>LIQUID GLASS <b>KIT</b></span></a>
    <nav aria-label="Material controls"><button id="scene" class="header-button" aria-label="Switch between composer and media demos">${icon('grid', 17)}<span>Switch scene</span></button><button id="solid" class="header-button" aria-pressed="false"><i class="status-dot"></i><span>Glass on</span></button><a class="repo-link" href="https://github.com/wpsydev/liquid-glass-kit">GitHub ↗</a></nav>
  </header>
  <main>
    <div class="intro"><p class="eyebrow"><span></span> MATERIAL STUDIES · 01 / 02</p><h1>Make the interface<br><em>feel alive.</em></h1><p class="intro-copy">A little light. A little depth.<br>Glass that belongs on the web.</p></div>
    <section class="canvas" aria-label="Interactive material showcase">
      <div class="scene-label"><span id="scene-name">THE AI COMPOSER</span><span class="scene-line"></span><span>LIVE CSS</span></div>
      <section class="composer material" aria-label="AI composer demo">
        <div class="composer-head"><span class="star-mark">${icon('spark', 25)}</span><span>What are we making?</span><span class="composer-dot"></span></div>
        <form id="composer-form"><label class="sr-only" for="prompt">Describe a project</label><textarea id="prompt" rows="2" placeholder="A beautiful idea starts here…">Build something that feels alive.</textarea><div class="composer-bottom"><button type="button" id="new" class="icon-button" aria-label="Reset prompt">${icon('plus')}</button><span class="model-label">Your AI, your interface</span><button type="submit" class="send" aria-label="Preview demo response">${icon('arrow')}</button></div></form>
        <p id="response" class="demo-response" aria-live="polite" hidden></p>
      </section>
      <div class="suggestions"><button data-prompt="Design a glass dashboard." class="suggestion material">${icon('grid', 15)}Design a dashboard</button><button data-prompt="Create a playful AI workspace." class="suggestion material">${icon('spark', 15)}Create a workspace</button></div>
      <section class="media-panel material" aria-label="Media controls demo" hidden>
        <div class="album-art" aria-hidden="true"><span class="album-ring"></span><span class="album-ring ring-two"></span><span class="album-word">AFTER<br>HOURS</span></div>
        <div class="track-header"><div><span class="tiny-label">VISUAL PLAYBACK DEMO</span><h2>Slow orbit</h2><p>Material studies · Vol. 01</p></div><button id="favorite" class="icon-button" aria-label="Favorite demo track" aria-pressed="false">${icon('heart')}</button></div>
        <div class="progress-track"><div id="progress"></div></div><div class="track-times"><span id="time">0:42</span><span>3:28</span></div>
        <div class="playback"><button id="previous" class="icon-button" aria-label="Restart demo track">${icon('prev', 21)}</button><button id="play" class="play-button" aria-label="Play visual animation" aria-pressed="false">${icon('play', 24)}</button><button id="next" class="icon-button" aria-label="Skip forward in demo track">${icon('next', 21)}</button></div>
      </section>
      <aside class="weather material" aria-label="Example weather widget"><div class="weather-top">SAN FRANCISCO ${icon('sun', 20)}</div><div class="temperature">19<span>°</span></div><p>A little brighter today.</p><div class="weather-bottom"><span>H 21° · L 14°</span><span>DEMO DATA</span></div></aside>
      <div class="mini-player material"><div class="mini-art" aria-hidden="true"></div><div><span>Slow orbit</span><small>Material studies</small></div><button class="icon-button" id="mini-play" aria-label="Open media controls">${icon('play', 19)}</button></div>
      <nav class="dock material" aria-label="Demo scenes"><button id="dock-ai" aria-label="Composer scene" aria-pressed="true">${icon('chat', 23)}</button><button id="dock-media" aria-label="Media scene" aria-pressed="false">${icon('wave', 23)}</button><div class="dock-divider"></div><button id="palette" aria-label="Change background palette">${icon('sun', 23)}</button><a href="https://github.com/wpsydev/liquid-glass-kit" aria-label="View source">${icon('code', 23)}</a></nav>
    </section>
    <div class="material-note"><span class="note-dot"></span><span id="material-caption">Real backdrop blur. Crisp foreground.</span><span class="note-path">PORTABLE CSS MATERIAL</span></div>
  </main>
  <footer><span>CSS + TypeScript · React · Vue · Svelte action</span><a href="https://github.com/wpsydev/liquid-glass-kit">wpsydev / liquid-glass-kit ↗</a></footer>
  <div class="capture-caption" id="capture-caption" aria-live="polite"></div>
`;

const controllers = [...document.querySelectorAll<HTMLElement>('.material')].map(el => ({
  el,
  controller: attachGlass(el, { appearance: 'dark', variant: 'clear', blur: 22, radius: el.classList.contains('dock') ? 25 : el.classList.contains('suggestion') ? 20 : 28, saturation: 1.4, interactive: true }),
}));
let solid = false;
let media = false;
let playing = false;
let progress = 42;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
function setSolid(next: boolean) {
  solid = next;
  controllers.forEach(({ el, controller }) => controller.update({ appearance: 'dark', variant: 'clear', blur: 22, radius: el.classList.contains('dock') ? 25 : el.classList.contains('suggestion') ? 20 : 28, saturation: 1.4, interactive: true, reducedTransparency: solid }));
  $('solid').setAttribute('aria-pressed', String(solid));
  $('solid').querySelector('span')!.textContent = solid ? 'Solid mode' : 'Glass on';
  document.body.dataset.solid = String(solid);
  $('material-caption').textContent = solid ? 'One preference. A solid, readable interface.' : 'Real backdrop blur. Crisp foreground.';
}
function setScene(next: boolean) {
  media = next;
  document.body.dataset.scene = next ? 'media' : 'composer';
  document.querySelector<HTMLElement>('.composer')!.hidden = next;
  document.querySelector<HTMLElement>('.suggestions')!.hidden = next;
  document.querySelector<HTMLElement>('.media-panel')!.hidden = !next;
  $('scene-name').textContent = next ? 'THE MEDIA PLAYER' : 'THE AI COMPOSER';
  $('dock-ai').setAttribute('aria-pressed', String(!next));
  $('dock-media').setAttribute('aria-pressed', String(next));
  document.querySelector('.eyebrow')!.lastChild!.textContent = next ? ' MATERIAL STUDIES · 02 / 02' : ' MATERIAL STUDIES · 01 / 02';
}
function setPlay(next: boolean) {
  playing = next;
  $('play').setAttribute('aria-pressed', String(next));
  $('play').setAttribute('aria-label', next ? 'Pause visual animation' : 'Play visual animation');
  $('play').innerHTML = icon(next ? 'pause' : 'play', 24);
  document.body.dataset.playing = String(next);
}
function updateProgress() {
  $('progress').style.width = `${progress / 208 * 100}%`;
  $('time').textContent = `${Math.floor(progress / 60)}:${String(progress % 60).padStart(2, '0')}`;
}
$('solid').addEventListener('click', () => setSolid(!solid));
$('scene').addEventListener('click', () => setScene(!media));
$('dock-ai').addEventListener('click', () => setScene(false));
$('dock-media').addEventListener('click', () => setScene(true));
$('mini-play').addEventListener('click', () => { setScene(true); setPlay(true); });
$('play').addEventListener('click', () => setPlay(!playing));
$('previous').addEventListener('click', () => { progress = 0; updateProgress(); });
$('next').addEventListener('click', () => { progress = Math.min(207, progress + 30); updateProgress(); });
$('favorite').addEventListener('click', () => { const button = $('favorite'); button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true')); });
$('palette').addEventListener('click', () => { document.body.dataset.palette = document.body.dataset.palette === 'warm' ? 'cool' : 'warm'; });
$('new').addEventListener('click', () => { $<HTMLTextAreaElement>('prompt').value = ''; $('response').hidden = true; $<HTMLTextAreaElement>('prompt').focus(); });
document.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach(button => button.addEventListener('click', () => { $<HTMLTextAreaElement>('prompt').value = button.dataset.prompt!; $<HTMLTextAreaElement>('prompt').focus(); }));
$('composer-form').addEventListener('submit', e => { e.preventDefault(); $('response').textContent = 'Sample response (UI demo): connect your own AI backend here.'; $('response').hidden = false; });
window.setInterval(() => { if (playing) { progress = (progress + 1) % 208; updateProgress(); } }, 1000);
setScene(false);
setSolid(false);

let showcaseTimers: number[] = [];
const caption = (text: string) => { $('capture-caption').textContent = text; };
// Capture automation exercises the same controls available to visitors.
(window as unknown as { runGlassShowcase: () => void }).runGlassShowcase = () => {
  showcaseTimers.forEach(window.clearTimeout);
  showcaseTimers = [];
  document.body.classList.add('showcase');
  document.body.dataset.palette = 'cool';
  setScene(false); setSolid(false); setPlay(false);
  caption('An AI composer, made of glass.');
  const step = (ms: number, action: () => void) => showcaseTimers.push(window.setTimeout(action, ms));
  step(4000, () => { $('solid').click(); caption('Prefer less transparency? One option.'); });
  step(7500, () => { $('solid').click(); caption('Back to glass. Foreground stays crisp.'); });
  step(11000, () => { $('dock-media').click(); $('play').click(); caption('The same material. A different interface.'); });
  step(15500, () => { $('palette').click(); caption('Light moves. Your controls stay readable.'); });
  step(19500, () => { setPlay(false); caption('Open source. Ready for your next interface.'); });
  step(23500, () => { document.body.classList.remove('showcase'); caption(''); });
};
