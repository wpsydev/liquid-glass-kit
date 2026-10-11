# Command palette

An optional native modal command interface for host-owned actions. Import the controller and its stylesheet separately; it adds no root import or default CSS cost.

```ts
import { mountGlassCommandPalette } from '@wpsydev/liquid-glass/command-palette';
import '@wpsydev/liquid-glass/command-palette.css';

const palette = mountGlassCommandPalette(host, {
  label: 'Project commands',
  shortcut: true, // explicit opt-in; default false
  maxResults: 20,
  commands: [
    { id: 'notes', label: 'Open notes', group: 'Navigate', onSelect: () => openYourNotes() },
    { id: 'theme', label: 'Switch theme', keywords: ['color'], onSelect: () => switchYourTheme() },
  ],
});
openButton.addEventListener('click', () => palette.open());
// Replace catalog and invalidate old result nodes/async UI completion.
palette.updateCommands(nextCommands);
// Unmount cleanup, removing only the appended dialog.
palette.destroy();
```

Example callbacks belong to your application. Importing is SSR-safe; mount after hydration on a connected browser host. Requires native `HTMLDialogElement.showModal`; opening gives a clear error where unsupported. Keep an ordinary navigation/action fallback if supporting older browsers. React/Vue/Svelte lifecycle effects can mount/destroy the same DOM controller; do not also render its owned subtree.

## Command catalog

Commands have unique nonempty `id` and `label`, plus optional `description`, `group`, `keywords`, display-only `shortcut`, `revision`, `disabled` and `onSelect`. Individual callbacks override the optional global `onSelect(command)` callback. A missing callback makes a command unavailable. Display hints never bind command shortcuts or execute anything.

Searching uses cached, accent-insensitive normalized text. Every query term must match some catalog text; matches preserve grouped display order. `maxResults` defaults to 20 and clamps 1–100; the catalog remains host-owned and all entries are searched. Large catalogs still incur normalization/search cost. Query input is limited to 1,000 characters.

Callbacks run only after explicit user selection. Pending operations block duplicate activation, show status and keep the input read-only; failures preserve a retryable palette. Closing does not abort a host operation. Catalog replacement invalidates saved result nodes and old completion UI; it cannot undo already-started host work. Revalidate revision/permissions in the host before privileged work and manage cancellation there.

## Keyboard and focus

The labeled input is an editable combobox with an active descendant; grouped results form its listbox. ArrowUp/Down wrap through enabled options without moving input focus. Home/End select boundaries only when the query is empty; Ctrl+Home/End select boundaries with a nonempty query, while ordinary text editing and Shift selection remain native. IME/default-prevented key handling is preserved.

Enter activates the current command. Escape/backdrop/Close close the native modal and restore the invoking control when still available. The results list and options are excluded from Tab navigation; Tab/Shift+Tab cycle between the two owned controls, search and Close, without intercepting browser modifier shortcuts. This avoids Chromium's implicit scroll-container Tab stop. One native scroll-to-nearest occurs on keyboard result movement; there is no per-frame geometry polling.

`shortcut:true` binds Mod+K only outside editable fields. The default installs no global shortcut. It respects composition, repeated/default-prevented keys and modifiers. Give phone users a visible native open button rather than relying on a keyboard shortcut.

## Presentation and limits

CSS uses 44px minimum buttons/input and 16px text fields, responsive width and safe-area padding. Its brief 180ms opacity/translate entrance honors system reduced motion and initial `reducedMotion:true`; reduced transparency and forced colors retain usable controls. The native modal owns top-layer/inert semantics. No Apple pixel match, universal browser/phone support, execution service or automatic accessibility certification is claimed.

Methods: `open()`, `close()`, `updateCommands(commands)`, idempotent `destroy()`. Options are initial configuration; recreate the controller to replace options. Use a dedicated application host; other existing children are preserved.

[Cutroom](https://wpsydev.github.io/liquid-glass-kit/commands/) uses original art and working local actions. [Research](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/research/03-vibeprompts.md) credits the public prompt-catalog inspiration. No reference code, assets or execution behavior was copied.
