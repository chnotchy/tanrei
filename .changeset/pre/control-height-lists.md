---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/docs': patch
---

**Lists, rows, accordions and tables are drawn at the control height.** A list's item that is an action, a link or an
option, a list row of one line, an accordion's header and a table's row now read `sys.control.height.medium` in their
default size, and are marked `"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.

- **The default system changes, as intended:** at the default control height of 40 a list's item goes from **48 to
  40** (`comp.list.container.height.medium`), a list row of one line from **56 to 40**
  (`comp.list-row.container.height.one-line.medium`), an accordion's header from **56 to 40**
  (`comp.accordion.container.height.medium`) and a table's row of one-line cells from **46 to 40**. Their block
  paddings give up half of what the row loses below 40, so that one line always fits: a list's and a list row's 8, an
  accordion header's 8 at medium and 6 at small (were 16 and 12), a table cell's 9 (was 12).
- **The small sizes read the small step**, held at the minimum target where a person presses them: a small list row of
  one line is 36 (was 40), a small accordion header 36 (was 48); a small table row is 32, as before, and is not held at
  the target, because nobody presses a row that holds no control.
- **A row of more lines is the one-line row and what each further line needs**, five size units, the line of the
  supporting text: a list row of two lines is 60 (was 72) and of three 80 (was 88) at medium, 56 and 76 at small (were
  56 and 72). They add to the one-line row, so they follow the control height with it: 52 and 72 at a control height of
  32. Material's 56, 72 and 88 step 16 a line from a row that holds a touch target; here the one-line row is the control
  height, and the line it adds is derived, not a fixed step.
- **New tokens: `comp.table.row.height.medium` and `comp.table.row.height.small`**, a table row's least height per
  size: the control height and the small step. Every row of a table (the header row, a body row, a placeholder row, a
  footer row) is at least that tall and taller where a cell needs more; `comp.table.cell.padding-block.*` gives up what
  the row loses, so that a row of one-line cells is exactly that tall. On the web, `table.css` draws it.
- The accordion's small header is a small navigation drawer row's height and text style, no longer "a drawer row's and
  a menu item's 48"; its tokens' and its spec's words say so.
- **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
  3's 56 list item and its 56, 72 and 88 rows of one, two and three lines, the 40, 56 and 72 small rows and the 56 and 48 accordion headers
  they drew, and take **Material's 52 data table row**, its one line centred with 16 above and below (a table row there
  was 44); cupertino keeps Apple's 44 list row and the 72 and 88 rows, small rows and accordion headers it drew, and
  draws Apple's 44 table row (12 above and below its line, as before). A small table row in either keeps the height
  its cells give it.
- The web baselines of these components move with this change; they are not recorded in it.
- New behaviour: LST-53, LRW-19, ACC-38 and TBL-63 say a default row is as tall as the control height; the web tests
  draw each at 32, 36 and 40.
