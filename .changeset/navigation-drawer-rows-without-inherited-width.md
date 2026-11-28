---
'@tanrei/web': patch
---

Navigation drawer: a window that changes width no longer restyles the whole drawer while it stands over the content.
The element used to write the window's width on its host so the rows end where the panel does. Every element of the
drawer inherits from the host, so in Safari each width restyled all of them. That happened at every width below the
point where the rows keep `container.width`. The width the rows are laid out at is now worked out from `100vw` in the
styles. The element writes only what `100vw` counts that the window does not, such as a classic scroll bar or the
gutter the scroll hold keeps, and only when that changes. On a page of 12,600 elements with a drawer of 90 rows, eight
widths took 0.98 s in Safari instead of 1.25 s, with a longest frame of 75 ms instead of 100 ms. In Chrome they took
0.47 s instead of 0.54 s, with a longest frame of 33 ms instead of 50 ms. Wider windows cost the same as before. A
`container.width` or `sys.target.touch` changed by script while the drawer is open now applies at once. Before, the
drawer kept the old width until the window changed or the drawer opened again.
