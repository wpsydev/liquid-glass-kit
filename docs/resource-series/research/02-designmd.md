# Resource 02: DESIGN.md

Reviewed on 2026-10-11 using the public example, the primary format specification and an isolated run of the official CLI.

## References and what they contribute

- https://designmd.ai/ presents design systems as an agent-readable document with visual examples.
- https://designmd.ai/frknaykc/command-center demonstrates an intentional separation between a warm reading workspace and darker application chrome. Its colors have distinct canvas, surface, foreground and signal roles. This is a reference for documenting intent, not a preset or licensed asset pack.
- https://github.com/google-labs-code/design.md/blob/main/docs/spec.md is the authoritative format used for the exporter. It permits optional YAML tokens followed by ordered Markdown sections. Typed token groups and references describe exact values; prose explains their use. Glass material options stay in independent prose and our versioned JSON instead of invented Google schema fields.
- https://github.com/google-labs-code/design.md documents the official structural linter and evolving alpha format. Passing that linter does not establish rendered accessibility or agent adherence.

## Independent implementation

`createGlassDesignContract()` converts a bounded typed configuration into DESIGN.md, scoped theme CSS and a version 1 JSON manifest. It reuses actual material normalization and props. `parseGlassDesignContract()` accepts only this library's JSON format; there is no arbitrary YAML importer or website scraper.

The original Token Studio offers three deliberate directions: Field Notes uses warm neutrals and a system serif; Command Room uses a focused dark palette; Mono Atelier uses a system monospace and compact shapes. All preview artwork is original CSS geometry. No example screenshots, proprietary fonts, assets or brand copy are included.

The preview and downloads call the actual controller. Native color pickers, hex fields, blur/corner controls and an opaque-material option update the same configuration. Preview, DESIGN.md, CSS and JSON modes expose actual outputs. JSON is parsed back and its outputs compared before reporting a roundtrip match.

## Official format validation

`node scripts/validate-design-contract.mjs` installs pinned `@google/design.md@0.4.0` in an isolated temporary development project, compiles the authoring module into a separate temporary directory, exports three documents and runs the official CLI on each. It does not add repository or runtime dependencies.

All three documents exited 0 with zero errors. Each produced one `orphaned-tokens` warning: the optional accent color is described in prose but not referenced by a component token. This warning is preserved in the evidence, rather than represented as a warning-free pass. JSON, Markdown and CSS roundtrips matched exactly for each fixture.

Exact tool reports, timestamps, SHA-256 hashes and fixture sizes are recorded in `../design-contract-validation.json`. These checks cover document structure and tokens. Browser validation, package verification, device rendering and benchmark results are separate release work.

## Performance and accessibility boundaries

The optional authoring module is pure, import-safe during SSR and free of runtime dependencies. It performs work only when called. The demo rerenders on host input, with no continuous JavaScript animation loop. Its artwork transitions respect reduced motion.

Opaque foreground/background token contrast is an advisory check of that pair. It does not measure glass over arbitrary photographs, video, blur, gradients or experimental refraction. The exported guidance keeps controls semantic, asks for mobile/safe-area testing and makes the portable CSS default explicit.
