---
'@tanrei/docs': patch
---

A component's anatomy table keeps its columns while the page's elements are defined, in every engine. Each part's
number and name were parted by a space under `white-space: nowrap`, and the name wraps after its hyphens. Firefox did
not count that space as a place to break when it first measured the table's first column, and counted it once the
page's elements were defined, though no computed style changed. The first column then narrowed and the table changed
height. A no-break space now holds the number to its name. Of every component page, at 1440 px in the three systems,
the tables that changed were these:

- the App bar's (646 → 624 px);
- the Bottom sheet's (836 → 792 px);
- the Calendar's (597 → 618 px in Cupertino, 685.55 → 706.07 px in m3-like);
- the FAB menu's (442 → 464 px, 497 → 517 px in Cupertino).

None changed at 390 px, where the table stands as blocks.
