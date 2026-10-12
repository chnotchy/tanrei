---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Tabs, navigation drawer, page header and app shell: decisions from the web review.

- Tabs: the selected tab answers hover and press. Its state layer is drawn over the active indicator, in the color of the
  content the indicator covers: `comp.tabs.primary.selected.state-layer.color` and
  `comp.tabs.secondary.selected.state-layer.color` now alias their `selected.covered-label.color`, as the tonal one
  already did.
- Tabs: the selected label can gain weight, so that a selection drawn by a faint indicator is not told by color alone
  (WCAG 1.4.1). New tokens `comp.tabs.primary.selected.label.emphasis`, `comp.tabs.secondary.selected.label.emphasis`
  and `comp.tabs.tonal.selected.label.emphasis`: 0 for primary and secondary, and `sys.typescale.emphasis.label` for
  tonal in the default system, in every contrast and theme. Every tab keeps the width its label needs at the heavier
  weight, so nothing in a row moves when the selection does.
- Tabs: whether a primary tab stacks its icon above its label is a token of each size, `comp.tabs.icon.placement.medium`
  (`stacked`) and `comp.tabs.icon.placement.small` (`inline`). A size a design system adds declares its own, and one
  that declares none is drawn as medium is.
- Navigation drawer: a nested destination's item container — its fill, state layer and focus ring — keeps the full width
  of a top-level row; only its icon and label start `comp.navigation-drawer.item.nest-indent` further in per level.
- Navigation drawer: the header slot gives what it holds an inherited text style and color, new tokens
  `comp.navigation-drawer.header.typescale` (`sys.typescale.heading-5`) and `comp.navigation-drawer.header.color`
  (`sys.color.on-surface`): plain text placed there is no longer drawn in the browser's default font, and an element
  that sets its own style keeps it.
- Page header: actions beside the title stay centred on the title's first line while they are no taller than it; actions
  that wrap, or a row taller than the line, start at the line's top and the head grows to hold them, instead of standing
  out of the head above and below.
- App shell: the web note now says that with `scroll="main"` an aside stacked above or below the main region does not
  yet scroll with it.
- Docs: the sidebar opens only the groups that hold the page being read.

The vocabulary grows by the tokens named above (`tokens/vocabulary.lock.json`). The tonal-icons fixtures' first tab is
now "Board", so the row still fits its stage at the heavier label.

Web baselines re-recorded for these intended changes: the tonal tabs fixtures (the heavier selected label and the room
kept for it), the navigation drawer fixtures with nested destinations or text in the header slot, and the page header
fixture `small-actions` (its Button now starts at the top of the title's line).
