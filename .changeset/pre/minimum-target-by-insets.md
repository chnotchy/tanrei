---
'@tanrei/web': patch
---

**A minimum target is centred to the layout's own unit, in every control that draws one.** A hit area that reaches
past what a control draws was centred by an inset of 50% and a translation of -50%. The layout rounds an inset to its
unit and leaves a translation as it is, and Firefox hit-tests a translated box at a whole pixel, so on a control whose
height is an odd number of layout units (a line height or a size token gives one) the hit area stood a unit toward one
side, and in Firefox, on a control at a fraction of a pixel, up to half a pixel: a press a pixel short of the middle of
the gap to a neighbour went to the neighbour. `minimumTarget()` now lays the hit area out by its insets, the
same length on each side, which needs no direction of its own; the hit areas of a chip's remove action, a menu bar's
titles and an embedded text input's lines, centred the same way, are laid out the same. No picture changes.
