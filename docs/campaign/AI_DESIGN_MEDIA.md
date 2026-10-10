# AI app design showcase soundtrack

This note documents the original music for the 12-second AI app design showcase. The final browser capture and combined video can be documented here after capture and muxing.

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

The parent task owns the native T3 browser capture and final mux. Append the final video path, capture route, exact duration and dimensions, and verified public post URL here after those steps complete. This soundtrack note does not establish that a video or post has already been published.
