# Comfort is a scoped choice

Optional `/material-preferences` exports pure `resolveGlassMaterialPreferences(requested, system)` and browser `attachGlassMaterialPreferences(scope, options)`. Import `/material-preferences.css` after `/material.css` for scoped presentation. Controls remain authored native selects, radios or buttons.

```ts
import { attachGlassMaterialPreferences } from '@wpsydev/liquid-glass/material-preferences';
import '@wpsydev/liquid-glass/material.css';
import '@wpsydev/liquid-glass/material-preferences.css';
const preferences = attachGlassMaterialPreferences(workspace, {
  onChange(state) {
    yourMotionController.update(state.motion);
    yourMaterialRenderer.update(state.material);
  },
});
// preferences.set({ motion: 'reduce', transparency: 'solid' });
// preferences.destroy() on unmount
```

Requested choices: theme system/light/dark, motion system/reduce, transparency system/solid. All default to system. The pure resolver has deterministic light/no-reduction defaults when system fields are omitted; pass explicit server knowledge when available. No browser or storage object is accessed on import.

Effective motion reduction combines manual reduce with the OS. Transparency reduction combines manual solid, OS reduction, increased contrast and forced colors. A system choice cannot force effects back on against a detected reduction. Theme system follows detected dark appearance; an explicit light/dark choice remains explicit. Reduced-transparency detection is not supported by every browser.

State is frozen and includes requested preferences, appearance, reducedMotion, reducedTransparency, contrastMore, forcedColors, plus material and motion adapter options. CSS coordinates known material/press presentation; it cannot stop arbitrary JavaScript animations, video or WebGL canvases. Forward effective policy to your existing controllers. A theme change still incurs style/paint work.

Attach to a connected browser scope. The handle exposes readonly state, set(partialChoices), reset(), clearPersistence():boolean, refresh(), destroy(). Set merges requested choices; reset returns all to system. Optional initial fields override only corresponding valid stored fields. Live media changes recompute policy, sharing the library's material environment. Call destroy on unmount to release listeners and conditionally restore owned attributes.

Nearest nested scopes supply their own policy. Explicit local widget appearance/backdrop and inline palette tokens remain authoritative. A solid request still removes known material effects, including on local palettes; forced colors uses the platform palette. Scope attributes are data-lg-material-preferences, data-lg-pref-theme, data-lg-pref-motion, data-lg-pref-transparency and data-lg-pref-forced-colors.

Persistence is absent by default. Opt in with both an explicit nonempty key of at most128 characters and a supplied getItem/setItem/removeItem storage object. The library never accesses localStorage itself. The version1 record is bounded to2,048 characters; invalid/unknown-version records are ignored and invalid fields cannot silently relax a mounted reduction.

Mounted instances sharing the same supplied object/key receive intentional writes. Native storage events are checked against storageArea and key; the host's actual storage implementation and browser origin rules remain authoritative. Denied reads/writes/removals report errors and leave memory usable. clearPersistence removes only the configured key and resets after successful removal; without configured storage it returns false. No unrelated origin storage is cleared.

onChange(state, reason) reports initial/user/reset/system/storage/clear. Synchronous callback/storage errors report onError(error, phase read/write/remove/callback) and lg-preferences-error. These are UI notifications, not an async save/consent/authentication engine. The host owns any remote preferences, forms, announcements and recovery.

[Side B](https://wpsydev.github.io/liquid-glass-kit/preferences/) has an original cover illustration, session-only note editing, a nested dark desk and a local peach palette. Native utilities choose theme/motion/transparency. Its host adapter applies motion policy to an actual finite220ms heading transition. Remember/Clear deliberately request only the demo's own settings key; note contents are never stored there. The cover is an original interface study, not an audio player or music service.

[Research](resource-series/research/15-footer.md). Native browser, payload and lifecycle records accompany this feature's release. Desktop viewports and supplied storage fixtures do not establish physical-phone, Safari, assistive-technology or actual cross-tab compatibility.

For one global manual choice, use one application scope or update each authored preference scope with that choice. Nesting is an independent policy boundary; a parent's manual reduction does not silently rewrite a child's requested settings. Detected OS reductions still apply to every scope.

Measured optional payload:2,335bytesgzipJS/847bytesgzipCSS, excludingmaterial.css. 3,200 connected sequential attach/set/refresh/reset/destroy operations across32scopes in5×20batches measured19.3ms median perbatch,0customRAF/JavaScript rectangles/following250msidleRAF and16,000balancedmediachange listeners. This excludesactualmotion/style/layout/paint andclaims no speedup. Generate the nativefixture with scripts/material-preferences-benchmark.mjs, then run scripts/material-preferences-browser-probe.js.

Fifteen native desktop Chromium light/dark/quiet ×five320–1440px viewports fit with44px targets/16px fields. Native note/caret84 survived policy updates andsaved in memory. T3light/dark mediaemulation updatedlive systempolicy; otherliveOSqueries/Safari/physicalphones/ATunverified. ExplicitMap storage success/sync/key-onlyclear/denials arefixtureevidence, notactualcrosstab persistence. [Payload](../benchmarks/material-preferences-payload.json) · [Controller](../benchmarks/material-preferences-browser.json) · [Native](../benchmarks/material-preferences-native.json).
