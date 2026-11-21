---
'@tanrei/web': minor
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/mcp': minor
'@tanrei/cli': minor
---

**Breaking — no compatibility is kept in the tokens during 0.x.** Tokens kept only for platforms that had not caught up,
the path for deprecated tokens, and the pass that let a layer declare what the core already has are removed. Nothing a
web component draws changes: no component read any of the removed tokens. What breaks:

- **Navigation bar:** `comp.navigation-bar.item.container.width` and `.height` are gone
  (`--tanrei-comp-navigation-bar-item-container-width` and `-height`). The item container is the destination's share
  of the bar less `container.padding`, as before. `cupertino` now gives `item.icon-indicator.height` its own value
  (`dial.size.unit × 8`, 32), the value the alias it replaces resolved to.
- **Navigation drawer:** `comp.navigation-drawer.item.badge.typescale` and `item.badge.color` in its four conditions,
  with their per-state tokens (21 tokens), are gone. A destination's trailing string is drawn with
  `item.trailing-text.*`.
- **Navigation rail:** the retired rail's whole token set (`comp.navigation-rail.*`, 63 tokens; 71 custom properties in
  `tokens.css`) is gone. A collapsible navigation drawer, collapsed, is the rail (`comp.navigation-drawer.collapsed.*`).
- **`$deprecated`:** `pnpm validate` and `pnpm generate` refuse a `$deprecated` in Tanrei's token sources, and the
  build no longer has a path for deprecated tokens (the native emitters left them out). The MCP server's token answers
  and Theme Studio no longer carry a `deprecated` field. A token that goes is removed and named in the changeset.
- **Layers:** a layer that declares under `vocabulary` a token, a step of a series, an axis value or a color role the
  core already has is refused with an error that says to delete the declaration and write its value under `tokens`; it
  was accepted with a notice. `notices` is gone from the resolved system, from `tanrei validate`'s output, from the MCP
  server's `validate_layer` and `propose_extension` answers, and from Theme Studio's accessibility panel.

The paused native packages' generated tokens lose the same fields; their navigation bar, drawer and rail sources catch
up when their pause ends.
