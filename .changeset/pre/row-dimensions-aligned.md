---
'@tanrei/web': patch
'@tanrei/tokens-build': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/react-native': patch
---

**Visual change, intended — rows that should match are drawn alike in the default system.** A row of a search view and
a row of a combobox's list are rows of the same kind of list, and a tree beside a navigation drawer draws its glyphs at
the drawer's size, so they now take the same values instead of values of their own that had drifted apart:

- `comp.search.suggestion.container.{height,padding-inline,padding-block,gap}` alias `comp.combobox.option.*` at both
  sizes, and `comp.search.suggestion.headline.typescale` aliases `comp.combobox.option.label.typescale`. In the default
  system a medium suggestion or result is 48 high (was 56), 12 from its edges (was 16) with 12 after its glyph (was
  16), and its headline is set in `label` (14/20, weight 500) instead of `body` (14/22, weight 400). The small values
  were already the combobox's and do not move. `comp.search.suggestion.completion.emphasis` is two of the label
  family's emphasis steps (200 in the default system, was three of the body family's, 300), so a completion is still
  drawn bold, at 700 over the 500 headline.
- `comp.tree-view.icon.size.{medium,small}` alias `comp.navigation-drawer.item.icon.size.{regular,compact}`: a medium
  tree's glyph is 24 (was 20) and its label starts 4 further in; the small glyph stays 16.
- `comp.table-of-contents.row.shape` is `sys.shape.corner.small` (6, was `corner.extra-small`, 3).

The presets (`m3-like`, `cupertino`) keep every one of these rows as they drew them: their
layers now set the values the default system no longer gives them.

On the web a table of contents row takes a press in its corners too: the row's rounded box no longer decides where it
can be pressed, a square box as large as the row does, so no point between two rows is dead under a larger corner.

The snapshot baselines of the search view's rows and of the tree view's fixtures differ for this and are to be
recorded again.
