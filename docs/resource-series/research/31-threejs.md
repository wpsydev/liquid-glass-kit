# Resource 31: Three.js

Reviewed 2026-10-11. Official renderer/vector/manual documentation, two actual native live examples, and official license. No Three.js source, textures or example artwork copied; no engine dependency added.

## Actual examples and APIs

- [CSS2D labels](https://threejs.org/examples/css2d_label.html) has Earth/Moon name and mass labels as HTML over a WebGL canvas. Native inspection found four label elements translated in CSS pixels and a 2560×1600 backing canvas at a 1280×800 CSS viewport. Clicking Toggle Name hid the two names while mass labels remained; active frames continued moving the Moon label. This proves independently selectable HTML label layers, not pixel-perfect occlusion or a power benchmark.
- [CSS3D periodic table](https://threejs.org/examples/css3d_periodictable.html) had 118 HTML element cards and no canvas. Clicking SPHERE changed their matrix3d transforms from the initial arrangement to spatial orientations. Table/sphere/helix/grid are layout choices, not justification for making every ordinary form a 3D scene. No table data, design or typography copied into our demo.
- [CSS2DRenderer](https://threejs.org/docs/pages/CSS2DRenderer.html) supports translation/2D rotation and optional z-index sorting, and is an explicit addon. [CSS3DRenderer](https://threejs.org/docs/pages/CSS3DRenderer.html) transforms DOM but cannot use Three.js geometries or material system. Both docs explicitly limit their renderers to 100% browser/display zoom. Do not inherit a broader support claim.
- [HTML alignment manual](https://threejs.org/manual/en/align-html-elements-to-3d.html) distinguishes 3D text, text textures and ordinary selectable HTML. It projects world points into normalized device coordinates, converts them to CSS viewport pixels, and treats object occlusion as a separate raycasting problem.

## One distinct optional feature

**World-space HTML anchor projection** for glass labels, inspectors and real controls over a host 3D scene. Current scene surfaces and overlay geometry are 2D DOM bounds; they do not project 3D points. This helper should not be another renderer, camera control or material implementation.

Suggested pure `projectGlassAnchor({ point: [x,y,z], viewProjection: readonly number[16], viewport: { width, height }, depthRange: 'negative-one-to-one' | 'zero-to-one' })` returns `{ x, y, depth, inFrustum, behindCamera }`. Document column-major matrix layout, coordinate handedness supplied by the host, CSS-pixel dimensions and explicit WebGL/WebGPU clip-depth convention. Multiply before perspective division, handle nonpositive/near-zero W, reject nonfinite inputs and avoid NaN style output. Tests should use known identity/perspective cases, behind-camera points, frustum edges and non-square viewports, rather than mirror implementation arithmetic.

An optional `getGlassAnchorProps(projection, { anchorX, anchorY })` can produce a bounded dedicated-wrapper translate and data state. Host applies actual hidden/inert/focus policy and optional raycast occlusion. Projection cannot tell if geometry is covering a point; do not name inFrustum as visibility or treat z sorting as physical occlusion. Focused controls must not disappear silently during orbiting; provide a stable inspector/list alternative. Text stays selectable, buttons stay native, content and interaction do not become canvas pixels.

Three.js integration reads an already calculated camera projection × view matrix and world point; a short optional recipe can describe this without importing Three.js. Other 3D engines can supply the same finite matrix. No browser globals are needed in the projection helper, keeping the core SSR safe. Do not install camera controls, global resize handlers or animation loops merely by importing it.

## Technical/performance boundaries

- [Vector3](https://threejs.org/docs/pages/Vector3.html) documents matrix application with perspective division and projection concepts.
- [Rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html) explains why continuous rendering wastes power for static scenes and how to coalesce invalidations. This helper should update only when camera, object or viewport changes.
- [Disposal guide](https://threejs.org/manual/en/how-to-dispose-of-objects.html) makes GPU and shared texture lifetime explicit; a label helper must never dispose host-owned scene resources.

Projection is O(n) simple arithmetic, but hundreds of HTML glass labels can still create expensive filter/paint/compositor work. Cap visible labels in demos and use one frame/DOM-write batch, reusable projection buffers when warranted, no repeated getBoundingClientRect for each label, and no GPU readback for occlusion. Anchor targets use CSS dimensions rather than DPR-scaled backing dimensions. Page zoom, nested transforms, viewport resize and mobile geometry need independent browser tests; do not claim the native reference's 100%-zoom limitation has automatically been solved.

The framework owns only helper results or explicit attached wrapper state, not cameras, meshes, textures or controls. Under reduced motion, hosts should freeze decorative auto-orbit while allowing intentional navigation. Preserve a solid material/ordinary HTML fallback when GPU content is absent.

## Rights/access

[Official license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) is MIT, copyright 2010–2026 Three.js authors. Individual example models, fonts and media have separate provenance; do not assume the engine license covers all gallery assets. Public docs/live examples needed no account. Original math, UI and demo assets are proposed; no code/art downloaded for reuse. Brief private recordings only allowed background animation to settle and are not release footage. Observations are one native Chromium viewport, not FPS, memory or iPhone validation.
