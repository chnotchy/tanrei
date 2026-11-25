---
'@tanrei/web': patch
'@tanrei/docs': patch
---

Web: `<tanrei-tooltip inline>`, for tests and documentation, draws the open tooltip in place, as the popover's `inline`
does: inside its positioned ancestor, which stands for the window, not in the top layer. It is placed against its anchor
within that box, closes only when the anchor is removed or hidden, answers no Escape and no press elsewhere, and takes
no part in the one-tooltip-at-a-time rule of the browser's window: it closes no other tooltip and no other closes it.

Docs: the Tooltip page's anatomy and measure figures draw the open tooltip again. Each drew only its anchor: both were
open in the page's own window, where at most one tooltip is open, so the measure figure's closed the anatomy figure's;
and the measure figure's closed in turn because its anchor was below the fold as the page loaded. A figure now draws a
surface that stands beside its anchor in place, in a stage of its own, so the anatomy numbers the container and the
text, and the measure figure draws the container's padding (8) where it said it was not drawn.
