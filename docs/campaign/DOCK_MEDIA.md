# Orbit Dock film

**Status: published and verified, 2026-10-11.** The final film, live demo, release and X thread were independently read back. The choreography below records the production plan and completed recording.

The 12-second film demonstrates the new optional magnetic dock in an original creative workspace: a warm copper solar disc, restrained orbital paths, readable tool panels and a glass tool shelf. The working showcase exposes notes, color, motion, files and export actions. The tour may select panels and change composition settings; it must not imply that an export was downloaded unless that action was separately exercised and verified.

Implemented tour choreography uses two-second chapters: **0–2** notes/proximity, **2–4** lunar color, **4–6** motion at1.6× and12° composition angle, **6–8** files, **8–10** export preview, and **10–12** notes/copper with motion controls reset and the final card. It changes the actual app state and does not automatically download exports. Record the actual native T3 collaborative browser presentation. Normal frame resampling and music muxing are allowed; do not speed up application behavior and present it as measured responsiveness.

## Original score prepared

`scripts/render-dock-beat.py` generated `/tmp/lg-dock-beat.wav`: exactly 12 seconds, 48kHz stereo PCM16, 576,000 frames, 120 BPM, six two-second bars. PCM readback measured peak −2.79dBFS and RMS −15.62dBFS. SHA256: `2fcdfdcd560fd22878cb70818ba15ec391a0c1370669e069751271b516255c4e`.

The score uses original synthesized chords, bass, plucks and percussion with a deterministic random seed. It contains no third-party samples or recordings. Source and generated recording use the repository's MIT license. Full WAV decoding with FFmpeg passed; its volume detector reported mean −15.6dB and maximum −2.8dB, consistent with PCM readback. These are source WAV measurements; final AAC encoding must be checked independently.

## Validation scope

- Final native capture and MP4 metadata are recorded below, with checksums in `dock-update.json`.
- Full audio/video decode and six visual samples passed. Film export frame rate is not app rendering frame rate.
- Separate browser checks covered dock input, native control activation, focus, responsive layouts, controlled touch suppression and reduced motion. These are desktop viewport checks, not physical device testing.
- Hosted demo, release and X upload receipts are recorded below.
- Bundle and controller timing measurements include their method and limits in the benchmark files; the film does not establish a speedup.


## Final recorded film

Native T3 preview recorded fresh bundled project source at960×960 CSS pixels; capture1920×1920. Trim0.14s startup; resample normally to960×960,30 export fps,360frames, exactly12s H.264/yuv420p with48kHz stereoAAC andfaststart. The sequence is not sped up. Six reviewed frames show notes, color, motion, files, export and return/endcaption with actual dock magnification and panel changes. Full video/audio decode passed. The export chapter shows the ready interface without automatic download; separate native validation inspected a generatedSVGdownloadrequest.

Decoded final AAC mean −15.7dBFS and peak −2.9dBFS. Film is a presentation artifact, not measured app FPS. Original 120 BPM music uses no third-party samples; source and generated audio use repository MIT terms. The public release, demo and X post are verified below.

- `docs/campaign/assets/dock-showcase.mp4`: 762530bytes; SHA256`69952b69017909a5752a594fba7dd994e1a58d1a29985fb4b540b9ed09af8d3b`
- `docs/campaign/assets/dock-showcase.png`: 683325bytes; SHA256`10e7eb697fa343c500488d607b342b451bd1803fd43ac465aba6809212370f9a`

## Publication receipts

- [Release 0.15.0-preview.1](https://github.com/wpsydev/liquid-glass-kit/releases/tag/v0.15.0-preview.1): release, Pages and Verify workflows all succeeded for commit `063f13c13364776b5240d7138c0e3b0feca18333`. Independently downloaded archive: 92 files, version matched, 15 non-peer ESM entrypoints import without browser globals or optional frameworks. npm registry publication remains pending.
- [Working Orbit demo](https://wpsydev.github.io/liquid-glass-kit/dock/): actual hosted module initialized; native Color/Moss activation changed palette and accessible artwork description. At 390px CSS width, the page had no horizontal overflow, fields used 16px fonts and five dock controls measured 44x48px. Desktop viewport and controlled touch checks do not establish physical iPhone, Safari or Android certification.
- [X video post](https://x.com/wpsygames/status/2109239831796777156) and [implementation reply](https://x.com/wpsygames/status/2109241392358908283): exact drafts and own parent checked before single submissions, then verified on the profile and direct thread. The original MP4 checksum matched before native upload; X accepted the 12-second 960x960 upload and rendered a 720x720 transcode. No reach, adoption or follower gain inferred.

The film captures fresh bundled source in the T3 preview. Public hosting was checked separately after deployment. Export frame rate does not measure app rendering performance; the ~2.6 KB gzip claim comes from the isolated minified dock bundle recorded in `benchmarks/dock-payload.json`. Browser timing measures controller event submission and scheduling, not compositor, blur, phone FPS or a general speedup.
