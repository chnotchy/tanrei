---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

List row (`<tanrei-list-row>`, React `ListRow`): the row most lists are made of, as a component of its own. The List
stays a box of the product's items; the row is what one item shows, or it stands alone.

- An overline, a headline and one or two lines of supporting text (`supportingLines`), each cut with an ellipsis where
  it does not fit and shown whole in a tooltip on hover and on the item's keyboard focus; assistive technology always
  gets the whole text.
- A leading glyph (`leadingIcon`) or the `leading` slot (an avatar, a picture, or in a static row a control); the
  trailing text (never more than half of the row), the `trailing` slot and a trailing glyph (`trailingIcon`).
- One-, two- and three-line heights in two densities, `regular` (56, 72, 88) and `compact` (40, 56, 72), an axis a
  design system may extend. New tokens `comp.list-row.*`; m3-like sets the headline in body-large and 24 after the last
  part, cupertino the headline in body-large and a row of one line 44 tall.
- The row draws no fill, edge or state and is never pressable: a row that opens something is the content of an
  `interactive` or `href` list item, a row that is chosen the content of an option.

List: a list item now tells a List row that is its direct child what the item is — an action, a link or an option
(which pads the row, so the row drops its own padding and keeps its height), an item of a reorderable list (the handle
stands in place of the row's start padding), a selected option (the row takes the selected content color), disabled —
and an item without a `label` takes its name from the row's headline (its accessible name, its handle's name,
typeahead, announcements); an action, a link or an option is described by the row's other texts.

New baselines: one per List row fixture, and the `all-parts` fixture under each shipped preset. No existing baseline
changes. The web is the first platform; SwiftUI, Compose, Flutter and React Native are planned.
