# Resource 36: 3dicons

Reviewed 2026-10-12. Actual public icon pages/HTML metadata, legacy and current catalog descriptions, official repository license and W3C control guidance. No icon bitmap, Blender project, Figma file or site code copied. Native preview remained unavailable.

## Two concrete public examples

- [Folder](https://3dicons.co/icons/176980-folder) is associated with the [v1 collection](https://3dicons.co/collection/b68cf8-v1). Public page HTML exposes CC0, Colors and Angle sections. Related file/folder thumbnails carry 160×160 dimensions, lazy loading and async decoding. No asset URL was downloaded. This is a prerendered icon resource, not a live Blender/WebGL material.
- [Map pin](https://3dicons.co/icons/1858b9-map-pin) explicitly exposes CC0 and the same v1 collection. Its page has color/clay/gradient style selectors and camera-angle choices, with related pin/location/settings thumbnails. Public HTML includes small preview artwork for premium promotion, but that is not a permission to copy paid pack contents. Selection interactions were not browser-tested while native preview was unavailable.
- [Legacy catalog](https://old.3dicons.co/) describes four styles, three camera angles and 120 unique icons yielding many rendered variants. [Current about](https://3dicons.co/about) describes initial CC0 icons modeled in Blender and rendered at different angles/styles, and distinguishes the initial version. Current catalog also advertises premium offerings. Match camera/light/style across an app; a physically inconsistent mix can look less coherent than a simple vector set.

## One distinct optional feature

An original **native icon action toolbar**, an inference from the icon resource combined with primary W3C guidance. A useful icon library does not automatically make icon controls accessible. Current dock magnification, content tabs and disclosure navigation do not provide a compact context-action toolbar with a single keyboard entry and explicit labels.

Suggested `attachGlassToolbar(root, { label, orientation, direction, wrap })` provides roving focus for explicitly supplied existing native buttons/links, `refresh()`, and `destroy()`. Arrow keys move among usable controls, Home/End reach edges, and Tab enters/exits one remembered stop. Directionality and vertical orientation are explicit; do not steal arrows needed by numeric/text/range controls. Native Enter/Space/click activation remains unchanged. Host owns real actions, aria-pressed state, menu/dialog semantics, loading and disabled state. Arrow movement never invokes an action.

An optional `getGlassIconActionProps({ label, pressed, disabled })` describes a real button with an accessible name and stable toggle semantics. Artwork inside an already labelled action is decorative, not a second name. Images keep explicit dimensions and empty alt; no hidden duplicate controls or image-only clickable divs. An informative standalone icon has meaningful alt/text instead. Existing field/image/feedback helpers can supply visuals rather than reimplement their logic.

Keep at least 44px targets and visible focus, preserve readable text/tooltips through existing preview-intent support, and provide labels/text fallback for forced colors or failed artwork. Roving focus is appropriate for three or more related actions; ordinary small button groups can keep their usual Tab behavior. Do not add a toolbar role while leaving every child tabbable and arrows unhandled. Cap item count, skip hidden/inert/non-owned elements, define disabled discovery policy, and restore original tabindex/role/attributes on destroy. Dynamic updates must not unexpectedly steal focus from outside the toolbar.

## Primary guidance and performance

- [W3C Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) covers grouped controls, one Tab stop, arrow navigation, orientation, optional Home/End and conflicts with text/spin/range input keys.
- [W3C Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) distinguishes command, toggle, menu and link actions. Stable toggle labels pair with aria-pressed; a label that changes from Mute to Unmute describes a different pattern.
- [Native img](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) supports bounded decoded art and explicit loading policy; a 3D icon does not need an imported 3D renderer.
- [CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/) does not provide third-party trademark/patent/publicity permission or endorsement.

The toolbar needs event handlers only, no idle RAF or continuous camera tracking. Prefer one glass group surface, rather than a backdrop-filter and animated shadow on every icon. Reuse the existing finite motion layers for deliberate press/selection feedback. A few raster renders can be smaller/faster than loading a model/shaders, but image bytes/decode still matter; benchmark actual shipped choices rather than assume vector/raster/3D rankings. No catalog pack or full asset index belongs in the core. Attachment is explicit, uses ownerDocument, cleans up and stays SSR import-safe.

Validate keyboard focus, hidden/disabled/dynamic items, preserved native activation and teardown, then test mobile/forced-colors/screen readers independently. A familiar icon shape and W3C-inspired implementation do not certify accessibility. Public downloads counts are the site's own counters, not our adoption evidence.

## Rights/access

[Official develop-branch license](https://github.com/realvjy/3dicons/blob/develop/LICENSE) is CC0 1.0; the main-branch LICENSE URL did not exist. Current about and v1 page evidence support initial v1 artwork reuse, not an unqualified license for every new premium product or third-party logo. No download/purchase/pack extraction occurred. This feature and its fixtures are independently implemented/drawn; source links document inspiration without implying partnership. No live interaction or performance claim is made for this resource while preview was unavailable.
