---
'@tanrei/web': patch
---

Switch: when the layout direction changes while a switch is shown, the handle no longer slides across the track. A
switch that was on slid from the right end to the left end over the selection motion, and one that was off slid the
other way. The handle is now drawn at once at its place for the new direction, keeping the switch's condition and its
focus. A tap, a key, a drag's release or a change made by the product still carries the handle over the selection
motion. Nothing changes for a switch at rest or under reduced motion.
