# Resource 21: Aceternity UI

Reviewed 2026-10-11 with Exa and native T3 preview. Two public interactive demos, their API documentation, official licence/terms, and primary transform/pointer guidance were inspected. No component code, paid block, template, photo, preview recording, MCP access, or CLI install was copied or used. Discovery returned four official candidates.

## Two actual interactive examples

- https://ui.aceternity.com/components/3d-card-effect documents a perspective container, card body, and independently translated/rotated child items. In the public live demo, a native pointer click over non-action card text triggered pointer entry; title, description, image and action layers acquired translateZ values of 50, 60, 100 and 20 px respectively. The outer perspective was 1000 px. The effect retains a real action link and button. This audit establishes layered depth activation, not every mousemove rotation trajectory or physical-device GPU performance.
- https://ui.aceternity.com/components/3d-pin documents a link card whose title appears on hover. The public demo had a 1000 px perspective plane, a resting card rotation of 0 degrees and a decorative pin/ring plane at 70 degrees. Keyboard-focusing its outer anchor left the card at its resting rotation; hover-equivalent focus animation was not observed. The rendered demo also contained a nested anchor. Do not reproduce that nesting or hide essential destination information behind pointer-only activation.

The useful effect is restrained spatial emphasis around an already useful object. It is not a reason to move every card, add accelerometer permissions, or hide controls until hover.

## Distinct independent feature

Add an optional tilt/depth controller on a dedicated authored wrapper: `attachGlassTilt(wrapper, { surface, layers, maxAngle, maxDepth, perspective, reducedMotion })`. The existing press spring changes scale/stretch; this controller adds a bounded pointer-relative 3D orientation and explicitly selected decorative depth layers. Reuse the existing spring primitives rather than adding Motion, React, or a second physics dependency.

Enable only when a fine hover-capable pointer deliberately enters the surface. Touch scrolling, native selection and controls must remain untouched. Do not use device orientation or require sensor permissions. Fine-pointer input can update a target; coarse pointer/reduced motion stays neutral. Essential labels, content and action links remain visible and keyboard-operable at rest. Keyboard focus may use a stable outline or small static emphasis rather than reproduce the entire pointer scene. No extra tabindex or role is needed merely to make decoration react.

Cache untransformed wrapper geometry on entry and invalidate it on actual scroll/resize changes; measuring the animated surface on each mousemove can create self-referential drift and layout cost. Clamp angles/depth and coalesce writes to a single active frame. Use finite spring settling on exit, cancellation and preference changes, then stop. Pointer cancellation, hidden documents, detachment and destroy must cancel work and restore owned styles/attributes without erasing authored transforms. A dedicated wrapper prevents transform ownership collisions with existing entrance/press controllers.

Glass layering needs a real structural boundary: preserve-3d does not survive every filter, opacity, isolation or paint-containment ancestor. Keep the perspective/depth stage outside the filtered/isolated material subtree and use sibling decorative layers where needed. Do not simply add preserve-3d to `.lg-glass` and claim genuine depth. A single restrained glass plane with a few original line-art/text layers is a better first implementation than a blur on every child.

An original showcase can use an instrument card, a small model card and a documentation specimen, with visible controls and a neutral mobile view. Demonstrate actual pointer interaction in one bounded recording tour. This differs from source 13 preview visibility, existing press deformation and source 08 finite particles: it adds optional spatial orientation, not new content or an endless effect.

## Primary guidance and performance

- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style lists grouping properties that flatten 3D descendants, including filter, opacity below 1, isolation, clipping and paint containment. The property is not inherited through arbitrary descendants.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/perspective explains the depth projection, stacking context and fixed-position containing-block side effects. Keep unrelated overlays outside the tilted subtree.
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events documents unified input, pointer types and cancellation. Decoration does not justify blanket pointer capture or disabling native gestures.
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html explains why nonessential interaction motion needs a reduction/disable path.

Avoid perpetual will-change/layer promotion, repeated layout reads, nested backdrop filters and uncontrolled angles that destabilize hit targets. Native CSS transforms can still create expensive compositing with large translucent surfaces; do not promise GPU acceleration makes them free. Validate keyboard/focus visibility, pointer leave/cancel, scrolling during hover, RTL geometry, nested transforms, reduced motion, narrow screens and mid-animation destruction. Benchmark active/settling frames and rest behavior separately, with explicit surface size and device/browser. Desktop emulation is not proof of physical phone or Safari rendering equivalence.

## Rights and access

https://ui.aceternity.com/llms-full.txt says components may be used in personal/commercial end products but not redistributed as a competing library. https://ui.aceternity.com/licence describes reuse in end products and prohibits source/marketplace redistribution and competing derivative template products; https://ui.aceternity.com/terms also reserves site material. The licence page is titled for Pro, while the public llms document applies the competing-library restriction to the advertised components. A separately proven open-source licence may govern an individual third-party dependency, but none grants blanket rights to Aceternity's demos/assets. Therefore independently implement the browser behavior and original designs; do not copy these component implementations into our open-source library or imply affiliation.
