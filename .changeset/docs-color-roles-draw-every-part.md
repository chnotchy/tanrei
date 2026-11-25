---
'@tanrei/docs': patch
---

**The color role figures find every part their example draws, and only those.** A part drawn as no element (a hidden
box whose `::before` draws it: a tab's state layer, a text field's notched outline) is found and measured; a part
whose clip path cuts it away whole (a selected tab's own label, under its covered copy) is not drawn, as it is not on
the page; a part several kinds of item draw (a menu's checkbox, radio and submenu rows) is found on the first that
draws it. A part drawn transparent has no leader ending on nothing. The Menu, Tabs and Text field figures stand on
fixtures that draw more of their parts, so fewer rows say "Not drawn". A menu spec's web parts name every kind of item
that draws them (`tanrei-menu-item|tanrei-menu-checkbox-item container`).

The anatomy and measure figures number and measure a part on the first element of the example that draws it, not
only on the first one named: a tab's label (the selected tab hides its own under the indicator), a navigation bar
item's icon and label, a navigation drawer's divider, and a segmented button's check and divider are now numbered.
A color role figure still reads its first element, the one in the state it shows.
