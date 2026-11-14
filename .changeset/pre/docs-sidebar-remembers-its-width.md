---
'@tanrei/docs': patch
---

Documentation site: the sidebar remembers its width and whether it is folded, across visits.

- The width a reader gives the sidebar with its resize handle, and whether they fold it to its column, are kept in this
  browser (localStorage) and given back on every page and every later visit, before the sidebar is first drawn, so the
  page does not move. Which groups are open and how far the list is scrolled are still kept for the tab only.
- A width kept is held between the sidebar's least and greatest width as it is drawn now; a kept value that does not
  parse is ignored; where storage is not available (a private window) nothing is kept and the sidebar works as before.
- Until the drawer is defined, the sidebar that stands in for it is as wide as the drawer will be, and a folded sidebar
  stands as its empty column.
