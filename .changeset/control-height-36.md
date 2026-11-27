---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/docs': patch
'@tanrei/studio': minor
---

**Breaking: the default system's control height is 36, was 40.** `tanrei.dial.control.height` is 36 in the core, and
the minimum target `sys.target.minimum` stays 36. The ladder `sys.control.height.*` is 20 / 28 / 36 / 52 / 68 (was
24 / 32 / 40 / 56 / 72), and every height that reads it moves with it in the default system and in every product built
on it that does not set the dial:

- **Controls and rows of the default size are 36 tall, were 40**: the Button, the button with menu, the segmented
  button, the input boxes (stacked, filled, outlined), the search bar and its trigger, the one-time code cells, the
  calendar's view toggle, days and years, the date-time picker's range fields, menu items, select and combobox options,
  search suggestions, tabs, navigation drawer rows and collapsed cells, tree rows, table-of-contents rows, list items
  and one-line list rows, accordion headers, table rows, pagination items, the menubar, an inline toolbar's items, the
  carousel's playback control, and the round state layers of the checkbox, the radio button, the switch and the
  slider's handle.
- **The minimum target is the least area a press is taken from**, no longer the least height anything pressable is
  drawn at. A control that stands alone reads the step of its size with no floor: a small Button, button with menu,
  segmented button, input box, pagination item or tab is drawn at the small step, **28** (was 36, held at the
  minimum), and its hit area reaches the 36 target past what it draws. The icon-only Button is 28 / 36 / 52 (was
  36 / 40 / 56). A row that touches its neighbours — a menu's, a select's or a combobox's option, a search suggestion,
  a list item, a tree row, an accordion header, a navigation drawer row, a table-of-contents row — cannot reach over
  them and is still held at 36 at its small size.
- **The gaps that keep a target whole follow**: a standard button group's gap, a docked toolbar's, the search bar's
  container gap and the snackbar's controls gap are the touch target less a small Button, 36 − 28 = 8 (were 0, and 4
  for the snackbar); two small Buttons a floating or an inline toolbar lays out stand 8 apart, and the search bar's
  small clear button 4 from the next. m3-like and cupertino keep their snackbar gap.
- **Large is 52, was 56**; the main action button is 36 / 52 / 92 (was 40 / 56 / 96); list rows of two and three
  lines are 56 and 76 (were 60 and 80); a small table row is 28 (was 32).
- **A tag and a keyboard shortcut keep heights of their own**: their medium size is six size units (24), where it read
  the ladder's extra-small step, which would have been 20 at 36, as low as their small size and too low for a key cap's
  text; both are sized by their text and are no control. No value of theirs changes.
- **Block paddings give up half of what a box loses below the control height's reference of 40** (unchanged rule), so
  one line still fits: e.g. a Button's padding-block is 4 at medium and large (was 6), a list row's 6 (was 8), a
  table cell's 7 and 4 (were 9 and 6). The button with menu's trailing padding now follows the height of each size as
  its block padding does (4, 6 and 14 in the default system), so the trailing half stays a square of its
  height; so does the main action button's start padding beside its icon, and a small tab's indicator padding (0).
- **Every hit area is at least 36**: `sys.target.minimum`, `.touch` and `.pointer` are 36. Under a 48 target medium
  icon-only Buttons stand 12 apart (were 8) and small ones 20. The search view's back button now stops its hit area
  at the middle of the gap toward the input, as SRC-25 says, and keeps the query leading-icon.gap from its glyph
  (SRC-1).
- **An outlined color input draws its swatch inside the box of its icon's size**, no taller than its container less the
  floated label's text and the focused edge (22 at 36), so that the label it floats onto the edge never stands over it
  (CLI-15, CLI-25); the value starts where it did.
- **Theme Studio's Essentials raises the control height** past the one it scales in proportion with spacing until every
  height holds its padding and its line (type 17 and spacing 10 give 47, not 45), and its Size row shows the heights a
  control of each size is drawn at (28 / 36 / 52).
- **What keeps its own size does not move**: icons, tags and key caps, the calendar's cell, a wheel's row, a tab with its icon above its
  label, the chip, bars (app bar, navigation bar, toolbars), avatars.
- **The presets keep their originals**: m3-like and cupertino set `tanrei.dial.control.height` to 40 in their own
  layers, so no token value of either changes.
- The native platforms' generated systems carry the new values; their implementations follow the previous revision
  of these components, and their CI is paused.
- **Web baselines of the default system move widely** with this change; they are not recorded in it.
- The docs pages that state default sizes say the new values in all six languages.
