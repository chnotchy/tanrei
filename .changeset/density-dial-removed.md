---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/studio': minor
'@tanrei/cli': patch
'@tanrei/mcp': patch
'@tanrei/docs': patch
---

**`tanrei.dial.density` is removed, and `mul` has no `times` term.** This breaks a layer that sets the density: it no
longer validates. One control height, set once, follows in the next change; until then the heights follow the ladder
`sys.control.height.*` (the size unit × a step) and the minimum target.

- The density multiplied bases of different sizes (10, 12 and 14 size units), so no one value lined controls and rows
  up, and rounding each base apart drew some rows taller at a lower density. Every height, block padding and gap that
  was multiplied by it now takes its value at the default density of 1: **no value moves in any shipped system or
  scheme** — every resolved token of core, tanrei, m3-like, m3-expressive-like and cupertino, in all six schemes, is
  what it was. No picture changes.
- The gaps between rows (a description list's facts, a timeline's events, a navigation drawer's cells) and a table's
  block paddings follow the spacing dial, `dial.space.unit`, as every other gap does.
- `mul` is `{ of, by, exp?, round?, min? }`: a rule that writes `times` is refused. `pad` measures its box's change from
  the height without its `min`.
- The web loses `--tanrei-dial-density`; set `--tanrei-dial-size-unit` or `--tanrei-sys-target-minimum` to move the
  heights at runtime. The native platforms' `TanreiDials` and the React Native `dials` lose `density`.
- Theme Studio's Size row holds the size unit, with the heights it gives, and the minimum target; the shuffle picks
  another size unit. `tanrei init`, `tanrei validate`, the MCP server's philosophy and `validate_layer` no longer name
  the density, and no longer refuse a density of zero.
- The docs' "Size and density" page shows the heights at several size units, and the dial tables list seven dials.
