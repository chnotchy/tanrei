---
'@tanrei/docs': patch
---

Documentation site: the home page's specimen holds its height while its Buttons are defined. In one column (below
60rem) the specimen's stage was given the fewest rows its Buttons take at any of those widths, and grew once they were
defined — by 362 px at 360 px wide, 428 px at 320 — moving everything under it, in every language. The stage is now
marked as a figure's stage is, so the web package's cloak gives each Button its height from its tokens before it is
defined, and each Button holds the width its baseline gives it, a pixel over, before and after: the Buttons wrap into
the rows they are drawn in from the first paint, at every width. The hand-measured row counts are gone.
