# Fast microinteraction showcase

[The twelve-second MP4](assets/micro-motion-showcase.mp4) records the deployed [one-screen studio](https://wpsydev.github.io/liquid-glass-kit/micro-motion/?film=1) through the native T3 collaborative browser. Four directional reveals, save confirmation and a gentle validation cue use the real `attachGlassTransition` helper and native buttons. All content is authored local sample state, with no connected backend.

Capture evidence ID: `28105162-0472-4705-8632-6b21d2e581a1-a4da9c32-4036-4932-9453-72096b08d0de-mp4`. Recording began at 2026-10-10T20:12:05.248Z; the real film controller started at 20:12:05.395Z. The recording completed at 2026-10-10T20:12:24.268Z. Native capture: 1,697,166 bytes, 1256×2234 H.264 Baseline, variable cadence, approximately 18.22 seconds. The source preserves the real browser output; its first twelve seconds were exported, with no synthetic UI or generated video. The browser's film finished with all four surfaces visible, saved=true, checks=1 and no active Animation objects.

Export: **720×1280**, square pixels, H.264 High/yuv420p, **360 frames at 30 fps / 12 seconds**, AAC-LC stereo 48 kHz at 160 kbps. Container duration is 12.02 seconds due to audio encoding. The complete video/audio stream decoded successfully. Twelve one-second source samples were reviewed for initial state, all four reveals, confirmation/error content, replay and closing CTA. Normalizing the capture to 30 fps is an export setting, not a measured device-performance guarantee.

File size: **518,869 bytes**. SHA-256:

```text
7a1843ab56e789496632d227a149dc3b426ca8cb121e04d542f22803b494ecc6
```

The score reuses the repository's original six-bar **120 BPM** bass groove from [render-ai-design-beat.py](../../scripts/render-ai-design-beat.py). Every tone/percussion event is synthesized; there are no borrowed samples, voices or stock tracks. The generator and soundtrack are offered under MIT. Reproduce the WAV with `python3 scripts/render-ai-design-beat.py`. WAV SHA-256: `df97d08f2cfd5cbaa39193499f6eb4c52b08bc7e39573d7fb95bd9d3c4ddeaac`; 576,000 stereo frames at 48 kHz / 12 seconds. See [AI_DESIGN_MEDIA.md](AI_DESIGN_MEDIA.md) for composition provenance. Decoded export audio: −15.0 dBFS mean and −2.1 dBFS sample peak, not LUFS or true peak.

Music is only in the campaign clip; the actual app does not autoplay sound or animate indefinitely. The demo respects explicit/system reduced motion. Browser checks are documented separately from unit tests in [VALIDATION.md](../VALIDATION.md).

The [three-post X thread](https://x.com/wpsygames/status/2109015324276465803) is live. Public processed playback reported 12.053 seconds, readyState 4, unmuted audio, advancing currentTime (2.699 seconds in the saved readback) and 964,027 decoded audio bytes. The short links were resolved to the intended demo, research and release pages. The [0.8 preview release](https://github.com/wpsydev/liquid-glass-kit/releases/tag/v0.8.0-preview.1) includes the MP4 and installable archive. Exact copy, publication and playback receipts are in [micro-motion-update.json](micro-motion-update.json); no reach or listener-engagement result is implied.
