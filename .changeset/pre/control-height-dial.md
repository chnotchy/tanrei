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

**One control height: `tanrei.dial.control.height`.** A product sets the height its controls and rows are drawn at in
their default size once — `{ "$value": { "value": 32, "unit": "px" }, "reason": "…" }`, or `--tanrei-dial-control-height`
at runtime — and every height that reads it follows.

- The ladder `sys.control.height.*` is whole size units from it (`add`): extra-small H − 4u, small H − 2u, medium H,
  large H + 4u, extra-large H + 8u — 24, 32, 40, 56 and 72 at the default of 40, as before. **No value moves in any
  shipped system or scheme**, and no picture changes. The size unit is now the distance between the sizes and the scale
  of icons; it no longer sets the default height.
- Drawn at the control height today: the Button, the button with menu, the stacked input box, the menu bar's titles,
  pagination, the search trigger, the inline toolbar and the calendar's days — marked
  `"dev.tanrei.aligned": "control"`. The menus, options, tabs, navigation items, tree, list and table rows, accordions,
  the other fields and the selection controls follow in changes of their own; until then they keep their heights.
- A block padding measures its box from the control height at 40 (`dev.tanrei.reference`): under it, the box gives up
  half of what it lost from each padding; above it, the box grows and its paddings keep their values.
- The build refuses a `sys.target.minimum` above the control height in every system, a product layer's too, and holds
  the marks: a marked height reads the medium step, and every pressable height of the core reads a step of the ladder,
  save those it lists as not on it yet.
- Theme Studio's Size row leads with the control height (24 to 64), with the heights it gives and a Button, a field, a
  menu row and a tab drawn at it; a control height set under the minimum takes the minimum down with it, and moving the
  spacing in the essentials moves the control height in proportion. `tanrei init`, the CLI's and the MCP server's texts
  and the docs name it, and the dial tables list eight dials.
- A product that gives its controls more air than the default (a larger `dial.space.unit`) raises the control height
  with it; the heights not yet on the ladder still follow the size unit.
