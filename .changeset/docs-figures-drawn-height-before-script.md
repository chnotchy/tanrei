---
'@tanrei/docs': patch
---

Docs: a figure takes the room it is drawn in before any script runs, so it no longer grows in the reader's view when
its elements' modules arrive late. A figure's elements are defined as it comes near the view, and a reader who paged
down within moments of the load, or on a slow line, reached a figure before its modules had arrived: it held the room
of its elements before they are defined and grew when they were. With every element's module held back 1 s, the
Arabic Text field's page at a phone's width moved by 0.09 as it was paged through two pages at a time, 0.06 of it its
first example (80 px held, 236 px drawn). The web package's cloak (`@tanrei/web/cloak.css`), which gives each element
the height its tokens give it before it is defined, is now loaded scoped to the figures' stages, and to nothing else
of the site, so that a page without script still reads its frame; the same page now moves by 0.029 so, none of it a
page's own figure. A figure of the Specs tab's gallery holds the room of its fixture's baseline, now to the half pixel
it was taken at, until the fixture is defined, and then takes its drawn room once, never the room of the fixture before
it is defined in between.
