---
'@tanrei/web': patch
'@tanrei/tokens-build': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/react-native': patch
---

**Visual change, intended — rows that should match are drawn alike.** A row of a search view and a row of a combobox's
list are rows of the same kind of list, and a tree beside a navigation drawer draws its glyphs at the drawer's size, so
they now take the same values instead of values of their own that had drifted apart:

- `comp.search.suggestion.container.{height,padding-inline,padding-block,gap}` alias `comp.combobox.option.*` at both
  sizes, and `comp.search.suggestion.headline.typescale` aliases `comp.combobox.option.label.typescale`. In the default
  system a medium suggestion or result is 48 high (was 56), 12 from its edges (was 16) with 12 after its glyph (was
  16), and its headline is set in `label` (14/20, weight 500) instead of `body` (14/22, weight 400). The small values
  were already the combobox's and do not move. `comp.search.suggestion.completion.emphasis` is now derived from the
  label family's emphasis step (300 in the default system, so a completion is drawn at 800 over a 500 headline).
- `comp.tree-view.icon.size.{medium,small}` alias `comp.navigation-drawer.item.icon.size.{regular,compact}`: a medium
  tree's glyph is 24 (was 20) and its label starts 4 further in; the small glyph stays 16.
- `comp.table-of-contents.row.shape` is `sys.shape.corner.small` (6, was `corner.extra-small`, 3).

The presets that do not set these tokens draw the same changes. The snapshot baselines of the search view's rows, of
the tree view's fixtures with icons and of the table of contents' rows that draw a state differ for this and are to be
recorded again.
