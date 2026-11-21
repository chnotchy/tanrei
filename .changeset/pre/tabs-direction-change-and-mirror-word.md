---
'@tanrei/web': patch
---

Tabs: a change of the layout direction while a row is shown (a `dir` written on an ancestor after the first render)
now keeps the selected tab in view. The scroll offset was measured for the old direction, so a row that scrolls could
show other tabs after the change; the row now measures again at once, without a motion, and brings the selected tab
into view as it does when it first appears. Focus and the selection are kept.

Tabs: `data-mirror="always"` or `"never"` on a `<tanrei-tab>` now decides whether its icon is mirrored in a
right-to-left layout, in both of the icon's copies, as it does on an element that holds a glyph in any other
component. Before, the tab took only the icon set's list, so a product could not force or forbid the mirroring of one
tab's glyph.
