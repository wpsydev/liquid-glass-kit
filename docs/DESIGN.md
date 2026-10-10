# Designing useful glass interfaces

Liquid Glass Kit supplies a material and optional motion. A coherent interface still needs a real task, content, hierarchy and interaction behavior. Apply this contract when creating a page or widget with a coding agent. The [GitLab UI review](UI_RESEARCH.md) explains the selected references and dependency decisions.

## Begin with the product

Choose one concrete user task before choosing decoration: browse a collection, save an item, adjust a setting, or compose a message. Give that task the most prominent control. Choose content with specific names, meaningful metadata and believable lengths. Describe what a button does in its label, and make every presented action work or clearly disclose its demo scope.

A useful demo shows state changes the user can understand: a saved item appears in Saved, a selected collection changes the content, and an opened detail can be dismissed. A decorative icon that looks clickable needs an actual interaction or should be ordinary decoration. Avoid fake counts, testimonials, integrations or performance claims.

## Establish a visual system

Use a restrained palette with a readable foreground, a quiet solid reading surface, and an accent assigned to a purpose. Differentiate content with layout, typography and relevant imagery rather than wrapping every element in a rounded card. Keep body copy readable and relative to the user's text settings. Large type belongs to a primary heading; small metadata should supplement, rather than carry, the whole task.

Choose a small spacing scale and apply it consistently: 4px within small details, 8px between related controls, 16px between groups, and 24–32px between sections are useful starting points. Use rem values where appropriate; these are design starting points, not required exported tokens. A list can use alignment and separators instead of repeated card containers.

Use one consistent icon family. Icons need a specific purpose; hide decorative SVG from assistive technology and label icon-only native buttons. Do not choose arbitrary Unicode symbols as a substitute for an icon system. Keep a stable visual distinction between primary, secondary, selected, disabled, hover, pressed and focused states.

## Place the glass deliberately

Use one small floating glass layer for navigation, a player, a toolbar or a contextual control. Keep long reading content and dense forms on solid surfaces. Inside the glass layer, use ordinary fills for selection; avoid glass nested inside glass. Regular material with zero refraction remains the default. Clear glass needs controlled media and strong foreground contrast.

Coordinate corners with their container and inset using `getGlassInnerRadius`; do not apply a capsule radius to every component. `corner: 'continuous'` remains an optional independent CSS enhancement. Round corners remain the fallback and the geometry used by the experimental optics paths. Large photos and lists need not inherit a floating toolbar's radius.

The material owns `::before` and `--lg-*`; use a wrapper when the host's styling already uses them. Preserve the app's chosen component library, semantics and typography. See [API.md](API.md) for supported fields; these design suggestions do not introduce new exports or preset names.

## Make motion explain the action

Use brief opt-in press springs and a moving selected backing to show input and state. Keep the animation's amplitude modest in a reading interface. An enter/exit transition can explain where a detail appeared; it must not delay reaching its controls or leave an interrupted exit hiding a reopened surface.

Do not add idle wobble, cursor-following cards, animated counters or decorative particles to ordinary widgets. Promotional recording can choreograph actual interactions; the usable page needs a static, quiet default. Preserve system reduced-motion preferences and an explicit quiet option where useful. App code still owns focus, visibility, dismissal and semantics.

## Review an actual interaction

Before shipping, check that the primary action works with touch and keyboard, selected states remain understandable without color or motion, focus remains visible, disabled controls do not activate, and overlays dismiss and return focus correctly. Keep native buttons, inputs, links and dialogs, or use the host's already accessible primitives.

Check at least a narrow portrait layout, a short landscape layout and a roomy desktop layout. Enlarge text, use long labels, and ensure content and controls do not collide. Native hit targets should meet the 44×44 CSS-pixel project convention, with space between neighboring controls. Keep scrolling and zoom; see [MOBILE.md](MOBILE.md) for safe-area, viewport and keyboard limits.

Inspect solid and quiet modes on the actual content. Check contrast over the demonstrated background, rather than assuming a transparent material can guarantee it. Record the browser engine and viewport exercised. Resized Chromium provides reflow evidence; it does not establish physical iPhone Safari, Android, assistive-technology or device-performance coverage.

## A useful agent handoff

Include the chosen task, content vocabulary, the one intended glass layer, semantic controls, spacing/type choices, expected selection/save/overlay behavior, and the acceptance checks. Request one polished complete flow before multiplying component variants. Read the app's existing design system and keep it; installing this material should not replace its component framework.

Example brief:

> Build a reading collection with a clear title and readable solid content. Put collection selection in one floating glass toolbar. Use native labeled controls; selecting a collection changes the visible items, and Save adds an item to Saved. Reuse our existing typography and icon family. Add subtle opt-in press and selection springs; make quiet and solid modes work. Check 320px portrait, short landscape, desktop, enlarged text, keyboard focus and dismissible detail before adding more effects.
