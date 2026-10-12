/** Regenerated from declared exports + actual built Node namespaces. No type-only names inferred. */
export const catalog = {
  "packageName": "@wpsydev/liquid-glass",
  "version": "0.54.0-preview.1",
  "verification": "host-checked",
  "artifact": "Checked local 0.54.0-preview.1 package build; declared export paths and actual Node value exports. Not publication or client delivery evidence.",
  "exports": [
    {
      "subpath": "./material",
      "kind": "module",
      "runtime": "pure",
      "runtimeNames": [
        "getGlassInnerRadius",
        "getGlassProps",
        "getResolvedGlassProps",
        "resolveOptions"
      ],
      "guidance": [
        "getGlassProps produces semantic data attributes and CSS custom properties; host owns DOM application and readable fallback.",
        "Import material.css explicitly; portable CSS is the default material tier."
      ]
    },
    {
      "subpath": "./dom",
      "kind": "module",
      "runtime": "dom",
      "runtimeNames": [
        "attachGlass",
        "glass"
      ],
      "guidance": [
        "Only attach DOM behavior in a client lifecycle; retain native control semantics and destroy owned resources when the host unmounts."
      ]
    },
    {
      "subpath": "./motion",
      "kind": "module",
      "runtime": "dom",
      "runtimeNames": [
        "advanceGlassSpring",
        "attachGlassMotion",
        "createGlassSpring",
        "resolveGlassSpring"
      ],
      "guidance": [
        "Optional motion needs an explicit client lifecycle and effective reduced-motion policy; keep interactions finite and clean up owned effects."
      ]
    },
    {
      "subpath": "./material.css",
      "kind": "stylesheet",
      "runtime": "css",
      "runtimeNames": [],
      "guidance": [
        "This checked stylesheet is explicitly selected, not inferred by the pack planner."
      ]
    }
  ]
} as const;
