# Glass Workbench

[Open the coding workspace](https://wpsydev.github.io/liquid-glass-kit/workbench/).

The 0.14 showcase uses glass around a readable editor, terminal sessions, a live surface and diagnostics. System UI fonts use `-apple-system`, `BlinkMacSystemFont` and platform fallbacks; code uses `ui-monospace`, `SFMono-Regular`, Menlo and Consolas. No Apple font files are downloaded. Windows, hierarchical titles, restrained color and stable controls draw on [Apple's window guidance](https://developer.apple.com/design/human-interface-guidelines/windows) and [typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography). The design is independent, not an Apple renderer or native macOS app.

## Reusable framework additions

`/tabs` is a dependency-free, SSR-import-safe optional entrypoint. It leaves root imports and the portable default stylesheet unchanged. `/workbench.css` is a separate optional stylesheet: `.lg-workbench` scopes system fonts, accent and focus styling; `.lg-code` selects system monospace; `.lg-tag` styles compact labels; `.lg-field` styles native text fields with a brief focus transition. Native popovers within `.lg-workbench` get a short reveal. Reduced motion removes transitions/reveals; forced colors uses system colors. No perpetual animation or external font request.

```html
<div role="tablist" aria-label="Files" id="files">
  <button id="code-tab" role="tab" aria-controls="code" aria-selected="true">Code</button>
  <button id="notes-tab" role="tab" aria-controls="notes">Notes</button>
</div>
<section id="code" role="tabpanel" aria-labelledby="code-tab">
  <label for="source">Source</label><textarea id="source"></textarea>
</section>
<section id="notes" role="tabpanel" aria-labelledby="notes-tab" tabindex="0" hidden>Notes</section>
```

```ts
import { attachGlassTabs } from '@wpsydev/liquid-glass/tabs';
import '@wpsydev/liquid-glass/material.css';
import '@wpsydev/liquid-glass/workbench.css';
const tabs = attachGlassTabs(document.querySelector('#files')!, {
  activation: 'automatic', orientation: 'horizontal', loop: true,
});
tabs.select('notes-tab', true); // select + focus; returns false for missing/disabled
console.log(tabs.selectedId);  // string | null
// update replaces options; call it after changing a tab's disabled state.
tabs.update({ activation: 'manual' });
// Host unmount cleanup; restores owned attributes and removes listeners.
tabs.destroy();
```

Defaults: automatic activation, horizontal orientation, arrow wrapping. Arrows, Home and End move focus; Enter/Space activate. Horizontal RTL reverses left/right navigation; vertical uses up/down. Horizontal up/down keys remain available for scrolling. Disabled/aria-disabled tabs are skipped. Selection emits a bubbling `lg-tab-change` CustomEvent with `{ id, previousId }`, only when selection changes. `previousId` can be null. All-disabled sets have no selected panel; `update()` can recover when a tab is enabled.

Following [WAI-ARIA's tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), author a labelled `role=tablist`, unique same-document tab ids, and unique `aria-controls` pointing to separate panels outside the list. Add `tabindex=0` to panels whose first meaningful content isn't focusable. The controller manages roving tab indices, aria-selected, orientation, panel role/label links and hidden. It restores their captured values on destroy, including `hidden=until-found`. It does not animate geometry, fetch content, trap focus, close tabs, or own browser history. Static membership: destroy and reattach after adding/removing tabs. One controller per list. Pair `/indicator` with the selected tab for moving visual backing; listen to `lg-tab-change`. React/Vue/Svelte hosts mount this controller and destroy it on cleanup; no new adapter prop or peer requirement.

Use existing `/overlay` for native popover placement, `/motion` for press feedback, and `/micro-motion` for a short surface pulse. Keep visibility, dismissal and focus in semantic controls. The showcase adds no terminal/editor dependency to library runtime imports.

## Real browser commands, scoped editing

The demo has a CodeMirror CSS editor, syntax diagnostics from the Lezer CSS parser, two focused rules (misspelled `border-raduis` and `transition: all`) and fixes for those two rules. [CodeMirror's lint integration](https://codemirror.net/examples/lint/) separates editor diagnostics from the rule provider. This demo is not ESLint, Stylelint or comprehensive CSS conformance checking. Syntax errors remain after known fixes. Checks stop with an explicit warning above 64,000 characters. The editor retains normal Tab navigation; no indent keymap traps focus. Diagnostics link back to source offsets.

Two terminal histories share one in-memory workspace. Supported commands: `help`, `ls`, `cat surface.css`, `cat README.md`, `lint`, `fix`, `tokens`, `branch [name]`, `theme`, `split`, `clear`. Output is bounded to 100 lines/12,000 characters per terminal; history to 50 commands. `branch name` retains separate in-memory edits. It is not a Git worktree, operating-system shell, installation, build service or remote execution. Reload loses edits. No supplied code is evaluated; token preview accepts only bounded numeric corner/padding values and six-digit hex accent colors. Other CSS is editable but isn't injected into the page. The palette supports filtering, arrows, Enter, native Escape/outside dismissal, and Ctrl/Command-K.

The optional 12-second tour demonstrates lint, fixes, live corner changes, token inspection, an in-memory branch and theme. It stops on hide or a live reduced-motion preference and can be stopped manually. Reduced-motion starts show fixed code without a timed tour. Notifications carry no installation/deployment claim.

## Cost and validation

The built tab module is 3,630 bytes raw / 1,467 bytes gzip, optional widget CSS 2,010 / 865 bytes. These are individual artifacts, not aggregate app transfer sizes. Default material/aggregate styles and root API have no workbench additions. The CodeMirror/Lezer editor uses site-only dev dependencies and separate dynamic chunks; demo tools warm after 250ms or a user action. Editor chunks are substantially larger than the core additions: see the production build evidence in `benchmarks/workbench.json`. Splitting postpones their load; it does not remove their bytes.

A native T3 Chrome 152 desktop fixture selects among 12 tabs 1,000 times per run, after 100 warm selections, for five runs. Median total submission time: 8.1ms; raw runs 7.3,18.7,10.4,7.0,8.1ms. Instrumented calls: zero requestAnimationFrame and zero getBoundingClientRect. Selection leaves one visible panel and destroy restores attributes. This measures synchronous controller submissions, excluding paint/compositing, focus work and editor behavior. It is not presented FPS, physical-device latency, cross-browser performance or a before/after speedup. [Raw report](../benchmarks/workbench.json).

Unit tests and native browser checks are recorded separately in [VALIDATION.md](VALIDATION.md). Browser layout checks cover 320×568,390×844,568×320,768×1024 and1280×800 CSS viewports in the desktop preview; they do not emulate an iPhone Safari engine or virtual keyboard.
