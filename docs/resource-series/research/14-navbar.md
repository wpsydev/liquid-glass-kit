# Resource 14: Navbar Gallery

Reviewed 2026-10-11 with Exa and native T3 preview. The gallery, two individual entries, linked live sites, its navigation articles, and primary accessibility/browser guidance were inspected. Captured gallery metadata must not be treated as a current implementation audit.

## Two actual examples and a data-quality warning

- https://www.navbar.gallery/navbar/velt classifies Velt as a SaaS mega menu and labels it Webflow. https://velt.dev/ now presents product, solution, and resource groups with many categorized links, separate pricing/docs links, and a clear primary action. Live desktop triggers are real buttons, around 37 px high, with `aria-haspopup` but no observed `aria-expanded` or `aria-controls`. Many descendants use ARIA menu roles. At a 390 px emulated viewport, the desktop groups disappear and a 40 px Open menu button controls `nav-mobile-drawer`; clicking it changes its accessible label to Close menu, sets expanded true, and exposes categorized links. Its mobile document width was 375 px with no horizontal overflow. These are observations, not an endorsement of every semantic choice or a physical-phone accessibility test.
- https://www.navbar.gallery/navbar/cloudflare also describes a SaaS mega menu and labels it Webflow. https://www.cloudflare.com/ currently contains Astro islands, desktop product/solution/resource links, and separate search/login/mobile controls. At the same emulated width its menu button was 40 px high with expanded false, alongside search and login; document width was 375 px without overflow. A native click did not produce a reliable open-state change during this audit, so mobile drawer behavior is not asserted. No ARIA menu roles were found in the initially inspected page.

The gallery homepage's entry labeled Asana linked to `escape.cafe/fr` during inspection. This is a concrete reason to verify destinations instead of treating labels or platform tags as authoritative.

https://www.navbar.gallery/blog/what-is-a-mega-menu discusses grouped links, restrained callouts, responsive collapsible alternatives, and load cost. Its claimed user-experience benefits are editorial recommendations, not measured results for our library. https://www.navbar.gallery/blog/sidebar-navigation distinguishes stable app navigation from a crowded top bar.

## Distinct independent feature

Add an optional semantic navigation-disclosure group controller: `attachGlassNavigation(nav, { groups: [{ trigger, panel }], closeOnFocusLeave, singleOpen, onChange })`. Use authored native buttons and normal anchor/list structures. The implementation owns visibility and expanded state, not routing, authentication, arbitrary remote content, or a full modal drawer. Existing composition CSS can style desktop columns and mobile stacks; existing overlay geometry can position an optional dropdown without a new positioning dependency.

Enter/Space activate each native button. Tab remains normal through all exposed links; do not assign menubar/menuitem roles or intercept every arrow key for ordinary website navigation. Opening one group closes a previous group when configured. Escape closes the group and returns focus to its controlling button if focus was inside it. Leaving the navigation closes transient groups without stealing the new focus. Hidden panels must not retain tabbable descendants. Document-click closure must distinguish clicks in a panel/trigger from outside clicks.

Prefer one content tree with CSS-driven layout over duplicate desktop/mobile link collections. A mode change must close incompatible presentations and avoid leaving focus in hidden content; only restore focus to a genuinely visible control. A separate native-dialog mobile drawer remains a scoped integration recipe, not an automatic consequence of a disclosure helper. Preserve authored attributes/styles on destroy, avoid global shortcuts, and leave links visible and usable before enhancement or without JavaScript.

This differs from source 13: a preview adds optional supporting context on pointer/focus intent, whereas navigation disclosures reveal actual destinations and need explicit group/expanded-state coordination. A source-14 showcase can use an original small documentation/product navigation with desktop categories and a narrow-screen inline accordion.

## Primary guidance and performance

- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/ explicitly explains why typical site navigation does not need ARIA menu roles. It documents Tab, Enter/Space, Escape, focus-leave behavior, and optional arrow-key support. Its example is illustrative and explicitly requires assistive-technology testing before production reuse.
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ defines native activation and expanded/control relationships.
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries supports component-width adaptation, subject to containment requirements and fallback layout.
- https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver documents resize-loop pitfalls. Do not continuously measure every navigation link or drive a CSS layout breakpoint through a feedback loop.
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html applies to sticky bars/dropdowns covering focused content.

Use event-driven state, finite transitions, and one optional change/resize observation; no scroll or idle RAF loop. Animate opacity/transform on one panel when appropriate rather than continuously changing every link's geometry or blur. One shared glass panel keeps filter cost bounded. Test repeated open/close, outside clicks, focus-leave, Escape, viewport changes with focus inside, 320 px layout, long localized labels, zoom/reflow, reduced motion, and cleanup. Do not promise better navigation metrics without user research.

## Rights and access

The public gallery offers screenshots/videos and a submission form, not a licensed reusable navigation implementation. No applicable open-source license or public legal/source link was established from the inspected gallery footer/navigation. Velt and Cloudflare branding/assets/source are separate rights holders. No submission, account, downloads, copied implementation, or paid service was used. All feature code, icons, copy, and demo assets should be original.
