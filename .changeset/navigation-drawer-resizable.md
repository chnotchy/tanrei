---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

**Breaking — the navigation drawer is resizable, by default.** Where a `<tanrei-navigation-drawer>` (React
`NavigationDrawer`) stands beside the content — a standard drawer that is open, or a responsive drawer's standard
presentation — a person can change its width at its end edge, and fold a collapsible drawer to its column the same way.

What breaks:

- Every standard drawer now has a resize handle on its end edge: **one more Tab stop**, after the drawer's last row and
  before what follows the drawer, exposed as a window splitter (`role="separator"`). It is out of sight until a mouse
  comes over the edge or it has keyboard focus; on a touch screen its line is drawn at rest. `resizable="false"`
  (React `resizable={false}`) leaves it out.
- The drawer's end edge takes a press over the content beside it: a band 36 px wide (`sys.target.pointer`, or
  `sys.target.touch` for a coarse pointer) from the edge outward, with the handle's box at its middle. It never lies
  over the drawer, so a row's hit area keeps the drawer's full width, a group's chevron keeps its whole target, and a
  scrollbar at the drawer's end edge is still taken.
- In an app shell, a navigation drawer stands over the main region (`z-index: 1` among the frame's regions) so that the
  edge takes the press there; the footer is still drawn over it.
- The navigation drawer's host is no longer `overflow: hidden`: what slides in and out is cut by a `clip-path` at its
  start edge, top and bottom, and not past its end edge.

What it does (NVD-96 to NVD-104):

- **A drag** on the edge follows the press without a motion, between the least width (`min-width`, else
  `comp.navigation-drawer.container.min-width`, 200) and the greatest (`max-width`, else
  `comp.navigation-drawer.container.max-width`, 400, and never more than the room the parent gives — in a parent
  narrower than its width, the drawer and its rows are laid out at the room, labels cut with an ellipsis, and the width
  comes back with the room). A collapsible drawer
  folds to its column past halfway between its column and its least width, over its change of form's motion, and
  unfolds again past it; a drawer that cannot fold stops at its least width. While a drag lasts the document selects
  nothing and no iframe takes the pointer.
- **Keys** on the handle: the arrow pointing away from the drawer widens it by 10, the other narrows it (never folding
  it); Shift, Page Up and Page Down by 100; Home and End give the least and the greatest width. On the column, the
  widening arrow, Home and End expand it.
- **Enter, Space or a press without a drag**: a collapsible drawer folds to its column and unfolds at the person's
  width; another takes its default width (`container.width`) and then the width it had before.
- New attributes `resizable` (on unless `"false"`), `width`, `min-width`, `max-width` and `resize-label` (the handle's
  name; empty names it by `label`). New event `widthchange` (`detail.width`), fired once when a person changes the width
  — after the drawer has set `width` — and never when the product sets it. `expandedchange` is also fired by the handle
  (a press, or a drag past the fold point). New part `resize-handle`.
- The drawer stores nothing. A product that keeps a person's width keeps what `widthchange` carries and gives it back
  as `width` — and, in a page rendered before the element is defined, also as `--tanrei-navigation-drawer-width` on the
  element, which the drawer writes itself once defined and which the app shell's stylesheet reads for a drawer that is
  not defined yet. A drawer given a width draws it in its first frame; a width set afterwards moves over
  `motion.expand`.
- Over the content (a modal drawer, the column and modal presentations of a responsive drawer) the drawer keeps
  `container.width`, whatever `width` says; the collapsed column keeps its own width.
- In an app shell the main region takes the room that is left in every frame of a drag, with no motion of its own, and
  the shell keeps the place being read in the main content where it was. The shell remembers nothing of the width.

**Handle: `reach`.** `<tanrei-handle reach="edge">` takes a press, shows its resize cursor and comes into sight along
the whole length of the box its owner lays it out in (the edge of a pane), with its box and line drawn at the middle and
its focus ring around the box. `reach="container"` (the default) is the handle as before. React `Handle` gets `reach`.
New baselines: the Handle's `reach-edge` and the drawer's seven resized fixtures. No existing baseline changes.

**Tokens.** Two new component tokens, `comp.navigation-drawer.container.min-width` (200, `dial.size.unit` × 50) and
`comp.navigation-drawer.container.max-width` (400, × 100). A new invariant holds, in every density and every system:
`collapsed.container.width` < `container.min-width` ≤ `container.width` ≤ `container.max-width` — an error, and a warning
in a product layer.

**Resizable frame**: its description no longer suggests wrapping a navigation drawer in it (the drawer has its own
edge); its behaviour does not change.

The navigation drawer's module grows by about 2.6 kB gzip (116,354 → 118,939 bytes, measured against main): the handle
and the reckoning of drags, keys and the room its parent gives. Its bundle budget is raised from 118,800 to 124,900 bytes
(measured + 5 %), as a person's control of the drawer's width is the point of this change. The Handle grows by 164 bytes
(19,055), within its budget.

The native platforms are paused and do not have this yet: their drawers stay as they were.

New fixtures that need baselines: the Navigation drawer's `resized`, `resized-below-least`, `resized-collapsed`,
`resized-modal`, `not-resizable`, `resized-rtl` and `responsive-wide-resized`, and the Handle's `reach-edge`.
