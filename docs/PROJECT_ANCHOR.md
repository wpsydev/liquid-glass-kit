# World points, human labels

Optional `/project-anchor` exports pure `projectGlassAnchor(options)`. It maps one world point through a host-supplied projection×view matrix into CSS-pixel coordinates. No Three.js dependency, camera, renderer, DOM query, observer, animation or occlusion engine is added. Import and calls are SSR-safe.

```ts
import { projectGlassAnchor } from '@wpsydev/liquid-glass/project-anchor';
const anchor = projectGlassAnchor({
  point: [0, 1, 0],
  viewProjection: hostProjectionTimesView,
  viewport: { width: sceneCSSWidth, height: sceneCSSHeight },
});
if (anchor.projectable && anchor.inFrustum) {
  // Host positions an ordinary HTML label at anchor.x / anchor.y
}
```

Supply a finite three-number world point and a finite16-element column-major matrix mapping[x,y,z,1] to clip space. Ordinary arrays, Float32Array and Float64Array matrices are supported; no property paths or camera inference. Match the renderer's projection×view order, coordinate handedness and actual camera state. A Three.js host can supply its composed matrix elements; another renderer can supply the same explicit math without installing Three.

Viewport width/height are positive CSS pixels up to1,000,000, never DPR-scaled canvas backing dimensions. Optional x/y are CSS-pixel origin in the host's chosen coordinate space, default0. Depth range defaults negative-one-to-one for WebGL-style clip z∈[−w,w]; explicitly choose zero-to-one for WebGPU-style z∈[0,w]. This choice describes matrix math and does not create a WebGPU renderer.

The frozen result supplies x/y or null, unremapped normalized-device depth, projectable, behindCamera and inFrustum. W≤0 is behind; unstable near-zero homogeneous divisors and unsafe/nonfinite output are unprojectable. Positive-W off-frustum coordinates remain finite and unclamped for inspection. Positive homogeneous matrix scaling retains ratios. depth is clip z/W, not physical distance or CSS z-index. Clip-volume membership is not mesh occlusion, DOM visibility, focus safety or a mobile-safe label-placement guarantee.

Recompute only when host point/camera/viewport changes. The host caches dimensions, positions ordinary HTML labels, bounds collision/gutters/clipping, chooses hidden/inert policy and preserves focus. Keep meaningful controls in HTML and decorative geometry separately aria-hidden. Hide a behind/off-frustum label deliberately without removing a focused control unexpectedly. An in-frustum point can still be behind a mesh or clipped by a DOM parent; an occlusion strategy remains explicit host work.

[Parallax](https://wpsydev.github.io/liquid-glass-kit/anchors/) draws an original three-form SVG assembly with the same host world-to-clip math as its ordinary HTML labels. Native yaw/FOV/point controls change real geometry and projected coordinates. Incomplete point drafts retain the last valid point; boundary/behind fixtures expose honest null/unclamped results. Host label gutters are separate from the pure projection result. The finite tour preserves explicitly chosen Quiet/Solid preferences; Solid uses an actual unprefixed no-filter fallback after CSS optimization.

16 focused tests;20 native responsive cases and20 actively painted screen-position checks across five320–1440px sizes retain44px targets,16px fields, no page overflow and no visible label clipping in this authored layout. Independent camera reference math differs by at most1.14e−13CSS-pixel/depth units; actual SVG dot screen positions differ below.000043px. Native ArrowRight yaw−16→−15, ArrowLeft FOV52→51, incomplete drafts, label identity and boundary/behind controls were checked. Physical phones, Safari and assistive technology remain unverified.

Optional pure helper1055bytesgzip. Separate probes:1024projections2.1ms median; host SVG/HTML pose authoring.425ms median. These are distinct CPU scopes, not render FPS, GPU elapsed, occlusion or comparative speedup evidence. The helper owns no geometry reads or scheduling; host rendering still has costs.

Original twelve-second swing-jazz138 upright-bass/brushes/woody-reed/vibraphone film uses a new melody and progression. Actual native finite poses change the host camera; disclosed camera framing keeps controls below834px and captions at882px. Full360-frame/audio decode and four reviewed states passed; export30fps is not appFPS.

[Native math/controls](../benchmarks/project-anchor-native.json) · [Painted screen checks](../benchmarks/project-anchor-screen-native.json) · [Benchmark](../benchmarks/project-anchor-benchmark-native.json) · [Research](resource-series/research/31-threejs.md)

Independent Three.js-inspired bridge to semantic HTML, without copied meshes, textures or mandatory 3D engine.
