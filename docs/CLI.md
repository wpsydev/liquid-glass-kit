# Read-only CSS command

The optional Node command uses the same parser and three configured checks as the browser workbench: CSS grammar errors, the `border-raduis` typo, and a warning for `transition: all`. It is not a complete CSS, accessibility, security or browser-support validator. A clean result means only those configured checks passed. Unknown properties generally remain unchecked.

The browser material entrypoints do not import this parser or Node code. The developer command bundles the MIT-licensed Lezer CSS, common, LR and highlight packages; all four notices ship in `dist/cli.LICENSE.txt`. There are no runtime package dependencies or shell commands executed by the checker.

Build from this repository with its development dependencies already installed:

```sh
npm run build
node dist/cli.js lint styles/surface.css --root . --format text
node dist/cli.js lint --stdin --name surface.css --format json < styles/surface.css
```

The package declares a `liquid-glass` binary for an explicitly installed package artifact. That declaration is not evidence of npm publication. Use the local command above to verify a checkout or packaged artifact.

## Files, bounds and results

Pass 1–32 literal paths, relative to `--root` or absolute within that root. There is no directory scan, glob expansion, fix, subprocess, network request, dependency installation or settings modification. The shell may expand arguments before invoking any command; use quoted literal paths or `--` when appropriate. `--root` defaults to the launch directory for ordinary linting. Stdin mode reads no files and needs no available root. Its optional `--name` must be a relative CSS path.

The chosen root is explicitly canonicalized, including a symlink used as the root itself. Interior directory and file symlinks are rejected. Files must be regular files. Lexical traversal, control characters and paths outside the configured or canonical root are rejected. Descriptor/path identity and metadata are checked around reads. This is a bounded read-only development tool, not an adversarial filesystem sandbox: another process mutating the filesystem can invalidate assumptions after a check. Native Windows behavior has not been verified in this workspace.

Input must be valid UTF-8. Per-file caps are 256,000 bytes and 64,000 decoded UTF-16 code units; aggregate caps are 2,048,000 bytes and 1,024,000 code units. There are at most 30 diagnostics per file and 120 displayed per invocation, with truncation reported. Output is capped at 131,072 bytes; paths at 2,048 code units and 64 interior segments. The parser does not run for a source exceeding the character cap. Columns and offsets count UTF-16 code units, with one-based line/column positions.

Text output gives relative names, status and fixed rule messages, without echoing source lines or absolute roots. JSON contains `schemaVersion`, configured `rules`, `limits`, per-file `status`/`reason`/`diagnostics` and actual `summary` counts. Unsupported extensions are explicitly `skipped`; they are not counted as checked. A truncated report may omit findings, and a grammar diagnostic can consume a slot before a warning.

Exit codes for ordinary lint:

- `0`: checked files passed the configured rules, with any unsupported skips reported
- `1`: at least one file has configured findings
- `2`: invalid invocation, unavailable/invalid input, changed file or a bound was exceeded

Run `node dist/cli.js --help` for usage and `--version` for the artifact's declared version.

## Optional Claude Code adapter

`hook claude-post-tool-use --root PROJECT` accepts a bounded JSON stdin payload. It handles only `PostToolUse` with `Write` or `Edit` and an absolute CSS `tool_input.file_path`. The root is always the explicit command argument; payload `cwd`, file contents, tool output and other fields do not choose a root or a command. Unsupported event/tool/extension cases return an explicit skipped message.

It emits only `hookSpecificOutput.hookEventName` and `additionalContext`. The context uses fixed messages and anonymous file labels: untrusted source, file paths and tool output are never inserted into agent instructions. There are no approval, permission, decision or modified-tool-output fields. It does not undo or approve edits. Findings and adapter read/parse failures exit `0` with advisory context, so ordinary lint's exit `2` is not reused as blocking hook feedback. An invalid command invocation still exits `2`.

The current [official hooks reference](https://code.claude.com/docs/en/hooks) documents an exec-form `command` plus `args`, the `PostToolUse` payload and `additionalContext`. The following is an optional host-authored settings example for a local checkout. Substitute the actual command location if using another installation. The helper does not write this configuration:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "node",
        "args": [
          "${CLAUDE_PROJECT_DIR}/tools/liquid-glass-kit/dist/cli.js",
          "hook",
          "claude-post-tool-use",
          "--root",
          "${CLAUDE_PROJECT_DIR}"
        ]
      }]
    }]
  }
}
```

The args form keeps each path as one argument and avoids command concatenation. This example and the event envelope were checked against official documentation and local JSON/process fixtures. No actual Claude Code client hook delivery was verified, and older clients may differ. See the [official hook setup guide](https://code.claude.com/docs/en/hooks-guide) for the client-side setup and diagnostics. No Anthropic implementation or product assets are included.

## Verification

`npm run check` typechecks the optional tooling, tests parser/path/UTF-8/limits/hook boundaries and existing browser-workbench behavior, then builds and executes the actual distributed binary with file, stdin and hook fixtures. `npm pack --dry-run` verifies the distributable includes the binary and parser notices. Unit/Node-process checks are separate from live browser or actual client-hook validation.

## Original review study and recorded scopes

`site/lint-room/` contains Lint Room, an original native CSS editor. Live browser results use the shared checker; saved local Node process receipts are explicitly labeled with the artifact version. The host's selected-text/radius/transition edits are deliberate local actions, not CLI auto-fixes or an actual remote shell. A clean configured result is not a complete CSS/browser/accessibility pass.

The isolated 0.53.0-preview.1 Node command artifact is 78,919 raw / 28,895 gzip bytes; bundled parser notices add 4,535 bytes. Browser material imports do not include the Node command/parser. CLI process timing includes startup, input decoding, parsing, JSON and output: 20 new-process checks had median 54.667ms/p95 63.744ms in the recorded Linux Node 24 session. Shared-checker CPU is separate: 100 batches of 500 short calls, median 12.672ms per batch; 15 near-cap calls, median 15.556ms after three warmups. These scopes exclude DOM/paint/network and establish no speedup, app FPS or loading-time improvement.

A fresh release-version native near-cap browser check took 34.4ms including host diagnostic DOM creation, excluding painting. Native browser/editor evidence remains distinct from Node process checks, actual Claude Code hook delivery and physical-device tests. The original 12-second Lint Room film uses a finite real review tour, original breakbeat 130 flute/FM score and disclosed camera/final-frame hold; export 30fps is not application FPS.

After the final root package version/build, rerun the distributed verifier and local process benchmark. The benchmark records fresh source/artifact hashes and explicit fixture identities. Accepted original handoff provenance is static historical metadata, not a current file verification; no temporary patch file is required:

```sh
node scripts/verify-cli.mjs
node scripts/lint-room-benchmark.mjs
```

[Node artifact/process scope](../benchmarks/lint-room-cli.json) · [Current browser host](../benchmarks/lint-room-host-current.json) · [Native layouts](../benchmarks/lint-room-layouts.json) · [Media details](campaign/LINT_ROOM_MEDIA.md)

These are prepared artifacts; verify the matching released binary, package and demo before claiming publication. No actual Claude client installation or Windows filesystem compatibility is inferred from the local process fixtures.
