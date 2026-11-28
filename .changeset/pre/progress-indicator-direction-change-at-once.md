---
'@tanrei/web': patch
---

Progress indicator: a change of the layout direction around a determinate bar is now drawn at once. The bar's ends are
logical insets, so a flip of direction moved a physical inset from one value to another, and the value's transition ran
it: under `separation="gap"` the track after the gap slid across the bar over `motion.value-duration`, and the whole
track under the indicator started a transition of its own. When the direction changes, the transitions it starts are now
finished before the frame is painted, as the meter already did; the two share the rule (`rangeDirection()` in the
range-track primitive). The indicator's value, and the place of an indeterminate segment in its cycle, are kept.
