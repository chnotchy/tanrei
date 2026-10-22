---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/docs': patch
'@tanrei/tokens-build': minor
'@tanrei/mcp': patch
---

Navigation drawer and tree view: a filter field. `filterable` draws a search field above the rows (the drawer's below
its header, the tree's pinned at the top of its scrolling box); what a person types narrows them to the rows whose label
holds every word, in any order, without regard to case, width or marks, and the groups that hold a match open for as
long as the filter is there — `open` is not written and no `toggle` fires, so emptying the field puts everything back.
`filterMode` is `filter` (hide what does not match, the default) or `highlight` (hide nothing, mark the matches). As in
the search, the first row that matches is ready to take while focus stays in the field: Enter takes it as Enter on its
row would, and Down Arrow moves focus to it. "/" reaches the field — from anywhere in the window for the drawer, from a
row for the tree (`filterShortcut` changes or removes the key); Escape empties the field. A quiet line at the top of the
results draws how many rows match (`filterCountText`) or that none does (`filterEmptyText`), and a status says it once
typing pauses; `filterCountHidden` leaves the count undrawn and still said. The words are the product's: `filterLabel`,
and `filterPlaceholder`, `filterCountText`, `filterEmptyText` and `filterClearLabel` (the product's `clearLabel`), with
three new keys in the English word pack. `filterValue` and `filterchange` keep the text; `focusFilter()` moves focus to
the field. The app shell opens a narrow window's closed drawer for its chord and puts focus in its field. New tokens:
`comp.navigation-drawer.filter.{gap,status.*,shortcut.*}`, `comp.tree-view.filter.{gap,status.*}`, and how a match is
marked in each.

A match is now marked the same way in the search, the combobox, the drawer and the tree: the stronger text color, a
raised weight and a quiet fill behind the matched letters. The combobox's matched run, which was heavier only, gains its
color and fill (`comp.combobox.option.match.color`, `.container.color`, and `.selected.color` and
`.selected.container.color` for the chosen option, whose own fill is the quiet one), and is drawn in the platform's
marked-text colors under forced colors. Its look changes in every filtered list. On the web, the tree's labels are the
product's own text, which the tree never splits: its mark is a highlight of the text's ranges and draws no weight.

The filter is on the web; the spec names its props on every platform, and SwiftUI, Compose, Flutter and React Native
have not implemented it yet.
