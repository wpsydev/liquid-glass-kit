# Liquid Glass on the web: where CSS ends and refraction begins

Liquid Glass is an appealing request for a web interface, but it hides several different requirements. A floating toolbar should look translucent, stay readable over content, react to input, and perhaps bend the background near its edges. A single blur declaration solves only part of that brief.

While building Liquid Glass Kit, I separated the portable material from the experimental optical path. This lets an application choose its integration and visual cost without tying ordinary controls to a particular rendering engine.

## Start with the right layer

Apple's design presentation treats glass as a floating control and navigation material. That helps explain why an entire glass table often feels less successful than one glass toolbar above a solid table. Hierarchy matters more than the number of transparent panels. Clear glass is a special case for a controlled media background; it needs careful treatment of foreground content. [Apple's Liquid Glass presentation](https://developer.apple.com/videos/play/wwdc2025/219/)

For a web application, start with a semantic element. A navigation surface remains a nav; an action remains a button. Visual materials should not take responsibility for focus management, dialog dismissal, or menu keyboard behavior when those are already supplied by native elements or a headless component library.

## The portable CSS material

`backdrop-filter` processes the image behind a surface. Ordinary `filter` processes the element's own rendered output. That difference matters: putting an optical filter on a whole control can distort the label you wanted to keep sharp. Backdrop sampling also depends on the ancestor tree, so a parent filter, opacity effect, or mask can explain why a recipe behaves differently in a real application. [MDN's backdrop-filter reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)

Our portable tier combines a tinted fill, blur, saturation, a luminous edge, and soft depth. The optical pseudo-element sits behind the foreground content inside the surface's stacking context. When backdrop blur is unavailable, an opaque surface supplies a readable fallback. That is a material approximation, with no claim to reproduce Apple's complete renderer.

## Giving the edges a lens

A displacement map is an image whose channels encode how to shift source pixels. SVG's feDisplacementMap can read red and green as the horizontal and vertical displacement components. Values near the midpoint are approximately neutral. [MDN's displacement primitive](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap)

The interesting question is which map to generate. We use a rounded-rectangle distance field and its local gradient to emphasize edge normals. The central region stays neutral. This avoids making every pixel under a large panel swim in the same way as its rim. The map is a stylized lens, not a physical optical simulation.

The controller regenerates a bounded map when dimensions or configuration change. It does not need a permanent animation loop. Foreground labels stay outside the optical filter.

Live SVG backdrop filtering remains an experimental Chromium enhancement in this preview. Parsing a CSS URL filter tells us the syntax was accepted; it does not prove that the compositor produced the expected pixels. We expose the requested path, preserve the portable default, and document the unverified cases.

## Why a canvas is a separate product decision

A GPU renderer can build more elaborate optics when the app owns its input image or video texture. WebGL provides rendering through canvas, with hardware and resource-management considerations. It is not a turnkey API for sampling the already composited DOM behind a control. That observation is an architectural inference from the API's rendering model. [MDN's WebGL overview](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)

For an ordinary app, capturing or duplicating the background adds another system to maintain. An explicit media renderer may be worthwhile later; it should not become a hidden requirement for a basic navigation surface.

## Preferences belong in the material

Readable defaults still need validation over the application's actual background. Translucency cannot guarantee contrast over every image. Reduced transparency also needs an explicit application setting, because the corresponding browser preference query has limited availability. [MDN's reduced-transparency reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency)

The library offers solid mode, contrast/forced-color/print styles, and reduced-motion behavior. Pointer highlights do not move the hit target. Native dialog semantics remain native dialog semantics. These decisions make the material easier to use responsibly, but they do not replace testing with real content and assistive technology.

## Make integration easy to inspect

The same core powers HTML styling, React/Vue adapters, and a Svelte action. Typed options and lifecycle cleanup are more valuable than a long list of wrappers with divergent behavior. Agent-readable documentation spells out exact imports, defaults, unavailable features, and rendering limits; it gives a coding agent enough information to choose the portable path without inventing an API.

[Try the live playground](https://wpsydev.github.io/liquid-glass-kit/) or [read the implementation](https://github.com/wpsydev/liquid-glass-kit). The preview needs more real Safari, Firefox, and iOS evidence, and reproducible integration feedback is welcome.
