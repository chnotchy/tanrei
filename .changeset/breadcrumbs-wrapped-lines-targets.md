---
'@tanrei/web': patch
---

Breadcrumbs: in a trail that wraps (`overflow="wrap"`), a level's hit area no longer reaches over the line below or
above it. Where a level is drawn smaller than the minimum target, its hit area now stops halfway across the row gap
toward a line beside it (half `comp.breadcrumbs.row-gap`), so a press near the edge of a level goes to that level and
not to the one on the next line. A level on the first line still reaches the whole target above it, one on the last
line below it, and a trail that fits on one line keeps the whole target on both sides. The element measures where the
trail wraps whenever it measures what fits. BRC-23 now says this in words. Nothing is drawn differently.
