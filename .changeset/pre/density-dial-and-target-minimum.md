---
'@tanrei/web': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/token-engine': minor
'@tanrei/tokens-build': minor
'@tanrei/studio': minor
'@tanrei/mcp': patch
'@tanrei/cli': patch
'@tanrei/docs': patch
---

**Density is one number, and nothing pressable is drawn below a minimum target — in the tokens. The values do not
change: at the defaults every resolved value in every system and scheme is what it was, and no picture moves.**

New tokens:

- `tanrei.dial.density`, a number, 1 by default: how much room a product gives its controls and rows. Below 1 they
  are drawn closer, above 1 they get more room. On the web it is `--tanrei-dial-density`, and the heights, paddings
  and gaps that follow it are live CSS, so setting it on `:root` moves them.
- `tanrei.sys.target.minimum`, 32: the least height (and, for an icon-only control, width) at which anything a person
  presses is drawn. It is fixed: the developer's value, which no dial scales. `sys.target.pointer` (44) and
  `sys.target.touch` (48) keep their values and their rules. The cupertino preset sets the minimum to 28, the least
  height it draws a pressable at.
- `tanrei.sys.control.height.{extra-small, small, medium, large, extra-large}`: the height ladder, 24 / 32 / 40 / 56 /
  72 — the size unit × 6 / 8 / 10 / 14 / 18 × the density, on the size unit's grid.

Tokens whose rule changes shape (their values do not):

- Every height of a box or a row a person presses (61 component tokens: Button, Button with menu, the input boxes,
  Pagination, Chip medium, Tabs, Segmented button, Menubar, the inline Toolbar, Search's trigger, Main action button,
  the calendar's cells, One-time code input, the date and time picker's range field and wheel row, and the rows of
  tree view, navigation drawer, table of contents, menu, select, combobox, search suggestions, list, list row and
  accordion) follows the density and is never below `sys.target.minimum`; one whose default equals a ladder step
  reads it. Heights nobody presses (Tag, Keyboard shortcut, Badge, the navigation drawer's headings, the plain
  tooltip) follow the density with no minimum.
- The block paddings of those boxes are derived with `pad` from their box's height (49 tokens); the block paddings of
  boxes sized by their content and the gaps between rows (the table's cells, the description list's facts, the
  timeline's entries, the navigation drawer's items) are multiplied by the density.
- The gaps that keep a whole target between neighbours — the standard button group's, the docked toolbar's and the
  search bar's — are derived as `sys.target.touch` less the small Button's height, never below zero (16, as before).

What else changes:

- The rule language: `pad` takes an optional `by`, a coefficient on its padding, which a layer's `scale` multiplies;
  a size a layer adds to a component measures its `pad` paddings from its own height. A size a layer adds by scaling
  a floored height keeps the floor (a Button size scaled 0.75 from small is held at the minimum, 32).
- The build checks the target floor in every system: the three target tokens at WCAG 2.5.8's 24px or more and every
  floored height at the minimum or more (an error in the default system, a warning in a product layer, information
  in an imitation preset), and `pointer` and `touch` at the minimum or more and the density above zero (refused in
  every system, a product build too). `targetFloors` and `TARGET_THRESHOLDS` are exported from the invariants.
- The native token types gain `density` among the dials and `minimum` among the targets (`TanreiDials`, the target
  struct of each platform): code that constructs them by hand adds the new fields.
- Theme Studio lists the density among the dials (0.75 to 1.5), and its rule editor keeps and shows a `mul`'s
  `times`, `round` and `min` instead of dropping them when a rule is edited.
- On the web, a product of the density gains a ten-thousandth of its unit before it is rounded, so a height on a tie
  of its grid (4 × 10 × 0.95 = 38) rounds upward in every browser, as the build rounds it; Firefox, which holds the
  density as a 32-bit float, rounded it down.
- `sub`-derived gaps get no `-pill` companion in the web's stylesheets; only a `sub` that is a corner inside another
  does.
