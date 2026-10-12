# Ordinary navigation, considered disclosure

Optional `/disclosure-nav` exports `attachGlassDisclosureNav(nav, options)`, `GlassDisclosureNav` and typed item/change/options contracts. Import `/disclosure-nav.css` separately for optional presentation. The helper coordinates one authored link tree; it does not supply a router, menu roles, copied desktop/mobile collections or a modal drawer.

```ts
import { attachGlassDisclosureNav } from '@wpsydev/liquid-glass/disclosure-nav';
import '@wpsydev/liquid-glass/disclosure-nav.css';
const navigation = attachGlassDisclosureNav(nav, {
  items: [{ id: 'guides', trigger: guidesButton, panel: guidesPanel }],
  responsiveQuery: '(max-width: 760px)',
  focusFallback: openNavigationButton,
});
// navigation.destroy() when unmounting
```

Attach to a connected browser host with 1–32 unique, disjoint pairs. Each trigger is an authored native type=button; each panel is ordinary contained same-document content, without dialog/popover ownership. Preserve visible links before enhancement. IDs are nonempty whitespace-free strings up to 128 characters; existing panel IDs must be document-unique. Missing IDs are generated. A pair must not be shared with another controller or nested inside another pair.

Defaults closeOnFocusLeave true and closeOnOutside true. Only one group opens at a time. Native Enter/Space activate its button; Tab stays ordinary through links and fields. No custom arrow key, roving tabindex, hover dependency, focus trap or body lock. The helper writes aria-controls/expanded and hidden while attached; conditional restoration preserves later host attribute edits.

The handle has readonly openId, open(id):boolean, close():boolean, refresh(), update(fullReplacementOptions), destroy(). Unknown/unavailable IDs do not open. Refresh closes an unavailable/hidden presentation and reapplies current visibility; call it after host visibility, disabled-state, membership or layout changes. There is no automatic visibility observer.

Escape inside the active trigger/panel closes and restores a visible controlling button. Nested native modal/popover Escape remains with that context. Focus leaving navigation closes without stealing its new destination. Outside click preserves the newly clicked control; if focus would remain inside hidden content, a visible trigger/fallback rescues it. Author the fallback as a connected, focusable control and keep it visibly available.

An explicit responsiveQuery up to 240 characters declares the host breakpoint. Matching marks compact presentation; a change closes the group. Host CSS must use the same policy. If the host hides the whole tree, call refresh and provide focusFallback; the host also rescues focus from its own closed triggers/ordinary links. The controller does not infer arbitrary CSS transitions or observe every descendant. MatchMedia support is required when that query is configured.

Update validates a full replacement before detaching the old pairs. Content is not replaced or reparented. onChange({openId,reason}) reports trigger/api/escape/focus-leave/outside/responsive/refresh/update/destroy; errors dispatch lg-nav-error with original error and phase change. Notifications do not execute navigation, booking, authentication or permissions.

Optional CSS has 44px controls, 16px fields, an ordinary scrollable desktop panel and static compact groups. Its entrance is a finite 140ms opacity/4px translation; OS reduced-motion, transparency and forced-colors fallbacks remain. Hosts own palette, placement, breakpoint layout and opaque preferences. This is independent web geometry, not Apple's private rendering.

[Long Way Library](https://wpsydev.github.io/liquid-glass-kit/navigation/) has original route artwork, ordinary anchor links, three disclosure groups, a real local planning form and a separate authored native dialog. Form submission makes a page-session preview, not a booking. Its finite 10.4s tour ends by hiding the host while a field owns focus; the visible opener receives focus.

Fifteen native T3 desktop Chromium viewport/group cases fit 320–1440px with 44px controls and 16px fields. Actual Tab/Escape, nested dialog Escape, native anchor navigation, native form submit and 1440→390 breakpoint focus rescue were checked. Physical phones, Safari, zoom and assistive technology remain unverified.

Optional standalone JS is 2,727 bytes gzip, CSS 891 bytes. Five batches of 20 cycles over a connected 32-group controller measured 11.2ms median per batch and 6,400 notifications, with no custom RAF, JavaScript rectangle reads or following idle RAF. This includes visible-control computed-style checks, but excludes menu animation/layout/paint and actual user navigation. No comparative speedup. Generate `/tmp/lg-disclosure-nav-probe.html` with `node scripts/disclosure-nav-benchmark.mjs`; run `scripts/disclosure-nav-browser-probe.js` in that native fixture.

[Research](resource-series/research/14-navbar.md) · [Payload](../benchmarks/disclosure-nav-payload.json) · [Native evidence](../benchmarks/disclosure-nav-browser.json). No gallery/destination source, branding, fonts, assets or recordings reused.
