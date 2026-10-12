# Host-owned quality decisions

`createGlassQualityGovernor` is an optional pure policy over timing samples supplied by your app. It requests one of your ordered quality labels; it does not sample a clock, render, change pixels, observe the DOM or start an animation. The module is safe to import during SSR and has no runtime dependencies.

Import the optional entry when using a package release that declares it:

```ts
import {
  createGlassQualityGovernor,
  type GlassQualitySample,
} from '@wpsydev/liquid-glass/quality-governor';

const governor = createGlassQualityGovernor({
  levels: ['economy', 'balanced', 'full'], // lowest to highest host budget
  kind: 'frame-cadence',
  targetMs: 16.67, // an explicit chosen cadence budget, not inferred device capability
});

let appliedLevel = 'full';

function observe(sample: GlassQualitySample, applyHostTier: (level: string) => boolean) {
  const decision = governor.sample(sample);
  // The host decides whether/how to apply a request to its own renderer.
  if (decision.level !== appliedLevel && applyHostTier(decision.level)) {
    appliedLevel = decision.level;
  }
  return { decision, requestedLevel: decision.level, appliedLevel };
}

observe({
  kind: 'frame-cadence',
  milliseconds: 17,
  time: 100, // caller's monotonic observation time in milliseconds
  visible: true,
  valid: true,
}, () => false); // this example host declines renderer changes
```

The callback's result is your host's bookkeeping, not confirmation performed by the library. Keep actual applied settings inspectable and validate the real renderer separately. A policy request alone changes no CSS, Canvas2D or WebGL configuration. Preserve readable material, semantic controls and effective motion/transparency preferences when choosing budgets.

## Timing kind and ownership

Choose `frame-cadence` for intervals between host-observed animation frames. Such intervals include scheduling, refresh limits, CPU work and the host's renderer. They are not GPU elapsed duration and cannot prove that lowering pixel count makes a page faster.

Choose `gpu-elapsed` only for actual completed elapsed GPU measurements collected and checked by your host. The policy does not create GPU timer queries. Mark unavailable, incomplete or disjoint measurements invalid; handle unsupported GPU measurement with a separate explicit host policy. A mismatched timing kind is rejected and clears evidence. Recreate the governor when changing kinds or configuration; do not mix their histories or relabel cadence as GPU duration.

`time` is a host monotonic observation timestamp, not a required Date or wall-clock value. Supply `visible`, `valid` and optional `interrupted` explicitly. Warmup, compilation, source/workload changes and pauses can be inappropriate evidence. Reset at actual viewport, context or host workload boundaries; the caller owns sampling lifecycle and any timers/frames. The core creates none.

## Configuration

| Option | Default | Bounds |
| --- | --- | --- |
| `levels` | required | 2–8 distinct ASCII labels, 1–32 characters; lowest to highest |
| `kind` | required | `frame-cadence` or `gpu-elapsed` |
| `targetMs` | required | finite 0.1–1,000 milliseconds |
| `initialLevel` | highest label | one supplied label |
| `windowSize` | 30 | integer 4–120 samples |
| `downgradeWindows` | 2 | integer 1–8 |
| `recoveryWindows` | 8 | integer 2–32, greater than downgradeWindows |
| `cooldownMs` | 2,500 | integer 0–60,000 milliseconds |
| `maxGapMs` | 1,000 | integer 1–60,000 milliseconds |

Each nonoverlapping eligible window stores at most `windowSize` observations. Pressure requires a mean strictly above 1.15× the target and at least 75% of individual samples strictly above that threshold. Headroom requires a mean strictly below 0.65× the target and at least 90% below it. Other windows are neutral.

By default, two consecutive pressure windows request exactly one lower label; eight consecutive headroom windows request one higher label. Neutral or opposite windows reset the streak. At the lowest/highest boundary, the policy holds and clears the adaptation streak. This hysteresis avoids treating an isolated slow frame as sustained pressure; it is not a device capability classifier.

Automatic changes start cooldown. In automatic mode, accepted cooldown samples advance observation time but are discarded as adaptation evidence. Recovery must gather fresh sustained evidence afterward. In manual mode, bounded diagnostic windows can still be reported while adaptation stays locked.

## Samples and decisions

`sample({ kind, milliseconds, time, visible, valid, interrupted? })` returns a frozen decision with `action`, `reason`, `accepted`, `previousLevel` and the current state. Durations must be finite, positive and at most 60,000ms. Time must be finite, nonnegative, at most Number.MAX_SAFE_INTEGER and strictly increasing.

Rejected values clear adaptation evidence. A well-formed new monotonic timestamp still advances the watermark when its measurement is rejected. Equal/backward/invalid timestamps cannot rewind it. A gap greater than maxGapMs rejects that boundary sample; the next suitable observation starts fresh evidence. Invalid flags, hidden pages, interrupted/invalid measurements and kind mismatches are explicit reasons. Non-plain objects, unknown keys, accessors or malformed configuration throw; do not pass untrusted objects without a host boundary.

`state` exposes requested `level`, `locked`, `kind`, partial-window and streak counts, `lastTime`, sampled cooldown remaining, latest complete `evidence` and historical `lastAction`. Evidence records source kind, count, observation times, mean/min/max, threshold counts and classification. A new collecting/hold decision does not overwrite the historical last action. Do not replay a host effect merely because lastAction remains present. Frozen snapshots are inspectable advisory data, not renderer receipts.

## Manual hold and reset

`lock(level)` requests an explicit supplied level, clears adaptation evidence and holds it against automatic changes. The host still owns applying that level. Calling lock with the already locked level holds without another action.

`unlock()` keeps the current requested level, discards evidence and starts cooldown at the next usable observation. It does not return to the previous automatic tier or replay old samples. `reset(level?)` clears the observation domain/evidence, keeps the current level by default and starts cooldown at the next usable observation. A manual hold persists across reset. Resetting to a different level while locked throws without changing history; release the hold first.

## Demo and evidence

The Current study keeps seven deterministic synthetic presets separate from a fresh, explicitly started six-second native browser run. Presets use short four-sample windows and synthetic durations for inspection. Native runs use actual requestAnimationFrame timestamp differences and the production 30-sample window defaults. Neither measures GPU elapsed duration.

The host applies its own bounded Canvas2D strand/segment/pixel recipes and reports requested versus applied levels. Declining the mapping leaves the renderer at its actual old tier. The demo resets live evidence only when actual artwork dimensions change, preserving its manual hold. A finished/quiet-cancelled run schedules no further frame; starting again creates a fresh context.

Scoped evidence lives in `benchmarks/quality-governor-*.json`; film provenance is in `docs/campaign/QUALITY_GOVERNOR_MEDIA.md`. The original optional standalone build measured 5,837 minified bytes / 2,275 gzip bytes. Its pure sample CPU benchmark excludes creation, DOM, Canvas, scheduling, layout, paint and GPU. It is not npm tarball size, loading time or a before/after speedup. Rebuild/check the actual release artifact before publishing measurements. Desktop Chromium viewport tests do not verify physical phones, Safari or assistive technology.
