---
'@tanrei/web': patch
---

Text input: a change of the layout direction while an outlined field is shown (a `dir` written on an ancestor after
the first render) no longer animates its outline. The sides of the outline's pieces were laid out in the layout's
direction, so the change swapped their physical widths and every engine transitioned them over the state motion. The
pieces are now laid out left to right in either direction and the whole outline is mirrored in right-to-left, so the
field is drawn for the new direction at once. The outline looks as before in both directions.
