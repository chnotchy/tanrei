---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Tree view: the row model shared with the navigation drawer, and names edited in place.**

- `chevron`: `start` (the default), `end` (after the trailing text, `expand_more` turning a half turn) or `none`. With
  `none`, a parent opens by its icon (its `data-open-icon` glyph shows the state), or by its row where it has no icon
  and does not choose; the arrow keys always open and close. `expandable="false"` shows every parent open, with no
  chevron and no toggle.
- `guides`: `none`, `shown` (the bare attribute) or `hover`. A line stands under the parent's first leading thing: the
  start chevron, else the icon, else the label's start.
- `indent`: `auto` (a child begins where its parent's label begins) or a number of pixels. `icon-space` (`auto`,
  `always`, `never`) keeps an icon's room so that labels stand in a column. `icon-gap` sets the room between the icon
  and the label; its token, `comp.tree-view.icon.gap`, is the same in both densities.
- `highlight`: `indented` (the default) or `full`, for the fill, the state layers and the focus ring.
- Labels and notes are one line, cut with an ellipsis and shown whole in a tooltip while cut (`label-wrap`,
  `supporting-wrap` to wrap). A note stands below its label, or after it with `data-supporting-position="inline"` on
  the `<li>`. **This changes the look of every tree with long labels or notes.**
- `sticky-parents` (on) and `sticky-max` (2): the rows of the innermost open parents above what is shown stay pinned at
  the top of the scrolling box (new tokens `comp.tree-view.sticky.*`).
- Multiple selection: Shift with the arrows, Space or a press selects a range; Ctrl/Cmd+Shift+Home/End and Ctrl/Cmd+A.
- `editable`: a double-click on a label, or F2, opens a field on the name, without moving the row. Enter or leaving
  the field fires `rename` (`label`, `previous`) on the item, and Escape gives it up. `edit(li)` opens it from script.
  `create({ parent, icon })` adds a row beside the selected item in which a new item is named, and fires `create`.
  `edit-label` (or `setWords({ editLabel })`) names the field. React: `onRename` and `onCreate`.

The baselines of the tree view change: icons now step a level by the chevron and the icon, and notes stand below
their labels. New fixtures show each form.
