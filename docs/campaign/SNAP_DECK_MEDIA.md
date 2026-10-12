# Offset / native snap-deck film

Original twelve-second 960×960 H264 High/yuv420p film, 360 frames exported at 30fps, AAC stereo 48kHz. Original 132 BPM garage/bell score, seed 33, synthesized without external samples. Artwork, interface, code and score are independent/MIT; no Supahero or other resource art, media, fonts or source copied.

Native T3 tab 43 captures the actual ten-second demo tour: Form → Colour and its real page-session board choice → Motion and its board choice → compact cards with disabled all-fit navigation → signed native RTL scrolling. The tour finishes with index 1, selected Motion, two actual choices and no remaining tour steps. The last native frame is held during export to reach twelve seconds. The captions describe captured behavior, without an FPS or performance claim.

Recording-only CSS lowers header/type/art heights and paddings and compresses the small board artwork so the real selected board stays visible beside the deck. It preserves authored DOM/card identity, normal native scroll geometry, 44px controls and a 16px select. No fake phone, transform-based scroll illusion or simulated gesture was used. Layout checks use the normal demo CSS, without recording overrides; the desktop recording is not physical-device testing.

The media fully decodes with video and audio. Representative 2s / 6.5s / 9.5s frames were visually reviewed. Metadata, SHA-256, byte sizes, decoded-frame counts and music provenance are in [SNAP_DECK_MEDIA.json](SNAP_DECK_MEDIA.json). Export FPS is not application FPS; native source timing is variable.

Native validation records:

- [Fifteen layouts](../../benchmarks/snap-deck-layouts.json): story, compact and RTL at 320×700, 390×844, 768×1024, 844×390 and 1440×900, with no document overflow, at least 44px authored control/label targets and a 16px select.
- [Functional checks](../../benchmarks/snap-deck-functional.json): requested smooth targets do not optimistically change the settled index; ordinary button focus stays intact; native ArrowRight remains unintercepted, Tab reaches ordinary authored buttons, real choices change the local board, and RTL/quiet/all-fit behavior is verified. A focused host navigation button can natively blur when the host disables it at an endpoint.
- [Connected native lifecycle](../../benchmarks/snap-deck-browser.json): five batches of twenty 32-card attach/refresh/destroy cycles, and separately twenty cycles of four cached instantaneous requests. These scoped JavaScript/browser synchronization costs exclude smooth animation and paint. The probe records native smooth scroll events separately. Cached requests perform no JavaScript bounding-rectangle rereads; framework and subsequent idle custom RAF requests are zero.
- [Optional payload](../../benchmarks/snap-deck-payload.json): delivery bytes and source hash, not a comparative speedup.

The browser checks exposed an original ResizeObserver issue: unchanged first/re-observe deliveries could cancel an immediately requested smooth scroll. The helper now compares actual cached snap geometry before interrupting; genuine changes still invalidate, and an unchanged notification cannot publish a moving view as settled. Thirty focused tests plus typecheck pass; corrected native LTR/RTL and the final actual RTL tour pass.

To reproduce payload and connected lifecycle setup, run node scripts/snap-deck-benchmark.mjs, write /tmp/lg-snap-deck-probe.html into a dedicated native T3 tab, start native recording, and evaluate the trimmed contents of scripts/snap-deck-browser-probe.js. Stop recording promptly. Lifecycle/request timing does not imply GPU speed, browser paint speed or a cross-device benchmark.

Physical phones, native touch/swipes, Safari, zoom and assistive technology remain unverified. No native touch gesture tool is exposed; synthetic event fixtures are not physical-phone evidence. Root owns release and X publication; these local files do not establish publication.
