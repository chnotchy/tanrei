---
'@tanrei/web': patch
---

File item and List: hit areas no longer reach over a neighbouring tile or item when gaps are narrow.

- File item: in a tile, the retry action reached past the tile's start edge, across the gap and onto the tile before
  it. It now reaches toward that edge no further than `comp.file-item.tile.action.inset`, as the remove action already
  did at the end edge. It makes up what it lacks of the minimum target toward the remove action. FIT-18 now says this.
- List: a reorderable item's handle reached its whole target on each side. Where the gaps were narrow, it reached over
  the item before it in a line or a grid (a file upload's strip of tiles), and toward its own content. It now reaches
  toward the content no further than the middle of `comp.list.container.gap`. In a line or a grid, it reaches toward
  the item before it no further than the middle of the list's gap beyond the item's padding. In a single column, it
  still reaches its whole target toward the list's start edge. LST-32 now says this.

Nothing is drawn differently.
