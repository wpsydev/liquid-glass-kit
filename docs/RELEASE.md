Navigation should leave the next step to the person. **0.30.0-preview.1** adds optional `/disclosure-nav` and `/disclosure-nav.css`: one authored navigation tree with native disclosure buttons and ordinary links/forms.

One group opens at a time. Tab/Enter/Space stay native. Escape returns focus; nested native dialogs keep their own Escape handling. Outside/focus-leave closure preserves the new destination, and an explicit host breakpoint/fallback provides focus rescue. No menu roles, router, copied content, focus trap, body lock or idle frame loop.

[Long Way Library](https://wpsydev.github.io/liquid-glass-kit/navigation/) has original route artwork, grouped destinations, a native local planning form and an authored planning-notes dialog. Its finite 10.4s tour shows all three groups, then hides the host and returns focus to the opener. The attached original twelve-second electro/metal score is 144BPM.

Fifteen native desktop Chromium viewport/group cases fit 320–1440px with 44px controls and 16px fields. Native links, form submit, Tab/Escape, nested dialog Escape and a1440→390 breakpoint focus rescue were tested. Physical phones, Safari, zoom and assistive technology remain unverified.

Optional standalone JS2,727bytesgzip/CSS891bytesgzip. Five20-cycle32-group lifecycle batches had11.2ms median perbatch,6,400notifications and0customRAF/JavaScript rectangle reads/subsequentidleRAF. These measurements exclude menu animation/layout/paint and user navigation. Optional CSS uses a140ms reveal; no comparative speedup or FPS claim. Default core/CSS/imports remain unchanged.

[API](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/DISCLOSURE_NAV.md) · [Native evidence](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/disclosure-nav-browser.json) · [Research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/14-navbar.md)

The gallery inspired an independent navigation study. No external source, art, fonts or recordings copied. Use the attached ready-built archive or `npm i github:wpsydev/liquid-glass-kit#v0.30.0-preview.1`. npm registry publication remains pending.
