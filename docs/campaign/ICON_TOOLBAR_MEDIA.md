# Margin: original toolbar study

An original local poster editor demonstrates native icon buttons, a real Notes anchor, host-owned pressed state and one toolbar keyboard entry. Center, Bold, Guides, palette, Restore and an optional Stamp action change actual page content. Text fields retain native caret behavior. There is no model service, filesystem, upload, checkout or persistence.

The demo uses the optional icon-toolbar controller and original inline vector icons/art. It does not redistribute 3dicons assets. The host explicitly chooses direction, orientation, wrapping, hidden/disabled membership and calls refresh or update after DOM changes.

## Native validation

`benchmarks/icon-toolbar-native.json` contains the original native T3 readbacks. Twenty layout cases cover horizontal, RTL, vertical and quiet presets at 320×700, 390×844, 768×1024, 844×390 and 1440×900. These cases showed no page horizontal overflow, action targets at least 44 CSS pixels high, 16-pixel fields and one available toolbar Tab stop. This is desktop Chromium viewport testing, not physical phone, Safari or assistive-technology validation.

Separate actual native keys verified Tab entry and exit, arrows without activation, Enter activation with actual alignment changes, Home/End, RTL, perpendicular-key preservation, vertical orientation, wrapping policy, skipped hidden/disabled actions and native anchor navigation. Native field typing and ArrowLeft preserved content and caret behavior.

Two real browser findings informed the handoff. Author flex display overrode the user-agent hidden rule, so the core CSS now explicitly hides authored hidden actions and has a connected cascade regression. Native hide/removal can blur before the controller observes ownership. The demo captures an owned active action before mutation, updates or refreshes membership, then explicitly restores an available action only if that captured action became unavailable. Final native hide/removal plus ArrowRight tests verified this choreography; external field focus remains untouched. Automatic controller rescue after arbitrary removal is not guaranteed. Earlier observed blur readbacks are retained honestly alongside the final host results.

Core focused tests: 26 passed. Isolated complete `npm run check`: 658 tests across 37 files passed, including SSR/exports/site/campaign checks. The demo separately passed strict TypeScript and an isolated Vite production build. Unit and native results are distinct. No frame-rate, GPU timing or speed claim follows from these checks.

## Film

`docs/campaign/assets/icon-toolbar-showcase.mp4` is H.264, 960×960, 30 fps, 12 seconds, with stereo AAC at 48 kHz. All 360 frames and the audio decode successfully. Three decoded frames at 0.8, 4.5 and 9.2 seconds were visually reviewed. The poster is `docs/campaign/assets/icon-toolbar-showcase.png`; exact hashes and byte counts are in `ICON_TOOLBAR_MEDIA.json`.

The recording is a native T3 capture of the real demo. Its finite 10.5-second fixture tour uses host clicks and synthetic keyboard choreography; authentic native key validation is recorded separately. The tour ends with no pending timers or document animations. Recording-only density styling compacts the intro and history and hides extended credits. It does not change the shipped demo or core behavior. Captions keep the action area visible.

Music is an original procedural MIT composition, afro style, marimba voice, 124 BPM, seed 52, with no external recordings or samples. Reproduce it with `python3 scripts/render-series-score.py --style afro --seed 52 --output /tmp/icon-toolbar-score.wav`, then use the existing `scripts/render-series-film.mjs` with the native recording and the three captions stored in the JSON metadata.

## Automation boundary

`window.__toolbarDemo` exposes `reset`, `cancel`, `configure`, `preset`, `refresh`, `tour` and getter-only `state`/`tourPromise`. The static default has no unattended animation. A bounded tour resolves after 10.5 seconds; hidden pages and trusted user actions cancel it without replay. Quiet motion and solid appearance are explicit host controls. Changing toolbar focus never executes an action.


## Root integration and payload refinement

Campaign paths above are repository-relative under docs/campaign/assets. The clean replacement demo/evidence patch creates no root assets directory and carries no package/core/shared-script edits. The earlier accepted patch and original video/poster/audio bytes are preserved. This refinement does not recapture or re-encode media; the unchanged H264/AAC export was fully decoded again (360 frames, 311 unique decoded frame hashes, no errors). Export hashes remain unchanged.

After the accepted hidden-action CSS fix, `node scripts/icon-toolbar-benchmark.mjs` measured the optional standalone IIFE at 6,444 bytes / 2,601 gzip, including shared lifecycle cleanup; actual unminified CSS is 1,777 bytes / 752 gzip. The actual standalone ESM was imported in Node without browser globals and exported attachGlassIconToolbar/getGlassIconActionProps. Material/theme styles, icons, peers and site assets are excluded. These bytes do not measure load time, interaction CPU, paint, GPU cost or speedup.

The original combined native evidence remains unchanged in benchmarks/icon-toolbar-native.json. Derived copies now separate original native viewport readbacks (icon-toolbar-layouts.json), actual native key tests plus the observed blur boundary and final host choreography (icon-toolbar-keyboard.json), and finite host-click/synthetic-key film choreography (icon-toolbar-fixture-tour.json). They are provenance-preserving splits of existing evidence, not new observations. Temporary media verification has been preserved in benchmarks/icon-toolbar-film-validation.json and rechecked against the same bytes. No extra browser work was performed.

The library does not guarantee automatic repair after arbitrary native hide/removal. The validated host captures its previously owned active action before mutation, updates/refreshed membership and explicitly repairs focus only when that captured action became unavailable. Already external focus remains untouched. The separate ICON_TOOLBAR guide candidate documents this ownership boundary.
