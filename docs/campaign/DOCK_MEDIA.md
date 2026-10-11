# Orbit Dock film

**Status: pending capture, export, browser validation and publication.** This document records the initial media plan. It is not a published-video or X-post receipt.

The intended 12-second film demonstrates the new optional magnetic dock in an original creative workspace: a warm copper solar disc, restrained orbital paths, readable tool panels and a glass tool shelf. The working showcase will expose notes, color, motion, files and export actions. The tour may select panels and change composition settings; it must not imply that an export was downloaded unless that action was separately exercised and verified.

Implemented tour choreography uses two-second chapters: **0–2** notes/proximity, **2–4** lunar color, **4–6** motion at1.6× and12° composition angle, **6–8** files, **8–10** export preview, and **10–12** notes/copper with motion controls reset and the final card. It changes the actual app state and does not automatically download exports. Record the actual native T3 collaborative browser presentation. Normal frame resampling and music muxing are allowed; do not speed up application behavior and present it as measured responsiveness.

## Original score prepared

`scripts/render-dock-beat.py` generated `/tmp/lg-dock-beat.wav`: exactly 12 seconds, 48kHz stereo PCM16, 576,000 frames, 120 BPM, six two-second bars. PCM readback measured peak −2.79dBFS and RMS −15.62dBFS. SHA256: `2fcdfdcd560fd22878cb70818ba15ec391a0c1370669e069751271b516255c4e`.

The score uses original synthesized chords, bass, plucks and percussion with a deterministic random seed. It contains no third-party samples or recordings. Source and generated recording use the repository's MIT license. Full WAV decoding with FFmpeg passed; its volume detector reported mean −15.6dB and maximum −2.8dB, consistent with PCM readback. These are source WAV measurements; final AAC encoding must be checked independently.

## Evidence still required

- Final native recording source, capture viewport, resulting MP4 path and checksum, exact duration, dimensions, frame count and audio/video codecs.
- Full audio/video decode and visual inspection of the main feature moments plus readable end card. Film export frame rate is not app rendering frame rate.
- Separate live browser checks for dock input, native control activation, focus, responsive layouts, touch event suppression and reduced motion. Distinguish desktop viewport checks from physical device testing.
- Working hosted demo and release references after publication, plus the verified X status URL and upload evidence after the autonomous launch.
- Any bundle or scheduling/timing measurements with method and limits, rather than a claim that the film establishes a speedup.


## Final recorded film

Native T3 preview recorded fresh bundled project source at960×960 CSS pixels; capture1920×1920. Trim0.14s startup; resample normally to960×960,30 export fps,360frames, exactly12s H.264/yuv420p with48kHz stereoAAC andfaststart. The sequence is not sped up. Six reviewed frames show notes, color, motion, files, export and return/endcaption with actual dock magnification and panel changes. Full video/audio decode passed. The export chapter shows the ready interface without automatic download; separate native validation inspected a generatedSVGdownloadrequest.

Decoded final AAC mean −15.7dBFS and peak −2.9dBFS. Film is a presentation artifact, not measured app FPS. Original 120 BPM music uses no third-party samples; source and generated audio use repository MIT terms. Publication receipts remain pending until the matchingrelease/demo/Xpost are verified.

- `docs/campaign/assets/dock-showcase.mp4`: 762530bytes; SHA256`69952b69017909a5752a594fba7dd994e1a58d1a29985fb4b540b9ed09af8d3b`
- `docs/campaign/assets/dock-showcase.png`: 683325bytes; SHA256`10e7eb697fa343c500488d607b342b451bd1803fd43ac465aba6809212370f9a`
