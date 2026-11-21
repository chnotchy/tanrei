---
'@tanrei/web': patch
---

Menu, popover, date-time picker, FAB menu, table of contents, navigation drawer and app shell: `aria-controls` now
names only an element that assistive technology can reach, as the select and the combobox already do. A closed popup
is a box whose surface is not displayed, and browsers drop a reference to it, so the control that opens it carries
`aria-controls` only while the popup is shown:

- a menu's anchor (and so a button with menu's trailing half, an app bar's and a toolbar's overflow button), a
  popover's opener, a docked date-time picker's opener and a FAB menu's toggle name the popup only while it is open;
- the compact table of contents' row names the product's own list, by element reference, while the list is open. It
  used to name the box around the list, which no browser exposes, so the reference reached nothing even while the list
  was open;
- a navigation drawer group's row and chevron name the group's items only while they are shown. A collapsible
  drawer's menu button names the drawer except while the drawer is open as its own modal dialog, which keeps the
  drawer's host out of the accessibility tree;
- the app shell's menu button names the navigation only while it is shown, not while it is closed over the content or
  hidden beside it.

Nothing is drawn differently. The specs say so: MNU-24, SPB-17, POP-18, DTM-37, FBM-20, TOC-31, NVD-37, NVD-46 and
APS-7.
