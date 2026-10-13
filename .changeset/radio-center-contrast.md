---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/cli': patch
'@tanrei/mcp': patch
---

Radio button: the center of a chosen radio now stands 3:1 apart from the ring around it (WCAG 1.4.11). In the default
system the fill inside the thick ring is the ring's color at 16 % opacity rather than 50 %
(`comp.radio-button.fill.opacity`, 0.5 → 0.16): a lighter tint, at least 3.17:1 from the ring at rest, hovered, focused
and pressed, on every surface role and in all six schemes, where 50 % fell to 1.91:1 (the focused error form on
`surface-container-highest` in light) and under 3:1 in the dark schemes once a state layer was under it. 16 % is the
step the default system already uses for a selection's tint (a checked menu row, a selected list option, the tonal tabs'
indicator). A menu's radio item draws the same ring, and its fill follows (`comp.menu.control.fill.opacity`,
0.5 → 0.16; 4.67:1 at the least on the menu's sheet). The ring, its stroke and the motion are unchanged, and so are the
imitation presets, whose radios have opaque centers of their own and whose menus mark radio items with a check.

The token build holds it from now on: in every scheme, the fill of a radio's mark as drawn — at its opacity, over the
state layer of each enabled state — is held 3:1 against the ring it meets, or, where `fill.inset` leaves a gap (a dot),
against the gap, on every surface role (the menu's sheet for a menu's radio item). It fails the default system's build,
is a warning for a product layer, and is recorded as information for an imitation preset (`cupertino`'s light center in
a hairline ring is 1.80:1 in light). A product layer that strengthens the state layers may need a quieter fill: `tanrei
validate` and the MCP server's `validate_layer` now say so. A finding about a pair of component colors is classed as a
contrast measurement, as a pair of roles is.
