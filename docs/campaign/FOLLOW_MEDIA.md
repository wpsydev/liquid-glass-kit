# Relay: keep the reader's place

Relay is an original, local review log with selectable text, a real composer and a bounded session of at most 32 records. Native buttons append records, pause following, read older entries, extend existing text and explicitly return to the latest. There is no model, backend, network stream, virtualization or file access.

The optional `attachGlassFollow` coordinator reads native scroll geometry and remembers whether the reader was pinned before an actual append. The host declares new-record counts explicitly. Extending text declares zero; ResizeObserver does not invent unread messages. A reader pause remains sticky until an explicit follow or jump. The controller owns no record content, ARIA log roles, keyboard focus or text selection.

## Native evidence and two demo fixes

`benchmarks/follow-native.json` records 15 states at 320×700, 390×844, 768×1024, 844×390 and 1440×900. All 75 corrected cases have no page or nested scrollport horizontal overflow, control targets at least 44 CSS pixels and a 16-pixel composer field. These are desktop Chromium viewport measurements, not physical phone, Safari or assistive-technology certification.

Two actual demo issues were repaired separately from the framework core. The home link was 35 pixels high; its minimum height is now 44. The old reset replaced records while retaining the previous stream's unread count. A new session now destroys the prior coordinator and reattaches with `initiallyFollowing:false`, clearing session-owned unread without jumping. A transient teardown callback is suppressed from cancelling an explicitly requested tour. Native regression starts with two actual unread records, resets, and observes ten new-session records, unread zero, top zero and following false. The library's sticky unread behavior for one stream remains unchanged.

Actual native composer typing plus Enter appended the authored note and kept draft focus/caret. Actual Read older and +Three buttons preserved scrollTop 474 while three new records accumulated; an explicit native Jump latest reached within 0.5 pixel of the tail and left focus on that button. An actual native ArrowUp paused following. Separate native Range fixture selection retained its exact selected text and the same text node during appends. Those Range and synthetic wheel/scroll intent fixtures are explicitly distinguished from physical mouse/touch input.

Actual ResizeObserver delivery after width changes kept a followed reader near the tail and left a paused reader paused. Width reflow and position are pixel geometry, not a promise of semantic text-line anchoring. Actual IntersectionObserver viewport exit paused following; an offscreen append counted one real unread record, and returning into view preserved the pause/unread without replay. Hidden/revealed states also kept following paused. No document-visibility event or overlay/occlusion proof is inferred from viewport tests.

The bounded-session fixture verified 32 unique record IDs, 32 DOM rows, disabled add controls at capacity and retention of the initial ten DOM nodes. Repeated original fixture text is allowed; unique IDs do not imply 32 unique authored essays. Normal forward appends preserve reading position. Reversed, virtualized or prepended history and browser scroll-anchoring policy remain host responsibilities.

`scripts/follow-demo-probe.js` reproduces the 15-state native assertions at a chosen viewport, including target size, overflow, reset, pinned appends, paused unread, zero-count growth, selection and no hidden replay. Unit tests use mocked geometry separately; they do not replace the native evidence. The core passed 21 focused tests. Complete isolated `npm run check` after the demo fixes passed 778 tests in 40 files plus exports/SSR/site/campaign checks. Strict demo TypeScript passed.

## Scoped performance evidence

Run `node scripts/follow-benchmark.mjs` to rebuild the standalone native fixture and payload without touching shared dist. Evaluate `scripts/follow-browser-probe.js` in native T3 after loading `/tmp/lg-follow-probe.html`.

The optional controller, including its numeric/lifecycle helpers, is 5923 raw minified IIFE bytes/2721 gzip bytes. No CSS is included. The native connected benchmark executes 800 attach/follow/append/notify/pause/growth/notify/append/refresh/jump/destroy sequences across 16 real scrollports. Five batches of 160 have a median time of 31 ms. It observes 8000 scrollHeight reads, 8000 clientHeight reads and 10400 scrollTop reads, zero explicit rectangle reads and zero requested frames during the synchronous lifecycle sequence. Its 9600 listener additions and removals balance. Native geometry getters stay native; instrumentation only forwards and counts them.

Those synchronous times include native style/layout caused by scroll metrics and host row changes. Zero explicit rectangles does not mean zero layout work. A separate live ResizeObserver/scroll lifecycle keeps an actual append pinned, preserves paused growth, and observes zero requested frames in 250 ms settled idle and after destroy. Including that live controller, 9612 listener additions/removals balance.

These absolute desktop measurements are not a comparative speedup, CSS paint, GPU, FPS, task-processing, physical-device or virtualized-feed throughput claim. Automatic following is instant; native smooth navigation is reserved for an explicit jump and respects reduced motion.

## Original film and music

`assets/follow-showcase.mp4` is H.264, 960×960, 30 fps and 12 seconds, with stereo AAC at 48 kHz. All 360 frames and audio decode. Frames at 1.2, 5.8 and 9.5 seconds were reviewed, including cropped inspection of complete sidebar text. The poster at 6.5 seconds shows three real unread records. Exact hashes and byte counts are in `FOLLOW_MEDIA.json`.

The native capture follows the actual finite ten-second fixture tour: ten base records, one followed append, three paused appends, an explicit return and in-place growth declared as zero new records. The real final total is fourteen, not thirteen. There is no automated background stream after the tour. The draft, controller and source rows remain real page content.

Camera-only styling compacts density, uses equal columns for presentation controls, hides extended credits and adds a whole-body compositing layer. These are temporary recording choices. Pixel inspection does not demonstrate a renderer defect, and no source optimization or rendering-speed claim follows from the camera layer. The shipped demo receives only the two measured host fixes above.

Music is original MIT procedural garage at 132 BPM, seed 41, with a rounded plucked-key voice, shuffled percussion and bass. It uses no external samples or recordings. Reproduce it with `python3 scripts/render-follow-score.py --seed 41 --output /tmp/follow-score.wav`, then the existing `scripts/render-series-film.mjs` with the native raw recording and the three captions in the media JSON.
