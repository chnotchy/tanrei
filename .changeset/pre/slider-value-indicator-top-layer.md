---
'@tanrei/web': minor
'@tanrei/react': minor
---

Slider (and Slider field, and a Field around a Slider): the value indicator is drawn in the top layer (a manual
popover placed against its handle), so an ancestor with `overflow: hidden` no longer clips it and a neighbour with a
z-index no longer covers it (SLD-28). It follows its handle in the same frame through a drag, the value motion, a
scroll and a resize; it is not drawn while its handle is hidden or scrolled out of sight, and is shown again above a
dialog or popover the slider stands in that opened meanwhile. Its look is unchanged: the recorded fixtures compare
equal. **Breaking**: the `value-indicator` part is now a popover with `position: fixed` and no `z-index` (a product
that styled its position or level through `::part(value-indicator)` must drop that), and a `transform` on an ancestor
no longer scales it, as no surface in the top layer is scaled.
