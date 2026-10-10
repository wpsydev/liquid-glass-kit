# AI app design showcase soundtrack

This note documents the original music and published 12-second AI app design showcase.

## Original composition

`assets/ai-design-beat.wav` is a distinct six-bar groove at 120 BPM in 4/4: exactly 24 beats and 12 seconds. It combines a rounded kick, mono sub bass with quiet upper harmonics, lightly swung filtered percussion, a dry rim tone, soft extended chords, and two restrained upper notes per bar. The composition uses a D-major-centered progression with changing bass roots. It contains no voice, samples, stock transitions, or borrowed recordings.

Every sound is calculated in `scripts/render-ai-design-beat.py` using Python's standard library. The random seed is fixed at `91206`. The source and generated audio are offered under this repository's MIT license; no third-party music asset is incorporated.

The script is the authoritative source. The WAV is a reproducible render artifact; a compact AAC copy can accompany the final video without requiring the uncompressed WAV to remain in Git history.

Reproduce from the repository root:

```sh
python3 scripts/render-ai-design-beat.py
```

An optional first argument changes the output path. The script prints the actual quantized PCM measurements and SHA-256 digest after rendering.

## Measured WAV properties

| Property | Result |
| --- | --- |
| Duration | 12.000000 seconds |
| Sample rate | 48,000 Hz |
| Channels | Stereo; bass and kick centered |
| Format | Signed 16-bit PCM WAV |
| Frames | 576,000 |
| Tempo and length | 120 BPM; six complete 4/4 bars |
| Sample peak | 0.789978; −2.048 dBFS |
| PCM RMS | 0.177568; −15.013 dBFS |
| Clipped PCM samples | 0 |
| Entry / exit fades | 25 ms / 240 ms, smooth sine fades |
| Deterministic seed | 91206 |

SHA-256:

```text
df97d08f2cfd5cbaa39193499f6eb4c52b08bc7e39573d7fb95bd9d3c4ddeaac
```

Peak and RMS are measurements of the exported PCM samples, not LUFS or an intersample true-peak measurement. The render has sample headroom and does not hard-clip.

## Recommended video mux

For an already compatible H.264 native browser capture, retain the captured picture and add AAC music:

```sh
AI_DESIGN_FFMPEG=/tmp/campaign-image-tools/node_modules/@ffmpeg-installer/linux-x64/ffmpeg
"$AI_DESIGN_FFMPEG" -i CAPTURE.mp4 -i docs/campaign/assets/ai-design-beat.wav \
  -map 0:v:0 -map 1:a:0 -t 12 \
  -c:v copy -c:a aac -b:a 160k -ar 48000 -ac 2 \
  -movflags +faststart OUTPUT.mp4
```

The variable above points to the verified FFmpeg binary in this workspace. On another machine, set `AI_DESIGN_FFMPEG=ffmpeg` or use the path to its installed binary.

If video conversion is needed, replace `-c:v copy` with `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30`, and apply the desired export dimensions as a video filter. Decode and verify the final AAC/H.264 export separately; its measurements need not equal the WAV's.

## Visual capture provenance

The final picture was recorded in the native T3 collaborative browser from the deployed [AI workflow studies](https://wpsydev.github.io/liquid-glass-kit/ai-design/?film=1), at a 720 × 1280 CSS viewport. The film controller drives the same working evidence, selection/edit and simulated agent controls available on the page. These are original interface studies with authored sample data; the film is not a recording of NotebookLM, Photoshop, Claude Code, or a connected model backend.

Native capture evidence ID: `28105162-0472-4705-8632-6b21d2e581a1-c556c01c-39da-446b-ad3d-7d937991637f-mp4`. Capture began on 10 October 2026 at 18:37:26.525 UTC, the controller started at 18:37:32.001 UTC, and the recording stopped at approximately 18:37:44.644 UTC. Recording initialization occurred asynchronously. The lead-in was trimmed by 1.947 seconds using the actual container length and controller-to-stop interval. Six sampled frames and the final frame were visually reviewed. The final seven missing output frames were filled by holding the real closing frame for approximately 0.233 seconds; no synthetic UI or generated video was inserted.

The compact export is [assets/ai-app-design-12s.mp4](assets/ai-app-design-12s.mp4): 871,048 bytes, 720 × 1280, square pixels, H.264 High / yuv420p, 30 fps, exactly 360 video frames (12 seconds). Audio is AAC-LC stereo at 48 kHz with the complete original groove. Container duration rounds to 12.02 seconds due to audio encoding. A complete FFmpeg decode succeeded; decoded audio measured −15.0 dBFS mean and −2.1 dBFS sample peak. These are sample-volume measurements, not LUFS or true peak.

Final MP4 SHA-256:

```text
1a9e2d70d930b34217b12be2936349e69a1cdd907265fe8a99e469497382ba79
```

The [opening X post](https://x.com/wpsygames/status/2108990703527195029) is live with this video. Public playback was observed advancing, readyState 4, with sound enabled and 99,973 decoded audio bytes. X's transcoded playback reported 12.053333 seconds. Seven connected posts, copy checks, public readbacks and responsive browser observations are recorded in [ai-design-thread.json](ai-design-thread.json). Publication and playback do not establish reach or virality.
