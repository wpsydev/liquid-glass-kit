# Performance release media

The twelve-second video records the actual native T3 collaborative browser rendering the production-bundled `/performance/` studio with 100 attached glass surfaces. Its saved figures come from `benchmarks/browser.json` and `benchmarks/package.json`; it does not animate an invented FPS race or load-time result. Elapsed timing excludes fixture construction and painting. Library payload counts include the obsolete maps removed in 0.9; client JS grew slightly.

The finite sequence highlights static resource allocation, saved elapsed-time medians, CSS-first usage and the repository. It stays quiet after replay. The recorded viewport is 720×1280 CSS pixels; export is 1080×1920, 360 H264 frames, square pixels, yuv420p, exactly twelve seconds. The export rate is not a device performance measurement. Resize/browser validation is separate from unit tests and physical mobile testing.

Music is the original six-bar, 120 BPM synthesized score from `scripts/render-ai-design-beat.py`, using no external recordings or samples. The source WAV SHA-256 is `df97d08f2cfd5cbaa39193499f6eb4c52b08bc7e39573d7fb95bd9d3c4ddeaac`. It is regenerated locally and remains ignored. The last approximately21ms are trimmed before AAC encoding so the complete container is exactly12seconds; decoded peak is −2.1dBFS.

Export command (replace RAW with the native recording path):

```sh
ffmpeg -y -ss 0.20 -i RAW -i docs/campaign/assets/ai-design-beat.wav -t 12 \
  -vf 'scale=1080:1920:flags=lanczos,setsar=1,fps=30,format=yuv420p' \
  -af 'atrim=duration=11.978667' -c:v libx264 -preset medium -crf 20 \
  -c:a aac -b:a 160k -ar 48000 -map_metadata -1 -movflags +faststart \
  docs/campaign/assets/performance-showcase.mp4
```

SHA-256 and browser/release/post receipts are recorded in `performance-update.json`. Sampled frames and full audio/video decoding passed before upload. Public processed playback must be checked separately; X may pad its rendition.
