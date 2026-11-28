---
'@tanrei/web': patch
---

Figure: the figures of a page measure their stages together, once a frame. Each figure read whether its stage scrolls
sideways (FIG-6) in its own update, right after the element before it had drawn, and so had the page laid out again for
itself: fifty figures with a button on their stages, appended at once, cost 52 style passes, now 2; on the
documentation's Field page (368 fixtures) at 390 wide, 1.3 of the 5.9 seconds a scroll through it took. One observer of
sizes now watches every figure's stage, and every figure that changed is read first and written after. A stage that
starts or stops scrolling becomes, or stops being, a focus stop and a group in the next frame.
