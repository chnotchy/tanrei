---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking — App bar: as many actions as fit, and an overflow the product chooses.** `<tanrei-app-bar>` (React `AppBar`)
no longer caps its actions at three, and no longer reports a fourth in debug builds: it draws every action that fits in
its top row. The actions that do not fit leave from the end, one at a time, and come back as soon as the room allows.
The new `overflow` attribute says where they go: `menu` (the default) moves them into a Tanrei Menu opened from a more
button (`more_horiz`) at the end, each as a menu item with its label and glyph (a toggle as a checkbox item, a link as a
link item); `hide` leaves them out of the bar, for actions the product also gives somewhere else at that width. Name the
more button with `overflow-label`, or once for the product with the word `toolbarOverflowLabel`. An action marked
`app-bar-overflow="never"` never leaves: the ones before it leave instead. The navigation item, the brand, the control
in context and the title's whole width keep their room first; the title is cut only once nothing more can leave.

What broke: a bar whose title is too long for the row beside its actions used to keep every action and cut the title; it
now moves actions out first. Mark the actions that must stay `app-bar-overflow="never"` to keep the old layout. A
product's own "More options" button that held the rest of the actions can go: the bar makes one.

The new fixtures `small-overflow-menu`, `small-overflow-hide` and `small-overflow-rtl` need baselines; no existing
baseline changes. SwiftUI, Compose, Flutter and React Native do not build the overflow yet: they draw every action.
