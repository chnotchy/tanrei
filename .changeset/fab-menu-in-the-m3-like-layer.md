---
'@tanrei/web': minor
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/mcp': minor
'@tanrei/cli': minor
---

**Breaking — the FAB menu lives in the m3-like layer.** A component lives in the layer every system that ships it
descends from; the FAB menu is shipped by `m3-like` and `m3-expressive-like` only, so it lives in `m3-like`. Its name,
its element (`<tanrei-fab-menu>`, `<tanrei-fab-menu-item>`) and its behaviour do not change. What breaks:

- `import '@tanrei/web'` no longer registers it. Import the entry of a system that ships it
  (`@tanrei/web/systems/m3-like.js`), or the component's own module (`@tanrei/web/components/fab-menu`).
- Its 226 tokens (282 declarations) are no longer in the default `tokens.css` nor in `systems/cupertino.css`; they stay,
  unchanged, in `systems/m3-like.css` and `systems/m3-expressive-like.css`. The default system and cupertino no longer
  list it in `--tanrei-unavailable`: they do not have it, and their sheets say where it lives
  (`--tanrei-unavailable-layer: "fab-menu=m3-like"`). Used there, the element warns in a debug build that its tokens are
  not in the system's stylesheet.
- `tokens/comp/fab-menu.tokens.json` is now `tokens/systems/m3-like/comp/fab-menu.tokens.json`, declared by m3-like's
  `vocabulary`. `tokens/vocabulary.lock.json` lists its ids under `layers.m3-like`. cupertino's own values and rules for
  the FAB menu are gone with it.

**New — a layer can hold the whole vocabulary of a component that lives in it**, the fourth way a layer extends the
vocabulary: `"tanrei.comp.<component>": { "document": "comp/<component>.tokens.json", "rationale": "…", "rules": [ … ] }`,
its document kept next to the layer. A spec and its inventory row say `"layer": "<layer>"` (absent: `core`), and
`pnpm validate` holds the three together.

**New — a product on another system can include such a component** from the layer that holds it, and draw it with its
own tokens: `"components": { "include": [{ "name": "fab-menu", "from": "m3-like" }] }`. The component's document and
the rules of its states come; none of m3-like's values do. A product on the default system that includes the FAB menu
gets exactly the 282 declarations the default stylesheet had before this change. `tanrei build`, `tanrei validate`,
Theme Studio and the MCP server's `validate_layer` take the new form; a component that lives in another layer, named
alone under `include`, is refused with the form to write instead.

The native outputs still type every system with the whole vocabulary: the default system's are unchanged, and
cupertino's values for the FAB menu are now those its own tokens give the component. The FAB menu's baselines are
drawn under `m3-like`, where it lives (an intended change of nine images).
