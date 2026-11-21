---
'@tanrei/web': minor
---

Pagination: a new current page is now a change you see happen. The page that was current gives up its fill, and the
page that becomes current takes it, over `comp.pagination.motion.state-duration` with `.state-easing` — the same motion
as any other change of an item's state; a previous or next control that becomes disabled, or enabled again, fades the
same way. An item the row now uses for another page (the row's numbers shift when the current page moves through the
middle) is drawn as that page at once, so no colour of the page it drew before fades into it. Where motion is reduced,
every change is at once, as before. What broke: the row is no longer drawn whole at once when the page changes; a test
or a product that read an item's colours in the frame after setting `page` reads them part of the way through the
motion.
