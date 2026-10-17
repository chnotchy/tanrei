---
'@tanrei/docs': patch
---

Documentation site: a component's fixtures are a gallery of stages, not a table.

- Every fixture stands on a stage of its own, named by its id, with the props that make it as its caption, grouped by
  the first token axis of the spec that tells its fixtures apart. Its header holds the stage's scheme (light or dark),
  a copy of the fixture's markup and a link to the fixture alone.
- At a phone's width every fixture is in view: in the table, the drawing of most fixtures began past the table's
  visible box and could only be found by scrolling the table sideways.
- A fixture as wide as its layout starts at the harness's width, fills its stage, and can be made narrower or wider
  with a handle on the stage's edge (a window splitter: drag it, or use the arrow keys, Home, End and Enter).
- A presented fixture (a modal dialog, a sheet, a tooltip, a docked picker) is drawn presented, in a window of its own
  the size the web harness gives it, instead of an "Open" button. Nothing it opens leaves its window, and it never
  takes the focus from the page.
- A horizontal divider, a linear progress indicator and a slider were drawn 0 px wide; they are drawn at the harness's
  length.
- `/fixtures/<component>/` shows every fixture of a component on one page, and `?id=<fixture>` one fixture alone.
