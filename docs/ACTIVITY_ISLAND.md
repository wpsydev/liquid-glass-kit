# Activity island

An optional, nonmodal disclosure for host-owned agent sessions. Independently inspired by NotchGate's public activity hub; this is web UI, not a native macOS agent or an execution service.

```ts
import { mountGlassActivityIsland } from '@wpsydev/liquid-glass/activity-island';
import '@wpsydev/liquid-glass/activity-island.css';

const island = mountGlassActivityIsland(host, {
  snapshot: {
    activeSessionId: 'app',
    sessions: [{
      id: 'app', title: 'Atlas', status: 'attention',
      request: {
        kind: 'permission', id: 'check-1', revision: 3,
        title: 'Run the checks?', command: 'npm run check',
      },
    }],
  },
  onAction: async action => {
    // Your service must revalidate session, request ID and revision.
    // Replace this example transport with your authenticated host adapter.
    await submitToYourService(action);
  },
  onPrompt: async ({ sessionId, text, files }) => {
    await submitPromptToYourService({ sessionId, text, files });
  },
});
island.open();
// A host event replaces the complete session snapshot.
island.update({ sessions: nextSessions, activeSessionId: 'app' });
// Clean up during route/unmount teardown.
island.destroy();
```

The illustrative transport functions above belong to your application. Without callbacks, submit controls are unavailable. Importing the module is safe during SSR; mount it only on a browser element after hydration. React/Vue/Svelte effects can mount and destroy the same DOM controller. Do not let a renderer also own the controller's appended subtree.

## Host state and requests

A session has a unique nonempty `id`, `title`, and status `working | attention | idle | complete | error`. Optional `model`, `context`, `usage`, `summary` and native progress `{value,max,label?}` are display data. The library does not calculate model costs or connect to an AI provider.

Every request has `id`, finite numeric or string `revision`, `title` and optional `description`:

| Kind | Data | Actions |
| --- | --- | --- |
| `permission` | `command` | allow once, deny |
| `diff` | `files: {path,before,after}[]` | approve, deny; expandable comparison |
| `question` | optional `choices: {id,label}[]`, `allowText` | answer with choice ID and/or text |
| `plan` | `steps: string[]` | approve, request revision |

`onAction` receives `{sessionId,requestId?,revision?,action,answer?}`. Actions are `approve | deny | answer | revise | select-session | dismiss`. Answers carry optional `choiceId` and `text`. Request identity is omitted for session selection/dismissal. The host owns authorization, execution, persistence, diff validation and authoritative state changes.

Promise callbacks are guarded against duplicate submissions and stale render nodes. Success means submitted to the host, not executed or approved by a server. A failure exposes retry. Change the revision when a proposal changes. Host metadata updates retain focused editor nodes and text selection; replacement requests protect against stale proposals.

`onPrompt` receives `{sessionId,text,files}`. Attachments are disabled unless `attachments` is provided. Defaults are three images, 5 MiB each and 15 MiB total; configurable hard caps are ten images, 20 MiB each and 50 MiB total. PNG/JPEG/WebP/GIF/AVIF metadata is checked. The host must validate bytes, permissions, upload and storage; the library uploads nothing.

## Lifecycle and presentation

`update(snapshot)` replaces the session list. `update(options)` merges options and can include a replacement `snapshot`; attachment limits are copied. `open()`, `close()` and idempotent `destroy()` control the disclosure. The host's other children remain intact. No global shortcut, geometry polling, animation frame loop or automatic input focus is installed.

A native button exposes `aria-expanded` and a named region. Escape from the panel collapses it without resolving a request and restores focus. Session selection uses native buttons; questions use labeled native radios/textareas. Narrow screens keep the island within its host and scroll long panel content vertically. Controls are at least 44px tall and text fields 16px.

The stylesheet uses bounded 200ms opacity/translate entrance, system fonts, solid fallback, reduced-transparency/forced-colors rules and reduced-motion CSS. `reducedMotion:true` disables interaction transforms/entrances explicitly. The panel is not a modal; use a native dialog for a blocking task. Backdrop blur has a paint cost even without JavaScript frames. No Apple pixel match or universal phone certification is claimed.

[Original browser study](https://notchgate.netlify.app/) · [Source investigation](resource-series/notchgate.md). No reference code, mascots, assets or recordings are reused.
