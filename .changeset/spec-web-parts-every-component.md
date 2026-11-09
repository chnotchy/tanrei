---
'@tanrei/mcp': patch
'@tanrei/web': patch
---

Component specs: 37 more specs say where each part of their anatomy is drawn on the web (`platforms.web.parts`),
70 of the 98 in all, and `validate` now requires it of every spec whose web status is not `planned`. The 28 left
(`PARTS_PENDING` in `packages/tools/src/parts.js`, each with what it lacks) write `parts` once it can be written: most
have parts no target can name yet — an element of the product's light DOM (a native element or a `data-*`
attribute), an element of a shadow tree that exports no CSS part, or an element outside the host — and three modal
components wait for an anatomy figure that numbers the parts of their open fixture. The specs the MCP server returns
carry the new parts.

Web: `custom-elements.json` now lists the `indicator` part of `<tanrei-menubar-menu>`, the glyph a menu's title has
always drawn under that name. Nothing is removed or renamed.
