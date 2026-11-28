---
'@tanrei/cli': minor
'@tanrei/mcp': minor
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
---

**Breaking — design system layers.** Every design system now descends from one root layer, `core`
(`tokens/systems/core.system.json`): it values the vocabulary — the palettes, the color roles and the per-state rules —
and leaves no component out. The default system `tanrei` extends it and keeps only its choice of components; the presets
extend `tanrei` as before, and a product extends any of them. No resolved value moved: every token of `tanrei`, the
presets and a product resolves as it did, in every scheme, and every generated stylesheet, bundle value and native
constant is unchanged (a test holds it). The bundles' recipe and a product's chain name `core` first
(`core → tanrei → acme`). `core` has no output of its own and is not offered where a system is chosen (`tanrei init
--extends`, `tanrei systems`, Theme Studio, the MCP server's `list_systems`, whose `root` is now `core` and whose new
`default` is `tanrei`).

**Breaking — a layer's `unavailable` is replaced by `components`**, which changes what the parent ships instead of
restating the whole list: `omit` leaves a component out (with a `reason`, and `insteadUse` naming what the system ships
for the same job), `include` brings back a component an ancestor left out, and `variants.<component>.omit|include` does
the same for the values of its `variant` prop. An ancestor's choice stays unless a layer undoes it by name, so a product
that leaves one more component out keeps everything its parent left out, and a product on `tanrei` that wants the
segmented button writes `"components": { "include": ["segmented-button"] }` and draws it with the default system's
tokens. A layer that still writes `unavailable` is refused by the schema: rewrite it as `components`. What each shipped
system leaves out is unchanged (`--tanrei-unavailable` holds the same list).
