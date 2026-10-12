# Dispatch: a thoughtful agent handoff

An original native review desk using the actual `createGlassAgentPack` planner. Choose a stack, guidance target, explicitly selected material/DOM/motion/style exports, plain task context, scoped Cursor paths and an occupied-destination snapshot. Review produces the real frozen create-only plan, selected namespace imports, progressive references and conflicts. Edits mark the previous snapshot stale and disable download/copy/source selection until reviewed again. Native text/caret stay in the authored fields.

The JSON download contains the exact reviewed plan plus `reviewOnly` and `exclusiveCreateRequired`. A conflict still allows a review download, but `canCreate` remains false and the complete plan is visibly create-blocked. The native Blob payload was round-tripped against the actual controller plan: application/json, 13,956 bytes in this conflict fixture, all files create-only, exact known conflict retained. This does not write files into a project, install a rule/skill, scan a filesystem or prove client discovery. Clipboard errors have visible fallbacks; actual client delivery and OS save dialogs remain separate.

## Catalog verification and FINAL ROOT regeneration

This isolated studio displays **0.54.0-preview.1 local release-version artifact evidence**. The planner itself accepts a host-declared catalog; it does not verify it. `scripts/agent-studio-catalog.mjs` supplies that separate host verification: it reads the actual package.json declared import targets, resolves/read-hashes them, and imports the built `/material`, `/dom` and `/motion` namespaces in Node. The `/material.css` declared file is checked separately for existence/readable bytes, not imported as JavaScript. No TypeScript declaration is parsed to infer runtime names.

Actual local value names:

- `/material`: getGlassInnerRadius, getGlassProps, getResolvedGlassProps, resolveOptions
- `/dom`: attachGlass, glass
- `/motion`: advanceGlassSpring, attachGlassMotion, createGlassSpring, resolveGlassSpring

After the parent integrates the final release version (expected v0.54) and builds the FINAL ROOT package, run `node scripts/agent-studio-catalog.mjs`, then `node scripts/agent-studio-benchmark.mjs`, then build the demo. The generator writes only this demo's catalog and scoped evidence. If a declared target is absent or a Node module import fails, it stops rather than manufacturing names. Regenerated catalog version/value names/artifact hashes must match the final local package. The film deliberately shows its isolated local version and does not establish registry availability or current AI-client discovery. Original source38 core patch and package exports remain the parent's work.

## Native validation

Seven real plans at five CSS viewports produced 35 cases: 320×700, 390×844, 768×1024, 844×390 and 1440×900. Native buttons/module labels meet the library's 44px policy, selects/textareas use 16px text, and page horizontal overflow is zero. Native internal file/content scroll panes remain available. This is desktop Chromium/Electron CSS layout evidence, not physical phones, Safari or assistive technology.

Checks cover edited task/caret preservation, stale export controls, explicit review, an occupied rule, ASCII-case collision, invalid traversal retaining the previous snapshot, quoted task text that does not alter frontmatter, portable skills without Cursor globs, solid material without backdrop filtering, quiet mode and finite cancellation. Ordinary cancelled tours leave no timers and do not auto-replay. A synthetic hidden-property probe failed native transport, so actual page background and hidden replay are **not counted as verified**. The authored visibility handler cancels on document.hidden, but real background behavior remains a separate native check. OS reduction was observed false and not changed. No autonomous frame runner or AI/model request exists in this study.

The isolated full `npm run check` passed 583 tests / 34 files, including 33 focused agent-pack tests and existing SSR/package identity checks. The new studio separately passes strict TypeScript and standalone Vite production build. Source core SHA-256 remains `1010d031f2b787962025763c36f59efacc85596a25d838231df859637a957b2a`; original `/tmp/liquid-glass-source38.patch` remains `722e9469c2804b0201db9a5db82e8c9526b9ac08bd966bbf4c7d91d988af284d`.

## Performance scope

The optional standalone planner ESM is 31,500 bytes / 11,032 bytes gzip, including the reused integration-brief lifecycle dependency. This is not root entry size, an npm tarball, a network/load-time measurement or a rendering speedup. The standalone browser study JS is 39.52kB / 14.59kB gzip including original UI and selected catalog.

Pure Node CPU benchmark: 80 batches of 100 calls after 20 warmups per context. Median batch costs: 3.939ms for a three-file rule, 6.311ms for a ten-file dual target, and 6.415ms for the ten-file conflicted plan. P95 costs: 5.281ms, 7.724ms and 7.997ms respectively. These include strict copies, text generation and frozen results; DOM, layout/paint, download, filesystem and client loading are excluded. The standalone planner was actually imported in Node without browser globals.

An earlier v0.30 native browser probe made 30 connected three-file reviews, measuring planner plus host file/content DOM updates: median 0.1ms, p95 1.5ms in this run. Timing resolution is about 0.1ms; these figures exclude layout/paint and asynchronous client/file operations. Do not compare these different scopes as a speedup or infer GPU performance. Detailed samples/configuration are in the scoped benchmark JSON files.

## Film and music

The real finite 10.5-second handoff tour shows an exact scoped rule, selected reference, a blocked occupied file, a portable skill, explicitly selected DOM/motion references, and quoted task context. The final artifact is reviewable JSON; there is no fake shell, installation, AI execution or success message.

The original score uses an ambient afro groove at 122 BPM: wooden percussion, a short plucked kalimba patch, fresh major-ninth melody and seed71. All notes and drums are synthesized originally without external samples or artist imitation. Original UI/code icons and score are MIT licensed.

The recording-only 960px two-column camera places the existing artifact section alongside the existing form, bounds the file/content scroll panes, and hides duplicate file-select/copy/solid controls and footer replay controls. Existing controls, version identity, actual generated contents/imports, conflicts and read-only boundaries stay visible. Full page validation uses normal CSS. The native 1920×1920 recording has 10.39s of variable event cadence; export adds a 1.61s final-frame hold. Export is H264/AAC, 960×960, 30fps, stereo48kHz. All 360 frames decode without errors; 281 distinct hashes. Frames at 0.8s, 4.5s and 8.5s were reviewed, with captions below controls. Export rate is not a browser rendered-FPS claim.

Reproduce the score with `python3 scripts/render-agent-studio-score.py --style afro --seed 71 --output /tmp/agent-studio-score.wav`. Create a current inline `agent-studio` study using `scripts/inline-preview.mjs`, load into an owned native tab, inject `scripts/agent-studio-browser-probe.js` and `scripts/agent-studio-capture.js`, record while awaiting `window.__agentStudioFilm.record()`, then stop promptly. Finish with `node scripts/render-agent-studio-film.mjs --input <native-recording.mp4> --score /tmp/agent-studio-score.wav --output docs/campaign/assets/agent-studio-showcase.mp4 --poster docs/campaign/assets/agent-studio-showcase.png --captions docs/campaign/AGENT_STUDIO_CAPTIONS.json`.

Prepared locally only. Parent owns final integration, exports/version, publishing and X.

Release-version refinement: the isolated package/lock metadata was explicitly set to 0.54.0-preview.1, declared artifacts rebuilt, actual Node value-name catalog regenerated and pure benchmark rerun. The native film and all 35 layout cases were recaptured against the current catalog. Current task/caret/stale-review/case-conflict/quoted-context/solid/cancel checks and exact conflicted JSON Blob roundtrip passed. The score WAV is the unchanged original. Earlier media and detailed boundary observations remain intact in the v0.30 backup. The original core patch is unchanged; replacement demo/media patches exclude local package/version changes. Parent still regenerates and compares FINAL ROOT artifacts before publication.

A fresh release-version native connected review probe made 30 calls with median 0.1ms and p95 0.4ms, retaining zero pending tour timers. This includes model plus host DOM updates and excludes layout/paint/client/download. See benchmarks/agent-studio-host-current.json; no historical comparison or speedup is claimed.
