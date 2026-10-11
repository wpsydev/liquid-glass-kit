An activity island keeps agent work in view without taking over the page. **0.17.0-preview.1** adds optional `/activity-island` and `/activity-island.css` for host-owned sessions, permission commands, file diffs, questions, plans and prompts.

Native controls, responsive sizing, Escape/focus restoration and preserved editor nodes make it useful in ordinary web applications. Promise guards deduplicate submissions and reject stale proposal nodes; request identity/revision is supplied to host callbacks. The host still owns authorization, execution, uploads, persistence and authoritative validation. This is presentation UI, not a connected AI runtime.

The original RELAY study demonstrates six scenarios with working local host callbacks. No command runs or files change in the demo. It is independently inspired by NotchGate's public activity hub; no reference code, mascot, assets or footage were reused.

The optional standalone controller measures **4,797 bytes gzip**, and its separate stylesheet **1,995 bytes gzip**. Five native Chrome 152 batches of 100 mount/update/destroy cycles measured median 15.3ms, with zero custom RAF requests or rectangle reads. These are synchronous lifecycle samples, not rendering FPS or an application speedup comparison. Root imports and default material CSS remain unchanged.

[Try RELAY](https://wpsydev.github.io/liquid-glass-kit/island/) · [API and host responsibilities](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/ACTIVITY_ISLAND.md) · [Raw lifecycle samples](https://github.com/wpsydev/liquid-glass-kit/blob/main/benchmarks/activity-island-browser.json) · [Reference investigation](https://github.com/wpsydev/liquid-glass-kit/blob/main/docs/resource-series/notchgate.md).

The release includes an original 12-second film with an original 132BPM UK garage score. Browser responsive/interaction validation is separate from unit tests; physical iPhone/Safari and screen-reader certification are not claimed.

Install the ready-built archive attached to this prerelease, or `npm i github:wpsydev/liquid-glass-kit#v0.17.0-preview.1`. npm registry publication remains pending.
