# Additional reference: NotchGate

Reviewed the public web demo and https://github.com/PrajsRamteke/NotchGate on 11 October 2026. NotchGate is a macOS 14+ agent activity hub; its web demonstration simulates sessions. The public repository API returned no recognized license and no root LICENSE was found. We reused no source, mascot, assets or recordings.

The useful pattern is an activity hub spanning permission commands, file diffs, choice/free-text questions, plan approval/revision, completion prompts and multiple project sessions with model/context/usage metadata. These become host-supplied web presentation states, not an AI execution engine.

The reference's desktop idle region measured 196×34px and permission panel 460×244px. Fresh 390px layouts fit a 366px panel; resizing an already-open panel to 320px retained that width and clipped horizontally. Primary actions were 32px high and prompt text 13px. The island was a nonfocusable div with a broad live region; Escape did not collapse the pending question during our audit. Reference morphs animate dimensions/radii/shadows; this is a potential layout/paint concern, not a measured FPS regression.

Our independently implemented activity island uses a named nonmodal disclosure, native controls at least 44px tall, 16px text fields, responsive host-bounded width, vertical content scrolling and a short opacity/translate entrance. Escape collapses without resolving the proposal and restores focus. Metadata updates preserve the editor node and selection. Callback deduplication, revision identity and stale-node checks improve host integration, but authoritative validation remains on the host/server.

Lifecycle benchmark files separate synchronous controller work from rendering, blur paint, network, execution and physical-device behavior. The implementation has no custom frame loop or geometry polling. Optional image attachments perform metadata checks only; uploads and content validation belong to the host. A hydration reminder or other agent may supply ordinary host sessions without needing a copied mascot or idle animation loop.

Primary accessibility references: [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), [WCAG target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). These guide behavior; this library does not reproduce native Apple rendering.
