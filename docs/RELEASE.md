Things fall into place. **0.46.0-preview.1** adds optional `/sequence`.

Bounded noninteractive visual tracks share native WebAnimations timing, with real Play/Pause/Seek/Cancel and conditional authored transform/opacity restoration. Native controls/editing stay outside visual layers. Quiet/hidden/ownership guards preserve host app state; no business callback, navigation action or JS frame clock runs at timeline offsets.

[Offbeat](https://wpsydev.github.io/liquid-glass-kit/sequence/) coordinates six original shapes, pauses/seeks real native effects and endsquiet while retaining its draft. The twelve-second original126BPM chamber-pizzicato film records actual finite states; seek readout is explicitly event-sampled.

22focusedtests;40desktop cases320–1440px44/16/noflow. Native sharedstarttime/pause/seek1150/resume/importantbaseline/externalowner/unrelatedanimation/hidden/controlinsertion/focus verified. Phones/Safari/ATunverified.

Optional3149gzip.100connected2-tracksetup/seek180/cancel/destroy cycles median~.20/p95~.30ms at~.1clockresolution; includescomputedstylebaselines/native setup/writes/cleanup.0JSRAF/rect/retained effects/250idle work. Activepainting/compositor/GPU/FPS/speedupunmeasured. Heldpose guards still observe changes.

[API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/SEQUENCE.md) · [Native evidence](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/sequence-browser.json)

Use ready-built archive or `npm i github:wpsydev/liquid-glass-kit#v0.46.0-preview.1`. npmregistry pending. Independent Anime.js-inspired finite motion without required engine.
