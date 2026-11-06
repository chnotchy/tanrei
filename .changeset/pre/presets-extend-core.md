---
'@tanrei/cli': minor
'@tanrei/mcp': minor
'@tanrei/tokens-build': minor
---

**Breaking — the presets extend `core`.** `m3-like` and `cupertino` now extend the root layer `core` directly, not the
default system `tanrei` (`m3-expressive-like` still extends `m3-like`). A preset no longer inherits the default
system's choice of components: each says for itself what it leaves out. `m3-like` leaves out the `filled` navigation
bar and the `tonal` tabs; `cupertino` leaves out the `filled` navigation bar and the FAB menu, with its reason and what
to use instead (`toolbar`, `button-with-menu`). The `include` lines that only undid the default system's omissions are
gone. What each preset ships is unchanged (`--tanrei-unavailable` holds the same list), and no resolved value moved:
every token of every preset, and of a product built on one, resolves as it did, in every scheme, and every generated
stylesheet, design-tool export, native constant, accessibility report and fidelity report is unchanged (a test holds
it). What changes is the chain: a preset's bundle recipe, `tanrei build`, `tanrei validate`, Theme Studio and the MCP
server's `list_systems`, `resolve` and `validate_layer` now say `core → m3-like → acme` where they said
`core → tanrei → m3-like → acme`, and a preset's `extends` is `core`.
