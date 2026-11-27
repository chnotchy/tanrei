---
'@tanrei/web': patch
---

Date and time picker:

- On the 24-hour dial, with the handle on the outer ring (00 to 11), the track no longer runs through the inner ring's
  number at the same angle: it struck 12 through with the handle on 00, 21 with the handle on 09, and so on for all twelve
  outer hours. It now ends half `dial.handle.size` short of the inner ring, where a handle on that ring would begin
  (DTM-24); with the handle on the inner ring it runs to the handle as before.
- The handle stands square to the dial (it turns back by the arm's angle, and what it holds turns with the arm again, so
  nothing it draws moves): a contrast check reads its box as the circle's own square, not the larger square around a
  turned one, and leaves undecided only the numbers whose own box reaches into that square (with the handle on 19, it
  left 06, 07, 18 and 20 undecided; 06 now lies outside it and is checked).
- The columns of the horizontal layout are centred no further than the body's start (`justify-content: safe center`):
  were they ever wider than the body, as in the frames before a narrowed window has the vertical layout taken, their
  start would still be within scrolling reach, where centring put 140 px of a calendar at 320 px out of it.
