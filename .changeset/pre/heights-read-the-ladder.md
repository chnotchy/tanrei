---
'@tanrei/web': minor
'@tanrei/tokens-build': minor
---

**More heights read the control height ladder, and the presets hold their own targets. No resolved value changes: every
token of every system, in every scheme, is what it was, and no picture moves.**

What a layer sees differently:

- **The small rows read `sys.control.height.small`.** The tree view's compact row, the navigation drawer's compact item
  and collapsed cell, the table of contents' compact row, and the menu's, list's and search suggestion's compact rows
  are now `{ "fn": "mul", "of": "{tanrei.sys.control.height.small}", "by": 1, "min": "{tanrei.sys.target.minimum}" }`,
  as the small Button is. **Breaking for a layer that set the tree view's compact row to move the others:** the menu,
  the list and the search suggestion aliased it, and no longer do; set `sys.control.height.small` to move every small
  control and row together, or each row's own token.
- **The medium tag and key cap alias `sys.control.height.extra-small`** (24), which they equalled.
- **m3-like and cupertino set `sys.target.pointer` and `sys.target.touch`** (44 and 48, the values they had), and m3-like
  sets `sys.target.minimum` (32), each with its reason, so the default system's targets no longer reach them. They are
  values, no longer multiples of `dial.size.unit`: a product that changes the size unit on top of a preset keeps the
  preset's targets.
- The size descriptions of Button, Button with menu, Copy button, Chip, Tabs, Pagination, Segmented button and the
  stacked input boxes now say that the height is never drawn below `sys.target.minimum`.
