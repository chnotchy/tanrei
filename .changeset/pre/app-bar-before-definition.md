---
'@tanrei/web': patch
---

**App bar: the page does not move when the bar is defined late.** A new stylesheet, `@tanrei/web/app-bar.css` (also in
`tanrei.css`), gives a `<tanrei-app-bar>` that is not defined yet the block size it will have: the top inset, a top row
of `container.height.small` (or an item's cell, where that is higher), and for a large bar that will be drawn expanded
its title row as well — taller where its title and subtitle need it. It fills the bar with its condition's container
color and shows nothing of what its slots hold until the element draws them. Before, an undefined bar was a line of
glyph names, 22 px high, and grew to 64 px when it was defined: a layout shift of about 0.02 on a page that loads the
bar's script late. Load the stylesheet beside the tokens; nothing else changes.
