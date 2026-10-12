# Resource 15: Footer Design

Reviewed 2026-10-11 with Exa and native T3 preview. The public gallery, its Info page, two individual entries, linked live sites, and primary browser guidance were inspected. No account, invitation, form submission, copied assets, or private reference library was used.

## Two concrete public examples

- https://www.footer.design/sites/trove links https://trove.quest/. The gallery records a flat, bright, large-type/minimal treatment added October 9, 2026. The live site has a distinct final invitation section and a small actual footer with Terms, Privacy, copyright, a social link, and a native button labeled Switch between light and dark. Desktop footer text is 11 px; its layout changes from a stacked flex arrangement to a two-column grid. The inspected theme button's hit box was 30 px high, which should not become our phone default. The root had a light class and light color scheme. A click did not establish a reliable theme change in the paused/background preview, so the observed presence and semantics of the control are stronger evidence than its unverified runtime behavior.
- https://www.footer.design/sites/nothin links https://www.noth.in/. The public footer presents a large contact heading, a calendar link, a real `mailto:hello@noth.in` anchor, social destinations, a phone number, and named creator credits. Its footer is positioned relative, not an always-floating layer. A separate cookie panel offers Decline and Accept and explains audience/advertising measurement. This is evidence of separated utility/consent controls, not a reusable licensed consent implementation or proof of regulatory compliance.

Both examples distinguish a page-ending action from quiet utility information. Gallery style labels are inspiration categories, not guarantees about the present source or usability.

## Distinct independent feature

Add an optional material-preference controller that a footer utility group can expose, for example `attachGlassPreferences(root, { initial, storageKey, onChange })` with pure typed preference resolution available without a browser. Suggested user choices are theme `system | light | dark`, motion `system | reduce`, and transparency `system | solid`. Do not offer a default that forcibly restores motion/transparency against a user's reduction request.

The controller resolves user choices with OS preferences, applies documented scoped attributes or CSS tokens, exposes the resolved policy to `onChange`, and releases media/storage listeners on destroy. Native selects/radios/buttons remain host-authored, labeled, at least 44 px high in the showcase, with 16 px input text. Include a Reset to system action; avoid an unlabeled icon whose state is impossible to inspect.

Persist only when the host opts in with an explicit key. Validate a small versioned data shape, ignore malformed or unknown stored fields, catch denied/quota-limited storage, and never clear unrelated origin storage. Update other mounted instances/tabs through the appropriate event path if persistence is enabled. Default to in-memory behavior. Do not read global browser/storage objects at import time; SSR output can use a deterministic authored theme and CSS system-preference fallback.

This complements current `getGlassCapabilities` and shared media detection, rather than duplicating them. Capability hints describe what the browser may render; this feature coordinates an explicit user's material choices. Existing JavaScript motion/scene controllers need their documented update options wired through the resolved `onChange` policy. Merely setting a root CSS attribute must not be advertised as stopping every JS animation automatically. Likewise a solid-surface option must actually remove the relevant backdrop filters and set opaque backgrounds in the documented stylesheet scope, not only change a decorative toggle.

An original showcase can place a small preference group beside contact/legal links and demonstrate a glass workspace becoming solid, motion becoming quiet, and light/dark text remaining readable. Keep preferences separate from marketing analytics, cookie consent, authentication, or publishing. Do not claim contrast certification from theme selection.

## Primary guidance and performance

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/footer documents the footer's contextual semantics. A footer inside a section does not automatically become the page's contentinfo landmark; provide the correct document structure.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme documents the system theme preference and its interaction with embedded content.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency explicitly marks this query limited/experimental across browsers. A manual Solid surfaces choice is therefore useful, but not proof that OS preferences are detected everywhere.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion documents reduction preferences. Forced-colors behavior must use the platform palette rather than force a decorative glass theme.
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage documents persistence, origin boundaries, and SecurityError when persistence is blocked. Storage is not universally available merely because a browser exposes the property.
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html explains status changes that should be available to assistive technology without moving focus; announce a deliberate preference change concisely, not every media-query event.

Use a fixed small set of change listeners, no polling and no idle RAF. Serialize small preference data only on intentional changes. Reuse the library's media environment where appropriate; avoid registering duplicate listeners for every individual widget. A theme change can invalidate paints across the whole page, so do not sell it as free or animate all background/filter/text properties. Test blocked storage, invalid stored data, system changes, forced colors, explicit reduction, destruction/restoration, nested scope boundaries, first render, and narrow-screen input affordances. Desktop viewport emulation is separate from real mobile assistive-technology validation.

## Rights and access

https://www.footer.design/info identifies the gallery as a spare-time project by Benten Woodring, Devin Fountain, and Matt Cram, with a logo by Fons Mans and work associated with NOOON. No public source/assets license was established. Trove's https://trove.quest/terms describes invite-only access, rights retained by users, private reference/research use, and limits on redistribution; its public footer states all rights reserved and its page attributes third-party work. Nothin's brand artwork, recordings, fonts, and creator assets are separate copyrighted material. Independently write every controller, design token, icon, and demo; do not reproduce screenshots or content libraries. Exa discovery returned four candidates and the two chosen gallery destinations were verified live.
