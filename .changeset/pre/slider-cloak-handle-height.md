---
'@tanrei/web': patch
---

The cloak (`cloak.css`) holds a slider, a slider field and a Field around a slider as thick as they are drawn in a
system whose handle is taller than the slider's container. A horizontal slider is as thick as the larger of its
container's size and its size's handle height (SLD-7), and the cloak held the container's size alone: in `m3-like`,
whose handle is 44px at small and medium and 52px at large against a 32px container, a
slider was held 12px (20px at large) lower than it is drawn, and the page below it moved down by that much when it
was defined. The cloak now holds the larger of the two, by `size`. The default system and `cupertino`, whose handle
is shorter than the container, are held as before; so is a slider field whose value indicator is always shown, whose
room above the slider already counted the handle.
