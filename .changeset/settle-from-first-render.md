---
'@tanrei/web': patch
---

Every element: one connected where the page draws nothing — inside a hidden container, a tab panel not shown or a
closed `<details>`, or hidden itself — now draws its first frame at rest when it is first shown. Its first frames
(MOT-3) are counted from the first frame it is drawn in, not from its first update, which it had while hidden. Until
then it starts no transition, so what it measures as it is first shown arrives without a motion: a number input's
floating label no longer narrows over the steppers' length, and a selected segment's check no longer grows in. An
element mounted where it is drawn settles as before.
