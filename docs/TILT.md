# A visual plane that responds, then settles

Optional `/tilt` exports `attachGlassTilt(host, visual, options)`. One direct, dedicated noninteractive visual child receives bounded perspective; controls stay on the stable host or outside that visual. There is no tilt stylesheet, sensor access, gyroscope, pointer capture or custom keyboard model.

```ts
import { attachGlassTilt } from '@wpsydev/liquid-glass/tilt';
const tilt = attachGlassTilt(nativeButton, decorativePlane, {
  maxAngle: 8, maxDepth: 8, perspective: 900,
});
// tilt.refresh() after geometry/visual structure changes
// tilt.update({ reducedMotion: true }) for an app preference
// tilt.destroy() during unmount
```

Attach to a connected stable host and one unowned same-document direct child. The child and its descendants must not contain interactive/focusable content. Keep the host untransformed for the intended coordinates, reserve transform and timing on the visual, and keep fixed overlays outside the projected subtree. A CSS transform transition must not compete with the spring. This is one visual plane, not a layered3D engine or free-GPU/compositing promise.

Options extend the existing shared spring: stiffness260 clamped20–1000, damping22 clamped1–100, mass1 clamped0.1–10. MaxAngle defaults8degrees clamped0–15, maxDepth8px clamped0–32, perspective900px clamped400–1600. ReducedMotion defaults false and combines with live OS reduction. Update replaces options, so omitted values return to defaults.

Only eligible primary mouse/pen hover under the actual fine-hover media gate starts projection. Entry measures the host; move packets reuse its bounds and coalesce into the shared spring's one active frame loop. Touch/coarse/pressed/disabled/inert/hidden/reduced states stay neutral. Native focus, keyboard activity and pointer presses neutralize the plane. Scroll clears hover and cached bounds; deliberately reenter or refresh. Resize can measure and retarget. No geometry polling or idle frame loop runs.

While projected, the visual suppresses its own pointer events so its moved pixels do not expand the native hit area. The host's role, label, href, click and keyboard behavior stay authored. Refresh validates the noninteractive structure; introducing a control there stops projection and rejects. An external inline transform or pointer-event owner ends the controller's writes. Original values/priorities restore conditionally at rest and destroy.

Browser serialization matters: after each owned style write, the controller records the actual CSSOM value and priority. Chromium can trim numeric zeros or round values. Comparing an intended string instead incorrectly abandoned a live visual, leaving it tilted through later quiet/focus changes. A normalization regression and actual native focus/quiet checks cover this behavior.

[Depth Objects](https://wpsydev.github.io/liquid-glass-kit/tilt/) contains three original SVG concepts. Native Orbit selects local notes, Atlas remains an anchor and Wave bookmarks only in this tab. The finite camera tour explicitly simulates mouse positions through the real controller and actual fine-pointer gate; it uses no sensors and ends at rest. Its three concepts are not a music player, notebook service or remote account.

Nineteen focused tests cover bounds, shared scheduling, events, conditional ownership, browser serialization and cleanup. Fifteen native desktop Chromium mode/viewport cases320–1440px fit with44px controls/associated labels and16px fields. Actual Shift+Tab reaches Orbit and neutralizes it; Enter on Wave changes the local bookmark; native Quiet clears transforms/pointer suppression. Synthetic101mouse packets scheduled1frame and1entry rectangle read. Synthetic touch from neutral schedules0frames. These fixtures do not establish physical hover/touch devices, iPhones, Safari or assistive-technology coverage.

Optional standalone IIFE2,736bytesgzip includes the shared spring. A32-host connected attach/explicit-refresh/destroy probe ran5×20cycles:3,200sequences,12.1ms median perbatch and3,200rectangle reads,0custom/idleRAF. It includes geometry reads and any induced synchronous style/layout, while excluding setup, spring animation and asynchronous paint. Separately, the actual tour's following300ms idle check had0RAF/rectangles. No comparative speedup, GPU-cost or appFPS claim. [Payload](../benchmarks/tilt-payload.json) · [Lifecycle](../benchmarks/tilt-browser.json) · [Native behavior](../benchmarks/tilt-native.json) · [Research](resource-series/research/21-aceternity.md).
