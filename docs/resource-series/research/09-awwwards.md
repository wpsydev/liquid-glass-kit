# Resource 09: Awwwards

Reviewed 2026-10-11 with Exa and native T3 preview. Public inspiration entries inform independent interaction patterns; award scores do not establish performance, accessibility or conversion.

## Two concrete public references

- https://www.awwwards.com/inspiration/seamless-page-transition-unikorns-agency credits Unikorns and links https://unikorns.agency/showcase/acorn-property-invest/. Its public approximately 13-second video is presented as continuity between case-study views, with navigation motion carrying visual context.
- https://www.awwwards.com/inspiration/portfolio-navigation-transition-peakn-film credits Corentin Magnetti and describes a portfolio-navigation transition from Peak'n Film. This is a public motion reference, not implementation source or a browser performance result.
- https://www.awwwards.com/websites/animation/ and the site's Elements collections separate interaction excerpts from full awarded websites. Paid courses and market products were not accessed.

## Distinct independent feature

Provide an optional native View Transition bridge, such as `transitionGlassView(update, { document, reducedMotion })`, plus a safe shared-surface naming recipe. Existing whole-element WAAPI enter/exit helpers do not provide old/new DOM state continuity. The new bridge should execute the host update exactly once, use native snapshots only when supported and permitted, expose update/finish/skip results and retain a direct-update fallback.

Use named shared surfaces and original list-to-detail or editor-preview examples, with short motion and stable semantic controls. Host applications retain routing, persistence and focus decisions. Unsupported APIs and reduced-motion preferences should update directly rather than block the interaction. Do not claim cross-document routing support from a same-document wrapper.

## Lifecycle and performance

Handle callback rejection, concurrent requests, skip, duplicate transition names and teardown without retrying a consequential update. A native transition failure does not justify calling the host update twice. Use bounded 180–300ms effects and no idle animation work or runtime engine dependency. Native snapshots have memory/paint costs; measure update time, snapshot readiness and completion separately at stated viewport/DPR/element counts. Do not describe native transitions as automatically faster than other implementations.

## Primary technical sources

- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition
- https://drafts.csswg.org/css-view-transitions-1/ (current editor's draft; normative API work in progress)

Element-scoped APIs and cross-document transitions have separate support/behavior boundaries; detect the API actually used. Importing the optional module must remain safe during SSR; browser access belongs inside invoked operations.

## Access and rights

https://www.awwwards.com/terms/ reserves gallery content rights and retains featured-site ownership with creators. No gallery video, screenshot, font, art or paid code was copied. The proposed implementation and showcase assets must be original. Public media observations are separate from unit/browser/assistive-technology validation of our implementation.
