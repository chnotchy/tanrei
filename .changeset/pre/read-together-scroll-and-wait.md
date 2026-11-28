---
'@tanrei/web': patch
---

The loading indicator, the marquee text, the scroll area and the split view no longer have the browser style or lay out
the page once for each instance as they are built. The loading indicator reads its tokens with every other host's of
the turn, through a probe placed as it is inserted; the marquee text measures its widths the same way; the scroll area
reads its blur's layer count the same way; and the scroll area, the marquee text and the split view each share one
resize observer between all their instances, so a frame's reports are all read before any is written. The split view
no longer asks its pane for motions to stop when nothing moves. Building 100 of each first fixture now forces no more
style or layout passes than building 10 (was 90, 180, 135 and 90 more), so their own forced budgets are removed. Nothing
drawn or exposed changes: a show delay the product gives still starts at insertion, and the first frame shows each
component as before.
